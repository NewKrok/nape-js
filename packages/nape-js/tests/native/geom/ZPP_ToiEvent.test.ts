/**
 * ZPP_ToiEvent — direct unit coverage of the CCD event pool object.
 *
 * Issue #165 lists ZPP_ToiEvent as untested. The class is purely internal
 * (used by ZPP_Space + ZPP_SweepDistance during continuous collision
 * detection); there is no public surface, so we test its instance state,
 * field defaults, and alloc/free contract directly.
 */

import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZPP_ToiEvent } from "../../../src/native/geom/ZPP_ToiEvent";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";

describe("ZPP_ToiEvent", () => {
  describe("constructor", () => {
    it("initialises all scalar fields to their documented defaults", () => {
      const e = new ZPP_ToiEvent();
      expect(e.toi).toBe(0.0);
      expect(e.s1).toBe(null);
      expect(e.s2).toBe(null);
      expect(e.arbiter).toBe(null);
      expect(e.frozen1).toBe(false);
      expect(e.frozen2).toBe(false);
      expect(e.slipped).toBe(false);
      expect(e.failed).toBe(false);
      expect(e.kinematic).toBe(false);
      expect(e.next).toBe(null);
    });

    it("creates fresh ZPP_Vec2 instances for c1, c2 and axis", () => {
      const e = new ZPP_ToiEvent();
      expect(e.c1).toBeInstanceOf(ZPP_Vec2);
      expect(e.c2).toBeInstanceOf(ZPP_Vec2);
      expect(e.axis).toBeInstanceOf(ZPP_Vec2);
      // The three vectors must be distinct objects, not aliases.
      expect(e.c1).not.toBe(e.c2);
      expect(e.c1).not.toBe(e.axis);
      expect(e.c2).not.toBe(e.axis);
    });

    it("each constructed Vec2 starts at the origin", () => {
      const e = new ZPP_ToiEvent();
      expect(e.c1.x).toBe(0);
      expect(e.c1.y).toBe(0);
      expect(e.c2.x).toBe(0);
      expect(e.c2.y).toBe(0);
      expect(e.axis.x).toBe(0);
      expect(e.axis.y).toBe(0);
    });
  });

  describe("alloc()", () => {
    it("resets failed, s1, s2 and arbiter for reuse from the pool", () => {
      const e = new ZPP_ToiEvent();
      // Simulate a previously-used event holding stale state.
      e.failed = true;
      e.s1 = { tag: "shape1" } as any;
      e.s2 = { tag: "shape2" } as any;
      e.arbiter = { tag: "arb" } as any;
      e.alloc();
      expect(e.failed).toBe(false);
      expect(e.s1).toBe(null);
      expect(e.s2).toBe(null);
      expect(e.arbiter).toBe(null);
    });

    it("resets slipped but not fields the consumers always rewrite", () => {
      const e = new ZPP_ToiEvent();
      const c1Ref = e.c1;
      const c2Ref = e.c2;
      const axisRef = e.axis;
      e.toi = 0.42;
      e.frozen1 = true;
      e.frozen2 = true;
      e.slipped = true;
      e.kinematic = true;
      e.alloc();
      // slipped MUST reset: the sweeps only ever set it to true, so a pooled
      // event would otherwise leak a stale slip into its next life (this made
      // same-process simulations diverge run-to-run). toi/frozen*/kinematic
      // are unconditionally rewritten by every consumer before being read.
      expect(e.slipped).toBe(false);
      expect(e.toi).toBe(0.42);
      expect(e.frozen1).toBe(true);
      expect(e.frozen2).toBe(true);
      expect(e.kinematic).toBe(true);
      // Vec2 references are preserved across alloc.
      expect(e.c1).toBe(c1Ref);
      expect(e.c2).toBe(c2Ref);
      expect(e.axis).toBe(axisRef);
    });
  });

  describe("free()", () => {
    it("is a no-op (does not throw and leaves state untouched)", () => {
      const e = new ZPP_ToiEvent();
      e.toi = 0.5;
      e.failed = true;
      e.s1 = { tag: "x" } as any;
      e.free();
      expect(e.toi).toBe(0.5);
      expect(e.failed).toBe(true);
      expect(e.s1).not.toBe(null);
    });
  });

  describe("static pool", () => {
    it("starts as null and accepts assignment of an event for pool reuse", () => {
      // We don't reset the pool at end-of-test because nothing else reads it
      // in this file. Just verify the static slot exists and is writable.
      const saved = ZPP_ToiEvent.zpp_pool;
      try {
        ZPP_ToiEvent.zpp_pool = null;
        expect(ZPP_ToiEvent.zpp_pool).toBe(null);
        const e = new ZPP_ToiEvent();
        ZPP_ToiEvent.zpp_pool = e;
        expect(ZPP_ToiEvent.zpp_pool).toBe(e);
      } finally {
        ZPP_ToiEvent.zpp_pool = saved;
      }
    });
  });
});
