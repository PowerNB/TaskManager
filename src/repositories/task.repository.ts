import { logger } from "#root/logger.js";
import { TaskModel, TaskCreateInput, TaskUpdateInput } from "#root/infrastructure/generated/prisma/models/Task.js";
import { TASK_STATUS, TASK_CATEGORY, TASK_REPOSITORY_LOGS, startOfDay, endOfDay } from "./const.js";
import Repository from "./repository.js";

class TaskRepository extends Repository {
    findById(id: string): Promise<TaskModel | null> {
        logger.debug({ id }, TASK_REPOSITORY_LOGS.FIND_BY_ID);
        return this.client.task.findUnique({ where: { id } });
    }

    findActiveByUser(userId: bigint): Promise<TaskModel[]> {
        logger.debug({ userId }, TASK_REPOSITORY_LOGS.FIND_ACTIVE_BY_USER);
        return this.client.task.findMany({
            where: { userId, status: TASK_STATUS.ACTIVE },
            orderBy: { elo_score: "desc" },
        });
    }

    create(data: TaskCreateInput): Promise<TaskModel> {
        logger.debug({ data }, TASK_REPOSITORY_LOGS.CREATE);
        return this.client.task.create({ data });
    }

    update(id: string, data: TaskUpdateInput): Promise<TaskModel> {
        logger.debug({ id, data }, TASK_REPOSITORY_LOGS.UPDATE);
        return this.client.task.update({ where: { id }, data });
    }

    findDueDelegations(): Promise<TaskModel[]> {
        logger.debug(TASK_REPOSITORY_LOGS.FIND_DUE_DELEGATIONS);
        return this.client.task.findMany({
            where: {
                status: TASK_STATUS.ACTIVE,
                remind_delegation_at: { lte: new Date() },
                delegated_to: { not: null },
            },
        });
    }

    findDueDateDeadlines(): Promise<TaskModel[]> {
        logger.debug(TASK_REPOSITORY_LOGS.FIND_DUE_DATE_DEADLINES);
        return this.client.task.findMany({
            where: {
                status: TASK_STATUS.ACTIVE,
                due_date: { gte: startOfDay(), lte: endOfDay() },
                due_time: null,
            },
        });
    }

    findDueTimeDeadlines(from: Date, to: Date): Promise<TaskModel[]> {
        logger.debug({ from, to }, TASK_REPOSITORY_LOGS.FIND_DUE_TIME_DEADLINES);
        return this.client.task.findMany({
            where: {
                status: TASK_STATUS.ACTIVE,
                due_time: { gte: from, lte: to },
            },
        });
    }

    findMorningTimeDeadlines(): Promise<TaskModel[]> {
        logger.debug(TASK_REPOSITORY_LOGS.FIND_MORNING_TIME_DEADLINES);
        return this.client.task.findMany({
            where: {
                status: TASK_STATUS.ACTIVE,
                due_date: { gte: startOfDay(), lte: endOfDay() },
                due_time: { not: null },
            },
        });
    }

    findTodayMandatory(userId: bigint): Promise<TaskModel[]> {
        logger.debug({ userId }, TASK_REPOSITORY_LOGS.FIND_TODAY_MANDATORY);
        return this.client.task.findMany({
            where: {
                userId,
                status: TASK_STATUS.ACTIVE,
                category: TASK_CATEGORY.CAREER,
                due_date: { gte: startOfDay(), lte: endOfDay() },
            },
            orderBy: { due_time: "asc" },
        });
    }

    findCandidatesForBrief(userId: bigint): Promise<TaskModel[]> {
        logger.debug({ userId }, TASK_REPOSITORY_LOGS.FIND_CANDIDATES_FOR_BRIEF);
        return this.client.task.findMany({
            where: {
                userId,
                status: TASK_STATUS.ACTIVE,
                due_date: null,
                due_time: null,
            },
            orderBy: [
                { category: "asc" },
                { elo_score: "desc" },
            ],
        });
    }

    findStale(userId: bigint, since: Date): Promise<TaskModel[]> {
        logger.debug({ userId, since }, TASK_REPOSITORY_LOGS.FIND_STALE);
        return this.client.task.findMany({
            where: {
                userId,
                status: TASK_STATUS.ACTIVE,
                due_date: null,
                due_time: null,
                last_activity_at: { lt: since },
            },
        });
    }

    findFrozen(userId: bigint): Promise<TaskModel[]> {
        logger.debug({ userId }, TASK_REPOSITORY_LOGS.FIND_FROZEN);
        return this.client.task.findMany({
            where: { userId, status: TASK_STATUS.FROZEN },
            orderBy: { frozen_at: "asc" },
        });
    }

    findArchivedBeforeQuarter(userId: bigint, before: Date): Promise<TaskModel[]> {
        logger.debug({ userId, before }, TASK_REPOSITORY_LOGS.FIND_ARCHIVED_BEFORE_QUARTER);
        return this.client.task.findMany({
            where: {
                userId,
                status: TASK_STATUS.ARCHIVED,
                archived_at: { lt: before },
            },
        });
    }

    async deleteMany(ids: string[]): Promise<void> {
        logger.debug({ ids }, TASK_REPOSITORY_LOGS.DELETE_MANY);
        await this.client.task.deleteMany({ where: { id: { in: ids } } });
    }

    countDoneInRange(userId: bigint, from: Date, to: Date): Promise<number> {
        logger.debug({ userId, from, to }, TASK_REPOSITORY_LOGS.COUNT_DONE_IN_RANGE);
        return this.client.task.count({
            where: {
                userId,
                status: TASK_STATUS.DONE,
                completed_at: { gte: from, lte: to },
            },
        });
    }

    countActive(userId: bigint): Promise<number> {
        logger.debug({ userId }, TASK_REPOSITORY_LOGS.COUNT_ACTIVE);
        return this.client.task.count({ where: { userId, status: TASK_STATUS.ACTIVE } });
    }

    async updateMany(ids: string[], data: TaskUpdateInput): Promise<void> {
        logger.debug({ ids, data }, TASK_REPOSITORY_LOGS.UPDATE_MANY);
        await this.client.task.updateMany({ where: { id: { in: ids } }, data });
    }
}

export const taskRepository = new TaskRepository();
