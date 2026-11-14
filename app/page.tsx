"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import {
  Coffee,
  ArrowRight,
  Smartphone,
  MapPin,
  Camera,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const { data: session } = useSession();
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                AttendPro
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase 1 Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">TheDemo Coffee</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-full">
            <button
              type="button"
              onClick={() => setLocale("km")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition ${
                locale === "km"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇰🇭 ខ្មែរ
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition ${
                locale === "en"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇬🇧 EN
            </button>
          </div>

          {session ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              <span>{t("navDashboard")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              <span>{t("signInButton")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center justify-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកអនឡាញ • TheDemo Coffee</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          គ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃ
          <span className="block text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mt-3">
            ជាមួយ GPS Check-in & Selfie Verification
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mb-8 leading-relaxed">
          ដំណោះស្រាយគ្រប់គ្រងវត្តមានបុគ្គលិកសម្រាប់អាជីវកម្មដែលមានច្រើនសាខា។
          បុគ្គលិកស្កេនពីទូរស័ព្ទដៃផ្ទាល់ខ្លួន ចំណែកអ្នកគ្រប់គ្រងតាមដានរបាយការណ៍ផ្ទាល់លើកុំព្យូទ័រ។
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-14">
          <Link
            href="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition"
          >
            <span>ចូលប្រើប្រព័ន្ធ (Sign In Dashboard)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm flex items-center justify-center gap-2 transition"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>ស្កេនវត្តមានលើទូរស័ព្ទ (Check-in)</span>
          </Link>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">
              GPS Location Radius
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              បុគ្គលិកអាច Check-in បានលុះត្រាតែស្ថិតក្នុងកាំរង្វង់ ១០០ ម៉ែត្រជុំវិញសាខា។
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">
              Selfie Verification
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ថតរូបមុខផ្ទាល់ពេល Check-in ការពារការស្កេនជំនួសគ្នាបានយ៉ាងមានប្រសិទ្ធភាព។
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">
              Live Real-Time Dashboard
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ស្ថិតិវត្តមាន អវត្តមាន មកយឺត និងច្បាប់ ធ្វើបច្ចុប្បន្នភាពរៀងរាល់ ៦០ វិនាទី។
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 px-6 py-6 text-center text-xs text-slate-500 relative z-20">
        © {new Date().getFullYear()} AttendPro — ដំណើរការសម្រាប់ TheDemo Coffee។ រក្សាសិទ្ធិគ្រប់យ៉ាង។
      </footer>
    </div>
  );
}
