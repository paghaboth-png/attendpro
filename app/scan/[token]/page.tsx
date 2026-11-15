"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  MapPin,
  Building2,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Check,
} from "lucide-react";

export default function ScanQrPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const { data: session, status: authStatus } = useSession();

  // Branch Info
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);

  // Employee & Attendance Status
  const [empStatus, setEmpStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  // Login Form State (if not logged in)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"CHECK_IN" | "CHECK_OUT" | "UPDATE_CHECKOUT">("CHECK_IN");
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);

  // 1. Fetch Branch Info from token
  const fetchBranchInfo = async () => {
    if (!token) return;
    setBranchLoading(true);
    setBranchError(null);
    try {
      const res = await fetch(`/api/scan/info?token=${token}`);
      const json = await res.json();
      if (json.success) {
        setBranchInfo(json.data);
      } else {
        setBranchError(json.error || "QR នេះលែងមានសុពលភាព សូមទាក់ទងម្ចាស់ហាង");
      }
    } catch {
      setBranchError("មានបញ្ហាបច្ចេកទេសក្នុងការទាញយកព័ត៌មាន QR");
    } finally {
      setBranchLoading(false);
    }
  };

  // 2. Fetch Employee Attendance Status
  const fetchEmployeeStatus = async () => {
    if (!token || !session?.user) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/scan/employee-status?token=${token}`);
      const json = await res.json();
      if (json.success) {
        setEmpStatus(json);
      }
    } catch {}
    setStatusLoading(false);
  };

  // 3. Request GPS Location
  const requestLocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("ឧបករណ៍របស់អ្នកមិនគាំទ្រ GPS ឡើយ");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setCoords({ lat, lng, acc });
        setGpsLoading(false);

        if (branchInfo?.lat && branchInfo?.lng) {
          const dist = calculateDistance(lat, lng, branchInfo.lat, branchInfo.lng);
          setDistanceMeters(dist);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError("អ្នកបានបដិសេធសិទ្ធិទីតាំង (Location Denied)។ សូមបើក GPS ក្នុង Browser Settings");
        } else {
          setGpsError("មិនអាចចាប់សញ្ញា GPS បានឡើយ សូមសាកល្បងម្តងទៀត");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  useEffect(() => {
    fetchBranchInfo();
  }, [token]);

  useEffect(() => {
    if (session?.user && token) {
      fetchEmployeeStatus();
    }
  }, [session, token]);

  useEffect(() => {
    if (branchInfo) {
      requestLocation();
    }
  }, [branchInfo]);

  // Handle In-Page Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const res = await signIn("credentials", {
      identifier: loginIdentifier,
      password: loginPassword,
      redirect: false,
    });

    setLoginLoading(false);
    if (res?.error) {
      if (res.error.startsWith("LOCKED:")) {
        const mins = res.error.split(":")[1] || "15";
        setLoginError(`គណនីត្រូវបានចាក់សោបណ្តោះអាសន្ន ${mins} នាទី ដោយសារព្យាយាមចូលខុសច្រើនដង`);
      } else {
        setLoginError("ព័ត៌មានចូលមិនត្រឹមត្រូវ");
      }
    } else {
      // Login success -> page will re-evaluate session and load employee status!
    }
  };

  // Submit Record
  const handleConfirmSubmit = async () => {
    if (!coords) {
      alert("សូមរង់ចាំចាប់ទីតាំង GPS ជាមុនសិន");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/scan/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.acc,
          action: pendingAction,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowConfirmModal(false);
        setSuccessResult(json.data);
        fetchEmployeeStatus();
      } else {
        alert(json.error || "បរាជ័យក្នុងការកត់ត្រាវត្តមាន");
      }
    } catch {
      alert("មានបញ្ហាបច្ចេកទេស");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER: Loading State
  // -------------------------------------------------------------
  if (branchLoading || authStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 animate-spin mb-3">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-600">
          កំពុងផ្ទៀងផ្ទាត់ QR Code ហាង...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Invalid Token Error
  // -------------------------------------------------------------
  if (branchError || !branchInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">
          QR Code មិនត្រឹមត្រូវ
        </h2>
        <p className="text-xs text-rose-600 max-w-xs mb-6 leading-relaxed">
          {branchError || "QR នេះលែងមានសុពលភាព សូមទាក់ទងម្ចាស់ហាង"}
        </p>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-md transition"
        >
          ចូលទំព័រដើម
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Not Logged In State (Light Theme Sign In Card)
  // -------------------------------------------------------------
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 animate-fade-in">
          {/* Shop Header */}
          <div className="text-center space-y-2">
            {branchInfo.companyLogo ? (
              <img
                src={branchInfo.companyLogo}
                alt={branchInfo.companyName}
                className="w-14 h-14 object-contain rounded-2xl mx-auto border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-md shadow-blue-500/20">
                {branchInfo.companyName?.charAt(0) || "A"}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-slate-900">
                ចូលដើម្បី Check-in នៅ {branchInfo.branchName}
              </h1>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{branchInfo.companyName}</span>
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                អ៊ីមែល ឬលេខទូរស័ព្ទ *
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="ឧ. 012 999 003"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ពាក្យសម្ងាត់ (Password) *
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loginLoading ? "កំពុងចូល..." : "ចូលគណនី (Sign in)"}</span>
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400">
            គណនីនឹងនៅជាប់ ៣០ ថ្ងៃលើទូរស័ព្ទនេះ ដើម្បីលើកក្រោយស្កេនបានភ្លាមៗ
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Success Screen (After Check-in / Check-out recorded)
  // -------------------------------------------------------------
  if (successResult) {
    const isCheckIn = successResult.action === "CHECK_IN";
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 animate-scale-up">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {isCheckIn ? "Check-in ជោគជ័យ! 🎉" : "Check-out ជោគជ័យ! 🎉"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {successResult.employeeName} • {successResult.branchName}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>ម៉ោងកត់ត្រា៖</span>
              <strong className="font-mono text-base font-bold text-blue-600">
                {successResult.time}
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>ស្ថានភាពវត្តមាន៖</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  successResult.isLate
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {successResult.isLate ? "មកយឺត" : "ទាន់ពេល (On-time)"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>ចម្ងាយពីហាង៖</span>
              <span className="font-mono text-[11px] text-slate-500">
                {successResult.distanceMeters} ម៉ែត្រ (GPS)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>វិធីកត់ត្រា៖</span>
              <span className="font-mono text-[11px] font-bold text-blue-600">
                QR Code
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => router.push("/attendances")}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
            >
              <span>ពិនិត្យប្រវត្តិវត្តមាន</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setSuccessResult(null);
                fetchEmployeeStatus();
              }}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              ត្រឡប់មកវិញ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Standalone Admin (No Employee Record)
  // -------------------------------------------------------------
  if (empStatus?.state === "NO_EMPLOYEE_RECORD") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            គណនីគ្រប់គ្រង (Admin)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            គណនីនេះមិនមែនជាបុគ្គលិកដែលត្រូវ Check-in ឡើយ (គ្មានកាលវិភាគការងារ)។
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
          >
            ទៅកាន់ Dashboard
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Unauthorized Branch Error
  // -------------------------------------------------------------
  if (empStatus?.state === "UNAUTHORIZED_BRANCH") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            សាខាមិនត្រូវគ្នា
          </h2>
          <p className="text-xs text-rose-600 leading-relaxed">
            {empStatus.message}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold transition"
          >
            ត្រឡប់ទៅ Dashboard
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Main Check-in / Check-out Interface
  // -------------------------------------------------------------
  const isOutOfRange = distanceMeters !== null && distanceMeters > (branchInfo.radiusMeters || 100);
  const state = empStatus?.state || "READY_CHECK_IN";
  const employee = empStatus?.employee;
  const attendance = empStatus?.attendance;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          {branchInfo.companyLogo ? (
            <img
              src={branchInfo.companyLogo}
              alt={branchInfo.companyName}
              className="w-9 h-9 object-contain rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {branchInfo.companyName?.charAt(0) || "A"}
            </div>
          )}
          <div>
            <h1 className="text-xs font-bold text-slate-900">
              {branchInfo.companyName}
            </h1>
            <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{branchInfo.branchName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-medium transition"
        >
          Dashboard
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-4 py-4">
        {/* Employee Info Strip */}
        {employee && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
                {employee.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{employee.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                    {employee.code}
                  </span>
                  <span>{employee.position}</span>
                </div>
              </div>
            </div>

            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 font-semibold">
              QR Check-in
            </span>
          </div>
        )}

        {/* GPS Verification Banner */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-blue-600" />
              <span>ទីតាំង GPS របស់លោកអ្នក</span>
            </span>

            <button
              onClick={requestLocation}
              disabled={gpsLoading}
              className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-semibold"
            >
              <RefreshCw className={`w-3 h-3 ${gpsLoading ? "animate-spin" : ""}`} />
              <span>{gpsLoading ? "កំពុងចាប់..." : "ចាប់ឡើងវិញ"}</span>
            </button>
          </div>

          {gpsError ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
              <div className="flex items-start gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{gpsError}</span>
              </div>
              <p className="text-[10px] text-amber-700 pl-5">
                សូមបើក Location ក្នុង Setting ទូរស័ព្ទរបស់អ្នក រួចចុច "ចាប់ឡើងវិញ"។
              </p>
            </div>
          ) : coords && distanceMeters !== null ? (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isOutOfRange
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {isOutOfRange ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                )}
                <div>
                  <div className="font-bold text-xs">
                    {isOutOfRange
                      ? `អ្នកនៅឆ្ងាយពីហាង ${distanceMeters} ម៉ែត្រ`
                      : `នៅក្នុងបរិវេណហាង (ចម្ងាយ ${distanceMeters}m)`}
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    កាំរង្វង់អនុញ្ញាត {branchInfo.radiusMeters} ម៉ែត្រ (GPS ±{Math.round(coords.acc)}m)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center text-xs animate-pulse">
              កំពុងចាប់យកកូអរដោនេ GPS...
            </div>
          )}
        </div>

        {/* Dynamic Action Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs text-slate-500">
            <span>ស្ថានភាពវត្តមានថ្ងៃនេះ៖</span>
            <span className="font-mono text-slate-700 font-bold">
              {empStatus?.date || "--"}
            </span>
          </div>

          {/* CASE 1: READY_CHECK_IN */}
          {state === "READY_CHECK_IN" && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <span className="text-[11px] text-slate-500 block mb-1">
                  វេនការងារ៖ <strong>{employee?.position}</strong>
                </span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block">
                  ស្ថានភាពរំពឹងទុក៖ {empStatus?.expectedStatus || "ទាន់ពេល"}
                </span>
              </div>

              <button
                type="button"
                disabled={isOutOfRange || !coords || gpsLoading}
                onClick={() => {
                  setPendingAction("CHECK_IN");
                  setShowConfirmModal(true);
                }}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base tracking-wide shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-400"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>CHECK-IN (ចូលធ្វើការ)</span>
              </button>
            </div>
          )}

          {/* CASE 2: COOLDOWN_BLOCKED (< 5 mins after check-in) */}
          {state === "COOLDOWN_BLOCKED" && (
            <div className="space-y-3 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  អ្នកទើបតែ Check-in មិនទាន់ដល់ម៉ោង Check-out ទេ
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  ដើម្បីការពារការស្កេនច្រឡំ សូមរង់ចាំ {empStatus?.cooldownRemainingSeconds} វិនាទីទៀត
                </p>
              </div>

              <button
                type="button"
                disabled
                className="w-full py-3.5 rounded-2xl bg-slate-200 text-slate-400 font-bold text-sm cursor-not-allowed"
              >
                សូមរង់ចាំ {empStatus?.cooldownRemainingSeconds}s ទៀត...
              </button>
            </div>
          )}

          {/* CASE 3: READY_CHECK_OUT */}
          {state === "READY_CHECK_OUT" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>បាន Check-in ម៉ោង៖</span>
                  <strong className="font-mono text-emerald-600 font-bold">
                    {attendance?.checkInAt
                      ? new Date(attendance.checkInAt).toLocaleTimeString("km-KH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Phnom_Penh",
                        })
                      : "--:--"}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                disabled={isOutOfRange || !coords || gpsLoading}
                onClick={() => {
                  setPendingAction("CHECK_OUT");
                  setShowConfirmModal(true);
                }}
                className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-base tracking-wide shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-400"
              >
                <Clock className="w-5 h-5" />
                <span>CHECK-OUT (ចេញពីធ្វើការ)</span>
              </button>
            </div>
          )}

          {/* CASE 4: ALREADY_CHECKED_OUT */}
          {state === "ALREADY_CHECKED_OUT" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 text-xs">
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>វត្តមានថ្ងៃនេះបានបញ្ចប់សព្វគ្រប់</span>
                </div>
                <div className="flex items-center justify-around font-mono text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <div>
                    In:{" "}
                    <strong>
                      {attendance?.checkInAt
                        ? new Date(attendance.checkInAt).toLocaleTimeString("km-KH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Phnom_Penh",
                          })
                        : "--"}
                    </strong>
                  </div>
                  <div>
                    Out:{" "}
                    <strong>
                      {attendance?.checkOutAt
                        ? new Date(attendance.checkOutAt).toLocaleTimeString("km-KH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Phnom_Penh",
                          })
                        : "--"}
                    </strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isOutOfRange || !coords}
                onClick={() => {
                  setPendingAction("UPDATE_CHECKOUT");
                  setShowConfirmModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
              >
                ធ្វើបច្ចុប្បន្នភាព Check-out (កែម៉ោងចេញ)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {pendingAction === "CHECK_IN"
                  ? "បញ្ជាក់ការ Check-in"
                  : pendingAction === "UPDATE_CHECKOUT"
                  ? "បញ្ជាក់ការកែ Check-out"
                  : "បញ្ជាក់ការ Check-out"}
              </h3>
              <p className="text-xs text-slate-500">
                សូមពិនិត្យព័ត៌មានខាងក្រោមមុនពេលកត់ត្រា
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>បុគ្គលិក៖</span>
                <strong className="text-slate-900">{employee?.name} ({employee?.code})</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>សាខា៖</span>
                <strong className="text-slate-900">{branchInfo.branchName}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>ម៉ោងបច្ចុប្បន្ន៖</span>
                <strong className="font-mono text-sm text-blue-600">
                  {empStatus?.currentPhnomPenhTime || "--:--"}
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>ស្ថានភាព៖</span>
                <span className="font-bold text-slate-800">
                  {empStatus?.expectedStatus || "ទាន់ពេល"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>ចម្ងាយ GPS៖</span>
                <span className="font-mono text-emerald-600 font-bold">
                  {distanceMeters} ម៉ែត្រ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                បោះបង់
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {submitting ? "កំពុងកត់ត្រា..." : "បញ្ជាក់កត់ត្រា"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="max-w-md w-full mx-auto text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
        AttendPro Secure QR Check-in • ស្កេនក្នុងបរិវេណហាងប៉ុណ្ណោះ
      </div>
    </div>
  );
}
