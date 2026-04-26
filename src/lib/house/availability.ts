import { addDays, formatISO, isBefore, parseISO } from "date-fns";
import { parseEventTitle } from "./parser";
import {
  type DailyAvailability,
  dailyAvailabilitySchema,
  type HouseConfig,
  houseConfigSchema,
  type RawCalendarEvent,
  rawCalendarEventSchema,
} from "./types";

type WorkingDay = Omit<DailyAvailability, "status"> & {
  hasUnknownStay: boolean;
  rooms: DailyAvailability["rooms"];
  presence: DailyAvailability["presence"];
};

function asCalendarDate(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);

  if (!match) {
    throw new Error(`Invalid calendar date input: ${value}`);
  }

  return match[0];
}

function enumerateDays(startDate: string, endDateExclusive: string): string[] {
  const days: string[] = [];
  let cursor = parseISO(asCalendarDate(startDate));
  const end = parseISO(asCalendarDate(endDateExclusive));

  while (isBefore(cursor, end)) {
    days.push(formatISO(cursor, { representation: "date" }));
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function deriveDailyAvailability(
  configInput: HouseConfig,
  eventsInput: RawCalendarEvent[],
  startDate: string,
  nights: number,
): DailyAvailability[] {
  const config = houseConfigSchema.parse(configInput);
  const events = eventsInput
    .map((event) => rawCalendarEventSchema.parse(event))
    .sort((left, right) => {
      const startDateComparison = left.startDate.localeCompare(right.startDate);

      if (startDateComparison !== 0) {
        return startDateComparison;
      }

      const endDateComparison = left.endDate.localeCompare(right.endDate);

      if (endDateComparison !== 0) {
        return endDateComparison;
      }

      const titleComparison = left.title.localeCompare(right.title);

      if (titleComparison !== 0) {
        return titleComparison;
      }

      return left.id.localeCompare(right.id);
    });

  const endDateExclusive = formatISO(addDays(parseISO(startDate), nights), {
    representation: "date",
  });

  const days: WorkingDay[] = enumerateDays(startDate, endDateExclusive).map(
    (date) => ({
      date,
      hasUnknownStay: false,
      rooms: config.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        status: "free" as const,
      })),
      presence: config.people
        .filter((person) => config.visibleHousemateIds.includes(person.id))
        .map((person) => ({
          personId: person.id,
          name: person.name,
          state: "unknown" as const,
        })),
    }),
  );
  const daysByDate = new Map(days.map((day) => [day.date, day] as const));

  for (const event of events) {
    if (!event.allDay) {
      continue;
    }

    const parsed = parseEventTitle(event.title, config);
    const eventDays = enumerateDays(event.startDate, event.endDate);

    for (const eventDay of eventDays) {
      const day = daysByDate.get(eventDay);

      if (!day) {
        continue;
      }

      if (parsed.type === "stay") {
        if (parsed.scope === "house") {
          day.rooms = day.rooms.map((room) => ({
            ...room,
            status: "occupied",
          }));
          continue;
        }

        if (parsed.scope === "room" && parsed.roomId) {
          day.rooms = day.rooms.map((room) =>
            room.id === parsed.roomId ? { ...room, status: "occupied" } : room,
          );
          continue;
        }

        day.hasUnknownStay = true;
      }

      if (
        parsed.type === "presence" &&
        parsed.personId &&
        parsed.presenceState === "in"
      ) {
        const person = config.people.find(
          (candidate) => candidate.id === parsed.personId,
        );

        if (person?.defaultRoomId) {
          day.rooms = day.rooms.map((room) =>
            room.id === person.defaultRoomId
              ? { ...room, status: "occupied" }
              : room,
          );
        }
      }

      if (
        parsed.type === "presence" &&
        parsed.personId &&
        parsed.presenceState &&
        parsed.visibility === "public"
      ) {
        day.presence = day.presence.map((presence) =>
          presence.personId === parsed.personId
            ? { ...presence, state: parsed.presenceState ?? "unknown" }
            : presence,
        );
      }
    }
  }

  return days.map((day) => {
    const occupiedRooms = day.rooms.filter(
      (room) => room.status === "occupied",
    ).length;
    const status = day.hasUnknownStay
      ? "unknown"
      : occupiedRooms === 0
        ? "available"
        : occupiedRooms === day.rooms.length
          ? "unavailable"
          : "partial";

    return dailyAvailabilitySchema.parse({
      ...day,
      status,
    });
  });
}
