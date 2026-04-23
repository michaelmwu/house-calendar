import { describe, expect, test } from "bun:test";
import { deriveDailyAvailability } from "./availability";
import { buildSampleRawEvents, exampleHouseConfig } from "./sample-data";
import { rawCalendarEventSchema } from "./types";

describe("deriveDailyAvailability", () => {
  const sampleRawEvents = buildSampleRawEvents("2026-04-07");

  test("treats the end date as the departure date", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      sampleRawEvents,
      "2026-04-11",
      4,
    );

    expect(days[0]?.status).toBe("unavailable");
    expect(days[1]?.status).toBe("unavailable");
    expect(days[2]?.status).toBe("unavailable");
    expect(days[3]?.status).toBe("available");
  });

  test("marks only the guest room occupied for room-level stays", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      sampleRawEvents,
      "2026-04-19",
      2,
    );

    expect(days[0]?.status).toBe("partial");
    expect(
      days[0]?.rooms.find((room) => room.id === "guest-room")?.status,
    ).toBe("occupied");
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
  });

  test("marks ambiguous stay events as unknown instead of available", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      [
        rawCalendarEventSchema.parse({
          id: "evt-unknown-stay",
          title: "Someone stays",
          startDate: "2026-04-19",
          endDate: "2026-04-20",
          allDay: true,
        }),
      ],
      "2026-04-19",
      1,
    );

    expect(days[0]?.status).toBe("unknown");
  });

  test("ignores timed events when deriving all-day availability", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      [
        rawCalendarEventSchema.parse({
          id: "evt-timed",
          title: "Someone stays (guest room)",
          startDate: "2026-04-19T15:00:00",
          endDate: "2026-04-19T18:00:00",
          allDay: false,
        }),
      ],
      "2026-04-19",
      1,
    );

    expect(days[0]?.status).toBe("available");
    expect(days[0]?.rooms.every((room) => room.status === "free")).toBeTruthy();
  });
});
