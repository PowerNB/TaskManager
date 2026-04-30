import { config } from "#root/config.js";
import { run, RunnerHandle } from "@grammyjs/runner";
import { bot } from "#root/bot/index.js";
import { logger } from "#root/logger.js";

function onShutdown(cleanUp: () => Promise<void>) {
    let isShuttingDown = false;

    const handleShutdown = async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        await cleanUp();
    };

    process.on("SIGINT", handleShutdown);
    process.on("SIGTERM", handleShutdown);
}

try {
    let runner: RunnerHandle | undefined;

    onShutdown(async () => {
        logger.info("Shutting down...");
        await runner?.stop();
        await bot.stop();
    });

    if (config.NODE_ENV === "production") {
        runner = run(bot);
        logger.info({ msg: "Bot running", username: bot.botInfo.username });
    } else {
        await bot.start({
            onStart: ({ username }) => logger.info({ msg: "Bot running", username }),
        });
    }
} catch (error) {
    logger.error(error);
    process.exit(1);
}
