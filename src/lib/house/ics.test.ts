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
        visibility: "public",
      },
      {
        id: "presence-1",
        title: "Michael [TPE]",
        startDate: "2026-04-15",
        endDate: "2026-04-18",
        allDay: true,
        visibility: "public",
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
        visibility: "public",
      },
    ]);
  });

  test("ignores checkout_day events that collapse to zero nights", () => {
    const events = parseIcsCalendar(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:stay-1
SUMMARY:One-day checkout event
DTSTART;VALUE=DATE:20260410
DTEND;VALUE=DATE:20260411
END:VEVENT
BEGIN:VEVENT
UID:stay-2
SUMMARY:Someone stays (guest room)
DTSTART;VALUE=DATE:20260412
DTEND;VALUE=DATE:20260415
END:VEVENT
END:VCALENDAR`,
      {
        allDayEndDateMode: "checkout_day",
      },
    );

    expect(events).toEqual([
      {
        id: "stay-2",
        title: "Someone stays (guest room)",
        startDate: "2026-04-12",
        endDate: "2026-04-14",
        allDay: true,
        visibility: "public",
      },
    ]);
  });

  test("preserves timed events and hides ICS private class in the raw event model", () => {
    const events = parseIcsCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:timed-1
SUMMARY:Cleaner
DTSTART;TZID=Asia/Tokyo:20260429T130000
DTEND;TZID=Asia/Tokyo:20260429T153000
END:VEVENT
BEGIN:VEVENT
UID:timed-2
CLASS:PRIVATE
SUMMARY:Test Event
DTSTART:20260429T081500Z
DTEND:20260429T111500Z
END:VEVENT
BEGIN:VEVENT
UID:cancelled-1
SUMMARY:Someone stays (whole house)
STATUS:CANCELLED
DTSTART;VALUE=DATE:20260420
DTEND;VALUE=DATE:20260422
END:VEVENT
END:VCALENDAR`);

    expect(events).toEqual([
      {
        id: "timed-1",
        title: "Cleaner",
        startDate: "2026-04-29T04:00:00.000Z",
        endDate: "2026-04-29T06:30:00.000Z",
        allDay: false,
        visibility: "public",
      },
      {
        id: "timed-2",
        title: "Test Event",
        startDate: "2026-04-29T08:15:00.000Z",
        endDate: "2026-04-29T11:15:00.000Z",
        allDay: false,
        visibility: "private",
      },
    ]);
  });
});
