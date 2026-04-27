import { NextResponse } from "next/server";
import { getDefaultSiteId } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { bootstrapAdmin, setAdminSessionCookie } from "@/lib/server/auth";
import { buildRequestUrl } from "@/lib/server/request-url";

function redirectWithError(request: Request, error: string) {
  const url = buildRequestUrl(request, "/admin/setup");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const appConfig = await loadAppConfig();
  const formData = await request.formData();
  const result = await bootstrapAdmin({
    bootstrapCode: String(formData.get("bootstrapCode") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return redirectWithError(request, result.error);
  }

  const response = NextResponse.redirect(
    buildRequestUrl(request, `/admin/${getDefaultSiteId(appConfig)}`),
    303,
  );
  setAdminSessionCookie(response, result.session);
  return response;
}
