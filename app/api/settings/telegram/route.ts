import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken, maskToken } from "@/lib/encryption";
import { testTelegramConnection, sendTelegramMessage } from "@/lib/telegram";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });

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
          dailySummaryTime: "18:00",
          status: "NOT_CONFIGURED", // NOT_CONFIGURED | CONNECTED | ERROR
          botName: null,
          chatTitle: null,
        },
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
        dailySummaryTime: config.dailySummaryTime || "18:00",
        status: config.isEnabled && config.chatId ? "CONNECTED" : "NOT_CONFIGURED",
      },
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
      action = "SAVE", // "SAVE" | "TEST" | "CHECK_STATUS"
      botToken,
      chatId,
      isEnabled,
      notifyLate,
      notifyLeave,
      notifyDaily,
      dailySummaryTime,
    } = body;

    let company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: "TheDemo Coffee" },
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
      if (!statusResult.ok) {
        return NextResponse.json({
          success: false,
          error: statusResult.error,
          bot: statusResult.bot,
        });
      }

      return NextResponse.json({
        success: true,
        message: `តភ្ជាប់ជោគជ័យ! Bot: @${statusResult.bot?.username} ${
          statusResult.chat ? `| Group: "${statusResult.chat.title}"` : ""
        }`,
        bot: statusResult.bot,
        chat: statusResult.chat,
      });
    }

    // 2. ACTION: TEST MESSAGE
    if (action === "TEST") {
      // Rate limit test messages: 5 per 60 seconds
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

      // Check status first to capture friendly error if not in group
      const statusResult = await testTelegramConnection(activeToken, targetChatId);
      if (!statusResult.ok) {
        return NextResponse.json({
          success: false,
          error: statusResult.error,
        });
      }

      const testMsg = `✅ <b>AttendPro តភ្ជាប់ជោគជ័យ!</b>
ប្រព័ន្ធគ្រប់គ្រងវត្តមាន TheDemo Coffee បានភ្ជាប់ទំនាក់ទំនងជាមួយ Telegram Group នេះរួចរាល់ហើយ។
🕒 កាលបរិច្ឆេទ៖ ${new Date().toLocaleString("km-KH", { timeZone: "Asia/Phnom_Penh" })}`;

      const sendRes = await sendTelegramMessage(activeToken, targetChatId, testMsg);
      if (!sendRes.ok) {
        return NextResponse.json({
          success: false,
          error: `មិនអាចផ្ញើសារបាន: ${sendRes.error}`,
        });
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: "TELEGRAM_TEST_SENT",
          entity: "TelegramConfig",
          details: `បានផ្ញើសារសាកល្បងទៅ Group Chat ID: ${targetChatId}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `✅ សារសាកល្បងត្រូវបានផ្ញើទៅកាន់ Group "${statusResult.chat?.title || targetChatId}" ដោយជោគជ័យ!`,
      });
    }

    // 3. ACTION: SAVE CONFIG
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
        dailySummaryTime: savedConfig.dailySummaryTime,
      },
    });
  } catch (error: any) {
    console.error("Telegram API POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
