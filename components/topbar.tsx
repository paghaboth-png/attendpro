"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import { useCompany } from "@/lib/company-context";
import {
  Menu,
  Maximize2,
  Minimize2,
  LogOut,
  Shield,
  MapPin,
  ChevronDown,
  Building,
  QrCode,
  X,
  ExternalLink,
  Smartphone,
  Bell,
  Check,
  Sun,
  Moon,
  KeyRound,
} from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

import { BranchQrModal } from "@/components/branch-qr-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";

interface TopBarProps {
  onOpenSidebar: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const { data: session } = useSession();
  const { t, locale, setLocale } = useI18n();
  const { company } = useCompany();
  const { theme, toggleTheme } = useTheme();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBranchId, setQrBranchId] = useState<string | null>(null);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s poll
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  };

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

  const openQrModal = async () => {
    try {
      const res = await fetch("/api/branches");
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setQrBranchId(json.data[0].id);
        setQrModalOpen(true);
      }
    } catch {}
  };

  const user = session?.user as any;
  const userRole = user?.role || "EMPLOYEE";
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const branchName = user?.branchName || "គ្រប់សាខា";

  return (
    <>
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
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || "Logo"}
                className="w-5 h-5 rounded object-contain border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <Building className="w-4 h-4 text-blue-500" />
            )}
            <span className="font-semibold text-slate-900 dark:text-white">
              {company.name || t("companyDefault")}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              {branchName}
            </span>
          </div>
        </div>

        {/* Right: Controls & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* QR Code Button for Mobile Check-in */}
          <button
            type="button"
            onClick={openQrModal}
            className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
            title="ស្កេន QR Code បើកលើទូរស័ព្ទ"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">QR Check-in</span>
          </button>

          {/* Light / Dark Theme Toggle (☀️/🌙) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "ប្តូរទៅ Light Theme (☀️)" : "ប្តូរទៅ Dark Theme (🌙)"}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center border border-slate-200 dark:border-slate-800"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

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

          {/* In-App Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
              title="ការជូនដំណឹង (Notifications)"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-xs animate-fade-in">
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <span>ការជូនដំណឹងក្នុងប្រព័ន្ធ</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] text-blue-500 hover:underline"
                    >
                      អានទាំងអស់
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      គ្មានការជូនដំណឹងថ្មីឡើយ
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) window.location.href = n.link;
                        }}
                        className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-start gap-2.5 ${
                          !n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !n.isRead ? "bg-blue-500" : "bg-transparent"
                          }`}
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {n.message}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono pt-0.5">
                            {new Date(n.createdAt).toLocaleTimeString("km-KH", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              timeZone: "Asia/Phnom_Penh",
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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

                  <div className="py-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setChangePwOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-purple-500" />
                      <span>ប្តូរពាក្យសម្ងាត់ (Change Password)</span>
                    </button>
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

      {/* Change Password Modal (Self-service for all users) */}
      <ChangePasswordModal
        isOpen={changePwOpen}
        onClose={() => setChangePwOpen(false)}
      />

      {/* Unified Branch QR Code Modal */}
      {qrModalOpen && qrBranchId && (
        <BranchQrModal
          branchId={qrBranchId}
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </>
  );
}
