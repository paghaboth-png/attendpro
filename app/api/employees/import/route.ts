import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
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

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const code = String(row.getCell(1).value || "").trim();
      const name = String(row.getCell(2).value || "").trim();
      const phone = String(row.getCell(3).value || "").trim();

      if (code && name) {
        // Find matching branch/dept/pos if specified by text
        const branchName = String(row.getCell(4).value || "").trim();
        const deptName = String(row.getCell(5).value || "").trim();
        const posName = String(row.getCell(6).value || "").trim();
        const shiftName = String(row.getCell(7).value || "").trim();

        const branch = branches.find((b) => b.name.includes(branchName)) || defaultBranch;
        const dept = departments.find((d) => d.name.includes(deptName)) || defaultDept;
        const pos = positions.find((p) => p.name.includes(posName)) || defaultPos;
        const shift = shifts.find((s) => s.name.includes(shiftName)) || defaultShift;

        // Upsert employee
        prisma.employee
          .upsert({
            where: { code },
            update: {
              name,
              phone: phone !== "-" ? phone : null,
              branchId: branch?.id,
              departmentId: dept?.id,
              positionId: pos?.id,
              shiftId: shift?.id,
            },
            create: {
              companyId: company.id,
              code,
              name,
              phone: phone !== "-" ? phone : null,
              branchId: branch?.id,
              departmentId: dept?.id,
              positionId: pos?.id,
              shiftId: shift?.id,
              isActive: true,
            },
          })
          .then(() => {
            createdCount++;
          })
          .catch(() => {});
      }
    });

    return NextResponse.json({
      success: true,
      message: "Import initiated successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
