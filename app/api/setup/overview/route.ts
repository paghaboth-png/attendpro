import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [branches, departments, positions, shifts, employees] = await Promise.all([
      prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.department.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.position.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.shift.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.employee.findMany({
        include: {
          branch: true,
          department: true,
          position: true,
          shift: true,
          user: {
            select: { email: true, role: true },
          },
        },
        orderBy: { code: "asc" },
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
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
