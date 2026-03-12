import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _bindCapsuleWrap } from "./Shape";
import { ZPP_Capsule } from "../native/shape/ZPP_Capsule";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import { ZPP_Material } from "../native/phys/ZPP_Material";
import { ZPP_InteractionFilter } from "../native/dynamics/ZPP_InteractionFilter";
import { ZPP_Const } from "../native/util/ZPP_Const";

/**
 * A capsule physics shape — a line segment with a radius (stadium geometry).
 *
 * Geometrically equivalent to a rectangle with two semicircular end-caps.
 * The spine runs along the **local X-axis** through localCOM.
 *
 * - Total width  = 2 * (halfLength + radius)
 * - Total height = 2 * radius
 *
 * @example
 * ```ts
 * const cap = new Capsule(100, 40); // width=100, height=40
 * body.shapes.add(cap);
 * ```
 */
export class Capsule extends Shape {
  /** @internal */
  zpp_inner_zn!: ZPP_Capsule;

  /**
   * Create a capsule with the given total width and height.
   *
   * @param width  - Total width (tip to tip). Must be >= height.
   * @param height - Total height (diameter of the end-caps). Must be > 0.
   * @param localCOM - Local centre offset (defaults to origin).
   * @param material - Material to assign (uses default if omitted).
   * @param filter - InteractionFilter to assign (uses default if omitted).
   */
  constructor(
    width: number = 100,
    height: number = 40,
    localCOM?: Vec2,
    material?: Material,
    filter?: InteractionFilter,
  ) {
    super();

    const nape = getNape();

    // Validate
    if (width !== width || height !== height) {
      throw new Error("Error: Capsule dimensions cannot be NaN");
    }
    if (height <= 0) {
      throw new Error("Error: Capsule height (" + height + ") must be > 0");
    }
    if (width < height) {
      throw new Error("Error: Capsule width (" + width + ") must be >= height (" + height + ")");
    }

    const radius = height / 2;
    const halfLength = (width - height) / 2;

    const zpp = new ZPP_Capsule();
    this.zpp_inner_zn = zpp;
    (this as any).zpp_inner = zpp;
    this.zpp_inner_i = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;
    zpp.outer_i = this;

    // _inner = this so Shape-level methods work
    (this as Writable<Capsule>)._inner = this as any;

    // --- Set radius ---
    if (radius < nape.Config.epsilon) {
      throw new Error("Error: Capsule radius (" + radius + ") must be > Config.epsilon");
    }
    if (radius > ZPP_Const.FMAX) {
      throw new Error("Error: Capsule radius (" + radius + ") must be < PR(Const).FMAX");
    }
    zpp.radius = radius;
    zpp.halfLength = halfLength;
    zpp.invalidate_radius();
    if (halfLength > 0) {
      zpp.invalidate_halfLength();
    }

    // --- Handle localCOM ---
    if (localCOM != null) {
      if ((localCOM as any).zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const inner = localCOM.zpp_inner;
      if (inner._validate != null) inner._validate();
      zpp.localCOMx = inner.x;
      if (inner._validate != null) inner._validate();
      zpp.localCOMy = inner.y;
      if (inner.weak) {
        localCOM.dispose();
      }
    } else {
      zpp.localCOMx = 0;
      zpp.localCOMy = 0;
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
  static _wrap(inner: NapeInner): Capsule {
    if (!inner) return null as unknown as Capsule;
    if (inner instanceof Capsule) return inner;
    if (inner instanceof ZPP_Capsule) {
      return getOrCreate(inner, (zpp: ZPP_Capsule) => {
        const c = Object.create(Capsule.prototype) as Capsule;
        c.zpp_inner_zn = zpp;
        (c as any).zpp_inner = zpp;
        c.zpp_inner_i = zpp;
        zpp.outer = c;
        zpp.outer_zn = c;
        zpp.outer_i = c;
        (c as Writable<Capsule>)._inner = c as any;
        return c;
      });
    }
    // Handle compiled objects (has zpp_inner_zn → extract ZPP_Capsule)
    if (inner.zpp_inner_zn) return Capsule._wrap(inner.zpp_inner_zn);
    // Fallback: wrap compiled inner directly
    return getOrCreate(inner, (raw) => {
      const c = Object.create(Capsule.prototype) as Capsule;
      (c as Writable<Capsule>)._inner = raw;
      c.zpp_inner_i = raw.zpp_inner_i;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** The capsule's end-cap radius (half the height). Must be > 0. */
  get radius(): number {
    return this.zpp_inner_zn.radius;
  }
  set radius(value: number) {
    const zpp = this.zpp_inner_zn;
    const nape = getNape();
    (this as any).zpp_inner.immutable_midstep("Capsule::radius");
    if (zpp.body != null && zpp.body.type === 1 && zpp.body.space != null) {
      throw new Error(
        "Error: Cannot modify radius of Capsule contained in static object once added to space",
      );
    }
    if (value !== zpp.radius) {
      if (value !== value) {
        throw new Error("Error: Capsule::radius cannot be NaN");
      }
      if (value < nape.Config.epsilon) {
        throw new Error("Error: Capsule::radius (" + value + ") must be > Config.epsilon");
      }
      if (value > ZPP_Const.FMAX) {
        throw new Error("Error: Capsule::radius (" + value + ") must be < PR(Const).FMAX");
      }
      zpp.radius = value;
      zpp.invalidate_radius();
    }
  }

  /** Half the spine length. Total width = 2 * (halfLength + radius). */
  get halfLength(): number {
    return this.zpp_inner_zn.halfLength;
  }
  set halfLength(value: number) {
    const zpp = this.zpp_inner_zn;
    (this as any).zpp_inner.immutable_midstep("Capsule::halfLength");
    if (zpp.body != null && zpp.body.type === 1 && zpp.body.space != null) {
      throw new Error(
        "Error: Cannot modify halfLength of Capsule contained in static object once added to space",
      );
    }
    if (value !== zpp.halfLength) {
      if (value !== value) {
        throw new Error("Error: Capsule::halfLength cannot be NaN");
      }
      if (value < 0) {
        throw new Error("Error: Capsule::halfLength (" + value + ") must be >= 0");
      }
      zpp.halfLength = value;
      zpp.invalidate_halfLength();
    }
  }

  /** Total width of the capsule (tip to tip). */
  get width(): number {
    return 2 * (this.zpp_inner_zn.halfLength + this.zpp_inner_zn.radius);
  }

  /** Total height of the capsule (diameter of end-caps). */
  get height(): number {
    return 2 * this.zpp_inner_zn.radius;
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------

// Bind Capsule._wrap into Shape so Shape._wrap can dispatch without circular import.
_bindCapsuleWrap((inner) => Capsule._wrap(inner));

const nape = getNape();
nape.shape.Capsule = Capsule;
