const K = 32;
const MIN_SCORE = 100;

export const calcElo = (scoreA: number, scoreB: number): { newA: number; newB: number } => {
    const expected = 1 / (1 + Math.pow(10, (scoreB - scoreA) / 400));
    const newA = Math.max(MIN_SCORE, Math.round(scoreA + K * (1 - expected)));
    const newB = Math.max(MIN_SCORE, Math.round(scoreB + K * (0 - expected)));
    return { newA, newB };
};
