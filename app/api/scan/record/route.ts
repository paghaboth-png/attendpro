import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBranchQrToken } from "@/lib/qr-validator";
import { dispatchTelegramNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "សូមចូលប្រើប្រព័ន្ធជាមុនសិន (Unauthorized)" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token, lat, lng, accuracy, action, userAgent } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing QR token" },
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

    // 2. Lookup employee
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

    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { success: false, error: "គណនីនេះមិនមែនជាបុគ្គលិកសកម្មដែលត្រូវ Check-in ឡើយ" },
        { status: 403 }
      );
    }

    // 3. Branch authorization
    const allowedBranchIds = [
      employee.branchId,
      ...(employee.otherBranchIds
        ? employee.otherBranchIds.split(",").map((s: string) => s.trim())
        : []),
    ];

    if (!allowedBranchIds.includes(branch.id)) {
      return NextResponse.json(
        {
          success: false,
          error: `លោកអ្នកមិនមានសិទ្ធិ Check-in នៅសាខា "${branch.name}" ឡើយ (អនុញ្ញាតតែ ${employee.branch.name})`,
        },
        { status: 403 }
      );
    }

    // 4. GPS Distance Check
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const userAcc = parseFloat(accuracy) || 10;

    if (isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        {
          success: false,
          error: "មិនអាចចាប់ទីតាំង GPS បានឡើយ! សូមបើក Location លើទូរស័ព្ទរបស់អ្នក",
        },
        { status: 400 }
      );
    }

    const distanceMeters = calculateDistanceMeters(
      userLat,
      userLng,
      branch.lat,
      branch.lng
    );

    const maxRadius = branch.radiusMeters || 100;
    if (distanceMeters > maxRadius) {
      return NextResponse.json(
        {
          success: false,
          error: `អ្នកនៅឆ្ងាយពីហាង ${distanceMeters} ម៉ែត្រ (កាំរង្វង់អនុញ្ញាត ${maxRadius} ម៉ែត្រ)។ សូមស្កេននៅក្នុងហាង!`,
          distanceMeters,
          maxRadius,
        },
        { status: 400 }
      );
    }

    // 5. Date calculation
    const now = new Date();
    const phnomPenhDateStr = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Phnom_Penh",
    });
    const currentPhnomPenhTime = now.toLocaleTimeString("km-KH", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Phnom_Penh",
    });

    // Check existing attendance for today
    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: phnomPenhDateStr,
        },
      },
    });

    // Overnight shift check: if employee checked in yesterday
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
        const shiftStart = employee.shiftScheduleType === "CUSTOM" && employee.customStartTime ? employee.customStartTime : employee.shift?.startTime || "07:00";
        const shiftEnd = employee.shiftScheduleType === "CUSTOM" && employee.customEndTime ? employee.customEndTime : employee.shift?.endTime || "16:00";
        if (shiftEnd < shiftStart) {
          attendance = yesterdayAttendance;
        }
      }
    }

    const targetAction = action || (attendance && attendance.checkInAt && !attendance.checkOutAt ? "CHECK_OUT" : "CHECK_IN");

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

    const isLate = diffMinutes > graceMinutes;
    const computedStatus = isLate ? "LATE" : "GOOD";

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
      isEarlyLeave = currentTotalMin < shiftEndTotalMin;
    }

    let resultAttendance;

    if (targetAction === "CHECK_IN") {
      if (attendance && attendance.checkInAt) {
        return NextResponse.json(
          {
            success: false,
            error: "អ្នកបាន Check-in ថ្ងៃនេះរួចរាល់ហើយ!",
          },
          { status: 400 }
        );
      }

      resultAttendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: phnomPenhDateStr,
          },
        },
        update: {
          branchId: branch.id,
          checkInAt: now,
          checkInLat: userLat,
          checkInLng: userLng,
          checkInAcc: userAcc,
          checkInDistance: distanceMeters,
          method: "QR",
          deviceInfo: userAgent || null,
          status: computedStatus,
        },
        create: {
          employeeId: employee.id,
          branchId: branch.id,
          date: phnomPenhDateStr,
          checkInAt: now,
          checkInLat: userLat,
          checkInLng: userLng,
          checkInAcc: userAcc,
          checkInDistance: distanceMeters,
          method: "QR",
          deviceInfo: userAgent || null,
          status: computedStatus,
        },
      });

      // Telegram notification
      if (isLate) {
        try {
          await dispatchTelegramNotification("LATE", {
            name: employee.name,
            code: employee.code,
            branch: branch.name,
            time: currentPhnomPenhTime,
            lateMinutes: diffMinutes,
          });
        } catch {}
      }

    } else if (targetAction === "CHECK_OUT") {
      if (!attendance || !attendance.checkInAt) {
        return NextResponse.json(
          {
            success: false,
            error: "មិនទាន់មានកំណត់ត្រា Check-in ថ្ងៃនេះឡើយ!",
          },
          { status: 400 }
        );
      }

      resultAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutAt: now,
          checkOutLat: userLat,
          checkOutLng: userLng,
          checkOutAcc: userAcc,
          checkOutDistance: distanceMeters,
          deviceInfo: userAgent || attendance.deviceInfo,
          status: isEarlyLeave ? "EARLY_LEAVE" : attendance.status,
        },
      });

    } else if (targetAction === "UPDATE_CHECKOUT") {
      if (!attendance) {
        return NextResponse.json(
          { success: false, error: "រកមិនឃើញកំណត់ត្រាវត្តមានឡើយ" },
          { status: 404 }
        );
      }

      const prevCheckout = attendance.checkOutAt;

      // Status update on re-checkout: if still early, keep EARLY_LEAVE;
      // if now on time / shift ended, revert from EARLY_LEAVE to check-in status (LATE or GOOD)
      let newStatus = attendance.status;
      if (isEarlyLeave) {
        newStatus = "EARLY_LEAVE";
      } else if (attendance.status === "EARLY_LEAVE") {
        if (attendance.checkInAt) {
          const inTime = new Date(attendance.checkInAt).toLocaleTimeString("en-GB", {
            timeZone: "Asia/Phnom_Penh",
            hour12: false,
          });
          const [inH, inM] = inTime.split(":").map(Number);
          const inTotalMin = inH * 60 + inM;
          newStatus = inTotalMin > shiftTotalMin + graceMinutes ? "LATE" : "GOOD";
        } else {
          newStatus = "GOOD";
        }
      }

      resultAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutAt: now,
          checkOutLat: userLat,
          checkOutLng: userLng,
          checkOutAcc: userAcc,
          checkOutDistance: distanceMeters,
          status: newStatus,
        },
      });

      // Audit Log for checkout update
      try {
        await prisma.auditLog.create({
          data: {
            userId: sessionUser.id || null,
            action: "UPDATE_CHECKOUT",
            entity: `Attendance: ${employee.code}`,
            details: `បុគ្គលិក ${employee.name} (${employee.code}) បានធ្វើបច្ចុប្បន្នភាព Check-out ពី ${prevCheckout ? prevCheckout.toISOString() : "none"} ទៅ ${now.toISOString()}${isEarlyLeave ? " (ចេញមុនម៉ោង)" : ""}`,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      action: targetAction,
      message:
        targetAction === "CHECK_IN"
          ? `Check-in ជោគជ័យ! (${isLate ? `យឺត ${diffMinutes} នាទី` : "ទាន់ម៉ោង"})`
          : targetAction === "UPDATE_CHECKOUT"
          ? `ធ្វើបច្ចុប្បន្នភាព Check-out ដោយជោគជ័យ!${isEarlyLeave ? " (ចេញមុនម៉ោង)" : ""}`
          : isEarlyLeave
          ? "Check-out ជោគជ័យ! (ចេញមុនម៉ោង)"
          : "Check-out ជោគជ័យ!",
      data: {
        attendanceId: resultAttendance?.id,
        action: targetAction,
        time: currentPhnomPenhTime,
        status: resultAttendance?.status,
        isLate,
        isEarlyLeave,
        distanceMeters,
        branchName: branch.name,
        employeeName: employee.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
