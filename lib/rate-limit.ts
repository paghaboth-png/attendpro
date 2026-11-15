import { prisma } from "@/lib/prisma";

export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  let cleaned = input.trim().replace(/[\s\-\.\(\)]/g, "");
  if (cleaned.startsWith("+855")) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith("855") && cleaned.length >= 11) {
    cleaned = cleaned.slice(3);
  }
  // Strip any leading zeros so we have the subscriber number
  cleaned = cleaned.replace(/^0+/, "");
  // Prefix single 0 for standard Cambodian national format (012xxxxxx)
  if (cleaned.length >= 7) {
    cleaned = "0" + cleaned;
  }
  return cleaned.replace(/\D/g, "");
}

export function isEmail(input: string): boolean {
  if (!input) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export function normalizeIdentifier(input: string): { type: "EMAIL" | "PHONE"; value: string } {
  const trimmed = (input || "").trim();
  if (isEmail(trimmed)) {
    return { type: "EMAIL", value: trimmed.toLowerCase() };
  }
  return { type: "PHONE", value: normalizePhoneNumber(trimmed) };
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean up stale in-memory entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((record, key) => {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

/**
 * In-memory rate limiter helper (legacy / generic)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowSeconds: number = 60
) {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (record.count >= maxAttempts) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetInSeconds,
  };
}

/**
 * Check if an account identifier or IP is currently locked for login (15 min lockout)
 */
export async function checkLoginLockout(
  identifier: string,
  ip?: string
): Promise<{ locked: boolean; remainingMinutes: number }> {
  try {
    const now = new Date();
    const norm = normalizeIdentifier(identifier);
    const idKey = `login:id:${norm.value}`;

    // 1. Check database User model lockout if user exists
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: norm.value },
          { phone: norm.value },
        ],
      },
      select: { id: true, lockedUntil: true },
    });

    if (user?.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (60 * 1000))
      );
      return { locked: true, remainingMinutes };
    }

    // 2. Check identifier RateLimitEntry
    const idEntry = await prisma.rateLimitEntry.findUnique({
      where: { key: idKey },
    });
    if (idEntry?.lockedUntil && idEntry.lockedUntil > now) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((idEntry.lockedUntil.getTime() - now.getTime()) / (60 * 1000))
      );
      return { locked: true, remainingMinutes };
    }

    // 3. Check IP RateLimitEntry (if IP provided and not local/unknown)
    if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
      const ipKey = `login:ip:${ip}`;
      const ipEntry = await prisma.rateLimitEntry.findUnique({
        where: { key: ipKey },
      });
      if (ipEntry?.lockedUntil && ipEntry.lockedUntil > now) {
        const remainingMinutes = Math.max(
          1,
          Math.ceil((ipEntry.lockedUntil.getTime() - now.getTime()) / (60 * 1000))
        );
        return { locked: true, remainingMinutes };
      }
    }

    return { locked: false, remainingMinutes: 0 };
  } catch (err) {
    console.error("checkLoginLockout error:", err);
    return { locked: false, remainingMinutes: 0 };
  }
}

/**
 * Record a failed login attempt. Locks for 15 minutes after 5 attempts.
 */
export async function recordFailedLoginAttempt(
  identifier: string,
  ip?: string
): Promise<{ locked: boolean; remainingMinutes: number }> {
  try {
    const now = new Date();
    const lockoutMinutes = 15;
    const lockoutUntil = new Date(now.getTime() + lockoutMinutes * 60 * 1000);
    const norm = normalizeIdentifier(identifier);
    const idKey = `login:id:${norm.value}`;

    let isLocked = false;

    // 1. Update User model if account exists
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: norm.value },
          { phone: norm.value },
        ],
      },
    });

    if (user) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockedUntil = newAttempts >= 5 ? lockoutUntil : null;
      if (newAttempts >= 5) isLocked = true;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });
    }

    // 2. Update RateLimitEntry for identifier
    const idEntry = await prisma.rateLimitEntry.findUnique({ where: { key: idKey } });
    const currentIdAttempts = idEntry ? idEntry.attempts + 1 : 1;
    const idLockedUntil = currentIdAttempts >= 5 ? lockoutUntil : null;
    if (currentIdAttempts >= 5) isLocked = true;

    await prisma.rateLimitEntry.upsert({
      where: { key: idKey },
      create: {
        key: idKey,
        attempts: currentIdAttempts,
        lockedUntil: idLockedUntil,
      },
      update: {
        attempts: currentIdAttempts,
        lockedUntil: idLockedUntil,
      },
    });

    // 3. Update IP entry
    if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
      const ipKey = `login:ip:${ip}`;
      const ipEntry = await prisma.rateLimitEntry.findUnique({ where: { key: ipKey } });
      const currentIpAttempts = ipEntry ? ipEntry.attempts + 1 : 1;
      const ipLockedUntil = currentIpAttempts >= 5 ? lockoutUntil : null;
      if (currentIpAttempts >= 5) isLocked = true;

      await prisma.rateLimitEntry.upsert({
        where: { key: ipKey },
        create: {
          key: ipKey,
          attempts: currentIpAttempts,
          lockedUntil: ipLockedUntil,
        },
        update: {
          attempts: currentIpAttempts,
          lockedUntil: ipLockedUntil,
        },
      });
    }

    return { locked: isLocked, remainingMinutes: isLocked ? lockoutMinutes : 0 };
  } catch (err) {
    console.error("recordFailedLoginAttempt error:", err);
    return { locked: false, remainingMinutes: 0 };
  }
}

/**
 * Reset failed attempts on successful login
 */
export async function resetLoginLockout(
  identifier: string,
  ip?: string
): Promise<void> {
  try {
    const norm = normalizeIdentifier(identifier);
    const idKey = `login:id:${norm.value}`;

    // Reset User
    await prisma.user.updateMany({
      where: {
        OR: [
          { email: norm.value },
          { phone: norm.value },
        ],
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Reset RateLimitEntry for identifier
    await prisma.rateLimitEntry.deleteMany({
      where: { key: idKey },
    });

    // Reset IP entry
    if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
      const ipKey = `login:ip:${ip}`;
      await prisma.rateLimitEntry.deleteMany({
        where: { key: ipKey },
      });
    }
  } catch (err) {
    console.error("resetLoginLockout error:", err);
  }
}
