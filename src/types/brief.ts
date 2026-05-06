export const FREE_TIME_PRESETS = {
    HOUR_1: { label: "1 час", minutes: 60 },
    HOURS_2: { label: "2 часа", minutes: 120 },
    HOURS_4: { label: "4 часа", minutes: 240 },
    HOURS_6: { label: "6 часов", minutes: 360 },
    CUSTOM: { label: "Указать", minutes: 0 },
} as const;

export const MORNING_BRIEF_START_TEXT = "Доброе утро! Сколько часов сегодня на задачи?";

export const DURATION_LABELS: Record<string, string> = {
    MIN_5: "⚡ 5 мин",
    MIN_30: "🕐 30 мин",
    HOUR_1: "🕑 1 час",
    HOUR_2: "🕒 2 часа",
    PROJECT: "📁 Проект",
};

export const CATEGORY_LABELS: Record<string, string> = {
    CAREER: "💼 Карьера",
    PERSONAL: "🎯 Личное",
};
