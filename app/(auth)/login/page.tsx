"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  Coffee,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Demo accounts are strictly hidden unless NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true"
  const showDemoAccounts = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier: identifier.trim(),
        password,
      });

      if (res?.error) {
        if (res.error.includes("LOCKED")) {
          setError(t("loginErrorLocked"));
        } else {
          // Generic error message for security: never reveal if account exists or not
          setError(t("loginErrorInvalid"));
        }
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t("loginErrorGeneric"));
      setLoading(false);
    }
  };

  const fillCredentials = (idVal: string, passVal: string) => {
    setIdentifier(idVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

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
            {!logoError ? (
              <img
                src="/api/company/logo"
                alt="Logo"
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Coffee className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AttendPro
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {t("companyDefault")} • {t("systemTagline")}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-xl dark:shadow-2xl transition-all">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("loginTitle")}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("loginSubtitle")}</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("passwordLabel")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                >
                  {t("forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>{t("signingIn")}</span>
              ) : (
                <>
                  <span>{t("signInButton")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill Buttons (Strictly hidden unless SHOW_DEMO_ACCOUNTS=true) */}
          {showDemoAccounts && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t("demoAccountsTitle")}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@demo.com", "Admin@12345")}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 transition">
                        Super Admin (អ្នកគ្រប់គ្រងធំ)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        admin@demo.com
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("manager@demo.com", "Manager@12345")}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 transition">
                        Branch Manager (មេការស្វាយរៀង)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        manager@demo.com
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("employee@demo.com", "Employee@12345")}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-amber-600 transition">
                        Employee (បុគ្គលិកបារីស្តា)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        employee@demo.com
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          TheDemo Coffee • AttendPro Attendance Management v1.0
        </div>
      </div>

      {/* Forgot Password Guidance Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("forgotPasswordModalTitle")}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === "km" ? "ការណែនាំអំពីលេខសម្ងាត់" : "Password Reset Guide"}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {t("forgotPasswordModalDesc")}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition"
              >
                {locale === "km" ? "យល់ព្រម" : "Understood"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
