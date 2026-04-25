import { createHash, randomBytes } from "node:crypto";

export const ADMIN_BOOTSTRAP_CODE_DURATION_HOURS = 24;

export function generateBootstrapCode(): string {
  return randomBytes(18).toString("base64url");
}

export function hashBootstrapCode(code: string): string {
  return createHash("sha256").update(code).digest("base64url");
}

export function getBootstrapCodeExpiry(now = new Date()): Date {
  return new Date(
    now.getTime() + ADMIN_BOOTSTRAP_CODE_DURATION_HOURS * 60 * 60 * 1000,
  );
}
