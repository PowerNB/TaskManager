import { InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";

const MAIN_MENU_TEXT = "Главное меню";

export const sendMainMenu = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard()
        .text("+ Добавить задачу", "add_task")
        .text("📥 Инбокс", "capture:inbox")
        .row()
        .text("⚙️ Настройки", "settings:open");

    await ctx.reply(MAIN_MENU_TEXT, { reply_markup: keyboard });
};
