import { notFound, redirect } from "next/navigation";
import { SiteTabs } from "@/components/site-tabs";
import { Button } from "@/components/ui/button";
import {
  configToHouseConfig,
  getSiteConfig,
  type SiteConfig,
} from "@/lib/config/config";
import {
  currentDateInTimeZone,
  formatDateTimeRangeInTimeZone,
} from "@/lib/house/date";
import type {
  HouseConfig,
  ParsedCalendarEvent,
  RawCalendarEvent,
} from "@/lib/house/types";
import { loadAppConfig } from "@/lib/server/app-config";
import { getAdminAuthState } from "@/lib/server/auth";
import { loadCalendarData } from "@/lib/server/calendar-data";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  sync?: string;
}>;

type Params = Promise<{
  siteId: string;
}>;

export const dynamic = "force-dynamic";

function Notice({
  kind,
  message,
}: {
  kind: "error" | "info";
  message?: string;
}) {
  if (!message) {
    return null;
  }

  const classes =
    kind === "error"
      ? "border-[color:var(--app-danger)]/25 bg-[color:var(--app-danger)]/8 text-[color:var(--app-danger)]"
      : "border-[color:var(--app-accent)]/20 bg-[color:var(--app-accent)]/8 text-[var(--app-accent-strong)]";

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm ${classes}`}>
      {message}
    </p>
  );
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatEventRange(
  event: RawCalendarEvent,
  timeZone: string,
): string {
  if (event.allDay) {
    return `${event.startDate} to ${event.endDate}`;
  }

  return formatDateTimeRangeInTimeZone(
    event.startDate,
    event.endDate,
    timeZone,
  );
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`;
}

export function describeInterpretation(
  parsed: ParsedCalendarEvent,
  houseConfig: HouseConfig,
  raw: RawCalendarEvent,
): string {
  if (!raw.allDay) {
    return raw.visibility === "public"
      ? "Timed day event shown on its start date without affecting availability."
      : "Timed day event hidden from viewers because the source event is private or confidential.";
  }

  if (parsed.type === "unknown") {
    return "No deterministic rule matched this title.";
  }

  if (parsed.type === "stay") {
    const guestPrefix = parsed.guestName ? `${parsed.guestName}: ` : "";
    const stayPrefix = parsed.stayStatus === "tentative" ? "Tentative " : "";

    if (parsed.scope === "house") {
      return `${guestPrefix}${stayPrefix}whole-house stay`;
    }

    if (parsed.scope === "room" && parsed.roomId) {
      const room = houseConfig.rooms.find(
        (candidate) => candidate.id === parsed.roomId,
      );

      return `${guestPrefix}${stayPrefix}room stay: ${room?.name ?? parsed.roomId}`;
    }

    return `${guestPrefix}${stayPrefix}stay with unknown scope`;
  }

  const person = parsed.personId
    ? houseConfig.people.find((candidate) => candidate.id === parsed.personId)
    : null;
  const personLabel = person?.name ?? parsed.personId ?? "Unknown person";
  const stateLabel =
    parsed.presenceState === "in"
      ? parsed.presenceStatus === "tentative"
        ? "Tentative in"
        : "In"
      : parsed.presenceState === "out"
        ? "Out"
        : "Unknown";
  const occupancySuffix =
    parsed.presenceState === "in" && parsed.occupiesDefaultRoom === false
      ? " (not staying)"
      : "";

  if (parsed.location) {
    return `${personLabel}: ${stateLabel} (${parsed.location})${occupancySuffix}`;
  }

  return `${personLabel}: ${stateLabel}${occupancySuffix}`;
}

export function buildParsedFieldRows(
  parsed: ParsedCalendarEvent,
  houseConfig: HouseConfig,
  raw: RawCalendarEvent,
): Array<{ label: string; value: string }> {
  if (!raw.allDay) {
    return [
      {
        label: "Viewer calendar",
        value:
          raw.visibility === "public"
            ? "Shown on the viewer calendar"
            : "Hidden from the viewer calendar (private/confidential)",
      },
      {
        label: "Visibility",
        value: raw.visibility,
      },
    ];
  }

  if (parsed.type === "stay") {
    const room = parsed.roomId
      ? houseConfig.rooms.find((candidate) => candidate.id === parsed.roomId)
      : null;
    const housemate = parsed.personId
      ? houseConfig.people.find((candidate) => candidate.id === parsed.personId)
      : null;

    const rows: Array<{ label: string; value: string }> = [];

    if (parsed.guestName) {
      rows.push({ label: "Guest name", value: parsed.guestName });
    }

    if (housemate) {
      rows.push({ label: "Known housemate", value: housemate.name });
    }

    if (parsed.scope === "house") {
      rows.push({ label: "Scope", value: "Whole house" });
    }

    rows.push({
      label: "Stay status",
      value: parsed.stayStatus === "tentative" ? "Tentative" : "Confirmed",
    });

    if (parsed.scope === "room" && room) {
      rows.push({ label: "Room", value: room.name });
    } else if (parsed.scope === "room" && parsed.roomId) {
      rows.push({ label: "Room", value: parsed.roomId });
    }

    if (parsed.scope === "unknown") {
      rows.push({ label: "Scope", value: "Unknown" });
    }

    return rows;
  }

  if (parsed.type === "presence") {
    const housemate = parsed.personId
      ? houseConfig.people.find((candidate) => candidate.id === parsed.personId)
      : null;

    const rows: Array<{ label: string; value: string }> = [];

    if (housemate) {
      rows.push({ label: "Known housemate", value: housemate.name });
    } else if (parsed.personId) {
      rows.push({ label: "Known housemate", value: parsed.personId });
    }

    if (parsed.presenceState) {
      rows.push({ label: "Presence state", value: parsed.presenceState });
    }

    if (parsed.presenceState === "in") {
      rows.push({
        label: "Presence status",
        value:
          parsed.presenceStatus === "tentative" ? "Tentative" : "Confirmed",
      });
    }

    if (parsed.presenceState === "in") {
      rows.push({
        label: "Occupies default room",
        value: parsed.occupiesDefaultRoom === false ? "No" : "Yes",
      });
    }

    if (parsed.location) {
      rows.push({ label: "Location", value: parsed.location });
    }

    return rows;
  }

  return [{ label: "Match", value: "No structured fields captured" }];
}

function buildAdminSiteTabs(
  appConfig: Awaited<ReturnType<typeof loadAppConfig>>,
): Array<{ href: string; id: string; label: string }> {
  return appConfig.sites.map((siteConfig: SiteConfig) => ({
    href: `/admin/${siteConfig.site.id}`,
    id: siteConfig.site.id,
    label: siteConfig.site.houseName,
  }));
}

export default async function AdminSitePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ siteId }, { error, message }, authState, appConfig] =
    await Promise.all([
      params,
      searchParams,
      getAdminAuthState(),
      loadAppConfig(),
    ]);
  const siteConfig = getSiteConfig(appConfig, siteId);

  if (!siteConfig) {
    notFound();
  }

  if (!authState.initialized) {
    redirect("/admin/setup");
  }

  if (!authState.session) {
    redirect("/admin/login");
  }

  const houseConfig = configToHouseConfig(siteConfig);
  const calendarData = await loadCalendarData({
    appConfig,
    houseConfig,
    siteConfig,
  });
  const today = currentDateInTimeZone(houseConfig.timezone);
  const interpretationRows = calendarData.eventInterpretations
    .filter((row) => row.raw.endDate >= today)
    .sort((left, right) => {
      const startComparison = left.raw.startDate.localeCompare(
        right.raw.startDate,
      );

      if (startComparison !== 0) {
        return startComparison;
      }

      const endComparison = left.raw.endDate.localeCompare(right.raw.endDate);

      if (endComparison !== 0) {
        return endComparison;
      }

      return left.raw.title.localeCompare(right.raw.title);
    });
  const unknownInterpretationCount = interpretationRows.filter(
    (row) => row.raw.allDay && row.parsed.type === "unknown",
  ).length;
  const siteTabs = buildAdminSiteTabs(appConfig);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SiteTabs currentSiteId={siteConfig.site.id} sites={siteTabs} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)] sm:p-8">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
              Admin
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              {siteConfig.site.houseName} control room
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--app-muted)]">
              Password auth is global for this deployment, while sync, parser
              diagnostics, and availability remain scoped to the selected house.
            </p>

            <div className="mt-6 space-y-4">
              <Notice kind="error" message={error} />
              <Notice kind="info" message={message} />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5">
                <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Signed in as
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {authState.session.email}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5">
                <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Selected house
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {siteConfig.site.houseName}
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Site ID: {siteConfig.site.id}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5">
                <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Last ICS sync
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {formatTimestamp(calendarData.fetchedAt)}
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {calendarData.importedEventCount} imported all-day events
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5">
                <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Cache policy
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {calendarData.cacheTtlMinutes} minute TTL
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Next refresh after{" "}
                  {formatTimestamp(calendarData.nextRefreshAt)}
                </p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)]">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
                Next up
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--app-muted)]">
                <li>
                  Current source:{" "}
                  {calendarData.source === "ics"
                    ? "Live ICS import"
                    : "Sample fallback"}
                </li>
                <li>Warnings: {calendarData.warnings.length}</li>
                <li>Unknown parses: {unknownInterpretationCount}</li>
                <li>Share-link management</li>
                <li>Request triage and approval</li>
              </ul>

              <form
                action={`/admin/${siteConfig.site.id}/sync`}
                method="post"
                className="mt-6"
              >
                <Button
                  type="submit"
                  className="h-auto rounded-full bg-[var(--app-foreground)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--app-accent-strong)]"
                >
                  Sync ICS now
                </Button>
              </form>

              <form action="/admin/logout" method="post" className="mt-6">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-auto rounded-full border-[color:var(--app-card-border)] bg-white/75 px-4 py-2 text-sm font-semibold"
                >
                  Sign out
                </Button>
              </form>
            </section>
          </aside>
        </div>

        <section className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)] sm:p-8">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Imported events
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
            ICS parser diagnostics
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--app-muted)]">
            This list shows the raw imported event titles and how the parser is
            interpreting them right now. Timed events can also appear here when
            they are shown as same-day viewer notes. Use this list to validate
            regex rules and catch all-day titles that are still falling through
            to unknown.
          </p>

          <div className="mt-8 space-y-3">
            {interpretationRows.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--app-card-border)] bg-white/40 px-5 py-6 text-sm text-[var(--app-muted)]">
                No imported events are available yet.
              </div>
            ) : (
              <div className="max-h-[48rem] space-y-3 overflow-y-auto pr-1">
                {interpretationRows.map(({ parsed, raw }) => {
                  const parsedFieldRows = buildParsedFieldRows(
                    parsed,
                    houseConfig,
                    raw,
                  );

                  return (
                    <article
                      key={raw.id}
                      className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold break-words">
                            {raw.title}
                          </p>
                          <p className="mt-1 text-sm text-[var(--app-muted)]">
                            {formatEventRange(raw, houseConfig.timezone)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                            {raw.allDay ? "all-day" : "timed"}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                            {parsed.type}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                            {parsed.scope}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                            {parsed.visibility}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                            {formatConfidence(parsed.confidence)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div>
                          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.24em] text-[var(--app-muted)]">
                            Interpretation
                          </p>
                          <p className="mt-2 text-sm leading-6">
                            {describeInterpretation(parsed, houseConfig, raw)}
                          </p>
                          <p className="mt-2 text-sm text-[var(--app-muted)]">
                            Normalized title: {parsed.normalizedTitle}
                          </p>
                        </div>

                        <div>
                          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.24em] text-[var(--app-muted)]">
                            Parsed fields
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-[var(--app-muted)]">
                            {parsedFieldRows.map((row) => (
                              <p key={row.label}>
                                {row.label}: {row.value}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
