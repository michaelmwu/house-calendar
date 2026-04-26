import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type AppCalendar,
  appConfigSchema,
  configToHouseConfig,
} from "@/lib/config/config";
import exampleConfig from "../../../config/config.example.json";

const localConfigPath = resolve(process.cwd(), "config/config.json");

export async function loadAppConfig() {
  if (!existsSync(localConfigPath)) {
    return appConfigSchema.parse(exampleConfig);
  }

  return appConfigSchema.parse(
    JSON.parse(readFileSync(localConfigPath, "utf8")),
  );
}

export async function loadHouseConfig() {
  return configToHouseConfig(await loadAppConfig());
}

export function resolveCalendarUrl(calendar: AppCalendar): string | null {
  if ("url" in calendar) {
    return calendar.url;
  }

  return process.env[calendar.envVar] ?? null;
}
