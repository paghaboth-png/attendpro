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
      { header: "ស្ថានភាព (Status)", key: "status", width: 14 },
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

    // Add rows
    employees.forEach((emp) => {
      worksheet.addRow({
        code: emp.code,
        name: emp.name,
        phone: emp.phone || "-",
        branch: emp.branch?.name || "-",
        department: emp.department?.name || "-",
        position: emp.position?.name || "-",
        shift: emp.shift?.name || "-",
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
