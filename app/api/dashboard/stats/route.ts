import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || "all";

    // Format current date in Asia/Phnom_Penh (UTC+7)
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const defaultDateStr = nowLocal.toISOString().slice(0, 10);

    const dateStr = searchParams.get("date") || defaultDateStr;
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches DB "1,2,3,4,5" and "6,0")
    const dayOfWeek = targetDate.getUTCDay();

    // Current time in HH:mm (Phnom Penh)
    const currentHours = String(nowLocal.getUTCHours()).padStart(2, "0");
    const currentMinutes = String(nowLocal.getUTCMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const isToday = dateStr === defaultDateStr;

    // Filter by branch if selected
    const employeeWhere: any = { isActive: true };
    if (branchId !== "all") {
      employeeWhere.branchId = branchId;
    }

    const [
      allEmployees,
      attendances,
      leaves,
      holidays,
      dayOffs,
    ] = await Promise.all([
      prisma.employee.findMany({
        where: employeeWhere,
        include: {
          branch: true,
          department: true,
          position: true,
          shift: true,
        },
        orderBy: { code: "asc" },
      }),
      prisma.attendance.findMany({
        where: {
          date: dateStr,
          ...(branchId !== "all" && { branchId }),
        },
        include: {
          employee: {
            include: { branch: true, position: true, shift: true },
          },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          fromDate: { lte: new Date(`${dateStr}T23:59:59.999Z`) },
          toDate: { gte: new Date(`${dateStr}T00:00:00.000Z`) },
          status: "APPROVED",
        },
        include: { employee: true, type: true },
      }),
      prisma.holiday.findMany({
        where: {
          date: {
            gte: new Date(`${dateStr}T00:00:00.000Z`),
            lte: new Date(`${dateStr}T23:59:59.999Z`),
          },
          ...(branchId !== "all" ? { OR: [{ branchId }, { branchId: null }] } : {}),
        },
      }),
      prisma.dayOff.findMany({
        where: {
          date: {
            gte: new Date(`${dateStr}T00:00:00.000Z`),
            lte: new Date(`${dateStr}T23:59:59.999Z`),
          },
        },
        include: { employee: true },
      }),
    ]);

    // Active & Hidden counts
    const activeEmployeesCount = allEmployees.length;
    const hiddenInReportCount = allEmployees.filter((e) => e.hiddenInReport).length;

    // Checked-in Employee IDs
    const checkedInEmployeeIds = new Set(attendances.map((a) => a.employeeId));
    const leaveEmployeeIds = new Set(leaves.map((l) => l.employeeId));
    const dayOffEmployeeIds = new Set(dayOffs.map((d) => d.employeeId));

    // Calculate Absents and Not Yet Started
    let absentsCount = 0;
    let notYetStartedCount = 0;
    const absentsAndOthersList: any[] = [];

    // 1. Add Holidays to table
    if (holidays.length > 0) {
      holidays.forEach((h) => {
        absentsAndOthersList.push({
          type: "HOLIDAY",
          name: h.name,
          subtitle: "ថ្ងៃបុណ្យឈប់សម្រាកផ្លូវការ",
          note: "ទូទាំងស្ថាប័ន / សាខា",
          statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        });
      });
    }

    // 2. Add Approved Leaves to table
    leaves.forEach((l) => {
      const emp = allEmployees.find((e) => e.id === l.employeeId);
      if (emp) {
        absentsAndOthersList.push({
          type: "LEAVE",
          name: emp.name,
          code: emp.code,
          subtitle: `${emp.position?.name || ""} • ${emp.branch?.name || ""}`,
          note: `សុំច្បាប់៖ ${l.type?.name || "ច្បាប់អនុញ្ញាត"}`,
          statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        });
      }
    });

    // 3. Add Scheduled Dayoffs
    dayOffs.forEach((d) => {
      const emp = allEmployees.find((e) => e.id === d.employeeId);
      if (emp) {
        absentsAndOthersList.push({
          type: "DAYOFF",
          name: emp.name,
          code: emp.code,
          subtitle: `${emp.position?.name || ""} • ${emp.branch?.name || ""}`,
          note: d.reason || "ថ្ងៃសម្រាកវេន",
          statusColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        });
      }
    });

    // 4. Analyze each employee for Absent vs Not Yet Started vs Off Day
    allEmployees.forEach((emp) => {
      // If already checked in, skip
      if (checkedInEmployeeIds.has(emp.id)) return;
      // If on leave or explicit day off, skip
      if (leaveEmployeeIds.has(emp.id) || dayOffEmployeeIds.has(emp.id)) return;

      // Join Date check: days before join date never count as absent
      if (emp.joinDate) {
        const jDate = new Date(emp.joinDate);
        jDate.setHours(0, 0, 0, 0);
        if (targetDate < jDate) return;
      }

      const scheduledDaysStr = emp.workingDays || emp.shift?.workDays || "1,2,3,4,5";
      const scheduledDays = scheduledDaysStr.split(",").map((d: string) => d.trim());
      const isWorkDay = scheduledDays.includes(String(dayOfWeek));

      if (!isWorkDay) {
        // Off day per individual schedule
        absentsAndOthersList.push({
          type: "DAYOFF",
          name: emp.name,
          code: emp.code,
          subtitle: `${emp.position?.name || ""} • ${emp.branch?.name || ""}`,
          note: "ថ្ងៃសម្រាកប្រចាំសប្តាហ៍ (Day Off)",
          statusColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        });
        return;
      }

      const shiftStart =
        emp.shiftScheduleType === "CUSTOM" && emp.customStartTime
          ? emp.customStartTime
          : emp.shift?.startTime || "07:00";

      const shiftEnd =
        emp.shiftScheduleType === "CUSTOM" && emp.customEndTime
          ? emp.customEndTime
          : emp.shift?.endTime || "16:00";

      if (isToday) {
        if (currentTimeStr < shiftStart) {
          // Not yet started
          notYetStartedCount++;
        } else if (currentTimeStr >= shiftEnd) {
          // Shift ended and not checked in -> ABSENT
          absentsCount++;
          absentsAndOthersList.push({
            type: "ABSENT",
            name: emp.name,
            code: emp.code,
            subtitle: `${emp.position?.name || ""} • ${emp.branch?.name || ""}`,
            note: `អវត្តមាន (ផុតវេនម៉ោង ${shiftEnd})`,
            statusColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          });
        } else {
          // Currently during shift hours but no check-in yet -> Late or Pending
          absentsCount++;
          absentsAndOthersList.push({
            type: "ABSENT",
            name: emp.name,
            code: emp.code,
            subtitle: `${emp.position?.name || ""} • ${emp.branch?.name || ""}`,
            note: `មិនទាន់មក (វេន ${shiftStart} - ${shiftEnd})`,
            statusColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          });
        }
      } else {
        // Past date with no check in -> Absent
        absentsCount++;
        absentsAndOthersList.push({
          type: "ABSENT",
          name: emp.name,
          code: emp.code,
          subtitle: `${emp.position?.name || ""} • ${emp.branch?.name || ""}`,
          note: `អវត្តមានពេញមួយថ្ងៃ (វេន ${shiftStart} - ${shiftEnd})`,
          statusColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        });
      }
    });

    const totalDayOffCount = absentsAndOthersList.filter(
      (item) => item.type === "DAYOFF"
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        filter: {
          date: dateStr,
          branchId,
          currentTime: currentTimeStr,
        },
        counts: {
          activeEmployees: activeEmployeesCount,
          hiddenInReport: hiddenInReportCount,
          attendances: attendances.length,
          requestLeaves: leaves.length,
          absents: absentsCount,
          notYetStarted: notYetStartedCount,
          holiday: holidays.length,
          dayoff: totalDayOffCount,
        },
        attendances,
        absentsAndOthers: absentsAndOthersList,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
