const BAR_FILLED = "▓";
const BAR_EMPTY = "░";
const BAR_LENGTH = 10;

export const buildProgressBar = (done: number, total: number): string => {
    const filled = total > 0 ? Math.round((done / total) * BAR_LENGTH) : 0;
    return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(BAR_LENGTH - filled) + ` ${done}/${total}`;
};
