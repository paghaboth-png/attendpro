import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Super Admin";

    if (!session || userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Super Admin only)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    // 1. Fetch all business entities
    const [company, branches, departments, positions, shifts, employees, attendances, leaves, overtimes, payrolls] =
      await Promise.all([
        prisma.company.findFirst(),
        prisma.branch.findMany({ orderBy: { name: "asc" } }),
        prisma.department.findMany({ orderBy: { name: "asc" } }),
        prisma.position.findMany({ orderBy: { name: "asc" } }),
        prisma.shift.findMany({ include: { templates: true } }),
        prisma.employee.findMany({
          include: {
            branch: { select: { name: true } },
            department: { select: { name: true } },
            position: { select: { name: true } },
            shift: { select: { name: true } },
          },
          orderBy: { code: "asc" },
        }),
        prisma.attendance.findMany({
          include: {
            employee: { select: { code: true, name: true } },
            branch: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        }),
        prisma.leaveRequest.findMany({
          include: {
            employee: { select: { code: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.overtime.findMany({
          include: {
            employee: { select: { code: true, name: true } },
          },
          orderBy: { date: "desc" },
        }),
        prisma.payroll.findMany({
          include: {
            branch: { select: { name: true } },
            items: {
              include: {
                employee: { select: { code: true, name: true } },
              },
            },
          },
          orderBy: { month: "desc" },
        }),
      ]);

    // Audit Log for Backup Export (NEVER log sensitive data)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "BACKUP_EXPORT",
        entity: "System",
        details: `Super Admin (${userName}) បានទាញយកកញ្ចប់ Backup ទិន្នន័យពេញលេញ (${employees.length} បុគ្គលិក, ${attendances.length} វត្តមាន, ${payrolls.length} តារាងប្រាក់ខែ)`,
      },
    });

    const nowStr = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      // Create unified CSV package
      const csvRows = [
        ["ប្រភេទកំណត់ត្រា", "កូដ/ID", "ឈ្មោះ/ព័ត៌មាន", "កាលបរិច្ឆេទ/សាខា", "ស្ថានភាព/ចំនួន"],
        ...employees.map((e) => [
          "EMPLOYEE",
          e.code,
          e.name,
          e.branch?.name || "",
          e.isActive ? "ACTIVE" : "INACTIVE",
        ]),
        ...attendances.map((a) => [
          "ATTENDANCE",
          a.employee.code,
          a.employee.name,
          a.date,
          a.status,
        ]),
        ...leaves.map((l) => [
          "LEAVE",
          l.employee.code,
          l.employee.name,
          `${l.fromDate ? l.fromDate.toISOString().slice(0, 10) : ""} ដល់ ${l.toDate ? l.toDate.toISOString().slice(0, 10) : ""}`,
          l.status,
        ]),
        ...overtimes.map((o) => [
          "OVERTIME",
          o.employee.code,
          o.employee.name,
          o.date.toISOString().slice(0, 10),
          `${o.hours}h - ${o.status}`,
        ]),
      ];

      const csvContent =
        "\uFEFF" + csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendpro_backup_${nowStr}.csv"`,
        },
      });
    }

    // Default: Comprehensive JSON Backup Bundle
    const backupBundle = {
      version: "1.0",
      system: "AttendPro",
      exportedAt: new Date().toISOString(),
      exportedBy: userName,
      data: {
        company,
        branches,
        departments,
        positions,
        shifts,
        employees,
        attendances,
        leaves,
        overtimes,
        payrolls,
      },
    };

    return new NextResponse(JSON.stringify(backupBundle, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendpro_backup_${nowStr}.json"`,
      },
    });
  } catch (error: any) {
    console.error("backup-export error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
