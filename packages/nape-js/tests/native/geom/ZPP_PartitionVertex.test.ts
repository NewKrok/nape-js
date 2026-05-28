/**
 * ZPP_PartitionVertex — direct unit coverage of comparators and pool.
 *
 * Issue #165 lists ZPP_PartitionVertex as untested. The class has no public
 * surface but provides static comparators (vert_lt, edge_lt, rightdistance,
 * edge_swap) used by sweep-line monotone partitioning. We test these
 * directly because the public decomposition tests cannot distinguish a
 * correct comparator from one that produces accidentally-valid output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/core/engine";
import { ZPP_PartitionVertex } from "../../../src/native/geom/ZPP_PartitionVertex";

function makeVert(x: number, y: number): ZPP_PartitionVertex {
  return ZPP_PartitionVertex.get({ x, y });
}

/** Build a small linked chain so .next is defined for edge-based comparators. */
function chain(points: Array<[number, number]>): ZPP_PartitionVertex[] {
  const verts = points.map(([x, y]) => makeVert(x, y));
  for (let i = 0; i < verts.length; i++) {
    verts[i].next = verts[(i + 1) % verts.length];
    verts[i].prev = verts[(i - 1 + verts.length) % verts.length];
  }
  return verts;
}

describe("ZPP_PartitionVertex", () => {
  // Reset pool to avoid cross-test interference; cap nextId growth doesn't matter.
  beforeEach(() => {
    ZPP_PartitionVertex.zpp_pool = null;
  });

  describe("static get()", () => {
    it("creates a new instance when the pool is empty", () => {
      const v = makeVert(3, 4);
      expect(v).toBeInstanceOf(ZPP_PartitionVertex);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
      expect(v.diagonals).not.toBe(null);
    });

    it("returns a pooled instance when one is available", () => {
      const pooled = new ZPP_PartitionVertex();
      ZPP_PartitionVertex.zpp_pool = pooled;
      const v = makeVert(1, 2);
      expect(v).toBe(pooled);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      // Pool should be drained.
      expect(ZPP_PartitionVertex.zpp_pool).toBe(null);
    });

    it("assigns monotonically increasing ids to new instances", () => {
      const a = makeVert(0, 0);
      const b = makeVert(0, 0);
      expect(b.id).toBeGreaterThan(a.id);
    });
  });

  // ---------------------------------------------------------------------------
  // rightdistance — signed cross product based on edge orientation flip
  // ---------------------------------------------------------------------------

  describe("rightdistance()", () => {
    it("returns 0 when the test vertex lies exactly on the edge line", () => {
      const [a, b] = chain([
        [0, 0],
        [10, 0],
      ]);
      const v = makeVert(5, 0);
      expect(ZPP_PartitionVertex.rightdistance(a, v)).toBe(0);
      // b is on its own edge line; rightdistance should also be 0.
      expect(ZPP_PartitionVertex.rightdistance(a, b)).toBe(0);
    });

    it("flips sign when the edge goes from higher-y to lower-y vs. lower-y to higher-y", () => {
      // Edge going up (y increases): flip=true
      const [aUp] = chain([
        [0, 0],
        [10, 5],
      ]);
      // Edge going down (y decreases): flip=false
      const [aDown] = chain([
        [0, 5],
        [10, 0],
      ]);
      const v = makeVert(5, 3);
      const dUp = ZPP_PartitionVertex.rightdistance(aUp, v);
      const dDown = ZPP_PartitionVertex.rightdistance(aDown, v);
      // Same physical position relative to edge → values are opposite signs.
      expect(Math.sign(dUp) * Math.sign(dDown)).toBeLessThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // vert_lt — sweep-line vertex ordering
  // ---------------------------------------------------------------------------

  describe("vert_lt()", () => {
    it("returns true when the vertex equals edge.start", () => {
      const [a] = chain([
        [0, 0],
        [10, 0],
      ]);
      expect(ZPP_PartitionVertex.vert_lt(a, a)).toBe(true);
    });

    it("returns true when the vertex equals edge.next (endpoint)", () => {
      const [a, b] = chain([
        [0, 0],
        [10, 0],
      ]);
      expect(ZPP_PartitionVertex.vert_lt(a, b)).toBe(true);
    });

    it("handles horizontal edges (edge.y === edge.next.y) by comparing x", () => {
      // Horizontal edge from (5,0)→(15,0). Vert at x=20 is to the right of both endpoints.
      const [a] = chain([
        [5, 0],
        [15, 0],
      ]);
      const v = makeVert(20, 0);
      expect(ZPP_PartitionVertex.vert_lt(a, v)).toBe(true);
    });

    it("non-horizontal edge: vertex to the right is 'lt'", () => {
      // Edge from (0,0)→(0,10), test vertex at (5, 5).
      const [a] = chain([
        [0, 0],
        [0, 10],
      ]);
      const v = makeVert(5, 5);
      const result = ZPP_PartitionVertex.vert_lt(a, v);
      // Edge goes up → flip=true → rightdistance = -(vy*ux - vx*uy) where ux=0, uy=10
      // = -(5*0 - 5*10) = 50 > 0 → vert_lt returns 50 <= 0 → false
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // edge_swap — swaps the node reference between two partition vertices
  // ---------------------------------------------------------------------------

  describe("edge_swap()", () => {
    it("swaps the .node references between two vertices", () => {
      const p = makeVert(0, 0);
      const q = makeVert(1, 1);
      const nodeP = { tag: "P" };
      const nodeQ = { tag: "Q" };
      p.node = nodeP;
      q.node = nodeQ;
      ZPP_PartitionVertex.edge_swap(p, q);
      expect(p.node).toBe(nodeQ);
      expect(q.node).toBe(nodeP);
    });

    it("swapping twice restores the original assignment", () => {
      const p = makeVert(0, 0);
      const q = makeVert(1, 1);
      const a = { tag: "a" };
      const b = { tag: "b" };
      p.node = a;
      q.node = b;
      ZPP_PartitionVertex.edge_swap(p, q);
      ZPP_PartitionVertex.edge_swap(p, q);
      expect(p.node).toBe(a);
      expect(q.node).toBe(b);
    });
  });

  // ---------------------------------------------------------------------------
  // edge_lt — short-circuit equality cases
  // ---------------------------------------------------------------------------

  describe("edge_lt()", () => {
    it("returns false when both edges are the same edge", () => {
      const [a] = chain([
        [0, 0],
        [10, 0],
      ]);
      expect(ZPP_PartitionVertex.edge_lt(a, a)).toBe(false);
    });

    it("handles two horizontal edges by comparing their max-x endpoints", () => {
      // Edge p: (0,0)→(10,0), endpoint max-x = 10
      // Edge q: (5,0)→(20,0), endpoint max-x = 20
      // edge_lt returns max(p.x, p.next.x) > max(q.x, q.next.x) → 10 > 20 → false
      const verts = [makeVert(0, 0), makeVert(10, 0), makeVert(5, 0), makeVert(20, 0)];
      verts[0].next = verts[1];
      verts[1].next = verts[0];
      verts[2].next = verts[3];
      verts[3].next = verts[2];
      expect(ZPP_PartitionVertex.edge_lt(verts[0], verts[2])).toBe(false);
      expect(ZPP_PartitionVertex.edge_lt(verts[2], verts[0])).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // copy() — produces a new vertex preserving x, y, forced
  // ---------------------------------------------------------------------------

  describe("copy()", () => {
    it("creates a duplicate with the same x, y and forced flag", () => {
      const v = makeVert(7, -3);
      v.forced = true;
      const c = v.copy();
      expect(c).not.toBe(v);
      expect(c.x).toBe(7);
      expect(c.y).toBe(-3);
      expect(c.forced).toBe(true);
    });
  });
});
