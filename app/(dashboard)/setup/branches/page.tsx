"use client";

import React, { useEffect, useState } from "react";
import { Building2, MapPin, Radio, CheckCircle, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function BranchesPage() {
  const { t } = useI18n();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/setup/overview")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBranches(data.data.branches);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-500" />
            <span>សាខាទាំងអស់ (Branches)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            កំណត់ទីតាំងភូមិសាស្ត្រ (GPS) និងកាំរង្វង់អនុញ្ញាតឱ្យបុគ្គលិកស្កេនវត្តមាន
          </p>
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 self-start sm:self-auto opacity-80 cursor-not-allowed"
          title="ត្រៀមសម្រាប់ Phase 2"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមសាខាថ្មី (Phase 2)</span>
        </button>
      </div>

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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{b.name}</h3>
                    <span className="text-[11px] text-slate-500">TheDemo Coffee</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3" />
                  សកម្ម
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="text-slate-400">{b.address || "រាជធានីភ្នំពេញ"}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-slate-400 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                    <span>កាំរង្វង់អនុញ្ញាត៖</span>
                    <strong className="text-white">{b.radiusMeters} ម៉ែត្រ</strong>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {b.lat}, {b.lng}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
