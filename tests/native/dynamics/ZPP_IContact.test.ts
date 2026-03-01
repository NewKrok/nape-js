import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_IContact } from "../../../src/native/dynamics/ZPP_IContact";

describe("ZPP_IContact", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_IContact.__name__).toEqual([
        "zpp_nape",
        "dynamics",
        "ZPP_IContact",
      ]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const c = new ZPP_IContact();
      // Linked list fields
      expect(c.length).toBe(0);
      expect(c.pushmod).toBe(false);
      expect(c.modified).toBe(false);
      expect(c._inuse).toBe(false);
      expect(c.next).toBeNull();
      // Relative positions
      expect(c.r1x).toBe(0.0);
      expect(c.r1y).toBe(0.0);
      expect(c.r2x).toBe(0.0);
      expect(c.r2y).toBe(0.0);
      // Mass matrices
      expect(c.nMass).toBe(0.0);
      expect(c.tMass).toBe(0.0);
      // Coefficients
      expect(c.bounce).toBe(0.0);
      expect(c.friction).toBe(0.0);
      // Accumulated impulses
      expect(c.jnAcc).toBe(0.0);
      expect(c.jtAcc).toBe(0.0);
      // Last-frame relative positions
      expect(c.lr1x).toBe(0.0);
      expect(c.lr1y).toBe(0.0);
      expect(c.lr2x).toBe(0.0);
      expect(c.lr2y).toBe(0.0);
      // Haxe class reference
      expect(c.__class__).toBe(ZPP_IContact);
    });
  });

  // ---------------------------------------------------------------------------
  // Linked list methods (ZNPList pattern)
  // ---------------------------------------------------------------------------

  describe("linked list — elem/begin", () => {
    it("elem() should return this", () => {
      const c = new ZPP_IContact();
      expect(c.elem()).toBe(c);
    });

    it("begin() should return next", () => {
      const head = new ZPP_IContact();
      expect(head.begin()).toBeNull();

      const node = new ZPP_IContact();
      head.next = node;
      expect(head.begin()).toBe(node);
    });
  });

  describe("linked list — setbegin", () => {
    it("should set next and mark modified", () => {
      const head = new ZPP_IContact();
      const node = new ZPP_IContact();
      head.setbegin(node);
      expect(head.next).toBe(node);
      expect(head.modified).toBe(true);
      expect(head.pushmod).toBe(true);
    });

    it("should accept null to clear", () => {
      const head = new ZPP_IContact();
      head.next = new ZPP_IContact();
      head.setbegin(null);
      expect(head.next).toBeNull();
    });
  });

  describe("linked list — add", () => {
    it("should add to front of list", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();

      head.add(a);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
      expect(a._inuse).toBe(true);
      expect(head.modified).toBe(true);

      head.add(b);
      expect(head.next).toBe(b);
      expect(b.next).toBe(a);
      expect(head.length).toBe(2);
    });

    it("should return the added element", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      expect(head.add(a)).toBe(a);
    });
  });

  describe("linked list — inlined_add", () => {
    it("should behave identically to add", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.inlined_add(a);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
      expect(a._inuse).toBe(true);
    });
  });

  describe("linked list — insert", () => {
    it("should insert at head when cur is null", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.insert(null, a);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
      expect(head.pushmod).toBe(true);
    });

    it("should insert after cur", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      head.insert(a, b);
      expect(a.next).toBe(b);
      expect(head.length).toBe(2);
    });
  });

  describe("linked list — pop", () => {
    it("should remove and unmark first element", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      head.add(b);
      // list: b -> a
      head.pop();
      expect(head.next).toBe(a);
      expect(b._inuse).toBe(false);
      expect(head.length).toBe(1);
      expect(head.modified).toBe(true);
    });

    it("should set pushmod when list becomes empty", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.add(a);
      head.pushmod = false;
      head.pop();
      expect(head.next).toBeNull();
      expect(head.pushmod).toBe(true);
    });
  });

  describe("linked list — pop_unsafe", () => {
    it("should return the removed element", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.add(a);
      const popped = head.pop_unsafe();
      expect(popped).toBe(a);
      expect(head.length).toBe(0);
    });
  });

  describe("linked list — remove", () => {
    it("should remove element from the list", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      const c = new ZPP_IContact();
      head.add(a);
      head.add(b);
      head.add(c);
      // list: c -> b -> a

      head.remove(b);
      expect(head.length).toBe(2);
      expect(b._inuse).toBe(false);
      expect(c.next).toBe(a);
    });

    it("should remove the head element", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      head.add(b);
      // list: b -> a

      head.remove(b);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
    });

    it("should do nothing if element not found", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const notInList = new ZPP_IContact();
      head.add(a);
      head.remove(notInList);
      expect(head.length).toBe(1);
    });
  });

  describe("linked list — try_remove", () => {
    it("should return true when element found", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.add(a);
      expect(head.try_remove(a)).toBe(true);
      expect(head.length).toBe(0);
    });

    it("should return false when element not found", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      expect(head.try_remove(a)).toBe(false);
    });
  });

  describe("linked list — erase", () => {
    it("should erase head when pre is null", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      head.add(b);
      // list: b -> a

      const next = head.erase(null);
      expect(next).toBe(a);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
      expect(b._inuse).toBe(false);
    });

    it("should erase node after pre", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      const c = new ZPP_IContact();
      head.add(a);
      head.add(b);
      head.add(c);
      // list: c -> b -> a

      const next = head.erase(c);
      expect(next).toBe(a);
      expect(c.next).toBe(a);
      expect(head.length).toBe(2);
    });
  });

  describe("linked list — reverse", () => {
    it("should reverse the list order", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      const c = new ZPP_IContact();
      head.add(a);
      head.add(b);
      head.add(c);
      // list: c -> b -> a

      head.reverse();
      // list: a -> b -> c
      expect(head.next).toBe(a);
      expect(a.next).toBe(b);
      expect(b.next).toBe(c);
      expect(c.next).toBeNull();
      expect(head.modified).toBe(true);
      expect(head.pushmod).toBe(true);
    });
  });

  describe("linked list — queries", () => {
    it("empty() should return true for empty list", () => {
      const head = new ZPP_IContact();
      expect(head.empty()).toBe(true);
    });

    it("empty() should return false for non-empty list", () => {
      const head = new ZPP_IContact();
      head.add(new ZPP_IContact());
      expect(head.empty()).toBe(false);
    });

    it("size() should return length", () => {
      const head = new ZPP_IContact();
      expect(head.size()).toBe(0);
      head.add(new ZPP_IContact());
      expect(head.size()).toBe(1);
    });

    it("has() should find element in list", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      expect(head.has(a)).toBe(true);
      expect(head.has(b)).toBe(false);
    });

    it("front() should return first element", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.add(a);
      expect(head.front()).toBe(a);
    });

    it("front() should return null for empty list", () => {
      const head = new ZPP_IContact();
      expect(head.front()).toBeNull();
    });

    it("back() should return last element", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      head.add(b);
      // list: b -> a
      expect(head.back()).toBe(a);
    });

    it("at() should return element at index", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      head.add(a);
      head.add(b);
      // list: b -> a
      expect(head.at(0)).toBe(b);
      expect(head.at(1)).toBe(a);
    });

    it("at() should return null for out-of-bounds index", () => {
      const head = new ZPP_IContact();
      expect(head.at(0)).toBeNull();
    });

    it("iterator_at() should return element at index", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      head.add(a);
      expect(head.iterator_at(0)).toBe(a);
    });
  });

  describe("linked list — clear/splice", () => {
    it("clear() should be a no-op", () => {
      const head = new ZPP_IContact();
      head.add(new ZPP_IContact());
      head.clear();
      // clear is intentionally a no-op for contact lists
      expect(head.length).toBe(1);
    });

    it("splice() should erase n elements after pre", () => {
      const head = new ZPP_IContact();
      const a = new ZPP_IContact();
      const b = new ZPP_IContact();
      const c = new ZPP_IContact();
      head.add(a);
      head.add(b);
      head.add(c);
      // list: c -> b -> a

      head.splice(c, 2);
      expect(c.next).toBeNull();
      expect(head.length).toBe(1);
    });
  });

  describe("linked list — addAll", () => {
    it("should add elements from another list", () => {
      const head1 = new ZPP_IContact();
      const head2 = new ZPP_IContact();
      const a = new ZPP_IContact();
      head2.add(a);
      // addAll iterates head2.next and calls add() on each.
      // add() rewrites the node's next pointer, so only the first
      // traversal step succeeds when the source list has >1 element.
      head1.addAll(head2);
      expect(head1.length).toBe(1);
      expect(head1.has(a)).toBe(true);
    });
  });
});
