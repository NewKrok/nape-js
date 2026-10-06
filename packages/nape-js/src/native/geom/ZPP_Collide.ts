/**
 * ZPP_Collide — Internal narrowphase collision dispatcher for the nape physics engine.
 *
 * Handles containment testing, contact generation, and fluid collision
 * (polygon clipping) between shapes.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { ZPP_Shape } from "../shape/ZPP_Shape";
import { ZPP_Body } from "../phys/ZPP_Body";
import { ZPP_ColArbiter } from "../dynamics/ZPP_ColArbiter";
import { ZPP_FluidArbiter } from "../dynamics/ZPP_FluidArbiter";
import { ZPP_Contact } from "../dynamics/ZPP_Contact";
import { Config } from "../../Config";

export class ZPP_Collide {
  /**
   * Get or create the contact with the given hash on arb, resetting impulse
   * accumulators and prepending to arb.contacts when freshly created.
   */
  static _getContact(arb: any, hash: number): any {
    let c = null;
    let cx_ite = arb.contacts.next;
    while (cx_ite != null) {
      const cur = cx_ite;
      if (hash == cur.hash) {
        c = cur;
        break;
      }
      cx_ite = cx_ite.next;
    }
    if (c == null) {
      if (ZPP_Contact.zpp_pool == null) {
        c = new ZPP_Contact();
      } else {
        c = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = c.next;
        c.next = null;
      }
      const ci = c.inner;
      ci.jnAcc = ci.jtAcc = 0;
      c.hash = hash;
      c.fresh = true;
      c.arbiter = arb;
      arb.jrAcc = 0;
      const contacts = arb.contacts;
      c._inuse = true;
      c.next = contacts.next;
      contacts.next = c;
      contacts.modified = true;
      contacts.length++;
      arb.innards.add(ci);
    } else {
      c.fresh = false;
    }
    return c;
  }

  /** Internal list for flow collision polygon vertices (ZNPList_ZPP_Vec2). */
  static flowpoly: any = null;

  /**
   * Initialize static working lists. Called once from compiled factory.
   */
  static _initStatics(zpp_nape: any): void {
    ZPP_Collide.flowpoly = new zpp_nape.util.ZNPList_ZPP_Vec2();
    ZPP_Collide.flowsegs = new zpp_nape.util.ZNPList_ZPP_Vec2();
  }

  /** Internal list for flow collision segments (ZNPList_ZPP_Vec2). */
  static flowsegs: any = null;

  static circleContains(c: any, p: ZPP_Vec2) {
    const dx = p.x - c.worldCOMx;
    const dy = p.y - c.worldCOMy;
    return dx * dx + dy * dy < c.radius * c.radius;
  }
  static polyContains(s: any, p: ZPP_Vec2) {
    let retvar;
    retvar = true;
    let cx_ite = s.edges.head;
    while (cx_ite != null) {
      const a = cx_ite.elt;
      if (a.gnormx * p.x + a.gnormy * p.y <= a.gprojection) {
        cx_ite = cx_ite.next;
        continue;
      } else {
        retvar = false;
        break;
      }
    }
    return retvar;
  }
  static shapeContains(s: ZPP_Shape, p: ZPP_Vec2) {
    if (s.type == 0) {
      return ZPP_Collide.circleContains(s.circle, p);
    } else {
      return ZPP_Collide.polyContains(s.polygon, p);
    }
  }
  static bodyContains(b: ZPP_Body, p: ZPP_Vec2) {
    let retvar;
    retvar = false;
    let cx_ite = b.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      if (ZPP_Collide.shapeContains(s, p)) {
        retvar = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    return retvar;
  }
  static containTest(s1: ZPP_Shape, s2: ZPP_Shape) {
    const _this = s1.aabb;
    const x = s2.aabb;
    if (
      x.minx >= _this.minx &&
      x.miny >= _this.miny &&
      x.maxx <= _this.maxx &&
      x.maxy <= _this.maxy
    ) {
      if (s1.type == 0) {
        if (s2.type == 0) {
          const minDist = s1.circle.radius + -s2.circle.radius;
          const px = s2.circle.worldCOMx - s1.circle.worldCOMx;
          const py = s2.circle.worldCOMy - s1.circle.worldCOMy;
          const distSqr = px * px + py * py;
          return distSqr <= minDist * minDist;
        } else {
          let retvar;
          retvar = true;
          let cx_ite = s2.polygon.gverts.next;
          while (cx_ite != null) {
            const p = cx_ite;
            const minDist1 = s1.circle.radius;
            const px1 = p.x - s1.circle.worldCOMx;
            const py1 = p.y - s1.circle.worldCOMy;
            const distSqr1 = px1 * px1 + py1 * py1;
            if (distSqr1 <= minDist1 * minDist1) {
              cx_ite = cx_ite.next;
              continue;
            } else {
              retvar = false;
              break;
            }
          }
          return retvar;
        }
      } else if (s2.type == 0) {
        let retvar1;
        retvar1 = true;
        let cx_ite1 = s1.polygon.edges.head;
        while (cx_ite1 != null) {
          const a = cx_ite1.elt;
          if (
            a.gnormx * s2.circle.worldCOMx + a.gnormy * s2.circle.worldCOMy + s2.circle.radius <=
            a.gprojection
          ) {
            cx_ite1 = cx_ite1.next;
            continue;
          } else {
            retvar1 = false;
            break;
          }
        }
        return retvar1;
      } else {
        let retvar2;
        retvar2 = true;
        let cx_ite2 = s1.polygon.edges.head;
        while (cx_ite2 != null) {
          const a1 = cx_ite2.elt;
          let max = -1e100;
          let cx_ite3 = s2.polygon.gverts.next;
          while (cx_ite3 != null) {
            const v = cx_ite3;
            const k = a1.gnormx * v.x + a1.gnormy * v.y;
            if (k > max) {
              max = k;
            }
            cx_ite3 = cx_ite3.next;
          }
          if (max <= a1.gprojection) {
            cx_ite2 = cx_ite2.next;
            continue;
          } else {
            retvar2 = false;
            break;
          }
        }
        return retvar2;
      }
    } else {
      return false;
    }
  }
  static contactCollide(s1: ZPP_Shape, s2: ZPP_Shape, arb: ZPP_ColArbiter, rev: boolean) {
    if (s2.type == 1) {
      if (s1.type == 1) {
        // Separating-axis cache: if this pair was separated last time, re-test
        // that single axis exactly. The separating early-outs below mutate
        // nothing on arb before returning false, so an early return here is
        // observably identical to running the full SAT to the same conclusion.
        const sepEdge = arb.__sep_edge;
        if (sepEdge != null) {
          let sepVerts = null;
          if (arb.__sep_owner == s1) {
            sepVerts = s2.polygon.gverts.next;
          } else if (arb.__sep_owner == s2) {
            sepVerts = s1.polygon.gverts.next;
          }
          if (sepVerts != null) {
            let sepMin = 1e100;
            while (sepVerts != null) {
              const k = sepEdge.gnormx * sepVerts.x + sepEdge.gnormy * sepVerts.y;
              if (k < sepMin) {
                sepMin = k;
              }
              sepVerts = sepVerts.next;
            }
            if (sepMin - sepEdge.gprojection >= 0) {
              return false;
            }
          }
          arb.__sep_edge = null;
          arb.__sep_owner = null;
        }
        let cont = true;
        let max = -1e100;
        let maxi = -1;
        let axis1 = null;
        let axis2 = null;
        let cx_ite = s1.polygon.edges.head;
        while (cx_ite != null) {
          const ax = cx_ite.elt;
          let min = 1e100;
          let cx_ite1 = s2.polygon.gverts.next;
          while (cx_ite1 != null) {
            const v = cx_ite1;
            const k = ax.gnormx * v.x + ax.gnormy * v.y;
            if (k < min) {
              min = k;
            }
            if (min - ax.gprojection <= max) {
              break;
            }
            cx_ite1 = cx_ite1.next;
          }
          min -= ax.gprojection;
          if (min >= 0) {
            arb.__sep_edge = ax;
            arb.__sep_owner = s1;
            cont = false;
            break;
          }
          if (min > max) {
            max = min;
            axis1 = ax;
            maxi = 1;
          }
          cx_ite = cx_ite.next;
        }
        if (cont) {
          let cx_ite2 = s2.polygon.edges.head;
          while (cx_ite2 != null) {
            const ax1 = cx_ite2.elt;
            let min1 = 1e100;
            let cx_ite3 = s1.polygon.gverts.next;
            while (cx_ite3 != null) {
              const v1 = cx_ite3;
              const k1 = ax1.gnormx * v1.x + ax1.gnormy * v1.y;
              if (k1 < min1) {
                min1 = k1;
              }
              if (min1 - ax1.gprojection <= max) {
                break;
              }
              cx_ite3 = cx_ite3.next;
            }
            min1 -= ax1.gprojection;
            if (min1 >= 0) {
              arb.__sep_edge = ax1;
              arb.__sep_owner = s2;
              cont = false;
              break;
            }
            if (min1 > max) {
              max = min1;
              axis2 = ax1;
              maxi = 2;
            }
            cx_ite2 = cx_ite2.next;
          }
          if (!cont) {
            return false;
          } else {
            let q2;
            let ax2;
            let scale;
            if (maxi == 1) {
              q2 = s2.polygon;
              ax2 = axis1;
              scale = 1.0;
            } else {
              q2 = s1.polygon;
              ax2 = axis2;
              scale = -1.0;
            }
            let ay = null;
            let min2 = 1e100;
            let cx_ite4 = q2.edges.head;
            while (cx_ite4 != null) {
              const axis = cx_ite4.elt;
              const k2 = ax2.gnormx * axis.gnormx + ax2.gnormy * axis.gnormy;
              if (k2 < min2) {
                min2 = k2;
                ay = axis;
              }
              cx_ite4 = cx_ite4.next;
            }
            let c0x = ay.gp0.x;
            let c0y = ay.gp0.y;
            let c1x = ay.gp1.x;
            let c1y = ay.gp1.y;
            const dvx = c1x - c0x;
            const dvy = c1y - c0y;
            const d0 = ax2.gnormy * c0x - ax2.gnormx * c0y;
            const d1 = ax2.gnormy * c1x - ax2.gnormx * c1y;
            const den = 1 / (d1 - d0);
            const t = (-ax2.tp1 - d0) * den;
            if (t > Config.epsilon) {
              const t1 = t;
              c0x += dvx * t1;
              c0y += dvy * t1;
            }
            const t2 = (-ax2.tp0 - d1) * den;
            if (t2 < -Config.epsilon) {
              const t3 = t2;
              c1x += dvx * t3;
              c1y += dvy * t3;
            }
            const t4 = scale;
            let nx = ax2.gnormx * t4;
            let ny = ax2.gnormy * t4;
            arb.lnormx = ax2.lnormx;
            arb.lnormy = ax2.lnormy;
            arb.lproj = ax2.lprojection;
            arb.radius = 0;
            arb.rev = rev != (scale == -1);
            arb.ptype = arb.rev ? 1 : 0;
            const c0d = c0x * ax2.gnormx + c0y * ax2.gnormy - ax2.gprojection;
            const c1d = c1x * ax2.gnormx + c1y * ax2.gnormy - ax2.gprojection;
            if (c0d > 0 && c1d > 0) {
              return false;
            } else {
              if (rev) {
                nx = -nx;
                ny = -ny;
              }
              const px = c0x - ax2.gnormx * c0d * 0.5;
              const py = c0y - ax2.gnormy * c0d * 0.5;
              const hash = arb.rev ? 1 : 0;
              let posOnly = c0d > 0;
              if (posOnly == null) {
                posOnly = false;
              }
              const c = ZPP_Collide._getContact(arb, hash);
              c.px = px;
              c.py = py;
              arb.nx = nx;
              arb.ny = ny;
              c.dist = c0d;
              c.stamp = arb.stamp;
              c.posOnly = posOnly;
              let con = c;
              const t5 = 1.0;
              c0x -= q2.body.posx * t5;
              c0y -= q2.body.posy * t5;
              con.inner.lr1x = c0x * q2.body.axisy + c0y * q2.body.axisx;
              con.inner.lr1y = c0y * q2.body.axisy - c0x * q2.body.axisx;
              const px1 = c1x - ax2.gnormx * c1d * 0.5;
              const py1 = c1y - ax2.gnormy * c1d * 0.5;
              const hash1 = arb.rev ? 0 : 1;
              let posOnly1 = c1d > 0;
              if (posOnly1 == null) {
                posOnly1 = false;
              }
              const c1 = ZPP_Collide._getContact(arb, hash1);
              c1.px = px1;
              c1.py = py1;
              arb.nx = nx;
              arb.ny = ny;
              c1.dist = c1d;
              c1.stamp = arb.stamp;
              c1.posOnly = posOnly1;
              con = c1;
              const t6 = 1.0;
              c1x -= q2.body.posx * t6;
              c1y -= q2.body.posy * t6;
              con.inner.lr1x = c1x * q2.body.axisy + c1y * q2.body.axisx;
              con.inner.lr1y = c1y * q2.body.axisy - c1x * q2.body.axisx;
              if (maxi == 1) {
                arb.__ref_edge1 = ax2;
                arb.__ref_edge2 = ay;
              } else {
                arb.__ref_edge2 = ax2;
                arb.__ref_edge1 = ay;
              }
              return true;
            }
          }
        } else {
          return false;
        }
      } else {
        // Separating-axis cache (circle vs polygon): re-test the cached edge
        // with a single dot product before the full edge scan. The separating
        // early-out below mutates nothing on arb before returning false.
        const sepEdge1 = arb.__sep_edge;
        if (sepEdge1 != null) {
          if (
            arb.__sep_owner == s2 &&
            sepEdge1.gnormx * s1.circle.worldCOMx +
              sepEdge1.gnormy * s1.circle.worldCOMy -
              sepEdge1.gprojection -
              s1.circle.radius >
              0
          ) {
            return false;
          }
          arb.__sep_edge = null;
          arb.__sep_owner = null;
        }
        let max1 = -1e100;
        let cont1 = true;
        let a0 = null;
        let vi = null;
        let vite = s2.polygon.gverts.next;
        let cx_ite7 = s2.polygon.edges.head;
        while (cx_ite7 != null) {
          const a = cx_ite7.elt;
          const dist =
            a.gnormx * s1.circle.worldCOMx +
            a.gnormy * s1.circle.worldCOMy -
            a.gprojection -
            s1.circle.radius;
          if (dist > 0) {
            arb.__sep_edge = a;
            arb.__sep_owner = s2;
            cont1 = false;
            break;
          }
          if (dist > max1) {
            max1 = dist;
            a0 = a;
            vi = vite;
          }
          vite = vite.next;
          cx_ite7 = cx_ite7.next;
        }
        if (cont1) {
          const v0 = vi;
          const v11 = vi.next == null ? s2.polygon.gverts.next : vi.next;
          const dt = s1.circle.worldCOMy * a0.gnormx - s1.circle.worldCOMx * a0.gnormy;
          if (dt <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
            const minDist = s1.circle.radius;
            const px2 = v0.x - s1.circle.worldCOMx;
            const py2 = v0.y - s1.circle.worldCOMy;
            const distSqr = px2 * px2 + py2 * py2;
            let co;
            if (distSqr > minDist * minDist) {
              co = null;
            } else if (distSqr < Config.epsilon * Config.epsilon) {
              const px3 = s1.circle.worldCOMx;
              const py3 = s1.circle.worldCOMy;
              const c2 = ZPP_Collide._getContact(arb, 0);
              c2.px = px3;
              c2.py = py3;
              arb.nx = 1;
              arb.ny = 0;
              c2.dist = -minDist;
              c2.stamp = arb.stamp;
              c2.posOnly = false;
              co = c2;
            } else {
              const invDist = 1.0 / Math.sqrt(distSqr);
              const dist1 = invDist < Config.epsilon ? 1e100 : 1.0 / invDist;
              const df = 0.5 + (s1.circle.radius - 0.5 * minDist) * invDist;
              if (rev) {
                const px4 = s1.circle.worldCOMx + px2 * df;
                const py4 = s1.circle.worldCOMy + py2 * df;
                const c3 = ZPP_Collide._getContact(arb, 0);
                c3.px = px4;
                c3.py = py4;
                arb.nx = -px2 * invDist;
                arb.ny = -py2 * invDist;
                c3.dist = dist1 - minDist;
                c3.stamp = arb.stamp;
                c3.posOnly = false;
                co = c3;
              } else {
                const px5 = s1.circle.worldCOMx + px2 * df;
                const py5 = s1.circle.worldCOMy + py2 * df;
                const c4 = ZPP_Collide._getContact(arb, 0);
                c4.px = px5;
                c4.py = py5;
                arb.nx = px2 * invDist;
                arb.ny = py2 * invDist;
                c4.dist = dist1 - minDist;
                c4.stamp = arb.stamp;
                c4.posOnly = false;
                co = c4;
              }
            }
            if (co != null) {
              const con1 = co.inner;
              arb.ptype = 2;
              const vx = v0.x - s2.polygon.body.posx;
              const vy = v0.y - s2.polygon.body.posy;
              arb.__ref_edge1 = a0;
              arb.__ref_vertex = -1;
              if (rev) {
                con1.lr1x = vx * s2.polygon.body.axisy + vy * s2.polygon.body.axisx;
                con1.lr1y = vy * s2.polygon.body.axisy - vx * s2.polygon.body.axisx;
                con1.lr2x = s1.circle.localCOMx;
                con1.lr2y = s1.circle.localCOMy;
              } else {
                con1.lr2x = vx * s2.polygon.body.axisy + vy * s2.polygon.body.axisx;
                con1.lr2y = vy * s2.polygon.body.axisy - vx * s2.polygon.body.axisx;
                con1.lr1x = s1.circle.localCOMx;
                con1.lr1y = s1.circle.localCOMy;
              }
              arb.radius = s1.circle.radius;
            }
            return co != null;
          } else if (dt >= v11.y * a0.gnormx - v11.x * a0.gnormy) {
            const minDist1 = s1.circle.radius;
            const px6 = v11.x - s1.circle.worldCOMx;
            const py6 = v11.y - s1.circle.worldCOMy;
            const distSqr1 = px6 * px6 + py6 * py6;
            let co1;
            if (distSqr1 > minDist1 * minDist1) {
              co1 = null;
            } else if (distSqr1 < Config.epsilon * Config.epsilon) {
              const px7 = s1.circle.worldCOMx;
              const py7 = s1.circle.worldCOMy;
              const c5 = ZPP_Collide._getContact(arb, 0);
              c5.px = px7;
              c5.py = py7;
              arb.nx = 1;
              arb.ny = 0;
              c5.dist = -minDist1;
              c5.stamp = arb.stamp;
              c5.posOnly = false;
              co1 = c5;
            } else {
              const invDist1 = 1.0 / Math.sqrt(distSqr1);
              const dist2 = invDist1 < Config.epsilon ? 1e100 : 1.0 / invDist1;
              const df1 = 0.5 + (s1.circle.radius - 0.5 * minDist1) * invDist1;
              if (rev) {
                const px8 = s1.circle.worldCOMx + px6 * df1;
                const py8 = s1.circle.worldCOMy + py6 * df1;
                const c6 = ZPP_Collide._getContact(arb, 0);
                c6.px = px8;
                c6.py = py8;
                arb.nx = -px6 * invDist1;
                arb.ny = -py6 * invDist1;
                c6.dist = dist2 - minDist1;
                c6.stamp = arb.stamp;
                c6.posOnly = false;
                co1 = c6;
              } else {
                const px9 = s1.circle.worldCOMx + px6 * df1;
                const py9 = s1.circle.worldCOMy + py6 * df1;
                const c7 = ZPP_Collide._getContact(arb, 0);
                c7.px = px9;
                c7.py = py9;
                arb.nx = px6 * invDist1;
                arb.ny = py6 * invDist1;
                c7.dist = dist2 - minDist1;
                c7.stamp = arb.stamp;
                c7.posOnly = false;
                co1 = c7;
              }
            }
            if (co1 != null) {
              const con2 = co1.inner;
              arb.ptype = 2;
              const vx1 = v11.x - s2.polygon.body.posx;
              const vy1 = v11.y - s2.polygon.body.posy;
              arb.__ref_edge1 = a0;
              arb.__ref_vertex = 1;
              if (rev) {
                con2.lr1x = vx1 * s2.polygon.body.axisy + vy1 * s2.polygon.body.axisx;
                con2.lr1y = vy1 * s2.polygon.body.axisy - vx1 * s2.polygon.body.axisx;
                con2.lr2x = s1.circle.localCOMx;
                con2.lr2y = s1.circle.localCOMy;
              } else {
                con2.lr2x = vx1 * s2.polygon.body.axisy + vy1 * s2.polygon.body.axisx;
                con2.lr2y = vy1 * s2.polygon.body.axisy - vx1 * s2.polygon.body.axisx;
                con2.lr1x = s1.circle.localCOMx;
                con2.lr1y = s1.circle.localCOMy;
              }
              arb.radius = s1.circle.radius;
            }
            return co1 != null;
          } else {
            const t7 = s1.circle.radius + max1 * 0.5;
            const nx1 = a0.gnormx * t7;
            const ny1 = a0.gnormy * t7;
            const px10 = s1.circle.worldCOMx - nx1;
            const py10 = s1.circle.worldCOMy - ny1;
            let con3;
            if (rev) {
              const nx2 = a0.gnormx;
              const ny2 = a0.gnormy;
              const c8 = ZPP_Collide._getContact(arb, 0);
              c8.px = px10;
              c8.py = py10;
              arb.nx = nx2;
              arb.ny = ny2;
              c8.dist = max1;
              c8.stamp = arb.stamp;
              c8.posOnly = false;
              con3 = c8;
            } else {
              const nx3 = -a0.gnormx;
              const ny3 = -a0.gnormy;
              const c9 = ZPP_Collide._getContact(arb, 0);
              c9.px = px10;
              c9.py = py10;
              arb.nx = nx3;
              arb.ny = ny3;
              c9.dist = max1;
              c9.stamp = arb.stamp;
              c9.posOnly = false;
              con3 = c9;
            }
            arb.ptype = rev ? 0 : 1;
            arb.lnormx = a0.lnormx;
            arb.lnormy = a0.lnormy;
            arb.rev = !rev;
            arb.lproj = a0.lprojection;
            arb.radius = s1.circle.radius;
            con3.inner.lr1x = s1.circle.localCOMx;
            con3.inner.lr1y = s1.circle.localCOMy;
            arb.__ref_edge1 = a0;
            arb.__ref_vertex = 0;
            return true;
          }
        } else {
          return false;
        }
      }
    } else {
      const minDist2 = s1.circle.radius + s2.circle.radius;
      const px11 = s2.circle.worldCOMx - s1.circle.worldCOMx;
      const py11 = s2.circle.worldCOMy - s1.circle.worldCOMy;
      const distSqr2 = px11 * px11 + py11 * py11;
      let co2;
      if (distSqr2 > minDist2 * minDist2) {
        co2 = null;
      } else if (distSqr2 < Config.epsilon * Config.epsilon) {
        const px12 = s1.circle.worldCOMx;
        const py12 = s1.circle.worldCOMy;
        const c10 = ZPP_Collide._getContact(arb, 0);
        c10.px = px12;
        c10.py = py12;
        arb.nx = 1;
        arb.ny = 0;
        c10.dist = -minDist2;
        c10.stamp = arb.stamp;
        c10.posOnly = false;
        co2 = c10;
      } else {
        const invDist2 = 1.0 / Math.sqrt(distSqr2);
        const dist3 = invDist2 < Config.epsilon ? 1e100 : 1.0 / invDist2;
        const df2 = 0.5 + (s1.circle.radius - 0.5 * minDist2) * invDist2;
        if (rev) {
          const px13 = s1.circle.worldCOMx + px11 * df2;
          const py13 = s1.circle.worldCOMy + py11 * df2;
          const c11 = ZPP_Collide._getContact(arb, 0);
          c11.px = px13;
          c11.py = py13;
          arb.nx = -px11 * invDist2;
          arb.ny = -py11 * invDist2;
          c11.dist = dist3 - minDist2;
          c11.stamp = arb.stamp;
          c11.posOnly = false;
          co2 = c11;
        } else {
          const px14 = s1.circle.worldCOMx + px11 * df2;
          const py14 = s1.circle.worldCOMy + py11 * df2;
          const c12 = ZPP_Collide._getContact(arb, 0);
          c12.px = px14;
          c12.py = py14;
          arb.nx = px11 * invDist2;
          arb.ny = py11 * invDist2;
          c12.dist = dist3 - minDist2;
          c12.stamp = arb.stamp;
          c12.posOnly = false;
          co2 = c12;
        }
      }
      if (co2 != null) {
        const con4 = co2.inner;
        if (rev) {
          con4.lr1x = s2.circle.localCOMx;
          con4.lr1y = s2.circle.localCOMy;
          con4.lr2x = s1.circle.localCOMx;
          con4.lr2y = s1.circle.localCOMy;
        } else {
          con4.lr1x = s1.circle.localCOMx;
          con4.lr1y = s1.circle.localCOMy;
          con4.lr2x = s2.circle.localCOMx;
          con4.lr2y = s2.circle.localCOMy;
        }
        arb.radius = s1.circle.radius + s2.circle.radius;
        arb.ptype = 2;
        return true;
      } else {
        return false;
      }
    }
  }
  static testCollide_safe(s1: ZPP_Shape, s2: ZPP_Shape) {
    // Ensure s1.type <= s2.type for consistent dispatch
    if (s1.type > s2.type) {
      const t = s1;
      s1 = s2;
      s2 = t;
    }
    return ZPP_Collide.testCollide(s1, s2);
  }
  static testCollide(s1: ZPP_Shape, s2: ZPP_Shape) {
    if (s2.type == 1) {
      if (s1.type == 1) {
        let cont = true;
        let cx_ite = s1.polygon.edges.head;
        while (cx_ite != null) {
          const ax = cx_ite.elt;
          let min = 1e100;
          let cx_ite1 = s2.polygon.gverts.next;
          while (cx_ite1 != null) {
            const v = cx_ite1;
            const k = ax.gnormx * v.x + ax.gnormy * v.y;
            if (k < min) {
              min = k;
            }
            cx_ite1 = cx_ite1.next;
          }
          min -= ax.gprojection;
          if (min > 0) {
            cont = false;
            break;
          }
          cx_ite = cx_ite.next;
        }
        if (cont) {
          let cx_ite2 = s2.polygon.edges.head;
          while (cx_ite2 != null) {
            const ax1 = cx_ite2.elt;
            let min1 = 1e100;
            let cx_ite3 = s1.polygon.gverts.next;
            while (cx_ite3 != null) {
              const v1 = cx_ite3;
              const k1 = ax1.gnormx * v1.x + ax1.gnormy * v1.y;
              if (k1 < min1) {
                min1 = k1;
              }
              cx_ite3 = cx_ite3.next;
            }
            min1 -= ax1.gprojection;
            if (min1 > 0) {
              cont = false;
              break;
            }
            cx_ite2 = cx_ite2.next;
          }
          return cont;
        } else {
          return false;
        }
      } else {
        let a0 = null;
        let vi = null;
        let cont1 = true;
        let max = -1e100;
        let vite = s2.polygon.gverts.next;
        let cx_ite4 = s2.polygon.edges.head;
        while (cx_ite4 != null) {
          const a = cx_ite4.elt;
          const dist =
            a.gnormx * s1.circle.worldCOMx +
            a.gnormy * s1.circle.worldCOMy -
            a.gprojection -
            s1.circle.radius;
          if (dist > 0) {
            cont1 = false;
            break;
          }
          if (dist > max) {
            max = dist;
            a0 = a;
            vi = vite;
          }
          vite = vite.next;
          cx_ite4 = cx_ite4.next;
        }
        if (cont1) {
          const v0 = vi;
          const v11 = vi.next == null ? s2.polygon.gverts.next : vi.next;
          const dt = s1.circle.worldCOMy * a0.gnormx - s1.circle.worldCOMx * a0.gnormy;
          if (dt <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
            const minDist = s1.circle.radius;
            const px = v0.x - s1.circle.worldCOMx;
            const py = v0.y - s1.circle.worldCOMy;
            const distSqr = px * px + py * py;
            return distSqr <= minDist * minDist;
          } else if (dt >= v11.y * a0.gnormx - v11.x * a0.gnormy) {
            const minDist1 = s1.circle.radius;
            const px1 = v11.x - s1.circle.worldCOMx;
            const py1 = v11.y - s1.circle.worldCOMy;
            const distSqr1 = px1 * px1 + py1 * py1;
            return distSqr1 <= minDist1 * minDist1;
          } else {
            return true;
          }
        } else {
          return false;
        }
      }
    } else {
      const minDist2 = s1.circle.radius + s2.circle.radius;
      const px2 = s2.circle.worldCOMx - s1.circle.worldCOMx;
      const py2 = s2.circle.worldCOMy - s1.circle.worldCOMy;
      const distSqr2 = px2 * px2 + py2 * py2;
      return distSqr2 <= minDist2 * minDist2;
    }
  }
  /** Scratch vertex rings (x, y interleaved) for {@link ZPP_Collide._flowPolyPoly}. */
  static _clipA: number[] = [];
  static _clipB: number[] = [];

  /**
   * Fluid overlap of two convex polygons that partially overlap, from their
   * valid world vertices and edges: Sutherland–Hodgman clip of `p2` against
   * every edge half-plane of `p1` (a point on an edge counts as inside), then
   * the area and centroid of the clipped ring. Returns false when the overlap
   * has no area.
   */
  static _flowPolyPoly(p1: any, p2: any, arb: ZPP_FluidArbiter): boolean {
    let src = ZPP_Collide._clipA;
    let dst = ZPP_Collide._clipB;
    let n = 0;
    let vite = p2.gverts.next;
    while (vite != null) {
      src[n++] = vite.x;
      src[n++] = vite.y;
      vite = vite.next;
    }
    let eite = p1.edges.head;
    while (eite != null && n >= 6) {
      const ax = eite.elt;
      const nx = ax.gnormx;
      const ny = ax.gnormy;
      const proj = ax.gprojection;
      let m = 0;
      let px = src[n - 2];
      let py = src[n - 1];
      let dp = nx * px + ny * py - proj;
      for (let i = 0; i < n; i += 2) {
        const qx = src[i];
        const qy = src[i + 1];
        const dq = nx * qx + ny * qy - proj;
        if (dp <= 0 != dq <= 0) {
          const t = dp / (dp - dq);
          dst[m++] = px + (qx - px) * t;
          dst[m++] = py + (qy - py) * t;
        }
        if (dq <= 0) {
          dst[m++] = qx;
          dst[m++] = qy;
        }
        px = qx;
        py = qy;
        dp = dq;
      }
      const tmp = src;
      src = dst;
      dst = tmp;
      n = m;
      eite = eite.next;
    }
    if (n < 6) {
      return false;
    }
    let area = 0.0;
    let comx = 0.0;
    let comy = 0.0;
    let ux = src[n - 2];
    let uy = src[n - 1];
    for (let i = 0; i < n; i += 2) {
      const vx = src[i];
      const vy = src[i + 1];
      const cf = ux * vy - vx * uy;
      area += cf;
      comx += (ux + vx) * cf;
      comy += (uy + vy) * cf;
      ux = vx;
      uy = vy;
    }
    area *= 0.5;
    if (!(area * area > Config.epsilon * Config.epsilon)) {
      return false;
    }
    const ia = 1 / (6 * area);
    arb.overlap = area < 0 ? -area : area;
    arb.centroidx = comx * ia;
    arb.centroidy = comy * ia;
    return true;
  }

  static flowCollide(s1: ZPP_Shape, s2: ZPP_Shape, arb: ZPP_FluidArbiter) {
    if (s2.type == 1) {
      if (s1.type == 1) {
        let cont = true;
        let total = true;
        let cx_ite = s1.polygon.edges.head;
        while (cx_ite != null) {
          const ax = cx_ite.elt;
          let min = 1e100;
          let cx_ite1 = s2.polygon.gverts.next;
          while (cx_ite1 != null) {
            const v = cx_ite1;
            const k = ax.gnormx * v.x + ax.gnormy * v.y;
            if (k < min) {
              min = k;
            }
            if (k >= ax.gprojection + Config.epsilon) {
              total = false;
            }
            cx_ite1 = cx_ite1.next;
          }
          min -= ax.gprojection;
          if (min > 0) {
            cont = false;
            break;
          }
          cx_ite = cx_ite.next;
        }
        if (total) {
          s2.polygon.validate_worldCOM();
          arb.overlap = s2.polygon.area;
          arb.centroidx = s2.polygon.worldCOMx;
          arb.centroidy = s2.polygon.worldCOMy;
          return true;
        } else if (cont) {
          total = true;
          let cx_ite3 = s2.polygon.edges.head;
          while (cx_ite3 != null) {
            const ax1 = cx_ite3.elt;
            let min1 = 1e100;
            let cx_ite4 = s1.polygon.gverts.next;
            while (cx_ite4 != null) {
              const v2 = cx_ite4;
              const k1 = ax1.gnormx * v2.x + ax1.gnormy * v2.y;
              if (k1 < min1) {
                min1 = k1;
              }
              if (k1 >= ax1.gprojection + Config.epsilon) {
                total = false;
              }
              cx_ite4 = cx_ite4.next;
            }
            min1 -= ax1.gprojection;
            if (min1 > 0) {
              cont = false;
              break;
            }
            cx_ite3 = cx_ite3.next;
          }
          if (total) {
            s1.polygon.validate_worldCOM();
            arb.overlap = s1.polygon.area;
            arb.centroidx = s1.polygon.worldCOMx;
            arb.centroidy = s1.polygon.worldCOMy;
            return true;
          } else if (cont) {
            return ZPP_Collide._flowPolyPoly(s1.polygon, s2.polygon, arb);
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        const inte = [];
        let total1 = true;
        let a0 = null;
        let vi = null;
        let max2 = -1e100;
        let cont1 = true;
        let vite = s2.polygon.gverts.next;
        let ind3 = 0;
        let cx_ite9 = s2.polygon.edges.head;
        while (cx_ite9 != null) {
          const a4 = cx_ite9.elt;
          let dist = a4.gnormx * s1.circle.worldCOMx + a4.gnormy * s1.circle.worldCOMy;
          if (dist > a4.gprojection + s1.circle.radius) {
            cont1 = false;
            break;
          } else if (dist + s1.circle.radius > a4.gprojection + Config.epsilon) {
            total1 = false;
            inte[ind3] = true;
          }
          dist -= a4.gprojection + s1.circle.radius;
          if (dist > max2) {
            max2 = dist;
            a0 = a4;
            vi = vite;
          }
          vite = vite.next;
          ++ind3;
          cx_ite9 = cx_ite9.next;
        }
        if (cont1) {
          if (total1) {
            arb.overlap = s1.circle.area;
            arb.centroidx = s1.circle.worldCOMx;
            arb.centroidy = s1.circle.worldCOMy;
            return true;
          } else {
            const v0 = vi;
            const v13 = vi.next == null ? s2.polygon.gverts.next : vi.next;
            const dt = s1.circle.worldCOMy * a0.gnormx - s1.circle.worldCOMx * a0.gnormy;
            let tmp14;
            if (dt <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
              const minDist = s1.circle.radius;
              const px = v0.x - s1.circle.worldCOMx;
              const py = v0.y - s1.circle.worldCOMy;
              const distSqr = px * px + py * py;
              tmp14 = distSqr <= minDist * minDist;
            } else if (dt >= v13.y * a0.gnormx - v13.x * a0.gnormy) {
              const minDist1 = s1.circle.radius;
              const px1 = v13.x - s1.circle.worldCOMx;
              const py1 = v13.y - s1.circle.worldCOMy;
              const distSqr1 = px1 * px1 + py1 * py1;
              tmp14 = distSqr1 <= minDist1 * minDist1;
            } else {
              tmp14 = true;
            }
            if (tmp14) {
              const ins = [];
              let ind4 = 0;
              let total2 = true;
              let vi1 = null;
              let vind = 0;
              let cx_ite10 = s2.polygon.gverts.next;
              while (cx_ite10 != null) {
                const v14 = cx_ite10;
                const dx4 = v14.x - s1.circle.worldCOMx;
                const dy4 = v14.y - s1.circle.worldCOMy;
                const dist1 = dx4 * dx4 + dy4 * dy4;
                if (!(ins[ind4] = dist1 <= s1.circle.radius * s1.circle.radius)) {
                  total2 = false;
                } else {
                  vind = ind4;
                  vi1 = cx_ite10;
                }
                ++ind4;
                cx_ite10 = cx_ite10.next;
              }
              if (total2) {
                s2.polygon.validate_worldCOM();
                arb.overlap = s2.polygon.area;
                arb.centroidx = s2.polygon.worldCOMx;
                arb.centroidy = s2.polygon.worldCOMy;
                return true;
              } else {
                while (ZPP_Collide.flowpoly.head != null) {
                  const p1 = ZPP_Collide.flowpoly.pop_unsafe();
                  if (!p1._inuse) {
                    const o1 = p1;
                    if (o1.outer != null) {
                      o1.outer.zpp_inner = null;
                      o1.outer = null;
                    }
                    o1._isimmutable = null;
                    o1._validate = null;
                    o1._invalidate = null;
                    o1.next = ZPP_Vec2.zpp_pool;
                    ZPP_Vec2.zpp_pool = o1;
                  }
                }
                ZPP_Collide.flowsegs.clear();
                let fst_vert1 = null;
                let state = 1;
                // No polygon vertex inside the circle: the walk only records
                // edge/circle crossings, starting from the first entry point.
                const startedOutside = vi1 == null;
                if (vi1 == null) {
                  vi1 = s2.polygon.gverts.next;
                  state = 2;
                } else {
                  fst_vert1 = vi1;
                  ZPP_Collide.flowpoly.add(fst_vert1);
                }
                while (state != 0)
                  if (state == 1) {
                    vi1 = vi1.next;
                    if (vi1 == null) {
                      vi1 = s2.polygon.gverts.next;
                    }
                    ++vind;
                    if (vind >= s2.polygon.edgeCnt) {
                      vind = 0;
                    }
                    if (ins[vind]) {
                      const dx5 = fst_vert1.x - vi1.x;
                      const dy5 = fst_vert1.y - vi1.y;
                      if (dx5 * dx5 + dy5 * dy5 < Config.epsilon) {
                        break;
                      }
                      ZPP_Collide.flowpoly.add(vi1);
                    } else {
                      const u9 = ZPP_Collide.flowpoly.head.elt;
                      const v16 = vi1;
                      const vx = v16.x - u9.x;
                      const vy = v16.y - u9.y;
                      const qx = u9.x - s1.circle.worldCOMx;
                      const qy = u9.y - s1.circle.worldCOMy;
                      let A = vx * vx + vy * vy;
                      const B = 2 * (qx * vx + qy * vy);
                      const C = qx * qx + qy * qy - s1.circle.radius * s1.circle.radius;
                      const D = Math.sqrt(B * B - 4 * A * C);
                      A = 1 / (2 * A);
                      const t18 = (-B - D) * A;
                      const tval = t18 < Config.epsilon ? (-B + D) * A : t18;
                      let cx4 = 0.0;
                      let cy4 = 0.0;
                      const T4 = tval;
                      cx4 = u9.x + (v16.x - u9.x) * T4;
                      cy4 = u9.y + (v16.y - u9.y) * T4;
                      const dx6 = fst_vert1.x - cx4;
                      const dy6 = fst_vert1.y - cy4;
                      if (dx6 * dx6 + dy6 * dy6 < Config.epsilon) {
                        break;
                      }
                      const tmp15 = ZPP_Collide.flowpoly;
                      const ret4 = ZPP_Vec2.get(cx4, cy4);
                      tmp15.add(ret4);
                      state = 2;
                    }
                  } else if (state == 2) {
                    let vi2: ZPP_GeomVert | null = vi1.next;
                    if (vi2 == null) {
                      vi2 = s2.polygon.gverts.next;
                    }
                    let u10 = vi1;
                    state = 0;
                    const beg_ite2: ZPP_GeomVert | null = vi2;
                    let cx_ite12: ZPP_GeomVert | null = vi2;
                    while (true) {
                      const v17 = cx_ite12!;
                      let vind2 = vind + 1;
                      if (vind2 == s2.polygon.edgeCnt) {
                        vind2 = 0;
                      }
                      if (inte[vind]) {
                        if (ins[vind2]) {
                          const vx1 = v17.x - u10.x;
                          const vy1 = v17.y - u10.y;
                          const qx1 = u10.x - s1.circle.worldCOMx;
                          const qy1 = u10.y - s1.circle.worldCOMy;
                          let A1 = vx1 * vx1 + vy1 * vy1;
                          const B1 = 2 * (qx1 * vx1 + qy1 * vy1);
                          const C1 = qx1 * qx1 + qy1 * qy1 - s1.circle.radius * s1.circle.radius;
                          const D1 = Math.sqrt(B1 * B1 - 4 * A1 * C1);
                          A1 = 1 / (2 * A1);
                          const t19 = (-B1 - D1) * A1;
                          const tval1 = t19 < Config.epsilon ? (-B1 + D1) * A1 : t19;
                          let cx5 = 0.0;
                          let cy5 = 0.0;
                          const T5 = tval1;
                          cx5 = u10.x + (v17.x - u10.x) * T5;
                          cy5 = u10.y + (v17.y - u10.y) * T5;
                          const dx7 = fst_vert1.x - cx5;
                          const dy7 = fst_vert1.y - cy5;
                          if (dx7 * dx7 + dy7 * dy7 < Config.epsilon) {
                            state = 0;
                            cx_ite12 = beg_ite2;
                            break;
                          }
                          const ret5 = ZPP_Vec2.get(cx5, cy5);
                          const cp = ret5;
                          ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.elt);
                          ZPP_Collide.flowsegs.add(cp);
                          ZPP_Collide.flowpoly.add(cp);
                          state = 1;
                          cx_ite12 = beg_ite2;
                          break;
                        } else {
                          let t0 = 0.0;
                          let t110 = 0.0;
                          const vx2 = v17.x - u10.x;
                          const vy2 = v17.y - u10.y;
                          const qx2 = u10.x - s1.circle.worldCOMx;
                          const qy2 = u10.y - s1.circle.worldCOMy;
                          let A2 = vx2 * vx2 + vy2 * vy2;
                          const B2 = 2 * (qx2 * vx2 + qy2 * vy2);
                          const C2 = qx2 * qx2 + qy2 * qy2 - s1.circle.radius * s1.circle.radius;
                          let D2 = B2 * B2 - 4 * A2 * C2;
                          let two;
                          if (D2 * D2 < Config.epsilon) {
                            if (D2 < 0) {
                              t0 = 10.0;
                            } else {
                              t110 = -B2 / (2 * A2);
                              t0 = t110;
                            }
                            two = false;
                          } else {
                            D2 = Math.sqrt(D2);
                            A2 = 1 / (2 * A2);
                            t0 = (-B2 - D2) * A2;
                            t110 = (-B2 + D2) * A2;
                            two = true;
                          }
                          if (t0 < 1 - Config.epsilon && t110 > Config.epsilon) {
                            let cx6 = 0.0;
                            let cy6 = 0.0;
                            const T6 = t0;
                            cx6 = u10.x + (v17.x - u10.x) * T6;
                            cy6 = u10.y + (v17.y - u10.y) * T6;
                            let tmp16;
                            if (fst_vert1 != null) {
                              const dx8 = fst_vert1.x - cx6;
                              const dy8 = fst_vert1.y - cy6;
                              tmp16 = dx8 * dx8 + dy8 * dy8 < Config.epsilon;
                            } else {
                              tmp16 = false;
                            }
                            if (tmp16) {
                              state = 0;
                              cx_ite12 = beg_ite2;
                              break;
                            }
                            const ret6 = ZPP_Vec2.get(cx6, cy6);
                            const cp1 = ret6;
                            if (ZPP_Collide.flowpoly.head != null) {
                              ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.elt);
                              ZPP_Collide.flowsegs.add(cp1);
                            }
                            ZPP_Collide.flowpoly.add(cp1);
                            if (fst_vert1 == null) {
                              fst_vert1 = ZPP_Collide.flowpoly.head.elt;
                            }
                            if (two) {
                              let cx7 = 0.0;
                              let cy7 = 0.0;
                              const T7 = t110;
                              cx7 = u10.x + (v17.x - u10.x) * T7;
                              cy7 = u10.y + (v17.y - u10.y) * T7;
                              const tmp17 = ZPP_Collide.flowpoly;
                              const ret7 = ZPP_Vec2.get(cx7, cy7);
                              tmp17.add(ret7);
                            }
                          }
                        }
                      }
                      u10 = v17;
                      vi1 = cx_ite12;
                      vind = vind2;
                      cx_ite12 = cx_ite12!.next;
                      if (cx_ite12 == null) {
                        cx_ite12 = s2.polygon.gverts.next;
                      }
                      break;
                    }
                    while (cx_ite12 != beg_ite2) {
                      const v18 = cx_ite12!;
                      let vind21 = vind + 1;
                      if (vind21 == s2.polygon.edgeCnt) {
                        vind21 = 0;
                      }
                      if (inte[vind]) {
                        if (ins[vind21]) {
                          const vx3 = v18.x - u10.x;
                          const vy3 = v18.y - u10.y;
                          const qx3 = u10.x - s1.circle.worldCOMx;
                          const qy3 = u10.y - s1.circle.worldCOMy;
                          let A3 = vx3 * vx3 + vy3 * vy3;
                          const B3 = 2 * (qx3 * vx3 + qy3 * vy3);
                          const C3 = qx3 * qx3 + qy3 * qy3 - s1.circle.radius * s1.circle.radius;
                          const D3 = Math.sqrt(B3 * B3 - 4 * A3 * C3);
                          A3 = 1 / (2 * A3);
                          const t20 = (-B3 - D3) * A3;
                          const tval2 = t20 < Config.epsilon ? (-B3 + D3) * A3 : t20;
                          let cx8 = 0.0;
                          let cy8 = 0.0;
                          const T8 = tval2;
                          cx8 = u10.x + (v18.x - u10.x) * T8;
                          cy8 = u10.y + (v18.y - u10.y) * T8;
                          const dx9 = fst_vert1.x - cx8;
                          const dy9 = fst_vert1.y - cy8;
                          if (dx9 * dx9 + dy9 * dy9 < Config.epsilon) {
                            state = 0;
                            cx_ite12 = beg_ite2;
                            break;
                          }
                          const ret8 = ZPP_Vec2.get(cx8, cy8);
                          const cp2 = ret8;
                          ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.elt);
                          ZPP_Collide.flowsegs.add(cp2);
                          ZPP_Collide.flowpoly.add(cp2);
                          state = 1;
                          cx_ite12 = beg_ite2;
                          break;
                        } else {
                          let t01 = 0.0;
                          let t111 = 0.0;
                          const vx4 = v18.x - u10.x;
                          const vy4 = v18.y - u10.y;
                          const qx4 = u10.x - s1.circle.worldCOMx;
                          const qy4 = u10.y - s1.circle.worldCOMy;
                          let A4 = vx4 * vx4 + vy4 * vy4;
                          const B4 = 2 * (qx4 * vx4 + qy4 * vy4);
                          const C4 = qx4 * qx4 + qy4 * qy4 - s1.circle.radius * s1.circle.radius;
                          let D4 = B4 * B4 - 4 * A4 * C4;
                          let two1;
                          if (D4 * D4 < Config.epsilon) {
                            if (D4 < 0) {
                              t01 = 10.0;
                            } else {
                              t111 = -B4 / (2 * A4);
                              t01 = t111;
                            }
                            two1 = false;
                          } else {
                            D4 = Math.sqrt(D4);
                            A4 = 1 / (2 * A4);
                            t01 = (-B4 - D4) * A4;
                            t111 = (-B4 + D4) * A4;
                            two1 = true;
                          }
                          if (t01 < 1 - Config.epsilon && t111 > Config.epsilon) {
                            let cx9 = 0.0;
                            let cy9 = 0.0;
                            const T9 = t01;
                            cx9 = u10.x + (v18.x - u10.x) * T9;
                            cy9 = u10.y + (v18.y - u10.y) * T9;
                            let tmp18;
                            if (fst_vert1 != null) {
                              const dx10 = fst_vert1.x - cx9;
                              const dy10 = fst_vert1.y - cy9;
                              tmp18 = dx10 * dx10 + dy10 * dy10 < Config.epsilon;
                            } else {
                              tmp18 = false;
                            }
                            if (tmp18) {
                              state = 0;
                              cx_ite12 = beg_ite2;
                              break;
                            }
                            const ret9 = ZPP_Vec2.get(cx9, cy9);
                            const cp3 = ret9;
                            if (ZPP_Collide.flowpoly.head != null) {
                              ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.elt);
                              ZPP_Collide.flowsegs.add(cp3);
                            }
                            ZPP_Collide.flowpoly.add(cp3);
                            if (fst_vert1 == null) {
                              fst_vert1 = ZPP_Collide.flowpoly.head.elt;
                            }
                            if (two1) {
                              let cx10 = 0.0;
                              let cy10 = 0.0;
                              const T10 = t111;
                              cx10 = u10.x + (v18.x - u10.x) * T10;
                              cy10 = u10.y + (v18.y - u10.y) * T10;
                              const tmp19 = ZPP_Collide.flowpoly;
                              const ret10 = ZPP_Vec2.get(cx10, cy10);
                              tmp19.add(ret10);
                            }
                          }
                        }
                      }
                      u10 = v18;
                      vi1 = cx_ite12;
                      vind = vind21;
                      cx_ite12 = cx_ite12!.next;
                      if (cx_ite12 == null) {
                        cx_ite12 = s2.polygon.gverts.next;
                      }
                    }
                  }
                if (ZPP_Collide.flowpoly.head == null) {
                  return false;
                } else if (ZPP_Collide.flowpoly.head.next == null) {
                  let all = true;
                  let cx_ite13 = s2.polygon.edges.head;
                  while (cx_ite13 != null) {
                    const e = cx_ite13.elt;
                    const dist2 = e.gnormx * s1.circle.worldCOMx + e.gnormy * s1.circle.worldCOMy;
                    if (dist2 > e.gprojection) {
                      all = false;
                      break;
                    }
                    cx_ite13 = cx_ite13.next;
                  }
                  if (all) {
                    arb.overlap = s1.circle.area;
                    arb.centroidx = s1.circle.worldCOMx;
                    arb.centroidy = s1.circle.worldCOMy;
                    return true;
                  } else {
                    return false;
                  }
                } else {
                  let COMx1 = 0;
                  let COMy1 = 0;
                  let area4 = 0.0;
                  if (ZPP_Collide.flowpoly.head.next.next != null) {
                    let parea = 0.0;
                    let pCOMx = 0;
                    let pCOMy = 0;
                    parea = 0.0;
                    let cx_ite14 = ZPP_Collide.flowpoly.head;
                    let u11 = cx_ite14.elt;
                    cx_ite14 = cx_ite14.next;
                    let v19 = cx_ite14.elt;
                    cx_ite14 = cx_ite14.next;
                    while (cx_ite14 != null) {
                      const w12 = cx_ite14.elt;
                      parea += v19.x * (w12.y - u11.y);
                      const cf12 = w12.y * v19.x - w12.x * v19.y;
                      pCOMx += (v19.x + w12.x) * cf12;
                      pCOMy += (v19.y + w12.y) * cf12;
                      u11 = v19;
                      v19 = w12;
                      cx_ite14 = cx_ite14.next;
                    }
                    cx_ite14 = ZPP_Collide.flowpoly.head;
                    const w13 = cx_ite14.elt;
                    parea += v19.x * (w13.y - u11.y);
                    const cf13 = w13.y * v19.x - w13.x * v19.y;
                    pCOMx += (v19.x + w13.x) * cf13;
                    pCOMy += (v19.y + w13.y) * cf13;
                    u11 = v19;
                    v19 = w13;
                    cx_ite14 = cx_ite14.next;
                    const w14 = cx_ite14.elt;
                    parea += v19.x * (w14.y - u11.y);
                    const cf14 = w14.y * v19.x - w14.x * v19.y;
                    pCOMx += (v19.x + w14.x) * cf14;
                    pCOMy += (v19.y + w14.y) * cf14;
                    parea *= 0.5;
                    const ia1 = 1 / (6 * parea);
                    const t21 = ia1;
                    pCOMx *= t21;
                    pCOMy *= t21;
                    const t22 = -parea;
                    COMx1 += pCOMx * t22;
                    COMy1 += pCOMy * t22;
                    area4 -= parea;
                    if (startedOutside) {
                      // The walk records the arc between consecutive crossings
                      // but never the closing one, from the last exit back to
                      // the first entry — add that circular segment too.
                      ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.elt);
                      ZPP_Collide.flowsegs.add(fst_vert1);
                    }
                  } else {
                    ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.elt);
                    ZPP_Collide.flowsegs.add(ZPP_Collide.flowpoly.head.next.elt);
                  }
                  while (ZPP_Collide.flowsegs.head != null) {
                    const u12 = ZPP_Collide.flowsegs.pop_unsafe();
                    const v20 = ZPP_Collide.flowsegs.pop_unsafe();
                    const dx11 = v20.x - u12.x;
                    const dy11 = v20.y - u12.y;
                    let nx = dx11;
                    let ny = dy11;
                    const d = nx * nx + ny * ny;
                    const imag = 1.0 / Math.sqrt(d);
                    const t23 = imag;
                    nx *= t23;
                    ny *= t23;
                    const t24 = nx;
                    nx = -ny;
                    ny = t24;
                    let cx11 = u12.x + v20.x;
                    let cy11 = u12.y + v20.y;
                    const t25 = 0.5;
                    cx11 *= t25;
                    cy11 *= t25;
                    const t26 = 1.0;
                    cx11 -= s1.circle.worldCOMx * t26;
                    cy11 -= s1.circle.worldCOMy * t26;
                    const xd = nx * cx11 + ny * cy11;
                    let carea = 0.0;
                    let ccom = 0.0;
                    const X = xd;
                    const cos = X / s1.circle.radius;
                    const sin = Math.sqrt(1 - cos * cos);
                    const theta = Math.acos(cos);
                    carea = s1.circle.radius * (s1.circle.radius * theta - X * sin);
                    ccom =
                      (0.66666666666666663 * s1.circle.radius * sin * sin * sin) /
                      (theta - cos * sin);
                    cx11 = s1.circle.worldCOMx;
                    cy11 = s1.circle.worldCOMy;
                    const t27 = ccom;
                    cx11 += nx * t27;
                    cy11 += ny * t27;
                    const t28 = carea;
                    COMx1 += cx11 * t28;
                    COMy1 += cy11 * t28;
                    area4 += carea;
                  }
                  const t29 = 1.0 / area4;
                  COMx1 *= t29;
                  COMy1 *= t29;
                  arb.overlap = area4;
                  arb.centroidx = COMx1;
                  arb.centroidy = COMy1;
                  return true;
                }
              }
            } else {
              return false;
            }
          }
        } else {
          return false;
        }
      }
    } else {
      const c1 = s1.circle;
      const c2 = s2.circle;
      const deltax = c2.worldCOMx - c1.worldCOMx;
      const deltay = c2.worldCOMy - c1.worldCOMy;
      const cr = c1.radius + c2.radius;
      const ds = deltax * deltax + deltay * deltay;
      if (ds > cr * cr) {
        return false;
      } else if (ds < Config.epsilon * Config.epsilon) {
        if (c1.radius < c2.radius) {
          arb.overlap = c1.area;
          arb.centroidx = c1.worldCOMx;
          arb.centroidy = c1.worldCOMy;
        } else {
          arb.overlap = c2.area;
          arb.centroidx = c2.worldCOMx;
          arb.centroidy = c2.worldCOMy;
        }
        return true;
      } else {
        const d1 = Math.sqrt(ds);
        const id = 1 / d1;
        const x1 = 0.5 * (d1 - (c2.radius * c2.radius - c1.radius * c1.radius) * id);
        if (x1 <= -c1.radius) {
          arb.overlap = c1.area;
          arb.centroidx = c1.worldCOMx;
          arb.centroidy = c1.worldCOMy;
        } else {
          const x2 = d1 - x1;
          if (x2 <= -c2.radius) {
            arb.overlap = c2.area;
            arb.centroidx = c2.worldCOMx;
            arb.centroidy = c2.worldCOMy;
          } else {
            let area11 = 0.0;
            let y1 = 0.0;
            let area21 = 0.0;
            let y2 = 0.0;
            const X1 = x1;
            const cos1 = X1 / c1.radius;
            const sin1 = Math.sqrt(1 - cos1 * cos1);
            const theta1 = Math.acos(cos1);
            area11 = c1.radius * (c1.radius * theta1 - X1 * sin1);
            y1 = (0.66666666666666663 * c1.radius * sin1 * sin1 * sin1) / (theta1 - cos1 * sin1);
            const X2 = x2;
            const cos2 = X2 / c2.radius;
            const sin2 = Math.sqrt(1 - cos2 * cos2);
            const theta2 = Math.acos(cos2);
            area21 = c2.radius * (c2.radius * theta2 - X2 * sin2);
            y2 = (0.66666666666666663 * c2.radius * sin2 * sin2 * sin2) / (theta2 - cos2 * sin2);
            const tarea = area11 + area21;
            const ya = ((y1 * area11 + (d1 - y2) * area21) / tarea) * id;
            arb.overlap = tarea;
            arb.centroidx = c1.worldCOMx + deltax * ya;
            arb.centroidy = c1.worldCOMy + deltay * ya;
          }
        }
        return true;
      }
    }
  }
}
