/**
 * ZPP_Polygon — Internal polygon shape for the nape physics engine.
 *
 * Extends ZPP_Shape (type=1). Manages vertex rings (local/world),
 * edge lists, validation, and polygon-specific physics calculations.
 *
 * Converted from nape-compiled.js lines 42176–43786.
 */

import { ZPP_Edge } from "./ZPP_Edge";

export class ZPP_Polygon {
  // --- Static: Haxe metadata ---

  // --- Static: namespace references ---
  static _nape: any = null;
  static _zpp: any = null;

  // --- Static: init guard ---
  static _initialized = false;

  // --- Instance: polygon-specific ---
  outer_zn: any = null;
  lverts: any = null;
  wrap_lverts: any = null;
  gverts: any = null;
  wrap_gverts: any = null;
  edges: any = null;
  wrap_edges: any = null;
  edgeCnt = 0;
  reverse_flag = false;

  // --- Instance: dirty flags ---
  zip_lverts = false;
  zip_laxi = false;
  zip_gverts = false;
  zip_gaxi = false;
  zip_valid = false;
  zip_sanitation = false;
  validation: any = null;

  // --- Stub declarations for methods inherited from ZPP_Shape/ZPP_Interactor ---
  body: any;
  type!: number;
  circle: any;
  polygon: any;
  aabb: any;
  localCOMx!: number;
  localCOMy!: number;
  worldCOMx!: number;
  worldCOMy!: number;
  zip_localCOM!: boolean;
  zip_worldCOM!: boolean;
  zip_aabb!: boolean;
  zip_sweepRadius!: boolean;
  zip_area_inertia!: boolean;
  zip_angDrag!: boolean;
  area!: number;
  inertia!: number;
  angDrag!: number;
  sweepCoef!: number;
  sweepRadius!: number;
  material: any;
  filter: any;
  wrap_localCOM: any;
  outer: any;
  outer_i: any;
  invalidate_area_inertia!: () => void;
  invalidate_angDrag!: () => void;
  invalidate_localCOM!: () => void;
  invalidate_worldCOM!: () => void;
  validate_area_inertia!: () => void;
  validate_localCOM!: () => void;
  immutable_midstep!: (name: string) => void;
  wake!: () => void;
  setMaterial!: (m: any) => void;
  setFilter!: (f: any) => void;
  insert_cbtype!: (cb: any) => void;

  constructor() {
    this.zip_sanitation = false;
    this.zip_valid = false;
    this.zip_gaxi = false;
    this.zip_gverts = false;
    this.zip_laxi = false;
    this.zip_lverts = false;
    this.reverse_flag = false;
    this.edgeCnt = 0;
    this.wrap_edges = null;
    this.edges = null;
    this.wrap_gverts = null;
    this.gverts = null;
    this.wrap_lverts = null;
    this.lverts = null;
    this.outer_zn = null;

    const zpp = ZPP_Polygon._zpp;
    // Call ZPP_Shape initializer (type=1 for polygon)
    (this as any)._initShape(1);
    this.polygon = this;
    this.lverts = new zpp.geom.ZPP_Vec2();
    this.gverts = new zpp.geom.ZPP_Vec2();
    this.edges = new zpp.util.ZNPList_ZPP_Edge();
    this.edgeCnt = 0;
  }

  static _init(): void {
    if (ZPP_Polygon._initialized) return;
    ZPP_Polygon._initialized = true;

    const zpp = ZPP_Polygon._zpp;

    const srcProto = zpp.shape.ZPP_Shape.prototype;
    const dstProto = ZPP_Polygon.prototype as any;

    // Copy enumerable inherited properties (e.g., ZPP_Interactor methods)
    for (const k in srcProto) {
      if (!Object.prototype.hasOwnProperty.call(dstProto, k)) {
        dstProto[k] = srcProto[k];
      }
    }
    // Copy non-enumerable own properties (TS class methods like _initShape)
    for (const k of Object.getOwnPropertyNames(srcProto)) {
      if (k !== "constructor" && !Object.prototype.hasOwnProperty.call(dstProto, k)) {
        dstProto[k] = srcProto[k];
      }
    }
  }

  // --- No-op clear ---
  __clear(): void {}

  // --- Vertex list callbacks ---

  lverts_pa_invalidate(_x: any): void {
    this.invalidate_lverts();
  }

  lverts_pa_immutable(): void {
    if (this.body != null && this.body.type === 1 && this.body.space != null) {
      throw new Error(
        "Error: Cannot modify local vertex of Polygon added to a static body whilst within a Space",
      );
    }
  }

  gverts_pa_validate(): void {
    if (this.body == null) {
      throw new Error(
        "Error: World vertex only makes sense when Polygon is contained in a rigid body",
      );
    }
    this._validateGverts();
  }

  lverts_post_adder(x: any): void {
    const zpp = ZPP_Polygon._zpp;
    x.zpp_inner._invalidate = this.lverts_pa_invalidate.bind(this);
    x.zpp_inner._isimmutable = this.lverts_pa_immutable.bind(this);

    let ite: any = null;
    let ite2: any = null;
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      if (cx_ite === x.zpp_inner) {
        break;
      } else {
        ite = ite == null ? this.gverts.next : ite.next;
        ite2 = ite2 == null ? this.edges.head : ite2.next;
      }
      cx_ite = cx_ite.next;
    }

    // Allocate a gvert
    let vec: any;
    if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
      vec = new zpp.geom.ZPP_Vec2();
    } else {
      vec = zpp.geom.ZPP_Vec2.zpp_pool;
      zpp.geom.ZPP_Vec2.zpp_pool = vec.next;
      vec.next = null;
    }
    vec.weak = false;
    vec._immutable = true;
    vec.x = 0;
    vec.y = 0;
    this.gverts.insert(ite, vec);

    if (this.lverts.next.next != null) {
      if (this.lverts.next.next.next == null) {
        // Going from 1 to 2 verts — add 2 edges
        let ed: ZPP_Edge;
        if (ZPP_Edge.zpp_pool == null) {
          ed = new ZPP_Edge();
        } else {
          ed = ZPP_Edge.zpp_pool;
          ZPP_Edge.zpp_pool = ed.next;
          ed.next = null;
        }
        ed.polygon = this;
        this.edges.add(ed);
        let ed1: ZPP_Edge;
        if (ZPP_Edge.zpp_pool == null) {
          ed1 = new ZPP_Edge();
        } else {
          ed1 = ZPP_Edge.zpp_pool;
          ZPP_Edge.zpp_pool = ed1.next;
          ed1.next = null;
        }
        ed1.polygon = this;
        this.edges.add(ed1);
        this.edgeCnt += 2;
      } else {
        // More than 2 verts — insert one edge
        let ed2: ZPP_Edge;
        if (ZPP_Edge.zpp_pool == null) {
          ed2 = new ZPP_Edge();
        } else {
          ed2 = ZPP_Edge.zpp_pool;
          ZPP_Edge.zpp_pool = ed2.next;
          ed2.next = null;
        }
        ed2.polygon = this;
        this.edges.insert(ite2, ed2);
        this.edgeCnt++;
      }
    }
    vec._validate = this.gverts_pa_validate.bind(this);
  }

  lverts_subber(x: any): void {
    this.cleanup_lvert(x.zpp_inner);
  }

  lverts_invalidate(_: any): void {
    this.invalidate_lverts();
  }

  lverts_validate(): void {
    this.validate_lverts();
  }

  lverts_modifiable(): void {
    this.immutable_midstep("Polygon::localVerts");
    if (this.body != null && this.body.type === 1 && this.body.space != null) {
      throw new Error("Error: Cannot modifiy shapes of static object once added to Space");
    }
  }

  gverts_validate(): void {
    this._validateGverts();
  }

  edges_validate(): void {
    this.validate_lverts();
  }

  // --- List wrapper setup ---

  getlverts(): void {
    const zpp = ZPP_Polygon._zpp;
    this.wrap_lverts = zpp.util.ZPP_MixVec2List.get(this.lverts);
    this.wrap_lverts.zpp_inner.post_adder = this.lverts_post_adder.bind(this);
    this.wrap_lverts.zpp_inner.subber = this.lverts_subber.bind(this);
    this.wrap_lverts.zpp_inner._invalidate = this.lverts_invalidate.bind(this);
    this.wrap_lverts.zpp_inner._validate = this.lverts_validate.bind(this);
    this.wrap_lverts.zpp_inner._modifiable = this.lverts_modifiable.bind(this);
    this.wrap_lverts.zpp_inner.reverse_flag = this.reverse_flag;
  }

  getgverts(): void {
    const zpp = ZPP_Polygon._zpp;
    this.wrap_gverts = zpp.util.ZPP_MixVec2List.get(this.gverts, true);
    this.wrap_gverts.zpp_inner.reverse_flag = this.reverse_flag;
    this.wrap_gverts.zpp_inner._validate = this.gverts_validate.bind(this);
  }

  getedges(): void {
    const zpp = ZPP_Polygon._zpp;
    this.wrap_edges = zpp.util.ZPP_EdgeList.get(this.edges, true);
    this.wrap_edges.zpp_inner.reverse_flag = this.reverse_flag;
    this.wrap_edges.zpp_inner._validate = this.edges_validate.bind(this);
  }

  // --- Invalidation ---

  invalidate_lverts(): void {
    this.invalidate_laxi();
    this.invalidate_area_inertia();
    this.invalidate_angDrag();
    this.invalidate_localCOM();
    this.invalidate_gverts();
    this.zip_lverts = true;
    this.zip_valid = true;
    this.zip_sanitation = true;
    if (this.body != null) {
      this.body.wake();
    }
  }

  invalidate_laxi(): void {
    this.invalidate_gaxi();
    this.zip_sweepRadius = true;
    this.zip_laxi = true;
  }

  invalidate_gverts(): void {
    this.zip_aabb = true;
    if (this.body != null) {
      this.body.zip_aabb = true;
    }
    this.zip_gverts = true;
  }

  invalidate_gaxi(): void {
    this.zip_gaxi = true;
  }

  // --- Validation ---

  validate_lverts(): void {
    if (this.zip_lverts) {
      this.zip_lverts = false;
      if (this.lverts.length > 2) {
        this.validate_area_inertia();
        if (this.area < 0) {
          this.reverse_vertices();
          this.area = -this.area;
        }
      }
    }
  }

  validate_laxi(): void {
    if (this.zip_laxi) {
      this.zip_laxi = false;
      this.validate_lverts();
      const ite_start = this.edges.head;
      let ite = ite_start;
      let cx_ite = this.lverts.next;
      let u = cx_ite;
      cx_ite = cx_ite.next;
      while (cx_ite != null) {
        const v = cx_ite;
        const edge = ite.elt;
        ite = ite.next;
        edge.lp0 = u;
        edge.lp1 = v;
        let dx = u.x - v.x;
        let dy = u.y - v.y;
        const l = Math.sqrt(dx * dx + dy * dy);
        edge.length = l;
        const inv = 1.0 / l;
        dx *= inv;
        dy *= inv;
        const t = dx;
        dx = -dy;
        dy = t;
        edge.lprojection = dx * u.x + dy * u.y;
        edge.lnormx = dx;
        edge.lnormy = dy;
        if (edge.wrap_lnorm != null) {
          edge.wrap_lnorm.zpp_inner.x = dx;
          edge.wrap_lnorm.zpp_inner.y = dy;
        }
        u = v;
        cx_ite = cx_ite.next;
      }
      // Last edge wraps around
      const v1 = this.lverts.next;
      const edge1 = ite.elt;
      edge1.lp0 = u;
      edge1.lp1 = v1;
      let dx1 = u.x - v1.x;
      let dy1 = u.y - v1.y;
      const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      edge1.length = l1;
      const inv1 = 1.0 / l1;
      dx1 *= inv1;
      dy1 *= inv1;
      const t1 = dx1;
      dx1 = -dy1;
      dy1 = t1;
      edge1.lprojection = dx1 * u.x + dy1 * u.y;
      edge1.lnormx = dx1;
      edge1.lnormy = dy1;
      if (edge1.wrap_lnorm != null) {
        edge1.wrap_lnorm.zpp_inner.x = dx1;
        edge1.wrap_lnorm.zpp_inner.y = dy1;
      }
    }
  }

  validate_gverts(): void {
    this._validateGverts();
  }

  validate_gaxi(): void {
    if (this.zip_gaxi) {
      if (this.body != null) {
        this.zip_gaxi = false;
        this.validate_laxi();
        const body = this.body;
        if (body.zip_axis) {
          body.zip_axis = false;
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        }
        this._validateGverts();
        // Update world edge data
        let ite = this.edges.head;
        let cx_ite = this.gverts.next;
        let u = cx_ite;
        cx_ite = cx_ite.next;
        while (cx_ite != null) {
          const v = cx_ite;
          const e = ite.elt;
          ite = ite.next;
          e.gp0 = u;
          e.gp1 = v;
          e.gnormx = body.axisy * e.lnormx - body.axisx * e.lnormy;
          e.gnormy = e.lnormx * body.axisx + e.lnormy * body.axisy;
          e.gprojection = body.posx * e.gnormx + body.posy * e.gnormy + e.lprojection;
          if (e.wrap_gnorm != null) {
            e.wrap_gnorm.zpp_inner.x = e.gnormx;
            e.wrap_gnorm.zpp_inner.y = e.gnormy;
          }
          e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
          e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
          u = v;
          cx_ite = cx_ite.next;
        }
        // Last edge wraps
        const v1 = this.gverts.next;
        const e1 = ite.elt;
        e1.gp0 = u;
        e1.gp1 = v1;
        e1.gnormx = body.axisy * e1.lnormx - body.axisx * e1.lnormy;
        e1.gnormy = e1.lnormx * body.axisx + e1.lnormy * body.axisy;
        e1.gprojection = body.posx * e1.gnormx + body.posy * e1.gnormy + e1.lprojection;
        if (e1.wrap_gnorm != null) {
          e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
          e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
        }
        e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
        e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
      }
    }
  }

  /** Internal helper: recompute world vertex positions from local verts + body transform */
  private _validateGverts(): void {
    if (this.zip_gverts) {
      if (this.body != null) {
        this.zip_gverts = false;
        this.validate_lverts();
        const body = this.body;
        if (body.zip_axis) {
          body.zip_axis = false;
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        }
        let li = this.lverts.next;
        let cx_ite = this.gverts.next;
        while (cx_ite != null) {
          const g = cx_ite;
          const l = li;
          li = li.next;
          g.x = body.posx + (body.axisy * l.x - body.axisx * l.y);
          g.y = body.posy + (l.x * body.axisx + l.y * body.axisy);
          cx_ite = cx_ite.next;
        }
      }
    }
  }

  // --- Vertex cleanup ---
  cleanup_lvert(x: any): void {
    const zpp = ZPP_Polygon._zpp;
    let ite: any = null;
    let ite2: any = null;
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      if (cx_ite === x) {
        break;
      } else {
        ite = ite == null ? this.gverts.next : ite.next;
        ite2 = ite2 == null ? this.edges.head : ite2.next;
      }
      cx_ite = cx_ite.next;
    }
    const rem = ite == null ? this.gverts.next : ite.next;
    this.gverts.erase(ite);
    // Pool the removed gvert
    const o = rem;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o._isimmutable = null;
    o._validate = null;
    o._invalidate = null;
    o.next = zpp.geom.ZPP_Vec2.zpp_pool;
    zpp.geom.ZPP_Vec2.zpp_pool = o;

    if (this.edgeCnt === 2) {
      // Remove both edges when going below 2 verts
      let rem1 = this.edges.pop_unsafe();
      rem1.polygon = null;
      rem1.next = ZPP_Edge.zpp_pool;
      ZPP_Edge.zpp_pool = rem1;
      rem1 = this.edges.pop_unsafe();
      rem1.polygon = null;
      rem1.next = ZPP_Edge.zpp_pool;
      ZPP_Edge.zpp_pool = rem1;
      this.edgeCnt = 0;
    } else if (this.edgeCnt !== 0) {
      const rem2 = ite2 == null ? this.edges.head.elt : ite2.next.elt;
      this.edges.erase(ite2);
      rem2.polygon = null;
      rem2.next = ZPP_Edge.zpp_pool;
      ZPP_Edge.zpp_pool = rem2;
      this.edgeCnt--;
    }
  }

  // --- Collinear vertex removal ---
  splice_collinear(): void {
    if (this.zip_sanitation) {
      this.zip_sanitation = false;
      this.splice_collinear_real();
    }
  }

  splice_collinear_real(): void {
    const nape = ZPP_Polygon._nape;
    if (this.lverts.next == null) return;
    if (this.lverts.next.next == null) return;
    if (this.lverts.next.next.next == null) return;

    // Remove duplicate vertices
    let pre: any = null;
    let cur = this.lverts.next;
    while (cur != null) {
      const nxt = cur.next == null ? this.lverts.next : cur.next;
      const dx = cur.x - nxt.x;
      const dy = cur.y - nxt.y;
      if (dx * dx + dy * dy < nape.Config.epsilon * nape.Config.epsilon) {
        this.cleanup_lvert(cur);
        cur = this.lverts.erase(pre);
      } else {
        pre = cur;
        cur = cur.next;
      }
    }
    if (this.lverts.next == null) return;

    // Remove collinear vertices
    let removed: boolean;
    while (true) {
      removed = false;
      let pre1 = this.lverts.next;
      while (pre1 != null) {
        const cur1 = pre1.next == null ? this.lverts.next : pre1.next;
        const nxt1 = cur1.next == null ? this.lverts.next : cur1.next;
        const ax = cur1.x - pre1.x;
        const ay = cur1.y - pre1.y;
        const bx = nxt1.x - cur1.x;
        const by = nxt1.y - cur1.y;
        const crs = by * ax - bx * ay;
        if (crs * crs >= nape.Config.epsilon * nape.Config.epsilon) {
          pre1 = pre1.next;
        } else {
          this.cleanup_lvert(cur1);
          this.lverts.erase(pre1.next == null ? null : pre1);
          removed = true;
          pre1 = pre1.next;
        }
      }
      if (!removed) break;
    }
  }

  reverse_vertices(): void {
    this.lverts.reverse();
    this.gverts.reverse();
    this.edges.reverse();
    const ite = this.edges.iterator_at(this.edgeCnt - 1);
    const elem = this.edges.pop_unsafe();
    this.edges.insert(ite, elem);
    this.reverse_flag = !this.reverse_flag;
    if (this.wrap_lverts != null) {
      this.wrap_lverts.zpp_inner.reverse_flag = this.reverse_flag;
    }
    if (this.wrap_gverts != null) {
      this.wrap_gverts.zpp_inner.reverse_flag = this.reverse_flag;
    }
    if (this.wrap_edges != null) {
      this.wrap_edges.zpp_inner.reverse_flag = this.reverse_flag;
    }
  }

  // --- Validity check ---
  valid(): any {
    const nape = ZPP_Polygon._nape;
    const zpp = ZPP_Polygon._zpp;
    if (this.zip_valid) {
      this.zip_valid = false;
      if (this.zip_sanitation) {
        this.zip_sanitation = false;
        this.splice_collinear_real();
      }
      if (this.lverts.length < 3) {
        if (zpp.util.ZPP_Flags.ValidationResult_DEGENERATE == null) {
          zpp.util.ZPP_Flags.internal = true;
          zpp.util.ZPP_Flags.ValidationResult_DEGENERATE = new nape.shape.ValidationResult();
          zpp.util.ZPP_Flags.internal = false;
        }
        return (this.validation = zpp.util.ZPP_Flags.ValidationResult_DEGENERATE);
      } else {
        this.validate_lverts();
        this.validate_area_inertia();
        if (this.area < nape.Config.epsilon) {
          if (zpp.util.ZPP_Flags.ValidationResult_DEGENERATE == null) {
            zpp.util.ZPP_Flags.internal = true;
            zpp.util.ZPP_Flags.ValidationResult_DEGENERATE = new nape.shape.ValidationResult();
            zpp.util.ZPP_Flags.internal = false;
          }
          return (this.validation = zpp.util.ZPP_Flags.ValidationResult_DEGENERATE);
        } else {
          // Check convexity
          let neg = false;
          let pos = false;
          let cx_cont = true;
          let cx_ite = this.lverts.next;
          let u = cx_ite;
          cx_ite = cx_ite.next;
          let v = cx_ite;
          cx_ite = cx_ite.next;
          while (cx_ite != null) {
            const w = cx_ite;
            const ax = w.x - v.x;
            const ay = w.y - v.y;
            const bx = v.x - u.x;
            const by = v.y - u.y;
            const dot = by * ax - bx * ay;
            if (dot > nape.Config.epsilon) {
              pos = true;
            } else if (dot < -nape.Config.epsilon) {
              neg = true;
            }
            if (pos && neg) {
              cx_cont = false;
              break;
            }
            u = v;
            v = w;
            cx_ite = cx_ite.next;
          }
          if (cx_cont) {
            // Check wrap-around edges
            cx_ite = this.lverts.next;
            const w1 = cx_ite;
            const ax1 = w1.x - v.x;
            const ay1 = w1.y - v.y;
            const bx1 = v.x - u.x;
            const by1 = v.y - u.y;
            const dot1 = by1 * ax1 - bx1 * ay1;
            if (dot1 > nape.Config.epsilon) {
              pos = true;
            } else if (dot1 < -nape.Config.epsilon) {
              neg = true;
            }
            if (!(pos && neg)) {
              u = v;
              v = w1;
              cx_ite = cx_ite.next;
              const w2 = cx_ite;
              const ax2 = w2.x - v.x;
              const ay2 = w2.y - v.y;
              const bx2 = v.x - u.x;
              const by2 = v.y - u.y;
              const dot2 = by2 * ax2 - bx2 * ay2;
              if (dot2 > nape.Config.epsilon) {
                pos = true;
              } else if (dot2 < -nape.Config.epsilon) {
                neg = true;
              }
            }
          }
          if (pos && neg) {
            if (zpp.util.ZPP_Flags.ValidationResult_CONCAVE == null) {
              zpp.util.ZPP_Flags.internal = true;
              zpp.util.ZPP_Flags.ValidationResult_CONCAVE = new nape.shape.ValidationResult();
              zpp.util.ZPP_Flags.internal = false;
            }
            return (this.validation = zpp.util.ZPP_Flags.ValidationResult_CONCAVE);
          } else {
            // Check self-intersection
            let cont = true;
            let cx_ite1 = this.lverts.next;
            let u1 = cx_ite1;
            cx_ite1 = cx_ite1.next;
            while (cx_ite1 != null && cont) {
              const v1 = cx_ite1;
              let a = this.lverts.next;
              let cx_ite2_next = a.next;
              while (cx_ite2_next != null && cont) {
                const b = cx_ite2_next;
                if (u1 !== a && u1 !== b && v1 !== a && v1 !== b) {
                  cont = this._checkNoIntersection(u1, v1, a, b, nape);
                }
                a = b;
                cx_ite2_next = cx_ite2_next.next;
              }
              // Wrap around last edge
              if (cont) {
                const b = this.lverts.next;
                if (u1 !== a && u1 !== b && v1 !== a && v1 !== b) {
                  cont = this._checkNoIntersection(u1, v1, a, b, nape);
                }
              }
              u1 = v1;
              cx_ite1 = cx_ite1.next;
            }
            // Check last edge (u1 → lverts.next) against all
            if (cont) {
              const v2 = this.lverts.next;
              let a1 = this.lverts.next;
              let cx_ite3_next = a1.next;
              while (cx_ite3_next != null && cont) {
                const b1 = cx_ite3_next;
                if (u1 !== a1 && u1 !== b1 && v2 !== a1 && v2 !== b1) {
                  cont = this._checkNoIntersection(u1, v2, a1, b1, nape);
                }
                a1 = b1;
                cx_ite3_next = cx_ite3_next.next;
              }
              if (cont) {
                const b2 = this.lverts.next;
                if (u1 !== a1 && u1 !== b2 && v2 !== a1 && v2 !== b2) {
                  cont = this._checkNoIntersection(u1, v2, a1, b2, nape);
                }
              }
            }
            if (!cont) {
              if (zpp.util.ZPP_Flags.ValidationResult_SELF_INTERSECTING == null) {
                zpp.util.ZPP_Flags.internal = true;
                zpp.util.ZPP_Flags.ValidationResult_SELF_INTERSECTING =
                  new nape.shape.ValidationResult();
                zpp.util.ZPP_Flags.internal = false;
              }
              return (this.validation = zpp.util.ZPP_Flags.ValidationResult_SELF_INTERSECTING);
            } else {
              if (zpp.util.ZPP_Flags.ValidationResult_VALID == null) {
                zpp.util.ZPP_Flags.internal = true;
                zpp.util.ZPP_Flags.ValidationResult_VALID = new nape.shape.ValidationResult();
                zpp.util.ZPP_Flags.internal = false;
              }
              return (this.validation = zpp.util.ZPP_Flags.ValidationResult_VALID);
            }
          }
        }
      }
    } else {
      return this.validation;
    }
  }

  /** Helper: check if two edges (u1→v1) and (a→b) do NOT intersect */
  private _checkNoIntersection(u1: any, v1: any, a: any, b: any, nape: any): boolean {
    const sx = u1.x - a.x;
    const sy = u1.y - a.y;
    const vx = v1.x - u1.x;
    const vy = v1.y - u1.y;
    const qx = b.x - a.x;
    const qy = b.y - a.y;
    let den = vy * qx - vx * qy;
    if (den * den > nape.Config.epsilon) {
      den = 1 / den;
      const t = (qy * sx - qx * sy) * den;
      if (t > nape.Config.epsilon && t < 1 - nape.Config.epsilon) {
        const s = (vy * sx - vx * sy) * den;
        if (s > nape.Config.epsilon && s < 1 - nape.Config.epsilon) {
          return false; // intersection found
        }
      }
    }
    return true; // no intersection
  }

  // --- Override / virtual methods from ZPP_Shape ---

  __validate_aabb(): void {
    this._validateGverts();
    if (this.lverts.next == null) {
      throw new Error("Error: An empty polygon has no meaningful bounds");
    }
    const p0 = this.gverts.next;
    this.aabb.minx = p0.x;
    this.aabb.miny = p0.y;
    this.aabb.maxx = p0.x;
    this.aabb.maxy = p0.y;
    let cx_ite = this.gverts.next.next;
    while (cx_ite != null) {
      const p = cx_ite;
      if (p.x < this.aabb.minx) this.aabb.minx = p.x;
      if (p.x > this.aabb.maxx) this.aabb.maxx = p.x;
      if (p.y < this.aabb.miny) this.aabb.miny = p.y;
      if (p.y > this.aabb.maxy) this.aabb.maxy = p.y;
      cx_ite = cx_ite.next;
    }
  }

  _force_validate_aabb(): void {
    const body = this.body;
    let li = this.lverts.next;
    const p0 = this.gverts.next;
    const l = li;
    li = li.next;
    p0.x = body.posx + (body.axisy * l.x - body.axisx * l.y);
    p0.y = body.posy + (l.x * body.axisx + l.y * body.axisy);
    this.aabb.minx = p0.x;
    this.aabb.miny = p0.y;
    this.aabb.maxx = p0.x;
    this.aabb.maxy = p0.y;
    let cx_ite = this.gverts.next.next;
    while (cx_ite != null) {
      const p = cx_ite;
      const l1 = li;
      li = li.next;
      p.x = body.posx + (body.axisy * l1.x - body.axisx * l1.y);
      p.y = body.posy + (l1.x * body.axisx + l1.y * body.axisy);
      if (p.x < this.aabb.minx) this.aabb.minx = p.x;
      if (p.x > this.aabb.maxx) this.aabb.maxx = p.x;
      if (p.y < this.aabb.miny) this.aabb.miny = p.y;
      if (p.y > this.aabb.maxy) this.aabb.maxy = p.y;
      cx_ite = cx_ite.next;
    }
  }

  __validate_sweepRadius(): void {
    let maxRadius = 0;
    let minRadius = 0;
    this.validate_laxi();
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      const x = cx_ite;
      const r = x.x * x.x + x.y * x.y;
      if (r > maxRadius) maxRadius = r;
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = this.edges.head;
    while (cx_ite1 != null) {
      const e = cx_ite1.elt;
      if (e.lprojection < minRadius) {
        minRadius = e.lprojection;
        if (minRadius < 0) break;
      }
      cx_ite1 = cx_ite1.next;
    }
    if (minRadius < 0) minRadius = 0;
    this.sweepRadius = Math.sqrt(maxRadius);
    this.sweepCoef = this.sweepRadius - minRadius;
  }

  __validate_area_inertia(): void {
    if (
      this.lverts.next == null ||
      this.lverts.next.next == null ||
      this.lverts.next.next.next == null
    ) {
      this.area = 0;
      this.inertia = 0;
    } else {
      this.area = 0;
      let s1 = 0;
      let s2 = 0;
      let cx_ite = this.lverts.next;
      let u = cx_ite;
      cx_ite = cx_ite.next;
      let v = cx_ite;
      cx_ite = cx_ite.next;
      while (cx_ite != null) {
        const w = cx_ite;
        const a = v.y * u.x - v.x * u.y;
        const b = v.x * v.x + v.y * v.y + (v.x * u.x + v.y * u.y) + (u.x * u.x + u.y * u.y);
        s1 += a * b;
        s2 += a;
        this.area += v.x * (w.y - u.y);
        u = v;
        v = w;
        cx_ite = cx_ite.next;
      }
      // Wrap-around edges
      cx_ite = this.lverts.next;
      const w1 = cx_ite;
      let a1 = v.y * u.x - v.x * u.y;
      let b1 = v.x * v.x + v.y * v.y + (v.x * u.x + v.y * u.y) + (u.x * u.x + u.y * u.y);
      s1 += a1 * b1;
      s2 += a1;
      this.area += v.x * (w1.y - u.y);
      u = v;
      v = w1;
      cx_ite = cx_ite.next;
      const w2 = cx_ite;
      a1 = v.y * u.x - v.x * u.y;
      b1 = v.x * v.x + v.y * v.y + (v.x * u.x + v.y * u.y) + (u.x * u.x + u.y * u.y);
      s1 += a1 * b1;
      s2 += a1;
      this.area += v.x * (w2.y - u.y);
      this.inertia = s1 / (6 * s2);
      this.area *= 0.5;
      if (this.area < 0) {
        this.area = -this.area;
        this.reverse_vertices();
      }
    }
  }

  __validate_angDrag(): void {
    const nape = ZPP_Polygon._nape;
    if (this.lverts.length < 3) {
      throw new Error("Error: Polygon's with less than 3 vertices have no meaningful angDrag");
    }
    this.validate_area_inertia();
    this.validate_laxi();
    let accum = 0;
    let ei = this.edges.head;
    let perim = 0;
    const cx_ite = this.lverts.next;
    let u = cx_ite;
    let cx_itej = cx_ite.next;
    while (cx_itej != null) {
      const v = cx_itej;
      const edge = ei.elt;
      ei = ei.next;
      perim += edge.length;
      const dx = v.x - u.x;
      const dy = v.y - u.y;
      accum +=
        edge.length *
        nape.Config.fluidAngularDragFriction *
        this.material.dynamicFriction *
        edge.lprojection *
        edge.lprojection;
      const t = -(u.y * edge.lnormx - u.x * edge.lnormy) / (dy * edge.lnormx - dx * edge.lnormy);
      if (t > 0) {
        const ta = t > 1 ? 1 : t;
        let cx = u.x;
        let cy = u.y;
        cx += dx * ta;
        cy += dy * ta;
        const dota = edge.lnormy * u.x - edge.lnormx * u.y;
        const dotb = edge.lnormy * cx - edge.lnormx * cy;
        const dots = (dotb * dotb * dotb - dota * dota * dota) / (3 * (dotb - dota));
        accum += dots * ta * edge.length * nape.Config.fluidAngularDrag;
      }
      if (t < 1) {
        const tb = t < 0 ? 0 : t;
        let cx1 = u.x;
        let cy1 = u.y;
        cx1 += dx * tb;
        cy1 += dy * tb;
        const dota1 = edge.lnormy * cx1 - edge.lnormx * cy1;
        const dotb1 = edge.lnormy * v.x - edge.lnormx * v.y;
        const dots1 = (dotb1 * dotb1 * dotb1 - dota1 * dota1 * dota1) / (3 * (dotb1 - dota1));
        accum +=
          dots1 *
          nape.Config.fluidVacuumDrag *
          (1 - tb) *
          edge.length *
          nape.Config.fluidAngularDrag;
      }
      u = v;
      cx_itej = cx_itej.next;
    }
    // Last edge wraps around
    {
      const v1 = this.lverts.next;
      const edge1 = ei.elt;
      perim += edge1.length;
      const dx1 = v1.x - u.x;
      const dy1 = v1.y - u.y;
      accum +=
        edge1.length *
        nape.Config.fluidAngularDragFriction *
        this.material.dynamicFriction *
        edge1.lprojection *
        edge1.lprojection;
      const t3 =
        -(u.y * edge1.lnormx - u.x * edge1.lnormy) / (dy1 * edge1.lnormx - dx1 * edge1.lnormy);
      if (t3 > 0) {
        const ta1 = t3 > 1 ? 1 : t3;
        let cx2 = u.x;
        let cy2 = u.y;
        cx2 += dx1 * ta1;
        cy2 += dy1 * ta1;
        const dota2 = edge1.lnormy * u.x - edge1.lnormx * u.y;
        const dotb2 = edge1.lnormy * cx2 - edge1.lnormx * cy2;
        const dots2 = (dotb2 * dotb2 * dotb2 - dota2 * dota2 * dota2) / (3 * (dotb2 - dota2));
        accum += dots2 * ta1 * edge1.length * nape.Config.fluidAngularDrag;
      }
      if (t3 < 1) {
        const tb1 = t3 < 0 ? 0 : t3;
        let cx3 = u.x;
        let cy3 = u.y;
        cx3 += dx1 * tb1;
        cy3 += dy1 * tb1;
        const dota3 = edge1.lnormy * cx3 - edge1.lnormx * cy3;
        const dotb3 = edge1.lnormy * v1.x - edge1.lnormx * v1.y;
        const dots3 = (dotb3 * dotb3 * dotb3 - dota3 * dota3 * dota3) / (3 * (dotb3 - dota3));
        accum +=
          dots3 *
          nape.Config.fluidVacuumDrag *
          (1 - tb1) *
          edge1.length *
          nape.Config.fluidAngularDrag;
      }
    }
    this.angDrag = accum / (this.inertia * perim);
  }

  __validate_localCOM(): void {
    if (this.lverts.next == null) {
      throw new Error("Error: An empty polygon has no meaningful localCOM");
    }
    if (this.lverts.next.next == null) {
      this.localCOMx = this.lverts.next.x;
      this.localCOMy = this.lverts.next.y;
    } else if (this.lverts.next.next.next == null) {
      this.localCOMx = this.lverts.next.x;
      this.localCOMy = this.lverts.next.y;
      this.localCOMx += this.lverts.next.next.x;
      this.localCOMy += this.lverts.next.next.y;
      this.localCOMx *= 0.5;
      this.localCOMy *= 0.5;
    } else {
      this.localCOMx = 0;
      this.localCOMy = 0;
      let area = 0;
      let cx_ite = this.lverts.next;
      let u = cx_ite;
      cx_ite = cx_ite.next;
      let v = cx_ite;
      cx_ite = cx_ite.next;
      while (cx_ite != null) {
        const w = cx_ite;
        area += v.x * (w.y - u.y);
        const cf = w.y * v.x - w.x * v.y;
        this.localCOMx += (v.x + w.x) * cf;
        this.localCOMy += (v.y + w.y) * cf;
        u = v;
        v = w;
        cx_ite = cx_ite.next;
      }
      // Wrap around
      cx_ite = this.lverts.next;
      const w1 = cx_ite;
      area += v.x * (w1.y - u.y);
      let cf1 = w1.y * v.x - w1.x * v.y;
      this.localCOMx += (v.x + w1.x) * cf1;
      this.localCOMy += (v.y + w1.y) * cf1;
      u = v;
      v = w1;
      cx_ite = cx_ite.next;
      const w2 = cx_ite;
      area += v.x * (w2.y - u.y);
      cf1 = w2.y * v.x - w2.x * v.y;
      this.localCOMx += (v.x + w2.x) * cf1;
      this.localCOMy += (v.y + w2.y) * cf1;
      area = 1 / (3 * area);
      this.localCOMx *= area;
      this.localCOMy *= area;
    }
  }

  localCOM_validate(): void {
    if (this.lverts.next == null) {
      throw new Error("Error: An empty polygon does not have any meaningful localCOM");
    }
    this.validate_localCOM();
  }

  localCOM_invalidate(x: any): void {
    this.validate_localCOM();
    const delx = x.x - this.localCOMx;
    const dely = x.y - this.localCOMy;
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      cx_ite.x += delx;
      cx_ite.y += dely;
      cx_ite = cx_ite.next;
    }
    this.invalidate_lverts();
  }

  setupLocalCOM(): void {
    const zpp = ZPP_Polygon._zpp;
    const nape = ZPP_Polygon._nape;
    const x = this.localCOMx;
    const y = this.localCOMy;
    if (x !== x || y !== y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1: any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp.geom.ZPP_Vec2();
      } else {
        ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      ret.zpp_inner.x = x;
      ret.zpp_inner.y = y;
    }
    ret.zpp_inner.weak = false;
    this.wrap_localCOM = ret;
    this.wrap_localCOM.zpp_inner._inuse = true;
    this.wrap_localCOM.zpp_inner._validate = this.localCOM_validate.bind(this);
    this.wrap_localCOM.zpp_inner._invalidate = this.localCOM_invalidate.bind(this);
  }

  // --- Transform methods ---

  __translate(dx: number, dy: number): void {
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      cx_ite.x += dx;
      cx_ite.y += dy;
      cx_ite = cx_ite.next;
    }
    this.invalidate_lverts();
  }

  __scale(sx: number, sy: number): void {
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      cx_ite.x *= sx;
      cx_ite.y *= sy;
      cx_ite = cx_ite.next;
    }
    this.invalidate_lverts();
  }

  __rotate(ax: number, ay: number): void {
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      const tempx = ay * cx_ite.x - ax * cx_ite.y;
      const tempy = cx_ite.x * ax + cx_ite.y * ay;
      cx_ite.x = tempx;
      cx_ite.y = tempy;
      cx_ite = cx_ite.next;
    }
    this.invalidate_lverts();
  }

  __transform(mat: any): void {
    let cx_ite = this.lverts.next;
    while (cx_ite != null) {
      const t = mat.zpp_inner.a * cx_ite.x + mat.zpp_inner.b * cx_ite.y + mat.zpp_inner.tx;
      cx_ite.y = mat.zpp_inner.c * cx_ite.x + mat.zpp_inner.d * cx_ite.y + mat.zpp_inner.ty;
      cx_ite.x = t;
      cx_ite = cx_ite.next;
    }
    this.invalidate_lverts();
  }

  __copy(): any {
    const nape = ZPP_Polygon._nape;
    if (this.outer_zn.zpp_inner_zn.wrap_lverts == null) {
      this.outer_zn.zpp_inner_zn.getlverts();
    }
    // Convert Vec2List to Array<Vec2> since the compiled Polygon constructor's
    // Vec2List branch was removed during list extraction.
    const lverts = this.outer_zn.zpp_inner_zn.wrap_lverts;
    const arr: any[] = [];
    const iter = lverts.iterator();
    while (iter.hasNext()) {
      arr.push(iter.next());
    }
    const ret = new nape.shape.Polygon(arr).zpp_inner_zn;
    return ret;
  }
}
