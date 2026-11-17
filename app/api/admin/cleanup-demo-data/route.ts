import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== "SUPER_ADMIN" || !userId) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    const currentEmpId = currentUser?.employee?.id;

    // Employees to delete: all except the current Super Admin's employee profile
    const employeesToDelete = await prisma.employee.findMany({
      where: {
        id: currentEmpId ? { not: currentEmpId } : undefined,
        // Preserve any employee attached to any SUPER_ADMIN user
        user: {
          role: { not: "SUPER_ADMIN" },
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      },
      orderBy: { code: "asc" },
    });

    const deleteEmpIds = employeesToDelete.map((e) => e.id);

    // Count related demo records
    const [attendanceCount, leaveCount, overtimeCount, payrollItemCount] = await Promise.all([
      prisma.attendance.count({ where: { employeeId: { in: deleteEmpIds } } }),
      prisma.leaveRequest.count({ where: { employeeId: { in: deleteEmpIds } } }),
      prisma.overtime.count({ where: { employeeId: { in: deleteEmpIds } } }),
      prisma.payrollItem.count({ where: { employeeId: { in: deleteEmpIds } } }),
    ]);

    // Check my attendances count
    const myAttendanceCount = currentEmpId
      ? await prisma.attendance.count({ where: { employeeId: currentEmpId } })
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        employeesToDelete,
        deleteCount: employeesToDelete.length,
        recordsBreakdown: {
          attendances: attendanceCount,
          leaves: leaveCount,
          overtimes: overtimeCount,
          payrollItems: payrollItemCount,
          myAttendances: myAttendanceCount,
        },
        preserved: {
          superAdminName: currentUser?.name,
          superAdminPhone: currentUser?.phone || currentUser?.email,
          linkedEmployee: currentUser?.employee
            ? `${currentUser.employee.name} (${currentUser.employee.code})`
            : "គ្មាន (មិនទាន់ភ្ជាប់)",
          systemConfig: "សាខា, វេនម៉ោង, ថ្ងៃបុណ្យ, Settings, Logo, Telegram, QR Check-in",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Super Admin";

    if (!session || userRole !== "SUPER_ADMIN" || !userId) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { confirmWord, deleteMyAttendances } = body;

    if ((confirmWord || "").trim() !== "លុប") {
      return NextResponse.json(
        { success: false, error: 'សូមវាយពាក្យ "លុប" ជាភាសាខ្មែរឱ្យបានត្រឹមត្រូវដើម្បីបញ្ជាក់!' },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    const currentEmpId = currentUser?.employee?.id;

    // Identify target demo employees
    const employeesToDelete = await prisma.employee.findMany({
      where: {
        id: currentEmpId ? { not: currentEmpId } : undefined,
        user: {
          role: { not: "SUPER_ADMIN" },
        },
      },
      select: { id: true, userId: true, code: true, name: true },
    });

    const deleteEmpIds = employeesToDelete.map((e) => e.id);
    const deleteUserIds = employeesToDelete.map((e) => e.userId).filter(Boolean) as string[];

    // Execute atomic cleanup transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete attendances
      const attWhere: any = {
        OR: [
          { employeeId: { in: deleteEmpIds } },
          ...(deleteMyAttendances && currentEmpId ? [{ employeeId: currentEmpId }] : []),
        ],
      };
      const deletedAtt = await tx.attendance.deleteMany({ where: attWhere });

      // 2. Delete leaves & overtimes
      const deletedLeaves = await tx.leaveRequest.deleteMany({ where: { employeeId: { in: deleteEmpIds } } });
      const deletedOvertimes = await tx.overtime.deleteMany({ where: { employeeId: { in: deleteEmpIds } } });

      // 3. Delete payroll items and payrolls
      await tx.payrollItem.deleteMany({ where: { employeeId: { in: deleteEmpIds } } });
      const deletedPayrolls = await tx.payroll.deleteMany({});

      // 4. Delete demo employees
      const deletedEmployees = await tx.employee.deleteMany({
        where: { id: { in: deleteEmpIds } },
      });

      // 5. Delete demo users (excluding any SUPER_ADMIN user)
      const deletedUsers = await tx.user.deleteMany({
        where: {
          id: { in: deleteUserIds },
          role: { not: "SUPER_ADMIN" },
        },
      });

      // 6. Delete old notifications except ones for Super Admin
      await tx.notification.deleteMany({
        where: { userId: { not: userId } },
      });

      // 7. Clean old audit logs but KEEP Super Admin actions
      await tx.auditLog.deleteMany({
        where: {
          action: {
            notIn: ["CLEANUP_DEMO_DATA", "CREATE_SUPER_ADMIN", "GENERATE_RECOVERY_CODES", "BACKUP_EXPORT"],
          },
          userId: { not: userId },
        },
      });

      // 8. Record the audit log inside transaction
      await tx.auditLog.create({
        data: {
          userId,
          action: "CLEANUP_DEMO_DATA",
          entity: "System",
          details: `Super Admin (${userName}) បានសម្អាតទិន្នន័យសាកល្បង៖ បានលុបបុគ្គលិកចំនួន ${deletedEmployees.count} នាក់, វត្តមាន ${deletedAtt.count}, ច្បាប់ ${deletedLeaves.count}, OT ${deletedOvertimes.count}, និងប្រាក់ខែ ${deletedPayrolls.count} ដោយជោគជ័យ។ រក្សាទុក Super Admin និង EMP011។`,
        },
      });

      return {
        deletedEmployeesCount: deletedEmployees.count,
        deletedAttendancesCount: deletedAtt.count,
        deletedLeavesCount: deletedLeaves.count,
        deletedOvertimesCount: deletedOvertimes.count,
        deletedPayrollsCount: deletedPayrolls.count,
        deletedUsersCount: deletedUsers.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: `បានសម្អាតទិន្នន័យសាកល្បងដោយជោគជ័យ! បានលុបបុគ្គលិក ${result.deletedEmployeesCount} នាក់ និងទិន្នន័យពាក់ព័ន្ធ។`,
      summary: result,
    });
  } catch (error: any) {
    console.error("cleanup-demo-data error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "មានបញ្ហាក្នុងការសម្អាតទិន្នន័យ (Transaction Rolled Back)" },
      { status: 500 }
    );
  }
}
