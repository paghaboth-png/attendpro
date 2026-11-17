import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, normalizeIdentifier } from "@/lib/rate-limit";
import { sendTelegramMessage } from "@/lib/telegram";
import { decryptToken } from "@/lib/encryption";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, resetCode, recoveryCode, newPassword } = body;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួ" },
        { status: 400 }
      );
    }

    const norm = normalizeIdentifier(identifier.trim());
    const rawVal = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: norm.value },
          { phone: norm.value },
          { phone: rawVal },
        ],
        isActive: true,
      },
    });

    // MODE 1: Super Admin Recovery Code
    if (recoveryCode) {
      const cleanCode = String(recoveryCode).replace(/[^A-Za-z0-9]/g, "").toUpperCase();

      // Rate limiting: 5 wrong attempts per 15 minutes per user
      const rateLimitKey = `recovery:${user?.id || norm.value}`;
      const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `អ្នកបានវាយកូដស្តារខុសលើស ៥ ដង។ ប្រព័ន្ធត្រូវបានចាក់សោសុវត្ថិភាព ${Math.ceil(rateCheck.resetInSeconds / 60)} នាទី។`,
          },
          { status: 429 }
        );
      }

      if (!user || user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { success: false, error: "កូដស្តារគណនី (Recovery Code) សម្រាប់តែ Super Admin ប៉ុណ្ណោះ" },
          { status: 403 }
        );
      }

      const activeCodes = await prisma.recoveryCode.findMany({
        where: { userId: user.id, used: false },
      });

      let matchedCodeId: string | null = null;
      for (const c of activeCodes) {
        const isMatch = await bcrypt.compare(cleanCode, c.codeHash);
        if (isMatch) {
          matchedCodeId = c.id;
          break;
        }
      }

      if (!matchedCodeId) {
        return NextResponse.json(
          { success: false, error: "កូដស្តារគណនីមិនត្រឹមត្រូវ ឬត្រូវបានប្រើប្រាស់រួចហើយ!" },
          { status: 400 }
        );
      }

      // Mark code as used and update user password
      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.$transaction([
        prisma.recoveryCode.update({
          where: { id: matchedCodeId },
          data: { used: true, usedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newHash,
            mustChangePassword: false,
            failedLoginAttempts: 0,
            lockedUntil: null,
            resetToken: null,
            resetTokenExpiry: null,
          },
        }),
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "RECOVERY_CODE_USED",
            entity: "User",
            details: `Super Admin (${user.name}) បានប្រើកូដស្តារគណនីដើម្បីប្តូរពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ`,
          },
        }),
      ]);

      // Dispatch Telegram Notification (awaited to guarantee delivery)
      try {
        const company = await prisma.company.findFirst({
          include: { telegramConfig: true },
        });
        const config = company?.telegramConfig;
        if (config && config.isEnabled && config.botTokenEncrypted && config.chatId) {
          const token = decryptToken(config.botTokenEncrypted);
          if (token) {
            const ppTime = new Date().toLocaleString("km-KH", { timeZone: "Asia/Phnom_Penh" });
            await sendTelegramMessage(
              token,
              config.chatId,
              `🚨 <b>ការជូនដំណឹងសុវត្ថិភាព AttendPro</b>\n\n` +
              `🔐 <b>Super Admin បានប្រើកូដស្តារគណនី (Recovery Code)</b>\n` +
              `• គណនី: <b>${user.name}</b> (${user.phone || user.email})\n` +
              `• កាលបរិច្ឆេទ: <code>${ppTime}</code>\n` +
              `• សកម្មភាព: ពាក្យសម្ងាត់ត្រូវបាន Reset ដោយជោគជ័យ។`
            );
          }
        }
      } catch {}

      return NextResponse.json({
        success: true,
        message: "បានកំណត់ពាក្យសម្ងាត់ថ្មីដោយកូដស្តារជោគជ័យ! សូមចូលប្រើប្រាស់ដោយពាក្យសម្ងាត់ថ្មីនេះ។",
      });
    }

    // MODE 2: Standard 6-digit Reset Code
    const rate = checkRateLimit(`reset:${norm.value}`, 5, 15 * 60);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `អ្នកបានព្យាយាមច្រើនដងពេកហើយ។ សូមរង់ចាំ ${rate.resetInSeconds} វិនាទីទៀត។`,
        },
        { status: 429 }
      );
    }

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return NextResponse.json(
        { success: false, error: "លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់ហើយ" },
        { status: 400 }
      );
    }

    if (new Date() > user.resetTokenExpiry) {
      return NextResponse.json(
        { success: false, error: "លេខកូដនេះបានផុតកំណត់ហើយ (លើស ១៥ នាទី)" },
        { status: 400 }
      );
    }

    if (user.resetToken !== String(resetCode || "").trim()) {
      return NextResponse.json(
        { success: false, error: "លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវឡើយ" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_SUCCESS",
        entity: "User",
        details: `បានកំណត់ពាក្យសម្ងាត់ថ្មីដោយជោគជ័យតាមរយៈ Reset Code (${user.email || user.phone})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានកំណត់ពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ! សូមចូលប្រើប្រាស់ឥឡូវនេះ។",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "មានបញ្ហាបច្ចេកទេសក្នុងការ Reset ពាក្យសម្ងាត់" },
      { status: 500 }
    );
  }
}
