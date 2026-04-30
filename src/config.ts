import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
    BOT_TOKEN: z.string(),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    LOG_LEVEL: z
        .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
        .default("info"),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);
