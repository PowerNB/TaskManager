import { Bot, InlineKeyboard } from "grammy";
import { BotContext, CaptureDraft } from "#root/types/context.js";
import { captureService } from "#root/services/capture.service.js";
import { settingsService } from "#root/services/settings.service.js";
import { isTimeInQuietHours } from "#root/utils/time.js";
import { pushScene, popScene, clearHistory } from "#root/utils/scene.js";
import { sendMainMenu } from "#root/bot/handlers/menu.js";
import { sendTaskMessage, buildTaskTags } from "#root/bot/handlers/task-message.js";
import { Category, DurationTag } from "#root/types/enums.js";
import {
    CAPTURE_TEXTS,
    CATEGORY_OPTIONS,
    DURATION_OPTIONS,
    DATE_PRESETS,
} from "./const.js";


const TITLE_MAX_LENGTH = 200;

const parseDate = (value: string): Date | null => {
    const shortMatch = value.match(/^(\d{2})\.(\d{2})$/);
    const fullMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    if (shortMatch) {
        const [, day, month] = shortMatch;
        const year = new Date().getFullYear();
        return new Date(`${year}-${month}-${day}`);
    }

    if (fullMatch) {
        const [, day, month, year] = fullMatch;
        return new Date(`${year}-${month}-${day}`);
    }

    return null;
};

const resolveDatePreset = (preset: string): Date => {
    const now = new Date();
    if (preset === "tomorrow") now.setDate(now.getDate() + 1);
    if (preset === "in_3_days") now.setDate(now.getDate() + 3);
    return now;
};

const isValidTime = (value: string): boolean =>
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

const backButton = (): InlineKeyboard => new InlineKeyboard().text("◀ Назад", "capture:back");

const buildOptionsKeyboard = (draft: CaptureDraft): InlineKeyboard => {
    const dateLabel = draft.due_date
        ? `📅 ${draft.due_date.slice(8)}.${draft.due_date.slice(5, 7)}`
        : "📅 Дату";
    const timeLabel = draft.due_time ? `⏰ ${draft.due_time}` : "⏰ Время";
    const delegateLabel = draft.delegated_to ? `👤 ${draft.delegated_to}` : "👤 Делегировать";
    const categoryLabel = draft.category === "CAREER" ? "💼 Карьера" : draft.category === "PERSONAL" ? "🎯 Личное" : "📂 Категория";

    return new InlineKeyboard()
        .text(dateLabel, "capture:option:date")
        .text(timeLabel, "capture:option:time")
        .row()
        .text(categoryLabel, "capture:option:category")
        .text("✏️ Название", "capture:option:title")
        .row()
        .text(delegateLabel, "capture:option:delegate")
        .row()
        .text("✅ Готово", "capture:option:done")
        .row()
        .text("◀ Назад", "capture:back");
};

const buildDateKeyboard = (prefix: string): InlineKeyboard =>
    new InlineKeyboard()
        .text(DATE_PRESETS.TODAY.label, `${prefix}:today`)
        .text(DATE_PRESETS.TOMORROW.label, `${prefix}:tomorrow`)
        .row()
        .text(DATE_PRESETS.IN_3_DAYS.label, `${prefix}:in_3_days`)
        .text(DATE_PRESETS.CUSTOM.label, `${prefix}:custom`)
        .row()
        .text("◀ Назад", "capture:back");

const sendTitleStep = async (ctx: BotContext) => {
    pushScene(ctx, "capture:awaiting_title");
    await ctx.reply(CAPTURE_TEXTS.TITLE_PROMPT);
};

const sendCategoryStep = async (ctx: BotContext) => {
    pushScene(ctx, "capture:awaiting_category");
    const keyboard = new InlineKeyboard();
    Object.values(CATEGORY_OPTIONS).forEach(({ label, value }) =>
        keyboard.text(label, `capture:category:${value}`),
    );
    keyboard.row().text("◀ Назад", "capture:back");
    await ctx.reply(CAPTURE_TEXTS.CATEGORY_PROMPT, { reply_markup: keyboard });
};

const sendDurationStep = async (ctx: BotContext) => {
    pushScene(ctx, "capture:awaiting_duration");
    const keyboard = new InlineKeyboard();
    Object.values(DURATION_OPTIONS).forEach(({ label, value }) =>
        keyboard.text(label, `capture:duration:${value}`),
    );
    keyboard.row().text("◀ Назад", "capture:back");
    await ctx.reply(CAPTURE_TEXTS.DURATION_PROMPT, { reply_markup: keyboard });
};

const sendOptionsStep = async (ctx: BotContext) => {
    pushScene(ctx, "capture:awaiting_options");
    const keyboard = buildOptionsKeyboard(ctx.session.capture ?? {});
    await ctx.reply(CAPTURE_TEXTS.OPTIONS_PROMPT, { reply_markup: keyboard });
};

const sendConfirmation = async (ctx: BotContext) => {
    const draft = ctx.session.capture ?? {};
    const tags: string[] = [];

    if (draft.category === "CAREER") tags.push("💼 Карьера");
    if (draft.category === "PERSONAL") tags.push("🎯 Личное");

    const durationLabels: Record<string, string> = {
        MIN_5: "⚡ 5 мин",
        MIN_30: "🕐 30 мин",
        HOUR_1: "🕑 1 час",
        HOUR_2: "🕒 2 часа",
        PROJECT: "📁 Проект",
    };
    if (draft.duration_tag) tags.push(durationLabels[draft.duration_tag]);
    if (draft.due_date) tags.push(`📅 ${draft.due_date}`);
    if (draft.due_time) tags.push(`⏰ ${draft.due_time}`);
    if (draft.delegated_to) tags.push(`👤 ${draft.delegated_to}`);

    const keyboard = new InlineKeyboard()
        .text(CAPTURE_TEXTS.ADD_MORE, "capture:add_more")
        .text(CAPTURE_TEXTS.OPEN_INBOX, "capture:inbox");

    await ctx.reply(
        `${CAPTURE_TEXTS.CONFIRMED}\n\n<b>${draft.title}</b>\n<i>${tags.join(" ")}</i>`,
        { reply_markup: keyboard, parse_mode: "HTML" },
    );

    ctx.session.scene = null;
    ctx.session.capture = undefined;
    clearHistory(ctx);
};

const buildDueTime = (date: string | undefined, time: string | undefined): Date | null => {
    if (!time) return null;
    const dateStr = date ?? new Date().toISOString().split("T")[0];
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
        ctx.session.scene = null;
        ctx.session.capture = {};
        ctx.session.onboarding = undefined;
        ctx.session.brief = undefined;
        ctx.session.rescheduleTaskId = undefined;
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.command("inbox", async (ctx) => {
        const userId = BigInt(ctx.from!.id);
        const tasks = await captureService.getActiveTasks(userId);

        if (tasks.length === 0) {
            await ctx.reply("📥 Инбокс пуст. Добавь первую задачу!", {
                reply_markup: new InlineKeyboard()
                    .text("+ Добавить задачу", "add_task")
                    .row()
                    .text("🏠 Главное меню", "menu:home"),
            });
            return;
        }

        await ctx.reply(`📥 Инбокс — ${tasks.length} задач`);

        for (const task of tasks) {
            const keyboard = new InlineKeyboard()
                .text("✅ Выполнено", `inbox:done:${task.id}`)
                .text("✏️ Изменить", `inbox:edit:${task.id}`)
                .row()
                .text("🗑 Удалить", `inbox:delete:${task.id}`);
            await sendTaskMessage(ctx.api, ctx.from!.id, task, keyboard);
        }

        await ctx.reply("—", {
            reply_markup: new InlineKeyboard().text("🏠 Главное меню", "menu:home"),
        });
    });

    bot.callbackQuery("add_task", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.capture = {};
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.callbackQuery("capture:add_more", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.capture = {};
        clearHistory(ctx);
        await sendTitleStep(ctx);
    });

    bot.callbackQuery("capture:inbox", async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        const tasks = await captureService.getActiveTasks(userId);

        if (tasks.length === 0) {
            await ctx.reply("📥 Инбокс пуст. Добавь первую задачу!", {
                reply_markup: new InlineKeyboard()
                    .text("+ Добавить задачу", "add_task")
                    .row()
                    .text("🏠 Главное меню", "menu:home"),
            });
            return;
        }

        await ctx.reply(`📥 Инбокс — ${tasks.length} задач`);

        for (const task of tasks) {
            const keyboard = new InlineKeyboard()
                .text("✅ Выполнено", `inbox:done:${task.id}`)
                .text("✏️ Изменить", `inbox:edit:${task.id}`)
                .row()
                .text("🗑 Удалить", `inbox:delete:${task.id}`);
            await sendTaskMessage(ctx.api, ctx.from!.id, task, keyboard);
        }

        await ctx.reply("—", {
            reply_markup: new InlineKeyboard().text("🏠 Главное меню", "menu:home"),
        });
    });

    bot.callbackQuery(/^inbox:done:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        const task = await captureService.markTaskDone(taskId);
        const msg = ctx.callbackQuery.message;
        const emptyKeyboard = new InlineKeyboard();
        const doneText = `✅ <b>${task.title}</b>\n<i>${buildTaskTags(task)}</i>`;
        if (msg && ("photo" in msg || "video" in msg || "document" in msg || "audio" in msg || "voice" in msg)) {
            await ctx.editMessageCaption({ caption: doneText, reply_markup: emptyKeyboard, parse_mode: "HTML" });
        } else {
            await ctx.editMessageText(doneText, { reply_markup: emptyKeyboard, parse_mode: "HTML" });
        }
    });

    bot.callbackQuery(/^inbox:edit:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        const task = await captureService.getTaskById(taskId);
        if (!task) return;

        const due_date = task.due_date ? task.due_date.toISOString().split("T")[0] : undefined;
        const due_time = task.due_time
            ? `${String(task.due_time.getUTCHours()).padStart(2, "0")}:${String(task.due_time.getUTCMinutes()).padStart(2, "0")}`
            : undefined;

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

    bot.callbackQuery(/^inbox:delete:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await captureService.markTaskDeleted(taskId);
        const msg = ctx.callbackQuery.message;
        const emptyKeyboard = new InlineKeyboard();
        if (msg && "photo" in msg || msg && "video" in msg || msg && "document" in msg || msg && "audio" in msg || msg && "voice" in msg) {
            await ctx.editMessageCaption({ caption: "🗑 Задача удалена", reply_markup: emptyKeyboard });
        } else {
            await ctx.editMessageText("🗑 Задача удалена", { reply_markup: emptyKeyboard });
        }
    });

    // Back navigation
    bot.callbackQuery("capture:back", async (ctx) => {
        await ctx.answerCallbackQuery();
        const prev = popScene(ctx);

        if (prev === null) {
            ctx.session.capture = undefined;
            clearHistory(ctx);
            await sendMainMenu(ctx);
            return;
        }

        if (prev === "capture:awaiting_title") {
            await ctx.reply(CAPTURE_TEXTS.TITLE_PROMPT);
            return;
        }

        if (prev === "capture:awaiting_category") {
            await sendCategoryStep(ctx);
            return;
        }

        if (prev === "capture:awaiting_duration") {
            await sendDurationStep(ctx);
            return;
        }

        if (prev === "capture:awaiting_options") {
            await sendOptionsStep(ctx);
            return;
        }
    });

    bot.callbackQuery(/^capture:category:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const category = ctx.match[1] as Category;
        ctx.session.capture = { ...ctx.session.capture, category };
        await sendDurationStep(ctx);
    });

    bot.callbackQuery(/^capture:duration:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const duration_tag = ctx.match[1] as DurationTag;
        ctx.session.capture = { ...ctx.session.capture, duration_tag };
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery("capture:option:date", async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, "capture:awaiting_date");
        await ctx.reply(CAPTURE_TEXTS.DATE_PROMPT, {
            reply_markup: buildDateKeyboard("capture:date"),
        });
    });

    bot.callbackQuery("capture:option:time", async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, "capture:awaiting_time");
        await ctx.reply(CAPTURE_TEXTS.TIME_PROMPT, { reply_markup: backButton() });
    });

    bot.callbackQuery("capture:option:delegate", async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, "capture:awaiting_delegate");
        await ctx.reply(CAPTURE_TEXTS.DELEGATE_PROMPT, { reply_markup: backButton() });
    });

    bot.callbackQuery("capture:option:done", async (ctx) => {
        await ctx.answerCallbackQuery();
        await saveTask(ctx);
    });

    bot.callbackQuery("capture:option:category", async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, "capture:awaiting_category");
        const keyboard = new InlineKeyboard();
        Object.values(CATEGORY_OPTIONS).forEach(({ label, value }) =>
            keyboard.text(label, `capture:option:category:${value}`),
        );
        keyboard.row().text("◀ Назад", "capture:back");
        await ctx.reply(CAPTURE_TEXTS.CATEGORY_PROMPT, { reply_markup: keyboard });
    });

    bot.callbackQuery(/^capture:option:category:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const category = ctx.match[1] as Category;
        ctx.session.capture = { ...ctx.session.capture, category };
        await sendOptionsStep(ctx);
    });

    bot.callbackQuery("capture:option:title", async (ctx) => {
        await ctx.answerCallbackQuery();
        pushScene(ctx, "capture:edit_title");
        const current = ctx.session.capture?.title ?? "";
        await ctx.reply(
            `Текущее: "${current}"\n\nВведи новое название (или отправь с аттачментом).`,
            { reply_markup: backButton() },
        );
    });

    bot.callbackQuery(/^capture:date:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const value = ctx.match[1];

        if (value === "custom") {
            await ctx.reply(CAPTURE_TEXTS.DATE_PROMPT, { reply_markup: backButton() });
            return;
        }

        const date = resolveDatePreset(value);
        ctx.session.capture = {
            ...ctx.session.capture,
            due_date: date.toISOString().split("T")[0],
        };

        await sendOptionsStep(ctx);
    });

    bot.callbackQuery(/^capture:quiet_warning:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const action = ctx.match[1];

        if (action === "save") {
            await saveTask(ctx);
        } else {
            pushScene(ctx, "capture:awaiting_time");
            await ctx.reply(CAPTURE_TEXTS.TIME_PROMPT, { reply_markup: backButton() });
        }
    });

    bot.on("message:text", async (ctx, next) => {
        const scene = ctx.session.scene;

        if (scene === "capture:awaiting_title") {
            const title = ctx.message.text.trim();

            if (!title) {
                await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY);
                return;
            }

            if (title.length > TITLE_MAX_LENGTH) {
                await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG);
                return;
            }

            ctx.session.capture = { ...ctx.session.capture, title };
            await sendCategoryStep(ctx);
            return;
        }

        if (scene === "capture:edit_title") {
            const title = ctx.message.text.trim();
            if (!title) { await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY); return; }
            if (title.length > TITLE_MAX_LENGTH) { await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG); return; }
            ctx.session.capture = { ...ctx.session.capture, title, attachment_file_id: undefined, attachment_type: undefined };
            await sendOptionsStep(ctx);
            return;
        }

        if (scene === "capture:awaiting_category" || scene === "capture:awaiting_duration") {
            return;
        }

        if (scene === "capture:awaiting_date") {
            const value = ctx.message.text.trim();
            const date = parseDate(value);

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
                due_date: date.toISOString().split("T")[0],
            };

            await sendOptionsStep(ctx);
            return;
        }

        if (scene === "capture:awaiting_time") {
            const value = ctx.message.text.trim();

            if (!isValidTime(value)) {
                await ctx.reply(CAPTURE_TEXTS.TIME_INVALID);
                return;
            }

            const dueTime = value;
            const userId = BigInt(ctx.from.id);
            const user = await settingsService.findUser(userId);

            if (user?.quiet_hours_from && user.quiet_hours_to) {
                const timeMinusHour = dueTime.split(":").map(Number);
                timeMinusHour[0] = (timeMinusHour[0] - 1 + 24) % 24;
                const reminderTime = `${String(timeMinusHour[0]).padStart(2, "0")}:${String(timeMinusHour[1]).padStart(2, "0")}`;

                if (
                    isTimeInQuietHours(dueTime, user.quiet_hours_from, user.quiet_hours_to) ||
                    isTimeInQuietHours(reminderTime, user.quiet_hours_from, user.quiet_hours_to)
                ) {
                    ctx.session.capture = { ...ctx.session.capture, due_time: dueTime };
                    const keyboard = new InlineKeyboard()
                        .text("Да, сохранить", "capture:quiet_warning:save")
                        .text("Изменить время", "capture:quiet_warning:change");
                    await ctx.reply(CAPTURE_TEXTS.QUIET_HOURS_WARNING(dueTime), { reply_markup: keyboard });
                    return;
                }
            }

            ctx.session.capture = { ...ctx.session.capture, due_time: dueTime };
            await sendOptionsStep(ctx);
            return;
        }

        if (scene === "capture:awaiting_delegate") {
            const delegated_to = ctx.message.text.trim();
            ctx.session.capture = { ...ctx.session.capture, delegated_to };
            await sendOptionsStep(ctx);
            return;
        }

        return next();
    });

    const applyMediaTitle = async (ctx: BotContext, fileId: string, type: string, caption: string | undefined, next: () => Promise<void>) => {
        const scene = ctx.session.scene;
        if (scene === "capture:edit_title") {
            const title = (caption ?? "").trim();
            if (!title) { await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY); return; }
            if (title.length > TITLE_MAX_LENGTH) { await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG); return; }
            ctx.session.capture = { ...ctx.session.capture, title, attachment_file_id: fileId, attachment_type: type };
            await sendOptionsStep(ctx);
            return;
        }
        if (scene !== "capture:awaiting_title") return next();
        const title = (caption ?? "").trim();
        if (!title) { await ctx.reply(CAPTURE_TEXTS.TITLE_EMPTY); return; }
        if (title.length > TITLE_MAX_LENGTH) { await ctx.reply(CAPTURE_TEXTS.TITLE_TOO_LONG); return; }
        ctx.session.capture = { ...ctx.session.capture, title, attachment_file_id: fileId, attachment_type: type };
        await sendCategoryStep(ctx);
    };

    bot.on("message:photo", async (ctx, next) => {
        const photos = ctx.message.photo;
        const photo = photos[photos.length - 1];
        await applyMediaTitle(ctx, photo.file_id, "photo", ctx.message.caption, next);
    });

    bot.on("message:video", async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.video.file_id, "video", ctx.message.caption, next);
    });

    bot.on("message:document", async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.document.file_id, "document", ctx.message.caption, next);
    });

    bot.on("message:audio", async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.audio.file_id, "audio", ctx.message.caption, next);
    });

    bot.on("message:voice", async (ctx, next) => {
        await applyMediaTitle(ctx, ctx.message.voice.file_id, "voice", ctx.message.caption, next);
    });
};
