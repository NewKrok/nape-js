import { describe, it, expect } from "vitest";
import { Vec2 } from "../../src/geom/Vec2";
import { getNape } from "../../src/core/engine";

function makeList() {
  const nape = getNape();
  return new nape.geom.Vec2List();
}

describe("Vec2List", () => {
  describe("construction", () => {
    it("should create an empty list via nape namespace", () => {
      const list = makeList();
      expect(list).toBeDefined();
      expect(list.length).toBe(0);
      expect(list.empty()).toBe(true);
    });
  });

  describe("push / unshift", () => {
    it("should push elements to the end", () => {
      const list = makeList();
      const v1 = new Vec2(1, 2);
      const v2 = new Vec2(3, 4);
      list.push(v1);
      list.push(v2);
      expect(list.length).toBe(2);
      expect(list.at(0).x).toBe(1);
      expect(list.at(1).x).toBe(3);
    });

    it("should unshift elements to the front", () => {
      const list = makeList();
      const v1 = new Vec2(1, 2);
      const v2 = new Vec2(3, 4);
      list.push(v1);
      list.unshift(v2);
      expect(list.length).toBe(2);
      expect(list.at(0).x).toBe(3);
      expect(list.at(1).x).toBe(1);
    });

    it("push and unshift return true on success", () => {
      const list = makeList();
      expect(list.push(new Vec2(1, 2))).toBe(true);
      expect(list.unshift(new Vec2(3, 4))).toBe(true);
    });
  });

  describe("pop / shift", () => {
    it("should pop the last element", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.push(new Vec2(3, 4));
      const popped = list.pop();
      expect(popped.x).toBe(3);
      expect(popped.y).toBe(4);
      expect(list.length).toBe(1);
    });

    it("should shift the first element", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.push(new Vec2(3, 4));
      const shifted = list.shift();
      expect(shifted.x).toBe(1);
      expect(shifted.y).toBe(2);
      expect(list.length).toBe(1);
    });

    it("should throw when popping from empty list", () => {
      const list = makeList();
      expect(() => list.pop()).toThrow("Cannot remove from empty list");
    });

    it("should throw when shifting from empty list", () => {
      const list = makeList();
      expect(() => list.shift()).toThrow("Cannot remove from empty list");
    });
  });

  describe("at", () => {
    it("should access elements by index", () => {
      const list = makeList();
      list.push(new Vec2(10, 20));
      list.push(new Vec2(30, 40));
      list.push(new Vec2(50, 60));
      expect(list.at(0).x).toBe(10);
      expect(list.at(1).x).toBe(30);
      expect(list.at(2).x).toBe(50);
    });

    it("should throw for negative index", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      expect(() => list.at(-1)).toThrow("Index out of bounds");
    });

    it("should throw for index >= length", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      expect(() => list.at(1)).toThrow("Index out of bounds");
    });

    it("should throw for index on empty list", () => {
      const list = makeList();
      expect(() => list.at(0)).toThrow("Index out of bounds");
    });
  });

  describe("has", () => {
    it("should return true when element exists", () => {
      const list = makeList();
      const v = new Vec2(5, 6);
      list.push(v);
      expect(list.has(v)).toBe(true);
    });

    it("should return false when element does not exist", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      const other = new Vec2(1, 2);
      expect(list.has(other)).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove an existing element and return true", () => {
      const list = makeList();
      const v1 = new Vec2(1, 2);
      const v2 = new Vec2(3, 4);
      list.push(v1);
      list.push(v2);
      expect(list.remove(v1)).toBe(true);
      expect(list.length).toBe(1);
      expect(list.at(0).x).toBe(3);
    });

    it("should return false when element not found", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      const other = new Vec2(5, 6);
      expect(list.remove(other)).toBe(false);
      expect(list.length).toBe(1);
    });
  });

  describe("clear", () => {
    it("should remove all elements", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.push(new Vec2(3, 4));
      list.push(new Vec2(5, 6));
      list.clear();
      expect(list.length).toBe(0);
      expect(list.empty()).toBe(true);
    });

    it("should be safe to clear an empty list", () => {
      const list = makeList();
      list.clear();
      expect(list.length).toBe(0);
    });
  });

  describe("empty", () => {
    it("should return true for new list", () => {
      expect(makeList().empty()).toBe(true);
    });

    it("should return false after push", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      expect(list.empty()).toBe(false);
    });

    it("should return true after removing all elements", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.pop();
      expect(list.empty()).toBe(true);
    });
  });

  describe("length", () => {
    it("should reflect push and pop operations", () => {
      const list = makeList();
      expect(list.length).toBe(0);
      list.push(new Vec2(1, 1));
      expect(list.length).toBe(1);
      list.push(new Vec2(2, 2));
      expect(list.length).toBe(2);
      list.pop();
      expect(list.length).toBe(1);
      list.shift();
      expect(list.length).toBe(0);
    });
  });

  describe("copy", () => {
    it("should create a shallow copy (same Vec2 references)", () => {
      const list = makeList();
      const v1 = new Vec2(1, 2);
      const v2 = new Vec2(3, 4);
      list.push(v1);
      list.push(v2);

      const shallow = list.copy();
      expect(shallow.length).toBe(2);
      // Shallow copy shares the same underlying ZPP_Vec2, so modifying
      // the original Vec2 coordinates is visible through the copy's wrappers
      expect(shallow.at(0).x).toBe(1);
      expect(shallow.at(1).x).toBe(3);
    });

    it("should create a deep copy with independent Vec2 objects", () => {
      const list = makeList();
      const v1 = new Vec2(10, 20);
      const v2 = new Vec2(30, 40);
      list.push(v1);
      list.push(v2);

      const deep = list.copy(true);
      expect(deep.length).toBe(2);
      expect(deep.at(0).x).toBe(10);
      expect(deep.at(0).y).toBe(20);
      expect(deep.at(1).x).toBe(30);
      expect(deep.at(1).y).toBe(40);

      // Modifying the deep copy should not affect the original
      deep.at(0).x = 999;
      expect(v1.x).toBe(10);
    });
  });

  describe("merge", () => {
    it("should merge another list, skipping duplicates", () => {
      const list1 = makeList();
      const v1 = new Vec2(1, 2);
      const v2 = new Vec2(3, 4);
      list1.push(v1);
      list1.push(v2);

      const list2 = makeList();
      const v3 = new Vec2(5, 6);
      list2.push(v1); // duplicate (same reference)
      list2.push(v3);

      list1.merge(list2);
      // v1 is already in list1, so only v3 is added
      expect(list1.length).toBe(3);
      expect(list1.has(v3)).toBe(true);
    });

    it("should throw when merging with null", () => {
      const list = makeList();
      expect(() => list.merge(null)).toThrow("Cannot merge with null list");
    });
  });

  describe("iterator / hasNext / next", () => {
    it("should iterate over all elements in order", () => {
      const list = makeList();
      list.push(new Vec2(1, 0));
      list.push(new Vec2(2, 0));
      list.push(new Vec2(3, 0));

      const values: number[] = [];
      const it = list.iterator();
      while (it.hasNext()) {
        values.push(it.next().x);
      }
      expect(values).toEqual([1, 2, 3]);
    });

    it("should return no elements for empty list", () => {
      const list = makeList();
      const it = list.iterator();
      expect(it.hasNext()).toBe(false);
    });
  });

  describe("Symbol.iterator (for...of)", () => {
    it("should support for...of loop", () => {
      const list = makeList();
      list.push(new Vec2(10, 0));
      list.push(new Vec2(20, 0));
      list.push(new Vec2(30, 0));

      const values: number[] = [];
      for (const v of list) {
        values.push(v.x);
      }
      expect(values).toEqual([10, 20, 30]);
    });

    it("should support spread operator", () => {
      const list = makeList();
      list.push(new Vec2(1, 0));
      list.push(new Vec2(2, 0));

      const arr = [...list];
      expect(arr.length).toBe(2);
      expect(arr[0].x).toBe(1);
      expect(arr[1].x).toBe(2);
    });

    it("should produce no elements for empty list", () => {
      const list = makeList();
      const values: number[] = [];
      for (const v of list) {
        values.push(v.x);
      }
      expect(values).toEqual([]);
    });
  });

  describe("foreach", () => {
    it("should call lambda for each element", () => {
      const list = makeList();
      list.push(new Vec2(1, 0));
      list.push(new Vec2(2, 0));
      list.push(new Vec2(3, 0));

      const values: number[] = [];
      list.foreach((v: any) => values.push(v.x));
      expect(values).toEqual([1, 2, 3]);
    });

    it("should return the list for chaining", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      const result = list.foreach(() => {});
      expect(result).toBe(list);
    });

    it("should throw when lambda is null", () => {
      const list = makeList();
      expect(() => list.foreach(null)).toThrow(
        "Cannot execute null on list elements",
      );
    });
  });

  describe("filter", () => {
    it("should keep only elements matching the predicate", () => {
      const list = makeList();
      list.push(new Vec2(1, 0));
      list.push(new Vec2(2, 0));
      list.push(new Vec2(3, 0));
      list.push(new Vec2(4, 0));

      list.filter((v: any) => v.x > 2);
      expect(list.length).toBe(2);
      expect(list.at(0).x).toBe(3);
      expect(list.at(1).x).toBe(4);
    });

    it("should return the list for chaining", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      const result = list.filter(() => true);
      expect(result).toBe(list);
    });

    it("should throw when lambda is null", () => {
      const list = makeList();
      expect(() => list.filter(null)).toThrow(
        "Cannot select elements of list with null",
      );
    });

    it("should handle filtering all elements out", () => {
      const list = makeList();
      list.push(new Vec2(1, 0));
      list.push(new Vec2(2, 0));
      list.filter(() => false);
      expect(list.length).toBe(0);
    });
  });

  describe("toString", () => {
    it("should produce string representation of elements", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.push(new Vec2(3, 4));
      const str = list.toString();
      expect(str).toMatch(/^\[/);
      expect(str).toMatch(/\]$/);
      // Should contain coordinate info for both elements
      expect(str).toContain("1");
      expect(str).toContain("2");
      expect(str).toContain("3");
      expect(str).toContain("4");
    });

    it("should return [] for empty list", () => {
      const list = makeList();
      expect(list.toString()).toBe("[]");
    });
  });

  describe("fromArray", () => {
    it("should create a list from an array of Vec2", () => {
      const nape = getNape();
      const arr = [new Vec2(1, 2), new Vec2(3, 4), new Vec2(5, 6)];
      const list = nape.geom.Vec2List.fromArray(arr);
      expect(list.length).toBe(3);
      expect(list.at(0).x).toBe(1);
      expect(list.at(1).x).toBe(3);
      expect(list.at(2).x).toBe(5);
    });

    it("should throw when array is null", () => {
      const nape = getNape();
      expect(() => nape.geom.Vec2List.fromArray(null)).toThrow(
        "Cannot convert null Array to Nape list",
      );
    });

    it("should create an empty list from empty array", () => {
      const nape = getNape();
      const list = nape.geom.Vec2List.fromArray([]);
      expect(list.length).toBe(0);
      expect(list.empty()).toBe(true);
    });
  });

  describe("immutability errors", () => {
    it("should throw on push when list is immutable", () => {
      const list = makeList();
      list.zpp_inner.immutable = true;
      expect(() => list.push(new Vec2(1, 2))).toThrow(
        "Vec2List is immutable",
      );
    });

    it("should throw on unshift when list is immutable", () => {
      const list = makeList();
      list.zpp_inner.immutable = true;
      expect(() => list.unshift(new Vec2(1, 2))).toThrow(
        "Vec2List is immutable",
      );
    });

    it("should throw on pop when list is immutable", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.zpp_inner.immutable = true;
      expect(() => list.pop()).toThrow("Vec2List is immutable");
    });

    it("should throw on shift when list is immutable", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.zpp_inner.immutable = true;
      expect(() => list.shift()).toThrow("Vec2List is immutable");
    });

    it("should throw on remove when list is immutable", () => {
      const list = makeList();
      const v = new Vec2(1, 2);
      list.push(v);
      list.zpp_inner.immutable = true;
      expect(() => list.remove(v)).toThrow("Vec2List is immutable");
    });

    it("should throw on clear when list is immutable", () => {
      const list = makeList();
      list.push(new Vec2(1, 2));
      list.zpp_inner.immutable = true;
      expect(() => list.clear()).toThrow("Vec2List is immutable");
    });
  });
});
