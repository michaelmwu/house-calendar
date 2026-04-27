import { type NextRequest, NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { serverEnv } from "@/lib/server/env";
import { buildRequestUrl } from "@/lib/server/request-url";
import {
  isViewerAccessPasswordEnabled,
  setViewerAccessCookie,
  verifyViewerPassword,
} from "@/lib/server/viewer-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const config = await loadAppConfig();
  const redirectUrl = buildRequestUrl(request, `/${siteId}`);

  if (!getSiteConfig(config, siteId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isViewerAccessPasswordEnabled(config)) {
    return NextResponse.redirect(redirectUrl, 303);
  }

  if (!serverEnv.VIEWER_PASSWORD) {
    redirectUrl.searchParams.set("viewerAccessError", "misconfigured");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const formData = await request.formData();
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!verifyViewerPassword(password)) {
    redirectUrl.searchParams.set("viewerAccessError", "invalid");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const response = NextResponse.redirect(redirectUrl, 303);
  setViewerAccessCookie(response);
  return response;
}
