"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Filter,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DatePicker } from "@/components/date-picker";

export default function ReportsPage() {
  const { t } = useI18n();

  // Phnom Penh Current Date
  const getTodayPP = () => {
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    return nowLocal;
  };

  const today = getTodayPP();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const defaultStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const defaultEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
    daysInMonth
  ).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [branchId, setBranchId] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        branchId,
        employeeId,
      });
      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, branchId, employeeId]);

  // Quick Preset Handlers
  const handlePreset = (type: "today" | "7days" | "month") => {
    const now = getTodayPP();
    const todayStr = now.toISOString().slice(0, 10);

    if (type === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === "7days") {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setStartDate(past7.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (type === "month") {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    setExporting(true);
    const params = new URLSearchParams({ startDate, endDate, branchId });
    window.location.href = `/api/reports/export?${params.toString()}`;
    setTimeout(() => setExporting(false), 2000);
  };

  // Print PDF
  const handlePrintPdf = () => {
    window.print();
  };

  const summary = reportData?.summary || {
    totalRecords: 0,
    goodRecords: 0,
    lateRecords: 0,
    totalOtHours: 0,
    totalWorkHours: 0,
    attendanceRate: 100,
    totalEmployees: 0,
  };

  const dailyTrends = reportData?.dailyTrends || [];
  const employeeSummaries = reportData?.employeeSummaries || [];
  const maxTrendTotal = Math.max(...dailyTrends.map((d: any) => d.total || 0), 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
      {/* Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>របាយការណ៍ និងស្ថិតិវត្តមាន (Analytics & Reports)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            សរុបស្ថិតិវត្តមាន មកយឺត អវត្តមាន ច្បាប់ និងម៉ោង Overtime ព្រមទាំងទាញយកជា Excel / PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Excel Button */}
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
            title="ទាញយកជា Excel Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? "កំពុងទាញយក..." : "ទាញយក Excel"}</span>
          </button>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
            title="បោះពុម្ព ឬរក្សាទុកជា PDF"
          >
            <Printer className="w-4 h-4" />
            <span>បោះពុម្ព / PDF</span>
          </button>
        </div>
      </div>

      {/* Print Title Header (Visible only when Printing) */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-900 font-sans">
          TheDemo Coffee — របាយការណ៍វត្តមាន និងម៉ោងធ្វើការ
        </h1>
        <p className="text-xs text-slate-600 mt-1 font-mono">
          កាលបរិច្ឆេទ៖ {startDate} ដល់ {endDate} • សាខា៖ THE ONE COFFEE (ស្វាយរៀង)
        </p>
      </div>

      {/* Filter Bar (Hidden on Print) */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>កំណត់លក្ខខណ្ឌរបាយការណ៍ (Report Range & Filters)</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handlePreset("today")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
            >
              ថ្ងៃនេះ
            </button>
            <button
              type="button"
              onClick={() => handlePreset("7days")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
            >
              ៧ ថ្ងៃចុងក្រោយ
            </button>
            <button
              type="button"
              onClick={() => handlePreset("month")}
              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-semibold"
            >
              ខែនេះ (This Month)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <DatePicker
              label="ចាប់ពីថ្ងៃ"
              value={startDate}
              onChange={(s) => {
                setStartDate(s);
                if (endDate && s > endDate) setEndDate(s);
              }}
              maxDate={endDate || undefined}
            />
          </div>

          <div>
            <DatePicker
              label="រហូតដល់ថ្ងៃ"
              value={endDate}
              onChange={(e) => {
                setEndDate(e);
                if (startDate && e < startDate) setStartDate(e);
              }}
              minDate={startDate || undefined}
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">សាខា</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">គ្រប់សាខាទាំងអស់</option>
              {reportData?.branches?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">បុគ្គលិក</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">បុគ្គលិកទាំងអស់ ({employeeSummaries.length} នាក់)</option>
              {employeeSummaries.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} - {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:bg-white print:border-slate-300">
          <div className="text-[11px] text-slate-400 font-medium">វត្តមានសរុប (Records)</div>
          <div className="text-2xl font-black text-white print:text-slate-900 font-mono mt-1">
            {summary.totalRecords}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            អត្រាវត្តមាន៖ <strong className="text-emerald-400">{summary.attendanceRate}%</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:bg-white print:border-slate-300">
          <div className="text-[11px] text-slate-400 font-medium">ទាន់ពេល (GOOD)</div>
          <div className="text-2xl font-black text-emerald-400 print:text-emerald-700 font-mono mt-1">
            {summary.goodRecords}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            មកទាន់ម៉ោងកំណត់
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:bg-white print:border-slate-300">
          <div className="text-[11px] text-slate-400 font-medium">មកយឺត (LATE)</div>
          <div className="text-2xl font-black text-amber-400 print:text-amber-700 font-mono mt-1">
            {summary.lateRecords}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            លើសម៉ោងអនុគ្រោះ
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:bg-white print:border-slate-300">
          <div className="text-[11px] text-slate-400 font-medium">ថែមម៉ោង (Overtime)</div>
          <div className="text-2xl font-black text-blue-400 print:text-blue-700 font-mono mt-1">
            {summary.totalOtHours}h
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            ម៉ោង OT អនុម័តសរុប
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:bg-white print:border-slate-300 col-span-2 lg:col-span-1">
          <div className="text-[11px] text-slate-400 font-medium">ម៉ោងធ្វើការប៉ាន់ស្មាន</div>
          <div className="text-2xl font-black text-purple-400 print:text-purple-700 font-mono mt-1">
            {summary.totalWorkHours}h
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            សរុបគ្រប់បុគ្គលិក
          </div>
        </div>
      </div>

      {/* Visual Analytics Chart (Hidden on Print) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>និន្នាការវត្តមានប្រចាំថ្ងៃ (Daily Attendance Trend)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>ទាន់ពេល (Good)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>មកយឺត (Late)</span>
            </span>
          </div>
        </div>

        {dailyTrends.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            មិនមានទិន្នន័យដើម្បីគូសក្រាហ្វិកឡើយ
          </div>
        ) : (
          <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-800 overflow-x-auto">
            {dailyTrends.map((t: any) => {
              const goodH = Math.round((t.good / maxTrendTotal) * 110);
              const lateH = Math.round((t.late / maxTrendTotal) * 110);

              return (
                <div
                  key={t.date}
                  className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group relative"
                >
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    {/* Good Bar */}
                    <div
                      style={{ height: `${Math.max(4, goodH)}px` }}
                      className="w-3 rounded-t-md bg-emerald-500 group-hover:bg-emerald-400 transition"
                      title={`Good: ${t.good}`}
                    />
                    {/* Late Bar */}
                    <div
                      style={{ height: `${Math.max(4, lateH)}px` }}
                      className="w-3 rounded-t-md bg-amber-500 group-hover:bg-amber-400 transition"
                      title={`Late: ${t.late}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[40px]">
                    {t.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per Employee Summary Table (Included in Print) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm print:bg-white print:border-slate-300 print:rounded-none">
        <div className="p-4 border-b border-slate-800 print:border-slate-300 flex items-center justify-between">
          <div className="text-xs font-bold text-white print:text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400 print:text-blue-600" />
            <span>តារាងសរុបវត្តមាន និងម៉ោងធ្វើការតាមបុគ្គលិកម្នាក់ៗ (Per Employee Summary)</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            <span>កំពុងគណនារបាយការណ៍...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 print:border-slate-300 text-slate-400 print:text-slate-700 uppercase text-[10px] bg-slate-950/40 print:bg-slate-100">
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">កូដ</th>
                  <th className="py-3 px-3.5">ឈ្មោះបុគ្គលិក</th>
                  <th className="py-3 px-3.5">តួនាទី / ផ្នែក</th>
                  <th className="py-3 px-3.5 text-center">ថ្ងៃវត្តមានសរុប</th>
                  <th className="py-3 px-3.5 text-center">ទាន់ពេល (Good)</th>
                  <th className="py-3 px-3.5 text-center">មកយឺត (Late)</th>
                  <th className="py-3 px-3.5 text-center">ច្បាប់ (Leaves)</th>
                  <th className="py-3 px-3.5 text-center">ថែមម៉ោង (OT)</th>
                  <th className="py-3 px-3.5 text-right">ម៉ោងធ្វើការសរុប</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 font-mono">
                {employeeSummaries.map((emp: any, idx: number) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-800/40 print:hover:bg-transparent transition"
                  >
                    <td className="py-3 px-3.5 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3.5 text-blue-400 print:text-blue-700 font-bold">
                      {emp.code}
                    </td>
                    <td className="py-3 px-3.5 font-sans font-bold text-white print:text-slate-900">
                      {emp.name}
                    </td>
                    <td className="py-3 px-3.5 font-sans text-slate-400 print:text-slate-600 text-[11px]">
                      {emp.positionName} • {emp.departmentName}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-white print:text-slate-900">
                      {emp.totalDays} ថ្ងៃ
                    </td>
                    <td className="py-3 px-3.5 text-center text-emerald-400 print:text-emerald-700 font-bold">
                      {emp.goodDays}
                    </td>
                    <td className="py-3 px-3.5 text-center text-amber-400 print:text-amber-700 font-bold">
                      {emp.lateDays}
                    </td>
                    <td className="py-3 px-3.5 text-center text-blue-400 print:text-blue-700">
                      {emp.leaveDays} ថ្ងៃ
                    </td>
                    <td className="py-3 px-3.5 text-center text-purple-400 print:text-purple-700">
                      {emp.otHours}h
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-400 print:text-emerald-800">
                      {emp.totalHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-300">
        <div>ប្រព័ន្ធ AttendPro — TheDemo Coffee</div>
        <div>បោះពុម្ពនៅម៉ោង៖ {new Date().toLocaleString("km-KH", { timeZone: "Asia/Phnom_Penh" })}</div>
      </div>
    </div>
  );
}
