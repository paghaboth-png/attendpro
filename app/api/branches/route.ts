import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, data: branches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, lat, lng, radiusMeters, address, isActive } = body;

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const branch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name,
        lat: parseFloat(lat) || 11.0917049,
        lng: parseFloat(lng) || 105.7917625,
        radiusMeters: parseInt(radiusMeters) || 100,
        address: address || "",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, data: branch });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
