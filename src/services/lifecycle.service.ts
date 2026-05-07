import { taskRepository } from "#root/repositories/task.repository.js";
import { logger } from "#root/logger.js";

export const lifecycleService = {
    keepActive: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { last_activity_at: new Date() });
        logger.info({ taskId }, "task kept active");
    },

    markDone: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DONE", completed_at: new Date() });
        logger.info({ taskId }, "task lifecycle: DONE");
    },

    markDeleted: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DELETED" });
        logger.info({ taskId }, "task lifecycle: DELETED");
    },

    returnFromFrozen: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, {
            status: "ACTIVE",
            frozen_at: null,
            last_activity_at: new Date(),
        });
        logger.info({ taskId }, "task returned from frozen");
    },
};
