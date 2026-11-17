"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import { useCompany } from "@/lib/company-context";
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  Briefcase,
  Users,
  Clock,
  CalendarCheck,
  FileText,
  ClockAlert,
  BarChart3,
  Settings,
  ShieldCheck,
  DollarSign,
  Edit3,
  ChevronDown,
  Search,
  Coffee,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { company } = useCompany();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [setupExpanded, setSetupExpanded] = useState(true);
  const [attendanceExpanded, setAttendanceExpanded] = useState(true);

  const rawMenuGroups = [
    {
      groupTitle: t("navOverview"),
      items: [
        {
          title: t("navDashboard"),
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupTitle: t("navSetup"),
      isCollapsible: true,
      isExpanded: setupExpanded,
      toggle: () => setSetupExpanded(!setupExpanded),
      items: [
        { title: t("navBranches"), href: "/setup/branches", icon: Building2 },
        { title: t("navDepartments"), href: "/setup/departments", icon: FolderTree },
        { title: t("navPositions"), href: "/setup/positions", icon: Briefcase },
        { title: t("navEmployees"), href: "/setup/employees", icon: Users },
      ],
    },
    {
      groupTitle: t("navAttendanceTime"),
      isCollapsible: true,
      isExpanded: attendanceExpanded,
      toggle: () => setAttendanceExpanded(!attendanceExpanded),
      items: [
        { title: t("navAttendances"), href: "/attendances", icon: CalendarCheck },
        { title: t("navShifts"), href: "/shifts", icon: Clock },
      ],
    },
    {
      groupTitle: t("navLeaveOT"),
      items: [
        { title: t("navLeave"), href: "/leave", icon: FileText },
        { title: t("navOvertime"), href: "/overtime", icon: ClockAlert },
      ],
    },
    {
      groupTitle: t("navReports"),
      items: [
        { title: t("navReports"), href: "/reports", icon: BarChart3 },
        { title: "ប្រាក់បៀវត្ស (Payroll)", href: "/payroll", icon: DollarSign },
        { title: "កំណត់ប្រាក់ខែ (Setup)", href: "/payroll/setup", icon: Edit3 },
      ],
    },
    {
      groupTitle: t("navSettings"),
      items: [
        { title: t("navSettings"), href: "/settings", icon: Settings },
        { title: "កំណត់ហេតុ (Audit Logs)", href: "/audit-logs", icon: ShieldCheck },
      ],
    },
  ];

  // Role-based Menu Isolation: Employees only see Overview, Attendance (own), and Leave/OT
  const menuGroups = rawMenuGroups
    .map((grp) => {
      if (userRole === "EMPLOYEE") {
        if (
          grp.groupTitle === t("navSetup") ||
          grp.groupTitle === t("navSettings") ||
          grp.groupTitle === t("navReports")
        ) {
          return null;
        }
        if (grp.groupTitle === t("navAttendanceTime")) {
          return {
            ...grp,
            items: grp.items.filter((item) => item.href === "/attendances"),
          };
        }
      }
      return grp;
    })
    .filter(Boolean) as typeof rawMenuGroups;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#080d1f] border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/70">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            {company.logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shadow-md shadow-blue-500/10 group-hover:scale-105 transition overflow-hidden">
                <img
                  src={company.logoUrl}
                  alt={company.name || "Logo"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition">
                <Coffee className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  AttendPro
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30">
                  Cloud
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                {company.name || t("companyDefault")}
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Box */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-2 pb-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {menuGroups.map((group, groupIdx) => {
            const filteredItems = group.items.filter((item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                <div
                  onClick={group.toggle}
                  className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider ${
                    group.isCollapsible ? "cursor-pointer hover:text-slate-700 dark:hover:text-slate-300" : ""
                  }`}
                >
                  <span>{group.groupTitle}</span>
                  {group.isCollapsible && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        group.isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                  )}
                </div>

                {(!group.isCollapsible || group.isExpanded) && (
                  <div className="space-y-0.5">
                    {filteredItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/60"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />
                          <span>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
