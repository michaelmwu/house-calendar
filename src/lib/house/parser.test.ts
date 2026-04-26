import { describe, expect, test } from "bun:test";
import { parseEventTitle } from "./parser";
import { exampleHouseConfig } from "./sample-data";

describe("parseEventTitle", () => {
  test("parses whole-house stays from explicit rules", () => {
    const parsed = parseEventTitle(
      "Someone stays (whole house)",
      exampleHouseConfig,
    );

    expect(parsed.type).toBe("stay");
    expect(parsed.scope).toBe("house");
    expect(parsed.visibility).toBe("private");
    expect(parsed.personId).toBeUndefined();
    expect(parsed.confidence).toBe(0.99);
  });

  test("keeps explicit stay rules matchable after title normalization", () => {
    const parsed = parseEventTitle(
      "Someone stays (guest room)",
      exampleHouseConfig,
    );

    expect(parsed.type).toBe("stay");
    expect(parsed.scope).toBe("room");
    expect(parsed.roomId).toBe("guest-room");
    expect(parsed.guestName).toBe("Someone");
    expect(parsed.visibility).toBe("private");
    expect(parsed.confidence).toBe(0.97);
  });

  test("captures guest names separately from known housemates", () => {
    const parsed = parseEventTitle(
      "Charlie stays [Guest Room]",
      exampleHouseConfig,
    );

    expect(parsed.type).toBe("stay");
    expect(parsed.personId).toBeUndefined();
    expect(parsed.guestName).toBe("Charlie");
    expect(parsed.roomId).toBe("guest-room");
  });

  test("does not store a guest name for configured housemates", () => {
    const parsed = parseEventTitle(
      "Michael stays (guest room)",
      exampleHouseConfig,
    );

    expect(parsed.type).toBe("stay");
    expect(parsed.personId).toBe("michael");
    expect(parsed.guestName).toBeUndefined();
    expect(parsed.roomId).toBe("guest-room");
  });

  test("parses templated public housemate travel", () => {
    const parsed = parseEventTitle(
      "Michael out of Japan (Europe)",
      exampleHouseConfig,
    );

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("out");
    expect(parsed.personId).toBe("michael");
    expect(parsed.location).toBe("europe");
    expect(parsed.visibility).toBe("public");
  });

  test("supports bracket shorthand for templated presence", () => {
    const parsed = parseEventTitle("Michael [TPE]", exampleHouseConfig);

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("in");
    expect(parsed.location).toBe("tpe");
    expect(parsed.personId).toBe("michael");
    expect(parsed.visibility).toBe("public");
  });

  test("supports text shorthand for templated presence", () => {
    const parsed = parseEventTitle("Michael in Tokyo", exampleHouseConfig);

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("in");
    expect(parsed.location).toBe("tokyo");
    expect(parsed.personId).toBe("michael");
    expect(parsed.visibility).toBe("public");
  });

  test("keeps heuristic presence parses private by default", () => {
    const parsed = parseEventTitle(
      "Michael away for surgery",
      exampleHouseConfig,
    );

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("out");
    expect(parsed.visibility).toBe("private");
  });
});
