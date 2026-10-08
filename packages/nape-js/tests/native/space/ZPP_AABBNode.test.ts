/**
 * ZPP_AABBNode — Direct unit tests for the dynamic-AABB tree node.
 *
 * Covers (issue #163):
 * - Default field values: empty AABB, no children, height = -1, all
 *   tracking flags (moved/synced/first_sync) cleared.
 * - `free()` returns the owned AABB to the pool, severs every outer/wrapper
 *   reference, and nulls all linked-list pointers (parent / child1 / child2 /
 *   next / snext / mnext) so the node is safe to recycle.
 * - `free()` is robust to a node whose AABB wrapper was never realized
 *   (outer == null path).
 *
 * These tests touch the pool directly so each `it` clears `ZPP_AABB.zpp_pool`
 * up-front to remove leakage from prior suites.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_AABBNode } from "../../../src/native/space/ZPP_AABBNode";
import { ZPP_AABB } from "../../../src/native/geom/ZPP_AABB";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the AABB pool so each test gets a clean allocator. */
function clearAABBPool(): void {
  ZPP_AABB.zpp_pool = null;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe("ZPP_AABBNode — construction defaults", () => {
  it("starts as a non-allocated leaf with no shape and no tree links", () => {
    const n = new ZPP_AABBNode();

    expect(n.aabb).toBeNull();
    expect(n.shape).toBeNull();
    expect(n.dyn).toBe(false);
    expect(n.parent).toBeNull();
    expect(n.child1).toBeNull();
    expect(n.child2).toBeNull();
    // Height -1 marks an unallocated/free node — distinguishes it from a
    // fresh leaf (height 0) and any branch (height >= 1).
    expect(n.height).toBe(-1);
  });

  it("has zeroed tracking and linked-list pointers", () => {
    const n = new ZPP_AABBNode();

    expect(n.rayt).toBe(0);
    expect(n.next).toBeNull();
    expect(n.mnext).toBeNull();
    expect(n.snext).toBeNull();
    expect(n.moved).toBe(false);
    expect(n.synced).toBe(false);
    expect(n.first_sync).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// free()
// ---------------------------------------------------------------------------

describe("ZPP_AABBNode.free()", () => {
  beforeEach(clearAABBPool);

  it("returns the owned AABB to the pool and resets height to -1", () => {
    const n = new ZPP_AABBNode();
    n.aabb = new ZPP_AABB();
    const owned = n.aabb!;
    n.height = 4;

    n.free();

    expect(n.height).toBe(-1);
    expect(ZPP_AABB.zpp_pool).toBe(owned);
  });

  it("severs the AABB outer wrapper and its lazy Vec2 wrappers", () => {
    const n = new ZPP_AABBNode();
    n.aabb = new ZPP_AABB();

    // Simulate a realized outer wrapper with a back-pointer and lazy
    // Vec2 wrappers (the shape ZPP_AABB.wrapper() produces).
    const fakeOuter = { zpp_inner: n.aabb };
    n.aabb!.outer = fakeOuter;
    n.aabb!.wrap_min = { tag: "min" };
    n.aabb!.wrap_max = { tag: "max" };
    n.aabb!._invalidate = () => {};
    n.aabb!._validate = () => {};

    const aabbBefore = n.aabb!;

    n.free();

    // The wrapper's back-link to the AABB is severed, and the AABB's
    // wrapper/callback pointers are nulled out.
    expect(fakeOuter.zpp_inner).toBeNull();
    expect(aabbBefore.outer).toBeNull();
    expect(aabbBefore.wrap_min).toBeNull();
    expect(aabbBefore.wrap_max).toBeNull();
    expect(aabbBefore._invalidate).toBeNull();
    expect(aabbBefore._validate).toBeNull();
  });

  it("nulls every tree / linked-list pointer so the node is recyclable", () => {
    const n = new ZPP_AABBNode();
    n.aabb = new ZPP_AABB();
    n.parent = new ZPP_AABBNode();
    n.child1 = new ZPP_AABBNode();
    n.child2 = new ZPP_AABBNode();
    n.next = new ZPP_AABBNode();
    n.snext = new ZPP_AABBNode();
    n.mnext = new ZPP_AABBNode();

    n.free();

    expect(n.parent).toBeNull();
    expect(n.child1).toBeNull();
    expect(n.child2).toBeNull();
    expect(n.next).toBeNull();
    expect(n.snext).toBeNull();
    expect(n.mnext).toBeNull();
  });

  it("free() handles an AABB that never had an outer wrapper realized", () => {
    const n = new ZPP_AABBNode();
    n.aabb = new ZPP_AABB();
    // outer stays null (lazy wrapper never requested).
    expect(n.aabb!.outer).toBeNull();

    expect(() => n.free()).not.toThrow();
    expect(n.height).toBe(-1);
    // AABB still gets pooled.
    expect(ZPP_AABB.zpp_pool).not.toBeNull();
  });

  it("after free() the released AABB sits at the pool head with a clean `next` chain", () => {
    const n = new ZPP_AABBNode();
    n.aabb = new ZPP_AABB();
    const owned = n.aabb!;

    n.free();

    // The freed AABB became the new pool head; since the pool was empty
    // beforehand its `next` is null (no chain to splice).
    expect(ZPP_AABB.zpp_pool).toBe(owned);
    expect(owned.next).toBeNull();
  });
});
