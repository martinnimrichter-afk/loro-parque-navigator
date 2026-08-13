export type ShowStatus = 'easy' | 'rush' | 'missed';

export const SEAT_BUFFER_MIN = 5;
/** Jogging covers the same route in ~60 % of the walking time. */
export const JOG_TIME_FACTOR = 0.6;

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function nextTime(times: string[], nowMin: number): string | null {
  return times.find((t) => hhmmToMinutes(t) >= nowMin) ?? null;
}

export function assess(showStartMin: number, nowMin: number, walkMin: number): ShowStatus {
  const available = showStartMin - nowMin;
  if (available < 0) return 'missed';
  if (walkMin + SEAT_BUFFER_MIN <= available) return 'easy';
  if (walkMin * JOG_TIME_FACTOR <= available) return 'rush';
  return 'missed';
}
