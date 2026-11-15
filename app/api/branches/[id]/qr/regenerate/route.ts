import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || (user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN" && user?.role !== "MANAGER")) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ដើម្បីបង្កើត QR ថ្មី (Admin only)" },
        { status: 403 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: { company: true },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញសាខាឡើយ" },
        { status: 404 }
      );
    }

    const oldToken = branch.qrToken;
    // Generate new secure random token (48 chars hex)
    const newToken = crypto.randomBytes(24).toString("hex");
    const newSecret = crypto.randomBytes(32).toString("hex");

    const updated = await prisma.branch.update({
      where: { id: branch.id },
      data: {
        qrToken: newToken,
        qrSecret: newSecret,
        qrTokenUpdatedAt: new Date(),
      },
    });

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id || null,
          action: "REGENERATE_BRANCH_QR",
          entity: `Branch: ${branch.name}`,
          details: `បានបង្កើត QR Code ថ្មីសម្រាប់សាខា ${branch.name} (QR ចាស់ ${oldToken ? oldToken.slice(0, 8) + "..." : "none"} ត្រូវបានលុបចោលភ្លាមៗ)`,
        },
      });
    } catch {}

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;
    const scanUrl = `${baseUrl}/scan/${newToken}`;

    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      success: true,
      message: `បានបង្កើត QR Code ថ្មីសម្រាប់ ${branch.name} ដោយជោគជ័យ! QR ចាស់ឈប់ដំណើរការភ្លាមៗ។`,
      data: {
        token: newToken,
        scanUrl,
        qrDataUrl,
        tokenUpdatedAt: updated.qrTokenUpdatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
