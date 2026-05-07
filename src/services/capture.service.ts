import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/types/models.js";
import { Category, DurationTag } from "#root/types/enums.js";
import { logger } from "#root/logger.js";

interface CreateTaskParams {
    userId: bigint;
    title: string;
    category: Category;
    duration_tag: DurationTag;
    due_date?: Date | null;
    due_time?: Date | null;
    delegated_to?: string | null;
    attachment_file_id?: string | null;
    attachment_type?: string | null;
}

interface UpdateTaskParams {
    title?: string;
    due_date?: Date | null;
    due_time?: Date | null;
    delegated_to?: string | null;
    attachment_file_id?: string | null;
    attachment_type?: string | null;
}

export const captureService = {
    createTask: async (params: CreateTaskParams): Promise<TaskModel> => {
        const { userId, title, category, duration_tag, due_date, due_time, delegated_to, attachment_file_id, attachment_type } = params;

        const now = new Date();
        const delegatedAt = delegated_to ? now : null;
        const remindDelegationAt = delegated_to
            ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
            : null;

        const task = await taskRepository.create({
            user: { connect: { id: userId } },
            title,
            category,
            duration_tag,
            due_date: due_date ?? null,
            due_time: due_time ?? null,
            delegated_to: delegated_to ?? null,
            delegated_at: delegatedAt,
            remind_delegation_at: remindDelegationAt,
            attachment_file_id: attachment_file_id ?? null,
            attachment_type: attachment_type ?? null,
        });
        logger.info({ taskId: task.id, userId: String(userId) }, "task created");
        return task;
    },

    getActiveTasks: async (userId: bigint): Promise<TaskModel[]> => {
        return taskRepository.findActiveByUser(userId);
    },

    getTaskById: async (taskId: string): Promise<TaskModel | null> => {
        return taskRepository.findById(taskId);
    },

    updateTask: async (taskId: string, params: UpdateTaskParams): Promise<TaskModel> => {
        const task = await taskRepository.update(taskId, { ...params, last_activity_at: new Date() });
        logger.info({ taskId }, "task updated");
        return task;
    },

    markTaskDone: async (taskId: string): Promise<TaskModel> => {
        const task = await taskRepository.update(taskId, {
            status: "DONE",
            completed_at: new Date(),
            last_activity_at: new Date(),
        });
        logger.info({ taskId }, "task marked done");
        return task;
    },

    markTaskDeleted: async (taskId: string): Promise<TaskModel> => {
        const task = await taskRepository.update(taskId, {
            status: "DELETED",
            last_activity_at: new Date(),
        });
        logger.info({ taskId }, "task marked deleted");
        return task;
    },
};
