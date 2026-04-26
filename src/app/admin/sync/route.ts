import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/server/auth";
import { refreshCalendarData } from "@/lib/server/calendar-data";

function redirectToAdmin(request: Request, params?: Record<string, string>) {
  const url = new URL("/admin", request.url);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const session = await getCurrentAdminSession();

  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }

  try {
    const result = await refreshCalendarData();
    const message =
      result.source === "ics"
        ? `Imported ${result.importedEventCount} all-day events from ICS.`
        : "No all-day ICS events were imported. Sample data is still active.";

    return redirectToAdmin(request, {
      message,
      sync: "ok",
    });
  } catch (error) {
    console.error("Manual ICS sync failed.", error);

    return redirectToAdmin(request, {
      error: "Manual ICS sync failed. Check the server logs.",
      sync: "error",
    });
  }
}
