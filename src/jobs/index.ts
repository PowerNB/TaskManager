import { notificationsQueue, morningBriefQueue, saturdayBriefQueue } from "#root/infrastructure/bullmq.js";
import { logger } from "#root/logger.js";

// Workers — import for side effects (registers the worker)
import "./notifications.job.js";
import "./morning-brief.job.js";
import "./saturday-brief.job.js";

const scheduleRecurringJobs = async () => {
    // Every minute — time deadlines (1 hour before due_time)
    await notificationsQueue.add(
        "check-time-deadlines",
        {},
        {
            repeat: { pattern: "* * * * *" },
            jobId: "check-time-deadlines",
        },
    );

    // Every day at 09:00 UTC — delegations + date deadlines
    await notificationsQueue.add(
        "check-delegations-and-date-deadlines",
        {},
        {
            repeat: { pattern: "0 9 * * *" },
            jobId: "check-delegations-and-date-deadlines",
        },
    );

    // Every minute — morning brief (checks per-user timezone + brief time)
    await morningBriefQueue.add(
        "morning-brief",
        {},
        {
            repeat: { pattern: "* * * * *" },
            jobId: "morning-brief",
        },
    );

    // Every Saturday at 20:00 UTC — saturday brief
    await saturdayBriefQueue.add(
        "saturday-brief",
        {},
        {
            repeat: { pattern: "0 20 * * 6" },
            jobId: "saturday-brief",
        },
    );

    logger.info("recurring jobs scheduled");
};

export const startJobs = async () => {
    await scheduleRecurringJobs();
    logger.info("jobs started");
};
