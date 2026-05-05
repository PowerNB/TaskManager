import { Worker } from "bullmq";
import { bullRedis } from "#root/infrastructure/redis.js";
import { morningBriefService } from "#root/services/brief/morning.service.js";
import { startBriefForUser } from "#root/bot/handlers/morning-brief/morning-brief.handler.js";
import { bot } from "#root/bot/index.js";
import { InlineKeyboard } from "grammy";
import { logger } from "#root/logger.js";

export const morningBriefWorker = new Worker(
    "morning-brief",
    async (job) => {
        logger.debug({ jobName: job.name }, "morning-brief job started");

        const candidates = await morningBriefService.getUsersDueForBrief();

        for (const { user } of candidates) {
            const userId = Number(user.id);

            await startBriefForUser(async (text: string, keyboard: InlineKeyboard) => {
                await bot.api.sendMessage(userId, text, { reply_markup: keyboard });
            });

            await morningBriefService.markBriefSent(user.id);
            logger.info({ userId }, "morning brief sent");
        }
    },
    { connection: bullRedis },
);

morningBriefWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "morning-brief job failed");
});
