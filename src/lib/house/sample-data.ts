import {
  addDays,
  differenceInCalendarDays,
  formatISO,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";
import { configToHouseConfig } from "@/lib/config/config";
import exampleConfig from "../../../config/config.example";
import { deriveDailyAvailability } from "./availability";
import { parseEventTitle } from "./parser";
import {
  type HouseConfig,
  type RawCalendarEvent,
  rawCalendarEventSchema,
} from "./types";

export const exampleHouseConfig: HouseConfig =
  configToHouseConfig(exampleConfig);

function asDate(dateInput: Date | string): Date {
  return typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
}

function isoDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

export function buildSampleRawEvents(
  anchorInput: Date | string,
): RawCalendarEvent[] {
  const anchor = asDate(anchorInput);

  return [
    rawCalendarEventSchema.parse({
      id: "evt-1",
      title: "Someone stays (whole house)",
      startDate: isoDate(addDays(anchor, 4)),
      endDate: isoDate(addDays(anchor, 7)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-2",
      title: "Michael out of Japan (Europe)",
      startDate: isoDate(anchor),
      endDate: isoDate(addDays(anchor, 18)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-3",
      title: "Someone stays (guest room)",
      startDate: isoDate(addDays(anchor, 12)),
      endDate: isoDate(addDays(anchor, 15)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-4",
      title: "Michael (TPE)",
      startDate: isoDate(addDays(anchor, 18)),
      endDate: isoDate(addDays(anchor, 26)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-5",
      title: "Someone stays (my room)",
      startDate: isoDate(addDays(anchor, 39)),
      endDate: isoDate(addDays(anchor, 42)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-6",
      title: "Someone stays (guest room)",
      startDate: isoDate(addDays(anchor, 75)),
      endDate: isoDate(addDays(anchor, 79)),
      allDay: true,
    }),
  ];
}

const today = startOfToday();
const calendarStart = startOfMonth(today);

export const sampleRawEvents: RawCalendarEvent[] = buildSampleRawEvents(today);

export const sampleEventInterpretations = sampleRawEvents.map((raw) => ({
  raw,
  parsed: parseEventTitle(raw.title, exampleHouseConfig),
}));

export const sampleDerivedDays = deriveDailyAvailability(
  exampleHouseConfig,
  sampleRawEvents,
  isoDate(calendarStart),
  differenceInCalendarDays(today, calendarStart) + 365,
);
