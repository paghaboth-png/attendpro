import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchTelegramNotification, checkAndNotifyAbsentEmployees } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);

    const company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });

    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const branch = await prisma.branch.findFirst({
      where: { companyId: company.id, isActive: true },
    });

    const todayDayOfWeek = String(nowLocal.getUTCDay()); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    const [allEmployees, attendances, approvedLeaves] = await Promise.all([
      prisma.employee.findMany({
        where: { companyId: company.id, isActive: true },
        include: { shift: true },
      }),
      prisma.attendance.findMany({
        where: { date: todayStr },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          fromDate: { lte: nowUtc },
          toDate: { gte: nowUtc },
        },
      }),
    ]);

    // Count only employees scheduled to work today
    const scheduledEmployees = allEmployees.filter((emp) => {
      // Check join date
      if (emp.joinDate) {
        const jDate = new Date(emp.joinDate);
        jDate.setHours(0, 0, 0, 0);
        if (nowLocal < jDate) return false;
      }
      const scheduledDaysList = (emp.workingDays || emp.shift?.workDays || "1,2,3,4,5")
        .split(",")
        .map((d: string) => d.trim());
      return scheduledDaysList.includes(todayDayOfWeek);
    });

    const totalScheduled = scheduledEmployees.length;
    const good = attendances.filter((a) => a.status === "GOOD").length;
    const late = attendances.filter((a) => a.status === "LATE").length;
    const present = attendances.length;
    const leave = approvedLeaves.length;
    const absent = Math.max(0, totalScheduled - (present + leave));

    const summaryPayload = {
      date: todayStr,
      branch: branch?.name || "THE ONE COFFEE (ស្វាយរៀង)",
      total: totalScheduled,
      good,
      late,
      leave,
      absent,
    };

    // Check absent employees if notifyAbsent is enabled
    try {
      await checkAndNotifyAbsentEmployees();
    } catch {}

    // Dispatch Telegram message if configured & enabled
    await dispatchTelegramNotification("DAILY", summaryPayload);

    return NextResponse.json({
      success: true,
      message: "Daily attendance summary calculated and dispatched!",
      data: summaryPayload,
    });
  } catch (error: any) {
    console.error("Daily summary error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
