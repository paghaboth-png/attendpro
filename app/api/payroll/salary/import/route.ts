import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const effectiveDateParam = formData.get("effectiveDate") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "សូមជ្រើសរើសឯកសារ Excel (.xlsx)" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "ឯកសារ Excel គ្មានទិន្នន័យឡើយ" }, { status: 400 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // Rows start after header (e.g. row 5 if formatted like export, or row 2)
    // We will scan rows and inspect values
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const codeVal = row.getCell(1).text?.trim();

      // Skip title/header rows
      if (!codeVal || codeVal === "កូដបុគ្គលិក" || codeVal.toLowerCase().includes("attendpro") || codeVal.toLowerCase().includes("កាលបរិច្ឆេទ")) {
        continue;
      }

      // Check if employee exists
      const emp = await prisma.employee.findFirst({
        where: { code: codeVal, companyId: company.id },
      });

      if (!emp) {
        errors.push(`រកមិនឃើញកូដបុគ្គលិក "${codeVal}" ឡើយ (ជួរទី ${rowNumber})`);
        continue;
      }

      // Salary is in column 6 (or col 2 if simple 2-col format)
      let salaryVal = parseFloat(row.getCell(6).text?.replace(/[^0-9.]/g, "") || "");
      if (isNaN(salaryVal)) {
        salaryVal = parseFloat(row.getCell(2).text?.replace(/[^0-9.]/g, "") || "");
      }

      if (isNaN(salaryVal) || salaryVal < 0) {
        errors.push(`ប្រាក់ខែមិនត្រឹមត្រូវសម្រាប់ "${codeVal}" (ជួរទី ${rowNumber})`);
        continue;
      }

      const salaryTypeVal = (row.getCell(7).text?.trim().toUpperCase() === "DAILY" ? "DAILY" : row.getCell(7).text?.trim().toUpperCase() === "HOURLY" ? "HOURLY" : "MONTHLY");
      const workDaysVal = parseInt(row.getCell(8).text?.trim() || "") || 26;
      
      let effDateVal = effectiveDateParam ? new Date(`${effectiveDateParam}T00:00:00Z`) : new Date();
      const dateInExcel = row.getCell(9).text?.trim();
      if (dateInExcel && !isNaN(Date.parse(dateInExcel))) {
        effDateVal = new Date(dateInExcel);
      }

      // Record Salary History
      await prisma.salaryHistory.create({
        data: {
          employeeId: emp.id,
          baseSalary: salaryVal,
          salaryType: salaryTypeVal,
          workDaysPerMonth: workDaysVal,
          effectiveDate: effDateVal,
          note: `Import ពី Excel: ${file.name}`,
          createdBy: userId,
        },
      });

      // Update Employee
      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          baseSalary: salaryVal,
          salaryType: salaryTypeVal,
          workDaysPerMonth: workDaysVal,
          salaryEffectiveDate: effDateVal,
        },
      });

      updatedCount++;
    }

    if (updatedCount > 0) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "SALARY_IMPORT_EXCEL",
          entity: "EmployeeSalary",
          details: `បាន Import ប្រាក់ខែពី Excel ចំនួន ${updatedCount} នាក់ (${file.name})`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `បាន Import និងកែប្រែប្រាក់ខែបុគ្គលិកចំនួន ${updatedCount} នាក់ដោយជោគជ័យ!`,
      data: {
        updatedCount,
        errors,
      },
    });
  } catch (error: any) {
    console.error("Salary Import error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
