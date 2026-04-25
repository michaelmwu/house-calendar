import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);

  return [
    "scrypt",
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(":");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, saltValue, derivedValue] = storedHash.split(":");

  if (algorithm !== "scrypt" || !saltValue || !derivedValue) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(derivedValue, "base64url");
  const actual = scryptSync(password, salt, expected.length);

  return timingSafeEqual(actual, expected);
}
