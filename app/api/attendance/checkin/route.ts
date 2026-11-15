import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { dispatchTelegramNotification } from "@/lib/telegram";

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
      confirmExtraDay,
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

    const currentPin = employee.pin || "1234";
    const enteredPin = (pin || "").trim();

    // Check if check-in is submitted by logged-in employee (Session Auth bypasses PIN)
    const session = await getServerSession(authOptions);
    const isSessionAuth = Boolean(
      session?.user &&
        ((session.user as any).employeeCode === employee.code ||
          (session.user as any).id === employee.userId)
    );

    let isPinValid = isSessionAuth;
    if (!isPinValid && enteredPin) {
      if (currentPin.startsWith("$2")) {
        isPinValid = await bcrypt.compare(enteredPin, currentPin);
      } else {
        isPinValid = enteredPin === currentPin;
      }
    }

    if (!isPinValid) {
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

        // Notify Admins via in-app bell notification
        const adminUsers = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
          select: { id: true },
        });
        for (const adm of adminUsers) {
          await prisma.notification.create({
            data: {
              userId: adm.id,
              title: "ការជូនដំណឹងសុវត្ថិភាព Check-in",
              message: `បុគ្គលិក ${employee.code} (${employee.name}) ត្រូវបានចាក់សោ Check-in ១៥ នាទី ដោយសារវាយ PIN ខុសលើសពី ៥ ដង!`,
              type: "WARNING",
              link: "/setup/employees",
            },
          });
        }

        // Write Audit log
        await prisma.auditLog.create({
          data: {
            action: "PIN_LOCKOUT",
            entity: "Employee",
            details: `បុគ្គលិក ${employee.code} (${employee.name}) ត្រូវបានចាក់សោ Check-in ១៥ នាទី ដោយសារ PIN ខុស ៥ ដង`,
          },
        });

        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            remainingMinutes: 15,
            error:
              "អ្នកបានវាយ PIN ខុសចំនួន ៥ ដង! គណនីត្រូវបានចាក់សោសុវត្ថិភាពរយៈពេល ១៥ នាទី។ ប្រព័ន្ធបានជូនដំណឹងទៅកាន់ Admin រួចរាល់។",
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

    // Check if employee must change PIN (e.g. first check-in after reset)
    if (employee.mustChangePin) {
      return NextResponse.json(
        {
          success: false,
          mustChangePin: true,
          employeeCode: employee.code,
          error: "នេះជាការ Check-in លើកដំបូង ឬលេខ PIN ត្រូវបាន Reset។ សូមប្តូរលេខ PIN ថ្មីរបស់អ្នកជាមុនសិន!",
        },
        { status: 403 }
      );
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

    let activeBranch = employee.branch;
    const shift = employee.shift;

    // Check system settings for GPS and Grace period
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["require_gps", "grace_minutes"] } },
    });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const isGpsRequired = settingsMap.require_gps !== "false";
    const globalGrace = settingsMap.grace_minutes ? parseInt(settingsMap.grace_minutes) : undefined;

    // 2. Validate GPS Coordinates (supporting Main Branch + Allowed Other Branches)
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const userAcc = parseFloat(accuracy) || 10;
    let distanceMeters = 0;

    if (!isNaN(userLat) && !isNaN(userLng) && activeBranch.lat && activeBranch.lng) {
      distanceMeters = calculateDistanceMeters(
        userLat,
        userLng,
        activeBranch.lat,
        activeBranch.lng
      );
    }

    if (isGpsRequired) {
      if (isNaN(userLat) || isNaN(userLng)) {
        return NextResponse.json(
          { success: false, error: "មិនអាចចាប់ទីតាំង GPS បានឡើយ សូមបើក Location" },
          { status: 400 }
        );
      }

      // GPS accuracy threshold check (> 200m accuracy rejected)
      if (userAcc > 200) {
        return NextResponse.json(
          {
            success: false,
            error: `សញ្ញា GPS ខ្សោយពេក (ភាពត្រឹមត្រូវ ${Math.round(userAcc)}m)។ សូមទៅកាន់ទីវាល ឬបើក Wi-Fi/Location សាជាថ្មី`,
          },
          { status: 400 }
        );
      }

      let withinAllowed = distanceMeters <= (activeBranch.radiusMeters || 100);

      // If outside main branch, check allowed other branches (if configured)
      if (!withinAllowed && employee.otherBranchIds) {
        const otherIds = employee.otherBranchIds.split(",").map((id) => id.trim()).filter(Boolean);
        if (otherIds.length > 0) {
          const otherBranches = await prisma.branch.findMany({
            where: { id: { in: otherIds }, isActive: true },
          });

          for (const b of otherBranches) {
            if (b.lat && b.lng) {
              const d = calculateDistanceMeters(userLat, userLng, b.lat, b.lng);
              if (d <= (b.radiusMeters || 100)) {
                withinAllowed = true;
                activeBranch = b;
                distanceMeters = d;
                break;
              }
            }
          }
        }
      }

      if (!withinAllowed) {
        const allowedRadius = activeBranch.radiusMeters || 100;
        return NextResponse.json(
          {
            success: false,
            distance: distanceMeters,
            allowedRadius,
            error: `អ្នកនៅចម្ងាយ ${distanceMeters} ម៉ែត្រពីសាខា "${activeBranch.name}" (អនុញ្ញាតត្រឹម ${allowedRadius} ម៉ែត្រ)។ សូមចូលទៅក្នុងបរិវេណហាងមុននឹងស្កេន!`,
          },
          { status: 403 }
        );
      }
    }

    // Current Date & Time in Phnom Penh (UTC+7)
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);

    // Current day of week: 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
    const currentDayOfWeek = nowLocal.getUTCDay();
    const dayNamesKhmer: Record<number, string> = {
      0: "អាទិត្យ (Sunday)",
      1: "ចន្ទ (Monday)",
      2: "អង្គារ (Tuesday)",
      3: "ពុធ (Wednesday)",
      4: "ព្រហស្បតិ៍ (Thursday)",
      5: "សុក្រ (Friday)",
      6: "សៅរ៍ (Saturday)",
    };

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

      // 3. Check Scheduled Workdays vs Off Day
      const scheduledDaysStr = employee.workingDays || shift?.workDays || "1,2,3,4,5";
      const scheduledDaysList = scheduledDaysStr.split(",").map((d) => d.trim());
      const isWorkdayToday = scheduledDaysList.includes(String(currentDayOfWeek));

      if (!isWorkdayToday && !confirmExtraDay) {
        return NextResponse.json(
          {
            success: false,
            requireConfirmation: true,
            dayName: dayNamesKhmer[currentDayOfWeek],
            error: `ថ្ងៃនេះជាថ្ងៃសម្រាក (${dayNamesKhmer[currentDayOfWeek]}) តាមកាលវិភាគការងាររបស់អ្នក។ តើអ្នកពិតជាចង់ស្កេន Check-in (ធ្វើការបន្ថែម/OT) មែនឬទេ?`,
          },
          { status: 200 }
        );
      }

      // 4. Calculate LATE status based on Personal Schedule IN + Grace
      const personalStartTime =
        employee.shiftScheduleType === "CUSTOM" && employee.customStartTime
          ? employee.customStartTime
          : shift?.startTime || "07:00";

      const personalGrace =
        employee.customGraceMinutes !== null && employee.customGraceMinutes !== undefined
          ? employee.customGraceMinutes
          : globalGrace !== undefined
          ? globalGrace
          : shift?.graceMinutes || 15;

      let isLate = false;
      const [shiftH, shiftM] = personalStartTime.split(":").map(Number);
      const shiftStartTotalMinutes = shiftH * 60 + shiftM;

      if (currentTotalMinutes > shiftStartTotalMinutes + personalGrace) {
        isLate = true;
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
          branchId: activeBranch.id,
          date: todayStr,
          checkInAt: nowUtc,
          checkInLat: userLat,
          checkInLng: userLng,
          checkInAcc: userAcc,
          checkInPhoto: photoUrl || null,
          status: isLate ? "LATE" : "GOOD",
        },
      });

      // Dispatch Telegram Alert if late (non-blocking)
      if (isLate) {
        const lateMinutes = Math.max(1, currentTotalMinutes - (shiftStartTotalMinutes + personalGrace));

        dispatchTelegramNotification("LATE", {
          name: employee.name,
          code: employee.code,
          branch: activeBranch.name,
          time: `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`,
          lateMinutes,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: "CHECK_IN",
        status: attendance.status,
        branchName: activeBranch.name,
        distance: distanceMeters,
        isExtraDay: !isWorkdayToday,
        message: isLate
          ? `Check-in បានជោគជ័យ! ប៉ុន្តែអ្នកមកយឺតលើសម៉ោងកំណត់ (+${personalGrace}mn)`
          : (!isWorkdayToday
              ? `Check-in ថ្ងៃបន្ថែម/OT បានជោគជ័យ! 🎉`
              : `Check-in បានជោគជ័យទាន់ពេលវេលា (GOOD)! 🎉`),
        time: nowLocal.toISOString(),
      });
    } else {
      // CHECK_OUT (With Overnight Shift Support)
      let targetAttendance = existing;

      // If no attendance today, or already checked out, check yesterday for overnight shift
      if (!targetAttendance || !targetAttendance.checkInAt || targetAttendance.checkOutAt) {
        const yesterdayDate = new Date(nowLocal.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
        const yesterdayAtt = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: yesterdayStr,
            },
          },
        });

        if (yesterdayAtt && yesterdayAtt.checkInAt && !yesterdayAtt.checkOutAt) {
          targetAttendance = yesterdayAtt;
        }
      }

      if (!targetAttendance || !targetAttendance.checkInAt) {
        return NextResponse.json(
          {
            success: false,
            error: "អ្នកមិនទាន់បានស្កេន Check-in នៅឡើយទេ មិនអាច Check-out បានឡើយ!",
          },
          { status: 400 }
        );
      }

      if (targetAttendance.checkOutAt) {
        return NextResponse.json(
          {
            success: false,
            error: "អ្នកបានស្កេន Check-out រួចរាល់ហើយ!",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.attendance.update({
        where: { id: targetAttendance.id },
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
        status: updated.status,
        branchName: activeBranch.name,
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
