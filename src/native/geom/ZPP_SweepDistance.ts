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

export class ZPP_SweepDistance {
  static __name__ = ["zpp_nape", "geom", "ZPP_SweepDistance"];

  static dynamicSweep(toi: ZPP_ToiEvent, timeStep: number, lowerBound: number, negRadius: number, userAPI: boolean) {
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
      let s11 = s1;
      let s21 = s2;
      let w1 = c1;
      let w2 = c2;
      var sep;
      if (s11.type == 0 && s21.type == 0) {
        const c11 = s11.circle;
        const c21 = s21.circle;
        var dist;
        let nx2 = 0.0;
        let ny = 0.0;
        nx2 = c21.worldCOMx - c11.worldCOMx;
        ny = c21.worldCOMy - c11.worldCOMy;
        const len = Math.sqrt(nx2 * nx2 + ny * ny);
        dist = len - (c11.radius + c21.radius);
        if (dist < 1e100) {
          if (len == 0) {
            nx2 = 1;
            ny = 0;
          } else {
            const t2 = 1.0 / len;
            nx2 *= t2;
            ny *= t2;
          }
          const t3 = c11.radius;
          w1.x = c11.worldCOMx + nx2 * t3;
          w1.y = c11.worldCOMy + ny * t3;
          const t4 = -c21.radius;
          w2.x = c21.worldCOMx + nx2 * t4;
          w2.y = c21.worldCOMy + ny * t4;
          axis.x = nx2;
          axis.y = ny;
        }
        sep = dist;
      } else {
        let swapped = false;
        if (s11.type == 0 && s21.type == 1) {
          const tmp = s11;
          s11 = s21;
          s21 = tmp;
          const tmp2 = w1;
          w1 = w2;
          w2 = tmp2;
          swapped = true;
        }
        if (s11.type == 1 && s21.type == 0) {
          const poly = s11.polygon;
          const circle = s21.circle;
          let best = -1e100;
          let a0 = null;
          let cx_ite4 = poly.edges.head;
          while (cx_ite4 != null) {
            const a = cx_ite4.elt;
            const dist1 =
              a.gnormx * circle.worldCOMx +
              a.gnormy * circle.worldCOMy -
              a.gprojection -
              circle.radius;
            if (dist1 > 1e100) {
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
            cx_ite4 = cx_ite4.next;
          }
          if (best < 1e100) {
            const v0 = a0.gp0;
            const v11 = a0.gp1;
            const dt2 = circle.worldCOMy * a0.gnormx - circle.worldCOMx * a0.gnormy;
            if (dt2 <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
              let nx3 = 0.0;
              let ny1 = 0.0;
              nx3 = circle.worldCOMx - v0.x;
              ny1 = circle.worldCOMy - v0.y;
              const len1 = Math.sqrt(nx3 * nx3 + ny1 * ny1);
              best = len1 - circle.radius;
              if (best < 1e100) {
                if (len1 == 0) {
                  nx3 = 1;
                  ny1 = 0;
                } else {
                  const t5 = 1.0 / len1;
                  nx3 *= t5;
                  ny1 *= t5;
                }
                const t6 = 0;
                w1.x = v0.x + nx3 * t6;
                w1.y = v0.y + ny1 * t6;
                const t7 = -circle.radius;
                w2.x = circle.worldCOMx + nx3 * t7;
                w2.y = circle.worldCOMy + ny1 * t7;
                axis.x = nx3;
                axis.y = ny1;
              }
            } else if (dt2 >= v11.y * a0.gnormx - v11.x * a0.gnormy) {
              let nx4 = 0.0;
              let ny2 = 0.0;
              nx4 = circle.worldCOMx - v11.x;
              ny2 = circle.worldCOMy - v11.y;
              const len2 = Math.sqrt(nx4 * nx4 + ny2 * ny2);
              best = len2 - circle.radius;
              if (best < 1e100) {
                if (len2 == 0) {
                  nx4 = 1;
                  ny2 = 0;
                } else {
                  const t8 = 1.0 / len2;
                  nx4 *= t8;
                  ny2 *= t8;
                }
                const t9 = 0;
                w1.x = v11.x + nx4 * t9;
                w1.y = v11.y + ny2 * t9;
                const t10 = -circle.radius;
                w2.x = circle.worldCOMx + nx4 * t10;
                w2.y = circle.worldCOMy + ny2 * t10;
                axis.x = nx4;
                axis.y = ny2;
              }
            } else {
              const t11 = -circle.radius;
              w2.x = circle.worldCOMx + a0.gnormx * t11;
              w2.y = circle.worldCOMy + a0.gnormy * t11;
              const t12 = -best;
              w1.x = w2.x + a0.gnormx * t12;
              w1.y = w2.y + a0.gnormy * t12;
              axis.x = a0.gnormx;
              axis.y = a0.gnormy;
            }
          }
          if (swapped) {
            axis.x = -axis.x;
            axis.y = -axis.y;
          }
          sep = best;
        } else {
          const p11 = s11.polygon;
          const p21 = s21.polygon;
          let best1 = -1e100;
          let a1 = null;
          let a2 = null;
          let besti = 0;
          let cx_ite5 = p11.edges.head;
          while (cx_ite5 != null) {
            const a3 = cx_ite5.elt;
            let min = 1e100;
            let cx_ite6 = p21.gverts.next;
            while (cx_ite6 != null) {
              const v4 = cx_ite6;
              const k = a3.gnormx * v4.x + a3.gnormy * v4.y;
              if (k < min) {
                min = k;
              }
              cx_ite6 = cx_ite6.next;
            }
            min -= a3.gprojection;
            if (min > 1e100) {
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
            cx_ite5 = cx_ite5.next;
          }
          if (best1 < 1e100) {
            let cx_ite7 = p21.edges.head;
            while (cx_ite7 != null) {
              const a4 = cx_ite7.elt;
              let min1 = 1e100;
              let cx_ite8 = p11.gverts.next;
              while (cx_ite8 != null) {
                const v5 = cx_ite8;
                const k1 = a4.gnormx * v5.x + a4.gnormy * v5.y;
                if (k1 < min1) {
                  min1 = k1;
                }
                cx_ite8 = cx_ite8.next;
              }
              min1 -= a4.gprojection;
              if (min1 > 1e100) {
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
              cx_ite7 = cx_ite7.next;
            }
            if (best1 < 1e100) {
              var q1;
              var q2;
              var ax;
              if (besti == 1) {
                q1 = p11;
                q2 = p21;
                ax = a1;
              } else {
                q1 = p21;
                q2 = p11;
                ax = a2;
                const tmp1 = w1;
                w1 = w2;
                w2 = tmp1;
                swapped = !swapped;
              }
              let ay = null;
              let min2 = 1e100;
              let cx_ite9 = q2.edges.head;
              while (cx_ite9 != null) {
                const a5 = cx_ite9.elt;
                const k2 = ax.gnormx * a5.gnormx + ax.gnormy * a5.gnormy;
                if (k2 < min2) {
                  min2 = k2;
                  ay = a5;
                }
                cx_ite9 = cx_ite9.next;
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
                const v12 = ax.gp1;
                const q0 = ay.gp0;
                const q11 = ay.gp1;
                let vx = 0.0;
                let vy = 0.0;
                let qx = 0.0;
                let qy = 0.0;
                vx = v12.x - v01.x;
                vy = v12.y - v01.y;
                qx = q11.x - q0.x;
                qy = q11.y - q0.y;
                const vdot = 1 / (vx * vx + vy * vy);
                const qdot = 1 / (qx * qx + qy * qy);
                let t13 = -(vx * (v01.x - q0.x) + vy * (v01.y - q0.y)) * vdot;
                let t21 = -(vx * (v01.x - q11.x) + vy * (v01.y - q11.y)) * vdot;
                let s12 = -(qx * (q0.x - v01.x) + qy * (q0.y - v01.y)) * qdot;
                let s22 = -(qx * (q0.x - v12.x) + qy * (q0.y - v12.y)) * qdot;
                if (t13 < 0) {
                  t13 = 0;
                } else if (t13 > 1) {
                  t13 = 1;
                }
                if (t21 < 0) {
                  t21 = 0;
                } else if (t21 > 1) {
                  t21 = 1;
                }
                if (s12 < 0) {
                  s12 = 0;
                } else if (s12 > 1) {
                  s12 = 1;
                }
                if (s22 < 0) {
                  s22 = 0;
                } else if (s22 > 1) {
                  s22 = 1;
                }
                let f1x = 0.0;
                let f1y = 0.0;
                const t14 = t13;
                f1x = v01.x + vx * t14;
                f1y = v01.y + vy * t14;
                let f2x = 0.0;
                let f2y = 0.0;
                const t15 = t21;
                f2x = v01.x + vx * t15;
                f2y = v01.y + vy * t15;
                let g1x = 0.0;
                let g1y = 0.0;
                const t16 = s12;
                g1x = q0.x + qx * t16;
                g1y = q0.y + qy * t16;
                let g2x = 0.0;
                let g2y = 0.0;
                const t17 = s22;
                g2x = q0.x + qx * t17;
                g2y = q0.y + qy * t17;
                let dx = 0.0;
                let dy = 0.0;
                dx = f1x - q0.x;
                dy = f1y - q0.y;
                let d1 = dx * dx + dy * dy;
                let dx1 = 0.0;
                let dy1 = 0.0;
                dx1 = f2x - q11.x;
                dy1 = f2y - q11.y;
                const d22 = dx1 * dx1 + dy1 * dy1;
                let dx2 = 0.0;
                let dy2 = 0.0;
                dx2 = g1x - v01.x;
                dy2 = g1y - v01.y;
                let e11 = dx2 * dx2 + dy2 * dy2;
                let dx3 = 0.0;
                let dy3 = 0.0;
                dx3 = g2x - v12.x;
                dy3 = g2y - v12.y;
                const e21 = dx3 * dx3 + dy3 * dy3;
                let minfx = 0.0;
                let minfy = 0.0;
                let minq = null;
                if (d1 < d22) {
                  minfx = f1x;
                  minfy = f1y;
                  minq = q0;
                } else {
                  minfx = f2x;
                  minfy = f2y;
                  minq = q11;
                  d1 = d22;
                }
                let mingx = 0.0;
                let mingy = 0.0;
                let minv = null;
                if (e11 < e21) {
                  mingx = g1x;
                  mingy = g1y;
                  minv = v01;
                } else {
                  mingx = g2x;
                  mingy = g2y;
                  minv = v12;
                  e11 = e21;
                }
                if (d1 < e11) {
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
                  best1 = Math.sqrt(e11);
                }
                if (best1 != 0) {
                  axis.x = w2.x - w1.x;
                  axis.y = w2.y - w1.y;
                  const t18 = 1.0 / best1;
                  axis.x *= t18;
                  axis.y *= t18;
                  if (swapped) {
                    axis.x = -axis.x;
                    axis.y = -axis.y;
                  }
                }
                sep = best1;
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
                const t19 = (-ax.tp1 - d0) * den;
                if (t19 > napeNs.Config.epsilon) {
                  const t20 = t19;
                  c0x += dvx * t20;
                  c0y += dvy * t20;
                }
                const t22 = (-ax.tp0 - d11) * den;
                if (t22 < -napeNs.Config.epsilon) {
                  const t23 = t22;
                  c1x += dvx * t23;
                  c1y += dvy * t23;
                }
                const c0d = c0x * ax.gnormx + c0y * ax.gnormy - ax.gprojection;
                const c1d = c1x * ax.gnormx + c1y * ax.gnormy - ax.gprojection;
                if (c0d < c1d) {
                  w2.x = c0x;
                  w2.y = c0y;
                  const t24 = -c0d;
                  w1.x = w2.x + ax.gnormx * t24;
                  w1.y = w2.y + ax.gnormy * t24;
                  sep = c0d;
                } else {
                  w2.x = c1x;
                  w2.y = c1y;
                  const t25 = -c1d;
                  w1.x = w2.x + ax.gnormx * t25;
                  w1.y = w2.y + ax.gnormy * t25;
                  sep = c1d;
                }
              }
            } else {
              sep = 1e100;
            }
          } else {
            sep = 1e100;
          }
        }
      }
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
        let s13 = s1;
        let s23 = s2;
        let w11 = c1;
        let w21 = c2;
        var sep2;
        if (s13.type == 0 && s23.type == 0) {
          const c12 = s13.circle;
          const c22 = s23.circle;
          var dist2;
          let nx7 = 0.0;
          let ny3 = 0.0;
          nx7 = c22.worldCOMx - c12.worldCOMx;
          ny3 = c22.worldCOMy - c12.worldCOMy;
          const len3 = Math.sqrt(nx7 * nx7 + ny3 * ny3);
          dist2 = len3 - (c12.radius + c22.radius);
          if (dist2 < 1e100) {
            if (len3 == 0) {
              nx7 = 1;
              ny3 = 0;
            } else {
              const t28 = 1.0 / len3;
              nx7 *= t28;
              ny3 *= t28;
            }
            const t29 = c12.radius;
            w11.x = c12.worldCOMx + nx7 * t29;
            w11.y = c12.worldCOMy + ny3 * t29;
            const t30 = -c22.radius;
            w21.x = c22.worldCOMx + nx7 * t30;
            w21.y = c22.worldCOMy + ny3 * t30;
            axis.x = nx7;
            axis.y = ny3;
          }
          sep2 = dist2;
        } else {
          let swapped1 = false;
          if (s13.type == 0 && s23.type == 1) {
            const tmp3 = s13;
            s13 = s23;
            s23 = tmp3;
            const tmp21 = w11;
            w11 = w21;
            w21 = tmp21;
            swapped1 = true;
          }
          if (s13.type == 1 && s23.type == 0) {
            const poly1 = s13.polygon;
            const circle1 = s23.circle;
            let best2 = -1e100;
            let a01 = null;
            let cx_ite14 = poly1.edges.head;
            while (cx_ite14 != null) {
              const a6 = cx_ite14.elt;
              const dist3 =
                a6.gnormx * circle1.worldCOMx +
                a6.gnormy * circle1.worldCOMy -
                a6.gprojection -
                circle1.radius;
              if (dist3 > 1e100) {
                best2 = dist3;
                break;
              }
              if (dist3 > 0) {
                if (dist3 > best2) {
                  best2 = dist3;
                  a01 = a6;
                }
              } else if (best2 < 0 && dist3 > best2) {
                best2 = dist3;
                a01 = a6;
              }
              cx_ite14 = cx_ite14.next;
            }
            if (best2 < 1e100) {
              const v02 = a01.gp0;
              const v13 = a01.gp1;
              const dt5 = circle1.worldCOMy * a01.gnormx - circle1.worldCOMx * a01.gnormy;
              if (dt5 <= v02.y * a01.gnormx - v02.x * a01.gnormy) {
                let nx8 = 0.0;
                let ny4 = 0.0;
                nx8 = circle1.worldCOMx - v02.x;
                ny4 = circle1.worldCOMy - v02.y;
                const len4 = Math.sqrt(nx8 * nx8 + ny4 * ny4);
                best2 = len4 - circle1.radius;
                if (best2 < 1e100) {
                  if (len4 == 0) {
                    nx8 = 1;
                    ny4 = 0;
                  } else {
                    const t31 = 1.0 / len4;
                    nx8 *= t31;
                    ny4 *= t31;
                  }
                  const t32 = 0;
                  w11.x = v02.x + nx8 * t32;
                  w11.y = v02.y + ny4 * t32;
                  const t33 = -circle1.radius;
                  w21.x = circle1.worldCOMx + nx8 * t33;
                  w21.y = circle1.worldCOMy + ny4 * t33;
                  axis.x = nx8;
                  axis.y = ny4;
                }
              } else if (dt5 >= v13.y * a01.gnormx - v13.x * a01.gnormy) {
                let nx9 = 0.0;
                let ny5 = 0.0;
                nx9 = circle1.worldCOMx - v13.x;
                ny5 = circle1.worldCOMy - v13.y;
                const len5 = Math.sqrt(nx9 * nx9 + ny5 * ny5);
                best2 = len5 - circle1.radius;
                if (best2 < 1e100) {
                  if (len5 == 0) {
                    nx9 = 1;
                    ny5 = 0;
                  } else {
                    const t34 = 1.0 / len5;
                    nx9 *= t34;
                    ny5 *= t34;
                  }
                  const t35 = 0;
                  w11.x = v13.x + nx9 * t35;
                  w11.y = v13.y + ny5 * t35;
                  const t36 = -circle1.radius;
                  w21.x = circle1.worldCOMx + nx9 * t36;
                  w21.y = circle1.worldCOMy + ny5 * t36;
                  axis.x = nx9;
                  axis.y = ny5;
                }
              } else {
                const t37 = -circle1.radius;
                w21.x = circle1.worldCOMx + a01.gnormx * t37;
                w21.y = circle1.worldCOMy + a01.gnormy * t37;
                const t38 = -best2;
                w11.x = w21.x + a01.gnormx * t38;
                w11.y = w21.y + a01.gnormy * t38;
                axis.x = a01.gnormx;
                axis.y = a01.gnormy;
              }
            }
            if (swapped1) {
              axis.x = -axis.x;
              axis.y = -axis.y;
            }
            sep2 = best2;
          } else {
            const p12 = s13.polygon;
            const p22 = s23.polygon;
            let best3 = -1e100;
            let a11 = null;
            let a21 = null;
            let besti1 = 0;
            let cx_ite15 = p12.edges.head;
            while (cx_ite15 != null) {
              const a7 = cx_ite15.elt;
              let min3 = 1e100;
              let cx_ite16 = p22.gverts.next;
              while (cx_ite16 != null) {
                const v10 = cx_ite16;
                const k3 = a7.gnormx * v10.x + a7.gnormy * v10.y;
                if (k3 < min3) {
                  min3 = k3;
                }
                cx_ite16 = cx_ite16.next;
              }
              min3 -= a7.gprojection;
              if (min3 > 1e100) {
                best3 = min3;
                break;
              }
              if (min3 > 0) {
                if (min3 > best3) {
                  best3 = min3;
                  a11 = a7;
                  besti1 = 1;
                }
              } else if (best3 < 0 && min3 > best3) {
                best3 = min3;
                a11 = a7;
                besti1 = 1;
              }
              cx_ite15 = cx_ite15.next;
            }
            if (best3 < 1e100) {
              let cx_ite17 = p22.edges.head;
              while (cx_ite17 != null) {
                const a8 = cx_ite17.elt;
                let min4 = 1e100;
                let cx_ite18 = p12.gverts.next;
                while (cx_ite18 != null) {
                  const v14 = cx_ite18;
                  const k4 = a8.gnormx * v14.x + a8.gnormy * v14.y;
                  if (k4 < min4) {
                    min4 = k4;
                  }
                  cx_ite18 = cx_ite18.next;
                }
                min4 -= a8.gprojection;
                if (min4 > 1e100) {
                  best3 = min4;
                  break;
                }
                if (min4 > 0) {
                  if (min4 > best3) {
                    best3 = min4;
                    a21 = a8;
                    besti1 = 2;
                  }
                } else if (best3 < 0 && min4 > best3) {
                  best3 = min4;
                  a21 = a8;
                  besti1 = 2;
                }
                cx_ite17 = cx_ite17.next;
              }
              if (best3 < 1e100) {
                var q12;
                var q21;
                var ax1;
                if (besti1 == 1) {
                  q12 = p12;
                  q21 = p22;
                  ax1 = a11;
                } else {
                  q12 = p22;
                  q21 = p12;
                  ax1 = a21;
                  const tmp4 = w11;
                  w11 = w21;
                  w21 = tmp4;
                  swapped1 = !swapped1;
                }
                let ay1 = null;
                let min5 = 1e100;
                let cx_ite19 = q21.edges.head;
                while (cx_ite19 != null) {
                  const a9 = cx_ite19.elt;
                  const k5 = ax1.gnormx * a9.gnormx + ax1.gnormy * a9.gnormy;
                  if (k5 < min5) {
                    min5 = k5;
                    ay1 = a9;
                  }
                  cx_ite19 = cx_ite19.next;
                }
                if (swapped1) {
                  axis.x = -ax1.gnormx;
                  axis.y = -ax1.gnormy;
                } else {
                  axis.x = ax1.gnormx;
                  axis.y = ax1.gnormy;
                }
                if (best3 >= 0) {
                  const v03 = ax1.gp0;
                  const v15 = ax1.gp1;
                  const q01 = ay1.gp0;
                  const q13 = ay1.gp1;
                  let vx1 = 0.0;
                  let vy1 = 0.0;
                  let qx1 = 0.0;
                  let qy1 = 0.0;
                  vx1 = v15.x - v03.x;
                  vy1 = v15.y - v03.y;
                  qx1 = q13.x - q01.x;
                  qy1 = q13.y - q01.y;
                  const vdot1 = 1 / (vx1 * vx1 + vy1 * vy1);
                  const qdot1 = 1 / (qx1 * qx1 + qy1 * qy1);
                  let t110 = -(vx1 * (v03.x - q01.x) + vy1 * (v03.y - q01.y)) * vdot1;
                  let t210 = -(vx1 * (v03.x - q13.x) + vy1 * (v03.y - q13.y)) * vdot1;
                  let s14 = -(qx1 * (q01.x - v03.x) + qy1 * (q01.y - v03.y)) * qdot1;
                  let s24 = -(qx1 * (q01.x - v15.x) + qy1 * (q01.y - v15.y)) * qdot1;
                  if (t110 < 0) {
                    t110 = 0;
                  } else if (t110 > 1) {
                    t110 = 1;
                  }
                  if (t210 < 0) {
                    t210 = 0;
                  } else if (t210 > 1) {
                    t210 = 1;
                  }
                  if (s14 < 0) {
                    s14 = 0;
                  } else if (s14 > 1) {
                    s14 = 1;
                  }
                  if (s24 < 0) {
                    s24 = 0;
                  } else if (s24 > 1) {
                    s24 = 1;
                  }
                  let f1x1 = 0.0;
                  let f1y1 = 0.0;
                  const t39 = t110;
                  f1x1 = v03.x + vx1 * t39;
                  f1y1 = v03.y + vy1 * t39;
                  let f2x1 = 0.0;
                  let f2y1 = 0.0;
                  const t40 = t210;
                  f2x1 = v03.x + vx1 * t40;
                  f2y1 = v03.y + vy1 * t40;
                  let g1x1 = 0.0;
                  let g1y1 = 0.0;
                  const t41 = s14;
                  g1x1 = q01.x + qx1 * t41;
                  g1y1 = q01.y + qy1 * t41;
                  let g2x1 = 0.0;
                  let g2y1 = 0.0;
                  const t42 = s24;
                  g2x1 = q01.x + qx1 * t42;
                  g2y1 = q01.y + qy1 * t42;
                  let dx4 = 0.0;
                  let dy4 = 0.0;
                  dx4 = f1x1 - q01.x;
                  dy4 = f1y1 - q01.y;
                  let d12 = dx4 * dx4 + dy4 * dy4;
                  let dx5 = 0.0;
                  let dy5 = 0.0;
                  dx5 = f2x1 - q13.x;
                  dy5 = f2y1 - q13.y;
                  const d25 = dx5 * dx5 + dy5 * dy5;
                  let dx6 = 0.0;
                  let dy6 = 0.0;
                  dx6 = g1x1 - v03.x;
                  dy6 = g1y1 - v03.y;
                  let e12 = dx6 * dx6 + dy6 * dy6;
                  let dx7 = 0.0;
                  let dy7 = 0.0;
                  dx7 = g2x1 - v15.x;
                  dy7 = g2y1 - v15.y;
                  const e22 = dx7 * dx7 + dy7 * dy7;
                  let minfx1 = 0.0;
                  let minfy1 = 0.0;
                  let minq1 = null;
                  if (d12 < d25) {
                    minfx1 = f1x1;
                    minfy1 = f1y1;
                    minq1 = q01;
                  } else {
                    minfx1 = f2x1;
                    minfy1 = f2y1;
                    minq1 = q13;
                    d12 = d25;
                  }
                  let mingx1 = 0.0;
                  let mingy1 = 0.0;
                  let minv1 = null;
                  if (e12 < e22) {
                    mingx1 = g1x1;
                    mingy1 = g1y1;
                    minv1 = v03;
                  } else {
                    mingx1 = g2x1;
                    mingy1 = g2y1;
                    minv1 = v15;
                    e12 = e22;
                  }
                  if (d12 < e12) {
                    w11.x = minfx1;
                    w11.y = minfy1;
                    w21.x = minq1.x;
                    w21.y = minq1.y;
                    best3 = Math.sqrt(d12);
                  } else {
                    w21.x = mingx1;
                    w21.y = mingy1;
                    w11.x = minv1.x;
                    w11.y = minv1.y;
                    best3 = Math.sqrt(e12);
                  }
                  if (best3 != 0) {
                    axis.x = w21.x - w11.x;
                    axis.y = w21.y - w11.y;
                    const t43 = 1.0 / best3;
                    axis.x *= t43;
                    axis.y *= t43;
                    if (swapped1) {
                      axis.x = -axis.x;
                      axis.y = -axis.y;
                    }
                  }
                  sep2 = best3;
                } else {
                  let c0x1 = 0.0;
                  let c0y1 = 0.0;
                  c0x1 = ay1.gp0.x;
                  c0y1 = ay1.gp0.y;
                  let c1x1 = 0.0;
                  let c1y1 = 0.0;
                  c1x1 = ay1.gp1.x;
                  c1y1 = ay1.gp1.y;
                  let dvx1 = 0.0;
                  let dvy1 = 0.0;
                  dvx1 = c1x1 - c0x1;
                  dvy1 = c1y1 - c0y1;
                  const d01 = ax1.gnormy * c0x1 - ax1.gnormx * c0y1;
                  const d13 = ax1.gnormy * c1x1 - ax1.gnormx * c1y1;
                  const den1 = 1 / (d13 - d01);
                  const t44 = (-ax1.tp1 - d01) * den1;
                  if (t44 > napeNs.Config.epsilon) {
                    const t45 = t44;
                    c0x1 += dvx1 * t45;
                    c0y1 += dvy1 * t45;
                  }
                  const t46 = (-ax1.tp0 - d13) * den1;
                  if (t46 < -napeNs.Config.epsilon) {
                    const t47 = t46;
                    c1x1 += dvx1 * t47;
                    c1y1 += dvy1 * t47;
                  }
                  const c0d1 = c0x1 * ax1.gnormx + c0y1 * ax1.gnormy - ax1.gprojection;
                  const c1d1 = c1x1 * ax1.gnormx + c1y1 * ax1.gnormy - ax1.gprojection;
                  if (c0d1 < c1d1) {
                    w21.x = c0x1;
                    w21.y = c0y1;
                    const t48 = -c0d1;
                    w11.x = w21.x + ax1.gnormx * t48;
                    w11.y = w21.y + ax1.gnormy * t48;
                    sep2 = c0d1;
                  } else {
                    w21.x = c1x1;
                    w21.y = c1y1;
                    const t49 = -c1d1;
                    w11.x = w21.x + ax1.gnormx * t49;
                    w11.y = w21.y + ax1.gnormy * t49;
                    sep2 = c1d1;
                  }
                }
              } else {
                sep2 = 1e100;
              }
            } else {
              sep2 = 1e100;
            }
          }
        }
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
      let s11 = s1;
      let s21 = s2;
      let w1 = c1;
      let w2 = c2;
      var sep;
      if (s11.type == 0 && s21.type == 0) {
        const c11 = s11.circle;
        const c21 = s21.circle;
        var dist;
        let nx1 = 0.0;
        let ny = 0.0;
        nx1 = c21.worldCOMx - c11.worldCOMx;
        ny = c21.worldCOMy - c11.worldCOMy;
        const len = Math.sqrt(nx1 * nx1 + ny * ny);
        dist = len - (c11.radius + c21.radius);
        if (dist < 1e100) {
          if (len == 0) {
            nx1 = 1;
            ny = 0;
          } else {
            const t1 = 1.0 / len;
            nx1 *= t1;
            ny *= t1;
          }
          const t2 = c11.radius;
          w1.x = c11.worldCOMx + nx1 * t2;
          w1.y = c11.worldCOMy + ny * t2;
          const t3 = -c21.radius;
          w2.x = c21.worldCOMx + nx1 * t3;
          w2.y = c21.worldCOMy + ny * t3;
          axis.x = nx1;
          axis.y = ny;
        }
        sep = dist;
      } else {
        let swapped = false;
        if (s11.type == 0 && s21.type == 1) {
          const tmp = s11;
          s11 = s21;
          s21 = tmp;
          const tmp2 = w1;
          w1 = w2;
          w2 = tmp2;
          swapped = true;
        }
        if (s11.type == 1 && s21.type == 0) {
          const poly = s11.polygon;
          const circle = s21.circle;
          let best = -1e100;
          let a0 = null;
          let cx_ite2 = poly.edges.head;
          while (cx_ite2 != null) {
            const a = cx_ite2.elt;
            const dist1 =
              a.gnormx * circle.worldCOMx +
              a.gnormy * circle.worldCOMy -
              a.gprojection -
              circle.radius;
            if (dist1 > 1e100) {
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
            cx_ite2 = cx_ite2.next;
          }
          if (best < 1e100) {
            const v0 = a0.gp0;
            const v11 = a0.gp1;
            const dt1 = circle.worldCOMy * a0.gnormx - circle.worldCOMx * a0.gnormy;
            if (dt1 <= v0.y * a0.gnormx - v0.x * a0.gnormy) {
              let nx2 = 0.0;
              let ny1 = 0.0;
              nx2 = circle.worldCOMx - v0.x;
              ny1 = circle.worldCOMy - v0.y;
              const len1 = Math.sqrt(nx2 * nx2 + ny1 * ny1);
              best = len1 - circle.radius;
              if (best < 1e100) {
                if (len1 == 0) {
                  nx2 = 1;
                  ny1 = 0;
                } else {
                  const t4 = 1.0 / len1;
                  nx2 *= t4;
                  ny1 *= t4;
                }
                const t5 = 0;
                w1.x = v0.x + nx2 * t5;
                w1.y = v0.y + ny1 * t5;
                const t6 = -circle.radius;
                w2.x = circle.worldCOMx + nx2 * t6;
                w2.y = circle.worldCOMy + ny1 * t6;
                axis.x = nx2;
                axis.y = ny1;
              }
            } else if (dt1 >= v11.y * a0.gnormx - v11.x * a0.gnormy) {
              let nx3 = 0.0;
              let ny2 = 0.0;
              nx3 = circle.worldCOMx - v11.x;
              ny2 = circle.worldCOMy - v11.y;
              const len2 = Math.sqrt(nx3 * nx3 + ny2 * ny2);
              best = len2 - circle.radius;
              if (best < 1e100) {
                if (len2 == 0) {
                  nx3 = 1;
                  ny2 = 0;
                } else {
                  const t7 = 1.0 / len2;
                  nx3 *= t7;
                  ny2 *= t7;
                }
                const t8 = 0;
                w1.x = v11.x + nx3 * t8;
                w1.y = v11.y + ny2 * t8;
                const t9 = -circle.radius;
                w2.x = circle.worldCOMx + nx3 * t9;
                w2.y = circle.worldCOMy + ny2 * t9;
                axis.x = nx3;
                axis.y = ny2;
              }
            } else {
              const t10 = -circle.radius;
              w2.x = circle.worldCOMx + a0.gnormx * t10;
              w2.y = circle.worldCOMy + a0.gnormy * t10;
              const t11 = -best;
              w1.x = w2.x + a0.gnormx * t11;
              w1.y = w2.y + a0.gnormy * t11;
              axis.x = a0.gnormx;
              axis.y = a0.gnormy;
            }
          }
          if (swapped) {
            axis.x = -axis.x;
            axis.y = -axis.y;
          }
          sep = best;
        } else {
          const p11 = s11.polygon;
          const p2 = s21.polygon;
          let best1 = -1e100;
          let a1 = null;
          let a2 = null;
          let besti = 0;
          let cx_ite3 = p11.edges.head;
          while (cx_ite3 != null) {
            const a3 = cx_ite3.elt;
            let min = 1e100;
            let cx_ite4 = p2.gverts.next;
            while (cx_ite4 != null) {
              const v2 = cx_ite4;
              const k = a3.gnormx * v2.x + a3.gnormy * v2.y;
              if (k < min) {
                min = k;
              }
              cx_ite4 = cx_ite4.next;
            }
            min -= a3.gprojection;
            if (min > 1e100) {
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
            cx_ite3 = cx_ite3.next;
          }
          if (best1 < 1e100) {
            let cx_ite5 = p2.edges.head;
            while (cx_ite5 != null) {
              const a4 = cx_ite5.elt;
              let min1 = 1e100;
              let cx_ite6 = p11.gverts.next;
              while (cx_ite6 != null) {
                const v3 = cx_ite6;
                const k1 = a4.gnormx * v3.x + a4.gnormy * v3.y;
                if (k1 < min1) {
                  min1 = k1;
                }
                cx_ite6 = cx_ite6.next;
              }
              min1 -= a4.gprojection;
              if (min1 > 1e100) {
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
              cx_ite5 = cx_ite5.next;
            }
            if (best1 < 1e100) {
              var q1;
              var q2;
              var ax;
              if (besti == 1) {
                q1 = p11;
                q2 = p2;
                ax = a1;
              } else {
                q1 = p2;
                q2 = p11;
                ax = a2;
                const tmp1 = w1;
                w1 = w2;
                w2 = tmp1;
                swapped = !swapped;
              }
              let ay = null;
              let min2 = 1e100;
              let cx_ite7 = q2.edges.head;
              while (cx_ite7 != null) {
                const a5 = cx_ite7.elt;
                const k2 = ax.gnormx * a5.gnormx + ax.gnormy * a5.gnormy;
                if (k2 < min2) {
                  min2 = k2;
                  ay = a5;
                }
                cx_ite7 = cx_ite7.next;
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
                const v12 = ax.gp1;
                const q0 = ay.gp0;
                const q11 = ay.gp1;
                let vx = 0.0;
                let vy = 0.0;
                let qx = 0.0;
                let qy = 0.0;
                vx = v12.x - v01.x;
                vy = v12.y - v01.y;
                qx = q11.x - q0.x;
                qy = q11.y - q0.y;
                const vdot = 1 / (vx * vx + vy * vy);
                const qdot = 1 / (qx * qx + qy * qy);
                let t12 = -(vx * (v01.x - q0.x) + vy * (v01.y - q0.y)) * vdot;
                let t21 = -(vx * (v01.x - q11.x) + vy * (v01.y - q11.y)) * vdot;
                let s12 = -(qx * (q0.x - v01.x) + qy * (q0.y - v01.y)) * qdot;
                let s22 = -(qx * (q0.x - v12.x) + qy * (q0.y - v12.y)) * qdot;
                if (t12 < 0) {
                  t12 = 0;
                } else if (t12 > 1) {
                  t12 = 1;
                }
                if (t21 < 0) {
                  t21 = 0;
                } else if (t21 > 1) {
                  t21 = 1;
                }
                if (s12 < 0) {
                  s12 = 0;
                } else if (s12 > 1) {
                  s12 = 1;
                }
                if (s22 < 0) {
                  s22 = 0;
                } else if (s22 > 1) {
                  s22 = 1;
                }
                let f1x = 0.0;
                let f1y = 0.0;
                const t13 = t12;
                f1x = v01.x + vx * t13;
                f1y = v01.y + vy * t13;
                let f2x = 0.0;
                let f2y = 0.0;
                const t14 = t21;
                f2x = v01.x + vx * t14;
                f2y = v01.y + vy * t14;
                let g1x = 0.0;
                let g1y = 0.0;
                const t15 = s12;
                g1x = q0.x + qx * t15;
                g1y = q0.y + qy * t15;
                let g2x = 0.0;
                let g2y = 0.0;
                const t16 = s22;
                g2x = q0.x + qx * t16;
                g2y = q0.y + qy * t16;
                let dx = 0.0;
                let dy = 0.0;
                dx = f1x - q0.x;
                dy = f1y - q0.y;
                let d1 = dx * dx + dy * dy;
                let dx1 = 0.0;
                let dy1 = 0.0;
                dx1 = f2x - q11.x;
                dy1 = f2y - q11.y;
                const d21 = dx1 * dx1 + dy1 * dy1;
                let dx2 = 0.0;
                let dy2 = 0.0;
                dx2 = g1x - v01.x;
                dy2 = g1y - v01.y;
                let e11 = dx2 * dx2 + dy2 * dy2;
                let dx3 = 0.0;
                let dy3 = 0.0;
                dx3 = g2x - v12.x;
                dy3 = g2y - v12.y;
                const e2 = dx3 * dx3 + dy3 * dy3;
                let minfx = 0.0;
                let minfy = 0.0;
                let minq = null;
                if (d1 < d21) {
                  minfx = f1x;
                  minfy = f1y;
                  minq = q0;
                } else {
                  minfx = f2x;
                  minfy = f2y;
                  minq = q11;
                  d1 = d21;
                }
                let mingx = 0.0;
                let mingy = 0.0;
                let minv = null;
                if (e11 < e2) {
                  mingx = g1x;
                  mingy = g1y;
                  minv = v01;
                } else {
                  mingx = g2x;
                  mingy = g2y;
                  minv = v12;
                  e11 = e2;
                }
                if (d1 < e11) {
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
                  best1 = Math.sqrt(e11);
                }
                if (best1 != 0) {
                  axis.x = w2.x - w1.x;
                  axis.y = w2.y - w1.y;
                  const t17 = 1.0 / best1;
                  axis.x *= t17;
                  axis.y *= t17;
                  if (swapped) {
                    axis.x = -axis.x;
                    axis.y = -axis.y;
                  }
                }
                sep = best1;
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
                const t18 = (-ax.tp1 - d0) * den;
                if (t18 > napeNs.Config.epsilon) {
                  const t19 = t18;
                  c0x += dvx * t19;
                  c0y += dvy * t19;
                }
                const t20 = (-ax.tp0 - d11) * den;
                if (t20 < -napeNs.Config.epsilon) {
                  const t22 = t20;
                  c1x += dvx * t22;
                  c1y += dvy * t22;
                }
                const c0d = c0x * ax.gnormx + c0y * ax.gnormy - ax.gprojection;
                const c1d = c1x * ax.gnormx + c1y * ax.gnormy - ax.gprojection;
                if (c0d < c1d) {
                  w2.x = c0x;
                  w2.y = c0y;
                  const t23 = -c0d;
                  w1.x = w2.x + ax.gnormx * t23;
                  w1.y = w2.y + ax.gnormy * t23;
                  sep = c0d;
                } else {
                  w2.x = c1x;
                  w2.y = c1y;
                  const t24 = -c1d;
                  w1.x = w2.x + ax.gnormx * t24;
                  w1.y = w2.y + ax.gnormy * t24;
                  sep = c1d;
                }
              }
            } else {
              sep = 1e100;
            }
          } else {
            sep = 1e100;
          }
        }
      }
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
        let s13 = s1;
        let s23 = s2;
        let w11 = c1;
        let w21 = c2;
        var sep2;
        if (s13.type == 0 && s23.type == 0) {
          const c12 = s13.circle;
          const c22 = s23.circle;
          var dist2;
          let nx5 = 0.0;
          let ny3 = 0.0;
          nx5 = c22.worldCOMx - c12.worldCOMx;
          ny3 = c22.worldCOMy - c12.worldCOMy;
          const len3 = Math.sqrt(nx5 * nx5 + ny3 * ny3);
          dist2 = len3 - (c12.radius + c22.radius);
          if (dist2 < 1e100) {
            if (len3 == 0) {
              nx5 = 1;
              ny3 = 0;
            } else {
              const t26 = 1.0 / len3;
              nx5 *= t26;
              ny3 *= t26;
            }
            const t27 = c12.radius;
            w11.x = c12.worldCOMx + nx5 * t27;
            w11.y = c12.worldCOMy + ny3 * t27;
            const t28 = -c22.radius;
            w21.x = c22.worldCOMx + nx5 * t28;
            w21.y = c22.worldCOMy + ny3 * t28;
            axis.x = nx5;
            axis.y = ny3;
          }
          sep2 = dist2;
        } else {
          let swapped1 = false;
          if (s13.type == 0 && s23.type == 1) {
            const tmp3 = s13;
            s13 = s23;
            s23 = tmp3;
            const tmp21 = w11;
            w11 = w21;
            w21 = tmp21;
            swapped1 = true;
          }
          if (s13.type == 1 && s23.type == 0) {
            const poly1 = s13.polygon;
            const circle1 = s23.circle;
            let best2 = -1e100;
            let a01 = null;
            let cx_ite10 = poly1.edges.head;
            while (cx_ite10 != null) {
              const a6 = cx_ite10.elt;
              const dist3 =
                a6.gnormx * circle1.worldCOMx +
                a6.gnormy * circle1.worldCOMy -
                a6.gprojection -
                circle1.radius;
              if (dist3 > 1e100) {
                best2 = dist3;
                break;
              }
              if (dist3 > 0) {
                if (dist3 > best2) {
                  best2 = dist3;
                  a01 = a6;
                }
              } else if (best2 < 0 && dist3 > best2) {
                best2 = dist3;
                a01 = a6;
              }
              cx_ite10 = cx_ite10.next;
            }
            if (best2 < 1e100) {
              const v02 = a01.gp0;
              const v13 = a01.gp1;
              const dt3 = circle1.worldCOMy * a01.gnormx - circle1.worldCOMx * a01.gnormy;
              if (dt3 <= v02.y * a01.gnormx - v02.x * a01.gnormy) {
                let nx6 = 0.0;
                let ny4 = 0.0;
                nx6 = circle1.worldCOMx - v02.x;
                ny4 = circle1.worldCOMy - v02.y;
                const len4 = Math.sqrt(nx6 * nx6 + ny4 * ny4);
                best2 = len4 - circle1.radius;
                if (best2 < 1e100) {
                  if (len4 == 0) {
                    nx6 = 1;
                    ny4 = 0;
                  } else {
                    const t29 = 1.0 / len4;
                    nx6 *= t29;
                    ny4 *= t29;
                  }
                  const t30 = 0;
                  w11.x = v02.x + nx6 * t30;
                  w11.y = v02.y + ny4 * t30;
                  const t31 = -circle1.radius;
                  w21.x = circle1.worldCOMx + nx6 * t31;
                  w21.y = circle1.worldCOMy + ny4 * t31;
                  axis.x = nx6;
                  axis.y = ny4;
                }
              } else if (dt3 >= v13.y * a01.gnormx - v13.x * a01.gnormy) {
                let nx7 = 0.0;
                let ny5 = 0.0;
                nx7 = circle1.worldCOMx - v13.x;
                ny5 = circle1.worldCOMy - v13.y;
                const len5 = Math.sqrt(nx7 * nx7 + ny5 * ny5);
                best2 = len5 - circle1.radius;
                if (best2 < 1e100) {
                  if (len5 == 0) {
                    nx7 = 1;
                    ny5 = 0;
                  } else {
                    const t32 = 1.0 / len5;
                    nx7 *= t32;
                    ny5 *= t32;
                  }
                  const t33 = 0;
                  w11.x = v13.x + nx7 * t33;
                  w11.y = v13.y + ny5 * t33;
                  const t34 = -circle1.radius;
                  w21.x = circle1.worldCOMx + nx7 * t34;
                  w21.y = circle1.worldCOMy + ny5 * t34;
                  axis.x = nx7;
                  axis.y = ny5;
                }
              } else {
                const t35 = -circle1.radius;
                w21.x = circle1.worldCOMx + a01.gnormx * t35;
                w21.y = circle1.worldCOMy + a01.gnormy * t35;
                const t36 = -best2;
                w11.x = w21.x + a01.gnormx * t36;
                w11.y = w21.y + a01.gnormy * t36;
                axis.x = a01.gnormx;
                axis.y = a01.gnormy;
              }
            }
            if (swapped1) {
              axis.x = -axis.x;
              axis.y = -axis.y;
            }
            sep2 = best2;
          } else {
            const p12 = s13.polygon;
            const p21 = s23.polygon;
            let best3 = -1e100;
            let a11 = null;
            let a21 = null;
            let besti1 = 0;
            let cx_ite11 = p12.edges.head;
            while (cx_ite11 != null) {
              const a7 = cx_ite11.elt;
              let min3 = 1e100;
              let cx_ite12 = p21.gverts.next;
              while (cx_ite12 != null) {
                const v6 = cx_ite12;
                const k3 = a7.gnormx * v6.x + a7.gnormy * v6.y;
                if (k3 < min3) {
                  min3 = k3;
                }
                cx_ite12 = cx_ite12.next;
              }
              min3 -= a7.gprojection;
              if (min3 > 1e100) {
                best3 = min3;
                break;
              }
              if (min3 > 0) {
                if (min3 > best3) {
                  best3 = min3;
                  a11 = a7;
                  besti1 = 1;
                }
              } else if (best3 < 0 && min3 > best3) {
                best3 = min3;
                a11 = a7;
                besti1 = 1;
              }
              cx_ite11 = cx_ite11.next;
            }
            if (best3 < 1e100) {
              let cx_ite13 = p21.edges.head;
              while (cx_ite13 != null) {
                const a8 = cx_ite13.elt;
                let min4 = 1e100;
                let cx_ite14 = p12.gverts.next;
                while (cx_ite14 != null) {
                  const v7 = cx_ite14;
                  const k4 = a8.gnormx * v7.x + a8.gnormy * v7.y;
                  if (k4 < min4) {
                    min4 = k4;
                  }
                  cx_ite14 = cx_ite14.next;
                }
                min4 -= a8.gprojection;
                if (min4 > 1e100) {
                  best3 = min4;
                  break;
                }
                if (min4 > 0) {
                  if (min4 > best3) {
                    best3 = min4;
                    a21 = a8;
                    besti1 = 2;
                  }
                } else if (best3 < 0 && min4 > best3) {
                  best3 = min4;
                  a21 = a8;
                  besti1 = 2;
                }
                cx_ite13 = cx_ite13.next;
              }
              if (best3 < 1e100) {
                var q12;
                var q21;
                var ax1;
                if (besti1 == 1) {
                  q12 = p12;
                  q21 = p21;
                  ax1 = a11;
                } else {
                  q12 = p21;
                  q21 = p12;
                  ax1 = a21;
                  const tmp4 = w11;
                  w11 = w21;
                  w21 = tmp4;
                  swapped1 = !swapped1;
                }
                let ay1 = null;
                let min5 = 1e100;
                let cx_ite15 = q21.edges.head;
                while (cx_ite15 != null) {
                  const a9 = cx_ite15.elt;
                  const k5 = ax1.gnormx * a9.gnormx + ax1.gnormy * a9.gnormy;
                  if (k5 < min5) {
                    min5 = k5;
                    ay1 = a9;
                  }
                  cx_ite15 = cx_ite15.next;
                }
                if (swapped1) {
                  axis.x = -ax1.gnormx;
                  axis.y = -ax1.gnormy;
                } else {
                  axis.x = ax1.gnormx;
                  axis.y = ax1.gnormy;
                }
                if (best3 >= 0) {
                  const v03 = ax1.gp0;
                  const v14 = ax1.gp1;
                  const q01 = ay1.gp0;
                  const q13 = ay1.gp1;
                  let vx1 = 0.0;
                  let vy1 = 0.0;
                  let qx1 = 0.0;
                  let qy1 = 0.0;
                  vx1 = v14.x - v03.x;
                  vy1 = v14.y - v03.y;
                  qx1 = q13.x - q01.x;
                  qy1 = q13.y - q01.y;
                  const vdot1 = 1 / (vx1 * vx1 + vy1 * vy1);
                  const qdot1 = 1 / (qx1 * qx1 + qy1 * qy1);
                  let t110 = -(vx1 * (v03.x - q01.x) + vy1 * (v03.y - q01.y)) * vdot1;
                  let t210 = -(vx1 * (v03.x - q13.x) + vy1 * (v03.y - q13.y)) * vdot1;
                  let s14 = -(qx1 * (q01.x - v03.x) + qy1 * (q01.y - v03.y)) * qdot1;
                  let s24 = -(qx1 * (q01.x - v14.x) + qy1 * (q01.y - v14.y)) * qdot1;
                  if (t110 < 0) {
                    t110 = 0;
                  } else if (t110 > 1) {
                    t110 = 1;
                  }
                  if (t210 < 0) {
                    t210 = 0;
                  } else if (t210 > 1) {
                    t210 = 1;
                  }
                  if (s14 < 0) {
                    s14 = 0;
                  } else if (s14 > 1) {
                    s14 = 1;
                  }
                  if (s24 < 0) {
                    s24 = 0;
                  } else if (s24 > 1) {
                    s24 = 1;
                  }
                  let f1x1 = 0.0;
                  let f1y1 = 0.0;
                  const t37 = t110;
                  f1x1 = v03.x + vx1 * t37;
                  f1y1 = v03.y + vy1 * t37;
                  let f2x1 = 0.0;
                  let f2y1 = 0.0;
                  const t38 = t210;
                  f2x1 = v03.x + vx1 * t38;
                  f2y1 = v03.y + vy1 * t38;
                  let g1x1 = 0.0;
                  let g1y1 = 0.0;
                  const t39 = s14;
                  g1x1 = q01.x + qx1 * t39;
                  g1y1 = q01.y + qy1 * t39;
                  let g2x1 = 0.0;
                  let g2y1 = 0.0;
                  const t40 = s24;
                  g2x1 = q01.x + qx1 * t40;
                  g2y1 = q01.y + qy1 * t40;
                  let dx4 = 0.0;
                  let dy4 = 0.0;
                  dx4 = f1x1 - q01.x;
                  dy4 = f1y1 - q01.y;
                  let d12 = dx4 * dx4 + dy4 * dy4;
                  let dx5 = 0.0;
                  let dy5 = 0.0;
                  dx5 = f2x1 - q13.x;
                  dy5 = f2y1 - q13.y;
                  const d23 = dx5 * dx5 + dy5 * dy5;
                  let dx6 = 0.0;
                  let dy6 = 0.0;
                  dx6 = g1x1 - v03.x;
                  dy6 = g1y1 - v03.y;
                  let e12 = dx6 * dx6 + dy6 * dy6;
                  let dx7 = 0.0;
                  let dy7 = 0.0;
                  dx7 = g2x1 - v14.x;
                  dy7 = g2y1 - v14.y;
                  const e21 = dx7 * dx7 + dy7 * dy7;
                  let minfx1 = 0.0;
                  let minfy1 = 0.0;
                  let minq1 = null;
                  if (d12 < d23) {
                    minfx1 = f1x1;
                    minfy1 = f1y1;
                    minq1 = q01;
                  } else {
                    minfx1 = f2x1;
                    minfy1 = f2y1;
                    minq1 = q13;
                    d12 = d23;
                  }
                  let mingx1 = 0.0;
                  let mingy1 = 0.0;
                  let minv1 = null;
                  if (e12 < e21) {
                    mingx1 = g1x1;
                    mingy1 = g1y1;
                    minv1 = v03;
                  } else {
                    mingx1 = g2x1;
                    mingy1 = g2y1;
                    minv1 = v14;
                    e12 = e21;
                  }
                  if (d12 < e12) {
                    w11.x = minfx1;
                    w11.y = minfy1;
                    w21.x = minq1.x;
                    w21.y = minq1.y;
                    best3 = Math.sqrt(d12);
                  } else {
                    w21.x = mingx1;
                    w21.y = mingy1;
                    w11.x = minv1.x;
                    w11.y = minv1.y;
                    best3 = Math.sqrt(e12);
                  }
                  if (best3 != 0) {
                    axis.x = w21.x - w11.x;
                    axis.y = w21.y - w11.y;
                    const t41 = 1.0 / best3;
                    axis.x *= t41;
                    axis.y *= t41;
                    if (swapped1) {
                      axis.x = -axis.x;
                      axis.y = -axis.y;
                    }
                  }
                  sep2 = best3;
                } else {
                  let c0x1 = 0.0;
                  let c0y1 = 0.0;
                  c0x1 = ay1.gp0.x;
                  c0y1 = ay1.gp0.y;
                  let c1x1 = 0.0;
                  let c1y1 = 0.0;
                  c1x1 = ay1.gp1.x;
                  c1y1 = ay1.gp1.y;
                  let dvx1 = 0.0;
                  let dvy1 = 0.0;
                  dvx1 = c1x1 - c0x1;
                  dvy1 = c1y1 - c0y1;
                  const d01 = ax1.gnormy * c0x1 - ax1.gnormx * c0y1;
                  const d13 = ax1.gnormy * c1x1 - ax1.gnormx * c1y1;
                  const den1 = 1 / (d13 - d01);
                  const t42 = (-ax1.tp1 - d01) * den1;
                  if (t42 > napeNs.Config.epsilon) {
                    const t43 = t42;
                    c0x1 += dvx1 * t43;
                    c0y1 += dvy1 * t43;
                  }
                  const t44 = (-ax1.tp0 - d13) * den1;
                  if (t44 < -napeNs.Config.epsilon) {
                    const t45 = t44;
                    c1x1 += dvx1 * t45;
                    c1y1 += dvy1 * t45;
                  }
                  const c0d1 = c0x1 * ax1.gnormx + c0y1 * ax1.gnormy - ax1.gprojection;
                  const c1d1 = c1x1 * ax1.gnormx + c1y1 * ax1.gnormy - ax1.gprojection;
                  if (c0d1 < c1d1) {
                    w21.x = c0x1;
                    w21.y = c0y1;
                    const t46 = -c0d1;
                    w11.x = w21.x + ax1.gnormx * t46;
                    w11.y = w21.y + ax1.gnormy * t46;
                    sep2 = c0d1;
                  } else {
                    w21.x = c1x1;
                    w21.y = c1y1;
                    const t47 = -c1d1;
                    w11.x = w21.x + ax1.gnormx * t47;
                    w11.y = w21.y + ax1.gnormy * t47;
                    sep2 = c1d1;
                  }
                }
              } else {
                sep2 = 1e100;
              }
            } else {
              sep2 = 1e100;
            }
          }
        }
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
    let t1;
    if (ZPP_Vec2.zpp_pool == null) {
      t1 = new ZPP_Vec2();
    } else {
      t1 = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = t1.next;
      t1.next = null;
    }
    t1.weak = false;
    let t2;
    if (ZPP_Vec2.zpp_pool == null) {
      t2 = new ZPP_Vec2();
    } else {
      t2 = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = t2.next;
      t2.next = null;
    }
    t2.weak = false;
    let ax;
    if (ZPP_Vec2.zpp_pool == null) {
      ax = new ZPP_Vec2();
    } else {
      ax = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = ax.next;
      ax.next = null;
    }
    ax.weak = false;
    let min = 1e100;
    let cx_ite = b1.shapes.head;
    while (cx_ite != null) {
      const s1 = cx_ite.elt;
      let cx_ite1 = b2.shapes.head;
      while (cx_ite1 != null) {
        const s2 = cx_ite1.elt;
        let s11 = s1;
        let s21 = s2;
        let w11 = t1;
        let w21 = t2;
        let upperBound = min;
        if (upperBound == null) {
          upperBound = 1e100;
        }
        var dist;
        if (s11.type == 0 && s21.type == 0) {
          const c1 = s11.circle;
          const c2 = s21.circle;
          var dist1;
          let nx = 0.0;
          let ny = 0.0;
          nx = c2.worldCOMx - c1.worldCOMx;
          ny = c2.worldCOMy - c1.worldCOMy;
          const len = Math.sqrt(nx * nx + ny * ny);
          dist1 = len - (c1.radius + c2.radius);
          if (dist1 < upperBound) {
            if (len == 0) {
              nx = 1;
              ny = 0;
            } else {
              const t = 1.0 / len;
              nx *= t;
              ny *= t;
            }
            const t3 = c1.radius;
            w11.x = c1.worldCOMx + nx * t3;
            w11.y = c1.worldCOMy + ny * t3;
            const t4 = -c2.radius;
            w21.x = c2.worldCOMx + nx * t4;
            w21.y = c2.worldCOMy + ny * t4;
            ax.x = nx;
            ax.y = ny;
          }
          dist = dist1;
        } else {
          let swapped = false;
          if (s11.type == 0 && s21.type == 1) {
            const tmp = s11;
            s11 = s21;
            s21 = tmp;
            const tmp2 = w11;
            w11 = w21;
            w21 = tmp2;
            swapped = true;
          }
          if (s11.type == 1 && s21.type == 0) {
            const poly = s11.polygon;
            const circle = s21.circle;
            let best = -1e100;
            let a0 = null;
            let cx_ite2 = poly.edges.head;
            while (cx_ite2 != null) {
              const a = cx_ite2.elt;
              const dist2 =
                a.gnormx * circle.worldCOMx +
                a.gnormy * circle.worldCOMy -
                a.gprojection -
                circle.radius;
              if (dist2 > upperBound) {
                best = dist2;
                break;
              }
              if (dist2 > 0) {
                if (dist2 > best) {
                  best = dist2;
                  a0 = a;
                }
              } else if (best < 0 && dist2 > best) {
                best = dist2;
                a0 = a;
              }
              cx_ite2 = cx_ite2.next;
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
                best = len1 - circle.radius;
                if (best < upperBound) {
                  if (len1 == 0) {
                    nx1 = 1;
                    ny1 = 0;
                  } else {
                    const t5 = 1.0 / len1;
                    nx1 *= t5;
                    ny1 *= t5;
                  }
                  const t6 = 0;
                  w11.x = v0.x + nx1 * t6;
                  w11.y = v0.y + ny1 * t6;
                  const t7 = -circle.radius;
                  w21.x = circle.worldCOMx + nx1 * t7;
                  w21.y = circle.worldCOMy + ny1 * t7;
                  ax.x = nx1;
                  ax.y = ny1;
                }
              } else if (dt >= v1.y * a0.gnormx - v1.x * a0.gnormy) {
                let nx2 = 0.0;
                let ny2 = 0.0;
                nx2 = circle.worldCOMx - v1.x;
                ny2 = circle.worldCOMy - v1.y;
                const len2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);
                best = len2 - circle.radius;
                if (best < upperBound) {
                  if (len2 == 0) {
                    nx2 = 1;
                    ny2 = 0;
                  } else {
                    const t8 = 1.0 / len2;
                    nx2 *= t8;
                    ny2 *= t8;
                  }
                  const t9 = 0;
                  w11.x = v1.x + nx2 * t9;
                  w11.y = v1.y + ny2 * t9;
                  const t10 = -circle.radius;
                  w21.x = circle.worldCOMx + nx2 * t10;
                  w21.y = circle.worldCOMy + ny2 * t10;
                  ax.x = nx2;
                  ax.y = ny2;
                }
              } else {
                const t11 = -circle.radius;
                w21.x = circle.worldCOMx + a0.gnormx * t11;
                w21.y = circle.worldCOMy + a0.gnormy * t11;
                const t12 = -best;
                w11.x = w21.x + a0.gnormx * t12;
                w11.y = w21.y + a0.gnormy * t12;
                ax.x = a0.gnormx;
                ax.y = a0.gnormy;
              }
            }
            if (swapped) {
              ax.x = -ax.x;
              ax.y = -ax.y;
            }
            dist = best;
          } else {
            const p1 = s11.polygon;
            const p2 = s21.polygon;
            let best1 = -1e100;
            let a1 = null;
            let a2 = null;
            let besti = 0;
            let cx_ite3 = p1.edges.head;
            while (cx_ite3 != null) {
              const a3 = cx_ite3.elt;
              let min1 = 1e100;
              let cx_ite4 = p2.gverts.next;
              while (cx_ite4 != null) {
                const v = cx_ite4;
                const k = a3.gnormx * v.x + a3.gnormy * v.y;
                if (k < min1) {
                  min1 = k;
                }
                cx_ite4 = cx_ite4.next;
              }
              min1 -= a3.gprojection;
              if (min1 > upperBound) {
                best1 = min1;
                break;
              }
              if (min1 > 0) {
                if (min1 > best1) {
                  best1 = min1;
                  a1 = a3;
                  besti = 1;
                }
              } else if (best1 < 0 && min1 > best1) {
                best1 = min1;
                a1 = a3;
                besti = 1;
              }
              cx_ite3 = cx_ite3.next;
            }
            if (best1 < upperBound) {
              let cx_ite5 = p2.edges.head;
              while (cx_ite5 != null) {
                const a4 = cx_ite5.elt;
                let min2 = 1e100;
                let cx_ite6 = p1.gverts.next;
                while (cx_ite6 != null) {
                  const v2 = cx_ite6;
                  const k1 = a4.gnormx * v2.x + a4.gnormy * v2.y;
                  if (k1 < min2) {
                    min2 = k1;
                  }
                  cx_ite6 = cx_ite6.next;
                }
                min2 -= a4.gprojection;
                if (min2 > upperBound) {
                  best1 = min2;
                  break;
                }
                if (min2 > 0) {
                  if (min2 > best1) {
                    best1 = min2;
                    a2 = a4;
                    besti = 2;
                  }
                } else if (best1 < 0 && min2 > best1) {
                  best1 = min2;
                  a2 = a4;
                  besti = 2;
                }
                cx_ite5 = cx_ite5.next;
              }
              if (best1 < upperBound) {
                var q1;
                var q2;
                var ax1;
                if (besti == 1) {
                  q1 = p1;
                  q2 = p2;
                  ax1 = a1;
                } else {
                  q1 = p2;
                  q2 = p1;
                  ax1 = a2;
                  const tmp1 = w11;
                  w11 = w21;
                  w21 = tmp1;
                  swapped = !swapped;
                }
                let ay = null;
                let min3 = 1e100;
                let cx_ite7 = q2.edges.head;
                while (cx_ite7 != null) {
                  const a5 = cx_ite7.elt;
                  const k2 = ax1.gnormx * a5.gnormx + ax1.gnormy * a5.gnormy;
                  if (k2 < min3) {
                    min3 = k2;
                    ay = a5;
                  }
                  cx_ite7 = cx_ite7.next;
                }
                if (swapped) {
                  ax.x = -ax1.gnormx;
                  ax.y = -ax1.gnormy;
                } else {
                  ax.x = ax1.gnormx;
                  ax.y = ax1.gnormy;
                }
                if (best1 >= 0) {
                  const v01 = ax1.gp0;
                  const v11 = ax1.gp1;
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
                  let t13 = -(vx * (v01.x - q0.x) + vy * (v01.y - q0.y)) * vdot;
                  let t21 = -(vx * (v01.x - q11.x) + vy * (v01.y - q11.y)) * vdot;
                  let s12 = -(qx * (q0.x - v01.x) + qy * (q0.y - v01.y)) * qdot;
                  let s22 = -(qx * (q0.x - v11.x) + qy * (q0.y - v11.y)) * qdot;
                  if (t13 < 0) {
                    t13 = 0;
                  } else if (t13 > 1) {
                    t13 = 1;
                  }
                  if (t21 < 0) {
                    t21 = 0;
                  } else if (t21 > 1) {
                    t21 = 1;
                  }
                  if (s12 < 0) {
                    s12 = 0;
                  } else if (s12 > 1) {
                    s12 = 1;
                  }
                  if (s22 < 0) {
                    s22 = 0;
                  } else if (s22 > 1) {
                    s22 = 1;
                  }
                  let f1x = 0.0;
                  let f1y = 0.0;
                  const t14 = t13;
                  f1x = v01.x + vx * t14;
                  f1y = v01.y + vy * t14;
                  let f2x = 0.0;
                  let f2y = 0.0;
                  const t15 = t21;
                  f2x = v01.x + vx * t15;
                  f2y = v01.y + vy * t15;
                  let g1x = 0.0;
                  let g1y = 0.0;
                  const t16 = s12;
                  g1x = q0.x + qx * t16;
                  g1y = q0.y + qy * t16;
                  let g2x = 0.0;
                  let g2y = 0.0;
                  const t17 = s22;
                  g2x = q0.x + qx * t17;
                  g2y = q0.y + qy * t17;
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
                    w11.x = minfx;
                    w11.y = minfy;
                    w21.x = minq.x;
                    w21.y = minq.y;
                    best1 = Math.sqrt(d1);
                  } else {
                    w21.x = mingx;
                    w21.y = mingy;
                    w11.x = minv.x;
                    w11.y = minv.y;
                    best1 = Math.sqrt(e1);
                  }
                  if (best1 != 0) {
                    ax.x = w21.x - w11.x;
                    ax.y = w21.y - w11.y;
                    const t18 = 1.0 / best1;
                    ax.x *= t18;
                    ax.y *= t18;
                    if (swapped) {
                      ax.x = -ax.x;
                      ax.y = -ax.y;
                    }
                  }
                  dist = best1;
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
                  const d0 = ax1.gnormy * c0x - ax1.gnormx * c0y;
                  const d11 = ax1.gnormy * c1x - ax1.gnormx * c1y;
                  const den = 1 / (d11 - d0);
                  const t19 = (-ax1.tp1 - d0) * den;
                  if (t19 > napeNs.Config.epsilon) {
                    const t20 = t19;
                    c0x += dvx * t20;
                    c0y += dvy * t20;
                  }
                  const t22 = (-ax1.tp0 - d11) * den;
                  if (t22 < -napeNs.Config.epsilon) {
                    const t23 = t22;
                    c1x += dvx * t23;
                    c1y += dvy * t23;
                  }
                  const c0d = c0x * ax1.gnormx + c0y * ax1.gnormy - ax1.gprojection;
                  const c1d = c1x * ax1.gnormx + c1y * ax1.gnormy - ax1.gprojection;
                  if (c0d < c1d) {
                    w21.x = c0x;
                    w21.y = c0y;
                    const t24 = -c0d;
                    w11.x = w21.x + ax1.gnormx * t24;
                    w11.y = w21.y + ax1.gnormy * t24;
                    dist = c0d;
                  } else {
                    w21.x = c1x;
                    w21.y = c1y;
                    const t25 = -c1d;
                    w11.x = w21.x + ax1.gnormx * t25;
                    w11.y = w21.y + ax1.gnormy * t25;
                    dist = c1d;
                  }
                }
              } else {
                dist = upperBound;
              }
            } else {
              dist = upperBound;
            }
          }
        }
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
  static distance(s1: ZPP_Shape, s2: ZPP_Shape, w1: ZPP_Vec2, w2: ZPP_Vec2, axis: ZPP_Vec2, upperBound: number | null) {
    const napeNs = getNape();
    if (upperBound == null) {
      upperBound = 1e100;
    }
    if (s1.type == 0 && s2.type == 0) {
      const c1 = s1.circle;
      const c2 = s2.circle;
      let dist;
      let nx = 0.0;
      let ny = 0.0;
      nx = c2.worldCOMx - c1.worldCOMx;
      ny = c2.worldCOMy - c1.worldCOMy;
      const len = Math.sqrt(nx * nx + ny * ny);
      dist = len - (c1.radius + c2.radius);
      if (dist < upperBound) {
        if (len == 0) {
          nx = 1;
          ny = 0;
        } else {
          const t = 1.0 / len;
          nx *= t;
          ny *= t;
        }
        const t1 = c1.radius;
        w1.x = c1.worldCOMx + nx * t1;
        w1.y = c1.worldCOMy + ny * t1;
        const t2 = -c2.radius;
        w2.x = c2.worldCOMx + nx * t2;
        w2.y = c2.worldCOMy + ny * t2;
        axis.x = nx;
        axis.y = ny;
      }
      return dist;
    } else {
      let swapped = false;
      if (s1.type == 0 && s2.type == 1) {
        const tmp = s1;
        s1 = s2;
        s2 = tmp;
        const tmp2 = w1;
        w1 = w2;
        w2 = tmp2;
        swapped = true;
      }
      if (s1.type == 1 && s2.type == 0) {
        const poly = s1.polygon;
        const circle = s2.circle;
        let best = -1e100;
        let a0 = null;
        let cx_ite = poly.edges.head;
        while (cx_ite != null) {
          const a = cx_ite.elt;
          const dist1 =
            a.gnormx * circle.worldCOMx +
            a.gnormy * circle.worldCOMy -
            a.gprojection -
            circle.radius;
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
            best = len1 - circle.radius;
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
              const t5 = -circle.radius;
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
            best = len2 - circle.radius;
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
              const t8 = -circle.radius;
              w2.x = circle.worldCOMx + nx2 * t8;
              w2.y = circle.worldCOMy + ny2 * t8;
              axis.x = nx2;
              axis.y = ny2;
            }
          } else {
            const t9 = -circle.radius;
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
