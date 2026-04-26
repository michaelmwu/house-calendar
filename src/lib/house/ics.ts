import { formatISO } from "date-fns";
import { type RawCalendarEvent, rawCalendarEventSchema } from "./types";

type ParsedIcsProperty = {
  name: string;
  params: Map<string, string>;
  value: string;
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

function parseIcsDate(value: string): string | null {
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  const utcMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );

  if (utcMatch) {
    return formatISO(
      new Date(
        Date.UTC(
          Number(utcMatch[1]),
          Number(utcMatch[2]) - 1,
          Number(utcMatch[3]),
          Number(utcMatch[4]),
          Number(utcMatch[5]),
          Number(utcMatch[6]),
        ),
      ),
    );
  }

  return null;
}

function isAllDayProperty(property: ParsedIcsProperty): boolean {
  return property.params.get("VALUE")?.toUpperCase() === "DATE";
}

function buildRawEvent(
  eventProperties: Map<string, ParsedIcsProperty[]>,
  index: number,
): RawCalendarEvent | null {
  const summary = eventProperties.get("SUMMARY")?.[0];
  const dtStart = eventProperties.get("DTSTART")?.[0];
  const dtEnd = eventProperties.get("DTEND")?.[0];
  const status = eventProperties.get("STATUS")?.[0]?.value.toUpperCase();

  if (status === "CANCELLED") {
    return null;
  }

  if (!summary || !dtStart || !dtEnd) {
    return null;
  }

  const allDay = isAllDayProperty(dtStart) || isAllDayProperty(dtEnd);

  if (!allDay) {
    return null;
  }

  const startDate = parseIcsDate(dtStart.value);
  const endDate = parseIcsDate(dtEnd.value);

  if (!startDate || !endDate) {
    return null;
  }

  const uid = eventProperties.get("UID")?.[0]?.value?.trim();

  return rawCalendarEventSchema.parse({
    id: uid || `ics-event-${index}`,
    title: unescapeText(summary.value).trim(),
    startDate,
    endDate,
    allDay: true,
  });
}

export function parseIcsCalendar(input: string): RawCalendarEvent[] {
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
        const event = buildRawEvent(currentEventProperties, events.length + 1);

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
