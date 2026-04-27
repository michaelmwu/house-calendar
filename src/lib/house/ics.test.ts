import { describe, expect, test } from "bun:test";
import { parseIcsCalendar } from "./ics";

describe("parseIcsCalendar", () => {
  test("parses all-day VEVENT entries into raw events", () => {
    const events = parseIcsCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:stay-1
SUMMARY:Someone stays (guest room)
DTSTART;VALUE=DATE:20260410
DTEND;VALUE=DATE:20260413
END:VEVENT
BEGIN:VEVENT
UID:presence-1
SUMMARY:Michael [TPE]
DTSTART;VALUE=DATE:20260415
DTEND;VALUE=DATE:20260418
END:VEVENT
END:VCALENDAR`);

    expect(events).toEqual([
      {
        id: "stay-1",
        title: "Someone stays (guest room)",
        startDate: "2026-04-10",
        endDate: "2026-04-13",
        allDay: true,
      },
      {
        id: "presence-1",
        title: "Michael [TPE]",
        startDate: "2026-04-15",
        endDate: "2026-04-18",
        allDay: true,
      },
    ]);
  });

  test("supports checkout_day all-day end date mode", () => {
    const events = parseIcsCalendar(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:stay-1
SUMMARY:Someone stays (guest room)
DTSTART;VALUE=DATE:20260410
DTEND;VALUE=DATE:20260413
END:VEVENT
END:VCALENDAR`,
      {
        allDayEndDateMode: "checkout_day",
      },
    );

    expect(events).toEqual([
      {
        id: "stay-1",
        title: "Someone stays (guest room)",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        allDay: true,
      },
    ]);
  });

  test("ignores timed and cancelled events", () => {
    const events = parseIcsCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:timed-1
SUMMARY:Lunch
DTSTART:20260410T010000Z
DTEND:20260410T020000Z
END:VEVENT
BEGIN:VEVENT
UID:cancelled-1
SUMMARY:Someone stays (whole house)
STATUS:CANCELLED
DTSTART;VALUE=DATE:20260420
DTEND;VALUE=DATE:20260422
END:VEVENT
END:VCALENDAR`);

    expect(events).toEqual([]);
  });
});
