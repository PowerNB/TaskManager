export const ELO_TEXTS = {
    PRIORITIES_UPDATED: "✅ Приоритеты обновлены.",
    PAIR_PROMPT: (current: number, total: number) =>
        `Расставим приоритеты.\nЧто важнее прямо сейчас? (${current + 1}/${total})`,
    COMMAND_PROMPT: "Расставить приоритеты — выбери набор задач:",
    NO_TASKS_TODAY: "На сегодня задач с дедлайном нет.",
    NO_TASKS_WEEK: "На этой неделе задач с дедлайном нет.",
    NOT_ENOUGH: "Нужно минимум 2 задачи для сравнения.",
} as const;

export const ELO_BUTTONS = {
    FIRST: "1️⃣ Первая",
    SECOND: "2️⃣ Вторая",
    SKIP: "— Пропустить",
    TODAY: "📅 Задачи на сегодня",
    WEEK: "🗓 Задачи на неделю",
} as const;

export const ELO_CALLBACKS = {
    PICK: (winnerId: string, loserId: string, current: number, total: number) =>
        `elo:pick:${winnerId}:${loserId}:${current}:${total}`,
    SKIP: (current: number, total: number) => `elo:skip:${current}:${total}`,
    CMD_PICK: (current: number, winner: 0 | 1) => `elo:cmd:pick:${current}:${winner}`,
    CMD_SKIP: (current: number) => `elo:cmd:skip:${current}`,
    START_TODAY: "elo:start:today",
    START_WEEK: "elo:start:week",
} as const;

export const ELO_PATTERNS = {
    PICK: /^elo:pick:([^:]+):([^:]+):(\d+):(\d+)$/,
    SKIP: /^elo:skip:(\d+):(\d+)$/,
    CMD_PICK: /^elo:cmd:pick:(\d+):([01])$/,
    CMD_SKIP: /^elo:cmd:skip:(\d+)$/,
} as const;
