import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const now = new Date();
    // Default to current year and month (1-12)
    const year = yearStr ? parseInt(yearStr) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { branch: true, shift: true, position: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
    // Last day of month
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const [attendances, leaves, holidays, dayOffs] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId,
          date: { gte: startDateStr, lte: endDateStr },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId,
          status: "APPROVED",
          fromDate: { lte: new Date(`${endDateStr}T23:59:59.999Z`) },
          toDate: { gte: new Date(`${startDateStr}T00:00:00.000Z`) },
        },
        include: { type: true },
      }),
      prisma.holiday.findMany({
        where: {
          date: {
            gte: new Date(`${startDateStr}T00:00:00.000Z`),
            lte: new Date(`${endDateStr}T23:59:59.999Z`),
          },
          OR: [{ branchId: employee.branchId }, { branchId: null }],
        },
      }),
      prisma.dayOff.findMany({
        where: {
          employeeId,
          date: {
            gte: new Date(`${startDateStr}T00:00:00.000Z`),
            lte: new Date(`${endDateStr}T23:59:59.999Z`),
          },
        },
      }),
    ]);

    const attMap = new Map<string, any>();
    attendances.forEach((a) => attMap.set(a.date, a));

    // Current Phnom Penh date
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);

    const days = [];
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayDate = new Date(`${dayDateStr}T00:00:00.000Z`);
      const dayOfWeek = dayDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      const att = attMap.get(dayDateStr);

      // Check Holiday
      const holiday = holidays.find(
        (h) => h.date.toISOString().slice(0, 10) === dayDateStr
      );

      // Check Leave
      const leave = leaves.find((l) => {
        const fromStr = l.fromDate.toISOString().slice(0, 10);
        const toStr = l.toDate.toISOString().slice(0, 10);
        return dayDateStr >= fromStr && dayDateStr <= toStr;
      });

      // Check DayOff
      const dayOff = dayOffs.find(
        (d) => d.date.toISOString().slice(0, 10) === dayDateStr
      );

      let dayStatus = "NOT_YET";
      if (att) {
        if (att.status === "LATE") {
          dayStatus = "LATE";
          lateCount++;
          presentCount++;
        } else if (att.status === "EARLY_LEAVE") {
          dayStatus = "EARLY_LEAVE";
          presentCount++;
        } else {
          dayStatus = "GOOD";
          presentCount++;
        }
      } else if (leave) {
        dayStatus = "LEAVE";
        leaveCount++;
      } else if (dayOff) {
        dayStatus = "DAYOFF";
      } else if (holiday) {
        dayStatus = "HOLIDAY";
      } else if (dayDateStr < todayStr) {
        // If before join date, not absent
        const isBeforeJoin = employee.joinDate && dayDateStr < new Date(employee.joinDate).toISOString().slice(0, 10);
        if (isBeforeJoin) {
          dayStatus = "OFF_DAY";
        } else {
          // If it's a scheduled workday and past date with no attendance -> ABSENT
          const scheduledDays = (employee.workingDays || employee.shift?.workDays || "1,2,3,4,5")
            .split(",")
            .map((s) => s.trim());
          if (scheduledDays.includes(String(dayOfWeek))) {
            dayStatus = "ABSENT";
            absentCount++;
          } else {
            dayStatus = "OFF_DAY";
          }
        }
      }

      days.push({
        date: dayDateStr,
        day,
        dayOfWeek,
        dayStatus,
        attendance: att || null,
        holiday: holiday ? holiday.name : null,
        leave: leave ? leave.type?.name : null,
        isToday: dayDateStr === todayStr,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        employee,
        year,
        month,
        summary: {
          totalDays: daysInMonth,
          presentCount,
          lateCount,
          absentCount,
          leaveCount,
        },
        days,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
