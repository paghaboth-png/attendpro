/**
 * AttendPro Date Utilities
 * Handles timezone-safe date formatting and calculations for Asia/Phnom_Penh (UTC+7)
 */

export const KHMER_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

export const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Weekday headers: Sunday first (index 0)
export const KHMER_WEEKDAYS = ["អា", "ច", "អ", "ពុ", "ព្រ", "សុ", "ស"];
export const ENGLISH_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Get current date in Phnom Penh timezone (UTC+7)
 */
export function getNowPhnomPenh(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600000);
}

/**
 * Format year, month (1-12), day (1-31) to YYYY-MM-DD
 */
export function formatYMD(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date object to YYYY-MM-DD in Phnom Penh time
 */
export function formatDatePhnomPenh(date: Date): string {
  return formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Parse a YYYY-MM-DD string into year, month (1-12), day components.
 * Returns null if string is not a valid date.
 */
export function parseYMD(str: string): { year: number; month: number; day: number } | null {
  if (!str || typeof str !== "string") return null;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return null;

  return { year, month, day };
}

/**
 * Check if a YYYY-MM-DD string is valid
 */
export function isValidYMD(str: string): boolean {
  return parseYMD(str) !== null;
}

/**
 * Get total days in a month (1-12)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Add or subtract months from { year, month } (month: 1-12)
 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}
