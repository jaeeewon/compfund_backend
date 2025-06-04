const COEFFICIENT = 3;
const EXPONENTIAL = 1.5;
export const CHAT_EXP = 1;

/**
 * 다음 레벨로의 필요 exp = {COEFFICIENT} * {LEVEL} ^ {EXPONENTIAL}
 *
 * 현재 레벨로의 변환 = ({exp} / {COEFFICIENT}) ^ (- 1 / {EXPONENTIAL})
 */

export function getLevel(exp: number, a = COEFFICIENT, b = EXPONENTIAL) {
  return Math.floor(Math.pow(exp / a, 1 / b));
}

export function getRequiredExp(
  level: number,
  a = COEFFICIENT,
  b = EXPONENTIAL
) {
  return Math.floor(a * Math.pow(level, b));
}

export function getProgress(exp: number, a = COEFFICIENT, b = EXPONENTIAL) {
  const level = getLevel(exp, a, b);
  const currentLevelExp = getRequiredExp(level, a, b);
  const nextLevelExp = getRequiredExp(level + 1, a, b);
  const progress = (exp - currentLevelExp) / (nextLevelExp - currentLevelExp);
  return { level, progress, toNext: nextLevelExp - exp };
}

export function printLevelPerExp(maxExp: number) {
  /*
exp: 0, level: 0
exp: 1, level: 0
exp: 2, level: 0
exp: 3, level: 1
exp: 4, level: 1
exp: 5, level: 1
exp: 6, level: 1
exp: 7, level: 1
exp: 8, level: 1
exp: 9, level: 2
exp: 10, level: 2
exp: 11, level: 2
exp: 12, level: 2
exp: 13, level: 2
exp: 14, level: 2
exp: 15, level: 2
exp: 16, level: 3
exp: 17, level: 3
exp: 18, level: 3
exp: 19, level: 3
exp: 20, level: 3
exp: 21, level: 3
exp: 22, level: 3
exp: 23, level: 3
exp: 24, level: 3
exp: 25, level: 4
exp: 26, level: 4
exp: 27, level: 4
exp: 28, level: 4
exp: 29, level: 4
exp: 30, level: 4
exp: 31, level: 4
exp: 32, level: 4
exp: 33, level: 4
exp: 34, level: 5
exp: 35, level: 5
exp: 36, level: 5
exp: 37, level: 5
exp: 38, level: 5
exp: 39, level: 5
exp: 40, level: 5
exp: 41, level: 5
exp: 42, level: 5
exp: 43, level: 5
exp: 44, level: 5
exp: 45, level: 6
exp: 46, level: 6
exp: 47, level: 6
exp: 48, level: 6
exp: 49, level: 6
exp: 50, level: 6
exp: 51, level: 6
exp: 52, level: 6
exp: 53, level: 6
exp: 54, level: 6
exp: 55, level: 6
exp: 56, level: 7
exp: 57, level: 7
exp: 58, level: 7
exp: 59, level: 7
exp: 60, level: 7
exp: 61, level: 7
exp: 62, level: 7
exp: 63, level: 7
exp: 64, level: 7
exp: 65, level: 7
exp: 66, level: 7
exp: 67, level: 7
exp: 68, level: 8
exp: 69, level: 8
exp: 70, level: 8
exp: 71, level: 8
exp: 72, level: 8
exp: 73, level: 8
exp: 74, level: 8
exp: 75, level: 8
exp: 76, level: 8
exp: 77, level: 8
exp: 78, level: 8
exp: 79, level: 8
exp: 80, level: 8
exp: 81, level: 8
exp: 82, level: 9
exp: 83, level: 9
exp: 84, level: 9
exp: 85, level: 9
exp: 86, level: 9
exp: 87, level: 9
exp: 88, level: 9
exp: 89, level: 9
exp: 90, level: 9
exp: 91, level: 9
exp: 92, level: 9
exp: 93, level: 9
exp: 94, level: 9
exp: 95, level: 10
exp: 96, level: 10
exp: 97, level: 10
exp: 98, level: 10
exp: 99, level: 10
exp: 100, level: 10
    */
  for (let exp = 0; exp <= maxExp; exp++) {
    const level = getLevel(exp);
    console.log(`exp: ${exp}, level: ${level}`);
  }
}
