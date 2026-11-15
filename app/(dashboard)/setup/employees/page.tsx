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
  Calendar,
  AlertTriangle,
  Layers,
  CheckSquare,
  Square,
  Moon,
  Briefcase,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  Shield,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import { DatePicker } from "@/components/date-picker";
import { generateReadableTempPassword } from "@/lib/pin-utils";

const DAYS_OF_WEEK = [
  { key: "1", label: "ចន្ទ", en: "Mon" },
  { key: "2", label: "អង្គារ", en: "Tue" },
  { key: "3", label: "ពុធ", en: "Wed" },
  { key: "4", label: "ព្រហស្បតិ៍", en: "Thu" },
  { key: "5", label: "សុក្រ", en: "Fri" },
  { key: "6", label: "សៅរ៍", en: "Sat" },
  { key: "0", label: "អាទិត្យ", en: "Sun" },
];

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "ពេញម៉ោង (Full-Time)", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "PART_TIME", label: "ក្រៅម៉ោង (Part-Time)", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "PROBATION", label: "សាកល្បង (Probation)", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "CONTRACT", label: "កិច្ចសន្យា (Contract)", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
];

export default function EmployeesPage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");

  // Multi-selection for bulk actions
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkWorkingDays, setBulkWorkingDays] = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [bulkScheduleType, setBulkScheduleType] = useState<"TEMPLATE" | "CUSTOM">("TEMPLATE");
  const [bulkCustomStart, setBulkCustomStart] = useState("07:00");
  const [bulkCustomEnd, setBulkCustomEnd] = useState("16:00");
  const [bulkGraceMinutes, setBulkGraceMinutes] = useState(15);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    phone: "",
    branchId: "",
    otherBranchIds: [] as string[],
    departmentId: "",
    positionId: "",
    employmentType: "FULL_TIME",
    joinDate: new Date().toISOString().slice(0, 10),
    endProbationDate: "",
    endContractDate: "",
    shiftId: "",
    workingDays: ["1", "2", "3", "4", "5"] as string[],
    shiftScheduleType: "TEMPLATE" as "TEMPLATE" | "CUSTOM",
    selectedTemplateId: "",
    customStartTime: "07:00",
    customEndTime: "16:00",
    customGraceMinutes: 15,
    pin: "1234",
    baseSalary: 200,
    salaryType: "MONTHLY",
    email: "",
    password: "",
    createLoginAccount: false,
    role: "EMPLOYEE",
    isActive: true,
    hiddenInReport: false,
  });

  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN";

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Reset PIN modal state
  const [resetPinResult, setResetPinResult] = useState<{
    code: string;
    name: string;
    newPin: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  // Reset Password modal state
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    username: string;
    tempPassword: string;
    name: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Bulk Create Logins state
  const [bulkLoginsResult, setBulkLoginsResult] = useState<Array<{
    code: string;
    name: string;
    username: string;
    tempPassword: string;
    status: string;
  }> | null>(null);
  const [bulkLoginsLoading, setBulkLoginsLoading] = useState(false);

  const handleToggleUserStatus = async (empId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/employees/${empId}/toggle-user-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "បរាជ័យក្នុងការប្តូរស្ថានភាព");
      }
    } catch {
      alert("មានបញ្ហាបច្ចេកទេស");
    }
  };

  const handleResetUserPassword = async (empId: string) => {
    if (!confirm("តើលោកអ្នកពិតជាចង់ Reset ពាក្យសម្ងាត់សម្រាប់បុគ្គលិកនេះមែនទេ?")) return;
    try {
      const res = await fetch(`/api/employees/${empId}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setResetPasswordResult({
          username: data.username,
          tempPassword: data.tempPassword,
          name: data.employeeName,
        });
        fetchData();
      } else {
        alert(data.error || "បរាជ័យក្នុងការ Reset ពាក្យសម្ងាត់");
      }
    } catch {
      alert("មានបញ្ហាបច្ចេកទេស");
    }
  };

  const handleBulkCreateLogins = async () => {
    if (selectedEmpIds.length === 0) return;
    if (
      !confirm(
        `តើលោកអ្នកចង់បង្កើតគណនី Login សម្រាប់បុគ្គលិកចំនួន ${selectedEmpIds.length} នាក់ និងទាញយក Excel មែនទេ?`
      )
    )
      return;

    setBulkLoginsLoading(true);
    try {
      const res = await fetch("/api/employees/bulk-create-logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: selectedEmpIds }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkLoginsResult(data.accounts || []);
        fetchData();

        // Generate and trigger CSV download with UTF-8 BOM
        const rows = [
          [
            "កូដបុគ្គលិក",
            "ឈ្មោះបុគ្គលិក",
            "Username សម្រាប់ចូល",
            "ពាក្យសម្ងាត់បណ្តោះអាសន្ន",
            "ស្ថានភាព",
          ],
          ...(data.accounts || []).map((acc: any) => [
            acc.code,
            acc.name,
            acc.username,
            acc.tempPassword,
            acc.status === "CREATED" ? "បង្កើតថ្មី" : "មានគណនីស្រាប់",
          ]),
        ];
        const csvContent =
          "\uFEFF" +
          rows.map((e: any[]) => e.map((c: any) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `attendpro_logins_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(data.error || "បរាជ័យក្នុងការបង្កើតគណនី");
      }
    } catch {
      alert("មានបញ្ហាបច្ចេកទេស");
    } finally {
      setBulkLoginsLoading(false);
    }
  };

  const handleResetPin = async (empId: string) => {
    if (!confirm("តើលោកអ្នកពិតជាចង់ Reset PIN សម្រាប់បុគ្គលិកនេះមែនទេ?")) return;
    try {
      const res = await fetch(`/api/employees/${empId}/reset-pin`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setResetPinResult({
          code: data.employeeCode,
          name: data.employeeName,
          newPin: data.newPin,
        });
        fetchData();
      } else {
        alert(data.error || "បរាជ័យក្នុងការ Reset PIN");
      }
    } catch {
      alert("មានបញ្ហាបច្ចេកទេស");
    }
  };

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
    const defaultShift = shifts[0];
    const initialDays = defaultShift?.workDays
      ? defaultShift.workDays.split(",").map((d: string) => d.trim())
      : ["1", "2", "3", "4", "5"];

    setFormData({
      code: nextCode,
      name: "",
      phone: "",
      branchId: branches[0]?.id || "",
      otherBranchIds: [],
      departmentId: departments[0]?.id || "",
      positionId: positions[0]?.id || "",
      employmentType: "FULL_TIME",
      joinDate: new Date().toISOString().slice(0, 10),
      endProbationDate: "",
      endContractDate: "",
      shiftId: defaultShift?.id || "",
      workingDays: initialDays,
      shiftScheduleType: "TEMPLATE",
      selectedTemplateId: defaultShift?.templates?.[0]?.id || "",
      customStartTime: defaultShift?.startTime || "07:00",
      customEndTime: defaultShift?.endTime || "16:00",
      customGraceMinutes: defaultShift?.graceMinutes || 15,
      pin: "1234",
      baseSalary: 200,
      salaryType: "MONTHLY",
      email: "",
      password: "",
      createLoginAccount: false,
      role: "EMPLOYEE",
      isActive: true,
      hiddenInReport: false,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setEditingEmp(emp);

    const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];
    const currentDays = emp.workingDays
      ? emp.workingDays.split(",").map((d: string) => d.trim())
      : shift?.workDays?.split(",").map((d: string) => d.trim()) || ["1", "2", "3", "4", "5"];

    const otherBranches = emp.otherBranchIds
      ? emp.otherBranchIds.split(",").map((b: string) => b.trim()).filter(Boolean)
      : [];

    setFormData({
      code: emp.code,
      name: emp.name,
      phone: emp.phone || "",
      branchId: emp.branchId,
      otherBranchIds: otherBranches,
      departmentId: emp.departmentId,
      positionId: emp.positionId,
      employmentType: emp.employmentType || "FULL_TIME",
      joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      endProbationDate: emp.endProbationDate ? new Date(emp.endProbationDate).toISOString().slice(0, 10) : "",
      endContractDate: emp.endContractDate ? new Date(emp.endContractDate).toISOString().slice(0, 10) : "",
      shiftId: emp.shiftId || shift?.id || "",
      workingDays: currentDays,
      shiftScheduleType: emp.shiftScheduleType || "TEMPLATE",
      selectedTemplateId: shift?.templates?.[0]?.id || "",
      customStartTime: emp.customStartTime || shift?.startTime || "07:00",
      customEndTime: emp.customEndTime || shift?.endTime || "16:00",
      customGraceMinutes: emp.customGraceMinutes ?? (shift?.graceMinutes || 15),
      pin: emp.pin || "1234",
      baseSalary: emp.baseSalary !== undefined ? emp.baseSalary : 200,
      salaryType: emp.salaryType || "MONTHLY",
      email: emp.user?.email || "",
      password: "",
      createLoginAccount: !!emp.user,
      role: emp.user?.role || "EMPLOYEE",
      isActive: emp.isActive,
      hiddenInReport: emp.hiddenInReport,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleShiftChange = (newShiftId: string) => {
    const shift = shifts.find((s) => s.id === newShiftId);
    if (!shift) return;
    const days = shift.workDays
      ? shift.workDays.split(",").map((d: string) => d.trim())
      : ["1", "2", "3", "4", "5"];

    setFormData((prev) => ({
      ...prev,
      shiftId: newShiftId,
      workingDays: days,
      selectedTemplateId: shift.templates?.[0]?.id || "",
      customStartTime: shift.startTime || prev.customStartTime,
      customEndTime: shift.endTime || prev.customEndTime,
      customGraceMinutes: shift.graceMinutes || prev.customGraceMinutes,
    }));
  };

  const toggleWorkingDay = (dayKey: string) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(dayKey);
      const nextDays = exists
        ? prev.workingDays.filter((d) => d !== dayKey)
        : [...prev.workingDays, dayKey];
      return { ...prev, workingDays: nextDays };
    });
  };

  const toggleOtherBranch = (bId: string) => {
    setFormData((prev) => {
      const exists = prev.otherBranchIds.includes(bId);
      const nextList = exists
        ? prev.otherBranchIds.filter((id) => id !== bId)
        : [...prev.otherBranchIds, bId];
      return { ...prev, otherBranchIds: nextList };
    });
  };

  const isOvernight = (start: string, end: string) => {
    if (!start || !end) return false;
    return end < start;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!formData.joinDate) {
      setErrorMsg("សូមបញ្ចូលកាលបរិច្ឆេទចូលធ្វើការ (Join Date)");
      return;
    }
    if (formData.workingDays.length === 0) {
      setErrorMsg("សូមជ្រើសរើសថ្ងៃធ្វើការយ៉ាងហោចណាស់ ១ ថ្ងៃ");
      return;
    }

    setSaving(true);

    try {
      const url = editingEmp ? `/api/employees/${editingEmp.id}` : "/api/employees";
      const method = editingEmp ? "PUT" : "POST";

      const payload = {
        ...formData,
        workingDays: formData.workingDays.join(","),
        otherBranchIds: formData.otherBranchIds.join(","),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        if (data.tempPassword) {
          setResetPasswordResult({
            username: data.username || formData.email || formData.phone || formData.code,
            tempPassword: data.tempPassword,
            name: data.data?.name || formData.name,
          });
        }
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
        alert(data.message || "ការនាំចូលទិន្នន័យពី Excel បានជោគជ័យ!");
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

  // Bulk shift assignment modal logic
  const openBulkModal = () => {
    if (selectedEmpIds.length === 0) return;
    const defaultShift = shifts[0];
    setBulkShiftId(defaultShift?.id || "");
    const days = defaultShift?.workDays
      ? defaultShift.workDays.split(",").map((d: string) => d.trim())
      : ["1", "2", "3", "4", "5"];
    setBulkWorkingDays(days);
    setBulkScheduleType("TEMPLATE");
    setBulkCustomStart(defaultShift?.startTime || "07:00");
    setBulkCustomEnd(defaultShift?.endTime || "16:00");
    setBulkGraceMinutes(defaultShift?.graceMinutes || 15);
    setIsBulkModalOpen(true);
  };

  const handleBulkShiftChange = (sId: string) => {
    setBulkShiftId(sId);
    const shift = shifts.find((s) => s.id === sId);
    if (shift?.workDays) {
      setBulkWorkingDays(shift.workDays.split(",").map((d: string) => d.trim()));
      setBulkCustomStart(shift.startTime);
      setBulkCustomEnd(shift.endTime);
      setBulkGraceMinutes(shift.graceMinutes || 15);
    }
  };

  const toggleBulkDay = (dKey: string) => {
    setBulkWorkingDays((prev) =>
      prev.includes(dKey) ? prev.filter((k) => k !== dKey) : [...prev, dKey]
    );
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkWorkingDays.length === 0) {
      alert("សូមជ្រើសរើសថ្ងៃធ្វើការយ៉ាងហោចណាស់ ១ ថ្ងៃ");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await fetch("/api/employees/bulk-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: selectedEmpIds,
          shiftId: bulkShiftId,
          workingDays: bulkWorkingDays.join(","),
          shiftScheduleType: bulkScheduleType,
          customStartTime: bulkScheduleType === "CUSTOM" ? bulkCustomStart : undefined,
          customEndTime: bulkScheduleType === "CUSTOM" ? bulkCustomEnd : undefined,
          customGraceMinutes: bulkGraceMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "បានកំណត់វេនដោយជោគជ័យ!");
        setIsBulkModalOpen(false);
        setSelectedEmpIds([]);
        fetchData();
      } else {
        alert("កំហុស៖ " + (data.error || "Failed"));
      }
    } catch {
      alert("កំហុសក្នុងការតភ្ជាប់");
    }
    setBulkSaving(false);
  };

  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.length === filtered.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filtered.map((e) => e.id));
    }
  };

  // Warning badges for probation and contract
  const getContractAlert = (emp: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alerts = [];

    if (emp.endProbationDate) {
      const d = new Date(emp.endProbationDate);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        alerts.push({ type: "danger", text: `ផុតសាកល្បង (${Math.abs(diffDays)} ថ្ងៃមុន)` });
      } else if (diffDays <= 7) {
        alerts.push({ type: "warning", text: `ជិតផុតសាកល្បង (${diffDays === 0 ? "ថ្ងៃនេះ" : diffDays + " ថ្ងៃទៀត"})` });
      }
    }

    if (emp.endContractDate) {
      const d = new Date(emp.endContractDate);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        alerts.push({ type: "danger", text: `ផុតកិច្ចសន្យា (${Math.abs(diffDays)} ថ្ងៃមុន)` });
      } else if (diffDays <= 7) {
        alerts.push({ type: "warning", text: `ជិតផុតកិច្ចសន្យា (${diffDays === 0 ? "ថ្ងៃនេះ" : diffDays + " ថ្ងៃទៀត"})` });
      }
    }

    return alerts;
  };

  // Filtering
  const filtered = employees.filter((e) => {
    const matchQuery =
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.code.toLowerCase().includes(query.toLowerCase()) ||
      e.position?.name.toLowerCase().includes(query.toLowerCase()) ||
      e.branch?.name.toLowerCase().includes(query.toLowerCase());

    const matchBranch = branchFilter === "all" || e.branchId === branchFilter;
    const matchShift = shiftFilter === "all" || e.shiftId === shiftFilter;
    return matchQuery && matchBranch && matchShift;
  });

  const currentSelectedShift = shifts.find((s) => s.id === formData.shiftId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-500" />
            <span>គ្រប់គ្រងបុគ្គលិក (Employees Master Data)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            សរុប {employees.length} នាក់ • គ្រប់គ្រងព័ត៌មានបុគ្គលិក កាលវិភាគវេនការងារ ថ្ងៃធ្វើការ និងគណនី Check-in
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Assign Shift Button */}
          {selectedEmpIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={openBulkModal}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-purple-600/30"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>កំណត់វេន/ម៉ោង ({selectedEmpIds.length})</span>
              </button>

              <button
                type="button"
                disabled={bulkLoginsLoading}
                onClick={handleBulkCreateLogins}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{bulkLoginsLoading ? "កំពុងបង្កើត..." : `បង្កើតគណនី Login (${selectedEmpIds.length})`}</span>
              </button>
            </>
          )}

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
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="flex-1 md:w-44 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">សាខាទាំងអស់</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="flex-1 md:w-48 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">វេនទាំងអស់</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition"
          >
            {selectedEmpIds.length === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>ជ្រើសទាំងអស់</span>
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => {
            const isSelected = selectedEmpIds.includes(emp.id);
            const alerts = getContractAlert(emp);

            const displayWorkingDays = (emp.workingDays || emp.shift?.workDays || "1,2,3,4,5")
              .split(",")
              .map((d: string) => {
                const dayObj = DAYS_OF_WEEK.find((dw) => dw.key === d.trim());
                return dayObj ? dayObj.label : d;
              })
              .join(", ");

            const displayHours =
              emp.shiftScheduleType === "CUSTOM" && emp.customStartTime && emp.customEndTime
                ? `${emp.customStartTime} - ${emp.customEndTime}`
                : `${emp.shift?.startTime || "07:00"} - ${emp.shift?.endTime || "16:00"}`;

            const overnight =
              emp.shiftScheduleType === "CUSTOM" && emp.customStartTime && emp.customEndTime
                ? isOvernight(emp.customStartTime, emp.customEndTime)
                : isOvernight(emp.shift?.startTime, emp.shift?.endTime);

            const typeConfig =
              EMPLOYMENT_TYPES.find((et) => et.value === (emp.employmentType || "FULL_TIME")) ||
              EMPLOYMENT_TYPES[0];

            return (
              <div
                key={emp.id}
                className={`p-5 rounded-2xl bg-slate-900 border transition space-y-3.5 relative ${
                  isSelected ? "border-blue-500 shadow-md shadow-blue-500/10" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelectEmp(emp.id)}
                  className="absolute top-4 left-4 z-10 text-slate-400 hover:text-white"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                  )}
                </button>

                <div className="flex items-start justify-between pl-8">
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

                {/* Contract / Probation Alert Badges */}
                {alerts.length > 0 && (
                  <div className="space-y-1">
                    {alerts.map((alt, i) => (
                      <div
                        key={i}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 border ${
                          alt.type === "danger"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse"
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{alt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                  {/* Branch and Department */}
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{emp.branch?.name}</span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="truncate max-w-[110px]">{emp.department?.name}</span>
                  </div>

                  {/* Shift & Working Days */}
                  <div className="pt-1.5 border-t border-slate-800/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{emp.shift?.name}</span>
                      </span>
                      <span className="font-mono text-slate-300 font-semibold flex items-center gap-1">
                        {displayHours}
                        {overnight && (
                          <span title="ឆ្លងអធ្រាត្រ">
                            <Moon className="w-3 h-3 text-indigo-400 inline" />
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ថ្ងៃធ្វើការ:</span>
                      <span className="text-blue-300 font-medium">{displayWorkingDays}</span>
                    </div>

                    {emp.otherBranchIds && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>សាខាអនុញ្ញាត:</span>
                        <span className="text-emerald-400 font-medium">
                          +{emp.otherBranchIds.split(",").length} សាខាទៀត
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Employment Type & Join Date */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeConfig.color}`}>
                      {typeConfig.label.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      ចូល: {emp.joinDate ? new Date(emp.joinDate).toISOString().slice(0, 10) : "-"}
                    </span>
                  </div>

                  {/* Security PIN & Salary */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>PIN:</span>
                        <strong className="font-mono text-slate-700 dark:text-slate-300 font-bold tracking-widest">●●●●</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetPin(emp.id)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition flex items-center gap-1"
                        title="Reset PIN ចៃដន្យថ្មី"
                      >
                        <KeyRound className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ${emp.baseSalary || 200}/{emp.salaryType === "HOURLY" ? "ម៉ោង" : emp.salaryType === "DAILY" ? "ថ្ងៃ" : "ខែ"}
                    </span>
                  </div>

                  {/* Login Account Management */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-slate-500 dark:text-slate-400">Login:</span>
                      {emp.user ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {emp.user.role === "ADMIN" ? "Admin" : emp.user.role === "MANAGER" ? "Manager" : "Employee"}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-800 border border-slate-700">
                          គ្មាន Login
                        </span>
                      )}
                    </div>

                    {emp.user ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(emp.id, emp.user.isActive)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                            emp.user.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                          }`}
                          title={emp.user.isActive ? "ចុចដើម្បីបិទគណនី Login" : "ចុចដើម្បីបើកគណនី Login"}
                        >
                          {emp.user.isActive ? "បើក" : "បិទ"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetUserPassword(emp.id)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition flex items-center gap-1"
                          title="Reset ពាក្យសម្ងាត់ថ្មី"
                        >
                          <KeyRound className="w-2.5 h-2.5" />
                          <span>Reset PW</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          openEditModal(emp);
                          setFormData((prev) => ({
                            ...prev,
                            createLoginAccount: true,
                            role: "EMPLOYEE",
                            password: generateReadableTempPassword(),
                          }));
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ បង្កើត Login</span>
                      </button>
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
            );
          })}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span>{editingEmp ? `កែសម្រួលព័ត៌មានបុគ្គលិក: ${editingEmp.name}` : "បន្ថែមបុគ្គលិកថ្មី"}</span>
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
              {/* SECTION 1: Personal Info */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-xs flex items-center gap-2 text-blue-400">
                  <Users className="w-4 h-4" />
                  <span>១. ព័ត៌មានទូទៅ (General Information)</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      កូដបុគ្គលិក *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
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
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">លេខទូរស័ព្ទ</label>
                    <input
                      type="text"
                      placeholder="012 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ប្រភេទបុគ្គលិក *
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      {EMPLOYMENT_TYPES.map((et) => (
                        <option key={et.value} value={et.value}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ផ្នែកការងារ *</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      តួនាទី / មុខតំណែង *
                    </label>
                    <select
                      required
                      value={formData.positionId}
                      onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Working Information (ព័ត៌មានការងារ) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3.5">
                <h3 className="font-bold text-white text-xs flex items-center gap-2 text-emerald-400">
                  <Briefcase className="w-4 h-4" />
                  <span>២. ព័ត៌មានការងារ & កាលវិភាគវេន (Working Schedule)</span>
                </h3>

                {/* Shift Selector */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ប្រភេទវេនម៉ោងធ្វើការ *
                  </label>
                  <select
                    required
                    value={formData.shiftId}
                    onChange={(e) => handleShiftChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.workDays?.includes("6") ? "សៅរ៍-អាទិត្យ" : "ចន្ទ-សុក្រ"} • {s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Working Days Checkboxes (Mon - Sun) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-300 font-semibold">
                      ថ្ងៃធ្វើការក្នុងសប្តាហ៍ * (យ៉ាងហោចណាស់ ១ ថ្ងៃ)
                    </label>
                    <span className="text-[10px] text-blue-400 font-medium">
                      បានជ្រើស {formData.workingDays.length} ថ្ងៃ
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isChecked = formData.workingDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleWorkingDay(d.key)}
                          className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition ${
                            isChecked
                              ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs"
                              : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                          }`}
                        >
                          <div>{d.label}</div>
                          <div className="text-[9px] opacity-60 font-mono">{d.en}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Hours Option: Template vs Custom */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="block text-slate-300 font-semibold">
                    ការកំណត់ម៉ោងចូល-ចេញ (Working Hours)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                        formData.shiftScheduleType === "TEMPLATE"
                          ? "bg-blue-500/10 border-blue-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shiftScheduleType"
                        checked={formData.shiftScheduleType === "TEMPLATE"}
                        onChange={() => setFormData({ ...formData, shiftScheduleType: "TEMPLATE" })}
                        className="text-blue-600"
                      />
                      <span className="font-semibold text-xs">យកតាមម៉ោងគំរូនៃវេន (Template)</span>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                        formData.shiftScheduleType === "CUSTOM"
                          ? "bg-blue-500/10 border-blue-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shiftScheduleType"
                        checked={formData.shiftScheduleType === "CUSTOM"}
                        onChange={() => setFormData({ ...formData, shiftScheduleType: "CUSTOM" })}
                        className="text-blue-600"
                      />
                      <span className="font-semibold text-xs">កំណត់ម៉ោងផ្ទាល់ខ្លួន (Custom)</span>
                    </label>
                  </div>

                  {/* Sub-inputs based on Template or Custom */}
                  {formData.shiftScheduleType === "TEMPLATE" ? (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <label className="block text-slate-400 text-[11px]">ជ្រើសរើសម៉ោងគំរូនៃវេន៖</label>
                      {currentSelectedShift?.templates && currentSelectedShift.templates.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {currentSelectedShift.templates.map((tpl: any) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  selectedTemplateId: tpl.id,
                                  customStartTime: tpl.startTime,
                                  customEndTime: tpl.endTime,
                                });
                              }}
                              className={`p-2 rounded-lg border text-left text-xs transition ${
                                formData.selectedTemplateId === tpl.id
                                  ? "bg-emerald-500/20 border-emerald-500 text-white"
                                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div className="font-semibold text-emerald-400">{tpl.name}</div>
                              <div className="font-mono text-[11px] text-slate-300">
                                {tpl.startTime} - {tpl.endTime}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-300 font-mono text-xs p-2 rounded bg-slate-950 border border-slate-800">
                          ម៉ោងវេន: {currentSelectedShift?.startTime} - {currentSelectedShift?.endTime}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1">
                            ម៉ោងចូលផ្ទាល់ខ្លួន (IN) *
                          </label>
                          <input
                            type="time"
                            required
                            value={formData.customStartTime}
                            onChange={(e) =>
                              setFormData({ ...formData, customStartTime: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1">
                            ម៉ោងចេញផ្ទាល់ខ្លួន (OUT) *
                          </label>
                          <input
                            type="time"
                            required
                            value={formData.customEndTime}
                            onChange={(e) =>
                              setFormData({ ...formData, customEndTime: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {isOvernight(formData.customStartTime, formData.customEndTime) && (
                        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>🌙 វេនឆ្លងអធ្រាត្រ៖ ម៉ោងចេញស្ថិតនៅថ្ងៃបន្ទាប់ (+1 ថ្ងៃ)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grace Minutes */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    នាទីអនុគ្រោះយឺតសម្រាប់បុគ្គលិកនេះ (Grace Minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={formData.customGraceMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customGraceMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-28 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-blue-500"
                    />
                    <span className="text-slate-400 text-xs">
                      នាទី (បើមិនដាក់ យកតាមវេន ឬ Settings)
                    </span>
                  </div>
                </div>

                {/* Important Dates: Join Date (Required), Probation, Contract */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                  <div>
                    <DatePicker
                      label="ថ្ងៃចូលធ្វើការ (Join Date)"
                      required
                      value={formData.joinDate}
                      onChange={(d) => setFormData({ ...formData, joinDate: d })}
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      ថ្ងៃមុននេះមិនរាប់ជាអវត្តមាន
                    </span>
                  </div>

                  <div>
                    <DatePicker
                      label="ចប់សាកល្បង (Probation End)"
                      value={formData.endProbationDate}
                      onChange={(d) => setFormData({ ...formData, endProbationDate: d })}
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      ជូនដំណឹងមុន ៧ ថ្ងៃ
                    </span>
                  </div>

                  <div>
                    <DatePicker
                      label="ផុតកិច្ចសន្យា (Contract End)"
                      value={formData.endContractDate}
                      onChange={(d) => setFormData({ ...formData, endContractDate: d })}
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      ជូនដំណឹងមុន ៧ ថ្ងៃ
                    </span>
                  </div>
                </div>

                {/* Main Branch & Allowed Other Branches */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      សាខាចម្បង (Main Branch) *
                    </label>
                    <select
                      required
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {branches.length > 1 && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">
                        សាខាផ្សេងទៀតដែលអាច Check-in បាន (Allowed Other Branches)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {branches
                          .filter((b) => b.id !== formData.branchId)
                          .map((b) => {
                            const isAllowed = formData.otherBranchIds.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => toggleOtherBranch(b.id)}
                                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                                  isAllowed
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                                }`}
                              >
                                {isAllowed ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <span>{b.name}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Salary & Security */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-xs flex items-center gap-2 text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span>៣. ប្រាក់ខែ & សុវត្ថិភាព Check-in</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      ប្រាក់ខែគោល (USD) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        required
                        value={formData.baseSalary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            baseSalary: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">
                        $
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      ប្រភេទបើកប្រាក់ *
                    </label>
                    <select
                      value={formData.salaryType}
                      onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="MONTHLY">ប្រចាំខែ (Monthly)</option>
                      <option value="DAILY">ប្រចាំថ្ងៃ (Daily)</option>
                      <option value="HOURLY">តាមម៉ោង (Hourly)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>លេខកូដសម្ងាត់ Check-in (PIN ៤ ខ្ទង់) *</span>
                    </label>
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
                      placeholder="****"
                      className="w-28 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold tracking-widest text-center focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">
                      បុគ្គលិកត្រូវវាយកូដនេះពេល Check-in
                    </span>
                  </div>
                </div>

                {/* Login Account Section */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>គណនី Login សម្រាប់ប្រព័ន្ធ (ជម្រើស)</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        សម្រាប់ចូលប្រើប្រព័ន្ធ ស្នើសុំច្បាប់/OT និងមើលទិន្នន័យផ្ទាល់ខ្លួន
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.createLoginAccount}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            createLoginAccount: checked,
                            password: checked && !prev.password ? generateReadableTempPassword() : prev.password,
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.createLoginAccount && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      {/* Username Hint */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Username ចូលប្រើ៖</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          ប្រព័ន្ធនឹងយក{" "}
                          <strong className="text-white">
                            {formData.phone ? formData.phone : formData.email ? formData.email : formData.code}
                          </strong>{" "}
                          (លេខទូរស័ព្ទ អ៊ីមែល ឬកូដបុគ្គលិក) ជា Username សម្រាប់ចូល។
                        </p>
                      </div>

                      {/* Role and Email */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            អ៊ីមែល (បើមាន)
                          </label>
                          <input
                            type="email"
                            placeholder="ឧ. som.chann@attendpro.local"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            តួនាទីគណនី (Role)
                          </label>
                          <select
                            value={formData.role}
                            disabled={!isSuperAdmin}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="EMPLOYEE">បុគ្គលិក (Employee)</option>
                            <option value="MANAGER">ប្រធានផ្នែក (Manager)</option>
                            <option value="ADMIN">អ្នកគ្រប់គ្រង (Admin)</option>
                          </select>
                          {!isSuperAdmin && (
                            <span className="text-[9px] text-slate-500 block mt-0.5">
                              * មានតែ Super Admin ទើបអាចកំណត់ Manager/Admin បាន
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Password with Random Generator and Copy */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-300">
                            ពាក្យសម្ងាត់ (Password យ៉ាងតិច ៨ តួ) *
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                password: generateReadableTempPassword(),
                              }))
                            }
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                          >
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            <span>បង្កើតចៃដន្យ (Random)</span>
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            required={formData.createLoginAccount && !editingEmp?.user}
                            placeholder="យ៉ាងតិច ៨ តួ (ឧ. Attend#9k2m)"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full pl-3 pr-20 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                          {formData.password && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(formData.password);
                                alert("បានចម្លងពាក្យសម្ងាត់");
                              }}
                              className="absolute right-1 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1 transition"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>ចម្លង</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          បុគ្គលិកនឹងត្រូវតម្រូវឱ្យប្តូរពាក្យសម្ងាត់ពេលចូលលើកដំបូង។
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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

      {/* Bulk Shift Assignment Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>កំណត់វេន និងកាលវិភាគការងារជាក្រុម ({selectedEmpIds.length} នាក់)</span>
              </h2>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
                អ្នកកំពុងកំណត់វេនការងារលើបុគ្គលិកដែលបានជ្រើសរើសចំនួន <strong>{selectedEmpIds.length} នាក់</strong> ក្នុងពេលតែមួយ។
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ជ្រើសរើសវេនធ្វើការ *
                </label>
                <select
                  required
                  value={bulkShiftId}
                  onChange={(e) => handleBulkShiftChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-purple-500"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.workDays?.includes("6") ? "សៅរ៍-អាទិត្យ" : "ចន្ទ-សុក្រ"} • {s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Working days checkboxes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  ថ្ងៃធ្វើការក្នុងសប្តាហ៍ *
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isChecked = bulkWorkingDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleBulkDay(d.key)}
                        className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition ${
                          isChecked
                            ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                        }`}
                      >
                        <div>{d.label}</div>
                        <div className="text-[9px] opacity-60 font-mono">{d.en}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours mode */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">ម៉ោងធ្វើការ</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${
                      bulkScheduleType === "TEMPLATE"
                        ? "bg-purple-500/10 border-purple-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkScheduleType"
                      checked={bulkScheduleType === "TEMPLATE"}
                      onChange={() => setBulkScheduleType("TEMPLATE")}
                      className="text-purple-600"
                    />
                    <span>យកតាមវេនលំនាំដើម</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${
                      bulkScheduleType === "CUSTOM"
                        ? "bg-purple-500/10 border-purple-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkScheduleType"
                      checked={bulkScheduleType === "CUSTOM"}
                      onChange={() => setBulkScheduleType("CUSTOM")}
                      className="text-purple-600"
                    />
                    <span>កំណត់ម៉ោងផ្ទាល់ខ្លួន</span>
                  </label>
                </div>

                {bulkScheduleType === "CUSTOM" && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">ម៉ោងចូល (IN)</label>
                      <input
                        type="time"
                        value={bulkCustomStart}
                        onChange={(e) => setBulkCustomStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">ម៉ោងចេញ (OUT)</label>
                      <input
                        type="time"
                        value={bulkCustomEnd}
                        onChange={(e) => setBulkCustomEnd(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grace minutes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  នាទីអនុគ្រោះយឺត (Grace Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={bulkGraceMinutes}
                  onChange={(e) => setBulkGraceMinutes(parseInt(e.target.value) || 0)}
                  className="w-28 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {bulkSaving ? "កំពុងអនុវត្ត..." : `អនុវត្តលើ ${selectedEmpIds.length} នាក់`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Result Modal (Shown Once) */}
      {resetPinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => {
                setResetPinResult(null);
                setCopiedPin(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reset PIN ដោយជោគជ័យ
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {resetPinResult.name} ({resetPinResult.code})
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400 tracking-[0.3em] pl-3">
                {resetPinResult.newPin}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetPinResult.newPin);
                  setCopiedPin(true);
                  setTimeout(() => setCopiedPin(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center gap-1.5 transition"
              >
                {copiedPin ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>បានចម្លង</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ចម្លង</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-left mb-5">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  <strong>ចំណាំសំខាន់៖</strong> លេខ PIN នេះបង្ហាញដល់ Admin តែម្តងគត់ (ក្នុងប្រព័ន្ធរក្សាទុកជា Hash)។ សូមចម្លង ឬផ្ញើទៅកាន់បុគ្គលិកឥឡូវនេះ។
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setResetPinResult(null);
                setCopiedPin(false);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Result Modal (Shown Once) */}
      {resetPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => {
                setResetPasswordResult(null);
                setCopiedPassword(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ពាក្យសម្ងាត់បណ្តោះអាសន្ន
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              សម្រាប់បុគ្គលិក៖ {resetPasswordResult.name}
            </p>

            <div className="my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Username សម្រាប់ចូល៖</span>
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  {resetPasswordResult.username}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Password បណ្តោះអាសន្ន៖</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-mono font-extrabold text-purple-600 dark:text-purple-400 tracking-wider">
                    {resetPasswordResult.tempPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPasswordResult.tempPassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-500/30 flex items-center gap-1 transition"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>បានចម្លង</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ចម្លង</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-left mb-5">
              <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                <span>
                  <strong>ចំណាំ៖</strong> ពាក្យសម្ងាត់នេះបង្ហាញតែម្តងគត់។ បុគ្គលិកនឹងត្រូវតម្រូវឱ្យប្តូរ Password ថ្មីដោយខ្លួនឯងភ្លាមៗពេលចូលលើកដំបូង។
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setResetPasswordResult(null);
                setCopiedPassword(false);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      )}

      {/* Bulk Logins Result Modal (Shown Once with summary) */}
      {bulkLoginsResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setBulkLoginsResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  បង្កើតគណនី Login ចំនួន {bulkLoginsResult.length} នាក់ដោយជោគជ័យ
                </h3>
                <p className="text-xs text-slate-500">
                  ឯកសារ Excel (CSV) ត្រូវបានទាញយកដោយស្វ័យប្រវត្តិ
                </p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">កូដ</th>
                    <th className="p-2.5">ឈ្មោះ</th>
                    <th className="p-2.5">Username</th>
                    <th className="p-2.5">Password បណ្តោះអាសន្ន</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {bulkLoginsResult.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-500">{acc.code}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">{acc.name}</td>
                      <td className="p-2.5 text-blue-600 dark:text-blue-400">{acc.username}</td>
                      <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-bold">{acc.tempPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setBulkLoginsResult(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
