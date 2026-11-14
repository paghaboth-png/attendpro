import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      include: { branch: true },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ success: true, data: holidays });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });

    const holiday = await prisma.holiday.create({
      data: {
        companyId: company.id,
        name: body.name,
        date: new Date(body.date),
        branchId: body.branchId || null,
      },
    });
    return NextResponse.json({ success: true, data: holiday });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
