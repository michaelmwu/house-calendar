import {
  addDays,
  formatISO,
  parseISO,
  startOfToday,
} from "date-fns";
import { deriveDailyAvailability } from "./availability";
import { parseEventTitle } from "./parser";
import {
  rawCalendarEventSchema,
  type HouseConfig,
  type RawCalendarEvent,
} from "./types";
import exampleInstanceConfig from "../../../config/instance-config.example";
import { instanceConfigToHouseConfig } from "@/lib/config/instance-config";

export const washingtonHouseConfig: HouseConfig =
  instanceConfigToHouseConfig(exampleInstanceConfig);

function asDate(dateInput: Date | string): Date {
  return typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
}

function isoDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

export function buildSampleRawEvents(anchorInput: Date | string): RawCalendarEvent[] {
  const anchor = asDate(anchorInput);

  return [
    rawCalendarEventSchema.parse({
      id: "evt-1",
      title: "Ninad stays (whole house)",
      startDate: isoDate(addDays(anchor, 4)),
      endDate: isoDate(addDays(anchor, 7)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-2",
      title: "Michael out of Taiwan (Europe)",
      startDate: isoDate(anchor),
      endDate: isoDate(addDays(anchor, 18)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-3",
      title: "Ninad stays (guest room)",
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
      title: "Ninad stays (my room)",
      startDate: isoDate(addDays(anchor, 39)),
      endDate: isoDate(addDays(anchor, 42)),
      allDay: true,
    }),
    rawCalendarEventSchema.parse({
      id: "evt-6",
      title: "Ninad stays (guest room)",
      startDate: isoDate(addDays(anchor, 75)),
      endDate: isoDate(addDays(anchor, 79)),
      allDay: true,
    }),
  ];
}

const today = startOfToday();

export const sampleRawEvents: RawCalendarEvent[] = buildSampleRawEvents(today);

export const sampleEventInterpretations = sampleRawEvents.map((raw) => ({
  raw,
  parsed: parseEventTitle(raw.title, washingtonHouseConfig),
}));

export const sampleDerivedDays = deriveDailyAvailability(
  washingtonHouseConfig,
  sampleRawEvents,
  isoDate(today),
  365,
);
