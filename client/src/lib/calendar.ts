export const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** Convert Date.getDay() (0=Sun) to Mon-based Chinese weekday label */
export const dayName = (date: Date): string =>
  DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1];

/** Pixels per hour in the time grid (1px = 1 minute) */
export const HOUR_HEIGHT = 60;

/** 0–23 hour indices for rendering time axis ticks */
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
