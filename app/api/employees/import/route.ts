import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

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

    const [branches, departments, positions, shifts] = await Promise.all([
      prisma.branch.findMany(),
      prisma.department.findMany(),
      prisma.position.findMany(),
      prisma.shift.findMany(),
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

    let createdCount = 0;
    let updatedCount = 0;

    // Process rows sequentially to avoid concurrency issues
    const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];

    for (const row of rows) {
      const code = String(row.getCell(1).value || "").trim();
      const name = String(row.getCell(2).value || "").trim();
      const phone = String(row.getCell(3).value || "").trim();

      if (!code || !name) continue;

      const branchName = String(row.getCell(4).value || "").trim();
      const deptName = String(row.getCell(5).value || "").trim();
      const posName = String(row.getCell(6).value || "").trim();
      const shiftName = String(row.getCell(7).value || "").trim();
      const workingDaysRaw = String(row.getCell(8).value || "").trim();
      const workingHoursRaw = String(row.getCell(9).value || "").trim();
      const employmentTypeRaw = String(row.getCell(10).value || "").trim();
      const joinDateRaw = String(row.getCell(11).value || "").trim();

      const branch = branches.find((b) => b.name.toLowerCase().includes(branchName.toLowerCase())) || defaultBranch;
      const dept = departments.find((d) => d.name.toLowerCase().includes(deptName.toLowerCase())) || defaultDept;
      const pos = positions.find((p) => p.name.toLowerCase().includes(posName.toLowerCase())) || defaultPos;
      const shift = shifts.find((s) => s.name.toLowerCase().includes(shiftName.toLowerCase())) || defaultShift;

      // Parse employment type
      let employmentType = "FULL_TIME";
      if (employmentTypeRaw.includes("PART") || employmentTypeRaw.includes("ក្រៅម៉ោង")) {
        employmentType = "PART_TIME";
      } else if (employmentTypeRaw.includes("PROBATION") || employmentTypeRaw.includes("សាកល្បង")) {
        employmentType = "PROBATION";
      } else if (employmentTypeRaw.includes("CONTRACT") || employmentTypeRaw.includes("កិច្ចសន្យា")) {
        employmentType = "CONTRACT";
      }

      // Parse working days
      let workingDays = shift?.workDays || "1,2,3,4,5";
      if (workingDaysRaw && (workingDaysRaw.includes("1") || workingDaysRaw.includes("6") || workingDaysRaw.includes("0"))) {
        const extracted = workingDaysRaw.match(/[0-6]/g);
        if (extracted && extracted.length > 0) {
          workingDays = Array.from(new Set(extracted)).join(",");
        }
      }

      // Parse custom hours
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

      // Parse joinDate
      let joinDate = new Date();
      if (joinDateRaw && joinDateRaw !== "-") {
        const parsed = new Date(joinDateRaw);
        if (!isNaN(parsed.getTime())) {
          joinDate = parsed;
        }
      }

      const existing = await prisma.employee.findUnique({ where: { code } });
      if (existing) {
        await prisma.employee.update({
          where: { code },
          data: {
            name,
            phone: phone !== "-" ? phone : null,
            branchId: branch?.id,
            departmentId: dept?.id,
            positionId: pos?.id,
            shiftId: shift?.id,
            workingDays,
            shiftScheduleType,
            customStartTime,
            customEndTime,
            employmentType,
            joinDate,
          },
        });
        updatedCount++;
      } else {
        await prisma.employee.create({
          data: {
            companyId: company.id,
            code,
            name,
            phone: phone !== "-" ? phone : null,
            branchId: branch?.id || defaultBranch.id,
            departmentId: dept?.id || defaultDept.id,
            positionId: pos?.id || defaultPos.id,
            shiftId: shift?.id || defaultShift.id,
            workingDays,
            shiftScheduleType,
            customStartTime,
            customEndTime,
            employmentType,
            joinDate,
            isActive: true,
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `ការនាំចូលបានជោគជ័យ៖ បង្កើតថ្មី ${createdCount} នាក់, កែសម្រួល ${updatedCount} នាក់`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
