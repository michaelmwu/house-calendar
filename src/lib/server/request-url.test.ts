import { describe, expect, test } from "bun:test";
import { buildRequestUrl, getRequestOrigin } from "./request-url";

describe("request URL helpers", () => {
  test("prefers forwarded host and proto for public redirects", () => {
    const request = new Request("http://localhost:3000/tokyo/viewer-access", {
      headers: {
        "x-forwarded-host": "calendar.example.com",
        "x-forwarded-proto": "https",
      },
      method: "POST",
    });

    expect(getRequestOrigin(request)).toBe("https://calendar.example.com");
    expect(buildRequestUrl(request, "/tokyo").toString()).toBe(
      "https://calendar.example.com/tokyo",
    );
  });

  test("falls back to the request origin when forwarded headers are absent", () => {
    const request = new Request("https://house.example.com/admin/login", {
      method: "POST",
    });

    expect(getRequestOrigin(request)).toBe("https://house.example.com");
    expect(buildRequestUrl(request, "/admin/tokyo").toString()).toBe(
      "https://house.example.com/admin/tokyo",
    );
  });
});
