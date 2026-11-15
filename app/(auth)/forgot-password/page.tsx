"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  Coffee,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hintCode, setHintCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.resetCodeHint) {
          setHintCode(data.resetCodeHint);
          setResetCode(data.resetCodeHint);
        }
        setSuccessMsg(data.message || "លេខកូដផ្ទៀងផ្ទាត់ត្រូវបានបង្កើត!");
        setStep(2);
      } else {
        setErrorMsg(data.error || "មិនអាចស្នើសុំលេខកូដបានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg("ពាក្យសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួ");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          resetCode,
          newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || "បានកំណត់ពាក្យសម្ងាត់ថ្មីជោគជ័យ!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setErrorMsg(data.error || "លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-slate-900 to-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-slate-800/90 backdrop-blur border border-slate-700/60 rounded-full p-1 shadow-lg">
        <button
          type="button"
          onClick={() => setLocale("km")}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
            locale === "km"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>🇰🇭</span> ភាសាខ្មែរ
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
            locale === "en"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>🇬🇧</span> English
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-600/30 mb-3 border border-blue-400/20">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            AttendPro
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            សង្គ្រោះពាក្យសម្ងាត់ (Forgot Password)
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl shadow-black/50 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              <span>
                {step === 1 ? "ស្វែងរកគណនីរបស់អ្នក" : "កំណត់ពាក្យសម្ងាត់ថ្មី"}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {step === 1
                ? "បញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទដែលបានចុះឈ្មោះក្នុងប្រព័ន្ធ"
                : `បញ្ចូលលេខកូដ ៦ ខ្ទង់ និងពាក្យសម្ងាត់ថ្មីសម្រាប់ ${identifier}`}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {hintCode && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
                <span>លេខកូដផ្ទៀងផ្ទាត់៖</span>
              </div>
              <span className="font-mono font-black text-sm text-blue-400 tracking-wider">
                {hintCode}
              </span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  អ៊ីមែល ឬលេខទូរស័ព្ទ (Email / Phone)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ឧ. admin@demo.com ឬ 012999001"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? "កំពុងដំណើរការ..." : "ស្នើសុំលេខកូដផ្ទៀងផ្ទាត់ (Request Code)"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  លេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ (Verification Code)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-mono tracking-widest text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ពាក្យសម្ងាត់ថ្មី (New Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="យ៉ាងតិច ៦ តួ"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  បញ្ជាក់ពាក្យសម្ងាត់ថ្មី (Confirm Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="វាយបញ្ចូលម្តងទៀត"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                >
                  ថយក្រោយ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? "កំពុងកែប្រែ..." : "ផ្លាស់ប្តូរពាក្យសម្ងាត់ (Save Password)"}
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 text-center border-t border-slate-800">
            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ត្រឡប់ទៅកាន់ទំព័រ Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
