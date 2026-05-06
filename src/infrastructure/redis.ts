import { Redis } from "ioredis";
import { RedisAdapter } from "@grammyjs/storage-redis";
import { config } from "#root/config.js";

export const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
});

export const bullRedis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
});

redis.on("error", (err: Error) => console.error("[Redis] error:", err));
redis.on("ready", () => console.log("[Redis] ready"));

bullRedis.on("error", (err: Error) => console.error("[BullRedis] error:", err));
bullRedis.on("ready", () => console.log("[BullRedis] ready"));

export const sessionStorage = new RedisAdapter({ instance: redis });
