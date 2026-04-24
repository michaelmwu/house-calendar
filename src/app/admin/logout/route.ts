import { NextResponse } from "next/server";
import { clearAdminSessionCookie, revokeAdminSession } from "@/lib/server/auth";

export async function POST(request: Request) {
  const sessionToken = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)house_calendar_admin_session=([^;]+)/)?.[1];

  await revokeAdminSession(sessionToken);

  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  clearAdminSessionCookie(response);
  return response;
}
