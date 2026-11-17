"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  Coffee,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  HelpCircle,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"staff" | "recovery">("recovery");
  const [identifier, setIdentifier] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setError(
        locale === "km"
          ? "ពាក្យសម្ងាត់ថ្មីសម្រាប់ Super Admin ត្រូវមានយ៉ាងតិច ៨ តួអក្សរ"
          : "New password must be at least 8 characters long"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        locale === "km"
          ? "ពាក្យសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាឡើយ"
          : "Passwords do not match"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          recoveryCode: recoveryCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "បានកំណត់ពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ!");
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      } else {
        setError(data.error || "បរាជ័យក្នុងការស្តារពាក្យសម្ងាត់");
      }
    } catch {
      setError("មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Language Switcher at Top Right */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-white dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700/60 rounded-full p-1 shadow-md">
        <button
          type="button"
          onClick={() => setLocale("km")}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
            locale === "km"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>🇰🇭</span> ភាសាខ្មែរ
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
            locale === "en"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>🇬🇧</span> English
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-600/30 mb-3 border border-blue-400/20 p-1 bg-white">
            <Coffee className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            AttendPro
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ស្តារពាក្យសម្ងាត់ ឬកំណត់ឡើងវិញ (Account Recovery)
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-2xl mb-4 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("recovery")}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "recovery"
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>កូដស្តារ Super Admin</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "staff"
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>បុគ្គលិកទូទៅ</span>
          </button>
        </div>

        {/* TAB 1: Super Admin Recovery Code */}
        {activeTab === "recovery" ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  ស្តារគណនី Super Admin
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ប្រើប្រាស់កូដស្តារគណនី (Recovery Code មួយក្នុងចំណោម ៨)
                </p>
              </div>
            </div>

            {successMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 text-center animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm">{successMsg}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  កំពុងបញ្ជូនទៅកាន់ទំព័រ Login ក្នុងពេលបន្តិចទៀត...
                </p>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="space-y-4 text-xs">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    លេខទូរស័ព្ទ ឬអ៊ីមែល Super Admin *
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      required
                      placeholder="ឧ. 0969968839"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    កូដស្តារគណនី (Recovery Code) *
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      required
                      placeholder="XXXX-XXXX-XXXX"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-purple-500 tracking-wider font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    កូដស្តារមួយអាចប្រើបានតែម្តងគត់ (វាយខុសលើស ៥ ដង ប្រព័ន្ធនឹងចាក់សោ ១៥ នាទី)។
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ពាក្យសម្ងាត់ថ្មី (≥ ៨ តួ) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="ពាក្យសម្ងាត់ថ្មី"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មី *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="វាយម្តងទៀត"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? "កំពុងផ្ទៀងផ្ទាត់កូដស្តារ..." : "ស្តារ និងកំណត់ពាក្យសម្ងាត់ថ្មី"}</span>
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <Link
                href="/login"
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ត្រឡប់ទៅ Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          /* TAB 2: Staff Guidance */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Coffee className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              ការណែនាំសម្រាប់បុគ្គលិក និង Manager
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              សម្រាប់បុគ្គលិកទូទៅ និងអ្នកគ្រប់គ្រងសាខា ប្រសិនបើលោកអ្នកភ្លេចពាក្យសម្ងាត់ សូមទាក់ទងមកកាន់{" "}
              <strong>Super Admin (ម្ចាស់ហាង)</strong> ឬ <strong>Admin រដ្ឋបាល</strong> ដើម្បីស្នើសុំ
              Reset ពាក្យសម្ងាត់ថ្មីក្នុងប្រព័ន្ធ Setup បុគ្គលិក។
            </p>

            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs">
              <p className="font-semibold">ចំណាំសម្រាប់បុគ្គលិក Check-in៖</p>
              <p className="text-[11px] mt-0.5">
                លោកអ្នកអាច Check-in/out តាម QR Code នៅហាងបានធម្មតាដោយមិនចាំបាច់ Login ឡើយ។
              </p>
            </div>

            <Link
              href="/login"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ត្រឡប់ទៅទំព័រចូល (Sign In)</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
