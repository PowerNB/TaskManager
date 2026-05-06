import { session } from "grammy";
import { RedisAdapter } from "@grammyjs/storage-redis";
import { redis } from "#root/infrastructure/redis.js";
import { SessionData } from "#root/types/context.js";

const storage = new RedisAdapter<SessionData>({ instance: redis });

export const sessionMiddleware = session({
    initial: () => ({ scene: null, sceneHistory: [] }),
    storage,
});