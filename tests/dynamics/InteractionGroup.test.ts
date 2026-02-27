import { describe, it, expect } from "vitest";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";

describe("InteractionGroup", () => {
  it("should construct with default ignore=false", () => {
    const g = new InteractionGroup();
    expect(g.ignore).toBe(false);
  });

  it("should construct with custom ignore=true", () => {
    const g = new InteractionGroup(true);
    expect(g.ignore).toBe(true);
  });

  it("should get/set ignore flag", () => {
    const g = new InteractionGroup();
    expect(g.ignore).toBe(false);
    g.ignore = true;
    expect(g.ignore).toBe(true);
    g.ignore = false;
    expect(g.ignore).toBe(false);
  });
});
