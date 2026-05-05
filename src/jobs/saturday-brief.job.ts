import { Worker } from "bullmq";
import { bullRedis } from "#root/infrastructure/redis.js";
import { saturdayBriefService } from "#root/services/brief/saturday.service.js";
import { sendSaturdayBrief } from "#root/bot/handlers/saturday-brief/saturday-brief.handler.js";
import { bot } from "#root/bot/index.js";
import { logger } from "#root/logger.js";

export const saturdayBriefWorker = new Worker(
    "saturday-brief",
    async (job) => {
        logger.debug({ jobName: job.name }, "saturday-brief job started");

        const users = await saturdayBriefService.getAllUsers();

        for (const user of users) {
            const userId = Number(user.id);
            const data = await saturdayBriefService.buildBriefData(user);

            await sendSaturdayBrief(data, async (text, keyboard) => {
                await bot.api.sendMessage(
                    userId,
                    text,
                    keyboard ? { reply_markup: keyboard } : undefined,
                );
            });

            // Lifecycle: freeze stale tasks that had no response (sent in this brief)
            for (const task of data.staleTasks) {
                await saturdayBriefService.freezeStaleTask(task.id);
            }

            // Lifecycle: archive frozen tasks that had no response (monthly/quarterly)
            if (data.type === "monthly" || data.type === "quarterly") {
                for (const task of data.frozenTasks) {
                    await saturdayBriefService.archiveFrozenTask(task.id);
                }
            }

            logger.info({ userId, type: data.type }, "saturday brief sent");
        }
    },
    { connection: bullRedis },
);

saturdayBriefWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "saturday-brief job failed");
});
