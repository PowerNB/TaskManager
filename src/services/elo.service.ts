import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/types/models.js";
import { calcElo } from "#root/utils/elo.js";
import { logger } from "#root/logger.js";

const allPairsShuffled = (tasks: TaskModel[]): Array<[TaskModel, TaskModel]> => {
    const pairs: Array<[TaskModel, TaskModel]> = [];
    for (let i = 0; i < tasks.length; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
            pairs.push([tasks[i], tasks[j]]);
        }
    }
    return pairs.sort(() => Math.random() - 0.5);
};

export const eloService = {
    getPairs: async (userId: bigint, count: number): Promise<Array<[TaskModel, TaskModel]>> => {
        const tasks = await taskRepository.findCandidatesForBrief(userId);
        logger.debug({ userId: userId.toString(), candidates: tasks.length, requested: count }, "elo: getPairs");
        if (tasks.length < 2) {
            logger.warn({ userId: userId.toString() }, "elo: not enough candidates for brief pairs");
            return [];
        }
        const pairs = allPairsShuffled(tasks);
        return pairs.slice(0, count);
    },

    getTodayPairs: async (userId: bigint): Promise<Array<[TaskModel, TaskModel]>> => {
        const tasks = await taskRepository.findTodayTasksForElo(userId);
        logger.debug({ userId: userId.toString(), tasks: tasks.length }, "elo: getTodayPairs");
        if (tasks.length < 2) {
            logger.warn({ userId: userId.toString() }, "elo: not enough today tasks for elo session");
            return [];
        }
        const pairs = allPairsShuffled(tasks);
        logger.info({ userId: userId.toString(), pairs: pairs.length }, "elo: today session pairs built");
        return pairs;
    },

    getWeekPairs: async (userId: bigint, weekStart: Date, weekEnd: Date): Promise<Array<[TaskModel, TaskModel]>> => {
        const tasks = await taskRepository.findWeekTasksForElo(userId, weekStart, weekEnd);
        logger.debug({ userId: userId.toString(), tasks: tasks.length, weekStart, weekEnd }, "elo: getWeekPairs");
        if (tasks.length < 2) {
            logger.warn({ userId: userId.toString() }, "elo: not enough week tasks for elo session");
            return [];
        }
        const pairs = allPairsShuffled(tasks).slice(0, 30);
        logger.info({ userId: userId.toString(), pairs: pairs.length }, "elo: week session pairs built");
        return pairs;
    },

    applyResult: async (winnerId: string, loserId: string): Promise<void> => {
        const [winner, loser] = await Promise.all([
            taskRepository.findById(winnerId),
            taskRepository.findById(loserId),
        ]);
        if (!winner || !loser) {
            logger.warn({ winnerId, loserId }, "elo: applyResult — task not found, skipping");
            return;
        }

        const { newA, newB } = calcElo(winner.elo_score, loser.elo_score);
        await Promise.all([
            taskRepository.update(winnerId, { elo_score: newA }),
            taskRepository.update(loserId, { elo_score: newB }),
        ]);
        logger.info({ winnerId, loserId, newWinnerScore: newA, newLoserScore: newB }, "elo scores updated");
    },
};
