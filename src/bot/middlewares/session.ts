import { session } from "grammy";
import { sessionStorage } from "#root/infrastructure/redis.js";

export const sessionMiddleware = session({
    initial: () => ({ scene: null, sceneHistory: [] }),
    storage: sessionStorage,
});