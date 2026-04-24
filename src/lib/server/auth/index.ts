import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { getSql } from "../db";
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
  const sql = getSql();
  const [row] = await sql<
    { count: string }[]
  >`select count(*)::text as count from admin_users`;

  return Number(row?.count ?? "0");
}

async function getAdminEmail(): Promise<string | null> {
  await ensureAuthSchema();
  const sql = getSql();
  const [row] = await sql<
    { email: string }[]
  >`select email from admin_users order by id asc limit 1`;

  return row?.email ?? null;
}

async function hasPendingBootstrapCode(): Promise<boolean> {
  await ensureAuthSchema();
  const sql = getSql();
  const [row] = await sql<{ exists: boolean }[]>`
    select exists(
      select 1
      from admin_bootstrap_codes
      where used_at is null
        and expires_at > now()
    ) as exists
  `;

  return Boolean(row?.exists);
}

async function createAdminSession(
  userId: number,
  email: string,
  sql:
    | ReturnType<typeof getSql>
    | TransactionSql<Record<string, never>> = getSql(),
): Promise<AdminSession> {
  await ensureAuthSchema();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + ADMIN_SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );

  await sql`
    insert into admin_sessions (user_id, token_hash, expires_at)
    values (${userId}, ${hashSessionToken(token)}, ${expiresAt.toISOString()})
  `;

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
  const sql = getSql();

  await sql`
    delete from admin_sessions
    where token_hash = ${hashSessionToken(token)}
  `;
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

  const sql = getSql();

  await sql`delete from admin_sessions where expires_at <= now()`;

  const [row] = await sql<
    {
      email: string;
      expires_at: string;
      user_id: number;
    }[]
  >`
    select
      admin_users.email,
      admin_sessions.expires_at,
      admin_sessions.user_id
    from admin_sessions
    join admin_users on admin_users.id = admin_sessions.user_id
    where admin_sessions.token_hash = ${hashSessionToken(token)}
      and admin_sessions.expires_at > now()
    limit 1
  `;

  if (!row) {
    return null;
  }

  await sql`
    update admin_sessions
    set last_seen_at = now()
    where token_hash = ${hashSessionToken(token)}
  `;

  return {
    email: row.email,
    expiresAt: new Date(row.expires_at),
    userId: row.user_id,
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
  const sql = getSql();
  const email = normalizeEmail(parsed.data.email);
  const passwordHash = hashPassword(parsed.data.password);
  const codeHash = hashBootstrapCode(parsed.data.bootstrapCode);

  try {
    const setupResult = await sql.begin(async (transactionSql) => {
      const [consumedCode] = await transactionSql<{ id: number }[]>`
        update admin_bootstrap_codes
        set used_at = now()
        where code_hash = ${codeHash}
          and used_at is null
          and expires_at > now()
        returning id
      `;

      if (!consumedCode) {
        throw new Error("Bootstrap code is invalid, expired, or already used.");
      }

      const [user] = await transactionSql<{ email: string; id: number }[]>`
        insert into admin_users (email, password_hash)
        values (${email}, ${passwordHash})
        returning id, email
      `;

      const session = await createAdminSession(
        user.id,
        user.email,
        transactionSql,
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
  const sql = getSql();
  const email = normalizeEmail(parsed.data.email);

  const [user] = await sql<
    {
      email: string;
      id: number;
      password_hash: string;
    }[]
  >`
    select id, email, password_hash
    from admin_users
    where email = ${email}
    limit 1
  `;

  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
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

  const sql = getSql();
  const code = generateBootstrapCode();
  const expiresAt = getBootstrapCodeExpiry();

  await sql`
    insert into admin_bootstrap_codes (code_hash, expires_at)
    values (${hashBootstrapCode(code)}, ${expiresAt.toISOString()})
  `;

  return {
    code,
    expiresAt,
  };
}
