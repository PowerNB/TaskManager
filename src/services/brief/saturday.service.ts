import { userRepository } from "#root/repositories/user.repository.js";
import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/infrastructure/generated/prisma/models/Task.js";
import { UserModel } from "#root/infrastructure/generated/prisma/models/User.js";

export type SaturdayBriefType = "regular" | "monthly" | "quarterly";

export interface WeekStats {
    thisWeek: number;
    lastWeek: number | null;
    monthlyAvg: number | null;
    active: number;
    weeksSinceCreation: number;
}

export interface SaturdayBriefData {
    user: UserModel;
    type: SaturdayBriefType;
    stats: WeekStats;
    staleTasks: TaskModel[];
    frozenTasks: TaskModel[];
    archivedTasks: TaskModel[];
}

const getStartOfQuarter = (): Date => {
    const now = new Date();
    const month = now.getMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
};

const isLastSaturdayOfMonth = (): boolean => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.getMonth() !== now.getMonth();
};

const isLastSaturdayOfQuarter = (): boolean => {
    if (!isLastSaturdayOfMonth()) return false;
    const now = new Date();
    const month = now.getMonth();
    return month === 2 || month === 5 || month === 8 || month === 11;
};

const getBriefType = (): SaturdayBriefType => {
    if (isLastSaturdayOfQuarter()) return "quarterly";
    if (isLastSaturdayOfMonth()) return "monthly";
    return "regular";
};

const getWeeksSinceCreation = (user: UserModel): number => {
    const ms = Date.now() - user.createdAt.getTime();
    return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
};

export const saturdayBriefService = {
    getAllUsers: async (): Promise<UserModel[]> => {
        return userRepository.findAll();
    },

    buildBriefData: async (user: UserModel): Promise<SaturdayBriefData> => {
        const type = getBriefType();
        const now = new Date();
        const userId = user.id;

        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

        const weeksSinceCreation = getWeeksSinceCreation(user);
        const thisWeek = await taskRepository.countDoneInRange(userId, weekAgo, now);
        const active = await taskRepository.countActive(userId);

        let lastWeek: number | null = null;
        let monthlyAvg: number | null = null;

        if (weeksSinceCreation >= 2) {
            lastWeek = await taskRepository.countDoneInRange(userId, twoWeeksAgo, weekAgo);
        }

        if (weeksSinceCreation >= 3) {
            const totalLast4 = await taskRepository.countDoneInRange(userId, fourWeeksAgo, now);
            monthlyAvg = Math.round(totalLast4 / 4);
        }

        const staleTasks = await taskRepository.findStale(userId, weekAgo);

        const frozenTasks = type === "monthly" || type === "quarterly"
            ? await taskRepository.findFrozen(userId)
            : [];

        const archivedTasks = type === "quarterly"
            ? await taskRepository.findArchivedBeforeQuarter(userId, getStartOfQuarter())
            : [];

        return {
            user,
            type,
            stats: { thisWeek, lastWeek, monthlyAvg, active, weeksSinceCreation },
            staleTasks,
            frozenTasks,
            archivedTasks,
        };
    },

    freezeStaleTask: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "FROZEN", frozen_at: new Date() });
    },

    archiveFrozenTask: async (taskId: string): Promise<void> => {
        await taskRepository.update(taskId, { status: "ARCHIVED", archived_at: new Date() });
    },

    deleteArchivedTasks: async (ids: string[]): Promise<void> => {
        await taskRepository.deleteMany(ids);
    },
};
