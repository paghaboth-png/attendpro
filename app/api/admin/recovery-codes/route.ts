import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateSecureRecoveryCode(): string {
  // Generates 12-char formatted code: ABCD-EFGH-JKLM (excluding confusing letters)
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 12; i++) {
    const byte = crypto.randomBytes(1)[0];
    result += chars[byte % chars.length];
  }
  return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== "SUPER_ADMIN" || !userId) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    const codes = await prisma.recoveryCode.findMany({
      where: { userId },
      select: { id: true, used: true, createdAt: true, usedAt: true },
    });

    const unusedCount = codes.filter((c) => !c.used).length;

    return NextResponse.json({
      success: true,
      hasCodes: codes.length > 0,
      totalCount: codes.length,
      unusedCount,
      createdAt: codes[0]?.createdAt || null,
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
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Super Admin";

    if (!session || userRole !== "SUPER_ADMIN" || !userId) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    // Generate 8 unique recovery codes
    const plainCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      plainCodes.push(generateSecureRecoveryCode());
    }

    // Hash each code
    const hashedEntries = await Promise.all(
      plainCodes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), 10),
        used: false,
      }))
    );

    // Delete old recovery codes in a transaction and insert new ones
    await prisma.$transaction([
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({ data: hashedEntries }),
    ]);

    // Audit Log (NEVER log raw recovery codes)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "GENERATE_RECOVERY_CODES",
        entity: "User",
        details: `Super Admin (${userName}) បានបង្កើតកូដស្តារគណនីថ្មីចំនួន ៨ កូដ (Recovery Codes) - កូដចាស់ត្រូវបានលុបចោល`,
      },
    });

    return NextResponse.json({
      success: true,
      codes: plainCodes,
      message: "បានបង្កើតកូដស្តារគណនីថ្មីចំនួន ៨ កូដដោយជោគជ័យ! សូមចម្លង ឬបោះពុម្ពទុកជាការសម្ងាត់។",
    });
  } catch (error: any) {
    console.error("recovery-codes error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
