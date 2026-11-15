import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [branches, departments, positions, shifts, employees, adminUsers] = await Promise.all([
      prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.department.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.position.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.shift.findMany({
        include: { templates: { orderBy: { startTime: "asc" } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.employee.findMany({
        include: {
          branch: true,
          department: true,
          position: true,
          shift: true,
          user: {
            select: { email: true, phone: true, role: true },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER"] } },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          employee: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        branches,
        departments,
        positions,
        shifts,
        employees,
        adminUsers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
