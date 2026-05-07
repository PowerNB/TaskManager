import { Worker } from "bullmq";
import { Api, InlineKeyboard } from "grammy";
import { bullRedis } from "#root/infrastructure/redis.js";
import { morningBriefService } from "#root/services/brief/morning.service.js";
import { FREE_TIME_PRESETS, MORNING_BRIEF_START_TEXT } from "#root/types/brief.js";
import { logger } from "#root/logger.js";
import { QUEUE_NAMES, MORNING_JOB_CALLBACKS, MORNING_JOB_PRESET_KEYS, JOBS_LOG } from "./const.js";

const sendBriefStart = async (send: (text: string, keyboard: InlineKeyboard) => Promise<void>): Promise<void> => {
    const keyboard = new InlineKeyboard();
    Object.entries(FREE_TIME_PRESETS).forEach(([key, preset]) => {
        if (key === MORNING_JOB_PRESET_KEYS.CUSTOM) {
            keyboard.row().text(preset.label, MORNING_JOB_CALLBACKS.HOURS_CUSTOM);
        } else {
            keyboard.text(preset.label, MORNING_JOB_CALLBACKS.HOURS_VALUE(preset.minutes));
        }
    });
    await send(MORNING_BRIEF_START_TEXT, keyboard);
};

export const createMorningBriefWorker = (api: Api) => {
    const worker = new Worker(
        QUEUE_NAMES.MORNING_BRIEF,
        async (job) => {
            logger.debug({ jobName: job.name }, JOBS_LOG.MORNING_BRIEF_STARTED);

            const candidates = await morningBriefService.getUsersDueForBrief();

            for (const { user } of candidates) {
                const userId = Number(user.id);

                await sendBriefStart(async (text, keyboard) => {
                    await api.sendMessage(userId, text, { reply_markup: keyboard });
                });

                await morningBriefService.markBriefSent(user.id);
                logger.info({ userId }, JOBS_LOG.MORNING_BRIEF_SENT);
            }
        },
        { connection: bullRedis },
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, err }, JOBS_LOG.MORNING_BRIEF_FAILED);
    });

    return worker;
};
