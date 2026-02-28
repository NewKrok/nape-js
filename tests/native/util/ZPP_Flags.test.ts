import { describe, it, expect } from "vitest";
import { ZPP_Flags } from "../../../src/native/util/ZPP_Flags";

describe("ZPP_Flags", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Flags.__name__).toEqual(["zpp_nape", "util", "ZPP_Flags"]);
    });
  });

  describe("__class__", () => {
    it("should reference ZPP_Flags", () => {
      const inst = new ZPP_Flags();
      expect(inst.__class__).toBe(ZPP_Flags);
    });
  });

  describe("static flag fields", () => {
    it("should initialize gravity mass mode flags to null", () => {
      expect(ZPP_Flags.GravMassMode_DEFAULT).toBeNull();
      expect(ZPP_Flags.GravMassMode_FIXED).toBeNull();
      expect(ZPP_Flags.GravMassMode_SCALED).toBeNull();
    });

    it("should initialize inertia mode flags to null", () => {
      expect(ZPP_Flags.InertiaMode_DEFAULT).toBeNull();
      expect(ZPP_Flags.InertiaMode_FIXED).toBeNull();
    });

    it("should initialize mass mode flags to null", () => {
      expect(ZPP_Flags.MassMode_DEFAULT).toBeNull();
      expect(ZPP_Flags.MassMode_FIXED).toBeNull();
    });

    it("should initialize body type flags to null", () => {
      expect(ZPP_Flags.BodyType_STATIC).toBeNull();
      expect(ZPP_Flags.BodyType_DYNAMIC).toBeNull();
      expect(ZPP_Flags.BodyType_KINEMATIC).toBeNull();
    });

    it("should initialize listener type flags to null", () => {
      expect(ZPP_Flags.ListenerType_BODY).toBeNull();
      expect(ZPP_Flags.ListenerType_CONSTRAINT).toBeNull();
      expect(ZPP_Flags.ListenerType_INTERACTION).toBeNull();
      expect(ZPP_Flags.ListenerType_PRE).toBeNull();
    });

    it("should initialize pre flags to null", () => {
      expect(ZPP_Flags.PreFlag_ACCEPT).toBeNull();
      expect(ZPP_Flags.PreFlag_IGNORE).toBeNull();
      expect(ZPP_Flags.PreFlag_ACCEPT_ONCE).toBeNull();
      expect(ZPP_Flags.PreFlag_IGNORE_ONCE).toBeNull();
    });

    it("should initialize callback event flags to null", () => {
      expect(ZPP_Flags.CbEvent_BEGIN).toBeNull();
      expect(ZPP_Flags.CbEvent_ONGOING).toBeNull();
      expect(ZPP_Flags.CbEvent_END).toBeNull();
      expect(ZPP_Flags.CbEvent_WAKE).toBeNull();
      expect(ZPP_Flags.CbEvent_SLEEP).toBeNull();
      expect(ZPP_Flags.CbEvent_BREAK).toBeNull();
      expect(ZPP_Flags.CbEvent_PRE).toBeNull();
    });

    it("should initialize interaction type flags to null", () => {
      expect(ZPP_Flags.InteractionType_COLLISION).toBeNull();
      expect(ZPP_Flags.InteractionType_SENSOR).toBeNull();
      expect(ZPP_Flags.InteractionType_FLUID).toBeNull();
      expect(ZPP_Flags.InteractionType_ANY).toBeNull();
    });

    it("should initialize winding flags to null", () => {
      expect(ZPP_Flags.Winding_UNDEFINED).toBeNull();
      expect(ZPP_Flags.Winding_CLOCKWISE).toBeNull();
      expect(ZPP_Flags.Winding_ANTICLOCKWISE).toBeNull();
    });

    it("should initialize validation result flags to null", () => {
      expect(ZPP_Flags.ValidationResult_VALID).toBeNull();
      expect(ZPP_Flags.ValidationResult_DEGENERATE).toBeNull();
      expect(ZPP_Flags.ValidationResult_CONCAVE).toBeNull();
      expect(ZPP_Flags.ValidationResult_SELF_INTERSECTING).toBeNull();
    });

    it("should initialize shape type flags to null", () => {
      expect(ZPP_Flags.ShapeType_CIRCLE).toBeNull();
      expect(ZPP_Flags.ShapeType_POLYGON).toBeNull();
    });

    it("should initialize broadphase flags to null", () => {
      expect(ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE).toBeNull();
      expect(ZPP_Flags.Broadphase_SWEEP_AND_PRUNE).toBeNull();
    });

    it("should initialize arbiter type flags to null", () => {
      expect(ZPP_Flags.ArbiterType_COLLISION).toBeNull();
      expect(ZPP_Flags.ArbiterType_SENSOR).toBeNull();
      expect(ZPP_Flags.ArbiterType_FLUID).toBeNull();
    });

    it("should initialize internal flag to false", () => {
      expect(ZPP_Flags.internal).toBe(false);
    });
  });

  describe("flag mutability", () => {
    it("should allow setting flag values", () => {
      const original = ZPP_Flags.BodyType_STATIC;
      ZPP_Flags.BodyType_STATIC = { id: 1 };
      expect(ZPP_Flags.BodyType_STATIC).toEqual({ id: 1 });
      ZPP_Flags.BodyType_STATIC = original;
    });
  });
});
