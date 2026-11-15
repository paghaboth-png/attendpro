import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (employeeId && employeeId !== "all") where.employeeId = employeeId;

    const [requests, leaveTypes, employees] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            include: { branch: true, department: true, position: true },
          },
          type: true,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.leaveType.findMany(),
      prisma.employee.findMany({
        where: { isActive: true },
        include: {
          leaveRequests: {
            where: { status: "APPROVED" },
            include: { type: true },
          },
          branch: true,
          position: true,
        },
      }),
    ]);

    // Calculate balances for each employee
    const balances = employees.map((emp) => {
      const annualLeaveType = leaveTypes.find((t) => t.id === "leave-annual") || { daysAllowed: 18 };
      const sickLeaveType = leaveTypes.find((t) => t.id === "leave-sick") || { daysAllowed: 7 };

      let annualUsed = 0;
      let sickUsed = 0;

      emp.leaveRequests.forEach((req) => {
        const from = new Date(req.fromDate);
        const to = new Date(req.toDate);
        const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        if (req.typeId === "leave-sick") {
          sickUsed += diffDays;
        } else {
          annualUsed += diffDays;
        }
      });

      return {
        employee: {
          id: emp.id,
          code: emp.code,
          name: emp.name,
          branch: emp.branch?.name,
          position: emp.position?.name,
        },
        annual: {
          allowed: annualLeaveType.daysAllowed,
          used: annualUsed,
          remaining: Math.max(0, annualLeaveType.daysAllowed - annualUsed),
        },
        sick: {
          allowed: sickLeaveType.daysAllowed,
          used: sickUsed,
          remaining: Math.max(0, sickLeaveType.daysAllowed - sickUsed),
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        requests,
        leaveTypes,
        balances,
      },
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
    const { employeeId, employeeCode, typeId, fromDate, toDate, reason } = body;

    let targetEmpId = employeeId;
    if (!targetEmpId && employeeCode) {
      const emp = await prisma.employee.findUnique({
        where: { code: employeeCode.trim().toUpperCase() },
      });
      if (emp) targetEmpId = emp.id;
    }

    if (!targetEmpId || !typeId || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: "សូមបំពេញព័ត៌មានស្នើសុំច្បាប់ឱ្យបានគ្រប់គ្រាន់" },
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

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: targetEmpId,
        typeId,
        fromDate: new Date(`${fromDate}T00:00:00.000Z`),
        toDate: new Date(`${toDate}T23:59:59.999Z`),
        reason: reason || "",
        status: "PENDING",
      },
      include: { type: true },
    });

    // Create Notification for Admin
    try {
      await prisma.notification.create({
        data: {
          userId: "admin",
          title: "សំណើច្បាប់ឈប់សម្រាកថ្មី 📋",
          message: `${employee.name} (${employee.code}) បានស្នើសុំ "${leaveRequest.type.name}" ពី ${fromDate} ដល់ ${toDate}`,
          type: "LEAVE_REQUEST",
          link: "/leave",
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "បានបញ្ជូនសំណើច្បាប់ដោយជោគជ័យ! រង់ចាំការអនុម័តពីប្រធានគ្រប់គ្រង",
      data: leaveRequest,
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
    const body = await req.json();
    const { id, status } = body; // "APPROVED" or "REJECTED"

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing parameters" },
        { status: 400 }
      );
    }

    const user = session?.user as any;
    const approverName = user?.name || "Manager";

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: approverName,
      },
      include: { employee: true, type: true },
    });

    // Create In-App Notification
    try {
      const isApprove = status === "APPROVED";
      await prisma.notification.create({
        data: {
          userId: updated.employee.userId || "all",
          title: isApprove ? "ច្បាប់ត្រូវបានអនុម័ត ✅" : "ច្បាប់ត្រូវបានបដិសេធ ❌",
          message: `សំណើច្បាប់របស់ ${updated.employee.name} (${updated.type.name}) ត្រូវបាន ${isApprove ? "អនុម័ត" : "បដិសេធ"} ដោយ ${approverName}`,
          type: "LEAVE_STATUS",
          link: "/leave",
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `សំណើត្រូវបាន ${status === "APPROVED" ? "អនុម័ត" : "បដិសេធ"} រួចរាល់!`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
