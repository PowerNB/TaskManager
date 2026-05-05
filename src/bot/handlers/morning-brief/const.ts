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
} as const;

export const FREE_TIME_PRESETS = {
    HOUR_1: { label: "1 час", minutes: 60 },
    HOURS_2: { label: "2 часа", minutes: 120 },
    HOURS_4: { label: "4 часа", minutes: 240 },
    HOURS_6: { label: "6 часов", minutes: 360 },
    CUSTOM: { label: "Указать", minutes: 0 },
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
    CAREER: "💼 Карьера",
    PERSONAL: "🎯 Личное",
};

export const DURATION_LABELS: Record<string, string> = {
    MIN_5: "⚡ 5 мин",
    MIN_30: "🕐 30 мин",
    HOUR_1: "🕑 1 час",
    HOUR_2: "🕒 2 часа",
    PROJECT: "📁 Проект",
};
