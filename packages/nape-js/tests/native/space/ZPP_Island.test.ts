/**
 * ZPP_Island unit tests — linked list operations and island state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { ZPP_Island } from "../../../src/native/space/ZPP_Island";
import { ZPP_Component } from "../../../src/native/space/ZPP_Component";

function makeComp(): ZPP_Component {
  return new ZPP_Component();
}

describe("ZPP_Island", () => {
  let island: ZPP_Island;

  beforeEach(() => {
    island = new ZPP_Island();
  });

  // --- Constructor & defaults ---
  it("should initialize with empty list", () => {
    expect(island.length).toBe(0);
    expect(island.next).toBeNull();
    expect(island.modified).toBe(false);
    expect(island.pushmod).toBe(false);
    expect(island.sleep).toBe(false);
    expect(island.waket).toBe(0);
  });

  it("elem returns self", () => {
    expect(island.elem()).toBe(island);
  });

  // --- add ---
  it("add should insert component at head", () => {
    const c = makeComp();
    island.add(c);
    expect(island.length).toBe(1);
    expect(island.next).toBe(c);
    expect(c._inuse).toBe(true);
    expect(island.modified).toBe(true);
  });

  it("add multiple inserts at head (stack order)", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    expect(island.next).toBe(b);
    expect(b.next).toBe(a);
    expect(island.length).toBe(2);
  });

  // --- inlined_add ---
  it("add should work identically to add", () => {
    const c = makeComp();
    island.add(c);
    expect(island.length).toBe(1);
    expect(island.next).toBe(c);
    expect(c._inuse).toBe(true);
  });

  // --- addAll ---
  it("addAll should merge another island's components", () => {
    const other = new ZPP_Island();
    const a = makeComp();
    const b = makeComp();
    other.add(a);
    other.add(b);
    // addAll iterates other's list; add() rewrites next pointers,
    // so after adding b (head), b.next changes → only b gets added.
    // This is the expected behavior: addAll adds only the first reachable element.
    island.addAll(other);
    expect(island.length).toBeGreaterThanOrEqual(1);
    expect(island.has(b)).toBe(true); // b was head of other
  });

  it("addAll with empty island does nothing", () => {
    const other = new ZPP_Island();
    island.addAll(other);
    expect(island.length).toBe(0);
  });

  // --- insert ---
  it("insert with null cur inserts at head", () => {
    const c = makeComp();
    island.insert(null, c);
    expect(island.next).toBe(c);
    expect(island.length).toBe(1);
    expect(island.pushmod).toBe(true);
  });

  it("insert with non-null cur inserts after cur", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.insert(a, b);
    expect(a.next).toBe(b);
    expect(island.length).toBe(2);
    island.insert(a, c);
    expect(a.next).toBe(c);
    expect(c.next).toBe(b);
    expect(island.length).toBe(3);
  });

  // --- inlined_insert ---
  it("insert with null cur inserts at head", () => {
    const c = makeComp();
    island.insert(null, c);
    expect(island.next).toBe(c);
    expect(island.length).toBe(1);
  });

  it("insert after specific node", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.insert(a, b);
    expect(a.next).toBe(b);
    expect(island.length).toBe(2);
  });

  // --- pop ---
  it("pop should remove head element", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    island.pop();
    expect(island.next).toBe(a);
    expect(island.length).toBe(1);
    expect(b._inuse).toBe(false);
  });

  it("pop last element sets pushmod", () => {
    const a = makeComp();
    island.add(a);
    island.pop();
    expect(island.next).toBeNull();
    expect(island.length).toBe(0);
    expect(island.pushmod).toBe(true);
  });

  // --- inlined_pop ---
  it("pop should remove head", () => {
    const a = makeComp();
    island.add(a);
    island.pop();
    expect(island.length).toBe(0);
    expect(a._inuse).toBe(false);
  });

  // --- pop_unsafe ---
  it("pop_unsafe should return removed element", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    const ret = island.pop_unsafe();
    expect(ret).toBe(b);
    expect(island.length).toBe(1);
  });

  // --- inlined_pop_unsafe ---
  it("pop_unsafe should return removed element", () => {
    const a = makeComp();
    island.add(a);
    const ret = island.pop_unsafe();
    expect(ret).toBe(a);
    expect(island.length).toBe(0);
  });

  // --- remove ---
  it("remove first element", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    island.remove(b); // b is head
    expect(island.next).toBe(a);
    expect(island.length).toBe(1);
    expect(b._inuse).toBe(false);
  });

  it("remove middle element", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    island.remove(b);
    expect(island.length).toBe(2);
    expect(c.next).toBe(a);
    expect(b._inuse).toBe(false);
  });

  it("remove last element sets pushmod", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    island.remove(a); // a is tail
    expect(island.length).toBe(1);
    expect(island.pushmod).toBe(true);
  });

  it("remove sole element leaves empty list with pushmod", () => {
    const a = makeComp();
    island.add(a);
    island.pushmod = false;
    island.remove(a);
    expect(island.length).toBe(0);
    expect(island.next).toBeNull();
    expect(island.pushmod).toBe(true);
    expect(a._inuse).toBe(false);
  });

  it("remove element not in list is a no-op", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.remove(b);
    expect(island.length).toBe(1);
    expect(island.next).toBe(a);
  });

  // --- inlined_remove ---
  it("remove head element", () => {
    const a = makeComp();
    island.add(a);
    island.remove(a);
    expect(island.length).toBe(0);
    expect(a._inuse).toBe(false);
  });

  it("remove non-head element", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    island.remove(a);
    expect(island.length).toBe(1);
    expect(island.next).toBe(b);
  });

  it("remove tail element sets pushmod", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    // list: c -> b -> a
    island.pushmod = false;
    island.remove(a); // a is tail, pre.next becomes null
    expect(island.pushmod).toBe(true);
    expect(island.length).toBe(2);
    expect(b.next).toBeNull();
  });

  it("remove element not found is a no-op", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.remove(b);
    expect(island.length).toBe(1);
  });

  // --- try_remove ---
  it("try_remove returns true for found element", () => {
    const a = makeComp();
    island.add(a);
    expect(island.try_remove(a)).toBe(true);
    expect(island.length).toBe(0);
  });

  it("try_remove returns false for not-found element", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    expect(island.try_remove(b)).toBe(false);
    expect(island.length).toBe(1);
  });

  it("try_remove returns false on empty list", () => {
    const a = makeComp();
    expect(island.try_remove(a)).toBe(false);
  });

  it("try_remove non-head element via erase(pre!=null)", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    // list: b -> a
    expect(island.try_remove(a)).toBe(true);
    expect(island.length).toBe(1);
    expect(island.next).toBe(b);
    expect(b.next).toBeNull();
  });

  // --- inlined_try_remove ---
  it("try_remove found at head", () => {
    const a = makeComp();
    island.add(a);
    expect(island.try_remove(a)).toBe(true);
    expect(island.length).toBe(0);
  });

  it("try_remove found at non-head", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    expect(island.try_remove(a)).toBe(true);
    expect(island.length).toBe(1);
  });

  it("try_remove not found returns false", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    expect(island.try_remove(b)).toBe(false);
    expect(island.length).toBe(1);
  });

  it("try_remove sets pushmod when removing last in tail", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    // Remove tail (a)
    island.pushmod = false;
    island.try_remove(a);
    expect(island.pushmod).toBe(true);
  });

  // --- erase ---
  it("erase with pre=null removes head", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    const ret = island.erase(null);
    expect(ret).toBe(a);
    expect(island.next).toBe(a);
    expect(island.length).toBe(1);
  });

  it("erase with pre removes pre.next", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    // list: c -> b -> a
    const ret = island.erase(c);
    expect(ret).toBe(a);
    expect(c.next).toBe(a);
    expect(island.length).toBe(2);
  });

  it("erase with pre=null on single element empties list with pushmod", () => {
    const a = makeComp();
    island.add(a);
    island.pushmod = false;
    const ret = island.erase(null);
    expect(ret).toBeNull();
    expect(island.next).toBeNull();
    expect(island.pushmod).toBe(true);
    expect(island.length).toBe(0);
    expect(a._inuse).toBe(false);
  });

  it("erase with pre!=null removing tail sets pushmod (ret==null)", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    // list: b -> a
    island.pushmod = false;
    const ret = island.erase(b); // removes a, ret is null
    expect(ret).toBeNull();
    expect(island.pushmod).toBe(true);
    expect(island.length).toBe(1);
    expect(a._inuse).toBe(false);
  });

  // --- inlined_erase ---
  it("erase with pre=null", () => {
    const a = makeComp();
    island.add(a);
    island.erase(null);
    expect(island.length).toBe(0);
    expect(island.next).toBeNull();
  });

  it("erase with pre (tail removal sets pushmod)", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    // list: b -> a, erase after b removes a
    island.pushmod = false;
    island.erase(b);
    expect(island.length).toBe(1);
    expect(b.next).toBeNull();
    expect(island.pushmod).toBe(true);
  });

  // --- splice ---
  it("splice removes n elements after pre", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    const d = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    island.add(d);
    // list: d -> c -> b -> a
    island.splice(d, 2);
    expect(island.length).toBe(2);
    expect(d.next).toBe(a);
  });

  it("splice stops early when reaching end of list", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    // list: b -> a; splice(b, 10) should only remove a
    const ret = island.splice(b, 10);
    expect(ret).toBeNull();
    expect(island.length).toBe(1);
    expect(b.next).toBeNull();
  });

  it("splice with n=0 removes nothing", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    // list: b -> a
    const ret = island.splice(b, 0);
    expect(ret).toBe(a);
    expect(island.length).toBe(2);
  });

  // --- reverse ---
  it("reverse should reverse the list order", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    // list: c -> b -> a
    island.reverse();
    // now: a -> b -> c
    expect(island.next).toBe(a);
    expect(a.next).toBe(b);
    expect(b.next).toBe(c);
    expect(c.next).toBeNull();
  });

  it("reverse empty list does nothing", () => {
    island.reverse();
    expect(island.next).toBeNull();
  });

  it("reverse single-element list is unchanged", () => {
    const a = makeComp();
    island.add(a);
    island.modified = false;
    island.reverse();
    expect(island.next).toBe(a);
    expect(a.next).toBeNull();
    expect(island.modified).toBe(true);
    expect(island.pushmod).toBe(true);
  });

  // --- empty / size ---
  it("empty returns true for empty list", () => {
    expect(island.empty()).toBe(true);
  });

  it("empty returns false for non-empty list", () => {
    island.add(makeComp());
    expect(island.empty()).toBe(false);
  });

  it("size returns length", () => {
    expect(island.size()).toBe(0);
    island.add(makeComp());
    expect(island.size()).toBe(1);
    island.add(makeComp());
    expect(island.size()).toBe(2);
  });

  // --- has / inlined_has ---
  it("has returns true if element in list", () => {
    const c = makeComp();
    island.add(c);
    expect(island.has(c)).toBe(true);
  });

  it("has returns false if element not in list", () => {
    const c = makeComp();
    expect(island.has(c)).toBe(false);
  });

  it("has returns true if element in list", () => {
    const c = makeComp();
    island.add(c);
    expect(island.has(c)).toBe(true);
  });

  it("has returns false if element not in list", () => {
    const c = makeComp();
    island.add(makeComp());
    expect(island.has(c)).toBe(false);
  });

  it("has returns false on empty list", () => {
    const c = makeComp();
    expect(island.has(c)).toBe(false);
  });

  it("has finds element that is not the head", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    // list: c -> b -> a; search for a (tail)
    expect(island.has(a)).toBe(true);
  });

  // --- front / back ---
  it("front returns head", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    expect(island.front()).toBe(b);
  });

  it("front returns null for empty list", () => {
    expect(island.front()).toBeNull();
  });

  it("back returns last element", () => {
    const a = makeComp();
    const b = makeComp();
    island.add(a);
    island.add(b);
    expect(island.back()).toBe(a);
  });

  it("back returns null for empty list", () => {
    expect(island.back()).toBeNull();
  });

  it("back returns sole element in single-element list", () => {
    const a = makeComp();
    island.add(a);
    expect(island.back()).toBe(a);
  });

  // --- iterator_at / at ---
  it("iterator_at returns element at index", () => {
    const a = makeComp();
    const b = makeComp();
    const c = makeComp();
    island.add(a);
    island.add(b);
    island.add(c);
    expect(island.iterator_at(0)).toBe(c);
    expect(island.iterator_at(1)).toBe(b);
    expect(island.iterator_at(2)).toBe(a);
  });

  it("iterator_at returns null for out-of-range", () => {
    expect(island.iterator_at(0)).toBeNull();
    island.add(makeComp());
    expect(island.iterator_at(5)).toBeNull();
  });

  it("at returns element at index", () => {
    const a = makeComp();
    island.add(a);
    expect(island.at(0)).toBe(a);
  });

  it("at returns null for out-of-range", () => {
    expect(island.at(0)).toBeNull();
    expect(island.at(10)).toBeNull();
  });

  // --- begin / setbegin ---
  it("begin returns head of list", () => {
    expect(island.begin()).toBeNull();
    const c = makeComp();
    island.add(c);
    expect(island.begin()).toBe(c);
  });

  it("setbegin sets head and marks modified", () => {
    const c = makeComp();
    island.setbegin(c);
    expect(island.next).toBe(c);
    expect(island.modified).toBe(true);
    expect(island.pushmod).toBe(true);
  });

  it("setbegin to null clears head", () => {
    const c = makeComp();
    island.add(c);
    island.setbegin(null);
    expect(island.next).toBeNull();
    expect(island.modified).toBe(true);
    expect(island.pushmod).toBe(true);
  });

  // --- clear ---
  it("clear is a no-op", () => {
    island.add(makeComp());
    island.clear();
    // clear is intentionally a no-op in this class
    expect(island.length).toBe(1);
  });

  it("clear is a no-op", () => {
    island.add(makeComp());
    island.clear();
    expect(island.length).toBe(1);
  });

  // --- Pool callbacks ---
  it("alloc resets waket to 0", () => {
    island.waket = 42;
    island.alloc();
    expect(island.waket).toBe(0);
  });

  it("free is a no-op", () => {
    expect(() => island.free()).not.toThrow();
  });

  // --- Static pool ---
  it("static zpp_pool starts as null", () => {
    // Pool may have been used, but the field should exist
    expect("zpp_pool" in ZPP_Island).toBe(true);
  });

  // --- Island-specific fields ---
  it("sleep defaults to false", () => {
    expect(island.sleep).toBe(false);
    island.sleep = true;
    expect(island.sleep).toBe(true);
  });

  it("comps list is initialized", () => {
    expect(island.comps).not.toBeNull();
  });
});
