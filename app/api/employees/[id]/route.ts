import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
      pin,
      resetLock,
      baseSalary,
      salaryType,
      isActive,
      hiddenInReport,
    } = body;

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(phone !== undefined && { phone }),
        ...(branchId && { branchId }),
        ...(departmentId && { departmentId }),
        ...(positionId && { positionId }),
        ...(shiftId && { shiftId }),
        ...(pin !== undefined && { pin }),
        ...(resetLock && { pinFailedAttempts: 0, pinLockedUntil: null }),
        ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) }),
        ...(salaryType !== undefined && { salaryType }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(hiddenInReport !== undefined && { hiddenInReport: Boolean(hiddenInReport) }),
      },
    });

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.employee.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
