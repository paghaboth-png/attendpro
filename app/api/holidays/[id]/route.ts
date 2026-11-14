import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const holiday = await prisma.holiday.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.date && { date: new Date(body.date) }),
        branchId: body.branchId || null,
      },
    });
    return NextResponse.json({ success: true, data: holiday });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.holiday.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
