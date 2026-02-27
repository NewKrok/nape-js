import { getNape } from "../core/engine";
import { Vec2 } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _registerCircleClass } from "./Shape";

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
    const nape = getNape();
    this._inner = new nape.shape.Circle(
      radius,
      localCOM?._inner,
      material?._inner,
      filter?._inner,
    );
  }

  /** @internal */
  static _wrap(inner: any): Circle {
    if (!inner) return null as unknown as Circle;
    const c = Object.create(Circle.prototype) as Circle;
    c._inner = inner;
    return c;
  }

  get radius(): number {
    return this._inner.get_radius();
  }
  set radius(value: number) {
    this._inner.set_radius(value);
  }
}

// Register with the base Shape class for castCircle support.
_registerCircleClass(Circle);
