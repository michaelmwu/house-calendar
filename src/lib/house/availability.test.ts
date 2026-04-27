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

  test("marks tentative room stays without promoting them to confirmed occupancy", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      [
        rawCalendarEventSchema.parse({
          id: "evt-tentative-room-stay",
          title: "Kirika stays (guest room, tentative)",
          startDate: "2026-04-19",
          endDate: "2026-04-21",
          allDay: true,
        }),
      ],
      "2026-04-19",
      2,
    );

    expect(days[0]?.status).toBe("tentative");
    expect(days[1]?.status).toBe("tentative");
    expect(
      days[0]?.rooms.find((room) => room.id === "guest-room")?.status,
    ).toBe("tentative");
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
  });

  test("confirmed occupancy overrides tentative room stays on the same day", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      [
        rawCalendarEventSchema.parse({
          id: "evt-tentative-room-stay",
          title: "Kirika maybe stays (guest room)",
          startDate: "2026-04-19",
          endDate: "2026-04-20",
          allDay: true,
        }),
        rawCalendarEventSchema.parse({
          id: "evt-confirmed-room-stay",
          title: "Someone stays (guest room)",
          startDate: "2026-04-19",
          endDate: "2026-04-20",
          allDay: true,
        }),
      ],
      "2026-04-19",
      1,
    );

    expect(days[0]?.status).toBe("partial");
    expect(
      days[0]?.rooms.find((room) => room.id === "guest-room")?.status,
    ).toBe("occupied");
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

  test("treats all-day datetime inputs as calendar dates", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      [
        rawCalendarEventSchema.parse({
          id: "evt-all-day-datetime",
          title: "Someone stays (guest room)",
          startDate: "2026-04-19T00:00:00Z",
          endDate: "2026-04-21T00:00:00Z",
          allDay: true,
        }),
      ],
      "2026-04-19",
      2,
    );

    expect(days[0]?.status).toBe("partial");
    expect(days[1]?.status).toBe("partial");
  });

  test("does not surface private presence rules in public presence output", () => {
    const config = structuredClone(exampleHouseConfig);
    config.rules.push({
      type: "presence.out",
      match: "^michael away for surgery$",
      actorId: "michael",
      visibility: "private",
    });

    const days = deriveDailyAvailability(
      config,
      [
        rawCalendarEventSchema.parse({
          id: "evt-private-presence",
          title: "Michael away for surgery",
          startDate: "2026-04-19",
          endDate: "2026-04-20",
          allDay: true,
        }),
      ],
      "2026-04-19",
      1,
    );

    expect(
      days[0]?.presence.find((person) => person.personId === "michael"),
    ).toMatchObject({
      state: "unknown",
    });
  });

  test("presence state is deterministic regardless of input event order", () => {
    const config = structuredClone(exampleHouseConfig);
    config.rules.push({
      type: "presence.out",
      match: "^michael out of japan$",
      actorId: "michael",
      visibility: "public",
    });
    config.rules.push({
      type: "presence.in",
      match: "^michael in tokyo$",
      actorId: "michael",
      visibility: "public",
    });

    const outEvent = rawCalendarEventSchema.parse({
      id: "evt-out",
      title: "Michael out of Japan",
      startDate: "2026-04-19",
      endDate: "2026-04-22",
      allDay: true,
    });
    const inEvent = rawCalendarEventSchema.parse({
      id: "evt-in",
      title: "Michael in Tokyo",
      startDate: "2026-04-20",
      endDate: "2026-04-21",
      allDay: true,
    });

    const forward = deriveDailyAvailability(
      config,
      [outEvent, inEvent],
      "2026-04-20",
      1,
    );
    const reversed = deriveDailyAvailability(
      config,
      [inEvent, outEvent],
      "2026-04-20",
      1,
    );

    expect(
      forward[0]?.presence.find((person) => person.personId === "michael"),
    ).toMatchObject({
      state: "in",
    });
    expect(
      reversed[0]?.presence.find((person) => person.personId === "michael"),
    ).toMatchObject({
      state: "in",
    });
  });

  test("presence.in occupies the known housemate default room", () => {
    const config = structuredClone(exampleHouseConfig);
    config.rules.push({
      type: "presence.in",
      match: "^michael in tokyo$",
      actorId: "michael",
      visibility: "private",
    });

    const days = deriveDailyAvailability(
      config,
      [
        rawCalendarEventSchema.parse({
          id: "evt-michael-in",
          title: "Michael in Tokyo",
          startDate: "2026-04-19",
          endDate: "2026-04-21",
          allDay: true,
        }),
      ],
      "2026-04-19",
      2,
    );

    expect(days[0]?.status).toBe("partial");
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "occupied",
    );
    expect(
      days[0]?.rooms.find((room) => room.id === "guest-room")?.status,
    ).toBe("free");
  });

  test("presence.in with not staying keeps the default room free", () => {
    const days = deriveDailyAvailability(
      exampleHouseConfig,
      [
        rawCalendarEventSchema.parse({
          id: "evt-michael-in-not-staying",
          title: "Michael in Tokyo (not staying)",
          startDate: "2026-04-19",
          endDate: "2026-04-21",
          allDay: true,
        }),
      ],
      "2026-04-19",
      2,
    );

    expect(days[0]?.status).toBe("available");
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
    expect(
      days[0]?.presence.find((person) => person.personId === "michael"),
    ).toMatchObject({
      label: "elsewhere",
      state: "in",
    });
  });

  test("presence.out does not occupy the known housemate default room", () => {
    const config = structuredClone(exampleHouseConfig);
    config.rules.push({
      type: "presence.out",
      match: "^michael out of japan$",
      actorId: "michael",
      visibility: "private",
    });

    const days = deriveDailyAvailability(
      config,
      [
        rawCalendarEventSchema.parse({
          id: "evt-michael-out",
          title: "Michael out of Japan",
          startDate: "2026-04-19",
          endDate: "2026-04-21",
          allDay: true,
        }),
      ],
      "2026-04-19",
      2,
    );

    expect(days[0]?.status).toBe("available");
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
  });

  test("presence.out on the departure day overrides overlapping presence.in occupancy", () => {
    const config = structuredClone(exampleHouseConfig);
    config.people = [
      {
        ...config.people[0],
        defaultRoomId: "my-room",
        id: "michael",
        name: "Michael",
      },
    ];
    config.visibleHousemateIds = ["michael"];

    const days = deriveDailyAvailability(
      config,
      [
        rawCalendarEventSchema.parse({
          id: "evt-michael-in",
          title: "Michael in Taiwan",
          startDate: "2026-04-24",
          endDate: "2026-05-01",
          allDay: true,
        }),
        rawCalendarEventSchema.parse({
          id: "evt-michael-out",
          title: "Michael out [Japan]",
          startDate: "2026-04-30",
          endDate: "2026-05-07",
          allDay: true,
        }),
      ],
      "2026-04-30",
      1,
    );

    expect(days[0]?.status).toBe("available");
    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
    expect(
      days[0]?.presence.find((person) => person.personId === "michael"),
    ).toMatchObject({
      label: "leaving",
      state: "out",
    });
  });

  test("checkout day after public presence.in is labeled leaving when no departure event exists", () => {
    const config = structuredClone(exampleHouseConfig);
    config.people = [
      {
        ...config.people[0],
        defaultRoomId: "my-room",
        id: "michael",
        name: "Michael",
      },
    ];
    config.visibleHousemateIds = ["michael"];

    const days = deriveDailyAvailability(
      config,
      [
        rawCalendarEventSchema.parse({
          id: "evt-michael-in",
          title: "Michael [TPE]",
          startDate: "2026-05-06",
          endDate: "2026-05-09",
          allDay: true,
        }),
      ],
      "2026-05-08",
      2,
    );

    expect(days[0]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "occupied",
    );
    expect(days[1]?.rooms.find((room) => room.id === "my-room")?.status).toBe(
      "free",
    );
    expect(
      days[1]?.presence.find((person) => person.personId === "michael"),
    ).toMatchObject({
      label: "leaving",
      state: "unknown",
    });
  });
});
