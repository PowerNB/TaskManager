import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { notificationService } from "#root/services/notification.service.js";

export const registerNotificationsHandler = (bot: Bot<BotContext>) => {
    // Delegation: mark done
    bot.callbackQuery(/^notif:delegation:done:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.markDone(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("✅ Задача завершена.");
    });

    // Delegation: snooze 3 days
    bot.callbackQuery(/^notif:delegation:snooze:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.snoozeDelegation(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("⏳ Напомню через 3 дня.");
    });

    // Delegation: take back
    bot.callbackQuery(/^notif:delegation:take_back:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.takeBack(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("↩ Задача возвращена тебе.");
    });

    // Deadline: mark done
    bot.callbackQuery(/^notif:deadline:done:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.markDone(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("✅ Задача завершена.");
    });

    // Deadline: delete
    bot.callbackQuery(/^notif:deadline:delete:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.markDeleted(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("🗑 Задача удалена.");
    });

    // Deadline: reschedule — ask new date
    bot.callbackQuery(/^notif:deadline:reschedule:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        ctx.session.scene = "notif:reschedule";
        ctx.session.rescheduleTaskId = taskId;

        const keyboard = new InlineKeyboard()
            .text("Завтра", `notif:reschedule_date:tomorrow:${taskId}`)
            .text("Через 3 дня", `notif:reschedule_date:in_3_days:${taskId}`)
            .row()
            .text("На следующей неделе", `notif:reschedule_date:next_week:${taskId}`)
            .text("Указать дату", `notif:reschedule_date:custom:${taskId}`);

        await ctx.reply("📅 На когда переносим?", { reply_markup: keyboard });
    });

    // Reschedule date preset selected
    bot.callbackQuery(/^notif:reschedule_date:(.+):(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const preset = ctx.match[1];
        const taskId = ctx.match[2];

        if (preset === "custom") {
            ctx.session.scene = "notif:reschedule_custom";
            ctx.session.rescheduleTaskId = taskId;
            await ctx.reply("Введи дату в формате ДД.ММ или ДД.ММ.ГГГГ:");
            return;
        }

        const date = resolveReschedulePreset(preset);
        await applyReschedule(taskId, date);
        ctx.session.scene = null;
        ctx.session.rescheduleTaskId = undefined;
        await ctx.reply(`✅ Дедлайн перенесён на ${formatDate(date)}.`);
    });

    // Custom reschedule date text input
    bot.on("message:text", async (ctx, next) => {
        if (ctx.session.scene !== "notif:reschedule_custom") return next();

        const taskId = ctx.session.rescheduleTaskId;
        if (!taskId) return next();

        const date = parseDate(ctx.message.text.trim());
        if (!date || date < new Date()) {
            await ctx.reply("Неверная дата или дата в прошлом. Попробуй ещё раз (ДД.ММ или ДД.ММ.ГГГГ):");
            return;
        }

        await applyReschedule(taskId, date);
        ctx.session.scene = null;
        ctx.session.rescheduleTaskId = undefined;
        await ctx.reply(`✅ Дедлайн перенесён на ${formatDate(date)}.`);
    });
};

const resolveReschedulePreset = (preset: string): Date => {
    const now = new Date();
    if (preset === "tomorrow") now.setDate(now.getDate() + 1);
    else if (preset === "in_3_days") now.setDate(now.getDate() + 3);
    else if (preset === "next_week") now.setDate(now.getDate() + 7);
    return now;
};

const applyReschedule = async (taskId: string, date: Date): Promise<void> => {
    await notificationService.reschedule(taskId, date);
};

const formatDate = (date: Date): string => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${d}.${m}.${date.getFullYear()}`;
};

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
