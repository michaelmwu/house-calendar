import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_WORKTREE_DEV_BASE_PORT = 4321;
export const DEFAULT_WORKTREE_POSTGRES_BASE_PORT = 5432;
export const DEFAULT_WORKTREE_PORT_SPAN = 1000;
export const WORKTREE_DEV_BASE_PORT_ENV = "WORKTREE_DEV_BASE_PORT";
export const WORKTREE_DEV_PORT_ENV = "WORKTREE_DEV_PORT";
export const WORKTREE_POSTGRES_BASE_PORT_ENV = "WORKTREE_POSTGRES_BASE_PORT";
export const WORKTREE_POSTGRES_PORT_ENV = "WORKTREE_POSTGRES_PORT";
export const WORKTREE_PORT_OFFSET_ENV = "WORKTREE_PORT_OFFSET";
export const WORKTREE_PORT_SPAN_ENV = "WORKTREE_PORT_SPAN";

const MAX_PORT = 65535;

type PortResolution = {
  basePort: number;
  offset: number;
  pathKey: string;
  port: number;
  span: number;
  usingExplicitPort: boolean;
};

type WorktreePortBundle = {
  app: PortResolution;
  postgres: PortResolution;
  databaseUrl: string;
  projectName: string;
  worktreeRoot: string;
};

function parsePortLike(
  value: string | undefined,
  name: string,
): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PORT) {
    throw new Error(`${name} must be an integer from 1 to ${MAX_PORT}.`);
  }

  return parsed;
}

function parsePositiveInteger(
  value: string | undefined,
  name: string,
): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function worktreePathKey(worktreeRoot: string): string {
  return resolve(worktreeRoot)
    .split(/[\\/]+/)
    .filter(Boolean)
    .join("/");
}

export function worktreePortOffset(worktreeRoot: string, span: number): number {
  const digest = createHash("sha256")
    .update(worktreePathKey(worktreeRoot))
    .digest();
  return digest.readUInt32BE(0) % span;
}

export function worktreeComposeProjectName(worktreeRoot: string): string {
  const digest = createHash("sha256")
    .update(worktreePathKey(worktreeRoot))
    .digest("hex")
    .slice(0, 10);

  return `house_calendar_${digest}`;
}

function resolvePort({
  basePort,
  basePortEnvName,
  defaultBasePort,
  env,
  explicitPortEnvName,
  fallbackPortEnvName,
  pathKey,
  span,
  worktreeRoot,
}: {
  basePort?: number;
  basePortEnvName: string;
  defaultBasePort: number;
  env: NodeJS.ProcessEnv;
  explicitPortEnvName: string;
  fallbackPortEnvName?: string;
  pathKey: string;
  span: number;
  worktreeRoot: string;
}): PortResolution {
  const explicitPort =
    parsePortLike(env[explicitPortEnvName], explicitPortEnvName) ??
    parsePortLike(
      fallbackPortEnvName ? env[fallbackPortEnvName] : undefined,
      fallbackPortEnvName ?? explicitPortEnvName,
    );

  if (explicitPort !== undefined) {
    return {
      basePort: defaultBasePort,
      offset: worktreePortOffset(worktreeRoot, span),
      pathKey,
      port: explicitPort,
      span,
      usingExplicitPort: true,
    };
  }

  const resolvedBasePort =
    basePort ??
    parsePortLike(env[basePortEnvName], basePortEnvName) ??
    defaultBasePort;

  if (resolvedBasePort + span - 1 > MAX_PORT) {
    throw new Error(
      `${basePortEnvName} + ${WORKTREE_PORT_SPAN_ENV} - 1 must not exceed ${MAX_PORT}.`,
    );
  }

  const offset = worktreePortOffset(worktreeRoot, span);

  return {
    basePort: resolvedBasePort,
    offset,
    pathKey,
    port: resolvedBasePort + offset,
    span,
    usingExplicitPort: false,
  };
}

function buildDatabaseUrl(
  env: NodeJS.ProcessEnv,
  postgresPort: number,
): string {
  const user = env.POSTGRES_USER || "house_calendar";
  const password = env.POSTGRES_PASSWORD || "house_calendar";
  const database = env.POSTGRES_DB || "house_calendar";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${postgresPort}/${encodeURIComponent(database)}`;
}

export function resolveWorktreePorts({
  env = process.env,
  worktreeRoot,
}: {
  env?: NodeJS.ProcessEnv;
  worktreeRoot: string;
}): WorktreePortBundle {
  if (!worktreeRoot) {
    throw new Error("worktreeRoot is required to resolve worktree ports.");
  }

  const span =
    parsePositiveInteger(env[WORKTREE_PORT_SPAN_ENV], WORKTREE_PORT_SPAN_ENV) ??
    DEFAULT_WORKTREE_PORT_SPAN;
  const pathKey = worktreePathKey(worktreeRoot);

  const app = resolvePort({
    basePortEnvName: WORKTREE_DEV_BASE_PORT_ENV,
    defaultBasePort: DEFAULT_WORKTREE_DEV_BASE_PORT,
    env,
    explicitPortEnvName: WORKTREE_DEV_PORT_ENV,
    fallbackPortEnvName: "PORT",
    pathKey,
    span,
    worktreeRoot,
  });

  const postgres = resolvePort({
    basePortEnvName: WORKTREE_POSTGRES_BASE_PORT_ENV,
    defaultBasePort: DEFAULT_WORKTREE_POSTGRES_BASE_PORT,
    env,
    explicitPortEnvName: WORKTREE_POSTGRES_PORT_ENV,
    fallbackPortEnvName: "POSTGRES_PORT",
    pathKey,
    span,
    worktreeRoot,
  });

  return {
    app,
    postgres,
    databaseUrl: env.DATABASE_URL || buildDatabaseUrl(env, postgres.port),
    projectName: worktreeComposeProjectName(worktreeRoot),
    worktreeRoot: resolve(worktreeRoot),
  };
}

function buildEnvFileContents(
  bundle: WorktreePortBundle,
  env: NodeJS.ProcessEnv,
): string {
  const postgresUser = env.POSTGRES_USER || "house_calendar";
  const postgresPassword = env.POSTGRES_PASSWORD || "house_calendar";
  const postgresDb = env.POSTGRES_DB || "house_calendar";

  return [
    `COMPOSE_PROJECT_NAME=${bundle.projectName}`,
    `PORT=${bundle.app.port}`,
    `POSTGRES_PORT=${bundle.postgres.port}`,
    `POSTGRES_DB=${postgresDb}`,
    `POSTGRES_USER=${postgresUser}`,
    `POSTGRES_PASSWORD=${postgresPassword}`,
    `WORKTREE_PORT_OFFSET=${bundle.app.offset}`,
    `DATABASE_URL=${bundle.databaseUrl}`,
    "",
  ].join("\n");
}

export function writeWorktreeEnvFiles(
  bundle: WorktreePortBundle,
  env = process.env,
): void {
  const root = bundle.worktreeRoot;
  mkdirSync(root, { recursive: true });

  writeFileSync(
    resolve(root, ".env"),
    buildEnvFileContents(bundle, env),
    "utf8",
  );
}

function printSummary(bundle: WorktreePortBundle): void {
  console.log(`Worktree: ${bundle.worktreeRoot}`);
  console.log(`Compose project: ${bundle.projectName}`);
  console.log(`Path key: ${bundle.app.pathKey}`);
  console.log(`App port: ${bundle.app.port}`);
  console.log(`Postgres port: ${bundle.postgres.port}`);
  console.log(`Database URL: ${bundle.databaseUrl}`);
}

if (import.meta.main) {
  const args = new Set(Bun.argv.slice(2));
  const bundle = resolveWorktreePorts({ worktreeRoot: process.cwd() });

  if (args.has("--write")) {
    writeWorktreeEnvFiles(bundle);
    printSummary(bundle);
    console.log("Wrote .env");
  } else if (args.has("--json")) {
    console.log(JSON.stringify(bundle, null, 2));
  } else if (args.has("--shell")) {
    console.log(buildEnvFileContents(bundle, process.env).trim());
  } else {
    printSummary(bundle);
  }
}
