"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  Moon,
  Sun,
  Coffee,
  CheckSquare,
  Square,
  Save,
  RotateCw,
} from "lucide-react";

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  workDays: string;
  templates: ShiftTemplate[];
  _count?: {
    employees: number;
  };
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Shift Modal (Add / Edit Shift Type)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [shiftGraceMinutes, setShiftGraceMinutes] = useState("15");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [savingShift, setSavingShift] = useState(false);

  // Template Modal (Add / Edit Template Time)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [targetShiftForTemplate, setTargetShiftForTemplate] = useState<ShiftItem | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateStartTime, setTemplateStartTime] = useState("07:00");
  const [templateEndTime, setTemplateEndTime] = useState("16:00");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (data.success) {
        setShifts(data.data || []);
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const daysMap = [
    { num: 1, label: "ច័ន្ទ (Mon)" },
    { num: 2, label: "អង្គារ (Tue)" },
    { num: 3, label: "ពុធ (Wed)" },
    { num: 4, label: "ព្រហស្បតិ៍ (Thu)" },
    { num: 5, label: "សុក្រ (Fri)" },
    { num: 6, label: "សៅរ៍ (Sat)" },
    { num: 0, label: "អាទិត្យ (Sun)" },
  ];

  // Helper for quick days selection
  const handleQuickDays = (type: "MON_FRI" | "WEEKEND" | "ALL") => {
    if (type === "MON_FRI") setSelectedDays([1, 2, 3, 4, 5]);
    if (type === "WEEKEND") setSelectedDays([6, 0]);
    if (type === "ALL") setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
  };

  const handleToggleDay = (num: number) => {
    if (selectedDays.includes(num)) {
      setSelectedDays(selectedDays.filter((d) => d !== num));
    } else {
      setSelectedDays([...selectedDays, num]);
    }
  };

  // Open Add Shift Modal
  const openAddShiftModal = () => {
    setEditingShift(null);
    setShiftName("");
    setShiftGraceMinutes("15");
    setSelectedDays([1, 2, 3, 4, 5]);
    setErrorMsg(null);
    setIsShiftModalOpen(true);
  };

  // Open Edit Shift Modal
  const openEditShiftModal = (shift: ShiftItem) => {
    setEditingShift(shift);
    setShiftName(shift.name);
    setShiftGraceMinutes(String(shift.graceMinutes || 15));
    const parsedDays = shift.workDays
      ? shift.workDays
          .split(",")
          .map((d) => parseInt(d.trim()))
          .filter((n) => !isNaN(n))
      : [1, 2, 3, 4, 5];
    setSelectedDays(parsedDays);
    setErrorMsg(null);
    setIsShiftModalOpen(true);
  };

  // Submit Shift Type
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation: at least 1 day selected
    if (selectedDays.length === 0) {
      setErrorMsg("សូមជ្រើសរើសថ្ងៃធ្វើការយ៉ាងតិច ១ ថ្ងៃ!");
      return;
    }

    setSavingShift(true);
    try {
      const workDaysStr = selectedDays.join(",");
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts";
      const method = editingShift ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shiftName,
          graceMinutes: parseInt(shiftGraceMinutes) || 15,
          workDays: workDaysStr,
          startTime: editingShift ? editingShift.startTime : "07:00",
          endTime: editingShift ? editingShift.endTime : "16:00",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(editingShift ? "បានកែប្រែប្រភេទវេនដោយជោគជ័យ!" : "បានបង្កើតប្រភេទវេនថ្មីដោយជោគជ័យ!");
        setIsShiftModalOpen(false);
        fetchShifts();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.error || "មិនអាចរក្សាទុកបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setSavingShift(false);
    }
  };

  // Delete Shift
  const handleDeleteShift = async (shift: ShiftItem) => {
    if (!confirm(`តើលោកអ្នកពិតជាចង់លុបប្រភេទវេន "${shift.name}" មែនឬទេ?`)) return;
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "បានលុបវេនដោយជោគជ័យ!");
        fetchShifts();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.error || "មិនអាចលុបបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    }
  };

  // Open Template Modal (Add)
  const openAddTemplateModal = (shift: ShiftItem) => {
    setTargetShiftForTemplate(shift);
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateStartTime("07:00");
    setTemplateEndTime("16:00");
    setErrorMsg(null);
    setIsTemplateModalOpen(true);
  };

  // Open Template Modal (Edit)
  const openEditTemplateModal = (shift: ShiftItem, template: ShiftTemplate) => {
    setTargetShiftForTemplate(shift);
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateStartTime(template.startTime);
    setTemplateEndTime(template.endTime);
    setErrorMsg(null);
    setIsTemplateModalOpen(true);
  };

  // Submit Template Time
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetShiftForTemplate) return;
    setSavingTemplate(true);
    setErrorMsg(null);

    try {
      const currentTemplates = [...(targetShiftForTemplate.templates || [])];
      let updatedTemplates: any[];

      if (editingTemplate) {
        updatedTemplates = currentTemplates.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, name: templateName, startTime: templateStartTime, endTime: templateEndTime }
            : t
        );
      } else {
        updatedTemplates = [
          ...currentTemplates,
          { id: `temp-${Date.now()}`, name: templateName, startTime: templateStartTime, endTime: templateEndTime },
        ];
      }

      const res = await fetch(`/api/shifts/${targetShiftForTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: updatedTemplates }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("បានរក្សាទុកម៉ោងគំរូនៃវេនដោយជោគជ័យ!");
        setIsTemplateModalOpen(false);
        fetchShifts();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.error || "មិនអាចរក្សាទុកម៉ោងគំរូបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete Template Time
  const handleDeleteTemplate = async (shift: ShiftItem, templateId: string, tempName: string) => {
    if (!confirm(`តើលោកអ្នកពិតជាចង់លុបម៉ោងគំរូ "${tempName}" នេះមែនទេ?`)) return;
    try {
      const updatedTemplates = shift.templates.filter((t) => t.id !== templateId);
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: updatedTemplates }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("បានលុបម៉ោងគំរូដោយជោគជ័យ!");
        fetchShifts();
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់");
    }
  };

  const isOvernight = (startTime: string, endTime: string) => {
    return endTime < startTime;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>គ្រប់គ្រងប្រភេទវេន និងម៉ោងធ្វើការ</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Shift System
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                កំណត់ប្រភេទវេន (វេនចន្ទ-សុក្រ, វេនសៅរ៍-អាទិត្យ) និងម៉ោងគំរូនីមួយៗសម្រាប់បុគ្គលិក
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddShiftModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>បង្កើតប្រភេទវេនថ្មី</span>
        </button>
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

      {/* Shifts List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            <span>កំពុងផ្ទុកទិន្នន័យវេនធ្វើការ...</span>
          </div>
        ) : shifts.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <span>មិនទាន់មានប្រភេទវេននៅឡើយ</span>
          </div>
        ) : (
          shifts.map((shift) => {
            const shiftDaysArr = shift.workDays
              ? shift.workDays.split(",").map((s) => parseInt(s.trim()))
              : [];
            const empCount = shift._count?.employees || 0;

            return (
              <div
                key={shift.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl"
              >
                {/* Shift Card Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{shift.name}</span>
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{empCount} នាក់</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                        Grace: {shift.graceMinutes || 15}mn
                      </span>
                    </div>

                    {/* Working days pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-slate-500 font-medium">ថ្ងៃធ្វើការ៖</span>
                      {daysMap.map((d) => {
                        const isWork = shiftDaysArr.includes(d.num);
                        return (
                          <span
                            key={d.num}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                              isWork
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold"
                                : "bg-slate-950 text-slate-600 border-slate-800/50 line-through"
                            }`}
                          >
                            {d.label.split(" ")[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shift Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddTemplateModal(shift)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>បន្ថែមម៉ោងគំរូ</span>
                    </button>

                    <button
                      onClick={() => openEditShiftModal(shift)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="កែប្រែប្រភេទវេន"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteShift(shift)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition"
                      title="លុបប្រភេទវេន"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Templates inside this Shift */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>ម៉ោងគំរូនៃវេន (Template Preset Times)</span>
                    <span className="text-[10px] text-slate-500 lowercase font-normal">
                      (បុគ្គលិកអាចជ្រើសម៉ោងគំរូ ឬកំណត់ម៉ោងផ្ទាល់ខ្លួនបាន)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shift.templates && shift.templates.length > 0 ? (
                      shift.templates.map((tmpl) => {
                        const overnight = isOvernight(tmpl.startTime, tmpl.endTime);
                        return (
                          <div
                            key={tmpl.id}
                            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3 group"
                          >
                            <div className="space-y-1">
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                <span>{tmpl.name}</span>
                                {overnight && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5">
                                    <Moon className="w-2.5 h-2.5" />
                                    <span>ឆ្លងអធ្រាត្រ</span>
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>
                                  {tmpl.startTime} - {tmpl.endTime}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={() => openEditTemplateModal(shift, tmpl)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                                title="កែប្រែម៉ោងគំរូ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(shift, tmpl.id, tmpl.name)}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                title="លុបម៉ោងគំរូ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                        <span>មិនទាន់មានម៉ោងគំរូឡើយ។ ចុច "បន្ថែមម៉ោងគំរូ" ដើម្បីបង្កើត (ឧ. ព្រឹក 07:00-16:00)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT SHIFT TYPE */}
      {/* ============================================================== */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>{editingShift ? "កែប្រែប្រភេទវេន" : "បង្កើតប្រភេទវេនថ្មី"}</span>
              </h3>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ឈ្មោះប្រភេទវេន (Shift Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. វេនចន្ទ-សុក្រ, វេនសៅរ៍-អាទិត្យ..."
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Preset Buttons for Days */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">
                    ថ្ងៃធ្វើការ (Working Days) *
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleQuickDays("MON_FRI")}
                      className="text-blue-400 hover:underline"
                    >
                      ចន្ទ-សុក្រ
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => handleQuickDays("WEEKEND")}
                      className="text-blue-400 hover:underline"
                    >
                      សៅរ៍-អាទិត្យ
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => handleQuickDays("ALL")}
                      className="text-blue-400 hover:underline"
                    >
                      ទាំងអស់
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {daysMap.map((d) => {
                    const isChecked = selectedDays.includes(d.num);
                    return (
                      <div
                        key={d.num}
                        onClick={() => handleToggleDay(d.num)}
                        className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition ${
                          isChecked
                            ? "bg-blue-600/20 border-blue-500 text-white font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="text-[11px]">{d.label.split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ម៉ោងអនុគ្រោះមកយឺត (Grace Minutes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={shiftGraceMinutes}
                    onChange={(e) => setShiftGraceMinutes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    នាទី
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingShift}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingShift ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD / EDIT TEMPLATE PRESET TIME */}
      {/* ============================================================== */}
      {isTemplateModalOpen && targetShiftForTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{editingTemplate ? "កែប្រែម៉ោងគំរូ" : "បន្ថែមម៉ោងគំរូនៃវេន"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{targetShiftForTemplate.name}</p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ឈ្មោះម៉ោងគំរូ (Template Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. វេនព្រឹក (Morning), វេនល្ងាច (Evening)..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ម៉ោងចូល (Start Time) *
                  </label>
                  <input
                    type="time"
                    required
                    value={templateStartTime}
                    onChange={(e) => setTemplateStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ម៉ោងចេញ (End Time) *
                  </label>
                  <input
                    type="time"
                    required
                    value={templateEndTime}
                    onChange={(e) => setTemplateEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Overnight Shift Hint */}
              {isOvernight(templateStartTime, templateEndTime) && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <b>វេនឆ្លងអធ្រាត្រ៖</b> ម៉ោងចេញ ({templateEndTime}) គឺនៅថ្ងៃបន្ទាប់។ ប្រព័ន្ធនឹងគណនាត្រឹមត្រូវដោយស្វ័យប្រវត្តិ។
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingTemplate ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
