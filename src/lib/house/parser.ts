import {
  type HouseConfig,
  houseConfigSchema,
  type ParsedCalendarEvent,
} from "./types";

const STAY_RE = /\bstay\b/;
const MAYBE_STAY_RE = /\bmaybe stay\b/;
const OUT_RE = /\b(out|away)\b/;
const IN_RE = /\bin\b/;
const WHOLE_HOUSE_RE = /\b(whole house|house)\b/;
const NOT_STAYING_SUFFIX_RE =
  /^(.*?)(?:\s*,\s*not staying|\s*\(\s*not staying\s*\))$/i;
const TENTATIVE_HINT_RE = /^(tentative|maybe)$/i;

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

function extractBracketHints(normalizedTitle: string): string[] {
  return (
    extractBracketHint(normalizedTitle)
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function isTentativeHint(value: string): boolean {
  return TENTATIVE_HINT_RE.test(value.trim());
}

function inferStayStatus(normalizedTitle: string): "confirmed" | "tentative" {
  return MAYBE_STAY_RE.test(normalizedTitle) ||
    extractBracketHints(normalizedTitle).some(isTentativeHint)
    ? "tentative"
    : "confirmed";
}

function stripTentativeStayMarkers(title: string): string {
  return title
    .replace(/\bmaybe\s+(stay|stays)\b/gi, "$1")
    .replace(/\(([^)]+)\)/g, (_match, content: string) => {
      const filtered = content
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => !isTentativeHint(value));

      return filtered.length > 0 ? `(${filtered.join(", ")})` : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function extractGuestName(
  rawTitle: string,
  normalizedTitle: string,
  personId?: string,
): string | undefined {
  if (personId || !STAY_RE.test(normalizedTitle)) {
    return undefined;
  }

  const match = rawTitle.match(/^\s*(.+?)\s+(?:maybe\s+)?stays?\b/i);
  const guestName = match?.[1]?.trim();

  return guestName ? guestName : undefined;
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

function getTemplatedPresenceVisibility(
  personId: string,
  config: HouseConfig,
): "public" | "private" {
  const person = config.people.find((candidate) => candidate.id === personId);

  if (
    person?.publicVisibility === "visible" &&
    config.visibleHousemateIds.includes(personId)
  ) {
    return "public";
  }

  return "private";
}

function parsePresenceLocationDetails(rawLocation: string | undefined): {
  location: string | undefined;
  occupiesDefaultRoom?: boolean;
} {
  const trimmedLocation = rawLocation?.trim();

  if (!trimmedLocation) {
    return {
      location: undefined,
    };
  }

  const notStayingMatch = trimmedLocation.match(NOT_STAYING_SUFFIX_RE);

  if (!notStayingMatch) {
    return {
      location: trimmedLocation,
    };
  }

  const location = notStayingMatch[1]?.trim();

  return {
    location: location ? location : undefined,
    occupiesDefaultRoom: false,
  };
}

function matchTemplatedPresenceRule(
  normalizedTitle: string,
  config: HouseConfig,
): Omit<ParsedCalendarEvent, "rawTitle"> | undefined {
  for (const person of config.people) {
    const candidates = [person.name, ...person.aliases].map((value) =>
      normalizeTitle(value),
    );

    for (const candidate of candidates) {
      const escapedCandidate = escapeRegExp(candidate);
      const visibility = getTemplatedPresenceVisibility(person.id, config);
      const outMatch = normalizedTitle.match(
        new RegExp(`^${escapedCandidate} out of japan(?: \\((.+)\\))?$`, "i"),
      );

      if (outMatch) {
        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: person.id,
          presenceState: "out",
          location: outMatch[1]?.trim(),
          visibility,
          confidence: 0.98,
        };
      }

      const bracketOutMatch = normalizedTitle.match(
        new RegExp(`^${escapedCandidate} out \\((.+)\\)$`, "i"),
      );

      if (bracketOutMatch) {
        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: person.id,
          presenceState: "out",
          location: bracketOutMatch[1]?.trim(),
          visibility,
          confidence: 0.98,
        };
      }

      const bracketInMatch = normalizedTitle.match(
        new RegExp(`^${escapedCandidate} \\((.+)\\)$`, "i"),
      );

      if (bracketInMatch) {
        const { location, occupiesDefaultRoom } = parsePresenceLocationDetails(
          bracketInMatch[1],
        );

        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: person.id,
          presenceState: "in",
          location,
          occupiesDefaultRoom,
          visibility,
          confidence: 0.98,
        };
      }

      const textInMatch = normalizedTitle.match(
        new RegExp(`^${escapedCandidate} in (.+)$`, "i"),
      );

      if (textInMatch) {
        const { location, occupiesDefaultRoom } = parsePresenceLocationDetails(
          textInMatch[1],
        );

        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: person.id,
          presenceState: "in",
          location,
          occupiesDefaultRoom,
          visibility,
          confidence: 0.98,
        };
      }
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
      case "presence.in": {
        const { location, occupiesDefaultRoom } = parsePresenceLocationDetails(
          match[1]?.trim(),
        );

        return {
          normalizedTitle,
          type: "presence",
          scope: "location",
          personId: rule.actorId,
          presenceState: "in",
          location,
          occupiesDefaultRoom,
          visibility: rule.visibility,
          confidence: 0.95,
        };
      }
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
  rawTitle: string,
  normalizedTitle: string,
  config: HouseConfig,
  personId?: string,
): ParsedCalendarEvent | undefined {
  if (!STAY_RE.test(normalizedTitle)) {
    return undefined;
  }

  const hintParts = extractBracketHints(normalizedTitle);
  const stayStatus = inferStayStatus(normalizedTitle);
  const scopeHint = hintParts.find((hint) => !isTentativeHint(hint));

  if (scopeHint && WHOLE_HOUSE_RE.test(scopeHint)) {
    return {
      rawTitle,
      normalizedTitle,
      type: "stay",
      scope: "house",
      personId,
      guestName: extractGuestName(rawTitle, normalizedTitle, personId),
      stayStatus,
      visibility: "private",
      confidence: personId ? 0.93 : 0.75,
    };
  }

  const room = config.rooms.find((candidate) =>
    [candidate.name, ...candidate.aliases]
      .map((value) => normalizeTitle(value))
      .some((value) => hintParts.includes(value)),
  );

  if (room) {
    return {
      rawTitle,
      normalizedTitle,
      type: "stay",
      scope: "room",
      personId,
      guestName: extractGuestName(rawTitle, normalizedTitle, personId),
      stayStatus,
      roomId: room.id,
      visibility: "private",
      confidence: personId ? 0.91 : 0.74,
    };
  }

  return {
    rawTitle,
    normalizedTitle,
    type: "stay",
    scope: "unknown",
    personId,
    guestName: extractGuestName(rawTitle, normalizedTitle, personId),
    stayStatus,
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
      visibility: "private",
      confidence: bracketHint || locationMatch ? 0.9 : 0.82,
    };
  }

  if (bracketHint && !STAY_RE.test(normalizedTitle)) {
    const { location, occupiesDefaultRoom } =
      parsePresenceLocationDetails(bracketHint);

    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "presence",
      scope: "location",
      personId,
      location,
      occupiesDefaultRoom,
      presenceState: "in",
      visibility: "private",
      confidence: 0.86,
    };
  }

  if (IN_RE.test(normalizedTitle)) {
    const locationMatch = normalizedTitle.match(/\bin ([^)]+)$/i);
    const { location, occupiesDefaultRoom } = parsePresenceLocationDetails(
      locationMatch?.[1]?.trim(),
    );

    return {
      rawTitle: normalizedTitle,
      normalizedTitle,
      type: "presence",
      scope: "location",
      personId,
      location,
      occupiesDefaultRoom,
      presenceState: "in",
      visibility: "private",
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
  const strippedCanonicalTitle = stripTentativeStayMarkers(canonicalTitle);
  const strippedNormalizedTitle = stripTentativeStayMarkers(normalizedTitle);
  const personId = findPersonId(normalizedTitle, config);
  const guestName = extractGuestName(title, normalizedTitle, personId);
  const explicitMatch = matchExplicitRule(
    [
      ...new Set([
        canonicalTitle,
        normalizedTitle,
        strippedCanonicalTitle,
        strippedNormalizedTitle,
      ]),
    ],
    normalizedTitle,
    config,
  );

  if (explicitMatch) {
    return {
      ...explicitMatch,
      rawTitle: title,
      normalizedTitle,
      guestName:
        explicitMatch.type === "stay"
          ? (explicitMatch.guestName ?? guestName)
          : undefined,
      stayStatus:
        explicitMatch.type === "stay"
          ? inferStayStatus(normalizedTitle)
          : undefined,
      personId: explicitMatch.personId ?? personId,
    };
  }

  const templatedPresenceMatch = matchTemplatedPresenceRule(
    normalizedTitle,
    config,
  );

  if (templatedPresenceMatch) {
    return {
      ...templatedPresenceMatch,
      rawTitle: title,
      normalizedTitle,
      personId: templatedPresenceMatch.personId ?? personId,
    };
  }

  const stayMatch = fallbackStayParse(title, normalizedTitle, config, personId);
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
