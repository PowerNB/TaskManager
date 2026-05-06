import { userRepository } from "#root/repositories/user.repository.js";
import { UserModel } from "#root/types/models.js";

export const settingsService = {
    findUser: async (userId: bigint): Promise<UserModel | null> => {
        return userRepository.findById(userId);
    },

    ensureUser: async (userId: bigint, username: string | null): Promise<UserModel> => {
        return userRepository.upsert(userId, username);
    },

    setTimezone: async (userId: bigint, timezone: string): Promise<UserModel> => {
        return userRepository.update(userId, { timezone });
    },

    setBriefTime: async (userId: bigint, briefTime: string): Promise<UserModel> => {
        return userRepository.update(userId, { morning_brief_time: briefTime });
    },

    setQuietHours: async (
        userId: bigint,
        from: string | null,
        to: string | null,
    ): Promise<UserModel> => {
        return userRepository.update(userId, {
            quiet_hours_from: from,
            quiet_hours_to: to,
        });
    },
};
