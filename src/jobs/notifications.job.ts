import { Worker } from "bullmq";
import { Api, InlineKeyboard } from "grammy";
import { bullRedis } from "#root/infrastructure/redis.js";
import { notificationService } from "#root/services/notification.service.js";
import { DURATION_LABELS, CATEGORY_LABELS } from "#root/types/brief.js";
import { logger } from "#root/logger.js";

export const createNotificationsWorker = (api: Api) => {
    const sendDelegationNotifications = async () => {
        const notifications = await notificationService.getDueDelegations();

        for (const { task, userId, canSendNow } of notifications) {
            if (!canSendNow) continue;

            const keyboard = new InlineKeyboard()
                .text("✅ Да, готово", `notif:delegation:done:${task.id}`)
                .text("⏳ Ещё нет", `notif:delegation:snooze:${task.id}`)
                .row()
                .text("↩ Забрать задачу себе", `notif:delegation:take_back:${task.id}`);

            await api.sendMessage(
                Number(userId),
                `🤝 Делегирование — напоминание\n\n3 дня назад ты передал задачу:\n"${task.title}" → ${task.delegated_to}\n\nОн уже сделал?`,
                { reply_markup: keyboard },
            );

            logger.info({ taskId: task.id, userId }, "delegation notification sent");
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
                .text("✅ Выполнено", `notif:deadline:done:${task.id}`)
                .text("📅 Перенести", `notif:deadline:reschedule:${task.id}`)
                .text("🗑 Удалить", `notif:deadline:delete:${task.id}`);

            await api.sendMessage(
                Number(userId),
                `📅 Сегодня дедлайн\n\n"${task.title}"\n${tags}`,
                { reply_markup: keyboard },
            );

            logger.info({ taskId: task.id, userId }, "date deadline notification sent");
        }
    };

    const sendTimeDeadlineNotifications = async () => {
        const notifications = await notificationService.getDueTimeDeadlines();

        for (const { task, userId } of notifications) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]]
                .filter(Boolean)
                .join(" ");

            const dueTime = task.due_time
                ? `${String(task.due_time.getHours()).padStart(2, "0")}:${String(task.due_time.getMinutes()).padStart(2, "0")}`
                : "";

            const keyboard = new InlineKeyboard()
                .text("✅ Выполнено", `notif:deadline:done:${task.id}`)
                .text("🗑 Удалить", `notif:deadline:delete:${task.id}`);

            await api.sendMessage(
                Number(userId),
                `⏰ Через час — ${dueTime}\n\n"${task.title}"\n${tags}`,
                { reply_markup: keyboard },
            );

            logger.info({ taskId: task.id, userId }, "time deadline notification sent");
        }
    };

    const worker = new Worker(
        "notifications",
        async (job) => {
            logger.debug({ jobName: job.name }, "notifications job started");

            if (job.name === "check-delegations-and-date-deadlines") {
                await sendDelegationNotifications();
                await sendDateDeadlineNotifications();
            } else if (job.name === "check-time-deadlines") {
                await sendTimeDeadlineNotifications();
            }
        },
        { connection: bullRedis },
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, jobName: job?.name, err }, "notifications job failed");
    });

    return worker;
};
