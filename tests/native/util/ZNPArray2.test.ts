import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import {
  ZNPArray2,
  ZNPArray2_Float,
  ZNPArray2_ZPP_GeomVert,
  ZNPArray2_ZPP_MarchPair,
} from "../../../src/native/util/ZNPArray2";

describe("ZNPArray2", () => {
  describe("constructor", () => {
    it("should initialize with width and empty list", () => {
      const arr = new ZNPArray2<number>(5, 3);
      expect(arr.width).toBe(5);
      expect(arr.list).toEqual([]);
    });
  });

  describe("resize", () => {
    it("should fill the list with the default value", () => {
      const arr = new ZNPArray2<number>(3, 2);
      arr.resize(3, 2, 0);
      expect(arr.list.length).toBe(6);
      expect(arr.list.every((v) => v === 0)).toBe(true);
    });

    it("should update the width", () => {
      const arr = new ZNPArray2<number>(3, 2);
      arr.resize(4, 3, -1);
      expect(arr.width).toBe(4);
      expect(arr.list.length).toBe(12);
    });
  });

  describe("get/set", () => {
    it("should store and retrieve values by (x, y) coordinates", () => {
      const arr = new ZNPArray2<number>(3, 2);
      arr.resize(3, 2, 0);
      arr.set(2, 1, 42);
      expect(arr.get(2, 1)).toBe(42);
      expect(arr.get(0, 0)).toBe(0);
    });

    it("should return correct values for all positions", () => {
      const arr = new ZNPArray2<string>(2, 2);
      arr.resize(2, 2, "");
      arr.set(0, 0, "a");
      arr.set(1, 0, "b");
      arr.set(0, 1, "c");
      arr.set(1, 1, "d");
      expect(arr.get(0, 0)).toBe("a");
      expect(arr.get(1, 0)).toBe("b");
      expect(arr.get(0, 1)).toBe("c");
      expect(arr.get(1, 1)).toBe("d");
    });

    it("set should return the stored value", () => {
      const arr = new ZNPArray2<number>(3, 3);
      arr.resize(3, 3, 0);
      const result = arr.set(1, 2, 99);
      expect(result).toBe(99);
    });
  });
});

describe("ZNPArray2_Float", () => {
  it("should work with numeric values", () => {
    const arr = new ZNPArray2_Float(3, 3);
    arr.resize(3, 3, 0.0);
    arr.set(1, 1, 3.14);
    expect(arr.get(1, 1)).toBeCloseTo(3.14);
  });
});

describe("ZNPArray2_ZPP_GeomVert", () => {
  it("should work with object values", () => {
    const arr = new ZNPArray2_ZPP_GeomVert(2, 2);
    arr.resize(2, 2, null);
    const obj = { x: 1, y: 2 };
    arr.set(0, 1, obj);
    expect(arr.get(0, 1)).toBe(obj);
    expect(arr.get(1, 0)).toBeNull();
  });
});

describe("namespace registration", () => {
  it("should register ZNPArray2_Float in compiled namespace", async () => {
    const { getNape } = await import("../../../src/core/engine");
    const nape = getNape();
    expect(nape.__zpp.util.ZNPArray2_Float).toBe(ZNPArray2_Float);
  });

  it("should register ZNPArray2_ZPP_GeomVert in compiled namespace", async () => {
    const { getNape } = await import("../../../src/core/engine");
    const nape = getNape();
    expect(nape.__zpp.util.ZNPArray2_ZPP_GeomVert).toBe(ZNPArray2_ZPP_GeomVert);
  });

  it("should register ZNPArray2_ZPP_MarchPair in compiled namespace", async () => {
    const { getNape } = await import("../../../src/core/engine");
    const nape = getNape();
    expect(nape.__zpp.util.ZNPArray2_ZPP_MarchPair).toBe(ZNPArray2_ZPP_MarchPair);
  });
});
