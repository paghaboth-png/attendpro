import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

interface TelegramStatusResult {
  ok: boolean;
  bot?: {
    id: number;
    name: string;
    username: string;
  };
  chat?: {
    id: number | string;
    title: string;
    type: string;
  };
  error?: string;
}

/**
 * Validates Bot Token and Chat ID directly with Telegram Bot API
 */
export async function testTelegramConnection(
  token: string,
  chatId?: string
): Promise<TelegramStatusResult> {
  if (!token || !token.trim()) {
    return { ok: false, error: "សូមបញ្ចូល Bot Token ជាមុនសិន" };
  }

  const cleanToken = token.trim();

  try {
    // 1. Test getMe to check Token validity
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: "GET",
      cache: "no-store",
    });
    const getMeData = await getMeRes.json();

    if (!getMeData.ok) {
      if (getMeData.error_code === 401 || getMeData.error_code === 404) {
        return {
          ok: false,
          error:
            "Bot Token មិនត្រឹមត្រូវឡើយ! សូមពិនិត្យមើល Token ដែលបានចម្លងពី @BotFather ក្នុង Telegram សាជាថ្មី។",
        };
      }
      return {
        ok: false,
        error: `កំហុសពី Telegram: ${getMeData.description || "Token មិនត្រឹមត្រូវ"}`,
      };
    }

    const botInfo = {
      id: getMeData.result.id,
      name: getMeData.result.first_name,
      username: getMeData.result.username,
    };

    // 2. If chatId provided, test getChat
    if (chatId && chatId.trim()) {
      const cleanChatId = chatId.trim();
      const getChatRes = await fetch(
        `https://api.telegram.org/bot${cleanToken}/getChat?chat_id=${encodeURIComponent(
          cleanChatId
        )}`,
        { method: "GET", cache: "no-store" }
      );
      const getChatData = await getChatRes.json();

      if (!getChatData.ok) {
        const desc = (getChatData.description || "").toLowerCase();

        // Check if group was upgraded to supergroup
        if (desc.includes("upgraded to a supergroup")) {
          const migrateMatch = getChatData.description.match(/-100\d+/);
          const newId = migrateMatch ? migrateMatch[0] : "ចាប់ផ្តើមដោយ -100...";
          return {
            ok: false,
            bot: botInfo,
            error: `Group ត្រូវបានប្តូរជា Supergroup! សូមប្តូរ Chat ID ថ្មី៖ ${newId}`,
          };
        }

        if (desc.includes("chat not found") || desc.includes("bot is not a member")) {
          return {
            ok: false,
            bot: botInfo,
            error:
              "រកមិនឃើញ Group នេះទេ ឬ Bot មិនទាន់ត្រូវបាន Add ចូលក្នុង Group ឡើយ! សូម Add Bot ចូលក្នុង Group និងផ្តល់សិទ្ធិជា Admin។",
          };
        }

        return {
          ok: false,
          bot: botInfo,
          error: `Group Chat ID មិនត្រឹមត្រូវ: ${getChatData.description}`,
        };
      }

      return {
        ok: true,
        bot: botInfo,
        chat: {
          id: getChatData.result.id,
          title: getChatData.result.title || getChatData.result.first_name || "Telegram Chat",
          type: getChatData.result.type,
        },
      };
    }

    return {
      ok: true,
      bot: botInfo,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: "បរាជ័យក្នុងការតភ្ជាប់ទៅកាន់ Telegram API (សូមពិនិត្យអ៊ីនធឺណិត)",
    };
  }
}

/**
 * Sends a message to Telegram group
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token || !chatId || !text) {
    return { ok: false, error: "Missing token or chatId" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.description || "Send failed" };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Helper to dispatch notification in background without blocking
 */
export async function dispatchTelegramNotification(
  type: "LATE" | "LEAVE" | "OVERTIME" | "DAILY",
  payload: any
) {
  try {
    const company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });

    const config = company?.telegramConfig;
    if (!config || !config.isEnabled || !config.botTokenEncrypted || !config.chatId) {
      return; // Telegram is not configured or disabled
    }

    // Check specific toggle
    if (type === "LATE" && !config.notifyLate) return;
    if ((type === "LEAVE" || type === "OVERTIME") && !config.notifyLeave) return;
    if (type === "DAILY" && !config.notifyDaily) return;

    const token = decryptToken(config.botTokenEncrypted);
    if (!token) return;

    let messageText = "";

    if (type === "LATE") {
      messageText = `⚠️ <b>ដំណឹងបុគ្គលិក Check-in យឺត</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🏢 <b>សាខា៖</b> ${payload.branch}
⏰ <b>ម៉ោងស្កេន៖</b> ${payload.time}
⏳ <b>យឺត៖</b> +${payload.lateMinutes} នាទី
<i>ប្រព័ន្ធ AttendPro TheDemo Coffee</i>`;
    } else if (type === "LEAVE") {
      messageText = `📋 <b>មានសំណើសុំច្បាប់ថ្មី</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🗓️ <b>កាលបរិច្ឆេទ៖</b> ${payload.date}
📝 <b>ប្រភេទច្បាប់៖</b> ${payload.leaveType}
💬 <b>មូលហេតុ៖</b> ${payload.reason || "-"}
👉 <a href="https://attendpro-one.vercel.app/leave">ចុចទីនេះដើម្បីពិនិត្យ និងអនុម័ត</a>`;
    } else if (type === "OVERTIME") {
      messageText = `⏰ <b>មានសំណើសុំថែមម៉ោង OT ថ្មី</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
⏱️ <b>ចំនួនម៉ោង៖</b> ${payload.hours} ម៉ោង
💬 <b>មូលហេតុ៖</b> ${payload.reason || "-"}
👉 <a href="https://attendpro-one.vercel.app/overtime">ចុចទីនេះដើម្បីពិនិត្យ និងអនុម័ត</a>`;
    } else if (type === "DAILY") {
      messageText = `📊 <b>សង្ខេបវត្តមានប្រចាំថ្ងៃ (${payload.date})</b>
🏢 <b>សាខា៖</b> ${payload.branch}
👥 <b>បុគ្គលិកសរុប៖</b> ${payload.total} នាក់
✅ <b>មកទាន់ពេល៖</b> ${payload.good} នាក់
⚠️ <b>មកយឺត៖</b> ${payload.late} នាក់
🏖️ <b>ច្បាប់ឈប់សម្រាក៖</b> ${payload.leave} នាក់
❌ <b>អវត្តមាន៖</b> ${payload.absent} នាក់
<i>ប្រព័ន្ធ AttendPro ស្វ័យប្រវត្តិម៉ោង ${config.dailySummaryTime || "18:00"}</i>`;
    }

    if (messageText) {
      await sendTelegramMessage(token, config.chatId, messageText);
    }
  } catch (e) {
    // Non-blocking: never let Telegram failure interrupt core app
    console.warn("Telegram notification suppressed error:", e);
  }
}
