import { Api, Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { eloService } from "#root/services/elo.service.js";

const buildKeyboard = (idA: string, idB: string, current: number, total: number): InlineKeyboard =>
    new InlineKeyboard()
        .text("1️⃣ Первая", `elo:pick:${idA}:${idB}:${current}:${total}`)
        .text("2️⃣ Вторая", `elo:pick:${idB}:${idA}:${current}:${total}`)
        .row()
        .text("— Пропустить", `elo:skip:${current}:${total}`);

const buildText = (titleA: string, titleB: string, current: number, total: number): string =>
    `Расставим приоритеты.\nЧто важнее прямо сейчас? (${current + 1}/${total})\n\n1️⃣ ${titleA}\n2️⃣ ${titleB}`;

// Fetches a fresh random pair for the given user and sends it.
// Stateless — pairs are generated on the fly each step.
const sendPair = async (
    userId: bigint,
    current: number,
    total: number,
    send: (text: string, keyboard: InlineKeyboard) => Promise<unknown>,
): Promise<void> => {
    if (current >= total) {
        await send("✅ Приоритеты обновлены.", new InlineKeyboard());
        return;
    }

    const pairs = await eloService.getPairs(userId, 1);
    if (pairs.length === 0) {
        await send("✅ Приоритеты обновлены.", new InlineKeyboard());
        return;
    }

    const [taskA, taskB] = pairs[0];
    const keyboard = buildKeyboard(taskA.id, taskB.id, current, total);
    await send(buildText(taskA.title, taskB.title, current, total), keyboard);
};

// Entry point from ctx (morning brief handler).
export const startEloSession = async (ctx: BotContext, pairCount: number): Promise<void> => {
    const userId = BigInt(ctx.from!.id);
    await sendPair(userId, 0, pairCount, (text, keyboard) =>
        ctx.reply(text, { reply_markup: keyboard }),
    );
};

// Entry point from job (saturday brief job) — uses bot.api directly.
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
    // elo:pick:winnerId:loserId:currentIndex:total
    bot.callbackQuery(/^elo:pick:([^:]+):([^:]+):(\d+):(\d+)$/, async (ctx) => {
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

    // elo:skip:currentIndex:total
    bot.callbackQuery(/^elo:skip:(\d+):(\d+)$/, async (ctx) => {
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
