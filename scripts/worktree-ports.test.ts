import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWorktreePorts, writeWorktreeEnvFiles } from "./worktree-ports";

describe("worktree ports", () => {
  test("encodes DATABASE_URL credentials safely", () => {
    const bundle = resolveWorktreePorts({
      worktreeRoot: "/tmp/house-calendar/test-encoded-url",
      env: {
        NODE_ENV: "test",
        POSTGRES_DB: "house/calendar",
        POSTGRES_PASSWORD: "p@ss:/#word",
        POSTGRES_USER: "user:name",
      },
    });

    expect(bundle.databaseUrl).toContain("user%3Aname");
    expect(bundle.databaseUrl).toContain("p%40ss%3A%2F%23word");
    expect(bundle.databaseUrl).toContain("/house%2Fcalendar");
  });

  test("preserves existing .env.local when writing .env", () => {
    const worktreeRoot = mkdtempSync(join(tmpdir(), "house-calendar-ports-"));
    const envLocalPath = join(worktreeRoot, ".env.local");
    writeFileSync(envLocalPath, "SECRET=value\n", "utf8");

    const bundle = resolveWorktreePorts({ worktreeRoot });
    writeWorktreeEnvFiles(bundle);

    expect(readFileSync(envLocalPath, "utf8")).toBe("SECRET=value\n");
    expect(readFileSync(join(worktreeRoot, ".env"), "utf8")).toContain(
      "DATABASE_URL=",
    );
  });
});
