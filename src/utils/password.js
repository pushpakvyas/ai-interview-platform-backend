import crypto from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%*?";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function pick(set) {
  return set[crypto.randomInt(set.length)];
}

// Generates a password that satisfies the platform's password policy
// (frontend/src/utils/validation.js): 8+ chars, upper, lower, digit, special.
export function generateTempPassword(length = 12) {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Mirrors the client-side SHA-256 hashing in frontend/src/utils/hash.js so a
// server-generated password ends up stored the same way as one a candidate
// typed in the browser (bcrypt-over-sha256, via User's pre("save") hook).
export function sha256Hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
