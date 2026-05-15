export const ONBOARDING_TEXTS = {
    WELCOME:
        "Привет! Я помогаю управлять задачами.\n\nБуду присылать брифы, напоминания и помогать планировать день — но сначала пара вопросов.",
    TIMEZONE_PROMPT: "В каком часовом поясе ты находишься?",
    TIMEZONE_OTHER_PROMPT: "Введи свой UTC офсет (например: +3 или -5)",
    TIMEZONE_INVALID: "Неверный формат. Введи офсет от -12 до +14, например: +3 или -5",
    BRIEF_TIME_PROMPT: "В какое время присылать утренний бриф?",
    BRIEF_TIME_OTHER_PROMPT: "Введи время в формате ЧЧ:ММ (например: 08:30)",
    BRIEF_TIME_INVALID: "Не понял формат. Попробуй так: 08:30",
    BRIEF_TIME_IN_QUIET_HOURS: "Это время входит в тихие часы. Изменить тихие часы или выбрать другое время?",
    QUIET_HOURS_PROMPT: "В какое время тебя не беспокоить?",
    QUIET_HOURS_FROM_PROMPT: "С какого времени? (например: 23:00)",
    QUIET_HOURS_TO_PROMPT: "До какого времени? (например: 09:00)",
    QUIET_HOURS_INVALID: "Не понял формат. Попробуй так: 23:00",
    QUIET_HOURS_NOT_SET: "не настроены",
    SETTINGS_HEADER: "⚙️ Настройки",
    SETTINGS_TIMEZONE: (tz: string) => `🕐 Часовой пояс: ${tz}`,
    SETTINGS_BRIEF_TIME: (t: string) => `🌅 Утренний бриф: ${t}`,
    SETTINGS_QUIET_HOURS: (h: string) => `🌙 Тихие часы: ${h}`,
    SETTINGS_QUIET_HOURS_RANGE: (from: string, to: string) => `${from} — ${to}`,
    COMPLETION: (tz: string, brief: string, quiet: string) =>
        `Всё готово!\n\n🕐 Часовой пояс: ${tz}\n🌅 Утренний бриф: ${brief}\n🌙 Тихие часы: ${quiet}\n\nМожешь изменить настройки в любое время через /settings`,
    TIMEZONE_FORMAT: (offset: string) => `UTC${offset}`,
} as const;

export const ONBOARDING_BUTTONS = {
    TIMEZONE_OTHER: "Другой",
    BRIEF_TIME_OTHER: "Указать",
    QUIET_HOURS_CUSTOM: "Настроить",
    QUIET_HOURS_SKIP: "Пропустить",
    SETTINGS_CHANGE: "Изменить",
    SETTINGS_HOME: "🏠 Главное меню",
} as const;

export const ONBOARDING_CALLBACKS = {
    TZ_PREFIX: "onboarding:tz",
    TZ_VALUE: (tz: string) => `onboarding:tz:${tz}`,
    TZ_OTHER: "onboarding:tz:other",
    BRIEF_PREFIX: "onboarding:brief",
    BRIEF_VALUE: (t: string) => `onboarding:brief:${t}`,
    BRIEF_OTHER: "onboarding:brief:other",
    QUIET_PREFIX: "onboarding:quiet",
    QUIET_VALUE: (from: string, to: string) => `onboarding:quiet:${from}:${to}`,
    QUIET_CUSTOM: "onboarding:quiet:custom",
    QUIET_SKIP: "onboarding:quiet:skip",
    SETTINGS_TIMEZONE: "settings:timezone",
    SETTINGS_BRIEF_TIME: "settings:brief_time",
    SETTINGS_QUIET_HOURS: "settings:quiet_hours",
    MENU_HOME: "menu:home",
} as const;

export const ONBOARDING_PATTERNS = {
    TZ: /^onboarding:tz:(.+)$/,
    BRIEF: /^onboarding:brief:(.+)$/,
    QUIET: /^onboarding:quiet:(.+)$/,
} as const;

export const ONBOARDING_SCENES = {
    TIMEZONE: "onboarding:timezone",
    BRIEF_TIME: "onboarding:brief_time",
    QUIET_HOURS_FROM: "onboarding:quiet_hours_from",
    QUIET_HOURS_TO: "onboarding:quiet_hours_to",
} as const;

export const ONBOARDING_PRESET_VALUES = {
    OTHER: "other",
    CUSTOM: "custom",
    SKIP: "skip",
} as const;

export const ONBOARDING_LOG = {
    CMD_START_EXISTING: "command /start: existing user",
    STARTED: "onboarding: started",
    TIMEZONE_SET: "onboarding: timezone set",
    BRIEF_TIME_SET: "onboarding: brief time set",
    QUIET_HOURS_SET: "onboarding: quiet hours set",
    QUIET_HOURS_SKIPPED: "onboarding: quiet hours skipped",
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
