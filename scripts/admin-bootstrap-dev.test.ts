import { describe, expect, test } from "bun:test";
import { parseAdminBootstrapDevArgs } from "./admin-bootstrap-dev";

describe("parseAdminBootstrapDevArgs", () => {
  test("parses required flags", () => {
    expect(
      parseAdminBootstrapDevArgs([
        "--email",
        "owner@example.com",
        "--password",
        "correct horse battery staple",
      ]),
    ).toEqual({
      email: "owner@example.com",
      password: "correct horse battery staple",
    });
  });

  test("rejects missing password", () => {
    expect(() =>
      parseAdminBootstrapDevArgs(["--email", "owner@example.com"]),
    ).toThrow("Both --email and --password are required.");
  });

  test("rejects unknown flags", () => {
    expect(() =>
      parseAdminBootstrapDevArgs([
        "--email",
        "owner@example.com",
        "--token",
        "secret",
      ]),
    ).toThrow("Unknown argument: --token");
  });
});
