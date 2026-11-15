import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
      workingDays,
      shiftScheduleType,
      customStartTime,
      customEndTime,
      daySchedules,
      customGraceMinutes,
      joinDate,
      endProbationDate,
      endContractDate,
      otherBranchIds,
      employmentType,
      pin,
      resetLock,
      baseSalary,
      salaryType,
      isActive,
      hiddenInReport,
      linkedUserId,
      userId,
    } = body;

    let hashedPin: string | undefined = undefined;
    if (pin && typeof pin === "string" && pin.trim()) {
      hashedPin = pin.startsWith("$2") ? pin : await bcrypt.hash(pin.trim(), 10);
    }

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
        ...(workingDays !== undefined && { workingDays }),
        ...(shiftScheduleType !== undefined && { shiftScheduleType }),
        ...(customStartTime !== undefined && { customStartTime }),
        ...(customEndTime !== undefined && { customEndTime }),
        ...(daySchedules !== undefined && {
          daySchedules: daySchedules ? (typeof daySchedules === "string" ? daySchedules : JSON.stringify(daySchedules)) : null,
        }),
        ...(customGraceMinutes !== undefined && { customGraceMinutes: parseInt(customGraceMinutes) || 15 }),
        ...(joinDate !== undefined && { joinDate: joinDate ? new Date(joinDate) : null }),
        ...(endProbationDate !== undefined && { endProbationDate: endProbationDate ? new Date(endProbationDate) : null }),
        ...(endContractDate !== undefined && { endContractDate: endContractDate ? new Date(endContractDate) : null }),
        ...(otherBranchIds !== undefined && {
          otherBranchIds: Array.isArray(otherBranchIds) ? otherBranchIds.join(",") : (otherBranchIds || null),
        }),
        ...(employmentType !== undefined && { employmentType }),
        ...(hashedPin !== undefined && { pin: hashedPin, mustChangePin: false }),
        ...(resetLock && { pinFailedAttempts: 0, pinLockedUntil: null }),
        ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) }),
        ...(salaryType !== undefined && { salaryType }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(hiddenInReport !== undefined && { hiddenInReport: Boolean(hiddenInReport) }),
        ...((userId !== undefined || linkedUserId !== undefined) && {
          userId: userId || linkedUserId || null,
        }),
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
