import { userRepository } from "#root/repositories/user.repository.js";
import { UserModel } from "#root/infrastructure/generated/prisma/models/User.js";

export const settingsService = {
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
