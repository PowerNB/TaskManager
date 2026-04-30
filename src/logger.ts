import pino from "pino";
import { config } from "#root/config.js";

let transport: pino.TransportSingleOptions | undefined;

if (config.NODE_ENV !== "production") {
    transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    };
}

export const logger = pino({
    level: config.LOG_LEVEL,
    transport,
});

export type Logger = typeof logger;
