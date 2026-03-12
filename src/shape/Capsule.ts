import { Body } from "../phys/Body";
import { BodyType } from "../phys/BodyType";
import { Circle } from "./Circle";
import { Polygon } from "./Polygon";
import { Vec2 } from "../geom/Vec2";
import type { Material } from "../phys/Material";
import type { InteractionFilter } from "../dynamics/InteractionFilter";

/**
 * Capsule shape helper — builds a {@link Body} composed of two {@link Circle}
 * end-caps and a rectangular {@link Polygon} middle section.
 *
 * This is not a new native shape type; it is a convenience factory that
 * assembles standard Circle + Polygon shapes into a capsule geometry.
 *
 * @example
 * ```ts
 * const body = Capsule.create(100, 40);
 * body.position.setxy(300, 200);
 * space.bodies.add(body);
 * ```
 */
export class Capsule {
  private constructor() {
    // Static-only class
  }

  /**
   * Create a capsule-shaped dynamic body centred at the origin.
   *
   * The capsule is oriented **horizontally** (long axis along X).
   * Use `body.rotation` to reorient after creation.
   *
   * @param width  - Total width (tip to tip). Must be &ge; `height`.
   * @param height - Total height (diameter of the end-caps). Must be &gt; 0.
   * @param material - Optional material applied to all three sub-shapes.
   * @param filter   - Optional interaction filter applied to all three sub-shapes.
   * @returns A new dynamic {@link Body} with capsule geometry.
   */
  static create(
    width: number,
    height: number,
    material?: Material,
    filter?: InteractionFilter,
  ): Body {
    if (width !== width || height !== height) {
      throw new Error("Error: Capsule.create cannot accept NaN arguments");
    }
    if (height <= 0) {
      throw new Error("Error: Capsule.create height (" + height + ") must be > 0");
    }
    if (width < height) {
      throw new Error(
        "Error: Capsule.create width (" + width + ") must be >= height (" + height + ")",
      );
    }

    const radius = height / 2;
    const halfLength = (width - height) / 2;
    const body = new Body(BodyType.DYNAMIC);

    // Middle rectangle (only if there is a straight section)
    if (halfLength > 0) {
      const rect = new Polygon(Polygon.box(width - height, height), material, filter);
      body.shapes.add(rect);
    }

    // Left end-cap
    const leftCap = new Circle(radius, Vec2.weak(-halfLength, 0), material, filter);
    body.shapes.add(leftCap);

    // Right end-cap
    const rightCap = new Circle(radius, Vec2.weak(halfLength, 0), material, filter);
    body.shapes.add(rightCap);

    return body;
  }

  /**
   * Create a **vertical** capsule-shaped dynamic body centred at the origin.
   *
   * Equivalent to `Capsule.create(height, width)` with the axes swapped so
   * the long axis runs along Y.
   *
   * @param width  - Total width (diameter of the end-caps). Must be &gt; 0.
   * @param height - Total height (tip to tip). Must be &ge; `width`.
   * @param material - Optional material applied to all three sub-shapes.
   * @param filter   - Optional interaction filter applied to all three sub-shapes.
   * @returns A new dynamic {@link Body} with vertical capsule geometry.
   */
  static createVertical(
    width: number,
    height: number,
    material?: Material,
    filter?: InteractionFilter,
  ): Body {
    if (width !== width || height !== height) {
      throw new Error("Error: Capsule.createVertical cannot accept NaN arguments");
    }
    if (width <= 0) {
      throw new Error("Error: Capsule.createVertical width (" + width + ") must be > 0");
    }
    if (height < width) {
      throw new Error(
        "Error: Capsule.createVertical height (" + height + ") must be >= width (" + width + ")",
      );
    }

    const radius = width / 2;
    const halfLength = (height - width) / 2;
    const body = new Body(BodyType.DYNAMIC);

    // Middle rectangle (only if there is a straight section)
    if (halfLength > 0) {
      const rect = new Polygon(Polygon.box(width, height - width), material, filter);
      body.shapes.add(rect);
    }

    // Top end-cap
    const topCap = new Circle(radius, Vec2.weak(0, -halfLength), material, filter);
    body.shapes.add(topCap);

    // Bottom end-cap
    const bottomCap = new Circle(radius, Vec2.weak(0, halfLength), material, filter);
    body.shapes.add(bottomCap);

    return body;
  }
}
