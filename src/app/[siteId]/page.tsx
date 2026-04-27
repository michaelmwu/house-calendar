import { notFound } from "next/navigation";
import { Calendar } from "@/components/calendar";
import { SiteTabs } from "@/components/site-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  configToHouseConfig,
  getSiteConfig,
  type SiteConfig,
} from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { loadCalendarData } from "@/lib/server/calendar-data";
import { getViewerAccessState } from "@/lib/server/viewer-access";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  viewerAccessError?: string;
}>;

type Params = Promise<{
  siteId: string;
}>;

function ViewerAccessNotice({
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

function getViewerAccessErrorMessage(
  error: string | undefined,
  configured: boolean,
): string | undefined {
  if (!configured) {
    return "Viewer password protection is enabled, but VIEWER_PASSWORD is not configured.";
  }

  if (error === "invalid") {
    return "The password is incorrect.";
  }

  return undefined;
}

function buildViewerSiteTabs(
  appConfig: Awaited<ReturnType<typeof loadAppConfig>>,
): Array<{ href: string; id: string; label: string }> {
  return appConfig.sites.map((siteConfig: SiteConfig) => ({
    href: `/${siteConfig.site.id}`,
    id: siteConfig.site.id,
    label: siteConfig.site.houseName,
  }));
}

export default async function SiteHomePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ siteId }, { viewerAccessError }, appConfig] = await Promise.all([
    params,
    searchParams,
    loadAppConfig(),
  ]);
  const siteConfig = getSiteConfig(appConfig, siteId);

  if (!siteConfig) {
    notFound();
  }

  const viewerAccess = await getViewerAccessState(appConfig);

  if (!viewerAccess.unlocked) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl space-y-4">
          <Card className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)] ring-0 sm:p-8">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
              Private viewer access
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              Enter the house password
            </h1>

            <div className="mt-6 space-y-4">
              <ViewerAccessNotice
                kind="error"
                message={getViewerAccessErrorMessage(
                  viewerAccessError,
                  viewerAccess.configured,
                )}
              />
              <ViewerAccessNotice
                kind="info"
                message={
                  viewerAccess.configured
                    ? "Enter the shared viewer password to unlock the calendar."
                    : undefined
                }
              />
            </div>

            {viewerAccess.configured ? (
              <form
                action={`/${siteConfig.site.id}/viewer-access`}
                method="post"
                className="mt-8 space-y-5"
              >
                <div>
                  <Label htmlFor="password" className="mb-2">
                    Viewer password
                  </Label>
                  <Input
                    autoComplete="current-password"
                    id="password"
                    required
                    name="password"
                    type="password"
                    className="h-auto rounded-2xl border-[color:var(--app-card-border)] bg-white/90 px-4 py-3 text-base focus-visible:border-[color:var(--app-accent)]"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-auto rounded-full bg-[var(--app-foreground)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--app-accent-strong)]"
                >
                  Unlock calendar
                </Button>
              </form>
            ) : null}
          </Card>
        </div>
      </main>
    );
  }

  const houseConfig = configToHouseConfig(siteConfig);
  const siteTabs = buildViewerSiteTabs(appConfig);
  const { availability, source, warnings } = await loadCalendarData({
    appConfig,
    houseConfig,
    siteConfig,
  });
  const timedNotes = siteConfig.calendarDisplay.timedNotes;
  const calendarDays = timedNotes.enabled
    ? availability
    : availability.map((day) => ({
        ...day,
        events: [],
      }));
  const requestPolicy = houseConfig.sharePolicies.find(
    (policy) => policy.canRequest,
  );

  return (
    <main className="min-h-screen px-4 py-5 text-[var(--app-foreground)] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[96rem] space-y-4">
        <SiteTabs currentSiteId={siteConfig.site.id} sites={siteTabs} />

        {warnings.length > 0 ? (
          <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">
              {source === "ics"
                ? "ICS imported with warnings"
                : "Showing sample data"}
            </p>
            <p className="mt-1">{warnings.join(" ")}</p>
          </section>
        ) : null}

        <Calendar
          days={calendarDays}
          houseName={houseConfig.name}
          requestEnabled={Boolean(requestPolicy?.canRequest)}
          timedNotes={timedNotes}
          timezone={houseConfig.timezone}
        />
      </div>
    </main>
  );
}
