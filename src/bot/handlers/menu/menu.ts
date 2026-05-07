import { InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { MENU_TEXTS, MENU_BUTTONS, MENU_CALLBACKS } from "./const.js";

export const sendMainMenu = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard()
        .text(MENU_BUTTONS.ADD_TASK, MENU_CALLBACKS.ADD_TASK)
        .text(MENU_BUTTONS.INBOX, MENU_CALLBACKS.INBOX)
        .row()
        .text(MENU_BUTTONS.SETTINGS, MENU_CALLBACKS.SETTINGS);

    await ctx.reply(MENU_TEXTS.MAIN_MENU, { reply_markup: keyboard });
};
