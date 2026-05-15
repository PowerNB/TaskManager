import { Api, InlineKeyboard } from "grammy";
import { TaskModel } from "#root/types/models.js";
import { CATEGORY_LABELS, DURATION_LABELS } from "#root/types/labels.js";
import { formatTimeUTCHHmm } from "#root/utils/time.js";
import { ATTACHMENT_TYPES, PARSE_MODE, TASK_MESSAGE_FORMATS } from "./const.js";

export const buildTaskTags = (task: TaskModel): string => {
    const tags: string[] = [];
    tags.push(CATEGORY_LABELS[task.category] ?? task.category);
    tags.push(DURATION_LABELS[task.duration_tag] ?? task.duration_tag);
    if (task.due_date) {
        const d = task.due_date;
        const day = String(d.getUTCDate()).padStart(2, "0");
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        tags.push(TASK_MESSAGE_FORMATS.DATE_TAG(day, month));
    }
    if (task.due_time) tags.push(TASK_MESSAGE_FORMATS.TIME_TAG(formatTimeUTCHHmm(task.due_time)));
    if (task.delegated_to) tags.push(TASK_MESSAGE_FORMATS.DELEGATE_TAG(task.delegated_to));
    tags.push(TASK_MESSAGE_FORMATS.ELO_TAG(task.elo_score));
    return tags.join(" ");
};

export const sendTaskMessage = async (
    api: Api,
    chatId: number | string,
    task: TaskModel,
    keyboard?: InlineKeyboard,
): Promise<void> => {
    const caption = TASK_MESSAGE_FORMATS.CAPTION(task.title, buildTaskTags(task));
    const options = keyboard ? { reply_markup: keyboard, parse_mode: PARSE_MODE } : { parse_mode: PARSE_MODE };

    if (task.attachment_file_id && task.attachment_type) {
        const fileId = task.attachment_file_id;
        switch (task.attachment_type) {
            case ATTACHMENT_TYPES.PHOTO:
                await api.sendPhoto(chatId, fileId, { caption, ...options });
                return;
            case ATTACHMENT_TYPES.VIDEO:
                await api.sendVideo(chatId, fileId, { caption, ...options });
                return;
            case ATTACHMENT_TYPES.DOCUMENT:
                await api.sendDocument(chatId, fileId, { caption, ...options });
                return;
            case ATTACHMENT_TYPES.AUDIO:
                await api.sendAudio(chatId, fileId, { caption, ...options });
                return;
            case ATTACHMENT_TYPES.VOICE:
                await api.sendVoice(chatId, fileId, { caption, ...options });
                return;
        }
    }

    await api.sendMessage(chatId, caption, options);
};
