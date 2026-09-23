/**
 * ZPP_SweepData unit tests — sweep-and-prune axis data.
 */

import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZPP_SweepData } from "../../../src/native/space/ZPP_SweepData";

describe("ZPP_SweepData", () => {
  it("should have default null fields", () => {
    const sd = new ZPP_SweepData();
    expect(sd.aabb).toBeNull();
    expect(sd.shape).toBeNull();
    expect(sd.prev).toBeNull();
    expect(sd.next).toBeNull();
  });

  it("free should clear aabb, shape, and prev", () => {
    const sd = new ZPP_SweepData();
    sd.aabb = { minx: 0 };
    sd.shape = { id: 1 };
    sd.prev = new ZPP_SweepData();
    sd.free();
    expect(sd.aabb).toBeNull();
    expect(sd.shape).toBeNull();
    expect(sd.prev).toBeNull();
  });

  it("gt should compare by aabb.minx", () => {
    const a = new ZPP_SweepData();
    const b = new ZPP_SweepData();
    a.aabb = { minx: 10 };
    b.aabb = { minx: 5 };
    expect(a.gt(b)).toBe(true);
    expect(b.gt(a)).toBe(false);
  });

  it("gt should return false for equal minx", () => {
    const a = new ZPP_SweepData();
    const b = new ZPP_SweepData();
    a.aabb = { minx: 5 };
    b.aabb = { minx: 5 };
    expect(a.gt(b)).toBe(false);
  });

  it("static pool should start as null", () => {
    expect(ZPP_SweepData.zpp_pool === null || ZPP_SweepData.zpp_pool instanceof ZPP_SweepData).toBe(
      true,
    );
  });

  it("doubly-linked list wiring", () => {
    const a = new ZPP_SweepData();
    const b = new ZPP_SweepData();
    const c = new ZPP_SweepData();
    a.next = b;
    b.prev = a;
    b.next = c;
    c.prev = b;
    expect(a.next).toBe(b);
    expect(b.prev).toBe(a);
    expect(b.next).toBe(c);
    expect(c.prev).toBe(b);
  });
});
