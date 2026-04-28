"use client";

import { addDays, format, getDay, isAfter, parseISO } from "date-fns";
import type { FocusEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { currentDateInTimeZone, formatTimeInTimeZone } from "@/lib/house/date";
import type { DailyAvailability } from "@/lib/house/types";

type CalendarProps = {
  days: DailyAvailability[];
  houseName: string;
  requestEnabled: boolean;
  timedNotes: {
    showTime: boolean;
    textSource: "title" | "description" | "title_then_description";
  };
  timezone: string;
};

const statusClasses = {
  available:
    "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100",
  tentative: "bg-sky-50 text-sky-950 ring-1 ring-sky-200 hover:bg-sky-100",
  partial:
    "bg-amber-50 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100",
  unavailable:
    "bg-rose-50 text-rose-950 ring-1 ring-rose-200 hover:bg-rose-100",
  unknown:
    "bg-stone-100 text-stone-900 ring-1 ring-stone-200 hover:bg-stone-200",
} as const;

const statusDotClasses = {
  available: "bg-emerald-500",
  tentative: "bg-sky-500",
  partial: "bg-amber-500",
  unavailable: "bg-rose-500",
  unknown: "bg-stone-400",
} as const;

type StatusKey = keyof typeof statusDotClasses;
type RoomStatusKey = DailyAvailability["rooms"][number]["status"];

const roomStatusDotClasses: Record<RoomStatusKey, string> = {
  free: "bg-emerald-500",
  tentative: "bg-sky-500",
  occupied: "bg-[color:var(--app-foreground)]",
};

type CalendarCell = {
  id: string;
  dateLabel?: string;
  day?: DailyAvailability;
};

type CalendarMonthMarker = {
  label: string;
  startColumn: number;
};

type CalendarWeek = {
  id: string;
  cells: CalendarCell[];
  monthMarker?: CalendarMonthMarker;
};

type PreviewPosition = {
  x: number;
  y: number;
};

function isPastDate(date: string, today: string): boolean {
  return date < today;
}

function getDefaultSelectedDate(
  days: DailyAvailability[],
  today: string,
): string {
  return (
    days.find((day) => !isPastDate(day.date, today))?.date ??
    days[0]?.date ??
    ""
  );
}

export function buildWeeks(days: DailyAvailability[]): CalendarWeek[] {
  if (days.length === 0) {
    return [];
  }

  const dayMap = new Map(days.map((day) => [day.date, day]));
  const firstDay = days[0];
  const lastDay = days.at(-1);

  if (!firstDay || !lastDay) {
    return [];
  }

  const firstDate = parseISO(firstDay.date);
  const lastDate = parseISO(lastDay.date);
  const weeks: CalendarWeek[] = [];
  const calendarStart = addDays(firstDate, -getDay(firstDate));
  const calendarEnd = addDays(lastDate, 6 - getDay(lastDate));
  const firstDateKey = format(firstDate, "yyyy-MM-dd");

  let cursor = calendarStart;

  while (!isAfter(cursor, calendarEnd)) {
    const cells: CalendarCell[] = [];
    let monthMarker: CalendarMonthMarker | undefined;
    let monthMarkerPriority = 0;

    for (let offset = 0; offset < 7; offset += 1) {
      const cellDate = addDays(cursor, offset);
      const dateKey = format(cellDate, "yyyy-MM-dd");
      const isVisibleDate = dateKey >= firstDay.date && dateKey <= lastDay.date;

      if (!isVisibleDate) {
        cells.push({
          id: `${dateKey}-blank`,
        });
        continue;
      }

      const isFirstVisibleDay = dateKey === firstDateKey;
      const isFirstDayOfMonth = format(cellDate, "d") === "1";
      const markerPriority = isFirstDayOfMonth ? 2 : isFirstVisibleDay ? 1 : 0;

      if (markerPriority > monthMarkerPriority) {
        monthMarker = {
          label: format(cellDate, "MMMM yyyy"),
          startColumn: offset + 1,
        };
        monthMarkerPriority = markerPriority;
      }

      cells.push({
        id: dateKey,
        dateLabel: format(cellDate, "d"),
        day: dayMap.get(dateKey),
      });
    }

    weeks.push({
      id: format(cursor, "yyyy-MM-dd"),
      cells,
      monthMarker,
    });

    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function getDayStatusLabel(day: DailyAvailability): string {
  const hasSingleRoom = day.rooms.length === 1;

  switch (day.status) {
    case "available":
      return "Available";
    case "tentative":
      return hasSingleRoom ? "Tentative" : "Tentative stay";
    case "partial":
      return "Partially occupied";
    case "unavailable":
      return hasSingleRoom ? "Occupied" : "Whole house occupied";
    case "unknown":
      return "Needs interpretation";
  }
}

function formatRoomSummary(day: DailyAvailability): string {
  const hasSingleRoom = day.rooms.length === 1;
  const occupiedCount = day.rooms.filter(
    (room) => room.status === "occupied",
  ).length;
  const tentativeCount = day.rooms.filter(
    (room) => room.status === "tentative",
  ).length;
  const formatRoomCount = (count: number, status: "occupied" | "tentative") =>
    `${count} room${count === 1 ? "" : "s"} ${status}`;

  if (hasSingleRoom) {
    if (occupiedCount > 0) {
      return "Room occupied";
    }

    if (tentativeCount > 0) {
      return "Room tentative";
    }

    return "Room free";
  }

  if (occupiedCount === 0 && tentativeCount === 0) {
    return "All rooms free";
  }

  if (occupiedCount === day.rooms.length) {
    return "Whole house occupied";
  }

  if (occupiedCount === 0 && tentativeCount === day.rooms.length) {
    return "Whole house tentative";
  }

  if (occupiedCount > 0 && tentativeCount > 0) {
    return `${formatRoomCount(occupiedCount, "occupied")}, ${formatRoomCount(
      tentativeCount,
      "tentative",
    )}`;
  }

  if (occupiedCount === 0) {
    return formatRoomCount(tentativeCount, "tentative");
  }

  return formatRoomCount(occupiedCount, "occupied");
}

export function getWholeHouseDetailLabel(day: DailyAvailability): string {
  if (day.rooms.length === 1) {
    return getDayStatusLabel(day);
  }

  if (day.status === "unknown") {
    return getDayStatusLabel(day);
  }

  return formatRoomSummary(day);
}

function getRoomStatusLabel(status: RoomStatusKey): string {
  switch (status) {
    case "free":
      return "Free";
    case "tentative":
      return "Tentative";
    case "occupied":
      return "Occupied";
  }
}

export function buildDayAriaLabel(day: DailyAvailability): string {
  const labels = [
    format(parseISO(day.date), "MMMM d, yyyy"),
    getDayStatusLabel(day),
    formatRoomSummary(day),
  ];

  if (day.events.length > 0) {
    labels.push(
      day.events.length === 1
        ? "1 day event"
        : `${day.events.length} day events`,
    );
  }

  return labels.join(". ");
}

function getDayEventSectionLabel(_day: DailyAvailability): string {
  return "On this day";
}

export function resolveDayEventText(
  event: DailyAvailability["events"][number],
  textSource: CalendarProps["timedNotes"]["textSource"],
): string {
  const description = event.description?.trim();

  switch (textSource) {
    case "description":
      return description || event.title;
    case "title_then_description":
      return description ? `${event.title}: ${description}` : event.title;
    default:
      return event.title;
  }
}

function formatDayEventTimeLabel(
  event: DailyAvailability["events"][number],
  timezone: string,
): string {
  return `${formatTimeInTimeZone(event.startDate, timezone)} - ${formatTimeInTimeZone(
    event.endDate,
    timezone,
  )}`;
}

function formatDayEventSummary(
  event: DailyAvailability["events"][number],
  timedNotes: CalendarProps["timedNotes"],
  timezone: string,
): string {
  const text = resolveDayEventText(event, timedNotes.textSource);

  if (!timedNotes.showTime) {
    return text;
  }

  return `${formatTimeInTimeZone(event.startDate, timezone)} ${text}`;
}

function findNextWholeHouseFreeDate(
  days: DailyAvailability[],
  fromDate: string,
): string | null {
  return (
    days.find((day) => day.date >= fromDate && day.status === "available")
      ?.date ?? null
  );
}

function findNextRoomFreeDate(
  days: DailyAvailability[],
  roomId: string,
  fromDate: string,
): string | null {
  return (
    days.find((day) => {
      if (day.date < fromDate || day.status === "unknown") {
        return false;
      }

      return day.rooms.find((room) => room.id === roomId)?.status === "free";
    })?.date ?? null
  );
}

function formatNextFreeDateLabel(
  nextFreeDate: string | null,
  activeDate: string,
): string {
  if (!nextFreeDate) {
    return "No confirmed free date in range";
  }

  if (nextFreeDate === activeDate) {
    return "Free on this date";
  }

  return `Next free ${format(parseISO(nextFreeDate), "MMM d")}`;
}

function formatPanelDate(date: string): string {
  return format(parseISO(date), "MMM d");
}

function getPreviewHeading(
  previewDay: DailyAvailability,
  selectedDay: DailyAvailability,
): string {
  return previewDay.date === selectedDay.date
    ? "Selected date"
    : "Preview date";
}

function getPreviewPosition({ x, y }: PreviewPosition): PreviewPosition {
  if (typeof window === "undefined") {
    return { x: x + 18, y: y + 18 };
  }

  const viewportPadding = 16;
  const previewWidth = Math.max(
    0,
    Math.min(288, window.innerWidth - viewportPadding * 2),
  );
  const previewHeight = Math.max(
    0,
    Math.min(448, window.innerHeight - viewportPadding * 2),
  );

  return {
    x: Math.min(x + 18, window.innerWidth - previewWidth - viewportPadding),
    y: Math.min(y + 18, window.innerHeight - previewHeight - viewportPadding),
  };
}

function parseSelectedDateHash(hash: string): string | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;

  if (value.startsWith("date=")) {
    const date = value.slice("date=".length);

    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function Calendar({
  days,
  houseName,
  requestEnabled,
  timedNotes,
  timezone,
}: CalendarProps) {
  const today = currentDateInTimeZone(timezone);
  const defaultSelectedDate = getDefaultSelectedDate(days, today);
  const [selectedDate, setSelectedDate] = useState(defaultSelectedDate);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] =
    useState<PreviewPosition | null>(null);

  const clearPreview = () => {
    setPreviewDate(null);
    setPreviewPosition(null);
  };

  const updatePreviewFromMouse = (
    dayDate: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    setPreviewDate(dayDate);
    setPreviewPosition(
      getPreviewPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );
  };

  const updatePreviewFromFocus = (
    dayDate: string,
    event: FocusEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setPreviewDate(dayDate);
    setPreviewPosition(
      getPreviewPosition({
        x: rect.right,
        y: rect.top,
      }),
    );
  };

  useEffect(() => {
    setSelectedDate((currentSelectedDate) =>
      days.some((day) => day.date === currentSelectedDate)
        ? currentSelectedDate
        : defaultSelectedDate,
    );
  }, [days, defaultSelectedDate]);

  useEffect(() => {
    const syncSelectedDateFromHash = () => {
      const hashDate = parseSelectedDateHash(window.location.hash);

      if (hashDate && days.some((day) => day.date === hashDate)) {
        setSelectedDate(hashDate);
        return;
      }

      if (!hashDate) {
        setSelectedDate(defaultSelectedDate);
      }
    };

    syncSelectedDateFromHash();
    window.addEventListener("hashchange", syncSelectedDateFromHash);

    return () =>
      window.removeEventListener("hashchange", syncSelectedDateFromHash);
  }, [days, defaultSelectedDate]);

  useEffect(() => {
    const nextHash = `date=${selectedDate}`;

    if (window.location.hash.slice(1) === nextHash) {
      return;
    }

    window.history.replaceState(null, "", `#${nextHash}`);
  }, [selectedDate]);

  if (days.length === 0) {
    return null;
  }

  const weeks = buildWeeks(days);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[0];
  const previewDay = previewDate
    ? (days.find((day) => day.date === previewDate) ?? null)
    : null;
  const hasSingleRoom = days[0]?.rooms.length === 1;
  const hidePreviewRoomBreakdownOnMobile =
    previewDay?.status === "unavailable" && !hasSingleRoom;
  const legendItems: ReadonlyArray<readonly [StatusKey, string]> = hasSingleRoom
    ? [
        ["available", "Room free"],
        ["tentative", "Room tentative"],
        ["unavailable", "Room occupied"],
        ["unknown", "Needs interpretation"],
      ]
    : [
        ["available", "All rooms free"],
        ["tentative", "At least one room tentative"],
        ["partial", "At least one room occupied"],
        ["unavailable", "Whole house occupied"],
        ["unknown", "Needs interpretation"],
      ];
  const upcomingBusyDays = days
    .filter((day) => !isPastDate(day.date, today) && day.status !== "available")
    .slice(0, 6);

  if (!selectedDay) {
    return null;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-[1.75rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] shadow-[var(--app-shadow)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--app-card-border)] px-5 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              {houseName}
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--app-card-border)] bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--app-muted)]">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                requestEnabled ? "bg-emerald-500" : "bg-stone-400"
              }`}
            />
            {requestEnabled ? "Requests enabled" : "View only"}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-2 px-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.24em] text-[var(--app-muted)]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="pb-1 text-center">
                {label}
              </div>
            ))}
          </div>

          <div className="h-[78vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              {weeks.map((week) => (
                <div key={week.id} className="space-y-2">
                  {week.monthMarker ? (
                    <div className="grid grid-cols-7 gap-2 px-1">
                      <div
                        className="flex"
                        style={{
                          gridColumn: `${week.monthMarker.startColumn} / -1`,
                        }}
                      >
                        <div className="flex w-full items-center rounded-full border border-[color:var(--app-card-border)] bg-white/88 px-2.5 py-1 shadow-[0_1px_0_rgba(31,28,22,0.04)]">
                          <p className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--app-muted)]">
                            {week.monthMarker.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-7 gap-2">
                    {week.cells.map((cell) => {
                      if (!cell.day) {
                        return (
                          <div
                            key={cell.id}
                            className="aspect-[0.95] rounded-2xl bg-transparent"
                          />
                        );
                      }

                      const day = cell.day;
                      const isSelected = selectedDay.date === day.date;
                      const isPastDay = isPastDate(day.date, today);
                      const cellClasses = isPastDay
                        ? "cursor-pointer bg-stone-100 text-stone-500 ring-1 ring-stone-200 hover:bg-stone-200"
                        : statusClasses[day.status];
                      const roomBarClass = isPastDay
                        ? "bg-stone-300/80"
                        : "bg-white/75";
                      const dotClass = isPastDay
                        ? "bg-stone-300"
                        : statusDotClasses[day.status];

                      return (
                        <button
                          key={cell.id}
                          aria-label={buildDayAriaLabel(day)}
                          type="button"
                          onClick={() => setSelectedDate(day.date)}
                          onFocus={(event) =>
                            updatePreviewFromFocus(day.date, event)
                          }
                          onMouseEnter={(event) =>
                            updatePreviewFromMouse(day.date, event)
                          }
                          onMouseMove={(event) =>
                            updatePreviewFromMouse(day.date, event)
                          }
                          onMouseLeave={clearPreview}
                          onBlur={clearPreview}
                          className={`aspect-[0.95] rounded-2xl p-2 text-left transition ${
                            cellClasses
                          } ${isSelected ? "ring-2 ring-[color:var(--app-foreground)]" : ""}`}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <span className="block text-sm font-semibold">
                                {cell.dateLabel}
                              </span>
                              <span
                                className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`}
                              />
                            </div>

                            <div className="space-y-1">
                              {day.events.length > 0 ? (
                                <p className="truncate text-[10px] font-medium text-current/85">
                                  {formatDayEventSummary(
                                    day.events[0],
                                    timedNotes,
                                    timezone,
                                  )}
                                  {day.events.length > 1
                                    ? ` +${day.events.length - 1}`
                                    : ""}
                                </p>
                              ) : null}
                              <p className="truncate text-[11px] font-medium capitalize">
                                {day.status}
                              </p>
                              <div className="flex gap-1">
                                {day.rooms.map((room) => (
                                  <span
                                    key={room.id}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      room.status === "occupied"
                                        ? isPastDay
                                          ? "bg-stone-400"
                                          : "bg-[color:var(--app-foreground)]/70"
                                        : room.status === "tentative"
                                          ? isPastDay
                                            ? "bg-stone-300"
                                            : "bg-sky-400/80"
                                          : roomBarClass
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {previewDay && previewPosition ? (
        <div
          className="pointer-events-auto fixed z-50 w-[min(18rem,calc(100vw-2rem))] max-h-[min(28rem,calc(100vh-2rem))] overflow-y-auto rounded-[1.25rem] border border-[color:var(--app-card-border)] bg-white/95 p-4 shadow-[0_20px_60px_rgba(29,22,12,0.18)] backdrop-blur sm:pointer-events-none"
          style={{
            left: previewPosition.x,
            top: previewPosition.y,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-[var(--app-muted)]">
                {getPreviewHeading(previewDay, selectedDay)}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                {formatPanelDate(previewDay.date)}
              </h3>
              <p className="text-xs text-[var(--app-muted)]">
                {format(parseISO(previewDay.date), "EEEE")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-card-border)] bg-white/90 px-3 py-1 text-xs font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                  statusDotClasses[previewDay.status]
                }`}
              />
              {getDayStatusLabel(previewDay)}
            </div>
          </div>

          <p className="mt-3 text-sm text-[var(--app-muted)]">
            {formatRoomSummary(previewDay)}
          </p>

          <div className="mt-4 space-y-2 border-t border-[color:var(--app-card-border)] pt-3">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--app-muted)]">
              Availability details
            </p>

            {hasSingleRoom ? null : (
              <div className="rounded-xl border border-[color:var(--app-card-border)] bg-white/75 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        statusDotClasses[previewDay.status]
                      }`}
                    />
                    <span>Whole house</span>
                  </div>
                  <span className="text-right font-[family-name:var(--font-mono)] uppercase text-[var(--app-muted)]">
                    {getWholeHouseDetailLabel(previewDay)}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`space-y-2 ${
                hidePreviewRoomBreakdownOnMobile ? "hidden sm:block" : ""
              }`}
            >
              {previewDay.rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-xl border border-[color:var(--app-card-border)] bg-white/75 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          roomStatusDotClasses[room.status]
                        }`}
                      />
                      <span>{room.name}</span>
                    </div>
                    <span className="text-right font-[family-name:var(--font-mono)] uppercase text-[var(--app-muted)]">
                      {getRoomStatusLabel(room.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {previewDay.events.length > 0 ? (
            <div className="mt-4 border-t border-[color:var(--app-card-border)] pt-3">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--app-muted)]">
                {getDayEventSectionLabel(previewDay)}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {previewDay.events.slice(0, 3).map((event) => (
                  <div key={event.id}>
                    {timedNotes.showTime ? (
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--app-muted)]">
                        {formatDayEventTimeLabel(event, timezone)}
                      </p>
                    ) : null}
                    <p className={timedNotes.showTime ? "truncate" : ""}>
                      {resolveDayEventText(event, timedNotes.textSource)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
        <section className="rounded-[1.75rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-5 shadow-[var(--app-shadow)]">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Selected date
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {formatPanelDate(selectedDay.date)}
          </h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            {format(parseISO(selectedDay.date), "EEEE")}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-card-border)] bg-white/80 px-3 py-1.5 text-sm font-medium capitalize">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                statusDotClasses[selectedDay.status]
              }`}
            />
            {selectedDay.status}
          </div>

          <p className="mt-4 text-sm text-[var(--app-muted)]">
            {formatRoomSummary(selectedDay)}
          </p>

          {selectedDay.events.length > 0 ? (
            <div className="mt-5 rounded-xl border border-[color:var(--app-card-border)] bg-white/75 px-3 py-2 text-sm">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.24em] text-[var(--app-muted)]">
                {getDayEventSectionLabel(selectedDay)}
              </p>
              <div className="mt-2 space-y-1.5">
                {selectedDay.events.map((event) => (
                  <div key={event.id}>
                    {timedNotes.showTime ? (
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--app-muted)]">
                        {formatDayEventTimeLabel(event, timezone)}
                      </p>
                    ) : null}
                    <p className={timedNotes.showTime ? "mt-0.5" : ""}>
                      {resolveDayEventText(event, timedNotes.textSource)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasSingleRoom ? null : (
            <div className="mt-5 rounded-xl border border-[color:var(--app-card-border)] bg-white/75 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>Whole house</span>
                <span className="text-right font-[family-name:var(--font-mono)] uppercase text-[var(--app-muted)]">
                  {getWholeHouseDetailLabel(selectedDay)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                {formatNextFreeDateLabel(
                  findNextWholeHouseFreeDate(days, selectedDay.date),
                  selectedDay.date,
                )}
              </p>
            </div>
          )}

          <div className="mt-5 space-y-2">
            {selectedDay.rooms.map((room) => (
              <div
                key={room.id}
                className="rounded-xl border border-[color:var(--app-card-border)] bg-white/75 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{room.name}</span>
                  <span className="text-right font-[family-name:var(--font-mono)] uppercase text-[var(--app-muted)]">
                    {room.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  {formatNextFreeDateLabel(
                    findNextRoomFreeDate(days, room.id, selectedDay.date),
                    selectedDay.date,
                  )}
                </p>
              </div>
            ))}
          </div>

          {selectedDay.presence.length > 0 ? (
            <div className="mt-5 space-y-2 border-t border-[color:var(--app-card-border)] pt-4">
              {selectedDay.presence.map((presence) => (
                <div
                  key={presence.personId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{presence.name}</span>
                  <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--app-muted)]">
                    {presence.label ?? presence.state}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-5 shadow-[var(--app-shadow)]">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Legend
          </p>
          <div className="mt-4 grid gap-2">
            {legendItems.map(([status, label]) => (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span
                  className={`h-3 w-3 rounded-full ${statusDotClasses[status]}`}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-5 shadow-[var(--app-shadow)]">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Upcoming busy days
          </p>
          <div className="mt-4 space-y-2">
            {upcomingBusyDays.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                onFocus={(event) => updatePreviewFromFocus(day.date, event)}
                onMouseEnter={(event) =>
                  updatePreviewFromMouse(day.date, event)
                }
                onMouseMove={(event) => updatePreviewFromMouse(day.date, event)}
                onMouseLeave={clearPreview}
                onBlur={clearPreview}
                className="flex w-full items-center justify-between rounded-xl border border-[color:var(--app-card-border)] bg-white/75 px-3 py-2 text-left text-sm"
              >
                <span>{format(parseISO(day.date), "MMM d")}</span>
                <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--app-muted)]">
                  {day.status}
                </span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
