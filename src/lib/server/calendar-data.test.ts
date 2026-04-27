import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  appConfigSchema,
  configToHouseConfig,
  getDefaultSiteId,
  getSiteConfig,
} from "@/lib/config/config";
import exampleConfig from "../../../config/config.example.json";

const EMPTY_ICS = `BEGIN:VCALENDAR
VERSION:2.0
END:VCALENDAR
`;

mock.module("server-only", () => ({}));

const { loadCalendarData } = await import("./calendar-data");

const originalFetch = globalThis.fetch;
const originalNodeEnv = process.env.NODE_ENV;

const appConfig = appConfigSchema.parse(exampleConfig);
const siteId = getDefaultSiteId(appConfig);
const siteConfig = getSiteConfig(appConfig, siteId);

if (!siteConfig) {
  throw new Error("Example config must include the default site.");
}

const houseConfig = configToHouseConfig(siteConfig);

function setNodeEnv(value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
    return;
  }

  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  setNodeEnv(originalNodeEnv);
});

describe("loadCalendarData", () => {
  test("uses sample data in development when ICS imports no all-day events", async () => {
    setNodeEnv("development");
    globalThis.fetch = mock(
      async () => new Response(EMPTY_ICS, { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await loadCalendarData({
      appConfig,
      forceRefresh: true,
      houseConfig,
      now: new Date("2026-04-19T00:00:00.000Z"),
      siteConfig,
      siteId,
    });

    expect(result.source).toBe("sample");
    expect(result.importedEventCount).toBe(0);
    expect(result.warnings).toContain(
      "No all-day ICS events were imported. Showing sample data in development.",
    );
  });

  test("keeps the real empty state in production when ICS imports no all-day events", async () => {
    setNodeEnv("production");
    globalThis.fetch = mock(
      async () => new Response(EMPTY_ICS, { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await loadCalendarData({
      appConfig,
      forceRefresh: true,
      houseConfig,
      now: new Date("2026-04-19T00:00:00.000Z"),
      siteConfig,
      siteId,
    });

    expect(result.source).toBe("ics");
    expect(result.eventInterpretations).toEqual([]);
    expect(result.importedEventCount).toBe(0);
    expect(result.warnings).toContain("No all-day ICS events were imported.");
    expect(
      result.warnings.some((warning) => warning.includes("sample data")),
    ).toBeFalse();
    expect(result.availability.every((day) => day.status === "available")).toBe(
      true,
    );
  });
});
