import { type NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { loginAdmin, setAdminSessionCookie } from "@/lib/server/auth";
import { buildRequestUrl } from "@/lib/server/request-url";

function redirectWithParams(
  request: NextRequest,
  params: Record<string, string>,
) {
  const url = buildRequestUrl(request, "/admin/login");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const appConfig = await loadAppConfig();
  const formData = await request.formData();
  const result = await loginAdmin({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return redirectWithParams(request, { error: result.error });
  }

  const response = NextResponse.redirect(
    buildRequestUrl(request, `/admin/${getDefaultSiteId(appConfig)}`),
    303,
  );
  setAdminSessionCookie(response, result.session);
  return response;
}
