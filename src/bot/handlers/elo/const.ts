const ELO_ICONS = {
    FIRST: "1️⃣",
    SECOND: "2️⃣",
    DONE: "✅",
    TODAY: "📅",
    WEEK: "🗓",
} as const;

export const ELO_TEXTS = {
    PRIORITIES_UPDATED: `${ELO_ICONS.DONE} Приоритеты обновлены.`,
    PAIR_PROMPT: (pairNum: number, totalPairs: number, round: number, totalRounds: number, progressBar: string) =>
        `Раунд ${round}/${totalRounds} · Пара ${pairNum}/${totalPairs}\n${progressBar}\nЧто важнее прямо сейчас?`,
    COMMAND_PROMPT: "Расставить приоритеты — выбери набор задач:",
    NO_TASKS_TODAY: "На сегодня задач без времени нет.",
    NO_TASKS_WEEK: "На этой неделе задач нет.",
    NOT_ENOUGH: "Нужно минимум 2 задачи для сравнения.",
    PAIR_TASKS: (titleA: string, titleB: string) => `${ELO_ICONS.FIRST} ${titleA}\n${ELO_ICONS.SECOND} ${titleB}`,
} as const;

export const ELO_BUTTONS = {
    FIRST: `${ELO_ICONS.FIRST} Первая`,
    SECOND: `${ELO_ICONS.SECOND} Вторая`,
    SKIP: "— Пропустить",
    TODAY: `${ELO_ICONS.TODAY} Задачи на сегодня`,
    WEEK: `${ELO_ICONS.WEEK} Задачи на неделю`,
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

export const ELO_LOG = {
    CMD_ELO: "command /elo",
    START_TODAY: "elo: start today session",
    START_WEEK: "elo: start week session",
    NOT_ENOUGH_TASKS: "elo: not enough tasks for swiss session",
    SESSION_STARTED: "elo: swiss session started",
    SESSION_COMPLETE: "elo: swiss session complete",
    NEXT_ROUND_BUILT: "elo: next swiss round built",
    CMD_PAIR_PICKED: "elo: cmd pair picked",
    CMD_PAIR_SKIPPED: "elo: cmd pair skipped",
    PAIR_PICKED: "elo: pair picked",
    PAIR_SKIPPED: "elo: pair skipped",
    SESSION_STARTED_BRIEF: "elo session started",
} as const;

export const ELO_PATTERNS = {
    PICK: /^elo:pick:([^:]+):([^:]+):(\d+):(\d+)$/,
    SKIP: /^elo:skip:(\d+):(\d+)$/,
    CMD_PICK: /^elo:cmd:pick:(\d+):([01])$/,
    CMD_SKIP: /^elo:cmd:skip:(\d+)$/,
} as const;
