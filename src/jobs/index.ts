import { Api } from "grammy";
import { notificationsQueue, morningBriefQueue, saturdayBriefQueue } from "#root/infrastructure/bullmq.js";
import { createNotificationsWorker } from "./notifications.job.js";
import { createMorningBriefWorker } from "./morning-brief.job.js";
import { createSaturdayBriefWorker } from "./saturday-brief.job.js";
import { logger } from "#root/logger.js";
import { JOB_NAMES, CRON_PATTERNS, JOBS_LOG } from "./const.js";

const scheduleRecurringJobs = async () => {
    await notificationsQueue.add(
        JOB_NAMES.CHECK_TIME_DEADLINES,
        {},
        {
            repeat: { pattern: CRON_PATTERNS.EVERY_MINUTE },
            jobId: JOB_NAMES.CHECK_TIME_DEADLINES,
        },
    );

    await notificationsQueue.add(
        JOB_NAMES.CHECK_DELEGATIONS_AND_DATE_DEADLINES,
        {},
        {
            repeat: { pattern: CRON_PATTERNS.DAILY_9_UTC },
            jobId: JOB_NAMES.CHECK_DELEGATIONS_AND_DATE_DEADLINES,
        },
    );

    await morningBriefQueue.add(
        JOB_NAMES.MORNING_BRIEF,
        {},
        {
            repeat: { pattern: CRON_PATTERNS.EVERY_MINUTE },
            jobId: JOB_NAMES.MORNING_BRIEF,
        },
    );

    await saturdayBriefQueue.add(
        JOB_NAMES.SATURDAY_BRIEF,
        {},
        {
            repeat: { pattern: CRON_PATTERNS.SATURDAY_20_UTC },
            jobId: JOB_NAMES.SATURDAY_BRIEF,
        },
    );

    logger.info(JOBS_LOG.RECURRING_SCHEDULED);
};

export const startJobs = async (api: Api) => {
    createNotificationsWorker(api);
    createMorningBriefWorker(api);
    createSaturdayBriefWorker(api);
    await scheduleRecurringJobs();
    logger.info(JOBS_LOG.JOBS_STARTED);
};
