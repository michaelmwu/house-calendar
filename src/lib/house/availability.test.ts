import { describe, expect, test } from "bun:test";
import { deriveDailyAvailability } from "./availability";
import { buildSampleRawEvents, exampleHouseConfig } from "./sample-data";

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
    expect(days[0]?.rooms.find((room) => room.id === "guest-room")?.status).toBe(
      "occupied",
    );
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
  });
});
