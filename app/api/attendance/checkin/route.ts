import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Calculate distance between two GPS coordinates in meters (Haversine Formula)
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
    const body = await req.json();
    const {
      employeeCode,
      pin,
      action, // "CHECK_IN" or "CHECK_OUT"
      lat,
      lng,
      accuracy,
      photoUrl,
    } = body;

    if (!employeeCode) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលកូដបុគ្គលិក (Employee Code)" },
        { status: 400 }
      );
    }

    // 1. Find Employee
    const employee = await prisma.employee.findUnique({
      where: { code: employeeCode.trim().toUpperCase() },
      include: {
        branch: true,
        shift: true,
      },
    });

    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញបុគ្គលិក ឬគណនីត្រូវបានផ្អាក" },
        { status: 404 }
      );
    }

    // 2. Security PIN & Rate Limiting Check
    const nowTime = new Date();
    if (employee.pinLockedUntil && nowTime < new Date(employee.pinLockedUntil)) {
      const remainingMinutes = Math.ceil(
        (new Date(employee.pinLockedUntil).getTime() - nowTime.getTime()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          remainingMinutes,
          error: `គណនីនេះត្រូវបានចាក់សោសុវត្ថិភាព ${remainingMinutes} នាទីទៀត ដោយសារវាយ PIN ខុសលើសពី ៥ ដង។ សូមទាក់ទង Admin ឬរង់ចាំដល់ផុតម៉ោងចាក់សោ!`,
        },
        { status: 403 }
      );
    }

    const expectedPin = employee.pin || "1234";
    const enteredPin = (pin || "").trim();

    if (!enteredPin || enteredPin !== expectedPin) {
      const attempts = (employee.pinFailedAttempts || 0) + 1;
      if (attempts >= 5) {
        const pinLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            pinFailedAttempts: attempts,
            pinLockedUntil,
          },
        });
        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            remainingMinutes: 15,
            error:
              "អ្នកបានវាយ PIN ខុសចំនួន ៥ ដង! គណនីត្រូវបានចាក់សោសុវត្ថិភាពរយៈពេល ១៥ នាទី។ សូមទាក់ទង Admin ឬរង់ចាំមុននឹងសាកល្បងម្តងទៀត។",
          },
          { status: 403 }
        );
      } else {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { pinFailedAttempts: attempts },
        });
        return NextResponse.json(
          {
            success: false,
            attempts,
            error: `លេខកូដសម្ងាត់ PIN មិនត្រឹមត្រូវ! (ខុសលើកទី ${attempts}/5 ដង - ខុស ៥ ដងចាក់សោ ១៥ នាទី)`,
          },
          { status: 401 }
        );
      }
    }

    // PIN is correct - reset failed attempts and unlock if needed
    if (employee.pinFailedAttempts > 0 || employee.pinLockedUntil) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      });
    }

    const branch = employee.branch;
    const shift = employee.shift;

    // Check system settings for GPS and Grace period
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["require_gps", "grace_minutes"] } },
    });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const isGpsRequired = settingsMap.require_gps !== "false";
    const globalGrace = settingsMap.grace_minutes ? parseInt(settingsMap.grace_minutes) : undefined;

    // 2. Validate GPS Coordinates (if GPS is required)
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const userAcc = parseFloat(accuracy) || 10;
    let distanceMeters = 0;

    if (!isNaN(userLat) && !isNaN(userLng) && branch.lat && branch.lng) {
      distanceMeters = calculateDistanceMeters(
        userLat,
        userLng,
        branch.lat,
        branch.lng
      );
    }

    if (isGpsRequired) {
      if (isNaN(userLat) || isNaN(userLng)) {
        return NextResponse.json(
          { success: false, error: "មិនអាចចាប់ទីតាំង GPS បានឡើយ សូមបើក Location" },
          { status: 400 }
        );
      }

      // GPS spoofing / accuracy threshold check (> 200m accuracy rejected)
      if (userAcc > 200) {
        return NextResponse.json(
          {
            success: false,
            error: `សញ្ញា GPS ខ្សោយពេក (ភាពត្រឹមត្រូវ ${Math.round(userAcc)}m)។ សូមទៅកាន់ទីវាល ឬបើក Wi-Fi/Location សាជាថ្មី`,
          },
          { status: 400 }
        );
      }

      const allowedRadius = branch.radiusMeters || 100;
      if (distanceMeters > allowedRadius) {
        return NextResponse.json(
          {
            success: false,
            distance: distanceMeters,
            allowedRadius,
            error: `អ្នកនៅចម្ងាយ ${distanceMeters} ម៉ែត្រពីហាង "${branch.name}" (អនុញ្ញាតត្រឹម ${allowedRadius} ម៉ែត្រ)។ សូមចូលទៅក្នុងបរិវេណហាងមុននឹងស្កេន!`,
          },
          { status: 403 }
        );
      }
    }

    // Current Date & Time in Phnom Penh
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);

    // Current time in HH:mm
    const currentHours = nowLocal.getUTCHours();
    const currentMinutes = nowLocal.getUTCMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // Check existing attendance for today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayStr,
        },
      },
    });

    if (action === "CHECK_IN") {
      if (existing && existing.checkInAt) {
        return NextResponse.json(
          {
            success: false,
            error: "អ្នកបានស្កេន Check-in រួចរាល់ហើយសម្រាប់ថ្ងៃនេះ!",
            alreadyCheckedIn: true,
          },
          { status: 400 }
        );
      }

      // Calculate LATE status based on shift startTime + graceMinutes
      let isLate = false;
      if (shift && shift.startTime) {
        const [shiftH, shiftM] = shift.startTime.split(":").map(Number);
        const shiftStartTotalMinutes = shiftH * 60 + shiftM;
        const graceMinutes =
          globalGrace !== undefined ? globalGrace : shift.graceMinutes || 15;

        if (currentTotalMinutes > shiftStartTotalMinutes + graceMinutes) {
          isLate = true;
        }
      }

      const attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayStr,
          },
        },
        update: {
          checkInAt: nowUtc,
          checkInLat: userLat,
          checkInLng: userLng,
          checkInAcc: userAcc,
          checkInPhoto: photoUrl || null,
          status: isLate ? "LATE" : "GOOD",
        },
        create: {
          employeeId: employee.id,
          branchId: branch.id,
          date: todayStr,
          checkInAt: nowUtc,
          checkInLat: userLat,
          checkInLng: userLng,
          checkInAcc: userAcc,
          checkInPhoto: photoUrl || null,
          status: isLate ? "LATE" : "GOOD",
        },
      });

      return NextResponse.json({
        success: true,
        action: "CHECK_IN",
        status: attendance.status,
        distance: distanceMeters,
        message: isLate
          ? `Check-in បានជោគជ័យ! ប៉ុន្តែអ្នកមកយឺតលើសម៉ោងកំណត់ (+${shift?.graceMinutes || 15}mn)`
          : "Check-in បានជោគជ័យទាន់ពេលវេលា (GOOD)! 🎉",
        time: nowLocal.toISOString(),
      });
    } else {
      // CHECK_OUT
      if (!existing || !existing.checkInAt) {
        return NextResponse.json(
          {
            success: false,
            error: "អ្នកមិនទាន់បានស្កេន Check-in នៅឡើយទេ មិនអាច Check-out បានឡើយ!",
          },
          { status: 400 }
        );
      }

      if (existing.checkOutAt) {
        return NextResponse.json(
          {
            success: false,
            error: "អ្នកបានស្កេន Check-out រួចរាល់ហើយសម្រាប់ថ្ងៃនេះ!",
          },
          { status: 400 }
        );
      }

      const attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutAt: nowUtc,
          checkOutLat: userLat,
          checkOutLng: userLng,
          checkOutAcc: userAcc,
          checkOutPhoto: photoUrl || null,
        },
      });

      return NextResponse.json({
        success: true,
        action: "CHECK_OUT",
        status: attendance.status,
        distance: distanceMeters,
        message: "Check-out បានជោគជ័យ! សូមអរគុណសម្រាប់ការបំពេញការងារថ្ងៃនេះ 😊",
        time: nowLocal.toISOString(),
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
