import { describe, expect, test } from "bun:test";
import {
  isTransientDatabaseStartupError,
  withDatabaseStartupRetry,
} from "./db";

type RetryTestClock = {
  advanceBy: (milliseconds: number) => Promise<void>;
  now: () => number;
};

function createRetryTestClock(): RetryTestClock {
  let currentMs = 0;

  return {
    advanceBy: async (milliseconds: number) => {
      currentMs += milliseconds;
    },
    now: () => currentMs,
  };
}

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
    const clock = createRetryTestClock();
    const warnings: string[] = [];
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
        now: clock.now,
        onWarning: (message) => {
          warnings.push(message);
        },
        operationName: "test operation",
        sleepFn: clock.advanceBy,
        timeoutMs: 50,
      },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(warnings).toEqual([
      "Postgres is still starting up. Retrying test operation for up to 1 seconds...",
    ]);
  });

  test("rethrows non-transient errors without retrying", async () => {
    const clock = createRetryTestClock();
    const error = new Error("password authentication failed for user");
    let attempts = 0;

    await expect(
      withDatabaseStartupRetry(
        async () => {
          attempts += 1;
          throw error;
        },
        {
          intervalMs: 1,
          now: clock.now,
          onWarning: () => {},
          sleepFn: clock.advanceBy,
          timeoutMs: 50,
        },
      ),
    ).rejects.toBe(error);

    expect(attempts).toBe(1);
  });

  test("uses the full timeout window before rethrowing transient errors", async () => {
    const clock = createRetryTestClock();
    const error = Object.assign(
      new Error("the database system is starting up"),
      {
        code: "57P03",
      },
    );
    let attempts = 0;
    const sleepDurations: number[] = [];

    await expect(
      withDatabaseStartupRetry(
        async () => {
          attempts += 1;
          throw error;
        },
        {
          intervalMs: 3,
          now: clock.now,
          onWarning: () => {},
          operationName: "timeout test",
          sleepFn: async (milliseconds) => {
            sleepDurations.push(milliseconds);
            await clock.advanceBy(milliseconds);
          },
          timeoutMs: 5,
        },
      ),
    ).rejects.toBe(error);

    expect(attempts).toBe(3);
    expect(sleepDurations).toEqual([3, 2]);
  });
});
