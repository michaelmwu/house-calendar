import {
  type HouseConfig,
  houseConfigSchema,
  type ParsedCalendarEvent,
} from "./types";

const STAY_RE = /\bstay\b/;
const OUT_RE = /\b(out|away)\b/;
const IN_RE = /\bin\b/;
const WHOLE_HOUSE_RE = /\b(whole house|house)\b/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\[([^\]]+)\]/g, "($1)")
    .toLowerCase();
}

export function normalizeTitle(title: string): string {
  return canonicalizeTitle(title).replace(/\bstays\b/gi, "stay");
}

function extractBracketHint(normalizedTitle: string): string | undefined {
  const match = normalizedTitle.match(/\(([^)]+)\)/);
  return match?.[1]?.trim();
}

function findPersonId(
  normalizedTitle: string,
  config: HouseConfig,
): string | undefined {
  for (const person of config.people) {
    const candidates = [person.name, ...person.aliases].map((value) =>
      normalizeTitle(value),
    );

    if (
      candidates.some((candidate) =>
        normalizedTitle.match(
          new RegExp(`^${escapeRegExp(candidate)}\\b`, "i"),
        ),
      )
    ) {
      return person.id;
    }
  }

  return undefined;
}

function matchExplicitRule(
  candidateTitles: string[],
  normalizedTitle: string,
  config: HouseConfig,
): Omit<ParsedCalendarEvent, "rawTitle"> | undefined {
  for (const rule of config.rules) {
    const regex = new RegExp(rule.match, "i");
    const match = candidateTitles
      .map((title) => title.match(regex))
      .find((candidateMatch) => candidateMatch);

    if (!match) {
      continue;
    }

    switch (rule.type) {
      case "stay.whole_house":
        return {
          normalizedTitle,
          type: "stay",
          scope: "house",
          visibility: rule.visibility,
          confidence: 0.99,
        };
      case "stay.room":
        return {
          normalizedTitle,
          type: "stay",
          scope: "room",
          roomId: rule.roomId,
          visibility: rule.visibility,
          confidence: 0.97,
        };
      case "presence.in":
        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: rule.actorId,
          presenceState: "in",
          location: match[1]?.trim(),
          visibility: rule.visibility,
          confidence: 0.95,
        };
      case "presence.out":
        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: rule.actorId,
          presenceState: "out",
          location: match[1]?.trim(),
          visibility: rule.visibility,
          confidence: 0.95,
        };
    }
  }

  return undefined;
}

function fallbackStayParse(
  normalizedTitle: string,
  config: HouseConfig,
  personId?: string,
): ParsedCalendarEvent | undefined {
  if (!STAY_RE.test(normalizedTitle)) {
    return undefined;
  }

  const hint = extractBracketHint(normalizedTitle);

  if (hint && WHOLE_HOUSE_RE.test(hint)) {
    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "stay",
      scope: "house",
      personId,
      visibility: "private",
      confidence: personId ? 0.93 : 0.75,
    };
  }

  const room = config.rooms.find((candidate) =>
    [candidate.name, ...candidate.aliases]
      .map((value) => normalizeTitle(value))
      .includes(hint ?? ""),
  );

  if (room) {
    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "stay",
      scope: "room",
      personId,
      roomId: room.id,
      visibility: "private",
      confidence: personId ? 0.91 : 0.74,
    };
  }

  return {
    rawTitle: normalizedTitle,
    normalizedTitle,
    type: "stay",
    scope: "unknown",
    personId,
    visibility: "private",
    confidence: personId ? 0.68 : 0.52,
  };
}

function fallbackPresenceParse(
  normalizedTitle: string,
  personId?: string,
): ParsedCalendarEvent | undefined {
  if (!personId) {
    return undefined;
  }

  const bracketHint = extractBracketHint(normalizedTitle);

  if (OUT_RE.test(normalizedTitle)) {
    const locationMatch = normalizedTitle.match(/\bout of ([^)]+)$/i);

    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "presence",
      scope: "location",
      personId,
      location: locationMatch?.[1]?.trim() ?? bracketHint,
      presenceState: "out",
      visibility: "public",
      confidence: bracketHint || locationMatch ? 0.9 : 0.82,
    };
  }

  if (bracketHint && !STAY_RE.test(normalizedTitle)) {
    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "presence",
      scope: "location",
      personId,
      location: bracketHint,
      presenceState: "in",
      visibility: "public",
      confidence: 0.86,
    };
  }

  if (IN_RE.test(normalizedTitle)) {
    const locationMatch = normalizedTitle.match(/\bin ([^)]+)$/i);

    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "presence",
      scope: "location",
      personId,
      location: locationMatch?.[1]?.trim(),
      presenceState: "in",
      visibility: "public",
      confidence: locationMatch ? 0.82 : 0.7,
    };
  }

  return undefined;
}

export function parseEventTitle(
  title: string,
  configInput: HouseConfig,
): ParsedCalendarEvent {
  const config = houseConfigSchema.parse(configInput);
  const canonicalTitle = canonicalizeTitle(title);
  const normalizedTitle = normalizeTitle(title);
  const personId = findPersonId(normalizedTitle, config);
  const explicitMatch = matchExplicitRule(
    [...new Set([canonicalTitle, normalizedTitle])],
    normalizedTitle,
    config,
  );

  if (explicitMatch) {
    return {
      ...explicitMatch,
      rawTitle: title,
      normalizedTitle,
      personId: explicitMatch.personId ?? personId,
    };
  }

  const stayMatch = fallbackStayParse(normalizedTitle, config, personId);
  if (stayMatch) {
    return {
      ...stayMatch,
      rawTitle: title,
      normalizedTitle,
    };
  }

  const presenceMatch = fallbackPresenceParse(normalizedTitle, personId);
  if (presenceMatch) {
    return {
      ...presenceMatch,
      rawTitle: title,
      normalizedTitle,
    };
  }

  return {
    rawTitle: title,
    normalizedTitle,
    type: "unknown",
    scope: "unknown",
    personId,
    visibility: "private",
    confidence: 0.12,
  };
}
