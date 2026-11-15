"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Filter,
  RotateCw,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Shield,
  FileText,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DateRangePicker } from "@/components/date-range-picker";

export default function LeavePage() {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<"requests" | "balances">("requests");
  const [statusFilter, setStatusFilter] = useState("all");

  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    typeId: "leave-annual",
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [leaveRes, setupRes] = await Promise.all([
        fetch(`/api/leave?status=${statusFilter}`),
        fetch("/api/setup/overview"),
      ]);
      const leaveJson = await leaveRes.json();
      const setupJson = await setupRes.json();

      if (leaveJson.success) {
        setRequests(leaveJson.data.requests || []);
        setBalances(leaveJson.data.balances || []);
        setLeaveTypes(leaveJson.data.leaveTypes || []);
      }
      if (setupJson.success) {
        setEmployees(setupJson.data.employees || []);
        if (setupJson.data.employees?.length > 0 && !formData.employeeId) {
          setFormData((prev) => ({
            ...prev,
            employeeId: setupJson.data.employees[0].id,
          }));
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaveData();
  }, [statusFilter]);

  // Handle Approve / Reject
  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        fetchLeaveData();
      }
    } catch {}
    setActionLoading(null);
  };

  // Handle Create Request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData((prev) => ({ ...prev, reason: "" }));
        fetchLeaveData();
      } else {
        setErrorMsg(json.error || "មិនអាចបញ្ជូនសំណើបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ Server");
    }
    setSubmitting(false);
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-blue-400" />
            <span>ការគ្រប់គ្រងច្បាប់ឈប់សម្រាក (Leave Management)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ពិនិត្យសំណើច្បាប់ អនុម័ត/បដិសេធ តាមដានសមតុល្យច្បាប់ និងជូនដំណឹងស្វ័យប្រវត្តិ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLeaveData}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>ស្នើសុំច្បាប់ថ្មី</span>
          </button>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">សំណើកំពុងរង់ចាំ (Pending)</div>
            <div className="text-xl font-black text-amber-400 font-mono">{pendingCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">បានអនុម័ត (Approved)</div>
            <div className="text-xl font-black text-emerald-400 font-mono">{approvedCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">បានបដិសេធ (Rejected)</div>
            <div className="text-xl font-black text-rose-400 font-mono">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            activeTab === "requests"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>សំណើច្បាប់ឈប់សម្រាក ({requests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("balances")}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            activeTab === "balances"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>សមតុល្យច្បាប់បុគ្គលិក (Leave Balances)</span>
        </button>
      </div>

      {/* Tab 1: Leave Requests List */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ច្រោះតាមស្ថានភាព៖</span>
            {["all", "PENDING", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  statusFilter === st
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {st === "all"
                  ? "ទាំងអស់"
                  : st === "PENDING"
                  ? "រង់ចាំ (Pending)"
                  : st === "APPROVED"
                  ? "បានអនុម័ត"
                  : "បដិសេធ"}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                <span>កំពុងទាញយកទិន្នន័យច្បាប់...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                មិនមានសំណើច្បាប់នៅក្នុងបញ្ជីឡើយ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/40">
                      <th className="py-3 px-3.5">#</th>
                      <th className="py-3 px-3.5">បុគ្គលិក</th>
                      <th className="py-3 px-3.5">ប្រភេទច្បាប់</th>
                      <th className="py-3 px-3.5">កាលបរិច្ឆេទ</th>
                      <th className="py-3 px-3.5">មូលហេតុ</th>
                      <th className="py-3 px-3.5">ស្ថានភាព</th>
                      <th className="py-3 px-3.5">អនុម័តដោយ</th>
                      <th className="py-3 px-3.5 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {requests.map((req, idx) => {
                      const emp = req.employee;
                      const fromStr = req.fromDate.slice(0, 10);
                      const toStr = req.toDate.slice(0, 10);
                      const isPending = req.status === "PENDING";
                      const isApproved = req.status === "APPROVED";

                      return (
                        <tr key={req.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3.5 text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-white text-xs">
                              {emp?.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {emp?.code} • {emp?.position?.name}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-medium text-slate-200">
                            {req.type?.name}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-300">
                            {fromStr === toStr ? fromStr : `${fromStr} ➔ ${toStr}`}
                          </td>
                          <td className="py-3 px-3.5 text-slate-400 text-[11px] max-w-[160px] truncate">
                            {req.reason || "-"}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPending
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : isApproved
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              }`}
                            >
                              {isPending
                                ? "រង់ចាំ (Pending)"
                                : isApproved
                                ? "បានអនុម័ត"
                                : "បដិសេធ"}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                            {req.approvedBy || "-"}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={actionLoading === req.id}
                                  onClick={() => handleAction(req.id, "APPROVED")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                                  title="យល់ព្រមអនុម័ត"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>យល់ព្រម</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading === req.id}
                                  onClick={() => handleAction(req.id, "REJECTED")}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                                  title="បដិសេធសំណើ"
                                >
                                  <X className="w-3 h-3" />
                                  <span>បដិសេធ</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">រួចរាល់</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Leave Balances Table */}
      {activeTab === "balances" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800">
            <span className="text-xs font-bold text-white">
              តារាងសមតុល្យច្បាប់ប្រចាំឆ្នាំ (Annual & Sick Leave Balances)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/40">
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">បុគ្គលិក</th>
                  <th className="py-3 px-3.5">ច្បាប់ប្រចាំឆ្នាំ (Annual)</th>
                  <th className="py-3 px-3.5">បានប្រើ (Used)</th>
                  <th className="py-3 px-3.5">នៅសល់ (Remaining)</th>
                  <th className="py-3 px-3.5">ច្បាប់ឈឺ (Sick Leave)</th>
                  <th className="py-3 px-3.5">បានប្រើ (Used)</th>
                  <th className="py-3 px-3.5">នៅសល់ (Remaining)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {balances.map((b, idx) => (
                  <tr key={b.employee.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-sans">
                      <div className="font-bold text-white">{b.employee.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {b.employee.code} • {b.employee.position}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-300">{b.annual.allowed} ថ្ងៃ</td>
                    <td className="py-3 px-3.5 text-amber-400">{b.annual.used} ថ្ងៃ</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">
                      {b.annual.remaining} ថ្ងៃ
                    </td>
                    <td className="py-3 px-3.5 text-slate-300">{b.sick.allowed} ថ្ងៃ</td>
                    <td className="py-3 px-3.5 text-amber-400">{b.sick.used} ថ្ងៃ</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">
                      {b.sick.remaining} ថ្ងៃ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Leave Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>បង្កើតសំណើច្បាប់ឈប់សម្រាកថ្មី</span>
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Employee */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  បុគ្គលិកស្នើសុំ *
                </label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} - {emp.name} ({emp.position?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ប្រភេទច្បាប់ *
                </label>
                <select
                  required
                  value={formData.typeId}
                  onChange={(e) =>
                    setFormData({ ...formData, typeId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <DateRangePicker
                startDate={formData.fromDate}
                endDate={formData.toDate}
                onChange={(start, end) =>
                  setFormData({ ...formData, fromDate: start, toDate: end })
                }
                startLabel="ចាប់ពីថ្ងៃ *"
                endLabel="រហូតដល់ថ្ងៃ *"
                required
              />

              {/* Reason */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  មូលហេតុនៃការឈប់សម្រាក
                </label>
                <textarea
                  rows={2}
                  placeholder="មូលហេតុឈឺ ឬមានធុរៈចាំបាច់..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? "កំពុងបញ្ជូន..." : "បញ្ជូនសំណើ (Submit)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
