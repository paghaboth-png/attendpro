import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, "សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន"),
  newPassword: z.string().min(6, "ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួ"),
  confirmPassword: z.string().min(6, "សូមបញ្ជាក់ពាក្យសម្ងាត់ថ្មី"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "ពាក្យសម្ងាត់ថ្មីទាំងពីរមិនដូចគ្នាទេ",
  path: ["confirmPassword"],
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "សូមចូលប្រើប្រព័ន្ធជាមុនសិន (Unauthorized)" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "ទិន្នន័យមិនត្រឹមត្រូវ" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញគណនីអ្នកប្រើប្រាស់ឡើយ" },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(parsed.data.oldPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវឡើយ" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_CHANGE",
        entity: "User",
        details: `បានប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួនដោយជោគជ័យ (${user.email || user.name})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "មានបញ្ហាបច្ចេកទេសក្នុងការប្តូរពាក្យសម្ងាត់" },
      { status: 500 }
    );
  }
}
