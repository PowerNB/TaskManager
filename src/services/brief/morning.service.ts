import { userRepository } from "#root/repositories/user.repository.js";
import { taskRepository } from "#root/repositories/task.repository.js";
import { canSend } from "#root/utils/time.js";
import { TaskModel } from "#root/infrastructure/generated/prisma/models/Task.js";
import { UserModel } from "#root/infrastructure/generated/prisma/models/User.js";

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

const toUserLocal = (date: Date, timezone: string): Date => {
    const offset = parseInt(timezone.replace("UTC", ""), 10);
    return new Date(date.getTime() + offset * 3600000);
};

const getNowTime = (timezone: string): string => {
    const local = toUserLocal(new Date(), timezone);
    const h = String(local.getUTCHours()).padStart(2, "0");
    const m = String(local.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
};

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

        return result;
    },

    buildPlan: async (userId: bigint, freeMinutes: number): Promise<BriefPlan> => {
        const mandatory = await taskRepository.findTodayMandatory(userId);
        const mandatoryMinutes = mandatory.reduce((sum, t) => sum + (DURATION_MINUTES[t.duration_tag] ?? 0), 0);
        const overloaded = mandatoryMinutes >= freeMinutes;

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
    },
};
