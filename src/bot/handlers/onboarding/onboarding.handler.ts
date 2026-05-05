import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { settingsService } from "#root/services/settings.service.js";
import { userRepository } from "#root/repositories/user.repository.js";
import { isTimeInQuietHours } from "#root/utils/time.js";
import {
    ONBOARDING_TEXTS,
    TIMEZONE_PRESETS,
    BRIEF_TIME_PRESETS,
    QUIET_HOURS_PRESETS,
} from "./const.js";
import { sendMainMenu } from "#root/bot/handlers/menu.js";

const isValidTimezone = (value: string): boolean =>
    /^[+-](?:1[0-4]|[0-9])$/.test(value);

const isValidTime = (value: string): boolean =>
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

export const sendSettingsMenu = async (ctx: BotContext) => {
    const userId = BigInt(ctx.from!.id);
    const user = await userRepository.findById(userId);
    if (!user) return;

    const quietHours =
        user.quiet_hours_from && user.quiet_hours_to
            ? `${user.quiet_hours_from} — ${user.quiet_hours_to}`
            : "не настроены";

    ctx.session.scene = null;
    ctx.session.onboarding = undefined;

    await ctx.reply(`⚙️ Настройки`, { reply_markup: new InlineKeyboard().text("🏠 Главное меню", "menu:home") });

    await ctx.reply(
        `🕐 Часовой пояс: ${user.timezone}`,
        { reply_markup: new InlineKeyboard().text("Изменить", "settings:timezone") },
    );

    await ctx.reply(
        `🌅 Утренний бриф: ${user.morning_brief_time}`,
        { reply_markup: new InlineKeyboard().text("Изменить", "settings:brief_time") },
    );

    await ctx.reply(
        `🌙 Тихие часы: ${quietHours}`,
        { reply_markup: new InlineKeyboard().text("Изменить", "settings:quiet_hours") },
    );
};

export const sendTimezoneStep = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard();

    Object.values(TIMEZONE_PRESETS).forEach((tz) =>
        keyboard.text(tz, `onboarding:tz:${tz}`),
    );
    keyboard.text("Другой", "onboarding:tz:other");

    await ctx.reply(ONBOARDING_TEXTS.TIMEZONE_PROMPT, { reply_markup: keyboard });
    ctx.session.scene = "onboarding:timezone";
};

export const sendBriefTimeStep = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard();

    Object.values(BRIEF_TIME_PRESETS).forEach((t) =>
        keyboard.text(t, `onboarding:brief:${t}`),
    );
    keyboard.text("Указать", "onboarding:brief:other");

    await ctx.reply(ONBOARDING_TEXTS.BRIEF_TIME_PROMPT, { reply_markup: keyboard });
    ctx.session.scene = "onboarding:brief_time";
};

export const sendQuietHoursStep = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard();

    Object.values(QUIET_HOURS_PRESETS).forEach(({ label, from, to }) =>
        keyboard.text(label, `onboarding:quiet:${from}:${to}`).row(),
    );
    keyboard.text("Настроить", "onboarding:quiet:custom").row();
    keyboard.text("Пропустить", "onboarding:quiet:skip");

    await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_PROMPT, { reply_markup: keyboard });
    ctx.session.scene = "onboarding:quiet_hours_from";
};

const sendCompletionStep = async (ctx: BotContext) => {
    const draft = ctx.session.onboarding ?? {};
    const timezone = draft.timezone ?? "UTC+3";
    const briefTime = draft.brief_time ?? "09:00";
    const quietFrom = draft.quiet_hours_from;
    const quietTo = draft.quiet_hours_to;

    const quietHoursText =
        quietFrom && quietTo ? `${quietFrom} — ${quietTo}` : "не настроены";

    await ctx.reply(
        `Всё готово!\n\n🕐 Часовой пояс: ${timezone}\n🌅 Утренний бриф: ${briefTime}\n🌙 Тихие часы: ${quietHoursText}\n\nМожешь изменить настройки в любое время через /settings`,
    );

    ctx.session.scene = null;
    ctx.session.onboarding = undefined;

    await sendMainMenu(ctx);
};

export const registerOnboardingHandler = (bot: Bot<BotContext>) => {
    bot.command("start", async (ctx) => {
        const userId = BigInt(ctx.from!.id);
        const user = await userRepository.findById(userId);

        if (user && ctx.session.scene === null) {
            await sendMainMenu(ctx);
            return;
        }

        if (ctx.session.scene?.startsWith("onboarding:")) {
            return;
        }

        await userRepository.upsert(userId, ctx.from!.username ?? null);

        await ctx.reply(ONBOARDING_TEXTS.WELCOME);
        ctx.session.onboarding = {};
        await sendTimezoneStep(ctx);
    });

    bot.callbackQuery(/^onboarding:tz:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const match = ctx.match[1];

        if (match === "other") {
            await ctx.reply(ONBOARDING_TEXTS.TIMEZONE_OTHER_PROMPT);
            return;
        }

        const isEditing = ctx.session.onboarding?.isEditing;
        ctx.session.onboarding = { ...ctx.session.onboarding, timezone: match };
        await settingsService.setTimezone(BigInt(ctx.from.id), match);

        if (isEditing) {
            await sendSettingsMenu(ctx);
            return;
        }
        await sendBriefTimeStep(ctx);
    });

    bot.callbackQuery(/^onboarding:brief:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const match = ctx.match[1];

        if (match === "other") {
            await ctx.reply(ONBOARDING_TEXTS.BRIEF_TIME_OTHER_PROMPT);
            return;
        }

        const isEditing = ctx.session.onboarding?.isEditing;
        ctx.session.onboarding = { ...ctx.session.onboarding, brief_time: match };
        await settingsService.setBriefTime(BigInt(ctx.from.id), match);

        if (isEditing) {
            await sendSettingsMenu(ctx);
            return;
        }
        await sendQuietHoursStep(ctx);
    });

    bot.callbackQuery(/^onboarding:quiet:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const match = ctx.match[1];
        const isEditing = ctx.session.onboarding?.isEditing;

        if (match === "skip") {
            ctx.session.onboarding = {
                ...ctx.session.onboarding,
                quiet_hours_from: null,
                quiet_hours_to: null,
            };
            await settingsService.setQuietHours(BigInt(ctx.from.id), null, null);
            if (isEditing) { await sendSettingsMenu(ctx); return; }
            await sendCompletionStep(ctx);
            return;
        }

        if (match === "custom") {
            ctx.session.scene = "onboarding:quiet_hours_from";
            await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_FROM_PROMPT);
            return;
        }

        const parts = match.split(":");
        const from = `${parts[0]}:${parts[1]}`;
        const to = `${parts[2]}:${parts[3]}`;

        ctx.session.onboarding = {
            ...ctx.session.onboarding,
            quiet_hours_from: from,
            quiet_hours_to: to,
        };
        await settingsService.setQuietHours(BigInt(ctx.from.id), from, to);
        if (isEditing) { await sendSettingsMenu(ctx); return; }
        await sendCompletionStep(ctx);
    });

    bot.on("message:text", async (ctx, next) => {
        const scene = ctx.session.scene;

        if (scene === "onboarding:timezone") {
            const value = ctx.message.text.trim();

            if (!isValidTimezone(value)) {
                await ctx.reply(ONBOARDING_TEXTS.TIMEZONE_INVALID);
                return;
            }

            const isEditing = ctx.session.onboarding?.isEditing;
            const timezone = `UTC${value}`;
            ctx.session.onboarding = { ...ctx.session.onboarding, timezone };
            await settingsService.setTimezone(BigInt(ctx.from.id), timezone);
            if (isEditing) { await sendSettingsMenu(ctx); return; }
            await sendBriefTimeStep(ctx);
            return;
        }

        if (scene === "onboarding:brief_time") {
            const value = ctx.message.text.trim();

            if (!isValidTime(value)) {
                await ctx.reply(ONBOARDING_TEXTS.BRIEF_TIME_INVALID);
                return;
            }

            const quietFrom = ctx.session.onboarding?.quiet_hours_from;
            const quietTo = ctx.session.onboarding?.quiet_hours_to;

            if (quietFrom && quietTo && isTimeInQuietHours(value, quietFrom, quietTo)) {
                await ctx.reply(ONBOARDING_TEXTS.BRIEF_TIME_IN_QUIET_HOURS);
                return;
            }

            const isEditing = ctx.session.onboarding?.isEditing;
            ctx.session.onboarding = { ...ctx.session.onboarding, brief_time: value };
            await settingsService.setBriefTime(BigInt(ctx.from.id), value);
            if (isEditing) { await sendSettingsMenu(ctx); return; }
            await sendQuietHoursStep(ctx);
            return;
        }

        if (scene === "onboarding:quiet_hours_from") {
            const value = ctx.message.text.trim();

            if (!isValidTime(value)) {
                await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_INVALID);
                return;
            }

            ctx.session.onboarding = { ...ctx.session.onboarding, quiet_hours_from: value };
            ctx.session.scene = "onboarding:quiet_hours_to";
            await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_TO_PROMPT);
            return;
        }

        if (scene === "onboarding:quiet_hours_to") {
            const value = ctx.message.text.trim();

            if (!isValidTime(value)) {
                await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_INVALID);
                return;
            }

            const isEditing = ctx.session.onboarding?.isEditing;
            const from = ctx.session.onboarding?.quiet_hours_from ?? null;
            ctx.session.onboarding = { ...ctx.session.onboarding, quiet_hours_to: value };
            await settingsService.setQuietHours(BigInt(ctx.from.id), from, value);
            if (isEditing) { await sendSettingsMenu(ctx); return; }
            await sendCompletionStep(ctx);
            return;
        }

        return next();
    });
};
