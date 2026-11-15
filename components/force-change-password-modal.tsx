"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ForceChangePasswordModal() {
  const { data: session, update } = useSession();
  const { locale } = useI18n();

  const mustChange = (session?.user as any)?.mustChangePassword === true;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!mustChange) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(
        locale === "km"
          ? "ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៨ តួអក្សរ"
          : "New password must be at least 8 characters long"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        locale === "km"
          ? "ពាក្យសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ"
          : "Passwords do not match"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
          forceChange: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        // Update session so mustChangePassword becomes false
        await update();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setError(data.error || "បរាជ័យក្នុងការប្តូរពាក្យសម្ងាត់");
      }
    } catch {
      setError("មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-7 shadow-2xl transition-all">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {locale === "km" ? "តម្រូវឱ្យប្តូរពាក្យសម្ងាត់" : "Password Change Required"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {locale === "km"
              ? "នេះជាការចូលប្រើប្រាស់លើកដំបូង ឬពាក្យសម្ងាត់ត្រូវបាន Reset។ សូមកំណត់ពាក្យសម្ងាត់ថ្មីផ្ទាល់ខ្លួន (យ៉ាងតិច ៨ តួ) ដើម្បីបន្តប្រើប្រាស់ប្រព័ន្ធ។"
              : "This is your first login or your password has been reset. Please set a new password (at least 8 characters) to continue."}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {locale === "km"
                ? "បានប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ! កំពុងដំណើរការ..."
                : "Password changed successfully! Refreshing..."}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {locale === "km" ? "ពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៨ តួ)" : "New Password (min 8 chars)"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {locale === "km" ? "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី" : "Confirm New Password"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span>{locale === "km" ? "កំពុងរក្សាទុក..." : "Saving..."}</span>
            ) : (
              <span>
                {locale === "km" ? "រក្សាទុកពាក្យសម្ងាត់ថ្មី" : "Save New Password"}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
