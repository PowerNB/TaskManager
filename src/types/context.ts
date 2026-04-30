import { Context, SessionFlavor } from "grammy";

export interface SessionData {
    scene: string | null;
    actions: string[];
}

export type BotContext = Context & SessionFlavor<SessionData>;
