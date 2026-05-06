import { Worker } from "bullmq";
import { Api, InlineKeyboard } from "grammy";
import { bullRedis } from "#root/infrastructure/redis.js";
import { morningBriefService } from "#root/services/brief/morning.service.js";
import { FREE_TIME_PRESETS, MORNING_BRIEF_START_TEXT } from "#root/types/brief.js";
import { logger } from "#root/logger.js";

const sendBriefStart = async (send: (text: string, keyboard: InlineKeyboard) => Promise<void>): Promise<void> => {
    const keyboard = new InlineKeyboard();
    Object.entries(FREE_TIME_PRESETS).forEach(([key, preset]) => {
        if (key === "CUSTOM") {
            keyboard.row().text(preset.label, "brief:hours:custom");
        } else {
            keyboard.text(preset.label, `brief:hours:${preset.minutes}`);
        }
    });
    await send(MORNING_BRIEF_START_TEXT, keyboard);
};

export const createMorningBriefWorker = (api: Api) => {
    const worker = new Worker(
        "morning-brief",
        async (job) => {
            logger.debug({ jobName: job.name }, "morning-brief job started");

            const candidates = await morningBriefService.getUsersDueForBrief();

            for (const { user } of candidates) {
                const userId = Number(user.id);

                await sendBriefStart(async (text, keyboard) => {
                    await api.sendMessage(userId, text, { reply_markup: keyboard });
                });

                await morningBriefService.markBriefSent(user.id);
                logger.info({ userId }, "morning brief sent");
            }
        },
        { connection: bullRedis },
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, err }, "morning-brief job failed");
    });

    return worker;
};
