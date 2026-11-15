import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateSecurePin } from "@/lib/pin-utils";

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
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញបុគ្គលិកនេះឡើយ" },
        { status: 404 }
      );
    }

    // Generate new random secure 4-digit PIN
    const newRawPin = generateSecurePin();
    const pinHash = await bcrypt.hash(newRawPin, 10);

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        pin: pinHash,
        mustChangePin: true,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // Write audit log (NEVER log plaintext PIN)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "RESET_PIN",
        entity: "Employee",
        details: `Admin (${userName}) បាន Reset PIN សម្រាប់បុគ្គលិក ${employee.code} (${employee.name})`,
      },
    });

    return NextResponse.json({
      success: true,
      newPin: newRawPin,
      employeeCode: employee.code,
      employeeName: employee.name,
      message: `បាន Reset PIN សម្រាប់បុគ្គលិក ${employee.name} ដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("reset-pin error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
