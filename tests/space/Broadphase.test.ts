import { describe, it, expect } from "vitest";
import { Broadphase } from "../../src/space/Broadphase";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("Broadphase", () => {
  it("should have correct __name__", () => {
    expect(Broadphase.__name__).toEqual(["nape", "space", "Broadphase"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new Broadphase()).toThrow("Cannot instantiate");
  });

  it("should return DYNAMIC_AABB_TREE singleton", () => {
    const a = Broadphase.get_DYNAMIC_AABB_TREE();
    const b = Broadphase.get_DYNAMIC_AABB_TREE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Broadphase);
  });

  it("should return SWEEP_AND_PRUNE singleton", () => {
    const a = Broadphase.get_SWEEP_AND_PRUNE();
    const b = Broadphase.get_SWEEP_AND_PRUNE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Broadphase);
  });

  it("should return distinct instances for each type", () => {
    expect(Broadphase.get_DYNAMIC_AABB_TREE()).not.toBe(Broadphase.get_SWEEP_AND_PRUNE());
  });

  it("should store singletons in ZPP_Flags", () => {
    const tree = Broadphase.get_DYNAMIC_AABB_TREE();
    expect(ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE).toBe(tree);
  });

  it("DYNAMIC_AABB_TREE toString should return 'DYNAMIC_AABB_TREE'", () => {
    expect(Broadphase.get_DYNAMIC_AABB_TREE().toString()).toBe("DYNAMIC_AABB_TREE");
  });

  it("SWEEP_AND_PRUNE toString should return 'SWEEP_AND_PRUNE'", () => {
    expect(Broadphase.get_SWEEP_AND_PRUNE().toString()).toBe("SWEEP_AND_PRUNE");
  });

  it("should have __class__ set on prototype", () => {
    expect((Broadphase.get_DYNAMIC_AABB_TREE() as any).__class__).toBe(Broadphase);
  });
});
