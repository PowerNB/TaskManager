import { Api, Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { eloService } from "#root/services/elo.service.js";
import { captureService } from "#root/services/capture.service.js";
import { ELO_TEXTS, ELO_BUTTONS, ELO_CALLBACKS, ELO_PATTERNS } from "./const.js";
import { logger } from "#root/logger.js";
import { getWeekBounds } from "#root/utils/time.js";
import { TaskModel } from "#root/types/models.js";

const buildKeyboard = (idA: string, idB: string, current: number, total: number): InlineKeyboard =>
    new InlineKeyboard()
        .text(ELO_BUTTONS.FIRST, ELO_CALLBACKS.PICK(idA, idB, current, total))
        .text(ELO_BUTTONS.SECOND, ELO_CALLBACKS.PICK(idB, idA, current, total))
        .row()
        .text(ELO_BUTTONS.SKIP, ELO_CALLBACKS.SKIP(current, total));

// winner: 0 = first task in pair, 1 = second task in pair
const buildCmdKeyboard = (current: number): InlineKeyboard =>
    new InlineKeyboard()
        .text(ELO_BUTTONS.FIRST, ELO_CALLBACKS.CMD_PICK(current, 0))
        .text(ELO_BUTTONS.SECOND, ELO_CALLBACKS.CMD_PICK(current, 1))
        .row()
        .text(ELO_BUTTONS.SKIP, ELO_CALLBACKS.CMD_SKIP(current));

const buildText = (titleA: string, titleB: string, current: number, total: number): string =>
    `${ELO_TEXTS.PAIR_PROMPT(current, total)}\n\n1️⃣ ${titleA}\n2️⃣ ${titleB}`;

// Standard sendPair — fetches a random pair from all candidates (used in briefs)
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
    const keyboard = buildKeyboard(taskA.id, taskB.id, current, total);
    await send(buildText(taskA.title, taskB.title, current, total), keyboard);
};

// Sends a pair from a preloaded list by index (used in /elo command)
const sendPairFromList = async (
    pairs: Array<[TaskModel, TaskModel]>,
    current: number,
    send: (text: string, keyboard: InlineKeyboard) => Promise<unknown>,
): Promise<void> => {
    if (current >= pairs.length) {
        await send(ELO_TEXTS.PRIORITIES_UPDATED, new InlineKeyboard());
        return;
    }

    const [taskA, taskB] = pairs[current];
    const total = pairs.length;
    const keyboard = buildCmdKeyboard(current);
    await send(buildText(taskA.title, taskB.title, current, total), keyboard);
};

export const startEloSession = async (ctx: BotContext, pairCount: number): Promise<void> => {
    const userId = BigInt(ctx.from!.id);
    logger.debug({ userId: ctx.from!.id, pairCount }, "elo session started");
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

export const registerEloHandler = (bot: Bot<BotContext>) => {
    bot.command("elo", async (ctx) => {
        logger.debug({ userId: ctx.from!.id }, "command /elo");
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
        logger.debug({ userId: ctx.from.id }, "elo: start today session");
        const pairs = await eloService.getTodayPairs(userId);
        if (pairs.length === 0) {
            logger.warn({ userId: ctx.from.id }, "elo: no today tasks, session aborted");
            await ctx.reply(ELO_TEXTS.NO_TASKS_TODAY);
            return;
        }
        ctx.session.eloPairs = pairs.map(([a, b]) => [a.id, b.id] as [string, string]);
        logger.info({ userId: ctx.from.id, pairs: pairs.length }, "elo: today session started");
        await sendPairFromList(pairs, 0, (text, keyboard) => ctx.reply(text, { reply_markup: keyboard }));
    });

    bot.callbackQuery(ELO_CALLBACKS.START_WEEK, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        const userId = BigInt(ctx.from.id);
        logger.debug({ userId: ctx.from.id }, "elo: start week session");
        const { weekStart, weekEnd } = getWeekBounds();
        const pairs = await eloService.getWeekPairs(userId, weekStart, weekEnd);
        if (pairs.length === 0) {
            logger.warn({ userId: ctx.from.id }, "elo: no week tasks, session aborted");
            await ctx.reply(ELO_TEXTS.NO_TASKS_WEEK);
            return;
        }
        ctx.session.eloPairs = pairs.map(([a, b]) => [a.id, b.id] as [string, string]);
        logger.info({ userId: ctx.from.id, pairs: pairs.length }, "elo: week session started");
        await sendPairFromList(pairs, 0, (text, keyboard) => ctx.reply(text, { reply_markup: keyboard }));
    });

    bot.callbackQuery(ELO_PATTERNS.CMD_PICK, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const current = parseInt(ctx.match[1], 10);
        const winnerIndex = parseInt(ctx.match[2], 10) as 0 | 1;

        const storedPairs = ctx.session.eloPairs ?? [];
        const [idA, idB] = storedPairs[current] ?? [];
        if (!idA || !idB) {
            ctx.session.eloPairs = undefined;
            await ctx.reply(ELO_TEXTS.PRIORITIES_UPDATED);
            return;
        }
        const winnerId = winnerIndex === 0 ? idA : idB;
        const loserId = winnerIndex === 0 ? idB : idA;
        logger.info({ userId: ctx.from.id, winnerId, loserId, current }, "elo: cmd pair picked");
        await eloService.applyResult(winnerId, loserId);

        const next = current + 1;
        if (next >= storedPairs.length) {
            ctx.session.eloPairs = undefined;
            await ctx.reply(ELO_TEXTS.PRIORITIES_UPDATED);
            return;
        }

        const [nextIdA, nextIdB] = storedPairs[next];
        const [taskA, taskB] = await Promise.all([
            captureService.getTaskById(nextIdA),
            captureService.getTaskById(nextIdB),
        ]);
        if (!taskA || !taskB) {
            ctx.session.eloPairs = undefined;
            await ctx.reply(ELO_TEXTS.PRIORITIES_UPDATED);
            return;
        }
        await ctx.reply(buildText(taskA.title, taskB.title, next, storedPairs.length), {
            reply_markup: buildCmdKeyboard(next),
        });
    });

    bot.callbackQuery(ELO_PATTERNS.CMD_SKIP, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const current = parseInt(ctx.match[1], 10);
        logger.info({ userId: ctx.from.id, current }, "elo: cmd pair skipped");

        const storedPairs = ctx.session.eloPairs ?? [];
        const next = current + 1;
        if (next >= storedPairs.length) {
            ctx.session.eloPairs = undefined;
            await ctx.reply(ELO_TEXTS.PRIORITIES_UPDATED);
            return;
        }

        const [nextIdA, nextIdB] = storedPairs[next];
        const [taskA, taskB] = await Promise.all([
            captureService.getTaskById(nextIdA),
            captureService.getTaskById(nextIdB),
        ]);
        if (!taskA || !taskB) {
            ctx.session.eloPairs = undefined;
            await ctx.reply(ELO_TEXTS.PRIORITIES_UPDATED);
            return;
        }
        await ctx.reply(buildText(taskA.title, taskB.title, next, storedPairs.length), {
            reply_markup: buildCmdKeyboard(next),
        });
    });

    bot.callbackQuery(ELO_PATTERNS.PICK, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const winnerId = ctx.match[1];
        const loserId = ctx.match[2];
        const current = parseInt(ctx.match[3], 10);
        const total = parseInt(ctx.match[4], 10);

        logger.info({ userId: ctx.from.id, winnerId, loserId, current, total }, "elo: pair picked");
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
        logger.info({ userId: ctx.from.id, current, total }, "elo: pair skipped");
        const userId = BigInt(ctx.from.id);

        await sendPair(userId, current + 1, total, (text, keyboard) =>
            ctx.reply(text, { reply_markup: keyboard }),
        );
    });
};
