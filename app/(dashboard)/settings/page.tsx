"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Camera,
  MapPin,
  Clock,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Shield,
  RotateCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings State
  const [requireSelfie, setRequireSelfie] = useState(false); // Default OFF
  const [requireGps, setRequireGps] = useState(true); // Default ON
  const [defaultRadius, setDefaultRadius] = useState(100);
  const [graceMinutes, setGraceMinutes] = useState(15);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setRequireSelfie(Boolean(json.data.requireSelfie));
          setRequireGps(Boolean(json.data.requireGps));
          setDefaultRadius(json.data.defaultRadius || 100);
          setGraceMinutes(json.data.graceMinutes || 15);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requireSelfie,
          requireGps,
          defaultRadius,
          graceMinutes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || "បានរក្សាទុកការកំណត់ដោយជោគជ័យ!");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(json.error || "មិនអាចរក្សាទុកការកំណត់បានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        <span>កំពុងទាញយកការកំណត់...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-400" />
          <span>ការកំណត់ប្រព័ន្ធ (System Settings)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          គ្រប់គ្រងការផ្ទៀងផ្ទាត់វត្តមាន, បើក/បិទមុខងារ Selfie, GPS និងម៉ោងអនុគ្រោះ
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Verification Settings Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>ការផ្ទៀងផ្ទាត់ពេល Check-in (Verification Rules)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ជ្រើសរើសលក្ខខណ្ឌដែលបុគ្គលិកត្រូវបំពេញពេលចុច Check-in / Check-out លើទូរស័ព្ទដៃ
            </p>
          </div>

          {/* Toggle: Require Selfie */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">
                  តម្រូវឱ្យថតរូប Selfie (Require Selfie Photo)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    requireSelfie
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {requireSelfie ? "បើក (ON)" : "បិទ (OFF - លំនាំដើម)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {requireSelfie
                  ? "បុគ្គលិកត្រូវបើកកាមេរ៉ាថតរូបផ្ទាល់ទើបអាចចុច Check-in បាន"
                  : "បុគ្គលិកអាចចុច Check-in បានភ្លាមៗដោយមិនចាំបាច់ថតរូប និងមិនសុំ Camera Permission ឡើយ (រហ័សទាន់ចិត្ត)"}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={requireSelfie}
              onClick={() => setRequireSelfie(!requireSelfie)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                requireSelfie ? "bg-blue-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  requireSelfie ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle: Require GPS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  ផ្ទៀងផ្ទាត់ទីតាំង GPS (GPS Geofence Verification)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    requireGps
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {requireGps ? "បើក (ON - ណែនាំ)" : "បិទ (OFF)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                អនុញ្ញាតឱ្យ Check-in បានលុះត្រាតែទូរស័ព្ទស្ថិតក្នុងកាំរង្វង់នៃសាខាដែលបានកំណត់
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={requireGps}
              onClick={() => setRequireGps(!requireGps)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                requireGps ? "bg-emerald-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  requireGps ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Grace Minutes and Default Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>ម៉ោងអនុគ្រោះមកយឺត (Grace Period Minutes)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-500">
                  នាទី
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                មកយឺតក្រោម {graceMinutes} នាទីនៅតែរាប់ជា GOOD (ទាន់ពេល)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>កាំរង្វង់អនុញ្ញាតលំនាំដើម (Default Radius)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="1000"
                  value={defaultRadius}
                  onChange={(e) => setDefaultRadius(parseInt(e.target.value) || 100)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-500">
                  ម៉ែត្រ
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                កាំរង្វង់លំនាំដើមពេលបង្កើតសាខាថ្មី (ឧ. 100m)
              </p>
            </div>
          </div>
        </div>

        {/* System Information Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>ព័ត៌មានអាជីវកម្ម និងតំបន់ម៉ោង (Business & Timezone)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
              <span className="text-slate-400">ឈ្មោះអាជីវកម្ម៖</span>
              <div className="font-bold text-white text-sm">TheDemo Coffee</div>
              <div className="text-[10px] text-slate-500">
                សាខាចម្បង៖ THE ONE COFFEE (ស្វាយរៀង)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>តំបន់ម៉ោងប្រព័ន្ធ (System Timezone)៖</span>
              </span>
              <div className="font-bold text-emerald-400 text-sm font-mono">
                Asia/Phnom_Penh (UTC+7)
              </div>
              <div className="text-[10px] text-slate-500">
                ម៉ោងកម្ពុជាត្រឹមត្រូវ ១០០% សម្រាប់គ្រប់ការស្កេនវត្តមាន
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកំណត់ (Save Changes)"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
