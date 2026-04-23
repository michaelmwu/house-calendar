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
    expect(parsed.confidence).toBeGreaterThan(0.7);
  });

  test("parses public housemate travel", () => {
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

  test("supports bracket shorthand for presence", () => {
    const parsed = parseEventTitle("Michael [TPE]", exampleHouseConfig);

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("in");
    expect(parsed.location).toBe("tpe");
    expect(parsed.personId).toBe("michael");
  });
});
