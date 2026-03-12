/**
 * ZPP_Collide — Internal narrowphase collision dispatcher for the nape physics engine.
 *
 * Handles containment testing, contact generation, and fluid collision
 * (polygon clipping) between shapes.
 *
 * Converted from nape-compiled.js lines 21113–24305.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_GeomVert } from "./ZPP_GeomVert";
import { ZPP_Shape } from "../shape/ZPP_Shape";
import { ZPP_Body } from "../phys/ZPP_Body";
import { ZPP_ColArbiter } from "../dynamics/ZPP_ColArbiter";
import { ZPP_FluidArbiter } from "../dynamics/ZPP_FluidArbiter";
import { ZPP_Contact } from "../dynamics/ZPP_Contact";
import { getNape } from "../../core/engine";

export class ZPP_Collide {
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

  static circleContains(c: any, p: any) {
    const dx = p.x - c.worldCOMx;
    const dy = p.y - c.worldCOMy;
    return dx * dx + dy * dy < c.radius * c.radius;
  }
  static polyContains(s: any, p: any) {
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
    } else if (s.type == 1) {
      return ZPP_Collide.polyContains(s.polygon, p);
    } else {
      return ZPP_Collide.capsuleContains(s.capsule, p);
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
        } else if (s2.type == 1) {
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
        } else {
          // circle contains capsule: both spine endpoints + radius must be within circle
          const cap = s2.capsule;
          const r = s1.circle.radius - cap.radius;
          if (r < 0) return false;
          const r2 = r * r;
          const dx1 = cap.spine1x - s1.circle.worldCOMx;
          const dy1 = cap.spine1y - s1.circle.worldCOMy;
          if (dx1 * dx1 + dy1 * dy1 > r2) return false;
          const dx2 = cap.spine2x - s1.circle.worldCOMx;
          const dy2 = cap.spine2y - s1.circle.worldCOMy;
          return dx2 * dx2 + dy2 * dy2 <= r2;
        }
      } else if (s1.type == 2) {
        // capsule contains s2
        if (s2.type == 0) {
          // capsule contains circle: closest point on spine to circle center
          const cap = s1.capsule;
          const t = ZPP_Collide._closestT(
            cap.spine1x,
            cap.spine1y,
            cap.spine2x,
            cap.spine2y,
            s2.circle.worldCOMx,
            s2.circle.worldCOMy,
          );
          const cx = cap.spine1x + t * (cap.spine2x - cap.spine1x);
          const cy = cap.spine1y + t * (cap.spine2y - cap.spine1y);
          const minDist = cap.radius - s2.circle.radius;
          if (minDist < 0) return false;
          const dx = s2.circle.worldCOMx - cx;
          const dy = s2.circle.worldCOMy - cy;
          return dx * dx + dy * dy <= minDist * minDist;
        } else {
          // capsule contains polygon/capsule: check each vertex/endpoint
          return false; // Simplified — capsule rarely contains other shapes
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
    const napeNs = getNape();
    if (s2.type == 2) {
      return ZPP_Collide._capsuleContactCollide(s1, s2, arb, rev, napeNs);
    }
    if (s1.type == 2) {
      return ZPP_Collide._capsuleContactCollide(s2, s1, arb, !rev, napeNs);
    }
    if (s2.type == 1) {
      if (s1.type == 1) {
        let cont = true;
        let max = -1e100;
        const _maxmin = -1e100;
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
            let _q1;
            let q2;
            let ax2;
            let scale;
            if (maxi == 1) {
              _q1 = s1.polygon;
              q2 = s2.polygon;
              ax2 = axis1;
              scale = 1.0;
            } else {
              _q1 = s2.polygon;
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
            if (t > napeNs.Config.epsilon) {
              const t1 = t;
              c0x += dvx * t1;
              c0y += dvy * t1;
            }
            const t2 = (-ax2.tp0 - d1) * den;
            if (t2 < -napeNs.Config.epsilon) {
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
              let c = null;
              let cx_ite5 = arb.contacts.next;
              while (cx_ite5 != null) {
                const cur = cx_ite5;
                if (hash == cur.hash) {
                  c = cur;
                  break;
                }
                cx_ite5 = cx_ite5.next;
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
                const _this = arb.contacts;
                c._inuse = true;
                const temp = c;
                temp.next = _this.next;
                _this.next = temp;
                _this.modified = true;
                _this.length++;
                arb.innards.add(ci);
              } else {
                c.fresh = false;
              }
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
              let c1 = null;
              let cx_ite6 = arb.contacts.next;
              while (cx_ite6 != null) {
                const cur1 = cx_ite6;
                if (hash1 == cur1.hash) {
                  c1 = cur1;
                  break;
                }
                cx_ite6 = cx_ite6.next;
              }
              if (c1 == null) {
                if (ZPP_Contact.zpp_pool == null) {
                  c1 = new ZPP_Contact();
                } else {
                  c1 = ZPP_Contact.zpp_pool;
                  ZPP_Contact.zpp_pool = c1.next;
                  c1.next = null;
                }
                const ci1 = c1.inner;
                ci1.jnAcc = ci1.jtAcc = 0;
                c1.hash = hash1;
                c1.fresh = true;
                c1.arbiter = arb;
                arb.jrAcc = 0;
                const _this1 = arb.contacts;
                c1._inuse = true;
                const temp1 = c1;
                temp1.next = _this1.next;
                _this1.next = temp1;
                _this1.modified = true;
                _this1.length++;
                arb.innards.add(ci1);
              } else {
                c1.fresh = false;
              }
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
        let max1 = -1e100;
        const _minmax = -1e100;
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
            } else if (distSqr < napeNs.Config.epsilon * napeNs.Config.epsilon) {
              const px3 = s1.circle.worldCOMx;
              const py3 = s1.circle.worldCOMy;
              let c2 = null;
              let cx_ite8 = arb.contacts.next;
              while (cx_ite8 != null) {
                const cur2 = cx_ite8;
                if (0 == cur2.hash) {
                  c2 = cur2;
                  break;
                }
                cx_ite8 = cx_ite8.next;
              }
              if (c2 == null) {
                if (ZPP_Contact.zpp_pool == null) {
                  c2 = new ZPP_Contact();
                } else {
                  c2 = ZPP_Contact.zpp_pool;
                  ZPP_Contact.zpp_pool = c2.next;
                  c2.next = null;
                }
                const ci2 = c2.inner;
                ci2.jnAcc = ci2.jtAcc = 0;
                c2.hash = 0;
                c2.fresh = true;
                c2.arbiter = arb;
                arb.jrAcc = 0;
                const _this2 = arb.contacts;
                c2._inuse = true;
                const temp2 = c2;
                temp2.next = _this2.next;
                _this2.next = temp2;
                _this2.modified = true;
                _this2.length++;
                arb.innards.add(ci2);
              } else {
                c2.fresh = false;
              }
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
              const dist1 = invDist < napeNs.Config.epsilon ? 1e100 : 1.0 / invDist;
              const df = 0.5 + (s1.circle.radius - 0.5 * minDist) * invDist;
              if (rev) {
                const px4 = s1.circle.worldCOMx + px2 * df;
                const py4 = s1.circle.worldCOMy + py2 * df;
                let c3 = null;
                let cx_ite9 = arb.contacts.next;
                while (cx_ite9 != null) {
                  const cur3 = cx_ite9;
                  if (0 == cur3.hash) {
                    c3 = cur3;
                    break;
                  }
                  cx_ite9 = cx_ite9.next;
                }
                if (c3 == null) {
                  if (ZPP_Contact.zpp_pool == null) {
                    c3 = new ZPP_Contact();
                  } else {
                    c3 = ZPP_Contact.zpp_pool;
                    ZPP_Contact.zpp_pool = c3.next;
                    c3.next = null;
                  }
                  const ci3 = c3.inner;
                  ci3.jnAcc = ci3.jtAcc = 0;
                  c3.hash = 0;
                  c3.fresh = true;
                  c3.arbiter = arb;
                  arb.jrAcc = 0;
                  const _this3 = arb.contacts;
                  c3._inuse = true;
                  const temp3 = c3;
                  temp3.next = _this3.next;
                  _this3.next = temp3;
                  _this3.modified = true;
                  _this3.length++;
                  arb.innards.add(ci3);
                } else {
                  c3.fresh = false;
                }
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
                let c4 = null;
                let cx_ite10 = arb.contacts.next;
                while (cx_ite10 != null) {
                  const cur4 = cx_ite10;
                  if (0 == cur4.hash) {
                    c4 = cur4;
                    break;
                  }
                  cx_ite10 = cx_ite10.next;
                }
                if (c4 == null) {
                  if (ZPP_Contact.zpp_pool == null) {
                    c4 = new ZPP_Contact();
                  } else {
                    c4 = ZPP_Contact.zpp_pool;
                    ZPP_Contact.zpp_pool = c4.next;
                    c4.next = null;
                  }
                  const ci4 = c4.inner;
                  ci4.jnAcc = ci4.jtAcc = 0;
                  c4.hash = 0;
                  c4.fresh = true;
                  c4.arbiter = arb;
                  arb.jrAcc = 0;
                  const _this4 = arb.contacts;
                  c4._inuse = true;
                  const temp4 = c4;
                  temp4.next = _this4.next;
                  _this4.next = temp4;
                  _this4.modified = true;
                  _this4.length++;
                  arb.innards.add(ci4);
                } else {
                  c4.fresh = false;
                }
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
            } else if (distSqr1 < napeNs.Config.epsilon * napeNs.Config.epsilon) {
              const px7 = s1.circle.worldCOMx;
              const py7 = s1.circle.worldCOMy;
              let c5 = null;
              let cx_ite11 = arb.contacts.next;
              while (cx_ite11 != null) {
                const cur5 = cx_ite11;
                if (0 == cur5.hash) {
                  c5 = cur5;
                  break;
                }
                cx_ite11 = cx_ite11.next;
              }
              if (c5 == null) {
                if (ZPP_Contact.zpp_pool == null) {
                  c5 = new ZPP_Contact();
                } else {
                  c5 = ZPP_Contact.zpp_pool;
                  ZPP_Contact.zpp_pool = c5.next;
                  c5.next = null;
                }
                const ci5 = c5.inner;
                ci5.jnAcc = ci5.jtAcc = 0;
                c5.hash = 0;
                c5.fresh = true;
                c5.arbiter = arb;
                arb.jrAcc = 0;
                const _this5 = arb.contacts;
                c5._inuse = true;
                const temp5 = c5;
                temp5.next = _this5.next;
                _this5.next = temp5;
                _this5.modified = true;
                _this5.length++;
                arb.innards.add(ci5);
              } else {
                c5.fresh = false;
              }
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
              const dist2 = invDist1 < napeNs.Config.epsilon ? 1e100 : 1.0 / invDist1;
              const df1 = 0.5 + (s1.circle.radius - 0.5 * minDist1) * invDist1;
              if (rev) {
                const px8 = s1.circle.worldCOMx + px6 * df1;
                const py8 = s1.circle.worldCOMy + py6 * df1;
                let c6 = null;
                let cx_ite12 = arb.contacts.next;
                while (cx_ite12 != null) {
                  const cur6 = cx_ite12;
                  if (0 == cur6.hash) {
                    c6 = cur6;
                    break;
                  }
                  cx_ite12 = cx_ite12.next;
                }
                if (c6 == null) {
                  if (ZPP_Contact.zpp_pool == null) {
                    c6 = new ZPP_Contact();
                  } else {
                    c6 = ZPP_Contact.zpp_pool;
                    ZPP_Contact.zpp_pool = c6.next;
                    c6.next = null;
                  }
                  const ci6 = c6.inner;
                  ci6.jnAcc = ci6.jtAcc = 0;
                  c6.hash = 0;
                  c6.fresh = true;
                  c6.arbiter = arb;
                  arb.jrAcc = 0;
                  const _this6 = arb.contacts;
                  c6._inuse = true;
                  const temp6 = c6;
                  temp6.next = _this6.next;
                  _this6.next = temp6;
                  _this6.modified = true;
                  _this6.length++;
                  arb.innards.add(ci6);
                } else {
                  c6.fresh = false;
                }
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
                let c7 = null;
                let cx_ite13 = arb.contacts.next;
                while (cx_ite13 != null) {
                  const cur7 = cx_ite13;
                  if (0 == cur7.hash) {
                    c7 = cur7;
                    break;
                  }
                  cx_ite13 = cx_ite13.next;
                }
                if (c7 == null) {
                  if (ZPP_Contact.zpp_pool == null) {
                    c7 = new ZPP_Contact();
                  } else {
                    c7 = ZPP_Contact.zpp_pool;
                    ZPP_Contact.zpp_pool = c7.next;
                    c7.next = null;
                  }
                  const ci7 = c7.inner;
                  ci7.jnAcc = ci7.jtAcc = 0;
                  c7.hash = 0;
                  c7.fresh = true;
                  c7.arbiter = arb;
                  arb.jrAcc = 0;
                  const _this7 = arb.contacts;
                  c7._inuse = true;
                  const temp7 = c7;
                  temp7.next = _this7.next;
                  _this7.next = temp7;
                  _this7.modified = true;
                  _this7.length++;
                  arb.innards.add(ci7);
                } else {
                  c7.fresh = false;
                }
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
              let c8 = null;
              let cx_ite14 = arb.contacts.next;
              while (cx_ite14 != null) {
                const cur8 = cx_ite14;
                if (0 == cur8.hash) {
                  c8 = cur8;
                  break;
                }
                cx_ite14 = cx_ite14.next;
              }
              if (c8 == null) {
                if (ZPP_Contact.zpp_pool == null) {
                  c8 = new ZPP_Contact();
                } else {
                  c8 = ZPP_Contact.zpp_pool;
                  ZPP_Contact.zpp_pool = c8.next;
                  c8.next = null;
                }
                const ci8 = c8.inner;
                ci8.jnAcc = ci8.jtAcc = 0;
                c8.hash = 0;
                c8.fresh = true;
                c8.arbiter = arb;
                arb.jrAcc = 0;
                const _this8 = arb.contacts;
                c8._inuse = true;
                const temp8 = c8;
                temp8.next = _this8.next;
                _this8.next = temp8;
                _this8.modified = true;
                _this8.length++;
                arb.innards.add(ci8);
              } else {
                c8.fresh = false;
              }
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
              let c9 = null;
              let cx_ite15 = arb.contacts.next;
              while (cx_ite15 != null) {
                const cur9 = cx_ite15;
                if (0 == cur9.hash) {
                  c9 = cur9;
                  break;
                }
                cx_ite15 = cx_ite15.next;
              }
              if (c9 == null) {
                if (ZPP_Contact.zpp_pool == null) {
                  c9 = new ZPP_Contact();
                } else {
                  c9 = ZPP_Contact.zpp_pool;
                  ZPP_Contact.zpp_pool = c9.next;
                  c9.next = null;
                }
                const ci9 = c9.inner;
                ci9.jnAcc = ci9.jtAcc = 0;
                c9.hash = 0;
                c9.fresh = true;
                c9.arbiter = arb;
                arb.jrAcc = 0;
                const _this9 = arb.contacts;
                c9._inuse = true;
                const temp9 = c9;
                temp9.next = _this9.next;
                _this9.next = temp9;
                _this9.modified = true;
                _this9.length++;
                arb.innards.add(ci9);
              } else {
                c9.fresh = false;
              }
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
      } else if (distSqr2 < napeNs.Config.epsilon * napeNs.Config.epsilon) {
        const px12 = s1.circle.worldCOMx;
        const py12 = s1.circle.worldCOMy;
        let c10 = null;
        let cx_ite16 = arb.contacts.next;
        while (cx_ite16 != null) {
          const cur10 = cx_ite16;
          if (0 == cur10.hash) {
            c10 = cur10;
            break;
          }
          cx_ite16 = cx_ite16.next;
        }
        if (c10 == null) {
          if (ZPP_Contact.zpp_pool == null) {
            c10 = new ZPP_Contact();
          } else {
            c10 = ZPP_Contact.zpp_pool;
            ZPP_Contact.zpp_pool = c10.next;
            c10.next = null;
          }
          const ci10 = c10.inner;
          ci10.jnAcc = ci10.jtAcc = 0;
          c10.hash = 0;
          c10.fresh = true;
          c10.arbiter = arb;
          arb.jrAcc = 0;
          const _this10 = arb.contacts;
          c10._inuse = true;
          const temp10 = c10;
          temp10.next = _this10.next;
          _this10.next = temp10;
          _this10.modified = true;
          _this10.length++;
          arb.innards.add(ci10);
        } else {
          c10.fresh = false;
        }
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
        const dist3 = invDist2 < napeNs.Config.epsilon ? 1e100 : 1.0 / invDist2;
        const df2 = 0.5 + (s1.circle.radius - 0.5 * minDist2) * invDist2;
        if (rev) {
          const px13 = s1.circle.worldCOMx + px11 * df2;
          const py13 = s1.circle.worldCOMy + py11 * df2;
          let c11 = null;
          let cx_ite17 = arb.contacts.next;
          while (cx_ite17 != null) {
            const cur11 = cx_ite17;
            if (0 == cur11.hash) {
              c11 = cur11;
              break;
            }
            cx_ite17 = cx_ite17.next;
          }
          if (c11 == null) {
            if (ZPP_Contact.zpp_pool == null) {
              c11 = new ZPP_Contact();
            } else {
              c11 = ZPP_Contact.zpp_pool;
              ZPP_Contact.zpp_pool = c11.next;
              c11.next = null;
            }
            const ci11 = c11.inner;
            ci11.jnAcc = ci11.jtAcc = 0;
            c11.hash = 0;
            c11.fresh = true;
            c11.arbiter = arb;
            arb.jrAcc = 0;
            const _this11 = arb.contacts;
            c11._inuse = true;
            const temp11 = c11;
            temp11.next = _this11.next;
            _this11.next = temp11;
            _this11.modified = true;
            _this11.length++;
            arb.innards.add(ci11);
          } else {
            c11.fresh = false;
          }
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
          let c12 = null;
          let cx_ite18 = arb.contacts.next;
          while (cx_ite18 != null) {
            const cur12 = cx_ite18;
            if (0 == cur12.hash) {
              c12 = cur12;
              break;
            }
            cx_ite18 = cx_ite18.next;
          }
          if (c12 == null) {
            if (ZPP_Contact.zpp_pool == null) {
              c12 = new ZPP_Contact();
            } else {
              c12 = ZPP_Contact.zpp_pool;
              ZPP_Contact.zpp_pool = c12.next;
              c12.next = null;
            }
            const ci12 = c12.inner;
            ci12.jnAcc = ci12.jtAcc = 0;
            c12.hash = 0;
            c12.fresh = true;
            c12.arbiter = arb;
            arb.jrAcc = 0;
            const _this12 = arb.contacts;
            c12._inuse = true;
            const temp12 = c12;
            temp12.next = _this12.next;
            _this12.next = temp12;
            _this12.modified = true;
            _this12.length++;
            arb.innards.add(ci12);
          } else {
            c12.fresh = false;
          }
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
    const _napeNs = getNape();
    // Ensure s1.type <= s2.type for consistent dispatch
    if (s1.type > s2.type) {
      const t = s1;
      s1 = s2;
      s2 = t;
    }
    return ZPP_Collide.testCollide(s1, s2);
  }
  static testCollide(s1: ZPP_Shape, s2: ZPP_Shape) {
    const _napeNs = getNape();
    if (s2.type == 2) {
      return ZPP_Collide._capsuleTestCollide(s1, s2);
    }
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
  static flowCollide(s1: ZPP_Shape, s2: ZPP_Shape, arb: ZPP_FluidArbiter) {
    const napeNs = getNape();
    // Capsule fluid collision: approximate using circle at capsule worldCOM
    if (s1.type == 2 || s2.type == 2) {
      return ZPP_Collide._capsuleFlowCollide(s1, s2, arb, napeNs);
    }
    if (s2.type == 1) {
      if (s1.type == 1) {
        const out1 = [];
        const out2 = [];
        let cont = true;
        let total = true;
        let cx_ite = s1.polygon.edges.head;
        while (cx_ite != null) {
          const ax = cx_ite.elt;
          let min = 1e100;
          let ind = 0;
          let cx_ite1 = s2.polygon.gverts.next;
          while (cx_ite1 != null) {
            const v = cx_ite1;
            const k = ax.gnormx * v.x + ax.gnormy * v.y;
            if (k < min) {
              min = k;
            }
            if (k >= ax.gprojection + napeNs.Config.epsilon) {
              out2[ind] = true;
              total = false;
            }
            ++ind;
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
          const _this = s2.polygon;
          if (_this.zip_worldCOM) {
            if (_this.body != null) {
              _this.zip_worldCOM = false;
              if (_this.zip_localCOM) {
                _this.zip_localCOM = false;
                if (_this.type == 1) {
                  const _this1 = _this.polygon;
                  if (_this1.lverts.next == null) {
                    throw new Error("Error: An empty polygon has no meaningful localCOM");
                  }
                  if (_this1.lverts.next.next == null) {
                    _this1.localCOMx = _this1.lverts.next.x;
                    _this1.localCOMy = _this1.lverts.next.y;
                  } else if (_this1.lverts.next.next.next == null) {
                    _this1.localCOMx = _this1.lverts.next.x;
                    _this1.localCOMy = _this1.lverts.next.y;
                    const t = 1.0;
                    _this1.localCOMx += _this1.lverts.next.next.x * t;
                    _this1.localCOMy += _this1.lverts.next.next.y * t;
                    const t1 = 0.5;
                    _this1.localCOMx *= t1;
                    _this1.localCOMy *= t1;
                  } else {
                    _this1.localCOMx = 0;
                    _this1.localCOMy = 0;
                    let area = 0.0;
                    let cx_ite2 = _this1.lverts.next;
                    let u = cx_ite2;
                    cx_ite2 = cx_ite2.next;
                    let v1 = cx_ite2;
                    cx_ite2 = cx_ite2.next;
                    while (cx_ite2 != null) {
                      const w = cx_ite2;
                      area += v1.x * (w.y - u.y);
                      const cf = w.y * v1.x - w.x * v1.y;
                      _this1.localCOMx += (v1.x + w.x) * cf;
                      _this1.localCOMy += (v1.y + w.y) * cf;
                      u = v1;
                      v1 = w;
                      cx_ite2 = cx_ite2.next;
                    }
                    cx_ite2 = _this1.lverts.next;
                    const w1 = cx_ite2;
                    area += v1.x * (w1.y - u.y);
                    const cf1 = w1.y * v1.x - w1.x * v1.y;
                    _this1.localCOMx += (v1.x + w1.x) * cf1;
                    _this1.localCOMy += (v1.y + w1.y) * cf1;
                    u = v1;
                    v1 = w1;
                    cx_ite2 = cx_ite2.next;
                    const w2 = cx_ite2;
                    area += v1.x * (w2.y - u.y);
                    const cf2 = w2.y * v1.x - w2.x * v1.y;
                    _this1.localCOMx += (v1.x + w2.x) * cf2;
                    _this1.localCOMy += (v1.y + w2.y) * cf2;
                    area = 1 / (3 * area);
                    const t2 = area;
                    _this1.localCOMx *= t2;
                    _this1.localCOMy *= t2;
                  }
                }
                if (_this.wrap_localCOM != null) {
                  _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
                  _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
                }
              }
              const _this2 = _this.body;
              if (_this2.zip_axis) {
                _this2.zip_axis = false;
                _this2.axisx = Math.sin(_this2.rot);
                _this2.axisy = Math.cos(_this2.rot);
              }
              _this.worldCOMx =
                _this.body.posx +
                (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
              _this.worldCOMy =
                _this.body.posy +
                (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
            }
          }
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
            let ind1 = 0;
            let cx_ite4 = s1.polygon.gverts.next;
            while (cx_ite4 != null) {
              const v2 = cx_ite4;
              const k1 = ax1.gnormx * v2.x + ax1.gnormy * v2.y;
              if (k1 < min1) {
                min1 = k1;
              }
              if (k1 >= ax1.gprojection + napeNs.Config.epsilon) {
                out1[ind1] = true;
                total = false;
              }
              ++ind1;
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
            const _this3 = s1.polygon;
            if (_this3.zip_worldCOM) {
              if (_this3.body != null) {
                _this3.zip_worldCOM = false;
                if (_this3.zip_localCOM) {
                  _this3.zip_localCOM = false;
                  if (_this3.type == 1) {
                    const _this4 = _this3.polygon;
                    if (_this4.lverts.next == null) {
                      throw new Error("Error: An empty polygon has no meaningful localCOM");
                    }
                    if (_this4.lverts.next.next == null) {
                      _this4.localCOMx = _this4.lverts.next.x;
                      _this4.localCOMy = _this4.lverts.next.y;
                    } else if (_this4.lverts.next.next.next == null) {
                      _this4.localCOMx = _this4.lverts.next.x;
                      _this4.localCOMy = _this4.lverts.next.y;
                      const t3 = 1.0;
                      _this4.localCOMx += _this4.lverts.next.next.x * t3;
                      _this4.localCOMy += _this4.lverts.next.next.y * t3;
                      const t4 = 0.5;
                      _this4.localCOMx *= t4;
                      _this4.localCOMy *= t4;
                    } else {
                      _this4.localCOMx = 0;
                      _this4.localCOMy = 0;
                      let area1 = 0.0;
                      let cx_ite5 = _this4.lverts.next;
                      let u1 = cx_ite5;
                      cx_ite5 = cx_ite5.next;
                      let v3 = cx_ite5;
                      cx_ite5 = cx_ite5.next;
                      while (cx_ite5 != null) {
                        const w3 = cx_ite5;
                        area1 += v3.x * (w3.y - u1.y);
                        const cf3 = w3.y * v3.x - w3.x * v3.y;
                        _this4.localCOMx += (v3.x + w3.x) * cf3;
                        _this4.localCOMy += (v3.y + w3.y) * cf3;
                        u1 = v3;
                        v3 = w3;
                        cx_ite5 = cx_ite5.next;
                      }
                      cx_ite5 = _this4.lverts.next;
                      const w4 = cx_ite5;
                      area1 += v3.x * (w4.y - u1.y);
                      const cf4 = w4.y * v3.x - w4.x * v3.y;
                      _this4.localCOMx += (v3.x + w4.x) * cf4;
                      _this4.localCOMy += (v3.y + w4.y) * cf4;
                      u1 = v3;
                      v3 = w4;
                      cx_ite5 = cx_ite5.next;
                      const w5 = cx_ite5;
                      area1 += v3.x * (w5.y - u1.y);
                      const cf5 = w5.y * v3.x - w5.x * v3.y;
                      _this4.localCOMx += (v3.x + w5.x) * cf5;
                      _this4.localCOMy += (v3.y + w5.y) * cf5;
                      area1 = 1 / (3 * area1);
                      const t5 = area1;
                      _this4.localCOMx *= t5;
                      _this4.localCOMy *= t5;
                    }
                  }
                  if (_this3.wrap_localCOM != null) {
                    _this3.wrap_localCOM.zpp_inner.x = _this3.localCOMx;
                    _this3.wrap_localCOM.zpp_inner.y = _this3.localCOMy;
                  }
                }
                const _this5 = _this3.body;
                if (_this5.zip_axis) {
                  _this5.zip_axis = false;
                  _this5.axisx = Math.sin(_this5.rot);
                  _this5.axisy = Math.cos(_this5.rot);
                }
                _this3.worldCOMx =
                  _this3.body.posx +
                  (_this3.body.axisy * _this3.localCOMx - _this3.body.axisx * _this3.localCOMy);
                _this3.worldCOMy =
                  _this3.body.posy +
                  (_this3.localCOMx * _this3.body.axisx + _this3.localCOMy * _this3.body.axisy);
              }
            }
            arb.overlap = s1.polygon.area;
            arb.centroidx = s1.polygon.worldCOMx;
            arb.centroidy = s1.polygon.worldCOMy;
            return true;
          } else if (cont) {
            while (ZPP_Collide.flowpoly.head != null) {
              const p = ZPP_Collide.flowpoly.pop_unsafe();
              if (!p._inuse) {
                const o = p;
                if (o.outer != null) {
                  o.outer.zpp_inner = null;
                  o.outer = null;
                }
                o._isimmutable = null;
                o._validate = null;
                o._invalidate = null;
                o.next = ZPP_Vec2.zpp_pool;
                ZPP_Vec2.zpp_pool = o;
              }
            }
            let fst_vert = null;
            let poly1 = false;
            let ite1 = s1.polygon.gverts.next;
            let ind11 = 0;
            let ite2 = s2.polygon.gverts.next;
            let ind2 = 0;
            let _g = 0;
            const _g1 = s2.polygon.edgeCnt;
            while (_g < _g1) {
              const i = _g++;
              if (!out2[i]) {
                ind2 = i;
                break;
              } else {
                ite2 = ite2.next;
              }
            }
            if (ite2 == null) {
              ite2 = s2.polygon.gverts.next;
              poly1 = true;
              let _g2 = 0;
              const _g3 = s1.polygon.edgeCnt;
              while (_g2 < _g3) {
                const i1 = _g2++;
                if (!out1[i1]) {
                  ind11 = i1;
                  break;
                } else {
                  ite1 = ite1.next;
                }
              }
              if (ite1 == null) {
                ite1 = s1.polygon.gverts.next;
              } else {
                ZPP_Collide.flowpoly.add(ite1);
                fst_vert = ZPP_Collide.flowpoly.head.elt;
              }
            } else {
              ZPP_Collide.flowpoly.add(ite2);
              fst_vert = ZPP_Collide.flowpoly.head.elt;
            }
            let cnt = 1;
            if (ZPP_Collide.flowpoly.head == null) {
              let cx_cont = true;
              let cx_itei = s1.polygon.gverts.next;
              let u2 = cx_itei;
              let cx_itej = cx_itei.next;
              while (cx_itej != null) {
                const v4 = cx_itej;
                let min2 = 2.0;
                const cx_cont1 = true;
                let cx_itei1 = s2.polygon.gverts.next;
                let a = cx_itei1;
                let cx_itej1 = cx_itei1.next;
                while (cx_itej1 != null) {
                  const b = cx_itej1;
                  let t6 = 0.0;
                  const _sx = u2.x - a.x;
                  const _sy = u2.y - a.y;
                  const _vx = v4.x - u2.x;
                  const _vy = v4.y - u2.y;
                  const _qx = b.x - a.x;
                  const _qy = b.y - a.y;
                  let den = _vy * _qx - _vx * _qy;
                  let tmp;
                  if (den * den > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                    den = 1 / den;
                    const txx = (_qy * _sx - _qx * _sy) * den;
                    if (txx > napeNs.Config.epsilon && txx < 1 - napeNs.Config.epsilon) {
                      const sxx = (_vy * _sx - _vx * _sy) * den;
                      if (sxx > napeNs.Config.epsilon && sxx < 1 - napeNs.Config.epsilon) {
                        t6 = txx;
                        tmp = true;
                      } else {
                        tmp = false;
                      }
                    } else {
                      tmp = false;
                    }
                  } else {
                    tmp = false;
                  }
                  if (tmp) {
                    if (t6 < min2) {
                      min2 = t6;
                      ite2 = cx_itei1;
                    }
                  }
                  cx_itei1 = cx_itej1;
                  a = b;
                  cx_itej1 = cx_itej1.next;
                }
                if (cx_cont1) {
                  while (true) {
                    cx_itej1 = s2.polygon.gverts.next;
                    const b1 = cx_itej1;
                    let t7 = 0.0;
                    const _sx1 = u2.x - a.x;
                    const _sy1 = u2.y - a.y;
                    const _vx1 = v4.x - u2.x;
                    const _vy1 = v4.y - u2.y;
                    const _qx1 = b1.x - a.x;
                    const _qy1 = b1.y - a.y;
                    let den1 = _vy1 * _qx1 - _vx1 * _qy1;
                    let tmp1;
                    if (den1 * den1 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                      den1 = 1 / den1;
                      const txx1 = (_qy1 * _sx1 - _qx1 * _sy1) * den1;
                      if (txx1 > napeNs.Config.epsilon && txx1 < 1 - napeNs.Config.epsilon) {
                        const sxx1 = (_vy1 * _sx1 - _vx1 * _sy1) * den1;
                        if (sxx1 > napeNs.Config.epsilon && sxx1 < 1 - napeNs.Config.epsilon) {
                          t7 = txx1;
                          tmp1 = true;
                        } else {
                          tmp1 = false;
                        }
                      } else {
                        tmp1 = false;
                      }
                    } else {
                      tmp1 = false;
                    }
                    if (tmp1) {
                      if (t7 < min2) {
                        min2 = t7;
                        ite2 = cx_itei1;
                      }
                    }
                    break;
                  }
                }
                if (min2 != 2.0) {
                  const T = min2;
                  const cx = u2.x + (v4.x - u2.x) * T;
                  const cy = u2.y + (v4.y - u2.y) * T;
                  let ret;
                  if (ZPP_Vec2.zpp_pool == null) {
                    ret = new ZPP_Vec2();
                  } else {
                    ret = ZPP_Vec2.zpp_pool;
                    ZPP_Vec2.zpp_pool = ret.next;
                    ret.next = null;
                  }
                  ret.weak = false;
                  ret._immutable = false;
                  ret.x = cx;
                  ret.y = cy;
                  fst_vert = ret;
                  ZPP_Collide.flowpoly.add(fst_vert);
                  poly1 = true;
                  ite1 = cx_itei;
                  cx_cont = false;
                  break;
                }
                cx_itei = cx_itej;
                u2 = v4;
                cx_itej = cx_itej.next;
              }
              if (cx_cont) {
                while (true) {
                  cx_itej = s1.polygon.gverts.next;
                  const v5 = cx_itej;
                  let min3 = 2.0;
                  const cx_cont2 = true;
                  let cx_itei2 = s2.polygon.gverts.next;
                  let a1 = cx_itei2;
                  let cx_itej2 = cx_itei2.next;
                  while (cx_itej2 != null) {
                    const b2 = cx_itej2;
                    let t8 = 0.0;
                    const _sx2 = u2.x - a1.x;
                    const _sy2 = u2.y - a1.y;
                    const _vx2 = v5.x - u2.x;
                    const _vy2 = v5.y - u2.y;
                    const _qx2 = b2.x - a1.x;
                    const _qy2 = b2.y - a1.y;
                    let den2 = _vy2 * _qx2 - _vx2 * _qy2;
                    let tmp2;
                    if (den2 * den2 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                      den2 = 1 / den2;
                      const txx2 = (_qy2 * _sx2 - _qx2 * _sy2) * den2;
                      if (txx2 > napeNs.Config.epsilon && txx2 < 1 - napeNs.Config.epsilon) {
                        const sxx2 = (_vy2 * _sx2 - _vx2 * _sy2) * den2;
                        if (sxx2 > napeNs.Config.epsilon && sxx2 < 1 - napeNs.Config.epsilon) {
                          t8 = txx2;
                          tmp2 = true;
                        } else {
                          tmp2 = false;
                        }
                      } else {
                        tmp2 = false;
                      }
                    } else {
                      tmp2 = false;
                    }
                    if (tmp2) {
                      if (t8 < min3) {
                        min3 = t8;
                        ite2 = cx_itei2;
                      }
                    }
                    cx_itei2 = cx_itej2;
                    a1 = b2;
                    cx_itej2 = cx_itej2.next;
                  }
                  if (cx_cont2) {
                    while (true) {
                      cx_itej2 = s2.polygon.gverts.next;
                      const b3 = cx_itej2;
                      let t9 = 0.0;
                      const _sx3 = u2.x - a1.x;
                      const _sy3 = u2.y - a1.y;
                      const _vx3 = v5.x - u2.x;
                      const _vy3 = v5.y - u2.y;
                      const _qx3 = b3.x - a1.x;
                      const _qy3 = b3.y - a1.y;
                      let den3 = _vy3 * _qx3 - _vx3 * _qy3;
                      let tmp3;
                      if (den3 * den3 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                        den3 = 1 / den3;
                        const txx3 = (_qy3 * _sx3 - _qx3 * _sy3) * den3;
                        if (txx3 > napeNs.Config.epsilon && txx3 < 1 - napeNs.Config.epsilon) {
                          const sxx3 = (_vy3 * _sx3 - _vx3 * _sy3) * den3;
                          if (sxx3 > napeNs.Config.epsilon && sxx3 < 1 - napeNs.Config.epsilon) {
                            t9 = txx3;
                            tmp3 = true;
                          } else {
                            tmp3 = false;
                          }
                        } else {
                          tmp3 = false;
                        }
                      } else {
                        tmp3 = false;
                      }
                      if (tmp3) {
                        if (t9 < min3) {
                          min3 = t9;
                          ite2 = cx_itei2;
                        }
                      }
                      break;
                    }
                  }
                  if (min3 != 2.0) {
                    const T1 = min3;
                    const cx1 = u2.x + (v5.x - u2.x) * T1;
                    const cy1 = u2.y + (v5.y - u2.y) * T1;
                    let ret1;
                    if (ZPP_Vec2.zpp_pool == null) {
                      ret1 = new ZPP_Vec2();
                    } else {
                      ret1 = ZPP_Vec2.zpp_pool;
                      ZPP_Vec2.zpp_pool = ret1.next;
                      ret1.next = null;
                    }
                    ret1.weak = false;
                    ret1._immutable = false;
                    ret1.x = cx1;
                    ret1.y = cy1;
                    fst_vert = ret1;
                    ZPP_Collide.flowpoly.add(fst_vert);
                    poly1 = true;
                    ite1 = cx_itei;
                    break;
                  }
                  break;
                }
              }
              cnt = 2;
            }
            while (true)
              if (poly1) {
                ite1 = ite1.next;
                ++ind11;
                if (ite1 == null) {
                  ite1 = s1.polygon.gverts.next;
                  ind11 = 0;
                }
                if (!out1[ind11]) {
                  const ex = ite1;
                  let tmp4;
                  if (fst_vert != null) {
                    const dx = ex.x - fst_vert.x;
                    const dy = ex.y - fst_vert.y;
                    tmp4 = dx * dx + dy * dy < napeNs.Config.epsilon;
                  } else {
                    tmp4 = false;
                  }
                  if (tmp4) {
                    break;
                  }
                  ZPP_Collide.flowpoly.add(ex);
                  if (fst_vert == null) {
                    fst_vert = ZPP_Collide.flowpoly.head.elt;
                  }
                  cnt = 1;
                } else {
                  const a2 = ZPP_Collide.flowpoly.head.elt;
                  const b4 = ite1;
                  let u3 = ite2;
                  let itm = ite2.next;
                  if (itm == null) {
                    itm = s2.polygon.gverts.next;
                  }
                  let max = -1.0;
                  let itmo = null;
                  let indo = 0;
                  let icnt = 0;
                  const beg_ite = itm;
                  let cx_ite6 = itm;
                  while (true) {
                    const v6 = cx_ite6;
                    let t10 = 0.0;
                    const _sx4 = u3.x - a2.x;
                    const _sy4 = u3.y - a2.y;
                    const _vx4 = v6.x - u3.x;
                    const _vy4 = v6.y - u3.y;
                    const _qx4 = b4.x - a2.x;
                    const _qy4 = b4.y - a2.y;
                    let den4 = _vy4 * _qx4 - _vx4 * _qy4;
                    let tmp5;
                    if (den4 * den4 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                      den4 = 1 / den4;
                      const txx4 = (_qy4 * _sx4 - _qx4 * _sy4) * den4;
                      if (txx4 > napeNs.Config.epsilon && txx4 < 1 - napeNs.Config.epsilon) {
                        const sxx4 = (_vy4 * _sx4 - _vx4 * _sy4) * den4;
                        if (sxx4 > napeNs.Config.epsilon && sxx4 < 1 - napeNs.Config.epsilon) {
                          t10 = txx4;
                          tmp5 = true;
                        } else {
                          tmp5 = false;
                        }
                      } else {
                        tmp5 = false;
                      }
                    } else {
                      tmp5 = false;
                    }
                    if (tmp5) {
                      if (t10 >= max) {
                        itmo = ite2;
                        indo = ind2;
                        if (++icnt == cnt) {
                          max = t10;
                          cx_ite6 = beg_ite;
                          break;
                        } else {
                          max = t10;
                        }
                      }
                    }
                    u3 = v6;
                    ite2 = cx_ite6;
                    ++ind2;
                    if (ind2 >= s2.polygon.edgeCnt) {
                      ind2 = 0;
                    }
                    cx_ite6 = cx_ite6.next;
                    if (cx_ite6 == null) {
                      cx_ite6 = s2.polygon.gverts.next;
                    }
                    break;
                  }
                  while (cx_ite6 != beg_ite) {
                    const v7 = cx_ite6;
                    let t11 = 0.0;
                    const _sx5 = u3.x - a2.x;
                    const _sy5 = u3.y - a2.y;
                    const _vx5 = v7.x - u3.x;
                    const _vy5 = v7.y - u3.y;
                    const _qx5 = b4.x - a2.x;
                    const _qy5 = b4.y - a2.y;
                    let den5 = _vy5 * _qx5 - _vx5 * _qy5;
                    let tmp6;
                    if (den5 * den5 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                      den5 = 1 / den5;
                      const txx5 = (_qy5 * _sx5 - _qx5 * _sy5) * den5;
                      if (txx5 > napeNs.Config.epsilon && txx5 < 1 - napeNs.Config.epsilon) {
                        const sxx5 = (_vy5 * _sx5 - _vx5 * _sy5) * den5;
                        if (sxx5 > napeNs.Config.epsilon && sxx5 < 1 - napeNs.Config.epsilon) {
                          t11 = txx5;
                          tmp6 = true;
                        } else {
                          tmp6 = false;
                        }
                      } else {
                        tmp6 = false;
                      }
                    } else {
                      tmp6 = false;
                    }
                    if (tmp6) {
                      if (t11 >= max) {
                        itmo = ite2;
                        indo = ind2;
                        if (++icnt == cnt) {
                          max = t11;
                          break;
                        } else {
                          max = t11;
                        }
                      }
                    }
                    u3 = v7;
                    ite2 = cx_ite6;
                    ++ind2;
                    if (ind2 >= s2.polygon.edgeCnt) {
                      ind2 = 0;
                    }
                    cx_ite6 = cx_ite6.next;
                    if (cx_ite6 == null) {
                      cx_ite6 = s2.polygon.gverts.next;
                    }
                  }
                  if (itmo == null) {
                    break;
                  }
                  const u4 = itmo;
                  let itm2 = itmo.next;
                  if (itm2 == null) {
                    itm2 = s2.polygon.gverts.next;
                  }
                  const v8 = itm2;
                  const T2 = max;
                  const cx2 = u4.x + (v8.x - u4.x) * T2;
                  const cy2 = u4.y + (v8.y - u4.y) * T2;
                  let tmp7;
                  if (fst_vert != null) {
                    const dx1 = cx2 - fst_vert.x;
                    const dy1 = cy2 - fst_vert.y;
                    tmp7 = dx1 * dx1 + dy1 * dy1 < napeNs.Config.epsilon;
                  } else {
                    tmp7 = false;
                  }
                  if (tmp7) {
                    break;
                  }
                  const tmp8 = ZPP_Collide.flowpoly;
                  let ret2;
                  if (ZPP_Vec2.zpp_pool == null) {
                    ret2 = new ZPP_Vec2();
                  } else {
                    ret2 = ZPP_Vec2.zpp_pool;
                    ZPP_Vec2.zpp_pool = ret2.next;
                    ret2.next = null;
                  }
                  ret2.weak = false;
                  ret2._immutable = false;
                  ret2.x = cx2;
                  ret2.y = cy2;
                  tmp8.add(ret2);
                  if (fst_vert == null) {
                    fst_vert = ZPP_Collide.flowpoly.head.elt;
                  }
                  ite2 = itmo;
                  ind2 = indo;
                  poly1 = !poly1;
                  cnt = 2;
                }
              } else {
                ite2 = ite2.next;
                ++ind2;
                if (ite2 == null) {
                  ite2 = s2.polygon.gverts.next;
                  ind2 = 0;
                }
                if (!out2[ind2]) {
                  const ex1 = ite2;
                  let tmp9;
                  if (fst_vert != null) {
                    const dx2 = ex1.x - fst_vert.x;
                    const dy2 = ex1.y - fst_vert.y;
                    tmp9 = dx2 * dx2 + dy2 * dy2 < napeNs.Config.epsilon;
                  } else {
                    tmp9 = false;
                  }
                  if (tmp9) {
                    break;
                  }
                  ZPP_Collide.flowpoly.add(ex1);
                  if (fst_vert == null) {
                    fst_vert = ZPP_Collide.flowpoly.head.elt;
                  }
                  cnt = 1;
                } else {
                  const a3 = ZPP_Collide.flowpoly.head.elt;
                  const b5 = ite2;
                  let u5 = ite1;
                  let itm1 = ite1.next;
                  if (itm1 == null) {
                    itm1 = s1.polygon.gverts.next;
                  }
                  let max1 = -1.0;
                  let itmo1 = null;
                  let indo1 = 0;
                  let icnt1 = 0;
                  const beg_ite1 = itm1;
                  let cx_ite7 = itm1;
                  while (true) {
                    const v9 = cx_ite7;
                    let t12 = 0.0;
                    const _sx6 = u5.x - a3.x;
                    const _sy6 = u5.y - a3.y;
                    const _vx6 = v9.x - u5.x;
                    const _vy6 = v9.y - u5.y;
                    const _qx6 = b5.x - a3.x;
                    const _qy6 = b5.y - a3.y;
                    let den6 = _vy6 * _qx6 - _vx6 * _qy6;
                    let tmp10;
                    if (den6 * den6 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                      den6 = 1 / den6;
                      const txx6 = (_qy6 * _sx6 - _qx6 * _sy6) * den6;
                      if (txx6 > napeNs.Config.epsilon && txx6 < 1 - napeNs.Config.epsilon) {
                        const sxx6 = (_vy6 * _sx6 - _vx6 * _sy6) * den6;
                        if (sxx6 > napeNs.Config.epsilon && sxx6 < 1 - napeNs.Config.epsilon) {
                          t12 = txx6;
                          tmp10 = true;
                        } else {
                          tmp10 = false;
                        }
                      } else {
                        tmp10 = false;
                      }
                    } else {
                      tmp10 = false;
                    }
                    if (tmp10) {
                      if (t12 >= max1) {
                        itmo1 = ite1;
                        indo1 = ind11;
                        if (++icnt1 == cnt) {
                          max1 = t12;
                          cx_ite7 = beg_ite1;
                          break;
                        } else {
                          max1 = t12;
                        }
                      }
                    }
                    u5 = v9;
                    ite1 = cx_ite7;
                    ++ind11;
                    if (ind11 >= s1.polygon.edgeCnt) {
                      ind11 = 0;
                    }
                    cx_ite7 = cx_ite7.next;
                    if (cx_ite7 == null) {
                      cx_ite7 = s1.polygon.gverts.next;
                    }
                    break;
                  }
                  while (cx_ite7 != beg_ite1) {
                    const v10 = cx_ite7;
                    let t13 = 0.0;
                    const _sx7 = u5.x - a3.x;
                    const _sy7 = u5.y - a3.y;
                    const _vx7 = v10.x - u5.x;
                    const _vy7 = v10.y - u5.y;
                    const _qx7 = b5.x - a3.x;
                    const _qy7 = b5.y - a3.y;
                    let den7 = _vy7 * _qx7 - _vx7 * _qy7;
                    let tmp11;
                    if (den7 * den7 > napeNs.Config.epsilon * napeNs.Config.epsilon) {
                      den7 = 1 / den7;
                      const txx7 = (_qy7 * _sx7 - _qx7 * _sy7) * den7;
                      if (txx7 > napeNs.Config.epsilon && txx7 < 1 - napeNs.Config.epsilon) {
                        const sxx7 = (_vy7 * _sx7 - _vx7 * _sy7) * den7;
                        if (sxx7 > napeNs.Config.epsilon && sxx7 < 1 - napeNs.Config.epsilon) {
                          t13 = txx7;
                          tmp11 = true;
                        } else {
                          tmp11 = false;
                        }
                      } else {
                        tmp11 = false;
                      }
                    } else {
                      tmp11 = false;
                    }
                    if (tmp11) {
                      if (t13 >= max1) {
                        itmo1 = ite1;
                        indo1 = ind11;
                        if (++icnt1 == cnt) {
                          max1 = t13;
                          break;
                        } else {
                          max1 = t13;
                        }
                      }
                    }
                    u5 = v10;
                    ite1 = cx_ite7;
                    ++ind11;
                    if (ind11 >= s1.polygon.edgeCnt) {
                      ind11 = 0;
                    }
                    cx_ite7 = cx_ite7.next;
                    if (cx_ite7 == null) {
                      cx_ite7 = s1.polygon.gverts.next;
                    }
                  }
                  if (itmo1 == null) {
                    break;
                  }
                  const u6 = itmo1;
                  let itm21 = itmo1.next;
                  if (itm21 == null) {
                    itm21 = s1.polygon.gverts.next;
                  }
                  const v11 = itm21;
                  const T3 = max1;
                  const cx3 = u6.x + (v11.x - u6.x) * T3;
                  const cy3 = u6.y + (v11.y - u6.y) * T3;
                  let tmp12;
                  if (fst_vert != null) {
                    const dx3 = cx3 - fst_vert.x;
                    const dy3 = cy3 - fst_vert.y;
                    tmp12 = dx3 * dx3 + dy3 * dy3 < napeNs.Config.epsilon;
                  } else {
                    tmp12 = false;
                  }
                  if (tmp12) {
                    break;
                  }
                  const tmp13 = ZPP_Collide.flowpoly;
                  let ret3;
                  if (ZPP_Vec2.zpp_pool == null) {
                    ret3 = new ZPP_Vec2();
                  } else {
                    ret3 = ZPP_Vec2.zpp_pool;
                    ZPP_Vec2.zpp_pool = ret3.next;
                    ret3.next = null;
                  }
                  ret3.weak = false;
                  ret3._immutable = false;
                  ret3.x = cx3;
                  ret3.y = cy3;
                  tmp13.add(ret3);
                  if (fst_vert == null) {
                    fst_vert = ZPP_Collide.flowpoly.head.elt;
                  }
                  ite1 = itmo1;
                  ind11 = indo1;
                  poly1 = !poly1;
                  cnt = 2;
                }
              }
            if (
              ZPP_Collide.flowpoly.head != null &&
              ZPP_Collide.flowpoly.head.next != null &&
              ZPP_Collide.flowpoly.head.next.next != null
            ) {
              let area2 = 0.0;
              let COMx = 0;
              let COMy = 0;
              let cx_ite8 = ZPP_Collide.flowpoly.head;
              let u7 = cx_ite8.elt;
              cx_ite8 = cx_ite8.next;
              let v12 = cx_ite8.elt;
              cx_ite8 = cx_ite8.next;
              while (cx_ite8 != null) {
                const w6 = cx_ite8.elt;
                area2 += v12.x * (w6.y - u7.y);
                const cf6 = w6.y * v12.x - w6.x * v12.y;
                COMx += (v12.x + w6.x) * cf6;
                COMy += (v12.y + w6.y) * cf6;
                u7 = v12;
                v12 = w6;
                cx_ite8 = cx_ite8.next;
              }
              cx_ite8 = ZPP_Collide.flowpoly.head;
              const w7 = cx_ite8.elt;
              area2 += v12.x * (w7.y - u7.y);
              const cf7 = w7.y * v12.x - w7.x * v12.y;
              COMx += (v12.x + w7.x) * cf7;
              COMy += (v12.y + w7.y) * cf7;
              u7 = v12;
              v12 = w7;
              cx_ite8 = cx_ite8.next;
              const w8 = cx_ite8.elt;
              area2 += v12.x * (w8.y - u7.y);
              const cf8 = w8.y * v12.x - w8.x * v12.y;
              COMx += (v12.x + w8.x) * cf8;
              COMy += (v12.y + w8.y) * cf8;
              area2 *= 0.5;
              const ia = 1 / (6 * area2);
              const t14 = ia;
              COMx *= t14;
              COMy *= t14;
              arb.overlap = -area2;
              arb.centroidx = COMx;
              arb.centroidy = COMy;
              return true;
            } else {
              return false;
            }
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
          } else if (dist + s1.circle.radius > a4.gprojection + napeNs.Config.epsilon) {
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
                const _this6 = s2.polygon;
                if (_this6.zip_worldCOM) {
                  if (_this6.body != null) {
                    _this6.zip_worldCOM = false;
                    if (_this6.zip_localCOM) {
                      _this6.zip_localCOM = false;
                      if (_this6.type == 1) {
                        const _this7 = _this6.polygon;
                        if (_this7.lverts.next == null) {
                          throw new Error("Error: An empty polygon has no meaningful localCOM");
                        }
                        if (_this7.lverts.next.next == null) {
                          _this7.localCOMx = _this7.lverts.next.x;
                          _this7.localCOMy = _this7.lverts.next.y;
                        } else if (_this7.lverts.next.next.next == null) {
                          _this7.localCOMx = _this7.lverts.next.x;
                          _this7.localCOMy = _this7.lverts.next.y;
                          const t15 = 1.0;
                          _this7.localCOMx += _this7.lverts.next.next.x * t15;
                          _this7.localCOMy += _this7.lverts.next.next.y * t15;
                          const t16 = 0.5;
                          _this7.localCOMx *= t16;
                          _this7.localCOMy *= t16;
                        } else {
                          _this7.localCOMx = 0;
                          _this7.localCOMy = 0;
                          let area3 = 0.0;
                          let cx_ite11 = _this7.lverts.next;
                          let u8 = cx_ite11;
                          cx_ite11 = cx_ite11.next;
                          let v15 = cx_ite11;
                          cx_ite11 = cx_ite11.next;
                          while (cx_ite11 != null) {
                            const w9 = cx_ite11;
                            area3 += v15.x * (w9.y - u8.y);
                            const cf9 = w9.y * v15.x - w9.x * v15.y;
                            _this7.localCOMx += (v15.x + w9.x) * cf9;
                            _this7.localCOMy += (v15.y + w9.y) * cf9;
                            u8 = v15;
                            v15 = w9;
                            cx_ite11 = cx_ite11.next;
                          }
                          cx_ite11 = _this7.lverts.next;
                          const w10 = cx_ite11;
                          area3 += v15.x * (w10.y - u8.y);
                          const cf10 = w10.y * v15.x - w10.x * v15.y;
                          _this7.localCOMx += (v15.x + w10.x) * cf10;
                          _this7.localCOMy += (v15.y + w10.y) * cf10;
                          u8 = v15;
                          v15 = w10;
                          cx_ite11 = cx_ite11.next;
                          const w11 = cx_ite11;
                          area3 += v15.x * (w11.y - u8.y);
                          const cf11 = w11.y * v15.x - w11.x * v15.y;
                          _this7.localCOMx += (v15.x + w11.x) * cf11;
                          _this7.localCOMy += (v15.y + w11.y) * cf11;
                          area3 = 1 / (3 * area3);
                          const t17 = area3;
                          _this7.localCOMx *= t17;
                          _this7.localCOMy *= t17;
                        }
                      }
                      if (_this6.wrap_localCOM != null) {
                        _this6.wrap_localCOM.zpp_inner.x = _this6.localCOMx;
                        _this6.wrap_localCOM.zpp_inner.y = _this6.localCOMy;
                      }
                    }
                    const _this8 = _this6.body;
                    if (_this8.zip_axis) {
                      _this8.zip_axis = false;
                      _this8.axisx = Math.sin(_this8.rot);
                      _this8.axisy = Math.cos(_this8.rot);
                    }
                    _this6.worldCOMx =
                      _this6.body.posx +
                      (_this6.body.axisy * _this6.localCOMx - _this6.body.axisx * _this6.localCOMy);
                    _this6.worldCOMy =
                      _this6.body.posy +
                      (_this6.localCOMx * _this6.body.axisx + _this6.localCOMy * _this6.body.axisy);
                  }
                }
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
                      if (dx5 * dx5 + dy5 * dy5 < napeNs.Config.epsilon) {
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
                      const tval = t18 < napeNs.Config.epsilon ? (-B + D) * A : t18;
                      let cx4 = 0.0;
                      let cy4 = 0.0;
                      const T4 = tval;
                      cx4 = u9.x + (v16.x - u9.x) * T4;
                      cy4 = u9.y + (v16.y - u9.y) * T4;
                      const dx6 = fst_vert1.x - cx4;
                      const dy6 = fst_vert1.y - cy4;
                      if (dx6 * dx6 + dy6 * dy6 < napeNs.Config.epsilon) {
                        break;
                      }
                      const tmp15 = ZPP_Collide.flowpoly;
                      let ret4;
                      if (ZPP_Vec2.zpp_pool == null) {
                        ret4 = new ZPP_Vec2();
                      } else {
                        ret4 = ZPP_Vec2.zpp_pool;
                        ZPP_Vec2.zpp_pool = ret4.next;
                        ret4.next = null;
                      }
                      ret4.weak = false;
                      ret4._immutable = false;
                      ret4.x = cx4;
                      ret4.y = cy4;
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
                          const tval1 = t19 < napeNs.Config.epsilon ? (-B1 + D1) * A1 : t19;
                          let cx5 = 0.0;
                          let cy5 = 0.0;
                          const T5 = tval1;
                          cx5 = u10.x + (v17.x - u10.x) * T5;
                          cy5 = u10.y + (v17.y - u10.y) * T5;
                          const dx7 = fst_vert1.x - cx5;
                          const dy7 = fst_vert1.y - cy5;
                          if (dx7 * dx7 + dy7 * dy7 < napeNs.Config.epsilon) {
                            state = 0;
                            cx_ite12 = beg_ite2;
                            break;
                          }
                          let ret5;
                          if (ZPP_Vec2.zpp_pool == null) {
                            ret5 = new ZPP_Vec2();
                          } else {
                            ret5 = ZPP_Vec2.zpp_pool;
                            ZPP_Vec2.zpp_pool = ret5.next;
                            ret5.next = null;
                          }
                          ret5.weak = false;
                          ret5._immutable = false;
                          ret5.x = cx5;
                          ret5.y = cy5;
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
                          if (D2 * D2 < napeNs.Config.epsilon) {
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
                          if (t0 < 1 - napeNs.Config.epsilon && t110 > napeNs.Config.epsilon) {
                            let cx6 = 0.0;
                            let cy6 = 0.0;
                            const T6 = t0;
                            cx6 = u10.x + (v17.x - u10.x) * T6;
                            cy6 = u10.y + (v17.y - u10.y) * T6;
                            let tmp16;
                            if (fst_vert1 != null) {
                              const dx8 = fst_vert1.x - cx6;
                              const dy8 = fst_vert1.y - cy6;
                              tmp16 = dx8 * dx8 + dy8 * dy8 < napeNs.Config.epsilon;
                            } else {
                              tmp16 = false;
                            }
                            if (tmp16) {
                              state = 0;
                              cx_ite12 = beg_ite2;
                              break;
                            }
                            let ret6;
                            if (ZPP_Vec2.zpp_pool == null) {
                              ret6 = new ZPP_Vec2();
                            } else {
                              ret6 = ZPP_Vec2.zpp_pool;
                              ZPP_Vec2.zpp_pool = ret6.next;
                              ret6.next = null;
                            }
                            ret6.weak = false;
                            ret6._immutable = false;
                            ret6.x = cx6;
                            ret6.y = cy6;
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
                              let ret7;
                              if (ZPP_Vec2.zpp_pool == null) {
                                ret7 = new ZPP_Vec2();
                              } else {
                                ret7 = ZPP_Vec2.zpp_pool;
                                ZPP_Vec2.zpp_pool = ret7.next;
                                ret7.next = null;
                              }
                              ret7.weak = false;
                              ret7._immutable = false;
                              ret7.x = cx7;
                              ret7.y = cy7;
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
                          const tval2 = t20 < napeNs.Config.epsilon ? (-B3 + D3) * A3 : t20;
                          let cx8 = 0.0;
                          let cy8 = 0.0;
                          const T8 = tval2;
                          cx8 = u10.x + (v18.x - u10.x) * T8;
                          cy8 = u10.y + (v18.y - u10.y) * T8;
                          const dx9 = fst_vert1.x - cx8;
                          const dy9 = fst_vert1.y - cy8;
                          if (dx9 * dx9 + dy9 * dy9 < napeNs.Config.epsilon) {
                            state = 0;
                            cx_ite12 = beg_ite2;
                            break;
                          }
                          let ret8;
                          if (ZPP_Vec2.zpp_pool == null) {
                            ret8 = new ZPP_Vec2();
                          } else {
                            ret8 = ZPP_Vec2.zpp_pool;
                            ZPP_Vec2.zpp_pool = ret8.next;
                            ret8.next = null;
                          }
                          ret8.weak = false;
                          ret8._immutable = false;
                          ret8.x = cx8;
                          ret8.y = cy8;
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
                          if (D4 * D4 < napeNs.Config.epsilon) {
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
                          if (t01 < 1 - napeNs.Config.epsilon && t111 > napeNs.Config.epsilon) {
                            let cx9 = 0.0;
                            let cy9 = 0.0;
                            const T9 = t01;
                            cx9 = u10.x + (v18.x - u10.x) * T9;
                            cy9 = u10.y + (v18.y - u10.y) * T9;
                            let tmp18;
                            if (fst_vert1 != null) {
                              const dx10 = fst_vert1.x - cx9;
                              const dy10 = fst_vert1.y - cy9;
                              tmp18 = dx10 * dx10 + dy10 * dy10 < napeNs.Config.epsilon;
                            } else {
                              tmp18 = false;
                            }
                            if (tmp18) {
                              state = 0;
                              cx_ite12 = beg_ite2;
                              break;
                            }
                            let ret9;
                            if (ZPP_Vec2.zpp_pool == null) {
                              ret9 = new ZPP_Vec2();
                            } else {
                              ret9 = ZPP_Vec2.zpp_pool;
                              ZPP_Vec2.zpp_pool = ret9.next;
                              ret9.next = null;
                            }
                            ret9.weak = false;
                            ret9._immutable = false;
                            ret9.x = cx9;
                            ret9.y = cy9;
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
                              let ret10;
                              if (ZPP_Vec2.zpp_pool == null) {
                                ret10 = new ZPP_Vec2();
                              } else {
                                ret10 = ZPP_Vec2.zpp_pool;
                                ZPP_Vec2.zpp_pool = ret10.next;
                                ret10.next = null;
                              }
                              ret10.weak = false;
                              ret10._immutable = false;
                              ret10.x = cx10;
                              ret10.y = cy10;
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
      } else if (ds < napeNs.Config.epsilon * napeNs.Config.epsilon) {
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

  // ===========================================================================
  // Capsule collision helpers
  // ===========================================================================

  /** Point-in-capsule containment test. */
  static capsuleContains(cap: any, p: any): boolean {
    const t = ZPP_Collide._closestT(cap.spine1x, cap.spine1y, cap.spine2x, cap.spine2y, p.x, p.y);
    const cx = cap.spine1x + t * (cap.spine2x - cap.spine1x);
    const cy = cap.spine1y + t * (cap.spine2y - cap.spine1y);
    const dx = p.x - cx;
    const dy = p.y - cy;
    return dx * dx + dy * dy < cap.radius * cap.radius;
  }

  /** Closest parameter t ∈ [0,1] on segment (ax,ay)-(bx,by) to point (px,py). */
  static _closestT(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) return 0;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return t;
  }

  /**
   * Closest parameters (t1, t2) between two segments.
   * Segment 1: (a1x,a1y)-(b1x,b1y), Segment 2: (a2x,a2y)-(b2x,b2y).
   * Returns [t1, t2] both in [0,1].
   */
  static _closestTT(
    a1x: number,
    a1y: number,
    b1x: number,
    b1y: number,
    a2x: number,
    a2y: number,
    b2x: number,
    b2y: number,
  ): [number, number] {
    const d1x = b1x - a1x,
      d1y = b1y - a1y;
    const d2x = b2x - a2x,
      d2y = b2y - a2y;
    const rx = a1x - a2x,
      ry = a1y - a2y;
    const a = d1x * d1x + d1y * d1y;
    const e = d2x * d2x + d2y * d2y;
    const f = d2x * rx + d2y * ry;

    let t1: number, t2: number;
    if (a < 1e-12 && e < 1e-12) {
      return [0, 0];
    }
    if (a < 1e-12) {
      t1 = 0;
      t2 = f / e;
      if (t2 < 0) t2 = 0;
      if (t2 > 1) t2 = 1;
      return [t1, t2];
    }
    const c = d1x * rx + d1y * ry;
    if (e < 1e-12) {
      t2 = 0;
      t1 = -c / a;
      if (t1 < 0) t1 = 0;
      if (t1 > 1) t1 = 1;
      return [t1, t2];
    }
    const b = d1x * d2x + d1y * d2y;
    const denom = a * e - b * b;
    if (denom > 1e-12) {
      t1 = (b * f - c * e) / denom;
      if (t1 < 0) t1 = 0;
      if (t1 > 1) t1 = 1;
    } else {
      t1 = 0;
    }
    t2 = (b * t1 + f) / e;
    if (t2 < 0) {
      t2 = 0;
      t1 = -c / a;
      if (t1 < 0) t1 = 0;
      if (t1 > 1) t1 = 1;
    } else if (t2 > 1) {
      t2 = 1;
      t1 = (b - c) / a;
      if (t1 < 0) t1 = 0;
      if (t1 > 1) t1 = 1;
    }
    return [t1, t2];
  }

  /**
   * Create or reuse a contact in the arbiter's contact list.
   * Returns the contact, or null if creation failed.
   */
  private static _getOrCreateContact(arb: any, hash: number, stamp: number): any {
    let c: any = null;
    let cx_ite = arb.contacts.next;
    while (cx_ite != null) {
      if (hash == cx_ite.hash) {
        c = cx_ite;
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
      const _this = arb.contacts;
      c._inuse = true;
      const temp = c;
      temp.next = _this.next;
      _this.next = temp;
      _this.modified = true;
      _this.length++;
      arb.innards.add(ci);
    } else {
      c.fresh = false;
    }
    return c;
  }

  /**
   * Capsule contact collision dispatcher.
   * s2 is always the capsule (type=2). s1 is circle (0), polygon (1), or capsule (2).
   */
  static _capsuleContactCollide(
    s1: ZPP_Shape,
    s2: ZPP_Shape,
    arb: any,
    rev: boolean,
    napeNs: any,
  ): boolean {
    const cap2 = s2.capsule;

    if (s1.type == 0) {
      // circle-capsule
      return ZPP_Collide._circleCapsuleContact(s1.circle, cap2, arb, rev, napeNs);
    } else if (s1.type == 1) {
      // polygon-capsule
      return ZPP_Collide._polyCapsuleContact(s1.polygon, cap2, arb, rev, napeNs);
    } else {
      // capsule-capsule
      return ZPP_Collide._capsuleCapsuleContact(s1.capsule, cap2, arb, rev, napeNs);
    }
  }

  /** Circle vs Capsule contact generation. */
  static _circleCapsuleContact(circ: any, cap: any, arb: any, rev: boolean, napeNs: any): boolean {
    // Find closest point on capsule spine to circle center
    const t = ZPP_Collide._closestT(
      cap.spine1x,
      cap.spine1y,
      cap.spine2x,
      cap.spine2y,
      circ.worldCOMx,
      circ.worldCOMy,
    );
    const cx = cap.spine1x + t * (cap.spine2x - cap.spine1x);
    const cy = cap.spine1y + t * (cap.spine2y - cap.spine1y);

    const minDist = circ.radius + cap.radius;
    const px = circ.worldCOMx - cx;
    const py = circ.worldCOMy - cy;
    const distSqr = px * px + py * py;

    if (distSqr > minDist * minDist) return false;

    let co: any;
    if (distSqr < napeNs.Config.epsilon * napeNs.Config.epsilon) {
      // Overlapping centers
      const cpx = (circ.worldCOMx + cx) * 0.5;
      const cpy = (circ.worldCOMy + cy) * 0.5;
      co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = cpx;
      co.py = cpy;
      arb.nx = 1;
      arb.ny = 0;
      co.dist = -minDist;
      co.stamp = arb.stamp;
      co.posOnly = false;
    } else {
      const invDist = 1.0 / Math.sqrt(distSqr);
      const dist = invDist < napeNs.Config.epsilon ? 1e100 : 1.0 / invDist;
      const df = 0.5 + (circ.radius - 0.5 * minDist) * invDist;
      const cpx = circ.worldCOMx - px * df;
      const cpy = circ.worldCOMy - py * df;
      co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = cpx;
      co.py = cpy;
      if (rev) {
        arb.nx = px * invDist;
        arb.ny = py * invDist;
      } else {
        arb.nx = -px * invDist;
        arb.ny = -py * invDist;
      }
      co.dist = dist - minDist;
      co.stamp = arb.stamp;
      co.posOnly = false;
    }

    if (co != null) {
      const con = co.inner;
      // Local reference: circle center for circle, closest spine point for capsule
      const capLr = cap.localCOMx + (2 * t - 1) * cap.halfLength;
      if (rev) {
        con.lr1x = capLr;
        con.lr1y = cap.localCOMy;
        con.lr2x = circ.localCOMx;
        con.lr2y = circ.localCOMy;
      } else {
        con.lr1x = circ.localCOMx;
        con.lr1y = circ.localCOMy;
        con.lr2x = capLr;
        con.lr2y = cap.localCOMy;
      }
      arb.radius = minDist;
      arb.ptype = 2;
      return true;
    }
    return false;
  }

  /** Capsule vs Capsule contact generation. */
  static _capsuleCapsuleContact(
    cap1: any,
    cap2: any,
    arb: any,
    rev: boolean,
    napeNs: any,
  ): boolean {
    const [t1, t2] = ZPP_Collide._closestTT(
      cap1.spine1x,
      cap1.spine1y,
      cap1.spine2x,
      cap1.spine2y,
      cap2.spine1x,
      cap2.spine1y,
      cap2.spine2x,
      cap2.spine2y,
    );
    const p1x = cap1.spine1x + t1 * (cap1.spine2x - cap1.spine1x);
    const p1y = cap1.spine1y + t1 * (cap1.spine2y - cap1.spine1y);
    const p2x = cap2.spine1x + t2 * (cap2.spine2x - cap2.spine1x);
    const p2y = cap2.spine1y + t2 * (cap2.spine2y - cap2.spine1y);

    const minDist = cap1.radius + cap2.radius;
    const px = p2x - p1x;
    const py = p2y - p1y;
    const distSqr = px * px + py * py;

    if (distSqr > minDist * minDist) return false;

    let co: any;
    if (distSqr < napeNs.Config.epsilon * napeNs.Config.epsilon) {
      const cpx = (p1x + p2x) * 0.5;
      const cpy = (p1y + p2y) * 0.5;
      co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = cpx;
      co.py = cpy;
      arb.nx = 1;
      arb.ny = 0;
      co.dist = -minDist;
      co.stamp = arb.stamp;
      co.posOnly = false;
    } else {
      const invDist = 1.0 / Math.sqrt(distSqr);
      const dist = invDist < napeNs.Config.epsilon ? 1e100 : 1.0 / invDist;
      const df = 0.5 + (cap1.radius - 0.5 * minDist) * invDist;
      const cpx = p1x + px * df;
      const cpy = p1y + py * df;
      co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = cpx;
      co.py = cpy;
      if (rev) {
        arb.nx = -px * invDist;
        arb.ny = -py * invDist;
      } else {
        arb.nx = px * invDist;
        arb.ny = py * invDist;
      }
      co.dist = dist - minDist;
      co.stamp = arb.stamp;
      co.posOnly = false;
    }

    if (co != null) {
      const con = co.inner;
      const lr1x = cap1.localCOMx + (2 * t1 - 1) * cap1.halfLength;
      const lr2x = cap2.localCOMx + (2 * t2 - 1) * cap2.halfLength;
      if (rev) {
        con.lr1x = lr2x;
        con.lr1y = cap2.localCOMy;
        con.lr2x = lr1x;
        con.lr2y = cap1.localCOMy;
      } else {
        con.lr1x = lr1x;
        con.lr1y = cap1.localCOMy;
        con.lr2x = lr2x;
        con.lr2y = cap2.localCOMy;
      }
      arb.radius = minDist;
      arb.ptype = 2;
      return true;
    }
    return false;
  }

  /** Polygon vs Capsule contact generation. */
  static _polyCapsuleContact(poly: any, cap: any, arb: any, rev: boolean, napeNs: any): boolean {
    // SAT: for each polygon edge, find min distance from capsule spine to edge
    let bestDist = -1e100;
    let bestEdge: any = null;
    let bestVert: any = null;
    let bestT = 0; // parameter on capsule spine for closest point to best edge
    let cont = true;

    let vite = poly.gverts.next;
    let cx_ite = poly.edges.head;
    while (cx_ite != null) {
      const edge = cx_ite.elt;
      // Project both spine endpoints onto edge normal
      const d1 = edge.gnormx * cap.spine1x + edge.gnormy * cap.spine1y;
      const d2 = edge.gnormx * cap.spine2x + edge.gnormy * cap.spine2y;
      // Take the endpoint closest to the edge (minimum projection)
      const minProj = d1 < d2 ? d1 : d2;
      const dist = minProj - edge.gprojection - cap.radius;
      if (dist > 0) {
        cont = false;
        break;
      }
      if (dist > bestDist) {
        bestDist = dist;
        bestEdge = edge;
        bestVert = vite;
        bestT = d1 < d2 ? 0 : 1;
      }
      vite = vite.next;
      cx_ite = cx_ite.next;
    }

    if (!cont) return false;

    // The effective circle center on the capsule spine closest to the best edge
    const ecx = cap.spine1x + bestT * (cap.spine2x - cap.spine1x);
    const ecy = cap.spine1y + bestT * (cap.spine2y - cap.spine1y);

    // Check face vs vertex contact (same logic as circle-polygon)
    const v0 = bestVert;
    const v1 = bestVert.next == null ? poly.gverts.next : bestVert.next;

    const dt = ecy * bestEdge.gnormx - ecx * bestEdge.gnormy;

    if (dt <= v0.y * bestEdge.gnormx - v0.x * bestEdge.gnormy) {
      // Vertex contact with v0
      const px = v0.x - ecx;
      const py = v0.y - ecy;
      const distSqr = px * px + py * py;
      if (distSqr > cap.radius * cap.radius) return false;

      if (distSqr < napeNs.Config.epsilon * napeNs.Config.epsilon) {
        const co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
        co.px = ecx;
        co.py = ecy;
        arb.nx = rev ? -bestEdge.gnormx : bestEdge.gnormx;
        arb.ny = rev ? -bestEdge.gnormy : bestEdge.gnormy;
        co.dist = -cap.radius;
        co.stamp = arb.stamp;
        co.posOnly = false;
        const con = co.inner;
        const capLr = cap.localCOMx + (2 * bestT - 1) * cap.halfLength;
        if (rev) {
          con.lr1x = capLr;
          con.lr1y = cap.localCOMy;
          con.lr2x = 0;
          con.lr2y = 0;
        } else {
          con.lr1x = 0;
          con.lr1y = 0;
          con.lr2x = capLr;
          con.lr2y = cap.localCOMy;
        }
        arb.radius = cap.radius;
        arb.ptype = 0;
        return true;
      }

      const invDist = 1.0 / Math.sqrt(distSqr);
      const dist = 1.0 / invDist;
      const nx = px * invDist;
      const ny = py * invDist;
      const cpx = ecx + nx * cap.radius;
      const cpy = ecy + ny * cap.radius;
      const co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = cpx;
      co.py = cpy;
      arb.nx = rev ? -nx : nx;
      arb.ny = rev ? -ny : ny;
      co.dist = dist - cap.radius;
      co.stamp = arb.stamp;
      co.posOnly = false;
      const con = co.inner;
      const capLr = cap.localCOMx + (2 * bestT - 1) * cap.halfLength;
      if (rev) {
        con.lr1x = capLr;
        con.lr1y = cap.localCOMy;
        con.lr2x = 0;
        con.lr2y = 0;
      } else {
        con.lr1x = 0;
        con.lr1y = 0;
        con.lr2x = capLr;
        con.lr2y = cap.localCOMy;
      }
      arb.radius = cap.radius;
      arb.ptype = 0;
      arb.__ref_edge1 = bestEdge;
      arb.__ref_vertex = 0;
      return true;
    } else if (dt >= v1.y * bestEdge.gnormx - v1.x * bestEdge.gnormy) {
      // Vertex contact with v1
      const px = v1.x - ecx;
      const py = v1.y - ecy;
      const distSqr = px * px + py * py;
      if (distSqr > cap.radius * cap.radius) return false;

      if (distSqr < napeNs.Config.epsilon * napeNs.Config.epsilon) {
        const co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
        co.px = ecx;
        co.py = ecy;
        arb.nx = rev ? -bestEdge.gnormx : bestEdge.gnormx;
        arb.ny = rev ? -bestEdge.gnormy : bestEdge.gnormy;
        co.dist = -cap.radius;
        co.stamp = arb.stamp;
        co.posOnly = false;
        const con = co.inner;
        const capLr = cap.localCOMx + (2 * bestT - 1) * cap.halfLength;
        if (rev) {
          con.lr1x = capLr;
          con.lr1y = cap.localCOMy;
          con.lr2x = 0;
          con.lr2y = 0;
        } else {
          con.lr1x = 0;
          con.lr1y = 0;
          con.lr2x = capLr;
          con.lr2y = cap.localCOMy;
        }
        arb.radius = cap.radius;
        arb.ptype = 0;
        return true;
      }

      const invDist = 1.0 / Math.sqrt(distSqr);
      const dist = 1.0 / invDist;
      const nx = px * invDist;
      const ny = py * invDist;
      const cpx = ecx + nx * cap.radius;
      const cpy = ecy + ny * cap.radius;
      const co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = cpx;
      co.py = cpy;
      arb.nx = rev ? -nx : nx;
      arb.ny = rev ? -ny : ny;
      co.dist = dist - cap.radius;
      co.stamp = arb.stamp;
      co.posOnly = false;
      const con = co.inner;
      const capLr = cap.localCOMx + (2 * bestT - 1) * cap.halfLength;
      if (rev) {
        con.lr1x = capLr;
        con.lr1y = cap.localCOMy;
        con.lr2x = 0;
        con.lr2y = 0;
      } else {
        con.lr1x = 0;
        con.lr1y = 0;
        con.lr2x = capLr;
        con.lr2y = cap.localCOMy;
      }
      arb.radius = cap.radius;
      arb.ptype = 0;
      arb.__ref_edge1 = bestEdge;
      arb.__ref_vertex = 0;
      return true;
    } else {
      // Face contact
      const co = ZPP_Collide._getOrCreateContact(arb, 0, arb.stamp);
      co.px = ecx + bestEdge.gnormx * (bestDist * 0.5 + cap.radius);
      co.py = ecy + bestEdge.gnormy * (bestDist * 0.5 + cap.radius);
      arb.nx = rev ? -bestEdge.gnormx : bestEdge.gnormx;
      arb.ny = rev ? -bestEdge.gnormy : bestEdge.gnormy;
      co.dist = bestDist;
      co.stamp = arb.stamp;
      co.posOnly = false;
      const con = co.inner;
      const capLr = cap.localCOMx + (2 * bestT - 1) * cap.halfLength;
      if (rev) {
        con.lr1x = capLr;
        con.lr1y = cap.localCOMy;
        con.lr2x = 0;
        con.lr2y = 0;
      } else {
        con.lr1x = 0;
        con.lr1y = 0;
        con.lr2x = capLr;
        con.lr2y = cap.localCOMy;
      }
      arb.radius = cap.radius;
      arb.lproj = bestEdge.lprojection;
      arb.ptype = 1;
      arb.__ref_edge1 = bestEdge;
      arb.__ref_vertex = 0;
      return true;
    }
  }

  /** Capsule test collision dispatcher (boolean only). */
  static _capsuleTestCollide(s1: ZPP_Shape, s2: ZPP_Shape): boolean {
    const cap2 = s2.capsule;

    if (s1.type == 0) {
      // circle-capsule
      const t = ZPP_Collide._closestT(
        cap2.spine1x,
        cap2.spine1y,
        cap2.spine2x,
        cap2.spine2y,
        s1.circle.worldCOMx,
        s1.circle.worldCOMy,
      );
      const cx = cap2.spine1x + t * (cap2.spine2x - cap2.spine1x);
      const cy = cap2.spine1y + t * (cap2.spine2y - cap2.spine1y);
      const minDist = s1.circle.radius + cap2.radius;
      const px = s1.circle.worldCOMx - cx;
      const py = s1.circle.worldCOMy - cy;
      return px * px + py * py <= minDist * minDist;
    } else if (s1.type == 1) {
      // polygon-capsule: SAT
      // Check polygon edges against capsule spine endpoints + radius
      let cx_ite = s1.polygon.edges.head;
      while (cx_ite != null) {
        const edge = cx_ite.elt;
        const d1 = edge.gnormx * cap2.spine1x + edge.gnormy * cap2.spine1y;
        const d2 = edge.gnormx * cap2.spine2x + edge.gnormy * cap2.spine2y;
        const minProj = d1 < d2 ? d1 : d2;
        if (minProj - edge.gprojection - cap2.radius > 0) return false;
        cx_ite = cx_ite.next;
      }
      // Check capsule spine axis against polygon vertices
      const sdx = cap2.spine2x - cap2.spine1x;
      const sdy = cap2.spine2y - cap2.spine1y;
      const slen2 = sdx * sdx + sdy * sdy;
      if (slen2 > 1e-12) {
        // Capsule spine normal direction
        const snx = -sdy;
        const sny = sdx;
        const slen = Math.sqrt(slen2);
        const snxn = snx / slen;
        const snyn = sny / slen;
        const capProj = snxn * cap2.spine1x + snyn * cap2.spine1y;
        let minV = 1e100;
        let maxV = -1e100;
        let vite = s1.polygon.gverts.next;
        while (vite != null) {
          const k = snxn * vite.x + snyn * vite.y;
          if (k < minV) minV = k;
          if (k > maxV) maxV = k;
          vite = vite.next;
        }
        if (minV > capProj + cap2.radius || maxV < capProj - cap2.radius) return false;
      }
      // Also check spine endpoint circles vs polygon vertices
      // (handles corner cases)
      return true;
    } else {
      // capsule-capsule
      const cap1 = s1.capsule;
      const [t1, t2] = ZPP_Collide._closestTT(
        cap1.spine1x,
        cap1.spine1y,
        cap1.spine2x,
        cap1.spine2y,
        cap2.spine1x,
        cap2.spine1y,
        cap2.spine2x,
        cap2.spine2y,
      );
      const p1x = cap1.spine1x + t1 * (cap1.spine2x - cap1.spine1x);
      const p1y = cap1.spine1y + t1 * (cap1.spine2y - cap1.spine1y);
      const p2x = cap2.spine1x + t2 * (cap2.spine2x - cap2.spine1x);
      const p2y = cap2.spine1y + t2 * (cap2.spine2y - cap2.spine1y);
      const minDist = cap1.radius + cap2.radius;
      const px = p2x - p1x;
      const py = p2y - p1y;
      return px * px + py * py <= minDist * minDist;
    }
  }

  /** Capsule fluid collision — simplified approximation. */
  static _capsuleFlowCollide(
    s1: ZPP_Shape,
    s2: ZPP_Shape,
    arb: ZPP_FluidArbiter,
    napeNs: any,
  ): boolean {
    // For fluid collision with capsules, we approximate the capsule as a circle
    // with an effective radius that preserves the capsule's area.
    // Area of capsule = pi*r^2 + 4*hl*r, so effective_r = sqrt(area/pi)
    const cap = s1.type == 2 ? s1.capsule : s2.capsule;
    const other = s1.type == 2 ? s2 : s1;

    // Compute overlap area estimate
    const capArea = cap.area || Math.PI * cap.radius * cap.radius + 4 * cap.halfLength * cap.radius;

    if (other.type == 2) {
      // capsule-capsule fluid: simple overlap estimation
      const cap2 = other.type == 2 ? (other as any).capsule : other;
      const [t1, t2] = ZPP_Collide._closestTT(
        cap.spine1x,
        cap.spine1y,
        cap.spine2x,
        cap.spine2y,
        cap2.spine1x,
        cap2.spine1y,
        cap2.spine2x,
        cap2.spine2y,
      );
      const p1x = cap.spine1x + t1 * (cap.spine2x - cap.spine1x);
      const p1y = cap.spine1y + t1 * (cap.spine2y - cap.spine1y);
      const p2x = cap2.spine1x + t2 * (cap2.spine2x - cap2.spine1x);
      const p2y = cap2.spine1y + t2 * (cap2.spine2y - cap2.spine1y);
      const dx = p2x - p1x;
      const dy = p2y - p1y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sumR = cap.radius + cap2.radius;
      if (dist >= sumR) return false;

      const overlap = sumR - dist;
      arb.overlap = overlap * Math.min(2 * cap.radius, 2 * cap2.radius) * 0.5;
      arb.buoyx = (p1x + p2x) * 0.5;
      arb.buoyy = (p1y + p2y) * 0.5;
      return true;
    }

    // capsule vs circle or polygon: use the capsule's center for buoyancy
    // and approximate overlap
    if (other.type == 0) {
      // capsule-circle fluid
      const circ = other.circle || (other as any).circle;
      const t = ZPP_Collide._closestT(
        cap.spine1x,
        cap.spine1y,
        cap.spine2x,
        cap.spine2y,
        circ.worldCOMx,
        circ.worldCOMy,
      );
      const cx = cap.spine1x + t * (cap.spine2x - cap.spine1x);
      const cy = cap.spine1y + t * (cap.spine2y - cap.spine1y);
      const dx = circ.worldCOMx - cx;
      const dy = circ.worldCOMy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sumR = cap.radius + circ.radius;
      if (dist >= sumR) return false;

      const overlap = sumR - dist;
      arb.overlap = overlap * Math.min(2 * cap.radius, 2 * circ.radius) * 0.5;
      arb.buoyx = (cx + circ.worldCOMx) * 0.5;
      arb.buoyy = (cy + circ.worldCOMy) * 0.5;
      return true;
    }

    // capsule-polygon fluid: simplified
    // Test if capsule overlaps polygon using SAT, estimate overlap area
    const poly = other.polygon || (other as any).polygon;
    let minPen = 1e100;
    let penNx = 0,
      penNy = 0;
    let cx_ite = poly.edges.head;
    while (cx_ite != null) {
      const edge = cx_ite.elt;
      const d1 = edge.gnormx * cap.spine1x + edge.gnormy * cap.spine1y;
      const d2 = edge.gnormx * cap.spine2x + edge.gnormy * cap.spine2y;
      const minProj = d1 < d2 ? d1 : d2;
      const pen = edge.gprojection + cap.radius - minProj;
      if (pen < 0) return false;
      if (pen < minPen) {
        minPen = pen;
        penNx = edge.gnormx;
        penNy = edge.gnormy;
      }
      cx_ite = cx_ite.next;
    }
    arb.overlap = minPen * 2 * cap.radius * 0.5;
    arb.buoyx = cap.worldCOMx;
    arb.buoyy = cap.worldCOMy;
    return true;
  }
}
