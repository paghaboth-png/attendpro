import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

export interface TelegramStatusResult {
  ok: boolean;
  isMigrated?: boolean;
  newChatId?: string;
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
  message?: string;
  error?: string;
}

export type TelegramNotificationType =
  | "CHECK_IN"
  | "CHECK_OUT"
  | "UPDATE_CHECKOUT"
  | "LATE"
  | "ABSENT"
  | "LEAVE"
  | "OVERTIME"
  | "DAILY"
  | "TEST";

/**
 * Translates common Telegram Bot API errors into clear Khmer explanations
 */
export function translateTelegramError(desc: string): string {
  if (!desc) return "បរាជ័យក្នុងការផ្ញើសារ";
  const lower = desc.toLowerCase();

  if (lower.includes("upgraded to a supergroup")) {
    return "Group ត្រូវបានប្តូរជា Supergroup (Chat ID ចាស់លែងប្រើបាន)";
  }
  if (lower.includes("chat not found")) {
    return "រកមិនឃើញ Chat ID នេះក្នុង Telegram ឡើយ";
  }
  if (lower.includes("bot was kicked") || lower.includes("bot is not a member")) {
    return "Bot មិនទាន់ត្រូវបាន Add ចូលក្នុង Telegram Group ឬត្រូវបានគេដកចេញ";
  }
  if (lower.includes("not enough rights") || lower.includes("need administrator rights")) {
    return "Bot គ្មានសិទ្ធិផ្ញើសារក្នុង Group ឡើយ (សូមផ្តល់សិទ្ធិជា Admin ដល់ Bot)";
  }
  if (lower.includes("unauthorized") || lower.includes("invalid token")) {
    return "Bot Token មិនត្រឹមត្រូវឡើយ";
  }
  if (lower.includes("message is too long")) {
    return "ប្រវែងសារវែងហួសកំណត់";
  }
  if (lower.includes("too many requests") || lower.includes("retry after")) {
    return "Telegram Rate Limit (សូមរង់ចាំបន្តិចមុននឹងផ្ញើទៀត)";
  }

  return `កំហុសពី Telegram: ${desc}`;
}

/**
 * Safely records Telegram dispatch history into TelegramLog table (never records tokens)
 */
export async function recordTelegramLog(
  type: string,
  status: "SUCCESS" | "FAILED",
  chatId?: string | null,
  error?: string | null,
  details?: string | null
) {
  try {
    await prisma.telegramLog.create({
      data: {
        type,
        status,
        chatId: chatId || null,
        error: error ? error.slice(0, 500) : null,
        details: details ? details.slice(0, 500) : null,
      },
    });
  } catch (err) {
    console.warn("Failed to record TelegramLog:", err);
  }
}

/**
 * Validates Bot Token and Chat ID directly with Telegram Bot API
 * Automatically detects Supergroup migration
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
        error: translateTelegramError(getMeData.description || "Token មិនត្រឹមត្រូវ"),
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
        const migrateMatch =
          getChatData?.parameters?.migrate_to_chat_id ||
          (desc.includes("upgraded to a supergroup") ? getChatData.description.match(/-100\d+/) : null);

        if (migrateMatch) {
          const newId = String(
            typeof migrateMatch === "object" ? migrateMatch[0] : migrateMatch
          );

          // Try getChat with new supergroup id
          try {
            const superRes = await fetch(
              `https://api.telegram.org/bot${cleanToken}/getChat?chat_id=${encodeURIComponent(
                newId
              )}`,
              { method: "GET", cache: "no-store" }
            );
            const superData = await superRes.json();
            if (superData.ok) {
              return {
                ok: true,
                isMigrated: true,
                newChatId: newId,
                bot: botInfo,
                chat: {
                  id: superData.result.id,
                  title: superData.result.title || "Telegram Supergroup",
                  type: superData.result.type,
                },
                message: `Group ត្រូវបានប្តូរជា Supergroup! ប្រព័ន្ធបានរកឃើញ Chat ID ថ្មី៖ ${newId}`,
              };
            }
          } catch {}

          return {
            ok: false,
            isMigrated: true,
            newChatId: newId,
            bot: botInfo,
            error: `Group ត្រូវបានប្តូរជា Supergroup! សូមប្តូរ Chat ID ថ្មី៖ ${newId}`,
          };
        }

        return {
          ok: false,
          bot: botInfo,
          error: translateTelegramError(getChatData.description),
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
 * Sends a message to Telegram group with automatic supergroup migration detection & auto-update
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string; newChatId?: string; isMigrated?: boolean }> {
  if (!token || !chatId || !text) {
    return { ok: false, error: "មិនមាន Token ឬ Chat ID ឡើយ" };
  }

  try {
    let currentChatId = chatId;
    let res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: currentChatId,
        text,
        parse_mode: "HTML",
      }),
    });
    let data = await res.json();

    if (!data.ok) {
      // Check if group was upgraded to supergroup
      const migrateMatch =
        data?.parameters?.migrate_to_chat_id ||
        ((data.description || "").toLowerCase().includes("upgraded to a supergroup")
          ? data.description.match(/-100\d+/)
          : null);

      if (migrateMatch) {
        const newChatId = String(
          typeof migrateMatch === "object" ? migrateMatch[0] : migrateMatch
        );

        if (newChatId) {
          // Retry sending to new supergroup ID
          res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: newChatId,
              text,
              parse_mode: "HTML",
            }),
          });
          const retryData = await res.json();
          if (retryData.ok) {
            // Auto update TelegramConfig in database
            try {
              const company = await prisma.company.findFirst();
              if (company) {
                await prisma.telegramConfig.updateMany({
                  where: { companyId: company.id },
                  data: { chatId: newChatId },
                });
              }
            } catch {}

            return { ok: true, newChatId, isMigrated: true };
          }
          return {
            ok: false,
            error: translateTelegramError(retryData.description || "Send failed after migration"),
            newChatId,
            isMigrated: true,
          };
        }
      }

      return { ok: false, error: translateTelegramError(data.description || "Send failed") };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || "Network error" };
  }
}

/**
 * Dispatches notification and awaits completion
 * Safe non-blocking wrapper so caller never crashes on Telegram failure
 */
export async function dispatchTelegramNotification(
  type: TelegramNotificationType,
  payload: any
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  try {
    const company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });

    const config = company?.telegramConfig;
    if (!config || !config.isEnabled || !config.botTokenEncrypted || !config.chatId) {
      return { ok: false, skipped: true, error: "Telegram មិនទាន់បើក ឬគ្មាន Chat ID" };
    }

    // Check specific toggle rules:
    if (type === "LATE" && !config.notifyLate && !config.notifyAllCheckInOut) {
      return { ok: false, skipped: true };
    }
    if (
      (type === "CHECK_IN" || type === "CHECK_OUT" || type === "UPDATE_CHECKOUT") &&
      !config.notifyAllCheckInOut
    ) {
      return { ok: false, skipped: true };
    }
    if (type === "ABSENT" && !config.notifyAbsent) {
      return { ok: false, skipped: true };
    }
    if ((type === "LEAVE" || type === "OVERTIME") && !config.notifyLeave) {
      return { ok: false, skipped: true };
    }
    if (type === "DAILY" && !config.notifyDaily) {
      return { ok: false, skipped: true };
    }

    const token = decryptToken(config.botTokenEncrypted);
    if (!token) {
      await recordTelegramLog(
        type,
        "FAILED",
        config.chatId,
        "មិនអាច Decrypt Token បានឡើយ",
        payload?.name ? `${payload.name} (${payload.code || ""})` : null
      );
      return { ok: false, error: "Token Decrypt Failed" };
    }

    let messageText = "";
    let logDetail = "";
    const systemFooter = company?.name
      ? `<i>ប្រព័ន្ធ AttendPro • ${company.name}</i>`
      : `<i>ប្រព័ន្ធ AttendPro</i>`;

    if (type === "LATE") {
      logDetail = `យឺត៖ ${payload.name} (${payload.code}) +${payload.lateMinutes}mn`;
      messageText = `⚠️ <b>ដំណឹងបុគ្គលិក Check-in យឺត</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🏢 <b>សាខា៖</b> ${payload.branch}
⏰ <b>ម៉ោងស្កេន៖</b> ${payload.time}
⏳ <b>យឺត៖</b> +${payload.lateMinutes} នាទី
${systemFooter}`;
    } else if (type === "CHECK_IN") {
      logDetail = `Check-in៖ ${payload.name} (${payload.code}) ${payload.statusText || ""}`;
      messageText = `✅ <b>ដំណឹងបុគ្គលិក Check-in</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🏢 <b>សាខា៖</b> ${payload.branch}
⏰ <b>ម៉ោងស្កេន៖</b> ${payload.time}
📌 <b>ស្ថានភាព៖</b> ${payload.statusText || "ទាន់ពេល (Good)"}
${systemFooter}`;
    } else if (type === "CHECK_OUT") {
      const statusText = payload.isEarlyLeave ? "ចេញមុនម៉ោង (EARLY_LEAVE)" : "ធម្មតា";
      logDetail = `Check-out៖ ${payload.name} (${payload.code}) ${statusText}`;
      messageText = `🚪 <b>ដំណឹងបុគ្គលិក Check-out</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🏢 <b>សាខា៖</b> ${payload.branch}
⏰ <b>ម៉ោងស្កេន៖</b> ${payload.time}
📌 <b>ស្ថានភាព៖</b> ${statusText}
${systemFooter}`;
    } else if (type === "UPDATE_CHECKOUT") {
      const statusText = payload.isEarlyLeave ? "ចេញមុនម៉ោង (EARLY_LEAVE)" : "ធម្មតា";
      logDetail = `កែ Check-out៖ ${payload.name} (${payload.code}) ${statusText}`;
      messageText = `🔄 <b>ដំណឹងធ្វើបច្ចុប្បន្នភាព Check-out</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🏢 <b>សាខា៖</b> ${payload.branch}
⏰ <b>ម៉ោងស្កេនថ្មី៖</b> ${payload.time}
📌 <b>ស្ថានភាព៖</b> ${statusText}
${systemFooter}`;
    } else if (type === "ABSENT") {
      logDetail = `អវត្តមាន៖ ${payload.name} (${payload.code})`;
      messageText = `❌ <b>ដំណឹងបុគ្គលិកអវត្តមាន (មិនទាន់ Check-in)</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🏢 <b>សាខា៖</b> ${payload.branch}
⏰ <b>ម៉ោងចូលវេន៖</b> ${payload.shiftStartTime}
⏳ <b>ស្ថានភាព៖</b> លើស ១ ម៉ោង មិនទាន់ឃើញស្កេនវត្តមាន
${systemFooter}`;
    } else if (type === "LEAVE") {
      logDetail = `សុំច្បាប់៖ ${payload.name} (${payload.leaveType})`;
      messageText = `📋 <b>មានសំណើសុំច្បាប់ថ្មី</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
🗓️ <b>កាលបរិច្ឆេទ៖</b> ${payload.date}
📝 <b>ប្រភេទច្បាប់៖</b> ${payload.leaveType}
💬 <b>មូលហេតុ៖</b> ${payload.reason || "-"}
👉 <a href="https://attendpro-one.vercel.app/leave">ចុចទីនេះដើម្បីពិនិត្យ និងអនុម័ត</a>`;
    } else if (type === "OVERTIME") {
      logDetail = `សុំ OT៖ ${payload.name} (${payload.hours}h)`;
      messageText = `⏰ <b>មានសំណើសុំថែមម៉ោង OT ថ្មី</b>
👤 <b>បុគ្គលិក៖</b> ${payload.name} (<code>${payload.code}</code>)
⏱️ <b>ចំនួនម៉ោង៖</b> ${payload.hours} ម៉ោង
💬 <b>មូលហេតុ៖</b> ${payload.reason || "-"}
👉 <a href="https://attendpro-one.vercel.app/overtime">ចុចទីនេះដើម្បីពិនិត្យ និងអនុម័ត</a>`;
    } else if (type === "DAILY") {
      logDetail = `សង្ខេបប្រចាំថ្ងៃ៖ ${payload.date} (${payload.branch})`;
      messageText = `📊 <b>សង្ខេបវត្តមានប្រចាំថ្ងៃ (${payload.date})</b>
🏢 <b>សាខា៖</b> ${payload.branch}
👥 <b>បុគ្គលិកសរុប៖</b> ${payload.total} នាក់
✅ <b>មកទាន់ពេល៖</b> ${payload.good} នាក់
⚠️ <b>មកយឺត៖</b> ${payload.late} នាក់
🏖️ <b>ច្បាប់ឈប់សម្រាក៖</b> ${payload.leave} នាក់
❌ <b>អវត្តមាន៖</b> ${payload.absent} នាក់
<i>ប្រព័ន្ធ AttendPro ស្វ័យប្រវត្តិម៉ោង ${config.dailySummaryTime || "18:00"}</i>`;
    } else if (type === "TEST") {
      logDetail = `តេស្តផ្ញើសារសាកល្បង`;
      messageText = payload?.message || `🔔 <b>សារសាកល្បងពី AttendPro</b>`;
    }

    if (!messageText) return { ok: false, error: "Empty message" };

    const sendRes = await sendTelegramMessage(token, config.chatId, messageText);

    // Record log entry
    await recordTelegramLog(
      type,
      sendRes.ok ? "SUCCESS" : "FAILED",
      sendRes.newChatId || config.chatId,
      sendRes.ok
        ? sendRes.isMigrated
          ? `ជោគជ័យ (បានអាប់ដេត Chat ID ថ្មីស្វ័យប្រវត្តិ)`
          : null
        : sendRes.error,
      logDetail
    );

    return sendRes;
  } catch (e: any) {
    console.warn("Telegram notification suppressed error:", e);
    return { ok: false, error: e.message || "Unknown error" };
  }
}

/**
 * Checks for absent employees who are > 1 hour past shift start time and haven't checked in yet today.
 * Dispatches Telegram alert once per employee per day if notifyAbsent is enabled.
 */
export async function checkAndNotifyAbsentEmployees(): Promise<number> {
  try {
    const company = await prisma.company.findFirst({
      include: { telegramConfig: true },
    });
    const config = company?.telegramConfig;
    if (!config || !config.isEnabled || !config.notifyAbsent || !config.chatId) {
      return 0;
    }

    const nowUtc = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + phnomPenhOffset);
    const todayStr = nowLocal.toISOString().slice(0, 10);
    const currentHour = nowLocal.getUTCHours();
    const currentMin = nowLocal.getUTCMinutes();
    const currentTotalMin = currentHour * 60 + currentMin;
    const currentDayOfWeek = String(nowLocal.getUTCDay());

    // Get all active employees scheduled to work today
    const [employees, todayAttendances, todayLeaves, sentLogsToday] = await Promise.all([
      prisma.employee.findMany({
        where: { companyId: company.id, isActive: true },
        include: { shift: true, branch: true },
      }),
      prisma.attendance.findMany({
        where: { date: todayStr },
        select: { employeeId: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          fromDate: { lte: nowUtc },
          toDate: { gte: nowUtc },
        },
        select: { employeeId: true },
      }),
      prisma.telegramLog.findMany({
        where: {
          type: "ABSENT",
          createdAt: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
          },
        },
        select: { details: true },
      }),
    ]);

    const checkedInEmpIds = new Set(todayAttendances.map((a) => a.employeeId));
    const onLeaveEmpIds = new Set(todayLeaves.map((l) => l.employeeId));
    const alreadyNotifiedEmpCodes = new Set(
      sentLogsToday.map((l) => {
        const match = l.details?.match(/\(([^)]+)\)/);
        return match ? match[1] : "";
      }).filter(Boolean)
    );

    let absentCount = 0;

    for (const emp of employees) {
      if (emp.hiddenInReport) continue;
      if (checkedInEmpIds.has(emp.id)) continue;
      if (onLeaveEmpIds.has(emp.id)) continue;
      if (alreadyNotifiedEmpCodes.has(emp.code)) continue;

      // Check join date
      if (emp.joinDate) {
        const joinDateStr = new Date(emp.joinDate).toISOString().slice(0, 10);
        if (todayStr < joinDateStr) continue;
      }

      // Check scheduled workdays
      const scheduledDays = (emp.workingDays || emp.shift?.workDays || "1,2,3,4,5")
        .split(",")
        .map((d) => d.trim());
      if (!scheduledDays.includes(currentDayOfWeek)) continue;

      // Shift start time
      const shiftStartTime =
        emp.shiftScheduleType === "CUSTOM" && emp.customStartTime
          ? emp.customStartTime
          : emp.shift?.startTime || "07:00";
      const [startH, startM] = shiftStartTime.split(":").map(Number);
      const shiftStartTotalMin = startH * 60 + startM;

      // Check if current time > shiftStartTime + 60 minutes (1 hour)
      if (currentTotalMin >= shiftStartTotalMin + 60) {
        await dispatchTelegramNotification("ABSENT", {
          name: emp.name,
          code: emp.code,
          branch: emp.branch?.name || "គ្រប់សាខា",
          shiftStartTime,
        });
        absentCount++;
      }
    }

    return absentCount;
  } catch (err) {
    console.warn("checkAndNotifyAbsentEmployees error:", err);
    return 0;
  }
}
