import { describe, it, expect } from "vitest";
import { ZPP_UserBody } from "../../../src/native/constraint/ZPP_UserBody";

describe("ZPP_UserBody", () => {
  describe("constructor", () => {
    it("should store cnt and body passed to constructor", () => {
      const body = { name: "body1" };
      const ub = new ZPP_UserBody(3, body);
      expect(ub.cnt).toBe(3);
      expect(ub.body).toBe(body);
    });

    it("should accept zero count", () => {
      const body = { name: "body" };
      const ub = new ZPP_UserBody(0, body);
      expect(ub.cnt).toBe(0);
      expect(ub.body).toBe(body);
    });

    it("should accept null body", () => {
      const ub = new ZPP_UserBody(5, null);
      expect(ub.cnt).toBe(5);
      expect(ub.body).toBeNull();
    });
  });

  describe("mutation", () => {
    it("should allow cnt to be incremented", () => {
      const ub = new ZPP_UserBody(1, { name: "x" });
      ub.cnt++;
      ub.cnt++;
      expect(ub.cnt).toBe(3);
    });

    it("should allow body to be reassigned", () => {
      const b1 = { id: 1 };
      const b2 = { id: 2 };
      const ub = new ZPP_UserBody(1, b1);
      ub.body = b2;
      expect(ub.body).toBe(b2);
    });
  });

  describe("instance independence", () => {
    it("two instances should hold independent state", () => {
      const a = new ZPP_UserBody(1, { id: "a" });
      const b = new ZPP_UserBody(2, { id: "b" });
      a.cnt = 10;
      expect(b.cnt).toBe(2);
      expect(a.body).not.toBe(b.body);
    });
  });
});
