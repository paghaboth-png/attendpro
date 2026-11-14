"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Radio,
  Plus,
  Trash2,
  Edit2,
  Navigation,
  CheckCircle,
  X,
  AlertCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function BranchesPage() {
  const { t } = useI18n();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    lat: "11.5564",
    lng: "104.9282",
    radiusMeters: "100",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      name: "",
      address: "",
      lat: "11.5564",
      lng: "104.9282",
      radiusMeters: "100",
      isActive: true,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: any) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || "",
      lat: String(branch.lat),
      lng: String(branch.lng),
      radiusMeters: String(branch.radiusMeters),
      isActive: branch.isActive,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const url = editingBranch
        ? `/api/branches/${editingBranch.id}`
        : "/api/branches";
      const method = editingBranch ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchBranches();
      } else {
        setErrorMsg(data.error || "Failed to save branch");
      }
    } catch {
      setErrorMsg("Error connecting to server");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបសាខា "${name}" មែនឬទេ?`)) return;
    try {
      await fetch(`/api/branches/${id}`, { method: "DELETE" });
      fetchBranches();
    } catch {}
  };

  // Quick preset locations in Phnom Penh
  const presets = [
    { label: "ទួលគោក (Toul Kork)", lat: "11.5724", lng: "104.8964" },
    { label: "បឹងកេងកង (BKK1)", lat: "11.5516", lng: "104.9272" },
    { label: "ដូនពេញ (Daun Penh)", lat: "11.5684", lng: "104.9255" },
    { label: "ច្បារអំពៅ (Chbar Ampov)", lat: "11.5304", lng: "104.9542" },
    { label: "ស្ទឹងមានជ័យ (Steung Mean Chey)", lat: "11.5365", lng: "104.8821" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-500" />
            <span>គ្រប់គ្រងសាខា (Branches Setup)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            កំណត់ទីតាំងភូមិសាស្ត្រ GPS និងកាំរង្វង់អនុញ្ញាតឱ្យបុគ្គលិកស្កេនវត្តមាន
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមសាខាថ្មី</span>
        </button>
      </div>

      {/* Branch List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          {t("loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{b.name}</h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>បុគ្គលិក៖ <strong>{b._count?.employees ?? 0} នាក់</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="កែសម្រួល"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="លុប"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-400">{b.address || "រាជធានីភ្នំពេញ"}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-slate-400 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>កាំរង្វង់អនុញ្ញាត៖</span>
                    <strong className="text-white">{b.radiusMeters} ម៉ែត្រ</strong>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {b.lat}, {b.lng}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                    b.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {b.isActive ? "សកម្ម (Active)" : "អសកម្ម"}
                </span>

                <a
                  href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Navigation className="w-3 h-3" />
                  <span>បើកមើលលើ Google Maps</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span>{editingBranch ? "កែសម្រួលសាខា" : "បន្ថែមសាខាថ្មី"}</span>
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
                  ឈ្មោះសាខា *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. សាខាស្ទឹងមានជ័យ"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  អាសយដ្ឋាន
                </label>
                <input
                  type="text"
                  placeholder="ផ្លូវ, សង្កាត់, ខណ្ឌ..."
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Coordinates Presets */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  ជ្រើសរើសតំបន់គំរូក្នុងភ្នំពេញ (Quick Presets)៖
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, lat: p.lat, lng: p.lng })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Latitude (រយៈទទឹង)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lat}
                    onChange={(e) =>
                      setFormData({ ...formData, lat: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Longitude (រយៈបណ្តោយ)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lng}
                    onChange={(e) =>
                      setFormData({ ...formData, lng: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Radius */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    កាំរង្វង់អនុញ្ញាតឱ្យស្កេន GPS (Radius)
                  </label>
                  <span className="font-bold text-blue-400">
                    {formData.radiusMeters} ម៉ែត្រ
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="500"
                  step="10"
                  value={formData.radiusMeters}
                  onChange={(e) =>
                    setFormData({ ...formData, radiusMeters: e.target.value })
                  }
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>30m</span>
                  <span>100m (ណែនាំ)</span>
                  <span>250m</span>
                  <span>500m</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700 focus:ring-0"
                />
                <label htmlFor="isActive" className="text-slate-300 font-medium">
                  បើកដំណើរការសាខានេះ (Active)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
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
                  {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកសាខា"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
