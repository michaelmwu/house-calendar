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

export function getSql(): SqlClient {
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for server-side persistence.");
  }

  if (!globalThis.__houseCalendarSql) {
    globalThis.__houseCalendarSql = postgres(serverEnv.DATABASE_URL, {
      max: 1,
      onnotice: () => {},
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
