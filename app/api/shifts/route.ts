import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, data: shifts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });

    const shift = await prisma.shift.create({
      data: {
        companyId: company.id,
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        graceMinutes: parseInt(body.graceMinutes) || 15,
        workDays: body.workDays || "1,2,3,4,5,6",
      },
    });
    return NextResponse.json({ success: true, data: shift });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
