"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, KeyRound, AlertCircle, CheckCircle2, X } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "EMPLOYEE";
  const minLen = userRole === "EMPLOYEE" ? 6 : 8;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < minLen) {
      setError(`ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ${minLen} តួអក្សរ`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("ពាក្យសម្ងាត់បញ្ជាក់មិនដូចគ្នាឡើយ");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          onClose();
        }, 1500);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative transition-all">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ផ្លាស់ប្តូរពាក្យសម្ងាត់
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {userRole === "EMPLOYEE"
                ? "យ៉ាងតិច ៦ តួអក្សរសម្រាប់បុគ្គលិក"
                : "យ៉ាងតិច ៨ តួអក្សរសម្រាប់អ្នកគ្រប់គ្រង"}
            </p>
          </div>
        </div>

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-semibold">
              បានផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ!
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ពាក្យសម្ងាត់បច្ចុប្បន្ន (Current Password) *
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="វាយពាក្យសម្ងាត់ចាស់របស់អ្នក"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ពាក្យសម្ងាត់ថ្មី (New Password យ៉ាងតិច {minLen} តួ) *
              </label>
              <input
                type="password"
                required
                minLength={minLen}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`យ៉ាងតិច ${minLen} តួអក្សរ`}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                បញ្ជាក់ពាក្យសម្ងាត់ថ្មី (Confirm New Password) *
              </label>
              <input
                type="password"
                required
                minLength={minLen}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="វាយពាក្យសម្ងាត់ថ្មីម្តងទៀត"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loading ? "កំពុងកែប្រែ..." : "ផ្លាស់ប្តូរពាក្យសម្ងាត់"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
