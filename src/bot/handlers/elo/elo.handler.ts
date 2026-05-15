import { Api, Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { eloService } from "#root/services/elo.service.js";
import { captureService } from "#root/services/capture.service.js";
import { ELO_TEXTS, ELO_BUTTONS, ELO_CALLBACKS, ELO_PATTERNS, ELO_LOG } from "./const.js";
import { logger } from "#root/logger.js";
import { getWeekBounds } from "#root/utils/time.js";
import { buildProgressBar } from "#root/utils/progress.js";
import { TaskModel } from "#root/types/models.js";

// --- Brief mode (random pairs, no session) ---

const buildKeyboard = (idA: string, idB: string, current: number, total: number): InlineKeyboard =>
    new InlineKeyboard()
        .text(ELO_BUTTONS.FIRST, ELO_CALLBACKS.PICK(idA, idB, current, total))
        .text(ELO_BUTTONS.SECOND, ELO_CALLBACKS.PICK(idB, idA, current, total))
        .row()
        .text(ELO_BUTTONS.SKIP, ELO_CALLBACKS.SKIP(current, total));

const buildBriefText = (titleA: string, titleB: string, current: number, total: number): string =>
    `${ELO_TEXTS.PAIR_PROMPT(current + 1, total, 1, 1, buildProgressBar(current, total))}\n\n${ELO_TEXTS.PAIR_TASKS(titleA, titleB)}`;

const sendPair = async (
    userId: bigint,
    current: number,
    total: number,
    send: (text: string, keyboard: InlineKeyboard) => Promise<unknown>,
): Promise<void> => {
    if (current >= total) {
        await send(ELO_TEXTS.PRIORITIES_UPDATED, new InlineKeyboard());
        return;
    }

    const pairs = await eloService.getPairs(userId, 1);
    if (pairs.length === 0) {
        await send(ELO_TEXTS.PRIORITIES_UPDATED, new InlineKeyboard());
        return;
    }

    const [taskA, taskB] = pairs[0];
    await send(buildBriefText(taskA.title, taskB.title, current, total), buildKeyboard(taskA.id, taskB.id, current, total));
};

export const startEloSession = async (ctx: BotContext, pairCount: number): Promise<void> => {
    const userId = BigInt(ctx.from!.id);
    logger.debug({ userId: ctx.from!.id, pairCount }, ELO_LOG.SESSION_STARTED_BRIEF);
    await sendPair(userId, 0, pairCount, (text, keyboard) =>
        ctx.reply(text, { reply_markup: keyboard }),
    );
};

export const startEloSessionFromJob = async (
    api: Api,
    chatId: number,
    userId: bigint,
    pairCount: number,
): Promise<void> => {
    await sendPair(userId, 0, pairCount, (text, keyboard) =>
        api.sendMessage(chatId, text, { reply_markup: keyboard }),
    );
};

// --- Swiss mode (/elo command) ---

const buildCmdKeyboard = (current: number): InlineKeyboard =>
    new InlineKeyboard()
        .text(ELO_BUTTONS.FIRST, ELO_CALLBACKS.CMD_PICK(current, 0))
        .text(ELO_BUTTONS.SECOND, ELO_CALLBACKS.CMD_PICK(current, 1))
        .row()
        .text(ELO_BUTTONS.SKIP, ELO_CALLBACKS.CMD_SKIP(current));

const buildCmdText = (
    titleA: string,
    titleB: string,
    pairIndex: number,
    totalPairs: number,
    round: number,
    totalRounds: number,
): string => {
    const donePairs = (round - 1) * totalPairs + pairIndex;
    const allPairs = totalRounds * totalPairs;
    return `${ELO_TEXTS.PAIR_PROMPT(pairIndex + 1, totalPairs, round, totalRounds, buildProgressBar(donePairs, allPairs))}\n\n${ELO_TEXTS.PAIR_TASKS(titleA, titleB)}`;
};

const startSwissSession = async (
    ctx: BotContext,
    fetchTasks: () => Promise<TaskModel[]>,
    userId: bigint,
    noTasksText: string,
): Promise<void> => {
    const session = await eloService.buildSwissSession(userId, fetchTasks);
    if (!session) {
        logger.warn({ userId: userId.toString() }, ELO_LOG.NOT_ENOUGH_TASKS);
        await ctx.editMessageText(noTasksText);
        return;
    }

    ctx.session.eloSession = session;
    logger.info({ userId: userId.toString(), tasks: session.taskIds.length, totalRounds: session.totalRounds }, ELO_LOG.SESSION_STARTED);

    const [idA, idB] = session.pairs[0];
    const [taskA, taskB] = await Promise.all([
        captureService.getTaskById(idA),
        captureService.getTaskById(idB),
    ]);
    if (!taskA || !taskB) {
        ctx.session.eloSession = undefined;
        await ctx.editMessageText(ELO_TEXTS.PRIORITIES_UPDATED);
        return;
    }

    await ctx.editMessageText(
        buildCmdText(taskA.title, taskB.title, 0, session.pairs.length, session.round, session.totalRounds),
        { reply_markup: buildCmdKeyboard(0) },
    );
};

const advanceSwiss = async (ctx: BotContext, nextPairIndex: number): Promise<void> => {
    const session = ctx.session.eloSession;
    if (!session) {
        await ctx.editMessageText(ELO_TEXTS.PRIORITIES_UPDATED, { reply_markup: new InlineKeyboard() });
        return;
    }

    // More pairs in current round
    if (nextPairIndex < session.pairs.length) {
        const [idA, idB] = session.pairs[nextPairIndex];
        const [taskA, taskB] = await Promise.all([
            captureService.getTaskById(idA),
            captureService.getTaskById(idB),
        ]);
        if (!taskA || !taskB) {
            ctx.session.eloSession = undefined;
            await ctx.editMessageText(ELO_TEXTS.PRIORITIES_UPDATED, { reply_markup: new InlineKeyboard() });
            return;
        }
        await ctx.editMessageText(
            buildCmdText(taskA.title, taskB.title, nextPairIndex, session.pairs.length, session.round, session.totalRounds),
            { reply_markup: buildCmdKeyboard(nextPairIndex) },
        );
        return;
    }

    // Round finished — session complete
    if (session.round >= session.totalRounds) {
        ctx.session.eloSession = undefined;
        logger.info({ round: session.round, totalRounds: session.totalRounds }, ELO_LOG.SESSION_COMPLETE);
        await ctx.editMessageText(ELO_TEXTS.PRIORITIES_UPDATED, { reply_markup: new InlineKeyboard() });
        return;
    }

    // Build next round
    const nextRound = session.round + 1;
    const nextPairs = await eloService.buildNextRound(session.taskIds);
    if (nextPairs.length === 0) {
        ctx.session.eloSession = undefined;
        await ctx.editMessageText(ELO_TEXTS.PRIORITIES_UPDATED, { reply_markup: new InlineKeyboard() });
        return;
    }

    ctx.session.eloSession = { ...session, pairs: nextPairs, round: nextRound };
    logger.info({ round: nextRound, pairs: nextPairs.length }, ELO_LOG.NEXT_ROUND_BUILT);

    const [idA, idB] = nextPairs[0];
    const [taskA, taskB] = await Promise.all([
        captureService.getTaskById(idA),
        captureService.getTaskById(idB),
    ]);
    if (!taskA || !taskB) {
        ctx.session.eloSession = undefined;
        await ctx.editMessageText(ELO_TEXTS.PRIORITIES_UPDATED, { reply_markup: new InlineKeyboard() });
        return;
    }
    await ctx.editMessageText(
        buildCmdText(taskA.title, taskB.title, 0, nextPairs.length, nextRound, session.totalRounds),
        { reply_markup: buildCmdKeyboard(0) },
    );
};

export const registerEloHandler = (bot: Bot<BotContext>) => {
    bot.command("elo", async (ctx) => {
        logger.debug({ userId: ctx.from!.id }, ELO_LOG.CMD_ELO);
        const keyboard = new InlineKeyboard()
            .text(ELO_BUTTONS.TODAY, ELO_CALLBACKS.START_TODAY)
            .row()
            .text(ELO_BUTTONS.WEEK, ELO_CALLBACKS.START_WEEK);
        await ctx.reply(ELO_TEXTS.COMMAND_PROMPT, { reply_markup: keyboard });
    });

    bot.callbackQuery(ELO_CALLBACKS.START_TODAY, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, ELO_LOG.START_TODAY);
        await startSwissSession(
            ctx,
            () => eloService.getTodayTasks(userId),
            userId,
            ELO_TEXTS.NO_TASKS_TODAY,
        );
    });

    bot.callbackQuery(ELO_CALLBACKS.START_WEEK, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, ELO_LOG.START_WEEK);
        const { weekStart, weekEnd } = getWeekBounds();
        await startSwissSession(
            ctx,
            () => eloService.getWeekTasks(userId, weekStart, weekEnd),
            userId,
            ELO_TEXTS.NO_TASKS_WEEK,
        );
    });

    bot.callbackQuery(ELO_PATTERNS.CMD_PICK, async (ctx) => {
        await ctx.answerCallbackQuery();

        const current = parseInt(ctx.match[1], 10);
        const winnerIndex = parseInt(ctx.match[2], 10) as 0 | 1;

        const session = ctx.session.eloSession;
        const [idA, idB] = session?.pairs[current] ?? [];
        if (!idA || !idB) {
            ctx.session.eloSession = undefined;
            await ctx.reply(ELO_TEXTS.PRIORITIES_UPDATED);
            return;
        }

        const winnerId = winnerIndex === 0 ? idA : idB;
        const loserId = winnerIndex === 0 ? idB : idA;
        logger.info({ userId: ctx.from.id, winnerId, loserId, current, round: session?.round }, ELO_LOG.CMD_PAIR_PICKED);
        await eloService.applyResult(winnerId, loserId);

        await advanceSwiss(ctx, current + 1);
    });

    bot.callbackQuery(ELO_PATTERNS.CMD_SKIP, async (ctx) => {
        await ctx.answerCallbackQuery();

        const current = parseInt(ctx.match[1], 10);
        logger.info({ userId: ctx.from.id, current, round: ctx.session.eloSession?.round }, ELO_LOG.CMD_PAIR_SKIPPED);

        await advanceSwiss(ctx, current + 1);
    });

    // Brief mode handlers (unchanged)
    bot.callbackQuery(ELO_PATTERNS.PICK, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const winnerId = ctx.match[1];
        const loserId = ctx.match[2];
        const current = parseInt(ctx.match[3], 10);
        const total = parseInt(ctx.match[4], 10);

        logger.info({ userId: ctx.from.id, winnerId, loserId, current, total }, ELO_LOG.PAIR_PICKED);
        await eloService.applyResult(winnerId, loserId);

        const userId = BigInt(ctx.from.id);
        await sendPair(userId, current + 1, total, (text, keyboard) =>
            ctx.reply(text, { reply_markup: keyboard }),
        );
    });

    bot.callbackQuery(ELO_PATTERNS.SKIP, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const current = parseInt(ctx.match[1], 10);
        const total = parseInt(ctx.match[2], 10);
        logger.info({ userId: ctx.from.id, current, total }, ELO_LOG.PAIR_SKIPPED);
        const userId = BigInt(ctx.from.id);

        await sendPair(userId, current + 1, total, (text, keyboard) =>
            ctx.reply(text, { reply_markup: keyboard }),
        );
    });
};
