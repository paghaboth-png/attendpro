import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEmployeePayroll } from "@/lib/payroll-calculator";

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
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    // 1. List of all generated Payrolls
    if (searchParams.get("list") === "true") {
      const payrolls = await prisma.payroll.findMany({
        where: { companyId: company.id },
        include: {
          branch: true,
          department: true,
          items: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted = payrolls.map((p) => {
        const startStr = p.startDate ? p.startDate.toISOString().slice(0, 10) : `${p.month}-01`;
        const endStr = p.endDate ? p.endDate.toISOString().slice(0, 10) : `${p.month}-28`;
        return {
          id: p.id,
          title: p.title || `Payroll ${p.month}`,
          month: p.month,
          startDate: startStr,
          endDate: endStr,
          branchId: p.branchId,
          branchName: p.branch?.name || "គ្រប់សាខាទាំងអស់",
          departmentName: p.department?.name || "គ្រប់ផ្នែក",
          employeeCount: p.items.length,
          totalAmount: p.totalAmount,
          status: p.status || (p.isFinalized ? "APPROVED" : "CHECKING"),
          isFinalized: p.isFinalized,
          createdAt: p.createdAt.toISOString(),
          finalizedBy: p.finalizedBy,
          verifiedBy: p.verifiedBy,
          approvedBy: p.approvedBy,
        };
      });

      return NextResponse.json({ success: true, data: formatted });
    }

    // 2. Fetch specific Payroll by ID
    const payrollId = searchParams.get("payrollId");
    if (payrollId) {
      const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId },
        include: {
          branch: true,
          department: true,
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

      if (!payroll) {
        return NextResponse.json({ success: false, error: "រកមិនឃើញ Payroll ឡើយ" }, { status: 404 });
      }

      const totalGross = payroll.items.reduce((sum, item) => sum + item.grossPay, 0);
      const totalDeductions = payroll.items.reduce(
        (sum, item) =>
          sum + item.latePenalty + item.absentPenalty + item.deduction + item.taxDeduction + item.nssfDeduction,
        0
      );
      const totalNet = payroll.items.reduce((sum, item) => sum + item.netPay, 0);

      return NextResponse.json({
        success: true,
        data: {
          payroll,
          items: payroll.items,
          summary: {
            totalEmployees: payroll.items.length,
            totalGrossPay: totalGross,
            totalDeductions,
            totalNetPay: totalNet,
          },
          status: payroll.status,
          isFinalized: payroll.isFinalized,
        },
      });
    }

    // 3. Fallback: Get or preview current month payroll
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowKhmer = new Date(nowUtc.getTime() + phnomPenhOffset);
    const currentMonth = nowKhmer.toISOString().slice(0, 7);

    const month = searchParams.get("month") || currentMonth;
    const branchId = searchParams.get("branchId") || "all";

    const payrollWhere: any = {
      companyId: company.id,
      month,
      branchId: branchId === "all" ? null : branchId,
    };

    const latestPayroll = await prisma.payroll.findFirst({
      where: payrollWhere,
      include: {
        branch: true,
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
      orderBy: { createdAt: "desc" },
    });

    if (latestPayroll) {
      const totalGross = latestPayroll.items.reduce((sum, item) => sum + item.grossPay, 0);
      const totalDeductions = latestPayroll.items.reduce(
        (sum, item) =>
          sum + item.latePenalty + item.absentPenalty + item.deduction + item.taxDeduction + item.nssfDeduction,
        0
      );
      const totalNet = latestPayroll.items.reduce((sum, item) => sum + item.netPay, 0);

      return NextResponse.json({
        success: true,
        data: {
          payroll: latestPayroll,
          items: latestPayroll.items,
          summary: {
            totalEmployees: latestPayroll.items.length,
            totalGrossPay: totalGross,
            totalDeductions,
            totalNetPay: totalNet,
          },
          status: latestPayroll.status,
          isFinalized: latestPayroll.isFinalized,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        payroll: null,
        items: [],
        summary: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
        status: "PREPARE",
        isFinalized: false,
      },
    });
  } catch (error: any) {
    console.error("Payroll GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Generate New Payroll or Update Status
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;
    const userName = (session?.user as any)?.name || "Admin";

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    // ==============================================================
    // ACTION 1: GENERATE NEW PAYROLL (With Date Range & Overlap Check)
    // ==============================================================
    if (action === "GENERATE") {
      const {
        startDate, // YYYY-MM-DD
        endDate,   // YYYY-MM-DD
        branchId = "all",
        departmentId = "all",
        employeeIds = [], // Array of IDs, or empty/all
        showResign = false,
      } = body;

      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: "សូមជ្រើសរើសកាលបរិច្ឆេទចាប់ផ្តើម និងបញ្ចប់" },
          { status: 400 }
        );
      }

      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      // Validation 1: From > To
      if (start > end) {
        return NextResponse.json(
          { success: false, error: "កាលបរិច្ឆេទចាប់ផ្តើមមិនអាចធំជាងកាលបរិច្ឆេទបញ្ចប់ឡើយ" },
          { status: 400 }
        );
      }

      // Validation 2: Difference > 62 days
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 62) {
        return NextResponse.json(
          { success: false, error: "ចន្លោះកាលបរិច្ឆេទមិនអាចលើសពី ៦២ ថ្ងៃ (២ ខែ) ឡើយ" },
          { status: 400 }
        );
      }

      // Filter employees
      const empWhere: any = { companyId: company.id };
      if (!showResign) {
        empWhere.isActive = true;
      }
      if (branchId !== "all") {
        empWhere.branchId = branchId;
      }
      if (departmentId !== "all") {
        empWhere.departmentId = departmentId;
      }
      if (Array.isArray(employeeIds) && employeeIds.length > 0) {
        empWhere.id = { in: employeeIds };
      }

      const targetEmployees = await prisma.employee.findMany({
        where: empWhere,
        include: {
          branch: true,
          department: true,
          position: true,
          shift: true,
        },
        orderBy: { code: "asc" },
      });

      if (targetEmployees.length === 0) {
        return NextResponse.json(
          { success: false, error: "មិនមានបុគ្គលិកត្រូវនឹងតម្រងដែលបានជ្រើសឡើយ" },
          { status: 400 }
        );
      }

      // Overlap Check: Check if any selected employee already has a Payroll item overlapping with [start, end]
      const overlappingItems = await prisma.payrollItem.findMany({
        where: {
          employeeId: { in: targetEmployees.map((e) => e.id) },
          payroll: {
            companyId: company.id,
            startDate: { lte: end },
            endDate: { gte: start },
          },
        },
        include: {
          employee: true,
          payroll: true,
        },
      });

      if (overlappingItems.length > 0) {
        const affectedNames = Array.from(new Set(overlappingItems.map((it) => `${it.employee.name} (${it.employee.code})`))).join(", ");
        return NextResponse.json(
          {
            success: false,
            error: `មានបុគ្គលិកស្ទួនដែលមាន Payroll ក្នុងចន្លោះថ្ងៃនេះរួចហើយ៖ ${affectedNames}។ សូមពិនិត្យចន្លោះកាលបរិច្ឆេទឡើងវិញ!`,
          },
          { status: 400 }
        );
      }

      // Fetch System Settings
      const settings = await prisma.setting.findMany({ where: { companyId: company.id } });
      const sMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

      const latePenaltyAmount = parseFloat(sMap.late_penalty_amount || "1.0");
      const absentPenaltyRate = parseFloat(sMap.absent_penalty_rate || "1.0");
      const overtimeMultiplier = parseFloat(sMap.overtime_multiplier || "1.5");
      const taxEnabled = sMap.tax_enabled === "true";
      const nssfEnabled = sMap.nssf_enabled === "true";
      const prorationFormula = sMap.proration_formula || "ACTUAL_RATIO";

      // Fetch Attendance, Overtime, Leaves, Holidays in [start, end]
      const [attendances, overtimes, leaves, holidays] = await Promise.all([
        prisma.attendance.findMany({
          where: {
            employeeId: { in: targetEmployees.map((e) => e.id) },
            date: { gte: startDate, lte: endDate },
          },
        }),
        prisma.overtime.findMany({
          where: {
            employeeId: { in: targetEmployees.map((e) => e.id) },
            status: "APPROVED",
            date: { gte: start, lte: end },
          },
        }),
        prisma.leaveRequest.findMany({
          where: {
            employeeId: { in: targetEmployees.map((e) => e.id) },
            status: "APPROVED",
            fromDate: { lte: end },
            toDate: { gte: start },
          },
          include: { type: true },
        }),
        prisma.holiday.findMany({
          where: {
            companyId: company.id,
            date: { gte: start, lte: end },
          },
        }),
      ]);

      // Month label (e.g. 2026-11)
      const monthLabel = startDate.slice(0, 7);
      const payrollTitle = `Payroll ${startDate} ដល់ ${endDate}`;

      // Create Payroll Header with status "CHECKING" (Step 2)
      const newPayroll = await prisma.payroll.create({
        data: {
          companyId: company.id,
          branchId: branchId === "all" ? null : branchId,
          departmentId: departmentId === "all" ? null : departmentId,
          title: payrollTitle,
          month: monthLabel,
          startDate: start,
          endDate: end,
          status: "CHECKING",
          isFinalized: false,
          totalAmount: 0,
        },
      });

      let totalNetSum = 0;
      const createdItems = [];

      for (const emp of targetEmployees) {
        const empAtts = attendances.filter((a) => a.employeeId === emp.id);
        const empOts = overtimes.filter((o) => o.employeeId === emp.id);
        const empLeaves = leaves
          .filter((l) => l.employeeId === emp.id)
          .map((l) => ({
            fromDate: l.fromDate,
            toDate: l.toDate,
            isPaid: l.type.id === "leave-annual" || l.type.id === "leave-sick",
          }));

        const calc = calculateEmployeePayroll({
          employee: {
            id: emp.id,
            code: emp.code,
            name: emp.name,
            baseSalary: emp.baseSalary,
            salaryType: emp.salaryType || "MONTHLY",
            workDaysPerMonth: emp.workDaysPerMonth || 26,
            workingDays: emp.workingDays,
            joinDate: emp.joinDate,
            createdAt: emp.createdAt,
            isActive: emp.isActive,
            shift: emp.shift,
          },
          startDate: start,
          endDate: end,
          attendances: empAtts,
          overtimes: empOts,
          leaves: empLeaves,
          holidays,
          settings: {
            latePenaltyAmount,
            absentPenaltyRate,
            overtimeMultiplier,
            taxEnabled,
            nssfEnabled,
            prorationFormula,
          },
        });

        totalNetSum += calc.netPay;

        const item = await prisma.payrollItem.create({
          data: {
            payrollId: newPayroll.id,
            employeeId: emp.id,
            baseSalary: calc.baseSalary,
            salaryType: calc.salaryType,
            workDays: calc.workDays,
            actualDays: calc.actualDays,
            proratedBase: calc.proratedBase,
            workDaysRatio: calc.workDaysRatio,
            lateCount: calc.lateCount,
            latePenalty: calc.latePenalty,
            absentDays: calc.absentDays,
            absentPenalty: calc.absentPenalty,
            otHours: calc.otHours,
            otPay: calc.otPay,
            allowance: calc.allowance,
            bonus: calc.bonus,
            deduction: calc.deduction,
            grossPay: calc.grossPay,
            taxDeduction: calc.taxDeduction,
            nssfDeduction: calc.nssfDeduction,
            netPay: calc.netPay,
            note: calc.note,
            isEdited: false,
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

        createdItems.push(item);
      }

      // Update total on header
      await prisma.payroll.update({
        where: { id: newPayroll.id },
        data: { totalAmount: Math.round(totalNetSum * 100) / 100 },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PAYROLL_GENERATE",
          entity: "Payroll",
          details: `បានបង្កើត Payroll ថ្មី (${startDate} ដល់ ${endDate}) ចំនួនបុគ្គលិក ${createdItems.length} នាក់, សរុបទឹកប្រាក់ $${totalNetSum.toFixed(2)}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `បានបង្កើត Payroll ដោយជោគជ័យ! (${createdItems.length} នាក់)`,
        data: {
          payrollId: newPayroll.id,
          totalEmployees: createdItems.length,
          totalAmount: totalNetSum,
        },
      });
    }

    // ==============================================================
    // ACTION 2: UPDATE WORKFLOW STATUS (CHECKING -> VERIFIED -> APPROVED -> UNLOCK)
    // ==============================================================
    if (action === "UPDATE_STATUS") {
      const { payrollId, targetStatus } = body;

      const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId },
      });

      if (!payroll) {
        return NextResponse.json({ success: false, error: "រកមិនឃើញ Payroll ឡើយ" }, { status: 404 });
      }

      // 1. Move to VERIFIED (Super Admin / Admin confirmation)
      if (targetStatus === "VERIFIED") {
        const updated = await prisma.payroll.update({
          where: { id: payrollId },
          data: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: userName,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            action: "PAYROLL_VERIFIED",
            entity: "Payroll",
            details: `បានផ្ទៀងផ្ទាត់ Payroll (${payroll.title || payroll.month})`,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Payroll ត្រូវបានផ្ទៀងផ្ទាត់រួចរាល់ (Step 3: Verification)!",
          data: updated,
        });
      }

      // 2. Move to APPROVED (Lock)
      if (targetStatus === "APPROVED") {
        if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
          return NextResponse.json({ success: false, error: "មានតែ Admin / Super Admin ប៉ុណ្ណោះដែលអាចអនុម័តបាន" }, { status: 403 });
        }

        const updated = await prisma.payroll.update({
          where: { id: payrollId },
          data: {
            status: "APPROVED",
            isFinalized: true,
            approvedAt: new Date(),
            approvedBy: userName,
            finalizedAt: new Date(),
            finalizedBy: userName,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            action: "PAYROLL_APPROVED_LOCKED",
            entity: "Payroll",
            details: `បានអនុម័ត និងចាក់សោ Payroll (${payroll.title || payroll.month})`,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Payroll ត្រូវបានអនុម័ត និងចាក់សោជាស្ថាពរ (Step 4: Approved)!",
          data: updated,
        });
      }

      // 3. Return to CHECKING (from VERIFIED or UNLOCK from APPROVED)
      if (targetStatus === "CHECKING") {
        if (payroll.status === "APPROVED" && userRole !== "SUPER_ADMIN") {
          return NextResponse.json(
            { success: false, error: "មានតែ Super Admin ប៉ុណ្ណោះដែលអាចដោះសោ (Unlock) Payroll ដែលបានអនុម័តរួច!" },
            { status: 403 }
          );
        }

        const updated = await prisma.payroll.update({
          where: { id: payrollId },
          data: {
            status: "CHECKING",
            isFinalized: false,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            action: "PAYROLL_UNLOCKED",
            entity: "Payroll",
            details: `បានដោះសោ ឬត្រឡប់ Payroll (${payroll.title || payroll.month}) ទៅកាន់ដំណាក់កាលត្រួតពិនិត្យ (Checking)`,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Payroll ត្រូវបានត្រឡប់មកដំណាក់កាលត្រួតពិនិត្យ (Checking) វិញ!",
          data: updated,
        });
      }

      return NextResponse.json({ success: false, error: "ស្ថានភាពមិនត្រឹមត្រូវឡើយ" }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Payroll POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Update Single Payroll Item (Bonus, Deduction, Penalty, Note)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { itemId, allowance, bonus, deduction, latePenalty, absentPenalty, note } = body;

    const item = await prisma.payrollItem.findUnique({
      where: { id: itemId },
      include: {
        payroll: true,
        employee: true,
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "រកមិនឃើញទិន្នន័យប្រាក់បៀវត្សឡើយ" }, { status: 404 });
    }

    if (item.payroll.isFinalized || item.payroll.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Payroll នេះត្រូវបានចាក់សោរួចរាល់ មិនអាចកែប្រែបានឡើយ!" },
        { status: 400 }
      );
    }

    const newAllowance = allowance !== undefined ? parseFloat(allowance) || 0 : item.allowance;
    const newBonus = bonus !== undefined ? parseFloat(bonus) || 0 : item.bonus;
    const newDeduction = deduction !== undefined ? parseFloat(deduction) || 0 : item.deduction;
    const newLatePenalty = latePenalty !== undefined ? parseFloat(latePenalty) || 0 : item.latePenalty;
    const newAbsentPenalty = absentPenalty !== undefined ? parseFloat(absentPenalty) || 0 : item.absentPenalty;

    const basePay = item.proratedBase && item.proratedBase > 0 ? item.proratedBase : item.baseSalary;
    const grossPay = Math.round((basePay + item.otPay + newAllowance + newBonus) * 100) / 100;
    const totalDeductions = Math.round(
      (newLatePenalty + newAbsentPenalty + newDeduction + item.taxDeduction + item.nssfDeduction) * 100
    ) / 100;
    const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100);

    const updatedItem = await prisma.payrollItem.update({
      where: { id: itemId },
      data: {
        allowance: newAllowance,
        bonus: newBonus,
        deduction: newDeduction,
        latePenalty: newLatePenalty,
        absentPenalty: newAbsentPenalty,
        grossPay,
        netPay,
        note: note !== undefined ? note : item.note,
        isEdited: true,
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

    // Recalculate total for payroll
    const allItems = await prisma.payrollItem.findMany({
      where: { payrollId: item.payrollId },
    });
    const totalNetSum = allItems.reduce((sum, it) => sum + it.netPay, 0);

    await prisma.payroll.update({
      where: { id: item.payrollId },
      data: { totalAmount: Math.round(totalNetSum * 100) / 100 },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "PAYROLL_ITEM_EDIT",
        entity: "PayrollItem",
        details: `បានកែសម្រួលប្រាក់ខែបុគ្គលិក ${item.employee.name} (${item.employee.code}): Bonus +$${newBonus}, Allowance +$${newAllowance}, Deduction -$${newDeduction}, Net: $${netPay}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `បានកែសម្រួលប្រាក់ខែបុគ្គលិក ${item.employee.name} ដោយជោគជ័យ!`,
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Payroll PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
