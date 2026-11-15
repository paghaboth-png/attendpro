import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const whereClause: any = {
      companyId: company.id,
      isActive: true,
    };

    if (branchId && branchId !== "all") {
      whereClause.branchId = branchId;
    }
    if (departmentId && departmentId !== "all") {
      whereClause.departmentId = departmentId;
    }
    if (search) {
      whereClause.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        branch: true,
        department: true,
        position: true,
        salaryHistories: {
          orderBy: { effectiveDate: "desc" },
          take: 5,
        },
      },
      orderBy: { code: "asc" },
    });

    const [branches, departments] = await Promise.all([
      prisma.branch.findMany({ where: { companyId: company.id, isActive: true }, orderBy: { name: "asc" } }),
      prisma.department.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    ]);

    const formatted = employees.map((emp) => ({
      id: emp.id,
      code: emp.code,
      name: emp.name,
      phone: emp.phone,
      photoUrl: emp.photoUrl,
      branchId: emp.branchId,
      branchName: emp.branch.name,
      departmentId: emp.departmentId,
      departmentName: emp.department.name,
      positionId: emp.positionId,
      positionName: emp.position.name,
      baseSalary: emp.baseSalary,
      salaryType: emp.salaryType || "MONTHLY",
      workDaysPerMonth: emp.workDaysPerMonth || 26,
      salaryEffectiveDate: emp.salaryEffectiveDate
        ? emp.salaryEffectiveDate.toISOString().slice(0, 10)
        : emp.createdAt.toISOString().slice(0, 10),
      isConfigured: emp.baseSalary > 0,
      salaryHistories: emp.salaryHistories.map((h) => ({
        id: h.id,
        baseSalary: h.baseSalary,
        salaryType: h.salaryType,
        workDaysPerMonth: h.workDaysPerMonth,
        effectiveDate: h.effectiveDate.toISOString().slice(0, 10),
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        employees: formatted,
        branches,
        departments,
        totalCount: employees.length,
        unconfiguredCount: formatted.filter((e) => !e.isConfigured).length,
      },
    });
  } catch (error: any) {
    console.error("Salary Setup GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Single employee salary update
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeId,
      baseSalary,
      salaryType = "MONTHLY",
      workDaysPerMonth = 26,
      effectiveDate,
      note,
    } = body;

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "សូមបញ្ជាក់អត្តសញ្ញាណបុគ្គលិក" }, { status: 400 });
    }

    const salaryNum = parseFloat(baseSalary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      return NextResponse.json({ success: false, error: "ចំនួនប្រាក់ខែមិនត្រឹមត្រូវឡើយ" }, { status: 400 });
    }

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { branch: true },
    });

    if (!emp) {
      return NextResponse.json({ success: false, error: "រកមិនឃើញបុគ្គលិកឡើយ" }, { status: 404 });
    }

    const oldSalary = emp.baseSalary;
    const effDateObj = effectiveDate ? new Date(`${effectiveDate}T00:00:00Z`) : new Date();

    // 1. Record in SalaryHistory
    await prisma.salaryHistory.create({
      data: {
        employeeId: emp.id,
        baseSalary: salaryNum,
        salaryType,
        workDaysPerMonth: parseInt(workDaysPerMonth) || 26,
        effectiveDate: effDateObj,
        note: note || `កែប្រែដោយ ${(session.user as any)?.name || "Admin"}`,
        createdBy: userId,
      },
    });

    // 2. Update employee
    const updatedEmp = await prisma.employee.update({
      where: { id: emp.id },
      data: {
        baseSalary: salaryNum,
        salaryType,
        workDaysPerMonth: parseInt(workDaysPerMonth) || 26,
        salaryEffectiveDate: effDateObj,
      },
    });

    // 3. Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "SALARY_UPDATE",
        entity: "EmployeeSalary",
        details: `បានកែប្រែប្រាក់ខែបុគ្គលិក ${emp.name} (${emp.code}) ពី $${oldSalary} ទៅ $${salaryNum} (${salaryType}), ថ្ងៃមានសុពលភាព: ${effDateObj.toISOString().slice(0, 10)}${note ? `, សម្គាល់: ${note}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `បានកែប្រែប្រាក់ខែបុគ្គលិក ${emp.name} (${emp.code}) ដោយជោគជ័យ!`,
      data: updatedEmp,
    });
  } catch (error: any) {
    console.error("Salary Setup PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Bulk update employees salary
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeIds,
      updateType, // "FIXED" | "PERCENTAGE"
      fixedAmount,
      percentage,
      salaryType,
      workDaysPerMonth = 26,
      effectiveDate,
      note,
    } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ success: false, error: "សូមជ្រើសរើសបុគ្គលិកយ៉ាងតិច ១ នាក់" }, { status: 400 });
    }

    const effDateObj = effectiveDate ? new Date(`${effectiveDate}T00:00:00Z`) : new Date();
    const workDaysNum = parseInt(workDaysPerMonth) || 26;

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
    });

    let updatedCount = 0;

    for (const emp of employees) {
      let newSalary = emp.baseSalary;

      if (updateType === "FIXED") {
        const val = parseFloat(fixedAmount);
        if (!isNaN(val) && val >= 0) {
          newSalary = val;
        }
      } else if (updateType === "PERCENTAGE") {
        const pct = parseFloat(percentage);
        if (!isNaN(pct)) {
          newSalary = Math.max(0, Math.round((emp.baseSalary * (1 + pct / 100)) * 100) / 100);
        }
      }

      const newType = salaryType || emp.salaryType || "MONTHLY";

      // Create history
      await prisma.salaryHistory.create({
        data: {
          employeeId: emp.id,
          baseSalary: newSalary,
          salaryType: newType,
          workDaysPerMonth: workDaysNum,
          effectiveDate: effDateObj,
          note: note || `Bulk update: ${updateType === "FIXED" ? `Fixed $${newSalary}` : `${percentage > 0 ? "+" : ""}${percentage}%`}`,
          createdBy: userId,
        },
      });

      // Update employee
      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          baseSalary: newSalary,
          salaryType: newType,
          workDaysPerMonth: workDaysNum,
          salaryEffectiveDate: effDateObj,
        },
      });

      updatedCount++;
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "SALARY_BULK_UPDATE",
        entity: "EmployeeSalary",
        details: `បានកែប្រែប្រាក់ខែជាក្រុមចំនួន ${updatedCount} នាក់ (${updateType === "FIXED" ? `កំណត់ស្មើគ្នា $${fixedAmount}` : `កែប្រែ ${percentage}%`}), សុពលភាព: ${effDateObj.toISOString().slice(0, 10)}${note ? `, សម្គាល់: ${note}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `បានកែប្រែប្រាក់ខែបុគ្គលិកចំនួន ${updatedCount} នាក់ដោយជោគជ័យ!`,
      data: { updatedCount },
    });
  } catch (error: any) {
    console.error("Salary Setup Bulk error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
