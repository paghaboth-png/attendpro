"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, Sparkles, Clock, ShieldCheck, Radio } from "lucide-react";

export default function TabletDisplayPage() {
  const params = useParams();
  const branchId = params?.branchId as string;

  const [data, setData] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [currentTime, setCurrentTime] = useState("");

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("km-KH", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Phnom_Penh",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDynamicToken = async () => {
    if (!branchId) return;
    try {
      const res = await fetch(`/api/branches/${branchId}/dynamic-token`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setSecondsRemaining(json.data.secondsRemaining || 30);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDynamicToken();
    const interval = setInterval(fetchDynamicToken, 10000); // Check every 10s to sync
    return () => clearInterval(interval);
  }, [branchId]);

  // Local seconds countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchDynamicToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [branchId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 z-10">
        <div className="flex items-center gap-3">
          {data?.companyLogo ? (
            <img
              src={data.companyLogo}
              alt="Logo"
              className="w-12 h-12 object-contain rounded-2xl border border-slate-700 bg-white p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {data?.companyName?.charAt(0) || "A"}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {data?.companyName || "AttendPro"}
            </h1>
            <p className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{data?.branchName || "សាខាស្វាយរៀង"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-white">
              {currentTime || "--:--:--"}
            </span>
            <span className="text-[10px] text-slate-400 block tracking-widest uppercase">
              Phnom Penh Time (GMT+7)
            </span>
          </div>
        </div>
      </div>

      {/* Main Center QR Section */}
      <div className="my-auto flex flex-col items-center justify-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4 animate-pulse">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>QR ថាមវន្ត (ផ្លាស់ប្តូររៀងរាល់ ៣០ វិនាទី)</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans mb-1">
          ស្កេនដើម្បី Check-in / Check-out
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          បើកកាមេរ៉ាទូរស័ព្ទស្កេន QR ខាងក្រោម ដើម្បីកត់ត្រាវត្តមានការងារ
        </p>

        {/* Crisp QR Frame with Countdown Ring */}
        <div className="relative p-6 bg-white rounded-3xl shadow-2xl shadow-blue-500/10 inline-block">
          {data?.qrDataUrl ? (
            <img
              src={data.qrDataUrl}
              alt="Dynamic QR Code"
              className="w-72 h-72 sm:w-80 sm:h-80 object-contain mx-auto transition-all"
            />
          ) : (
            <div className="w-72 h-72 flex items-center justify-center text-slate-400 text-xs">
              កំពុងបង្កើត QR...
            </div>
          )}

          {/* Countdown indicator badge */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-md flex items-center gap-2 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-slate-300">ផុតកំណត់ក្នុង៖</span>
            <span className="text-amber-400 font-extrabold">{secondsRemaining}s</span>
          </div>
        </div>
      </div>

      {/* Bottom Security Notice */}
      <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-10">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[11px] font-medium">
            ប្រព័ន្ធសុវត្ថិភាពខ្ពស់ ផ្ទៀងផ្ទាត់ GPS ក្នុងបរិវេណហាង
          </span>
        </div>
        <span className="text-[10px] text-slate-600">
          AttendPro Store Live Display • Version 2.0
        </span>
      </div>
    </div>
  );
}
