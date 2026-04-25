import { describe, expect, test } from "bun:test";
import { currentDateInTimeZone } from "./date";

describe("currentDateInTimeZone", () => {
  test("uses the house timezone instead of the viewer timezone", () => {
    const now = new Date("2026-04-23T23:30:00Z");

    expect(currentDateInTimeZone("Asia/Tokyo", now)).toBe("2026-04-24");
    expect(currentDateInTimeZone("America/Los_Angeles", now)).toBe(
      "2026-04-23",
    );
  });
});
