import { Bot } from "grammy";
import { BotContext } from "#root/types/context.js";
import {
    sendTimezoneStep,
    sendBriefTimeStep,
    sendQuietHoursStep,
    sendSettingsMenu,
} from "#root/bot/handlers/onboarding/onboarding.handler.js";
import { sendMainMenu } from "#root/bot/handlers/menu.js";

export const registerSettingsHandler = (bot: Bot<BotContext>) => {
    bot.command("settings", async (ctx) => {
        await sendSettingsMenu(ctx);
    });

    bot.callbackQuery("settings:open", async (ctx) => {
        await ctx.answerCallbackQuery();
        await sendSettingsMenu(ctx);
    });

    bot.callbackQuery("settings:timezone", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.onboarding = { isEditing: true };
        await sendTimezoneStep(ctx);
    });

    bot.callbackQuery("settings:brief_time", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.onboarding = { isEditing: true };
        await sendBriefTimeStep(ctx);
    });

    bot.callbackQuery("settings:quiet_hours", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.onboarding = { isEditing: true };
        await sendQuietHoursStep(ctx);
    });

    bot.callbackQuery("menu:home", async (ctx) => {
        await ctx.answerCallbackQuery();
        await sendMainMenu(ctx);
    });
};
