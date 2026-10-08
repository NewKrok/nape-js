/**
 * ZPP_Collide — Internal narrowphase collision dispatcher for the nape physics engine.
 *
 * Handles containment testing, contact generation, and fluid collision
 * (polygon clipping) between shapes.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_Shape } from "../shape/ZPP_Shape";
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

  /**
   * Fluid overlap of a circle and a convex polygon that partially overlap.
   * Sums, over the polygon's edges, the signed intersection of the circle with
   * the triangle (centre, a, b): edge pieces inside the circle contribute a
   * triangle, pieces outside contribute the circular sector they subtend.
   * Exact, and robust to vertices on the circle and tangent edges. Returns
   * false when the overlap has no area.
   */
  static _flowCirclePoly(c: any, p: any, arb: ZPP_FluidArbiter): boolean {
    const ox = c.worldCOMx;
    const oy = c.worldCOMy;
    const r = c.radius;
    const r2 = r * r;
    const r3 = (r2 * r) / 3;
    let area = 0.0;
    let mx = 0.0;
    let my = 0.0;
    const first = p.gverts.next;
    let ax = 0.0;
    let ay = 0.0;
    let cur = first;
    while (cur != null) {
      ax = cur.x - ox;
      ay = cur.y - oy;
      cur = cur.next;
    }
    cur = first;
    while (cur != null) {
      const bx = cur.x - ox;
      const by = cur.y - oy;
      const dx = bx - ax;
      const dy = by - ay;
      const A = dx * dx + dy * dy;
      const B = ax * dx + ay * dy;
      const disc = B * B - A * (ax * ax + ay * ay - r2);
      // Parameters along a→b where the edge enters / leaves the circle.
      let t1 = 1.0;
      let t2 = 1.0;
      if (A > 0 && disc > 0) {
        const sq = Math.sqrt(disc);
        t1 = (-B - sq) / A;
        t2 = (-B + sq) / A;
        t1 = t1 < 0 ? 0 : t1 > 1 ? 1 : t1;
        t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
      }
      const p1x = ax + dx * t1;
      const p1y = ay + dy * t1;
      const p2x = ax + dx * t2;
      const p2y = ay + dy * t2;
      // Outside piece a→p1: circular sector.
      if (t1 > 0) {
        const la = Math.sqrt(ax * ax + ay * ay);
        const l1 = Math.sqrt(p1x * p1x + p1y * p1y);
        area += 0.5 * r2 * Math.atan2(ax * p1y - ay * p1x, ax * p1x + ay * p1y);
        mx += r3 * (p1y / l1 - ay / la);
        my += r3 * (ax / la - p1x / l1);
      }
      // Inside piece p1→p2: triangle with the centre.
      if (t2 > t1) {
        const cr = p1x * p2y - p2x * p1y;
        area += 0.5 * cr;
        mx += (cr * (p1x + p2x)) / 6;
        my += (cr * (p1y + p2y)) / 6;
      }
      // Outside piece p2→b: circular sector.
      if (t2 < 1) {
        const l2 = Math.sqrt(p2x * p2x + p2y * p2y);
        const lb = Math.sqrt(bx * bx + by * by);
        area += 0.5 * r2 * Math.atan2(p2x * by - p2y * bx, p2x * bx + p2y * by);
        mx += r3 * (by / lb - p2y / l2);
        my += r3 * (p2x / l2 - bx / lb);
      }
      ax = bx;
      ay = by;
      cur = cur.next;
    }
    if (!(area * area > Config.epsilon * Config.epsilon)) {
      return false;
    }
    arb.overlap = area < 0 ? -area : area;
    arb.centroidx = ox + mx / area;
    arb.centroidy = oy + my / area;
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
        let total1 = true;
        let a0 = null;
        let vi = null;
        let max2 = -1e100;
        let cont1 = true;
        let vite = s2.polygon.gverts.next;
        let cx_ite9 = s2.polygon.edges.head;
        while (cx_ite9 != null) {
          const a4 = cx_ite9.elt;
          let dist = a4.gnormx * s1.circle.worldCOMx + a4.gnormy * s1.circle.worldCOMy;
          if (dist > a4.gprojection + s1.circle.radius) {
            cont1 = false;
            break;
          } else if (dist + s1.circle.radius > a4.gprojection + Config.epsilon) {
            total1 = false;
          }
          dist -= a4.gprojection + s1.circle.radius;
          if (dist > max2) {
            max2 = dist;
            a0 = a4;
            vi = vite;
          }
          vite = vite.next;
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
              let total2 = true;
              let cx_ite10 = s2.polygon.gverts.next;
              while (cx_ite10 != null) {
                const v14 = cx_ite10;
                const dx4 = v14.x - s1.circle.worldCOMx;
                const dy4 = v14.y - s1.circle.worldCOMy;
                const dist1 = dx4 * dx4 + dy4 * dy4;
                if (dist1 > s1.circle.radius * s1.circle.radius) {
                  total2 = false;
                }
                cx_ite10 = cx_ite10.next;
              }
              if (total2) {
                s2.polygon.validate_worldCOM();
                arb.overlap = s2.polygon.area;
                arb.centroidx = s2.polygon.worldCOMx;
                arb.centroidy = s2.polygon.worldCOMy;
                return true;
              } else {
                return ZPP_Collide._flowCirclePoly(s1.circle, s2.polygon, arb);
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
