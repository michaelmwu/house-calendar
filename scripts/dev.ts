import { spawn } from "node:child_process";
import { resolveWorktreePorts, writeWorktreeEnvFiles } from "./worktree-ports";

const bundle = resolveWorktreePorts({ worktreeRoot: process.cwd() });
writeWorktreeEnvFiles(bundle);

console.log(`Starting Next.js on http://127.0.0.1:${bundle.app.port}`);
console.log(
  `Expected Postgres on postgresql://127.0.0.1:${bundle.postgres.port}`,
);

const child = spawn(
  process.execPath,
  ["x", "next", "dev", "--port", String(bundle.app.port)],
  {
    cwd: bundle.worktreeRoot,
    env: {
      ...process.env,
      DATABASE_URL: bundle.databaseUrl,
      PORT: String(bundle.app.port),
      POSTGRES_PORT: String(bundle.postgres.port),
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
