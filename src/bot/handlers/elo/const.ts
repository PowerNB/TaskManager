export const ELO_TEXTS = {
    PRIORITIES_UPDATED: "✅ Приоритеты обновлены.",
    PAIR_PROMPT: (current: number, total: number) =>
        `Расставим приоритеты.\nЧто важнее прямо сейчас? (${current + 1}/${total})`,
} as const;

export const ELO_BUTTONS = {
    FIRST: "1️⃣ Первая",
    SECOND: "2️⃣ Вторая",
    SKIP: "— Пропустить",
} as const;

export const ELO_CALLBACKS = {
    PICK: (winnerId: string, loserId: string, current: number, total: number) =>
        `elo:pick:${winnerId}:${loserId}:${current}:${total}`,
    SKIP: (current: number, total: number) => `elo:skip:${current}:${total}`,
} as const;

export const ELO_PATTERNS = {
    PICK: /^elo:pick:([^:]+):([^:]+):(\d+):(\d+)$/,
    SKIP: /^elo:skip:(\d+):(\d+)$/,
} as const;
