import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isWeakPin } from "@/lib/pin-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeCode, oldPin, newPin, confirmPin } = body;

    if (!employeeCode || !oldPin || !newPin) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលព័ត៌មានឱ្យបានគ្រប់គ្រាន់" },
        { status: 400 }
      );
    }

    if (newPin !== confirmPin) {
      return NextResponse.json(
        { success: false, error: "លេខ PIN ថ្មីទាំងពីរមិនដូចគ្នាទេ" },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: "លេខ PIN ត្រូវតែជាលេខ ៤ ខ្ទង់ (ឧទាហរណ៍៖ 5829)" },
        { status: 400 }
      );
    }

    if (isWeakPin(newPin)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "លេខ PIN នេះងាយស្រួលទាយពេក (ហាមប្រើ 1234, 0000, 1111... 4321, 1212, 2580)។ សូមជ្រើសលេខ PIN ផ្សេង!",
        },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { code: employeeCode.trim().toUpperCase() },
    });

    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញកូដបុគ្គលិកនេះឡើយ" },
        { status: 404 }
      );
    }

    // Check lockout
    const now = new Date();
    if (employee.pinLockedUntil && now < new Date(employee.pinLockedUntil)) {
      const remainingMinutes = Math.ceil(
        (new Date(employee.pinLockedUntil).getTime() - now.getTime()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          success: false,
          error: `គណនីត្រូវបានចាក់សោសុវត្ថិភាព ${remainingMinutes} នាទីទៀត ដោយសារវាយ PIN ខុសលើសពី ៥ ដង!`,
        },
        { status: 403 }
      );
    }

    // Check old PIN
    let isOldPinValid = false;
    const currentPin = employee.pin || "1234";
    if (currentPin.startsWith("$2")) {
      isOldPinValid = await bcrypt.compare(oldPin.trim(), currentPin);
    } else {
      isOldPinValid = oldPin.trim() === currentPin;
    }

    if (!isOldPinValid) {
      const attempts = (employee.pinFailedAttempts || 0) + 1;
      if (attempts >= 5) {
        const pinLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.employee.update({
          where: { id: employee.id },
          data: { pinFailedAttempts: attempts, pinLockedUntil },
        });

        // Notify Admins
        const adminUsers = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
          select: { id: true },
        });
        for (const adm of adminUsers) {
          await prisma.notification.create({
            data: {
              userId: adm.id,
              title: "ការជូនដំណឹងសុវត្ថិភាព PIN",
              message: `បុគ្គលិក ${employee.code} (${employee.name}) ត្រូវបានចាក់សោ ១៥ នាទី ដោយសារវាយ PIN ចាស់ខុស ៥ ដង!`,
              type: "WARNING",
              link: "/setup/employees",
            },
          });
        }

        return NextResponse.json(
          {
            success: false,
            error: "អ្នកបានវាយ PIN ចាស់ខុស ៥ ដង! គណនីត្រូវបានចាក់សោ ១៥ នាទី។",
          },
          { status: 403 }
        );
      }

      await prisma.employee.update({
        where: { id: employee.id },
        data: { pinFailedAttempts: attempts },
      });

      return NextResponse.json(
        {
          success: false,
          error: `លេខ PIN ចាស់មិនត្រឹមត្រូវឡើយ (ខុសលើកទី ${attempts}/5)`,
        },
        { status: 400 }
      );
    }

    // Hash new PIN and save
    const newPinHash = await bcrypt.hash(newPin.trim(), 10);
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        pin: newPinHash,
        mustChangePin: false,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: "CHANGE_PIN",
        entity: "Employee",
        details: `បុគ្គលិក ${employee.code} (${employee.name}) បានផ្លាស់ប្តូរលេខ PIN ដោយជោគជ័យ`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានផ្លាស់ប្តូរលេខ PIN ៤ ខ្ទង់ដោយជោគជ័យ! លោកអ្នកអាចប្រើ PIN ថ្មីនេះដើម្បី Check-in បានហើយ។",
    });
  } catch (error: any) {
    console.error("change-pin error:", error);
    return NextResponse.json(
      { success: false, error: "មានបញ្ហាបច្ចេកទេសក្នុងការប្តូរ PIN" },
      { status: 500 }
    );
  }
}
