import { describe, expect, test } from "bun:test";
import {
  generateBootstrapCode,
  getBootstrapCodeExpiry,
  hashBootstrapCode,
} from "./bootstrap-code";

describe("bootstrap code helpers", () => {
  test("generates non-empty codes", () => {
    expect(generateBootstrapCode().length).toBeGreaterThan(10);
  });

  test("hashes codes deterministically", () => {
    expect(hashBootstrapCode("abc")).toBe(hashBootstrapCode("abc"));
    expect(hashBootstrapCode("abc")).not.toBe(hashBootstrapCode("def"));
  });

  test("expires codes after 24 hours", () => {
    const now = new Date("2026-04-24T00:00:00.000Z");
    expect(getBootstrapCodeExpiry(now).toISOString()).toBe(
      "2026-04-25T00:00:00.000Z",
    );
  });
});
