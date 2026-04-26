import { NextResponse } from "next/server";
import { loadAppConfig } from "@/lib/server/app-config";
import { serverEnv } from "@/lib/server/env";
import {
  isViewerAccessPasswordEnabled,
  setViewerAccessCookie,
  verifyViewerPassword,
} from "@/lib/server/viewer-access";

export async function POST(request: Request) {
  const config = await loadAppConfig();
  const redirectUrl = new URL("/", request.url);

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
