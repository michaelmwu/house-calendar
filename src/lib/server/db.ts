import postgres from "postgres";
import { serverEnv } from "./env";

type SqlClient = ReturnType<typeof postgres>;

declare global {
  var __houseCalendarSql: SqlClient | undefined;
}

export function getSql(): SqlClient {
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for server-side persistence.");
  }

  if (!globalThis.__houseCalendarSql) {
    globalThis.__houseCalendarSql = postgres(serverEnv.DATABASE_URL, {
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__houseCalendarSql;
}
