import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBranchQrToken } from "@/lib/qr-validator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }

    // 1. Validate branch token
    const qrResult = await validateBranchQrToken(token);
    if (!qrResult.valid || !qrResult.branch) {
      return NextResponse.json(
        {
          success: false,
          error: qrResult.error || "QR នេះលែងមានសុពលភាព សូមទាក់ទងម្ចាស់ហាង",
        },
        { status: 404 }
      );
    }

    const branch = qrResult.branch;
    const sessionUser = session.user as any;

    // 2. Lookup employee linked to this user
    let employee = null;
    if (sessionUser.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: sessionUser.employeeId },
        include: { branch: true, shift: true },
      });
    }

    if (!employee && sessionUser.employeeCode) {
      employee = await prisma.employee.findUnique({
        where: { code: sessionUser.employeeCode },
        include: { branch: true, shift: true },
      });
    }

    if (!employee && sessionUser.id) {
      employee = await prisma.employee.findUnique({
        where: { userId: sessionUser.id },
        include: { branch: true, shift: true },
      });
    }

    if (!employee) {
      return NextResponse.json({
        success: true,
        state: "NO_EMPLOYEE_RECORD",
        message: "គណនីនេះមិនមែនជាបុគ្គលិកដែលត្រូវ Check-in ឡើយ (គ្មានកាលវិភាគការងារ)",
        canCreateProfile: ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(sessionUser.role),
        userRole: sessionUser.role,
        userName: sessionUser.name,
        branch: {
          id: branch.id,
          name: branch.name,
          radiusMeters: branch.radiusMeters,
        },
      });
    }

    // 3. Check Branch Authorization
    const allowedBranchIds = [
      employee.branchId,
      ...(employee.otherBranchIds
        ? employee.otherBranchIds.split(",").map((s: string) => s.trim())
        : []),
    ];

    if (!allowedBranchIds.includes(branch.id)) {
      return NextResponse.json({
        success: true,
        state: "UNAUTHORIZED_BRANCH",
        message: `លោកអ្នកមិនមានសិទ្ធិ Check-in នៅសាខា "${branch.name}" ឡើយ (អនុញ្ញាតតែ ${employee.branch.name})`,
        employee: {
          id: employee.id,
          name: employee.name,
          code: employee.code,
        },
        branch: {
          id: branch.id,
          name: branch.name,
        },
      });
    }

    // 4. Date calculation (Phnom Penh GMT+7)
    const now = new Date();
    const phnomPenhDateStr = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Phnom_Penh",
    }); // "YYYY-MM-DD"
    const currentPhnomPenhTime = now.toLocaleTimeString("km-KH", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Phnom_Penh",
    });

    // Check today's attendance
    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: phnomPenhDateStr,
        },
      },
    });

    // Overnight shift check: if employee checked in yesterday and shift crosses midnight without checkout
    if (!attendance) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
        timeZone: "Asia/Phnom_Penh",
      });
      const yesterdayAttendance = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: yesterdayStr,
          },
        },
      });

      if (yesterdayAttendance && yesterdayAttendance.checkInAt && !yesterdayAttendance.checkOutAt) {
        // Shift could be overnight
        const shiftStart = employee.shiftScheduleType === "CUSTOM" && employee.customStartTime ? employee.customStartTime : employee.shift?.startTime || "07:00";
        const shiftEnd = employee.shiftScheduleType === "CUSTOM" && employee.customEndTime ? employee.customEndTime : employee.shift?.endTime || "16:00";
        if (shiftEnd < shiftStart) {
          // Overnight shift! Continue yesterday's checkout
          attendance = yesterdayAttendance;
        }
      }
    }

    // 5. Calculate Status & Expected Late
    const shift = employee.shift;
    const shiftStartTime =
      employee.shiftScheduleType === "CUSTOM" && employee.customStartTime
        ? employee.customStartTime
        : shift?.startTime || "07:00";
    const graceMinutes =
      employee.shiftScheduleType === "CUSTOM" && employee.customGraceMinutes !== null
        ? employee.customGraceMinutes
        : shift?.graceMinutes ?? 15;

    const [currentH, currentM] = currentPhnomPenhTime.split(":").map(Number);
    const [shiftH, shiftM] = shiftStartTime.split(":").map(Number);
    const currentTotalMin = currentH * 60 + currentM;
    const shiftTotalMin = shiftH * 60 + shiftM;
    const diffMinutes = currentTotalMin - shiftTotalMin;

    // Check scheduled workday vs off-day (Extra Day)
    const phnomPenhDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" }));
    const currentDayOfWeek = String(phnomPenhDate.getDay()); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const scheduledDaysStr = employee.workingDays || shift?.workDays || "1,2,3,4,5";
    const scheduledDaysList = scheduledDaysStr.split(",").map((d) => d.trim());
    const isWorkdayToday = scheduledDaysList.includes(currentDayOfWeek);

    const isLate = isWorkdayToday && diffMinutes > graceMinutes;
    const expectedStatus = !isWorkdayToday
      ? "ថ្ងៃបន្ថែម (Extra Day)"
      : isLate
      ? `យឺត ${diffMinutes} នាទី`
      : "ទាន់ម៉ោង (On-time)";

    // Calculate Early Leave for Check-out
    const shiftEndTime =
      employee.shiftScheduleType === "CUSTOM" && employee.customEndTime
        ? employee.customEndTime
        : shift?.endTime || "16:00";
    const [endH, endM] = shiftEndTime.split(":").map(Number);
    const shiftEndTotalMin = endH * 60 + endM;

    let isEarlyLeave = false;
    if (shiftEndTotalMin >= shiftTotalMin) {
      isEarlyLeave = currentTotalMin < shiftEndTotalMin;
    } else {
      // Overnight
      isEarlyLeave = currentTotalMin < shiftEndTotalMin;
    }

    const checkOutExpectedStatus = isEarlyLeave
      ? "ចេញមុនម៉ោង (EARLY_LEAVE)"
      : "ត្រឹមត្រូវ (On-time)";

    // 6. Determine State (No Cooldown - Check-out allowed immediately at any time!)
    let state = "READY_CHECK_IN";

    if (!attendance || !attendance.checkInAt) {
      state = "READY_CHECK_IN";
    } else if (attendance.checkInAt && !attendance.checkOutAt) {
      state = "READY_CHECK_OUT";
    } else if (attendance.checkInAt && attendance.checkOutAt) {
      state = "ALREADY_CHECKED_OUT";
    }

    return NextResponse.json({
      success: true,
      state,
      expectedStatus,
      checkOutExpectedStatus,
      isEarlyLeave,
      isLate,
      currentPhnomPenhTime,
      date: phnomPenhDateStr,
      employee: {
        id: employee.id,
        name: employee.name,
        code: employee.code,
        position: employee.shift?.name || "Shift",
        mainBranchName: employee.branch.name,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        lat: branch.lat,
        lng: branch.lng,
        radiusMeters: branch.radiusMeters,
      },
      attendance: attendance
        ? {
            id: attendance.id,
            date: attendance.date,
            checkInAt: attendance.checkInAt,
            checkOutAt: attendance.checkOutAt,
            status: attendance.status,
            checkInDistance: attendance.checkInDistance,
            checkOutDistance: attendance.checkOutDistance,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
