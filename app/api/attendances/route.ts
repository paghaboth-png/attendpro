import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const branchId = searchParams.get("branchId");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: any = {};

    if (date && date !== "all") {
      where.date = date;
    } else if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }

    if (branchId && branchId !== "all") {
      where.branchId = branchId;
    }

    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }

    if (status && status !== "all") {
      if (status === "MANUAL") {
        where.isManual = true;
      } else {
        where.status = status;
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            branch: true,
            position: true,
            department: true,
            shift: true,
          },
        },
        branch: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: attendances,
      count: attendances.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      employeeId,
      branchId,
      date,
      checkInTime, // HH:mm
      checkOutTime, // HH:mm
      status = "GOOD",
      note,
    } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { success: false, error: "សូមជ្រើសរើសបុគ្គលិក និងកាលបរិច្ឆេទ" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { branch: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញបុគ្គលិកឡើយ" },
        { status: 404 }
      );
    }

    const effectiveBranchId = branchId || employee.branchId;

    // Parse checkInAt and checkOutAt
    let checkInAt: Date | null = null;
    let checkOutAt: Date | null = null;

    if (checkInTime) {
      checkInAt = new Date(`${date}T${checkInTime}:00+07:00`);
    }
    if (checkOutTime) {
      checkOutAt = new Date(`${date}T${checkOutTime}:00+07:00`);
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
      update: {
        branchId: effectiveBranchId,
        checkInAt,
        checkOutAt,
        status,
        note: note || "កែប្រែដោយ Admin (Manual Entry)",
        isManual: true,
      },
      create: {
        employeeId,
        branchId: effectiveBranchId,
        date,
        checkInAt,
        checkOutAt,
        status,
        note: note || "បន្ថែមដោយ Admin (Manual Entry)",
        isManual: true,
      },
    });

    // Create Audit Log
    try {
      const user = session?.user as any;
      await prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          action: "ATTENDANCE_MANUAL_CREATE",
          entity: "Attendance",
          details: `Admin ${user?.name || "Admin"} បានបន្ថែម/កែវត្តមានដោយដៃឱ្យ ${employee.name} (${employee.code}) សម្រាប់កាលបរិច្ឆេទ ${date}`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "បានកត់ត្រាវត្តមានដោយដៃជោគជ័យ!",
      data: attendance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { id, checkInTime, checkOutTime, status, note, date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing attendance id" },
        { status: 400 }
      );
    }

    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Attendance record not found" },
        { status: 404 }
      );
    }

    const effectiveDate = date || existing.date;
    let checkInAt: Date | undefined = undefined;
    let checkOutAt: Date | undefined = undefined;

    if (checkInTime !== undefined) {
      checkInAt = checkInTime ? new Date(`${effectiveDate}T${checkInTime}:00+07:00`) : undefined;
    }
    if (checkOutTime !== undefined) {
      checkOutAt = checkOutTime ? new Date(`${effectiveDate}T${checkOutTime}:00+07:00`) : undefined;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(checkInAt !== undefined && { checkInAt }),
        ...(checkOutAt !== undefined && { checkOutAt }),
        ...(status && { status }),
        ...(note !== undefined && { note }),
        isManual: true,
      },
    });

    // Audit Log
    try {
      const user = session?.user as any;
      await prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          action: "ATTENDANCE_MANUAL_UPDATE",
          entity: "Attendance",
          details: `Admin ${user?.name || "Admin"} បានកែប្រែវត្តមានរបស់ ${existing.employee.name} កាលបរិច្ឆេទ ${existing.date}`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "បានកែប្រែវត្តមានជោគជ័យ!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing attendance id" },
        { status: 400 }
      );
    }

    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (existing) {
      await prisma.attendance.delete({ where: { id } });

      try {
        const user = session?.user as any;
        await prisma.auditLog.create({
          data: {
            userId: user?.id || null,
            action: "ATTENDANCE_MANUAL_DELETE",
            entity: "Attendance",
            details: `Admin ${user?.name || "Admin"} បានលុបកំណត់ត្រាវត្តមានរបស់ ${existing.employee.name} (${existing.date})`,
          },
        });
      } catch {}
    }

    return NextResponse.json({ success: true, message: "បានលុបជោគជ័យ" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
