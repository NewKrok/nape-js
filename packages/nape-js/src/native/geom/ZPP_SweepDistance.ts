/**
 * ZPP_SweepDistance — Internal continuous collision detection and distance computation
 * for the nape physics engine.
 *
 * Implements time-of-impact (TOI) sweep algorithms and shape distance calculations
 * for circle-circle, polygon-circle, and polygon-polygon pairs.
 *
 * Converted from nape-compiled.js lines 28290–31606.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_ToiEvent } from "./ZPP_ToiEvent";
import { ZPP_Body } from "../phys/ZPP_Body";
import { ZPP_Shape } from "../shape/ZPP_Shape";
import { getNape } from "../../core/engine";

/** Check if shape is circle for CCD. */
function _isCircleLike(s: any): boolean {
  return s.type === 0;
}

/** Get effective CCD bounding radius from worldCOM for circle. */
function _ccdRadius(s: any): number {
  return s.circle.radius;
}

export class ZPP_SweepDistance {
  static dynamicSweep(
    toi: ZPP_ToiEvent,
    timeStep: number,
    lowerBound: number,
    negRadius: number,
    userAPI: boolean,
  ) {
    const napeNs = getNape();
    if (userAPI == null) {
      userAPI = false;
    }
    const s1 = toi.s1!;
    const s2 = toi.s2!;
    const b1 = s1.body;
    const b2 = s2.body;
    let deltax = 0.0;
    let deltay = 0.0;
    deltax = b2.velx - b1.velx;
    deltay = b2.vely - b1.vely;
    let ang1 = b1.angvel;
    if (ang1 < 0) {
      ang1 = -ang1;
    }
    let ang2 = b2.angvel;
    if (ang2 < 0) {
      ang2 = -ang2;
    }
    const angBias = s1.sweepCoef * ang1 + s2.sweepCoef * ang2;
    if (
      !userAPI &&
      !toi.kinematic &&
      deltax * deltax + deltay * deltay <
        napeNs.Config.dynamicSweepLinearThreshold * napeNs.Config.dynamicSweepLinearThreshold &&
      angBias < napeNs.Config.dynamicSweepAngularThreshold
    ) {
      toi.toi = -1;
      toi.failed = true;
      return;
    }
    const c1 = toi.c1;
    const c2 = toi.c2;
    const axis = toi.axis;
    let curTOI = lowerBound;
    let curIter = 0;
    while (true) {
      const dt = curTOI * timeStep;
      const delta = dt - b1.sweepTime;
      if (delta != 0) {
        b1.sweepTime = dt;
        const t = delta;
        b1.posx += b1.velx * t;
        b1.posy += b1.vely * t;
        if (b1.angvel != 0) {
          const dr = b1.sweep_angvel * delta;
          b1.rot += dr;
          if (dr * dr > 0.0001) {
            b1.axisx = Math.sin(b1.rot);
            b1.axisy = Math.cos(b1.rot);
          } else {
            const d2 = dr * dr;
            const p = 1 - 0.5 * d2;
            const m = 1 - (d2 * d2) / 8;
            const nx = (p * b1.axisx + dr * b1.axisy) * m;
            b1.axisy = (p * b1.axisy - dr * b1.axisx) * m;
            b1.axisx = nx;
          }
        }
      }
      if (s1.type == 0) {
        s1.worldCOMx = b1.posx + (b1.axisy * s1.localCOMx - b1.axisx * s1.localCOMy);
        s1.worldCOMy = b1.posy + (s1.localCOMx * b1.axisx + s1.localCOMy * b1.axisy);
      } else {
        const p1 = s1.polygon;
        let li = p1.lverts.next;
        let cx_ite = p1.gverts.next;
        while (cx_ite != null) {
          const g = cx_ite;
          const l = li;
          li = li.next;
          g.x = b1.posx + (b1.axisy * l.x - b1.axisx * l.y);
          g.y = b1.posy + (l.x * b1.axisx + l.y * b1.axisy);
          cx_ite = cx_ite.next;
        }
        let ite = p1.edges.head;
        let cx_ite1 = p1.gverts.next;
        let u = cx_ite1;
        cx_ite1 = cx_ite1.next;
        while (cx_ite1 != null) {
          const v = cx_ite1;
          const e = ite.elt;
          ite = ite.next;
          e.gnormx = b1.axisy * e.lnormx - b1.axisx * e.lnormy;
          e.gnormy = e.lnormx * b1.axisx + e.lnormy * b1.axisy;
          e.gprojection = b1.posx * e.gnormx + b1.posy * e.gnormy + e.lprojection;
          e.tp0 = u.y * e.gnormx - u.x * e.gnormy;
          e.tp1 = v.y * e.gnormx - v.x * e.gnormy;
          u = v;
          cx_ite1 = cx_ite1.next;
        }
        const v1 = p1.gverts.next;
        const e1 = ite.elt;
        ite = ite.next;
        e1.gnormx = b1.axisy * e1.lnormx - b1.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * b1.axisx + e1.lnormy * b1.axisy;
        e1.gprojection = b1.posx * e1.gnormx + b1.posy * e1.gnormy + e1.lprojection;
        e1.tp0 = u.y * e1.gnormx - u.x * e1.gnormy;
        e1.tp1 = v1.y * e1.gnormx - v1.x * e1.gnormy;
      }
      const dt1 = curTOI * timeStep;
      const delta1 = dt1 - b2.sweepTime;
      if (delta1 != 0) {
        b2.sweepTime = dt1;
        const t1 = delta1;
        b2.posx += b2.velx * t1;
        b2.posy += b2.vely * t1;
        if (b2.angvel != 0) {
          const dr1 = b2.sweep_angvel * delta1;
          b2.rot += dr1;
          if (dr1 * dr1 > 0.0001) {
            b2.axisx = Math.sin(b2.rot);
            b2.axisy = Math.cos(b2.rot);
          } else {
            const d21 = dr1 * dr1;
            const p2 = 1 - 0.5 * d21;
            const m1 = 1 - (d21 * d21) / 8;
            const nx1 = (p2 * b2.axisx + dr1 * b2.axisy) * m1;
            b2.axisy = (p2 * b2.axisy - dr1 * b2.axisx) * m1;
            b2.axisx = nx1;
          }
        }
      }
      if (s2.type == 0) {
        s2.worldCOMx = b2.posx + (b2.axisy * s2.localCOMx - b2.axisx * s2.localCOMy);
        s2.worldCOMy = b2.posy + (s2.localCOMx * b2.axisx + s2.localCOMy * b2.axisy);
      } else {
        const p3 = s2.polygon;
        let li1 = p3.lverts.next;
        let cx_ite2 = p3.gverts.next;
        while (cx_ite2 != null) {
          const g1 = cx_ite2;
          const l1 = li1;
          li1 = li1.next;
          g1.x = b2.posx + (b2.axisy * l1.x - b2.axisx * l1.y);
          g1.y = b2.posy + (l1.x * b2.axisx + l1.y * b2.axisy);
          cx_ite2 = cx_ite2.next;
        }
        let ite1 = p3.edges.head;
        let cx_ite3 = p3.gverts.next;
        let u1 = cx_ite3;
        cx_ite3 = cx_ite3.next;
        while (cx_ite3 != null) {
          const v2 = cx_ite3;
          const e2 = ite1.elt;
          ite1 = ite1.next;
          e2.gnormx = b2.axisy * e2.lnormx - b2.axisx * e2.lnormy;
          e2.gnormy = e2.lnormx * b2.axisx + e2.lnormy * b2.axisy;
          e2.gprojection = b2.posx * e2.gnormx + b2.posy * e2.gnormy + e2.lprojection;
          e2.tp0 = u1.y * e2.gnormx - u1.x * e2.gnormy;
          e2.tp1 = v2.y * e2.gnormx - v2.x * e2.gnormy;
          u1 = v2;
          cx_ite3 = cx_ite3.next;
        }
        const v3 = p3.gverts.next;
        const e3 = ite1.elt;
        ite1 = ite1.next;
        e3.gnormx = b2.axisy * e3.lnormx - b2.axisx * e3.lnormy;
        e3.gnormy = e3.lnormx * b2.axisx + e3.lnormy * b2.axisy;
        e3.gprojection = b2.posx * e3.gnormx + b2.posy * e3.gnormy + e3.lprojection;
        e3.tp0 = u1.y * e3.gnormx - u1.x * e3.gnormy;
        e3.tp1 = v3.y * e3.gnormx - v3.x * e3.gnormy;
      }
      const sep = ZPP_SweepDistance.distance(s1, s2, c1, c2, axis, null);
      const sep1 = sep + negRadius;
      const dot = deltax * axis.x + deltay * axis.y;
      if (sep1 < napeNs.Config.distanceThresholdCCD) {
        if (userAPI) {
          break;
        }
        let d1x = 0.0;
        let d1y = 0.0;
        d1x = c1.x - b1.posx;
        d1y = c1.y - b1.posy;
        let d2x = 0.0;
        let d2y = 0.0;
        d2x = c2.x - b2.posx;
        d2y = c2.y - b2.posy;
        const proj =
          dot -
          b1.sweep_angvel * (axis.y * d1x - axis.x * d1y) +
          b2.sweep_angvel * (axis.y * d2x - axis.x * d2y);
        if (proj > 0) {
          toi.slipped = true;
        }
        if (proj <= 0 || sep1 < napeNs.Config.distanceThresholdCCD * 0.5) {
          break;
        }
      }
      const denom = (angBias - dot) * timeStep;
      if (denom <= 0) {
        curTOI = -1;
        break;
      }
      let delta2 = sep1 / denom;
      if (delta2 < 1e-6) {
        delta2 = 1e-6;
      }
      curTOI += delta2;
      if (curTOI >= 1) {
        curTOI = 1;
        const dt3 = curTOI * timeStep;
        const delta3 = dt3 - b1.sweepTime;
        if (delta3 != 0) {
          b1.sweepTime = dt3;
          const t26 = delta3;
          b1.posx += b1.velx * t26;
          b1.posy += b1.vely * t26;
          if (b1.angvel != 0) {
            const dr2 = b1.sweep_angvel * delta3;
            b1.rot += dr2;
            if (dr2 * dr2 > 0.0001) {
              b1.axisx = Math.sin(b1.rot);
              b1.axisy = Math.cos(b1.rot);
            } else {
              const d23 = dr2 * dr2;
              const p4 = 1 - 0.5 * d23;
              const m2 = 1 - (d23 * d23) / 8;
              const nx5 = (p4 * b1.axisx + dr2 * b1.axisy) * m2;
              b1.axisy = (p4 * b1.axisy - dr2 * b1.axisx) * m2;
              b1.axisx = nx5;
            }
          }
        }
        if (s1.type == 0) {
          s1.worldCOMx = b1.posx + (b1.axisy * s1.localCOMx - b1.axisx * s1.localCOMy);
          s1.worldCOMy = b1.posy + (s1.localCOMx * b1.axisx + s1.localCOMy * b1.axisy);
        } else {
          const p5 = s1.polygon;
          let li2 = p5.lverts.next;
          let cx_ite10 = p5.gverts.next;
          while (cx_ite10 != null) {
            const g2 = cx_ite10;
            const l2 = li2;
            li2 = li2.next;
            g2.x = b1.posx + (b1.axisy * l2.x - b1.axisx * l2.y);
            g2.y = b1.posy + (l2.x * b1.axisx + l2.y * b1.axisy);
            cx_ite10 = cx_ite10.next;
          }
          let ite2 = p5.edges.head;
          let cx_ite11 = p5.gverts.next;
          let u2 = cx_ite11;
          cx_ite11 = cx_ite11.next;
          while (cx_ite11 != null) {
            const v6 = cx_ite11;
            const e4 = ite2.elt;
            ite2 = ite2.next;
            e4.gnormx = b1.axisy * e4.lnormx - b1.axisx * e4.lnormy;
            e4.gnormy = e4.lnormx * b1.axisx + e4.lnormy * b1.axisy;
            e4.gprojection = b1.posx * e4.gnormx + b1.posy * e4.gnormy + e4.lprojection;
            e4.tp0 = u2.y * e4.gnormx - u2.x * e4.gnormy;
            e4.tp1 = v6.y * e4.gnormx - v6.x * e4.gnormy;
            u2 = v6;
            cx_ite11 = cx_ite11.next;
          }
          const v7 = p5.gverts.next;
          const e5 = ite2.elt;
          ite2 = ite2.next;
          e5.gnormx = b1.axisy * e5.lnormx - b1.axisx * e5.lnormy;
          e5.gnormy = e5.lnormx * b1.axisx + e5.lnormy * b1.axisy;
          e5.gprojection = b1.posx * e5.gnormx + b1.posy * e5.gnormy + e5.lprojection;
          e5.tp0 = u2.y * e5.gnormx - u2.x * e5.gnormy;
          e5.tp1 = v7.y * e5.gnormx - v7.x * e5.gnormy;
        }
        const dt4 = curTOI * timeStep;
        const delta4 = dt4 - b2.sweepTime;
        if (delta4 != 0) {
          b2.sweepTime = dt4;
          const t27 = delta4;
          b2.posx += b2.velx * t27;
          b2.posy += b2.vely * t27;
          if (b2.angvel != 0) {
            const dr3 = b2.sweep_angvel * delta4;
            b2.rot += dr3;
            if (dr3 * dr3 > 0.0001) {
              b2.axisx = Math.sin(b2.rot);
              b2.axisy = Math.cos(b2.rot);
            } else {
              const d24 = dr3 * dr3;
              const p6 = 1 - 0.5 * d24;
              const m3 = 1 - (d24 * d24) / 8;
              const nx6 = (p6 * b2.axisx + dr3 * b2.axisy) * m3;
              b2.axisy = (p6 * b2.axisy - dr3 * b2.axisx) * m3;
              b2.axisx = nx6;
            }
          }
        }
        if (s2.type == 0) {
          s2.worldCOMx = b2.posx + (b2.axisy * s2.localCOMx - b2.axisx * s2.localCOMy);
          s2.worldCOMy = b2.posy + (s2.localCOMx * b2.axisx + s2.localCOMy * b2.axisy);
        } else {
          const p7 = s2.polygon;
          let li3 = p7.lverts.next;
          let cx_ite12 = p7.gverts.next;
          while (cx_ite12 != null) {
            const g3 = cx_ite12;
            const l3 = li3;
            li3 = li3.next;
            g3.x = b2.posx + (b2.axisy * l3.x - b2.axisx * l3.y);
            g3.y = b2.posy + (l3.x * b2.axisx + l3.y * b2.axisy);
            cx_ite12 = cx_ite12.next;
          }
          let ite3 = p7.edges.head;
          let cx_ite13 = p7.gverts.next;
          let u3 = cx_ite13;
          cx_ite13 = cx_ite13.next;
          while (cx_ite13 != null) {
            const v8 = cx_ite13;
            const e6 = ite3.elt;
            ite3 = ite3.next;
            e6.gnormx = b2.axisy * e6.lnormx - b2.axisx * e6.lnormy;
            e6.gnormy = e6.lnormx * b2.axisx + e6.lnormy * b2.axisy;
            e6.gprojection = b2.posx * e6.gnormx + b2.posy * e6.gnormy + e6.lprojection;
            e6.tp0 = u3.y * e6.gnormx - u3.x * e6.gnormy;
            e6.tp1 = v8.y * e6.gnormx - v8.x * e6.gnormy;
            u3 = v8;
            cx_ite13 = cx_ite13.next;
          }
          const v9 = p7.gverts.next;
          const e7 = ite3.elt;
          ite3 = ite3.next;
          e7.gnormx = b2.axisy * e7.lnormx - b2.axisx * e7.lnormy;
          e7.gnormy = e7.lnormx * b2.axisx + e7.lnormy * b2.axisy;
          e7.gprojection = b2.posx * e7.gnormx + b2.posy * e7.gnormy + e7.lprojection;
          e7.tp0 = u3.y * e7.gnormx - u3.x * e7.gnormy;
          e7.tp1 = v9.y * e7.gnormx - v9.x * e7.gnormy;
        }
        const sep2 = ZPP_SweepDistance.distance(s1, s2, c1, c2, axis, null);
        const sep3 = sep2 + negRadius;
        const dot1 = deltax * axis.x + deltay * axis.y;
        if (sep3 < napeNs.Config.distanceThresholdCCD) {
          if (userAPI) {
            break;
          }
          let d1x1 = 0.0;
          let d1y1 = 0.0;
          d1x1 = c1.x - b1.posx;
          d1y1 = c1.y - b1.posy;
          let d2x1 = 0.0;
          let d2y1 = 0.0;
          d2x1 = c2.x - b2.posx;
          d2y1 = c2.y - b2.posy;
          const proj1 =
            dot1 -
            b1.sweep_angvel * (axis.y * d1x1 - axis.x * d1y1) +
            b2.sweep_angvel * (axis.y * d2x1 - axis.x * d2y1);
          if (proj1 > 0) {
            toi.slipped = true;
          }
          if (proj1 <= 0 || sep3 < napeNs.Config.distanceThresholdCCD * 0.5) {
            break;
          }
        }
        curTOI = -1;
        break;
      }
      if (++curIter >= 40) {
        if (sep1 > negRadius) {
          toi.failed = true;
        }
        break;
      }
    }
    toi.toi = curTOI;
  }
  static staticSweep(toi: ZPP_ToiEvent, timeStep: number, lowerBound: number, negRadius: number) {
    const napeNs = getNape();
    const s1 = toi.s1!;
    const s2 = toi.s2!;
    const b1 = s1.body;
    const b2 = s2.body;
    let deltax = 0.0;
    let deltay = 0.0;
    deltax = -b1.velx;
    deltay = -b1.vely;
    let ang1 = b1.sweep_angvel;
    if (ang1 < 0) {
      ang1 = -ang1;
    }
    const angBias = s1.sweepCoef * ang1;
    const c1 = toi.c1;
    const c2 = toi.c2;
    const axis = toi.axis;
    let curTOI = lowerBound;
    let curIter = 0;
    while (true) {
      const dt = curTOI * timeStep;
      const delta = dt - b1.sweepTime;
      if (delta != 0) {
        b1.sweepTime = dt;
        const t = delta;
        b1.posx += b1.velx * t;
        b1.posy += b1.vely * t;
        if (b1.angvel != 0) {
          const dr = b1.sweep_angvel * delta;
          b1.rot += dr;
          if (dr * dr > 0.0001) {
            b1.axisx = Math.sin(b1.rot);
            b1.axisy = Math.cos(b1.rot);
          } else {
            const d2 = dr * dr;
            const p = 1 - 0.5 * d2;
            const m = 1 - (d2 * d2) / 8;
            const nx = (p * b1.axisx + dr * b1.axisy) * m;
            b1.axisy = (p * b1.axisy - dr * b1.axisx) * m;
            b1.axisx = nx;
          }
        }
      }
      if (s1.type == 0) {
        s1.worldCOMx = b1.posx + (b1.axisy * s1.localCOMx - b1.axisx * s1.localCOMy);
        s1.worldCOMy = b1.posy + (s1.localCOMx * b1.axisx + s1.localCOMy * b1.axisy);
      } else {
        const p1 = s1.polygon;
        let li = p1.lverts.next;
        let cx_ite = p1.gverts.next;
        while (cx_ite != null) {
          const g = cx_ite;
          const l = li;
          li = li.next;
          g.x = b1.posx + (b1.axisy * l.x - b1.axisx * l.y);
          g.y = b1.posy + (l.x * b1.axisx + l.y * b1.axisy);
          cx_ite = cx_ite.next;
        }
        let ite = p1.edges.head;
        let cx_ite1 = p1.gverts.next;
        let u = cx_ite1;
        cx_ite1 = cx_ite1.next;
        while (cx_ite1 != null) {
          const v = cx_ite1;
          const e = ite.elt;
          ite = ite.next;
          e.gnormx = b1.axisy * e.lnormx - b1.axisx * e.lnormy;
          e.gnormy = e.lnormx * b1.axisx + e.lnormy * b1.axisy;
          e.gprojection = b1.posx * e.gnormx + b1.posy * e.gnormy + e.lprojection;
          e.tp0 = u.y * e.gnormx - u.x * e.gnormy;
          e.tp1 = v.y * e.gnormx - v.x * e.gnormy;
          u = v;
          cx_ite1 = cx_ite1.next;
        }
        const v1 = p1.gverts.next;
        const e1 = ite.elt;
        ite = ite.next;
        e1.gnormx = b1.axisy * e1.lnormx - b1.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * b1.axisx + e1.lnormy * b1.axisy;
        e1.gprojection = b1.posx * e1.gnormx + b1.posy * e1.gnormy + e1.lprojection;
        e1.tp0 = u.y * e1.gnormx - u.x * e1.gnormy;
        e1.tp1 = v1.y * e1.gnormx - v1.x * e1.gnormy;
      }
      const sep = ZPP_SweepDistance.distance(s1, s2, c1, c2, axis, null);
      const sep1 = sep + negRadius;
      const dot = deltax * axis.x + deltay * axis.y;
      if (sep1 < napeNs.Config.distanceThresholdCCD) {
        let d1x = 0.0;
        let d1y = 0.0;
        d1x = c1.x - b1.posx;
        d1y = c1.y - b1.posy;
        const proj = dot - b1.sweep_angvel * (axis.y * d1x - axis.x * d1y);
        if (proj > 0) {
          toi.slipped = true;
        }
        if (proj <= 0 || sep1 < napeNs.Config.distanceThresholdCCD * 0.5) {
          break;
        }
      }
      const denom = (angBias - dot) * timeStep;
      if (denom <= 0) {
        curTOI = -1;
        break;
      }
      let delta1 = sep1 / denom;
      if (delta1 < 1e-6) {
        delta1 = 1e-6;
      }
      curTOI += delta1;
      if (curTOI >= 1) {
        curTOI = 1;
        const dt2 = curTOI * timeStep;
        const delta2 = dt2 - b1.sweepTime;
        if (delta2 != 0) {
          b1.sweepTime = dt2;
          const t25 = delta2;
          b1.posx += b1.velx * t25;
          b1.posy += b1.vely * t25;
          if (b1.angvel != 0) {
            const dr1 = b1.sweep_angvel * delta2;
            b1.rot += dr1;
            if (dr1 * dr1 > 0.0001) {
              b1.axisx = Math.sin(b1.rot);
              b1.axisy = Math.cos(b1.rot);
            } else {
              const d22 = dr1 * dr1;
              const p3 = 1 - 0.5 * d22;
              const m1 = 1 - (d22 * d22) / 8;
              const nx4 = (p3 * b1.axisx + dr1 * b1.axisy) * m1;
              b1.axisy = (p3 * b1.axisy - dr1 * b1.axisx) * m1;
              b1.axisx = nx4;
            }
          }
        }
        if (s1.type == 0) {
          s1.worldCOMx = b1.posx + (b1.axisy * s1.localCOMx - b1.axisx * s1.localCOMy);
          s1.worldCOMy = b1.posy + (s1.localCOMx * b1.axisx + s1.localCOMy * b1.axisy);
        } else {
          const p4 = s1.polygon;
          let li1 = p4.lverts.next;
          let cx_ite8 = p4.gverts.next;
          while (cx_ite8 != null) {
            const g1 = cx_ite8;
            const l1 = li1;
            li1 = li1.next;
            g1.x = b1.posx + (b1.axisy * l1.x - b1.axisx * l1.y);
            g1.y = b1.posy + (l1.x * b1.axisx + l1.y * b1.axisy);
            cx_ite8 = cx_ite8.next;
          }
          let ite1 = p4.edges.head;
          let cx_ite9 = p4.gverts.next;
          let u1 = cx_ite9;
          cx_ite9 = cx_ite9.next;
          while (cx_ite9 != null) {
            const v4 = cx_ite9;
            const e3 = ite1.elt;
            ite1 = ite1.next;
            e3.gnormx = b1.axisy * e3.lnormx - b1.axisx * e3.lnormy;
            e3.gnormy = e3.lnormx * b1.axisx + e3.lnormy * b1.axisy;
            e3.gprojection = b1.posx * e3.gnormx + b1.posy * e3.gnormy + e3.lprojection;
            e3.tp0 = u1.y * e3.gnormx - u1.x * e3.gnormy;
            e3.tp1 = v4.y * e3.gnormx - v4.x * e3.gnormy;
            u1 = v4;
            cx_ite9 = cx_ite9.next;
          }
          const v5 = p4.gverts.next;
          const e4 = ite1.elt;
          ite1 = ite1.next;
          e4.gnormx = b1.axisy * e4.lnormx - b1.axisx * e4.lnormy;
          e4.gnormy = e4.lnormx * b1.axisx + e4.lnormy * b1.axisy;
          e4.gprojection = b1.posx * e4.gnormx + b1.posy * e4.gnormy + e4.lprojection;
          e4.tp0 = u1.y * e4.gnormx - u1.x * e4.gnormy;
          e4.tp1 = v5.y * e4.gnormx - v5.x * e4.gnormy;
        }
        const sep2 = ZPP_SweepDistance.distance(s1, s2, c1, c2, axis, null);
        const sep3 = sep2 + negRadius;
        const dot1 = deltax * axis.x + deltay * axis.y;
        if (sep3 < napeNs.Config.distanceThresholdCCD) {
          let d1x1 = 0.0;
          let d1y1 = 0.0;
          d1x1 = c1.x - b1.posx;
          d1y1 = c1.y - b1.posy;
          const proj1 = dot1 - b1.sweep_angvel * (axis.y * d1x1 - axis.x * d1y1);
          if (proj1 > 0) {
            toi.slipped = true;
          }
          if (proj1 <= 0 || sep3 < napeNs.Config.distanceThresholdCCD * 0.5) {
            break;
          }
        }
        curTOI = -1;
        break;
      }
      if (++curIter >= 40) {
        if (sep1 > negRadius) {
          toi.failed = true;
        }
        break;
      }
    }
    toi.toi = curTOI;
  }
  static distanceBody(b1: ZPP_Body, b2: ZPP_Body, w1: ZPP_Vec2, w2: ZPP_Vec2) {
    const napeNs = getNape();
    const t1 = ZPP_Vec2.get(0, 0);
    const t2 = ZPP_Vec2.get(0, 0);
    const ax = ZPP_Vec2.get(0, 0);
    let min = 1e100;
    let cx_ite = b1.shapes.head;
    while (cx_ite != null) {
      const s1 = cx_ite.elt;
      let cx_ite1 = b2.shapes.head;
      while (cx_ite1 != null) {
        const s2 = cx_ite1.elt;
        const dist = ZPP_SweepDistance.distance(s1, s2, t1, t2, ax, min);
        if (dist < min) {
          min = dist;
          w1.x = t1.x;
          w1.y = t1.y;
          w2.x = t2.x;
          w2.y = t2.y;
        }
        cx_ite1 = cx_ite1.next;
      }
      cx_ite = cx_ite.next;
    }
    const o = t1;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o;
    const o1 = t2;
    if (o1.outer != null) {
      o1.outer.zpp_inner = null;
      o1.outer = null;
    }
    o1._isimmutable = null;
    o1._validate = null;
    o1._invalidate = null;
    o1.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o1;
    const o2 = ax;
    if (o2.outer != null) {
      o2.outer.zpp_inner = null;
      o2.outer = null;
    }
    o2._isimmutable = null;
    o2._validate = null;
    o2._invalidate = null;
    o2.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = o2;
    return min;
  }
  static distance(
    s1: ZPP_Shape,
    s2: ZPP_Shape,
    w1: ZPP_Vec2,
    w2: ZPP_Vec2,
    axis: ZPP_Vec2,
    upperBound: number | null,
  ) {
    const napeNs = getNape();
    if (upperBound == null) {
      upperBound = 1e100;
    }
    if (_isCircleLike(s1) && _isCircleLike(s2)) {
      const c1 = s1.circle;
      const c2 = s2.circle;
      const _rd1 = _ccdRadius(s1);
      const _rd2 = _ccdRadius(s2);
      let dist;
      let nx = 0.0;
      let ny = 0.0;
      nx = c2.worldCOMx - c1.worldCOMx;
      ny = c2.worldCOMy - c1.worldCOMy;
      const len = Math.sqrt(nx * nx + ny * ny);
      dist = len - (_rd1 + _rd2);
      if (dist < upperBound) {
        if (len == 0) {
          nx = 1;
          ny = 0;
        } else {
          const t = 1.0 / len;
          nx *= t;
          ny *= t;
        }
        const t1 = _rd1;
        w1.x = c1.worldCOMx + nx * t1;
        w1.y = c1.worldCOMy + ny * t1;
        const t2 = -_rd2;
        w2.x = c2.worldCOMx + nx * t2;
        w2.y = c2.worldCOMy + ny * t2;
        axis.x = nx;
        axis.y = ny;
      }
      return dist;
    } else {
      let swapped = false;
      if (_isCircleLike(s1) && s2.type == 1) {
        const tmp = s1;
        s1 = s2;
        s2 = tmp;
        const tmp2 = w1;
        w1 = w2;
        w2 = tmp2;
        swapped = true;
      }
      if (s1.type == 1 && _isCircleLike(s2)) {
        const poly = s1.polygon;
        const circle = s2.circle;
        const _circR = _ccdRadius(s2);
        let best = -1e100;
        let a0 = null;
        let cx_ite = poly.edges.head;
        while (cx_ite != null) {
          const a = cx_ite.elt;
          const dist1 =
            a.gnormx * circle.worldCOMx + a.gnormy * circle.worldCOMy - a.gprojection - _circR;
          if (dist1 > upperBound) {
            best = dist1;
            break;
          }
          if (dist1 > 0) {
            if (dist1 > best) {
              best = dist1;
              a0 = a;
            }
          } else if (best < 0 && dist1 > best) {
            best = dist1;
            a0 = a;
          }
          cx_ite = cx_ite.next;
        }
        if (best < upperBound) {
          const v0 = a0.gp0;
          const v1 = a0.gp1;
          const dt = circle.worldCOMy * a0.gnormx - circle.worldCOMx * a0.gnormy;
          if (dt <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
            let nx1 = 0.0;
            let ny1 = 0.0;
            nx1 = circle.worldCOMx - v0.x;
            ny1 = circle.worldCOMy - v0.y;
            const len1 = Math.sqrt(nx1 * nx1 + ny1 * ny1);
            best = len1 - _circR;
            if (best < upperBound) {
              if (len1 == 0) {
                nx1 = 1;
                ny1 = 0;
              } else {
                const t3 = 1.0 / len1;
                nx1 *= t3;
                ny1 *= t3;
              }
              const t4 = 0;
              w1.x = v0.x + nx1 * t4;
              w1.y = v0.y + ny1 * t4;
              const t5 = -_circR;
              w2.x = circle.worldCOMx + nx1 * t5;
              w2.y = circle.worldCOMy + ny1 * t5;
              axis.x = nx1;
              axis.y = ny1;
            }
          } else if (dt >= v1.y * a0.gnormx - v1.x * a0.gnormy) {
            let nx2 = 0.0;
            let ny2 = 0.0;
            nx2 = circle.worldCOMx - v1.x;
            ny2 = circle.worldCOMy - v1.y;
            const len2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);
            best = len2 - _circR;
            if (best < upperBound) {
              if (len2 == 0) {
                nx2 = 1;
                ny2 = 0;
              } else {
                const t6 = 1.0 / len2;
                nx2 *= t6;
                ny2 *= t6;
              }
              const t7 = 0;
              w1.x = v1.x + nx2 * t7;
              w1.y = v1.y + ny2 * t7;
              const t8 = -_circR;
              w2.x = circle.worldCOMx + nx2 * t8;
              w2.y = circle.worldCOMy + ny2 * t8;
              axis.x = nx2;
              axis.y = ny2;
            }
          } else {
            const t9 = -_circR;
            w2.x = circle.worldCOMx + a0.gnormx * t9;
            w2.y = circle.worldCOMy + a0.gnormy * t9;
            const t10 = -best;
            w1.x = w2.x + a0.gnormx * t10;
            w1.y = w2.y + a0.gnormy * t10;
            axis.x = a0.gnormx;
            axis.y = a0.gnormy;
          }
        }
        if (swapped) {
          axis.x = -axis.x;
          axis.y = -axis.y;
        }
        return best;
      } else {
        const p1 = s1.polygon;
        const p2 = s2.polygon;
        let best1 = -1e100;
        let a1 = null;
        let a2 = null;
        let besti = 0;
        let cx_ite1 = p1.edges.head;
        while (cx_ite1 != null) {
          const a3 = cx_ite1.elt;
          let min = 1e100;
          let cx_ite2 = p2.gverts.next;
          while (cx_ite2 != null) {
            const v = cx_ite2;
            const k = a3.gnormx * v.x + a3.gnormy * v.y;
            if (k < min) {
              min = k;
            }
            cx_ite2 = cx_ite2.next;
          }
          min -= a3.gprojection;
          if (min > upperBound) {
            best1 = min;
            break;
          }
          if (min > 0) {
            if (min > best1) {
              best1 = min;
              a1 = a3;
              besti = 1;
            }
          } else if (best1 < 0 && min > best1) {
            best1 = min;
            a1 = a3;
            besti = 1;
          }
          cx_ite1 = cx_ite1.next;
        }
        if (best1 < upperBound) {
          let cx_ite3 = p2.edges.head;
          while (cx_ite3 != null) {
            const a4 = cx_ite3.elt;
            let min1 = 1e100;
            let cx_ite4 = p1.gverts.next;
            while (cx_ite4 != null) {
              const v2 = cx_ite4;
              const k1 = a4.gnormx * v2.x + a4.gnormy * v2.y;
              if (k1 < min1) {
                min1 = k1;
              }
              cx_ite4 = cx_ite4.next;
            }
            min1 -= a4.gprojection;
            if (min1 > upperBound) {
              best1 = min1;
              break;
            }
            if (min1 > 0) {
              if (min1 > best1) {
                best1 = min1;
                a2 = a4;
                besti = 2;
              }
            } else if (best1 < 0 && min1 > best1) {
              best1 = min1;
              a2 = a4;
              besti = 2;
            }
            cx_ite3 = cx_ite3.next;
          }
          if (best1 < upperBound) {
            let q1;
            let q2;
            let ax;
            if (besti == 1) {
              q1 = p1;
              q2 = p2;
              ax = a1;
            } else {
              q1 = p2;
              q2 = p1;
              ax = a2;
              const tmp1 = w1;
              w1 = w2;
              w2 = tmp1;
              swapped = !swapped;
            }
            let ay = null;
            let min2 = 1e100;
            let cx_ite5 = q2.edges.head;
            while (cx_ite5 != null) {
              const a5 = cx_ite5.elt;
              const k2 = ax.gnormx * a5.gnormx + ax.gnormy * a5.gnormy;
              if (k2 < min2) {
                min2 = k2;
                ay = a5;
              }
              cx_ite5 = cx_ite5.next;
            }
            if (swapped) {
              axis.x = -ax.gnormx;
              axis.y = -ax.gnormy;
            } else {
              axis.x = ax.gnormx;
              axis.y = ax.gnormy;
            }
            if (best1 >= 0) {
              const v01 = ax.gp0;
              const v11 = ax.gp1;
              const q0 = ay.gp0;
              const q11 = ay.gp1;
              let vx = 0.0;
              let vy = 0.0;
              let qx = 0.0;
              let qy = 0.0;
              vx = v11.x - v01.x;
              vy = v11.y - v01.y;
              qx = q11.x - q0.x;
              qy = q11.y - q0.y;
              const vdot = 1 / (vx * vx + vy * vy);
              const qdot = 1 / (qx * qx + qy * qy);
              let t11 = -(vx * (v01.x - q0.x) + vy * (v01.y - q0.y)) * vdot;
              let t21 = -(vx * (v01.x - q11.x) + vy * (v01.y - q11.y)) * vdot;
              let s11 = -(qx * (q0.x - v01.x) + qy * (q0.y - v01.y)) * qdot;
              let s21 = -(qx * (q0.x - v11.x) + qy * (q0.y - v11.y)) * qdot;
              if (t11 < 0) {
                t11 = 0;
              } else if (t11 > 1) {
                t11 = 1;
              }
              if (t21 < 0) {
                t21 = 0;
              } else if (t21 > 1) {
                t21 = 1;
              }
              if (s11 < 0) {
                s11 = 0;
              } else if (s11 > 1) {
                s11 = 1;
              }
              if (s21 < 0) {
                s21 = 0;
              } else if (s21 > 1) {
                s21 = 1;
              }
              let f1x = 0.0;
              let f1y = 0.0;
              const t12 = t11;
              f1x = v01.x + vx * t12;
              f1y = v01.y + vy * t12;
              let f2x = 0.0;
              let f2y = 0.0;
              const t13 = t21;
              f2x = v01.x + vx * t13;
              f2y = v01.y + vy * t13;
              let g1x = 0.0;
              let g1y = 0.0;
              const t14 = s11;
              g1x = q0.x + qx * t14;
              g1y = q0.y + qy * t14;
              let g2x = 0.0;
              let g2y = 0.0;
              const t15 = s21;
              g2x = q0.x + qx * t15;
              g2y = q0.y + qy * t15;
              let dx = 0.0;
              let dy = 0.0;
              dx = f1x - q0.x;
              dy = f1y - q0.y;
              let d1 = dx * dx + dy * dy;
              let dx1 = 0.0;
              let dy1 = 0.0;
              dx1 = f2x - q11.x;
              dy1 = f2y - q11.y;
              const d2 = dx1 * dx1 + dy1 * dy1;
              let dx2 = 0.0;
              let dy2 = 0.0;
              dx2 = g1x - v01.x;
              dy2 = g1y - v01.y;
              let e1 = dx2 * dx2 + dy2 * dy2;
              let dx3 = 0.0;
              let dy3 = 0.0;
              dx3 = g2x - v11.x;
              dy3 = g2y - v11.y;
              const e2 = dx3 * dx3 + dy3 * dy3;
              let minfx = 0.0;
              let minfy = 0.0;
              let minq = null;
              if (d1 < d2) {
                minfx = f1x;
                minfy = f1y;
                minq = q0;
              } else {
                minfx = f2x;
                minfy = f2y;
                minq = q11;
                d1 = d2;
              }
              let mingx = 0.0;
              let mingy = 0.0;
              let minv = null;
              if (e1 < e2) {
                mingx = g1x;
                mingy = g1y;
                minv = v01;
              } else {
                mingx = g2x;
                mingy = g2y;
                minv = v11;
                e1 = e2;
              }
              if (d1 < e1) {
                w1.x = minfx;
                w1.y = minfy;
                w2.x = minq.x;
                w2.y = minq.y;
                best1 = Math.sqrt(d1);
              } else {
                w2.x = mingx;
                w2.y = mingy;
                w1.x = minv.x;
                w1.y = minv.y;
                best1 = Math.sqrt(e1);
              }
              if (best1 != 0) {
                axis.x = w2.x - w1.x;
                axis.y = w2.y - w1.y;
                const t16 = 1.0 / best1;
                axis.x *= t16;
                axis.y *= t16;
                if (swapped) {
                  axis.x = -axis.x;
                  axis.y = -axis.y;
                }
              }
              return best1;
            } else {
              let c0x = 0.0;
              let c0y = 0.0;
              c0x = ay.gp0.x;
              c0y = ay.gp0.y;
              let c1x = 0.0;
              let c1y = 0.0;
              c1x = ay.gp1.x;
              c1y = ay.gp1.y;
              let dvx = 0.0;
              let dvy = 0.0;
              dvx = c1x - c0x;
              dvy = c1y - c0y;
              const d0 = ax.gnormy * c0x - ax.gnormx * c0y;
              const d11 = ax.gnormy * c1x - ax.gnormx * c1y;
              const den = 1 / (d11 - d0);
              const t17 = (-ax.tp1 - d0) * den;
              if (t17 > napeNs.Config.epsilon) {
                const t18 = t17;
                c0x += dvx * t18;
                c0y += dvy * t18;
              }
              const t19 = (-ax.tp0 - d11) * den;
              if (t19 < -napeNs.Config.epsilon) {
                const t20 = t19;
                c1x += dvx * t20;
                c1y += dvy * t20;
              }
              const c0d = c0x * ax.gnormx + c0y * ax.gnormy - ax.gprojection;
              const c1d = c1x * ax.gnormx + c1y * ax.gnormy - ax.gprojection;
              if (c0d < c1d) {
                w2.x = c0x;
                w2.y = c0y;
                const t22 = -c0d;
                w1.x = w2.x + ax.gnormx * t22;
                w1.y = w2.y + ax.gnormy * t22;
                return c0d;
              } else {
                w2.x = c1x;
                w2.y = c1y;
                const t23 = -c1d;
                w1.x = w2.x + ax.gnormx * t23;
                w1.y = w2.y + ax.gnormy * t23;
                return c1d;
              }
            }
          } else {
            return upperBound;
          }
        } else {
          return upperBound;
        }
      }
    }
  }
}
