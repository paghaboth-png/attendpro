import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isTemplate = searchParams.get("template") === "true";

    if (isTemplate) {
      // 1. Fetch available branches, departments, positions, shifts to provide hints
      const [branches, departments, positions, shifts] = await Promise.all([
        prisma.branch.findMany({ select: { name: true } }),
        prisma.department.findMany({ select: { name: true } }),
        prisma.position.findMany({ select: { name: true } }),
        prisma.shift.findMany({ select: { name: true } }),
      ]);

      const branchHint = branches.map((b) => b.name).join(", ") || "សាខាស្វាយរៀង";
      const deptHint = departments.map((d) => d.name).join(", ") || "សេវាកម្ម, ឆុង";
      const posHint = positions.map((p) => p.name).join(", ") || "បុគ្គលិកឆុង (Barista), បេឡា (Cashier)";
      const shiftHint = shifts.map((s) => s.name).join(", ") || "វេនពេញម៉ោង (Full-Time)";

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Employees_Import_Template", {
        properties: { tabColor: { argb: "FF10B981" } },
      });

      worksheet.columns = [
        { header: "កូដបុគ្គលិក (Code) *", key: "code", width: 22 },
        { header: "ឈ្មោះបុគ្គលិក (Name) *", key: "name", width: 25 },
        { header: "លេខទូរស័ព្ទ (Phone) *", key: "phone", width: 20 },
        { header: "សាខា (Branch)", key: "branch", width: 25 },
        { header: "ផ្នែកការងារ (Department)", key: "department", width: 25 },
        { header: "មុខតំណែង (Position)", key: "position", width: 28 },
        { header: "វេនធ្វើការ (Shift)", key: "shift", width: 26 },
        { header: "ថ្ងៃធ្វើការ (Workdays: 1-6)", key: "workingDays", width: 25 },
        { header: "ម៉ោងធ្វើការ (07:00-16:00)", key: "workingHours", width: 25 },
        { header: "ប្រាក់ខែគោល (USD)", key: "baseSalary", width: 18 },
        { header: "ប្រភេទបុគ្គលិក (FULL_TIME)", key: "employmentType", width: 24 },
        { header: "ថ្ងៃចូលធ្វើការ (YYYY-MM-DD)", key: "joinDate", width: 24 },
      ];

      // Header row style
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 30;

      // Sample Row 1 (Warning Yellow/Amber)
      const sampleRow1 = worksheet.addRow({
        code: "[ឧទាហរណ៍ លុបមុន Import] EMP012",
        name: "កែវ សុខា (ឧទាហរណ៍)",
        phone: "012888999",
        branch: branches[0]?.name || "សាខាស្វាយរៀង",
        department: departments[0]?.name || "សេវាកម្ម",
        position: positions[0]?.name || "Barista",
        shift: shifts[0]?.name || "វេនពេញម៉ោង",
        workingDays: "1,2,3,4,5,6",
        workingHours: "07:00-16:00",
        baseSalary: 250,
        employmentType: "FULL_TIME",
        joinDate: "2026-11-01",
      });

      sampleRow1.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" }, // Amber-100
      };
      sampleRow1.font = { italic: true, color: { argb: "FF92400E" } };

      // Sample Row 2
      const sampleRow2 = worksheet.addRow({
        code: "[ឧទាហរណ៍ លុបមុន Import] EMP013",
        name: "ម៉ៅ ចិន្តា (ឧទាហរណ៍)",
        phone: "096777888",
        branch: branches[0]?.name || "សាខាស្វាយរៀង",
        department: departments[0]?.name || "សេវាកម្ម",
        position: positions[1]?.name || positions[0]?.name || "Cashier",
        shift: shifts[0]?.name || "វេនពេញម៉ោង",
        workingDays: "1,2,3,4,5",
        workingHours: "08:00-17:00",
        baseSalary: 220,
        employmentType: "FULL_TIME",
        joinDate: "2026-11-15",
      });

      sampleRow2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" },
      };
      sampleRow2.font = { italic: true, color: { argb: "FF92400E" } };

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="AttendPro_Import_Template.xlsx"`,
        },
      });
    }

    // Default: Export existing employees
    const employees = await prisma.employee.findMany({
      include: {
        branch: true,
        department: true,
        position: true,
        shift: true,
      },
      orderBy: { code: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Employees", {
      properties: { tabColor: { argb: "FF2563EB" } },
    });

    worksheet.columns = [
      { header: "កូដបុគ្គលិក (Code)", key: "code", width: 16 },
      { header: "ឈ្មោះបុគ្គលិក (Name)", key: "name", width: 25 },
      { header: "លេខទូរស័ព្ទ (Phone)", key: "phone", width: 18 },
      { header: "សាខា (Branch)", key: "branch", width: 26 },
      { header: "ផ្នែកការងារ (Department)", key: "department", width: 28 },
      { header: "មុខតំណែង (Position)", key: "position", width: 26 },
      { header: "វេនធ្វើការ (Shift)", key: "shift", width: 28 },
      { header: "ថ្ងៃធ្វើការ (Working Days)", key: "workingDays", width: 24 },
      { header: "ម៉ោងធ្វើការ (Working Hours)", key: "workingHours", width: 22 },
      { header: "ប្រភេទបុគ្គលិក (Type)", key: "employmentType", width: 20 },
      { header: "ថ្ងៃចូលធ្វើការ (Join Date)", key: "joinDate", width: 18 },
      { header: "ស្ថានភាព (Status)", key: "status", width: 16 },
    ];

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 28;

    const dayNameMap: Record<string, string> = {
      "1": "ចន្ទ",
      "2": "អង្គារ",
      "3": "ពុធ",
      "4": "ព្រហស្បតិ៍",
      "5": "សុក្រ",
      "6": "សៅរ៍",
      "0": "អាទិត្យ",
    };

    const typeNameMap: Record<string, string> = {
      FULL_TIME: "ពេញម៉ោង (Full-Time)",
      PART_TIME: "ក្រៅម៉ោង (Part-Time)",
      PROBATION: "សាកល្បង (Probation)",
      CONTRACT: "កិច្ចសន្យា (Contract)",
    };

    // Add rows
    employees.forEach((emp) => {
      const days = (emp.workingDays || emp.shift?.workDays || "1,2,3,4,5")
        .split(",")
        .map((d) => dayNameMap[d.trim()] || d)
        .join(", ");

      const hours =
        emp.shiftScheduleType === "CUSTOM" && emp.customStartTime && emp.customEndTime
          ? `${emp.customStartTime} - ${emp.customEndTime}`
          : `${emp.shift?.startTime || "07:00"} - ${emp.shift?.endTime || "16:00"}`;

      const joinDateStr = emp.joinDate
        ? new Date(emp.joinDate).toISOString().slice(0, 10)
        : "-";

      worksheet.addRow({
        code: emp.code,
        name: emp.name,
        phone: emp.phone || "-",
        branch: emp.branch?.name || "-",
        department: emp.department?.name || "-",
        position: emp.position?.name || "-",
        shift: emp.shift?.name || "-",
        workingDays: days,
        workingHours: hours,
        employmentType: typeNameMap[emp.employmentType || "FULL_TIME"] || emp.employmentType,
        joinDate: joinDateStr,
        status: emp.isActive ? "សកម្ម (Active)" : "អសកម្ម",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="AttendPro_Employees_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
