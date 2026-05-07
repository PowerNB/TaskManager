export const QUEUE_NAMES = {
    NOTIFICATIONS: "notifications",
    MORNING_BRIEF: "morning-brief",
    SATURDAY_BRIEF: "saturday-brief",
} as const;

export const JOB_NAMES = {
    CHECK_TIME_DEADLINES: "check-time-deadlines",
    CHECK_DELEGATIONS_AND_DATE_DEADLINES: "check-delegations-and-date-deadlines",
    MORNING_BRIEF: "morning-brief",
    SATURDAY_BRIEF: "saturday-brief",
} as const;

export const CRON_PATTERNS = {
    EVERY_MINUTE: "* * * * *",
    DAILY_9_UTC: "0 9 * * *",
    SATURDAY_20_UTC: "0 20 * * 6",
} as const;

export const SATURDAY_JOB_TEXTS = {
    QUARTERLY_ARCHIVE_HEADER: "🗂 Квартальный архив\n",
    QUARTERLY_ARCHIVE_INTRO: "За этот квартал так и не были выполнены:",
    QUARTERLY_ARCHIVE_FOOTER: "\nЭти задачи удалены. Если что-то важное — добавь заново.",
    FROZEN_HEADER: (monthName: string) => `❄️ Холодильник — ${monthName}\n`,
    FROZEN_TASK: (title: string, tags: string, daysSince: string) => `${title}\n${tags} — заморожена ${daysSince}`,
    STALE_SECTION_HEADER: "📋 Задачи без движения 7+ дней\nЕсли ничего не сделаешь — уйдут в холодильник.\n",
    STALE_TASK: (title: string, tags: string, daysSince: string) => `${title}\n${tags} — лежит ${daysSince}`,
    STATS_HEADER: "📊 Итоги недели\n",
    STATS_NO_TASKS_THIS_WEEK: "На этой неделе ни одной задачи не закрыто.",
    STATS_MOTIVATIONAL: "Бывает — на следующей наверстаем.",
    STATS_CLOSED: (count: number) => `Закрыто задач: ${count}`,
    STATS_CLOSED_ZERO: "Закрыто задач: 0",
    STATS_DIFF: (sign: string, diff: number) => `к прошлой неделе: ${sign}${diff}`,
    STATS_AVG: (avg: number) => `среднее за месяц: ${avg} в неделю`,
    STATS_ACTIVE: (count: number) => `\nАктивных сейчас: ${count}`,
    DAYS_SINCE: (days: number) => `${days} дн`,
} as const;

export const SATURDAY_JOB_BUTTONS = {
    FROZEN_RETURN: "Вернуть",
    FROZEN_DELETE: "Удалить",
    STALE_KEEP: "Оставить",
    STALE_DONE: "Выполнено",
    STALE_DELETE: "Удалить",
} as const;

export const SATURDAY_JOB_CALLBACKS = {
    FROZEN_RETURN: (id: string) => `sat:frozen:return:${id}`,
    FROZEN_DELETE: (id: string) => `sat:frozen:delete:${id}`,
    STALE_KEEP: (id: string) => `sat:stale:keep:${id}`,
    STALE_DONE: (id: string) => `sat:stale:done:${id}`,
    STALE_DELETE: (id: string) => `sat:stale:delete:${id}`,
} as const;

export const ELO_JOB_TEXTS = {
    DONE: "✅ Приоритеты обновлены.",
    PROMPT: (pairCount: number) => `Расставим приоритеты.\nЧто важнее прямо сейчас? (1/${pairCount})`,
    TASK_LINE: (a: string, b: string) => `\n\n1️⃣ ${a}\n2️⃣ ${b}`,
} as const;

export const ELO_JOB_BUTTONS = {
    FIRST: "1️⃣ Первая",
    SECOND: "2️⃣ Вторая",
    SKIP: "— Пропустить",
} as const;

export const ELO_JOB_CALLBACKS = {
    PICK: (winnerId: string, loserId: string, idx: number, total: number) =>
        `elo:pick:${winnerId}:${loserId}:${idx}:${total}`,
    SKIP: (idx: number, total: number) => `elo:skip:${idx}:${total}`,
} as const;

export const MORNING_JOB_CALLBACKS = {
    HOURS_CUSTOM: "brief:hours:custom",
    HOURS_VALUE: (minutes: number) => `brief:hours:${minutes}`,
} as const;

export const MORNING_JOB_PRESET_KEYS = {
    CUSTOM: "CUSTOM",
} as const;

export const NOTIF_JOB_TEXTS = {
    DELEGATION_HEADER: "🤝 Делегирование — напоминание",
    DELEGATION_BODY: (title: string, delegatedTo: string) =>
        `\n\n3 дня назад ты передал задачу:\n"${title}" → ${delegatedTo}\n\nОн уже сделал?`,
    DATE_DEADLINE_HEADER: "📅 Сегодня дедлайн",
    DATE_DEADLINE_BODY: (title: string, tags: string) => `\n\n"${title}"\n${tags}`,
    MORNING_TIME_DEADLINE_HEADER: (dueTime: string) => `📅 Сегодня в ${dueTime}`,
    MORNING_TIME_DEADLINE_BODY: (title: string, tags: string) => `\n\n"${title}"\n${tags}`,
    TIME_DEADLINE_HEADER: (dueTime: string) => `⏰ Через час — ${dueTime}`,
    TIME_DEADLINE_BODY: (title: string, tags: string) => `\n\n"${title}"\n${tags}`,
} as const;

export const NOTIF_JOB_BUTTONS = {
    DELEGATION_DONE: "✅ Да, готово",
    DELEGATION_SNOOZE: "⏳ Ещё нет",
    DELEGATION_TAKE_BACK: "↩ Забрать задачу себе",
    DEADLINE_DONE: "✅ Выполнено",
    DEADLINE_RESCHEDULE: "📅 Перенести",
    DEADLINE_DELETE: "🗑 Удалить",
} as const;

export const NOTIF_JOB_CALLBACKS = {
    DELEGATION_DONE: (id: string) => `notif:delegation:done:${id}`,
    DELEGATION_SNOOZE: (id: string) => `notif:delegation:snooze:${id}`,
    DELEGATION_TAKE_BACK: (id: string) => `notif:delegation:take_back:${id}`,
    DEADLINE_DONE: (id: string) => `notif:deadline:done:${id}`,
    DEADLINE_RESCHEDULE: (id: string) => `notif:deadline:reschedule:${id}`,
    DEADLINE_DELETE: (id: string) => `notif:deadline:delete:${id}`,
} as const;

export const JOBS_LOG = {
    RECURRING_SCHEDULED: "recurring jobs scheduled",
    JOBS_STARTED: "jobs started",
    MORNING_BRIEF_STARTED: "morning-brief job started",
    MORNING_BRIEF_SENT: "morning brief sent",
    MORNING_BRIEF_FAILED: "morning-brief job failed",
    SATURDAY_BRIEF_STARTED: "saturday-brief job started",
    SATURDAY_BRIEF_SENT: "saturday brief sent",
    SATURDAY_BRIEF_FAILED: "saturday-brief job failed",
    NOTIFICATIONS_STARTED: "notifications job started",
    DELEGATION_SENT: "delegation notification sent",
    DATE_DEADLINE_SENT: "date deadline notification sent",
    MORNING_TIME_DEADLINE_SENT: "morning time deadline notification sent",
    TIME_DEADLINE_SENT: "time deadline notification sent",
    NOTIFICATIONS_FAILED: "notifications job failed",
} as const;
