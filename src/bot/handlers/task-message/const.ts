export const PARSE_MODE = "HTML" as const;

export const ATTACHMENT_TYPES = {
    PHOTO: "photo",
    VIDEO: "video",
    DOCUMENT: "document",
    AUDIO: "audio",
    VOICE: "voice",
} as const;

const ICONS = {
    DATE: "📅",
    TIME: "⏰",
    DELEGATE: "👤",
    ELO: "⭐",
} as const;

export const TASK_MESSAGE_FORMATS = {
    CAPTION: (title: string, tags: string) => `<b>${title}</b>\n<i>${tags}</i>`,
    DATE_TAG: (day: string, month: string) => `${ICONS.DATE} ${day}.${month}`,
    TIME_TAG: (time: string) => `${ICONS.TIME} ${time}`,
    DELEGATE_TAG: (name: string) => `${ICONS.DELEGATE} ${name}`,
    ELO_TAG: (score: number) => `${ICONS.ELO} ${score}`,
} as const;

