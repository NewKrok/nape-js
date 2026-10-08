/**
 * ZPP_Ray — Internal ray representation for the nape physics engine.
 *
 * Manages ray origin/direction with invalidation callbacks, plus ray-shape
 * intersection methods (AABB, circle, polygon).
 */

import { getNape } from "../../core/engine";
import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_AABB } from "./ZPP_AABB";
import { ZPP_ConvexRayResult } from "./ZPP_ConvexRayResult";
import { Config } from "../../Config";

export class ZPP_Ray {
  // --- Static: internal flag ---
  static internal = false;

  // --- Instance fields ---
  zip_dir = false;
  absnormaly = 0.0;
  absnormalx = 0.0;
  normaly = 0.0;
  normalx = 0.0;
  idiry = 0.0;
  idirx = 0.0;
  diry = 0.0;
  dirx = 0.0;
  originy = 0.0;
  originx = 0.0;
  userData: unknown = null;
  maxdist = 0.0;
  direction: any = null;
  origin: any = null;

  constructor() {
    const nape = getNape();

    // --- Create origin Vec2 wrapper from pool ---
    const ret = nape.geom.Vec2.get(0, 0);
    this.origin = ret;
    this.origin.zpp_inner._invalidate = (x: ZPP_Vec2) => this.origin_invalidate(x);

    // --- Create direction Vec2 wrapper from pool ---
    const ret2 = nape.geom.Vec2.get(0, 0);
    this.direction = ret2;
    this.direction.zpp_inner._invalidate = (x: ZPP_Vec2) => this.direction_invalidate(x);

    this.originx = 0;
    this.originy = 0;
    this.dirx = 0;
    this.diry = 0;
    this.zip_dir = false;
  }

  // ---------------------------------------------------------------------------
  // Invalidation callbacks
  // ---------------------------------------------------------------------------

  origin_invalidate(x: ZPP_Vec2): void {
    this.originx = x.x;
    this.originy = x.y;
  }

  direction_invalidate(x: ZPP_Vec2): void {
    this.dirx = x.x;
    this.diry = x.y;
    this.zip_dir = true;
  }

  // ---------------------------------------------------------------------------
  // Direction validation (normalizes + computes inverse/normals)
  // ---------------------------------------------------------------------------

  validate_dir(): void {
    if (this.zip_dir) {
      this.zip_dir = false;
      if (this.dirx * this.dirx + this.diry * this.diry < Config.epsilon) {
        throw new Error("Ray::direction is degenerate");
      }
      const d = this.dirx * this.dirx + this.diry * this.diry;
      const imag = 1.0 / Math.sqrt(d);
      this.dirx *= imag;
      this.diry *= imag;
      this.idirx = 1 / this.dirx;
      this.idiry = 1 / this.diry;
      this.normalx = -this.diry;
      this.normaly = this.dirx;
      const ax = this.normalx;
      this.absnormalx = ax < 0 ? -ax : ax;
      const ay = this.normaly;
      this.absnormaly = ay < 0 ? -ay : ay;
    }
  }

  // ---------------------------------------------------------------------------
  // rayAABB — Compute the AABB of this ray
  // ---------------------------------------------------------------------------

  rayAABB(): ZPP_AABB {
    let x0 = this.originx;
    let x1 = x0;
    let y0 = this.originy;
    let y1 = y0;

    if (this.maxdist >= Infinity) {
      if (this.dirx > 0) {
        x1 = Infinity;
      } else if (this.dirx < 0) {
        x1 = -Infinity;
      }
      if (this.diry > 0) {
        y1 = Infinity;
      } else if (this.diry < 0) {
        y1 = -Infinity;
      }
    } else {
      x1 += this.maxdist * this.dirx;
      y1 += this.maxdist * this.diry;
    }

    if (x1 < x0) {
      const t = x0;
      x0 = x1;
      x1 = t;
    }
    if (y1 < y0) {
      const t1 = y0;
      y0 = y1;
      y1 = t1;
    }

    const ret: ZPP_AABB = ZPP_AABB.get(x0, y0, x1, y1);
    return ret;
  }

  // ---------------------------------------------------------------------------
  // aabbtest — Test if ray overlaps an AABB (separating axis test)
  // ---------------------------------------------------------------------------

  aabbtest(a: ZPP_AABB): boolean {
    const dot1 =
      this.normalx * (this.originx - 0.5 * (a.minx + a.maxx)) +
      this.normaly * (this.originy - 0.5 * (a.miny + a.maxy));
    const dot2 =
      this.absnormalx * 0.5 * (a.maxx - a.minx) + this.absnormaly * 0.5 * (a.maxy - a.miny);
    const x = dot1;
    return (x < 0 ? -x : x) < dot2;
  }

  // ---------------------------------------------------------------------------
  // aabbsect — Find the closest intersection of ray with an AABB
  // ---------------------------------------------------------------------------

  aabbsect(a: ZPP_AABB): number {
    const cx = this.originx >= a.minx && this.originx <= a.maxx;
    const cy = this.originy >= a.miny && this.originy <= a.maxy;
    if (cx && cy) {
      return 0.0;
    } else {
      let ret = -1.0;
      while (!(this.dirx >= 0 && this.originx >= a.maxx)) {
        if (this.dirx <= 0 && this.originx <= a.minx) {
          break;
        }
        if (this.diry >= 0 && this.originy >= a.maxy) {
          break;
        }
        if (this.diry <= 0 && this.originy <= a.miny) {
          break;
        }
        if (this.dirx > 0) {
          const t = (a.minx - this.originx) * this.idirx;
          if (t >= 0 && t <= this.maxdist) {
            const y = this.originy + t * this.diry;
            if (y >= a.miny && y <= a.maxy) {
              ret = t;
              break;
            }
          }
        } else if (this.dirx < 0) {
          const t1 = (a.maxx - this.originx) * this.idirx;
          if (t1 >= 0 && t1 <= this.maxdist) {
            const y1 = this.originy + t1 * this.diry;
            if (y1 >= a.miny && y1 <= a.maxy) {
              ret = t1;
              break;
            }
          }
        }
        if (this.diry > 0) {
          const t2 = (a.miny - this.originy) * this.idiry;
          if (t2 >= 0 && t2 <= this.maxdist) {
            const x = this.originx + t2 * this.dirx;
            if (x >= a.minx && x <= a.maxx) {
              ret = t2;
              break;
            }
          }
        } else if (this.diry < 0) {
          const t3 = (a.maxy - this.originy) * this.idiry;
          if (t3 >= 0 && t3 <= this.maxdist) {
            const x1 = this.originx + t3 * this.dirx;
            if (x1 >= a.minx && x1 <= a.maxx) {
              ret = t3;
              break;
            }
          }
        }
        break;
      }
      return ret;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: allocate a Vec2 wrapper with given (x, y) from pool
  // ---------------------------------------------------------------------------

  private static _allocVec2(x: number, y: number): any {
    return getNape().geom.Vec2.get(x, y);
  }

  // ---------------------------------------------------------------------------
  // Helper: compute circle normal at intersection point
  // ---------------------------------------------------------------------------

  private _circleNormal(t: number, c: any, insideFlip: boolean): { nx: number; ny: number } {
    let nx = this.originx + this.dirx * t;
    let ny = this.originy + this.diry * t;
    nx -= c.worldCOMx;
    ny -= c.worldCOMy;
    const d = nx * nx + ny * ny;
    const imag = 1.0 / Math.sqrt(d);
    nx *= imag;
    ny *= imag;
    if (insideFlip) {
      nx = -nx;
      ny = -ny;
    }
    return { nx, ny };
  }

  // ---------------------------------------------------------------------------
  // Helper: insert a result into a sorted list (by toiDistance)
  // ---------------------------------------------------------------------------

  private static _insertSorted(list: any, res: any): void {
    let pre: any = null;
    let cx_ite = list.zpp_inner.inner.head;
    while (cx_ite != null) {
      const j = cx_ite.elt;
      if (res.zpp_inner.next != null) {
        throw new Error("This object has been disposed of and cannot be used");
      }
      if (j.zpp_inner.next != null) {
        throw new Error("This object has been disposed of and cannot be used");
      }
      if (res.zpp_inner.toiDistance < j.zpp_inner.toiDistance) {
        break;
      }
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    list.zpp_inner.inner.insert(pre, res);
  }

  // ---------------------------------------------------------------------------
  // circlesect — Find closest circle intersection (single result)
  // ---------------------------------------------------------------------------

  circlesect(c: any, inner: boolean, mint: number): any {
    c.validate_worldCOM();

    const acx = this.originx - c.worldCOMx;
    const acy = this.originy - c.worldCOMy;
    let A = this.dirx * this.dirx + this.diry * this.diry;
    const B = 2 * (acx * this.dirx + acy * this.diry);
    const C = acx * acx + acy * acy - c.radius * c.radius;
    let det = B * B - 4 * A * C;

    if (det == 0) {
      const t = (-B / 2) * A;
      if ((!inner || C > 0) && t > 0 && t < mint && t <= this.maxdist) {
        const n = this._circleNormal(t, c, C <= 0);
        const normalVec = ZPP_Ray._allocVec2(n.nx, n.ny);
        return ZPP_ConvexRayResult.getRay(normalVec, t, C <= 0, c.outer);
      } else {
        return null;
      }
    } else {
      det = Math.sqrt(det);
      A = 1 / (2 * A);
      const t0 = (-B - det) * A;
      const t1 = (-B + det) * A;

      if (t0 > 0) {
        if (t0 < mint && t0 <= this.maxdist) {
          const n = this._circleNormal(t0, c, false);
          const normalVec = ZPP_Ray._allocVec2(n.nx, n.ny);
          return ZPP_ConvexRayResult.getRay(normalVec, t0, false, c.outer);
        } else {
          return null;
        }
      } else if (t1 > 0 && inner) {
        if (t1 < mint && t1 <= this.maxdist) {
          const n = this._circleNormal(t1, c, true);
          const normalVec = ZPP_Ray._allocVec2(n.nx, n.ny);
          return ZPP_ConvexRayResult.getRay(normalVec, t1, true, c.outer);
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // circlesect2 — Find all circle intersections (insert into sorted list)
  // ---------------------------------------------------------------------------

  circlesect2(c: any, inner: boolean, list: any): void {
    c.validate_worldCOM();

    const acx = this.originx - c.worldCOMx;
    const acy = this.originy - c.worldCOMy;
    let A = this.dirx * this.dirx + this.diry * this.diry;
    const B = 2 * (acx * this.dirx + acy * this.diry);
    const C = acx * acx + acy * acy - c.radius * c.radius;
    let det = B * B - 4 * A * C;

    if (det == 0) {
      const t = (-B / 2) * A;
      if ((!inner || C > 0) && t > 0 && t <= this.maxdist) {
        const n = this._circleNormal(t, c, C <= 0);
        const normalVec = ZPP_Ray._allocVec2(n.nx, n.ny);
        const res = ZPP_ConvexRayResult.getRay(normalVec, t, C <= 0, c.outer);
        ZPP_Ray._insertSorted(list, res);
      }
    } else {
      det = Math.sqrt(det);
      A = 1 / (2 * A);
      const t0 = (-B - det) * A;
      const t1 = (-B + det) * A;

      if (t0 > 0 && t0 <= this.maxdist) {
        const n = this._circleNormal(t0, c, false);
        const normalVec = ZPP_Ray._allocVec2(n.nx, n.ny);
        const res = ZPP_ConvexRayResult.getRay(normalVec, t0, false, c.outer);
        ZPP_Ray._insertSorted(list, res);
      }
      if (t1 > 0 && t1 <= this.maxdist && inner) {
        const n = this._circleNormal(t1, c, true);
        const normalVec = ZPP_Ray._allocVec2(n.nx, n.ny);
        const res = ZPP_ConvexRayResult.getRay(normalVec, t1, true, c.outer);
        ZPP_Ray._insertSorted(list, res);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // polysect — Find closest polygon intersection (single result)
  // ---------------------------------------------------------------------------

  polysect(p: any, inner: boolean, mint: number): any {
    let min = mint;
    let edge: any = null;
    let ei = p.edges.head;

    // Iterate edges using paired vertex ring
    const cx_cont = true;
    const cx_itei = p.gverts.next;
    let u = cx_itei;
    let cx_itej = cx_itei.next;

    while (cx_itej != null) {
      const v = cx_itej;
      const e = ei.elt;
      if (inner || e.gnormx * this.dirx + e.gnormy * this.diry < 0) {
        const _vx = v.x - u.x;
        const _vy = v.y - u.y;
        const _sx = u.x - this.originx;
        const _sy = u.y - this.originy;
        let den = _vy * this.dirx - _vx * this.diry;
        if (den * den > Config.epsilon) {
          den = 1 / den;
          const sxx = (_vy * _sx - _vx * _sy) * den;
          if (sxx > 0 && sxx < min && sxx <= this.maxdist) {
            const txx = (this.diry * _sx - this.dirx * _sy) * den;
            if (txx > -Config.epsilon && txx < 1 + Config.epsilon) {
              min = sxx;
              edge = ei.elt;
            }
          }
        }
      }
      ei = ei.next;
      u = v;
      cx_itej = cx_itej.next;
    }

    // Wrap-around: last vertex to first vertex
    if (cx_cont) {
      cx_itej = p.gverts.next;
      const v1 = cx_itej;
      const e1 = ei.elt;
      if (inner || e1.gnormx * this.dirx + e1.gnormy * this.diry < 0) {
        const _vx1 = v1.x - u.x;
        const _vy1 = v1.y - u.y;
        const _sx1 = u.x - this.originx;
        const _sy1 = u.y - this.originy;
        let den1 = _vy1 * this.dirx - _vx1 * this.diry;
        if (den1 * den1 > Config.epsilon) {
          den1 = 1 / den1;
          const sxx1 = (_vy1 * _sx1 - _vx1 * _sy1) * den1;
          if (sxx1 > 0 && sxx1 < min && sxx1 <= this.maxdist) {
            const txx1 = (this.diry * _sx1 - this.dirx * _sy1) * den1;
            if (txx1 > -Config.epsilon && txx1 < 1 + Config.epsilon) {
              min = sxx1;
              edge = ei.elt;
            }
          }
        }
      }
    }

    if (edge != null) {
      let nx = edge.gnormx;
      let ny = edge.gnormy;
      const inner1 = nx * this.dirx + ny * this.diry > 0;
      if (inner1) {
        nx = -nx;
        ny = -ny;
      }
      const normalVec = ZPP_Ray._allocVec2(nx, ny);
      return ZPP_ConvexRayResult.getRay(normalVec, min, inner1, p.outer);
    } else {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // polysect2 — Find all polygon intersections (insert into sorted list)
  // ---------------------------------------------------------------------------

  polysect2(p: any, inner: boolean, list: any): void {
    let min = Infinity;
    let max = -1.0;
    let edge: any = null;
    let edgemax: any = null;
    let ei = p.edges.head;

    // Iterate edges using paired vertex ring
    const cx_cont = true;
    const cx_itei = p.gverts.next;
    let u = cx_itei;
    let cx_itej = cx_itei.next;

    while (cx_itej != null) {
      const v = cx_itej;
      const e = ei.elt;
      if (inner || e.gnormx * this.dirx + e.gnormy * this.diry < 0) {
        const _vx = v.x - u.x;
        const _vy = v.y - u.y;
        const _sx = u.x - this.originx;
        const _sy = u.y - this.originy;
        let den = _vy * this.dirx - _vx * this.diry;
        if (den * den > Config.epsilon) {
          den = 1 / den;
          const sxx = (_vy * _sx - _vx * _sy) * den;
          if (sxx > 0 && sxx <= this.maxdist && (sxx < min || sxx > max)) {
            const txx = (this.diry * _sx - this.dirx * _sy) * den;
            if (txx > -Config.epsilon && txx < 1 + Config.epsilon) {
              if (sxx < min) {
                min = sxx;
                edge = ei.elt;
              }
              if (sxx > max) {
                max = sxx;
                edgemax = ei.elt;
              }
            }
          }
        }
      }
      ei = ei.next;
      u = v;
      cx_itej = cx_itej.next;
    }

    // Wrap-around: last vertex to first vertex
    if (cx_cont) {
      cx_itej = p.gverts.next;
      const v1 = cx_itej;
      const e1 = ei.elt;
      if (inner || e1.gnormx * this.dirx + e1.gnormy * this.diry < 0) {
        const _vx1 = v1.x - u.x;
        const _vy1 = v1.y - u.y;
        const _sx1 = u.x - this.originx;
        const _sy1 = u.y - this.originy;
        let den1 = _vy1 * this.dirx - _vx1 * this.diry;
        if (den1 * den1 > Config.epsilon) {
          den1 = 1 / den1;
          const sxx1 = (_vy1 * _sx1 - _vx1 * _sy1) * den1;
          if (sxx1 > 0 && sxx1 <= this.maxdist && (sxx1 < min || sxx1 > max)) {
            const txx1 = (this.diry * _sx1 - this.dirx * _sy1) * den1;
            if (txx1 > -Config.epsilon && txx1 < 1 + Config.epsilon) {
              if (sxx1 < min) {
                min = sxx1;
                edge = ei.elt;
              }
              if (sxx1 > max) {
                max = sxx1;
                edgemax = ei.elt;
              }
            }
          }
        }
      }
    }

    // Insert the min-distance edge result
    if (edge != null) {
      let nx = edge.gnormx;
      let ny = edge.gnormy;
      const inner1 = nx * this.dirx + ny * this.diry > 0;
      if (inner1) {
        nx = -nx;
        ny = -ny;
      }
      const normalVec = ZPP_Ray._allocVec2(nx, ny);
      const res = ZPP_ConvexRayResult.getRay(normalVec, min, inner1, p.outer);
      ZPP_Ray._insertSorted(list, res);
    }

    // Insert the max-distance edge result (if different from min edge)
    if (edgemax != null && edge != edgemax) {
      let nx1 = edgemax.gnormx;
      let ny1 = edgemax.gnormy;
      const inner2 = nx1 * this.dirx + ny1 * this.diry > 0;
      if (inner2) {
        nx1 = -nx1;
        ny1 = -ny1;
      }
      const normalVec = ZPP_Ray._allocVec2(nx1, ny1);
      const res = ZPP_ConvexRayResult.getRay(normalVec, max, inner2, p.outer);
      ZPP_Ray._insertSorted(list, res);
    }
  }
}
