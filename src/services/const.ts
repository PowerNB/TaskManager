export const CAPTURE_SERVICE_LOG = {
    TASK_CREATED: "task created",
    TASK_UPDATED: "task updated",
    TASK_DONE: "task marked done",
    TASK_DELETED: "task marked deleted",
    INBOX_LOADING_DATE: "inbox: loading tasks for date",
    INBOX_DATE_LOADED: "inbox: tasks for date loaded",
    INBOX_LOADING_WEEK: "inbox: loading week tasks",
    INBOX_WEEK_LOADED: "inbox: week tasks loaded",
    INBOX_LOADING_DATES: "inbox: loading active dates for week",
    INBOX_DATES_LOADED: "inbox: active dates for week loaded",
    INBOX_LOADING_NO_DATE: "inbox: loading no-date tasks",
    INBOX_NO_DATE_LOADED: "inbox: no-date tasks loaded",
} as const;

export const LIFECYCLE_LOG = {
    KEPT_ACTIVE: "task kept active",
    DONE: "task lifecycle: DONE",
    DELETED: "task lifecycle: DELETED",
    RETURNED_FROM_FROZEN: "task returned from frozen",
} as const;

export const NOTIFICATION_SERVICE_LOG = {
    DELEGATIONS_FETCHED: "due delegations fetched",
    DATE_DEADLINES_FETCHED: "due date deadlines fetched",
    MORNING_TIME_DEADLINES_FETCHED: "morning time deadlines fetched",
    TIME_DEADLINES_FETCHED: "due time deadlines fetched",
    DELEGATION_SNOOZED: "delegation snoozed",
    TASK_DONE: "notification: task marked done",
    TASK_DELETED: "notification: task marked deleted",
    TASK_TAKEN_BACK: "task taken back from delegation",
    TASK_RESCHEDULED: "task rescheduled",
} as const;

export const SATURDAY_SERVICE_LOG = {
    BRIEF_DATA_BUILT: "saturday brief data built",
    TASK_FROZEN: "task frozen",
    TASK_ARCHIVED: "task archived",
    ARCHIVED_DELETED: "archived tasks deleted",
} as const;

export const MORNING_SERVICE_LOG = {
    USERS_FETCHED: "users due for brief fetched",
    BRIEF_SENT: "brief marked sent",
} as const;

export const ELO_SERVICE_LOG = {
    GET_PAIRS: "elo: getPairs",
    NOT_ENOUGH_CANDIDATES: "elo: not enough candidates for brief pairs",
    SESSION_BUILT: "elo: swiss session built",
    SCORES_UPDATED: "elo scores updated",
    APPLY_RESULT_SKIP: "elo: applyResult — task not found, skipping",
} as const;
