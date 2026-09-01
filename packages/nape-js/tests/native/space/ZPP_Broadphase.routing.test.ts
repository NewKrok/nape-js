/**
 * ZPP_Broadphase — Direct unit tests for the base-class concrete surface.
 *
 * The base class is a router: every subclass (SweepPhase, DynAABBPhase,
 * SpatialHashPhase) inherits and re-uses three concrete entry points:
 *   - `insert` / `remove` / `sync` — delegate to the chosen implementation
 *     based on the `is_sweep` flag.
 *   - `updateAABBShape` / `updateCircShape` — lazy probe-shape factories
 *     used by every spatial-query implementation to build a temporary
 *     polygon/circle to test against.
 *
 * Existing tests cover these methods *indirectly* through Space/query
 * integration (see ZPP_Broadphase.queries / ZPP_Broadphase.spatial /
 * ZPP_Broadphase.integration). This suite drives them directly to pin
 * the routing contract and the lazy-construct + reuse contract that the
 * integration tests don't isolate.
 *
 * Covers (issue #163):
 * - `_initFields` static initializer contract (defaults for all flags).
 * - `insert` / `remove` / `sync` route to `sweep` or `dynab` based on
 *   `is_sweep`, never both.
 * - `updateAABBShape` lazily creates a Polygon probe on the first call,
 *   then re-transforms (not recreates) on subsequent calls.
 * - `updateCircShape` lazily creates a Circle probe on the first call,
 *   then mutates its position/radius on subsequent calls.
 */

import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { ZPP_Broadphase } from "../../../src/native/space/ZPP_Broadphase";
import { ZPP_AABB } from "../../../src/native/geom/ZPP_AABB";
import { ZPP_Shape } from "../../../src/native/shape/ZPP_Shape";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a stub "phase" object that records every __insert/__remove/__sync call. */
interface PhaseStub {
  inserts: any[];
  removes: any[];
  syncs: any[];
  __insert(s: any): void;
  __remove(s: any): void;
  __sync(s: any): void;
  space: { continuous: boolean };
}

function phaseStub(): PhaseStub {
  const stub: PhaseStub = {
    inserts: [],
    removes: [],
    syncs: [],
    space: { continuous: false },
    __insert(s: any) {
      stub.inserts.push(s);
    },
    __remove(s: any) {
      stub.removes.push(s);
    },
    __sync(s: any) {
      stub.syncs.push(s);
    },
  };
  return stub;
}

/** Build a fresh ZPP_AABB at the given bounds (skips the wrapper pool). */
function aabb(minx: number, miny: number, maxx: number, maxy: number): ZPP_AABB {
  const a = new ZPP_AABB();
  a.minx = minx;
  a.miny = miny;
  a.maxx = maxx;
  a.maxy = maxy;
  return a;
}

// ---------------------------------------------------------------------------
// _initFields
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase._initFields()", () => {
  it("populates every field with its default contract value", () => {
    const target: any = {};
    ZPP_Broadphase._initFields(target);

    expect(target.space).toBeNull();
    expect(target.is_sweep).toBe(false);
    expect(target.is_spatial_hash).toBe(false);
    expect(target.sweep).toBeNull();
    expect(target.dynab).toBeNull();
    expect(target.aabbShape).toBeNull();
    expect(target.matrix).toBeNull();
    expect(target.circShape).toBeNull();
  });

  it("overwrites any pre-existing values on the target (idempotent re-init)", () => {
    const target: any = {
      space: { tag: "old" },
      is_sweep: true,
      is_spatial_hash: true,
      sweep: { tag: "old-sweep" },
      dynab: { tag: "old-dynab" },
      aabbShape: { tag: "old-aabb" },
      matrix: { tag: "old-matrix" },
      circShape: { tag: "old-circ" },
    };

    ZPP_Broadphase._initFields(target);

    expect(target.space).toBeNull();
    expect(target.is_sweep).toBe(false);
    expect(target.is_spatial_hash).toBe(false);
    expect(target.sweep).toBeNull();
    expect(target.dynab).toBeNull();
    expect(target.aabbShape).toBeNull();
    expect(target.matrix).toBeNull();
    expect(target.circShape).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insert / remove routing
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — insert/remove routing via is_sweep flag", () => {
  let bp: ZPP_Broadphase;
  let sweep: PhaseStub;
  let dynab: PhaseStub;

  beforeEach(() => {
    bp = new ZPP_Broadphase();
    sweep = phaseStub();
    dynab = phaseStub();
    bp.sweep = sweep;
    bp.dynab = dynab;
  });

  it("insert() with is_sweep=false delegates only to dynab", () => {
    bp.is_sweep = false;
    const s = { id: "shape-A" };

    bp.insert(s);

    expect(dynab.inserts).toEqual([s]);
    expect(sweep.inserts).toHaveLength(0);
  });

  it("insert() with is_sweep=true delegates only to sweep", () => {
    bp.is_sweep = true;
    const s = { id: "shape-B" };

    bp.insert(s);

    expect(sweep.inserts).toEqual([s]);
    expect(dynab.inserts).toHaveLength(0);
  });

  it("remove() routes mirror insert() routing", () => {
    bp.is_sweep = false;
    const s = { id: "shape-rm" };
    bp.remove(s);
    expect(dynab.removes).toEqual([s]);
    expect(sweep.removes).toHaveLength(0);

    bp.is_sweep = true;
    bp.remove(s);
    expect(sweep.removes).toEqual([s]);
    expect(dynab.removes).toHaveLength(1); // unchanged from the first call
  });

  it("flipping is_sweep mid-flight reroutes subsequent calls", () => {
    const s = { id: "shape-flip" };

    bp.is_sweep = false;
    bp.insert(s);
    bp.is_sweep = true;
    bp.insert(s);

    expect(dynab.inserts).toEqual([s]);
    expect(sweep.inserts).toEqual([s]);
  });
});

// ---------------------------------------------------------------------------
// sync() — short-circuit path for already-validated shapes
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase.sync() — short-circuit branches", () => {
  it("short-circuits the dynab path when shape.node.synced is true", () => {
    // The dynab branch first reads `shape.node.synced` — if the node already
    // claims it's synced, sync() returns immediately without touching any
    // downstream state (zip_aabb stays whatever it was).
    const bp = new ZPP_Broadphase();
    const dynab = phaseStub();
    bp.dynab = dynab;
    bp.is_sweep = false;

    const shape = {
      zip_aabb: true, // would normally trigger validation, but node.synced wins
      body: null,
      type: 0,
      circle: null,
      polygon: null,
      node: { synced: true },
    };

    expect(() => bp.sync(shape)).not.toThrow();
    // The early-exit must leave zip_aabb untouched (no validation work done).
    expect(shape.zip_aabb).toBe(true);
    expect(dynab.syncs).toHaveLength(0);
  });

  it("returns without inspecting shape state when shape.body is null (sweep path)", () => {
    const bp = new ZPP_Broadphase();
    const sweep = phaseStub();
    bp.sweep = sweep;
    bp.is_sweep = true;
    sweep.space.continuous = false;

    // sync() delegates to ZPP_Shape.validate_aabb, whose body-null guard must
    // leave the shape untouched (zip_aabb stays pending).
    const shape = {
      zip_aabb: true,
      body: null,
      type: 0,
      circle: null,
      polygon: null,
      validate_aabb: ZPP_Shape.prototype.validate_aabb,
    };
    expect(() => bp.sync(shape)).not.toThrow();
    expect(shape.zip_aabb).toBe(true);
    expect(sweep.syncs).toHaveLength(0);
  });

  it("sync() with continuous=true on sweep path is a no-op (handled elsewhere)", () => {
    const bp = new ZPP_Broadphase();
    const sweep = phaseStub();
    bp.sweep = sweep;
    bp.is_sweep = true;
    sweep.space.continuous = true;

    // Continuous-mode sync is handled by the CCD path; the discrete sync()
    // body must skip the entire validation block. Any shape state goes in.
    expect(() =>
      bp.sync({ zip_aabb: true, body: { tag: "any" }, type: 0, circle: null, polygon: null }),
    ).not.toThrow();
    expect(sweep.syncs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateAABBShape — lazy probe factory
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase.updateAABBShape()", () => {
  let bp: ZPP_Broadphase;

  beforeEach(() => {
    bp = new ZPP_Broadphase();
  });

  it("lazily constructs an aabbShape probe on the first call", () => {
    expect(bp.aabbShape).toBeNull();

    bp.updateAABBShape(aabb(0, 0, 100, 50));

    expect(bp.aabbShape).not.toBeNull();
    // The probe is a Polygon; the inner ZPP_Shape exposes the AABB we set.
    const inner = bp.aabbShape.zpp_inner;
    expect(inner.aabb.minx).toBe(0);
    expect(inner.aabb.miny).toBe(0);
    expect(inner.aabb.maxx).toBe(100);
    expect(inner.aabb.maxy).toBe(50);
  });

  it("reuses the same probe instance across calls (no per-query allocation)", () => {
    bp.updateAABBShape(aabb(0, 0, 100, 50));
    const probeFirst = bp.aabbShape;

    bp.updateAABBShape(aabb(10, 20, 60, 80));

    // Same outer wrapper instance — the second call transforms the existing
    // probe rather than constructing a fresh Polygon.
    expect(bp.aabbShape).toBe(probeFirst);
  });

  it("the reused probe's AABB matches the new query bounds", () => {
    bp.updateAABBShape(aabb(0, 0, 100, 50));
    bp.updateAABBShape(aabb(10, 20, 60, 80));

    const a = bp.aabbShape.zpp_inner.aabb;
    expect(a.minx).toBeCloseTo(10, 6);
    expect(a.miny).toBeCloseTo(20, 6);
    expect(a.maxx).toBeCloseTo(60, 6);
    expect(a.maxy).toBeCloseTo(80, 6);
  });

  it("materializes the transform matrix lazily on the second call only", () => {
    expect(bp.matrix).toBeNull();
    bp.updateAABBShape(aabb(0, 0, 100, 50));
    // First call constructs the probe via Polygon.rect — no transform needed.
    expect(bp.matrix).toBeNull();

    bp.updateAABBShape(aabb(10, 20, 60, 80));
    // Second call applies a transform via the (now-allocated) matrix.
    expect(bp.matrix).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateCircShape — lazy probe factory
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase.updateCircShape()", () => {
  let bp: ZPP_Broadphase;

  beforeEach(() => {
    bp = new ZPP_Broadphase();
  });

  it("lazily constructs a circShape probe on the first call", () => {
    expect(bp.circShape).toBeNull();

    bp.updateCircShape(50, 75, 12);

    expect(bp.circShape).not.toBeNull();
    const inner = bp.circShape.zpp_inner;
    expect(inner.circle.radius).toBeCloseTo(12, 6);
  });

  it("reuses the same probe across calls and mutates its position/radius", () => {
    bp.updateCircShape(50, 75, 12);
    const probeFirst = bp.circShape;

    bp.updateCircShape(-100, 0, 5);

    expect(bp.circShape).toBe(probeFirst);
    expect(bp.circShape.zpp_inner.circle.radius).toBeCloseTo(5, 6);
  });

  it("rejects NaN center coordinates", () => {
    expect(() => bp.updateCircShape(Number.NaN, 0, 5)).toThrow(/Vec2 components cannot be NaN/);
  });
});
