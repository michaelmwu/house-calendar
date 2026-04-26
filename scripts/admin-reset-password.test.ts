import { describe, expect, test } from "bun:test";
import { parseAdminResetPasswordArgs } from "./admin-reset-password";

describe("parseAdminResetPasswordArgs", () => {
  test("parses required flags", () => {
    expect(
      parseAdminResetPasswordArgs([
        "--email",
        "owner@example.com",
        "--password",
        "new strong password",
      ]),
    ).toEqual({
      email: "owner@example.com",
      password: "new strong password",
    });
  });

  test("rejects missing password", () => {
    expect(() =>
      parseAdminResetPasswordArgs(["--email", "owner@example.com"]),
    ).toThrow("Both --email and --password are required.");
  });
});
