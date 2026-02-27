import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _bindCircleWrap } from "./Shape";

/**
 * A circular physics shape.
 */
export class Circle extends Shape {
  constructor(
    radius: number = 50,
    localCOM?: Vec2,
    material?: Material,
    filter?: InteractionFilter,
  ) {
    super();
    (this as Writable<Circle>)._inner = new (getNape().shape.Circle)(
      radius,
      localCOM?._inner,
      material?._inner,
      filter?._inner,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): Circle {
    return getOrCreate(inner, (raw) => {
      const c = Object.create(Circle.prototype) as Circle;
      (c as Writable<Circle>)._inner = raw;
      return c;
    });
  }

  get radius(): number {
    return this._inner.get_radius();
  }
  set radius(value: number) {
    this._inner.set_radius(value);
  }
}

// Bind Circle._wrap into Shape so Shape._wrap can dispatch without circular import.
_bindCircleWrap((inner) => Circle._wrap(inner));
