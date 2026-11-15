"use client";

import React, { useState, useEffect } from "react";
import { getPayrollPresets } from "@/lib/date-utils";
import { Sparkles, Check } from "lucide-react";

export interface PayrollDatePresetsProps {
  startDate: string;
  endDate: string;
  cutoffDay?: number;
  onSelect: (start: string, end: string, presetKey: string) => void;
  className?: string;
}

export function PayrollDatePresets({
  startDate,
  endDate,
  cutoffDay = 7,
  onSelect,
  className = "",
}: PayrollDatePresetsProps) {
  const presets = getPayrollPresets(cutoffDay);

  const presetList = [
    presets.thisMonth,
    presets.lastMonth,
    presets.firstHalf,
    presets.secondHalf,
    presets.prevCycle,
    presets.currentCycle,
  ];

  // Determine which preset is currently active (if any matches startDate and endDate)
  const activePreset = presetList.find(
    (p) => p.start === startDate && p.end === endDate
  );

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>ជម្រើសរហ័ស (Quick Presets)</span>
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          វដ្ដកាត់ប្រាក់ខែ៖ ថ្ងៃទី {cutoffDay} នៃខែ
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {presetList.map((p) => {
          const isActive = activePreset?.key === p.key;

          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelect(p.start, p.end, p.key)}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                isActive
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30"
                  : "bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-xs font-bold truncate ${isActive ? "text-blue-300" : "text-white"}`}>
                  {p.label.split("(")[0].trim()}
                </span>
                {isActive && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              </div>

              <div className="text-[10px] font-mono text-slate-400 truncate">
                {p.start.slice(5)} ~ {p.end.slice(5)}
              </div>
              <div className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
                {p.start} ➜ {p.end}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
