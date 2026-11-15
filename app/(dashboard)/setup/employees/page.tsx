"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Users,
  Building2,
  Clock,
  Plus,
  Search,
  ShieldCheck,
  Download,
  Upload,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Lock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function EmployeesPage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    phone: "",
    branchId: "",
    departmentId: "",
    positionId: "",
    shiftId: "",
    pin: "1234",
    email: "",
    password: "",
    isActive: true,
    hiddenInReport: false,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/setup/overview");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.employees);
        setBranches(data.data.branches);
        setDepartments(data.data.departments);
        setPositions(data.data.positions);
        setShifts(data.data.shifts);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingEmp(null);
    const nextCode = `EMP${String(employees.length + 1).padStart(3, "0")}`;
    setFormData({
      code: nextCode,
      name: "",
      phone: "",
      branchId: branches[0]?.id || "",
      departmentId: departments[0]?.id || "",
      positionId: positions[0]?.id || "",
      shiftId: shifts[0]?.id || "",
      pin: "1234",
      email: "",
      password: "",
      isActive: true,
      hiddenInReport: false,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setEditingEmp(emp);
    setFormData({
      code: emp.code,
      name: emp.name,
      phone: emp.phone || "",
      branchId: emp.branchId,
      departmentId: emp.departmentId,
      positionId: emp.positionId,
      shiftId: emp.shiftId,
      pin: emp.pin || "1234",
      email: emp.user?.email || "",
      password: "",
      isActive: emp.isActive,
      hiddenInReport: emp.hiddenInReport,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const url = editingEmp ? `/api/employees/${editingEmp.id}` : "/api/employees";
      const method = editingEmp ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchData();
      } else {
        setErrorMsg(data.error || "Failed to save employee");
      }
    } catch {
      setErrorMsg("Error connecting to server");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបបុគ្គលិក "${name}" មែនឬទេ?`)) return;
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      fetchData();
    } catch {}
  };

  const handleExportExcel = () => {
    window.open("/api/employees/export", "_blank");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        alert("ការនាំចូលទិន្នន័យពី Excel បានជោគជ័យ!");
        fetchData();
      } else {
        alert("កំហុសក្នុងការនាំចូល៖ " + (data.error || "Unknown"));
      }
    } catch {
      alert("កំហុសបច្ចេកទេសក្នុងការ Upload");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = employees.filter((e) => {
    const matchQuery =
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.code.toLowerCase().includes(query.toLowerCase()) ||
      e.position?.name.toLowerCase().includes(query.toLowerCase()) ||
      e.branch?.name.toLowerCase().includes(query.toLowerCase());

    const matchBranch = branchFilter === "all" || e.branchId === branchFilter;
    return matchQuery && matchBranch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-500" />
            <span>គ្រប់គ្រងបុគ្គលិក (Employees Master Data)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            សរុប {employees.length} នាក់ • គ្រប់គ្រងព័ត៌មានបុគ្គលិក សាខា តួនាទី វេនម៉ោង និងគណនី Login
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>នាំចេញ Excel</span>
          </button>

          {/* Excel Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition shadow-xs disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>{importing ? "កំពុង Import..." : "នាំចូល Excel"}</span>
          </button>

          {/* Add Employee */}
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមបុគ្គលិក</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ កូដសម្គាល់ តួនាទី..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">សាខាទាំងអស់</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition space-y-3.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-600/20">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{emp.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {emp.code}
                      </span>
                      <span className="text-[11px] text-blue-400 font-medium truncate max-w-[120px]">
                        {emp.position?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="កែសម្រួល"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id, emp.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="លុប"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{emp.branch?.name}</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="truncate max-w-[110px]">{emp.department?.name}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pt-1.5 border-t border-slate-800/60">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">{emp.shift?.name}</span>
                </div>

                {emp.user?.email && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] pt-1 border-t border-slate-800/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono">{emp.user.email}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>PIN:</span>
                    <strong className="font-mono text-amber-300 font-bold tracking-widest">{emp.pin || "1234"}</strong>
                  </span>
                  {emp.pinLockedUntil && new Date() < new Date(emp.pinLockedUntil) && (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                      🔒 បានចាក់សោ
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                    emp.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-800 text-slate-500 border-slate-700"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {emp.isActive ? "សកម្ម (Active)" : "អសកម្ម"}
                </span>

                {emp.hiddenInReport && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    លាក់ក្នុងរបាយការណ៍
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span>{editingEmp ? "កែសម្រួលព័ត៌មានបុគ្គលិក" : "បន្ថែមបុគ្គលិកថ្មី"}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    កូដបុគ្គលិក *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ឈ្មោះបុគ្គលិក *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. សុខ វិសាល"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  លេខទូរស័ព្ទ
                </label>
                <input
                  type="text"
                  placeholder="012 345 678"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    សាខាធ្វើការ *
                  </label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ផ្នែកការងារ *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) =>
                      setFormData({ ...formData, departmentId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    តួនាទី / មុខតំណែង *
                  </label>
                  <select
                    required
                    value={formData.positionId}
                    onChange={(e) =>
                      setFormData({ ...formData, positionId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    វេនម៉ោងធ្វើការ *
                  </label>
                  <select
                    required
                    value={formData.shiftId}
                    onChange={(e) =>
                      setFormData({ ...formData, shiftId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4-digit PIN Configuration */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>លេខកូដសម្ងាត់ Check-in (PIN ៤ ខ្ទង់) *</span>
                  </label>
                  {editingEmp && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pin: "1234" })}
                      className="text-[10px] text-amber-400 hover:underline font-mono"
                    >
                      Reset ទៅ 1234
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={formData.pin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pin: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="1234"
                    className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold tracking-widest text-center focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400">
                    បុគ្គលិកត្រូវវាយកូដនេះពេល Check-in
                  </span>
                </div>
              </div>

              {!editingEmp && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <span className="font-semibold text-slate-300 block">
                    បង្កើតគណនី Login (ជម្រើសបន្ថែម)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email សម្រាប់ Login"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                      type="password"
                      placeholder="Password (លំនាំដើម Attend@12345)"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700"
                  />
                  <span className="text-slate-300">បុគ្គលិកសកម្ម</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hiddenInReport}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hiddenInReport: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-amber-600 bg-slate-950 border-slate-700"
                  />
                  <span className="text-slate-400">លាក់ក្នុងរបាយការណ៍</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
