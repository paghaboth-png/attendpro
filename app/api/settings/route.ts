import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Default settings map
const DEFAULT_SETTINGS: Record<string, string> = {
  require_selfie: "false", // OFF by default
  require_gps: "true",     // ON by default
  default_radius: "100",   // 100 meters
  grace_minutes: "15",     // 15 minutes
  default_language: "km",  // Khmer by default
  // Payroll configurations
  late_penalty_type: "FIXED", // FIXED or PER_MINUTE
  late_penalty_amount: "1.0", // $1 per late
  absent_penalty_rate: "1.0", // 1 day wage per unexcused absence
  overtime_multiplier: "1.5", // 1.5x regular hourly wage
  tax_enabled: "false",       // OFF by default as selected by user
  nssf_enabled: "false",      // OFF by default as selected by user
  allow_employee_view_payslip: "false",
  payroll_cutoff_day: "7",    // Day 7 of month by default
};

export async function GET() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({
        success: true,
        data: {
          company: {
            name: "TheDemo Coffee",
            phone: "012999001",
            email: "info@demo.com",
            address: "ខេត្តស្វាយរៀង",
            logoUrl: "",
          },
          requireSelfie: false,
          requireGps: true,
          defaultRadius: 100,
          graceMinutes: 15,
          defaultLanguage: "km",
          latePenaltyType: "FIXED",
          latePenaltyAmount: 1.0,
          absentPenaltyRate: 1.0,
          overtimeMultiplier: 1.5,
          taxEnabled: false,
          nssfEnabled: false,
          allowEmployeeViewPayslip: false,
        },
      });
    }

    const dbSettings = await prisma.setting.findMany({
      where: { companyId: company.id },
    });

    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
    dbSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          phone: company.phone || "",
          email: company.email || "",
          address: company.address || "",
          logoUrl: company.logoUrl || "",
        },
        requireSelfie: settingsMap.require_selfie === "true",
        requireGps: settingsMap.require_gps !== "false",
        defaultRadius: parseInt(settingsMap.default_radius) || 100,
        graceMinutes: parseInt(settingsMap.grace_minutes) || 15,
        defaultLanguage: settingsMap.default_language || "km",
        // Payroll settings
        latePenaltyType: settingsMap.late_penalty_type || "FIXED",
        latePenaltyAmount: parseFloat(settingsMap.late_penalty_amount) || 1.0,
        absentPenaltyRate: parseFloat(settingsMap.absent_penalty_rate) || 1.0,
        overtimeMultiplier: parseFloat(settingsMap.overtime_multiplier) || 1.5,
        taxEnabled: settingsMap.tax_enabled === "true",
        nssfEnabled: settingsMap.nssf_enabled === "true",
        allowEmployeeViewPayslip: settingsMap.allow_employee_view_payslip === "true",
        payrollCutoffDay: parseInt(settingsMap.payroll_cutoff_day) || 7,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "គ្មានសិទ្ធិកែប្រែការកំណត់ឡើយ (Unauthorized)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      company: companyInput,
      requireSelfie,
      requireGps,
      defaultRadius,
      graceMinutes,
      defaultLanguage,
      // Payroll settings
      latePenaltyType,
      latePenaltyAmount,
      absentPenaltyRate,
      overtimeMultiplier,
      taxEnabled,
      nssfEnabled,
      allowEmployeeViewPayslip,
      payrollCutoffDay,
    } = body;

    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: "TheDemo Coffee",
        },
      });
    }

    // Update Company info if provided
    if (companyInput) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          name: companyInput.name || company.name,
          phone: companyInput.phone ?? company.phone,
          email: companyInput.email ?? company.email,
          address: companyInput.address ?? company.address,
          logoUrl: companyInput.logoUrl ?? company.logoUrl,
        },
      });
    }

    const updates: { key: string; value: string }[] = [];

    if (requireSelfie !== undefined)
      updates.push({ key: "require_selfie", value: String(Boolean(requireSelfie)) });
    if (requireGps !== undefined)
      updates.push({ key: "require_gps", value: String(Boolean(requireGps)) });
    if (defaultRadius !== undefined)
      updates.push({ key: "default_radius", value: String(defaultRadius) });
    if (graceMinutes !== undefined)
      updates.push({ key: "grace_minutes", value: String(graceMinutes) });
    if (defaultLanguage !== undefined)
      updates.push({ key: "default_language", value: String(defaultLanguage) });

    // Payroll updates
    if (latePenaltyType !== undefined)
      updates.push({ key: "late_penalty_type", value: String(latePenaltyType) });
    if (latePenaltyAmount !== undefined)
      updates.push({ key: "late_penalty_amount", value: String(latePenaltyAmount) });
    if (absentPenaltyRate !== undefined)
      updates.push({ key: "absent_penalty_rate", value: String(absentPenaltyRate) });
    if (overtimeMultiplier !== undefined)
      updates.push({ key: "overtime_multiplier", value: String(overtimeMultiplier) });
    if (taxEnabled !== undefined)
      updates.push({ key: "tax_enabled", value: String(Boolean(taxEnabled)) });
    if (nssfEnabled !== undefined)
      updates.push({ key: "nssf_enabled", value: String(Boolean(nssfEnabled)) });
    if (allowEmployeeViewPayslip !== undefined)
      updates.push({
        key: "allow_employee_view_payslip",
        value: String(Boolean(allowEmployeeViewPayslip)),
      });
    if (payrollCutoffDay !== undefined)
      updates.push({
        key: "payroll_cutoff_day",
        value: String(parseInt(payrollCutoffDay) || 7),
      });

    for (const item of updates) {
      await prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: {
          companyId: company.id,
          key: item.key,
          value: item.value,
        },
      });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "SETTING_CHANGE",
        entity: "Setting",
        details: `បានកែប្រែការកំណត់ប្រព័ន្ធ (${updates.map((u) => u.key).join(", ")})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានរក្សាទុកការកំណត់ដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
