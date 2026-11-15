import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEMO_EMAILS = ["admin@demo.com", "manager@demo.com", "employee@demo.com"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    const demoUsers = await prisma.user.findMany({
      where: { email: { in: DEMO_EMAILS } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const allDisabled = demoUsers.length > 0 && demoUsers.every((u) => !u.isActive);

    return NextResponse.json({
      success: true,
      demoUsers,
      allDisabled,
      activeCount: demoUsers.filter((u) => u.isActive).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    if (role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action || "DISABLE"; // "DISABLE" or "ENABLE"
    const targetState = action === "ENABLE";

    await prisma.user.updateMany({
      where: { email: { in: DEMO_EMAILS } },
      data: { isActive: targetState },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: action === "DISABLE" ? "DISABLE_DEMO_ACCOUNTS" : "ENABLE_DEMO_ACCOUNTS",
        entity: "User",
        details:
          action === "DISABLE"
            ? "Super Admin បានបិទដំណើរការគណនីសាកល្បងទាំងអស់ (admin@demo.com, manager@demo.com, employee@demo.com)"
            : "Super Admin បានបើកដំណើរការគណនីសាកល្បងឡើងវិញ",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "DISABLE"
          ? "បានបិទដំណើរការគណនីសាកល្បងទាំង ៣ ដោយជោគជ័យ!"
          : "បានបើកដំណើរការគណនីសាកល្បងឡើងវិញដោយជោគជ័យ!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
