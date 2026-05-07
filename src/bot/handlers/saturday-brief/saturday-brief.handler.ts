import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { lifecycleService } from "#root/services/lifecycle.service.js";
import { SATURDAY_TEXTS, SATURDAY_PATTERNS } from "./const.js";

export const registerSaturdayBriefHandler = (bot: Bot<BotContext>) => {
    bot.callbackQuery(SATURDAY_PATTERNS.STALE_KEEP, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.keepActive(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(SATURDAY_TEXTS.REPLY_KEPT);
    });

    bot.callbackQuery(SATURDAY_PATTERNS.STALE_DONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.markDone(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(SATURDAY_TEXTS.REPLY_DONE);
    });

    bot.callbackQuery(SATURDAY_PATTERNS.STALE_DELETE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.markDeleted(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(SATURDAY_TEXTS.REPLY_DELETED);
    });

    bot.callbackQuery(SATURDAY_PATTERNS.FROZEN_RETURN, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.returnFromFrozen(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(SATURDAY_TEXTS.REPLY_RETURNED);
    });

    bot.callbackQuery(SATURDAY_PATTERNS.FROZEN_DELETE, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.markDeleted(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply(SATURDAY_TEXTS.REPLY_DELETED);
    });
};
