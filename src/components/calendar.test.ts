import { describe, expect, test } from "bun:test";
import { addDays, format, parseISO } from "date-fns";
import type { DailyAvailability } from "@/lib/house/types";
import { buildMonths } from "./calendar";

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

describe("buildMonths", () => {
  test("does not duplicate trailing days into the next month header", () => {
    const startDate = parseISO("2026-04-26");
    const days = Array.from({ length: 14 }, (_, index) =>
      buildDay(format(addDays(startDate, index), "yyyy-MM-dd")),
    );

    const months = buildMonths(days);

    expect(months.map((month) => month.id)).toEqual(["2026-04", "2026-05"]);
    expect(
      months[0]?.cells.flatMap((cell) => (cell.day ? [cell.day.date] : [])),
    ).toEqual([
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
    ]);
    expect(
      months[1]?.cells.flatMap((cell) => (cell.day ? [cell.day.date] : [])),
    ).toEqual([
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-09",
    ]);

    expect(months[0]?.cells.slice(-2).every((cell) => !cell.day)).toBe(true);
    expect(months[1]?.cells.slice(0, 5).every((cell) => !cell.day)).toBe(true);
  });
});
