import { z } from "zod";

export const visibilitySchema = z.enum(["public", "private"]);
export const personVisibilitySchema = z.enum(["visible", "masked"]);
export const shareScopeSchema = z.enum(["view", "request"]);
export const parserRuleTypeSchema = z.enum([
  "stay.whole_house",
  "stay.room",
  "presence.in",
  "presence.out",
]);

export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
});

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  publicVisibility: personVisibilitySchema,
});

export const parserRuleSchema = z.object({
  match: z.string(),
  type: parserRuleTypeSchema,
  roomId: z.string().optional(),
  actorId: z.string().optional(),
  visibility: visibilitySchema,
});

export const sharePolicySchema = z.object({
  name: z.string(),
  scope: shareScopeSchema,
  canRequest: z.boolean(),
});

export const inferenceSchema = z.object({
  defaultPresence: z.enum(["unknown", "infer_last_state"]),
  carryForwardDays: z.number().int().nonnegative(),
});

export const houseConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  rooms: z.array(roomSchema),
  people: z.array(personSchema),
  visibleHousemateIds: z.array(z.string()).default([]),
  sharePolicies: z.array(sharePolicySchema),
  rules: z.array(parserRuleSchema),
  inference: inferenceSchema,
});

export const rawCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  allDay: z.boolean().default(true),
});

export const parsedCalendarEventTypeSchema = z.enum([
  "stay",
  "presence",
  "unknown",
]);

export const presenceStateSchema = z.enum(["in", "out", "unknown"]);
export const parsedScopeSchema = z.enum([
  "house",
  "room",
  "location",
  "unknown",
]);

export const parsedCalendarEventSchema = z.object({
  rawTitle: z.string(),
  normalizedTitle: z.string(),
  type: parsedCalendarEventTypeSchema,
  scope: parsedScopeSchema,
  personId: z.string().optional(),
  roomId: z.string().optional(),
  location: z.string().optional(),
  presenceState: presenceStateSchema.optional(),
  visibility: visibilitySchema,
  confidence: z.number().min(0).max(1),
});

export const dayRoomStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["free", "occupied"]),
});

export const dayPresenceSchema = z.object({
  personId: z.string(),
  name: z.string(),
  state: presenceStateSchema,
});

export const dailyAvailabilitySchema = z.object({
  date: z.string(),
  status: z.enum(["available", "partial", "unavailable", "unknown"]),
  rooms: z.array(dayRoomStatusSchema),
  presence: z.array(dayPresenceSchema),
});

export type HouseConfig = z.infer<typeof houseConfigSchema>;
export type RawCalendarEvent = z.infer<typeof rawCalendarEventSchema>;
export type ParsedCalendarEvent = z.infer<typeof parsedCalendarEventSchema>;
export type DailyAvailability = z.infer<typeof dailyAvailabilitySchema>;
