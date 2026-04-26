import "server-only";

import { differenceInCalendarDays, parseISO, startOfMonth } from "date-fns";
import { deriveDailyAvailability } from "@/lib/house/availability";
import { currentDateInTimeZone, formatCalendarDate } from "@/lib/house/date";
import { parseIcsCalendar } from "@/lib/house/ics";
import { parseEventTitle } from "@/lib/house/parser";
import { buildSampleScenario } from "@/lib/house/sample-data";
import {
  loadAppConfig,
  loadHouseConfig,
  resolveCalendarUrl,
} from "./app-config";
import { serverEnv } from "./env";

const DEFAULT_ICS_SYNC_TTL_MINUTES = 15;

type CalendarDataSource = "ics" | "sample";
type CalendarDataBase = {
  availability: ReturnType<typeof buildSampleScenario>["sampleDerivedDays"];
  eventInterpretations: ReturnType<
    typeof buildSampleScenario
  >["sampleEventInterpretations"];
  importedEventCount: number;
  source: CalendarDataSource;
  warnings: string[];
};

type CalendarDataCacheEntry = {
  expiresAt: number;
  result: CalendarDataResult;
};

export type CalendarDataResult = {
  availability: CalendarDataBase["availability"];
  cacheTtlMinutes: number;
  eventInterpretations: CalendarDataBase["eventInterpretations"];
  fetchedAt: string;
  importedEventCount: number;
  nextRefreshAt: string;
  source: CalendarDataSource;
  warnings: string[];
};

type LoadCalendarDataOptions = {
  forceRefresh?: boolean;
  now?: Date;
};

let calendarDataCache: CalendarDataCacheEntry | null = null;
let calendarDataInFlight: Promise<CalendarDataResult> | null = null;

function getCacheTtlMinutes(): number {
  return serverEnv.ICS_SYNC_TTL_MINUTES ?? DEFAULT_ICS_SYNC_TTL_MINUTES;
}

function withCacheMetadata(
  result: CalendarDataBase,
  fetchedAt: Date,
): CalendarDataResult {
  const cacheTtlMinutes = getCacheTtlMinutes();
  const nextRefreshAt = new Date(
    fetchedAt.getTime() + cacheTtlMinutes * 60 * 1000,
  );

  return {
    ...result,
    cacheTtlMinutes,
    fetchedAt: fetchedAt.toISOString(),
    nextRefreshAt: nextRefreshAt.toISOString(),
  };
}

async function fetchCalendarData(now: Date): Promise<CalendarDataBase> {
  const appConfig = await loadAppConfig();
  const houseConfig = await loadHouseConfig();
  const warnings: string[] = [];
  const today = parseISO(currentDateInTimeZone(houseConfig.timezone, now));
  const calendarStart = startOfMonth(today);
  const nights = differenceInCalendarDays(today, calendarStart) + 365;
  const rawEvents = [];

  for (const calendar of appConfig.calendars) {
    const url = resolveCalendarUrl(calendar);

    if (!url) {
      warnings.push(`Calendar "${calendar.label}" is missing an ICS URL.`);
      continue;
    }

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      warnings.push(
        `Calendar "${calendar.label}" returned ${response.status}.`,
      );
      continue;
    }

    const parsedEvents = parseIcsCalendar(await response.text());
    rawEvents.push(...parsedEvents);
  }

  if (rawEvents.length === 0) {
    const sampleScenario = buildSampleScenario(now);

    if (warnings.length === 0) {
      warnings.push(
        "No all-day ICS events were imported. Showing sample data.",
      );
    }

    return {
      availability: sampleScenario.sampleDerivedDays,
      eventInterpretations: sampleScenario.sampleEventInterpretations,
      importedEventCount: 0,
      source: "sample",
      warnings,
    };
  }

  return {
    availability: deriveDailyAvailability(
      houseConfig,
      rawEvents,
      formatCalendarDate(calendarStart),
      nights,
    ),
    eventInterpretations: rawEvents.map((raw) => ({
      raw,
      parsed: parseEventTitle(raw.title, houseConfig),
    })),
    importedEventCount: rawEvents.length,
    source: "ics",
    warnings,
  };
}

export async function loadCalendarData({
  forceRefresh = false,
  now = new Date(),
}: LoadCalendarDataOptions = {}): Promise<CalendarDataResult> {
  const nowMs = now.getTime();

  if (
    !forceRefresh &&
    calendarDataCache &&
    calendarDataCache.expiresAt > nowMs
  ) {
    return calendarDataCache.result;
  }

  if (calendarDataInFlight && !forceRefresh) {
    return calendarDataInFlight;
  }

  calendarDataInFlight = (async () => {
    const fetchedAt = new Date();
    const result = withCacheMetadata(
      await fetchCalendarData(fetchedAt),
      fetchedAt,
    );

    calendarDataCache = {
      expiresAt: Date.parse(result.nextRefreshAt),
      result,
    };

    return result;
  })();

  try {
    return await calendarDataInFlight;
  } finally {
    calendarDataInFlight = null;
  }
}

export async function refreshCalendarData(): Promise<CalendarDataResult> {
  return loadCalendarData({ forceRefresh: true });
}
