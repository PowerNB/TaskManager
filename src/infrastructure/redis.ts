import "dotenv/config";
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
});

export const bullRedis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
});

redis.on("error", (err) => console.error("[Redis] error:", err));
redis.on("ready", () => console.log("[Redis] ready"));

bullRedis.on("error", (err) => console.error("[BullRedis] error:", err));
bullRedis.on("ready", () => console.log("[BullRedis] ready"));
