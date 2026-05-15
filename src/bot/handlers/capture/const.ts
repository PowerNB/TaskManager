export const TITLE_MAX_LENGTH = 500;

export const SEPARATOR = "—";

export const CAPTURE_DEFAULTS = {
    TIMEZONE: "UTC+3",
} as const;

export const CAPTURE_LOG = {
    CMD_ADD: "command /add",
    CMD_INBOX: "command /inbox",
    INBOX_OPEN_MENU: "inbox: open menu",
    INBOX_SHOW_TODAY: "inbox: show today",
    INBOX_SHOW_WEEK: "inbox: show week",
    INBOX_SHOW_NO_DATE: "inbox: show no-date tasks",
    INBOX_SHOW_ALL: "inbox: show all tasks",
    INBOX_FILTER_DATE: "inbox: filter by date",
    INBOX_TASK_DONE: "inbox: task done",
    INBOX_TASK_DELETED: "inbox: task deleted",
    INBOX_EDIT_STARTED: "inbox: edit started",
    TASK_SAVED: "capture: task saved",
    TITLE_TOO_LONG: "capture: title too long",
} as const;

export const CAPTURE_ICONS = {
    DATE: "📅",
    TIME: "⏰",
    DELEGATE: "👤",
} as const;

export const CAPTURE_TAG_FORMATS = {
    DATE: (date: string) => `${CAPTURE_ICONS.DATE} ${date}`,
    TIME: (time: string) => `${CAPTURE_ICONS.TIME} ${time}`,
    DELEGATE: (name: string) => `${CAPTURE_ICONS.DELEGATE} ${name}`,
} as const;

export const CAPTURE_TEXTS = {
    TITLE_PROMPT: "Что нужно сделать?",
    TITLE_EMPTY: "Введи название задачи.",
    TITLE_TOO_LONG: "Слишком длинно, попробуй короче.",
    TITLE_EDIT_PROMPT: (current: string) => `Текущее: "${current}"\n\nВведи новое название (или отправь с аттачментом).`,
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
    INBOX_EMPTY: "📥 Инбокс пуст. Добавь первую задачу!",
    INBOX_HEADER: (count: number) => {
        const mod10 = count % 10;
        const mod100 = count % 100;
        const word = (mod100 >= 11 && mod100 <= 14) ? "задач"
            : mod10 === 1 ? "задача"
                : (mod10 >= 2 && mod10 <= 4) ? "задачи"
                    : "задач";
        return `📥 Инбокс — ${count} ${word}`;
    },
    INBOX_ADD_TASK: "+ Добавить задачу",
    TASK_DELETED: "🗑 Задача удалена",
    CAPTURE_TIMEOUT: "⏱ Сессия добавления задачи истекла (30 минут). Начни заново — /add",
} as const;

export const CAPTURE_TIMEOUT_MS = 30 * 60 * 1000;

export const CAPTURE_BUTTONS = {
    BACK: "◀ Назад",
    DONE: "✅ Готово",
    TITLE_EDIT: "✏️ Название",
    DATE_PLACEHOLDER: "📅 Дату",
    TIME_PLACEHOLDER: "⏰ Время",
    DELEGATE_PLACEHOLDER: "👤 Делегировать",
    CATEGORY_PLACEHOLDER: "📂 Категория",
    MAIN_MENU: "🏠 Главное меню",
    TASK_DONE: "✅ Выполнено",
    TASK_EDIT: "✏️ Изменить",
    TASK_DELETE: "🗑 Удалить",
    QUIET_SAVE: "Да, сохранить",
    QUIET_CHANGE: "Изменить время",
} as const;

export const CAPTURE_SCENES = {
    AWAITING_TITLE: "capture:awaiting_title",
    AWAITING_CATEGORY: "capture:awaiting_category",
    AWAITING_DURATION: "capture:awaiting_duration",
    AWAITING_OPTIONS: "capture:awaiting_options",
    AWAITING_DATE: "capture:awaiting_date",
    AWAITING_TIME: "capture:awaiting_time",
    AWAITING_DELEGATE: "capture:awaiting_delegate",
    EDIT_TITLE: "capture:edit_title",
} as const;

export const CAPTURE_CALLBACKS = {
    BACK: "capture:back",
    ADD_MORE: "capture:add_more",
    INBOX: "capture:inbox",
    OPTION_DATE: "capture:option:date",
    OPTION_TIME: "capture:option:time",
    OPTION_DELEGATE: "capture:option:delegate",
    OPTION_DONE: "capture:option:done",
    OPTION_CATEGORY: "capture:option:category",
    OPTION_CATEGORY_VALUE: (value: string) => `capture:option:category:${value}`,
    CATEGORY_VALUE: (value: string) => `capture:category:${value}`,
    DURATION_VALUE: (value: string) => `capture:duration:${value}`,
    OPTION_TITLE: "capture:option:title",
    DATE_PREFIX: "capture:date",
    DATE_VALUE: (value: string) => `capture:date:${value}`,
    QUIET_SAVE: "capture:quiet_warning:save",
    QUIET_CHANGE: "capture:quiet_warning:change",
    INBOX_DONE: (id: string) => `inbox:done:${id}`,
    INBOX_EDIT: (id: string) => `inbox:edit:${id}`,
    INBOX_DELETE: (id: string) => `inbox:delete:${id}`,
} as const;

export const MEDIA_TYPES = {
    PHOTO: "photo",
    VIDEO: "video",
    DOCUMENT: "document",
    AUDIO: "audio",
    VOICE: "voice",
} as const;

export const MEDIA_EVENTS = {
    PHOTO: "message:photo",
    VIDEO: "message:video",
    DOCUMENT: "message:document",
    AUDIO: "message:audio",
    VOICE: "message:voice",
} as const;

export const CAPTURE_PATTERNS = {
    OPTION_CATEGORY: /^capture:option:category:(.+)$/,
    CATEGORY: /^capture:category:(.+)$/,
    DURATION: /^capture:duration:(.+)$/,
    DATE: /^capture:date:(.+)$/,
    QUIET_WARNING: /^capture:quiet_warning:(.+)$/,
    INBOX_DONE: /^inbox:done:(.+)$/,
    INBOX_EDIT: /^inbox:edit:(.+)$/,
    INBOX_DELETE: /^inbox:delete:(.+)$/,
} as const;

export const GLOBAL_CALLBACKS = {
    ADD_TASK: "add_task",
    MENU_HOME: "menu:home",
    INBOX: "inbox",
} as const;

export const INBOX_CALLBACKS = {
    SHOW_DATE: (iso: string) => `inbox:date:${iso}`,
    SHOW_TODAY: "inbox:show:today",
    SHOW_WEEK: "inbox:show:week",
    SHOW_NO_DATE: "inbox:show:nodate",
    SHOW_ALL: "inbox:show:all",
} as const;

export const INBOX_PATTERNS = {
    DATE: /^inbox:date:(.+)$/,
} as const;

export const INBOX_TEXTS = {
    MENU_PROMPT: "📥 Инбокс",
    FOOTER_DATE: (dateLabel: string) => `Показываются задачи на ${dateLabel}`,
    FOOTER_WEEK: "Показываются задачи на эту неделю",
    FOOTER_NO_DATE: "Показываются задачи без даты",
    FOOTER_ALL: "Показываются все активные задачи",
    NO_TASKS_TODAY: "На сегодня задач нет.",
    NO_TASKS_DATE: (label: string) => `На ${label} задач нет.`,
    NO_TASKS_WEEK: "На этой неделе задач нет.",
    NO_TASKS_NO_DATE: "Задач без даты нет.",
    NO_TASKS_ALL: "Активных задач нет.",
} as const;

export const INBOX_BUTTONS = {
    TODAY: "📅 Задачи на сегодня",
    WEEK: "🗓 Задачи на эту неделю",
    NO_DATE: "📋 Задачи без даты",
    ALL: "📂 Все задачи",
    BACK_TO_INBOX: "◀ Назад",
    BACK_TO_MENU: "◀ Назад",
} as const;

const WEEKDAYS_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

export const formatDayButton = (date: Date): string => {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const wd = WEEKDAYS_RU[date.getUTCDay()];
    return `${wd} ${day}.${month}`;
};

export const formatDayLabel = (date: Date): string => {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const wd = WEEKDAYS_RU[date.getUTCDay()];
    return `${wd} ${day}.${month}`;
};

export const PARSE_MODE = {
    HTML: "HTML" as const,
};

export const QUIET_WARNING_ACTIONS = {
    SAVE: "save",
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

import { DATE_PRESET_VALUES } from "#root/utils/time.js";

export const DATE_PRESETS = {
    TODAY: { label: "Сегодня", value: DATE_PRESET_VALUES.TODAY },
    TOMORROW: { label: "Завтра", value: DATE_PRESET_VALUES.TOMORROW },
    IN_3_DAYS: { label: "Через 3 дня", value: DATE_PRESET_VALUES.IN_3_DAYS },
    CUSTOM: { label: "Указать дату", value: "custom" },
} as const;

