import { taskRepository } from "#root/repositories/task.repository.js";

export const lifecycleService = {
    keepActive: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { last_activity_at: new Date() });
    },

    markDone: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DONE", completed_at: new Date() });
    },

    markDeleted: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DELETED" });
    },

    returnFromFrozen: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, {
            status: "ACTIVE",
            frozen_at: null,
            last_activity_at: new Date(),
        });
    },
};
