import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { userRepository } from "#root/repositories/user.repository.js";
import {
    sendTimezoneStep,
    sendBriefTimeStep,
    sendQuietHoursStep,
} from "#root/bot/handlers/onboarding/onboarding.handler.js";
import { sendMainMenu } from "#root/bot/handlers/menu.js";

const buildSettingsText = async (userId: bigint): Promise<string> => {
    const user = await userRepository.findById(userId);
    if (!user) return "Настройки не найдены.";

    const quietHours =
        user.quiet_hours_from && user.quiet_hours_to
            ? `${user.quiet_hours_from} — ${user.quiet_hours_to}`
            : "не настроены";

    return `⚙️ Настройки\n\n🕐 Часовой пояс: ${user.timezone}\n🌅 Утренний бриф: ${user.morning_brief_time}\n🌙 Тихие часы: ${quietHours}`;
};

const buildSettingsKeyboard = (): InlineKeyboard =>
    new InlineKeyboard()
        .text("Изменить", "settings:timezone")
        .row()
        .text("Изменить", "settings:brief_time")
        .row()
        .text("Изменить", "settings:quiet_hours")
        .row()
        .text("🏠 Главное меню", "menu:home");

export const registerSettingsHandler = (bot: Bot<BotContext>) => {
    bot.command("settings", async (ctx) => {
        const userId = BigInt(ctx.from!.id);
        const text = await buildSettingsText(userId);
        await ctx.reply(text, { reply_markup: buildSettingsKeyboard() });
    });

    bot.callbackQuery("settings:open", async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = BigInt(ctx.from.id);
        const text = await buildSettingsText(userId);
        await ctx.reply(text, { reply_markup: buildSettingsKeyboard() });
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
