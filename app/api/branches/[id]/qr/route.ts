import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "សូមចូលប្រើប្រព័ន្ធជាមុនសិន (Unauthorized)" },
        { status: 401 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: {
        company: true,
      },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញសាខាឡើយ" },
        { status: 404 }
      );
    }

    // Ensure branch has a valid token (≥ 32 chars)
    let token = branch.qrToken;
    if (!token) {
      token = crypto.randomBytes(24).toString("hex");
      const secret = crypto.randomBytes(32).toString("hex");
      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          qrToken: token,
          qrSecret: secret,
          qrTokenUpdatedAt: new Date(),
        },
      });
    }

    // Determine host origin
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;
    const scanUrl = `${baseUrl}/scan/${token}`;

    // Generate high resolution QR Code Data URL (PNG)
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    // Generate SVG string
    const qrSvg = await QRCode.toString(scanUrl, {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        branchId: branch.id,
        branchName: branch.name,
        branchAddress: branch.address,
        lat: branch.lat,
        lng: branch.lng,
        radiusMeters: branch.radiusMeters,
        token,
        tokenUpdatedAt: branch.qrTokenUpdatedAt,
        scanUrl,
        qrDataUrl,
        qrSvg,
        companyName: branch.company?.name || "AttendPro",
        companyLogo: branch.company?.logoUrl || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
