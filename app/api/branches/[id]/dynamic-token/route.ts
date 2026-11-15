import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    let secret = branch.qrSecret;
    if (!secret) {
      secret = crypto.randomBytes(32).toString("hex");
      await prisma.branch.update({
        where: { id: branch.id },
        data: { qrSecret: secret },
      });
    }

    const now = Date.now();
    const step = Math.floor(now / 30000);
    const secondsRemaining = 30 - (Math.floor(now / 1000) % 30);

    const dynamicToken = crypto
      .createHmac("sha256", secret)
      .update(String(step))
      .digest("hex")
      .slice(0, 32);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const scanUrl = `${proto}://${host}/scan/${dynamicToken}`;

    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 500,
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
        branchName: branch.name,
        companyName: branch.company?.name || "TheDemo Coffee",
        companyLogo: branch.company?.logoUrl || null,
        dynamicToken,
        scanUrl,
        qrDataUrl,
        secondsRemaining,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
