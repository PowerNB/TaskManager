import { NextFunction } from "grammy";
import { userRepository } from "#root/repositories/user.repository.js";
import { logger } from "#root/logger.js";
import { BotContext } from "#root/types/context.js";

export const authMiddleware = async (ctx: BotContext, next: NextFunction): Promise<void> => {
    const telegramUser = ctx.from;

    if (!telegramUser) {
        return next();
    }

    const id = BigInt(telegramUser.id);
    const username = telegramUser.username ?? null;

    await userRepository.upsert(id, username);
    logger.debug({ id, username }, "auth: user upserted");

    return next();
};
