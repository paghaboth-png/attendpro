import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || "").trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ" },
        { status: 400 }
      );
    }

    // Rate limiting: 5 requests per 15 minutes per identifier
    const rate = checkRateLimit(`forgot:${identifier}`, 5, 15 * 60);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `អ្នកបានស្នើសុំច្រើនដងពេកហើយ។ សូមរង់ចាំ ${rate.resetInSeconds} វិនាទីទៀត។`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
        isActive: true,
      },
    });

    if (!user) {
      // Do not reveal whether user exists for security, return standard message
      return NextResponse.json({
        success: true,
        message: "ប្រសិនបើគណនីនេះមានក្នុងប្រព័ន្ធ លេខកូដបញ្ជាក់ត្រូវបានបង្កើតរួចរាល់។",
      });
    }

    // Generate a 6-digit numeric reset token
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetCode,
        resetTokenExpiry: expiry,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entity: "User",
        details: `បានស្នើសុំលេខកូដ Reset ពាក្យសម្ងាត់សម្រាប់ ${user.email || user.phone}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "លេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ត្រូវបានបង្កើតរួចរាល់!",
      // For immediate ease of use in demo/pilot without email server setup:
      resetCodeHint: resetCode,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "មានបញ្ហាបច្ចេកទេសក្នុងការស្នើសុំ Reset" },
      { status: 500 }
    );
  }
}
