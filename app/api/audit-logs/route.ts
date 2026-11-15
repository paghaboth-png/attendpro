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
        { success: false, error: "គ្មានសិទ្ធិចូលមើលទំព័រនេះឡើយ (Unauthorized)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "20")));
    const action = searchParams.get("action") || "";
    const search = searchParams.get("search") || "";

    const where: any = {};

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (search.trim()) {
      where.OR = [
        { action: { contains: search.trim(), mode: "insensitive" } },
        { entity: { contains: search.trim(), mode: "insensitive" } },
        { details: { contains: search.trim(), mode: "insensitive" } },
        { user: { name: { contains: search.trim(), mode: "insensitive" } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("AuditLog GET error:", error);
    return NextResponse.json(
      { success: false, error: "បរាជ័យក្នុងការទាញយកកំណត់ហេតុ" },
      { status: 500 }
    );
  }
}
