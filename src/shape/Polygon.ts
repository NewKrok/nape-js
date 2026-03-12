import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _bindPolygonWrap } from "./Shape";
import { ZPP_Polygon } from "../native/shape/ZPP_Polygon";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import { ZPP_Material } from "../native/phys/ZPP_Material";
import { ZPP_InteractionFilter } from "../native/dynamics/ZPP_InteractionFilter";

/**
 * A convex polygon physics shape.
 */
export class Polygon extends Shape {
  /** @internal */
  zpp_inner_zn!: ZPP_Polygon;

  /**
   * Create a Polygon from a list of Vec2 vertices. Vertices must form a convex polygon
   * in counter-clockwise order.
   * @param localVerts - Vertices as `Array<Vec2>`, `Vec2List`, or `GeomPoly`.
   * @param material - Material to assign (uses default if omitted).
   * @param filter - InteractionFilter to assign (uses default if omitted).
   */
  constructor(localVerts?: Vec2[] | any, material?: Material, filter?: InteractionFilter) {
    super();

    const nape = getNape();

    if (localVerts == null) {
      throw new Error("Error: localVerts cannot be null");
    }

    const zpp = new ZPP_Polygon();
    this.zpp_inner_zn = zpp;
    (this as any).zpp_inner = zpp;
    this.zpp_inner_i = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;
    zpp.outer_i = this;
    (this as Writable<Polygon>)._inner = this as any;

    // --- Process vertex inputs ---
    if (Array.isArray(localVerts)) {
      for (const v of localVerts) {
        if (v == null) {
          throw new Error("Error: Array<Vec2> contains null objects");
        }
        if (!(v instanceof Vec2)) {
          throw new Error("Error: Array<Vec2> contains non Vec2 objects");
        }
        if ((v as any).zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        if (zpp.wrap_lverts == null) zpp.getlverts();
        const inner = v.zpp_inner;
        if (inner._validate != null) inner._validate();
        const x = inner.x;
        if (inner._validate != null) inner._validate();
        const y = inner.y;
        const copy = new Vec2(x, y);
        zpp.wrap_lverts.push(copy);
      }
      // Dispose weak input vertices
      for (let i = localVerts.length - 1; i >= 0; i--) {
        if (localVerts[i].zpp_inner?.weak) {
          localVerts[i].dispose();
          localVerts.splice(i, 1);
        }
      }
    } else if (localVerts instanceof nape.geom.Vec2List) {
      // Vec2List input
      const list = localVerts;
      const iter = list.iterator();
      while (true) {
        iter.zpp_inner.zpp_inner.valmod();
        const length = iter.zpp_inner.zpp_gl();
        iter.zpp_critical = true;
        if (iter.zpp_i >= length) {
          iter.zpp_next = nape.geom.Vec2Iterator.zpp_pool;
          nape.geom.Vec2Iterator.zpp_pool = iter;
          iter.zpp_inner = null;
          break;
        }
        iter.zpp_critical = false;
        const v = iter.zpp_inner.at(iter.zpp_i++);
        if (v == null) {
          throw new Error("Error: Vec2List contains null objects");
        }
        if (v.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        if (zpp.wrap_lverts == null) zpp.getlverts();
        const inner = v.zpp_inner;
        if (inner._validate != null) inner._validate();
        const x = inner.x;
        if (inner._validate != null) inner._validate();
        const y = inner.y;
        const copy = new Vec2(x, y);
        zpp.wrap_lverts.push(copy);
      }
      // Dispose weak vertices from input list
      if (list.zpp_inner._validate != null) list.zpp_inner._validate();
      const ins = list.zpp_inner.inner;
      let pre: any = null;
      let cur = ins.head;
      while (cur != null) {
        const vv = cur.elt;
        if (vv.outer?.zpp_inner?.weak) {
          cur = ins.erase(pre);
          if (vv.outer.zpp_inner.weak) {
            vv.outer.dispose();
          }
        } else {
          pre = cur;
          cur = cur.next;
        }
      }
    } else if (localVerts instanceof nape.geom.GeomPoly) {
      // GeomPoly input
      const verts = localVerts.zpp_inner.vertices;
      if (verts != null) {
        let vite = verts;
        do {
          if (zpp.wrap_lverts == null) zpp.getlverts();
          const copy = new Vec2(vite.x, vite.y);
          zpp.wrap_lverts.push(copy);
          vite = vite.next;
        } while (vite !== verts);
      }
    } else {
      throw new Error(
        "Error: Invalid type for polygon object, should be Array<Vec2>, Vec2List, GeomPoly or for flash10+ flash.Vector<Vec2>",
      );
    }

    // --- Handle material ---
    if (material == null) {
      if (ZPP_Material.zpp_pool != null) {
        zpp.material = ZPP_Material.zpp_pool;
        ZPP_Material.zpp_pool = zpp.material.next;
        zpp.material.next = null;
      } else {
        zpp.material = new ZPP_Material();
      }
    } else {
      zpp.immutable_midstep("Shape::material");
      zpp.setMaterial((material as any).zpp_inner);
      zpp.material.wrapper();
    }

    // --- Handle filter ---
    if (filter == null) {
      if (ZPP_InteractionFilter.zpp_pool != null) {
        zpp.filter = ZPP_InteractionFilter.zpp_pool;
        ZPP_InteractionFilter.zpp_pool = zpp.filter.next;
        zpp.filter.next = null;
      } else {
        zpp.filter = new ZPP_InteractionFilter();
      }
    } else {
      zpp.immutable_midstep("Shape::filter");
      zpp.setFilter((filter as any).zpp_inner);
      zpp.filter.wrapper();
    }

    // --- Register ANY_SHAPE callback type ---
    zpp.insert_cbtype((ZPP_CbType as any).ANY_SHAPE.zpp_inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Polygon {
    if (!inner) return null as unknown as Polygon;
    if (inner instanceof Polygon) return inner;
    if (inner instanceof ZPP_Polygon) {
      return getOrCreate(inner, (zpp: ZPP_Polygon) => {
        const p = Object.create(Polygon.prototype) as Polygon;
        p.zpp_inner_zn = zpp;
        (p as any).zpp_inner = zpp;
        p.zpp_inner_i = zpp;
        zpp.outer = p;
        zpp.outer_zn = p;
        zpp.outer_i = p;
        (p as Writable<Polygon>)._inner = p as any;
        return p;
      });
    }
    if (inner.zpp_inner_zn) return Polygon._wrap(inner.zpp_inner_zn);
    return getOrCreate(inner, (raw: any) => {
      const p = Object.create(Polygon.prototype) as Polygon;
      (p as Writable<Polygon>)._inner = raw;
      p.zpp_inner_i = raw.zpp_inner_i;
      return p;
    });
  }

  // ---------------------------------------------------------------------------
  // Static factory methods
  // ---------------------------------------------------------------------------

  /**
   * Create an axis-aligned rectangle at the given position.
   * @param x - Left edge x coordinate.
   * @param y - Top edge y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   * @param weak - If true, returned Vec2s are marked weak and will be auto-disposed.
   * @returns Array of four Vec2 corner vertices.
   */
  static rect(x: number, y: number, width: number, height: number, weak: boolean = false): Vec2[] {
    if (x !== x || y !== y || width !== width || height !== height) {
      throw new Error("Error: Polygon.rect cannot accept NaN arguments");
    }
    const v1 = new Vec2(x, y);
    v1.zpp_inner.weak = weak;
    const v2 = new Vec2(x + width, y);
    v2.zpp_inner.weak = weak;
    const v3 = new Vec2(x + width, y + height);
    v3.zpp_inner.weak = weak;
    const v4 = new Vec2(x, y + height);
    v4.zpp_inner.weak = weak;
    return [v1, v2, v3, v4];
  }

  /**
   * Create an axis-aligned rectangular polygon centred at the origin.
   * @param width - Rectangle width.
   * @param height - Rectangle height (defaults to `width` for a square).
   * @param weak - If true, returned Vec2s are marked weak and will be auto-disposed.
   * @returns Array of four Vec2 corner vertices.
   */
  static box(width: number, height: number = width, weak: boolean = false): Vec2[] {
    if (width !== width || height !== height) {
      throw new Error("Error: Polygon.box cannot accept NaN arguments");
    }
    return Polygon.rect(-width / 2, -height / 2, width, height, weak);
  }

  /**
   * Create a regular polygon (or ellipse approximation) centred at the origin.
   * @param xRadius - Horizontal radius of the circumscribed ellipse.
   * @param yRadius - Vertical radius of the circumscribed ellipse.
   * @param edgeCount - Number of sides (must be >= 3).
   * @param angleOffset - Rotation offset in radians applied to all vertices (default 0).
   * @param weak - If true, returned Vec2s are marked weak and will be auto-disposed.
   * @returns Array of `edgeCount` Vec2 vertices.
   */
  static regular(
    xRadius: number,
    yRadius: number,
    edgeCount: number,
    angleOffset: number = 0.0,
    weak: boolean = false,
  ): Vec2[] {
    if (xRadius !== xRadius || yRadius !== yRadius || angleOffset !== angleOffset) {
      throw new Error("Error: Polygon.regular cannot accept NaN arguments");
    }
    const result: Vec2[] = [];
    const dangle = (Math.PI * 2) / edgeCount;
    for (let i = 0; i < edgeCount; i++) {
      const ang = i * dangle + angleOffset;
      const vx = Math.cos(ang) * xRadius;
      const vy = Math.sin(ang) * yRadius;
      const v = new Vec2(vx, vy);
      v.zpp_inner.weak = weak;
      result.push(v);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Properties — direct ZPP_Polygon access
  // ---------------------------------------------------------------------------

  /** The list of local-space vertices defining this polygon's shape. */
  get localVerts(): any {
    if (this.zpp_inner_zn.wrap_lverts == null) {
      this.zpp_inner_zn.getlverts();
    }
    return this.zpp_inner_zn.wrap_lverts;
  }

  /** World-space vertices of this polygon, updated each simulation step. */
  get worldVerts(): any {
    if (this.zpp_inner_zn.wrap_gverts == null) {
      this.zpp_inner_zn.getgverts();
    }
    return this.zpp_inner_zn.wrap_gverts;
  }

  /** The list of edges derived from this polygon's vertices. */
  get edges(): any {
    if (this.zpp_inner_zn.wrap_edges == null) {
      this.zpp_inner_zn.getedges();
    }
    return this.zpp_inner_zn.wrap_edges;
  }

  /**
   * Validate the polygon geometry and return a string describing any issues, or
   * `"valid"` if the polygon is well-formed.
   * @returns A validation result string from the underlying ZPP_Polygon.
   */
  validity(): any {
    return this.zpp_inner_zn.valid();
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------

// Bind Polygon._wrap into Shape so Shape._wrap can dispatch without circular import.
_bindPolygonWrap((inner) => Polygon._wrap(inner));

const nape = getNape();
nape.shape.Polygon = Polygon;
