"use client";

import React, { useEffect, useState } from "react";
import { Users, Building2, Clock, Plus, Search, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function EmployeesPage() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/setup/overview")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEmployees(data.data.employees);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.code.toLowerCase().includes(query.toLowerCase()) ||
      e.position?.name.toLowerCase().includes(query.toLowerCase()) ||
      e.branch?.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-500" />
            <span>បញ្ជីបុគ្គលិកទាំងអស់ ({employees.length} នាក់)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            គ្រប់គ្រងព័ត៌មានបុគ្គលិក សាខា ផ្នែក តួនាទី និងវេនធ្វើការ
          </p>
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 self-start sm:self-auto opacity-80 cursor-not-allowed"
          title="ត្រៀមសម្រាប់ Phase 2"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមបុគ្គលិកថ្មី (Phase 2)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ កូដសម្គាល់ តួនាទី ឬសាខា..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          {t("loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition space-y-3.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-600/20">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{emp.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {emp.code}
                      </span>
                      <span className="text-[11px] text-blue-400 font-medium truncate max-w-[130px]">
                        {emp.position?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/10"></span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{emp.branch?.name}</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="truncate max-w-[110px]">{emp.department?.name}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pt-1.5 border-t border-slate-800/60">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">{emp.shift?.name}</span>
                </div>

                {emp.user?.email && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] pt-1 border-t border-slate-800/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono">{emp.user.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
