"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RotateCw,
  Clock,
  User,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    role: string;
  } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (actionFilter && actionFilter !== "ALL") params.set("action", actionFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "PASSWORD_CHANGE":
      case "PASSWORD_RESET_SUCCESS":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "ATTENDANCE_MANUAL_CREATE":
      case "ATTENDANCE_MANUAL_UPDATE":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "LEAVE_APPROVE":
      case "OVERTIME_APPROVE":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "LEAVE_REJECT":
      case "OVERTIME_REJECT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "PAYROLL_FINALIZE":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "SETTING_CHANGE":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const formatDateTimeKhmer = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("km-KH", {
        timeZone: "Asia/Phnom_Penh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span>កំណត់ហេតុប្រព័ន្ធ (Audit Logs)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            តាមដានរាល់សកម្មភាពក្នុងប្រព័ន្ធ ធានាតម្លាភាព និងសុវត្ថិភាពទិន្នន័យ ១០០%
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>ផ្ទុកឡើងវិញ</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមសកម្មភាព, អ្នកប្រើប្រាស់ ឬសេចក្តីលម្អិត..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">គ្រប់សកម្មភាពទាំងអស់ (All)</option>
            <option value="LOGIN">ការចូលប្រព័ន្ធ (LOGIN)</option>
            <option value="PASSWORD_CHANGE">ប្តូរពាក្យសម្ងាត់ (PASSWORD_CHANGE)</option>
            <option value="ATTENDANCE_MANUAL_CREATE">បន្ថែមវត្តមានដោយដៃ</option>
            <option value="ATTENDANCE_MANUAL_UPDATE">កែវត្តមានដោយដៃ</option>
            <option value="LEAVE_APPROVE">អនុម័តច្បាប់</option>
            <option value="LEAVE_REJECT">បដិសេធច្បាប់</option>
            <option value="PAYROLL_FINALIZE">Finalize ប្រាក់ខែ</option>
            <option value="SETTING_CHANGE">កែប្រែការកំណត់</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">កាលបរិច្ឆេទ & ម៉ោង (UTC+7)</th>
                <th className="py-3 px-4">អ្នកធ្វើសកម្មភាព</th>
                <th className="py-3 px-4">សកម្មភាព</th>
                <th className="py-3 px-4">ផ្នែក (Entity)</th>
                <th className="py-3 px-4">សេចក្តីលម្អិត (Details)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>កំពុងទាញយកកំណត់ហេតុ...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <span>មិនមានកំណត់ហេតុដែលត្រូវនឹងការស្វែងរកនេះឡើយ</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDateTimeKhmer(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-semibold text-white">
                            {log.user.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {log.user.email || log.user.role}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">
                          System / Anonymous
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {log.entity}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-md break-words">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            សរុប៖ <span className="text-white font-bold">{totalCount}</span> កំណត់ត្រា
            (ទំព័រ {page} នៃ {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-white">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
