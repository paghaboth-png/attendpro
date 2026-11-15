import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateSecurePin, isWeakPin, generateReadableTempPassword } from "@/lib/pin-utils";
import { normalizePhoneNumber } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const departmentId = searchParams.get("departmentId");
    const query = searchParams.get("q") || "";

    const where: any = {};
    if (branchId && branchId !== "all") where.branchId = branchId;
    if (departmentId && departmentId !== "all") where.departmentId = departmentId;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        branch: true,
        department: true,
        position: true,
        shift: {
          include: {
            templates: { orderBy: { startTime: "asc" } },
          },
        },
        user: { select: { id: true, email: true, phone: true, role: true, isActive: true } },
      },
      orderBy: { code: "asc" },
    });

    // Mask PIN for security so plain PIN or raw hash is never sent to the browser
    const maskedEmployees = employees.map((emp) => ({
      ...emp,
      pin: emp.pin ? "●●●●" : "●●●●",
    }));

    return NextResponse.json({ success: true, data: maskedEmployees });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      code,
      phone,
      branchId,
      departmentId,
      positionId,
      shiftId,
      workingDays,
      shiftScheduleType,
      customStartTime,
      customEndTime,
      daySchedules,
      customGraceMinutes,
      joinDate,
      endProbationDate,
      endContractDate,
      otherBranchIds,
      employmentType,
      pin,
      baseSalary,
      salaryType,
      email,
      password,
      role,
      isActive,
      hiddenInReport,
    } = body;

    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });

    // Check code uniqueness
    const existingCode = await prisma.employee.findUnique({ where: { code } });
    if (existingCode) {
      return NextResponse.json({ success: false, error: "កូដបុគ្គលិកនេះមានក្នុងប្រព័ន្ធរួចហើយ" }, { status: 400 });
    }

    // Check duplicate phone or email
    const normPhone = phone ? normalizePhoneNumber(phone) : null;
    const normEmail = email ? email.trim().toLowerCase() : null;

    if (normPhone) {
      const dupPhoneUser = await prisma.user.findFirst({ where: { phone: normPhone } });
      const dupPhoneEmp = await prisma.employee.findFirst({ where: { phone: normPhone } });
      if (dupPhoneUser || dupPhoneEmp) {
        return NextResponse.json(
          { success: false, error: "លេខទូរស័ព្ទនេះមានក្នុងប្រព័ន្ធរួចហើយ សូមពិនិត្យឡើងវិញ" },
          { status: 400 }
        );
      }
    }

    if (normEmail) {
      const dupEmail = await prisma.user.findFirst({ where: { email: normEmail } });
      if (dupEmail) {
        return NextResponse.json(
          { success: false, error: "អ៊ីមែលនេះមានក្នុងប្រព័ន្ធរួចហើយ សូមពិនិត្យឡើងវិញ" },
          { status: 400 }
        );
      }
    }

    // Role permission check: only Super Admin can create Admin or Manager
    const session = await getServerSession(authOptions);
    const requesterRole = (session?.user as any)?.role;
    let targetRole = role || "EMPLOYEE";
    if (["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(targetRole) && requesterRole !== "SUPER_ADMIN") {
      targetRole = "EMPLOYEE";
    }

    let userId: string | null = null;
    let createdTempPassword: string | null = null;

    // Create login account if enabled (or email/password provided)
    const shouldCreateLogin = body.createLoginAccount || (email && password);
    if (shouldCreateLogin) {
      if (!normPhone && !normEmail) {
        return NextResponse.json(
          { success: false, error: "គណនី Login តម្រូវឱ្យមានលេខទូរស័ព្ទ ឬអ៊ីមែលយ៉ាងតិចមួយ" },
          { status: 400 }
        );
      }

      const finalPassword =
        password && password.length >= 8 ? password : generateReadableTempPassword();
      createdTempPassword = finalPassword;
      const passwordHash = await bcrypt.hash(finalPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          email: normEmail,
          phone: normPhone,
          name,
          passwordHash,
          role: targetRole,
          mustChangePassword: true,
          isActive: true,
        },
      });
      userId = newUser.id;
    }

        const rawPin = pin && /^\d{4}$/.test(pin) && !isWeakPin(pin) ? pin : generateSecurePin();
        const pinHash = await bcrypt.hash(rawPin, 10);

        const employee = await prisma.employee.create({
          data: {
            companyId: company.id,
            code,
            name,
            phone: phone || null,
            branchId,
            departmentId,
            positionId,
            shiftId,
            workingDays: workingDays || "1,2,3,4,5",
            shiftScheduleType: shiftScheduleType || "TEMPLATE",
            customStartTime: customStartTime || null,
            customEndTime: customEndTime || null,
            daySchedules: daySchedules ? (typeof daySchedules === "string" ? daySchedules : JSON.stringify(daySchedules)) : null,
            customGraceMinutes: customGraceMinutes !== undefined ? parseInt(customGraceMinutes) : 15,
            joinDate: joinDate ? new Date(joinDate) : new Date(),
            endProbationDate: endProbationDate ? new Date(endProbationDate) : null,
            endContractDate: endContractDate ? new Date(endContractDate) : null,
            otherBranchIds: Array.isArray(otherBranchIds) ? otherBranchIds.join(",") : (otherBranchIds || null),
            employmentType: employmentType || "FULL_TIME",
            pin: pinHash,
            mustChangePin: true,
            pinFailedAttempts: 0,
            pinLockedUntil: null,
            baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : 200,
            salaryType: salaryType || "MONTHLY",
            userId,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            hiddenInReport: hiddenInReport !== undefined ? Boolean(hiddenInReport) : false,
          },
          include: {
            branch: true,
            department: true,
            position: true,
            shift: true,
          },
        });

        // Write audit log
        await prisma.auditLog.create({
          data: {
            action: "CREATE_EMPLOYEE",
            entity: "Employee",
            details: `បានបង្កើតបុគ្គលិកថ្មី ${employee.code} (${employee.name})`,
          },
        });

        return NextResponse.json({
          success: true,
          data: { ...employee, pin: "●●●●" },
          initialPin: rawPin,
          tempPassword: createdTempPassword,
          username: normPhone || normEmail,
        });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
