import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./db-schema";
import { serverEnv } from "./env";

type SqlClient = ReturnType<typeof postgres>;
type DatabaseClient = PostgresJsDatabase<typeof schema>;

declare global {
  var __houseCalendarDb: DatabaseClient | undefined;
  var __houseCalendarSql: SqlClient | undefined;
}

function shouldIgnorePostgresNotice(message: string): boolean {
  return /already exists, skipping$/.test(message);
}

const TRANSIENT_DATABASE_STARTUP_ERROR_CODES = new Set([
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
]);

const TRANSIENT_DATABASE_STARTUP_ERROR_MESSAGES = [
  "the database system is starting up",
  "connect econnrefused",
  "connection refused",
];

function getErrorCodes(error: unknown): string[] {
  if (typeof error !== "object" || error === null) {
    return [];
  }

  const codes: string[] = [];

  if ("code" in error && typeof error.code === "string") {
    codes.push(error.code);
  }

  if ("cause" in error) {
    codes.push(...getErrorCodes(error.cause));
  }

  return codes;
}

function getErrorMessages(error: unknown): string[] {
  if (typeof error !== "object" || error === null) {
    return [];
  }

  const messages: string[] = [];

  if ("message" in error && typeof error.message === "string") {
    messages.push(error.message);
  }

  if ("cause" in error) {
    messages.push(...getErrorMessages(error.cause));
  }

  return messages;
}

export function isTransientDatabaseStartupError(error: unknown): boolean {
  if (
    getErrorCodes(error).some((code) =>
      TRANSIENT_DATABASE_STARTUP_ERROR_CODES.has(code),
    )
  ) {
    return true;
  }

  return getErrorMessages(error).some((message) => {
    const normalized = message.toLowerCase();

    return TRANSIENT_DATABASE_STARTUP_ERROR_MESSAGES.some((pattern) =>
      normalized.includes(pattern),
    );
  });
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

type DatabaseStartupRetryOptions = {
  intervalMs?: number;
  now?: () => number;
  onWarning?: (message: string) => void;
  operationName?: string;
  sleepFn?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
};

export async function withDatabaseStartupRetry<T>(
  operation: () => Promise<T>,
  {
    intervalMs = 500,
    now = Date.now,
    onWarning = console.warn,
    operationName = "database operation",
    sleepFn = sleep,
    timeoutMs = 5_000,
  }: DatabaseStartupRetryOptions = {},
): Promise<T> {
  const deadlineMs = now() + timeoutMs;
  let warned = false;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const remainingMs = deadlineMs - now();

      if (!isTransientDatabaseStartupError(error) || remainingMs <= 0) {
        throw error;
      }

      if (!warned) {
        onWarning(
          `Postgres is still starting up. Retrying ${operationName} for up to ${Math.ceil(timeoutMs / 1000)} seconds...`,
        );
        warned = true;
      }

      await sleepFn(Math.min(intervalMs, remainingMs));
    }
  }
}

export function getSql(): SqlClient {
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for server-side persistence.");
  }

  if (!globalThis.__houseCalendarSql) {
    globalThis.__houseCalendarSql = postgres(serverEnv.DATABASE_URL, {
      max: 1,
      onnotice: (notice) => {
        if (shouldIgnorePostgresNotice(notice.message)) {
          return;
        }

        console.warn(
          `Postgres notice${notice.severity ? ` [${notice.severity}]` : ""}: ${notice.message}`,
        );
      },
      prepare: false,
    });
  }

  return globalThis.__houseCalendarSql;
}

export function getDb(): DatabaseClient {
  if (!globalThis.__houseCalendarDb) {
    globalThis.__houseCalendarDb = drizzle(getSql(), { schema });
  }

  return globalThis.__houseCalendarDb;
}

export async function closeDb(): Promise<void> {
  if (!globalThis.__houseCalendarSql) {
    return;
  }

  const sql = globalThis.__houseCalendarSql;
  globalThis.__houseCalendarDb = undefined;
  globalThis.__houseCalendarSql = undefined;
  await sql.end({ timeout: 0 });
}
