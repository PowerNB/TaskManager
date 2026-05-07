export const MORNING_BRIEF_TEXTS = {
    HOW_MANY_HOURS: "Доброе утро! Сколько часов сегодня на задачи?",
    CUSTOM_HOURS_PROMPT: "Введи количество часов (например: 3 или 1.5):",
    CUSTOM_HOURS_INVALID: "Не понял. Введи число, например: 3 или 1.5",
    NO_TASKS_TODAY: "Сегодня нет обязательных задач и нет задач для подбора. Удачного дня!",
    NO_CANDIDATES: "Больше нет подходящих задач.",
    ONLY_MANDATORY: "Нет, только обязательные",
    ADD_TO_PLAN: "✅ Добавить в план",
    SKIP_TASK: "⏭ Пропустить",
    FINISH_PLAN: "✅ Готово",
    YES: "Да",
    PLAN_HEADER: "✅ План на сегодня\n",
    MANDATORY_SECTION: "📌 Обязательные:",
    OPTIONAL_SECTION: "\n📋 Дополнительные:",
    PLAN_TOTAL: (used: string, free: string) => `\nИтого: ${used} из ${free} запланировано.`,
    PLAN_GOOD_LUCK: "Удачного дня!",
    OVERLOADED_HEADER: "⚠️ Обязательные задачи превышают свободное время.\n",
    OVERLOADED_FREE: (time: string) => `Свободно: ${time}`,
    OVERLOADED_MANDATORY: (time: string) => `Обязательные: ${time}\n`,
    OVERLOADED_FOOTER: "\nЭто твой план на сегодня. Удачи!",
    MANDATORY_TASKS_HEADER: "Сегодня обязательные задачи:\n",
    MANDATORY_BUSY: (time: string) => `\nЗанято: ${time}`,
    MANDATORY_REMAINING: (time: string) => `Осталось: ${time}\n`,
    MANDATORY_QUESTION: "Подберём задачи на оставшееся время?",
    CANDIDATE_REMAINING: (time: string) => `Осталось: ${time}`,
    INBOX_NOT_IMPLEMENTED: "📥 Инбокс пока не реализован.",
    SEPARATOR: "—",
    TIME_PREFIX: "в",
    MANDATORY_TASK_PREFIX: "📌",
    CANDIDATE_TASK_PREFIX: "📋",
    LIST_ITEM_PREFIX: "—",
    MESSAGE_TEXT_EVENT: "message:text",
    TASK_FORMAT: (title: string, duration: string) => `${title} — ${duration}`,
    CANDIDATE_MESSAGE: (remaining: string, title: string, tags: string) =>
        `Осталось: ${remaining}\n\n📋 ${title}\n${tags}`,
} as const;

export const ELO_PAIR_COUNT = 10;

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
