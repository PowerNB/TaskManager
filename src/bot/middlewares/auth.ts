import { NextFunction } from "grammy";
import { logger } from "#root/logger.js";
import { BotContext } from "#root/types/context.js";

export const authMiddleware = async (ctx: BotContext, next: NextFunction): Promise<void> => {
    const telegramUser = ctx.from;

    if (!telegramUser) {
        return next();
    }

    logger.debug({ id: telegramUser.id }, "auth: user check");

    return next();
};
