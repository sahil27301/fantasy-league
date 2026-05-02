export const WINDOW_RANGES = [
  { windowIndex: 1 as const, fromMatch: 1, toMatch: 35 },
  { windowIndex: 2 as const, fromMatch: 36, toMatch: 70 },
  { windowIndex: 3 as const, fromMatch: 71, toMatch: 999 },
];

export function resolveWindowIndex(matchNumber: number): 1 | 2 | 3 {
  if (matchNumber <= 35) {
    return 1;
  }
  if (matchNumber <= 70) {
    return 2;
  }
  return 3;
}
