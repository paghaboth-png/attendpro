import crypto from "crypto";

export const DISALLOWED_WEAK_PINS = [
  "1234",
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "4321",
  "1212",
  "2580",
];

export function isWeakPin(pin: string): boolean {
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return true;
  }

  // Check explicit disallowed list
  if (DISALLOWED_WEAK_PINS.includes(pin)) {
    return true;
  }

  // Check all identical digits (e.g. 1111, 2222)
  if (pin[0] === pin[1] && pin[1] === pin[2] && pin[2] === pin[3]) {
    return true;
  }

  // Check ascending sequences (e.g. 1234, 2345, 3456, 4567, 5678, 6789)
  const d0 = parseInt(pin[0]);
  const d1 = parseInt(pin[1]);
  const d2 = parseInt(pin[2]);
  const d3 = parseInt(pin[3]);

  if (d1 === d0 + 1 && d2 === d1 + 1 && d3 === d2 + 1) {
    return true;
  }

  // Check descending sequences (e.g. 9876, 8765, 7654, 6543, 5432, 4321)
  if (d1 === d0 - 1 && d2 === d1 - 1 && d3 === d2 - 1) {
    return true;
  }

  return false;
}

export function generateSecurePin(): string {
  let pin = "";
  let attempts = 0;
  do {
    // Generate 4-digit number between 1000 and 9999
    pin = crypto.randomInt(1000, 10000).toString();
    attempts++;
  } while (isWeakPin(pin) && attempts < 100);

  return pin;
}

/**
 * Generate 8-character readable temporary password
 * Excludes ambiguous chars: O, 0, I, l, 1
 */
export function generateReadableTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O
  const lower = "abcdefghijkmnopqrstuvwxyz"; // No l
  const digits = "23456789"; // No 0, 1

  const allChars = upper + lower + digits;

  // Guarantee at least 1 upper, 1 lower, 1 digit
  let pwd = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
  ];

  for (let i = 3; i < 8; i++) {
    pwd.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Shuffle
  return pwd.sort(() => crypto.randomInt(-1, 2)).join("");
}
