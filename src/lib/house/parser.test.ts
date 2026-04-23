import { describe, expect, test } from "bun:test";
import { parseEventTitle } from "./parser";
import { washingtonHouseConfig } from "./sample-data";

describe("parseEventTitle", () => {
  test("parses whole-house stays from explicit rules", () => {
    const parsed = parseEventTitle(
      "Guest stays (whole house)",
      washingtonHouseConfig,
    );

    expect(parsed.type).toBe("stay");
    expect(parsed.scope).toBe("house");
    expect(parsed.visibility).toBe("private");
    expect(parsed.personId).toBe("guest");
    expect(parsed.confidence).toBeGreaterThan(0.9);
  });

  test("parses public housemate travel", () => {
    const parsed = parseEventTitle(
      "Michael out of Japan (Europe)",
      washingtonHouseConfig,
    );

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("out");
    expect(parsed.personId).toBe("michael");
    expect(parsed.location).toBe("europe");
    expect(parsed.visibility).toBe("public");
  });

  test("supports bracket shorthand for presence", () => {
    const parsed = parseEventTitle("Michael [TPE]", washingtonHouseConfig);

    expect(parsed.type).toBe("presence");
    expect(parsed.presenceState).toBe("in");
    expect(parsed.location).toBe("tpe");
    expect(parsed.personId).toBe("michael");
  });
});
