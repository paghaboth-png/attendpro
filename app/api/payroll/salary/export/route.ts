import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const company = await prisma.company.findFirst();
    const employees = await prisma.employee.findMany({
      where: { companyId: company?.id, isActive: true },
      include: {
        branch: true,
        department: true,
        position: true,
      },
      orderBy: { code: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AttendPro";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Salary Setup", {
      views: [{ showGridLines: true }],
    });

    // Title
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `តារាងកំណត់ប្រាក់ខែបុគ្គលិក - ${company?.name || "AttendPro"}`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Slate-900
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 36;

    // Subtitle
    worksheet.mergeCells("A2:I2");
    const subCell = worksheet.getCell("A2");
    subCell.value = `កាលបរិច្ឆេទបង្កើត៖ ${new Date().toLocaleDateString("km-KH")} | ចំនួនបុគ្គលិកសរុប៖ ${employees.length} នាក់`;
    subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(2).height = 22;

    // Table Headers
    const headers = [
      { header: "កូដបុគ្គលិក", key: "code", width: 14 },
      { header: "ឈ្មោះបុគ្គលិក", key: "name", width: 22 },
      { header: "សាខា", key: "branch", width: 22 },
      { header: "ផ្នែក", key: "department", width: 18 },
      { header: "មុខតំណែង", key: "position", width: 18 },
      { header: "ប្រាក់ខែគោល (USD)", key: "baseSalary", width: 18 },
      { header: "ប្រភេទប្រាក់ខែ", key: "salaryType", width: 16 },
      { header: "ថ្ងៃធ្វើការ/ខែ", key: "workDays", width: 14 },
      { header: "ថ្ងៃមានសុពលភាព", key: "effectiveDate", width: 16 },
    ];

    const headerRow = worksheet.getRow(4);
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h.header;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Slate-800
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "medium", color: { argb: "FF3B82F6" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
      worksheet.getColumn(index + 1).width = h.width;
    });
    headerRow.height = 28;

    // Rows
    employees.forEach((emp, i) => {
      const rowIndex = 5 + i;
      const row = worksheet.getRow(rowIndex);
      const isEven = i % 2 === 0;

      const effDateStr = emp.salaryEffectiveDate
        ? emp.salaryEffectiveDate.toISOString().slice(0, 10)
        : emp.createdAt.toISOString().slice(0, 10);

      const rowData = [
        emp.code,
        emp.name,
        emp.branch.name,
        emp.department.name,
        emp.position.name,
        emp.baseSalary,
        emp.salaryType || "MONTHLY",
        emp.workDaysPerMonth || 26,
        effDateStr,
      ];

      rowData.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = val;
        cell.font = { name: "Arial", size: 10 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (colIdx === 0 || colIdx === 6 || colIdx === 7 || colIdx === 8) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colIdx === 5) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "$#,##0.00";
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });
      row.height = 22;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="salary_setup_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Salary Export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
