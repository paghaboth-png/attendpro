"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, ArrowLeft, Clock } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  phaseNotice: string;
  icon: LucideIcon;
}

export function PlaceholderPage({
  title,
  subtitle,
  phaseNotice,
  icon: Icon,
}: PlaceholderPageProps) {

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/10">
        <Icon className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{phaseNotice}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">{title}</h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">{subtitle}</p>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-md mx-auto text-xs text-slate-400 text-left space-y-2">
        <div className="font-semibold text-white mb-2">
          ត្រៀមសម្រាប់ដំណាក់កាលបន្ទាប់៖
        </div>
        <p>• មុខងារនេះស្ថិតនៅក្នុងផែនការមេ</p>
        <p>• រចនាសម្ព័ន្ធទិន្នន័យ (Database) ត្រូវបានបង្កើតរួចរាល់</p>
        <p>• នឹងត្រូវបន្ថែមផ្ទាំងលម្អិតនៅក្នុង Phase បន្ទាប់</p>
      </div>

      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង (Dashboard)</span>
        </Link>
      </div>
    </div>
  );
}
