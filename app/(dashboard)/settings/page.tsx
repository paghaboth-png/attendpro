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
  Lock,
  KeyRound,
  DollarSign,
  Send,
  HelpCircle,
  Image as ImageIcon,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "general" | "company" | "payroll" | "security" | "telegram"
  >("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Company info
  const [companyName, setCompanyName] = useState("TheDemo Coffee");
  const [companyPhone, setCompanyPhone] = useState("012999001");
  const [companyEmail, setCompanyEmail] = useState("info@demo.com");
  const [companyAddress, setCompanyAddress] = useState(
    "ក្រុងស្វាយរៀង ខេត្តស្វាយរៀង"
  );
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");

  // Verification & General Settings
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [requireGps, setRequireGps] = useState(true);
  const [defaultRadius, setDefaultRadius] = useState(100);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [defaultLanguage, setDefaultLanguage] = useState("km");

  // Payroll Settings (for 8B)
  const [latePenaltyType, setLatePenaltyType] = useState("FIXED");
  const [latePenaltyAmount, setLatePenaltyAmount] = useState(1.0);
  const [absentPenaltyRate, setAbsentPenaltyRate] = useState(1.0);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [nssfEnabled, setNssfEnabled] = useState(false);
  const [allowEmployeeViewPayslip, setAllowEmployeeViewPayslip] = useState(false);

  // Change Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState<string | null>(null);
  const [pwErrorMsg, setPwErrorMsg] = useState<string | null>(null);

  const fetchSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          if (d.company) {
            setCompanyName(d.company.name || "TheDemo Coffee");
            setCompanyPhone(d.company.phone || "");
            setCompanyEmail(d.company.email || "");
            setCompanyAddress(d.company.address || "");
            setCompanyLogoUrl(d.company.logoUrl || "");
          }
          setRequireSelfie(Boolean(d.requireSelfie));
          setRequireGps(Boolean(d.requireGps));
          setDefaultRadius(d.defaultRadius || 100);
          setGraceMinutes(d.graceMinutes || 15);
          setDefaultLanguage(d.defaultLanguage || "km");

          setLatePenaltyType(d.latePenaltyType || "FIXED");
          setLatePenaltyAmount(d.latePenaltyAmount || 1.0);
          setAbsentPenaltyRate(d.absentPenaltyRate || 1.0);
          setOvertimeMultiplier(d.overtimeMultiplier || 1.5);
          setTaxEnabled(Boolean(d.taxEnabled));
          setNssfEnabled(Boolean(d.nssfEnabled));
          setAllowEmployeeViewPayslip(Boolean(d.allowEmployeeViewPayslip));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: {
            name: companyName,
            phone: companyPhone,
            email: companyEmail,
            address: companyAddress,
            logoUrl: companyLogoUrl,
          },
          requireSelfie,
          requireGps,
          defaultRadius,
          graceMinutes,
          defaultLanguage,
          latePenaltyType,
          latePenaltyAmount,
          absentPenaltyRate,
          overtimeMultiplier,
          taxEnabled,
          nssfEnabled,
          allowEmployeeViewPayslip,
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
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPwSuccessMsg(null);
    setPwErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setPwErrorMsg("ពាក្យសម្ងាត់ថ្មីទាំងពីរមិនដូចគ្នាទេ");
      setChangingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPwSuccessMsg(json.message || "បានផ្លាស់ប្តូរពាក្យសម្ងាត់ជោគជ័យ!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwSuccessMsg(null), 4000);
      } else {
        setPwErrorMsg(json.error || "មិនអាចប្តូរពាក្យសម្ងាត់បានឡើយ");
      }
    } catch {
      setPwErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setChangingPassword(false);
    }
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
          គ្រប់គ្រងព័ត៌មានក្រុមហ៊ុន, GPS, ប្រាក់បៀវត្ស, សុវត្ថិភាព និងការជូនដំណឹង Telegram
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

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>ការផ្ទៀងផ្ទាត់ & GPS</span>
        </button>

        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "company"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ព័ត៌មានក្រុមហ៊ុន</span>
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "payroll"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>ការកំណត់ប្រាក់ខែ</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "security"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>សុវត្ថិភាព & ពាក្យសម្ងាត់</span>
        </button>

        <button
          onClick={() => setActiveTab("telegram")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "telegram"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Telegram</span>
        </button>
      </div>

      {/* TAB 1: GENERAL & GPS */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>ការផ្ទៀងផ្ទាត់ពេល Check-in (Verification Rules)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ជ្រើសរើសលក្ខខណ្ឌដែលបុគ្គលិកត្រូវបំពេញពេលចុច Check-in / Check-out
              </p>
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
                  {requireGps
                    ? "អនុញ្ញាតឱ្យ Check-in បានលុះត្រាតែទូរស័ព្ទស្ថិតក្នុងកាំរង្វង់នៃសាខាដែលបានកំណត់"
                    : "បិទការឆែក GPS (បុគ្គលិកអាច Check-in បានពីគ្រប់ទីកន្លែង)"}
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
                    : "បុគ្គលិកអាចចុច Check-in បានភ្លាមៗដោយមិនចាំបាច់ថតរូប (រហ័សទាន់ចិត្ត)"}
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

            {/* Grace Period, Radius, Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ម៉ោងអនុគ្រោះយឺត (Grace Period)</span>
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
                  យឺតក្រោម {graceMinutes} នាទី នៅតែរាប់ជា GOOD
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>កាំរង្វង់លំនាំដើម (Radius)</span>
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
                  កាំរង្វង់អនុញ្ញាតឱ្យ Check-in
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>ភាសាលំនាំដើម (Default Language)</span>
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="km">🇰🇭 ភាសាខ្មែរ (Khmer - លំនាំដើម)</option>
                  <option value="en">🇬🇧 English</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  ភាសាដែលត្រូវបង្ហាញដំបូង
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកំណត់"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: COMPANY INFO & LOGO */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>ព័ត៌មានអាជីវកម្ម និងស្លាកសញ្ញា (Company Info & Logo)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                បង្ហាញលើក្បាលតារាងរបាយការណ៍ និង Payslip បៀវត្សរ៍
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ឈ្មោះក្រុមហ៊ុន / ហាង (Company Name)
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  លេខទូរស័ព្ទទំនាក់ទំនង (Phone)
                </label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  អ៊ីមែល (Email)
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>តំណភ្ជាប់ Logo (Logo Image URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={companyLogoUrl}
                  onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  អាសយដ្ឋាន (Address)
                </label>
                <textarea
                  rows={2}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកព័ត៌មានក្រុមហ៊ុន"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PAYROLL SETTINGS (FOR 8B) */}
      {activeTab === "payroll" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>គោលការណ៍គណនាប្រាក់បៀវត្សរ៍ (Payroll Policies)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                កំណត់អត្រាពិន័យយឺត, អវត្តមាន, គុណមេគុណ OT និងពន្ធ/NSSF
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              {/* Late Penalty */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="block font-bold text-white">
                  ការផាកពិន័យពេលមកយឺត (Late Penalty)
                </label>
                <div className="flex gap-2">
                  <select
                    value={latePenaltyType}
                    onChange={(e) => setLatePenaltyType(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
                  >
                    <option value="FIXED">គិតជាដុល្លារថេរ ($/លើក)</option>
                    <option value="PER_MINUTE">គិតតាមនាទីយឺត ($/នាទី)</option>
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={latePenaltyAmount}
                      onChange={(e) =>
                        setLatePenaltyAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                    <span className="absolute right-3 top-2 text-slate-500 font-bold">
                      USD
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  ឧទាហរណ៍៖ យឺត ១ លើកកាត់ ${latePenaltyAmount}
                </p>
              </div>

              {/* Absent Penalty */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="block font-bold text-white">
                  ពិន័យអវត្តមានគ្មានច្បាប់ (Unexcused Absence Rate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="3"
                    value={absentPenaltyRate}
                    onChange={(e) =>
                      setAbsentPenaltyRate(parseFloat(e.target.value) || 1.0)
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-bold">
                    ថ្ងៃនៃប្រាក់ខែ
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  អវត្តមាន ១ ថ្ងៃ កាត់ប្រាក់ឈ្នួល {absentPenaltyRate} ថ្ងៃ
                </p>
              </div>

              {/* Overtime Multiplier */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="block font-bold text-white">
                  មេគុណប្រាក់ថែមម៉ោង OT (Overtime Multiplier)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="3"
                    value={overtimeMultiplier}
                    onChange={(e) =>
                      setOvertimeMultiplier(parseFloat(e.target.value) || 1.5)
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-bold">
                    X
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  អត្រាធម្មតា ១.៥ ដងនៃប្រាក់ឈ្នួលក្នុង ១ ម៉ោង (ច្បាប់ការងារកម្ពុជា)
                </p>
              </div>

              {/* Employee Payslip View Toggle */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">
                    អនុញ្ញាតឱ្យបុគ្គលិកមើល Payslip ខ្លួនឯង
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    បើកជម្រើសនេះទើបបុគ្គលិកអាចមើល Slip ប្រាក់ខែលើទូរស័ព្ទបាន
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowEmployeeViewPayslip}
                  onClick={() =>
                    setAllowEmployeeViewPayslip(!allowEmployeeViewPayslip)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    allowEmployeeViewPayslip ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      allowEmployeeViewPayslip ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tax & NSSF Section (Configurable - default OFF as chosen) */}
            <div className="pt-2 border-t border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>ពន្ធលើប្រាក់បៀវត្ស និងរបបសន្តិសុខសង្គម (Tax & NSSF)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">
                      កាត់ភាគទានបេឡាជាតិសន្តិសុខសង្គម (NSSF)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      អត្រា ២% នៃប្រាក់ខែបុគ្គលិក (បច្ចុប្បន្ន៖ បិទ)
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={nssfEnabled}
                    onClick={() => setNssfEnabled(!nssfEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      nssfEnabled ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        nssfEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">
                      កាត់ពន្ធលើប្រាក់បៀវត្ស (Salary Tax)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      គិតតាមកម្រិតជណ្តើរ 0%, 5%, 10% (បច្ចុប្បន្ន៖ បិទ)
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={taxEnabled}
                    onClick={() => setTaxEnabled(!taxEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      taxEnabled ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        taxEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកគោលការណ៍ប្រាក់ខែ"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: SECURITY & PASSWORDS */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4"
          >
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span>ផ្លាស់ប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួន (Change Password)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ផ្លាស់ប្តូរពាក្យសម្ងាត់សម្រាប់គណនីដែលកំពុងចូលប្រើប្រាស់នេះ
              </p>
            </div>

            {pwSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ពាក្យសម្ងាត់បច្ចុប្បន្ន (Current Password)
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ពាក្យសម្ងាត់ថ្មី (New Password)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  បញ្ជាក់ពាក្យសម្ងាត់ថ្មី (Confirm)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {changingPassword ? "កំពុងកែប្រែ..." : "ផ្លាស់ប្តូរពាក្យសម្ងាត់"}
                </span>
              </button>
            </div>
          </form>

          {/* Role Permissions Guide */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>សិទ្ធិតាមតួនាទីក្នុងប្រព័ន្ធ (Role-based Permissions)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Super Admin (ម្ចាស់អាជីវកម្ម)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  សិទ្ធិពេញលេញ ១០០% លើគ្រប់ទំព័រ រួមទាំងការ Finalize និង Unlock ប្រាក់ខែ, មើល Audit Logs, និងកំណត់ Telegram។
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Admin (រដ្ឋបាល & គណនេយ្យ)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  គ្រប់គ្រងបុគ្គលិក, សាខា, វត្តមាន, អនុម័តច្បាប់/OT, រៀបចំតារាងប្រាក់ខែ, និងទាញយករបាយការណ៍ Excel/PDF។
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Branch Manager (ប្រធានសាខា)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  មើលវត្តមានប្រចាំថ្ងៃ និងអនុម័តសំណើច្បាប់ ឬម៉ោងថែម OT សម្រាប់បុគ្គលិកក្នុងសាខាខ្លួនប៉ុណ្ណោះ។
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Employee (បុគ្គលិកទូទៅ)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Check-in/Out តាមទូរស័ព្ទ, សុំច្បាប់, សុំ OT, និងមើលប្រវត្តិវត្តមាន ឬ Payslip ផ្ទាល់ខ្លួន។
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TELEGRAM (PREVIEW / READY FOR 8C) */}
      {activeTab === "telegram" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              <span>ការតភ្ជាប់ Telegram Bot (Telegram Integration)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ការកំណត់ និងការជូនដំណឹងតាម Telegram ត្រូវបានរៀបចំក្នុងដំណាក់កាល 8C-1 & 8C-2
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-sm">
              ទំព័រតភ្ជាប់ Telegram កំពុងត្រូវបានដំណើរការក្នុង Phase 8C
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              ប្រព័ន្ធត្រូវបានរៀបចំយ៉ាងមានសុវត្ថិភាពខ្ពស់ មិនបញ្ចេញ Token ទៅកាន់ Browser ឡើយ និងគាំទ្រការផ្ញើសារសាកល្បងដោយស្វ័យប្រវត្តិ។
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
