import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull, lte } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, getSql } from "../db";
import { adminBootstrapCodes, adminSessions, adminUsers } from "../db-schema";
import { serverEnv } from "../env";
import {
  generateBootstrapCode,
  getBootstrapCodeExpiry,
  hashBootstrapCode,
} from "./bootstrap-code";
import { hashPassword, verifyPassword } from "./password";

const ADMIN_SESSION_COOKIE = "house_calendar_admin_session";
const ADMIN_SESSION_DURATION_DAYS = 30;
const ADMIN_PASSWORD_MIN_LENGTH = 10;

const setupInputSchema = z.object({
  bootstrapCode: z.string().min(1),
  email: z.string().trim().email(),
  password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH),
});

const loginInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type AdminSession = {
  email: string;
  expiresAt: Date;
  token: string;
  userId: number;
};

export type CurrentAdminSession = Omit<AdminSession, "token">;

type AdminAuthState = {
  adminEmail: string | null;
  bootstrapCodeReady: boolean;
  databaseConfigured: boolean;
  initialized: boolean;
  session: CurrentAdminSession | null;
};

type AuthActionResult =
  | {
      error: string;
      ok: false;
    }
  | {
      ok: true;
      session: AdminSession;
    };

type AuthDb = ReturnType<typeof getDb>;
type AuthDbWriter = Pick<AuthDb, "insert">;

let schemaReadyPromise: Promise<void> | undefined;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

async function ensureAuthSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const sql = getSql();

      await sql`
        create table if not exists admin_users (
          id integer primary key generated always as identity,
          email text not null unique,
          password_hash text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create unique index if not exists admin_users_singleton_idx
        on admin_users ((true))
      `;

      await sql`
        create table if not exists admin_sessions (
          id integer primary key generated always as identity,
          user_id integer not null references admin_users(id) on delete cascade,
          token_hash text not null unique,
          expires_at timestamptz not null,
          created_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists admin_sessions_user_id_idx
        on admin_sessions (user_id)
      `;

      await sql`
        create table if not exists admin_bootstrap_codes (
          id integer primary key generated always as identity,
          code_hash text not null unique,
          expires_at timestamptz not null,
          used_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists admin_bootstrap_codes_lookup_idx
        on admin_bootstrap_codes (used_at, expires_at)
      `;
    })().catch((error) => {
      schemaReadyPromise = undefined;
      throw error;
    });
  }

  await schemaReadyPromise;
}

async function getAdminCount(): Promise<number> {
  await ensureAuthSchema();
  const db = getDb();
  const [row] = await db.select({ value: count() }).from(adminUsers);

  return row?.value ?? 0;
}

async function getAdminEmail(): Promise<string | null> {
  await ensureAuthSchema();
  const db = getDb();
  const [row] = await db
    .select({ email: adminUsers.email })
    .from(adminUsers)
    .orderBy(adminUsers.id)
    .limit(1);

  return row?.email ?? null;
}

async function hasPendingBootstrapCode(): Promise<boolean> {
  await ensureAuthSchema();
  const db = getDb();
  const [row] = await db
    .select({ id: adminBootstrapCodes.id })
    .from(adminBootstrapCodes)
    .where(
      and(
        isNull(adminBootstrapCodes.usedAt),
        gt(adminBootstrapCodes.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return Boolean(row);
}

async function createAdminSession(
  userId: number,
  email: string,
  db: AuthDbWriter = getDb(),
): Promise<AdminSession> {
  await ensureAuthSchema();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + ADMIN_SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(adminSessions).values({
    expiresAt,
    tokenHash: hashSessionToken(token),
    userId,
  });

  return {
    email,
    expiresAt,
    token,
    userId,
  };
}

export function setAdminSessionCookie(
  response: NextResponse,
  session: AdminSession,
): void {
  response.cookies.set({
    expires: session.expiresAt,
    httpOnly: true,
    name: ADMIN_SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: session.token,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    expires: new Date(0),
    httpOnly: true,
    name: ADMIN_SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: "",
  });
}

export async function revokeAdminSession(
  token: string | undefined,
): Promise<void> {
  if (!token || !serverEnv.DATABASE_URL) {
    return;
  }

  await ensureAuthSchema();
  const db = getDb();

  await db
    .delete(adminSessions)
    .where(eq(adminSessions.tokenHash, hashSessionToken(token)));
}

export async function getCurrentAdminSession(): Promise<CurrentAdminSession | null> {
  if (!serverEnv.DATABASE_URL) {
    return null;
  }

  await ensureAuthSchema();
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const db = getDb();

  await db
    .delete(adminSessions)
    .where(lte(adminSessions.expiresAt, new Date()));

  const [row] = await db
    .select({
      email: adminUsers.email,
      expiresAt: adminSessions.expiresAt,
      userId: adminSessions.userId,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(
      and(
        eq(adminSessions.tokenHash, hashSessionToken(token)),
        gt(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  await db
    .update(adminSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(adminSessions.tokenHash, hashSessionToken(token)));

  return {
    email: row.email,
    expiresAt: row.expiresAt,
    userId: row.userId,
  };
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const databaseConfigured = Boolean(serverEnv.DATABASE_URL);

  if (!databaseConfigured) {
    return {
      adminEmail: null,
      bootstrapCodeReady: false,
      databaseConfigured,
      initialized: false,
      session: null,
    };
  }

  const initialized = (await getAdminCount()) > 0;
  const session = initialized ? await getCurrentAdminSession() : null;

  return {
    adminEmail: initialized ? await getAdminEmail() : null,
    bootstrapCodeReady: initialized ? false : await hasPendingBootstrapCode(),
    databaseConfigured,
    initialized,
    session,
  };
}

export async function bootstrapAdmin(input: {
  bootstrapCode: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  if (!serverEnv.DATABASE_URL) {
    return { error: "DATABASE_URL is not configured.", ok: false };
  }

  const parsed = setupInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().formErrors[0] ??
        parsed.error.flatten().fieldErrors.password?.[0] ??
        "Enter a valid admin email and a password of at least 10 characters.",
      ok: false,
    };
  }

  await ensureAuthSchema();
  const db = getDb();
  const email = normalizeEmail(parsed.data.email);
  const passwordHash = hashPassword(parsed.data.password);
  const codeHash = hashBootstrapCode(parsed.data.bootstrapCode);

  try {
    const setupResult = await db.transaction(async (transactionDb) => {
      const [consumedCode] = await transactionDb
        .update(adminBootstrapCodes)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(adminBootstrapCodes.codeHash, codeHash),
            isNull(adminBootstrapCodes.usedAt),
            gt(adminBootstrapCodes.expiresAt, new Date()),
          ),
        )
        .returning({ id: adminBootstrapCodes.id });

      if (!consumedCode) {
        throw new Error("Bootstrap code is invalid, expired, or already used.");
      }

      const [user] = await transactionDb
        .insert(adminUsers)
        .values({
          email,
          passwordHash,
        })
        .returning({ email: adminUsers.email, id: adminUsers.id });

      const session = await createAdminSession(
        user.id,
        user.email,
        transactionDb,
      );

      return { session };
    });

    return {
      ok: true,
      session: setupResult.session,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return { error: "Admin setup is already complete.", ok: false };
    }

    if (error instanceof Error) {
      if (
        error.message.includes("admin_users_singleton_idx") ||
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        return { error: "Admin setup is already complete.", ok: false };
      }

      return { error: error.message, ok: false };
    }

    return { error: "Admin setup failed.", ok: false };
  }
}

export async function loginAdmin(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  if (!serverEnv.DATABASE_URL) {
    return { error: "DATABASE_URL is not configured.", ok: false };
  }

  const parsed = loginInputSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Enter a valid admin email and password.", ok: false };
  }

  await ensureAuthSchema();
  const db = getDb();
  const email = normalizeEmail(parsed.data.email);

  const [user] = await db
    .select({
      email: adminUsers.email,
      id: adminUsers.id,
      passwordHash: adminUsers.passwordHash,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "Email or password is incorrect.", ok: false };
  }

  return {
    ok: true,
    session: await createAdminSession(user.id, user.email),
  };
}

export async function createBootstrapCode(): Promise<{
  code: string;
  expiresAt: Date;
}> {
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureAuthSchema();

  if ((await getAdminCount()) > 0) {
    throw new Error("Admin setup is already complete.");
  }

  const db = getDb();
  const code = generateBootstrapCode();
  const expiresAt = getBootstrapCodeExpiry();

  await db.insert(adminBootstrapCodes).values({
    codeHash: hashBootstrapCode(code),
    expiresAt,
  });

  return {
    code,
    expiresAt,
  };
}
