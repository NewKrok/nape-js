import { describe, it, expect } from "vitest";
import { Broadphase } from "../../src/space/Broadphase";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("Broadphase", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new Broadphase()).toThrow("Cannot instantiate");
  });

  it("should return DYNAMIC_AABB_TREE singleton", () => {
    const a = Broadphase.DYNAMIC_AABB_TREE;
    const b = Broadphase.DYNAMIC_AABB_TREE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Broadphase);
  });

  it("should return SWEEP_AND_PRUNE singleton", () => {
    const a = Broadphase.SWEEP_AND_PRUNE;
    const b = Broadphase.SWEEP_AND_PRUNE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Broadphase);
  });

  it("should return distinct instances for each type", () => {
    expect(Broadphase.DYNAMIC_AABB_TREE).not.toBe(Broadphase.SWEEP_AND_PRUNE);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE).toBe(Broadphase.DYNAMIC_AABB_TREE);
  });

  it("DYNAMIC_AABB_TREE toString should return 'DYNAMIC_AABB_TREE'", () => {
    expect(Broadphase.DYNAMIC_AABB_TREE.toString()).toBe("DYNAMIC_AABB_TREE");
  });

  it("SWEEP_AND_PRUNE toString should return 'SWEEP_AND_PRUNE'", () => {
    expect(Broadphase.SWEEP_AND_PRUNE.toString()).toBe("SWEEP_AND_PRUNE");
  });
});
