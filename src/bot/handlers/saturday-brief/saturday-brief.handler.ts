import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { lifecycleService } from "#root/services/lifecycle.service.js";


export const registerSaturdayBriefHandler = (bot: Bot<BotContext>) => {
    // Stale task: keep (update last_activity_at)
    bot.callbackQuery(/^sat:stale:keep:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.keepActive(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("✅ Задача оставлена активной.");
    });

    // Stale task: done
    bot.callbackQuery(/^sat:stale:done:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.markDone(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("✅ Задача выполнена.");
    });

    // Stale task: delete
    bot.callbackQuery(/^sat:stale:delete:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.markDeleted(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("🗑 Задача удалена.");
    });

    // Frozen task: return to active
    bot.callbackQuery(/^sat:frozen:return:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.returnFromFrozen(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("↩ Задача возвращена в активные.");
    });

    // Frozen task: delete
    bot.callbackQuery(/^sat:frozen:delete:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await lifecycleService.markDeleted(taskId);
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("🗑 Задача удалена.");
    });
};
