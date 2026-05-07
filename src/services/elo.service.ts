import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/types/models.js";
import { calcElo } from "#root/utils/elo.js";
import { logger } from "#root/logger.js";

const shufflePairs = (tasks: TaskModel[]): Array<[TaskModel, TaskModel]> => {
    const shuffled = [...tasks].sort(() => Math.random() - 0.5);
    const pairs: Array<[TaskModel, TaskModel]> = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
    }
    return pairs;
};

export const eloService = {
    getPairs: async (userId: bigint, count: number): Promise<Array<[TaskModel, TaskModel]>> => {
        const tasks = await taskRepository.findCandidatesForBrief(userId);
        if (tasks.length < 2) return [];
        const pairs = shufflePairs(tasks);
        return pairs.slice(0, count);
    },

    applyResult: async (winnerId: string, loserId: string): Promise<void> => {
        const [winner, loser] = await Promise.all([
            taskRepository.findById(winnerId),
            taskRepository.findById(loserId),
        ]);
        if (!winner || !loser) return;

        const { newA, newB } = calcElo(winner.elo_score, loser.elo_score);
        await Promise.all([
            taskRepository.update(winnerId, { elo_score: newA }),
            taskRepository.update(loserId, { elo_score: newB }),
        ]);
        logger.info({ winnerId, loserId, newWinnerScore: newA, newLoserScore: newB }, "elo scores updated");
    },
};
