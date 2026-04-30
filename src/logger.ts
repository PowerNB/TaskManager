import "dotenv/config";
import pino from "pino";

let transport: pino.TransportSingleOptions | undefined;

if (process.env.NODE_ENV !== "production") {
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
    level: process.env.LOG_LEVEL ?? "info",
    transport,
});

export type Logger = typeof logger;
