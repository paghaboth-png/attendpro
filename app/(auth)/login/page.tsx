"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Coffee, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier,
        password,
      });

      if (res?.error) {
        setError(t("loginErrorInvalid"));
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

  const fillCredentials = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-slate-900 to-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher at Top Right */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-full p-1 shadow-lg">
        <button
          type="button"
          onClick={() => setLocale("km")}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
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
          className={`px-3 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-600/30 mb-4 border border-blue-400/20">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            AttendPro
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            {t("companyDefault")} • {t("systemTagline")}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">{t("loginTitle")}</h2>
            <p className="text-xs text-slate-400 mt-1">{t("loginSubtitle")}</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {t("passwordLabel")}
                </label>
                <span className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer">
                  {t("forgotPassword")}
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
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

          {/* Quick Demo Autofill Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("demoAccountsTitle")}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin@demo.com", "Admin@12345")}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                      Super Admin (អ្នកគ្រប់គ្រងធំ)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      admin@demo.com
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded">
                  Admin@12345
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("manager@demo.com", "Manager@12345")}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">
                      Branch Manager (មេការទួលគោក)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      manager@demo.com
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded">
                  Manager@12345
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("employee@demo.com", "Employee@12345")}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-amber-400 transition">
                      Employee (បុគ្គលិកបារីស្តា)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      employee@demo.com
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded">
                  Employee@12345
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          TheDemo Coffee • AttendPro Attendance Management v1.0
        </div>
      </div>
    </div>
  );
}
