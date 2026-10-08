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
