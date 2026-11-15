"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  ArrowLeft,
  Check,
  ShieldCheck,
  CalendarDays,
  FolderTree,
  AlertTriangle,
  History,
  TrendingUp,
  Briefcase,
  ChevronRight,
  CheckSquare,
  Square,
} from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { getNowPhnomPenh, formatYMD, getDaysInMonth } from "@/lib/date-utils";

interface PayrollItem {
  id: string;
  employeeId: string;
  baseSalary: number;
  salaryType: string;
  workDays: number;
  actualDays: number;
  proratedBase?: number;
  workDaysRatio?: number;
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

interface PayrollHistoryItem {
  id: string;
  title: string;
  month: string;
  startDate: string;
  endDate: string;
  branchName: string;
  departmentName: string;
  employeeCount: number;
  totalAmount: number;
  status: "PREPARE" | "CHECKING" | "VERIFIED" | "APPROVED";
  isFinalized: boolean;
  createdAt: string;
  verifiedBy?: string | null;
  approvedBy?: string | null;
}

export default function PayrollPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  // Active View / Step: "WORKFLOW" (with active payroll) | "GENERATOR" (Step 1) | "HISTORY_LIST"
  const [activeView, setActiveView] = useState<"WORKFLOW" | "GENERATOR" | "HISTORY_LIST">("WORKFLOW");

  // Current Active Payroll
  const [currentPayroll, setCurrentPayroll] = useState<any | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter within active payroll table
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  // Historical Payrolls List
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Master Branches, Departments, Employees for Generator
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; code: string; name: string; branchId: string; departmentId: string; isActive: boolean; baseSalary: number }>>([]);

  // Generator Form state (Part ខ)
  const nowPnH = getNowPhnomPenh();
  const curYear = nowPnH.getFullYear();
  const curMonth = nowPnH.getMonth() + 1;
  const firstDayThisMonth = formatYMD(curYear, curMonth, 1);
  const lastDayThisMonth = formatYMD(curYear, curMonth, getDaysInMonth(curYear, curMonth));

  const [genStartDate, setGenStartDate] = useState(firstDayThisMonth);
  const [genEndDate, setGenEndDate] = useState(lastDayThisMonth);
  const [genBranchId, setGenBranchId] = useState("all");
  const [genDepartmentId, setGenDepartmentId] = useState("all");
  const [genEmployeeMode, setGenEmployeeMode] = useState<"ALL" | "SPECIFIC">("ALL");
  const [genSelectedEmpIds, setGenSelectedEmpIds] = useState<string[]>([]);
  const [genShowResign, setGenShowResign] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Modals state
  const [editItem, setEditItem] = useState<PayrollItem | null>(null);
  const [adjBonus, setAdjBonus] = useState(0);
  const [adjAllowance, setAdjAllowance] = useState(0);
  const [adjDeduction, setAdjDeduction] = useState(0);
  const [adjLatePenalty, setAdjLatePenalty] = useState(0);
  const [adjAbsentPenalty, setAdjAbsentPenalty] = useState(0);
  const [adjNote, setAdjNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Payslip Modal state
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null);

  // Status transitions
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Fetch initial data and latest payroll
  const fetchActivePayroll = async (payrollId?: string) => {
    setLoading(true);
    try {
      const url = payrollId ? `/api/payroll?payrollId=${payrollId}` : "/api/payroll";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.payroll) {
          setCurrentPayroll(json.data.payroll);
          setItems(json.data.items || []);
          setActiveView("WORKFLOW");
        } else {
          setCurrentPayroll(null);
          setItems([]);
          setActiveView("GENERATOR");
        }
      } else {
        setMessage({ text: json.error || "បរាជ័យក្នុងការទាញយកតារាងប្រាក់ខែ", type: "error" });
      }
    } catch {
      setMessage({ text: "កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch history list
  const fetchHistoryList = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/payroll?list=true");
      const json = await res.json();
      if (json.success && json.data) {
        setPayrollHistory(json.data);
      }
    } catch {
      console.error("History fetch error");
    } finally {
      setLoadingHistory(false);
    }
  };

  // 3. Fetch branches, departments, and employees for generator
  const fetchMetadata = async () => {
    try {
      const [bRes, dRes, eRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/departments"),
        fetch("/api/employees"),
      ]);
      const [bJson, dJson, eJson] = await Promise.all([
        bRes.json(),
        dRes.json(),
        eRes.json(),
      ]);

      if (bJson.success) setBranches(bJson.data || []);
      if (dJson.success) setDepartments(dJson.data || []);
      if (eJson.success) setAllEmployees(eJson.data || []);
    } catch {
      console.error("Metadata fetch error");
    }
  };

  useEffect(() => {
    fetchActivePayroll();
    fetchHistoryList();
    fetchMetadata();
  }, []);

  // Submit Generate Payroll (Part ខ)
  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);

    // Validation 1: From > To
    if (genStartDate > genEndDate) {
      setGenError("កាលបរិច្ឆេទចាប់ផ្តើមមិនអាចធំជាងកាលបរិច្ឆេទបញ្ចប់ឡើយ!");
      return;
    }

    // Validation 2: Difference > 62 days
    const diffDays = Math.round((new Date(genEndDate).getTime() - new Date(genStartDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 62) {
      setGenError("ចន្លោះកាលបរិច្ឆេទមិនអាចលើសពី ៦២ ថ្ងៃ (២ ខែ) ឡើយ!");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE",
          startDate: genStartDate,
          endDate: genEndDate,
          branchId: genBranchId,
          departmentId: genDepartmentId,
          employeeIds: genEmployeeMode === "SPECIFIC" ? genSelectedEmpIds : [],
          showResign: genShowResign,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessage({ text: json.message, type: "success" });
        await fetchActivePayroll(json.data.payrollId);
        fetchHistoryList();
        setActiveView("WORKFLOW");
      } else {
        setGenError(json.error || "មិនអាចបង្កើត Payroll បានឡើយ");
      }
    } catch {
      setGenError("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setGenerating(false);
    }
  };

  // Workflow Status Transitions (Part គ)
  const handleUpdateWorkflowStatus = async (targetStatus: "CHECKING" | "VERIFIED" | "APPROVED") => {
    if (!currentPayroll) return;
    setTransitioning(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_STATUS",
          payrollId: currentPayroll.id,
          targetStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        fetchActivePayroll(currentPayroll.id);
        fetchHistoryList();
      } else {
        setMessage({ text: json.error || "មិនអាចប្តូរស្ថានភាពបានឡើយ", type: "error" });
      }
    } catch {
      setMessage({ text: "កំហុសក្នុងការតភ្ជាប់", type: "error" });
    } finally {
      setTransitioning(false);
    }
  };

  // Open Edit Item Adjustment Modal
  const handleOpenEdit = (item: PayrollItem) => {
    setEditItem(item);
    setAdjBonus(item.bonus || 0);
    setAdjAllowance(item.allowance || 0);
    setAdjDeduction(item.deduction || 0);
    setAdjLatePenalty(item.latePenalty || 0);
    setAdjAbsentPenalty(item.absentPenalty || 0);
    setAdjNote(item.note || "");
  };

  // Submit Item Adjustment
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
          latePenalty: adjLatePenalty,
          absentPenalty: adjAbsentPenalty,
          note: adjNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: `បានកែសម្រួលប្រាក់ខែរបស់ ${editItem.employee.name} ដោយជោគជ័យ!`, type: "success" });
        setEditItem(null);
        if (currentPayroll) fetchActivePayroll(currentPayroll.id);
      } else {
        setMessage({ text: json.error || "មិនអាចកែប្រែបានឡើយ", type: "error" });
      }
    } catch {
      setMessage({ text: "កំហុសក្នុងការតភ្ជាប់", type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter items in current payroll table
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (branchFilter !== "all" && item.employee.branch?.name !== branchFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCode = item.employee.code.toLowerCase().includes(q);
        const matchName = item.employee.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }, [items, branchFilter, search]);

  const totalGross = filteredItems.reduce((sum, it) => sum + it.grossPay, 0);
  const totalDeductions = filteredItems.reduce(
    (sum, it) => sum + it.latePenalty + it.absentPenalty + it.deduction + it.taxDeduction + it.nssfDeduction,
    0
  );
  const totalNet = filteredItems.reduce((sum, it) => sum + it.netPay, 0);
  const totalOtBonus = filteredItems.reduce((sum, it) => sum + it.otPay + it.bonus + it.allowance, 0);

  // Workflow Step Helpers
  const currentStatus = currentPayroll?.status || "PREPARE";
  const isApproved = currentStatus === "APPROVED" || currentPayroll?.isFinalized;
  const isVerified = currentStatus === "VERIFIED";
  const isChecking = currentStatus === "CHECKING";

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>ការគ្រប់គ្រងប្រាក់បៀវត្សរ៍</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  AttendPro Payroll
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                ដំណើរការ ៤ ជំហាន (Workflow), ជ្រើសថ្ងៃតាមចិត្ត និងគណនាប្រាក់ខែសមាមាត្រជាក់ស្តែង
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Setup Salary Tab */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveView("WORKFLOW")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeView === "WORKFLOW"
                  ? "bg-emerald-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ដំណើរការ (Workflow)</span>
            </button>

            <button
              onClick={() => setActiveView("GENERATOR")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeView === "GENERATOR"
                  ? "bg-emerald-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>បង្កើតថ្មី (New)</span>
            </button>

            <button
              onClick={() => {
                setActiveView("HISTORY_LIST");
                fetchHistoryList();
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeView === "HISTORY_LIST"
                  ? "bg-emerald-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ប្រវត្តិ ({payrollHistory.length})</span>
            </button>
          </div>

          {/* Setup Salary Tab Link */}
          <Link
            href="/payroll/setup"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-bold text-xs border border-slate-800 transition flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>កំណត់ប្រាក់ខែ (Setup)</span>
          </Link>
        </div>
      </div>

      {/* Message Banner */}
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

      {/* ============================================================== */}
      {/* 4-STEP WORKFLOW BAR (PART គ) */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              ដំណាក់កាលដំណើរការ (Payroll Workflow)
            </div>
            <div className="text-base font-black text-white mt-0.5 flex items-center gap-2">
              <span>{currentPayroll ? currentPayroll.title || `Payroll ${currentPayroll.month}` : "មិនទាន់មាន Payroll ត្រូវបានជ្រើសឡើយ"}</span>
              {currentPayroll && (
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    isApproved
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : isVerified
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {currentStatus}
                </span>
              )}
            </div>
          </div>

          {/* Workflow Action Controls */}
          {currentPayroll && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* If Checking: Can Proceed to Verification */}
              {isChecking && (
                <button
                  onClick={() => handleUpdateWorkflowStatus("VERIFIED")}
                  disabled={transitioning}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  <span>បញ្ជូនទៅផ្ទៀងផ្ទាត់ (Step 3)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* If Verified: Can Go Back to Checking OR Approve & Lock */}
              {isVerified && (
                <>
                  <button
                    onClick={() => handleUpdateWorkflowStatus("CHECKING")}
                    disabled={transitioning}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ត្រឡប់ទៅកែសម្រួល</span>
                  </button>

                  <button
                    onClick={() => handleUpdateWorkflowStatus("APPROVED")}
                    disabled={transitioning}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>អនុម័ត និងចាក់សោ (Approve & Lock)</span>
                  </button>
                </>
              )}

              {/* If Approved: Locked! Super Admin can unlock */}
              {isApproved && (
                <button
                  onClick={() => handleUpdateWorkflowStatus("CHECKING")}
                  disabled={transitioning}
                  className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 transition"
                  title="Super Admin Only"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>ដោះសោ (Unlock - Super Admin)</span>
                </button>
              )}

              {/* Export Excel & Print */}
              <a
                href={`/api/payroll/export?payrollId=${currentPayroll.id}`}
                download
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ទាញយក Excel</span>
              </a>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>បោះពុម្ព</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Steps Visual Indicator */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Step 1: Prepare */}
          <div
            onClick={() => setActiveView("GENERATOR")}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              activeView === "GENERATOR"
                ? "bg-blue-600/15 border-blue-500 text-white"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span className="font-bold text-white">រៀបចំ (Prepare)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              ជ្រើសថ្ងៃ / សាខា / បុគ្គលិក ➜ Generate
            </p>
          </div>

          {/* Step 2: Checking */}
          <div
            onClick={() => {
              if (currentPayroll) setActiveView("WORKFLOW");
            }}
            className={`p-3 rounded-xl border transition ${
              isChecking
                ? "bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                : isVerified || isApproved
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-slate-950/60 border-slate-800 text-slate-500"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isVerified || isApproved
                    ? "bg-emerald-500 text-white"
                    : isChecking
                    ? "bg-amber-500 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isVerified || isApproved ? <Check className="w-3 h-3" /> : 2}
              </span>
              <span className="font-bold">ត្រួតពិនិត្យ (Checking)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Admin មើល និងកែ Bonus/Deduction ដោយដៃ
            </p>
          </div>

          {/* Step 3: Verification */}
          <div
            className={`p-3 rounded-xl border transition ${
              isVerified
                ? "bg-sky-500/15 border-sky-500 text-white shadow-lg shadow-sky-500/10"
                : isApproved
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-slate-950/60 border-slate-800 text-slate-500"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isApproved
                    ? "bg-emerald-500 text-white"
                    : isVerified
                    ? "bg-sky-500 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isApproved ? <Check className="w-3 h-3" /> : 3}
              </span>
              <span className="font-bold">ផ្ទៀងផ្ទាត់ (Verification)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Super Admin ពិនិត្យសរុប និងបញ្ជាក់
            </p>
          </div>

          {/* Step 4: Approved */}
          <div
            className={`p-3 rounded-xl border transition ${
              isApproved
                ? "bg-indigo-500/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                : "bg-slate-950/60 border-slate-800 text-slate-500"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isApproved ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {isApproved ? <Lock className="w-3 h-3" /> : 4}
              </span>
              <span className="font-bold">អនុម័ត (Approved)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              ចាក់សោ ➜ បង្កើត Payslip និង Excel
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: GENERATE NEW PAYROLL (PART ខ) */}
      {/* ============================================================== */}
      {activeView === "GENERATOR" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-400" />
                <span>បង្កើត Payroll ថ្មី ជ្រើសរើសចន្លោះកាលបរិច្ឆេទ (New Payroll)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ជ្រើសរើសចន្លោះថ្ងៃធ្វើការ សាខា និងផ្នែក។ ប្រព័ន្ធនឹងគណនាសមាមាត្រតាម Shift និងកាលវិភាគជាក់ស្តែង។
              </p>
            </div>
            {currentPayroll && (
              <button
                onClick={() => setActiveView("WORKFLOW")}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
              >
                ត្រឡប់ទៅ Workflow
              </button>
            )}
          </div>

          {genError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          <form onSubmit={handleGeneratePayroll} className="space-y-5 text-xs">
            {/* Date Range Inputs with Custom Popover Calendar */}
            <DateRangePicker
              startDate={genStartDate}
              endDate={genEndDate}
              onChange={(start, end) => {
                setGenStartDate(start);
                setGenEndDate(end);
              }}
              startLabel="ចាប់ពីថ្ងៃ (From Date) *"
              endLabel="ដល់ថ្ងៃ (To Date) *"
              required
              showRangeSummary={true}
            />

            {/* Branch & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">សាខា (Branch)</label>
                <select
                  value={genBranchId}
                  onChange={(e) => setGenBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">គ្រប់សាខាទាំងអស់</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ផ្នែក (Department)</label>
                <select
                  value={genDepartmentId}
                  onChange={(e) => setGenDepartmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">គ្រប់ផ្នែកទាំងអស់</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Selector Mode */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">ជ្រើសរើសបុគ្គលិក</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="empMode"
                    checked={genEmployeeMode === "ALL"}
                    onChange={() => setGenEmployeeMode("ALL")}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span>បុគ្គលិកទាំងអស់ ({allEmployees.length} នាក់)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="empMode"
                    checked={genEmployeeMode === "SPECIFIC"}
                    onChange={() => setGenEmployeeMode("SPECIFIC")}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span>ជ្រើសរើសបុគ្គលិកជាក់លាក់ ({genSelectedEmpIds.length} នាក់)</span>
                </label>
              </div>

              {/* Specific employee list picker */}
              {genEmployeeMode === "SPECIFIC" && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto space-y-1.5 mt-2">
                  {allEmployees.map((e) => {
                    const isChecked = genSelectedEmpIds.includes(e.id);
                    return (
                      <div
                        key={e.id}
                        onClick={() => {
                          if (isChecked) {
                            setGenSelectedEmpIds(genSelectedEmpIds.filter((id) => id !== e.id));
                          } else {
                            setGenSelectedEmpIds([...genSelectedEmpIds, e.id]);
                          }
                        }}
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                          isChecked ? "bg-emerald-950/40 border border-emerald-500/30 text-white" : "hover:bg-slate-900 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          <span>{e.name} ({e.code})</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">${e.baseSalary}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Checkbox: Show Resigned */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genShowResign}
                  onChange={(e) => setGenShowResign(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0 bg-slate-950 border-slate-700"
                />
                <span>បង្ហាញបុគ្គលិកដែលបានឈប់ (Show Resigned Employees)</span>
              </label>

              <button
                type="submit"
                disabled={generating}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>កំពុងគណនា...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>បង្កើត Payroll (Generate Payroll)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: HISTORICAL PAYROLLS LIST (PART គ) */}
      {/* ============================================================== */}
      {activeView === "HISTORY_LIST" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-sky-400" />
                <span>បញ្ជី Payroll ដែលបានបង្កើតពីមុន (Payroll Runs History)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ចុច "បើកមើល" ដើម្បីពិនិត្យ ឬបន្តដំណើរការតាមជំហាននីមួយៗ
              </p>
            </div>
            <button
              onClick={() => setActiveView("GENERATOR")}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>បង្កើតថ្មី</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">ឈ្មោះ Payroll</th>
                  <th className="py-3 px-3">ចន្លោះកាលបរិច្ឆេទ</th>
                  <th className="py-3 px-3">សាខា</th>
                  <th className="py-3 px-3 text-center">ចំនួនបុគ្គលិក</th>
                  <th className="py-3 px-3 text-right">ទឹកប្រាក់សរុប</th>
                  <th className="py-3 px-3 text-center">ស្ថានភាព</th>
                  <th className="py-3 px-3 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      <span>កំពុងទាញយកប្រវត្តិ...</span>
                    </td>
                  </tr>
                ) : payrollHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      មិនទាន់មានប្រវត្តិ Payroll នៅឡើយ
                    </td>
                  </tr>
                ) : (
                  payrollHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-bold text-white">{p.title}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {p.startDate} ដល់ {p.endDate}
                      </td>
                      <td className="py-3 px-3">{p.branchName}</td>
                      <td className="py-3 px-3 text-center font-bold">{p.employeeCount} នាក់</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400">
                        ${p.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                            p.status === "APPROVED"
                              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                              : p.status === "VERIFIED"
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            fetchActivePayroll(p.id);
                            setActiveView("WORKFLOW");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold text-xs border border-blue-500/30 transition flex items-center gap-1 ml-auto"
                        >
                          <span>បើកមើល</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: ACTIVE PAYROLL WORKFLOW ITEMS TABLE */}
      {/* ============================================================== */}
      {activeView === "WORKFLOW" && currentPayroll && (
        <div className="space-y-6">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>ប្រាក់ខែសុទ្ធសរុប (Net Pay)</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500">ប្រាក់ដែលត្រូវបើកជាក់ស្តែង</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-blue-400" />
                <span>បុគ្គលិកសរុប</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {filteredItems.length}
              </div>
              <div className="text-[10px] text-slate-500">នាក់ក្នុងចន្លោះកាលបរិច្ឆេទនេះ</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                <ClockAlert className="w-4 h-4 text-amber-400" />
                <span>ថែមម៉ោង OT & Bonus សរុប</span>
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ${totalOtBonus.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500">ប្រាក់បន្ថែមសរុបទាំងអស់</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Minus className="w-4 h-4 text-rose-400" />
                <span>ប្រាក់កាត់សរុប (Deductions)</span>
              </div>
              <div className="text-2xl font-black text-rose-400 font-mono">
                -${totalDeductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500">ពិន័យយឺត, អវត្តមាន & កាត់ផ្សេងៗ</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ស្វែងរកឈ្មោះ ឬកូដបុគ្គលិក..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="all">គ្រប់សាខា</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 text-[11px]">
              បង្ហាញបុគ្គលិកចំនួន <b className="text-white">{filteredItems.length}</b> នាក់
            </div>
          </div>

          {/* Payroll Items Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">បុគ្គលិក</th>
                    <th className="py-3 px-3 text-right">ប្រាក់ខែគោល</th>
                    <th className="py-3 px-3 text-right">សមាមាត្រ</th>
                    <th className="py-3 px-3 text-center">វត្តមាន</th>
                    <th className="py-3 px-3 text-right">ពិន័យយឺត</th>
                    <th className="py-3 px-3 text-right">អវត្តមាន</th>
                    <th className="py-3 px-3 text-right">ថែមម៉ោង OT</th>
                    <th className="py-3 px-3 text-right">Bonus/ឧបត្ថម្ភ</th>
                    <th className="py-3 px-3 text-right">ប្រាក់កាត់</th>
                    <th className="py-3 px-3 text-right font-black">ប្រាក់ខែសុទ្ធ ($)</th>
                    <th className="py-3 px-3 text-right">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      {/* Employee Info */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.employee.name}</span>
                          {item.baseSalary === 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              $0 ព្រមាន
                            </span>
                          )}
                          {item.isEdited && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              បានកែ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.employee.code} • {item.employee.position?.name || "-"}
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        ${item.baseSalary.toFixed(2)}
                      </td>

                      {/* Prorated Base */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="text-emerald-400 font-bold">
                          ${(item.proratedBase || item.baseSalary).toFixed(2)}
                        </div>
                        {item.workDaysRatio && item.workDaysRatio < 1 && (
                          <div className="text-[9px] text-slate-500">
                            {Math.round(item.workDaysRatio * 100)}% នៃខែ
                          </div>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono">{item.actualDays}</span>
                        <span className="text-slate-500">/{item.workDays} ថ្ងៃ</span>
                      </td>

                      {/* Late Penalty */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.latePenalty > 0 ? (
                          <span className="text-rose-400">-${item.latePenalty.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">$0.00</span>
                        )}
                      </td>

                      {/* Absent Penalty */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.absentPenalty > 0 ? (
                          <span className="text-rose-400">-${item.absentPenalty.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">$0.00</span>
                        )}
                      </td>

                      {/* OT Pay */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.otPay > 0 ? (
                          <span className="text-amber-400">+${item.otPay.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">$0.00</span>
                        )}
                      </td>

                      {/* Bonus & Allowance */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.bonus + item.allowance > 0 ? (
                          <span className="text-emerald-400">+${(item.bonus + item.allowance).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">$0.00</span>
                        )}
                      </td>

                      {/* Deduction */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.deduction > 0 ? (
                          <span className="text-rose-400">-${item.deduction.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">$0.00</span>
                        )}
                      </td>

                      {/* Net Pay */}
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-400">
                        ${item.netPay.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isApproved && (
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition"
                              title="កែសម្រួល Bonus, Allowance, Deduction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setPayslipItem(item)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                            title="មើល និងបោះពុម្ព Payslip"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ITEM ADJUSTMENT MODAL */}
      {/* ============================================================== */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>កែសម្រួលប្រាក់ខែបុគ្គលិក</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editItem.employee.name} ({editItem.employee.code})
                </p>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bonus ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjBonus}
                    onChange={(e) => setAdjBonus(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Allowance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjAllowance}
                    onChange={(e) => setAdjAllowance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ពិន័យយឺត ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjLatePenalty}
                    onChange={(e) => setAdjLatePenalty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ពិន័យអវត្តមាន ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjAbsentPenalty}
                    onChange={(e) => setAdjAbsentPenalty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ប្រាក់កាត់ផ្សេងៗ ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjDeduction}
                  onChange={(e) => setAdjDeduction(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">កំណត់សម្គាល់ (Note)</label>
                <input
                  type="text"
                  placeholder="ឧ. បន្ថែមប្រាក់លើកទឹកចិត្ត..."
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {savingEdit ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: OFFICIAL KHMER SALARY PAYSLIP MODAL */}
      {/* ============================================================== */}
      {payslipItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
          <div className="w-full max-w-2xl rounded-2xl bg-white text-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 print:shadow-none print:w-full print:max-w-none">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  THEDEMO COFFEE & RESTAURANT
                </div>
                <div className="text-xs text-slate-500">
                  សាខា៖ {payslipItem.employee.branch?.name || "THE ONE COFFEE (ស្វាយរៀង)"}
                </div>
                <div className="text-sm font-bold text-blue-700 mt-2">
                  បង្កាន់ដៃបើកប្រាក់បៀវត្សរ៍ (OFFICIAL SALARY PAYSLIP)
                </div>
              </div>
              <button
                onClick={() => setPayslipItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
              <div>
                <div className="text-slate-500">ឈ្មោះ / Name:</div>
                <div className="font-bold text-slate-900">{payslipItem.employee.name}</div>
              </div>
              <div>
                <div className="text-slate-500">កូដ / ID:</div>
                <div className="font-mono font-bold text-slate-900">{payslipItem.employee.code}</div>
              </div>
              <div>
                <div className="text-slate-500">មុខតំណែង / Position:</div>
                <div className="font-semibold text-slate-900">{payslipItem.employee.position?.name || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">ផ្នែក / Department:</div>
                <div className="font-semibold text-slate-900">{payslipItem.employee.department?.name || "-"}</div>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Earnings */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 border-b pb-1 flex items-center justify-between">
                  <span>ប្រាក់ចំណូល (Earnings)</span>
                  <span>ចំនួនទឹកប្រាក់ ($)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ប្រាក់ខែគោល (Base Salary)</span>
                  <span className="font-mono font-semibold">${payslipItem.baseSalary.toFixed(2)}</span>
                </div>
                {payslipItem.proratedBase && payslipItem.proratedBase !== payslipItem.baseSalary && (
                  <div className="flex justify-between py-1 border-b border-slate-100 bg-blue-50/50 px-1 rounded">
                    <span className="text-blue-700 font-semibold">ប្រាក់ខែសមាមាត្រ (Prorated Base)</span>
                    <span className="font-mono font-bold text-blue-700">${payslipItem.proratedBase.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ថែមម៉ោង OT ({payslipItem.otHours} ម៉ោង)</span>
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

              {/* Deductions */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 border-b pb-1 flex items-center justify-between">
                  <span>ប្រាក់កាត់ (Deductions)</span>
                  <span>ចំនួនទឹកប្រាក់ ($)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ពិន័យមកយឺត ({payslipItem.lateCount} លើក)</span>
                  <span className="font-mono font-semibold text-rose-600">-${payslipItem.latePenalty.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ពិន័យអវត្តមាន ({payslipItem.absentDays} ថ្ងៃ)</span>
                  <span className="font-mono font-semibold text-rose-600">-${payslipItem.absentPenalty.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ប្រាក់កាត់ផ្សេងៗ (Other)</span>
                  <span className="font-mono font-semibold text-rose-600">-${payslipItem.deduction.toFixed(2)}</span>
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
                    -${(payslipItem.latePenalty + payslipItem.absentPenalty + payslipItem.deduction + payslipItem.taxDeduction + payslipItem.nssfDeduction).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Net Pay Highlight */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-800">ប្រាក់ខែសុទ្ធដែលត្រូវបើក (NET TAKE-HOME PAY)</div>
                <div className="text-[11px] text-emerald-600">
                  ប្រហាក់ប្រហែល៖ ៛{Math.round(payslipItem.netPay * 4100).toLocaleString("en-US")} រៀល
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
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">គណនេយ្យករ</div>
              </div>
              <div className="space-y-12">
                <div>អ្នកអនុម័ត (Approved By)</div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">ប្រធានសាខា / Admin</div>
              </div>
              <div className="space-y-12">
                <div>ហត្ថលេខាបុគ្គលិក (Employee)</div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">{payslipItem.employee.name}</div>
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
