import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const branchId = searchParams.get("branchId") || "all";
    const employeeId = searchParams.get("employeeId") || "all";

    // Phnom Penh current date
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);

    // Default to current month (e.g. 2026-11-01 to 2026-11-30)
    const currentYear = nowLocal.getUTCFullYear();
    const currentMonth = nowLocal.getUTCMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const startDate =
      startDateParam ||
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDate =
      endDateParam ||
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
        daysInMonth
      ).padStart(2, "0")}`;

    // Where filters
    const attWhere: any = {
      date: { gte: startDate, lte: endDate },
    };
    if (branchId !== "all") attWhere.branchId = branchId;
    if (employeeId !== "all") attWhere.employeeId = employeeId;

    const empWhere: any = { isActive: true };
    if (branchId !== "all") empWhere.branchId = branchId;
    if (employeeId !== "all") empWhere.id = employeeId;

    const [employees, attendances, leaves, overtimes, branches] =
      await Promise.all([
        prisma.employee.findMany({
          where: empWhere,
          include: { branch: true, department: true, position: true, shift: true },
          orderBy: { code: "asc" },
        }),
        prisma.attendance.findMany({
          where: attWhere,
          include: {
            employee: {
              include: { branch: true, department: true, position: true },
            },
            branch: true,
          },
          orderBy: { date: "asc" },
        }),
        prisma.leaveRequest.findMany({
          where: {
            status: "APPROVED",
            fromDate: { lte: new Date(`${endDate}T23:59:59.999Z`) },
            toDate: { gte: new Date(`${startDate}T00:00:00.000Z`) },
            ...(employeeId !== "all" && { employeeId }),
          },
          include: { employee: true, type: true },
        }),
        prisma.overtime.findMany({
          where: {
            status: "APPROVED",
            date: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
            ...(employeeId !== "all" && { employeeId }),
          },
          include: { employee: true },
        }),
        prisma.branch.findMany(),
      ]);

    // Aggregate statistics
    const totalRecords = attendances.length;
    const goodRecords = attendances.filter((a) => a.status === "GOOD").length;
    const lateRecords = attendances.filter((a) => a.status === "LATE").length;
    const manualRecords = attendances.filter((a) => a.isManual).length;

    const totalOtHours = overtimes.reduce(
      (sum, ot) => sum + (ot.hours || 0),
      0
    );

    // Calculate approximate work hours (9h per attendance or checkout - checkin)
    let totalWorkHours = 0;
    attendances.forEach((att) => {
      if (att.checkInAt && att.checkOutAt) {
        const diffMs =
          new Date(att.checkOutAt).getTime() - new Date(att.checkInAt).getTime();
        totalWorkHours += Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
      } else if (att.checkInAt) {
        totalWorkHours += 8; // standard default
      }
    });

    // Daily trend (Date -> { date, good, late, total })
    const trendMap = new Map<string, { date: string; good: number; late: number; total: number }>();
    attendances.forEach((a) => {
      const entry = trendMap.get(a.date) || {
        date: a.date,
        good: 0,
        late: 0,
        total: 0,
      };
      if (a.status === "GOOD") entry.good++;
      if (a.status === "LATE") entry.late++;
      entry.total++;
      trendMap.set(a.date, entry);
    });

    const dailyTrends = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Per Employee Summary
    const employeeSummaries = employees.map((emp) => {
      const empAtts = attendances.filter((a) => a.employeeId === emp.id);
      const empGood = empAtts.filter((a) => a.status === "GOOD").length;
      const empLate = empAtts.filter((a) => a.status === "LATE").length;
      const empOts = overtimes.filter((o) => o.employeeId === emp.id);
      const empOtHours = empOts.reduce((s, o) => s + (o.hours || 0), 0);

      // Leave days
      let empLeaveDays = 0;
      leaves
        .filter((l) => l.employeeId === emp.id)
        .forEach((l) => {
          const f = new Date(l.fromDate);
          const t = new Date(l.toDate);
          empLeaveDays += Math.max(1, Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        });

      let empHours = 0;
      empAtts.forEach((a) => {
        if (a.checkInAt && a.checkOutAt) {
          const diffMs =
            new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime();
          empHours += Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
        } else if (a.checkInAt) {
          empHours += 8;
        }
      });

      return {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        branchName: emp.branch?.name,
        positionName: emp.position?.name,
        departmentName: emp.department?.name,
        totalDays: empAtts.length,
        goodDays: empGood,
        lateDays: empLate,
        leaveDays: empLeaveDays,
        otHours: empOtHours,
        totalHours: Math.round(empHours * 10) / 10,
      };
    });

    // Attendance Rate
    const attendanceRate =
      totalRecords > 0
        ? Math.round((goodRecords / totalRecords) * 100)
        : 100;

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalRecords,
          goodRecords,
          lateRecords,
          manualRecords,
          totalOtHours,
          totalWorkHours: Math.round(totalWorkHours * 10) / 10,
          attendanceRate,
          totalEmployees: employees.length,
        },
        dailyTrends,
        employeeSummaries,
        branches,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
