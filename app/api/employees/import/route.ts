import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { generateReadableTempPassword } from "@/lib/pin-utils";
import { normalizePhoneNumber } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Admin";

    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Admin / Super Admin only)" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const isPreview = formData.get("preview") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "មិនមាន File ត្រូវបានជ្រើសរើស" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញព័ត៌មានក្រុមហ៊ុន" },
        { status: 404 }
      );
    }

    const [branches, departments, positions, shifts, existingEmployees, existingUsers] =
      await Promise.all([
        prisma.branch.findMany(),
        prisma.department.findMany(),
        prisma.position.findMany(),
        prisma.shift.findMany(),
        prisma.employee.findMany({ select: { id: true, code: true, phone: true } }),
        prisma.user.findMany({ select: { id: true, phone: true, email: true } }),
      ]);

    const defaultBranch = branches[0];
    const defaultDept = departments[0];
    const defaultPos = positions[0];
    const defaultShift = shifts[0];

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: "ឯកសារ Excel គ្មាន Sheet ឡើយ" },
        { status: 400 }
      );
    }

    const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];

    const existingCodeSet = new Set(existingEmployees.map((e) => e.code.toUpperCase()));
    const existingPhoneSet = new Set(
      existingEmployees.map((e) => (e.phone ? normalizePhoneNumber(e.phone) : "")).filter(Boolean)
    );

    const fileCodes = new Set<string>();
    const filePhones = new Set<string>();

    const validRows: any[] = [];
    const errors: Array<{ rowNumber: number; code: string; name: string; error: string }> = [];

    let rowIdx = 1;
    for (const row of rows) {
      rowIdx++;
      const rawCode = String(row.getCell(1).value || "").trim();
      const rawName = String(row.getCell(2).value || "").trim();
      const rawPhone = String(row.getCell(3).value || "").trim();

      // Skip empty rows
      if (!rawCode && !rawName) continue;

      // Skip sample/example rows
      if (
        rawCode.includes("ឧទាហរណ៍") ||
        rawName.includes("ឧទាហរណ៍") ||
        rawCode.startsWith("[") ||
        rawCode.toLowerCase().includes("example")
      ) {
        continue;
      }

      if (!rawCode) {
        errors.push({ rowNumber: rowIdx, code: "-", name: rawName, error: "ខ្វះលេខកូដបុគ្គលិក" });
        continue;
      }

      if (!rawName) {
        errors.push({ rowNumber: rowIdx, code: rawCode, name: "-", error: "ខ្វះឈ្មោះបុគ្គលិក" });
        continue;
      }

      const codeUpper = rawCode.toUpperCase();
      if (fileCodes.has(codeUpper)) {
        errors.push({
          rowNumber: rowIdx,
          code: rawCode,
          name: rawName,
          error: `កូដបុគ្គលិក "${rawCode}" ស្ទួនគ្នាក្នុងឯកសារ Excel`,
        });
        continue;
      }
      fileCodes.add(codeUpper);

      const normPhone = rawPhone ? normalizePhoneNumber(rawPhone) : null;
      if (normPhone) {
        if (filePhones.has(normPhone)) {
          errors.push({
            rowNumber: rowIdx,
            code: rawCode,
            name: rawName,
            error: `លេខទូរស័ព្ទ "${rawPhone}" ស្ទួនគ្នាក្នុងឯកសារ Excel`,
          });
          continue;
        }
        filePhones.add(normPhone);
      }

      const branchName = String(row.getCell(4).value || "").trim();
      const deptName = String(row.getCell(5).value || "").trim();
      const posName = String(row.getCell(6).value || "").trim();
      const shiftName = String(row.getCell(7).value || "").trim();
      const workingDaysRaw = String(row.getCell(8).value || "").trim();
      const workingHoursRaw = String(row.getCell(9).value || "").trim();
      const baseSalaryRaw = String(row.getCell(10).value || "").trim();
      const employmentTypeRaw = String(row.getCell(11).value || "").trim();
      const joinDateRaw = String(row.getCell(12).value || "").trim();

      const branch = branches.find((b) => b.name.toLowerCase().includes(branchName.toLowerCase())) || defaultBranch;
      const dept = departments.find((d) => d.name.toLowerCase().includes(deptName.toLowerCase())) || defaultDept;
      const pos = positions.find((p) => p.name.toLowerCase().includes(posName.toLowerCase())) || defaultPos;
      const shift = shifts.find((s) => s.name.toLowerCase().includes(shiftName.toLowerCase())) || defaultShift;

      let employmentType = "FULL_TIME";
      if (employmentTypeRaw.includes("PART") || employmentTypeRaw.includes("ក្រៅម៉ោង")) {
        employmentType = "PART_TIME";
      } else if (employmentTypeRaw.includes("PROBATION") || employmentTypeRaw.includes("សាកល្បង")) {
        employmentType = "PROBATION";
      } else if (employmentTypeRaw.includes("CONTRACT") || employmentTypeRaw.includes("កិច្ចសន្យា")) {
        employmentType = "CONTRACT";
      }

      let workingDays = shift?.workDays || "1,2,3,4,5";
      if (workingDaysRaw && (workingDaysRaw.includes("1") || workingDaysRaw.includes("6") || workingDaysRaw.includes("0"))) {
        const extracted = workingDaysRaw.match(/[0-6]/g);
        if (extracted && extracted.length > 0) {
          workingDays = Array.from(new Set(extracted)).join(",");
        }
      }

      let shiftScheduleType = "TEMPLATE";
      let customStartTime: string | null = null;
      let customEndTime: string | null = null;
      if (workingHoursRaw && workingHoursRaw.includes("-")) {
        const parts = workingHoursRaw.split("-").map((p) => p.trim());
        if (parts.length === 2 && parts[0].includes(":") && parts[1].includes(":")) {
          shiftScheduleType = "CUSTOM";
          customStartTime = parts[0];
          customEndTime = parts[1];
        }
      }

      let baseSalary = 200;
      if (baseSalaryRaw) {
        const num = parseFloat(baseSalaryRaw.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) baseSalary = num;
      }

      let joinDate = new Date();
      if (joinDateRaw && joinDateRaw !== "-") {
        const parsed = new Date(joinDateRaw);
        if (!isNaN(parsed.getTime())) joinDate = parsed;
      }

      validRows.push({
        code: rawCode,
        name: rawName,
        phone: normPhone,
        branchId: branch?.id || defaultBranch.id,
        branchName: branch?.name,
        departmentId: dept?.id || defaultDept.id,
        departmentName: dept?.name,
        positionId: pos?.id || defaultPos.id,
        positionName: pos?.name,
        shiftId: shift?.id || defaultShift.id,
        shiftName: shift?.name,
        workingDays,
        shiftScheduleType,
        customStartTime,
        customEndTime,
        baseSalary,
        employmentType,
        joinDate,
        isExisting: existingCodeSet.has(codeUpper),
      });
    }

    // If PREVIEW mode: return validation breakdown before saving
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        validCount: validRows.length,
        errorCount: errors.length,
        validRows,
        errors,
      });
    }

    // Check force password change setting
    const forceSetting = await prisma.setting.findUnique({
      where: { key: "force_employee_change_password" },
    });
    const mustChange = forceSetting?.value === "true";

    const createdAccountsWithPasswords: Array<{
      code: string;
      name: string;
      username: string;
      password: string;
      status: "CREATED" | "EXISTED";
    }> = [];

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of validRows) {
      const existing = await prisma.employee.findUnique({
        where: { code: item.code },
        include: { user: true },
      });

      if (existing) {
        await prisma.employee.update({
          where: { code: item.code },
          data: {
            name: item.name,
            phone: item.phone,
            branchId: item.branchId,
            departmentId: item.departmentId,
            positionId: item.positionId,
            shiftId: item.shiftId,
            workingDays: item.workingDays,
            shiftScheduleType: item.shiftScheduleType,
            customStartTime: item.customStartTime,
            customEndTime: item.customEndTime,
            baseSalary: item.baseSalary,
            employmentType: item.employmentType,
            joinDate: item.joinDate,
          },
        });
        updatedCount++;
        if (existing.user) {
          createdAccountsWithPasswords.push({
            code: item.code,
            name: item.name,
            username: existing.user.phone || existing.user.email || item.code,
            password: "(មានគណនីរួចហើយ - ពាក្យសម្ងាត់មិនផ្លាស់ប្តូរ)",
            status: "EXISTED",
          });
        }
      } else {
        // Create user login account with unique random readable password
        const tempPassword = generateReadableTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const username = item.phone || item.code.toLowerCase() + "@attendpro.com";

        const newUser = await prisma.user.create({
          data: {
            name: item.name,
            phone: item.phone,
            email: item.phone ? null : username,
            passwordHash,
            role: "EMPLOYEE",
            mustChangePassword: mustChange,
            isActive: true,
          },
        });

        await prisma.employee.create({
          data: {
            companyId: company.id,
            userId: newUser.id,
            code: item.code,
            name: item.name,
            phone: item.phone,
            branchId: item.branchId,
            departmentId: item.departmentId,
            positionId: item.positionId,
            shiftId: item.shiftId,
            workingDays: item.workingDays,
            shiftScheduleType: item.shiftScheduleType,
            customStartTime: item.customStartTime,
            customEndTime: item.customEndTime,
            baseSalary: item.baseSalary,
            employmentType: item.employmentType,
            joinDate: item.joinDate,
            isActive: true,
          },
        });

        createdCount++;
        createdAccountsWithPasswords.push({
          code: item.code,
          name: item.name,
          username,
          password: tempPassword,
          status: "CREATED",
        });
      }
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "IMPORT_EMPLOYEES",
        entity: "Employee",
        details: `Admin (${userName}) បាន Import បុគ្គលិកពី Excel៖ បង្កើតថ្មី ${createdCount} នាក់, កែប្រែ ${updatedCount} នាក់`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `ការនាំចូលបានជោគជ័យ៖ បង្កើតថ្មី ${createdCount} នាក់, កែសម្រួល ${updatedCount} នាក់`,
      createdCount,
      updatedCount,
      accounts: createdAccountsWithPasswords,
    });
  } catch (error: any) {
    console.error("employees/import error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
