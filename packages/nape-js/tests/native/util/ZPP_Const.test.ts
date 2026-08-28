import { describe, it, expect } from "vitest";
import { ZPP_Const } from "../../../src/native/util/ZPP_Const";

describe("ZPP_Const", () => {
  describe("FMAX", () => {
    it("should be 1e100", () => {
      expect(ZPP_Const.FMAX).toBe(1e100);
    });
  });
});
