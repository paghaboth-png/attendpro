"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, AlertCircle } from "lucide-react";
import {
  KHMER_MONTHS,
  ENGLISH_MONTHS,
  KHMER_WEEKDAYS,
  ENGLISH_WEEKDAYS,
  formatYMD,
  parseYMD,
  getDaysInMonth,
  addMonths,
  getNowPhnomPenh,
} from "@/lib/date-utils";
import { useI18n } from "@/lib/i18n";

export interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  defaultViewDate?: string; // YYYY-MM-DD (month to view when value is empty)
  className?: string;
  inputClassName?: string;
  name?: string;
  id?: string;
  autoCloseOnSelect?: boolean;
  showQuickToday?: boolean;
  error?: string | null;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "yyyy-MM-dd",
  label,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  defaultViewDate,
  className = "",
  inputClassName = "",
  name,
  id,
  autoCloseOnSelect = true,
  showQuickToday = true,
  error: customError,
}: DatePickerProps) {
  const { locale } = useI18n();
  const isKhmer = locale === "km";

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value || "");
  const [formatError, setFormatError] = useState<string | null>(null);

  // Month & Year currently being viewed in the calendar
  const today = getNowPhnomPenh();
  const todayYMD = formatYMD(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const initialParsed = parseYMD(value) || parseYMD(defaultViewDate || "") || {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };

  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonth, setViewMonth] = useState(initialParsed.month); // 1-12
  const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);

  // Sync internal typed value with external prop
  useEffect(() => {
    setTypedValue(value || "");
    if (value) {
      const parsed = parseYMD(value);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
        setFormatError(null);
      }
    } else if (defaultViewDate) {
      const parsed = parseYMD(defaultViewDate);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      }
    }
  }, [value, defaultViewDate]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthYearPickerOpen(false);
        // Validate typed value on blur
        if (typedValue && !parseYMD(typedValue)) {
          setFormatError(isKhmer ? "ទ្រង់ទ្រាយថ្ងៃមិនត្រឹមត្រូវ ឧ. 2026-10-07" : "Invalid date format, e.g. 2026-10-07");
        } else {
          setFormatError(null);
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsMonthYearPickerOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, typedValue, isKhmer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTypedValue(raw);

    if (!raw.trim()) {
      setFormatError(null);
      onChange("");
      return;
    }

    const parsed = parseYMD(raw);
    if (parsed) {
      setFormatError(null);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      onChange(raw);
    } else {
      if (raw.length >= 10) {
        setFormatError(isKhmer ? "ទ្រង់ទ្រាយថ្ងៃមិនត្រឹមត្រូវ ឧ. 2026-10-07" : "Invalid date format, e.g. 2026-10-07");
      }
    }
  };

  const handleInputBlur = () => {
    if (!typedValue) {
      setFormatError(null);
      return;
    }
    if (!parseYMD(typedValue)) {
      setFormatError(isKhmer ? "ទ្រង់ទ្រាយថ្ងៃមិនត្រឹមត្រូវ ឧ. 2026-10-07" : "Invalid date format, e.g. 2026-10-07");
    } else {
      setFormatError(null);
    }
  };

  const selectDate = (y: number, m: number, d: number) => {
    const ymd = formatYMD(y, m, d);
    setTypedValue(ymd);
    setFormatError(null);
    onChange(ymd);
    if (autoCloseOnSelect) {
      setIsOpen(false);
      setIsMonthYearPickerOpen(false);
    }
  };

  const selectToday = () => {
    selectDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = addMonths(viewYear, viewMonth, -1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = addMonths(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  // Generate 7x5 or 7x6 day grid
  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  // Day of week of the 1st day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();

  const prevMonthObj = addMonths(viewYear, viewMonth, -1);
  const daysInPrevMonth = getDaysInMonth(prevMonthObj.year, prevMonthObj.month);

  const cells: Array<{
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    ymd: string;
    isDisabled: boolean;
    isSelected: boolean;
    isToday: boolean;
  }> = [];

  // 1. Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const ymd = formatYMD(prevMonthObj.year, prevMonthObj.month, d);
    const isDisabled = Boolean((minDate && ymd < minDate) || (maxDate && ymd > maxDate));
    cells.push({
      day: d,
      month: prevMonthObj.month,
      year: prevMonthObj.year,
      isCurrentMonth: false,
      ymd,
      isDisabled,
      isSelected: ymd === value,
      isToday: ymd === todayYMD,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const ymd = formatYMD(viewYear, viewMonth, d);
    const isDisabled = Boolean((minDate && ymd < minDate) || (maxDate && ymd > maxDate));
    cells.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
      ymd,
      isDisabled,
      isSelected: ymd === value,
      isToday: ymd === todayYMD,
    });
  }

  // 3. Next month leading days (to fill 35 or 42 cells)
  const nextMonthObj = addMonths(viewYear, viewMonth, 1);
  const totalCells = cells.length > 35 ? 42 : 35;
  const remaining = totalCells - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const ymd = formatYMD(nextMonthObj.year, nextMonthObj.month, d);
    const isDisabled = Boolean((minDate && ymd < minDate) || (maxDate && ymd > maxDate));
    cells.push({
      day: d,
      month: nextMonthObj.month,
      year: nextMonthObj.year,
      isCurrentMonth: false,
      ymd,
      isDisabled,
      isSelected: ymd === value,
      isToday: ymd === todayYMD,
    });
  }

  const weekdays = isKhmer ? KHMER_WEEKDAYS : ENGLISH_WEEKDAYS;
  const monthName = isKhmer ? KHMER_MONTHS[viewMonth - 1] : ENGLISH_MONTHS[viewMonth - 1];

  const hasError = Boolean(customError || formatError);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs sm:text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Date Input with Calendar Icon Button */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          value={typedValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full pl-3.5 pr-11 py-2 bg-white dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 transition focus:outline-none ${
            hasError
              ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
              : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : "cursor-pointer"} ${inputClassName}`}
        />

        {/* Clear button (if value exists and not disabled) */}
        {typedValue && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setTypedValue("");
              setFormatError(null);
              onChange("");
            }}
            className="absolute right-9 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1"
            title={isKhmer ? "លុប" : "Clear"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Calendar Trigger Button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`absolute right-1.5 p-1.5 rounded-lg border transition flex items-center justify-center ${
            isOpen
              ? "bg-blue-600 border-blue-500 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          title={isKhmer ? "បើកប្រតិទិន" : "Open Calendar"}
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Validation Error Message */}
      {hasError && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{customError || formatError}</span>
        </div>
      )}

      {/* Popover Calendar */}
      {isOpen && !disabled && (
        <div
          className="date-picker-popover absolute left-0 top-full mt-1.5 z-50 w-[290px] sm:w-[305px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-md p-3.5 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Header: Prev, Month+Year, Next */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-700/50 flex items-center justify-center"
              title={isKhmer ? "ខែមុន" : "Previous Month"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMonthYearPickerOpen(!isMonthYearPickerOpen)}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white transition flex items-center gap-1.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <span>{monthName}</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">{viewYear}</span>
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-700/50 flex items-center justify-center"
              title={isKhmer ? "ខែបន្ទាប់" : "Next Month"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Month & Year Picker Overlay */}
          {isMonthYearPickerOpen ? (
            <div className="py-3 space-y-3">
              <div className="flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={() => setViewYear(viewYear - 1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 font-bold"
                >
                  ‹
                </button>
                <span className="font-bold text-sm font-mono text-blue-400">{viewYear}</span>
                <button
                  type="button"
                  onClick={() => setViewYear(viewYear + 1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 font-bold"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(isKhmer ? KHMER_MONTHS : ENGLISH_MONTHS).map((mName, idx) => {
                  const mNum = idx + 1;
                  const isCurrent = mNum === viewMonth;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setViewMonth(mNum);
                        setIsMonthYearPickerOpen(false);
                      }}
                      className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800"
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Weekday Headers (Sun -> Sat) */}
              <div className="grid grid-cols-7 gap-1 pt-2.5 pb-1">
                {weekdays.map((w, idx) => (
                  <div
                    key={w}
                    className={`text-center text-[10px] sm:text-[11px] font-semibold py-1 ${
                      idx === 0 ? "text-rose-400/90" : idx === 6 ? "text-amber-400/90" : "text-slate-400"
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                  let cellClasses =
                    "relative h-9 w-9 sm:h-9.5 sm:w-9.5 mx-auto rounded-xl flex items-center justify-center text-xs sm:text-xs font-medium transition cursor-pointer";

                  if (cell.isDisabled) {
                    cellClasses += " opacity-25 cursor-not-allowed text-slate-600 pointer-events-none";
                  } else if (cell.isSelected) {
                    cellClasses += " bg-blue-600 text-white font-bold shadow-md shadow-blue-600/40 ring-2 ring-blue-400/50";
                  } else if (cell.isToday) {
                    cellClasses += " border border-blue-500 text-blue-600 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20";
                  } else if (cell.isCurrentMonth) {
                    cellClasses += " text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white";
                  } else {
                    // Previous or next month day -> lighter gray, clickable
                    cellClasses += " text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-600 dark:hover:text-slate-300";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={cell.isDisabled}
                      onClick={() => {
                        if (!cell.isDisabled) {
                          selectDate(cell.year, cell.month, cell.day);
                        }
                      }}
                      className={cellClasses}
                    >
                      <span>{cell.day}</span>
                      {cell.isToday && !cell.isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            {showQuickToday ? (
              <button
                type="button"
                onClick={selectToday}
                className="px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-semibold transition"
              >
                {isKhmer ? "ថ្ងៃនេះ" : "Today"}
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsMonthYearPickerOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
            >
              {isKhmer ? "បិទ" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
