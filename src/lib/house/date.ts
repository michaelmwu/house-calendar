import { formatISO } from "date-fns";

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
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(
      `Unable to derive current date for timezone "${timeZone}".`,
    );
  }

  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}
