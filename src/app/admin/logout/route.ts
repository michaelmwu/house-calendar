import { type NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, revokeAdminSession } from "@/lib/server/auth";
import { buildRequestUrl } from "@/lib/server/request-url";

export async function POST(request: NextRequest) {
  const sessionToken = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)house_calendar_admin_session=([^;]+)/)?.[1];

  await revokeAdminSession(sessionToken);

  const response = NextResponse.redirect(
    buildRequestUrl(request, "/admin/login"),
    303,
  );
  clearAdminSessionCookie(response);
  return response;
}
