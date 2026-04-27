import { describe, expect, test } from "bun:test";
import {
  isTransientDatabaseStartupError,
  withDatabaseStartupRetry,
} from "./db";

describe("isTransientDatabaseStartupError", () => {
  test("matches postgres startup errors", () => {
    const error = Object.assign(
      new Error("the database system is starting up"),
      {
        code: "57P03",
      },
    );

    expect(isTransientDatabaseStartupError(error)).toBe(true);
  });

  test("matches connection refused errors", () => {
    const error = new Error("connect ECONNREFUSED 127.0.0.1:5432");

    expect(isTransientDatabaseStartupError(error)).toBe(true);
  });

  test("does not match non-startup errors", () => {
    const error = new Error("password authentication failed for user");

    expect(isTransientDatabaseStartupError(error)).toBe(false);
  });
});

describe("withDatabaseStartupRetry", () => {
  test("retries transient startup errors until the operation succeeds", async () => {
    let attempts = 0;

    const result = await withDatabaseStartupRetry(
      async () => {
        attempts += 1;

        if (attempts < 3) {
          throw Object.assign(
            new Error("connect ECONNREFUSED 127.0.0.1:5432"),
            {
              code: "ECONNREFUSED",
            },
          );
        }

        return "ok";
      },
      {
        intervalMs: 1,
        operationName: "test operation",
        timeoutMs: 50,
      },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });
});
