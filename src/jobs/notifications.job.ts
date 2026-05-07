import { Worker } from "bullmq";
import { Api, InlineKeyboard } from "grammy";
import { bullRedis } from "#root/infrastructure/redis.js";
import { notificationService } from "#root/services/notification.service.js";
import { DURATION_LABELS, CATEGORY_LABELS } from "#root/types/labels.js";
import { formatTimeUTCHHmm } from "#root/utils/time.js";
import { logger } from "#root/logger.js";
import {
    QUEUE_NAMES,
    JOB_NAMES,
    NOTIF_JOB_TEXTS,
    NOTIF_JOB_BUTTONS,
    NOTIF_JOB_CALLBACKS,
    JOBS_LOG,
} from "./const.js";

export const createNotificationsWorker = (api: Api) => {
    const sendDelegationNotifications = async () => {
        const notifications = await notificationService.getDueDelegations();

        for (const { task, userId, canSendNow } of notifications) {
            if (!canSendNow) continue;

            const keyboard = new InlineKeyboard()
                .text(NOTIF_JOB_BUTTONS.DELEGATION_DONE, NOTIF_JOB_CALLBACKS.DELEGATION_DONE(task.id))
                .text(NOTIF_JOB_BUTTONS.DELEGATION_SNOOZE, NOTIF_JOB_CALLBACKS.DELEGATION_SNOOZE(task.id))
                .row()
                .text(NOTIF_JOB_BUTTONS.DELEGATION_TAKE_BACK, NOTIF_JOB_CALLBACKS.DELEGATION_TAKE_BACK(task.id));

            const text =
                NOTIF_JOB_TEXTS.DELEGATION_HEADER +
                NOTIF_JOB_TEXTS.DELEGATION_BODY(task.title, task.delegated_to ?? "");

            await api.sendMessage(Number(userId), text, { reply_markup: keyboard });

            logger.info({ taskId: task.id, userId }, JOBS_LOG.DELEGATION_SENT);
        }
    };

    const sendMorningTimeDeadlineNotifications = async () => {
        const notifications = await notificationService.getMorningTimeDeadlines();

        for (const { task, userId, canSendNow } of notifications) {
            if (!canSendNow) continue;

            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]]
                .filter(Boolean)
                .join(" ");

            const dueTime = task.due_time ? formatTimeUTCHHmm(task.due_time) : "";

            const keyboard = new InlineKeyboard()
                .text(NOTIF_JOB_BUTTONS.DEADLINE_DONE, NOTIF_JOB_CALLBACKS.DEADLINE_DONE(task.id))
                .text(NOTIF_JOB_BUTTONS.DEADLINE_RESCHEDULE, NOTIF_JOB_CALLBACKS.DEADLINE_RESCHEDULE(task.id))
                .text(NOTIF_JOB_BUTTONS.DEADLINE_DELETE, NOTIF_JOB_CALLBACKS.DEADLINE_DELETE(task.id));

            const text =
                NOTIF_JOB_TEXTS.MORNING_TIME_DEADLINE_HEADER(dueTime) +
                NOTIF_JOB_TEXTS.MORNING_TIME_DEADLINE_BODY(task.title, tags);

            await api.sendMessage(Number(userId), text, { reply_markup: keyboard });

            logger.info({ taskId: task.id, userId }, JOBS_LOG.MORNING_TIME_DEADLINE_SENT);
        }
    };

    const sendDateDeadlineNotifications = async () => {
        const notifications = await notificationService.getDueDateDeadlines();

        for (const { task, userId, canSendNow } of notifications) {
            if (!canSendNow) continue;

            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]]
                .filter(Boolean)
                .join(" ");

            const keyboard = new InlineKeyboard()
                .text(NOTIF_JOB_BUTTONS.DEADLINE_DONE, NOTIF_JOB_CALLBACKS.DEADLINE_DONE(task.id))
                .text(NOTIF_JOB_BUTTONS.DEADLINE_RESCHEDULE, NOTIF_JOB_CALLBACKS.DEADLINE_RESCHEDULE(task.id))
                .text(NOTIF_JOB_BUTTONS.DEADLINE_DELETE, NOTIF_JOB_CALLBACKS.DEADLINE_DELETE(task.id));

            const text =
                NOTIF_JOB_TEXTS.DATE_DEADLINE_HEADER +
                NOTIF_JOB_TEXTS.DATE_DEADLINE_BODY(task.title, tags);

            await api.sendMessage(Number(userId), text, { reply_markup: keyboard });

            logger.info({ taskId: task.id, userId }, JOBS_LOG.DATE_DEADLINE_SENT);
        }
    };

    const sendTimeDeadlineNotifications = async () => {
        const notifications = await notificationService.getDueTimeDeadlines();

        for (const { task, userId } of notifications) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]]
                .filter(Boolean)
                .join(" ");

            const dueTime = task.due_time ? formatTimeUTCHHmm(task.due_time) : "";

            const keyboard = new InlineKeyboard()
                .text(NOTIF_JOB_BUTTONS.DEADLINE_DONE, NOTIF_JOB_CALLBACKS.DEADLINE_DONE(task.id))
                .text(NOTIF_JOB_BUTTONS.DEADLINE_DELETE, NOTIF_JOB_CALLBACKS.DEADLINE_DELETE(task.id));

            const text =
                NOTIF_JOB_TEXTS.TIME_DEADLINE_HEADER(dueTime) +
                NOTIF_JOB_TEXTS.TIME_DEADLINE_BODY(task.title, tags);

            await api.sendMessage(Number(userId), text, { reply_markup: keyboard });

            logger.info({ taskId: task.id, userId }, JOBS_LOG.TIME_DEADLINE_SENT);
        }
    };

    const worker = new Worker(
        QUEUE_NAMES.NOTIFICATIONS,
        async (job) => {
            logger.debug({ jobName: job.name }, JOBS_LOG.NOTIFICATIONS_STARTED);

            if (job.name === JOB_NAMES.CHECK_DELEGATIONS_AND_DATE_DEADLINES) {
                await sendDelegationNotifications();
                await sendDateDeadlineNotifications();
                await sendMorningTimeDeadlineNotifications();
            } else if (job.name === JOB_NAMES.CHECK_TIME_DEADLINES) {
                await sendTimeDeadlineNotifications();
            }
        },
        { connection: bullRedis },
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, jobName: job?.name, err }, JOBS_LOG.NOTIFICATIONS_FAILED);
    });

    return worker;
};
