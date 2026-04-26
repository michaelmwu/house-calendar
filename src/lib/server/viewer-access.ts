import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { AppConfig } from "@/lib/config/config";
import { serverEnv } from "./env";

const VIEWER_ACCESS_COOKIE = "house_calendar_viewer_access";
const VIEWER_ACCESS_DURATION_DAYS = 30;
const VIEWER_ACCESS_MARKER = "viewer-access-unlocked";

export type ViewerAccessState = {
  configured: boolean;
  mode: AppConfig["viewerAccess"]["mode"];
  unlocked: boolean;
};

function secureStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isViewerAccessPasswordEnabled(config: AppConfig): boolean {
  return config.viewerAccess.mode === "password";
}

export function verifyViewerPassword(password: string): boolean {
  if (!serverEnv.VIEWER_PASSWORD) {
    return false;
  }

  return secureStringEqual(password, serverEnv.VIEWER_PASSWORD);
}

function buildViewerAccessToken(password: string): string {
  return createHmac("sha256", password)
    .update(VIEWER_ACCESS_MARKER)
    .digest("base64url");
}

export async function getViewerAccessState(
  config: AppConfig,
): Promise<ViewerAccessState> {
  if (!isViewerAccessPasswordEnabled(config)) {
    return {
      configured: true,
      mode: config.viewerAccess.mode,
      unlocked: true,
    };
  }

  if (!serverEnv.VIEWER_PASSWORD) {
    return {
      configured: false,
      mode: config.viewerAccess.mode,
      unlocked: false,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(VIEWER_ACCESS_COOKIE)?.value;

  return {
    configured: true,
    mode: config.viewerAccess.mode,
    unlocked:
      token !== undefined &&
      secureStringEqual(
        token,
        buildViewerAccessToken(serverEnv.VIEWER_PASSWORD),
      ),
  };
}

export function setViewerAccessCookie(response: NextResponse): void {
  if (!serverEnv.VIEWER_PASSWORD) {
    throw new Error("VIEWER_PASSWORD is not configured.");
  }

  response.cookies.set({
    expires: new Date(
      Date.now() + VIEWER_ACCESS_DURATION_DAYS * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    name: VIEWER_ACCESS_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: buildViewerAccessToken(serverEnv.VIEWER_PASSWORD),
  });
}
