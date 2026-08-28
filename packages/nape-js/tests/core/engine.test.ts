import { describe, it, expect } from "vitest";
import { getNape } from "../../src/core/engine";
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

  describe("enum singletons (lazy)", () => {
    it("makes BodyType enum singletons available", () => {
      expect(BodyType.STATIC).not.toBeNull();
      expect(BodyType.DYNAMIC).not.toBeNull();
      expect(BodyType.KINEMATIC).not.toBeNull();
    });

    it("makes ShapeType enum singletons available", () => {
      expect(ShapeType.CIRCLE).not.toBeNull();
      expect(ShapeType.POLYGON).not.toBeNull();
    });

    it("makes ArbiterType enum singletons available", () => {
      expect(ArbiterType.COLLISION).not.toBeNull();
      expect(ArbiterType.SENSOR).not.toBeNull();
      expect(ArbiterType.FLUID).not.toBeNull();
    });

    it("makes CbEvent enum singletons available", () => {
      expect(CbEvent.BEGIN).not.toBeNull();
      expect(CbEvent.END).not.toBeNull();
      expect(CbEvent.ONGOING).not.toBeNull();
    });

    it("makes ListenerType enum singletons available", () => {
      expect(ListenerType.BODY).not.toBeNull();
      expect(ListenerType.PRE).not.toBeNull();
    });

    it("returns the same singleton on repeated access", () => {
      expect(BodyType.STATIC).toBe(BodyType.STATIC);
      expect(CbEvent.BEGIN).toBe(CbEvent.BEGIN);
    });
  });
});
