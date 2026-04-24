import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password auth helpers", () => {
  test("hashes and verifies passwords", () => {
    const hash = hashPassword("correct horse battery staple");

    expect(hash).toContain("scrypt:");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });
});
