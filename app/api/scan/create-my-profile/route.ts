import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateBranchQrToken } from "@/lib/qr-validator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "សូមចូលប្រើប្រព័ន្ធជាមុនសិន (Unauthorized)" },
        { status: 401 }
      );
    }

    const sessionUser = session.user as any;
    const userRole = sessionUser.role;

    // Only Admin or Super Admin can self-create their employee profile via this endpoint
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "មានតែ Admin, Super Admin ឬ Manager ទើបអាចបង្កើតប្រវត្តិបុគ្គលិកដោយខ្លួនឯងបាន" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, branchId: reqBranchId, shiftId: reqShiftId } = body;

    // 1. Resolve branch
    let targetBranchId = reqBranchId;
    if (!targetBranchId && token) {
      const qrRes = await validateBranchQrToken(token);
      if (qrRes.valid && qrRes.branch) {
        targetBranchId = qrRes.branch.id;
      }
    }

    if (!targetBranchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
      targetBranchId = firstBranch?.id;
    }

    if (!targetBranchId) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញសាខាសម្រាប់ភ្ជាប់ឡើយ" },
        { status: 400 }
      );
    }

    // 2. Check if user already has an employee profile
    const existingEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: sessionUser.id },
          ...(sessionUser.phone ? [{ phone: sessionUser.phone }] : []),
        ],
      },
      include: { branch: true, shift: true },
    });

    if (existingEmp) {
      // Ensure userId is linked
      if (existingEmp.userId !== sessionUser.id) {
        await prisma.employee.update({
          where: { id: existingEmp.id },
          data: { userId: sessionUser.id },
        });
      }
      return NextResponse.json({
        success: true,
        message: "គណនីមានប្រវត្តិបុគ្គលិករួចហើយ",
        employee: existingEmp,
      });
    }

    // 3. Resolve Company
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញព័ត៌មានក្រុមហ៊ុនឡើយ" },
        { status: 400 }
      );
    }

    // 4. Resolve Shift
    let shiftId = reqShiftId;
    if (!shiftId) {
      const morningShift = await prisma.shift.findFirst({
        where: { name: { contains: "ចន្ទ" } },
      });
      shiftId = morningShift?.id;
    }
    if (!shiftId) {
      const anyShift = await prisma.shift.findFirst();
      shiftId = anyShift?.id;
    }
    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: "សូមបង្កើតវេនការងារក្នុងប្រព័ន្ធជាមុនសិន" },
        { status: 400 }
      );
    }

    // 5. Resolve Department and Position
    let dept = await prisma.department.findFirst({ where: { companyId: company.id } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: "រដ្ឋបាល & គ្រប់គ្រង (Management)", companyId: company.id },
      });
    }

    let pos = await prisma.position.findFirst({ where: { companyId: company.id } });
    if (!pos) {
      pos = await prisma.position.create({
        data: { name: "ម្ចាស់ហាង / អ្នកគ្រប់គ្រង (Owner)", companyId: company.id },
      });
    }

    // 6. Generate next unique EMP code
    const allEmps = await prisma.employee.findMany({ select: { code: true } });
    let maxNum = 0;
    for (const e of allEmps) {
      const match = e.code.match(/EMP(\d+)/i);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextCode = `EMP${String(maxNum + 1).padStart(3, "0")}`;

    // 7. Hash default PIN 1234
    const pinHash = await bcrypt.hash("1234", 10);

    // 8. Create Employee Profile
    const newEmp = await prisma.employee.create({
      data: {
        companyId: company.id,
        code: nextCode,
        name: sessionUser.name || "ម្ចាស់ហាង (Owner)",
        phone: sessionUser.phone || null,
        branchId: targetBranchId,
        departmentId: dept.id,
        positionId: pos.id,
        shiftId,
        workingDays: "1,2,3,4,5", // Monday to Friday
        shiftScheduleType: "TEMPLATE",
        customGraceMinutes: 15,
        employmentType: "FULL_TIME",
        pin: pinHash,
        mustChangePin: false,
        pinFailedAttempts: 0,
        baseSalary: 0,
        salaryType: "MONTHLY",
        userId: sessionUser.id,
        isActive: true,
        hiddenInReport: true, // Default hidden from absence/payroll reports as requested
      },
      include: {
        branch: true,
        shift: true,
        position: true,
        department: true,
      },
    });

    // 9. Record Audit Log
    await prisma.auditLog.create({
      data: {
        action: "LINK_ADMIN_EMPLOYEE_PROFILE",
        entity: `Employee: ${newEmp.code} (${newEmp.name})`,
        details: `បានបង្កើត និងភ្ជាប់ប្រវត្តិបុគ្គលិកសម្រាប់ ${userRole} (${sessionUser.name}) ដោយជោគជ័យ (អាច Check-in/out បាន)`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានបង្កើតប្រវត្តិបុគ្គលិកដោយជោគជ័យ",
      employee: newEmp,
    });
  } catch (error: any) {
    console.error("create-my-profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "មានបញ្ហាក្នុងការបង្កើតប្រវត្តិបុគ្គលិក" },
      { status: 500 }
    );
  }
}
