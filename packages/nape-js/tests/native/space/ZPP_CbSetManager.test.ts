/**
 * ZPP_CbSetManager — Direct unit tests for the per-space callback set
 * manager and registry lifecycle.
 *
 * Covers (issue #163):
 * - Construction wires `cbsets` (empty ZPP_Set) and `space` back-reference.
 * - `get(cbTypes)` short-circuits on empty list and returns `null`.
 * - `get(cbTypes)` allocates a new `ZPP_CbSet`, attaches the manager,
 *   inserts into the tree, and returns the same set on repeat lookup.
 * - `pair(a, b)` creates a deterministic `ZPP_CbSetPair`, returns the
 *   same pair on swapped args, and de-duplicates self-pairs.
 * - `remove(set)` evicts the set, clears its pairs (including the
 *   partner's cross-reference), and nulls `manager`.
 * - `validate()` traverses the tree and calls `validate()` on every set
 *   (drains each set's `zip_listeners` zip flag).
 * - `valid_listener(i)` compares against the manager's stored space.
 *
 * The manager has no direct callers for `pair()` / `valid_listener()` in
 * current engine code — covering them here pins their behavior so any
 * future regression surfaces immediately.
 */

import { getNape } from "../../../src/core/engine";
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { Space } from "../../../src/space/Space";
import { Vec2 } from "../../../src/geom/Vec2";
import { CbType } from "../../../src/callbacks/CbType";
import { ZPP_CbSetManager } from "../../../src/native/space/ZPP_CbSetManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newManager(): { space: Space; mgr: ZPP_CbSetManager } {
  const space = new Space(new Vec2(0, 0));
  // Every Space wires a fresh manager — borrow it rather than re-instantiating
  // so we exercise the same instance the engine uses.
  return { space, mgr: space.zpp_inner.cbsets };
}

/** Build a fresh ZNPList_ZPP_CbType populated with the given CbType ids. */
function cbTypeList(...types: CbType[]): any {
  const ZPP = getNape().__zpp;
  const list = new ZPP.util.ZNPList_ZPP_CbType();
  for (const t of types) list.add(t.zpp_inner);
  return list;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("ZPP_CbSetManager — construction", () => {
  it("wires an empty cbsets tree and stores the space back-reference", () => {
    const { space, mgr } = newManager();

    expect(mgr.cbsets).not.toBeNull();
    expect(mgr.cbsets.empty()).toBe(true);
    expect(mgr.space).toBe(space.zpp_inner);
  });

  it("installs ZPP_CbSet.setlt as the tree's comparison function", () => {
    const { mgr } = newManager();
    const setlt = getNape().__zpp.callbacks.ZPP_CbSet.setlt;

    expect(mgr.cbsets.lt).toBe(setlt);
  });
});

// ---------------------------------------------------------------------------
// get()
// ---------------------------------------------------------------------------

describe("ZPP_CbSetManager.get()", () => {
  let mgr: ZPP_CbSetManager;

  beforeEach(() => {
    mgr = newManager().mgr;
  });

  it("returns null when the cbTypes list is empty", () => {
    const empty = cbTypeList();
    expect(mgr.get(empty)).toBeNull();
    // Tree stays empty — no spurious insertion.
    expect(mgr.cbsets.empty()).toBe(true);
  });

  it("creates a new CbSet on first lookup, registers manager + tree entry", () => {
    const tA = new CbType();
    const set = mgr.get(cbTypeList(tA));

    expect(set).not.toBeNull();
    expect(set.manager).toBe(mgr);
    expect(mgr.cbsets.empty()).toBe(false);
    expect(mgr.cbsets.has(set)).toBe(true);
  });

  it("returns the same CbSet for repeated lookups with equivalent cbTypes", () => {
    const tA = new CbType();
    const tB = new CbType();

    const first = mgr.get(cbTypeList(tA, tB));
    const second = mgr.get(cbTypeList(tA, tB));

    expect(second).toBe(first);
  });

  it("returns distinct CbSets for different cbType combinations", () => {
    const tA = new CbType();
    const tB = new CbType();
    const tC = new CbType();

    const ab = mgr.get(cbTypeList(tA, tB));
    const ac = mgr.get(cbTypeList(tA, tC));

    expect(ab).not.toBe(ac);
    expect(mgr.cbsets.has(ab)).toBe(true);
    expect(mgr.cbsets.has(ac)).toBe(true);
  });

  it("the lookup probe is returned to the CbSet pool (no leak)", () => {
    const ZPP_CbSet = getNape().__zpp.callbacks.ZPP_CbSet;
    const tA = new CbType();

    // Prime once so the second call exercises the cache-hit branch (`res != null`).
    mgr.get(cbTypeList(tA));

    const poolBefore = ZPP_CbSet.zpp_pool;
    mgr.get(cbTypeList(tA));
    const poolAfter = ZPP_CbSet.zpp_pool;

    // A throw-away "fake" probe is pulled from the pool and put back —
    // pool head should change with each lookup.
    expect(poolAfter).not.toBeNull();
    // The probe's cbTypes list was drained back into the pool.
    expect(poolAfter.cbTypes.head).toBeNull();
    // The previous pool head (or its successor) is still reachable.
    expect(poolAfter === poolBefore || poolAfter.next === poolBefore).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pair()
// ---------------------------------------------------------------------------

describe("ZPP_CbSetManager.pair()", () => {
  let mgr: ZPP_CbSetManager;

  beforeEach(() => {
    mgr = newManager().mgr;
  });

  function makeSet(...types: CbType[]): any {
    return mgr.get(cbTypeList(...types));
  }

  it("creates a CbSetPair when none exists and adds it to both sides", () => {
    const a = makeSet(new CbType());
    const b = makeSet(new CbType());

    const p = mgr.pair(a, b);

    expect(p).not.toBeNull();
    expect(a.cbpairs.length).toBe(1);
    expect(b.cbpairs.length).toBe(1);
    // Pair endpoints are ordered by setlt (deterministic).
    expect(p.a === a || p.a === b).toBe(true);
    expect(p.b === a || p.b === b).toBe(true);
    expect(p.a).not.toBe(p.b);
  });

  it("returns the same pair when called again with swapped arguments", () => {
    const a = makeSet(new CbType());
    const b = makeSet(new CbType());

    const p1 = mgr.pair(a, b);
    const p2 = mgr.pair(b, a);

    expect(p2).toBe(p1);
    // No duplicate registration on either side.
    expect(a.cbpairs.length).toBe(1);
    expect(b.cbpairs.length).toBe(1);
  });

  it("orders pair endpoints via ZPP_CbSet.setlt", () => {
    const ZPP_CbSet = getNape().__zpp.callbacks.ZPP_CbSet;
    const a = makeSet(new CbType());
    const b = makeSet(new CbType());

    const p = mgr.pair(a, b);

    if (ZPP_CbSet.setlt(a, b)) {
      expect(p.a).toBe(a);
      expect(p.b).toBe(b);
    } else {
      expect(p.a).toBe(b);
      expect(p.b).toBe(a);
    }
  });

  it("clears the zip_listeners flag after returning the pair", () => {
    const a = makeSet(new CbType());
    const b = makeSet(new CbType());

    const p = mgr.pair(a, b);
    expect(p.zip_listeners).toBe(false);
  });

  it("self-pair (a, a) registers exactly once on the set's cbpairs", () => {
    const a = makeSet(new CbType());

    const p = mgr.pair(a, a);

    expect(p.a).toBe(a);
    expect(p.b).toBe(a);
    // The `b != a` guard in pair() prevents the double-add.
    expect(a.cbpairs.length).toBe(1);

    // Subsequent self-pair lookups return the same instance.
    expect(mgr.pair(a, a)).toBe(p);
    expect(a.cbpairs.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// remove()
// ---------------------------------------------------------------------------

describe("ZPP_CbSetManager.remove()", () => {
  let mgr: ZPP_CbSetManager;

  beforeEach(() => {
    mgr = newManager().mgr;
  });

  it("evicts the set from the tree and clears its manager pointer", () => {
    const set = mgr.get(cbTypeList(new CbType()))!;
    expect(mgr.cbsets.has(set)).toBe(true);

    mgr.remove(set);

    expect(mgr.cbsets.has(set)).toBe(false);
    expect(set.manager).toBeNull();
  });

  it("drains the set's own cbpairs and recycles each pair to the pool", () => {
    const ZPP_CbSetPair = getNape().__zpp.callbacks.ZPP_CbSetPair;

    const a = mgr.get(cbTypeList(new CbType()))!;
    const b = mgr.get(cbTypeList(new CbType()))!;
    mgr.pair(a, b);
    expect(a.cbpairs.length).toBe(1);

    mgr.remove(a);

    expect(a.cbpairs.length).toBe(0);
    // Partner's cross-reference is cleaned up as well.
    expect(b.cbpairs.length).toBe(0);
    // The pair object was zeroed and pushed to the pool.
    expect(ZPP_CbSetPair.zpp_pool).not.toBeNull();
    expect(ZPP_CbSetPair.zpp_pool.a).toBeNull();
    expect(ZPP_CbSetPair.zpp_pool.b).toBeNull();
  });

  it("self-pair cleanup does not touch a non-existent partner", () => {
    const a = mgr.get(cbTypeList(new CbType()))!;
    mgr.pair(a, a);
    expect(a.cbpairs.length).toBe(1);

    // The `pair.a != pair.b` guard in remove() avoids a double-remove
    // on the same set's pair list. No throw expected.
    expect(() => mgr.remove(a)).not.toThrow();
    expect(a.cbpairs.length).toBe(0);
  });

  it("removing one set leaves unrelated sets in the tree intact", () => {
    const a = mgr.get(cbTypeList(new CbType()))!;
    const b = mgr.get(cbTypeList(new CbType()))!;
    const c = mgr.get(cbTypeList(new CbType()))!;

    mgr.remove(b);

    expect(mgr.cbsets.has(a)).toBe(true);
    expect(mgr.cbsets.has(b)).toBe(false);
    expect(mgr.cbsets.has(c)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate()
// ---------------------------------------------------------------------------

describe("ZPP_CbSetManager.validate()", () => {
  it("is a no-op when the manager has no sets", () => {
    const { mgr } = newManager();
    expect(() => mgr.validate()).not.toThrow();
    expect(mgr.cbsets.empty()).toBe(true);
  });

  it("walks every set in the tree and clears its zip_listeners flag", () => {
    const { mgr } = newManager();

    const types = [new CbType(), new CbType(), new CbType(), new CbType()];
    const sets = types.map((t) => mgr.get(cbTypeList(t))!);

    // Re-arm the zip flags so we can observe validate() draining them.
    for (const s of sets) {
      s.zip_listeners = true;
      s.zip_bodylisteners = true;
      s.zip_conlisteners = true;
    }

    mgr.validate();

    for (const s of sets) {
      expect(s.zip_listeners).toBe(false);
      expect(s.zip_bodylisteners).toBe(false);
      expect(s.zip_conlisteners).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// valid_listener()
// ---------------------------------------------------------------------------

describe("ZPP_CbSetManager.valid_listener()", () => {
  it("returns true when the listener's space matches the manager's space", () => {
    const { space, mgr } = newManager();
    expect(mgr.valid_listener({ space: space.zpp_inner })).toBe(true);
  });

  it("returns false for a listener bound to a different space", () => {
    const { mgr: mgrA } = newManager();
    const { space: spaceB } = newManager();
    expect(mgrA.valid_listener({ space: spaceB.zpp_inner })).toBe(false);
  });

  it("returns false for an unattached listener (space == null)", () => {
    const { mgr } = newManager();
    expect(mgr.valid_listener({ space: null })).toBe(false);
  });
});
