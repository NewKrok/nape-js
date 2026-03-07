import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { getNape } from "../../../src/core/engine";
import { ZNPList } from "../../../src/native/util/ZNPList";

describe("ZNPList", () => {
  let ListClass: any;
  let NodeClass: any;

  beforeEach(() => {
    const zpp = getNape().__zpp;
    ListClass = zpp.util.ZNPList_ZPP_Body;
    NodeClass = zpp.util.ZNPNode_ZPP_Body;
    NodeClass.zpp_pool = null;
  });

  it("instances should be instanceof ZNPList", () => {
    const list = new ListClass();
    expect(list).toBeInstanceOf(ZNPList);
  });

  describe("add / front / back / size", () => {
    it("should add elements to the front", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      expect(list.front()).toBe("b");
      expect(list.back()).toBe("a");
      expect(list.size()).toBe(2);
      expect(list.length).toBe(2);
    });
  });

  describe("begin / empty", () => {
    it("empty list should have null begin", () => {
      const list = new ListClass();
      expect(list.begin()).toBeNull();
      expect(list.empty()).toBe(true);
    });

    it("non-empty list should return head from begin()", () => {
      const list = new ListClass();
      list.add("x");
      expect(list.begin()).not.toBeNull();
      expect(list.begin().elt).toBe("x");
      expect(list.empty()).toBe(false);
    });
  });

  describe("pop / pop_unsafe", () => {
    it("should remove the head element", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      list.pop();
      expect(list.front()).toBe("a");
      expect(list.size()).toBe(1);
    });

    it("pop_unsafe should return the removed element", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      expect(list.pop_unsafe()).toBe("b");
      expect(list.size()).toBe(1);
    });
  });

  describe("remove / try_remove", () => {
    it("should remove a specific element", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      list.add("c");
      list.remove("b");
      expect(list.size()).toBe(2);
      expect(list.has("b")).toBe(false);
    });

    it("try_remove should return true when found", () => {
      const list = new ListClass();
      list.add("a");
      expect(list.try_remove("a")).toBe(true);
      expect(list.size()).toBe(0);
    });

    it("try_remove should return false when not found", () => {
      const list = new ListClass();
      list.add("a");
      expect(list.try_remove("z")).toBe(false);
    });
  });

  describe("has", () => {
    it("should find existing elements", () => {
      const list = new ListClass();
      list.add("x");
      expect(list.has("x")).toBe(true);
      expect(list.has("y")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should empty the list", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      list.clear();
      expect(list.empty()).toBe(true);
      expect(list.size()).toBe(0);
    });
  });

  describe("reverse", () => {
    it("should reverse element order", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      list.add("c");
      list.reverse();
      expect(list.front()).toBe("a");
      expect(list.back()).toBe("c");
    });
  });

  describe("at / iterator_at", () => {
    it("should access elements by index", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      list.add("c");
      expect(list.at(0)).toBe("c");
      expect(list.at(1)).toBe("b");
      expect(list.at(2)).toBe("a");
    });

    it("at() should return null for out-of-range", () => {
      const list = new ListClass();
      expect(list.at(0)).toBeNull();
    });
  });

  describe("insert / erase", () => {
    it("insert after null should prepend", () => {
      const list = new ListClass();
      list.add("a");
      list.insert(null, "z");
      expect(list.front()).toBe("z");
    });

    it("insert after node should place after it", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      const head = list.begin();
      list.insert(head, "mid");
      expect(list.at(0)).toBe("b");
      expect(list.at(1)).toBe("mid");
      expect(list.at(2)).toBe("a");
    });

    it("erase should remove head when pre is null", () => {
      const list = new ListClass();
      list.add("a");
      list.add("b");
      list.erase(null);
      expect(list.size()).toBe(1);
      expect(list.front()).toBe("a");
    });
  });

  describe("addAll", () => {
    it("should add all elements from another list", () => {
      const list1 = new ListClass();
      list1.add("a");
      list1.add("b");
      const list2 = new ListClass();
      list2.addAll(list1);
      expect(list2.size()).toBe(2);
      expect(list2.has("a")).toBe(true);
      expect(list2.has("b")).toBe(true);
    });
  });

  describe("pool reuse", () => {
    it("popped nodes should be returned to the pool", () => {
      NodeClass.zpp_pool = null;
      const list = new ListClass();
      list.add("a");
      list.pop();
      expect(NodeClass.zpp_pool).not.toBeNull();
    });
  });

  describe("inlined aliases", () => {
    it("should have all inlined method aliases", () => {
      const list = new ListClass();
      expect(list.inlined_add).toBe(list.add);
      expect(list.inlined_insert).toBe(list.insert);
      expect(list.inlined_pop).toBe(list.pop);
      expect(list.inlined_pop_unsafe).toBe(list.pop_unsafe);
      expect(list.inlined_erase).toBe(list.erase);
      expect(list.inlined_remove).toBe(list.remove);
      expect(list.inlined_try_remove).toBe(list.try_remove);
      expect(list.inlined_clear).toBe(list.clear);
      expect(list.inlined_has).toBe(list.has);
    });
  });
});
