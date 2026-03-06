import { describe, it, expect } from "vitest";
import {
  Reflect,
  Std,
  StringTools,
  js,
  HaxeError,
  jsBoot,
  $estr,
  $bind,
} from "../../src/core/HaxeShims";

describe("HaxeShims", () => {

  describe("Reflect", () => {
    it("field should access object properties", () => {
      expect(Reflect.field({ a: 1 }, "a")).toBe(1);
      expect(Reflect.field({ a: 1 }, "b")).toBeUndefined();
    });

    it("field should return null on error", () => {
      expect(Reflect.field(null, "x")).toBeNull();
    });

    it("fields should return own enumerable keys", () => {
      const obj = { x: 1, y: 2 };
      expect(Reflect.fields(obj).sort()).toEqual(["x", "y"]);
    });

    it("fields should skip __id__ and hx__closures__", () => {
      const obj = { a: 1, __id__: "skip", hx__closures__: "skip" };
      expect(Reflect.fields(obj)).toEqual(["a"]);
    });

    it("fields of null should return empty array", () => {
      expect(Reflect.fields(null)).toEqual([]);
    });

    it("copy should shallow-copy an object", () => {
      const orig = { x: 10, y: 20 };
      const copy = Reflect.copy(orig);
      expect(copy).toEqual(orig);
      expect(copy).not.toBe(orig);
    });

    it("copy of null should return null", () => {
      expect(Reflect.copy(null)).toBeNull();
    });
  });

  describe("Std", () => {
    it("string should convert values to strings", () => {
      expect(Std.string(null)).toBe("null");
      expect(Std.string(42)).toBe("42");
      expect(Std.string("hello")).toBe("hello");
    });
  });

  describe("StringTools", () => {
    it("hex should convert number to hex string", () => {
      expect(StringTools.hex(255)).toBe("FF");
      expect(StringTools.hex(0)).toBe("0");
      expect(StringTools.hex(16)).toBe("10");
    });

    it("hex should pad to minimum digits", () => {
      expect(StringTools.hex(15, 4)).toBe("000F");
      expect(StringTools.hex(255, 2)).toBe("FF");
      expect(StringTools.hex(0, 2)).toBe("00");
    });
  });

  describe("HaxeError", () => {
    it("should extend Error", () => {
      const err = new HaxeError("test");
      expect(err).toBeInstanceOf(Error);
    });

    it("should store val", () => {
      const err = new HaxeError({ code: 42 });
      expect(err.val).toEqual({ code: 42 });
    });
  });

  describe("js namespace", () => {
    it("should have _Boot.HaxeError", () => {
      expect(js._Boot.HaxeError).toBe(HaxeError);
    });

    it("should have Boot with __string_rec", () => {
      expect(typeof js.Boot.__string_rec).toBe("function");
    });
  });

  describe("jsBoot.__string_rec", () => {
    it("should handle null", () => {
      expect(jsBoot.__string_rec(null, "")).toBe("null");
    });

    it("should handle strings", () => {
      expect(jsBoot.__string_rec("hi", "")).toBe("hi");
    });

    it("should handle numbers", () => {
      expect(jsBoot.__string_rec(42, "")).toBe("42");
    });

    it("should handle arrays", () => {
      expect(jsBoot.__string_rec([1, 2, 3], "")).toBe("[1,2,3]");
    });

    it("should handle functions", () => {
      expect(jsBoot.__string_rec(() => {}, "")).toBe("<function>");
    });

    it("should handle deep recursion", () => {
      expect(jsBoot.__string_rec({}, "\t\t\t\t\t")).toBe("<...>");
    });
  });

  describe("$estr", () => {
    it("should convert this to string via __string_rec", () => {
      const obj = { toString: () => "custom" };
      expect($estr.call(obj)).toBe("custom");
    });
  });

  describe("$bind", () => {
    it("should bind a method to a scope", () => {
      const obj = { value: 42 };
      const method = function () {
        return this.value;
      };
      const bound = $bind(obj, method);
      expect(bound()).toBe(42);
    });
  });
});
