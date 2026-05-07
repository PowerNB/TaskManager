import { userRepository } from "#root/repositories/user.repository.js";
import { taskRepository } from "#root/repositories/task.repository.js";
import { canSend, getNowTime, toUserLocal } from "#root/utils/time.js";
import { TaskModel, UserModel } from "#root/types/models.js";
import { logger } from "#root/logger.js";

export const DURATION_MINUTES: Record<string, number> = {
    MIN_5: 5,
    MIN_30: 30,
    HOUR_1: 60,
    HOUR_2: 120,
    PROJECT: 120,
};

export interface MorningBriefCandidate {
    user: UserModel;
}

export interface BriefPlan {
    mandatory: TaskModel[];
    mandatoryMinutes: number;
    freeMinutes: number;
    overloaded: boolean;
}


const isBriefTime = (user: UserModel): boolean => {
    const nowTime = getNowTime(user.timezone);
    return nowTime === user.morning_brief_time;
};

const hasSentBriefToday = (user: UserModel): boolean => {
    if (!user.last_brief_sent_at) return false;

    const local = toUserLocal(new Date(), user.timezone);
    const lastSentLocal = toUserLocal(user.last_brief_sent_at, user.timezone);

    return (
        lastSentLocal.getUTCFullYear() === local.getUTCFullYear() &&
        lastSentLocal.getUTCMonth() === local.getUTCMonth() &&
        lastSentLocal.getUTCDate() === local.getUTCDate()
    );
};

export const morningBriefService = {
    getUsersDueForBrief: async (): Promise<MorningBriefCandidate[]> => {
        const users = await userRepository.findAll();
        const result: MorningBriefCandidate[] = [];

        for (const user of users) {
            if (!isBriefTime(user)) continue;
            if (hasSentBriefToday(user)) continue;

            const nowTime = getNowTime(user.timezone);
            if (!canSend(nowTime, user.quiet_hours_from, user.quiet_hours_to)) continue;

            result.push({ user });
        }

        logger.debug({ count: result.length }, "users due for brief fetched");
        return result;
    },

    buildPlan: async (userId: bigint, freeMinutes: number): Promise<BriefPlan> => {
        const mandatory = await taskRepository.findTodayMandatory(userId);
        const mandatoryMinutes = mandatory.reduce((sum, t) => sum + (DURATION_MINUTES[t.duration_tag] ?? 0), 0);
        const overloaded = mandatoryMinutes >= freeMinutes;

        logger.debug({ userId: String(userId), freeMinutes, mandatoryMinutes, overloaded }, "brief plan built");
        return {
            mandatory,
            mandatoryMinutes,
            freeMinutes,
            overloaded,
        };
    },

    getCandidates: async (userId: bigint): Promise<TaskModel[]> => {
        return taskRepository.findCandidatesForBrief(userId);
    },

    markBriefSent: async (userId: bigint): Promise<void> => {
        await userRepository.update(userId, { last_brief_sent_at: new Date() });
        logger.info({ userId: String(userId) }, "brief marked sent");
    },

    getTasksByIds: async (ids: string[]): Promise<(TaskModel | null)[]> => {
        if (ids.length === 0) return [];
        return Promise.all(ids.map((id) => taskRepository.findById(id)));
    },

    getPlannedMinutes: async (taskIds: string[]): Promise<number> => {
        if (taskIds.length === 0) return 0;
        let total = 0;
        for (const id of taskIds) {
            const task = await taskRepository.findById(id);
            if (task) total += DURATION_MINUTES[task.duration_tag] ?? 0;
        }
        return total;
    },

    calcTaskMinutes: (task: TaskModel): number => DURATION_MINUTES[task.duration_tag] ?? 0,

    calcTotalMinutes: (tasks: TaskModel[]): number =>
        tasks.reduce((sum, t) => sum + (DURATION_MINUTES[t.duration_tag] ?? 0), 0),

    findNextFittingIndex: (candidates: TaskModel[], fromIndex: number, remainingMinutes: number): number => {
        for (let i = fromIndex; i < candidates.length; i++) {
            if ((DURATION_MINUTES[candidates[i].duration_tag] ?? 0) <= remainingMinutes) return i;
        }
        return -1;
    },
};
