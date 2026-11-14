"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import {
  Users,
  CheckCircle,
  ClockAlert,
  XCircle,
  Hourglass,
  CalendarDays,
  Coffee,
  RotateCw,
  Calendar,
  Building2,
  MapPin,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useI18n();

  // Phnom Penh Default Date (UTC+7)
  const getTodayPP = () => {
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    return nowLocal.toISOString().slice(0, 10);
  };

  const [date, setDate] = useState(getTodayPP());
  const [branchId, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState<any[]>([]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Fetch branches
  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setBranches(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch stats and lists
  const fetchDashboardStats = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const res = await fetch(
          `/api/dashboard/stats?date=${date}&branchId=${branchId}`
        );
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch {}
      setLoading(false);
      setRefreshing(false);
      setCountdown(60);
    },
    [date, branchId]
  );

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // 60-second auto-refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardStats();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchDashboardStats]);

  const counts = data?.counts || {
    activeEmployees: 0,
    hiddenInReport: 0,
    attendances: 0,
    requestLeaves: 0,
    absents: 0,
    notYetStarted: 0,
    holiday: 0,
    dayoff: 0,
  };

  const statCards = [
    {
      title: "Active Employees",
      khTitle: "បុគ្គលិកសកម្ម",
      value: counts.activeEmployees,
      subtext: `លាក់ក្នុងរបាយការណ៍: ${counts.hiddenInReport}`,
      icon: Users,
      color: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      countColor: "text-blue-400",
    },
    {
      title: "Attendances",
      khTitle: "វត្តមានថ្ងៃនេះ",
      value: counts.attendances,
      subtext: "បុគ្គលិកបាន Check-in",
      icon: CheckCircle,
      color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      countColor: "text-emerald-400",
    },
    {
      title: "Request Leaves",
      khTitle: "សុំច្បាប់សម្រាក",
      value: counts.requestLeaves,
      subtext: "ច្បាប់ត្រូវបានអនុម័ត",
      icon: ClockAlert,
      color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      countColor: "text-amber-400",
    },
    {
      title: "Absents",
      khTitle: "អវត្តមាន (ខកខាន)",
      value: counts.absents,
      subtext: "មិនបានមកធ្វើការ",
      icon: XCircle,
      color: "border-rose-500/30 bg-rose-500/10 text-rose-400",
      countColor: "text-rose-400",
    },
    {
      title: "Not Yet Started",
      khTitle: "មិនទាន់ដល់ម៉ោង",
      value: counts.notYetStarted,
      subtext: "វេនមិនទាន់ចាប់ផ្តើម",
      icon: Hourglass,
      color: "border-slate-600/40 bg-slate-800/60 text-slate-400",
      countColor: "text-slate-300",
    },
    {
      title: "Holiday",
      khTitle: "ថ្ងៃបុណ្យជាតិ",
      value: counts.holiday,
      subtext: "ឈប់សម្រាកបុណ្យ",
      icon: CalendarDays,
      color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      countColor: "text-emerald-400",
    },
    {
      title: "Dayoff",
      khTitle: "ថ្ងៃសម្រាកវេន",
      value: counts.dayoff,
      subtext: "សម្រាកប្រចាំសប្តាហ៍",
      icon: Coffee,
      color: "border-sky-500/30 bg-sky-500/10 text-sky-400",
      countColor: "text-sky-400",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Filter and Live Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs text-white">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white font-mono focus:outline-none cursor-pointer"
            />
          </div>

          {/* Branch Select */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800 text-xs text-white">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <select
              value={branchId}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="all">សាខាទាំងអស់ (All Branches)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Auto-refresh and Manual Refresh Button */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Update in: {countdown}s</span>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => fetchDashboardStats(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
            title="ទាញយកទិន្នន័យថ្មីភ្លាមៗ"
          >
            <RotateCw
              className={`w-4 h-4 text-blue-400 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 7 Colored Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-slate-900 border shadow-xs flex flex-col justify-between transition hover:scale-[1.02] ${card.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {card.khTitle}
                </span>
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
              </div>
              <div>
                <div className={`text-2xl font-black ${card.countColor}`}>
                  {loading ? "..." : card.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Dual Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Table: Attendances (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>បញ្ជីវត្តមានផ្ទាល់ (Attendances)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                បុគ្គលិកដែលបាន Check-in ក្នុងថ្ងៃនេះ ({data?.attendances?.length ?? 0} នាក់)
              </p>
            </div>

            <Link
              href="/attendances"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>មើលទាំងអស់</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t("loading")}
            </div>
          ) : data?.attendances?.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-400">
                មិនទាន់មានបុគ្គលិក Check-in ក្នុងកាលបរិច្ឆេទនេះឡើយ
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">បុគ្គលិក (Employee)</th>
                    <th className="py-2.5 px-3">Check-in / Check-out</th>
                    <th className="py-2.5 px-3 text-right">ស្ថានភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.attendances?.map((att: any, idx: number) => {
                    const emp = att.employee;
                    const inTime = att.checkInAt
                      ? new Date(att.checkInAt).toLocaleTimeString("km-KH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Phnom_Penh",
                        })
                      : "-";

                    const outTime = att.checkOutAt
                      ? new Date(att.checkOutAt).toLocaleTimeString("km-KH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Phnom_Penh",
                        })
                      : "មិនទាន់ចេញ";

                    const isLate = att.status === "LATE";

                    return (
                      <tr key={att.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-xs">
                            {emp?.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-slate-500">
                              {emp?.code}
                            </span>
                            <span>•</span>
                            <span>{emp?.position?.name}</span>
                            <span>•</span>
                            <span className="text-slate-500">
                              {emp?.branch?.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-slate-400">In:</span>
                              <strong className="text-white">{inTime}</strong>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isLate
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {isLate ? "LATE" : "GOOD"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                              <span>Out:</span>
                              <span>{outTime}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isLate
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLate ? "bg-amber-400" : "bg-emerald-400"
                              }`}
                            ></span>
                            {isLate ? "មកយឺត" : "ទាន់ពេល"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Table: Absents, Holiday, Dayoff (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>អវត្តមាន & ថ្ងៃសម្រាក</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Absents, Leaves, Holidays, Dayoffs ({data?.absentsAndOthers?.length ?? 0})
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t("loading")}
            </div>
          ) : data?.absentsAndOthers?.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              គ្មានព័ត៌មានអវត្តមានសម្រាប់ថ្ងៃនេះឡើយ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">ឈ្មោះ (Name)</th>
                    <th className="py-2.5 px-3 text-right">សម្គាល់ (Note)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.absentsAndOthers?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-xs">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                          {item.subtitle}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${item.statusColor}`}
                        >
                          {item.note}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
