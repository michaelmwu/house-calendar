import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { getCurrentAdminSession } from "@/lib/server/auth";
import { refreshCalendarData } from "@/lib/server/calendar-data";

function redirectToAdmin(
  request: Request,
  siteId: string,
  params?: Record<string, string>,
) {
  const url = new URL(`/admin/${siteId}`, request.url);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const appConfig = await loadAppConfig();

  if (!getSiteConfig(appConfig, siteId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const session = await getCurrentAdminSession();

  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }

  try {
    const result = await refreshCalendarData(siteId);
    const message =
      result.source === "ics"
        ? `Imported ${result.importedEventCount} all-day events from ICS.`
        : "No all-day ICS events were imported. Sample data is still active.";

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
