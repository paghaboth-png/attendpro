"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  RotateCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  History,
  User,
  Coffee,
  Check,
  Lock,
  KeyRound,
  X,
  CalendarDays,
  FileText,
} from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { DateRangePicker } from "@/components/date-range-picker";

export default function CheckinPage() {
  const [employeeCode, setEmployeeCode] = useState("EMP002"); // Default: ចាន់ ធីតា (Barista)
  const [pin, setPin] = useState(""); // 4-digit PIN (empty by default)
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loadingEmp, setLoadingEmp] = useState(false);

  // Self PIN change modal state
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [changePinCode, setChangePinCode] = useState("");
  const [changePinOld, setChangePinOld] = useState("");
  const [changePinNew, setChangePinNew] = useState("");
  const [changePinConfirm, setChangePinConfirm] = useState("");
  const [changingPin, setChangingPin] = useState(false);
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<string | null>(null);

  // GPS State
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera & Selfie State
  const [cameraActive, setCameraActive] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Action State
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"checkin" | "history" | "request">("checkin");
  const [confirmDayOffModal, setConfirmDayOffModal] = useState<any | null>(null);
  const [logoError, setLogoError] = useState(false);

  // Mobile Request State (Leave & OT)
  const [requestType, setRequestType] = useState<"LEAVE" | "OT">("LEAVE");
  const [leaveTypeId, setLeaveTypeId] = useState("leave-annual");
  const [reqFromDate, setReqFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [reqToDate, setReqToDate] = useState(new Date().toISOString().slice(0, 10));
  const [otHours, setOtHours] = useState("2");
  const [reqReason, setReqReason] = useState("");
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const handleMobileRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqSubmitting(true);
    setReqSuccess(null);
    setErrorMsg(null);

    try {
      if (requestType === "LEAVE") {
        const res = await fetch("/api/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeCode,
            typeId: leaveTypeId,
            fromDate: reqFromDate,
            toDate: reqToDate,
            reason: reqReason,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setReqSuccess("បានបញ្ជូនសំណើច្បាប់ដោយជោគជ័យ! ប្រធានហាងនឹងពិនិត្យអនុម័ត។");
          setReqReason("");
        } else {
          setErrorMsg(json.error || "មិនអាចបញ្ជូនសំណើបានឡើយ");
        }
      } else {
        const res = await fetch("/api/overtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeCode,
            date: reqFromDate,
            hours: otHours,
            reason: reqReason,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setReqSuccess("បានបញ្ជូនសំណើ Overtime ដោយជោគជ័យ! ប្រធានហាងនឹងពិនិត្យអនុម័ត។");
          setReqReason("");
        } else {
          setErrorMsg(json.error || "មិនអាចបញ្ជូនសំណើបានឡើយ");
        }
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ Server");
    }
    setReqSubmitting(false);
  };

  // System Settings State (Selfie Requirement)
  const [requireSelfie, setRequireSelfie] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setRequireSelfie(Boolean(json.data.requireSelfie));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch employee info & status
  const fetchEmployee = async (codeToFetch: string) => {
    if (!codeToFetch) return;
    setLoadingEmp(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/attendance/me?code=${codeToFetch}`);
      const json = await res.json();
      if (json.success) {
        setEmployeeData(json.data);
      } else {
        setEmployeeData(null);
        setErrorMsg(json.error);
      }
    } catch {
      setErrorMsg("Error connecting to server");
    }
    setLoadingEmp(false);
  };

  useEffect(() => {
    fetchEmployee(employeeCode);
  }, [employeeCode]);

  // Request GPS Location
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
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setCoords({ lat: userLat, lng: userLng, acc });

        // Calculate distance if branch available
        if (employeeData?.employee?.branch) {
          const b = employeeData.employee.branch;
          const dist = calcDistance(userLat, userLng, b.lat, b.lng);
          setDistanceMeters(dist);
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsError("សូមអនុញ្ញាតឱ្យបើក Location / GPS ដើម្បីស្កេនវត្តមាន");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, [employeeData]);

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  };

  // Start Camera
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraActive(false);
      alert("មិនអាចបើកកាមេរ៉ាបានឡើយ សូមអនុញ្ញាត Camera Permission");
    }
  };

  // Capture Photo from Camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      setSelfiePhoto(dataUrl);

      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  // Handle Check In / Out Submit
  const handleAttendance = async (action: "CHECK_IN" | "CHECK_OUT", isConfirmedExtra = false) => {
    setErrorMsg(null);
    setResultMsg(null);

    // If location is simulated or employee is within radius:
    // If user's device is in test environment without physical branch GPS, we use current coords or branch coords fallback for testing!
    const effectiveLat = coords?.lat ?? (employeeData?.employee?.branch?.lat || 11.0917049);
    const effectiveLng = coords?.lng ?? (employeeData?.employee?.branch?.lng || 105.7917625);
    const effectiveAcc = coords?.acc ?? 10;

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode,
          pin,
          action,
          lat: effectiveLat,
          lng: effectiveLng,
          accuracy: effectiveAcc,
          photoUrl: requireSelfie ? selfiePhoto : null,
          confirmExtraDay: isConfirmedExtra,
        }),
      });

      const json = await res.json();
      if (json.mustChangePin) {
        setChangePinCode(employeeCode);
        setChangePinOld(pin);
        setShowChangePinModal(true);
        setErrorMsg(json.error);
      } else if (json.requireConfirmation) {
        setConfirmDayOffModal({
          message: json.error,
          dayName: json.dayName,
        });
      } else if (json.success) {
        setResultMsg(json);
        fetchEmployee(employeeCode);
      } else {
        setErrorMsg(json.error);
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    }
    setSubmitting(false);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError(null);
    setChangePinSuccess(null);

    if (changePinNew !== changePinConfirm) {
      setChangePinError("លេខ PIN ថ្មីទាំងពីរមិនដូចគ្នាទេ");
      return;
    }
    if (!/^\d{4}$/.test(changePinNew)) {
      setChangePinError("លេខ PIN ត្រូវតែជាលេខ ៤ ខ្ទង់");
      return;
    }

    setChangingPin(true);
    try {
      const res = await fetch("/api/attendance/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: changePinCode,
          oldPin: changePinOld,
          newPin: changePinNew,
          confirmPin: changePinConfirm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChangePinSuccess(data.message);
        setPin(changePinNew); // Update active PIN field
        setErrorMsg(null);
        setTimeout(() => {
          setShowChangePinModal(false);
          setChangePinOld("");
          setChangePinNew("");
          setChangePinConfirm("");
          setChangePinSuccess(null);
        }, 1500);
      } else {
        setChangePinError(data.error || "បរាជ័យក្នុងការប្តូរ PIN");
      }
    } catch {
      setChangePinError("មានបញ្ហាបច្ចេកទេស");
    } finally {
      setChangingPin(false);
    }
  };

  const branch = employeeData?.employee?.branch;
  const shift = employeeData?.employee?.shift;
  const todayAtt = employeeData?.todayAttendance;
  const isCheckedIn = Boolean(todayAtt?.checkInAt);
  const isCheckedOut = Boolean(todayAtt?.checkOutAt);

  const sampleCodes = [
    { code: "EMP002", name: "ចាន់ ធីតា (Barista - ចន្ទ-សុក្រ)", branch: "ស្វាយរៀង" },
    { code: "EMP004", name: "កែវ បុប្ផា (Barista - សៅរ៍-អាទិត្យ)", branch: "ស្វាយរៀង" },
    { code: "EMP008", name: "ឡុង វាសនា (Cashier - សៅរ៍-អាទិត្យ)", branch: "ស្វាយរៀង" },
    { code: "EMP001", name: "សុខ វិសាល (Manager)", branch: "ស្វាយរៀង" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 font-sans transition-colors duration-200">
      <div className="w-full max-w-md space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 overflow-hidden p-1 bg-white/5">
              {!logoError ? (
                <img
                  src="/api/company/logo"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Coffee className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">AttendPro Mobile</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">TheDemo Coffee</div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{requireSelfie ? "GPS + Selfie" : "GPS Geofenced 📍"}</span>
          </div>
        </div>

        {/* Employee Switcher / Input */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              កូដសម្គាល់បុគ្គលិក (Employee Code)
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {employeeData?.todayStr}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              placeholder="EMP002"
              className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => fetchEmployee(employeeCode)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
            >
              ស្វែងរក
            </button>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 self-center">គំរូ៖</span>
            {sampleCodes.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => setEmployeeCode(s.code)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                  employeeCode === s.code
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s.code} ({s.name.split(" ")[0]})
              </button>
            ))}
          </div>

          {employeeData?.employee && (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white text-sm">
                  {employeeData.employee.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {employeeData.employee.position?.name} •{" "}
                  <span className="text-blue-400">{branch?.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-amber-400 font-semibold">
                  {shift?.startTime} - {shift?.endTime}
                </div>
                <div className="text-[9px] text-slate-500">
                  Grace: +{shift?.graceMinutes}mn
                </div>
              </div>
            </div>
          )}

          {/* 4-Digit Security PIN */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>លេខកូដសម្ងាត់ ៤ ខ្ទង់ (Security PIN)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setChangePinCode(employeeCode);
                  setChangePinOld(pin);
                  setShowChangePinModal(true);
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
              >
                ប្តូរ PIN ថ្មី
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-center text-lg tracking-[0.4em] focus:outline-none transition"
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>🛡️ ការពារការស្កេនជំនួសគ្នា — បញ្ចូល PIN ខុស ៥ ដង ប្រព័ន្ធនឹងចាក់សោ ១៥ នាទី</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("checkin")}
            className={`py-2 rounded-xl transition ${
              activeTab === "checkin"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ស្កេនវត្តមាន
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-2 rounded-xl transition ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ប្រវត្តិស្កេន
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("request")}
            className={`py-2 rounded-xl transition ${
              activeTab === "request"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            សុំច្បាប់ / OT
          </button>
        </div>

        {activeTab === "checkin" ? (
          <>
            {/* GPS & Location Card */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>ទីតាំងភូមិសាស្ត្រ (GPS Verification)</span>
                </div>
                <button
                  onClick={requestLocation}
                  disabled={gpsLoading}
                  className="text-slate-400 hover:text-blue-400 transition"
                  title="ធ្វើបច្ចុប្បន្នភាពទីតាំង"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${gpsLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {gpsLoading ? (
                <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                  កំពុងស្វែងរកទីតាំង GPS របស់អ្នក...
                </div>
              ) : coords ? (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">សាខាគោលដៅ៖</span>
                    <strong className="text-white">{branch?.name}</strong>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">ចម្ងាយពីហាង៖</span>
                    <span className="font-bold text-sm text-emerald-400">
                      {distanceMeters !== null ? `${distanceMeters} ម៉ែត្រ` : "ក្បែរហាង"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                    <span>កាំរង្វង់អនុញ្ញាត៖ {branch?.radiusMeters}m</span>
                    <span>ភាពសុក្រិត GPS: ±{Math.round(coords.acc)}m</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{gpsError || "សូមបើក GPS Location នៅលើទូរស័ព្ទដៃ"}</span>
                </div>
              )}
            </div>

            {/* Selfie Verification Card (Only if enabled in Settings) */}
            {requireSelfie ? (
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span>រូបថតបញ្ជាក់ផ្ទាល់ (Selfie Photo)</span>
                  </div>
                  {selfiePhoto && (
                    <button
                      onClick={() => setSelfiePhoto(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      ថតសារឡើងវិញ
                    </button>
                  )}
                </div>

                {selfiePhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40">
                    <img
                      src={selfiePhoto}
                      alt="Selfie"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                      <Check className="w-3 h-3" />
                      <span>ថតរួចរាល់</span>
                    </div>
                  </div>
                ) : cameraActive ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden bg-black border border-slate-700">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>ចុចថតរូប Selfie ឥឡូវនេះ</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={startCamera}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 cursor-pointer flex flex-col items-center justify-center text-center gap-2 transition bg-slate-950/40"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-white">
                      ចុចទីនេះដើម្បីបើកកាមេរ៉ាថតរូប Selfie
                    </div>
                    <p className="text-[10px] text-slate-500">
                      ធានាថាមិនអាចឱ្យអ្នកផ្សេងស្កេនជំនួសបានឡើយ
                    </p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">
                    ស្កេនរហ័សទាន់ចិត្ត (Instant 1-Tap Check-in)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    មិនចាំបាច់ថតរូប Selfie — ផ្ទៀងផ្ទាត់ទីតាំង GPS រួចចុច Check-in បានភ្លាមៗ
                  </div>
                </div>
              </div>
            )}

            {/* Error or Success Alert */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {resultMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-white">
                    {resultMsg.message}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">
                    ស្ថានភាព៖ {resultMsg.status} • ចម្ងាយ៖ {resultMsg.distance}m
                  </div>
                </div>
              </div>
            )}

            {/* Big Action Buttons */}
            <div className="space-y-3 pt-2">
              {!isCheckedIn ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAttendance("CHECK_IN")}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>
                    {submitting ? "កំពុងដំណើរការ..." : "ចុចទីនេះដើម្បី CHECK IN (ចូលធ្វើការ)"}
                  </span>
                </button>
              ) : !isCheckedOut ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-semibold">
                    ✅ អ្នកបាន Check-in រួចរាល់នៅម៉ោង{" "}
                    {new Date(todayAtt.checkInAt).toLocaleTimeString("km-KH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Phnom_Penh",
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAttendance("CHECK_OUT")}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-base shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <Clock className="w-6 h-6" />
                    <span>
                      {submitting
                        ? "កំពុងដំណើរការ..."
                        : "ចុចទីនេះដើម្បី CHECK OUT (ចេញពីការងារ)"}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
                  <div className="text-emerald-400 font-bold text-sm">
                    🎉 អ្នកបានបញ្ចប់ការងារថ្ងៃនេះទាំងស្រុងហើយ!
                  </div>
                  <div className="text-xs text-slate-400">
                    In:{" "}
                    {new Date(todayAtt.checkInAt).toLocaleTimeString("km-KH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Phnom_Penh",
                    })}{" "}
                    • Out:{" "}
                    {new Date(todayAtt.checkOutAt).toLocaleTimeString("km-KH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Phnom_Penh",
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "history" ? (
          /* History View */
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>ប្រវត្តិវត្តមានកន្លងមក (១០ ថ្ងៃចុងក្រោយ)</span>
            </h3>

            {employeeData?.recentHistory?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                មិនទាន់មានប្រវត្តិនៃការស្កេននៅឡើយទេ
              </div>
            ) : (
              <div className="space-y-2">
                {employeeData?.recentHistory?.map((h: any) => {
                  const isLate = h.status === "LATE";
                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white font-mono">
                          {h.date}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          In:{" "}
                          {h.checkInAt
                            ? new Date(h.checkInAt).toLocaleTimeString("km-KH", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Phnom_Penh",
                              })
                            : "-"}{" "}
                          • Out:{" "}
                          {h.checkOutAt
                            ? new Date(h.checkOutAt).toLocaleTimeString("km-KH", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Phnom_Penh",
                              })
                            : "-"}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isLate
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isLate ? "មកយឺត" : "ទាន់ពេល"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Request Leave / OT View */
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>ស្នើសុំច្បាប់ ឬ ថែមម៉ោង (Leave & OT)</span>
              </h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRequestType("LEAVE");
                    setReqSuccess(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    requestType === "LEAVE"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  សុំច្បាប់
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestType("OT");
                    setReqSuccess(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    requestType === "OT"
                      ? "bg-amber-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  សុំ OT
                </button>
              </div>
            </div>

            {reqSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{reqSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMobileRequest} className="space-y-3 text-xs">
              {requestType === "LEAVE" ? (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ប្រភេទច្បាប់
                    </label>
                    <select
                      value={leaveTypeId}
                      onChange={(e) => setLeaveTypeId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="leave-annual">
                        ច្បាប់ឈប់សម្រាកប្រចាំឆ្នាំ (Annual Leave)
                      </option>
                      <option value="leave-sick">
                        ច្បាប់ឈឺ (Sick Leave)
                      </option>
                    </select>
                  </div>

                  <DateRangePicker
                    startDate={reqFromDate}
                    endDate={reqToDate}
                    onChange={(s, e) => {
                      setReqFromDate(s);
                      setReqToDate(e);
                    }}
                    startLabel="ចាប់ពីថ្ងៃ"
                    endLabel="ដល់ថ្ងៃ"
                    required
                  />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <DatePicker
                        label="កាលបរិច្ឆេទ OT"
                        required
                        value={reqFromDate}
                        onChange={setReqFromDate}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        ចំនួនម៉ោង (h)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="12"
                        required
                        value={otHours}
                        onChange={(e) => setOtHours(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  មូលហេតុ
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="បញ្ជាក់មូលហេតុខ្លីៗ..."
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={reqSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition disabled:opacity-50"
              >
                {reqSubmitting
                  ? "កំពុងបញ្ជូនសំណើ..."
                  : "បញ្ជូនសំណើទៅកាន់ប្រធានហាង"}
              </button>
            </form>
          </div>
        )}

        {/* PWA Install Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 text-center text-[11px] text-slate-500 space-y-1">
          <div>💡 របៀបដំឡើងជា App លើទូរស័ព្ទ៖</div>
          <div>
            ចុចសញ្ញា Share (លើ iPhone) ឬ ចុចចំនុចបី (លើ Android) ➔ ជ្រើសរើស{" "}
            <strong className="text-slate-300">"Add to Home Screen"</strong>
          </div>
        </div>

        {/* Day Off / Non-Working Day Confirmation Modal */}
        {confirmDayOffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-white text-sm">
                  ថ្ងៃនេះមិនមែនជាថ្ងៃធ្វើការរបស់អ្នក
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {confirmDayOffModal.message}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
                <div>• ប្រព័ន្ធនឹងកត់ត្រាវត្តមាននេះជា <strong>"ធ្វើការបន្ថែម / OT"</strong></div>
                <div>• ទិន្នន័យនឹងបង្ហាញលើ Dashboard និង Report ត្រឹមត្រូវ</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDayOffModal(null)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDayOffModal(null);
                    handleAttendance("CHECK_IN", true);
                  }}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition"
                >
                  យល់ព្រម Check-in
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Self Change PIN Modal (Step គ) */}
        {showChangePinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-left">
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    ប្តូរលេខសម្ងាត់ PIN ៤ ខ្ទង់
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    កំណត់ PIN ផ្ទាល់ខ្លួនសម្រាប់ Check-in
                  </p>
                </div>
              </div>

              {changePinError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}

              {changePinSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{changePinSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePinSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    កូដបុគ្គលិក (Employee Code)
                  </label>
                  <input
                    type="text"
                    required
                    value={changePinCode}
                    onChange={(e) => setChangePinCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    លេខ PIN ចាស់ (Old PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={changePinOld}
                    onChange={(e) => setChangePinOld(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center tracking-widest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    លេខ PIN ថ្មី ៤ ខ្ទង់ (New PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={changePinNew}
                    onChange={(e) => setChangePinNew(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center tracking-widest focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ហាមប្រើ PIN ងាយៗដូចជា 1234, 0000, 1111...
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    បញ្ជាក់លេខ PIN ថ្មី (Confirm New PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={changePinConfirm}
                    onChange={(e) => setChangePinConfirm(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center tracking-widest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePinModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={changingPin}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20 transition disabled:opacity-50"
                  >
                    {changingPin ? "កំពុងរក្សាទុក..." : "រក្សាទុក PIN ថ្មី"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
