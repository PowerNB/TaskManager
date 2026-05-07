import { Api, Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { eloService } from "#root/services/elo.service.js";
import { ELO_TEXTS, ELO_BUTTONS, ELO_CALLBACKS, ELO_PATTERNS } from "./const.js";

const buildKeyboard = (idA: string, idB: string, current: number, total: number): InlineKeyboard =>
    new InlineKeyboard()
        .text(ELO_BUTTONS.FIRST, ELO_CALLBACKS.PICK(idA, idB, current, total))
        .text(ELO_BUTTONS.SECOND, ELO_CALLBACKS.PICK(idB, idA, current, total))
        .row()
        .text(ELO_BUTTONS.SKIP, ELO_CALLBACKS.SKIP(current, total));

const buildText = (titleA: string, titleB: string, current: number, total: number): string =>
    `${ELO_TEXTS.PAIR_PROMPT(current, total)}\n\n1️⃣ ${titleA}\n2️⃣ ${titleB}`;

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

export const startEloSession = async (ctx: BotContext, pairCount: number): Promise<void> => {
    const userId = BigInt(ctx.from!.id);
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
    bot.callbackQuery(ELO_PATTERNS.PICK, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

        const winnerId = ctx.match[1];
        const loserId = ctx.match[2];
        const current = parseInt(ctx.match[3], 10);
        const total = parseInt(ctx.match[4], 10);

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
        const userId = BigInt(ctx.from.id);

        await sendPair(userId, current + 1, total, (text, keyboard) =>
            ctx.reply(text, { reply_markup: keyboard }),
        );
    });
};
