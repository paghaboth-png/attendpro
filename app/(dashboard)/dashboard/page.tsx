"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import {
  Users,
  Building2,
  Clock,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useI18n();

  const user = session?.user as any;
  const userName = user?.name || "Admin";

  const stats = [
    {
      title: t("statTotalEmployees"),
      value: "10",
      subtitle: "បុគ្គលិកសកម្ម (TheDemo Coffee)",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      textColor: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: t("statActiveBranches"),
      value: "2",
      subtitle: "ទួលគោក & បឹងកេងកង",
      icon: Building2,
      color: "from-emerald-600 to-teal-600",
      textColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: t("statWorkShifts"),
      value: "2",
      subtitle: "វេនព្រឹក & វេនរសៀល",
      icon: Clock,
      color: "from-amber-600 to-orange-600",
      textColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      title: t("statHolidays"),
      value: "2",
      subtitle: "ចូលឆ្នាំខ្មែរ & ភ្ជុំបិណ្ឌ",
      icon: Calendar,
      color: "from-purple-600 to-pink-600",
      textColor: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-slate-900 to-blue-950 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{t("foundationNotice")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t("welcomeBack")}, {userName}! 👋
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកសម្រាប់ <strong>TheDemo Coffee</strong> បានភ្ជាប់ជាមួយ Neon PostgreSQL Database និងដំណើរការលើ Vercel Cloud ដោយជោគជ័យ។
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/setup/employees"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              <span>{t("viewEmployeesBtn")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Foundation Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">
                  {stat.title}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl ${stat.bgColor} ${stat.borderColor} border flex items-center justify-center ${stat.textColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <p className="text-[11px] text-slate-500 mt-1">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Setup Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">
                  ទិន្នន័យមូលដ្ឋាននៃ TheDemo Coffee (Seed Data)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  សាខា និងបុគ្គលិកគំរូត្រូវបានបង្កើត និងតភ្ជាប់ក្នុង Neon PostgreSQL
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/setup/branches"
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-950 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                        សាខាកណ្តាល (ទួលគោក)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        កាំរង្វង់ GPS: 100 ម៉ែត្រ
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    សកម្ម
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ផ្លូវ ៣១៥ សង្កាត់បឹងកក់២ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ
                </p>
              </Link>

              <Link
                href="/setup/branches"
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-950 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                        សាខាបឹងកេងកង (BKK1)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        កាំរង្វង់ GPS: 100 ម៉ែត្រ
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    សកម្ម
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ផ្លូវ ៥៧ កែងផ្លូវ ៣០២ សង្កាត់បឹងកេងកង១ ខណ្ឌចំការមន
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Cloud Status & Mobile Ready */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t("recentSystemStatus")}</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800">
                <span className="text-slate-400">Database</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Neon PostgreSQL
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800">
                <span className="text-slate-400">Cloud Hosting</span>
                <span className="text-blue-400 font-semibold">Vercel (HTTPS)</span>
              </div>

              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800">
                <span className="text-slate-400">Timezone</span>
                <span className="text-slate-300 font-mono">Asia/Phnom_Penh (UTC+7)</span>
              </div>

              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-slate-400">Authentication</span>
                <span className="text-emerald-400 font-semibold">NextAuth (Active)</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Mobile Attendance Ready
                </h4>
                <p className="text-[11px] text-slate-400">
                  ត្រៀមសម្រាប់ Phase 4 (GPS & Selfie)
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              បុគ្គលិកអាចចូលស្កេនវត្តមានដោយផ្ទាល់ពីទូរស័ព្ទដៃតាមតំណភ្ជាប់ HTTPS នេះ។
            </p>
            <div className="text-[10px] font-mono text-blue-300 bg-blue-950/60 p-2 rounded-xl border border-blue-800/60 truncate">
              https://attendpro-one.vercel.app
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
