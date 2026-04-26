import { describe, expect, test } from "bun:test";
import { appConfigSchema } from "./config";

const baseConfig = {
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

  test("rejects unknown default room ids for people", () => {
    expect(() =>
      appConfigSchema.parse({
        ...baseConfig,
        people: [
          {
            aliases: [],
            defaultRoomId: "missing-room",
            id: "michael",
            name: "Michael",
            visibility: "visible",
          },
        ],
      }),
    ).toThrow(/defaultRoomId/);
  });
});
