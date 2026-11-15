"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
} from "lucide-react";

export default function BranchQrPosterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = params?.id as string;

  const [posterSize, setPosterSize] = useState<"A4" | "A5">(
    (searchParams.get("size")?.toUpperCase() as any) === "A5" ? "A5" : "A4"
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    fetch(`/api/branches/${branchId}/qr`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        កំពុងរៀបចំ ប៉ុស្តិ៍ QR Code...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <p className="text-sm font-semibold text-rose-500 mb-3">
          រកមិនឃើញព័ត៌មានសាខាឡើយ
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          ត្រឡប់ក្រោយ
        </button>
      </div>
    );
  }

  const isA5 = posterSize === "A5";

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-slate-800 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Floating Action Bar (Hidden on print) */}
      <div className="print:hidden w-full max-w-4xl bg-white/90 backdrop-blur-md border border-slate-300 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ត្រឡប់</span>
          </button>
          <div className="h-4 w-px bg-slate-300 mx-1"></div>
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>ប៉ុស្តិ៍បិទជញ្ជាំង QR: {data.branchName}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Format Selector: A4 vs A5 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPosterSize("A4")}
              className={`px-3 py-1 rounded-lg transition ${
                posterSize === "A4"
                  ? "bg-white text-blue-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ទំហំ A4 (ស្តង់ដារ)
            </button>
            <button
              type="button"
              onClick={() => setPosterSize("A5")}
              className={`px-3 py-1 rounded-lg transition ${
                posterSize === "A5"
                  ? "bg-white text-blue-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ទំហំ A5 (តូច)
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>បោះពុម្ពភ្លាម (Print / Save as PDF)</span>
          </button>
        </div>
      </div>

      {/* Physical Sheet Container */}
      <div
        className={`bg-white shadow-2xl print:shadow-none print:m-0 border border-slate-200 print:border-none rounded-3xl print:rounded-none overflow-hidden flex flex-col justify-between transition-all relative ${
          isA5
            ? "w-[148mm] min-h-[210mm] p-[10mm]"
            : "w-[210mm] min-h-[297mm] p-[14mm]"
        }`}
        style={{
          boxSizing: "border-box",
        }}
      >
        {/* Subtle decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        {/* SECTION 1: Header with Logo and Brand */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            {data.companyLogo ? (
              <img
                src={data.companyLogo}
                alt={data.companyName}
                className="w-14 h-14 object-contain rounded-2xl border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/20">
                {data.companyName?.charAt(0) || "A"}
              </div>
            )}
            <div className="text-left">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {data.companyName}
              </h1>
              <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>សាខា៖ {data.branchName}</span>
              </p>
            </div>
          </div>

          <div className="my-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
              ស្កេនដើម្បី Check-in / Check-out
            </h2>
            <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mt-0.5">
              Scan with phone camera to record attendance
            </p>
          </div>
        </div>

        {/* SECTION 2: Large QR Code with Crisp White Border (≥ 10 cm on A4) */}
        <div className="my-auto flex flex-col items-center justify-center">
          <div className="p-4 bg-white rounded-3xl border-4 border-slate-900 shadow-xl inline-block relative">
            <img
              src={data.qrDataUrl}
              alt="AttendPro Shop QR Code"
              className={isA5 ? "w-[85mm] h-[85mm]" : "w-[105mm] h-[105mm]"}
              style={{ minWidth: isA5 ? "80mm" : "100mm" }}
            />
            {/* Corner Markers for professional look */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-blue-600"></div>
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-blue-600"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-blue-600"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-blue-600"></div>
          </div>

          <p className="font-mono text-[10px] text-slate-400 mt-2 tracking-wider">
            TOKEN: {data.token?.slice(0, 8)}••••••••{data.token?.slice(-8)} • svay_rieng
          </p>
        </div>

        {/* SECTION 3: 3 Simple Numbered Steps */}
        <div className="w-full my-3">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {/* Step 1 */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-1.5 shadow-xs">
                ១
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                ស្កេនកាមេរ៉ា
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                បើកកាមេរ៉ាទូរស័ព្ទស្កេន QR នេះ
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-1.5 shadow-xs">
                ២
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                ចូលគណនី (Login)
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Login លើកដំបូង (ជាប់ ៣០ ថ្ងៃ)
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mb-1.5 shadow-xs">
                ៣
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                ចុចប៊ូតុងកត់ត្រា
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                ចុច Check-in ឬ Check-out
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Security Warning & GPS notice */}
        <div className="mt-2 space-y-2">
          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-center gap-2 text-center">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="text-[11px] font-bold">
              សូមកុំចែករំលែករូប QR នេះ ត្រូវស្កេននៅក្នុងហាងប៉ុណ្ណោះ (ផ្ទៀងផ្ទាត់ GPS {data.radiusMeters}m)
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pt-1 border-t border-slate-100">
            <span>AttendPro Smart Attendance System</span>
            <span>{data.branchAddress || "Svay Rieng City"}</span>
          </div>
        </div>
      </div>

      {/* Global Print Style for Perfect Physical Paper Margins */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: ${posterSize === "A5" ? "A5 portrait" : "A4 portrait"};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
