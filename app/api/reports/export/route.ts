import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const branchId = searchParams.get("branchId") || "all";

    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);

    const currentYear = nowLocal.getUTCFullYear();
    const currentMonth = nowLocal.getUTCMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const startDate =
      startDateParam ||
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDate =
      endDateParam ||
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
        daysInMonth
      ).padStart(2, "0")}`;

    const attWhere: any = {
      date: { gte: startDate, lte: endDate },
    };
    if (branchId !== "all") attWhere.branchId = branchId;

    const [attendances, company] = await Promise.all([
      prisma.attendance.findMany({
        where: attWhere,
        include: {
          employee: {
            include: { branch: true, department: true, position: true },
          },
          branch: true,
        },
        orderBy: [{ date: "asc" }, { employee: { code: "asc" } }],
      }),
      prisma.company.findFirst(),
    ]);

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AttendPro";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("របាយការណ៍វត្តមាន");

    // Title Row
    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `របាយការណ៍វត្តមានបុគ្គលិក — ${company?.name || "AttendPro"} (${startDate} ដល់ ${endDate})`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Dark Navy
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 36;

    // Header Row
    const headerRow = sheet.addRow([
      "ល.រ (#)",
      "កាលបរិច្ឆេទ (Date)",
      "កូដបុគ្គលិក",
      "ឈ្មោះបុគ្គលិក",
      "សាខា",
      "ផ្នែកការងារ",
      "ម៉ោងចូល (In)",
      "ម៉ោងចេញ (Out)",
      "ស្ថានភាព",
      "កំណត់សម្គាល់",
    ]);
    headerRow.height = 26;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Navy slate
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add Data Rows
    attendances.forEach((att, idx) => {
      const inTime = att.checkInAt
        ? new Date(att.checkInAt).toLocaleTimeString("km-KH", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Phnom_Penh",
          })
        : "-";
      const outTime = att.checkOutAt
        ? new Date(att.checkOutAt).toLocaleTimeString("km-KH", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Phnom_Penh",
          })
        : "-";

      const statusText =
        att.status === "GOOD"
          ? "ទាន់ពេល (GOOD)"
          : att.status === "LATE"
          ? "មកយឺត (LATE)"
          : att.status === "EARLY_LEAVE"
          ? "ចេញមុនម៉ោង (EARLY)"
          : att.status;

      const row = sheet.addRow([
        idx + 1,
        att.date,
        att.employee?.code || "-",
        att.employee?.name || "-",
        att.branch?.name || "-",
        att.employee?.department?.name || "-",
        inTime,
        outTime,
        statusText,
        att.note || (att.isManual ? "Manual" : ""),
      ]);

      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.font = { name: "Arial", size: 9 };
        cell.alignment = {
          vertical: "middle",
          horizontal: colNum === 1 || colNum === 2 || colNum === 3 || colNum === 7 || colNum === 8 ? "center" : "left",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // Column Widths
    sheet.columns = [
      { width: 8 },
      { width: 14 },
      { width: 14 },
      { width: 22 },
      { width: 26 },
      { width: 22 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 24 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=AttendPro_Report_${startDate}_${endDate}.xlsx`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
