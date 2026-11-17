"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CalendarDays,
  FileText,
  ClockAlert,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { ChangePasswordModal } from "@/components/change-password-modal";

export function EmployeeDashboardCheckin() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [changePwOpen, setChangePwOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("km-KH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyData = async () => {
    try {
      const res = await fetch("/api/attendance/me");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  const handleQuickCheckin = (action: "CHECK_IN" | "CHECK_OUT") => {
    setStatusMsg(null);
    setGpsLoading(true);

    if (!navigator.geolocation) {
      setGpsLoading(false);
      setStatusMsg({
        type: "error",
        text: "ឧបករណ៍របស់អ្នកមិនគាំទ្រប្រព័ន្ធកំណត់ទីតាំង GPS ឡើយ",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsLoading(false);
        setSubmitting(true);
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;

          const res = await fetch("/api/attendance/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeCode: data?.employee?.code,
              action,
              lat,
              lng,
              accuracy,
            }),
          });

          const resJson = await res.json();
          if (resJson.success) {
            setStatusMsg({
              type: "success",
              text:
                action === "CHECK_IN"
                  ? `បាន Check-in ដោយជោគជ័យនៅម៉ោង ${resJson.time} (${resJson.status})`
                  : `បាន Check-out ដោយជោគជ័យនៅម៉ោង ${resJson.time}`,
            });
            fetchMyData();
          } else {
            setStatusMsg({
              type: "error",
              text: resJson.error || "បរាជ័យក្នុងការស្កេនវត្តមាន",
            });
          }
        } catch {
          setStatusMsg({
            type: "error",
            text: "កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ",
          });
        } finally {
          setSubmitting(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        let errMsg = "សូមបើកការអនុញ្ញាត GPS (Location Permission) លើទូរស័ព្ទរបស់អ្នក";
        if (err.code === 1) {
          errMsg = "អ្នកបានបដិសេធការផ្តល់សិទ្ធិទីតាំង GPS។ សូមបើក Location ក្នុង Browser";
        } else if (err.code === 2) {
          errMsg = "មិនអាចចាប់សញ្ញាទីតាំង GPS បានឡើយ សូមព្យាយាមម្តងទៀត";
        }
        setStatusMsg({ type: "error", text: errMsg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse text-center text-slate-400">
        កំពុងផ្ទុកព័ត៌មានបុគ្គលិក...
      </div>
    );
  }

  const employee = data?.employee;
  const todayAtt = data?.todayAttendance;
  const isCheckedIn = Boolean(todayAtt?.checkInAt);
  const isCheckedOut = Boolean(todayAtt?.checkOutAt);

  return (
    <div className="space-y-6">
      {/* Big Hero Check-in Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background glow & coffee cup decorative */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5 text-blue-200" />
              <span>{employee?.branch?.name || "សាខាស្វាយរៀង"}</span>
              <span>•</span>
              <span>{employee?.position?.name || "បុគ្គលិក"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              សួស្តី, {employee?.name || session?.user?.name}!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              វេនធ្វើការ៖ {employee?.shift?.name || "ធម្មតា"} ({employee?.shift?.startTime} - {employee?.shift?.endTime})
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <div className="text-3xl sm:text-4xl font-mono font-black tracking-wider text-white">
              {currentTime}
            </div>
            <div className="text-xs text-blue-200 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>តម្រូវឱ្យផ្ទៀងផ្ទាត់ GPS ផ្ទាល់</span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mt-6 p-4 rounded-2xl text-xs flex items-center gap-2.5 backdrop-blur-md ${
              statusMsg.type === "success"
                ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-100"
                : "bg-rose-500/25 border border-rose-400/40 text-rose-100"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
        )}

        {/* Big Action Buttons (No Code / No PIN Needed) */}
        <div className="mt-8 pt-6 border-t border-white/15">
          {!isCheckedIn ? (
            <button
              type="button"
              disabled={submitting || gpsLoading}
              onClick={() => handleQuickCheckin("CHECK_IN")}
              className="w-full py-5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-blue-700 font-extrabold text-lg sm:text-xl shadow-2xl flex items-center justify-center gap-3 transition transform active:scale-[0.99] disabled:opacity-50"
            >
              <MapPin className="w-6 h-6 text-blue-600 animate-bounce" />
              <span>
                {gpsLoading
                  ? "កំពុងចាប់ទីតាំង GPS..."
                  : submitting
                  ? "កំពុងស្កេន Check-in..."
                  : "ចុច Check-in ភ្លាមៗ (One-Click Check-in)"}
              </span>
            </button>
          ) : !isCheckedOut ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>បាន Check-in រួចរាល់នៅម៉ោង {todayAtt?.checkInAt ? new Date(todayAtt.checkInAt).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-"}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-400/20 font-bold text-[10px] text-emerald-200">
                  {todayAtt?.status || "GOOD"}
                </span>
              </div>
              <button
                type="button"
                disabled={submitting || gpsLoading}
                onClick={() => handleQuickCheckin("CHECK_OUT")}
                className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.99] disabled:opacity-50"
              >
                <Clock className="w-5 h-5 text-slate-950" />
                <span>
                  {gpsLoading
                    ? "កំពុងចាប់ទីតាំង GPS..."
                    : submitting
                    ? "កំពុងស្កេន Check-out..."
                    : "ចុច Check-out ចេញពីការងារ (One-Click Check-out)"}
                </span>
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">វត្តមានថ្ងៃនេះបានបញ្ចប់ពេញលេញ</h3>
              <p className="text-xs text-blue-100 mt-1">
                Check-in: {todayAtt?.checkInAt ? new Date(todayAtt.checkInAt).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-"} • Check-out: {todayAtt?.checkOutAt ? new Date(todayAtt.checkOutAt).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Tiles for Employee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/attendances"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                ប្រវត្តិវត្តមានផ្ទាល់ខ្លួន
              </div>
              <div className="text-[11px] text-slate-500">មើលវត្តមានគ្រប់ថ្ងៃ</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/leave"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                ស្នើសុំច្បាប់សម្រាក
              </div>
              <div className="text-[11px] text-slate-500">ដាក់ពាក្យ និងតាមដានច្បាប់</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/overtime"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClockAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                ស្នើសុំថែមម៉ោង (OT)
              </div>
              <div className="text-[11px] text-slate-500">កត់ត្រាម៉ោងថែមក្រៅម៉ោង</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition" />
        </Link>

        <button
          type="button"
          onClick={() => setChangePwOpen(true)}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 shadow-sm transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                ប្តូរពាក្យសម្ងាត់
              </div>
              <div className="text-[11px] text-slate-500">ផ្លាស់ប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួន</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
        </button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePwOpen}
        onClose={() => setChangePwOpen(false)}
      />
    </div>
  );
}
