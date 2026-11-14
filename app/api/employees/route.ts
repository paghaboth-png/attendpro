import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const departmentId = searchParams.get("departmentId");
    const query = searchParams.get("q") || "";

    const where: any = {};
    if (branchId && branchId !== "all") where.branchId = branchId;
    if (departmentId && departmentId !== "all") where.departmentId = departmentId;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        branch: true,
        department: true,
        position: true,
        shift: true,
        user: { select: { email: true, role: true } },
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      code,
      phone,
      branchId,
      departmentId,
      positionId,
      shiftId,
      email,
      password,
      role,
      isActive,
      hiddenInReport,
    } = body;

    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });

    // Check code uniqueness
    const existingCode = await prisma.employee.findUnique({ where: { code } });
    if (existingCode) {
      return NextResponse.json({ success: false, error: "Employee Code already exists" }, { status: 400 });
    }

    let userId: string | null = null;
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const passwordHash = await bcrypt.hash(password || "Attend@12345", 10);
        const newUser = await prisma.user.create({
          data: {
            email,
            phone: phone || null,
            name,
            passwordHash,
            role: role || "EMPLOYEE",
          },
        });
        userId = newUser.id;
      }
    }

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        code,
        name,
        phone: phone || null,
        branchId,
        departmentId,
        positionId,
        shiftId,
        userId,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        hiddenInReport: hiddenInReport !== undefined ? Boolean(hiddenInReport) : false,
      },
      include: {
        branch: true,
        department: true,
        position: true,
        shift: true,
      },
    });

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
