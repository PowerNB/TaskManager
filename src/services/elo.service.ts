import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/types/models.js";
import { calcElo } from "#root/utils/elo.js";
import { logger } from "#root/logger.js";
import { ELO_SERVICE_LOG } from "./const.js";

// Swiss round: sort tasks by elo_score, pair neighbours
const buildSwissRound = (tasks: TaskModel[]): Array<[string, string]> => {
    const sorted = [...tasks].sort((a, b) => b.elo_score - a.elo_score);
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i + 1 < sorted.length; i += 2) {
        pairs.push([sorted[i].id, sorted[i + 1].id]);
    }
    return pairs;
};

export const swissTotalRounds = (n: number): number => Math.ceil(Math.log2(n));

export const eloService = {
    // Brief mode: random pairs from tasks without deadline
    getPairs: async (userId: bigint, count: number): Promise<Array<[TaskModel, TaskModel]>> => {
        const tasks = await taskRepository.findCandidatesForBrief(userId);
        logger.debug({ userId: userId.toString(), candidates: tasks.length, requested: count }, ELO_SERVICE_LOG.GET_PAIRS);
        if (tasks.length < 2) {
            logger.warn({ userId: userId.toString() }, ELO_SERVICE_LOG.NOT_ENOUGH_CANDIDATES);
            return [];
        }
        const shuffled = [...tasks].sort(() => Math.random() - 0.5);
        const pairs: Array<[TaskModel, TaskModel]> = [];
        for (let i = 0; i + 1 < shuffled.length; i += 2) {
            pairs.push([shuffled[i], shuffled[i + 1]]);
        }
        return pairs.slice(0, count);
    },

    // Swiss mode: build first round, return task ids + pairs + round metadata
    buildSwissSession: async (
        userId: bigint,
        fetchTasks: () => Promise<TaskModel[]>,
    ): Promise<{ taskIds: string[]; pairs: Array<[string, string]>; round: number; totalRounds: number } | null> => {
        const tasks = await fetchTasks();
        if (tasks.length < 2) return null;
        const totalRounds = swissTotalRounds(tasks.length);
        const pairs = buildSwissRound(tasks);
        logger.info({ userId: userId.toString(), tasks: tasks.length, pairs: pairs.length, totalRounds }, ELO_SERVICE_LOG.SESSION_BUILT);
        return { taskIds: tasks.map(t => t.id), pairs, round: 1, totalRounds };
    },

    // Build next Swiss round: reload tasks by ids (scores updated), re-pair
    buildNextRound: async (taskIds: string[]): Promise<Array<[string, string]>> => {
        const tasks = await Promise.all(taskIds.map(id => taskRepository.findById(id)));
        const valid = tasks.filter((t): t is TaskModel => t !== null);
        if (valid.length < 2) return [];
        return buildSwissRound(valid);
    },

    getTodayTasks: async (userId: bigint): Promise<TaskModel[]> => {
        return taskRepository.findTodayTasksForElo(userId);
    },

    getWeekTasks: async (userId: bigint, weekStart: Date, weekEnd: Date): Promise<TaskModel[]> => {
        return taskRepository.findWeekTasksForElo(userId, weekStart, weekEnd);
    },

    applyResult: async (winnerId: string, loserId: string): Promise<void> => {
        const [winner, loser] = await Promise.all([
            taskRepository.findById(winnerId),
            taskRepository.findById(loserId),
        ]);
        if (!winner || !loser) {
            logger.warn({ winnerId, loserId }, ELO_SERVICE_LOG.APPLY_RESULT_SKIP);
            return;
        }

        const { newA, newB } = calcElo(winner.elo_score, loser.elo_score);
        await Promise.all([
            taskRepository.update(winnerId, { elo_score: newA }),
            taskRepository.update(loserId, { elo_score: newB }),
        ]);
        logger.info({ winnerId, loserId, newWinnerScore: newA, newLoserScore: newB }, ELO_SERVICE_LOG.SCORES_UPDATED);
    },
};
