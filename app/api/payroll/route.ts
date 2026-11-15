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
      return NextResponse.json(
        { success: false, error: "គ្មានសិទ្ធិចូលមើលទំព័រប្រាក់បៀវត្សឡើយ (Unauthorized)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowKhmer = new Date(nowUtc.getTime() + phnomPenhOffset);
    const currentMonth = nowKhmer.toISOString().slice(0, 7); // YYYY-MM

    const month = searchParams.get("month") || currentMonth;
    const branchId = searchParams.get("branchId") || "all";

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    // 1. Fetch System Settings
    const settings = await prisma.setting.findMany({
      where: { companyId: company.id },
    });
    const sMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    const latePenaltyAmount = parseFloat(sMap.late_penalty_amount || "1.0");
    const absentPenaltyRate = parseFloat(sMap.absent_penalty_rate || "1.0");
    const overtimeMultiplier = parseFloat(sMap.overtime_multiplier || "1.5");
    const taxEnabled = sMap.tax_enabled === "true";
    const nssfEnabled = sMap.nssf_enabled === "true";

    // 2. Check if a finalized or saved Payroll exists for this month and branch
    const payrollWhere: any = {
      companyId: company.id,
      month,
      branchId: branchId === "all" ? null : branchId,
    };

    let payroll = await prisma.payroll.findFirst({
      where: payrollWhere,
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

    // 3. If payroll is already finalized, return saved items directly
    if (payroll && payroll.isFinalized) {
      const totalNetPay = payroll.items.reduce((sum, item) => sum + item.netPay, 0);
      return NextResponse.json({
        success: true,
        data: {
          payroll,
          items: payroll.items,
          summary: {
            totalEmployees: payroll.items.length,
            totalGrossPay: payroll.items.reduce((sum, item) => sum + item.grossPay, 0),
            totalDeductions: payroll.items.reduce(
              (sum, item) =>
                sum + item.latePenalty + item.absentPenalty + item.deduction + item.taxDeduction + item.nssfDeduction,
              0
            ),
            totalNetPay,
          },
          isFinalized: true,
        },
      });
    }

    // 4. Calculate Payroll dynamically from Attendance, Leave, Overtime
    const employeeWhere: any = {
      companyId: company.id,
      isActive: true,
    };
    if (branchId !== "all") {
      employeeWhere.branchId = branchId;
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        branch: true,
        position: true,
        department: true,
      },
      orderBy: { code: "asc" },
    });

    // Date range for month
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const mIndex = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
    const startDateStr = `${month}-01`;
    const endDateStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;

    // Standard work days (26 days per month for Cambodia coffee shops)
    const standardWorkDays = 26;

    // Fetch Attendances in month
    const attendances = await prisma.attendance.findMany({
      where: {
        employee: { companyId: company.id },
        date: { gte: startDateStr, lte: endDateStr },
      },
    });

    // Fetch Approved Overtime in month
    const startDateTime = new Date(`${startDateStr}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDateStr}T23:59:59.999Z`);
    const overtimes = await prisma.overtime.findMany({
      where: {
        employee: { companyId: company.id },
        status: "APPROVED",
        date: { gte: startDateTime, lte: endDateTime },
      },
    });

    // Fetch Approved Leaves in month
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employee: { companyId: company.id },
        status: "APPROVED",
        fromDate: { lte: endDateTime },
        toDate: { gte: startDateTime },
      },
      include: { type: true },
    });

    // Create or retrieve draft payroll header
    if (!payroll) {
      payroll = await prisma.payroll.create({
        data: {
          companyId: company.id,
          month,
          branchId: branchId === "all" ? null : branchId,
          isFinalized: false,
          totalAmount: 0,
        },
        include: { items: { include: { employee: { include: { branch: true, position: true, department: true } } } } },
      });
    }

    // Map existing items if edited manually
    const existingItemsMap = new Map((payroll.items || []).map((it) => [it.employeeId, it]));

    const computedItems: any[] = [];
    let totalPayrollNet = 0;

    for (const emp of employees) {
      const baseSalary = emp.baseSalary || 200;
      const salaryType = emp.salaryType || "MONTHLY";
      const dailyWage = baseSalary / standardWorkDays;
      const hourlyWage = dailyWage / 8;

      // Filter emp attendances
      const empAtts = attendances.filter((a) => a.employeeId === emp.id);
      const presentDays = empAtts.length;
      const lateCount = empAtts.filter((a) => a.status === "LATE").length;
      const latePenalty = Math.round(lateCount * latePenaltyAmount * 100) / 100;

      // Filter emp OT
      const empOts = overtimes.filter((o) => o.employeeId === emp.id);
      const otHours = empOts.reduce((sum, o) => sum + o.hours, 0);
      const otPay = Math.round(otHours * hourlyWage * overtimeMultiplier * 100) / 100;

      // Filter emp leaves
      const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
      let approvedLeaveDays = 0;
      let unpaidLeaveDays = 0;
      for (const l of empLeaves) {
        const days = 1; // single day approximation or diff
        if (l.type.id === "leave-annual" || l.type.id === "leave-sick") {
          approvedLeaveDays += days;
        } else {
          unpaidLeaveDays += days;
        }
      }

      // Calculate absent days (if current month, up to current date or standard work days)
      const absentDays = Math.max(0, Math.min(2, standardWorkDays - (presentDays + approvedLeaveDays + unpaidLeaveDays)));
      const absentPenalty = Math.round(absentDays * dailyWage * absentPenaltyRate * 100) / 100;

      // Check if existing manual adjustment
      const existing = existingItemsMap.get(emp.id);
      const allowance = existing ? existing.allowance : 0;
      const bonus = existing ? existing.bonus : 0;
      const deduction = existing ? existing.deduction : 0;
      const note = existing ? existing.note : null;
      const isEdited = existing ? existing.isEdited : false;

      const grossPay = Math.round((baseSalary + otPay + allowance + bonus) * 100) / 100;
      const totalDeductionBeforeTax = latePenalty + absentPenalty + deduction;

      // Tax & NSSF (if enabled)
      const nssfDeduction = nssfEnabled ? Math.round(baseSalary * 0.02 * 100) / 100 : 0;
      const taxableSalary = Math.max(0, grossPay - nssfDeduction);
      let taxDeduction = 0;
      if (taxEnabled) {
        if (taxableSalary > 375) {
          taxDeduction = Math.round((taxableSalary - 375) * 0.05 * 100) / 100;
        }
      }

      const netPay = Math.max(
        0,
        Math.round((grossPay - totalDeductionBeforeTax - taxDeduction - nssfDeduction) * 100) / 100
      );

      totalPayrollNet += netPay;

      // Upsert payroll item
      const itemRecord = await prisma.payrollItem.upsert({
        where: {
          payrollId_employeeId: {
            payrollId: payroll.id,
            employeeId: emp.id,
          },
        },
        update: {
          baseSalary,
          salaryType,
          workDays: standardWorkDays,
          actualDays: presentDays,
          lateCount,
          latePenalty,
          absentDays,
          absentPenalty,
          otHours,
          otPay,
          grossPay,
          taxDeduction,
          nssfDeduction,
          netPay,
        },
        create: {
          payrollId: payroll.id,
          employeeId: emp.id,
          baseSalary,
          salaryType,
          workDays: standardWorkDays,
          actualDays: presentDays,
          lateCount,
          latePenalty,
          absentDays,
          absentPenalty,
          otHours,
          otPay,
          allowance,
          bonus,
          deduction,
          grossPay,
          taxDeduction,
          nssfDeduction,
          netPay,
          note,
          isEdited,
        },
        include: {
          employee: {
            include: {
              branch: true,
              position: true,
              department: true,
            },
          },
        },
      });

      computedItems.push(itemRecord);
    }

    // Update total amount on payroll header
    await prisma.payroll.update({
      where: { id: payroll.id },
      data: { totalAmount: Math.round(totalPayrollNet * 100) / 100 },
    });

    return NextResponse.json({
      success: true,
      data: {
        payroll: {
          ...payroll,
          totalAmount: Math.round(totalPayrollNet * 100) / 100,
        },
        items: computedItems,
        summary: {
          totalEmployees: computedItems.length,
          totalGrossPay: computedItems.reduce((sum, it) => sum + it.grossPay, 0),
          totalDeductions: computedItems.reduce(
            (sum, it) =>
              sum + it.latePenalty + it.absentPenalty + it.deduction + it.taxDeduction + it.nssfDeduction,
            0
          ),
          totalNetPay: Math.round(totalPayrollNet * 100) / 100,
        },
        isFinalized: Boolean(payroll.isFinalized),
      },
    });
  } catch (error: any) {
    console.error("Payroll GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update individual employee allowance, bonus, deduction, note
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { itemId, allowance, bonus, deduction, note } = body;

    const item = await prisma.payrollItem.findUnique({
      where: { id: itemId },
      include: { payroll: true, employee: true },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Payroll item not found" }, { status: 404 });
    }

    if (item.payroll.isFinalized && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "តារាងប្រាក់ខែត្រូវបាន Finalize រួចហើយ! មានតែ Super Admin ប៉ុណ្ណោះដែលអាចកែប្រែបាន។" },
        { status: 403 }
      );
    }

    const newAllowance = allowance !== undefined ? parseFloat(allowance) : item.allowance;
    const newBonus = bonus !== undefined ? parseFloat(bonus) : item.bonus;
    const newDeduction = deduction !== undefined ? parseFloat(deduction) : item.deduction;

    const newGross =
      Math.round((item.baseSalary + item.otPay + newAllowance + newBonus) * 100) / 100;
    const newNet = Math.max(
      0,
      Math.round(
        (newGross - item.latePenalty - item.absentPenalty - newDeduction - item.taxDeduction - item.nssfDeduction) * 100
      ) / 100
    );

    const updated = await prisma.payrollItem.update({
      where: { id: itemId },
      data: {
        allowance: newAllowance,
        bonus: newBonus,
        deduction: newDeduction,
        grossPay: newGross,
        netPay: newNet,
        note: note !== undefined ? note : item.note,
        isEdited: true,
      },
      include: { employee: true },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "PAYROLL_ITEM_EDIT",
        entity: "PayrollItem",
        details: `បានកែប្រែប្រាក់ខែបុគ្គលិក ${item.employee.name} (${item.employee.code}): Bonus=$${newBonus}, Allowance=$${newAllowance}, Deduction=$${newDeduction}, Net=$${newNet}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Finalize (Lock) or Unlock Payroll
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Admin";
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { payrollId, action } = body; // action: "FINALIZE" | "UNLOCK"

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { items: true },
    });

    if (!payroll) {
      return NextResponse.json({ success: false, error: "Payroll not found" }, { status: 404 });
    }

    if (action === "UNLOCK") {
      if (userRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          { success: false, error: "មានតែ Super Admin ប៉ុណ្ណោះដែលអាចដោះសោ (Unlock) តារាងប្រាក់ខែបាន!" },
          { status: 403 }
        );
      }

      await prisma.payroll.update({
        where: { id: payrollId },
        data: {
          isFinalized: false,
          finalizedAt: null,
          finalizedBy: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: "PAYROLL_UNLOCK",
          entity: "Payroll",
          details: `Super Admin ${userName} បានដោះសោ (Unlock) តារាងប្រាក់ខែខែ ${payroll.month}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "បានដោះសោតារាងប្រាក់ខែដោយជោគជ័យ!",
      });
    }

    // Default action: FINALIZE
    const totalAmount = payroll.items.reduce((sum, it) => sum + it.netPay, 0);

    await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        isFinalized: true,
        finalizedAt: new Date(),
        finalizedBy: userName,
        totalAmount: Math.round(totalAmount * 100) / 100,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "PAYROLL_FINALIZE",
        entity: "Payroll",
        details: `បាន Finalize និងចាក់សោតារាងប្រាក់ខែខែ ${payroll.month} (បុគ្គលិក ${payroll.items.length} នាក់, សរុប $${totalAmount.toFixed(2)}) ដោយ ${userName}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បាន Finalize និងចាក់សោតារាងប្រាក់ខែដោយជោគជ័យ!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
