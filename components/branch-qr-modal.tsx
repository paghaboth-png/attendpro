"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Building2,
  ExternalLink,
  MapPin,
  Radio,
} from "lucide-react";

interface BranchQrModalProps {
  branchId: string;
  isOpen: boolean;
  onClose: () => void;
  onRegenerated?: () => void;
}

export function BranchQrModal({
  branchId,
  isOpen,
  onClose,
  onRegenerated,
}: BranchQrModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchQr = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/branches/${branchId}/qr`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchQr();
    }
  }, [isOpen, branchId]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (!data?.scanUrl) return;
    navigator.clipboard.writeText(data.scanUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyToken = () => {
    if (!data?.token) return;
    navigator.clipboard.writeText(data.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!data?.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = data.qrDataUrl;
    link.download = `attendpro_qr_${data.branchName || "branch"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSvg = () => {
    if (!data?.qrSvg) return;
    const blob = new Blob([data.qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendpro_qr_${data.branchName || "branch"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async () => {
    if (
      !confirm(
        `⚠️ ការព្រមានសុវត្ថិភាពសំខាន់៖\n\nតើលោកអ្នកពិតជាចង់បង្កើត QR Code ថ្មីសម្រាប់សាខា "${data?.branchName}" មែនទេ?\n\nQR Code ចាស់ដែលបានបោះពុម្ពបិទនៅហាង នឹងឈប់ដំណើរការភ្លាមៗ ហើយបុគ្គលិកត្រូវស្កេនរូប QR ថ្មីវិញ!`
      )
    ) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await fetch(`/api/branches/${branchId}/qr/regenerate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchQr();
        onRegenerated?.();
      } else {
        alert(json.error || "បរាជ័យក្នុងការបង្កើត QR ថ្មី");
      }
    } catch {
      alert("មានបញ្ហាបច្ចេកទេស");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>QR Check-in សម្រាប់ហាង</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                សាខា៖ <strong>{data?.branchName || "កំពុងទាញយក..."}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            កំពុងទាញយកទិន្នន័យ QR Code...
          </div>
        ) : !data ? (
          <div className="py-8 text-center text-xs text-rose-500">
            បរាជ័យក្នុងការទាញយក QR Code
          </div>
        ) : (
          <div className="space-y-4">
            {/* Large QR Display */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md inline-block">
                <img
                  src={data.qrDataUrl}
                  alt={`QR ${data.branchName}`}
                  className="w-56 h-56 object-contain"
                />
              </div>

              {/* Branch info badge */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  {data.branchAddress || "ស្វាយរៀង"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Radio className="w-3 h-3" />
                  កាំរង្វង់ {data.radiusMeters}m
                </span>
              </div>
            </div>

            {/* Scan URL Bar with Copy */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>តំណភ្ជាប់សម្រាប់ស្កេន (Scan URL)៖</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[10px]"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>បានចម្លង URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>ចម្លង Link</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                {data.scanUrl}
              </div>
            </div>

            {/* Quick Poster Buttons (A4 / A5) */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/setup/branches/${branchId}/poster?size=a4`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>ប៉ុស្តិ៍បិទជញ្ជាំង A4</span>
              </a>

              <a
                href={`/setup/branches/${branchId}/poster?size=a5`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>ប៉ុស្តិ៍បិទជញ្ជាំង A5</span>
              </a>
            </div>

            {/* Action Buttons: Download PNG, Download SVG, Print */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ទាញយក PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ទាញយក SVG</span>
              </button>

              <a
                href={`/setup/branches/${branchId}/poster?size=a4`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>បោះពុម្ព</span>
              </a>
            </div>

            {/* Regenerate Token Box */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">
                  បង្កើត QR Code ថ្មី (Regenerate)
                </span>
                <span className="text-[10px] text-slate-400">
                  QR ចាស់នឹងលែងដំណើរការភ្លាមៗ
                </span>
              </div>

              <button
                type="button"
                disabled={regenerating}
                onClick={handleRegenerate}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                <span>{regenerating ? "កំពុងបង្កើត..." : "បង្កើត QR ថ្មី"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
