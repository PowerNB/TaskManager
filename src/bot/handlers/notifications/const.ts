export const NOTIF_TEXTS = {
    TASK_DONE: "✅ Задача завершена.",
    TASK_DELETED: "🗑 Задача удалена.",
    DELEGATION_SNOOZED: "⏳ Напомню через 3 дня.",
    TASK_TAKEN_BACK: "↩ Задача возвращена тебе.",
    RESCHEDULE_PROMPT: "📅 На когда переносим?",
    RESCHEDULE_CUSTOM_PROMPT: "Введи дату в формате ДД.ММ или ДД.ММ.ГГГГ:",
    RESCHEDULE_INVALID: "Неверная дата или дата в прошлом. Попробуй ещё раз (ДД.ММ или ДД.ММ.ГГГГ):",
    RESCHEDULED: (date: string) => `✅ Дедлайн перенесён на ${date}.`,
} as const;

export const NOTIF_BUTTONS = {
    TOMORROW: "Завтра",
    IN_3_DAYS: "Через 3 дня",
    NEXT_WEEK: "На следующей неделе",
    CUSTOM_DATE: "Указать дату",
} as const;

export const NOTIF_CALLBACKS = {
    DELEGATION_DONE: (id: string) => `notif:delegation:done:${id}`,
    DELEGATION_SNOOZE: (id: string) => `notif:delegation:snooze:${id}`,
    DELEGATION_TAKE_BACK: (id: string) => `notif:delegation:take_back:${id}`,
    DEADLINE_DONE: (id: string) => `notif:deadline:done:${id}`,
    DEADLINE_DELETE: (id: string) => `notif:deadline:delete:${id}`,
    DEADLINE_RESCHEDULE: (id: string) => `notif:deadline:reschedule:${id}`,
    RESCHEDULE_DATE: (preset: string, id: string) => `notif:reschedule_date:${preset}:${id}`,
} as const;

export const NOTIF_PATTERNS = {
    DELEGATION_DONE: /^notif:delegation:done:(.+)$/,
    DELEGATION_SNOOZE: /^notif:delegation:snooze:(.+)$/,
    DELEGATION_TAKE_BACK: /^notif:delegation:take_back:(.+)$/,
    DEADLINE_DONE: /^notif:deadline:done:(.+)$/,
    DEADLINE_DELETE: /^notif:deadline:delete:(.+)$/,
    DEADLINE_RESCHEDULE: /^notif:deadline:reschedule:(.+)$/,
    RESCHEDULE_DATE: /^notif:reschedule_date:(.+):(.+)$/,
} as const;

export const NOTIF_SCENES = {
    RESCHEDULE: "notif:reschedule",
    RESCHEDULE_CUSTOM: "notif:reschedule_custom",
} as const;

export const NOTIF_PRESET_VALUES = {
    CUSTOM: "custom",
} as const;
