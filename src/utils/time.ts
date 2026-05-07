import { format, parse, isValid } from "date-fns";

export const formatDate = (date: Date): string => format(date, "yyyy-MM-dd");

export const formatDateDisplay = (date: Date): string => format(date, "dd.MM.yyyy");

export const formatIsoDateShort = (isoDate: string): string => {
    const [, month, day] = isoDate.split("-");
    return `${day}.${month}`;
};

export const formatTimeHHmm = (date: Date): string => format(date, "HH:mm");

export const formatTimeUTCHHmm = (date: Date): string => {
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
};

export const isValidTime = (value: string): boolean =>
    isValid(parse(value, "HH:mm", new Date())) && /^\d{2}:\d{2}$/.test(value);

export const isValidTimezone = (value: string): boolean =>
    /^[+-](?:1[0-4]|[0-9])$/.test(value);

export const parseDateString = (value: string): Date | null => {
    if (/^\d{2}\.\d{2}$/.test(value)) {
        const parsed = parse(value, "dd.MM", new Date());
        return isValid(parsed) ? parsed : null;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
        const parsed = parse(value, "dd.MM.yyyy", new Date());
        return isValid(parsed) ? parsed : null;
    }
    return null;
};

export const DATE_PRESET_VALUES = {
    TODAY: "today",
    TOMORROW: "tomorrow",
    IN_3_DAYS: "in_3_days",
    NEXT_WEEK: "next_week",
} as const;

export const resolveDatePreset = (preset: string): Date => {
    const now = new Date();
    if (preset === DATE_PRESET_VALUES.TOMORROW) now.setDate(now.getDate() + 1);
    else if (preset === DATE_PRESET_VALUES.IN_3_DAYS) now.setDate(now.getDate() + 3);
    else if (preset === DATE_PRESET_VALUES.NEXT_WEEK) now.setDate(now.getDate() + 7);
    return now;
};

export const parseTimezoneOffset = (timezone: string): number =>
    parseInt(timezone.replace("UTC", ""), 10);

export const toUserLocal = (date: Date, timezone: string): Date => {
    const offset = parseTimezoneOffset(timezone);
    return new Date(date.getTime() + offset * 3600000);
};

export const getNowTime = (timezone: string): string => {
    const local = toUserLocal(new Date(), timezone);
    const h = String(local.getUTCHours()).padStart(2, "0");
    const m = String(local.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
};

const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

export const isTimeInQuietHours = (time: string, from: string, to: string): boolean => {
    const nowMinutes = toMinutes(time);
    const fromMinutes = toMinutes(from);
    const toMinutes_ = toMinutes(to);

    const wrapsAroundMidnight = fromMinutes > toMinutes_;

    if (wrapsAroundMidnight) {
        return nowMinutes >= fromMinutes || nowMinutes < toMinutes_;
    }

    return nowMinutes >= fromMinutes && nowMinutes < toMinutes_;
};

export const getWeekBounds = (): { weekStart: Date; weekEnd: Date } => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
};

export const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} мин`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} ч`;
    return `${h} ч ${m} мин`;
};

export const subtractHour = (time: string): string => {
    const [h, m] = time.split(":").map(Number);
    return `${String((h - 1 + 24) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const isTimeAffectedByQuietHours = (dueTime: string, from: string, to: string): boolean =>
    isTimeInQuietHours(dueTime, from, to) || isTimeInQuietHours(subtractHour(dueTime), from, to);

export const canSend = (
    nowTime: string,
    quietFrom: string | null,
    quietTo: string | null,
    isTimeBasedReminder: boolean = false,
): boolean => {
    if (quietFrom === null) {
        return true;
    }

    if (isTimeBasedReminder) {
        return true;
    }

    return !isTimeInQuietHours(nowTime, quietFrom, quietTo!);
};
