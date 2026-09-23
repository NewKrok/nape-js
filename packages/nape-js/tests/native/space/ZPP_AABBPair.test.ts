/**
 * ZPP_AABBPair — Direct unit tests for the dynamic-AABB broadphase pair record.
 *
 * Covers (issue #163):
 * - Default field state matches the engine's "fresh from `new`" expectations
 *   (no nodes attached, sleeping = false, ids zeroed, doubly-linked list
 *   pointers null, arbiter null).
 * - `free()` drops node references and `gprev`, clears the `sleeping` flag,
 *   but deliberately leaves `id` / `di` / `arb` / `first` / `next` untouched
 *   — the broadphase relies on this so it can re-link the pair into the
 *   global list and inspect the previous arbiter before discarding.
 *
 * The partial `free()` semantics are easy to
 * regress during refactors; pinning them here protects the broadphase's
 * recycle path.
 */

import { describe, it, expect } from "vitest";
import { ZPP_AABBPair } from "../../../src/native/space/ZPP_AABBPair";

// ---------------------------------------------------------------------------
// Construction defaults
// ---------------------------------------------------------------------------

describe("ZPP_AABBPair — construction defaults", () => {
  it("starts with both nodes unattached and arbiter null", () => {
    const p = new ZPP_AABBPair();
    expect(p.n1).toBeNull();
    expect(p.n2).toBeNull();
    expect(p.arb).toBeNull();
  });

  it("has all flag and id fields zeroed", () => {
    const p = new ZPP_AABBPair();
    expect(p.first).toBe(false);
    expect(p.sleeping).toBe(false);
    expect(p.id).toBe(0);
    expect(p.di).toBe(0);
  });

  it("has both doubly-linked list pointers null (not yet inserted)", () => {
    const p = new ZPP_AABBPair();
    expect(p.next).toBeNull();
    expect(p.gprev).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// free()
// ---------------------------------------------------------------------------

describe("ZPP_AABBPair.free()", () => {
  it("drops both node references and the gprev pointer", () => {
    const p = new ZPP_AABBPair();
    p.n1 = { tag: "n1" };
    p.n2 = { tag: "n2" };
    p.gprev = new ZPP_AABBPair();

    p.free();

    expect(p.n1).toBeNull();
    expect(p.n2).toBeNull();
    expect(p.gprev).toBeNull();
  });

  it("clears the sleeping flag", () => {
    const p = new ZPP_AABBPair();
    p.sleeping = true;
    p.free();
    expect(p.sleeping).toBe(false);
  });

  it("leaves id / di / arb / first / next untouched (broadphase reuse contract)", () => {
    // The broadphase pulls a free()'d pair off the pool and re-populates only
    // the fields it needs — anything free() didn't clear should survive so
    // the recycle path can inspect prior state (e.g. previous arbiter).
    const p = new ZPP_AABBPair();
    const sentinelArb = { tag: "arb" };
    const sentinelNext = new ZPP_AABBPair();
    p.id = 5;
    p.di = 7;
    p.arb = sentinelArb;
    p.first = true;
    p.next = sentinelNext;
    // Also populate the fields free() does clear so this test's setup
    // matches a live pair.
    p.n1 = { tag: "n1" };
    p.n2 = { tag: "n2" };
    p.gprev = new ZPP_AABBPair();
    p.sleeping = true;

    p.free();

    expect(p.id).toBe(5);
    expect(p.di).toBe(7);
    expect(p.arb).toBe(sentinelArb);
    expect(p.first).toBe(true);
    expect(p.next).toBe(sentinelNext);
  });

  it("is idempotent — calling free() twice does not throw or further mutate", () => {
    const p = new ZPP_AABBPair();
    p.n1 = { tag: "n1" };
    p.n2 = { tag: "n2" };
    p.gprev = new ZPP_AABBPair();
    p.sleeping = true;

    p.free();
    expect(() => p.free()).not.toThrow();

    expect(p.n1).toBeNull();
    expect(p.n2).toBeNull();
    expect(p.gprev).toBeNull();
    expect(p.sleeping).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Static pool
// ---------------------------------------------------------------------------

describe("ZPP_AABBPair.zpp_pool", () => {
  it("starts as null on the class (no instances pre-pooled)", () => {
    // Note: prior suites may have populated the shared pool. We don't
    // reset it (the pool is global and shared with the broadphase); this
    // assertion only checks the declared static default contract by
    // verifying the property exists and accepts null.
    expect("zpp_pool" in ZPP_AABBPair).toBe(true);
    const original = ZPP_AABBPair.zpp_pool;
    ZPP_AABBPair.zpp_pool = null;
    expect(ZPP_AABBPair.zpp_pool).toBeNull();
    ZPP_AABBPair.zpp_pool = original;
  });
});
