export const ONBOARDING_TEXTS = {
    WELCOME:
        "Привет! Я помогаю управлять задачами.\n\nБуду присылать брифы, напоминания и помогать планировать день — но сначала пара вопросов.",
    TIMEZONE_PROMPT: "В каком часовом поясе ты находишься?",
    TIMEZONE_OTHER_PROMPT: "Введи свой UTC офсет (например: +3 или -5)",
    TIMEZONE_INVALID: "Неверный формат. Введи офсет от -12 до +14, например: +3 или -5",
    BRIEF_TIME_PROMPT: "В какое время присылать утренний бриф?",
    BRIEF_TIME_OTHER_PROMPT: "Введи время в формате ЧЧ:ММ (например: 08:30)",
    BRIEF_TIME_INVALID: "Не понял формат. Попробуй так: 08:30",
    BRIEF_TIME_IN_QUIET_HOURS:
        "Это время входит в тихие часы. Изменить тихие часы или выбрать другое время?",
    QUIET_HOURS_PROMPT: "В какое время тебя не беспокоить?",
    QUIET_HOURS_FROM_PROMPT: "С какого времени? (например: 23:00)",
    QUIET_HOURS_TO_PROMPT: "До какого времени? (например: 09:00)",
    QUIET_HOURS_INVALID: "Не понял формат. Попробуй так: 23:00",
    MAIN_MENU: "Главное меню",
} as const;

export const TIMEZONE_PRESETS = {
    UTC_PLUS_2: "UTC+2",
    UTC_PLUS_3: "UTC+3",
    UTC_PLUS_5: "UTC+5",
    UTC_PLUS_6: "UTC+6",
} as const;

export const BRIEF_TIME_PRESETS = {
    TIME_07_00: "07:00",
    TIME_08_00: "08:00",
    TIME_09_00: "09:00",
    TIME_10_00: "10:00",
} as const;

export const QUIET_HOURS_PRESETS = {
    PRESET_22_08: { label: "22:00 — 08:00", from: "22:00", to: "08:00" },
    PRESET_23_08: { label: "23:00 — 08:00", from: "23:00", to: "08:00" },
    PRESET_23_09: { label: "23:00 — 09:00", from: "23:00", to: "09:00" },
} as const;
