export const SATURDAY_TEXTS = {
    STALE_KEEP: "Оставить",
    STALE_DONE: "Выполнено",
    STALE_DELETE: "Удалить",
    FROZEN_RETURN: "Вернуть",
    FROZEN_DELETE: "Удалить",
    REPLY_KEPT: "✅ Задача оставлена активной.",
    REPLY_DONE: "✅ Задача выполнена.",
    REPLY_DELETED: "🗑 Задача удалена.",
    REPLY_RETURNED: "↩ Задача возвращена в активные.",
} as const;

export const SATURDAY_PATTERNS = {
    STALE_KEEP: /^sat:stale:keep:(.+)$/,
    STALE_DONE: /^sat:stale:done:(.+)$/,
    STALE_DELETE: /^sat:stale:delete:(.+)$/,
    FROZEN_RETURN: /^sat:frozen:return:(.+)$/,
    FROZEN_DELETE: /^sat:frozen:delete:(.+)$/,
} as const;

export const SATURDAY_CALLBACKS = {
    STALE_KEEP: (id: string) => `sat:stale:keep:${id}`,
    STALE_DONE: (id: string) => `sat:stale:done:${id}`,
    STALE_DELETE: (id: string) => `sat:stale:delete:${id}`,
    FROZEN_RETURN: (id: string) => `sat:frozen:return:${id}`,
    FROZEN_DELETE: (id: string) => `sat:frozen:delete:${id}`,
} as const;
