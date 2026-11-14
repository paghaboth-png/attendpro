"use client";

import React, { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import {
  Menu,
  Maximize2,
  Minimize2,
  LogOut,
  Shield,
  MapPin,
  ChevronDown,
  Building,
} from "lucide-react";

interface TopBarProps {
  onOpenSidebar: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const { data: session } = useSession();
  const { t, locale, setLocale } = useI18n();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const user = session?.user as any;
  const userRole = user?.role || "EMPLOYEE";
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const branchName = user?.branchName || "TheDemo Coffee";

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Page Brand Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Building className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-900 dark:text-white">
            {t("companyDefault")}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-slate-500 dark:text-slate-400">
            {branchName}
          </span>
        </div>
      </div>

      {/* Right: Controls & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-full border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setLocale("km")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1 ${
              locale === "km"
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>🇰🇭</span>
            <span className="hidden sm:inline">ខ្មែរ</span>
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1 ${
              locale === "en"
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>🇬🇧</span>
            <span className="hidden sm:inline">EN</span>
          </button>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20">
              {userName.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {userName}
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                {t(userRole as any) || userRole}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {userName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {userEmail}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 text-[10px] font-semibold">
                    <Shield className="w-3 h-3" />
                    <span>{t(userRole as any) || userRole}</span>
                  </div>
                </div>

                <div className="py-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{branchName}</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t("logout")}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
