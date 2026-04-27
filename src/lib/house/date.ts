import { formatISO, parseISO } from "date-fns";

type TimeZoneDateTimeInput = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
};

type TimeZoneParts = {
  day: string;
  hour: string;
  minute: string;
  month: string;
  second: string;
  year: string;
};

function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const second = parts.find((part) => part.type === "second")?.value;

  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error(`Unable to derive date parts for timezone "${timeZone}".`);
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = getTimeZoneParts(date, timeZone);
  const timestampInTimeZone = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return timestampInTimeZone - date.getTime();
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function currentDateInTimeZone(
  timeZone: string,
  now = new Date(),
): string {
  const { year, month, day } = getTimeZoneParts(now, timeZone);

  return `${year}-${month}-${day}`;
}

export function calendarDateInTimeZone(
  value: Date | string,
  timeZone: string,
): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  const { year, month, day } = getTimeZoneParts(date, timeZone);

  return `${year}-${month}-${day}`;
}

export function dateTimeInTimeZoneToIso(
  input: TimeZoneDateTimeInput,
  timeZone: string,
): string | null {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second,
  );
  const initialOffset = getTimeZoneOffsetMilliseconds(
    new Date(utcGuess),
    timeZone,
  );
  const shiftedTimestamp = utcGuess - initialOffset;
  const adjustedOffset = getTimeZoneOffsetMilliseconds(
    new Date(shiftedTimestamp),
    timeZone,
  );
  const timestamp =
    adjustedOffset === initialOffset
      ? shiftedTimestamp
      : utcGuess - adjustedOffset;
  const resolvedDate = new Date(timestamp);
  const resolvedParts = getTimeZoneParts(resolvedDate, timeZone);

  if (
    Number(resolvedParts.year) !== input.year ||
    Number(resolvedParts.month) !== input.month ||
    Number(resolvedParts.day) !== input.day ||
    Number(resolvedParts.hour) !== input.hour ||
    Number(resolvedParts.minute) !== input.minute ||
    Number(resolvedParts.second) !== input.second
  ) {
    return null;
  }

  return resolvedDate.toISOString();
}

export function formatCalendarDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

export function formatTimeInTimeZone(
  value: Date | string,
  timeZone: string,
): string {
  const date = typeof value === "string" ? parseISO(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
