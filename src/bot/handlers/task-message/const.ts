export const TASK_MESSAGE_FORMATS = {
    CAPTION: (title: string, tags: string) => `<b>${title}</b>\n<i>${tags}</i>`,
    DATE_TAG: (day: string, month: string) => `📅 ${day}.${month}`,
    TIME_TAG: (time: string) => `⏰ ${time}`,
    DELEGATE_TAG: (name: string) => `👤 ${name}`,
    ELO_TAG: (score: number) => `⭐ ${score}`,
} as const;
