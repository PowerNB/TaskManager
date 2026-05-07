import { Bot } from "grammy";
import { config } from "#root/config.js";
import { BotContext } from "#root/types/context.js";
import { sessionMiddleware } from "#root/bot/middlewares/session.js";
import { authMiddleware } from "#root/bot/middlewares/auth.js";
import { registerOnboardingHandler } from "#root/bot/handlers/onboarding/onboarding.handler.js";
import { registerCaptureHandler } from "#root/bot/handlers/capture/capture.handler.js";
import { registerNotificationsHandler } from "#root/bot/handlers/notifications/notifications.handler.js";
import { registerMorningBriefHandler } from "#root/bot/handlers/morning-brief/morning-brief.handler.js";
import { registerSaturdayBriefHandler } from "#root/bot/handlers/saturday-brief/saturday-brief.handler.js";
import { registerSettingsHandler } from "#root/bot/handlers/settings/settings.handler.js";
import { registerEloHandler } from "#root/bot/handlers/elo/elo.handler.js";

export const bot = new Bot<BotContext>(config.BOT_TOKEN);

bot.use(sessionMiddleware);
bot.use(authMiddleware);

registerOnboardingHandler(bot);
registerCaptureHandler(bot);
registerNotificationsHandler(bot);
registerMorningBriefHandler(bot);
registerSaturdayBriefHandler(bot);
registerSettingsHandler(bot);
registerEloHandler(bot);
