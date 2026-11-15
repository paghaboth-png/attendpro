import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      employeeIds,
      shiftId,
      workingDays,
      shiftScheduleType,
      customStartTime,
      customEndTime,
      customGraceMinutes,
    } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "សូមជ្រើសរើសបុគ្គលិកយ៉ាងហោចណាស់ម្នាក់" },
        { status: 400 }
      );
    }

    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: "សូមជ្រើសរើសវេនធ្វើការ" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { templates: true },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញវេនធ្វើការដែលបានជ្រើស" },
        { status: 404 }
      );
    }

    const resolvedDays = workingDays || shift.workDays || "1,2,3,4,5";
    const updateData: any = {
      shiftId: shift.id,
      workingDays: resolvedDays,
      shiftScheduleType: shiftScheduleType || "TEMPLATE",
    };

    if (shiftScheduleType === "CUSTOM") {
      updateData.customStartTime = customStartTime || shift.startTime;
      updateData.customEndTime = customEndTime || shift.endTime;
    } else {
      updateData.customStartTime = null;
      updateData.customEndTime = null;
    }

    if (customGraceMinutes !== undefined && customGraceMinutes !== null) {
      updateData.customGraceMinutes = parseInt(customGraceMinutes) || shift.graceMinutes || 15;
    }

    const result = await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `បានកែសម្រួលវេនបុគ្គលិកចំនួន ${result.count} នាក់ដោយជោគជ័យ`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
