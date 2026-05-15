export const FREE_TIME_PRESETS = {
    HOUR_1: { label: "1 час", minutes: 60 },
    HOURS_2: { label: "2 часа", minutes: 120 },
    HOURS_4: { label: "4 часа", minutes: 240 },
    HOURS_6: { label: "6 часов", minutes: 360 },
    CUSTOM: { label: "Указать", minutes: 0 },
} as const;

const MORNING_BRIEF_ICONS = {
    CHECK: "✅",
    MANDATORY: "📌",
    CANDIDATE: "📋",
    INBOX: "📥",
    SKIP: "⏭",
    WARNING: "⚠️",
} as const;

export const MORNING_BRIEF_TEXTS = {
    HOW_MANY_HOURS: "Доброе утро! Сколько часов сегодня на задачи?",
    CUSTOM_HOURS_PROMPT: "Введи количество часов (например: 3 или 1.5):",
    CUSTOM_HOURS_INVALID: "Не понял. Введи число, например: 3 или 1.5",
    NO_TASKS_TODAY: "Сегодня нет обязательных задач и нет задач для подбора. Удачного дня!",
    NO_CANDIDATES: "Больше нет подходящих задач.",
    ONLY_MANDATORY: "Нет, только обязательные",
    ADD_TO_PLAN: `${MORNING_BRIEF_ICONS.CHECK} Добавить в план`,
    SKIP_TASK: `${MORNING_BRIEF_ICONS.SKIP} Пропустить`,
    FINISH_PLAN: `${MORNING_BRIEF_ICONS.CHECK} Готово`,
    YES: "Да",
    PLAN_HEADER: `${MORNING_BRIEF_ICONS.CHECK} План на сегодня\n`,
    MANDATORY_SECTION: `${MORNING_BRIEF_ICONS.MANDATORY} Обязательные:`,
    OPTIONAL_SECTION: `\n${MORNING_BRIEF_ICONS.CANDIDATE} Дополнительные:`,
    PLAN_TOTAL: (used: string, free: string) => `\nИтого: ${used} из ${free} запланировано.`,
    PLAN_GOOD_LUCK: "Удачного дня!",
    OVERLOADED_HEADER: `${MORNING_BRIEF_ICONS.WARNING} Обязательные задачи превышают свободное время.\n`,
    OVERLOADED_FREE: (time: string) => `Свободно: ${time}`,
    OVERLOADED_MANDATORY: (time: string) => `Обязательные: ${time}\n`,
    OVERLOADED_FOOTER: "\nЭто твой план на сегодня. Удачи!",
    MANDATORY_TASKS_HEADER: "Сегодня обязательные задачи:\n",
    MANDATORY_BUSY: (time: string) => `\nЗанято: ${time}`,
    MANDATORY_REMAINING: (time: string) => `Осталось: ${time}\n`,
    MANDATORY_QUESTION: "Подберём задачи на оставшееся время?",
    CANDIDATE_REMAINING: (time: string) => `Осталось: ${time}`,
    INBOX_NOT_IMPLEMENTED: `${MORNING_BRIEF_ICONS.INBOX} Инбокс пока не реализован.`,
    SEPARATOR: "—",
    TIME_PREFIX: "в",
    MANDATORY_TASK_PREFIX: MORNING_BRIEF_ICONS.MANDATORY,
    CANDIDATE_TASK_PREFIX: MORNING_BRIEF_ICONS.CANDIDATE,
    LIST_ITEM_PREFIX: "—",
    TASK_FORMAT: (title: string, duration: string) => `${title} — ${duration}`,
    CANDIDATE_MESSAGE: (remaining: string, title: string, tags: string) =>
        `Осталось: ${remaining}\n\n${MORNING_BRIEF_ICONS.CANDIDATE} ${title}\n${tags}`,
} as const;

export const MORNING_BRIEF_LOG = {
    FINAL_PLAN_SENT: "morning brief: final plan sent",
    HOURS_SELECTED: "morning brief: hours selected",
    TASK_ADDED: "morning brief: task added to plan",
} as const;

export const ELO_PAIR_COUNT = 10;
export const BRIEF_TIMEOUT_MS = 2 * 60 * 60 * 1000;
export const BRIEF_TIMEOUT_TEXT = "⏱ Сессия утреннего брифа истекла (2 часа). Бриф придёт завтра утром.";

export const MORNING_BRIEF_CALLBACKS = {
    INBOX: "brief:inbox",
    PICK_CANDIDATES: "brief:hours:pick_candidates",
    FINISH: "brief:finish",
    ONLY_MANDATORY: "brief:only_mandatory",
    HOURS_CUSTOM: "brief:hours:custom",
    HOURS_CUSTOM_KEY: "CUSTOM",
    ADD_VALUE: (id: string) => `brief:add:${id}`,
    SKIP_VALUE: (id: string) => `brief:skip:${id}`,
    HOURS_VALUE: (minutes: number) => `brief:hours:${minutes}`,
} as const;

export const MORNING_BRIEF_PATTERNS = {
    HOURS: /^brief:hours:(.+)$/,
    ADD: /^brief:add:(.+)$/,
    SKIP: /^brief:skip:(.+)$/,
} as const;

export const MORNING_BRIEF_SCENES = {
    AWAITING_CUSTOM_HOURS: "brief:awaiting_custom_hours",
    SELECTING_CANDIDATES: "brief:selecting_candidates",
} as const;

export const MORNING_BRIEF_EVENTS = {
    MESSAGE_TEXT: "message:text",
} as const;
