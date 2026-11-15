import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ResetSchema = z.object({
  identifier: z.string().min(1, "សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ"),
  resetCode: z.string().length(6, "លេខកូដផ្ទៀងផ្ទាត់ត្រូវមាន ៦ ខ្ទង់"),
  newPassword: z.string().min(6, "ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួ"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "ទិន្នន័យមិនត្រឹមត្រូវ" },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier.trim().toLowerCase();
    const rate = checkRateLimit(`reset:${identifier}`, 5, 15 * 60);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `អ្នកបានព្យាយាមច្រើនដងពេកហើយ។ សូមរង់ចាំ ${rate.resetInSeconds} វិនាទីទៀត។`,
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

    if (user.resetToken !== parsed.data.resetCode.trim()) {
      return NextResponse.json(
        { success: false, error: "លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវឡើយ" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
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
