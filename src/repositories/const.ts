export const USER_REPOSITORY_LOGS = {
    FIND_BY_ID: "userRepository.findById",
    UPSERT: "userRepository.upsert",
    UPDATE: "userRepository.update",
    FIND_ALL: "userRepository.findAll",
} as const;

export const TASK_REPOSITORY_LOGS = {
    FIND_BY_ID: "taskRepository.findById",
    FIND_ACTIVE_BY_USER: "taskRepository.findActiveByUser",
    CREATE: "taskRepository.create",
    UPDATE: "taskRepository.update",
    FIND_DUE_DELEGATIONS: "taskRepository.findDueDelegations",
    FIND_DUE_DATE_DEADLINES: "taskRepository.findDueDateDeadlines",
    FIND_DUE_TIME_DEADLINES: "taskRepository.findDueTimeDeadlines",
    FIND_TODAY_MANDATORY: "taskRepository.findTodayMandatory",
    FIND_CANDIDATES_FOR_BRIEF: "taskRepository.findCandidatesForBrief",
    FIND_STALE: "taskRepository.findStale",
    FIND_FROZEN: "taskRepository.findFrozen",
    FIND_ARCHIVED_BEFORE_QUARTER: "taskRepository.findArchivedBeforeQuarter",
    DELETE_MANY: "taskRepository.deleteMany",
    COUNT_DONE_IN_RANGE: "taskRepository.countDoneInRange",
    COUNT_ACTIVE: "taskRepository.countActive",
    UPDATE_MANY: "taskRepository.updateMany",
} as const;

export const TASK_STATUS = {
    ACTIVE: "ACTIVE",
    FROZEN: "FROZEN",
    ARCHIVED: "ARCHIVED",
    DONE: "DONE",
    DELETED: "DELETED",
} as const;

export const TASK_CATEGORY = {
    CAREER: "CAREER",
    PERSONAL: "PERSONAL",
} as const;

export const DAY_START_HOURS = { hours: 0, minutes: 0, seconds: 0, ms: 0 } as const;
export const DAY_END_HOURS = { hours: 23, minutes: 59, seconds: 59, ms: 999 } as const;

export function startOfDay(date = new Date()): Date {
    const d = new Date(date);
    d.setHours(DAY_START_HOURS.hours, DAY_START_HOURS.minutes, DAY_START_HOURS.seconds, DAY_START_HOURS.ms);
    return d;
}

export function endOfDay(date = new Date()): Date {
    const d = new Date(date);
    d.setHours(DAY_END_HOURS.hours, DAY_END_HOURS.minutes, DAY_END_HOURS.seconds, DAY_END_HOURS.ms);
    return d;
}
