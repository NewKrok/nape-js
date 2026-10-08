import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZNPNode } from "../../../src/native/util/ZNPNode";

describe("ZNPNode", () => {
  it("should initialize with null elt and next", () => {
    const node = new ZNPNode<number>();
    expect(node.elt).toBeNull();
    expect(node.next).toBeNull();
  });

  it("free() should clear elt", () => {
    const node = new ZNPNode<number>();
    node.elt = 42;
    node.free();
    expect(node.elt).toBeNull();
  });

  describe("namespace registration", () => {
    it("compiled factories should create subclasses of ZNPNode", async () => {
      const { getNape } = await import("../../../src/core/engine");
      const zpp = getNape().__zpp;
      const node = new zpp.util.ZNPNode_ZPP_Body();
      expect(node).toBeInstanceOf(ZNPNode);
      expect(node.elt).toBeNull();
      expect(node.next).toBeNull();
    });

    it("every node name is the one ZNPNode class (one shape, one pool)", async () => {
      const { getNape } = await import("../../../src/core/engine");
      const zpp = getNape().__zpp;
      expect(zpp.util.ZNPNode_ZPP_Body).toBe(ZNPNode);
      expect(zpp.util.ZNPNode_ZPP_Shape).toBe(ZNPNode);
    });
  });
});
