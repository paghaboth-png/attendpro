"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Coffee, ArrowLeft, ShieldAlert } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t, locale, setLocale } = useI18n();

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-600/30 mb-4 border border-blue-400/20 overflow-hidden p-1.5 bg-white">
            <Coffee className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AttendPro
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {t("companyDefault")} • {t("systemTagline")}
          </p>
        </div>

        {/* Guidance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t("forgotPasswordModalTitle")}
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {t("forgotPasswordModalDesc")}
          </p>

          <Link
            href="/login"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{locale === "km" ? "ត្រឡប់ទៅទំព័រចូល" : "Back to Sign In"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
