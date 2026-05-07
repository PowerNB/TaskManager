import { userRepository } from "#root/repositories/user.repository.js";
import { UserModel } from "#root/types/models.js";
import { logger } from "#root/logger.js";

export const settingsService = {
    findUser: async (userId: bigint): Promise<UserModel | null> => {
        return userRepository.findById(userId);
    },

    ensureUser: async (userId: bigint, username: string | null): Promise<UserModel> => {
        const user = await userRepository.upsert(userId, username);
        logger.info({ userId: String(userId), username }, "user ensured");
        return user;
    },

    setTimezone: async (userId: bigint, timezone: string): Promise<UserModel> => {
        const user = await userRepository.update(userId, { timezone });
        logger.info({ userId: String(userId), timezone }, "timezone set");
        return user;
    },

    setBriefTime: async (userId: bigint, briefTime: string): Promise<UserModel> => {
        const user = await userRepository.update(userId, { morning_brief_time: briefTime });
        logger.info({ userId: String(userId), briefTime }, "brief time set");
        return user;
    },

    setQuietHours: async (
        userId: bigint,
        from: string | null,
        to: string | null,
    ): Promise<UserModel> => {
        const user = await userRepository.update(userId, {
            quiet_hours_from: from,
            quiet_hours_to: to,
        });
        logger.info({ userId: String(userId), from, to }, "quiet hours set");
        return user;
    },
};
