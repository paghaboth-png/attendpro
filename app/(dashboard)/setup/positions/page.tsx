"use client";

import React, { useEffect, useState } from "react";
import { Briefcase, Plus, Edit2, Trash2, X, AlertCircle, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PositionsPage() {
  const { t } = useI18n();
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      if (data.success) setPositions(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const openAddModal = () => {
    setEditingPos(null);
    setName("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pos: any) => {
    setEditingPos(pos);
    setName(pos.name);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const url = editingPos ? `/api/positions/${editingPos.id}` : "/api/positions";
      const method = editingPos ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchPositions();
      } else {
        setErrorMsg(data.error || "Failed to save");
      }
    } catch {
      setErrorMsg("Error connecting to server");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, posName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបតួនាទី "${posName}" មែនឬទេ?`)) return;
    try {
      await fetch(`/api/positions/${id}`, { method: "DELETE" });
      fetchPositions();
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-500" />
            <span>តួនាទីបុគ្គលិក (Positions)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            កំណត់មុខតំណែងបុគ្គលិក (ឧ. ប្រធានសាខា, បារីស្តា, បុគ្គលិកគិតលុយ)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមតួនាទីថ្មី</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {positions.map((pos) => (
            <div
              key={pos.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{pos.name}</h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{pos._count?.employees ?? 0} នាក់</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(pos)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="កែសម្រួល"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(pos.id, pos.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="លុប"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                <Briefcase className="w-5 h-5 text-blue-500" />
                <span>{editingPos ? "កែសម្រួលតួនាទី" : "បន្ថែមតួនាទីថ្មី"}</span>
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
                  ឈ្មោះតួនាទី / មុខតំណែង *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. បុគ្គលិកផ្នែកអនាម័យ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
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
