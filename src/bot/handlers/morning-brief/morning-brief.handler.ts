import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { morningBriefService, DURATION_MINUTES } from "#root/services/brief/morning.service.js";
import { taskRepository } from "#root/repositories/task.repository.js";
import { TaskModel } from "#root/infrastructure/generated/prisma/models/Task.js";
import { startEloSession } from "#root/bot/handlers/elo.handler.js";
import {
    MORNING_BRIEF_TEXTS,
    FREE_TIME_PRESETS,
    CATEGORY_LABELS,
    DURATION_LABELS,
} from "./const.js";

const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} мин`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} ч`;
    return `${h} ч ${m} мин`;
};

const formatTask = (task: TaskModel): string => {
    const parts: string[] = [`📌 ${task.title} — ${DURATION_LABELS[task.duration_tag]}`];
    if (task.due_time) {
        const h = String(task.due_time.getHours()).padStart(2, "0");
        const m = String(task.due_time.getMinutes()).padStart(2, "0");
        parts.push(`в ${h}:${m}`);
    }
    return parts.join(" — ");
};

const sendNextCandidate = async (ctx: BotContext, candidates: TaskModel[], idx: number, remainingMinutes: number) => {
    if (idx >= candidates.length) {
        await ctx.reply(MORNING_BRIEF_TEXTS.NO_CANDIDATES);
        await sendFinalPlan(ctx);
        return;
    }

    const task = candidates[idx];
    const taskMinutes = DURATION_MINUTES[task.duration_tag] ?? 0;

    if (taskMinutes > remainingMinutes) {
        const next = candidates.slice(idx + 1).findIndex(
            (t) => (DURATION_MINUTES[t.duration_tag] ?? 0) <= remainingMinutes,
        );

        if (next === -1) {
            await ctx.reply(MORNING_BRIEF_TEXTS.NO_CANDIDATES);
            await sendFinalPlan(ctx);
            return;
        }

        ctx.session.brief = { ...ctx.session.brief, currentCandidateIndex: idx + 1 + next };
        await sendNextCandidate(ctx, candidates, idx + 1 + next, remainingMinutes);
        return;
    }

    const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");

    const keyboard = new InlineKeyboard()
        .text(MORNING_BRIEF_TEXTS.ADD_TO_PLAN, `brief:add:${task.id}`)
        .text(MORNING_BRIEF_TEXTS.SKIP_TASK, `brief:skip:${task.id}`)
        .row()
        .text(MORNING_BRIEF_TEXTS.FINISH_PLAN, "brief:finish");

    await ctx.reply(
        `Осталось: ${formatMinutes(remainingMinutes)}\n\n📋 ${task.title}\n${tags}`,
        { reply_markup: keyboard },
    );
};

const sendFinalPlan = async (ctx: BotContext) => {
    const brief = ctx.session.brief ?? {};
    const freeMinutes = brief.freeMinutes ?? 0;
    const mandatoryMinutes = brief.mandatoryMinutes ?? 0;
    const plannedIds = brief.plannedTaskIds ?? [];

    const mandatoryTasks = await taskRepository.findTodayMandatory(BigInt(ctx.from!.id));
    const plannedTasks = plannedIds.length > 0
        ? await Promise.all(plannedIds.map((id) => taskRepository.findById(id)))
        : [];

    const validPlanned = plannedTasks.filter((t): t is TaskModel => t !== null);
    const totalMinutes = mandatoryMinutes + validPlanned.reduce((s, t) => s + (DURATION_MINUTES[t.duration_tag] ?? 0), 0);

    const lines: string[] = ["✅ План на сегодня\n"];

    if (mandatoryTasks.length > 0) {
        lines.push("📌 Обязательные:");
        mandatoryTasks.forEach((t) => lines.push(`— ${formatTask(t)}`));
    }

    if (validPlanned.length > 0) {
        lines.push("\n📋 Дополнительные:");
        validPlanned.forEach((t) => lines.push(`— ${t.title} — ${DURATION_LABELS[t.duration_tag]}`));
    }

    lines.push(`\nИтого: ${formatMinutes(totalMinutes)} из ${formatMinutes(freeMinutes)} запланировано.`);
    lines.push("Удачного дня!");

    await ctx.reply(lines.join("\n"));

    ctx.session.scene = null;
    ctx.session.brief = undefined;

    const userId = BigInt(ctx.from!.id);
    const candidates = await morningBriefService.getCandidates(userId);
    if (candidates.length >= 2) {
        await startEloSession(ctx, 10);
    }
};

export const registerMorningBriefHandler = (bot: Bot<BotContext>) => {
    // Entry from job (bot sends first message, user responds with hours)
    bot.callbackQuery("brief:inbox", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.scene = null;
        await ctx.reply("📥 Инбокс пока не реализован.");
    });

    // "Yes, pick candidates" after mandatory overview
    bot.callbackQuery("brief:hours:pick_candidates", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const brief = ctx.session.brief ?? {};
        const remaining = (brief.freeMinutes ?? 0) - (brief.mandatoryMinutes ?? 0);
        const candidates = await morningBriefService.getCandidates(BigInt(ctx.from!.id));

        if (candidates.length === 0) {
            await ctx.reply(MORNING_BRIEF_TEXTS.NO_CANDIDATES);
            await sendFinalPlan(ctx);
            return;
        }

        ctx.session.brief = { ...brief, currentCandidateIndex: 0 };
        await sendNextCandidate(ctx, candidates, 0, remaining);
    });

    // Free time preset selected
    bot.callbackQuery(/^brief:hours:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const value = ctx.match[1];

        if (value === "custom") {
            ctx.session.scene = "brief:awaiting_custom_hours";
            await ctx.reply(MORNING_BRIEF_TEXTS.CUSTOM_HOURS_PROMPT);
            return;
        }

        const freeMinutes = parseInt(value, 10);
        if (isNaN(freeMinutes) || freeMinutes === 0) return;

        await startBriefPlanStep(ctx, freeMinutes);
    });

    // Add candidate to plan
    bot.callbackQuery(/^brief:add:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        const brief = ctx.session.brief ?? {};
        const plannedTaskIds = [...(brief.plannedTaskIds ?? []), taskId];
        const taskMinutes = brief.candidateIds
            ? await getTaskMinutes(taskId)
            : 0;

        const remaining = (brief.freeMinutes ?? 0) - (brief.mandatoryMinutes ?? 0) -
            (brief.plannedTaskIds ?? []).reduce((s) => s, 0);
        const newRemaining = remaining - taskMinutes;

        ctx.session.brief = { ...brief, plannedTaskIds };

        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        if (newRemaining <= 0) {
            await sendFinalPlan(ctx);
            return;
        }

        const idx = (brief.currentCandidateIndex ?? 0) + 1;
        ctx.session.brief = { ...ctx.session.brief, currentCandidateIndex: idx };

        const candidates = await morningBriefService.getCandidates(BigInt(ctx.from!.id));
        await sendNextCandidate(ctx, candidates, idx, newRemaining);
    });

    // Skip candidate
    bot.callbackQuery(/^brief:skip:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const brief = ctx.session.brief ?? {};
        const idx = (brief.currentCandidateIndex ?? 0) + 1;
        ctx.session.brief = { ...brief, currentCandidateIndex: idx };

        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const usedMinutes = (brief.plannedTaskIds ?? []).length > 0
            ? await calcPlannedMinutes(brief.plannedTaskIds ?? [])
            : 0;
        const remaining = (brief.freeMinutes ?? 0) - (brief.mandatoryMinutes ?? 0) - usedMinutes;

        const candidates = await morningBriefService.getCandidates(BigInt(ctx.from!.id));
        await sendNextCandidate(ctx, candidates, idx, remaining);
    });

    // Finish manually
    bot.callbackQuery("brief:finish", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await sendFinalPlan(ctx);
    });

    // "Only mandatory" — skip candidates step
    bot.callbackQuery("brief:only_mandatory", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await sendFinalPlan(ctx);
    });

    // Custom hours text input
    bot.on("message:text", async (ctx, next) => {
        if (ctx.session.scene !== "brief:awaiting_custom_hours") return next();

        const raw = ctx.message.text.trim().replace(",", ".");
        const hours = parseFloat(raw);

        if (isNaN(hours) || hours <= 0 || hours > 24) {
            await ctx.reply(MORNING_BRIEF_TEXTS.CUSTOM_HOURS_INVALID);
            return;
        }

        const freeMinutes = Math.round(hours * 60);
        ctx.session.scene = null;
        await startBriefPlanStep(ctx, freeMinutes);
    });
};

const getTaskMinutes = async (taskId: string): Promise<number> => {
    const task = await taskRepository.findById(taskId);
    if (!task) return 0;
    return DURATION_MINUTES[task.duration_tag] ?? 0;
};

const calcPlannedMinutes = async (ids: string[]): Promise<number> => {
    let total = 0;
    for (const id of ids) {
        total += await getTaskMinutes(id);
    }
    return total;
};

export const startBriefForUser = async (
    sendMessage: (text: string, keyboard: InlineKeyboard) => Promise<void>,
) => {
    const keyboard = new InlineKeyboard();
    Object.entries(FREE_TIME_PRESETS).forEach(([key, preset]) => {
        if (key === "CUSTOM") {
            keyboard.row().text(preset.label, "brief:hours:custom");
        } else {
            keyboard.text(preset.label, `brief:hours:${"minutes" in preset ? preset.minutes : 0}`);
        }
    });

    await sendMessage(MORNING_BRIEF_TEXTS.HOW_MANY_HOURS, keyboard);
};

const startBriefPlanStep = async (ctx: BotContext, freeMinutes: number) => {
    const userId = BigInt(ctx.from!.id);
    const plan = await morningBriefService.buildPlan(userId, freeMinutes);

    ctx.session.brief = {
        freeMinutes,
        mandatoryMinutes: plan.mandatoryMinutes,
        plannedTaskIds: [],
        currentCandidateIndex: 0,
    };

    if (plan.overloaded) {
        const lines = [
            "⚠️ Обязательные задачи превышают свободное время.\n",
            `Свободно: ${formatMinutes(freeMinutes)}`,
            `Обязательные: ${formatMinutes(plan.mandatoryMinutes)}\n`,
            ...plan.mandatory.map(formatTask),
            "\nЭто твой план на сегодня. Удачи!",
        ];
        await ctx.reply(lines.join("\n"));
        ctx.session.scene = null;
        ctx.session.brief = undefined;
        return;
    }

    if (plan.mandatory.length > 0) {
        const remaining = freeMinutes - plan.mandatoryMinutes;
        const lines = [
            "Сегодня обязательные задачи:\n",
            ...plan.mandatory.map(formatTask),
            `\nЗанято: ${formatMinutes(plan.mandatoryMinutes)}`,
            `Осталось: ${formatMinutes(remaining)}\n`,
            "Подберём задачи на оставшееся время?",
        ];
        const keyboard = new InlineKeyboard()
            .text("Да", "brief:hours:pick_candidates")
            .text(MORNING_BRIEF_TEXTS.ONLY_MANDATORY, "brief:only_mandatory");
        await ctx.reply(lines.join("\n"), { reply_markup: keyboard });
        ctx.session.scene = "brief:selecting_candidates";
        return;
    }

    // No mandatory tasks — go straight to candidates
    const remaining = freeMinutes;
    const candidates = await morningBriefService.getCandidates(userId);

    if (candidates.length === 0) {
        await ctx.reply(MORNING_BRIEF_TEXTS.NO_TASKS_TODAY);
        ctx.session.scene = null;
        ctx.session.brief = undefined;
        return;
    }

    ctx.session.scene = "brief:selecting_candidates";
    await sendNextCandidate(ctx, candidates, 0, remaining);
};
