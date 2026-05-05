import { Queue } from "bullmq";
import { bullRedis } from "./redis.js";

export const morningBriefQueue = new Queue("morning-brief", {
    connection: bullRedis,
});

export const saturdayBriefQueue = new Queue("saturday-brief", {
    connection: bullRedis,
});

export const notificationsQueue = new Queue("notifications", {
    connection: bullRedis,
});
