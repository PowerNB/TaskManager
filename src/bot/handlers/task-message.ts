import { Api, InlineKeyboard } from "grammy";
import { TaskModel } from "#root/types/models.js";

const CATEGORY_LABELS: Record<string, string> = {
    CAREER: "💼 Карьера",
    PERSONAL: "🎯 Личное",
};

const DURATION_LABELS: Record<string, string> = {
    MIN_5: "⚡ 5 мин",
    MIN_30: "🕐 30 мин",
    HOUR_1: "🕑 1 час",
    HOUR_2: "🕒 2 часа",
    PROJECT: "📁 Проект",
};

export const buildTaskTags = (task: TaskModel): string => {
    const tags: string[] = [];
    tags.push(CATEGORY_LABELS[task.category] ?? task.category);
    tags.push(DURATION_LABELS[task.duration_tag] ?? task.duration_tag);
    if (task.due_date) {
        const d = task.due_date;
        tags.push(`📅 ${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    if (task.due_time) {
        const t = task.due_time;
        tags.push(`⏰ ${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`);
    }
    if (task.delegated_to) tags.push(`👤 ${task.delegated_to}`);
    return tags.join(" ");
};

export const sendTaskMessage = async (
    api: Api,
    chatId: number | string,
    task: TaskModel,
    keyboard?: InlineKeyboard,
): Promise<void> => {
    const caption = `<b>${task.title}</b>\n<i>${buildTaskTags(task)}</i>`;
    const options = keyboard ? { reply_markup: keyboard, parse_mode: "HTML" as const } : { parse_mode: "HTML" as const };

    if (task.attachment_file_id && task.attachment_type) {
        const fileId = task.attachment_file_id;
        switch (task.attachment_type) {
            case "photo":
                await api.sendPhoto(chatId, fileId, { caption, ...options });
                return;
            case "video":
                await api.sendVideo(chatId, fileId, { caption, ...options });
                return;
            case "document":
                await api.sendDocument(chatId, fileId, { caption, ...options });
                return;
            case "audio":
                await api.sendAudio(chatId, fileId, { caption, ...options });
                return;
            case "voice":
                await api.sendVoice(chatId, fileId, { caption, ...options });
                return;
        }
    }

    await api.sendMessage(chatId, caption, options);
};
