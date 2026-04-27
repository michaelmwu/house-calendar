function getFirstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = getFirstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = getFirstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const host = forwardedHost ?? getFirstHeaderValue(request.headers.get("host"));
  const protocol = forwardedProto ?? url.protocol.replace(/:$/, "");

  if (!host) {
    return url.origin;
  }

  return `${protocol}://${host}`;
}

export function buildRequestUrl(request: Request, path: string): URL {
  return new URL(path, getRequestOrigin(request));
}
