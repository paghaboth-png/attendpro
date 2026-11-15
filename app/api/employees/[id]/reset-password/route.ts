import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateReadableTempPassword } from "@/lib/pin-utils";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Admin";

    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Admin / Super Admin only)" },
        { status: 403 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!employee || !employee.user) {
      return NextResponse.json(
        { success: false, error: "បុគ្គលិកនេះពុំទាន់មានគណនី Login នៅឡើយទេ" },
        { status: 404 }
      );
    }

    // Generate readable 8-char random password (no O/0, I/l)
    const tempPassword = generateReadableTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: employee.user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Write audit log (NEVER log plaintext password)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "RESET_PASSWORD",
        entity: "User",
        details: `Admin (${userName}) បាន Reset ពាក្យសម្ងាត់សម្រាប់បុគ្គលិក ${employee.code} (${employee.name})`,
      },
    });

    const username = employee.user.phone || employee.user.email || employee.code;

    return NextResponse.json({
      success: true,
      tempPassword,
      username,
      employeeName: employee.name,
      employeeCode: employee.code,
      message: `បាន Reset ពាក្យសម្ងាត់បណ្តោះអាសន្នសម្រាប់បុគ្គលិក ${employee.name} ដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("reset-password error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
