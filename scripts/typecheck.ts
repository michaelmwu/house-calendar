import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureNextRouteTypeShim(baseDir: string): void {
  const routesTypes = resolve(baseDir, "routes.d.ts");
  const routesJsTypes = resolve(baseDir, "routes.js.d.ts");

  if (existsSync(routesTypes) && !existsSync(routesJsTypes)) {
    copyFileSync(routesTypes, routesJsTypes);
  }
}

run(process.execPath, ["x", "next", "typegen"]);
ensureNextRouteTypeShim(resolve(process.cwd(), ".next", "types"));
ensureNextRouteTypeShim(resolve(process.cwd(), ".next", "dev", "types"));
run(process.execPath, ["x", "tsc", "--noEmit"]);
