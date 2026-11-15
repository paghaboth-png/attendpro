import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const body = await req.json().catch(() => ({}));
    const newActiveState =
      body.isActive !== undefined ? Boolean(body.isActive) : !employee.user.isActive;

    await prisma.user.update({
      where: { id: employee.user.id },
      data: { isActive: newActiveState },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: newActiveState ? "ENABLE_USER_ACCOUNT" : "DISABLE_USER_ACCOUNT",
        entity: "User",
        details: `Admin (${userName}) បាន${newActiveState ? "បើកដំណើរការ" : "ផ្អាកដំណើរការ"}គណនី Login របស់បុគ្គលិក ${employee.code} (${employee.name})`,
      },
    });

    return NextResponse.json({
      success: true,
      isActive: newActiveState,
      message: `បាន${newActiveState ? "បើកដំណើរការ" : "ផ្អាកដំណើរការ"}គណនី Login ដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("toggle-user-status error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
