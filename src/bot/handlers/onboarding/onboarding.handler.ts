import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "#root/types/context.js";
import { settingsService } from "#root/services/settings.service.js";
import { isTimeInQuietHours, isValidTime, isValidTimezone } from "#root/utils/time.js";
import { logger } from "#root/logger.js";
import {
    ONBOARDING_TEXTS,
    ONBOARDING_BUTTONS,
    ONBOARDING_CALLBACKS,
    ONBOARDING_PATTERNS,
    ONBOARDING_SCENES,
    ONBOARDING_PRESET_VALUES,
    TIMEZONE_PRESETS,
    BRIEF_TIME_PRESETS,
    QUIET_HOURS_PRESETS,
} from "./const.js";
import { sendMainMenu } from "#root/bot/handlers/menu/menu.js";

export const sendSettingsMenu = async (ctx: BotContext) => {
    const userId = BigInt(ctx.from!.id);
    const user = await settingsService.findUser(userId);
    if (!user) return;

    const quietHours =
        user.quiet_hours_from && user.quiet_hours_to
            ? ONBOARDING_TEXTS.SETTINGS_QUIET_HOURS_RANGE(user.quiet_hours_from, user.quiet_hours_to)
            : ONBOARDING_TEXTS.QUIET_HOURS_NOT_SET;

    ctx.session.scene = null;
    ctx.session.onboarding = undefined;

    await ctx.reply(ONBOARDING_TEXTS.SETTINGS_HEADER, {
        reply_markup: new InlineKeyboard().text(ONBOARDING_BUTTONS.SETTINGS_HOME, ONBOARDING_CALLBACKS.MENU_HOME),
    });
    await ctx.reply(ONBOARDING_TEXTS.SETTINGS_TIMEZONE(user.timezone), {
        reply_markup: new InlineKeyboard().text(ONBOARDING_BUTTONS.SETTINGS_CHANGE, ONBOARDING_CALLBACKS.SETTINGS_TIMEZONE),
    });
    await ctx.reply(ONBOARDING_TEXTS.SETTINGS_BRIEF_TIME(user.morning_brief_time), {
        reply_markup: new InlineKeyboard().text(ONBOARDING_BUTTONS.SETTINGS_CHANGE, ONBOARDING_CALLBACKS.SETTINGS_BRIEF_TIME),
    });
    await ctx.reply(ONBOARDING_TEXTS.SETTINGS_QUIET_HOURS(quietHours), {
        reply_markup: new InlineKeyboard().text(ONBOARDING_BUTTONS.SETTINGS_CHANGE, ONBOARDING_CALLBACKS.SETTINGS_QUIET_HOURS),
    });
};

export const sendTimezoneStep = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard();
    Object.values(TIMEZONE_PRESETS).forEach((tz) => keyboard.text(tz, ONBOARDING_CALLBACKS.TZ_VALUE(tz)));
    keyboard.text(ONBOARDING_BUTTONS.TIMEZONE_OTHER, ONBOARDING_CALLBACKS.TZ_OTHER);

    await ctx.reply(ONBOARDING_TEXTS.TIMEZONE_PROMPT, { reply_markup: keyboard });
    ctx.session.scene = ONBOARDING_SCENES.TIMEZONE;
};

export const sendBriefTimeStep = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard();
    Object.values(BRIEF_TIME_PRESETS).forEach((t) => keyboard.text(t, ONBOARDING_CALLBACKS.BRIEF_VALUE(t)));
    keyboard.text(ONBOARDING_BUTTONS.BRIEF_TIME_OTHER, ONBOARDING_CALLBACKS.BRIEF_OTHER);

    await ctx.reply(ONBOARDING_TEXTS.BRIEF_TIME_PROMPT, { reply_markup: keyboard });
    ctx.session.scene = ONBOARDING_SCENES.BRIEF_TIME;
};

export const sendQuietHoursStep = async (ctx: BotContext) => {
    const keyboard = new InlineKeyboard();
    Object.values(QUIET_HOURS_PRESETS).forEach(({ label, from, to }) =>
        keyboard.text(label, ONBOARDING_CALLBACKS.QUIET_VALUE(from, to)).row(),
    );
    keyboard.text(ONBOARDING_BUTTONS.QUIET_HOURS_CUSTOM, ONBOARDING_CALLBACKS.QUIET_CUSTOM).row();
    keyboard.text(ONBOARDING_BUTTONS.QUIET_HOURS_SKIP, ONBOARDING_CALLBACKS.QUIET_SKIP);

    await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_PROMPT, { reply_markup: keyboard });
    ctx.session.scene = ONBOARDING_SCENES.QUIET_HOURS_FROM;
};

const sendCompletionStep = async (ctx: BotContext) => {
    const draft = ctx.session.onboarding ?? {};
    const timezone = draft.timezone ?? "UTC+3";
    const briefTime = draft.brief_time ?? "09:00";
    const quietFrom = draft.quiet_hours_from;
    const quietTo = draft.quiet_hours_to;

    const quietHoursText = quietFrom && quietTo
        ? ONBOARDING_TEXTS.SETTINGS_QUIET_HOURS_RANGE(quietFrom, quietTo)
        : ONBOARDING_TEXTS.QUIET_HOURS_NOT_SET;

    await ctx.reply(ONBOARDING_TEXTS.COMPLETION(timezone, briefTime, quietHoursText));

    ctx.session.scene = null;
    ctx.session.onboarding = undefined;

    await sendMainMenu(ctx);
};

export const registerOnboardingHandler = (bot: Bot<BotContext>) => {
    bot.command("start", async (ctx) => {
        const userId = BigInt(ctx.from!.id);
        const user = await settingsService.findUser(userId);

        if (user && ctx.session.scene === null) {
            logger.debug({ userId: ctx.from!.id }, "command /start: existing user");
            await sendMainMenu(ctx);
            return;
        }

        if (ctx.session.scene?.startsWith(ONBOARDING_CALLBACKS.TZ_PREFIX.split(":")[0] + ":onboarding")) {
            return;
        }

        if (ctx.session.scene?.startsWith("onboarding:")) {
            return;
        }

        await settingsService.ensureUser(userId, ctx.from!.username ?? null);
        logger.info({ userId: ctx.from!.id }, "onboarding: started");
        await ctx.reply(ONBOARDING_TEXTS.WELCOME);
        ctx.session.onboarding = {};
        await sendTimezoneStep(ctx);
    });

    bot.callbackQuery(ONBOARDING_PATTERNS.TZ, async (ctx) => {
        await ctx.answerCallbackQuery();
        const match = ctx.match[1];

        if (match === ONBOARDING_PRESET_VALUES.OTHER) {
            await ctx.reply(ONBOARDING_TEXTS.TIMEZONE_OTHER_PROMPT);
            return;
        }

        const isEditing = ctx.session.onboarding?.isEditing;
        ctx.session.onboarding = { ...ctx.session.onboarding, timezone: match };
        await settingsService.setTimezone(BigInt(ctx.from.id), match);
        logger.info({ userId: ctx.from.id, timezone: match }, "onboarding: timezone set");

        if (isEditing) { await sendSettingsMenu(ctx); return; }
        await sendBriefTimeStep(ctx);
    });

    bot.callbackQuery(ONBOARDING_PATTERNS.BRIEF, async (ctx) => {
        await ctx.answerCallbackQuery();
        const match = ctx.match[1];

        if (match === ONBOARDING_PRESET_VALUES.OTHER) {
            await ctx.reply(ONBOARDING_TEXTS.BRIEF_TIME_OTHER_PROMPT);
            return;
        }

        const isEditing = ctx.session.onboarding?.isEditing;
        ctx.session.onboarding = { ...ctx.session.onboarding, brief_time: match };
        await settingsService.setBriefTime(BigInt(ctx.from.id), match);
        logger.info({ userId: ctx.from.id, briefTime: match }, "onboarding: brief time set");

        if (isEditing) { await sendSettingsMenu(ctx); return; }
        await sendQuietHoursStep(ctx);
    });

    bot.callbackQuery(ONBOARDING_PATTERNS.QUIET, async (ctx) => {
        await ctx.answerCallbackQuery();
        const match = ctx.match[1];
        const isEditing = ctx.session.onboarding?.isEditing;

        if (match === ONBOARDING_PRESET_VALUES.SKIP) {
            ctx.session.onboarding = { ...ctx.session.onboarding, quiet_hours_from: null, quiet_hours_to: null };
            await settingsService.setQuietHours(BigInt(ctx.from.id), null, null);
            logger.info({ userId: ctx.from.id }, "onboarding: quiet hours skipped");
            if (isEditing) { await sendSettingsMenu(ctx); return; }
            await sendCompletionStep(ctx);
            return;
        }

        if (match === ONBOARDING_PRESET_VALUES.CUSTOM) {
            ctx.session.scene = ONBOARDING_SCENES.QUIET_HOURS_FROM;
            await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_FROM_PROMPT);
            return;
        }

        const parts = match.split(":");
        const from = `${parts[0]}:${parts[1]}`;
        const to = `${parts[2]}:${parts[3]}`;

        ctx.session.onboarding = { ...ctx.session.onboarding, quiet_hours_from: from, quiet_hours_to: to };
        await settingsService.setQuietHours(BigInt(ctx.from.id), from, to);
        logger.info({ userId: ctx.from.id, from, to }, "onboarding: quiet hours set");
        if (isEditing) { await sendSettingsMenu(ctx); return; }
        await sendCompletionStep(ctx);
    });

    bot.on("message:text", async (ctx, next) => {
        const scene = ctx.session.scene;

        if (scene === ONBOARDING_SCENES.TIMEZONE) {
            const value = ctx.message.text.trim();
            if (!isValidTimezone(value)) {
                await ctx.reply(ONBOARDING_TEXTS.TIMEZONE_INVALID);
                return;
            }
            const isEditing = ctx.session.onboarding?.isEditing;
            const timezone = ONBOARDING_TEXTS.TIMEZONE_FORMAT(value);

            ctx.session.onboarding = { ...ctx.session.onboarding, timezone };

            await settingsService.setTimezone(BigInt(ctx.from.id), timezone);

            if (isEditing) { await sendSettingsMenu(ctx); return; }

            await sendBriefTimeStep(ctx);
            return;
        }

        if (scene === ONBOARDING_SCENES.BRIEF_TIME) {
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

        if (scene === ONBOARDING_SCENES.QUIET_HOURS_FROM) {
            const value = ctx.message.text.trim();
            if (!isValidTime(value)) {
                await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_INVALID);
                return;
            }
            ctx.session.onboarding = { ...ctx.session.onboarding, quiet_hours_from: value };
            ctx.session.scene = ONBOARDING_SCENES.QUIET_HOURS_TO;
            await ctx.reply(ONBOARDING_TEXTS.QUIET_HOURS_TO_PROMPT);
            return;
        }

        if (scene === ONBOARDING_SCENES.QUIET_HOURS_TO) {
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
