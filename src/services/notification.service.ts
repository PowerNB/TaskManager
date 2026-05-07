import { taskRepository } from "#root/repositories/task.repository.js";
import { userRepository } from "#root/repositories/user.repository.js";
import { canSend, getNowTime } from "#root/utils/time.js";
import { TaskModel } from "#root/types/models.js";
import { logger } from "#root/logger.js";

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

        logger.debug({ count: result.length }, "due delegations fetched");
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

        logger.debug({ count: result.length }, "due date deadlines fetched");
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

        logger.debug({ count: result.length }, "due time deadlines fetched");
        return result;
    },

    snoozeDelegation: async (taskId: string): Promise<void> => {
        const remindAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await taskRepository.update(taskId, { remind_delegation_at: remindAt });
        logger.info({ taskId }, "delegation snoozed");
    },

    markDone: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DONE", completed_at: new Date() });
        logger.info({ taskId }, "notification: task marked done");
    },

    markDeleted: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "DELETED" });
        logger.info({ taskId }, "notification: task marked deleted");
    },

    takeBack: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, {
            delegated_to: null,
            delegated_at: null,
            remind_delegation_at: null,
            last_activity_at: new Date(),
        });
        logger.info({ taskId }, "task taken back from delegation");
    },

    reschedule: async (taskId: string, date: Date): Promise<void> => {
        await taskRepository.update(taskId, { due_date: date, last_activity_at: new Date() });
        logger.info({ taskId }, "task rescheduled");
    },
};
