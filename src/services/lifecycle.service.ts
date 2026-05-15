import { taskRepository } from "#root/repositories/task.repository.js";
import { logger } from "#root/logger.js";
import { LIFECYCLE_LOG } from "./const.js";

export const lifecycleService = {
    keepActive: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { last_activity_at: new Date() });
        logger.info({ taskId }, LIFECYCLE_LOG.KEPT_ACTIVE);
    },

    markDone: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DONE", completed_at: new Date() });
        logger.info({ taskId }, LIFECYCLE_LOG.DONE);
    },

    markDeleted: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DELETED" });
        logger.info({ taskId }, LIFECYCLE_LOG.DELETED);
    },

    returnFromFrozen: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, {
            status: "ACTIVE",
            frozen_at: null,
            last_activity_at: new Date(),
        });
        logger.info({ taskId }, LIFECYCLE_LOG.RETURNED_FROM_FROZEN);
    },
};
