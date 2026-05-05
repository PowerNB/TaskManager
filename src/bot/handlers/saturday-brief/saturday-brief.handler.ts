import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { taskRepository } from "#root/repositories/task.repository.js";
import { saturdayBriefService, SaturdayBriefData } from "#root/services/brief/saturday.service.js";
import { SATURDAY_TEXTS, DURATION_LABELS, CATEGORY_LABELS } from "./const.js";

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

export const sendSaturdayBrief = async (
    data: SaturdayBriefData,
    sendMessage: (text: string, keyboard?: InlineKeyboard) => Promise<void>,
): Promise<void> => {
    // Block 1 (quarterly): archived tasks — info only, then delete from DB
    if (data.type === "quarterly" && data.archivedTasks.length > 0) {
        const lines = [
            `🗂 Квартальный архив\n`,
            "За этот квартал так и не были выполнены:",
            ...data.archivedTasks.map((t, i) => `${i + 1}. ${t.title}`),
            "\nЭти задачи удалены. Если что-то важное — добавь заново.",
        ];
        await sendMessage(lines.join("\n"));
        await saturdayBriefService.deleteArchivedTasks(data.archivedTasks.map((t) => t.id));
    }

    // Block 2 (monthly/quarterly): frozen tasks
    if ((data.type === "monthly" || data.type === "quarterly") && data.frozenTasks.length > 0) {
        const now = new Date();
        const monthName = now.toLocaleString("ru-RU", { month: "long" });
        await sendMessage(`❄️ Холодильник — ${monthName}\n`);

        for (const task of data.frozenTasks) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");
            const daysSince = task.frozen_at ? formatDaysSince(task.frozen_at) : "?";
            const keyboard = new InlineKeyboard()
                .text(SATURDAY_TEXTS.FROZEN_RETURN, `sat:frozen:return:${task.id}`)
                .text(SATURDAY_TEXTS.FROZEN_DELETE, `sat:frozen:delete:${task.id}`);

            await sendMessage(
                `${task.title}\n${tags} — заморожена ${daysSince}`,
                keyboard,
            );
        }
    }

    // Block 3: stats (always)
    await sendMessage(buildStatsText(data));

    // Block 4: stale tasks
    if (data.staleTasks.length > 0) {
        await sendMessage(
            "📋 Задачи без движения 7+ дней\nЕсли ничего не сделаешь — уйдут в холодильник.\n",
        );

        for (const task of data.staleTasks) {
            const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");
            const daysSince = formatDaysSince(task.last_activity_at);
            const keyboard = new InlineKeyboard()
                .text(SATURDAY_TEXTS.STALE_KEEP, `sat:stale:keep:${task.id}`)
                .text(SATURDAY_TEXTS.STALE_DONE, `sat:stale:done:${task.id}`)
                .text(SATURDAY_TEXTS.STALE_DELETE, `sat:stale:delete:${task.id}`);

            await sendMessage(
                `${task.title}\n${tags} — лежит ${daysSince}`,
                keyboard,
            );
        }
    }

    // Block 5: ELO — заглушка
    // TODO: реализовать когда будет elo feature
};

export const registerSaturdayBriefHandler = (bot: Bot<BotContext>) => {
    // Stale task: keep (update last_activity_at)
    bot.callbackQuery(/^sat:stale:keep:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await taskRepository.update(taskId, { last_activity_at: new Date() });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("✅ Задача оставлена активной.");
    });

    // Stale task: done
    bot.callbackQuery(/^sat:stale:done:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await taskRepository.update(taskId, { status: "DONE", completed_at: new Date() });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("✅ Задача выполнена.");
    });

    // Stale task: delete
    bot.callbackQuery(/^sat:stale:delete:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await taskRepository.update(taskId, { status: "DELETED" });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("🗑 Задача удалена.");
    });

    // Frozen task: return to active
    bot.callbackQuery(/^sat:frozen:return:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await taskRepository.update(taskId, {
            status: "ACTIVE",
            frozen_at: null,
            last_activity_at: new Date(),
        });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("↩ Задача возвращена в активные.");
    });

    // Frozen task: delete
    bot.callbackQuery(/^sat:frozen:delete:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        await taskRepository.update(taskId, { status: "DELETED" });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply("🗑 Задача удалена.");
    });
};
