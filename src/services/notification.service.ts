import { taskRepository } from "#root/repositories/task.repository.js";
import { userRepository } from "#root/repositories/user.repository.js";
import { canSend } from "#root/utils/time.js";
import { TaskModel } from "#root/infrastructure/generated/prisma/models/Task.js";

export interface DelegationNotification {
    task: TaskModel;
    userId: bigint;
    canSendNow: boolean;
}

export interface DeadlineNotification {
    task: TaskModel;
    userId: bigint;
    canSendNow: boolean;
}

const getNowTime = (timezone: string): string => {
    const offset = parseInt(timezone.replace("UTC", ""), 10);
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const local = new Date(utc + offset * 3600000);
    const h = String(local.getHours()).padStart(2, "0");
    const m = String(local.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
};

export const notificationService = {
    getDueDelegations: async (): Promise<DelegationNotification[]> => {
        const tasks = await taskRepository.findDueDelegations();
        const result: DelegationNotification[] = [];

        for (const task of tasks) {
            const user = await userRepository.findById(task.userId);
            if (!user) continue;

            const nowTime = getNowTime(user.timezone);
            const canSendNow = canSend(nowTime, user.quiet_hours_from, user.quiet_hours_to);

            result.push({ task, userId: task.userId, canSendNow });
        }

        return result;
    },

    getDueDateDeadlines: async (): Promise<DeadlineNotification[]> => {
        const tasks = await taskRepository.findDueDateDeadlines();
        const result: DeadlineNotification[] = [];

        for (const task of tasks) {
            const user = await userRepository.findById(task.userId);
            if (!user) continue;

            const nowTime = getNowTime(user.timezone);
            const canSendNow = canSend(nowTime, user.quiet_hours_from, user.quiet_hours_to);

            result.push({ task, userId: task.userId, canSendNow });
        }

        return result;
    },

    getDueTimeDeadlines: async (): Promise<DeadlineNotification[]> => {
        const now = new Date();
        const from = new Date(now.getTime() + 55 * 60000);
        const to = new Date(now.getTime() + 65 * 60000);

        const tasks = await taskRepository.findDueTimeDeadlines(from, to);
        const result: DeadlineNotification[] = [];

        for (const task of tasks) {
            const user = await userRepository.findById(task.userId);
            if (!user) continue;

            // По ТЗ напоминание за час отправляется всегда, даже в тихие часы
            result.push({ task, userId: task.userId, canSendNow: true });
        }

        return result;
    },

    snoozeDelegation: async (taskId: string): Promise<void> => {
        const remindAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await taskRepository.update(taskId, { remind_delegation_at: remindAt });
    },
};
