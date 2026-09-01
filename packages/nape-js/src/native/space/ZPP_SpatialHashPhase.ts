/**
 * ZPP_SpatialHashPhase — Internal spatial hash grid broadphase variant.
 *
 * Extends ZPP_Broadphase with a uniform grid that hashes shape AABBs into cells.
 * O(1) expected lookup for nearby objects, optimal for dense scenes with many
 * same-sized objects (particle simulations, etc.).
 *
 * Cell size defaults to 2× the average shape AABB size (auto-tuned) but can be
 * set explicitly via constructor parameter.
 */

import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Collide } from "../geom/ZPP_Collide";
import { ZPP_Broadphase } from "./ZPP_Broadphase";

/** Callback for Map.forEach — recycles cell array into the pool (bound as `this`). */
function recycleCell(this: any[][], cell: any[]): void {
  cell.length = 0;
  this.push(cell);
}

export class ZPP_SpatialHashPhase extends ZPP_Broadphase {
  // --- Static: namespace references ---
  static _zpp: any = null;
  static _nape: any = null;

  // --- Instance fields ---

  /** All shapes tracked by this broadphase, as a simple array. */
  shapes: any[] = [];

  /** Cell size for the grid. */
  cellSize: number;

  /** Inverse cell size (cached). */
  invCellSize: number;

  /** Whether cell size was explicitly provided (disables auto-tuning). */
  fixedCellSize: boolean;

  /** Hash map: cell key → array of shapes in that cell. */
  grid: Map<number, any[]> = new Map();

  /** Pool of reusable cell arrays to avoid GC pressure. */
  cellPool: any[][] = [];

  /** Set for pair deduplication across multi-cell shapes. */
  testedPairs: Set<number> = new Set();

  /** Frame counter for auto-tuning cell size periodically. */
  frameCount: number = 0;

  /** How often to re-tune cell size (every N frames). 0 = never after init. */
  static TUNE_INTERVAL = 120;

  constructor(space: any, cellSize?: number) {
    super();
    this.space = space;
    this.is_sweep = true; // tells ZPP_Space not to eagerly sync on wake
    this.is_spatial_hash = true;
    this.sweep = this; // delegate field — base class routes to this

    if (cellSize != null && cellSize > 0) {
      this.cellSize = cellSize;
      this.fixedCellSize = true;
    } else {
      this.cellSize = 64; // reasonable default, will auto-tune
      this.fixedCellSize = false;
    }
    this.invCellSize = 1 / this.cellSize;
  }

  // ========== Cell key hashing ==========

  /** Compute a hash key for grid cell (cx, cy). */
  cellKey(cx: number, cy: number): number {
    // Large primes for spatial hashing — keeps collision rate low
    return (cx * 73856093) ^ (cy * 19349663);
  }

  // ========== Insert / Remove ==========

  __insert(shape: any): void {
    this.shapes.push(shape);
    // Tag shape with index for O(1) removal
    shape.__shIdx = this.shapes.length - 1;
  }

  __remove(shape: any): void {
    const idx = shape.__shIdx as number;
    const last = this.shapes.length - 1;
    if (idx !== last) {
      const moved = this.shapes[last];
      this.shapes[idx] = moved;
      moved.__shIdx = idx;
    }
    this.shapes.pop();
    shape.__shIdx = undefined;
  }

  // ========== Sync (AABB update for shape) ==========

  __sync(shape: any): void {
    if (!this.space.continuous) {
      shape.validate_aabb();
    }
  }

  // ========== Auto-tune cell size ==========

  autoTuneCellSize(): void {
    if (this.fixedCellSize || this.shapes.length === 0) return;

    let totalW = 0;
    let totalH = 0;
    let count = 0;
    for (let i = 0; i < this.shapes.length; i++) {
      const aabb = this.shapes[i].aabb;
      if (aabb != null) {
        totalW += aabb.maxx - aabb.minx;
        totalH += aabb.maxy - aabb.miny;
        count++;
      }
    }
    if (count === 0) return;

    const avgSize = (totalW + totalH) / (2 * count);
    // Cell size = 2× average shape dimension — good balance of sparsity vs density
    const newCellSize = Math.max(avgSize * 2, 8);
    this.cellSize = newCellSize;
    this.invCellSize = 1 / newCellSize;
  }

  // ========== Broadphase pair detection ==========

  broadphase(space: any, discrete: boolean): void {
    const n = this.shapes.length;
    if (n === 0) return;

    // Auto-tune cell size periodically
    this.frameCount++;
    if (
      this.frameCount === 1 ||
      (!this.fixedCellSize && this.frameCount % ZPP_SpatialHashPhase.TUNE_INTERVAL === 0)
    ) {
      this.autoTuneCellSize();
    }

    const inv = this.invCellSize;

    // Return used cell arrays to pool, then clear grid
    const grid = this.grid;
    const pool = this.cellPool;
    grid.forEach(recycleCell, pool);
    grid.clear();

    // Clear pair dedup set
    const tested = this.testedPairs;
    tested.clear();

    // Insert all shapes into grid cells and check pairs
    for (let i = 0; i < n; i++) {
      const shape = this.shapes[i];
      const aabb = shape.aabb;
      const shIdx = shape.__shIdx as number;

      const minCX = (aabb.minx * inv) | 0;
      const minCY = (aabb.miny * inv) | 0;
      const maxCX = (aabb.maxx * inv) | 0;
      const maxCY = (aabb.maxy * inv) | 0;

      // Fast path: shape fits in a single cell — no dedup needed
      const singleCell = minCX === maxCX && minCY === maxCY;

      if (singleCell) {
        const key = (minCX * 73856093) ^ (minCY * 19349663);
        let cell = grid.get(key);
        if (cell === undefined) {
          cell = pool.length > 0 ? pool.pop()! : [];
          grid.set(key, cell);
        }
        const cLen = cell.length;
        const b1 = shape.body;
        const b1type = b1.type;
        const b1sleeping = b1.component.sleeping;
        for (let j = 0; j < cLen; j++) {
          const other = cell[j];
          const b2 = other.body;
          if (b2 === b1) continue;
          if (b1type === 1 && b2.type === 1) continue;
          if (b1sleeping && b2.component.sleeping) continue;
          const a2 = other.aabb;
          if (a2.miny > aabb.maxy || aabb.miny > a2.maxy) continue;
          if (a2.minx > aabb.maxx || aabb.minx > a2.maxx) continue;
          if (discrete) {
            space.narrowPhase(shape, other, b1type !== 2 || b2.type !== 2, null, false);
          } else {
            space.continuousEvent(shape, other, b1type !== 2 || b2.type !== 2, null, false);
          }
        }
        cell.push(shape);
      } else {
        // Multi-cell path: shape spans cells, needs dedup
        for (let cx = minCX; cx <= maxCX; cx++) {
          for (let cy = minCY; cy <= maxCY; cy++) {
            const key = (cx * 73856093) ^ (cy * 19349663);
            let cell = grid.get(key);
            if (cell === undefined) {
              cell = pool.length > 0 ? pool.pop()! : [];
              grid.set(key, cell);
            }
            const cLen = cell.length;
            const b1 = shape.body;
            const b1type = b1.type;
            const b1sleeping = b1.component.sleeping;
            for (let j = 0; j < cLen; j++) {
              const other = cell[j];
              const b2 = other.body;
              if (b2 === b1) continue;
              if (b1type === 1 && b2.type === 1) continue;
              if (b1sleeping && b2.component.sleeping) continue;

              // Szudzik pairing for dedup — inlined
              const oIdx = other.__shIdx as number;
              const pa = shIdx < oIdx ? shIdx : oIdx;
              const pb = shIdx < oIdx ? oIdx : shIdx;
              const pk = pb * pb + pa;
              if (tested.has(pk)) continue;
              tested.add(pk);

              const a2 = other.aabb;
              if (a2.miny > aabb.maxy || aabb.miny > a2.maxy) continue;
              if (a2.minx > aabb.maxx || aabb.minx > a2.maxx) continue;
              if (discrete) {
                space.narrowPhase(shape, other, b1type !== 2 || b2.type !== 2, null, false);
              } else {
                space.continuousEvent(shape, other, b1type !== 2 || b2.type !== 2, null, false);
              }
            }
            cell.push(shape);
          }
        }
      }
    }
  }

  // ========== Clear ==========

  clear(): void {
    while (this.shapes.length > 0) {
      const shape = this.shapes[this.shapes.length - 1];
      shape.removedFromSpace();
      this.__remove(shape);
    }
    this.grid.clear();
    this.cellPool.length = 0;
    this.testedPairs.clear();
  }

  // ========== Spatial queries: shapes/bodies under point ==========

  shapesUnderPoint(x: number, y: number, filter: any, output: any): any {
    this.space.validation();

    const v = ZPP_Vec2.get(x, y);
    const ret1 = output == null ? new ZPP_SpatialHashPhase._nape.shape.ShapeList() : output;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const aabb = shape.aabb;
      if (aabb.minx <= x && aabb.maxx >= x && aabb.miny <= y && aabb.maxy >= y) {
        if (filter == null || shape.filter.shouldCollide(filter)) {
          if (shape.type == 0) {
            if (ZPP_Collide.circleContains(shape.circle, v)) {
              ret1.push(shape.outer);
            }
          } else if (ZPP_Collide.polyContains(shape.polygon, v)) {
            ret1.push(shape.outer);
          }
        }
      }
    }

    const o = v;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;

    return ret1;
  }

  bodiesUnderPoint(x: number, y: number, filter: any, output: any): any {
    this.space.validation();

    const v = ZPP_Vec2.get(x, y);
    const ret1 = output == null ? new ZPP_SpatialHashPhase._nape.phys.BodyList() : output;
    const seen = new Set<any>();
    for (let j = 0; j < ret1.length; j++) seen.add(ret1.at(j));

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const aabb = shape.aabb;
      if (aabb.minx <= x && aabb.maxx >= x && aabb.miny <= y && aabb.maxy >= y) {
        const body = shape.body.outer;
        if (!seen.has(body)) {
          if (filter == null || shape.filter.shouldCollide(filter)) {
            if (shape.type == 0) {
              if (ZPP_Collide.circleContains(shape.circle, v)) {
                seen.add(body);
                ret1.push(body);
              }
            } else if (ZPP_Collide.polyContains(shape.polygon, v)) {
              seen.add(body);
              ret1.push(body);
            }
          }
        }
      }
    }

    const o = v;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;

    return ret1;
  }

  // ========== Spatial queries: shapes/bodies in AABB ==========

  shapesInAABB(aabb: any, strict: boolean, containment: boolean, filter: any, output: any): any {
    this.space.validation();
    (this as any).updateAABBShape(aabb);
    const ab = (this as any).aabbShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.shape.ShapeList() : output;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      if (filter == null || shape.filter.shouldCollide(filter)) {
        if (strict) {
          if (containment) {
            if (ZPP_Collide.containTest((this as any).aabbShape.zpp_inner, shape)) {
              ret.push(shape.outer);
            }
          } else {
            const x = shape.aabb;
            if (x.minx >= ab.minx && x.miny >= ab.miny && x.maxx <= ab.maxx && x.maxy <= ab.maxy) {
              ret.push(shape.outer);
            } else {
              const _this1 = shape.aabb;
              if (
                ab.miny <= _this1.maxy &&
                _this1.miny <= ab.maxy &&
                ab.minx <= _this1.maxx &&
                _this1.minx <= ab.maxx
              ) {
                if (ZPP_Collide.testCollide_safe(shape, (this as any).aabbShape.zpp_inner)) {
                  ret.push(shape.outer);
                }
              }
            }
          }
        } else {
          let tmp1: boolean;
          if (containment) {
            const x1 = shape.aabb;
            tmp1 =
              x1.minx >= ab.minx && x1.miny >= ab.miny && x1.maxx <= ab.maxx && x1.maxy <= ab.maxy;
          } else {
            const _this2 = shape.aabb;
            tmp1 =
              ab.miny <= _this2.maxy &&
              _this2.miny <= ab.maxy &&
              ab.minx <= _this2.maxx &&
              _this2.minx <= ab.maxx;
          }
          if (tmp1) {
            ret.push(shape.outer);
          }
        }
      }
    }
    return ret;
  }

  bodiesInAABB(aabb: any, strict: boolean, containment: boolean, filter: any, output: any): any {
    this.space.validation();
    (this as any).updateAABBShape(aabb);
    const ab = (this as any).aabbShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.phys.BodyList() : output;
    const seen = new Set<any>();
    for (let j = 0; j < ret.length; j++) seen.add(ret.at(j));
    const failed = new Set<any>();

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const body = shape.body.outer;
      const _this = shape.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        if (filter == null || shape.filter.shouldCollide(filter)) {
          if (strict) {
            if (containment) {
              if (!failed.has(body)) {
                const col = ZPP_Collide.containTest((this as any).aabbShape.zpp_inner, shape);
                if (!seen.has(body) && col) {
                  seen.add(body);
                  ret.push(body);
                } else if (!col) {
                  seen.delete(body);
                  ret.remove(body);
                  failed.add(body);
                }
              }
            } else if (
              !seen.has(body) &&
              ZPP_Collide.testCollide_safe(shape, (this as any).aabbShape.zpp_inner)
            ) {
              seen.add(body);
              ret.push(body);
            }
          } else if (containment) {
            if (!failed.has(body)) {
              const x = shape.aabb;
              const col1 =
                x.minx >= ab.minx && x.miny >= ab.miny && x.maxx <= ab.maxx && x.maxy <= ab.maxy;
              if (!seen.has(body) && col1) {
                seen.add(body);
                ret.push(body);
              } else if (!col1) {
                seen.delete(body);
                ret.remove(body);
                failed.add(body);
              }
            }
          } else {
            let tmp1: boolean;
            if (!seen.has(body)) {
              const x1 = shape.aabb;
              tmp1 =
                x1.minx >= ab.minx &&
                x1.miny >= ab.miny &&
                x1.maxx <= ab.maxx &&
                x1.maxy <= ab.maxy;
            } else {
              tmp1 = false;
            }
            if (tmp1) {
              seen.add(body);
              ret.push(body);
            }
          }
        }
      }
    }
    return ret;
  }

  // ========== Spatial queries: shapes/bodies in circle ==========

  shapesInCircle(
    x: number,
    y: number,
    r: number,
    containment: boolean,
    filter: any,
    output: any,
  ): any {
    this.space.validation();
    (this as any).updateCircShape(x, y, r);
    const ab = (this as any).circShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.shape.ShapeList() : output;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const _this = shape.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        if (filter == null || shape.filter.shouldCollide(filter)) {
          if (containment) {
            if (ZPP_Collide.containTest((this as any).circShape.zpp_inner, shape)) {
              ret.push(shape.outer);
            }
          } else if (ZPP_Collide.testCollide_safe(shape, (this as any).circShape.zpp_inner)) {
            ret.push(shape.outer);
          }
        }
      }
    }
    return ret;
  }

  bodiesInCircle(
    x: number,
    y: number,
    r: number,
    containment: boolean,
    filter: any,
    output: any,
  ): any {
    this.space.validation();
    (this as any).updateCircShape(x, y, r);
    const ab = (this as any).circShape.zpp_inner.aabb;
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.phys.BodyList() : output;
    const seen = new Set<any>();
    for (let j = 0; j < ret.length; j++) seen.add(ret.at(j));
    const failed = new Set<any>();

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const _this = shape.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        const body = shape.body.outer;
        if (filter == null || shape.filter.shouldCollide(filter)) {
          if (containment) {
            if (!failed.has(body)) {
              const col = ZPP_Collide.containTest((this as any).circShape.zpp_inner, shape);
              if (!seen.has(body) && col) {
                seen.add(body);
                ret.push(body);
              } else if (!col) {
                seen.delete(body);
                ret.remove(body);
                failed.add(body);
              }
            }
          } else if (
            !seen.has(body) &&
            ZPP_Collide.testCollide_safe(shape, (this as any).circShape.zpp_inner)
          ) {
            seen.add(body);
            ret.push(body);
          }
        }
      }
    }
    return ret;
  }

  // ========== Spatial queries: shapes/bodies in shape ==========

  shapesInShape(shape: any, containment: boolean, filter: any, output: any): any {
    this.space.validation();
    (this as any).validateShape(shape);
    const ab = shape.aabb;
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.shape.ShapeList() : output;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape2 = this.shapes[i];
      const _this = shape2.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        if (filter == null || shape2.filter.shouldCollide(filter)) {
          if (containment) {
            if (ZPP_Collide.containTest(shape, shape2)) {
              ret.push(shape2.outer);
            }
          } else if (ZPP_Collide.testCollide_safe(shape2, shape)) {
            ret.push(shape2.outer);
          }
        }
      }
    }
    return ret;
  }

  bodiesInShape(shape: any, containment: boolean, filter: any, output: any): any {
    this.space.validation();
    (this as any).validateShape(shape);
    const ab = shape.aabb;
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.phys.BodyList() : output;
    const seen = new Set<any>();
    for (let j = 0; j < ret.length; j++) seen.add(ret.at(j));
    const failed = new Set<any>();

    for (let i = 0; i < this.shapes.length; i++) {
      const shape2 = this.shapes[i];
      const _this = shape2.aabb;
      if (
        ab.miny <= _this.maxy &&
        _this.miny <= ab.maxy &&
        ab.minx <= _this.maxx &&
        _this.minx <= ab.maxx
      ) {
        const body = shape2.body.outer;
        if (filter == null || shape2.filter.shouldCollide(filter)) {
          if (containment) {
            if (!failed.has(body)) {
              const col = ZPP_Collide.containTest(shape, shape2);
              if (!seen.has(body) && col) {
                seen.add(body);
                ret.push(body);
              } else if (!col) {
                seen.delete(body);
                ret.remove(body);
                failed.add(body);
              }
            }
          } else if (!seen.has(body) && ZPP_Collide.testCollide_safe(shape, shape2)) {
            seen.add(body);
            ret.push(body);
          }
        }
      }
    }
    return ret;
  }

  // ========== Raycasting ==========

  rayCast(ray: any, inner: boolean, filter: any): any {
    this.space.validation();
    ray.validate_dir();
    const rayab = ray.rayAABB();
    let mint = ray.maxdist;
    let minres: any = null;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const _this = shape.aabb;
      let tmp: boolean;
      if (
        rayab.miny <= _this.maxy &&
        _this.miny <= rayab.maxy &&
        rayab.minx <= _this.maxx &&
        _this.minx <= rayab.maxx
      ) {
        if (filter != null) {
          const _this1 = shape.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
      } else {
        tmp = false;
      }
      if (tmp) {
        const t = ray.aabbsect(_this);
        if (t >= 0 && t < mint) {
          const result =
            shape.type == 0
              ? ray.circlesect(shape.circle, inner, mint)
              : ray.polysect(shape.polygon, inner, mint);
          if (result != null) {
            if (result.zpp_inner.next != null) {
              throw new Error("This object has been disposed of and cannot be used");
            }
            mint = result.zpp_inner.toiDistance;
            if (minres != null) {
              if (minres.zpp_inner.next != null) {
                throw new Error("This object has been disposed of and cannot be used");
              }
              minres.zpp_inner.free();
            }
            minres = result;
          }
        }
      }
    }

    const o = rayab;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;

    return minres;
  }

  rayMultiCast(ray: any, inner: boolean, filter: any, output: any): any {
    this.space.validation();
    ray.validate_dir();
    const rayab = ray.rayAABB();
    const ret = output == null ? new ZPP_SpatialHashPhase._nape.geom.RayResultList() : output;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const _this = shape.aabb;
      let tmp: boolean;
      if (
        rayab.miny <= _this.maxy &&
        _this.miny <= rayab.maxy &&
        rayab.minx <= _this.maxx &&
        _this.minx <= rayab.maxx
      ) {
        if (filter != null) {
          const _this1 = shape.filter;
          tmp =
            (_this1.collisionMask & filter.collisionGroup) != 0 &&
            (filter.collisionMask & _this1.collisionGroup) != 0;
        } else {
          tmp = true;
        }
      } else {
        tmp = false;
      }
      if (tmp) {
        const t = ray.aabbsect(_this);
        if (t >= 0) {
          if (shape.type == 0) {
            ray.circlesect2(shape.circle, inner, ret);
          } else {
            ray.polysect2(shape.polygon, inner, ret);
          }
        }
      }
    }

    const o = rayab;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;

    return ret;
  }
}
