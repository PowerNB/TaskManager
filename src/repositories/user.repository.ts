import { logger } from "#root/logger.js";
import { UserModel, UserUpdateInput } from "#root/infrastructure/generated/prisma/models/User.js";
import Repository from "./repository.js";
import { USER_REPOSITORY_LOGS } from "./const.js";

class UserRepository extends Repository {
    findById(id: bigint): Promise<UserModel | null> {
        logger.debug({ id }, USER_REPOSITORY_LOGS.FIND_BY_ID);
        return this.client.user.findUnique({ where: { id } });
    }

    upsert(id: bigint, username: string | null): Promise<UserModel> {
        logger.debug({ id, username }, USER_REPOSITORY_LOGS.UPSERT);
        return this.client.user.upsert({
            where: { id },
            create: { id, username },
            update: { username },
        });
    }

    update(id: bigint, data: UserUpdateInput): Promise<UserModel> {
        logger.debug({ id, data }, USER_REPOSITORY_LOGS.UPDATE);
        return this.client.user.update({ where: { id }, data });
    }

    findAll(): Promise<UserModel[]> {
        logger.debug(USER_REPOSITORY_LOGS.FIND_ALL);
        return this.client.user.findMany();
    }
}

export const userRepository = new UserRepository();
