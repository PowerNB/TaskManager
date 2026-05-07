import { Worker } from "bullmq";
import { Api, InlineKeyboard } from "grammy";
import { bullRedis } from "#root/infrastructure/redis.js";
import { saturdayBriefService, SaturdayBriefData } from "#root/services/brief/saturday.service.js";
import { eloService } from "#root/services/elo.service.js";
import { DURATION_LABELS, CATEGORY_LABELS } from "#root/types/brief.js";
import { logger } from "#root/logger.js";
import {
    QUEUE_NAMES,
    SATURDAY_JOB_TEXTS,
    SATURDAY_JOB_BUTTONS,
    SATURDAY_JOB_CALLBACKS,
    ELO_JOB_TEXTS,
    ELO_JOB_BUTTONS,
    ELO_JOB_CALLBACKS,
    JOBS_LOG,
} from "./const.js";

const formatDaysSince = (date: Date): string => {
    const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    return SATURDAY_JOB_TEXTS.DAYS_SINCE(days);
};

const buildStatsText = (data: SaturdayBriefData): string => {
    const { stats } = data;
    const lines: string[] = [SATURDAY_JOB_TEXTS.STATS_HEADER];

    if (stats.thisWeek === 0) {
        lines.push(SATURDAY_JOB_TEXTS.STATS_CLOSED_ZERO);
        lines.push(SATURDAY_JOB_TEXTS.STATS_NO_TASKS_THIS_WEEK);
        lines.push(SATURDAY_JOB_TEXTS.STATS_MOTIVATIONAL);
    } else {
        lines.push(SATURDAY_JOB_TEXTS.STATS_CLOSED(stats.thisWeek));
        if (stats.lastWeek !== null) {
            const diff = stats.thisWeek - stats.lastWeek;
            const sign = diff > 0 ? "+" : "";
            lines.push(SATURDAY_JOB_TEXTS.STATS_DIFF(sign, diff));
        }
        if (stats.monthlyAvg !== null) {
            lines.push(SATURDAY_JOB_TEXTS.STATS_AVG(stats.monthlyAvg));
        }
    }

    lines.push(SATURDAY_JOB_TEXTS.STATS_ACTIVE(stats.active));
    return lines.join("\n");
};

type SendMessage = (text: string, keyboard?: InlineKeyboard) => Promise<void>;

const sendSaturdayBrief = async (data: SaturdayBriefData, send: SendMessage): Promise<void> => {
    if (data.type === "quarterly" && data.archivedTasks.length > 0) {
        const lines = [
            SATURDAY_JOB_TEXTS.QUARTERLY_ARCHIVE_HEADER,
            SATURDAY_JOB_TEXTS.QUARTERLY_ARCHIVE_INTRO,
            ...data.archivedTasks.map((t, i) => `${i + 1}. ${t.title}`),
            SATURDAY_JOB_TEXTS.QUARTERLY_ARCHIVE_FOOTER,
        ];
        await send(lines.join("\n"));
        await saturdayBriefService.deleteArchivedTasks(data.archivedTasks.map((t) => t.id));
    }

    if ((data.type === "monthly" || data.type === "quarterly") && data.frozenTasks.length > 0) {
        const monthName = new Date().toLocaleString("ru-RU", { month: "long" });
        await send(SATURDAY_JOB_TEXTS.FROZEN_HEADER(monthName));

        for (const task of data.frozenTasks) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");
            const daysSince = task.frozen_at ? formatDaysSince(task.frozen_at) : "?";
            const keyboard = new InlineKeyboard()
                .text(SATURDAY_JOB_BUTTONS.FROZEN_RETURN, SATURDAY_JOB_CALLBACKS.FROZEN_RETURN(task.id))
                .text(SATURDAY_JOB_BUTTONS.FROZEN_DELETE, SATURDAY_JOB_CALLBACKS.FROZEN_DELETE(task.id));
            await send(SATURDAY_JOB_TEXTS.FROZEN_TASK(task.title, tags, daysSince), keyboard);
        }
    }

    await send(buildStatsText(data));

    if (data.staleTasks.length > 0) {
        await send(SATURDAY_JOB_TEXTS.STALE_SECTION_HEADER);

        for (const task of data.staleTasks) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");
            const daysSince = formatDaysSince(task.last_activity_at);
            const keyboard = new InlineKeyboard()
                .text(SATURDAY_JOB_BUTTONS.STALE_KEEP, SATURDAY_JOB_CALLBACKS.STALE_KEEP(task.id))
                .text(SATURDAY_JOB_BUTTONS.STALE_DONE, SATURDAY_JOB_CALLBACKS.STALE_DONE(task.id))
                .text(SATURDAY_JOB_BUTTONS.STALE_DELETE, SATURDAY_JOB_CALLBACKS.STALE_DELETE(task.id));
            await send(SATURDAY_JOB_TEXTS.STALE_TASK(task.title, tags, daysSince), keyboard);
        }
    }
};

const sendEloPair = async (api: Api, chatId: number, userId: bigint, pairCount: number): Promise<void> => {
    const pairs = await eloService.getPairs(userId, 1);
    if (pairs.length === 0) {
        await api.sendMessage(chatId, ELO_JOB_TEXTS.DONE, { reply_markup: new InlineKeyboard() });
        return;
    }

    const [taskA, taskB] = pairs[0];
    const keyboard = new InlineKeyboard()
        .text(ELO_JOB_BUTTONS.FIRST, ELO_JOB_CALLBACKS.PICK(taskA.id, taskB.id, 0, pairCount))
        .text(ELO_JOB_BUTTONS.SECOND, ELO_JOB_CALLBACKS.PICK(taskB.id, taskA.id, 0, pairCount))
        .row()
        .text(ELO_JOB_BUTTONS.SKIP, ELO_JOB_CALLBACKS.SKIP(0, pairCount));

    const text = ELO_JOB_TEXTS.PROMPT(pairCount) + ELO_JOB_TEXTS.TASK_LINE(taskA.title, taskB.title);
    await api.sendMessage(chatId, text, { reply_markup: keyboard });
};

export const createSaturdayBriefWorker = (api: Api) => {
    const worker = new Worker(
        QUEUE_NAMES.SATURDAY_BRIEF,
        async (job) => {
            logger.debug({ jobName: job.name }, JOBS_LOG.SATURDAY_BRIEF_STARTED);

            const users = await saturdayBriefService.getAllUsers();

            for (const user of users) {
                const userId = Number(user.id);
                const data = await saturdayBriefService.buildBriefData(user);

                await sendSaturdayBrief(data, async (text, keyboard) => {
                    await api.sendMessage(userId, text, keyboard ? { reply_markup: keyboard } : undefined);
                });

                for (const task of data.staleTasks) {
                    await saturdayBriefService.freezeStaleTask(task.id);
                }

                if (data.type === "monthly" || data.type === "quarterly") {
                    for (const task of data.frozenTasks) {
                        await saturdayBriefService.archiveFrozenTask(task.id);
                    }
                }

                await sendEloPair(api, userId, user.id, 30);

                logger.info({ userId, type: data.type }, JOBS_LOG.SATURDAY_BRIEF_SENT);
            }
        },
        { connection: bullRedis },
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, err }, JOBS_LOG.SATURDAY_BRIEF_FAILED);
    });

    return worker;
};
