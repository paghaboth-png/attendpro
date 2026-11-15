"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Locale = "km" | "en";

export interface Translations {
  [key: string]: {
    km: string;
    en: string;
  };
}

export const dictionary = {
  // Brand & Common
  appName: { km: "AttendPro", en: "AttendPro" },
  companyDefault: { km: "TheDemo Coffee", en: "TheDemo Coffee" },
  systemTagline: { km: "ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិក", en: "Employee Attendance System" },
  loading: { km: "កំពុងដំណើរការ...", en: "Loading..." },
  logout: { km: "ចាកចេញ", en: "Sign Out" },
  profile: { km: "គណនីរបស់ខ្ញុំ", en: "My Profile" },
  branch: { km: "សាខា", en: "Branch" },
  role: { km: "តួនាទី", en: "Role" },
  expireDate: { km: "ផុតកំណត់", en: "Expire Date" },
  activeStatus: { km: "ដំណើរការ", en: "Active" },
  searchPlaceholder: { km: "ស្វែងរកម៉ឺនុយ...", en: "Search menu..." },
  fullscreen: { km: "ពង្រីកពេញអេក្រង់", en: "Fullscreen" },
  exitFullscreen: { km: "បង្រួមអេក្រង់", en: "Exit Fullscreen" },

  // Roles
  SUPER_ADMIN: { km: "អភិបាលជាន់ខ្ពស់", en: "Super Admin" },
  ADMIN: { km: "អ្នកគ្រប់គ្រង", en: "Admin" },
  MANAGER: { km: "ប្រធានសាខា / មេការ", en: "Branch Manager" },
  EMPLOYEE: { km: "បុគ្គលិកទូទៅ", en: "Employee" },

  // Navigation Menu
  navOverview: { km: "ទិដ្ឋភាពទូទៅ", en: "Overview" },
  navDashboard: { km: "ផ្ទាំងគ្រប់គ្រង", en: "Dashboard" },
  navSetup: { km: "រៀបចំទិន្នន័យ", en: "Setup" },
  navBranches: { km: "សាខាទាំងអស់", en: "Branches" },
  navDepartments: { km: "ផ្នែកការងារ", en: "Departments" },
  navPositions: { km: "តួនាទីបុគ្គលិក", en: "Positions" },
  navEmployees: { km: "បញ្ជីបុគ្គលិក", en: "Employees" },
  navAttendanceTime: { km: "វត្តមាន & ពេលវេលា", en: "Attendance & Time" },
  navAttendances: { km: "បញ្ជីវត្តមាន", en: "Attendances" },
  navShifts: { km: "វេនធ្វើការ", en: "Shifts" },
  navLeaveOT: { km: "ច្បាប់ & ថែមម៉ោង", en: "Leave & Overtime" },
  navLeave: { km: "ពាក្យសុំច្បាប់", en: "Leave Requests" },
  navOvertime: { km: "ស្នើសុំថែមម៉ោង", en: "Overtime" },
  navReports: { km: "របាយការណ៍", en: "Reports" },
  navSettings: { km: "ការកំណត់", en: "Settings" },

  // Login Page
  loginTitle: { km: "ចូលប្រើប្រព័ន្ធ", en: "Sign in to AttendPro" },
  loginSubtitle: { km: "សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ និងលេខសម្ងាត់របស់អ្នក", en: "Enter your email or phone and password to continue" },
  emailLabel: { km: "អ៊ីមែល ឬ លេខទូរស័ព្ទ", en: "Email or Phone" },
  emailPlaceholder: { km: "អ៊ីមែល ឬលេខទូរស័ព្ទ", en: "Email or phone number" },
  passwordLabel: { km: "លេខសម្ងាត់", en: "Password" },
  passwordPlaceholder: { km: "••••••••", en: "••••••••" },
  rememberMe: { km: "ចងចាំគណនីខ្ញុំ", en: "Remember me" },
  forgotPassword: { km: "ភ្លេចលេខសម្ងាត់?", en: "Forgot password?" },
  signInButton: { km: "ចូលប្រព័ន្ធ", en: "Sign In" },
  signingIn: { km: "កំពុងចូល...", en: "Signing in..." },
  demoAccountsTitle: { km: "គណនីសាកល្បងរហ័ស (ចុចដើម្បីបំពេញស្វ័យប្រវត្ត)៖", en: "Quick Demo Accounts (Click to autofill):" },
  loginErrorInvalid: { km: "ព័ត៌មានចូលមិនត្រឹមត្រូវ", en: "Invalid login credentials" },
  loginErrorLocked: { km: "គណនីត្រូវបានចាក់សោបណ្តោះអាសន្នរយៈពេល ១៥ នាទី ដោយសារព្យាយាមចូលខុសច្រើនដង", en: "Account is temporarily locked for 15 minutes due to multiple failed login attempts." },
  forgotPasswordModalTitle: { km: "ភ្លេចលេខសម្ងាត់?", en: "Forgot Password?" },
  forgotPasswordModalDesc: { km: "សូមទាក់ទង Admin ដើម្បី Reset ពាក្យសម្ងាត់។ នៅពេល Admin ធ្វើការ Reset រួច លោកអ្នកនឹងទទួលបានពាក្យសម្ងាត់បណ្តោះអាសន្នសម្រាប់ចូលប្រើប្រាស់។", en: "Please contact an Administrator to reset your password. Once reset, a temporary password will be provided." },
  loginErrorGeneric: { km: "មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត", en: "An error occurred. Please try again." },

  // Dashboard Page
  welcomeBack: { km: "សូមស្វាគមន៍មកកាន់", en: "Welcome back to" },
  foundationNotice: { km: "ដំណាក់កាលទី ១ (Phase 1) • គ្រោងប្រព័ន្ធ និងទិន្នន័យត្រូវបានរៀបចំរួចរាល់!", en: "Phase 1 Foundation • Database schema and seed data are ready!" },
  statTotalEmployees: { km: "បុគ្គលិកសរុប", en: "Total Employees" },
  statActiveBranches: { km: "សាខាសកម្ម", en: "Active Branches" },
  statWorkShifts: { km: "វេនធ្វើការ", en: "Work Shifts" },
  statHolidays: { km: "ថ្ងៃបុណ្យកំណត់រួច", en: "Holidays Configured" },
  recentSystemStatus: { km: "ស្ថានភាពប្រព័ន្ធ", en: "System Status" },
  statusCloudLive: { km: "ដំណើរការលើ Cloud (Neon & Vercel)", en: "Live on Cloud (Neon & Vercel)" },
  quickActions: { km: "ផ្លូវកាត់សំខាន់ៗ", en: "Quick Links" },
  viewBranchesBtn: { km: "ពិនិត្យសាខា (២)", en: "View Branches (2)" },
  viewEmployeesBtn: { km: "ពិនិត្យបុគ្គលិក (១០)", en: "View Employees (10)" },
  checkinPortalBtn: { km: "ទំព័រស្កេនវត្តមាន (Mobile)", en: "Mobile Check-in Portal" },
} as const;

type TranslationKey = keyof typeof dictionary;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "km",
  setLocale: () => {},
  t: (key) => dictionary[key]?.km || key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("km");

  useEffect(() => {
    const saved = localStorage.getItem("attendpro_locale") as Locale;
    if (saved === "km" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("attendpro_locale", newLocale);
  };

  const t = (key: TranslationKey): string => {
    const entry = dictionary[key];
    if (!entry) return key;
    return entry[locale] || entry.km || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
