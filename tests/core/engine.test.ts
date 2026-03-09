import { describe, it, expect } from "vitest";
import { getNape, ensureEnumsReady } from "../../src/core/engine";
import { BodyType } from "../../src/phys/BodyType";
import { ShapeType } from "../../src/shape/ShapeType";
import { ArbiterType } from "../../src/dynamics/ArbiterType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { ListenerType } from "../../src/callbacks/ListenerType";

describe("engine", () => {
  describe("getNape()", () => {
    it("returns a valid namespace object", () => {
      const nape = getNape();
      expect(nape).toBeDefined();
      expect(typeof nape).toBe("object");
      expect(nape).not.toBeNull();
    });

    it("has expected sub-namespaces", () => {
      const nape = getNape();
      expect(nape.callbacks).toBeDefined();
      expect(nape.dynamics).toBeDefined();
      expect(nape.phys).toBeDefined();
      expect(nape.shape).toBeDefined();
      expect(nape.geom).toBeDefined();
      expect(nape.space).toBeDefined();
      expect(nape.constraint).toBeDefined();
    });

    it("returns the same object on multiple calls (singleton)", () => {
      const first = getNape();
      const second = getNape();
      expect(first).toBe(second);
    });

    it("has __zpp internal namespace", () => {
      const nape = getNape();
      expect(nape.__zpp).toBeDefined();
      expect(typeof nape.__zpp).toBe("object");
    });
  });

  describe("ensureEnumsReady()", () => {
    it("does not throw", () => {
      expect(() => ensureEnumsReady()).not.toThrow();
    });

    it("makes BodyType enum singletons available", () => {
      ensureEnumsReady();
      expect(BodyType.DYNAMIC).toBeDefined();
      expect(BodyType.STATIC).toBeDefined();
      expect(BodyType.KINEMATIC).toBeDefined();
    });

    it("makes ShapeType enum singletons available", () => {
      ensureEnumsReady();
      expect(ShapeType.CIRCLE).toBeDefined();
      expect(ShapeType.POLYGON).toBeDefined();
    });

    it("makes ArbiterType enum singletons available", () => {
      ensureEnumsReady();
      expect(ArbiterType.COLLISION).toBeDefined();
      expect(ArbiterType.FLUID).toBeDefined();
      expect(ArbiterType.SENSOR).toBeDefined();
    });

    it("makes CbEvent enum singletons available", () => {
      ensureEnumsReady();
      expect(CbEvent.BEGIN).toBeDefined();
      expect(CbEvent.END).toBeDefined();
      expect(CbEvent.PRE).toBeDefined();
      expect(CbEvent.ONGOING).toBeDefined();
      expect(CbEvent.WAKE).toBeDefined();
      expect(CbEvent.SLEEP).toBeDefined();
    });

    it("makes ListenerType enum singletons available", () => {
      ensureEnumsReady();
      expect(ListenerType.BODY).toBeDefined();
      expect(ListenerType.CONSTRAINT).toBeDefined();
      expect(ListenerType.INTERACTION).toBeDefined();
      expect(ListenerType.PRE).toBeDefined();
    });

    it("is idempotent (safe to call multiple times)", () => {
      ensureEnumsReady();
      ensureEnumsReady();
      // Should still work — singletons remain valid
      expect(BodyType.DYNAMIC).toBeDefined();
      expect(ShapeType.CIRCLE).toBeDefined();
    });
  });
});
