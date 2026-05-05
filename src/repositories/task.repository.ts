import { prisma } from "#root/infrastructure/prisma.js";
import { logger } from "#root/logger.js";
import { TaskModel, TaskCreateInput, TaskUpdateInput } from "#root/infrastructure/generated/prisma/models/Task.js";

export const taskRepository = {
    findById: async (id: string): Promise<TaskModel | null> => {
        logger.debug({ id }, "taskRepository.findById");
        return prisma.task.findUnique({ where: { id } });
    },

    findActiveByUser: async (userId: bigint): Promise<TaskModel[]> => {
        logger.debug({ userId }, "taskRepository.findActiveByUser");
        return prisma.task.findMany({
            where: { userId, status: "ACTIVE" },
            orderBy: { elo_score: "desc" },
        });
    },

    create: async (data: TaskCreateInput): Promise<TaskModel> => {
        logger.debug({ data }, "taskRepository.create");
        return prisma.task.create({ data });
    },

    update: async (id: string, data: TaskUpdateInput): Promise<TaskModel> => {
        logger.debug({ id, data }, "taskRepository.update");
        return prisma.task.update({ where: { id }, data });
    },

    findDueDelegations: async (): Promise<TaskModel[]> => {
        logger.debug("taskRepository.findDueDelegations");
        return prisma.task.findMany({
            where: {
                status: "ACTIVE",
                remind_delegation_at: { lte: new Date() },
                delegated_to: { not: null },
            },
        });
    },

    findDueDateDeadlines: async (): Promise<TaskModel[]> => {
        logger.debug("taskRepository.findDueDateDeadlines");
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.task.findMany({
            where: {
                status: "ACTIVE",
                due_date: { gte: startOfDay, lte: endOfDay },
                due_time: null,
            },
        });
    },

    findDueTimeDeadlines: async (from: Date, to: Date): Promise<TaskModel[]> => {
        logger.debug({ from, to }, "taskRepository.findDueTimeDeadlines");
        return prisma.task.findMany({
            where: {
                status: "ACTIVE",
                due_time: { gte: from, lte: to },
            },
        });
    },

    findTodayMandatory: async (userId: bigint): Promise<TaskModel[]> => {
        logger.debug({ userId }, "taskRepository.findTodayMandatory");
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.task.findMany({
            where: {
                userId,
                status: "ACTIVE",
                category: "CAREER",
                due_date: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: { due_time: "asc" },
        });
    },

    findCandidatesForBrief: async (userId: bigint): Promise<TaskModel[]> => {
        logger.debug({ userId }, "taskRepository.findCandidatesForBrief");
        return prisma.task.findMany({
            where: {
                userId,
                status: "ACTIVE",
                due_date: null,
                due_time: null,
            },
            orderBy: [
                { category: "asc" },
                { elo_score: "desc" },
            ],
        });
    },

    findStale: async (userId: bigint, since: Date): Promise<TaskModel[]> => {
        logger.debug({ userId, since }, "taskRepository.findStale");
        return prisma.task.findMany({
            where: {
                userId,
                status: "ACTIVE",
                due_date: null,
                due_time: null,
                last_activity_at: { lt: since },
            },
        });
    },

    findFrozen: async (userId: bigint): Promise<TaskModel[]> => {
        logger.debug({ userId }, "taskRepository.findFrozen");
        return prisma.task.findMany({
            where: { userId, status: "FROZEN" },
            orderBy: { frozen_at: "asc" },
        });
    },

    findArchivedBeforeQuarter: async (userId: bigint, before: Date): Promise<TaskModel[]> => {
        logger.debug({ userId, before }, "taskRepository.findArchivedBeforeQuarter");
        return prisma.task.findMany({
            where: {
                userId,
                status: "ARCHIVED",
                archived_at: { lt: before },
            },
        });
    },

    deleteMany: async (ids: string[]): Promise<void> => {
        logger.debug({ ids }, "taskRepository.deleteMany");
        await prisma.task.deleteMany({ where: { id: { in: ids } } });
    },

    countDoneInRange: async (userId: bigint, from: Date, to: Date): Promise<number> => {
        logger.debug({ userId, from, to }, "taskRepository.countDoneInRange");
        return prisma.task.count({
            where: {
                userId,
                status: "DONE",
                completed_at: { gte: from, lte: to },
            },
        });
    },

    countActive: async (userId: bigint): Promise<number> => {
        logger.debug({ userId }, "taskRepository.countActive");
        return prisma.task.count({ where: { userId, status: "ACTIVE" } });
    },

    updateMany: async (ids: string[], data: TaskUpdateInput): Promise<void> => {
        logger.debug({ ids, data }, "taskRepository.updateMany");
        await prisma.task.updateMany({ where: { id: { in: ids } }, data });
    },
};
