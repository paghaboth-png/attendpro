"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  Search,
  Filter,
  Plus,
  RotateCw,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DatePicker } from "@/components/date-picker";

export default function AttendancesPage() {
  const { t } = useI18n();

  // Phnom Penh Default Date (UTC+7)
  const getTodayPP = () => {
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    return nowLocal.toISOString().slice(0, 10);
  };

  // Filters State
  const [date, setDate] = useState(getTodayPP());
  const [branchId, setBranchId] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [status, setStatus] = useState("all");

  // Master Data
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // List State
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    branchId: "",
    date: getTodayPP(),
    checkInTime: "07:00",
    checkOutTime: "16:00",
    status: "GOOD",
    note: "",
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Map Modal State
  const [mapModalData, setMapModalData] = useState<any | null>(null);

  // Calendar Modal State
  const [calendarEmp, setCalendarEmp] = useState<any | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState<any | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Fetch Master Data
  useEffect(() => {
    fetch("/api/setup/overview")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setBranches(json.data.branches || []);
          setEmployees(json.data.employees || []);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Attendances List
  const fetchAttendances = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (branchId !== "all") params.set("branchId", branchId);
      if (employeeId !== "all") params.set("employeeId", employeeId);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/attendances?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAttendances(json.data || []);
      }
    } catch {}

    setLoading(false);
    setRefreshing(false);
  }, [date, branchId, employeeId, status]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  // Handle Form Submit (Manual Create / Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const url = "/api/attendances";
      const method = editingRecord ? "PUT" : "POST";
      const payload = editingRecord
        ? {
            id: editingRecord.id,
            checkInTime: formData.checkInTime,
            checkOutTime: formData.checkOutTime,
            status: formData.status,
            note: formData.note,
            date: formData.date,
          }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setIsFormModalOpen(false);
        fetchAttendances();
      } else {
        setFormError(json.error || "មិនអាចរក្សាទុកបានឡើយ");
      }
    } catch {
      setFormError("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ Server");
    }
    setFormSaving(false);
  };

  // Open Edit Modal
  const openEditModal = (att: any) => {
    setEditingRecord(att);
    const inTime = att.checkInAt
      ? new Date(att.checkInAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Phnom_Penh",
        })
      : "";
    const outTime = att.checkOutAt
      ? new Date(att.checkOutAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Phnom_Penh",
        })
      : "";

    setFormData({
      employeeId: att.employeeId,
      branchId: att.branchId,
      date: att.date,
      checkInTime: inTime,
      checkOutTime: outTime,
      status: att.status,
      note: att.note || "",
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      employeeId: employees[0]?.id || "",
      branchId: branches[0]?.id || "",
      date: date || getTodayPP(),
      checkInTime: "07:00",
      checkOutTime: "16:00",
      status: "GOOD",
      note: "កត់ត្រាដោយដៃ (Manual Entry)",
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Delete Record
  const handleDelete = async (id: string, empName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាវត្តមានរបស់ "${empName}" មែនទេ?`)) return;

    try {
      const res = await fetch(`/api/attendances?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchAttendances();
      }
    } catch {}
  };

  // Fetch Calendar Data
  const openCalendarModal = (emp: any) => {
    setCalendarEmp(emp);
    loadCalendar(emp.id, calendarYear, calendarMonth);
  };

  const loadCalendar = async (empId: string, y: number, m: number) => {
    setCalendarLoading(true);
    try {
      const res = await fetch(`/api/attendances/calendar?employeeId=${empId}&year=${y}&month=${m}`);
      const json = await res.json();
      if (json.success) {
        setCalendarData(json.data);
      }
    } catch {}
    setCalendarLoading(false);
  };

  const handleMonthChange = (offset: number) => {
    let newM = calendarMonth + offset;
    let newY = calendarYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setCalendarYear(newY);
    setCalendarMonth(newM);
    if (calendarEmp) loadCalendar(calendarEmp.id, newY, newM);
  };

  // Stats calculation
  const totalCount = attendances.length;
  const goodCount = attendances.filter((a) => a.status === "GOOD").length;
  const lateCount = attendances.filter((a) => a.status === "LATE").length;
  const manualCount = attendances.filter((a) => a.isManual).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-blue-400" />
            <span>ការគ្រប់គ្រងវត្តមានបុគ្គលិក (Attendance Management)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            តាមដានវត្តមានផ្ទាល់ កែប្រែដោយដៃ ពិនិត្យទីតាំង GPS លើផែនទី និងមើលប្រតិទិនបុគ្គលិក
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAttendances(true)}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>ធ្វើបច្ចុប្បន្នភាព</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមវត្តមានដោយដៃ</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">វត្តមានសរុប</div>
            <div className="text-xl font-black text-white font-mono">{totalCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">ទាន់ពេល (GOOD)</div>
            <div className="text-xl font-black text-emerald-400 font-mono">{goodCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">មកយឺត (LATE)</div>
            <div className="text-xl font-black text-amber-400 font-mono">{lateCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">កែសម្រួលដោយដៃ</div>
            <div className="text-xl font-black text-purple-400 font-mono">{manualCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>តម្រងស្វែងរកវត្តមាន (Filters)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Date Picker */}
          <div>
            <label className="block text-slate-400 mb-1">កាលបរិច្ឆេទ</label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="កាលបរិច្ឆេទទាំងអស់"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-slate-400 mb-1">សាខា</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">គ្រប់សាខាទាំងអស់</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-slate-400 mb-1">បុគ្គលិក</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">បុគ្គលិកទាំងអស់</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} - {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 mb-1">ស្ថានភាព</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">ស្ថានភាពទាំងអស់</option>
              <option value="GOOD">ទាន់ពេល (GOOD)</option>
              <option value="LATE">មកយឺត (LATE)</option>
              <option value="MANUAL">កែប្រែដោយដៃ (Manual)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendances Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>បញ្ជីវត្តមានលម្អិត</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
              {attendances.length} កំណត់ត្រា
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            <span>កំពុងទាញយកទិន្នន័យវត្តមាន...</span>
          </div>
        ) : attendances.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-300">
              មិនមានទិន្នន័យវត្តមានតាមលក្ខខណ្ឌដែលបានជ្រើសរើសឡើយ
            </div>
            <p className="text-xs text-slate-500">
              សូមជ្រើសរើសកាលបរិច្ឆេទផ្សេង ឬចុច "បន្ថែមវត្តមានដោយដៃ"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/40">
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">បុគ្គលិក (Employee)</th>
                  <th className="py-3 px-3.5">កាលបរិច្ឆេទ</th>
                  <th className="py-3 px-3.5">Check In (ចូល)</th>
                  <th className="py-3 px-3.5">Check Out (ចេញ)</th>
                  <th className="py-3 px-3.5">វិធី (Method)</th>
                  <th className="py-3 px-3.5">ស្ថានភាព</th>
                  <th className="py-3 px-3.5">កំណត់សម្គាល់</th>
                  <th className="py-3 px-3.5 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendances.map((att, idx) => {
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
                  const hasGps = att.checkInLat && att.checkInLng;

                  return (
                    <tr key={att.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5 text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {emp?.name?.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">
                              {emp?.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-blue-400">{emp?.code}</span>
                              <span>•</span>
                              <span>{emp?.position?.name}</span>
                              <span>•</span>
                              <span className="text-slate-500">{att.branch?.name}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-300">
                        {att.date}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{inTime}</span>
                          {hasGps && (
                            <button
                              type="button"
                              onClick={() => setMapModalData(att)}
                              className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px]"
                              title="មើលទីតាំង GPS លើផែនទី"
                            >
                              <MapPin className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-300">
                        {outTime}
                      </td>

                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            att.method === "QR"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : att.method === "DASHBOARD"
                              ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                              : att.isManual || att.method === "MANUAL"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {att.method === "QR" ? "QR Code" : att.method === "DASHBOARD" ? "Dashboard" : att.isManual ? "Manual" : "PIN"}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isLate
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {isLate ? "មកយឺត (LATE)" : "ទាន់ពេល (GOOD)"}
                          </span>
                          {att.isManual && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Manual
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-slate-400 text-[11px] max-w-[150px] truncate">
                        {att.note || "-"}
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Calendar View Button */}
                          <button
                            type="button"
                            onClick={() => openCalendarModal(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                            title="មើលប្រតិទិនបុគ្គលិក"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(att)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            title="កែសម្រួលដោយដៃ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(att.id, emp?.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="លុបកំណត់ត្រា"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GPS Map Location Modal */}
      {mapModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs sm:text-sm">
                  ទីតាំងស្កេន GPS៖ {mapModalData.employee?.name}
                </span>
              </div>
              <button
                onClick={() => setMapModalData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* OSM Map Preview */}
              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                <iframe
                  title="GPS Location Map"
                  className="w-full h-56 border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapModalData.checkInLng - 0.005}%2C${mapModalData.checkInLat - 0.005}%2C${mapModalData.checkInLng + 0.005}%2C${mapModalData.checkInLat + 0.005}&layer=mapnik&marker=${mapModalData.checkInLat}%2C${mapModalData.checkInLng}`}
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">កូអរដោនេ (Coordinates)៖</span>
                  <strong className="text-white font-mono">
                    {mapModalData.checkInLat?.toFixed(6)}, {mapModalData.checkInLng?.toFixed(6)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ភាពសុក្រិត GPS (Accuracy)៖</span>
                  <span className="text-emerald-400 font-mono">
                    ±{Math.round(mapModalData.checkInAcc || 10)} ម៉ែត្រ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">សាខាគោលដៅ៖</span>
                  <span className="text-slate-300">{mapModalData.branch?.name}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <a
                  href={`https://www.google.com/maps?q=${mapModalData.checkInLat},${mapModalData.checkInLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <span>បើកមើលលើ Google Maps ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setMapModalData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  បិទ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Calendar View Modal */}
      {calendarEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">
                    ប្រតិទិនវត្តមាន៖ {calendarEmp.name} ({calendarEmp.code})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {calendarEmp.position?.name} • {calendarEmp.branch?.name}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCalendarEmp(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Month Switcher */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => handleMonthChange(-1)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="font-bold text-white text-sm font-mono">
                  ខែ {String(calendarMonth).padStart(2, "0")} ឆ្នាំ {calendarYear}
                </div>

                <button
                  type="button"
                  onClick={() => handleMonthChange(1)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Badges */}
              {calendarData?.summary && (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 font-medium">វត្តមាន</div>
                    <div className="text-base font-bold text-white font-mono">
                      {calendarData.summary.presentCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] text-amber-400 font-medium">មកយឺត</div>
                    <div className="text-base font-bold text-white font-mono">
                      {calendarData.summary.lateCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <div className="text-[10px] text-rose-400 font-medium">អវត្តមាន</div>
                    <div className="text-base font-bold text-white font-mono">
                      {calendarData.summary.absentCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-[10px] text-blue-400 font-medium">ច្បាប់សម្រាក</div>
                    <div className="text-base font-bold text-white font-mono">
                      {calendarData.summary.leaveCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar Grid */}
              {calendarLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                  <span>កំពុងទាញយកទិន្នន័យប្រតិទិន...</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                  {["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍", "អាទិត្យ"].map(
                    (d) => (
                      <div key={d} className="font-semibold text-slate-500 py-1 text-[11px]">
                        {d}
                      </div>
                    )
                  )}

                  {calendarData?.days?.map((d: any) => {
                    let bg = "bg-slate-950/60 border-slate-800/60 text-slate-400";
                    let badge = "";

                    if (d.dayStatus === "GOOD") {
                      bg = "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-bold";
                      badge = "ទាន់ពេល";
                    } else if (d.dayStatus === "LATE") {
                      bg = "bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold";
                      badge = "យឺត";
                    } else if (d.dayStatus === "ABSENT") {
                      bg = "bg-rose-500/20 border-rose-500/40 text-rose-200 font-bold";
                      badge = "អវត្តមាន";
                    } else if (d.dayStatus === "LEAVE") {
                      bg = "bg-blue-500/20 border-blue-500/40 text-blue-200 font-bold";
                      badge = "ច្បាប់";
                    } else if (d.dayStatus === "HOLIDAY") {
                      bg = "bg-teal-500/20 border-teal-500/40 text-teal-200 font-bold";
                      badge = "បុណ្យ";
                    } else if (d.dayStatus === "OFF_DAY") {
                      bg = "bg-slate-900/40 border-slate-800/40 text-slate-600";
                      badge = "សម្រាក";
                    }

                    return (
                      <div
                        key={d.date}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-between min-h-[52px] ${bg} ${
                          d.isToday ? "ring-2 ring-blue-500" : ""
                        }`}
                      >
                        <span className="font-mono text-xs font-bold">{d.day}</span>
                        {badge && (
                          <span className="text-[9px] leading-tight font-sans">
                            {badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCalendarEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  បិទផ្ទាំង
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white text-xs sm:text-sm">
                  {editingRecord ? "កែប្រែវត្តមានដោយដៃ" : "បន្ថែមវត្តមានដោយដៃ (Manual Entry)"}
                </span>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Employee Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ជ្រើសរើសបុគ្គលិក *
                </label>
                <select
                  required
                  disabled={Boolean(editingRecord)}
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="">-- សូមជ្រើសរើសបុគ្គលិក --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} - {emp.name} ({emp.position?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <DatePicker
                  label="កាលបរិច្ឆេទវត្តមាន"
                  required
                  disabled={Boolean(editingRecord)}
                  value={formData.date}
                  onChange={(d) => setFormData({ ...formData, date: d })}
                />
              </div>

              {/* In & Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ម៉ោងចូល (Check In)
                  </label>
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) =>
                      setFormData({ ...formData, checkInTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ម៉ោងចេញ (Check Out)
                  </label>
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) =>
                      setFormData({ ...formData, checkOutTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ស្ថានភាពវត្តមាន *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="GOOD">ទាន់ពេល (GOOD)</option>
                  <option value="LATE">មកយឺត (LATE)</option>
                  <option value="EARLY_LEAVE">ចេញមុនម៉ោង (EARLY_LEAVE)</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  កំណត់សម្គាល់ (មូលហេតុនៃការកែប្រែ)
                </label>
                <input
                  type="text"
                  placeholder="ឧ. បុគ្គលិកភ្លេចស្កេន ឬមានបញ្ហាទូរស័ព្ទ..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50"
                >
                  {formSaving ? "កំពុងរក្សាទុក..." : "រក្សាទុក (Save)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
