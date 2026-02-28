import { describe, it, expect } from "vitest";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { ZPP_InteractionGroup } from "../../src/native/dynamics/ZPP_InteractionGroup";

describe("InteractionGroup", () => {
  // --- Constructor ---

  it("should construct with default ignore=false", () => {
    const g = new InteractionGroup();
    expect(g.ignore).toBe(false);
  });

  it("should construct with custom ignore=true", () => {
    const g = new InteractionGroup(true);
    expect(g.ignore).toBe(true);
  });

  // --- ignore property ---

  it("should get/set ignore flag", () => {
    const g = new InteractionGroup();
    expect(g.ignore).toBe(false);
    g.ignore = true;
    expect(g.ignore).toBe(true);
    g.ignore = false;
    expect(g.ignore).toBe(false);
  });

  it("should not trigger invalidation when setting same ignore value", () => {
    const g = new InteractionGroup(true);
    // Setting same value should be a no-op
    g.ignore = true;
    expect(g.ignore).toBe(true);
  });

  // --- group hierarchy ---

  it("should have null group by default", () => {
    const g = new InteractionGroup();
    expect(g.group).toBeNull();
  });

  it("should set parent group", () => {
    const parent = new InteractionGroup();
    const child = new InteractionGroup();
    child.group = parent;
    expect(child.group).toBe(parent);
  });

  it("should clear parent group with null", () => {
    const parent = new InteractionGroup();
    const child = new InteractionGroup();
    child.group = parent;
    expect(child.group).toBe(parent);
    child.group = null;
    expect(child.group).toBeNull();
  });

  it("should change parent group", () => {
    const parent1 = new InteractionGroup();
    const parent2 = new InteractionGroup();
    const child = new InteractionGroup();
    child.group = parent1;
    expect(child.group).toBe(parent1);
    child.group = parent2;
    expect(child.group).toBe(parent2);
  });

  it("should throw when assigning group to itself", () => {
    const g = new InteractionGroup();
    expect(() => {
      g.group = g;
    }).toThrow("Cannot assign InteractionGroup to itself");
  });

  // --- toString ---

  it("should return 'InteractionGroup' when ignore is false", () => {
    const g = new InteractionGroup(false);
    expect(g.toString()).toBe("InteractionGroup");
  });

  it("should return 'InteractionGroup:ignore' when ignore is true", () => {
    const g = new InteractionGroup(true);
    expect(g.toString()).toBe("InteractionGroup:ignore");
  });

  // --- zpp_inner / _inner ---

  it("should have zpp_inner as ZPP_InteractionGroup instance", () => {
    const g = new InteractionGroup();
    expect(g.zpp_inner).toBeInstanceOf(ZPP_InteractionGroup);
  });

  it("should have _inner returning this", () => {
    const g = new InteractionGroup();
    expect(g._inner).toBe(g);
  });

  // --- _wrap ---

  it("should wrap ZPP_InteractionGroup instance", () => {
    const g = new InteractionGroup(true);
    const wrapped = InteractionGroup._wrap(g.zpp_inner);
    expect(wrapped).toBeInstanceOf(InteractionGroup);
    expect(wrapped.ignore).toBe(true);
  });

  it("should return same instance for same zpp_inner", () => {
    const g = new InteractionGroup();
    const a = InteractionGroup._wrap(g.zpp_inner);
    const b = InteractionGroup._wrap(g.zpp_inner);
    expect(a).toBe(b);
  });

  it("should return instance directly when wrapping an InteractionGroup", () => {
    const g = new InteractionGroup();
    expect(InteractionGroup._wrap(g)).toBe(g);
  });

  it("should return null for null/undefined input", () => {
    expect(InteractionGroup._wrap(null)).toBeNull();
    expect(InteractionGroup._wrap(undefined)).toBeNull();
  });
});
