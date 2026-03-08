import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _bindCircleWrap } from "./Shape";
import { ZPP_Circle } from "../native/shape/ZPP_Circle";
import { ZPP_CbType } from "../native/callbacks/ZPP_CbType";
import { ZPP_Material } from "../native/phys/ZPP_Material";
import { ZPP_InteractionFilter } from "../native/dynamics/ZPP_InteractionFilter";
import { ZPP_Const } from "../native/util/ZPP_Const";


/**
 * A circular physics shape.
 *
 * Fully modernized — constructor and radius getter/setter use ZPP_Circle
 * directly. Shape-level properties still delegate through compiled Shape
 * prototype methods (copied to Circle.prototype at module load time).
 */
export class Circle extends Shape {
  static __name__ = ["nape", "shape", "Circle"];
  static __super__: any = Shape;

  /** Direct access to the extracted internal ZPP_Circle. */
  zpp_inner_zn!: ZPP_Circle;

  constructor(
    radius: number = 50,
    localCOM?: Vec2,
    material?: Material,
    filter?: InteractionFilter,
  ) {
    super();

    const nape = getNape();
    const zpp = new ZPP_Circle();
    this.zpp_inner_zn = zpp;
    (this as any).zpp_inner = zpp;
    this.zpp_inner_i = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;
    zpp.outer_i = this;

    // _inner = this so Shape-level methods (via compiled prototype) work
    (this as Writable<Circle>)._inner = this as any;

    // --- Validate and set radius ---
    if (radius !== zpp.radius) {
      if (radius !== radius) {
        throw new Error("Error: Circle::radius cannot be NaN");
      }
      if (radius < nape.Config.epsilon) {
        throw new Error(
          "Error: Circle::radius (" + radius + ") must be > Config.epsilon",
        );
      }
      if (radius > ZPP_Const.FMAX) {
        throw new Error(
          "Error: Circle::radius (" + radius + ") must be < PR(Const).FMAX",
        );
      }
      zpp.radius = radius;
      zpp.invalidate_radius();
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
  static _wrap(inner: NapeInner): Circle {
    if (!inner) return null as unknown as Circle;
    if (inner instanceof Circle) return inner;
    if (inner instanceof ZPP_Circle) {
      return getOrCreate(inner, (zpp: ZPP_Circle) => {
        const c = Object.create(Circle.prototype) as Circle;
        c.zpp_inner_zn = zpp;
        (c as any).zpp_inner = zpp;
        c.zpp_inner_i = zpp;
        zpp.outer = c;
        zpp.outer_zn = c;
        zpp.outer_i = c;
        (c as Writable<Circle>)._inner = c as any;
        return c;
      });
    }
    // Handle compiled objects (has zpp_inner_zn → extract ZPP_Circle)
    if (inner.zpp_inner_zn) return Circle._wrap(inner.zpp_inner_zn);
    // Fallback: wrap compiled inner directly
    return getOrCreate(inner, (raw) => {
      const c = Object.create(Circle.prototype) as Circle;
      (c as Writable<Circle>)._inner = raw;
      c.zpp_inner_i = raw.zpp_inner_i;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties — direct ZPP_Circle access
  // ---------------------------------------------------------------------------

  get radius(): number {
    return this.zpp_inner_zn.radius;
  }
  set radius(value: number) {
    const zpp = this.zpp_inner_zn;
    const nape = getNape();
    (this as any).zpp_inner.immutable_midstep("Circle::radius");
    if (zpp.body != null && zpp.body.type === 1 && zpp.body.space != null) {
      throw new Error(
        "Error: Cannot modifiy radius of Circle contained in static object once added to space",
      );
    }
    if (value !== zpp.radius) {
      if (value !== value) {
        throw new Error("Error: Circle::radius cannot be NaN");
      }
      if (value < nape.Config.epsilon) {
        throw new Error(
          "Error: Circle::radius (" + value + ") must be > Config.epsilon",
        );
      }
      if (value > ZPP_Const.FMAX) {
        throw new Error(
          "Error: Circle::radius (" + value + ") must be < PR(Const).FMAX",
        );
      }
      zpp.radius = value;
      zpp.invalidate_radius();
    }
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------

// Bind Circle._wrap into Shape so Shape._wrap can dispatch without circular import.
_bindCircleWrap((inner) => Circle._wrap(inner));

const nape = getNape();
nape.shape.Circle = Circle;

