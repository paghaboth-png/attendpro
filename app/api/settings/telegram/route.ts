import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken, maskToken } from "@/lib/encryption";
import {
  testTelegramConnection,
  sendTelegramMessage,
  recordTelegramLog,
  checkAndNotifyAbsentEmployees,
} from "@/lib/telegram";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const [company, history] = await Promise.all([
      prisma.company.findFirst({
        include: { telegramConfig: true },
      }),
      prisma.telegramLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          chatId: true,
          error: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    const config = company?.telegramConfig;

    if (!config || !config.botTokenEncrypted) {
      return NextResponse.json({
        success: true,
        data: {
          hasToken: false,
          botTokenMasked: "",
          chatId: config?.chatId || "",
          isEnabled: false,
          notifyLate: false,
          notifyLeave: false,
          notifyDaily: false,
          notifyAllCheckInOut: false,
          notifyAbsent: false,
          dailySummaryTime: "18:00",
          status: "NOT_CONFIGURED", // NOT_CONFIGURED | CONNECTED | ERROR
          botName: null,
          chatTitle: null,
        },
        history,
      });
    }

    const plainToken = decryptToken(config.botTokenEncrypted);

    return NextResponse.json({
      success: true,
      data: {
        hasToken: Boolean(plainToken),
        botTokenMasked: maskToken(plainToken),
        chatId: config.chatId || "",
        isEnabled: config.isEnabled,
        notifyLate: config.notifyLate,
        notifyLeave: config.notifyLeave,
        notifyDaily: config.notifyDaily,
        notifyAllCheckInOut: Boolean(config.notifyAllCheckInOut),
        notifyAbsent: Boolean(config.notifyAbsent),
        dailySummaryTime: config.dailySummaryTime || "18:00",
        status: config.isEnabled && config.chatId ? "CONNECTED" : "NOT_CONFIGURED",
      },
      history,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      action = "SAVE", // "SAVE" | "TEST" | "CHECK_STATUS" | "SEND_DAILY" | "CHECK_ABSENT"
      botToken,
      chatId,
      isEnabled,
      notifyLate,
      notifyLeave,
      notifyDaily,
      notifyAllCheckInOut,
      notifyAbsent,
      dailySummaryTime,
    } = body;

    let company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: "The ONE Coffee" },
        include: { telegramConfig: true },
      });
    }

    let currentConfig = company.telegramConfig;

    // Helper to get active token
    const getActiveToken = () => {
      if (botToken && botToken.trim() && !botToken.startsWith("••••")) {
        return botToken.trim();
      }
      if (currentConfig?.botTokenEncrypted) {
        return decryptToken(currentConfig.botTokenEncrypted);
      }
      return "";
    };

    const targetChatId = (chatId !== undefined ? chatId : currentConfig?.chatId || "").trim();
    const activeToken = getActiveToken();

    // 1. ACTION: CHECK_STATUS
    if (action === "CHECK_STATUS") {
      if (!activeToken) {
        return NextResponse.json({
          success: false,
          error: "សូមបញ្ចូល Bot Token ជាមុនសិន ទើបអាចពិនិត្យស្ថានភាពបាន",
        });
      }

      const statusResult = await testTelegramConnection(activeToken, targetChatId);

      // Auto update if supergroup migrated
      if (statusResult.isMigrated && statusResult.newChatId) {
        try {
          await prisma.telegramConfig.updateMany({
            where: { companyId: company.id },
            data: { chatId: statusResult.newChatId },
          });
        } catch {}
      }

      if (!statusResult.ok) {
        return NextResponse.json({
          success: false,
          error: statusResult.error,
          bot: statusResult.bot,
          newChatId: statusResult.newChatId,
          isMigrated: statusResult.isMigrated,
        });
      }

      return NextResponse.json({
        success: true,
        message: statusResult.isMigrated
          ? `Group ត្រូវបានប្តូរជា Supergroup! ប្រព័ន្ធបានអាប់ដេត Chat ID ថ្មីស្វ័យប្រវត្តិ៖ ${statusResult.newChatId}`
          : `តភ្ជាប់ជោគជ័យ! Bot: @${statusResult.bot?.username} ${
              statusResult.chat ? `| Group: "${statusResult.chat.title}"` : ""
            }`,
        bot: statusResult.bot,
        chat: statusResult.chat,
        newChatId: statusResult.newChatId,
        isMigrated: statusResult.isMigrated,
      });
    }

    // 2. ACTION: TEST MESSAGE
    if (action === "TEST") {
      const rate = checkRateLimit(`telegram_test:${userId}`, 5, 60);
      if (!rate.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `អ្នកបានផ្ញើសាកល្បងញឹកញាប់ពេកហើយ។ សូមរង់ចាំ ${rate.resetInSeconds} វិនាទីទៀត។`,
          },
          { status: 429 }
        );
      }

      if (!activeToken) {
        return NextResponse.json({
          success: false,
          error: "សូមបញ្ចូល Bot Token ជាមុនសិន មុនពេលផ្ញើសារសាកល្បង!",
        });
      }

      if (!targetChatId) {
        return NextResponse.json({
          success: false,
          error: "សូមបញ្ចូល Group Chat ID (ឧទាហរណ៍៖ -1001234567890) ជាមុនសិន!",
        });
      }

      const comp = await prisma.company.findFirst();
      const companyName = comp?.name || "AttendPro";
      const testMsg = `✅ <b>AttendPro តភ្ជាប់ជោគជ័យ!</b>
ប្រព័ន្ធគ្រប់គ្រងវត្តមាន ${companyName} បានភ្ជាប់ទំនាក់ទំនងជាមួយ Telegram Group នេះរួចរាល់ហើយ។
🕒 កាលបរិច្ឆេទ៖ ${new Date().toLocaleString("km-KH", { timeZone: "Asia/Phnom_Penh" })}`;

      const sendRes = await sendTelegramMessage(activeToken, targetChatId, testMsg);

      await recordTelegramLog(
        "TEST",
        sendRes.ok ? "SUCCESS" : "FAILED",
        sendRes.newChatId || targetChatId,
        sendRes.ok
          ? sendRes.isMigrated
            ? "ជោគជ័យ (បានអាប់ដេត Chat ID ថ្មី)"
            : null
          : sendRes.error,
        "ផ្ញើសារសាកល្បងដោយ Admin"
      );

      if (!sendRes.ok) {
        return NextResponse.json({
          success: false,
          error: `មិនអាចផ្ញើសារបាន: ${sendRes.error}`,
          newChatId: sendRes.newChatId,
        });
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: "TELEGRAM_TEST_SENT",
          entity: "TelegramConfig",
          details: `បានផ្ញើសារសាកល្បងទៅ Group Chat ID: ${sendRes.newChatId || targetChatId}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: sendRes.isMigrated
          ? `✅ សារសាកល្បងត្រូវបានផ្ញើជោគជ័យ! (Group បានប្តូរជា Supergroup ហើយប្រព័ន្ធបានអាប់ដេត Chat ID: ${sendRes.newChatId})`
          : `✅ សារសាកល្បងត្រូវបានផ្ញើទៅកាន់ Group "${targetChatId}" ដោយជោគជ័យ!`,
        newChatId: sendRes.newChatId,
      });
    }

    // 3. ACTION: SEND_DAILY
    if (action === "SEND_DAILY") {
      const rate = checkRateLimit(`telegram_daily:${userId}`, 5, 60);
      if (!rate.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `អ្នកបានផ្ញើសាកល្បងញឹកញាប់ពេកហើយ។ សូមរង់ចាំ ${rate.resetInSeconds} វិនាទីទៀត។`,
          },
          { status: 429 }
        );
      }

      if (!activeToken) {
        return NextResponse.json({
          success: false,
          error: "សូមបញ្ចូល Bot Token ជាមុនសិន មុនពេលផ្ញើសារសរុប!",
        });
      }

      if (!targetChatId) {
        return NextResponse.json({
          success: false,
          error: "សូមបញ្ចូល Group Chat ID ជាមុនសិន!",
        });
      }

      const nowUtc = new Date();
      const phnomPenhOffset = 7 * 60 * 60 * 1000;
      const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
      const todayStr = nowLocal.toISOString().slice(0, 10);

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

      const dailyMsg = `📊 <b>សង្ខេបវត្តមានប្រចាំថ្ងៃ (${todayStr})</b>
🏢 <b>សាខា៖</b> ${branch?.name || "គ្រប់សាខា (All Branches)"}
👥 <b>បុគ្គលិកសរុប៖</b> ${totalEmployees} នាក់
✅ <b>មកទាន់ពេល៖</b> ${good} នាក់
⚠️ <b>មកយឺត៖</b> ${late} នាក់
🏖️ <b>ច្បាប់ឈប់សម្រាក៖</b> ${leave} នាក់
❌ <b>អវត្តមាន៖</b> ${absent} នាក់
<i>ផ្ញើដោយ Admin ម៉ោង ${nowLocal.toTimeString().slice(0, 5)}</i>`;

      const sendRes = await sendTelegramMessage(activeToken, targetChatId, dailyMsg);

      await recordTelegramLog(
        "DAILY",
        sendRes.ok ? "SUCCESS" : "FAILED",
        sendRes.newChatId || targetChatId,
        sendRes.ok ? null : sendRes.error,
        `សង្ខេបប្រចាំថ្ងៃ៖ ${todayStr}`
      );

      if (!sendRes.ok) {
        return NextResponse.json({
          success: false,
          error: `មិនអាចផ្ញើសារសរុបបាន: ${sendRes.error}`,
          newChatId: sendRes.newChatId,
        });
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: "TELEGRAM_DAILY_SENT",
          entity: "TelegramConfig",
          details: `បានផ្ញើសារសរុបប្រចាំថ្ងៃដោយផ្ទាល់ទៅ Group Chat ID: ${sendRes.newChatId || targetChatId}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `✅ សារសរុបប្រចាំថ្ងៃត្រូវបានផ្ញើទៅកាន់ Group "${sendRes.newChatId || targetChatId}" ដោយជោគជ័យ!`,
        newChatId: sendRes.newChatId,
      });
    }

    // 4. ACTION: CHECK_ABSENT
    if (action === "CHECK_ABSENT") {
      const absentNotified = await checkAndNotifyAbsentEmployees();
      return NextResponse.json({
        success: true,
        message: `បានពិនិត្យបុគ្គលិកអវត្តមានរួចរាល់! បានផ្ញើសារជូនដំណឹង៖ ${absentNotified} នាក់`,
        absentNotified,
      });
    }

    // 5. ACTION: SAVE CONFIG
    let newEncryptedToken = currentConfig?.botTokenEncrypted;
    if (botToken && botToken.trim() && !botToken.startsWith("••••")) {
      newEncryptedToken = encryptToken(botToken.trim());
    }

    const savedConfig = await prisma.telegramConfig.upsert({
      where: { companyId: company.id },
      update: {
        ...(newEncryptedToken && { botTokenEncrypted: newEncryptedToken }),
        ...(chatId !== undefined && { chatId: chatId.trim() }),
        ...(isEnabled !== undefined && { isEnabled: Boolean(isEnabled) }),
        ...(notifyLate !== undefined && { notifyLate: Boolean(notifyLate) }),
        ...(notifyLeave !== undefined && { notifyLeave: Boolean(notifyLeave) }),
        ...(notifyDaily !== undefined && { notifyDaily: Boolean(notifyDaily) }),
        ...(notifyAllCheckInOut !== undefined && { notifyAllCheckInOut: Boolean(notifyAllCheckInOut) }),
        ...(notifyAbsent !== undefined && { notifyAbsent: Boolean(notifyAbsent) }),
        ...(dailySummaryTime !== undefined && { dailySummaryTime }),
      },
      create: {
        companyId: company.id,
        botTokenEncrypted: newEncryptedToken || null,
        chatId: targetChatId || null,
        isEnabled: Boolean(isEnabled),
        notifyLate: Boolean(notifyLate),
        notifyLeave: Boolean(notifyLeave),
        notifyDaily: Boolean(notifyDaily),
        notifyAllCheckInOut: Boolean(notifyAllCheckInOut),
        notifyAbsent: Boolean(notifyAbsent),
        dailySummaryTime: dailySummaryTime || "18:00",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "TELEGRAM_CONFIG_UPDATE",
        entity: "TelegramConfig",
        details: `បានកែប្រែការកំណត់ Telegram (Chat ID: ${targetChatId || "គ្មាន"}, Enabled: ${Boolean(
          savedConfig.isEnabled
        )})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានរក្សាទុកការកំណត់ Telegram ដោយជោគជ័យ!",
      data: {
        hasToken: Boolean(savedConfig.botTokenEncrypted),
        botTokenMasked: maskToken(activeToken),
        chatId: savedConfig.chatId,
        isEnabled: savedConfig.isEnabled,
        notifyLate: savedConfig.notifyLate,
        notifyLeave: savedConfig.notifyLeave,
        notifyDaily: savedConfig.notifyDaily,
        notifyAllCheckInOut: savedConfig.notifyAllCheckInOut,
        notifyAbsent: savedConfig.notifyAbsent,
        dailySummaryTime: savedConfig.dailySummaryTime,
      },
    });
  } catch (error: any) {
    console.error("Telegram API POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
