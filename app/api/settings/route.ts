import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  require_selfie: "false", // OFF by default as requested
  require_gps: "true",     // ON by default
  default_radius: "100",   // 100 meters
  grace_minutes: "15",     // 15 minutes
};

export async function GET() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({
        success: true,
        data: {
          requireSelfie: false,
          requireGps: true,
          defaultRadius: 100,
          graceMinutes: 15,
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
        requireSelfie: settingsMap.require_selfie === "true",
        requireGps: settingsMap.require_gps !== "false",
        defaultRadius: parseInt(settingsMap.default_radius) || 100,
        graceMinutes: parseInt(settingsMap.grace_minutes) || 15,
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
    const body = await req.json();
    const { requireSelfie, requireGps, defaultRadius, graceMinutes } = body;

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      );
    }

    const updates = [
      { key: "require_selfie", value: String(Boolean(requireSelfie)) },
      { key: "require_gps", value: String(Boolean(requireGps)) },
      ...(defaultRadius !== undefined
        ? [{ key: "default_radius", value: String(defaultRadius) }]
        : []),
      ...(graceMinutes !== undefined
        ? [{ key: "grace_minutes", value: String(graceMinutes) }]
        : []),
    ];

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

    return NextResponse.json({
      success: true,
      message: "បានរក្សាទុកការកំណត់ដោយជោគជ័យ",
      data: {
        requireSelfie: Boolean(requireSelfie),
        requireGps: Boolean(requireGps),
        defaultRadius: parseInt(defaultRadius) || 100,
        graceMinutes: parseInt(graceMinutes) || 15,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
