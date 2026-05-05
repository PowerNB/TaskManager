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
