import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchTelegramNotification } from "@/lib/telegram";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const sessionUserId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "all") where.status = status;

    if (role === "EMPLOYEE") {
      let myEmpId = (session?.user as any)?.employeeId;
      if (!myEmpId && sessionUserId) {
        const myEmp = await prisma.employee.findFirst({ where: { userId: sessionUserId } });
        myEmpId = myEmp?.id;
      }
      where.employeeId = myEmpId || "NO_ACCESS";
    }

    const overtimes = await prisma.overtime.findMany({
      where,
      include: {
        employee: {
          include: { branch: true, department: true, position: true },
        },
      },
      orderBy: [{ date: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: overtimes,
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
    const body = await req.json();
    const { employeeId, employeeCode, date, hours, reason } = body;

    let targetEmpId = employeeId;
    if (!targetEmpId && employeeCode) {
      const emp = await prisma.employee.findUnique({
        where: { code: employeeCode.trim().toUpperCase() },
      });
      if (emp) targetEmpId = emp.id;
    }

    if (!targetEmpId || !date || !hours) {
      return NextResponse.json(
        { success: false, error: "សូមបំពេញព័ត៌មាន Overtime ឱ្យបានត្រឹមត្រូវ" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmpId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញបុគ្គលិកឡើយ" },
        { status: 404 }
      );
    }

    const ot = await prisma.overtime.create({
      data: {
        employeeId: targetEmpId,
        date: new Date(`${date}T00:00:00.000Z`),
        hours: parseFloat(hours),
        reason: reason || "",
        status: "PENDING",
      },
      include: { employee: true },
    });

    // Notify Admin
    try {
      await prisma.notification.create({
        data: {
          userId: "admin",
          title: "សំណើ Overtime ថ្មី ⏱️",
          message: `${employee.name} (${employee.code}) បានស្នើសុំ OT ចំនួន ${hours} ម៉ោង សម្រាប់ថ្ងៃទី ${date}`,
          type: "OVERTIME_REQUEST",
          link: "/overtime",
        },
      });

      // Dispatch Telegram notification (non-blocking)
      dispatchTelegramNotification("OVERTIME", {
        name: employee.name,
        code: employee.code,
        hours,
        reason: reason || "",
      }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      message: "បានបញ្ជូនសំណើ Overtime ដោយជោគជ័យ!",
      data: ot,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session || user?.role === "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ដើម្បីអនុម័ត Overtime (Manager/Admin only)" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { id, status } = body; // "APPROVED" or "REJECTED"

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing parameters" },
        { status: 400 }
      );
    }

    const updated = await prisma.overtime.update({
      where: { id },
      data: { status },
      include: { employee: true },
    });

    // Notify
    try {
      const isApprove = status === "APPROVED";
      await prisma.notification.create({
        data: {
          userId: updated.employee.userId || "all",
          title: isApprove ? "Overtime ត្រូវបានអនុម័ត ✅" : "Overtime ត្រូវបានបដិសេធ ❌",
          message: `សំណើ OT (${updated.hours}h) របស់ ${updated.employee.name} ត្រូវបាន ${isApprove ? "អនុម័ត" : "បដិសេធ"}`,
          type: "OVERTIME_STATUS",
          link: "/overtime",
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Overtime ត្រូវបាន ${status === "APPROVED" ? "អនុម័ត" : "បដិសេធ"} រួចរាល់!`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
