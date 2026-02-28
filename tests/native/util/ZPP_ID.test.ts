import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_ID } from "../../../src/native/util/ZPP_ID";

describe("ZPP_ID", () => {
  beforeEach(() => {
    // Reset all counters before each test
    ZPP_ID._Constraint = 0;
    ZPP_ID._Interactor = 0;
    ZPP_ID._CbType = 0;
    ZPP_ID._CbSet = 0;
    ZPP_ID._Listener = 0;
    ZPP_ID._ZPP_SimpleVert = 0;
    ZPP_ID._ZPP_SimpleSeg = 0;
    ZPP_ID._Space = 0;
    ZPP_ID._InteractionGroup = 0;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_ID.__name__).toEqual(["zpp_nape", "ZPP_ID"]);
    });
  });

  describe("__class__", () => {
    it("should reference ZPP_ID", () => {
      const inst = new ZPP_ID();
      expect(inst.__class__).toBe(ZPP_ID);
    });
  });

  describe("Constraint", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.Constraint()).toBe(0);
      expect(ZPP_ID.Constraint()).toBe(1);
      expect(ZPP_ID.Constraint()).toBe(2);
    });
  });

  describe("Interactor", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.Interactor()).toBe(0);
      expect(ZPP_ID.Interactor()).toBe(1);
    });
  });

  describe("CbType", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.CbType()).toBe(0);
      expect(ZPP_ID.CbType()).toBe(1);
    });
  });

  describe("CbSet", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.CbSet()).toBe(0);
      expect(ZPP_ID.CbSet()).toBe(1);
    });
  });

  describe("Listener", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.Listener()).toBe(0);
      expect(ZPP_ID.Listener()).toBe(1);
    });
  });

  describe("ZPP_SimpleVert", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.ZPP_SimpleVert()).toBe(0);
      expect(ZPP_ID.ZPP_SimpleVert()).toBe(1);
    });
  });

  describe("ZPP_SimpleSeg", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.ZPP_SimpleSeg()).toBe(0);
      expect(ZPP_ID.ZPP_SimpleSeg()).toBe(1);
    });
  });

  describe("Space", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.Space()).toBe(0);
      expect(ZPP_ID.Space()).toBe(1);
    });
  });

  describe("InteractionGroup", () => {
    it("should return monotonically increasing IDs", () => {
      expect(ZPP_ID.InteractionGroup()).toBe(0);
      expect(ZPP_ID.InteractionGroup()).toBe(1);
    });
  });

  describe("counter independence", () => {
    it("should maintain independent counters", () => {
      ZPP_ID.Constraint();
      ZPP_ID.Constraint();
      expect(ZPP_ID.Interactor()).toBe(0);
      expect(ZPP_ID.Constraint()).toBe(2);
    });
  });
});
