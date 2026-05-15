import { Bot, InlineKeyboard } from "grammy";
import { BotContext, CaptureDraft } from "#root/types/context.js";
import { captureService } from "#root/services/capture.service.js";
import { settingsService } from "#root/services/settings.service.js";
import { logger } from "#root/logger.js";
import { isValidTime, parseDateString, formatDate, formatTimeUTCHHmm, resolveDatePreset, formatIsoDateShort, isTimeAffectedByQuietHours, parseTimezoneOffset, getWeekBounds } from "#root/utils/time.js";
import { pushScene, popScene, clearHistory } from "#root/bot/utils/scene.js";
import { sendMainMenu } from "#root/bot/handlers/menu/menu.js";
import { sendTaskMessage, buildTaskTags } from "#root/bot/handlers/task-message/task-message.js";
import { TASK_MESSAGE_FORMATS } from "#root/bot/handlers/task-message/const.js";
import { Category, DurationTag } from "#root/types/enums.js";
import { TaskModel } from "#root/types/models.js";
import {
    CAPTURE_TEXTS,
    CAPTURE_BUTTONS,
    CAPTURE_SCENES,
    CAPTURE_CALLBACKS,
    CAPTURE_PATTERNS,
    CAPTURE_TAG_FORMATS,
    CAPTURE_ICONS,
    CAPTURE_LOG,
    CAPTURE_DEFAULTS,
    GLOBAL_CALLBACKS,
    INBOX_CALLBACKS,
    INBOX_PATTERNS,
    INBOX_TEXTS,
    INBOX_BUTTONS,
    formatDayLabel,
    PARSE_MODE,
    QUIET_WARNING_ACTIONS,
    MEDIA_TYPES,
    MEDIA_EVENTS,
    CATEGORY_OPTIONS,
    DURATION_OPTIONS,
    DATE_PRESETS,
    TITLE_MAX_LENGTH,
    CAPTURE_TIMEOUT_MS,
} from "./const.js";
import { DURATION_LABELS, CATEGORY_LABELS } from "#root/types/labels.js";
import { TASK_CATEGORY } from "#root/repositories/const.js";




const isCaptureExpired = (ctx: BotContext): boolean => {
    const started = ctx.session.captureStartedAt;
    return !!started && Date.now() - started > CAPTURE_TIMEOUT_MS;
};

const resetExpiredCapture = async (ctx: BotContext): Promise<boolean> => {
    if (!isCaptureExpired(ctx)) return false;
    ctx.session.scene = null;
    ctx.session.capture = undefined;
    ctx.session.captureStartedAt = undefined;
    clearHistory(ctx);
    await ctx.reply(CAPTURE_TEXTS.CAPTURE_TIMEOUT);
    return true;
};

const backButton = (): InlineKeyboard => new InlineKeyboard().text(CAPTURE_BUTTONS.BACK, CAPTURE_CALLBACKS.BACK);

const buildOptionsKeyboard = (draft: CaptureDraft): InlineKeyboard => {
    const dateLabel = draft.due_date
        ? `${CAPTURE_ICONS.DATE} ${formatIsoDateShort(draft.due_date)}`
        : CAPTURE_BUTTONS.DATE_PLACEHOLDER;
    const timeLabel = draft.due_time ? `${CAPTURE_ICONS.TIME} ${draft.due_time}` : CAPTURE_BUTTONS.TIME_PLACEHOLDER;
    const delegateLabel = draft.delegated_to ? `${CAPTURE_ICONS.DELEGATE} ${draft.delegated_to}` : CAPTURE_BUTTONS.DELEGATE_PLACEHOLDER;
    const categoryLabel = draft.category === TASK_CATEGORY.CAREER
        ? CATEGORY_LABELS[TASK_CATEGORY.CAREER]
        : draft.category === TASK_CATEGORY.PERSONAL
            ? CATEGORY_LABELS[TASK_CATEGORY.PERSONAL]
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

const isInboxEdit = (ctx: BotContext): boolean => !!ctx.session.capture?.isInboxEdit;

const editOrReply = async (
    ctx: BotContext,
    text: string,
    options: { reply_markup?: InlineKeyboard; parse_mode?: string } = {},
): Promise<void> => {
    if (isInboxEdit(ctx) && ctx.callbackQuery?.message) {
        await ctx.editMessageText(text, options as Parameters<typeof ctx.editMessageText>[1]);
    } else {
        await ctx.reply(text, options as Parameters<typeof ctx.reply>[1]);
    }
};

const sendOptionsStep = async (ctx: BotContext) => {
    pushScene(ctx, CAPTURE_SCENES.AWAITING_OPTIONS);
    const draft = ctx.session.capture ?? {};
    const keyboard = buildOptionsKeyboard(draft);
    const text = draft.isInboxEdit && draft.title ? `✏️ ${draft.title}` : CAPTURE_TEXTS.OPTIONS_PROMPT;
    await editOrReply(ctx, text, { reply_markup: keyboard });
};

const sendConfirmation = async (ctx: BotContext, savedTaskId?: string) => {
    const draft = ctx.session.capture ?? {};

    ctx.session.scene = null;
    ctx.session.capture = undefined;
    clearHistory(ctx);

    if (savedTaskId && ctx.callbackQuery?.message) {
        const task = await captureService.getTaskById(savedTaskId);
        if (task) {
            const caption = `${CAPTURE_TEXTS.CONFIRMED}\n\n${TASK_MESSAGE_FORMATS.CAPTION(task.title, buildTaskTags(task))}`;
            const keyboard = new InlineKeyboard()
                .text(CAPTURE_BUTTONS.TASK_DONE, CAPTURE_CALLBACKS.INBOX_DONE(savedTaskId))
                .text(CAPTURE_BUTTONS.TASK_EDIT, CAPTURE_CALLBACKS.INBOX_EDIT(savedTaskId))
                .row()
                .text(CAPTURE_BUTTONS.TASK_DELETE, CAPTURE_CALLBACKS.INBOX_DELETE(savedTaskId));
            const msg = ctx.callbackQuery.message;
            if (MEDIA_TYPES.PHOTO in msg || MEDIA_TYPES.VIDEO in msg || MEDIA_TYPES.DOCUMENT in msg || MEDIA_TYPES.AUDIO in msg || MEDIA_TYPES.VOICE in msg) {
                await ctx.editMessageCaption({ caption, reply_markup: keyboard, parse_mode: PARSE_MODE.HTML });
            } else {
                await ctx.editMessageText(caption, { reply_markup: keyboard, parse_mode: PARSE_MODE.HTML });
            }
            return;
        }
    }

    const tags: string[] = [];
    if (draft.category) tags.push(CATEGORY_LABELS[draft.category]);
    if (draft.duration_tag) tags.push(DURATION_LABELS[draft.duration_tag]);
    if (draft.due_date) tags.push(CAPTURE_TAG_FORMATS.DATE(draft.due_date));
    if (draft.due_time) tags.push(CAPTURE_TAG_FORMATS.TIME(draft.due_time));
    if (draft.delegated_to) tags.push(CAPTURE_TAG_FORMATS.DELEGATE(draft.delegated_to));

    const keyboard = new InlineKeyboard()
        .text(CAPTURE_TEXTS.ADD_MORE, CAPTURE_CALLBACKS.ADD_MORE)
        .text(CAPTURE_TEXTS.OPEN_INBOX, CAPTURE_CALLBACKS.INBOX);

    await ctx.reply(
        `${CAPTURE_TEXTS.CONFIRMED}\n\n<b>${draft.title}</b>\n<i>${tags.join(" ")}</i>`,
        { reply_markup: keyboard, parse_mode: PARSE_MODE.HTML },
    );
};

const buildDueTime = (date: string | undefined, time: string | undefined, timezoneOffsetHours: number): Date | null => {
    if (!time) return null;
    const dateStr = date ?? formatDate(new Date());
    const utcMs = new Date(`${dateStr}T${time}:00Z`).getTime() - timezoneOffsetHours * 3600000;
    return new Date(utcMs);
    // не используется утилита для времени
};

const saveTask = async (ctx: BotContext) => {
    const draft = ctx.session.capture!;
    const userId = BigInt(ctx.from!.id);
    const user = await settingsService.findUser(userId);
    const tzOffset = parseTimezoneOffset(user?.timezone ?? CAPTURE_DEFAULTS.TIMEZONE);

    if (draft.taskId) {
        await captureService.updateTask(draft.taskId, {
            title: draft.title,
            due_date: draft.due_date ? new Date(draft.due_date) : null,
            due_time: buildDueTime(draft.due_date, draft.due_time, tzOffset),
            delegated_to: draft.delegated_to ?? null,
            attachment_file_id: draft.attachment_file_id ?? null,
            attachment_type: draft.attachment_type ?? null,
        });
        await sendConfirmation(ctx, draft.taskId);
    } else {
        await captureService.createTask({
            userId,
            title: draft.title!,
            category: draft.category as Category,
            duration_tag: draft.duration_tag as DurationTag,
            due_date: draft.due_date ? new Date(draft.due_date) : null,
            due_time: buildDueTime(draft.due_date, draft.due_time, tzOffset),
            delegated_to: draft.delegated_to ?? null,
            attachment_file_id: draft.attachment_file_id ?? null,
            attachment_type: draft.attachment_type ?? null,
        });
        await sendConfirmation(ctx);
    }
};

const buildInboxMenuKeyboard = (): InlineKeyboard =>
    new InlineKeyboard()
        .text(INBOX_BUTTONS.TODAY, INBOX_CALLBACKS.SHOW_TODAY).row()
        .text(INBOX_BUTTONS.WEEK, INBOX_CALLBACKS.SHOW_WEEK).row()
        .text(INBOX_BUTTONS.NO_DATE, INBOX_CALLBACKS.SHOW_NO_DATE).row()
        .text(INBOX_BUTTONS.ALL, INBOX_CALLBACKS.SHOW_ALL).row()
        .text(INBOX_BUTTONS.BACK_TO_MENU, GLOBAL_CALLBACKS.MENU_HOME);

const sendInboxMenu = async (ctx: BotContext): Promise<void> => {
    const keyboard = buildInboxMenuKeyboard();
    if (ctx.callbackQuery) {
        await ctx.editMessageText(INBOX_TEXTS.MENU_PROMPT, { reply_markup: keyboard });
    } else {
        await ctx.reply(INBOX_TEXTS.MENU_PROMPT, { reply_markup: keyboard });
    }
};

const backToInboxKeyboard = (): InlineKeyboard =>
    new InlineKeyboard().text(INBOX_BUTTONS.BACK_TO_INBOX, CAPTURE_CALLBACKS.INBOX);

const sendTaskList = async (
    ctx: BotContext,
    userId: bigint,
    tasks: TaskModel[],
    footer: string,
    emptyText: string,
): Promise<void> => {
    if (tasks.length === 0) {
        await ctx.editMessageText(emptyText, { reply_markup: backToInboxKeyboard() });
        return;
    }
    await ctx.editMessageText(CAPTURE_TEXTS.INBOX_HEADER(tasks.length), { reply_markup: backToInboxKeyboard() });
    for (const task of tasks) {
        const keyboard = new InlineKeyboard()
            .text(CAPTURE_BUTTONS.TASK_DONE, CAPTURE_CALLBACKS.INBOX_DONE(task.id))
            .text(CAPTURE_BUTTONS.TASK_EDIT, CAPTURE_CALLBACKS.INBOX_EDIT(task.id))
            .row()
            .text(CAPTURE_BUTTONS.TASK_DELETE, CAPTURE_CALLBACKS.INBOX_DELETE(task.id));
        await sendTaskMessage(ctx.api, Number(userId), task, keyboard);
    }
};

const sendInboxForDate = async (ctx: BotContext, date: Date, userId: bigint): Promise<void> => {
    const tasks = await captureService.getTasksByDate(userId, date);
    await sendTaskList(ctx, userId, tasks,
        INBOX_TEXTS.FOOTER_DATE(formatDayLabel(date)),
        INBOX_TEXTS.NO_TASKS_DATE(formatDayLabel(date)),
    );
};

export const registerCaptureHandler = (bot: Bot<BotContext>) => {
    bot.command("add", async (ctx) => {
        logger.debug({ userId: ctx.from!.id }, CAPTURE_LOG.CMD_ADD);
        ctx.session.scene = null;
        ctx.session.capture = {};
        ctx.session.captureStartedAt = Date.now();
        ctx.session.onboarding = undefined;
        ctx.session.brief = undefined;
        ctx.session.rescheduleTaskId = undefined;
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.command("inbox", async (ctx) => {
        logger.debug({ userId: ctx.from!.id }, CAPTURE_LOG.CMD_INBOX);
        await sendInboxMenu(ctx);
    });

    bot.callbackQuery(GLOBAL_CALLBACKS.ADD_TASK, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.capture = {};
        ctx.session.captureStartedAt = Date.now();
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.ADD_MORE, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.capture = {};
        ctx.session.captureStartedAt = Date.now();
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.INBOX, async (ctx) => {
        await ctx.answerCallbackQuery();
        logger.debug({ userId: ctx.from.id }, CAPTURE_LOG.INBOX_OPEN_MENU);
        await sendInboxMenu(ctx);
    });

    bot.callbackQuery(INBOX_CALLBACKS.SHOW_TODAY, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, CAPTURE_LOG.INBOX_SHOW_TODAY);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        await sendInboxForDate(ctx, today, userId);
    });

    bot.callbackQuery(INBOX_CALLBACKS.SHOW_WEEK, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, CAPTURE_LOG.INBOX_SHOW_WEEK);
        const { weekStart, weekEnd } = getWeekBounds();
        const tasks = await captureService.getWeekTasks(userId, weekStart, weekEnd);
        await sendTaskList(ctx, userId, tasks, INBOX_TEXTS.FOOTER_WEEK, INBOX_TEXTS.NO_TASKS_WEEK);
    });

    bot.callbackQuery(INBOX_CALLBACKS.SHOW_NO_DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, CAPTURE_LOG.INBOX_SHOW_NO_DATE);
        const tasks = await captureService.getNoDateTasks(userId);
        await sendTaskList(ctx, userId, tasks, INBOX_TEXTS.FOOTER_NO_DATE, INBOX_TEXTS.NO_TASKS_NO_DATE);
    });

    bot.callbackQuery(INBOX_CALLBACKS.SHOW_ALL, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, CAPTURE_LOG.INBOX_SHOW_ALL);
        const tasks = await captureService.getActiveTasks(userId);
        await sendTaskList(ctx, userId, tasks, INBOX_TEXTS.FOOTER_ALL, INBOX_TEXTS.NO_TASKS_ALL);
    });

    bot.callbackQuery(INBOX_PATTERNS.DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const iso = ctx.match[1];
        logger.debug({ userId: ctx.from.id, date: iso }, CAPTURE_LOG.INBOX_FILTER_DATE);
        const date = new Date(iso);
        await sendInboxForDate(ctx, date, BigInt(ctx.from.id));
    });

    bot.callbackQuery(CAPTURE_PATTERNS.INBOX_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        logger.info({ userId: ctx.from.id, taskId }, CAPTURE_LOG.INBOX_TASK_DONE);
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
            isInboxEdit: true,
        };
        clearHistory(ctx);
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_PATTERNS.INBOX_DELETE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        logger.info({ userId: ctx.from.id, taskId }, CAPTURE_LOG.INBOX_TASK_DELETED);
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
        if (await resetExpiredCapture(ctx)) return;
        const category = ctx.match[1] as Category;
        ctx.session.capture = { ...ctx.session.capture, category };
        await sendDurationStep(ctx);
    });

    bot.callbackQuery(CAPTURE_PATTERNS.DURATION, async (ctx) => {
        await ctx.answerCallbackQuery();
        if (await resetExpiredCapture(ctx)) return;
        const duration_tag = ctx.match[1] as DurationTag;
        ctx.session.capture = { ...ctx.session.capture, duration_tag };
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_DATE);
        await editOrReply(ctx, CAPTURE_TEXTS.DATE_PROMPT, { reply_markup: buildDateKeyboard() });
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_TIME, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_TIME);
        await editOrReply(ctx, CAPTURE_TEXTS.TIME_PROMPT, { reply_markup: backButton() });
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_DELEGATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.AWAITING_DELEGATE);
        await editOrReply(ctx, CAPTURE_TEXTS.DELEGATE_PROMPT, { reply_markup: backButton() });
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        if (await resetExpiredCapture(ctx)) return;
        logger.info({ userId: ctx.from.id }, CAPTURE_LOG.TASK_SAVED);
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
        await editOrReply(ctx, CAPTURE_TEXTS.CATEGORY_PROMPT, { reply_markup: keyboard });
    });

    bot.callbackQuery(CAPTURE_PATTERNS.OPTION_CATEGORY, async (ctx) => {
        await ctx.answerCallbackQuery();
        if (await resetExpiredCapture(ctx)) return;
        const category = ctx.match[1] as Category;
        ctx.session.capture = { ...ctx.session.capture, category };
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(CAPTURE_CALLBACKS.OPTION_TITLE, async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, CAPTURE_SCENES.EDIT_TITLE);
        const current = ctx.session.capture?.title ?? "";
        await editOrReply(ctx, CAPTURE_TEXTS.TITLE_EDIT_PROMPT(current), { reply_markup: backButton() });
    });

    bot.callbackQuery(CAPTURE_PATTERNS.DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        if (await resetExpiredCapture(ctx)) return;
        const value = ctx.match[1];

        if (value === DATE_PRESETS.CUSTOM.value) {
            await editOrReply(ctx, CAPTURE_TEXTS.DATE_PROMPT, { reply_markup: backButton() });
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
        if (await resetExpiredCapture(ctx)) return;
        const action = ctx.match[1];

        if (action === QUIET_WARNING_ACTIONS.SAVE) {
            await saveTask(ctx);
        } else {
            pushScene(ctx, CAPTURE_SCENES.AWAITING_TIME);
            await editOrReply(ctx, CAPTURE_TEXTS.TIME_PROMPT, { reply_markup: backButton() });
        }
    });

    bot.on("message:text", async (ctx, next) => {
        const scene = ctx.session.scene;

        const isCaptureScene = scene !== null && scene.startsWith("capture:");
        if (isCaptureScene && await resetExpiredCapture(ctx)) return;

        if (scene === CAPTURE_SCENES.AWAITING_TITLE) {
            const title = ctx.message.text.trim();

            if (!title) {
                await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY);
                return;
            }

            if (title.length > TITLE_MAX_LENGTH) {
                logger.warn({ userId: ctx.from.id, length: title.length }, CAPTURE_LOG.TITLE_TOO_LONG);
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
