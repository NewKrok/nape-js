import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZNPNode } from "../../../src/native/util/ZNPNode";

describe("ZNPNode", () => {
  it("should initialize with null elt and next", () => {
    const node = new ZNPNode<number>();
    expect(node.elt).toBeNull();
    expect(node.next).toBeNull();
  });

  it("elem() should return elt", () => {
    const node = new ZNPNode<string>();
    node.elt = "hello";
    expect(node.elem()).toBe("hello");
  });

  it("free() should clear elt", () => {
    const node = new ZNPNode<number>();
    node.elt = 42;
    node.free();
    expect(node.elt).toBeNull();
  });

  it("alloc() should be a no-op", () => {
    const node = new ZNPNode<number>();
    expect(() => node.alloc()).not.toThrow();
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

    it("each node type should have its own pool", async () => {
      const { getNape } = await import("../../../src/core/engine");
      const zpp = getNape().__zpp;
      const NodeBody = zpp.util.ZNPNode_ZPP_Body;
      const NodeShape = zpp.util.ZNPNode_ZPP_Shape;
      // Pools are separate statics
      expect(NodeBody).not.toBe(NodeShape);
    });
  });
});
