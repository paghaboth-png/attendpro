"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface CompanyData {
  id?: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoTimestamp: number;
}

interface CompanyContextType {
  company: CompanyData;
  loading: boolean;
  reloadCompany: () => Promise<void>;
  updateLogo: (newLogoUrl: string | null) => void;
}

const defaultCompany: CompanyData = {
  name: "",
  logoUrl: null,
  phone: "012999001",
  email: "info@demo.com",
  address: "ខេត្តស្វាយរៀង",
  logoTimestamp: Date.now(),
};

const CompanyContext = createContext<CompanyContextType>({
  company: defaultCompany,
  loading: true,
  reloadCompany: async () => {},
  updateLogo: () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanyData>(defaultCompany);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data?.company) {
        const c = json.data.company;
        setCompany({
          id: c.id,
          name: c.name || "",
          logoUrl: c.logoUrl ? `/api/company/logo?v=${Date.now()}` : null,
          phone: c.phone || "",
          email: c.email || "",
          address: c.address || "",
          logoTimestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error("Failed to fetch company data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLogo = useCallback((newLogoUrl: string | null) => {
    setCompany((prev) => ({
      ...prev,
      logoUrl: newLogoUrl ? `${newLogoUrl}${newLogoUrl.includes("?") ? "&" : "?"}t=${Date.now()}` : null,
      logoTimestamp: Date.now(),
    }));
  }, []);

  useEffect(() => {
    fetchCompany();

    const handleCustomEvent = (e: any) => {
      if (e.detail !== undefined) {
        updateLogo(e.detail);
      } else {
        fetchCompany();
      }
    };

    window.addEventListener("company-logo-updated", handleCustomEvent);
    return () => {
      window.removeEventListener("company-logo-updated", handleCustomEvent);
    };
  }, [fetchCompany, updateLogo]);

  return (
    <CompanyContext.Provider value={{ company, loading, reloadCompany: fetchCompany, updateLogo }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
