import { BotContext } from "#root/types/context.js";
import { Scene } from "#root/types/context.js";

export const pushScene = (ctx: BotContext, next: Scene) => {
    if (!ctx.session.sceneHistory) ctx.session.sceneHistory = [];
    ctx.session.sceneHistory.push(ctx.session.scene);
    ctx.session.scene = next;
};

export const popScene = (ctx: BotContext): Scene => {
    if (!ctx.session.sceneHistory) ctx.session.sceneHistory = [];
    const prev = ctx.session.sceneHistory.pop() ?? null;
    ctx.session.scene = prev;
    return prev;
};

export const clearHistory = (ctx: BotContext) => {
    ctx.session.sceneHistory = [];
};
