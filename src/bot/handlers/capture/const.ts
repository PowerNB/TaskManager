export const CAPTURE_TEXTS = {
    TITLE_PROMPT: "Что нужно сделать?",
    TITLE_EMPTY: "Введи название задачи.",
    TITLE_TOO_LONG: "Слишком длинно, попробуй короче.",
    CATEGORY_PROMPT: "К чему относится?",
    DURATION_PROMPT: "Сколько времени займёт?",
    OPTIONS_PROMPT: "Добавить что-нибудь ещё?",
    DATE_PROMPT: "На какой день?",
    DATE_INVALID: "Не понял формат. Попробуй так: 15.05 или 15.05.2026",
    DATE_IN_PAST: "Эта дата уже прошла. Выбери другую.",
    TIME_PROMPT: "В какое время?",
    TIME_INVALID: "Не понял формат. Попробуй так: 15:00",
    TIME_IN_PAST: "Это время уже прошло. Выбери другой день или другое время.",
    DELEGATE_PROMPT: "Кому делегируешь?",
    QUIET_HOURS_WARNING: (time: string) =>
        `⚠️ Время задачи (${time}) попадает в тихие часы.\nНапоминание за час не придёт. Продолжить?`,
    CONFIRMED: "✅ Задача сохранена",
    ADD_MORE: "+ Добавить ещё",
    OPEN_INBOX: "📥 Открыть инбокс",
} as const;

export const CATEGORY_OPTIONS = {
    CAREER: { label: "💼 Карьера", value: "CAREER" },
    PERSONAL: { label: "🎯 Личное", value: "PERSONAL" },
} as const;

export const DURATION_OPTIONS = {
    MIN_5: { label: "⚡ 5 мин", value: "MIN_5" },
    MIN_30: { label: "🕐 30 мин", value: "MIN_30" },
    HOUR_1: { label: "🕑 1 час", value: "HOUR_1" },
    HOUR_2: { label: "🕒 2 часа", value: "HOUR_2" },
    PROJECT: { label: "📁 Проект", value: "PROJECT" },
} as const;

export const DATE_PRESETS = {
    TODAY: { label: "Сегодня", value: "today" },
    TOMORROW: { label: "Завтра", value: "tomorrow" },
    IN_3_DAYS: { label: "Через 3 дня", value: "in_3_days" },
    CUSTOM: { label: "Указать дату", value: "custom" },
} as const;

