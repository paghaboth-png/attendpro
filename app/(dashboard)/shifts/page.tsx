"use client";

import React, { useEffect, useState } from "react";
import { Clock, Plus, Edit2, Trash2, X, AlertCircle, Users, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ShiftsPage() {
  const { t } = useI18n();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "07:00",
    endTime: "16:00",
    graceMinutes: "15",
    workDays: "1,2,3,4,5,6",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchShifts = async () => {
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (data.success) setShifts(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const openAddModal = () => {
    setEditingShift(null);
    setFormData({
      name: "",
      startTime: "07:00",
      endTime: "16:00",
      graceMinutes: "15",
      workDays: "1,2,3,4,5,6",
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (shift: any) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: String(shift.graceMinutes),
      workDays: shift.workDays || "1,2,3,4,5,6",
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts";
      const method = editingShift ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchShifts();
      } else {
        setErrorMsg(data.error || "Failed to save");
      }
    } catch {
      setErrorMsg("Error connecting to server");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, shiftName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបវេនធ្វើការ "${shiftName}" មែនឬទេ?`)) return;
    try {
      await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      fetchShifts();
    } catch {}
  };

  const daysLabels = ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍", "អាទិត្យ"];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-blue-500" />
            <span>វេនធ្វើការ (Work Shifts)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            កំណត់ម៉ោងចាប់ផ្តើម បញ្ចប់ និងនាទីលើកលែង (Grace Minutes) សម្រាប់គណនាភាពយឺតយ៉ាវ
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមវេនថ្មី</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{shift.name}</h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{shift._count?.employees ?? 0} នាក់កំពុងប្រើប្រាស់</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(shift)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="កែសម្រួល"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(shift.id, shift.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="លុប"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ម៉ោងធ្វើការ៖</span>
                  <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-400">ម៉ោងអនុគ្រោះមកយឺត (Grace Period)៖</span>
                  <span className="font-bold text-amber-400">
                    +{shift.graceMinutes} នាទី
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block mb-1">
                    ថ្ងៃធ្វើការប្រចាំសប្តាហ៍៖
                  </span>
                  <div className="flex gap-1">
                    {daysLabels.map((day, idx) => {
                      const isWorkDay = shift.workDays?.includes(String(idx + 1));
                      return (
                        <span
                          key={day}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isWorkDay
                              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                              : "bg-slate-900 text-slate-600 border border-slate-800"
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span>{editingShift ? "កែសម្រួលវេនធ្វើការ" : "បន្ថែមវេនថ្មី"}</span>
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
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ឈ្មោះវេនធ្វើការ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. វេនព្រឹក (Morning 07:00 - 16:00)"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ម៉ោងចាប់ផ្តើម (Start)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ម៉ោងបញ្ចប់ (End)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  នាទីលើកលែងមកយឺត (Grace Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.graceMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, graceMinutes: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ឧ. 15 នាទីមានន័យថា បើវេនម៉ោង 07:00 ស្កេនត្រឹម 07:15 នៅតែចាត់ទុកថាទាន់ពេល (Good)។
                </span>
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
