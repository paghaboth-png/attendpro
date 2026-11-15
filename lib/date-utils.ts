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

/**
 * Calculate Payroll Preset Date Ranges
 * Cutoff day: e.g. 7 means cycle runs from 7th of a month to 6th of next month.
 */
export function getPayrollPresets(cutoffDay: number = 7, refDate?: Date) {
  const now = refDate || getNowPhnomPenh();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1; // 1-12
  const curD = now.getDate();

  // 1. This Month
  const thisMonthStart = formatYMD(curY, curM, 1);
  const thisMonthEnd = formatYMD(curY, curM, getDaysInMonth(curY, curM));

  // 2. Last Month
  const lastMObj = addMonths(curY, curM, -1);
  const lastMonthStart = formatYMD(lastMObj.year, lastMObj.month, 1);
  const lastMonthEnd = formatYMD(lastMObj.year, lastMObj.month, getDaysInMonth(lastMObj.year, lastMObj.month));

  // 3. First Half (1 - 15)
  const firstHalfStart = formatYMD(curY, curM, 1);
  const firstHalfEnd = formatYMD(curY, curM, 15);

  // 4. Second Half (16 - End of Month)
  const secondHalfStart = formatYMD(curY, curM, 16);
  const secondHalfEnd = formatYMD(curY, curM, getDaysInMonth(curY, curM));

  // 5. Cutoff Cycles (e.g. Cutoff = 7)
  // If today is >= cutoffDay (e.g. 15 >= 7):
  //   Current Cycle: this month's cutoff (e.g. Nov 7) to next month's cutoff-1 (e.g. Dec 6)
  //   Previous Cycle: last month's cutoff (e.g. Oct 7) to this month's cutoff-1 (e.g. Nov 6)
  // If today is < cutoffDay (e.g. 4 < 7):
  //   Current Cycle: last month's cutoff (e.g. Oct 7) to this month's cutoff-1 (e.g. Nov 6)
  //   Previous Cycle: 2 months ago's cutoff (e.g. Sep 7) to last month's cutoff-1 (e.g. Oct 6)
  let curCycleStartObj: { year: number; month: number };
  let curCycleEndObj: { year: number; month: number };

  let prevCycleStartObj: { year: number; month: number };
  let prevCycleEndObj: { year: number; month: number };

  if (curD >= cutoffDay) {
    curCycleStartObj = { year: curY, month: curM };
    curCycleEndObj = addMonths(curY, curM, 1);

    prevCycleStartObj = addMonths(curY, curM, -1);
    prevCycleEndObj = { year: curY, month: curM };
  } else {
    curCycleStartObj = addMonths(curY, curM, -1);
    curCycleEndObj = { year: curY, month: curM };

    prevCycleStartObj = addMonths(curY, curM, -2);
    prevCycleEndObj = addMonths(curY, curM, -1);
  }

  // Adjust end day: cutoffDay - 1
  // If cutoffDay is 1, end day is last day of previous month
  const getEndDay = (y: number, m: number, cDay: number) => {
    if (cDay <= 1) {
      return getDaysInMonth(y, m);
    }
    const candidate = cDay - 1;
    return Math.min(candidate, getDaysInMonth(y, m));
  };

  const getStartDay = (y: number, m: number, cDay: number) => {
    return Math.min(cDay, getDaysInMonth(y, m));
  };

  const currentCycleStart = formatYMD(
    curCycleStartObj.year,
    curCycleStartObj.month,
    getStartDay(curCycleStartObj.year, curCycleStartObj.month, cutoffDay)
  );
  const currentCycleEnd = formatYMD(
    curCycleEndObj.year,
    curCycleEndObj.month,
    getEndDay(curCycleEndObj.year, curCycleEndObj.month, cutoffDay)
  );

  const prevCycleStart = formatYMD(
    prevCycleStartObj.year,
    prevCycleStartObj.month,
    getStartDay(prevCycleStartObj.year, prevCycleStartObj.month, cutoffDay)
  );
  const prevCycleEnd = formatYMD(
    prevCycleEndObj.year,
    prevCycleEndObj.month,
    getEndDay(prevCycleEndObj.year, prevCycleEndObj.month, cutoffDay)
  );

  return {
    thisMonth: {
      key: "THIS_MONTH",
      label: "ខែនេះ (This Month)",
      start: thisMonthStart,
      end: thisMonthEnd,
    },
    lastMonth: {
      key: "LAST_MONTH",
      label: "ខែមុន (Last Month)",
      start: lastMonthStart,
      end: lastMonthEnd,
    },
    firstHalf: {
      key: "FIRST_HALF",
      label: "កន្លះខែដំបូង (1-15)",
      start: firstHalfStart,
      end: firstHalfEnd,
    },
    secondHalf: {
      key: "SECOND_HALF",
      label: "កន្លះខែក្រោយ (16-ចុងខែ)",
      start: secondHalfStart,
      end: secondHalfEnd,
    },
    prevCycle: {
      key: "PREV_CYCLE",
      label: `វដ្ដមុន (ទើបបិទ • ថ្ងៃទី ${cutoffDay})`,
      start: prevCycleStart,
      end: prevCycleEnd,
    },
    currentCycle: {
      key: "CURRENT_CYCLE",
      label: `វដ្ដនេះ (កំពុងដំណើរការ • ថ្ងៃទី ${cutoffDay})`,
      start: currentCycleStart,
      end: currentCycleEnd,
    },
  };
}
