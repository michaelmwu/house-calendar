import { describe, expect, test } from "bun:test";
import { parseISO, startOfMonth } from "date-fns";
import {
  currentDateInTimeZone,
  dateTimeInTimeZoneToIso,
  formatCalendarDate,
  formatDateTimeRangeInTimeZone,
  formatTimeInTimeZone,
} from "./date";

describe("currentDateInTimeZone", () => {
  test("uses the house timezone instead of the viewer timezone", () => {
    const now = new Date("2026-04-23T23:30:00Z");

    expect(currentDateInTimeZone("Asia/Tokyo", now)).toBe("2026-04-24");
    expect(currentDateInTimeZone("America/Los_Angeles", now)).toBe(
      "2026-04-23",
    );
  });

  test("formats month boundaries without UTC day rollback", () => {
    const today = parseISO("2026-04-26");

    expect(formatCalendarDate(startOfMonth(today))).toBe("2026-04-01");
  });

  test("formats timed events in the house timezone", () => {
    expect(formatTimeInTimeZone("2026-04-29T04:00:00.000Z", "Asia/Tokyo")).toBe(
      "1:00 PM",
    );
    expect(formatTimeInTimeZone("2026-04-29T06:30:00.000Z", "Asia/Tokyo")).toBe(
      "3:30 PM",
    );
  });

  test("formats timed ranges in the house timezone", () => {
    expect(
      formatDateTimeRangeInTimeZone(
        "2026-04-29T04:00:00.000Z",
        "2026-04-29T06:30:00.000Z",
        "Asia/Tokyo",
      ),
    ).toBe("Apr 29, 2026, 1:00 PM - 3:30 PM (Asia/Tokyo)");
  });

  test("rejects nonexistent local wall-clock times during DST forward jumps", () => {
    expect(
      dateTimeInTimeZoneToIso(
        {
          year: 2026,
          month: 3,
          day: 8,
          hour: 2,
          minute: 30,
          second: 0,
        },
        "America/Los_Angeles",
      ),
    ).toBeNull();
  });
});
