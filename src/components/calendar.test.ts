import { describe, expect, test } from "bun:test";
import { addDays, format, parseISO } from "date-fns";
import type { DailyAvailability } from "@/lib/house/types";
import { buildDayAriaLabel, buildWeeks } from "./calendar";

function buildDay(date: string): DailyAvailability {
  return {
    date,
    status: "available",
    rooms: [
      { id: "my-room", name: "My room", status: "free" },
      { id: "guest-room", name: "Guest room", status: "free" },
    ],
    presence: [],
  };
}

describe("buildWeeks", () => {
  test("keeps month transitions in the same continuous week row", () => {
    const startDate = parseISO("2026-06-28");
    const days = Array.from({ length: 14 }, (_, index) =>
      buildDay(format(addDays(startDate, index), "yyyy-MM-dd")),
    );

    const weeks = buildWeeks(days);

    expect(weeks).toHaveLength(2);
    expect(
      weeks[0]?.cells.flatMap((cell) => (cell.day ? [cell.day.date] : [])),
    ).toEqual([
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
    ]);
    expect(
      weeks[1]?.cells.flatMap((cell) => (cell.day ? [cell.day.date] : [])),
    ).toEqual([
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
    ]);
  });

  test("prioritizes true month changes for row markers", () => {
    const startDate = parseISO("2026-06-28");
    const days = Array.from({ length: 10 }, (_, index) =>
      buildDay(format(addDays(startDate, index), "yyyy-MM-dd")),
    );

    const weeks = buildWeeks(days);

    expect(weeks[0]?.monthMarker).toMatchObject({
      label: "July 2026",
      startColumn: 4,
    });
    expect(weeks[1]?.monthMarker).toBeUndefined();
  });

  test("uses the first visible day when the range starts mid-month", () => {
    const startDate = parseISO("2026-06-28");
    const days = Array.from({ length: 3 }, (_, index) =>
      buildDay(format(addDays(startDate, index), "yyyy-MM-dd")),
    );

    const weeks = buildWeeks(days);

    expect(weeks[0]?.monthMarker).toMatchObject({
      label: "June 2026",
      startColumn: 1,
    });
  });
});

describe("buildDayAriaLabel", () => {
  test("includes the full date, status, and room summary", () => {
    const label = buildDayAriaLabel({
      date: "2026-05-01",
      presence: [],
      rooms: [
        { id: "my-room", name: "My room", status: "free" },
        { id: "guest-room", name: "Guest room", status: "occupied" },
      ],
      status: "partial",
    });

    expect(label).toBe("May 1, 2026. Partially occupied. 1 room occupied");
  });

  test("describes tentative days distinctly from confirmed occupancy", () => {
    const label = buildDayAriaLabel({
      date: "2026-05-01",
      presence: [],
      rooms: [
        { id: "my-room", name: "My room", status: "free" },
        { id: "guest-room", name: "Guest room", status: "tentative" },
      ],
      status: "tentative",
    });

    expect(label).toBe("May 1, 2026. Tentative stay. 1 room tentative");
  });

  test("uses room-level wording when the house has a single room", () => {
    const label = buildDayAriaLabel({
      date: "2026-05-01",
      presence: [],
      rooms: [{ id: "studio", name: "Studio", status: "occupied" }],
      status: "unavailable",
    });

    expect(label).toBe("May 1, 2026. Occupied. Room occupied");
  });
});
