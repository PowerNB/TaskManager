export const MENU_TEXTS = {
    MAIN_MENU: "Главное меню",
} as const;

export const MENU_BUTTONS = {
    ADD_TASK: "+ Добавить задачу",
    INBOX: "📥 Инбокс",
    SETTINGS: "⚙️ Настройки",
} as const;

export const MENU_CALLBACKS = {
    ADD_TASK: "add_task",
    INBOX: "capture:inbox",
    SETTINGS: "settings:open",
    HOME: "menu:home",
} as const;
