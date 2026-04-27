import { describe, expect, test } from "bun:test";
import { appConfigSchema, getDefaultSiteId, getSiteConfig } from "./config";

const baseSiteConfig = {
  calendars: [
    {
      envVar: "ICS_URL_1",
      id: "primary",
      label: "Primary calendar",
      provider: "ics",
    },
  ],
  inference: {
    carryForwardDays: 0,
    defaultPresence: "unknown",
  },
  people: [
    {
      aliases: [],
      defaultRoomId: "guest-room",
      id: "michael",
      name: "Michael",
      visibility: "visible",
    },
  ],
  rooms: [
    {
      aliases: ["guest room"],
      id: "guest-room",
      name: "Guest room",
    },
  ],
  rules: [],
  sharePolicies: [
    {
      canRequest: false,
      name: "view-only",
      scope: "view",
    },
  ],
  site: {
    branding: {
      title: "Tokyo House",
    },
    houseName: "Tokyo House",
    id: "tokyo",
    timezone: "Asia/Tokyo",
  },
  visibleHousemateIds: ["michael"],
};

const baseConfig = {
  sites: [baseSiteConfig],
};

describe("appConfigSchema", () => {
  test("defaults viewer access to public", () => {
    const parsed = appConfigSchema.parse(baseConfig);

    expect(parsed.viewerAccess.mode).toBe("public");
  });

  test("accepts password-protected viewer access", () => {
    const parsed = appConfigSchema.parse({
      ...baseConfig,
      viewerAccess: {
        mode: "password",
      },
    });

    expect(parsed.viewerAccess.mode).toBe("password");
  });

  test("accepts multiple sites and resolves the default site", () => {
    const parsed = appConfigSchema.parse({
      ...baseConfig,
      defaultSiteId: "taiwan",
      sites: [
        baseSiteConfig,
        {
          ...baseSiteConfig,
          site: {
            ...baseSiteConfig.site,
            houseName: "Taiwan House",
            id: "taiwan",
            timezone: "Asia/Taipei",
          },
        },
      ],
    });

    expect(getDefaultSiteId(parsed)).toBe("taiwan");
    expect(getSiteConfig(parsed, "taiwan")?.site.houseName).toBe(
      "Taiwan House",
    );
  });

  test("rejects duplicate site ids", () => {
    expect(() =>
      appConfigSchema.parse({
        ...baseConfig,
        sites: [
          baseSiteConfig,
          {
            ...baseSiteConfig,
          },
        ],
      }),
    ).toThrow(/Duplicate site id/);
  });

  test("rejects unknown defaultSiteId", () => {
    expect(() =>
      appConfigSchema.parse({
        ...baseConfig,
        defaultSiteId: "missing-site",
      }),
    ).toThrow(/Unknown defaultSiteId/);
  });

  test("rejects blank defaultSiteId", () => {
    expect(() =>
      appConfigSchema.parse({
        ...baseConfig,
        defaultSiteId: "",
      }),
    ).toThrow();
  });

  test("rejects calendar entries with both envVar and url", () => {
    expect(() =>
      appConfigSchema.parse({
        ...baseConfig,
        sites: [
          {
            ...baseSiteConfig,
            calendars: [
              {
                envVar: "ICS_URL_1",
                id: "primary",
                label: "Primary calendar",
                provider: "ics",
                url: "https://example.com/calendar.ics",
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  test("rejects unknown default room ids for people", () => {
    expect(() =>
      appConfigSchema.parse({
        ...baseConfig,
        sites: [
          {
            ...baseSiteConfig,
            people: [
              {
                aliases: [],
                defaultRoomId: "missing-room",
                id: "michael",
                name: "Michael",
                visibility: "visible",
              },
            ],
          },
        ],
      }),
    ).toThrow(/defaultRoomId/);
  });
});
