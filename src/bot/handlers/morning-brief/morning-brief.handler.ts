import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { morningBriefService } from "#root/services/brief/morning.service.js";
import { TaskModel } from "#root/types/models.js";
import { startEloSession } from "#root/bot/handlers/elo/elo.handler.js";
import { formatTimeHHmm, formatMinutes } from "#root/utils/time.js";
import {
    MORNING_BRIEF_TEXTS,
    MORNING_BRIEF_CALLBACKS,
    MORNING_BRIEF_PATTERNS,
    MORNING_BRIEF_SCENES,
    ELO_PAIR_COUNT,
} from "./const.js";
import { FREE_TIME_PRESETS, CATEGORY_LABELS, DURATION_LABELS } from "#root/types/brief.js";

const formatTask = (task: TaskModel): string => {
    const parts = [
        `${MORNING_BRIEF_TEXTS.MANDATORY_TASK_PREFIX} ${MORNING_BRIEF_TEXTS.TASK_FORMAT(task.title, DURATION_LABELS[task.duration_tag])}`,
    ];
    if (task.due_time) {
        parts.push(`${MORNING_BRIEF_TEXTS.TIME_PREFIX} ${formatTimeHHmm(task.due_time)}`);
    }
    return parts.join(` ${MORNING_BRIEF_TEXTS.SEPARATOR} `);
};

const sendNextCandidate = async (ctx: BotContext, candidates: TaskModel[], idx: number, remainingMinutes: number) => {
    if (idx >= candidates.length) {
        await ctx.reply(MORNING_BRIEF_TEXTS.NO_CANDIDATES);
        await sendFinalPlan(ctx);
        return;
    }

    const task = candidates[idx];
    const taskMinutes = morningBriefService.calcTaskMinutes(task);

    if (taskMinutes > remainingMinutes) {
        const next = morningBriefService.findNextFittingIndex(candidates, idx + 1, remainingMinutes);

        if (next === -1) {
            await ctx.reply(MORNING_BRIEF_TEXTS.NO_CANDIDATES);
            await sendFinalPlan(ctx);
            return;
        }

        ctx.session.brief = { ...ctx.session.brief, currentCandidateIndex: next };
        await sendNextCandidate(ctx, candidates, next, remainingMinutes);
        return;
    }

    const tags = [CATEGORY_LABELS[task.category], DURATION_LABELS[task.duration_tag]].join(" ");

    const keyboard = new InlineKeyboard()
        .text(MORNING_BRIEF_TEXTS.ADD_TO_PLAN, MORNING_BRIEF_CALLBACKS.ADD_VALUE(task.id))
        .text(MORNING_BRIEF_TEXTS.SKIP_TASK, MORNING_BRIEF_CALLBACKS.SKIP_VALUE(task.id))
        .row()
        .text(MORNING_BRIEF_TEXTS.FINISH_PLAN, MORNING_BRIEF_CALLBACKS.FINISH);

    await ctx.reply(
        MORNING_BRIEF_TEXTS.CANDIDATE_MESSAGE(formatMinutes(remainingMinutes), task.title, tags),
        { reply_markup: keyboard },
    );
};

const sendFinalPlan = async (ctx: BotContext) => {
    const brief = ctx.session.brief ?? {};
    const freeMinutes = brief.freeMinutes ?? 0;
    const mandatoryMinutes = brief.mandatoryMinutes ?? 0;
    const plannedIds = brief.plannedTaskIds ?? [];

    const userId = BigInt(ctx.from!.id);
    const mandatoryTasks = await morningBriefService.buildPlan(userId, freeMinutes).then((p) => p.mandatory);
    const plannedTasks = await morningBriefService.getTasksByIds(plannedIds);

    const validPlanned = plannedTasks.filter((t): t is TaskModel => t !== null);
    const totalMinutes = mandatoryMinutes + morningBriefService.calcTotalMinutes(validPlanned);

    const lines: string[] = [MORNING_BRIEF_TEXTS.PLAN_HEADER];

    if (mandatoryTasks.length > 0) {
        lines.push(MORNING_BRIEF_TEXTS.MANDATORY_SECTION);
        mandatoryTasks.forEach((t) => lines.push(`${MORNING_BRIEF_TEXTS.LIST_ITEM_PREFIX} ${formatTask(t)}`));
    }

    if (validPlanned.length > 0) {
        lines.push(MORNING_BRIEF_TEXTS.OPTIONAL_SECTION);
        validPlanned.forEach((t) =>
            lines.push(`${MORNING_BRIEF_TEXTS.LIST_ITEM_PREFIX} ${MORNING_BRIEF_TEXTS.TASK_FORMAT(t.title, DURATION_LABELS[t.duration_tag])}`),
        );
    }

    lines.push(MORNING_BRIEF_TEXTS.PLAN_TOTAL(formatMinutes(totalMinutes), formatMinutes(freeMinutes)));
    lines.push(MORNING_BRIEF_TEXTS.PLAN_GOOD_LUCK);

    await ctx.reply(lines.join("\n"));

    ctx.session.scene = null;
    ctx.session.brief = undefined;

    const candidates = await morningBriefService.getCandidates(userId);
    if (candidates.length >= 2) {
        await startEloSession(ctx, ELO_PAIR_COUNT);
    }
};

export const registerMorningBriefHandler = (bot: Bot<BotContext>) => {
    bot.callbackQuery(MORNING_BRIEF_CALLBACKS.INBOX, async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.scene = null;
        await ctx.reply(MORNING_BRIEF_TEXTS.INBOX_NOT_IMPLEMENTED);
    });

    bot.callbackQuery(MORNING_BRIEF_CALLBACKS.PICK_CANDIDATES, async (ctx) => {
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

    bot.callbackQuery(MORNING_BRIEF_PATTERNS.HOURS, async (ctx) => {
        await ctx.answerCallbackQuery();
        const value = ctx.match[1];

        if (ctx.callbackQuery.data === MORNING_BRIEF_CALLBACKS.HOURS_CUSTOM) {
            ctx.session.scene = MORNING_BRIEF_SCENES.AWAITING_CUSTOM_HOURS;
            await ctx.reply(MORNING_BRIEF_TEXTS.CUSTOM_HOURS_PROMPT);
            return;
        }

        const freeMinutes = parseInt(value, 10);
        if (isNaN(freeMinutes) || freeMinutes === 0) return;

        await startBriefPlanStep(ctx, freeMinutes);
    });

    bot.callbackQuery(MORNING_BRIEF_PATTERNS.ADD, async (ctx) => {
        await ctx.answerCallbackQuery();
        const taskId = ctx.match[1];
        const brief = ctx.session.brief ?? {};
        const plannedTaskIds = [...(brief.plannedTaskIds ?? []), taskId];

        const taskMinutes = await morningBriefService.getPlannedMinutes([taskId]);
        const usedMinutes = await morningBriefService.getPlannedMinutes(brief.plannedTaskIds ?? []);
        const remaining = (brief.freeMinutes ?? 0) - (brief.mandatoryMinutes ?? 0) - usedMinutes;
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

    bot.callbackQuery(MORNING_BRIEF_PATTERNS.SKIP, async (ctx) => {
        await ctx.answerCallbackQuery();
        const brief = ctx.session.brief ?? {};
        const idx = (brief.currentCandidateIndex ?? 0) + 1;
        ctx.session.brief = { ...brief, currentCandidateIndex: idx };

        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const usedMinutes = await morningBriefService.getPlannedMinutes(brief.plannedTaskIds ?? []);
        const remaining = (brief.freeMinutes ?? 0) - (brief.mandatoryMinutes ?? 0) - usedMinutes;

        const candidates = await morningBriefService.getCandidates(BigInt(ctx.from!.id));
        await sendNextCandidate(ctx, candidates, idx, remaining);
    });

    bot.callbackQuery(MORNING_BRIEF_CALLBACKS.FINISH, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await sendFinalPlan(ctx);
    });

    bot.callbackQuery(MORNING_BRIEF_CALLBACKS.ONLY_MANDATORY, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await sendFinalPlan(ctx);
    });

    bot.on(MORNING_BRIEF_TEXTS.MESSAGE_TEXT_EVENT, async (ctx, next) => {
        if (ctx.session.scene !== MORNING_BRIEF_SCENES.AWAITING_CUSTOM_HOURS) return next();

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

export const startBriefForUser = async (
    sendMessage: (text: string, keyboard: InlineKeyboard) => Promise<void>,
) => {
    const keyboard = new InlineKeyboard();
    Object.entries(FREE_TIME_PRESETS).forEach(([key, preset]) => {
        if (key === MORNING_BRIEF_CALLBACKS.HOURS_CUSTOM_KEY) {
            keyboard.row().text(preset.label, MORNING_BRIEF_CALLBACKS.HOURS_CUSTOM);
        } else {
            keyboard.text(preset.label, MORNING_BRIEF_CALLBACKS.HOURS_VALUE(preset.minutes));
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
            MORNING_BRIEF_TEXTS.OVERLOADED_HEADER,
            MORNING_BRIEF_TEXTS.OVERLOADED_FREE(formatMinutes(freeMinutes)),
            MORNING_BRIEF_TEXTS.OVERLOADED_MANDATORY(formatMinutes(plan.mandatoryMinutes)),
            ...plan.mandatory.map(formatTask),
            MORNING_BRIEF_TEXTS.OVERLOADED_FOOTER,
        ];
        await ctx.reply(lines.join("\n"));
        ctx.session.scene = null;
        ctx.session.brief = undefined;
        return;
    }

    if (plan.mandatory.length > 0) {
        const remaining = freeMinutes - plan.mandatoryMinutes;
        const lines = [
            MORNING_BRIEF_TEXTS.MANDATORY_TASKS_HEADER,
            ...plan.mandatory.map(formatTask),
            MORNING_BRIEF_TEXTS.MANDATORY_BUSY(formatMinutes(plan.mandatoryMinutes)),
            MORNING_BRIEF_TEXTS.MANDATORY_REMAINING(formatMinutes(remaining)),
            MORNING_BRIEF_TEXTS.MANDATORY_QUESTION,
        ];
        const keyboard = new InlineKeyboard()
            .text(MORNING_BRIEF_TEXTS.YES, MORNING_BRIEF_CALLBACKS.PICK_CANDIDATES)
            .text(MORNING_BRIEF_TEXTS.ONLY_MANDATORY, MORNING_BRIEF_CALLBACKS.ONLY_MANDATORY);
        await ctx.reply(lines.join("\n"), { reply_markup: keyboard });
        ctx.session.scene = MORNING_BRIEF_SCENES.SELECTING_CANDIDATES;
        return;
    }

    const remaining = freeMinutes;
    const candidates = await morningBriefService.getCandidates(userId);

    if (candidates.length === 0) {
        await ctx.reply(MORNING_BRIEF_TEXTS.NO_TASKS_TODAY);
        ctx.session.scene = null;
        ctx.session.brief = undefined;
        return;
    }

    ctx.session.scene = MORNING_BRIEF_SCENES.SELECTING_CANDIDATES;
    await sendNextCandidate(ctx, candidates, 0, remaining);
};
