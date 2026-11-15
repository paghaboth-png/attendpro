/**
 * AttendPro Payroll Calculation Engine
 * Supports flexible date ranges, shift workdays, holiday deductions,
 * proration formulas, and joined/resigned mid-period adjustments.
 */

export interface CalculationInput {
  employee: {
    id: string;
    code: string;
    name: string;
    baseSalary: number;
    salaryType: string; // MONTHLY | DAILY | HOURLY
    workDaysPerMonth?: number;
    createdAt: Date;
    isActive: boolean;
    shift?: {
      workDays: string; // e.g. "1,2,3,4,5,6"
    } | null;
  };
  startDate: Date;
  endDate: Date;
  attendances: Array<{
    date: string;
    status: string;
  }>;
  overtimes: Array<{
    date: Date;
    hours: number;
  }>;
  leaves: Array<{
    fromDate: Date;
    toDate: Date;
    isPaid: boolean;
  }>;
  holidays: Array<{
    date: Date;
  }>;
  settings: {
    latePenaltyAmount: number;
    absentPenaltyRate: number;
    overtimeMultiplier: number;
    taxEnabled: boolean;
    nssfEnabled: boolean;
    prorationFormula?: string; // "ACTUAL_RATIO" | "FIXED_26" | "CALENDAR_DAYS"
  };
  manualAdjustments?: {
    allowance?: number;
    bonus?: number;
    deduction?: number;
    latePenalty?: number;
    absentPenalty?: number;
    note?: string;
    isEdited?: boolean;
  };
}

export interface CalculationResult {
  baseSalary: number;
  salaryType: string;
  workDays: number; // total expected workdays in period
  totalMonthWorkDays: number; // workdays in full month
  actualDays: number; // days employee was present
  workDaysRatio: number; // ratio of period workdays
  proratedBase: number; // base salary after proration
  lateCount: number;
  latePenalty: number;
  absentDays: number;
  absentPenalty: number;
  otHours: number;
  otPay: number;
  allowance: number;
  bonus: number;
  deduction: number;
  grossPay: number;
  taxDeduction: number;
  nssfDeduction: number;
  netPay: number;
  dailyRate: number;
  hourlyRate: number;
  note?: string;
  isEdited: boolean;
}

/**
 * Checks whether a given Date is a shift workday and not a holiday
 */
function isWorkday(d: Date, shiftDays: number[], holidayTimestamps: Set<number>): boolean {
  // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = d.getUTCDay();
  if (!shiftDays.includes(dayOfWeek)) {
    return false;
  }
  // Check if date falls on holiday (UTC day match)
  const dTime = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (holidayTimestamps.has(dTime)) {
    return false;
  }
  return true;
}

/**
 * Counts shift workdays between two dates (inclusive)
 */
export function countShiftWorkdays(
  start: Date,
  end: Date,
  shiftWorkDaysStr = "1,2,3,4,5,6",
  holidays: Date[] = []
): number {
  const shiftDays = shiftWorkDaysStr
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((n) => !isNaN(n));

  const holidayTimestamps = new Set(
    holidays.map((h) => Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), h.getUTCDate()))
  );

  let count = 0;
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cur <= endUtc) {
    if (isWorkday(cur, shiftDays, holidayTimestamps)) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return count;
}

export function calculateEmployeePayroll(input: CalculationInput): CalculationResult {
  const { employee, startDate, endDate, attendances, overtimes, leaves, holidays, settings, manualAdjustments } = input;

  const baseSalary = employee.baseSalary || 0;
  const salaryType = employee.salaryType || "MONTHLY";
  const standardWorkDays = employee.workDaysPerMonth || 26;
  const shiftWorkDaysStr = employee.shift?.workDays || "1,2,3,4,5,6";
  const holidayDates = holidays.map((h) => new Date(h.date));

  // Determine active date boundaries for employee (in case joined mid-period)
  const empJoinDate = new Date(employee.createdAt);
  const effectiveStart = empJoinDate > startDate ? empJoinDate : startDate;
  const effectiveEnd = endDate;

  // 1. Calculate shift workdays in this period
  const periodWorkdays = countShiftWorkdays(effectiveStart, effectiveEnd, shiftWorkDaysStr, holidayDates);

  // 2. Calculate shift workdays in the full month of startDate
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const monthStart = new Date(Date.UTC(startYear, startMonth, 1));
  const monthEnd = new Date(Date.UTC(startYear, startMonth + 1, 0));
  const fullMonthWorkdays = Math.max(1, countShiftWorkdays(monthStart, monthEnd, shiftWorkDaysStr, holidayDates));

  // 3. Proration Ratio (Actual Workdays Ratio Formula)
  // Check if period is full month
  const isFullMonth =
    startDate.getUTCDate() === 1 &&
    endDate.getUTCDate() === monthEnd.getUTCDate() &&
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    empJoinDate <= startDate;

  let workDaysRatio = 1.0;
  let proratedBase = baseSalary;

  if (salaryType === "MONTHLY") {
    if (!isFullMonth) {
      if (settings.prorationFormula === "FIXED_26") {
        workDaysRatio = Math.min(1.0, periodWorkdays / standardWorkDays);
        proratedBase = Math.round((baseSalary / standardWorkDays) * periodWorkdays * 100) / 100;
      } else if (settings.prorationFormula === "CALENDAR_DAYS") {
        const calDaysInMonth = monthEnd.getUTCDate();
        const calDaysInPeriod = Math.max(1, Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        workDaysRatio = Math.min(1.0, calDaysInPeriod / calDaysInMonth);
        proratedBase = Math.round((baseSalary / calDaysInMonth) * calDaysInPeriod * 100) / 100;
      } else {
        // ACTUAL_RATIO (Default chosen by user)
        workDaysRatio = Math.min(1.0, periodWorkdays / fullMonthWorkdays);
        proratedBase = Math.round(baseSalary * workDaysRatio * 100) / 100;
      }
    }
  }

  // Daily rate for penalties and daily workers
  const dailyRate = Math.round((baseSalary / (employee.workDaysPerMonth || 26)) * 100) / 100;
  const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;

  // Actual attendances in this period
  const actualDays = attendances.length;
  const lateCount = attendances.filter((a) => a.status === "LATE").length;
  const latePenalty = manualAdjustments?.isEdited && manualAdjustments.latePenalty !== undefined
    ? (manualAdjustments as any).latePenalty
    : Math.round(lateCount * settings.latePenaltyAmount * 100) / 100;

  // Paid leaves count
  let paidLeaveDays = 0;
  for (const l of leaves) {
    if (l.isPaid) paidLeaveDays += 1;
  }

  // Absent days in period
  // Absences = workdays in period - (attended days + paid leaves)
  const absentDays = Math.max(0, periodWorkdays - (actualDays + paidLeaveDays));
  const absentPenalty = manualAdjustments?.isEdited && manualAdjustments.absentPenalty !== undefined
    ? (manualAdjustments as any).absentPenalty
    : Math.round(absentDays * dailyRate * settings.absentPenaltyRate * 100) / 100;

  // Overtime
  const otHours = overtimes.reduce((sum, o) => sum + o.hours, 0);
  const otPay = Math.round(otHours * hourlyRate * settings.overtimeMultiplier * 100) / 100;

  // Adjustments for DAILY and HOURLY
  if (salaryType === "DAILY") {
    proratedBase = Math.round(baseSalary * actualDays * 100) / 100;
  } else if (salaryType === "HOURLY") {
    proratedBase = Math.round(baseSalary * (actualDays * 8) * 100) / 100;
  }

  // Manual Adjustments
  const allowance = manualAdjustments?.allowance || 0;
  const bonus = manualAdjustments?.bonus || 0;
  const deduction = manualAdjustments?.deduction || 0;
  const note = manualAdjustments?.note;
  const isEdited = Boolean(manualAdjustments?.isEdited);

  // Gross Pay
  const grossPay = Math.round((proratedBase + otPay + allowance + bonus) * 100) / 100;

  // Tax & NSSF
  const nssfDeduction = settings.nssfEnabled ? Math.round(proratedBase * 0.02 * 100) / 100 : 0;
  const taxableSalary = Math.max(0, grossPay - nssfDeduction);
  let taxDeduction = 0;
  if (settings.taxEnabled && taxableSalary > 375) {
    taxDeduction = Math.round((taxableSalary - 375) * 0.05 * 100) / 100;
  }

  // Net Pay = Gross - (Late Penalty + Absent Penalty + Deduction + Tax + NSSF)
  const totalDeductions = Math.round((latePenalty + absentPenalty + deduction + taxDeduction + nssfDeduction) * 100) / 100;
  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100);

  return {
    baseSalary,
    salaryType,
    workDays: periodWorkdays,
    totalMonthWorkDays: fullMonthWorkdays,
    actualDays,
    workDaysRatio: Math.round(workDaysRatio * 1000) / 1000,
    proratedBase,
    lateCount,
    latePenalty,
    absentDays,
    absentPenalty,
    otHours,
    otPay,
    allowance,
    bonus,
    deduction,
    grossPay,
    taxDeduction,
    nssfDeduction,
    netPay,
    dailyRate,
    hourlyRate,
    note,
    isEdited,
  };
}
