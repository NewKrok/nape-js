/**
 * ZPP_Vec3 — lazy validation and wrapper creation (issue #167).
 */
import { describe, it, expect } from "vitest";
import "../../../src/index";
import { Vec3 } from "../../../src/geom/Vec3";
import { ZPP_Vec3 } from "../../../src/native/geom/ZPP_Vec3";

describe("ZPP_Vec3 — coverage", () => {
  it("validate() invokes the callback when present and is a no-op otherwise", () => {
    const z = new ZPP_Vec3();
    expect(() => z.validate()).not.toThrow();
    let n = 0;
    z._validate = () => {
      n++;
      z.x = 42;
    };
    z.validate();
    z.validate();
    expect(n).toBe(2);
    expect(z.x).toBe(42);
  });

  it("wrapper() creates a Vec3 once, bound to this ZPP_Vec3, and caches it", () => {
    const z = new ZPP_Vec3();
    z.x = 1;
    z.y = 2;
    z.z = 3;
    const w = z.wrapper();
    expect(w).toBeInstanceOf(Vec3);
    expect(w.zpp_inner).toBe(z);
    expect(z.outer).toBe(w);
    expect([w.x, w.y, w.z]).toEqual([1, 2, 3]);
    expect(z.wrapper()).toBe(w);
    w.z = 9;
    expect(z.z).toBe(9);
  });

  it("wrapper() returns the existing outer without consulting the factory", () => {
    const z = new ZPP_Vec3();
    const sentinel = {};
    z.outer = sentinel;
    expect(z.wrapper()).toBe(sentinel);
  });

  it("wrapper() without a registered factory leaves outer null", () => {
    const saved = ZPP_Vec3._wrapFn;
    try {
      ZPP_Vec3._wrapFn = null;
      const z = new ZPP_Vec3();
      expect(z.wrapper()).toBeNull();
      expect(z.outer).toBeNull();
    } finally {
      ZPP_Vec3._wrapFn = saved;
    }
  });

  it("an immutable inner makes the wrapper read-only", () => {
    const z = new ZPP_Vec3();
    z.immutable = true;
    const w = z.wrapper();
    expect(() => {
      w.x = 1;
    }).toThrow("Vec3 is immutable");
    expect(z.x).toBe(0);
  });
});
