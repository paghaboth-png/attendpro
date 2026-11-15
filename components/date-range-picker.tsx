"use client";

import React from "react";
import { DatePicker } from "./date-picker";
import { AlertCircle, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { parseYMD } from "@/lib/date-utils";

export interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  startLabel?: string;
  endLabel?: string;
  required?: boolean;
  disabled?: boolean;
  maxDaysRange?: number; // default: 62 days
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  startLabel = "ចាប់ពីថ្ងៃ (From Date)",
  endLabel = "ដល់ថ្ងៃ (To Date)",
  required = true,
  disabled = false,
  maxDaysRange = 62,
  className = "",
}: DateRangePickerProps) {
  const { locale } = useI18n();
  const isKhmer = locale === "km";

  const handleStartChange = (newStart: string) => {
    if (!newStart) {
      onChange("", endDate);
      return;
    }

    // Rule: If newStart > endDate, auto-adjust endDate = newStart
    if (endDate && newStart > endDate) {
      onChange(newStart, newStart);
    } else {
      onChange(newStart, endDate);
    }
  };

  const handleEndChange = (newEnd: string) => {
    if (!newEnd) {
      onChange(startDate, "");
      return;
    }

    // Rule: If newEnd < startDate, auto-adjust startDate = newEnd
    if (startDate && newEnd < startDate) {
      onChange(newEnd, newEnd);
    } else {
      onChange(startDate, newEnd);
    }
  };

  // Calculate range days difference
  let rangeExceeded = false;
  let diffDays = 0;
  if (startDate && endDate && parseYMD(startDate) && parseYMD(endDate)) {
    const sTime = new Date(`${startDate}T00:00:00.000Z`).getTime();
    const eTime = new Date(`${endDate}T00:00:00.000Z`).getTime();
    diffDays = Math.round((eTime - sTime) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > maxDaysRange) {
      rangeExceeded = true;
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <DatePicker
            label={startLabel}
            required={required}
            disabled={disabled}
            value={startDate}
            onChange={handleStartChange}
            maxDate={endDate || undefined}
            defaultViewDate={startDate || undefined}
          />
        </div>

        <div>
          <DatePicker
            label={endLabel}
            required={required}
            disabled={disabled}
            value={endDate}
            onChange={handleEndChange}
            minDate={startDate || undefined}
            defaultViewDate={startDate || endDate || undefined}
          />
        </div>
      </div>

      {rangeExceeded && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>
            {isKhmer
              ? `ចន្លោះកាលបរិច្ឆេទលើសពី ${maxDaysRange} ថ្ងៃ (បច្ចុប្បន្ន ${diffDays} ថ្ងៃ)។ សូមជ្រើសរើសចន្លោះតូចជាងនេះ!`
              : `Date range exceeds ${maxDaysRange} days (currently ${diffDays} days). Please select a shorter range!`}
          </span>
        </div>
      )}
    </div>
  );
}
