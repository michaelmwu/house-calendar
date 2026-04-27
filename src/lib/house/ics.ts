import { addDays, formatISO, parseISO } from "date-fns";
import { dateTimeInTimeZoneToIso, isValidTimeZone } from "./date";
import { type RawCalendarEvent, rawCalendarEventSchema } from "./types";

type ParsedIcsProperty = {
  name: string;
  params: Map<string, string>;
  value: string;
};

type ParseIcsCalendarOptions = {
  allDayEndDateMode?: "calendar_days" | "checkout_day";
  defaultTimedEventTimeZone?: string;
};

function unfoldIcsLines(input: string): string[] {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function parseProperty(line: string): ParsedIcsProperty | null {
  const separatorIndex = line.indexOf(":");

  if (separatorIndex < 0) {
    return null;
  }

  const rawHead = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...rawParams] = rawHead.split(";");
  const name = rawName?.toUpperCase();

  if (!name) {
    return null;
  }

  const params = new Map<string, string>();

  for (const rawParam of rawParams) {
    const [rawKey, rawValue] = rawParam.split("=", 2);

    if (!rawKey || rawValue === undefined) {
      continue;
    }

    params.set(rawKey.toUpperCase(), rawValue);
  }

  return {
    name,
    params,
    value,
  };
}

function unescapeText(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";");
}

function normalizeTimeZoneId(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim().replace(/^"(.*)"$/, "$1");

  if (!trimmedValue) {
    return undefined;
  }

  return isValidTimeZone(trimmedValue) ? trimmedValue : undefined;
}

function parseIcsDate(
  value: string,
  options: { timeZone?: string } = {},
): string | null {
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  const utcMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );

  if (utcMatch) {
    return new Date(
      Date.UTC(
        Number(utcMatch[1]),
        Number(utcMatch[2]) - 1,
        Number(utcMatch[3]),
        Number(utcMatch[4]),
        Number(utcMatch[5]),
        Number(utcMatch[6]),
      ),
    ).toISOString();
  }

  const localDateTimeMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/,
  );

  if (localDateTimeMatch) {
    const timeZone = normalizeTimeZoneId(options.timeZone);
    const year = Number(localDateTimeMatch[1]);
    const month = Number(localDateTimeMatch[2]);
    const day = Number(localDateTimeMatch[3]);
    const hour = Number(localDateTimeMatch[4]);
    const minute = Number(localDateTimeMatch[5]);
    const second = Number(localDateTimeMatch[6] ?? "0");

    if (timeZone) {
      return dateTimeInTimeZoneToIso(
        {
          year,
          month,
          day,
          hour,
          minute,
          second,
        },
        timeZone,
      );
    }

    return new Date(year, month - 1, day, hour, minute, second).toISOString();
  }

  return null;
}

function isAllDayProperty(property: ParsedIcsProperty): boolean {
  return property.params.get("VALUE")?.toUpperCase() === "DATE";
}

function normalizeAllDayCheckoutEnd(date: string): string {
  return formatISO(addDays(parseISO(date), -1), { representation: "date" });
}

function buildRawEvent(
  eventProperties: Map<string, ParsedIcsProperty[]>,
  index: number,
  options: ParseIcsCalendarOptions,
): RawCalendarEvent | null {
  const summary = eventProperties.get("SUMMARY")?.[0];
  const description = eventProperties.get("DESCRIPTION")?.[0];
  const dtStart = eventProperties.get("DTSTART")?.[0];
  const dtEnd = eventProperties.get("DTEND")?.[0];
  const visibilityClass = eventProperties
    .get("CLASS")?.[0]
    ?.value.toUpperCase()
    .trim();
  const status = eventProperties.get("STATUS")?.[0]?.value.toUpperCase();

  if (status === "CANCELLED") {
    return null;
  }

  if (!summary || !dtStart || !dtEnd) {
    return null;
  }

  const allDay = isAllDayProperty(dtStart) || isAllDayProperty(dtEnd);
  const timedEventTimeZone =
    dtStart.params.get("TZID") ??
    dtEnd.params.get("TZID") ??
    options.defaultTimedEventTimeZone;
  const startDate = parseIcsDate(dtStart.value, {
    timeZone: timedEventTimeZone,
  });
  const rawEndDate = parseIcsDate(dtEnd.value, {
    timeZone: timedEventTimeZone,
  });

  if (!startDate || !rawEndDate) {
    return null;
  }
  const endDate =
    allDay && options.allDayEndDateMode === "checkout_day"
      ? normalizeAllDayCheckoutEnd(rawEndDate)
      : rawEndDate;

  if (Date.parse(endDate) <= Date.parse(startDate)) {
    return null;
  }

  const uid = eventProperties.get("UID")?.[0]?.value?.trim();

  const normalizedDescription = description
    ? unescapeText(description.value).trim() || undefined
    : undefined;

  return rawCalendarEventSchema.parse({
    id: uid || `ics-event-${index}`,
    ...(normalizedDescription ? { description: normalizedDescription } : {}),
    title: unescapeText(summary.value).trim(),
    startDate,
    endDate,
    allDay,
    visibility:
      visibilityClass === "PRIVATE" || visibilityClass === "CONFIDENTIAL"
        ? "private"
        : "public",
  });
}

export function parseIcsCalendar(
  input: string,
  options: ParseIcsCalendarOptions = {},
): RawCalendarEvent[] {
  const lines = unfoldIcsLines(input);
  const events: RawCalendarEvent[] = [];
  let inEvent = false;
  let currentEventProperties = new Map<string, ParsedIcsProperty[]>();

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      currentEventProperties = new Map<string, ParsedIcsProperty[]>();
      continue;
    }

    if (line === "END:VEVENT") {
      if (inEvent) {
        const event = buildRawEvent(
          currentEventProperties,
          events.length + 1,
          options,
        );

        if (event) {
          events.push(event);
        }
      }

      inEvent = false;
      currentEventProperties = new Map<string, ParsedIcsProperty[]>();
      continue;
    }

    if (!inEvent) {
      continue;
    }

    const property = parseProperty(line);

    if (!property) {
      continue;
    }

    const existing = currentEventProperties.get(property.name) ?? [];
    existing.push(property);
    currentEventProperties.set(property.name, existing);
  }

  return events;
}
