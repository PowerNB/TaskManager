import { Worker } from "bullmq";
import { Api, InlineKeyboard } from "grammy";
import { bullRedis } from "#root/infrastructure/redis.js";
import { saturdayBriefService, SaturdayBriefData } from "#root/services/brief/saturday.service.js";
import { eloService } from "#root/services/elo.service.js";
import { DURATION_LABELS, CATEGORY_LABELS } from "#root/types/brief.js";
import { logger } from "#root/logger.js";

const formatDaysSince = (date: Date): string => {
    const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    return `${days} дн`;
};

const buildStatsText = (data: SaturdayBriefData): string => {
    const { stats } = data;
    const lines: string[] = ["📊 Итоги недели\n"];

    if (stats.thisWeek === 0) {
        lines.push("Закрыто задач: 0");
        lines.push("На этой неделе ни одной задачи не закрыто.");
        lines.push("Бывает — на следующей наверстаем.");
    } else {
        lines.push(`Закрыто задач: ${stats.thisWeek}`);
        if (stats.lastWeek !== null) {
            const diff = stats.thisWeek - stats.lastWeek;
            const sign = diff > 0 ? "+" : "";
            lines.push(`к прошлой неделе: ${sign}${diff}`);
        }
        if (stats.monthlyAvg !== null) {
            lines.push(`среднее за месяц: ${stats.monthlyAvg} в неделю`);
        }
    }

    lines.push(`\nАктивных сейчас: ${stats.active}`);
    return lines.join("\n");
};

type SendMessage = (text: string, keyboard?: InlineKeyboard) => Promise<void>;

const sendSaturdayBrief = async (data: SaturdayBriefData, send: SendMessage): Promise<void> => {
    if (data.type === "quarterly" && data.archivedTasks.length > 0) {
        const lines = [
            `🗂 Квартальный архив\n`,
            "За этот квартал так и не были выполнены:",
            ...data.archivedTasks.map((t, i) => `${i + 1}. ${t.title}`),
            "\nЭти задачи удалены. Если что-то важное — добавь заново.",
        ];
        await send(lines.join("\n"));
        await saturdayBriefService.deleteArchivedTasks(data.archivedTasks.map((t) => t.id));
    }

    if ((data.type === "monthly" || data.type === "quarterly") && data.frozenTasks.length > 0) {
        const now = new Date();
        const monthName = now.toLocaleString("ru-RU", { month: "long" });
        await send(`❄️ Холодильник — ${monthName}\n`);

        for (const task of data.frozenTasks) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");
            const daysSince = task.frozen_at ? formatDaysSince(task.frozen_at) : "?";
            const keyboard = new InlineKeyboard()
                .text("Вернуть", `sat:frozen:return:${task.id}`)
                .text("Удалить", `sat:frozen:delete:${task.id}`);
            await send(`${task.title}\n${tags} — заморожена ${daysSince}`, keyboard);
        }
    }

    await send(buildStatsText(data));

    if (data.staleTasks.length > 0) {
        await send("📋 Задачи без движения 7+ дней\nЕсли ничего не сделаешь — уйдут в холодильник.\n");

        for (const task of data.staleTasks) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");
            const daysSince = formatDaysSince(task.last_activity_at);
            const keyboard = new InlineKeyboard()
                .text("Оставить", `sat:stale:keep:${task.id}`)
                .text("Выполнено", `sat:stale:done:${task.id}`)
                .text("Удалить", `sat:stale:delete:${task.id}`);
            await send(`${task.title}\n${tags} — лежит ${daysSince}`, keyboard);
        }
    }
};

const sendEloPair = async (api: Api, chatId: number, userId: bigint, pairCount: number): Promise<void> => {
    const pairs = await eloService.getPairs(userId, 1);
    if (pairs.length === 0) {
        await api.sendMessage(chatId, "✅ Приоритеты обновлены.", { reply_markup: new InlineKeyboard() });
        return;
    }

    const [taskA, taskB] = pairs[0];
    const keyboard = new InlineKeyboard()
        .text("1️⃣ Первая", `elo:pick:${taskA.id}:${taskB.id}:0:${pairCount}`)
        .text("2️⃣ Вторая", `elo:pick:${taskB.id}:${taskA.id}:0:${pairCount}`)
        .row()
        .text("— Пропустить", `elo:skip:0:${pairCount}`);
    await api.sendMessage(
        chatId,
        `Расставим приоритеты.\nЧто важнее прямо сейчас? (1/${pairCount})\n\n1️⃣ ${taskA.title}\n2️⃣ ${taskB.title}`,
        { reply_markup: keyboard },
    );
};

export const createSaturdayBriefWorker = (api: Api) => {
    const worker = new Worker(
        "saturday-brief",
        async (job) => {
            logger.debug({ jobName: job.name }, "saturday-brief job started");

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

                logger.info({ userId, type: data.type }, "saturday brief sent");
            }
        },
        { connection: bullRedis },
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, err }, "saturday-brief job failed");
    });

    return worker;
};
