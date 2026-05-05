import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/infrastructure/generated/prisma/models/Task.js";
import { Category, DurationTag } from "#root/infrastructure/generated/prisma/enums.js";

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

export const captureService = {
    createTask: async (params: CreateTaskParams): Promise<TaskModel> => {
        const { userId, title, category, duration_tag, due_date, due_time, delegated_to, attachment_file_id, attachment_type } = params;

        const now = new Date();
        const delegatedAt = delegated_to ? now : null;
        const remindDelegationAt = delegated_to
            ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
            : null;

        return taskRepository.create({
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
    },
};
