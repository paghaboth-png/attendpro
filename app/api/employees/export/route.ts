import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    // Generate buffer
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
