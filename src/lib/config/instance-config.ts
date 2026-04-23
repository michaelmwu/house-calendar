import { z } from "zod";
import {
  houseConfigSchema,
  inferenceSchema,
  parserRuleSchema,
  roomSchema,
  sharePolicySchema,
} from "@/lib/house/types";

const instancePersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  visibility: z.enum(["visible", "masked"]),
});

const instanceSiteSchema = z.object({
  id: z.string(),
  houseName: z.string(),
  ownerName: z.string().optional(),
  timezone: z.string(),
  branding: z.object({
    title: z.string(),
    description: z.string().optional(),
    themeColor: z.string().optional(),
    logoUrl: z.string().optional(),
  }),
});

const instanceCalendarSchema = z.object({
  id: z.string(),
  label: z.string(),
  provider: z.enum(["ics"]),
  envVar: z.string(),
});

export const instanceConfigSchema = z.object({
  site: instanceSiteSchema,
  calendars: z.array(instanceCalendarSchema).min(1),
  rooms: z.array(roomSchema),
  people: z.array(instancePersonSchema),
  visibleHousemateIds: z.array(z.string()).default([]),
  sharePolicies: z.array(sharePolicySchema),
  inference: inferenceSchema,
  rules: z.array(parserRuleSchema),
});

export type InstanceConfig = z.infer<typeof instanceConfigSchema>;

export function instanceConfigToHouseConfig(configInput: InstanceConfig) {
  const config = instanceConfigSchema.parse(configInput);

  return houseConfigSchema.parse({
    id: config.site.id,
    name: config.site.houseName,
    timezone: config.site.timezone,
    rooms: config.rooms,
    people: config.people.map((person) => ({
      id: person.id,
      name: person.name,
      aliases: person.aliases,
      publicVisibility: person.visibility,
    })),
    visibleHousemateIds: config.visibleHousemateIds,
    sharePolicies: config.sharePolicies,
    inference: config.inference,
    rules: config.rules,
  });
}
