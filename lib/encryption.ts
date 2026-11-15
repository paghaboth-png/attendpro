import crypto from "crypto";

const SECRET_KEY =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "attendpro-telegram-secret-encryption-key-2026";

// Derive 32-byte key from secret
const KEY = crypto.createHash("sha256").update(SECRET_KEY).digest();
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encrypts a plain string (such as Telegram Bot Token)
 */
export function encryptToken(text: string): string {
  if (!text || !text.trim()) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text.trim(), "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (e) {
    console.error("Encryption error:", e);
    return "";
  }
}

/**
 * Decrypts an encrypted string
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return "";
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("Decryption error:", e);
    return "";
  }
}

/**
 * Masks a token showing only the last 4 characters
 */
export function maskToken(token: string): string {
  if (!token || token.trim().length === 0) return "";
  const trimmed = token.trim();
  if (trimmed.length <= 4) return "••••";
  const last4 = trimmed.slice(-4);
  return `••••••••••••••••••••${last4}`;
}
