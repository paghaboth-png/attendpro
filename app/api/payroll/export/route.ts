import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowKhmer = new Date(nowUtc.getTime() + phnomPenhOffset);
    const currentMonth = nowKhmer.toISOString().slice(0, 7);

    const month = searchParams.get("month") || currentMonth;
    const branchId = searchParams.get("branchId") || "all";

    const company = await prisma.company.findFirst();
    const branch =
      branchId !== "all" ? await prisma.branch.findUnique({ where: { id: branchId } }) : null;

    // Fetch payroll record
    const payroll = await prisma.payroll.findFirst({
      where: {
        companyId: company?.id,
        month,
        branchId: branchId === "all" ? null : branchId,
      },
      include: {
        items: {
          include: {
            employee: {
              include: {
                branch: true,
                position: true,
                department: true,
              },
            },
          },
          orderBy: { employee: { code: "asc" } },
        },
      },
    });

    if (!payroll || payroll.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "មិនមានទិន្នន័យប្រាក់បៀវត្សសម្រាប់ខែនេះឡើយ" },
        { status: 404 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AttendPro Attendance System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Payroll ${month}`, {
      pageSetup: { orientation: "landscape", paperSize: 9 },
    });

    // 1. Title Banner
    sheet.mergeCells("A1:Q1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${company?.name || "TheDemo Coffee"} - តារាងទូទាត់ប្រាក់បៀវត្សរ៍ប្រចាំខែ (Monthly Payroll)`;
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Dark slate
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 36;

    // 2. Subtitle / Metadata
    sheet.mergeCells("A2:Q2");
    const subCell = sheet.getCell("A2");
    subCell.value = `ខែទូទាត់៖ ${month} | សាខា៖ ${branch?.name || "គ្រប់សាខាទាំងអស់"} | ស្ថានភាព៖ ${
      payroll.isFinalized ? "បាន Finalize រួចរាល់" : "សេចក្តីព្រាង (Draft)"
    }`;
    subCell.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF334155" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 22;

    sheet.addRow([]); // Blank row 3

    // 3. Headers
    const headers = [
      "ល.រ",
      "កូដបុគ្គលិក",
      "ឈ្មោះបុគ្គលិក",
      "សាខា",
      "មុខតំណែង",
      "ប្រាក់ខែគោល ($)",
      "ថ្ងៃធ្វើការ",
      "វត្តមានជាក់ស្តែង",
      "យឺត (លើក)",
      "ពិន័យយឺត ($)",
      "អវត្តមាន (ថ្ងៃ)",
      "ពិន័យអវត្តមាន ($)",
      "ម៉ោង OT (h)",
      "ប្រាក់ OT ($)",
      "ឧបត្ថម្ភ ($)",
      "ប្រាក់រង្វាន់ ($)",
      "ប្រាក់កាត់ ($)",
      "ប្រាក់ខែសុទ្ធ ($)",
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Navy
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF475569" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF475569" } },
        right: { style: "thin", color: { argb: "FF475569" } },
      };
    });

    // 4. Data Rows
    let totalBase = 0;
    let totalLatePen = 0;
    let totalAbsentPen = 0;
    let totalOtPay = 0;
    let totalAllowance = 0;
    let totalBonus = 0;
    let totalDeduction = 0;
    let totalNet = 0;

    payroll.items.forEach((item, index) => {
      totalBase += item.baseSalary;
      totalLatePen += item.latePenalty;
      totalAbsentPen += item.absentPenalty;
      totalOtPay += item.otPay;
      totalAllowance += item.allowance;
      totalBonus += item.bonus;
      totalDeduction += item.deduction;
      totalNet += item.netPay;

      const row = sheet.addRow([
        index + 1,
        item.employee.code,
        item.employee.name,
        item.employee.branch?.name || "-",
        item.employee.position?.name || "-",
        item.baseSalary,
        item.workDays,
        item.actualDays,
        item.lateCount,
        item.latePenalty,
        item.absentDays,
        item.absentPenalty,
        item.otHours,
        item.otPay,
        item.allowance,
        item.bonus,
        item.deduction,
        item.netPay,
      ]);

      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        // Alignments & Number formats
        if (colNumber === 1 || colNumber === 2) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          if (
            colNumber === 6 ||
            colNumber === 10 ||
            colNumber === 12 ||
            colNumber === 14 ||
            colNumber === 15 ||
            colNumber === 16 ||
            colNumber === 17 ||
            colNumber === 18
          ) {
            cell.numFmt = "$#,##0.00";
          }
        }

        // Highlight Net Pay
        if (colNumber === 18) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF047857" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFECFDF5" }, // Light emerald
          };
        }
      });
    });

    // 5. Total Row
    const totalRow = sheet.addRow([
      "",
      "",
      "សរុបរួម (TOTAL)",
      "",
      "",
      totalBase,
      "",
      "",
      "",
      totalLatePen,
      "",
      totalAbsentPen,
      "",
      totalOtPay,
      totalAllowance,
      totalBonus,
      totalDeduction,
      totalNet,
    ]);

    totalRow.height = 26;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
      };
      if (colNumber >= 6) {
        cell.numFmt = "$#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    // Auto-fit column widths
    sheet.columns.forEach((col, idx) => {
      if (idx === 0) col.width = 6;
      else if (idx === 1) col.width = 14;
      else if (idx === 2) col.width = 18;
      else if (idx === 3) col.width = 24;
      else if (idx === 4) col.width = 22;
      else col.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=AttendPro_Payroll_${month}.xlsx`,
      },
    });
  } catch (error: any) {
    console.error("Payroll export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
