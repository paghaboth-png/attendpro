import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    let code = searchParams.get("code")?.trim().toUpperCase();

    if (!code && session?.user) {
      code = (session.user as any).employeeCode;
      if (!code) {
        const emp = await prisma.employee.findFirst({
          where: { userId: (session.user as any).id },
        });
        code = emp?.code;
      }
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing employee code or session" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { code },
      include: {
        branch: true,
        shift: true,
        position: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញកូដបុគ្គលិកនេះឡើយ" },
        { status: 404 }
      );
    }

    // Phnom Penh Date
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);

    const todayAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayStr,
        },
      },
    });

    // Recent 10 attendances
    const recentHistory = await prisma.attendance.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        employee,
        todayStr,
        todayAttendance,
        recentHistory,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
