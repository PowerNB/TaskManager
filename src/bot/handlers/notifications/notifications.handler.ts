import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { notificationService } from "#root/services/notification.service.js";
import { formatDateDisplay, parseDateString, resolveDatePreset } from "#root/utils/time.js";
import {
    NOTIF_TEXTS,
    NOTIF_BUTTONS,
    NOTIF_CALLBACKS,
    NOTIF_PATTERNS,
    NOTIF_SCENES,
    NOTIF_PRESET_VALUES,
} from "./const.js";

export const registerNotificationsHandler = (bot: Bot<BotContext>) => {
    bot.callbackQuery(NOTIF_PATTERNS.DELEGATION_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.markDone(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(NOTIF_TEXTS.TASK_DONE);
    });

    bot.callbackQuery(NOTIF_PATTERNS.DELEGATION_SNOOZE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.snoozeDelegation(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(NOTIF_TEXTS.DELEGATION_SNOOZED);
    });

    bot.callbackQuery(NOTIF_PATTERNS.DELEGATION_TAKE_BACK, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.takeBack(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(NOTIF_TEXTS.TASK_TAKEN_BACK);
    });

    bot.callbackQuery(NOTIF_PATTERNS.DEADLINE_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.markDone(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(NOTIF_TEXTS.TASK_DONE);
    });

    bot.callbackQuery(NOTIF_PATTERNS.DEADLINE_DELETE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await notificationService.markDeleted(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(NOTIF_TEXTS.TASK_DELETED);
    });

    bot.callbackQuery(NOTIF_PATTERNS.DEADLINE_RESCHEDULE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        ctx.session.scene = NOTIF_SCENES.RESCHEDULE;
        ctx.session.rescheduleTaskId = taskId;

        const keyboard = new InlineKeyboard()
            .text(NOTIF_BUTTONS.TOMORROW, NOTIF_CALLBACKS.RESCHEDULE_DATE("tomorrow", taskId))
            .text(NOTIF_BUTTONS.IN_3_DAYS, NOTIF_CALLBACKS.RESCHEDULE_DATE("in_3_days", taskId))
            .row()
            .text(NOTIF_BUTTONS.NEXT_WEEK, NOTIF_CALLBACKS.RESCHEDULE_DATE("next_week", taskId))
            .text(NOTIF_BUTTONS.CUSTOM_DATE, NOTIF_CALLBACKS.RESCHEDULE_DATE(NOTIF_PRESET_VALUES.CUSTOM, taskId));

        await ctx.reply(NOTIF_TEXTS.RESCHEDULE_PROMPT, { reply_markup: keyboard });
    });

    bot.callbackQuery(NOTIF_PATTERNS.RESCHEDULE_DATE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const preset = ctx.match[1];
        const taskId = ctx.match[2];

        if (preset === NOTIF_PRESET_VALUES.CUSTOM) {
            ctx.session.scene = NOTIF_SCENES.RESCHEDULE_CUSTOM;
            ctx.session.rescheduleTaskId = taskId;
            await ctx.reply(NOTIF_TEXTS.RESCHEDULE_CUSTOM_PROMPT);
            return;
        }

        const date = resolveDatePreset(preset);
        await notificationService.reschedule(taskId, date);
        ctx.session.scene = null;
        ctx.session.rescheduleTaskId = undefined;
        await ctx.reply(NOTIF_TEXTS.RESCHEDULED(formatDateDisplay(date)));
    });

    bot.on("message:text", async (ctx, next) => {
        if (ctx.session.scene !== NOTIF_SCENES.RESCHEDULE_CUSTOM) return next();

        const taskId = ctx.session.rescheduleTaskId;
        if (!taskId) return next();

        const date = parseDateString(ctx.message.text.trim());
        if (!date || date < new Date()) {
            await ctx.reply(NOTIF_TEXTS.RESCHEDULE_INVALID);
            return;
        }

        await notificationService.reschedule(taskId, date);
        ctx.session.scene = null;
        ctx.session.rescheduleTaskId = undefined;
        await ctx.reply(NOTIF_TEXTS.RESCHEDULED(formatDateDisplay(date)));
    });
};
