import { Bot, InlineKeyboard } from "grammy";
import { BotContext, CaptureDraft } from "#root/types/context.js";
import { captureService } from "#root/services/capture.service.js";
import { settingsService } from "#root/services/settings.service.js";
import { logger } from "#root/logger.js";
import { isValidTime, parseDateString, formatDate, formatTimeUTCHHmm, resolveDatePreset, formatIsoDateShort, isTimeAffectedByQuietHours } from "#root/utils/time.js";
import { pushScene, popScene, clearHistory } from "#root/bot/utils/scene.js";
import { sendMainMenu } from "#root/bot/handlers/menu/menu.js";
import { sendTaskMessage, buildTaskTags } from "#root/bot/handlers/task-message/task-message.js";
import { Category, DurationTag } from "#root/types/enums.js";
import {
    CAPTURE_TEXTS,
    CAPTURE_BUTTONS,
    CAPTURE_SCENES,
    CAPTURE_CALLBACKS,
    CAPTURE_PATTERNS,
    GLOBAL_CALLBACKS,
    PARSE_MODE,
    QUIET_WARNING_ACTIONS,
    MEDIA_TYPES,
    MEDIA_EVENTS,
    CATEGORY_OPTIONS,
    DURATION_OPTIONS,
    DATE_PRESETS,
    TITLE_MAX_LENGTH,
    SEPARATOR,
} from "./const.js";
import { DURATION_LABELS, CATEGORY_LABELS } from "#root/types/labels.js";




const backButton = (): InlineKeyboard => new InlineKeyboard().text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);

const buildOptionsKeyboard = (draft: CaptureDraft): InlineKeyboard => {
    const dateLabel = draft.due_date
        ? `📅 ${formatIsoDateShort(draft.due_date)}`
        : CAPTURE_BUTTONS.DATE_PLACEHOLDER;
    const timeLabel = draft.due_time ? `⏰ ${draft.due_time}` : CAPTURE_BUTTONS.TIME_PLACEHOLDER;
    const delegateLabel = draft.delegated_to ? `👤 ${draft.delegated_to}` : CAPTURE_BUTTONS.DELEGATE_PLACEHOLDER;
    const categoryLabel = draft.category === "CAREER"
        ? CATEGORY_LABELS["CAREER"]
        : draft.category === "PERSONAL"
            ? CATEGORY_LABELS["PERSONAL"]
            : CAPTURE_BUTTONS.CATEGORY_PLACEHOLDER;

    return new InlineKeyboard()
        .text(dateLabel, CAPTURE_CALLBACKS.OPTION_DATE)
        .text(timeLabel, CAPTURE_CALLBACKS.OPTION_TIME)
        .row()
        .text(categoryLabel, CAPTURE_CALLBACKS.OPTION_CATEGORY)
        .text(CAPTURE_BUTTONS.TITLE_EDIT, CAPTURE_CALLBACKS.OPTION_TITLE)
        .row()
        .text(delegateLabel, CAPTURE_CALLBACKS.OPTION_DELEGATE)
        .row()
        .text(CAPTURE_BUTTONS.DONE, CAPTURE_CALLBACKS.OPTION_DONE)
        .row()
        .text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);
};

const buildDateKeyboard = (): InlineKeyboard =>
    new InlineKeyboard()
        .text(DATE_PRESETS.TODAY.label, CAPTURE_CALLBACKS.DATE_VALUE(DATE_PRESETS.TODAY.value))
        .text(DATE_PRESETS.TOMORROW.label, CAPTURE_CALLBACKS.DATE_VALUE(DATE_PRESETS.TOMORROW.value))
        .row()
        .text(DATE_PRESETS.IN_3_DAYS.label, CAPTURE_CALLBACKS.DATE_VALUE(DATE_PRESETS.IN_3_DAYS.value))
        .text(DATE_PRESETS.CUSTOM.label, CAPTURE_CALLBACKS.DATE_VALUE(DATE_PRESETS.CUSTOM.value))
        .row()
        .text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);

const sendTitleStep = async (ctx: BotContext) => {
    pushScene(ctx, CAPTURE_SCENES.AWAITING_TITLE);
    await ctx.reply(CAPTURE_TEXTS.TITLE_PROMPT);
};

const sendCategoryStep = async (ctx: BotContext) => {
    pushScene(ctx, CAPTURE_SCENES.AWAITING_CATEGORY);
    const keyboard = new InlineKeyboard();
    Object.values(CATEGORY_OPTIONS).forEach(({ label, value }) =>
        keyboard.text(label, CAPTURE_CALLBACKS.CATEGORY_VALUE(value)),
    );
    keyboard.row().text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);
    await ctx.reply(CAPTURE_TEXTS.CATEGORY_PROMPT, { reply_markup: keyboard });
};

const sendDurationStep = async (ctx: BotContext) => {
    pushScene(ctx, CAPTURE_SCENES.AWAITING_DURATION);
    const keyboard = new InlineKeyboard();
    Object.values(DURATION_OPTIONS).forEach(({ label, value }) =>
        keyboard.text(label, CAPTURE_CALLBACKS.DURATION_VALUE(value)),
    );
    keyboard.row().text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);
    await ctx.reply(CAPTURE_TEXTS.DURATION_PROMPT, { reply_markup: keyboard });
};

const sendOptionsStep = async (ctx: BotContext) => {
    pushScene(ctx, CAPTURE_SCENES.AWAITING_OPTIONS);
    const keyboard = buildOptionsKeyboard(ctx.session.capture ?? {});
    await ctx.reply(CAPTURE_TEXTS.OPTIONS_PROMPT, { reply_markup: keyboard });
};

const sendConfirmation = async (ctx: BotContext) => {
    const draft = ctx.session.capture ?? {};
    const tags: string[] = [];

    if (draft.category) tags.push(CATEGORY_LABELS[draft.category]);
    if (draft.duration_tag) tags.push(DURATION_LABELS[draft.duration_tag]);
    if (draft.due_date) tags.push(`📅 ${draft.due_date}`);
    if (draft.due_time) tags.push(`⏰ ${draft.due_time}`);
    if (draft.delegated_to) tags.push(`👤 ${draft.delegated_to}`);

    const keyboard = new InlineKeyboard()
        .text(CAPTURE_TEXTS.ADD_MORE, CAPTURE_CALLBACKS.ADD_MORE)
        .text(CAPTURE_TEXTS.OPEN_INBOX, CAPTURE_CALLBACKS.INBOX);

    await ctx.reply(
        `${CAPTURE_TEXTS.CONFIRMED}\n\n<b>${draft.title}</b>\n<i>${tags.join(" ")}</i>`,
        { reply_markup: keyboard, parse_mode: PARSE_MODE.HTML },
    );

    ctx.session.scene = null;
    ctx.session.capture = undefined;
    clearHistory(ctx);
};

const buildDueTime = (date: string | undefined, time: string | undefined): Date | null => {
    if (!time) return null;
    const dateStr = date ?? formatDate(new Date());
    return new Date(`${dateStr}T${time}:00Z`);
};

const saveTask = async (ctx: BotContext) => {
    const draft = ctx.session.capture!;
    const userId = BigInt(ctx.from!.id);

    if (draft.taskId) {
        await captureService.updateTask(draft.taskId, {
            title: draft.title,
            due_date: draft.due_date ? new Date(draft.due_date) : null,
            due_time: buildDueTime(draft.due_date, draft.due_time),
            delegated_to: draft.delegated_to ?? null,
            attachment_file_id: draft.attachment_file_id ?? null,
            attachment_type: draft.attachment_type ?? null,
        });
    } else {
        await captureService.createTask({
            userId,
            title: draft.title!,
            category: draft.category as Category,
            duration_tag: draft.duration_tag as DurationTag,
            due_date: draft.due_date ? new Date(draft.due_date) : null,
            due_time: buildDueTime(draft.due_date, draft.due_time),
            delegated_to: draft.delegated_to ?? null,
            attachment_file_id: draft.attachment_file_id ?? null,
            attachment_type: draft.attachment_type ?? null,
        });
    }

    await sendConfirmation(ctx);
};

export const registerCaptureHandler = (bot: Bot<BotContext>) => {
    bot.command("add", async (ctx) => {
        logger.debug({ userId: ctx.from!.id }, "command /add");
        ctx.session.scene = null;
        ctx.session.capture = {};
        ctx.session.onboarding = undefined;
        ctx.session.brief = undefined;
        ctx.session.rescheduleTaskId = undefined;
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.command("inbox", async (ctx) => {
        logger.debug({ userId: ctx.from!.id }, "command /inbox");
        const userId = BigInt(ctx.from!.id);
        const tasks = await captureService.getActiveTasks(userId);

        if (tasks.length === 0) {
            await ctx.reply(CAPTURE_TEXTS.INBOX_EMPTY, {
                reply_markup: new InlineKeyboard()
                    .text(CAPTURE_TEXTS.INBOX_ADD_TASK, GLOBAL_CALLBACKS.ADD_TASK)
                    .row()
                    .text(CAPTURE_BUTTONS.MAIN_MENU, GLOBAL_CALLBACKS.MENU_HOME),
            });
            return;
        }

        await ctx.reply(CAPTURE_TEXTS.INBOX_HEADER(tasks.length));

        for (const task of tasks) {
            const keyboard = new InlineKeyboard()
                .text(CAPTURE_BUTTONS.TASK_DONE, CAPTURE_CALLBACKS.INBOX_DONE(task.id))
                .text(CAPTURE_BUTTONS.TASK_EDIT, CAPTURE_CALLBACKS.INBOX_EDIT(task.id))
                .row()
                .text(CAPTURE_BUTTONS.TASK_DELETE, CAPTURE_CALLBACKS.INBOX_DELETE(task.id));
            await sendTaskMessage(ctx.api, ctx.from!.id, task, keyboard);
        }

        await ctx.reply(SEPARATOR, {
            reply_markup: new InlineKeyboard().text(CAPTURE_BUTTONS.MAIN_MENU, GLOBAL_CALLBACKS.MENU_HOME),
        });
    });

    bot.callbackQuery(GLOBAL_CALLBACKS.ADD_TASK, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.capture = {};
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.ADD_MORE, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.capture = {};
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.INBOX, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        const tasks = await captureService.getActiveTasks(userId);

        if (tasks.length === 0) {
            await ctx.reply(CAPTURE_TEXTS.INBOX_EMPTY, {
                reply_markup: new InlineKeyboard()
                    .text(CAPTURE_TEXTS.INBOX_ADD_TASK, GLOBAL_CALLBACKS.ADD_TASK)
                    .row()
                    .text(CAPTURE_BUTTONS.MAIN_MENU, GLOBAL_CALLBACKS.MENU_HOME),
            });
            return;
        }

        await ctx.reply(CAPTURE_TEXTS.INBOX_HEADER(tasks.length));

        for (const task of tasks) {
            const keyboard = new InlineKeyboard()
                .text(CAPTURE_BUTTONS.TASK_DONE, CAPTURE_CALLBACKS.INBOX_DONE(task.id))
                .text(CAPTURE_BUTTONS.TASK_EDIT, CAPTURE_CALLBACKS.INBOX_EDIT(task.id))
                .row()
                .text(CAPTURE_BUTTONS.TASK_DELETE, CAPTURE_CALLBACKS.INBOX_DELETE(task.id));
            await sendTaskMessage(ctx.api, ctx.from!.id, task, keyboard);
        }

        await ctx.reply(SEPARATOR, {
            reply_markup: new InlineKeyboard().text(CAPTURE_BUTTONS.MAIN_MENU, GLOBAL_CALLBACKS.MENU_HOME),
        });
    });

    bot.callbackQuery(CAPTURE_PATTERNS.INBOX_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        logger.info({ userId: ctx.from.id, taskId }, "inbox: task done");
        const task = await captureService.markTaskDone(taskId);
        const msg = ctx.callbackQuery.message;
        const emptyKeyboard = new InlineKeyboard();
        const doneText = `✅ <b>${task.title}</b>\n<i>${buildTaskTags(task)}</i>`;
        if (msg && (MEDIA_TYPES.PHOTO in msg || MEDIA_TYPES.VIDEO in msg || MEDIA_TYPES.DOCUMENT in msg || MEDIA_TYPES.AUDIO in msg || MEDIA_TYPES.VOICE in msg)) {
            await ctx.editMessageCaption({ caption: doneText, reply_markup: emptyKeyboard, parse_mode: PARSE_MODE.HTML });
        } else {
            await ctx.editMessageText(doneText, { reply_markup: emptyKeyboard, parse_mode: PARSE_MODE.HTML });
        }
    });

    bot.callbackQuery(CAPTURE_PATTERNS.INBOX_EDIT, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        const task = await captureService.getTaskById(taskId);
        if (!task) return;

        const due_date = task.due_date ? formatDate(task.due_date) : undefined;
        const due_time = task.due_time ? formatTimeUTCHHmm(task.due_time) : undefined;

        ctx.session.capture = {
            taskId,
            title: task.title,
            due_date,
            due_time,
            delegated_to: task.delegated_to ?? undefined,
            attachment_file_id: task.attachment_file_id ?? undefined,
            attachment_type: task.attachment_type ?? undefined,
        };
        clearHistory(ctx);
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_PATTERNS.INBOX_DELETE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        logger.info({ userId: ctx.from.id, taskId }, "inbox: task deleted");
        await captureService.markTaskDeleted(taskId);
        const msg = ctx.callbackQuery.message;
        const emptyKeyboard = new InlineKeyboard();
        if (msg && MEDIA_TYPES.PHOTO in msg || msg && MEDIA_TYPES.VIDEO in msg || msg && MEDIA_TYPES.DOCUMENT in msg || msg && MEDIA_TYPES.AUDIO in msg || msg && MEDIA_TYPES.VOICE in msg) {
            await ctx.editMessageCaption({ caption: CAPTURE_TEXTS.TASK_DELETED, reply_markup: emptyKeyboard });
        } else {
            await ctx.editMessageText(CAPTURE_TEXTS.TASK_DELETED, { reply_markup: emptyKeyboard });
        }
    });

    // Back navigation
    bot.callbackQuery(CAPTURE_CALLBACKS.BACK, async (ctx) => {
        await ctx.answerCallbackQuery();
        const prev = popScene(ctx);

        if (prev === null) {
            ctx.session.capture = undefined;
            clearHistory(ctx);
            await sendMainMenu(ctx);
            return;
        }

        if (prev === CAPTURE_SCENES.AWAITING_TITLE) {
            await ctx.reply(CAPTURE_TEXTS.TITLE_PROMPT);
            return;
        }

        if (prev === CAPTURE_SCENES.AWAITING_CATEGORY) {
            await sendCategoryStep(ctx);
            return;
        }

        if (prev === CAPTURE_SCENES.AWAITING_DURATION) {
            await sendDurationStep(ctx);
            return;
        }

        if (prev === CAPTURE_SCENES.AWAITING_OPTIONS) {
            await sendOptionsStep(ctx);
            return;
        }
    });

    bot.callbackQuery(CAPTURE_PATTERNS.CATEGORY, async (ctx) => {
        await ctx.answerCallbackQuery();
        const category = ctx.match[1] as Category;
        ctx.session.capture = { ...ctx.session.capture, category };
        await sendDurationStep(ctx);
    });

    bot.callbackQuery(CAPTURE_PATTERNS.DURATION, async (ctx) => {
        await ctx.answerCallbackQuery();
        const duration_tag = ctx.match[1] as DurationTag;
        ctx.session.capture = { ...ctx.session.capture, duration_tag };
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_DATE);
        await ctx.reply(CAPTURE_TEXTS.DATE_PROMPT, {
            reply_markup: buildDateKeyboard(),
        });
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_TIME, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_TIME);
        await ctx.reply(CAPTURE_TEXTS.TIME_PROMPT, { reply_markup: backButton() });
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_DELEGATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_DELEGATE);
        await ctx.reply(CAPTURE_TEXTS.DELEGATE_PROMPT, { reply_markup: backButton() });
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        logger.info({ userId: ctx.from.id }, "capture: task saved");
        await saveTask(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_CATEGORY, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_CATEGORY);
        const keyboard = new InlineKeyboard();
        Object.values(CATEGORY_OPTIONS).forEach(({ label, value }) =>
            keyboard.text(label, CAPTURE_CALLBACKS.OPTION_CATEGORY_VALUE(value)),
        );
        keyboard.row().text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);
        await ctx.reply(CAPTURE_TEXTS.CATEGORY_PROMPT, { reply_markup: keyboard });
    });

    bot.callbackQuery(CAPTURE_PATTERNS.OPTION_CATEGORY, async (ctx) => {
        await ctx.answerCallbackQuery();
        const category = ctx.match[1] as Category;
        ctx.session.capture = { ...ctx.session.capture, category };
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_TITLE, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.EDIT_TITLE);
        const current = ctx.session.capture?.title ?? "";
        await ctx.reply(CAPTURE_TEXTS.TITLE_EDIT_PROMPT(current), { reply_markup: backButton() });
    });

    bot.callbackQuery(CAPTURE_PATTERNS.DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const value = ctx.match[1];

        if (value === DATE_PRESETS.CUSTOM.value) {
            await ctx.reply(CAPTURE_TEXTS.DATE_PROMPT, { reply_markup: backButton() });
            return;
        }

        const date = resolveDatePreset(value);
        ctx.session.capture = {
            ...ctx.session.capture,
            due_date: formatDate(date),
        };

        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_PATTERNS.QUIET_WARNING, async (ctx) => {
        await ctx.answerCallbackQuery();
        const action = ctx.match[1];

        if (action === QUIET_WARNING_ACTIONS.SAVE) {
            await saveTask(ctx);
        } else {
            pushScene(ctx, CAPTURE_SCENES.AWAITING_TIME);
            await ctx.reply(CAPTURE_TEXTS.TIME_PROMPT, { reply_markup: backButton() });
        }
    });

    bot.on("message:text", async (ctx, next) => {
        const scene = ctx.session.scene;

        if (scene === CAPTURE_SCENES.AWAITING_TITLE) {
            const title = ctx.message.text.trim();

            if (!title) {
                await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY);
                return;
            }

            if (title.length > TITLE_MAX_LENGTH) {
                logger.warn({ userId: ctx.from.id, length: title.length }, "capture: title too long");
                await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG);
                return;
            }

            ctx.session.capture = { ...ctx.session.capture, title };
            await sendCategoryStep(ctx);
            return;
        }

        if (scene === CAPTURE_SCENES.EDIT_TITLE) {
            const title = ctx.message.text.trim();
            if (!title) { await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY); return; }
            if (title.length > TITLE_MAX_LENGTH) { await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG); return; }
            ctx.session.capture = { ...ctx.session.capture, title, attachment_file_id: undefined, attachment_type: undefined };
            await sendOptionsStep(ctx);
            return;
        }

        if (scene === CAPTURE_SCENES.AWAITING_CATEGORY || scene === CAPTURE_SCENES.AWAITING_DURATION) {
            return;
        }

        if (scene === CAPTURE_SCENES.AWAITING_DATE) {
            const value = ctx.message.text.trim();
            const date = parseDateString(value);

            if (!date) {
                await ctx.reply(CAPTURE_TEXTS.DATE_INVALID);
                return;
            }

            if (date < new Date()) {
                await ctx.reply(CAPTURE_TEXTS.DATE_IN_PAST);
                return;
            }

            ctx.session.capture = {
                ...ctx.session.capture,
                due_date: formatDate(date),
            };

            await sendOptionsStep(ctx);
            return;
        }

        if (scene === CAPTURE_SCENES.AWAITING_TIME) {
            const value = ctx.message.text.trim();

            if (!isValidTime(value)) {
                await ctx.reply(CAPTURE_TEXTS.TIME_INVALID);
                return;
            }

            const dueTime = value;
            const userId = BigInt(ctx.from.id);
            const user = await settingsService.findUser(userId);

            if (user?.quiet_hours_from && user.quiet_hours_to) {
                if (isTimeAffectedByQuietHours(dueTime, user.quiet_hours_from, user.quiet_hours_to)) {
                    ctx.session.capture = { ...ctx.session.capture, due_time: dueTime };
                    const keyboard = new InlineKeyboard()
                        .text(CAPTURE_BUTTONS.QUIET_SAVE, CAPTURE_CALLBACKS.QUIET_SAVE)
                        .text(CAPTURE_BUTTONS.QUIET_CHANGE, CAPTURE_CALLBACKS.QUIET_CHANGE);
                    await ctx.reply(CAPTURE_TEXTS.QUIET_HOURS_WARNING(dueTime), { reply_markup: keyboard });
                    return;
                }
            }

            ctx.session.capture = { ...ctx.session.capture, due_time: dueTime };
            await sendOptionsStep(ctx);
            return;
        }

        if (scene === CAPTURE_SCENES.AWAITING_DELEGATE) {
            const delegated_to = ctx.message.text.trim();
            ctx.session.capture = { ...ctx.session.capture, delegated_to };
            await sendOptionsStep(ctx);
            return;
        }

        return next();
    });

    const applyMediaTitle = async (ctx: BotContext, fileId: string, type: string, caption: string | undefined, next: () => Promise<void>) => {
        const scene = ctx.session.scene;
        if (scene === CAPTURE_SCENES.EDIT_TITLE) {
            const title = (caption ?? "").trim();
            if (!title) { await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY); return; }
            if (title.length > TITLE_MAX_LENGTH) { await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG); return; }
            ctx.session.capture = { ...ctx.session.capture, title, attachment_file_id: fileId, attachment_type: type };
            await sendOptionsStep(ctx);
            return;
        }
        if (scene !== CAPTURE_SCENES.AWAITING_TITLE) return next();
        const title = (caption ?? "").trim();
        if (!title) { await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY); return; }
        if (title.length > TITLE_MAX_LENGTH) { await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG); return; }
        ctx.session.capture = { ...ctx.session.capture, title, attachment_file_id: fileId, attachment_type: type };
        await sendCategoryStep(ctx);
    };

    bot.on(MEDIA_EVENTS.PHOTO, async (ctx, next) => {
        const photos = ctx.message.photo;
        const photo = photos[photos.length - 1];
        await applyMediaTitle(ctx, photo.file_id, MEDIA_TYPES.PHOTO, ctx.message.caption, next);
    });

    bot.on(MEDIA_EVENTS.VIDEO, async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.video.file_id, MEDIA_TYPES.VIDEO, ctx.message.caption, next);
    });

    bot.on(MEDIA_EVENTS.DOCUMENT, async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.document.file_id, MEDIA_TYPES.DOCUMENT, ctx.message.caption, next);
    });

    bot.on(MEDIA_EVENTS.AUDIO, async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.audio.file_id, MEDIA_TYPES.AUDIO, ctx.message.caption, next);
    });

    bot.on(MEDIA_EVENTS.VOICE, async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.voice.file_id, MEDIA_TYPES.VOICE, ctx.message.caption, next);
    });
};
