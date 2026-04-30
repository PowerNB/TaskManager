import { Bot } from "grammy";
import { config } from "#root/config.js";
import { BotContext } from "#root/types/context.js";
import { sessionMiddleware } from "#root/bot/middlewares/session.js";
import { authMiddleware } from "#root/bot/middlewares/auth.js";

export const bot = new Bot<BotContext>(config.BOT_TOKEN);

bot.use(sessionMiddleware);
bot.use(authMiddleware);
