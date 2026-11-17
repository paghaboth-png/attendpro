"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Camera,
  MapPin,
  Clock,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Shield,
  ShieldAlert,
  RotateCw,
  Lock,
  KeyRound,
  DollarSign,
  Send,
  HelpCircle,
  Image as ImageIcon,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  Upload,
  Trash2,
  RefreshCw,
  QrCode,
  Download,
  Printer,
  Copy,
  FileText,
  Database,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import { compressLogoImage } from "@/lib/image-utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "general" | "company" | "payroll" | "security" | "telegram"
  >("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("012999001");
  const [companyEmail, setCompanyEmail] = useState("info@demo.com");
  const [companyAddress, setCompanyAddress] = useState(
    "ក្រុងស្វាយរៀង ខេត្តស្វាយរៀង"
  );
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoAction, setLogoAction] = useState<"NONE" | "UPLOAD" | "REMOVE">("NONE");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Verification & General Settings
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [requireGps, setRequireGps] = useState(true);
  const [defaultRadius, setDefaultRadius] = useState(100);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [defaultLanguage, setDefaultLanguage] = useState("km");
  const [requireQrCheckin, setRequireQrCheckin] = useState(false);
  const [enableDynamicQr, setEnableDynamicQr] = useState(false);
  const [forceEmployeeChangePassword, setForceEmployeeChangePassword] = useState(false);
  const [nextEmployeeCodeMode, setNextEmployeeCodeMode] = useState("CONTINUE");

  // Payroll Settings (for 8B)
  const [latePenaltyType, setLatePenaltyType] = useState("FIXED");
  const [latePenaltyAmount, setLatePenaltyAmount] = useState(1.0);
  const [absentPenaltyRate, setAbsentPenaltyRate] = useState(1.0);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [nssfEnabled, setNssfEnabled] = useState(false);
  const [allowEmployeeViewPayslip, setAllowEmployeeViewPayslip] = useState(false);

  // Change Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState<string | null>(null);
  const [pwErrorMsg, setPwErrorMsg] = useState<string | null>(null);

  // Session & Demo Accounts state
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN";
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);
  const [allDemoDisabled, setAllDemoDisabled] = useState(false);
  const [togglingDemo, setTogglingDemo] = useState(false);
  const [demoMsg, setDemoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDemoAccounts = async () => {
    try {
      const res = await fetch("/api/admin/demo-accounts");
      const data = await res.json();
      if (data.success) {
        setDemoAccounts(data.demoUsers || []);
        setAllDemoDisabled(data.allDisabled || false);
      }
    } catch (err) {
      console.error("fetchDemoAccounts error:", err);
    }
  };

  const handleToggleDemoAccounts = async (action: "DISABLE" | "ENABLE") => {
    setTogglingDemo(true);
    setDemoMsg(null);
    try {
      const res = await fetch("/api/admin/demo-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setDemoMsg({ type: "success", text: data.message });
        fetchDemoAccounts();
      } else {
        setDemoMsg({ type: "error", text: data.error || "បរាជ័យក្នុងការអនុវត្ត" });
      }
    } catch {
      setDemoMsg({ type: "error", text: "មានបញ្ហាបច្ចេកទេស" });
    } finally {
      setTogglingDemo(false);
    }
  };

  // Recovery Codes state (9B)
  const [recoveryStatus, setRecoveryStatus] = useState<any>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRecoveryStatus = async () => {
    try {
      const res = await fetch("/api/admin/recovery-codes");
      const json = await res.json();
      if (json.success) {
        setRecoveryStatus(json);
      }
    } catch {}
  };

  const handleGenerateRecoveryCodes = async () => {
    if (
      recoveryStatus?.hasCodes &&
      !confirm(
        "តើលោកអ្នកពិតជាចង់បង្កើតកូដស្តារថ្មីមែនទេ? កូដចាស់ៗទាំងអស់នឹងត្រូវលុបចោលដោយស្វ័យប្រវត្តិ។"
      )
    ) {
      return;
    }
    setLoadingRecovery(true);
    setRecoveryMsg(null);
    try {
      const res = await fetch("/api/admin/recovery-codes", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setGeneratedCodes(json.codes);
        setRecoveryMsg({ type: "success", text: json.message });
        fetchRecoveryStatus();
      } else {
        setRecoveryMsg({ type: "error", text: json.error || "បរាជ័យក្នុងការបង្កើតកូដស្តារ" });
      }
    } catch {
      setRecoveryMsg({ type: "error", text: "មានបញ្ហាបច្ចេកទេស" });
    } finally {
      setLoadingRecovery(false);
    }
  };

  // Cleanup Demo Data state (9C)
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);
  const [cleanupLoadingPreview, setCleanupLoadingPreview] = useState(false);
  const [cleanupConfirmWord, setCleanupConfirmWord] = useState("");
  const [cleanupDeleteMyAtt, setCleanupDeleteMyAtt] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  const openCleanupModal = async () => {
    setCleanupModalOpen(true);
    setCleanupResult(null);
    setCleanupError(null);
    setCleanupConfirmWord("");
    setCleanupLoadingPreview(true);
    try {
      const res = await fetch("/api/admin/cleanup-demo-data");
      const json = await res.json();
      if (json.success) {
        setCleanupPreview(json.data);
      }
    } catch {}
    setCleanupLoadingPreview(false);
  };

  const handleExecuteCleanup = async () => {
    if (cleanupConfirmWord.trim() !== "លុប") return;
    setCleaningUp(true);
    setCleanupError(null);
    try {
      const res = await fetch("/api/admin/cleanup-demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmWord: cleanupConfirmWord.trim(),
          deleteMyAttendances: cleanupDeleteMyAtt,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCleanupResult(json.summary);
      } else {
        setCleanupError(json.error || "បរាជ័យក្នុងការសម្អាតទិន្នន័យ");
      }
    } catch {
      setCleanupError("មានបញ្ហាបច្ចេកទេស");
    } finally {
      setCleaningUp(false);
    }
  };

  // Telegram state (8C-1)
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgShowToken, setTgShowToken] = useState(false);
  const [tgIsEnabled, setTgIsEnabled] = useState(false);
  const [tgNotifyLate, setTgNotifyLate] = useState(false);
  const [tgNotifyLeave, setTgNotifyLeave] = useState(false);
  const [tgNotifyDaily, setTgNotifyDaily] = useState(false);
  const [tgNotifyAllCheckInOut, setTgNotifyAllCheckInOut] = useState(false);
  const [tgNotifyAbsent, setTgNotifyAbsent] = useState(false);
  const [tgDailySummaryTime, setTgDailySummaryTime] = useState("18:00");
  const [tgStatus, setTgStatus] = useState<"NOT_CONFIGURED" | "CONNECTED" | "ERROR">("NOT_CONFIGURED");
  const [tgStatusMsg, setTgStatusMsg] = useState<string | null>(null);
  const [tgBotInfo, setTgBotInfo] = useState<{ name: string; username: string } | null>(null);
  const [tgChatInfo, setTgChatInfo] = useState<{ title: string } | null>(null);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgChecking, setTgChecking] = useState(false);
  const [tgDailySending, setTgDailySending] = useState(false);
  const [tgCheckingAbsent, setTgCheckingAbsent] = useState(false);
  const [tgHistory, setTgHistory] = useState<any[]>([]);

  const fetchTelegramConfig = () => {
    fetch("/api/settings/telegram")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const td = json.data;
          setTgBotToken(td.botTokenMasked || "");
          setTgChatId(td.chatId || "");
          setTgIsEnabled(Boolean(td.isEnabled));
          setTgNotifyLate(Boolean(td.notifyLate));
          setTgNotifyLeave(Boolean(td.notifyLeave));
          setTgNotifyDaily(Boolean(td.notifyDaily));
          setTgNotifyAllCheckInOut(Boolean(td.notifyAllCheckInOut));
          setTgNotifyAbsent(Boolean(td.notifyAbsent));
          setTgDailySummaryTime(td.dailySummaryTime || "18:00");
          setTgStatus(td.status || "NOT_CONFIGURED");
        }
        if (json.history) {
          setTgHistory(json.history);
        }
      })
      .catch(() => {});
  };

  const fetchSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          if (d.company) {
            setCompanyName(d.company.name || "");
            setCompanyPhone(d.company.phone || "");
            setCompanyEmail(d.company.email || "");
            setCompanyAddress(d.company.address || "");
            const currentLogo = d.company.logoUrl ? `/api/company/logo?v=${Date.now()}` : "";
            setCompanyLogoUrl(currentLogo);
            setLogoPreview(currentLogo || null);
          }
          setRequireSelfie(Boolean(d.requireSelfie));
          setRequireGps(Boolean(d.requireGps));
          setDefaultRadius(d.defaultRadius || 100);
          setGraceMinutes(d.graceMinutes || 15);
          setDefaultLanguage(d.defaultLanguage || "km");
          setRequireQrCheckin(Boolean(d.requireQrCheckin));
          setEnableDynamicQr(Boolean(d.enableDynamicQr));
          setForceEmployeeChangePassword(Boolean(d.forceEmployeeChangePassword));
          setNextEmployeeCodeMode(d.nextEmployeeCodeMode || "CONTINUE");

          setLatePenaltyType(d.latePenaltyType || "FIXED");
          setLatePenaltyAmount(d.latePenaltyAmount || 1.0);
          setAbsentPenaltyRate(d.absentPenaltyRate || 1.0);
          setOvertimeMultiplier(d.overtimeMultiplier || 1.5);
          setTaxEnabled(Boolean(d.taxEnabled));
          setNssfEnabled(Boolean(d.nssfEnabled));
          setAllowEmployeeViewPayslip(Boolean(d.allowEmployeeViewPayslip));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchTelegramConfig();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "security" && isSuperAdmin) {
      fetchDemoAccounts();
      fetchRecoveryStatus();
    }
  }, [activeTab, isSuperAdmin]);

  const handleLogoSelect = async (file: File) => {
    setLogoError(null);
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("រូបធំពេក សូមជ្រើសរូបតូចជាង 2MB");
      return;
    }

    try {
      const processed = await compressLogoImage(file, 512, 0.85);
      setLogoDataUrl(processed.dataUrl);
      setLogoPreview(processed.dataUrl);
      setLogoAction("UPLOAD");
    } catch (err: any) {
      setLogoError(err.message || "មិនអាចដំណើរការរូបភាពបានទេ");
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoDataUrl(null);
    setLogoAction("REMOVE");
    setLogoError(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. Process Logo upload or delete if changed
      let updatedLogoUrl = companyLogoUrl;
      if (logoAction === "UPLOAD" && logoDataUrl) {
        const logoRes = await fetch("/api/company/logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: logoDataUrl }),
        });
        const logoJson = await logoRes.json();
        if (!logoJson.success) {
          setErrorMsg(logoJson.error || "មិនអាចរក្សាទុក Logo បានឡើយ");
          setSaving(false);
          return;
        }
        updatedLogoUrl = logoJson.logoUrl;
        setCompanyLogoUrl(updatedLogoUrl);
        setLogoAction("NONE");
        window.dispatchEvent(
          new CustomEvent("company-logo-updated", { detail: updatedLogoUrl })
        );
      } else if (logoAction === "REMOVE") {
        const logoRes = await fetch("/api/company/logo", { method: "DELETE" });
        const logoJson = await logoRes.json();
        if (!logoJson.success) {
          setErrorMsg(logoJson.error || "មិនអាចលុប Logo បានឡើយ");
          setSaving(false);
          return;
        }
        updatedLogoUrl = "";
        setCompanyLogoUrl("");
        setLogoPreview(null);
        setLogoAction("NONE");
        window.dispatchEvent(
          new CustomEvent("company-logo-updated", { detail: null })
        );
      }

      // 2. Save Company details and general settings
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: {
            name: companyName,
            phone: companyPhone,
            email: companyEmail,
            address: companyAddress,
          },
          requireSelfie,
          requireGps,
          defaultRadius,
          graceMinutes,
          defaultLanguage,
          requireQrCheckin,
          enableDynamicQr,
          forceEmployeeChangePassword,
          nextEmployeeCodeMode,
          latePenaltyType,
          latePenaltyAmount,
          absentPenaltyRate,
          overtimeMultiplier,
          taxEnabled,
          nssfEnabled,
          allowEmployeeViewPayslip,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg("រក្សាទុកជោគជ័យ");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(json.error || "មិនអាចរក្សាទុកការកំណត់បានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPwSuccessMsg(null);
    setPwErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setPwErrorMsg("ពាក្យសម្ងាត់ថ្មីទាំងពីរមិនដូចគ្នាទេ");
      setChangingPassword(false);
      return;
    }

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

      const json = await res.json();
      if (json.success) {
        setPwSuccessMsg(json.message || "បានផ្លាស់ប្តូរពាក្យសម្ងាត់ជោគជ័យ!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwSuccessMsg(null), 4000);
      } else {
        setPwErrorMsg(json.error || "មិនអាចប្តូរពាក្យសម្ងាត់បានឡើយ");
      }
    } catch {
      setPwErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgSaving(true);
    setTgStatusMsg(null);

    try {
      const res = await fetch("/api/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE",
          botToken: tgBotToken,
          chatId: tgChatId,
          isEnabled: tgIsEnabled,
          notifyLate: tgNotifyLate,
          notifyLeave: tgNotifyLeave,
          notifyDaily: tgNotifyDaily,
          notifyAllCheckInOut: tgNotifyAllCheckInOut,
          notifyAbsent: tgNotifyAbsent,
          dailySummaryTime: tgDailySummaryTime,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        if (json.data?.botTokenMasked) {
          setTgBotToken(json.data.botTokenMasked);
        }
        setTgStatus(json.data?.isEnabled && json.data?.chatId ? "CONNECTED" : "NOT_CONFIGURED");
        fetchTelegramConfig();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(json.error || "មិនអាចរក្សាទុក Telegram បានឡើយ");
      }
    } catch {
      setErrorMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ");
    } finally {
      setTgSaving(false);
    }
  };

  const handleCheckTelegram = async () => {
    setTgChecking(true);
    setTgStatusMsg(null);
    try {
      const res = await fetch("/api/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECK_STATUS",
          botToken: tgBotToken,
          chatId: tgChatId,
        }),
      });
      const json = await res.json();
      if (json.newChatId) {
        setTgChatId(json.newChatId);
      }
      if (json.success) {
        setTgStatus("CONNECTED");
        setTgBotInfo(json.bot);
        setTgChatInfo(json.chat);
        setTgStatusMsg(json.message);
        fetchTelegramConfig();
      } else {
        setTgStatus("ERROR");
        setTgStatusMsg(json.error);
      }
    } catch {
      setTgStatus("ERROR");
      setTgStatusMsg("កំហុសក្នុងការតភ្ជាប់ទៅកាន់ Telegram");
    } finally {
      setTgChecking(false);
    }
  };

  const handleTestTelegram = async () => {
    setTgTesting(true);
    setTgStatusMsg(null);
    try {
      const res = await fetch("/api/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST",
          botToken: tgBotToken,
          chatId: tgChatId,
        }),
      });
      const json = await res.json();
      if (json.newChatId) {
        setTgChatId(json.newChatId);
      }
      if (json.success) {
        setTgStatus("CONNECTED");
        setTgStatusMsg(json.message);
        fetchTelegramConfig();
      } else {
        setTgStatus("ERROR");
        setTgStatusMsg(json.error);
        fetchTelegramConfig();
      }
    } catch {
      setTgStatus("ERROR");
      setTgStatusMsg("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setTgTesting(false);
    }
  };

  const handleSendDailyTelegram = async () => {
    setTgDailySending(true);
    setTgStatusMsg(null);
    try {
      const res = await fetch("/api/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_DAILY",
          botToken: tgBotToken,
          chatId: tgChatId,
        }),
      });
      const json = await res.json();
      if (json.newChatId) {
        setTgChatId(json.newChatId);
      }
      if (json.success) {
        setTgStatus("CONNECTED");
        setTgStatusMsg(json.message);
        fetchTelegramConfig();
      } else {
        setTgStatus("ERROR");
        setTgStatusMsg(json.error);
        fetchTelegramConfig();
      }
    } catch {
      setTgStatus("ERROR");
      setTgStatusMsg("កំហុសក្នុងការផ្ញើសារសរុប");
    } finally {
      setTgDailySending(false);
    }
  };

  const handleCheckAbsent = async () => {
    setTgCheckingAbsent(true);
    setTgStatusMsg(null);
    try {
      const res = await fetch("/api/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHECK_ABSENT" }),
      });
      const json = await res.json();
      if (json.success) {
        setTgStatusMsg(json.message);
        fetchTelegramConfig();
      } else {
        setTgStatusMsg(json.error || "កំហុសក្នុងការពិនិត្យអវត្តមាន");
      }
    } catch {
      setTgStatusMsg("កំហុសក្នុងការពិនិត្យអវត្តមាន");
    } finally {
      setTgCheckingAbsent(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        <span>កំពុងទាញយកការកំណត់...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-400" />
          <span>ការកំណត់ប្រព័ន្ធ (System Settings)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          គ្រប់គ្រងព័ត៌មានក្រុមហ៊ុន, GPS, ប្រាក់បៀវត្ស, សុវត្ថិភាព និងការជូនដំណឹង Telegram
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>ការផ្ទៀងផ្ទាត់ & GPS</span>
        </button>

        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "company"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ព័ត៌មានក្រុមហ៊ុន</span>
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "payroll"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>ការកំណត់ប្រាក់ខែ</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "security"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>សុវត្ថិភាព & ពាក្យសម្ងាត់</span>
        </button>

        <button
          onClick={() => setActiveTab("telegram")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "telegram"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Telegram</span>
        </button>
      </div>

      {/* TAB 1: GENERAL & GPS */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>ការផ្ទៀងផ្ទាត់ពេល Check-in (Verification Rules)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ជ្រើសរើសលក្ខខណ្ឌដែលបុគ្គលិកត្រូវបំពេញពេលចុច Check-in / Check-out
              </p>
            </div>

            {/* Toggle: Require GPS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    ផ្ទៀងផ្ទាត់ទីតាំង GPS (GPS Geofence Verification)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      requireGps
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {requireGps ? "បើក (ON - ណែនាំ)" : "បិទ (OFF)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {requireGps
                    ? "អនុញ្ញាតឱ្យ Check-in បានលុះត្រាតែទូរស័ព្ទស្ថិតក្នុងកាំរង្វង់នៃសាខាដែលបានកំណត់"
                    : "បិទការឆែក GPS (បុគ្គលិកអាច Check-in បានពីគ្រប់ទីកន្លែង)"}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={requireGps}
                onClick={() => setRequireGps(!requireGps)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requireGps ? "bg-emerald-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    requireGps ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Require Selfie */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">
                    តម្រូវឱ្យថតរូប Selfie (Require Selfie Photo)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      requireSelfie
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {requireSelfie ? "បើក (ON)" : "បិទ (OFF - លំនាំដើម)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {requireSelfie
                    ? "បុគ្គលិកត្រូវបើកកាមេរ៉ាថតរូបផ្ទាល់ទើបអាចចុច Check-in បាន"
                    : "បុគ្គលិកអាចចុច Check-in បានភ្លាមៗដោយមិនចាំបាច់ថតរូប (រហ័សទាន់ចិត្ត)"}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={requireSelfie}
                onClick={() => setRequireSelfie(!requireSelfie)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requireSelfie ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    requireSelfie ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Require QR Check-in */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">
                    តម្រូវឱ្យស្កេន QR ទើប Check-in បាន (Require QR Scan)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      requireQrCheckin
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {requireQrCheckin ? "បើក (ON)" : "បិទ (OFF - លំនាំដើម)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {requireQrCheckin
                    ? "បុគ្គលិកត្រូវតែស្កេន QR Code នៅហាងទើបអាច Check-in / Out បាន (រារាំងការចូលចុចតាម /checkin ធម្មតា)"
                    : "អនុញ្ញាតឱ្យបុគ្គលិកអាច Check-in តាមទំព័រ /checkin ធម្មតាបាន (Fallback ពេលកាមេរ៉ាខូច)"}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={requireQrCheckin}
                onClick={() => setRequireQrCheckin(!requireQrCheckin)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requireQrCheckin ? "bg-cyan-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    requireQrCheckin ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Dynamic QR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    ជម្រើស QR ថាមវន្ត (Dynamic QR Display)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      enableDynamicQr
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {enableDynamicQr ? "បើក (ON)" : "បិទ (OFF - លំនាំដើម)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {enableDynamicQr
                    ? "QR Code លើអេក្រង់ Tablet/TV សាខា (/display/[branchId]) នឹងប្តូរលេខកូដរៀងរាល់ ៣០ វិនាទី ការពារការថតរូប QR ទុកស្កេន"
                    : "ប្រើ QR ថេរ (Static QR) ងាយស្រួលបោះពុម្ពបិទជញ្ជាំងហាង"}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={enableDynamicQr}
                onClick={() => setEnableDynamicQr(!enableDynamicQr)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableDynamicQr ? "bg-amber-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enableDynamicQr ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Grace Period, Radius, Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ម៉ោងអនុគ្រោះយឺត</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-500">
                    នាទី
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  យឺតក្រោម {graceMinutes} នាទី នៅតែ GOOD
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>កាំរង្វង់លំនាំដើម</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="20"
                    max="1000"
                    value={defaultRadius}
                    onChange={(e) => setDefaultRadius(parseInt(e.target.value) || 100)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-500">
                    ម៉ែត្រ
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  កាំរង្វង់អនុញ្ញាតឱ្យ Check-in
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>ភាសាលំនាំដើម</span>
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="km">🇰🇭 ភាសាខ្មែរ (Khmer)</option>
                  <option value="en">🇬🇧 English</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  ភាសាដែលត្រូវបង្ហាញដំបូង
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកំណត់"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: COMPANY INFO & LOGO */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>ព័ត៌មានអាជីវកម្ម និងស្លាកសញ្ញា (Company Info & Logo)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                បង្ហាញលើក្បាលតារាងរបាយការណ៍ និង Payslip បៀវត្សរ៍
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ឈ្មោះក្រុមហ៊ុន / ហាង (Company Name)
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  លេខទូរស័ព្ទទំនាក់ទំនង (Phone)
                </label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  អ៊ីមែល (Email)
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Logo Upload Dropzone */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>រូបសញ្ញាក្រុមហ៊ុន (Company Logo)</span>
                </label>

                {/* Hidden File Input */}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoSelect(file);
                    e.target.value = "";
                  }}
                />

                {logoError && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{logoError}</span>
                  </div>
                )}

                {logoPreview ? (
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                    {/* Preview Box */}
                    <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="font-semibold text-white text-xs">
                        រូបមើលជាមុន (Logo Preview)
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {logoAction === "UPLOAD"
                          ? "បានបង្រួមទំហំរួចរាល់ (Max 512x512) ត្រៀមរក្សាទុក"
                          : "រូបសញ្ញាបច្ចុប្បន្នដែលកំពុងប្រើប្រាស់ក្នុងប្រព័ន្ធ"}
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>ប្តូរ Logo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>លុប Logo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleLogoSelect(file);
                    }}
                    onClick={() => logoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                      isDragging
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                        <span>ជ្រើសរើសរូប Logo</span>
                        <span className="text-slate-500 font-normal">
                          ឬ អូសរូបទម្លាក់ទីនេះ (Drag & Drop)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        អនុញ្ញាត: PNG, JPG, WEBP, SVG • ទំហំអតិបរមា 2MB (បង្រួមស្វ័យប្រវត្តិត្រឹម 512x512)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  អាសយដ្ឋាន (Address)
                </label>
                <textarea
                  rows={2}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកព័ត៌មានក្រុមហ៊ុន"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PAYROLL SETTINGS (FOR 8B) */}
      {activeTab === "payroll" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>គោលការណ៍គណនាប្រាក់បៀវត្សរ៍ (Payroll Policies)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                កំណត់អត្រាពិន័យយឺត, អវត្តមាន, គុណមេគុណ OT និងពន្ធ/NSSF
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              {/* Late Penalty */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="block font-bold text-white">
                  ការផាកពិន័យពេលមកយឺត (Late Penalty)
                </label>
                <div className="flex gap-2">
                  <select
                    value={latePenaltyType}
                    onChange={(e) => setLatePenaltyType(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
                  >
                    <option value="FIXED">គិតជាដុល្លារថេរ ($/លើក)</option>
                    <option value="PER_MINUTE">គិតតាមនាទីយឺត ($/នាទី)</option>
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={latePenaltyAmount}
                      onChange={(e) =>
                        setLatePenaltyAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                    <span className="absolute right-3 top-2 text-slate-500 font-bold">
                      USD
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  ឧទាហរណ៍៖ យឺត ១ លើកកាត់ ${latePenaltyAmount}
                </p>
              </div>

              {/* Absent Penalty */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="block font-bold text-white">
                  ពិន័យអវត្តមានគ្មានច្បាប់ (Unexcused Absence Rate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="3"
                    value={absentPenaltyRate}
                    onChange={(e) =>
                      setAbsentPenaltyRate(parseFloat(e.target.value) || 1.0)
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-bold">
                    ថ្ងៃនៃប្រាក់ខែ
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  អវត្តមាន ១ ថ្ងៃ កាត់ប្រាក់ឈ្នួល {absentPenaltyRate} ថ្ងៃ
                </p>
              </div>

              {/* Overtime Multiplier */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="block font-bold text-white">
                  មេគុណប្រាក់ថែមម៉ោង OT (Overtime Multiplier)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="3"
                    value={overtimeMultiplier}
                    onChange={(e) =>
                      setOvertimeMultiplier(parseFloat(e.target.value) || 1.5)
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-bold">
                    X
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  អត្រាធម្មតា ១.៥ ដងនៃប្រាក់ឈ្នួលក្នុង ១ ម៉ោង (ច្បាប់ការងារកម្ពុជា)
                </p>
              </div>

              {/* Employee Payslip View Toggle */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">
                    អនុញ្ញាតឱ្យបុគ្គលិកមើល Payslip ខ្លួនឯង
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    បើកជម្រើសនេះទើបបុគ្គលិកអាចមើល Slip ប្រាក់ខែលើទូរស័ព្ទបាន
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowEmployeeViewPayslip}
                  onClick={() =>
                    setAllowEmployeeViewPayslip(!allowEmployeeViewPayslip)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    allowEmployeeViewPayslip ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      allowEmployeeViewPayslip ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tax & NSSF Section (Configurable - default OFF as chosen) */}
            <div className="pt-2 border-t border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>ពន្ធលើប្រាក់បៀវត្ស និងរបបសន្តិសុខសង្គម (Tax & NSSF)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">
                      កាត់ភាគទានបេឡាជាតិសន្តិសុខសង្គម (NSSF)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      អត្រា ២% នៃប្រាក់ខែបុគ្គលិក (បច្ចុប្បន្ន៖ បិទ)
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={nssfEnabled}
                    onClick={() => setNssfEnabled(!nssfEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      nssfEnabled ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        nssfEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">
                      កាត់ពន្ធលើប្រាក់បៀវត្ស (Salary Tax)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      គិតតាមកម្រិតជណ្តើរ 0%, 5%, 10% (បច្ចុប្បន្ន៖ បិទ)
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={taxEnabled}
                    onClick={() => setTaxEnabled(!taxEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      taxEnabled ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        taxEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកគោលការណ៍ប្រាក់ខែ"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: SECURITY & PASSWORDS */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4"
          >
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span>ផ្លាស់ប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួន (Change Password)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ផ្លាស់ប្តូរពាក្យសម្ងាត់សម្រាប់គណនីដែលកំពុងចូលប្រើប្រាស់នេះ
              </p>
            </div>

            {pwSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ពាក្យសម្ងាត់បច្ចុប្បន្ន (Current Password)
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ពាក្យសម្ងាត់ថ្មី (New Password)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  បញ្ជាក់ពាក្យសម្ងាត់ថ្មី (Confirm)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {changingPassword ? "កំពុងកែប្រែ..." : "ផ្លាស់ប្តូរពាក្យសម្ងាត់"}
                </span>
              </button>
            </div>
          </form>

          {/* Employee Password Policy Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>គោលការណ៍ពាក្យសម្ងាត់បុគ្គលិក (Employee Password Policy)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                កំណត់ថាតើបុគ្គលិក (តួនាទី Employee) ត្រូវបង្ខំឱ្យប្តូរពាក្យសម្ងាត់ពេល Login ចូលលើកដំបូងដែរឬទេ
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="space-y-1 pr-4">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>បង្ខំបុគ្គលិកប្តូរពាក្យសម្ងាត់ពេលចូលលើកដំបូង</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      forceEmployeeChangePassword
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {forceEmployeeChangePassword ? "បើក (ON)" : "បិទ (OFF - លំនាំដើម)"}
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {forceEmployeeChangePassword
                    ? "បុគ្គលិកដែលបង្កើតថ្មី ឬ Reset ពាក្យសម្ងាត់ នឹងត្រូវបង្ខំឱ្យប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួនពេលចូលលើកដំបូង។"
                    : "បុគ្គលិកអាចប្រើពាក្យសម្ងាត់ដែល Admin បង្កើតឱ្យចូលប្រើបានភ្លាមៗដោយមិនបាច់បង្ខំប្តូរ (អាចប្តូរតាមចិត្តក្នុង Profile)។"}
                </p>
                <p className="text-[10px] text-slate-500">
                  * គណនី Admin, Manager, និង Super Admin នៅតែត្រូវបង្ខំប្តូរពាក្យសម្ងាត់ជានិច្ចដើម្បីសុវត្ថិភាព។
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={forceEmployeeChangePassword}
                onClick={async () => {
                  const newVal = !forceEmployeeChangePassword;
                  setForceEmployeeChangePassword(newVal);
                  try {
                    await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ forceEmployeeChangePassword: newVal }),
                    });
                  } catch {}
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  forceEmployeeChangePassword ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    forceEmployeeChangePassword ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Role Permissions Guide */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>សិទ្ធិតាមតួនាទីក្នុងប្រព័ន្ធ (Role-based Permissions)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Super Admin (ម្ចាស់អាជីវកម្ម)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  សិទ្ធិពេញលេញ ១០០% លើគ្រប់ទំព័រ រួមទាំងការ Finalize និង Unlock ប្រាក់ខែ, មើល Audit Logs, និងកំណត់ Telegram។
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Admin (រដ្ឋបាល & គណនេយ្យ)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  គ្រប់គ្រងបុគ្គលិក, សាខា, វត្តមាន, អនុម័តច្បាប់/OT, រៀបចំតារាងប្រាក់ខែ, និងទាញយករបាយការណ៍ Excel/PDF។
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Branch Manager (ប្រធានសាខា)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  មើលវត្តមានប្រចាំថ្ងៃ និងអនុម័តសំណើច្បាប់ ឬម៉ោងថែម OT សម្រាប់បុគ្គលិកក្នុងសាខាខ្លួនប៉ុណ្ណោះ។
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Employee (បុគ្គលិកទូទៅ)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Check-in/Out តាមទូរស័ព្ទ, សុំច្បាប់, សុំ OT, និងមើលប្រវត្តិវត្តមាន ឬ Payslip ផ្ទាល់ខ្លួន។
                </p>
              </div>
            </div>
          </div>

          {/* Super Admin Sections (9B, 9C, 9D) */}
          {isSuperAdmin && (
            <>
              {/* Super Admin: Recovery Codes Card (9B) */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-purple-500" />
                      <span>កូដស្តារគណនី Super Admin (Account Recovery Codes)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      សម្រាប់ប្រើប្រាស់ក្នុងករណីភ្លេចលេខសម្ងាត់ ឬបាត់បង់ការគ្រប់គ្រង (៨ កូដចៃដន្យ កូដមួយប្រើបានម្តង)
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loadingRecovery}
                    onClick={handleGenerateRecoveryCodes}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRecovery ? "animate-spin" : ""}`} />
                    <span>
                      {loadingRecovery
                        ? "កំពុងបង្កើត..."
                        : recoveryStatus?.hasCodes
                        ? "បង្កើតកូដស្តារថ្មី (ជំនួសកូដចាស់)"
                        : "បង្កើតកូដស្តារថ្មី (៨ កូដ)"}
                    </span>
                  </button>
                </div>

                {/* Status Banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        recoveryStatus?.hasCodes && recoveryStatus?.unusedCount > 0
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      ស្ថានភាពកូដស្តារ៖{" "}
                      <strong>
                        {recoveryStatus?.hasCodes
                          ? `មាន ${recoveryStatus.unusedCount} / ${recoveryStatus.totalCount} កូដមិនទាន់ប្រើ`
                          : "មិនទាន់មានកូដស្តារ (សូមបង្កើត)"}
                      </strong>
                    </span>
                  </div>
                  {recoveryStatus?.createdAt && (
                    <span className="text-[11px] text-slate-400">
                      បង្កើតកាលពី: {new Date(recoveryStatus.createdAt).toLocaleDateString("km-KH")}
                    </span>
                  )}
                </div>

                {recoveryMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      recoveryMsg.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {recoveryMsg.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>{recoveryMsg.text}</span>
                  </div>
                )}

                {/* One-time Generated Codes Display */}
                {generatedCodes && (
                  <div className="p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>កូដស្តារទាំង ៨ របស់អ្នក (បង្ហាញតែម្តងគត់!)</span>
                        </h3>
                        <p className="text-[11px] text-purple-200/80 mt-0.5">
                          សូមចម្លង ឬបោះពុម្ពទុកជាការសម្ងាត់។ កូដទាំងនេះនឹងមិនបង្ហាញម្តងទៀតឡើយ។
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCodes.join("\n"));
                            alert("បានចម្លងកូដស្តារទាំង ៨ ដោយជោគជ័យ!");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>ចម្លងទាំងអស់</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>បោះពុម្ព</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                      {generatedCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950 border border-purple-500/40 text-center font-bold text-purple-200 select-all tracking-wider shadow-inner"
                        >
                          <span className="text-[9px] text-slate-500 block mb-0.5">#{idx + 1}</span>
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Super Admin: Backup Data Export Card (9B) */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" />
                      <span>Backup ទិន្នន័យប្រព័ន្ធ (Database Backup Export)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ទាញយកកញ្ចប់ទិន្នន័យពេញលេញ (បុគ្គលិក, វត្តមាន, ច្បាប់, OT, ប្រាក់ខែ) សម្រាប់រក្សាទុកជាសុវត្ថិភាព
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="/api/admin/backup-export?format=json"
                      download
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ទាញយក Backup (JSON)</span>
                    </a>
                    <a
                      href="/api/admin/backup-export?format=csv"
                      download
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ទាញយក (CSV)</span>
                    </a>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>ការព្រមានសុវត្ថិភាព៖</strong> កញ្ចប់ Backup នេះផ្ទុកព័ត៌មានលម្អិតអំពីបុគ្គលិក កំណត់ត្រាវត្តមាន និងប្រាក់បៀវត្ស។ សូមរក្សាទុកឯកសារនេះក្នុងឧបករណ៍ ឬ Drive ដែលមានសុវត្ថិភាពខ្ពស់!
                  </p>
                </div>
              </div>

              {/* Super Admin: Cleanup Demo Data Card (9C) */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>សម្អាតទិន្នន័យសាកល្បង (Clean Up Demo Data)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      លុបបុគ្គលិកសាកល្បង (EMP001-EMP010) និងកំណត់ត្រាសាកល្បងទាំងអស់ មុនពេលចាប់ផ្តើមដំណើរការអាជីវកម្មពិត
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openCleanupModal}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>សម្អាតទិន្នន័យសាកល្បង</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  មុខងារនេះនឹងលុបតែបុគ្គលិក និងកំណត់ត្រាសាកល្បងប៉ុណ្ណោះ ដោយ<strong>រក្សាទុកគណនី Super Admin (0969968839), EMP011, សាខា, វេនម៉ោង, ថ្ងៃបុណ្យ, Settings, Logo, Telegram និង QR Code</strong> ឱ្យនៅដដែល។
                </p>
              </div>
            </>
          )}

          {/* Super Admin: Manage Demo Accounts Card (Step ឃ) */}
          {isSuperAdmin && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>គ្រប់គ្រងគណនីសាកល្បង (Demo Accounts Management)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    សម្រាប់ត្រៀម Go-live អាចបិទដំណើរការគណនីសាកល្បងទាំង ៣ (admin, manager, employee) ក្នុងពេលតែមួយ
                  </p>
                </div>
                <div>
                  {allDemoDisabled ? (
                    <button
                      type="button"
                      disabled={togglingDemo}
                      onClick={() => handleToggleDemoAccounts("ENABLE")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{togglingDemo ? "កំពុងដំណើរការ..." : "បើកគណនីសាកល្បងឡើងវិញ"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={togglingDemo}
                      onClick={() => {
                        if (
                          window.confirm(
                            "តើលោកអ្នកពិតជាចង់បិទគណនីសាកល្បងទាំង ៣ (admin@demo.com, manager@demo.com, employee@demo.com) មែនទេ? គណនីទាំងនេះនឹងលែងអាច Login ចូលបានទៀតហើយ។"
                          )
                        ) {
                          handleToggleDemoAccounts("DISABLE");
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{togglingDemo ? "កំពុងដំណើរការ..." : "បិទគណនីសាកល្បង (ទាំង ៣)"}</span>
                    </button>
                  )}
                </div>
              </div>

              {demoMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                    demoMsg.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300"
                      : "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300"
                  }`}
                >
                  {demoMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span>{demoMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {demoAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-white">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{acc.email}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        acc.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                      }`}
                    >
                      {acc.isActive ? "សកម្ម (Active)" : "បានបិទ (Disabled)"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TELEGRAM (8C-1 & 8C-2) */}
      {activeTab === "telegram" && (
        <div className="space-y-6">
          {/* Status Alert / Feedback */}
          {tgStatusMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-2.5 ${
                tgStatus === "CONNECTED"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {tgStatus === "CONNECTED" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{tgStatusMsg}</span>
              </div>
              <button
                onClick={() => setTgStatusMsg(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Telegram Configuration Card */}
          <form
            onSubmit={handleSaveTelegram}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>ការតភ្ជាប់ Telegram Bot (Telegram Bot Settings)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ទទួលការជូនដំណឹងភ្លាមៗទៅកាន់ Telegram Group ពេលបុគ្គលិក Check-in យឺត ឬសុំច្បាប់
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">ស្ថានភាព៖</span>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border flex items-center gap-1.5 ${
                    tgStatus === "CONNECTED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : tgStatus === "ERROR"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tgStatus === "CONNECTED"
                        ? "bg-emerald-400 animate-pulse"
                        : tgStatus === "ERROR"
                        ? "bg-rose-400"
                        : "bg-slate-500"
                    }`}
                  />
                  <span>
                    {tgStatus === "CONNECTED"
                      ? "តភ្ជាប់ហើយ (Connected)"
                      : tgStatus === "ERROR"
                      ? "មានបញ្ហា (Error)"
                      : "មិនទាន់កំណត់ (Not Configured)"}
                  </span>
                </span>
              </div>
            </div>

            {/* Master Switch: Enable Telegram */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">
                    បើកដំណើរការការជូនដំណឹង Telegram (Master Enable)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tgIsEnabled
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {tgIsEnabled ? "បើក (ON)" : "បិទ (OFF - លំនាំដើម)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {tgIsEnabled
                    ? "ប្រព័ន្ធនឹងផ្ញើសេចក្តីជូនដំណឹងទៅកាន់ Telegram Group តាមជម្រើសខាងក្រោម"
                    : "បិទការផ្ញើទាំងអស់ជាបណ្តោះអាសន្ន (គ្មានការហៅទៅកាន់ Telegram API ឡើយ)"}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={tgIsEnabled}
                onClick={() => setTgIsEnabled(!tgIsEnabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  tgIsEnabled ? "bg-sky-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    tgIsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Inputs: Bot Token & Chat ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Bot Token Input */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>លេខសម្ងាត់ Bot Token (Bot Token) *</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (រក្សាទុក Encrypted)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={tgShowToken ? "text" : "password"}
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setTgShowToken(!tgShowToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {tgShowToken ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  សុវត្ថិភាពខ្ពស់៖ Token ត្រូវបាន Encrypt ក្នុង Database មិនបង្ហាញពេញលើ Browser ឡើយ
                </p>
              </div>

              {/* Group Chat ID Input */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>Group Chat ID (អត្តសញ្ញាណ Group) *</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (ឧ. -1001234567890)
                  </span>
                </label>
                <input
                  type="text"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="-1001234567890 ឬ -987654321"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-sky-500 transition"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Chat ID របស់ Telegram Group (Supergroup ចាប់ផ្តើមដោយលេខដក <code>-100...</code>)
                </p>
              </div>
            </div>

            {/* Notification Event Switches (All default OFF) */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>ប្រភេទនៃការជូនដំណឹង (Notification Triggers - ទុក OFF ជាមុន)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Trigger 1: All Check-in / Check-out */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-white text-xs">ជូនដំណឹងគ្រប់ Check-in / Check-out</div>
                    <div className="text-[10px] text-slate-500">
                      ឈ្មោះ, ម៉ោង, ទាន់ម៉ោង/យឺត/ថ្ងៃបន្ថែម/ចេញមុន
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tgNotifyAllCheckInOut}
                    onClick={() => setTgNotifyAllCheckInOut(!tgNotifyAllCheckInOut)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      tgNotifyAllCheckInOut ? "bg-sky-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        tgNotifyAllCheckInOut ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Trigger 2: Absent Alert */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-white text-xs">ជូនដំណឹងពេលអវត្តមាន</div>
                    <div className="text-[10px] text-slate-500">
                      ក្រោយម៉ោងចូលវេន ១ ម៉ោង ដែលមិនទាន់ Check-in
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tgNotifyAbsent}
                    onClick={() => setTgNotifyAbsent(!tgNotifyAbsent)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      tgNotifyAbsent ? "bg-sky-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        tgNotifyAbsent ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Trigger 3: Late checkin */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-white text-xs">Check-in យឺត</div>
                    <div className="text-[10px] text-slate-500">
                      ជូនដំណឹងពេលបុគ្គលិកស្កេនយឺតលើសអនុគ្រោះ
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tgNotifyLate}
                    onClick={() => setTgNotifyLate(!tgNotifyLate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      tgNotifyLate ? "bg-sky-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        tgNotifyLate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Trigger 4: Leave & OT requests */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-white text-xs">សុំច្បាប់ / OT ថ្មី</div>
                    <div className="text-[10px] text-slate-500">
                      ជូនដំណឹងពេលមានពាក្យស្នើសុំថ្មី
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tgNotifyLeave}
                    onClick={() => setTgNotifyLeave(!tgNotifyLeave)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      tgNotifyLeave ? "bg-sky-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        tgNotifyLeave ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Trigger 5: Daily Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-white text-xs">សរុបប្រចាំថ្ងៃ</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>ម៉ោង៖</span>
                      <input
                        type="time"
                        value={tgDailySummaryTime}
                        onChange={(e) => setTgDailySummaryTime(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-1 text-[10px] text-white font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tgNotifyDaily}
                    onClick={() => setTgNotifyDaily(!tgNotifyDaily)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      tgNotifyDaily ? "bg-sky-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        tgNotifyDaily ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons: Check Status, Send Test, Save */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCheckTelegram}
                  disabled={tgChecking}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${tgChecking ? "animate-spin" : ""}`} />
                  <span>{tgChecking ? "កំពុងពិនិត្យ..." : "ពិនិត្យស្ថានភាព"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={tgTesting}
                  className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${tgTesting ? "animate-spin" : ""}`} />
                  <span>{tgTesting ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បង"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendDailyTelegram}
                  disabled={tgDailySending}
                  className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Clock className={`w-3.5 h-3.5 ${tgDailySending ? "animate-spin" : ""}`} />
                  <span>{tgDailySending ? "កំពុងផ្ញើ..." : "ផ្ញើសរុបប្រចាំថ្ងៃ"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckAbsent}
                  disabled={tgCheckingAbsent}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50 border border-amber-500/30"
                >
                  <Clock className={`w-3.5 h-3.5 ${tgCheckingAbsent ? "animate-spin" : ""}`} />
                  <span>{tgCheckingAbsent ? "កំពុងពិនិត្យ..." : "ពិនិត្យអវត្តមាន"}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={tgSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{tgSaving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកំណត់ Telegram"}</span>
              </button>
            </div>
          </form>

          {/* Telegram Dispatch History Table (Last 10 entries) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>ប្រវត្តិការផ្ញើ Telegram (១០ លើកចុងក្រោយ)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ពិនិត្យមើលស្ថានភាពនៃការផ្ញើជោគជ័យ ឬមូលហេតុនៃការបរាជ័យ (មិនបង្ហាញ Bot Token ឡើយ)
                </p>
              </div>
              <button
                type="button"
                onClick={fetchTelegramConfig}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>ធ្វើបច្ចុប្បន្នភាព</span>
              </button>
            </div>

            {tgHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                មិនទាន់មានប្រវត្តិការផ្ញើ Telegram នៅឡើយទេ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/40">
                      <th className="py-2.5 px-3">កាលបរិច្ឆេទ & ម៉ោង</th>
                      <th className="py-2.5 px-3">ប្រភេទសារ</th>
                      <th className="py-2.5 px-3">ព័ត៌មានលម្អិត</th>
                      <th className="py-2.5 px-3">ស្ថានភាព</th>
                      <th className="py-2.5 px-3">មូលហេតុ / លទ្ធផល</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {tgHistory.map((h: any) => {
                      const isSuccess = h.status === "SUCCESS";
                      return (
                        <tr key={h.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                            {new Date(h.createdAt).toLocaleString("km-KH", {
                              timeZone: "Asia/Phnom_Penh",
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {h.type === "CHECK_IN"
                                ? "Check-in"
                                : h.type === "CHECK_OUT"
                                ? "Check-out"
                                : h.type === "UPDATE_CHECKOUT"
                                ? "កែ Check-out"
                                : h.type === "LATE"
                                ? "យឺត (Late)"
                                : h.type === "ABSENT"
                                ? "អវត្តមាន (Absent)"
                                : h.type === "LEAVE"
                                ? "សុំច្បាប់"
                                : h.type === "OVERTIME"
                                ? "ថែមម៉ោង (OT)"
                                : h.type === "DAILY"
                                ? "សរុបប្រចាំថ្ងៃ"
                                : h.type === "TEST"
                                ? "សាកល្បង (Test)"
                                : h.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-white text-xs max-w-[200px] truncate">
                            {h.details || "-"}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                                isSuccess
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              }`}
                            >
                              {isSuccess ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                              )}
                              <span>{isSuccess ? "ជោគជ័យ" : "បរាជ័យ"}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-300 max-w-[260px]">
                            {h.error ? (
                              <span className="text-rose-400">{h.error}</span>
                            ) : (
                              <span className="text-emerald-400">ផ្ញើទៅ Telegram បានជោគជ័យ</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Setup Guide in Khmer (Step-by-Step) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <span>ការណែនាំខ្លីៗ ពីរបៀបបង្កើត Telegram Bot និងស្វែងរក Group Chat ID</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  <span>បង្កើត Bot លើ Telegram</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  បើក Telegram ស្វែងរក <b>@BotFather</b> រួចផ្ញើពាក្យ <code>/newbot</code>។ ដាក់ឈ្មោះ Bot និង Username (ឧ. <code>MyCafeAttendBot</code>)។ លោកអ្នកនឹងទទួលបាន <b>HTTP API Token</b> មួយជួរវែង។
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  <span>Add Bot ចូលក្នុង Group</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  បង្កើត Telegram Group សម្រាប់ម្ចាស់ហាង/មេការ រួច <b>Add Bot ដែលទើបបង្កើតនោះចូលក្នុង Group</b>។ កុំភ្លេចកំណត់សិទ្ធិ Bot ជា <b>Administrator</b> ដើម្បីឱ្យ Bot អាចផ្ញើសារបាន។
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-black">
                    3
                  </span>
                  <span>ស្វែងរក Group Chat ID</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Add bot ជំនួយការដូចជា <b>@userinfobot</b> ឬ <b>@myidbot</b> ចូលក្នុង Group វានឹងប្រាប់ Chat ID ភ្លាមៗ (ឧ. <code>-1001234567890</code>)។ បន្ទាប់មកចម្លងយកមកដាក់ក្នុងប្រអប់ខាងលើ។
                </p>
              </div>
            </div>

            {/* Vercel Hobby Cron explanation & free solutions */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>ចំណាំអំពីការកំណត់ពេលសរុបប្រចាំថ្ងៃ (Daily Cron on Vercel Hobby)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                កញ្ចប់ Vercel Hobby (ឥតគិតថ្លៃ) គាំទ្រ Scheduled Cron ១ ដងក្នុងមួយថ្ងៃ (គិតតាមម៉ោង UTC)។ ដើម្បីឱ្យការផ្ញើសារសរុបប្រចាំថ្ងៃដំណើរការទៀងទាត់ម៉ោង ១៨:០០ ជារៀងរាល់ថ្ងៃ លោកអ្នកអាចប្រើប្រាស់សេវាឥតគិតថ្លៃដូចជា <b>cron-job.org</b> ឬ <b>GitHub Actions</b> ដោយគ្រាន់តែហៅទៅកាន់ Webhook របស់ AttendPro។
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clean Up Demo Data Modal (9C) */}
      {cleanupModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-xs text-slate-300 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              type="button"
              onClick={() => setCleanupModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  សម្អាតទិន្នន័យសាកល្បង (Clean Up Demo Data)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ត្រៀមប្រព័ន្ធមុនដាក់ឱ្យដំណើរការអាជីវកម្មពិត (Go-live)
                </p>
              </div>
            </div>

            {cleanupResult ? (
              <div className="space-y-4 py-2 animate-fade-in">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>បានសម្អាតទិន្នន័យសាកល្បងដោយជោគជ័យ!</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-300/90 pt-1">
                    <li>បានលុបបុគ្គលិកសាកល្បង៖ {cleanupResult.deletedEmployeesCount} នាក់</li>
                    <li>បានលុបកំណត់ត្រាវត្តមាន៖ {cleanupResult.deletedAttendancesCount} ជួរ</li>
                    <li>បានលុបច្បាប់សម្រាក៖ {cleanupResult.deletedLeavesCount} ជួរ</li>
                    <li>បានលុបម៉ោងថែម OT៖ {cleanupResult.deletedOvertimesCount} ជួរ</li>
                    <li>បានលុបតារាងប្រាក់ខែសាកល្បង៖ {cleanupResult.deletedPayrollsCount} ជួរ</li>
                  </ul>
                  <p className="text-[11px] text-emerald-400 pt-1 font-semibold">
                    ✓ គណនី Super Admin, បុគ្គលិកភ្ជាប់ (EMP011), សាខា, វេន, Settings និង QR Code ត្រូវបានរក្សាទុកពេញលេញ។
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCleanupModalOpen(false);
                    window.location.reload();
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                >
                  យល់ព្រម និងផ្ទុកទំព័រឡើងវិញ
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cleanupError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{cleanupError}</span>
                  </div>
                )}

                {/* Step 1: Pre-cleanup Auto-Backup */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>ជំហានទី ១: ទាញយកកញ្ចប់ Backup ទិន្នន័យជាមុន</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    មុននឹងលុបទិន្នន័យ សូមទាញយកឯកសារ Backup ដើម្បីការពារករណីចង់ពិនិត្យមើលទិន្នន័យចាស់ៗឡើងវិញ៖
                  </p>
                  <a
                    href="/api/admin/backup-export?format=json"
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយក Backup ឥឡូវនេះ (JSON)</span>
                  </a>
                </div>

                {/* Step 2: Warning Breakdown */}
                {cleanupLoadingPreview ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    កំពុងផ្ទុកព័ត៌មានទិន្នន័យ...
                  </div>
                ) : cleanupPreview ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1 text-xs">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>អ្វីដែលនឹងត្រូវលុប ({cleanupPreview.deleteCount} បុគ្គលិក)៖</span>
                      </span>
                      <p className="text-[11px] text-rose-200/80 leading-relaxed">
                        • បុគ្គលិកសាកល្បង៖{" "}
                        <strong>{cleanupPreview.employeesToDelete?.map((e: any) => `${e.name} (${e.code})`).join(", ") || "គ្មាន"}</strong>
                      </p>
                      <p className="text-[11px] text-rose-200/80">
                        • កំណត់ត្រាពាក់ព័ន្ធ៖ វត្តមាន {cleanupPreview.recordsBreakdown?.attendances} ជួរ, ច្បាប់ {cleanupPreview.recordsBreakdown?.leaves} ជួរ, OT {cleanupPreview.recordsBreakdown?.overtimes} ជួរ, ប្រាក់ខែ {cleanupPreview.recordsBreakdown?.payrollItems} ជួរ។
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>អ្វីដែលនឹងត្រូវរក្សាទុក (មិនប៉ះពាល់)៖</span>
                      </span>
                      <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                        • គណនី Super Admin៖ <strong>{cleanupPreview.preserved?.superAdminName}</strong> ({cleanupPreview.preserved?.superAdminPhone})
                        <br />
                        • បុគ្គលិកភ្ជាប់៖ <strong>{cleanupPreview.preserved?.linkedEmployee}</strong>
                        <br />
                        • ការកំណត់៖ {cleanupPreview.preserved?.systemConfig}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Step 3: Checkbox for My Attendances */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cleanupDeleteMyAtt}
                    onChange={(e) => setCleanupDeleteMyAtt(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-200">
                    លុបកំណត់ត្រាវត្តមានសាកល្បងរបស់ខ្ញុំ (EMP011) ផងដែរ ដើម្បីឱ្យវត្តមានចាប់ផ្តើមទទេស្អាត
                  </span>
                </label>

                {/* Step 4: Confirm Word Input */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <label className="block text-xs font-semibold text-rose-300">
                    សូមវាយពាក្យ "លុប" ដើម្បីបញ្ជាក់ការសម្អាត៖
                  </label>
                  <input
                    type="text"
                    value={cleanupConfirmWord}
                    onChange={(e) => setCleanupConfirmWord(e.target.value)}
                    placeholder='វាយពាក្យ "លុប" នៅទីនេះ'
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    * ប្រតិបត្តិការនេះរត់ក្នុង Transaction តែមួយ ប្រសិនបើមានបញ្ហា វានឹង Rollback ត្រឡប់មកវិញដោយស្វ័យប្រវត្តិ។
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCleanupModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="button"
                    disabled={cleanupConfirmWord.trim() !== "លុប" || cleaningUp}
                    onClick={handleExecuteCleanup}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{cleaningUp ? "កំពុងសម្អាត..." : "បញ្ជាក់ការលុបទិន្នន័យសាកល្បង"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
