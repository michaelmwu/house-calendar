import { describe, expect, test } from "bun:test";
import { exampleHouseConfig } from "./sample-data";
import { houseConfigSchema } from "./types";

describe("houseConfigSchema", () => {
  test("rejects invalid parser regex rules", () => {
    const config = structuredClone(exampleHouseConfig);
    config.rules[0] = {
      ...config.rules[0],
      match: "(",
    };

    expect(() => houseConfigSchema.parse(config)).toThrow(
      /Invalid parser rule regex/,
    );
  });

  test("requires roomId for stay.room rules", () => {
    const config = structuredClone(exampleHouseConfig) as Record<
      string,
      unknown
    >;
    const rules = structuredClone(exampleHouseConfig.rules) as Record<
      string,
      unknown
    >[];
    rules.push({
      type: "stay.room",
      match: "stays \\(studio\\)",
      visibility: "private",
    });
    config.rules = rules;

    expect(() => houseConfigSchema.parse(config)).toThrow();
  });

  test("requires valid actorId for presence rules", () => {
    const config = structuredClone(exampleHouseConfig);
    config.rules.push({
      type: "presence.out",
      match: "^ghost out of japan$",
      actorId: "ghost",
      visibility: "public",
    });

    expect(() => houseConfigSchema.parse(config)).toThrow(/Unknown actorId/);
  });
});
