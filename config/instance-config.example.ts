import type { InstanceConfig } from "../src/lib/config/instance-config";

const instanceConfig: InstanceConfig = {
  site: {
    id: "washington",
    houseName: "Washington House",
    ownerName: "Michael",
    timezone: "America/Los_Angeles",
    branding: {
      title: "Michael's Washington House",
      description: "Private house occupancy, public availability, and trusted stay requests.",
      themeColor: "#2d8f6f",
    },
  },
  calendars: [
    {
      id: "primary",
      label: "Primary availability calendar",
      provider: "ics",
      envVar: "ICS_URL_1",
    },
  ],
  rooms: [
    {
      id: "my-room",
      name: "My room",
      aliases: ["my room", "michael room"],
    },
    {
      id: "guest-room",
      name: "Guest room",
      aliases: ["guest room", "spare room"],
    },
  ],
  people: [
    {
      id: "michael",
      name: "Michael",
      aliases: ["mike"],
      visibility: "visible",
    },
    {
      id: "ninad",
      name: "Ninad",
      aliases: [],
      visibility: "masked",
    },
  ],
  visibleHousemateIds: ["michael"],
  sharePolicies: [
    {
      name: "view-only",
      scope: "view",
      canRequest: false,
    },
    {
      name: "trusted-friends",
      scope: "request",
      canRequest: true,
    },
  ],
  inference: {
    defaultPresence: "unknown",
    carryForwardDays: 0,
  },
  rules: [
    {
      match: "stays \\(whole house\\)",
      type: "stay.whole_house",
      visibility: "private",
    },
    {
      match: "stays \\(my room\\)",
      type: "stay.room",
      roomId: "my-room",
      visibility: "private",
    },
    {
      match: "stays \\(guest room\\)",
      type: "stay.room",
      roomId: "guest-room",
      visibility: "private",
    },
    {
      match: "^michael out of taiwan(?: \\((.+)\\))?$",
      type: "presence.out",
      actorId: "michael",
      visibility: "public",
    },
    {
      match: "^michael \\((.+)\\)$",
      type: "presence.in",
      actorId: "michael",
      visibility: "public",
    },
  ],
};

export default instanceConfig;
