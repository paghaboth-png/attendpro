"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  DollarSign,
  Search,
  Filter,
  Users,
  Edit3,
  CheckSquare,
  Square,
  Upload,
  Download,
  AlertTriangle,
  History,
  Calendar,
  Save,
  X,
  Building2,
  FolderTree,
  Briefcase,
  Percent,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { DatePicker } from "@/components/date-picker";

interface EmployeeSalaryItem {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  branchId: string;
  branchName: string;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  baseSalary: number;
  salaryType: string;
  workDaysPerMonth: number;
  salaryEffectiveDate: string;
  isConfigured: boolean;
  salaryHistories: Array<{
    id: string;
    baseSalary: number;
    salaryType: string;
    workDaysPerMonth: number;
    effectiveDate: string;
    note: string | null;
    createdAt: string;
  }>;
}

export default function SalarySetupPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [employees, setEmployees] = useState<EmployeeSalaryItem[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedFilterConfig, setSelectedFilterConfig] = useState<"ALL" | "UNCONFIGURED" | "CONFIGURED">("ALL");

  // Selection for Bulk Edit
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // Modals
  const [editingEmp, setEditingEmp] = useState<EmployeeSalaryItem | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState("");
  const [editSalaryType, setEditSalaryType] = useState("MONTHLY");
  const [editWorkDays, setEditWorkDays] = useState("26");
  const [editEffectiveDate, setEditEffectiveDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingSingle, setSavingSingle] = useState(false);

  // Bulk Edit Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [bulkFixedAmount, setBulkFixedAmount] = useState("");
  const [bulkPercentage, setBulkPercentage] = useState("");
  const [bulkSalaryType, setBulkSalaryType] = useState("KEEP");
  const [bulkWorkDays, setBulkWorkDays] = useState("26");
  const [bulkEffectiveDate, setBulkEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkNote, setBulkNote] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  // History Modal
  const [historyEmp, setHistoryEmp] = useState<EmployeeSalaryItem | null>(null);

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importEffectiveDate, setImportEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [importing, setImporting] = useState(false);

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/salary");
      const json = await res.json();
      if (json.success && json.data) {
        setEmployees(json.data.employees || []);
        setBranches(json.data.branches || []);
        setDepartments(json.data.departments || []);
      } else {
        setErrorMsg(json.error || "មិនអាចទាញយកបញ្ជីប្រាក់ខែបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedBranch !== "all" && emp.branchId !== selectedBranch) return false;
      if (selectedDept !== "all" && emp.departmentId !== selectedDept) return false;
      if (selectedFilterConfig === "UNCONFIGURED" && emp.isConfigured) return false;
      if (selectedFilterConfig === "CONFIGURED" && !emp.isConfigured) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCode = emp.code.toLowerCase().includes(q);
        const matchName = emp.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }, [employees, selectedBranch, selectedDept, selectedFilterConfig, search]);

  const unconfiguredCount = employees.filter((e) => !e.isConfigured).length;

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedEmpIds.length === filteredEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedEmpIds.includes(id)) {
      setSelectedEmpIds(selectedEmpIds.filter((item) => item !== id));
    } else {
      setSelectedEmpIds([...selectedEmpIds, id]);
    }
  };

  // Open single edit modal
  const handleOpenEdit = (emp: EmployeeSalaryItem) => {
    setEditingEmp(emp);
    setEditBaseSalary(emp.baseSalary.toString());
    setEditSalaryType(emp.salaryType || "MONTHLY");
    setEditWorkDays(emp.workDaysPerMonth?.toString() || "26");
    setEditEffectiveDate(emp.salaryEffectiveDate || new Date().toISOString().slice(0, 10));
    setEditNote("");
  };

  // Submit single edit
  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setSavingSingle(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/payroll/salary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: editingEmp.id,
          baseSalary: parseFloat(editBaseSalary) || 0,
          salaryType: editSalaryType,
          workDaysPerMonth: parseInt(editWorkDays) || 26,
          effectiveDate: editEffectiveDate,
          note: editNote,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        setEditingEmp(null);
        fetchSalaries();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(json.error || "មិនអាចកែប្រែប្រាក់ខែបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setSavingSingle(false);
    }
  };

  // Submit bulk edit
  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) return;
    setSavingBulk(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload: any = {
        employeeIds: selectedEmpIds,
        updateType: bulkType,
        workDaysPerMonth: parseInt(bulkWorkDays) || 26,
        effectiveDate: bulkEffectiveDate,
        note: bulkNote,
      };

      if (bulkType === "FIXED") {
        payload.fixedAmount = parseFloat(bulkFixedAmount) || 0;
      } else {
        payload.percentage = parseFloat(bulkPercentage) || 0;
      }

      if (bulkSalaryType !== "KEEP") {
        payload.salaryType = bulkSalaryType;
      }

      const res = await fetch("/api/payroll/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        setShowBulkModal(false);
        setSelectedEmpIds([]);
        fetchSalaries();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(json.error || "មិនអាចកែប្រែជាក្រុមបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setSavingBulk(false);
    }
  };

  // Submit import Excel
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("effectiveDate", importEffectiveDate);

      const res = await fetch("/api/payroll/salary/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        setShowImportModal(false);
        setImportFile(null);
        fetchSalaries();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(json.error || "មិនអាចនាំចូល Excel បានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setImporting(false);
    }
  };

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-white">គ្មានសិទ្ធិចូលមើលទំព័រនេះឡើយ</h2>
        <p className="text-xs mt-1">ទំព័រកំណត់ប្រាក់ខែអនុញ្ញាតសម្រាប់តែ Admin និង Super Admin ប៉ុណ្ណោះ។</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs between Payroll Run and Setup Salary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>កំណត់ប្រាក់ខែបុគ្គលិក</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Setup Salary
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                កំណត់ប្រាក់ខែគោល ប្រភេទប្រាក់ខែ និងកាលបរិច្ឆេទមានសុពលភាពសម្រាប់បុគ្គលិកទាំងអស់
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <Link
            href="/payroll"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ដំណើរការ Payroll (Runs)</span>
          </Link>
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow transition flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" />
            <span>កំណត់ប្រាក់ខែ (Setup)</span>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Warning banner if unconfigured salaries exist */}
      {unconfiguredCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold">មានបុគ្គលិកចំនួន {unconfiguredCount} នាក់ មិនទាន់មានប្រាក់ខែគោលត្រឹមត្រូវ ($0)!</span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                ប្រព័ន្ធនឹងមិនគណនា Payroll ស្ងាត់ៗជា $0 ឡើយ។ សូមកំណត់ប្រាក់ខែជូនពួកគាត់ជាមុនសិន។
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedFilterConfig("UNCONFIGURED")}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 whitespace-nowrap transition"
          >
            មើលបុគ្គលិក $0
          </button>
        </div>
      )}

      {/* KPI Stats & Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>បុគ្គលិកសរុប</span>
          </div>
          <div className="text-xl font-black text-white">{employees.length} នាក់</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>កំណត់រួចរាល់</span>
          </div>
          <div className="text-xl font-black text-emerald-400">
            {employees.length - unconfiguredCount} នាក់
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>មិនទាន់កំណត់ ($0)</span>
          </div>
          <div className="text-xl font-black text-amber-400">{unconfiguredCount} នាក់</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>ប្រាក់ខែសរុបគម្រោង</span>
          </div>
          <div className="text-xl font-black text-white">
            ${employees.reduce((acc, cur) => acc + (cur.baseSalary || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters and Buttons Row */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ ឬកូដ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">គ្រប់សាខាទាំងអស់</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">គ្រប់ផ្នែកទាំងអស់</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedFilterConfig}
            onChange={(e: any) => setSelectedFilterConfig(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ស្ថានភាពទាំងអស់</option>
            <option value="CONFIGURED">កំណត់រួចរាល់</option>
            <option value="UNCONFIGURED">មិនទាន់កំណត់ ($0)</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Bulk Edit Button */}
          <button
            onClick={() => setShowBulkModal(true)}
            disabled={selectedEmpIds.length === 0}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>កែច្រើននាក់ ({selectedEmpIds.length})</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">នាំចូល</span>
          </button>

          {/* Export Excel */}
          <a
            href="/api/payroll/salary/export"
            download
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ទាញយក Excel</span>
          </a>
        </div>
      </div>

      {/* Main Employee Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-white transition"
                  >
                    {selectedEmpIds.length > 0 && selectedEmpIds.length === filteredEmployees.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">បុគ្គលិក</th>
                <th className="py-3 px-3">សាខា & ផ្នែក</th>
                <th className="py-3 px-3">មុខតំណែង</th>
                <th className="py-3 px-3 text-right">ប្រាក់ខែគោល</th>
                <th className="py-3 px-3 text-center">ប្រភេទប្រាក់ខែ</th>
                <th className="py-3 px-3 text-center">ថ្ងៃ/ខែ</th>
                <th className="py-3 px-3 text-center">សុពលភាព</th>
                <th className="py-3 px-3 text-center">ប្រវត្តិ</th>
                <th className="py-3 px-3 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <span>កំពុងផ្ទុកទិន្នន័យ...</span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <span>មិនមានទិន្នន័យបុគ្គលិកត្រូវនឹងតម្រងឡើយ</span>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmpIds.includes(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? "bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleSelectOne(emp.id)}
                          className="text-slate-400 hover:text-white transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Employee Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              emp.name.slice(0, 2)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {!emp.isConfigured && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  $0 មិនទាន់កំណត់
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.code}</div>
                          </div>
                        </div>
                      </td>

                      {/* Branch & Dept */}
                      <td className="py-3 px-3">
                        <div className="text-white font-medium">{emp.branchName}</div>
                        <div className="text-[10px] text-slate-400">{emp.departmentName}</div>
                      </td>

                      {/* Position */}
                      <td className="py-3 px-3 text-slate-300">{emp.positionName}</td>

                      {/* Base Salary */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-black text-sm text-emerald-400">
                          ${emp.baseSalary.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {emp.salaryType === "MONTHLY"
                            ? `≈ $${(emp.baseSalary / (emp.workDaysPerMonth || 26)).toFixed(2)}/ថ្ងៃ`
                            : emp.salaryType === "DAILY"
                            ? `≈ $${(emp.baseSalary * (emp.workDaysPerMonth || 26)).toFixed(2)}/ខែ`
                            : `≈ $${(emp.baseSalary * 8).toFixed(2)}/ថ្ងៃ`}
                        </div>
                      </td>

                      {/* Salary Type */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            emp.salaryType === "MONTHLY"
                              ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                              : emp.salaryType === "DAILY"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {emp.salaryType === "MONTHLY"
                            ? "ប្រចាំខែ"
                            : emp.salaryType === "DAILY"
                            ? "ប្រចាំថ្ងៃ"
                            : "ប្រចាំម៉ោង"}
                        </span>
                      </td>

                      {/* Workdays */}
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {emp.workDaysPerMonth || 26} ថ្ងៃ
                      </td>

                      {/* Effective Date */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                        {emp.salaryEffectiveDate || "-"}
                      </td>

                      {/* History */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setHistoryEmp(emp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="មើលប្រវត្តិនៃការប្តូរប្រាក់ខែ"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold text-xs border border-blue-500/30 transition flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>កែប្រែ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Single Employee Edit */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <span>កែប្រែប្រាក់ខែបុគ្គលិក</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingEmp.name} ({editingEmp.code}) - {editingEmp.positionName}
                </p>
              </div>
              <button
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingle} className="space-y-3.5 text-xs">
              {/* Base Salary Input */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ប្រាក់ខែគោល (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editBaseSalary}
                    onChange={(e) => setEditBaseSalary(e.target.value)}
                    placeholder="250.00"
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Salary Type & Workdays */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ប្រភេទប្រាក់ខែ *
                  </label>
                  <select
                    value={editSalaryType}
                    onChange={(e) => setEditSalaryType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="MONTHLY">ប្រចាំខែ (Monthly)</option>
                    <option value="DAILY">ប្រចាំថ្ងៃ (Daily)</option>
                    <option value="HOURLY">ប្រចាំម៉ោង (Hourly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ថ្ងៃធ្វើការ/ខែ (លំនាំដើម 26)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editWorkDays}
                    onChange={(e) => setEditWorkDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Effective Date */}
              <div>
                <DatePicker
                  label="ថ្ងៃចាប់ផ្តើមមានសុពលភាព (Effective Date)"
                  required
                  value={editEffectiveDate}
                  onChange={setEditEffectiveDate}
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Payroll ចាស់មិនប្តូរតាម</span>
              </div>

              {/* Note / Reason */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  មូលហេតុ ឬកំណត់សម្គាល់ (Note)
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ដំឡើងប្រាក់ខែប្រចាំឆ្នាំ ឬកែតម្រូវ..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingSingle}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSingle ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Edit Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <span>កែប្រែប្រាក់ខែជាក្រុម ({selectedEmpIds.length} នាក់)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ជ្រើសរើសរបៀបកំណត់ប្រាក់ខែដូចគ្នា ឬបន្ថែម/ដកជាភាគរយ
                </p>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBulk} className="space-y-4 text-xs">
              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBulkType("FIXED")}
                  className={`p-3 rounded-xl border text-left transition ${
                    bulkType === "FIXED"
                      ? "bg-blue-600/20 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                    <span>ដាក់ប្រាក់ខែដូចគ្នា</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    កំណត់ចំនួនថេរដូចគ្នាទាំងអស់
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkType("PERCENTAGE")}
                  className={`p-3 rounded-xl border text-left transition ${
                    bulkType === "PERCENTAGE"
                      ? "bg-blue-600/20 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>បន្ថែម/ដកជា %</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    គណនាបន្ថែម ឬបន្ថយពីប្រាក់ខែចាស់
                  </div>
                </button>
              </div>

              {/* Value Input */}
              {bulkType === "FIXED" ? (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ចំនួនប្រាក់ខែថ្មី (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={bulkFixedAmount}
                      onChange={(e) => setBulkFixedAmount(e.target.value)}
                      placeholder="260.00"
                      className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>ភាគរយកែតម្រូវ (%) *</span>
                    <span className="text-[10px] text-slate-500">ឧ. +10 សម្រាប់បន្ថែម 10%, -5 សម្រាប់បន្ថយ 5%</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(e.target.value)}
                      placeholder="+10"
                      className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Extra settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ប្រភេទប្រាក់ខែ</label>
                  <select
                    value={bulkSalaryType}
                    onChange={(e) => setBulkSalaryType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="KEEP">ទុកដូចដើម (Keep Original)</option>
                    <option value="MONTHLY">ប្រចាំខែ (Monthly)</option>
                    <option value="DAILY">ប្រចាំថ្ងៃ (Daily)</option>
                    <option value="HOURLY">ប្រចាំម៉ោង (Hourly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ថ្ងៃធ្វើការ/ខែ</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={bulkWorkDays}
                    onChange={(e) => setBulkWorkDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <DatePicker
                  label="ថ្ងៃចាប់ផ្តើមមានសុពលភាព"
                  required
                  value={bulkEffectiveDate}
                  onChange={setBulkEffectiveDate}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">សម្គាល់</label>
                <input
                  type="text"
                  placeholder="ឧ. ដំឡើងប្រាក់ខែជារួមសម្រាប់សាខា..."
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingBulk}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingBulk ? "កំពុងកែប្រែ..." : `អនុវត្តលើ ${selectedEmpIds.length} នាក់`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: History Modal */}
      {historyEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>ប្រវត្តិនៃការផ្លាស់ប្តូរប្រាក់ខែ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {historyEmp.name} ({historyEmp.code})
                </p>
              </div>
              <button
                onClick={() => setHistoryEmp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 text-xs">
              {historyEmp.salaryHistories.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  មិនទាន់មានប្រវត្តិផ្លាស់ប្តូរនៅឡើយ
                </div>
              ) : (
                historyEmp.salaryHistories.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-emerald-400">
                        ${h.baseSalary.toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {h.salaryType} ({h.workDaysPerMonth} ថ្ងៃ/ខែ)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>សុពលភាព៖ <b className="text-white font-mono">{h.effectiveDate}</b></span>
                      <span>កាលបរិច្ឆេទកត់ត្រា៖ {new Date(h.createdAt).toLocaleDateString("km-KH")}</span>
                    </div>
                    {h.note && (
                      <div className="text-[10px] text-slate-500 italic bg-slate-900/60 p-1.5 rounded">
                        {h.note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setHistoryEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>នាំចូលប្រាក់ខែពី Excel (.xlsx)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update ប្រាក់ខែស្វ័យប្រវត្តិតាមរយៈកូដបុគ្គលិក
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportExcel} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ជ្រើសរើសឯកសារ Excel (.xlsx) *
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  required
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <DatePicker
                  label="ថ្ងៃចាប់ផ្តើមមានសុពលភាព"
                  required
                  value={importEffectiveDate}
                  onChange={setImportEffectiveDate}
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 text-[11px]">ទម្រង់គំរូ Excel៖</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  ជួរទី ១ ជាកូដបុគ្គលិក (ឧ. <code>EMP001</code>), ជួរទី ៦ ជាប្រាក់ខែ (ឧ. <code>350.00</code>)។ លោកអ្នកអាចចុច "ទាញយក Excel" ដើម្បីទទួលបាន File គំរូ។
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importing ? "កំពុង Import..." : "Import ឥឡូវនេះ"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
