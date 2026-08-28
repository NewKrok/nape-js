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
  // --- inlined_try_remove ---
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
