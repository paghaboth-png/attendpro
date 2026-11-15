"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  Building2,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Lock,
  Unlock,
  Edit2,
  FileText,
  RotateCw,
  AlertCircle,
  X,
  Plus,
  Minus,
  Sparkles,
  Users,
  ClockAlert,
  ArrowRight,
} from "lucide-react";

interface PayrollItem {
  id: string;
  employeeId: string;
  baseSalary: number;
  salaryType: string;
  workDays: number;
  actualDays: number;
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
  note: string | null;
  isEdited: boolean;
  employee: {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    branch: { name: string } | null;
    position: { name: string } | null;
    department: { name: string } | null;
  };
}

export default function PayrollPage() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  // Adjustment Modal state
  const [editItem, setEditItem] = useState<PayrollItem | null>(null);
  const [adjBonus, setAdjBonus] = useState(0);
  const [adjAllowance, setAdjAllowance] = useState(0);
  const [adjDeduction, setAdjDeduction] = useState(0);
  const [adjNote, setAdjNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Payslip Modal state
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null);

  // Action status message
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${selectedMonth}&branchId=${branchFilter}`);
      const json = await res.json();
      if (json.success) {
        setPayrollData(json.data.payroll);
        setItems(json.data.items || []);
        setIsFinalized(Boolean(json.data.isFinalized));
      } else {
        setMessage({ text: json.error || "បរាជ័យក្នុងការទាញយកតារាងប្រាក់ខែ", type: "error" });
      }

      // Fetch branches for filter
      const bRes = await fetch("/api/branches");
      const bJson = await bRes.json();
      if (bJson.success) {
        setBranches(bJson.data || []);
      }
    } catch {
      setMessage({ text: "កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth, branchFilter]);

  const handleOpenEdit = (item: PayrollItem) => {
    setEditItem(item);
    setAdjBonus(item.bonus || 0);
    setAdjAllowance(item.allowance || 0);
    setAdjDeduction(item.deduction || 0);
    setAdjNote(item.note || "");
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSavingEdit(true);

    try {
      const res = await fetch("/api/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: editItem.id,
          bonus: adjBonus,
          allowance: adjAllowance,
          deduction: adjDeduction,
          note: adjNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: `បានកែប្រែប្រាក់ខែរបស់ ${editItem.employee.name} ដោយជោគជ័យ!`, type: "success" });
        setEditItem(null);
        fetchPayroll();
      } else {
        setMessage({ text: json.error || "មិនអាចកែប្រែបានឡើយ", type: "error" });
      }
    } catch {
      setMessage({ text: "កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ", type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleFinalize = async (action: "FINALIZE" | "UNLOCK") => {
    if (!payrollData?.id) return;

    const confirmMsg =
      action === "FINALIZE"
        ? `តើលោកអ្នកពិតជាចង់ Finalize និងចាក់សោតារាងប្រាក់ខែខែ ${selectedMonth} នេះមែនទេ? (បន្ទាប់ពី Finalize មិនអាចកែប្រែបានទេ លើកលែងតែ Super Admin)`
        : `តើលោកអ្នកចង់ Unlock ដោះសោតារាងប្រាក់ខែខែ ${selectedMonth} នេះឡើងវិញមែនទេ?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollId: payrollData.id,
          action,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        fetchPayroll();
      } else {
        setMessage({ text: json.error || "បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាព", type: "error" });
      }
    } catch {
      setMessage({ text: "កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ", type: "error" });
    }
  };

  // Filter items by search
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.employee.name.toLowerCase().includes(q) ||
      item.employee.code.toLowerCase().includes(q) ||
      (item.employee.position?.name && item.employee.position.name.toLowerCase().includes(q))
    );
  });

  const totalGross = filteredItems.reduce((sum, it) => sum + it.grossPay, 0);
  const totalDeductions = filteredItems.reduce(
    (sum, it) => sum + it.latePenalty + it.absentPenalty + it.deduction + it.taxDeduction + it.nssfDeduction,
    0
  );
  const totalNet = filteredItems.reduce((sum, it) => sum + it.netPay, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>ការគ្រប់គ្រងប្រាក់បៀវត្សរ៍ (Payroll Management)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            គណនាប្រាក់ខែស្វ័យប្រវត្តិពីវត្តមាន, យឺត, អវត្តមាន, ថែមម៉ោង OT និងចេញ Payslip
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/api/payroll/export?month=${selectedMonth}&branchId=${branchFilter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>ទាញយក Excel</span>
          </a>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>បោះពុម្ព</span>
          </button>

          {!isFinalized ? (
            <button
              onClick={() => handleToggleFinalize("FINALIZE")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition"
            >
              <Lock className="w-4 h-4" />
              <span>Finalize & ចាក់សោ</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggleFinalize("UNLOCK")}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 flex items-center gap-1.5 transition"
              title="Super Admin Only"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock (Super Admin)</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Finalize Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
          isFinalized
            ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300"
            : "bg-amber-950/30 border-amber-500/30 text-amber-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isFinalized ? (
            <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {isFinalized
                ? `តារាងប្រាក់ខែខែ ${selectedMonth} ត្រូវបាន Finalize រួចរាល់!`
                : `តារាងប្រាក់ខែខែ ${selectedMonth} កំពុងស្ថិតក្នុងដំណាក់កាលសេចក្តីព្រាង (Draft)`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isFinalized
                ? `បាន Finalize ដោយ ${payrollData?.finalizedBy || "Admin"} (ទិន្នន័យត្រូវបានចាក់សោ មិនអាចកែប្រែបានឡើយ)`
                : "Admin អាចកែប្រែប្រាក់បន្ថែម (Bonus/Allowance) ឬប្រាក់កាត់ដោយចុចប៊ូតុងកែសម្រួល"}
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border ${
            isFinalized
              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
          }`}
        >
          {isFinalized ? "FINALIZED" : "DRAFT"}
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>ប្រាក់ខែសុទ្ធសរុប (Net Payroll)</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">
            ប្រាក់ដែលត្រូវបើកជូនបុគ្គលិកជាក់ស្តែង
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-blue-400" />
            <span>បុគ្គលិកសរុប (Total Staff)</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {filteredItems.length}
          </div>
          <div className="text-[10px] text-slate-500">នាក់ ក្នុងបញ្ជីបើកប្រាក់បៀវត្ស</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <ClockAlert className="w-4 h-4 text-amber-400" />
            <span>ថែមម៉ោង OT & Bonus សរុប</span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            $
            {filteredItems
              .reduce((sum, it) => sum + it.otPay + it.bonus + it.allowance, 0)
              .toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">OT + ប្រាក់ឧបត្ថម្ភ + រង្វាន់</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Minus className="w-4 h-4 text-rose-400" />
            <span>ប្រាក់កាត់សរុប (Deductions)</span>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            ${totalDeductions.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">ពិន័យយឺត, អវត្តមាន និងកាត់ផ្សេងៗ</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none"
            >
              <option value="all">គ្រប់សាខាទាំងអស់</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ/កូដ..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 whitespace-nowrap">
              <tr>
                <th className="py-3 px-3.5">កូដ & ឈ្មោះបុគ្គលិក</th>
                <th className="py-3 px-3">មុខតំណែង</th>
                <th className="py-3 px-3 text-right">ប្រាក់ខែគោល</th>
                <th className="py-3 px-3 text-center">វត្តមាន</th>
                <th className="py-3 px-3 text-right">ពិន័យយឺត</th>
                <th className="py-3 px-3 text-right">ពិន័យអវត្តមាន</th>
                <th className="py-3 px-3 text-right">ប្រាក់ OT</th>
                <th className="py-3 px-3 text-right">ឧបត្ថម្ភ/Bonus</th>
                <th className="py-3 px-3 text-right">ប្រាក់កាត់</th>
                <th className="py-3 px-3.5 text-right">ប្រាក់ខែសុទ្ធ</th>
                <th className="py-3 px-3 text-center">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    <span>កំពុងគណនាប្រាក់បៀវត្សរ៍...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <span>មិនមានបុគ្គលិកក្នុងបញ្ជីនេះឡើយ</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{item.employee.name}</span>
                        {item.isEdited && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="បានកែប្រែដោយដៃ" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {item.employee.code}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {item.employee.position?.name || "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-white whitespace-nowrap">
                      ${item.baseSalary.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-white">{item.actualDays}</span>
                      <span className="text-slate-500">/{item.workDays} ថ្ងៃ</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      {item.latePenalty > 0 ? (
                        <span className="text-rose-400">-${item.latePenalty.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      {item.absentPenalty > 0 ? (
                        <span className="text-rose-400">-${item.absentPenalty.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      {item.otPay > 0 ? (
                        <span className="text-amber-400">+${item.otPay.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      {item.allowance + item.bonus > 0 ? (
                        <span className="text-emerald-400">
                          +${(item.allowance + item.bonus).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      {item.deduction > 0 ? (
                        <span className="text-rose-400">-${item.deduction.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-black text-sm text-emerald-400 whitespace-nowrap">
                      ${item.netPay.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          disabled={isFinalized}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                          title="កែសម្រួល Bonus / Allowance / Deduction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPayslipItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                          title="មើល / បោះពុម្ព Payslip"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {editItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>កែសម្រួលប្រាក់បន្ថែម/កាត់</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editItem.employee.name} ({editItem.employee.code})
                </p>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>ប្រាក់ខែគោល (Base):</span>
                  <span className="font-mono text-white">${editItem.baseSalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ពិន័យយឺត + អវត្តមាន:</span>
                  <span className="font-mono text-rose-400">
                    -${(editItem.latePenalty + editItem.absentPenalty).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ប្រាក់ថែមម៉ោង OT:</span>
                  <span className="font-mono text-amber-400">+${editItem.otPay.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ប្រាក់ឧបត្ថម្ភ (Allowance USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjAllowance}
                  onChange={(e) => setAdjAllowance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ប្រាក់រង្វាន់លើកទឹកចិត្ត (Bonus USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjBonus}
                  onChange={(e) => setAdjBonus(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ប្រាក់កាត់បន្ថែម (Other Deductions USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjDeduction}
                  onChange={(e) => setAdjDeduction(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  កំណត់ចំណាំ (Note)
                </label>
                <input
                  type="text"
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="ឧ. បន្ថែមប្រាក់រង្វាន់លក់កាហ្វេដាច់..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {savingEdit ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកែប្រែ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL PAYSLIP MODAL / PRINT VIEW */}
      {payslipItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto print:m-0 print:p-0 print:shadow-none print:w-full">
            {/* Payslip Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-200">
              <div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  TheDemo Coffee
                </div>
                <div className="text-xs text-slate-500">
                  សាខា៖ {payslipItem.employee.branch?.name || "THE ONE COFFEE (ស្វាយរៀង)"}
                </div>
                <div className="text-[11px] text-slate-500">
                  ទូរស័ព្ទ៖ 012 999 001 | អ៊ីមែល៖ info@demo.com
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  ប័ណ្ណបើកប្រាក់បៀវត្សរ៍ (PAYSLIP)
                </span>
                <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                  ខែទូទាត់៖ {selectedMonth}
                </div>
              </div>
            </div>

            {/* Employee Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <div className="text-slate-500">ឈ្មោះបុគ្គលិក / Employee Name:</div>
                <div className="font-bold text-sm text-slate-900">
                  {payslipItem.employee.name}
                </div>
              </div>
              <div>
                <div className="text-slate-500">កូដសម្គាល់ / Employee ID:</div>
                <div className="font-mono font-bold text-slate-900">
                  {payslipItem.employee.code}
                </div>
              </div>
              <div>
                <div className="text-slate-500">មុខតំណែង / Position:</div>
                <div className="font-semibold text-slate-900">
                  {payslipItem.employee.position?.name || "-"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">ផ្នែក / Department:</div>
                <div className="font-semibold text-slate-900">
                  {payslipItem.employee.department?.name || "-"}
                </div>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Earnings Column */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 border-b pb-1 flex items-center justify-between">
                  <span>ប្រាក់ចំណូល (Earnings)</span>
                  <span>ចំនួនទឹកប្រាក់ ($)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ប្រាក់ខែគោល (Base Salary)</span>
                  <span className="font-mono font-semibold">${payslipItem.baseSalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    ថែមម៉ោង OT ({payslipItem.otHours} ម៉ោង)
                  </span>
                  <span className="font-mono font-semibold">${payslipItem.otPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ប្រាក់ឧបត្ថម្ភ (Allowance)</span>
                  <span className="font-mono font-semibold">${payslipItem.allowance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ប្រាក់រង្វាន់ (Bonus)</span>
                  <span className="font-mono font-semibold">${payslipItem.bonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-300">
                  <span>ប្រាក់ចំណូលសរុប (Gross Pay)</span>
                  <span className="font-mono">${payslipItem.grossPay.toFixed(2)}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 border-b pb-1 flex items-center justify-between">
                  <span>ប្រាក់កាត់ (Deductions)</span>
                  <span>ចំនួនទឹកប្រាក់ ($)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    ពិន័យមកយឺត ({payslipItem.lateCount} លើក)
                  </span>
                  <span className="font-mono font-semibold text-rose-600">
                    -${payslipItem.latePenalty.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    ពិន័យអវត្តមាន ({payslipItem.absentDays} ថ្ងៃ)
                  </span>
                  <span className="font-mono font-semibold text-rose-600">
                    -${payslipItem.absentPenalty.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ប្រាក់កាត់ផ្សេងៗ (Other)</span>
                  <span className="font-mono font-semibold text-rose-600">
                    -${payslipItem.deduction.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ពន្ធ & NSSF</span>
                  <span className="font-mono font-semibold text-slate-400">
                    ${(payslipItem.taxDeduction + payslipItem.nssfDeduction).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-rose-700 border-t border-slate-300">
                  <span>ប្រាក់កាត់សរុប (Total Deductions)</span>
                  <span className="font-mono">
                    -$
                    {(
                      payslipItem.latePenalty +
                      payslipItem.absentPenalty +
                      payslipItem.deduction +
                      payslipItem.taxDeduction +
                      payslipItem.nssfDeduction
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Net Pay Highlight */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-800">
                  ប្រាក់ខែសុទ្ធដែលត្រូវបើក (NET TAKE-HOME PAY)
                </div>
                <div className="text-[11px] text-emerald-600">
                  ប្រហាក់ប្រហែល៖ ៛
                  {Math.round(payslipItem.netPay * 4100).toLocaleString("en-US")} រៀល
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-700 font-mono">
                ${payslipItem.netPay.toFixed(2)}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-slate-600">
              <div className="space-y-12">
                <div>អ្នករៀបចំ (Prepared By)</div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                  គណនេយ្យករ
                </div>
              </div>
              <div className="space-y-12">
                <div>អ្នកអនុម័ត (Approved By)</div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                  ប្រធានសាខា / Admin
                </div>
              </div>
              <div className="space-y-12">
                <div>ហត្ថលេខាបុគ្គលិក (Employee)</div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                  {payslipItem.employee.name}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end gap-2 border-t print:hidden">
              <button
                type="button"
                onClick={() => setPayslipItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
              >
                បិទផ្ទាំង
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>បោះពុម្ព Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
