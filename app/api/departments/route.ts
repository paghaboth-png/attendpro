import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const depts = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, data: depts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });

    const dept = await prisma.department.create({
      data: {
        companyId: company.id,
        name: body.name,
      },
    });
    return NextResponse.json({ success: true, data: dept });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
