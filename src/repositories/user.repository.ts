import { prisma } from "#root/infrastructure/prisma.js";
import { logger } from "#root/logger.js";
import { UserModel } from "#root/infrastructure/generated/prisma/models/User.js";

export const userRepository = {
    findById: async (id: bigint): Promise<UserModel | null> => {
        logger.debug({ id }, "userRepository.findById");
        return prisma.user.findUnique({ where: { id } });
    },

    upsert: async (id: bigint, username: string | null): Promise<UserModel> => {
        logger.debug({ id, username }, "userRepository.upsert");
        return prisma.user.upsert({
            where: { id },
            create: { id, username },
            update: { username },
        });
    },
};
