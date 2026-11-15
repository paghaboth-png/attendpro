import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchTelegramNotification } from "@/lib/telegram";

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

    const [totalEmployees, attendances, approvedLeaves] = await Promise.all([
      prisma.employee.count({
        where: { companyId: company.id, isActive: true },
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

    const good = attendances.filter((a) => a.status === "GOOD").length;
    const late = attendances.filter((a) => a.status === "LATE").length;
    const present = attendances.length;
    const leave = approvedLeaves.length;
    const absent = Math.max(0, totalEmployees - (present + leave));

    const summaryPayload = {
      date: todayStr,
      branch: branch?.name || "THE ONE COFFEE (ស្វាយរៀង)",
      total: totalEmployees,
      good,
      late,
      leave,
      absent,
    };

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
