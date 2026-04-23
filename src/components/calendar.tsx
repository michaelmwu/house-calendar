"use client";

import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useState } from "react";
import type { DailyAvailability } from "@/lib/house/types";

type CalendarProps = {
  days: DailyAvailability[];
  houseName: string;
  requestEnabled: boolean;
};

const statusClasses = {
  available:
    "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100",
  partial:
    "bg-amber-50 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100",
  unavailable:
    "bg-rose-50 text-rose-950 ring-1 ring-rose-200 hover:bg-rose-100",
  unknown:
    "bg-stone-100 text-stone-900 ring-1 ring-stone-200 hover:bg-stone-200",
} as const;

const statusDotClasses = {
  available: "bg-emerald-500",
  partial: "bg-amber-500",
  unavailable: "bg-rose-500",
  unknown: "bg-stone-400",
} as const;

type CalendarCell = {
  dateKey: string;
  dateLabel: string;
  isCurrentMonth: boolean;
  day?: DailyAvailability;
};

type CalendarMonth = {
  id: string;
  label: string;
  cells: CalendarCell[];
};

function buildMonths(days: DailyAvailability[]): CalendarMonth[] {
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const firstDate = parseISO(days[0]!.date);
  const lastDate = parseISO(days[days.length - 1]!.date);
  const months: CalendarMonth[] = [];

  let cursor = startOfMonth(firstDate);

  while (!isAfter(cursor, lastDate)) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const cells: CalendarCell[] = [];

    let dayCursor = gridStart;

    while (!isAfter(dayCursor, gridEnd)) {
      const dateKey = format(dayCursor, "yyyy-MM-dd");
      cells.push({
        dateKey,
        dateLabel: format(dayCursor, "d"),
        isCurrentMonth: dayCursor.getMonth() === monthStart.getMonth(),
        day: dayMap.get(dateKey),
      });
      dayCursor = addDays(dayCursor, 1);
    }

    months.push({
      id: format(monthStart, "yyyy-MM"),
      label: format(monthStart, "MMMM yyyy"),
      cells,
    });

    cursor = addMonths(cursor, 1);
  }

  return months;
}

function formatRoomSummary(day: DailyAvailability): string {
  const occupiedCount = day.rooms.filter((room) => room.status === "occupied").length;

  if (occupiedCount === 0) {
    return "All rooms free";
  }

  if (occupiedCount === day.rooms.length) {
    return "Whole house occupied";
  }

  return `${occupiedCount} room occupied`;
}

export function Calendar({
  days,
  houseName,
  requestEnabled,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? "");
  const months = buildMonths(days);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[0];
  const upcomingBusyDays = days
    .filter((day) => day.status !== "available")
    .slice(0, 6);

  if (!selectedDay) {
    return null;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-[1.75rem] border border-[color:var(--card-border)] bg-[color:var(--card)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--card-border)] px-5 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              {houseName}
            </h1>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              Future availability
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--card-border)] bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                requestEnabled ? "bg-emerald-500" : "bg-stone-400"
              }`}
            />
            {requestEnabled ? "Requests enabled" : "View only"}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-2 px-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="pb-1 text-center">
                {label}
              </div>
            ))}
          </div>

          <div className="h-[78vh] overflow-y-auto pr-1">
            <div className="space-y-6">
              {months.map((month) => (
                <section key={month.id}>
                  <div className="sticky top-0 z-10 mb-3 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--background)]/95 px-4 py-2 backdrop-blur">
                    <h2 className="text-sm font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
                      {month.label}
                    </h2>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {month.cells.map((cell) => {
                      if (!cell.day) {
                        return (
                          <div
                            key={cell.dateKey}
                            className="aspect-[0.95] rounded-2xl bg-transparent"
                          />
                        );
                      }

                      const isSelected = selectedDay.date === cell.day.date;

                      return (
                        <button
                          key={cell.dateKey}
                          type="button"
                          onClick={() => setSelectedDate(cell.day!.date)}
                          className={`aspect-[0.95] rounded-2xl p-2 text-left transition ${
                            statusClasses[cell.day.status]
                          } ${isSelected ? "ring-2 ring-[color:var(--foreground)]" : ""}`}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  cell.isCurrentMonth ? "" : "opacity-45"
                                }`}
                              >
                                {cell.dateLabel}
                              </span>
                              <span
                                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                  statusDotClasses[cell.day.status]
                                }`}
                              />
                            </div>

                            <div className="space-y-1">
                              <p className="truncate text-[11px] font-medium capitalize">
                                {cell.day.status}
                              </p>
                              <div className="flex gap-1">
                                {cell.day.rooms.map((room) => (
                                  <span
                                    key={room.id}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      room.status === "occupied"
                                        ? "bg-[color:var(--foreground)]/70"
                                        : "bg-white/75"
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
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
        <section className="rounded-[1.75rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-5 shadow-[var(--shadow)]">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Selected date
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {format(parseISO(selectedDay.date), "MMM d")}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {format(parseISO(selectedDay.date), "EEEE")}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--card-border)] bg-white/80 px-3 py-1.5 text-sm font-medium capitalize">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                statusDotClasses[selectedDay.status]
              }`}
            />
            {selectedDay.status}
          </div>

          <p className="mt-4 text-sm text-[var(--muted)]">
            {formatRoomSummary(selectedDay)}
          </p>

          <div className="mt-5 space-y-2">
            {selectedDay.rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-white/75 px-3 py-2 text-sm"
              >
                <span>{room.name}</span>
                <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--muted)]">
                  {room.status}
                </span>
              </div>
            ))}
          </div>

          {selectedDay.presence.length > 0 ? (
            <div className="mt-5 space-y-2 border-t border-[color:var(--card-border)] pt-4">
              {selectedDay.presence.map((presence) => (
                <div
                  key={presence.personId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{presence.name}</span>
                  <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--muted)]">
                    {presence.state}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-5 shadow-[var(--shadow)]">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Legend
          </p>
          <div className="mt-4 grid gap-2">
            {(
              [
                ["available", "All rooms free"],
                ["partial", "At least one room occupied"],
                ["unavailable", "Whole house occupied"],
                ["unknown", "Needs interpretation"],
              ] as const
            ).map(([status, label]) => (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span
                  className={`h-3 w-3 rounded-full ${statusDotClasses[status]}`}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-5 shadow-[var(--shadow)]">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Upcoming busy days
          </p>
          <div className="mt-4 space-y-2">
            {upcomingBusyDays.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className="flex w-full items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-white/75 px-3 py-2 text-left text-sm"
              >
                <span>{format(parseISO(day.date), "MMM d")}</span>
                <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--muted)]">
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
