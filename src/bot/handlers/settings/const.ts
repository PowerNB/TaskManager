export const SETTINGS_LOG = {
    CMD_SETTINGS: "command /settings",
    OPENED: "settings: opened",
    EDITING_TIMEZONE: "settings: editing timezone",
    EDITING_BRIEF_TIME: "settings: editing brief time",
    EDITING_QUIET_HOURS: "settings: editing quiet hours",
} as const;

export const SETTINGS_CALLBACKS = {
    OPEN: "settings:open",
    TIMEZONE: "settings:timezone",
    BRIEF_TIME: "settings:brief_time",
    QUIET_HOURS: "settings:quiet_hours",
} as const;
