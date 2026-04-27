import type { NextRequest } from "next/server";

export function buildRequestUrl(request: NextRequest, path: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url;
}
