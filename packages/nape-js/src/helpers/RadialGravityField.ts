import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import type { Space } from "../space/Space";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Falloff law for {@link RadialGravityField}.
 *
 * - `"inverse-square"` — `F = strength / d²` (Newtonian gravity, default)
 * - `"inverse"` — `F = strength / d` (line-source gravity)
 * - `"constant"` — `F = strength` (constant pull regardless of distance)
 * - `(distance) => number` — custom multiplier, applied as `F = strength * fn(d)`
 */
export type GravityFalloff =
  "inverse-square" | "inverse" | "constant" | ((distance: number) => number);

/** Per-body filter — `false` skips the body. */
export type BodyFilter = (body: Body) => boolean;

/** Configuration options for {@link RadialGravityField}. */
export interface RadialGravityFieldOptions {
  /**
   * The field's anchor point. May be a `Vec2` (fixed world position — captured
   * by reference, so mutating it after construction moves the field), or a
   * `Body` (the field tracks `body.position` automatically each step).
   */
  source: Vec2 | Body;

  /** Field strength scaling — units depend on `falloff` (see {@link GravityFalloff}). */
  strength: number;

  /** Falloff law. @default `"inverse-square"` */
  falloff?: GravityFalloff;

  /** Multiply the resulting force by `body.mass` (Newtonian gravity). @default `true` */
  scaleByMass?: boolean;

  /**
   * Bodies farther than this from the source receive zero force — useful for
   * bounded gravity wells with hard edges.
   * @default `Infinity`
   */
  maxRadius?: number;

  /**
   * Distance values used in the falloff calculation are clamped to be at
   * least this — prevents singularities at the source center.
   * @default `1`
   */
  minRadius?: number;

  /**
   * Softening epsilon added to `d²` for the inverse-square falloff (smooths
   * out near-source spikes without disabling the pull). Has no effect on
   * other falloff laws.
   * @default `0`
   */
  softening?: number;

  /**
   * Predicate deciding which bodies the field affects. `null` (default)
   * means "all dynamic bodies". Static and kinematic bodies are always
   * skipped (forces have no effect on them anyway).
   * @default `null`
   */
  bodyFilter?: BodyFilter | null;

  /** When `false`, calls to {@link RadialGravityField.apply} are no-ops. @default `true` */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// RadialGravityField
// ---------------------------------------------------------------------------

/**
 * A point-source gravity field — pulls bodies toward an anchor with a chosen
 * falloff law.
 *
 * Replaces the manual `for (body of space.bodies) body.force = ...` loops
 * commonly written for orbital / planet / multi-body gravity scenarios.
 * Multiple fields compose naturally via {@link RadialGravityFieldGroup} or
 * by calling `apply()` on each one in sequence — each call **adds** to the
 * existing accumulated force, so userland `body.force` writes are preserved.
 *
 * @example
 * ```ts
 * // Mario-Galaxy-style planet pulling everything toward its center
 * const planet = new Body(BodyType.STATIC, new Vec2(400, 300));
 * planet.shapes.add(new Circle(40));
 * planet.space = space;
 *
 * const field = new RadialGravityField({
 *   source: planet,
 *   strength: 800000,
 *   maxRadius: 250,
 *   softening: 100,
 * });
 *
 * // Each frame, BEFORE space.step():
 * field.apply(space);
 * space.step(1 / 60);
 * ```
 */
export class RadialGravityField {
  source: Vec2 | Body;
  strength: number;
  falloff: GravityFalloff;
  scaleByMass: boolean;
  maxRadius: number;
  minRadius: number;
  softening: number;
  bodyFilter: BodyFilter | null;
  enabled: boolean;

  constructor(options: RadialGravityFieldOptions) {
    if (options == null) {
      throw new Error("options is required");
    }
    if (options.source == null) {
      throw new Error("options.source is required (Vec2 or Body)");
    }
    if (typeof options.strength !== "number" || !isFinite(options.strength)) {
      throw new Error("options.strength must be a finite number");
    }

    this.source = options.source;
    this.strength = options.strength;
    this.falloff = options.falloff ?? "inverse-square";
    this.scaleByMass = options.scaleByMass ?? true;
    this.maxRadius = options.maxRadius ?? Infinity;
    this.minRadius = options.minRadius ?? 1;
    this.softening = options.softening ?? 0;
    this.bodyFilter = options.bodyFilter ?? null;
    this.enabled = options.enabled ?? true;

    if (this.maxRadius < 0) {
      throw new Error("options.maxRadius must be >= 0");
    }
    if (this.minRadius < 0) {
      throw new Error("options.minRadius must be >= 0");
    }
    if (this.softening < 0) {
      throw new Error("options.softening must be >= 0");
    }
  }

  /**
   * Current world-space center of the field.
   *
   * Returns the anchor's `(x, y)` — for a `Body` source this reflects the
   * body's current position each call, so the field automatically tracks
   * a moving anchor.
   */
  getPosition(): { x: number; y: number } {
    if (this.source instanceof Body) {
      const p = this.source.position;
      return { x: p.x, y: p.y };
    }
    return { x: this.source.x, y: this.source.y };
  }

  /**
   * Compute (but do not apply) the force this field would exert on `body`
   * given its current position. Returns `(0, 0)` when the field is disabled,
   * the body is static, the body is filtered out, or the body is outside
   * `maxRadius`.
   *
   * The returned `Vec2` is fresh and owned by the caller.
   */
  forceOn(body: Body): Vec2 {
    if (!this.enabled) return new Vec2(0, 0);
    if (!body.isDynamic()) return new Vec2(0, 0);
    if (this.bodyFilter && !this.bodyFilter(body)) return new Vec2(0, 0);

    const src = this.getPosition();
    const dx = src.x - body.position.x;
    const dy = src.y - body.position.y;
    const d2raw = dx * dx + dy * dy;
    const draw = Math.sqrt(d2raw);

    if (draw > this.maxRadius) return new Vec2(0, 0);

    // Clamp distance for the falloff calc so things stay finite at d ≈ 0.
    const dClamped = Math.max(draw, this.minRadius);

    // Magnitude of the force (before mass scaling).
    let f: number;
    switch (this.falloff) {
      case "inverse-square": {
        const d2 = dClamped * dClamped + this.softening;
        f = this.strength / d2;
        break;
      }
      case "inverse":
        f = this.strength / dClamped;
        break;
      case "constant":
        f = this.strength;
        break;
      default:
        // Custom falloff function — receives the actual (non-clamped) distance
        // so user code can decide for itself how to handle near-zero values,
        // but we still pass clamped distance for safety.
        f = this.strength * (this.falloff as (d: number) => number)(dClamped);
        break;
    }

    if (this.scaleByMass) f *= body.mass;

    // Direction: from body toward source. Use raw distance (not clamped) for
    // the unit vector when possible; if the body is exactly at the source
    // (d ≈ 0), the direction is undefined and we return zero force.
    if (draw < 1e-9) return new Vec2(0, 0);
    const inv = 1 / draw;
    return new Vec2(f * dx * inv, f * dy * inv);
  }

  /**
   * Add this field's force contribution to every eligible body in `space`.
   *
   * Adds to (does not replace) each body's existing accumulated force, so
   * multiple fields and userland force writes all stack naturally. Call
   * once per frame, before `space.step()`.
   */
  apply(space: Space): void {
    if (!this.enabled) return;
    const bodies = space.bodies;
    const n = bodies.length;
    for (let i = 0; i < n; i++) {
      const body = bodies.at(i);
      if (!body.isDynamic()) continue;
      if (this.bodyFilter && !this.bodyFilter(body)) continue;
      const f = this.forceOn(body);
      if (f.x === 0 && f.y === 0) continue;
      const cur = body.force;
      body.force = new Vec2(cur.x + f.x, cur.y + f.y);
    }
  }
}

// ---------------------------------------------------------------------------
// RadialGravityFieldGroup
// ---------------------------------------------------------------------------

/**
 * A composable collection of {@link RadialGravityField} instances. Calling
 * `apply()` runs every member field once — convenient for multi-source
 * scenarios (binary stars, three-body, planet platformers).
 */
export class RadialGravityFieldGroup {
  /** Ordered list of fields. Mutate via {@link add} / {@link remove}. */
  readonly fields: RadialGravityField[] = [];

  /** Add a field to the group and return it. */
  add(field: RadialGravityField): RadialGravityField {
    this.fields.push(field);
    return field;
  }

  /** Remove a field from the group. Returns `true` if it was present. */
  remove(field: RadialGravityField): boolean {
    const i = this.fields.indexOf(field);
    if (i < 0) return false;
    this.fields.splice(i, 1);
    return true;
  }

  /** Remove all fields. */
  clear(): void {
    this.fields.length = 0;
  }

  /** Number of fields currently in the group. */
  get length(): number {
    return this.fields.length;
  }

  /**
   * Apply every field's force contribution to all eligible bodies in `space`.
   * Forces stack additively, preserving any userland `body.force` writes.
   */
  apply(space: Space): void {
    for (const field of this.fields) field.apply(space);
  }
}
