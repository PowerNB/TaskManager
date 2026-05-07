import { Bot } from "grammy";
import { BotContext } from "#root/types/context.js";
import {
    sendTimezoneStep,
    sendBriefTimeStep,
    sendQuietHoursStep,
    sendSettingsMenu,
} from "#root/bot/handlers/onboarding/onboarding.handler.js";
import { sendMainMenu } from "#root/bot/handlers/menu/menu.js";
import { SETTINGS_CALLBACKS } from "./const.js";
import { MENU_CALLBACKS } from "#root/bot/handlers/menu/const.js";

export const registerSettingsHandler = (bot: Bot<BotContext>) => {
    bot.command("settings", async (ctx) => {
        await sendSettingsMenu(ctx);
    });

    bot.callbackQuery(SETTINGS_CALLBACKS.OPEN, async (ctx) => {
        await ctx.answerCallbackQuery();
        await sendSettingsMenu(ctx);
    });

    bot.callbackQuery(SETTINGS_CALLBACKS.TIMEZONE, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.onboarding = { isEditing: true };
        await sendTimezoneStep(ctx);
    });

    bot.callbackQuery(SETTINGS_CALLBACKS.BRIEF_TIME, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.onboarding = { isEditing: true };
        await sendBriefTimeStep(ctx);
    });

    bot.callbackQuery(SETTINGS_CALLBACKS.QUIET_HOURS, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.onboarding = { isEditing: true };
        await sendQuietHoursStep(ctx);
    });

    bot.callbackQuery(MENU_CALLBACKS.HOME, async (ctx) => {
        await ctx.answerCallbackQuery();
        await sendMainMenu(ctx);
    });
};
