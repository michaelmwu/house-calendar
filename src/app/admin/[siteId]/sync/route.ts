import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { getCurrentAdminSession } from "@/lib/server/auth";
import { refreshCalendarData } from "@/lib/server/calendar-data";
import { buildRequestUrl } from "@/lib/server/request-url";

function redirectToAdmin(
  request: NextRequest,
  siteId: string,
  params?: Record<string, string>,
) {
  const url = buildRequestUrl(request, `/admin/${siteId}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const appConfig = await loadAppConfig();

  if (!getSiteConfig(appConfig, siteId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const session = await getCurrentAdminSession();

  if (!session) {
    return NextResponse.redirect(buildRequestUrl(request, "/admin/login"), 303);
  }

  try {
    const result = await refreshCalendarData(siteId);
    const message =
      result.source === "sample"
        ? "No all-day ICS events were imported. Sample data is still active in development."
        : result.importedEventCount > 0
          ? `Imported ${result.importedEventCount} all-day events from ICS.`
          : "No all-day ICS events were imported.";

    return redirectToAdmin(request, siteId, {
      message,
      sync: "ok",
    });
  } catch (error) {
    console.error("Manual ICS sync failed.", error);

    return redirectToAdmin(request, siteId, {
      error: "Manual ICS sync failed. Check the server logs.",
      sync: "error",
    });
  }
}
