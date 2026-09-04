import type { Body, Space } from "@newkrok/nape-js";

// ---------------------------------------------------------------------------
// Structural PIXI interop — keeps nape-pixi from importing `pixi.js` at all.
// Users inject the real classes via `opts.pixi = { Container, Graphics }`.
// ---------------------------------------------------------------------------

/** Subset of `PIXI.Graphics` used by the debug draw. */
export interface GraphicsLike {
  clear(): this;
  circle(cx: number, cy: number, radius: number): this;
  poly(points: number[], close?: boolean): this;
  roundRect(x: number, y: number, w: number, h: number, r: number): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  fill(style: { color?: number; alpha?: number }): this;
  stroke(style: { color?: number; alpha?: number; width?: number }): this;
  destroy(options?: unknown): void;
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
}

/** Subset of `PIXI.Container` used by the debug draw. */
export interface ContainerLike {
  addChild(child: unknown): void;
  removeChild(child: unknown): void;
  destroy(options?: unknown): void;
  visible: boolean;
}

/** The two PIXI classes the debug draw needs. */
export interface PixiFactory {
  Container: new () => ContainerLike;
  Graphics: new () => GraphicsLike;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface PixiDebugDrawOptions {
  /**
   * Usually:
   * ```ts
   * import { Container, Graphics } from "pixi.js";
   * new PixiDebugDraw({ pixi: { Container, Graphics } });
   * ```
   */
  pixi: PixiFactory;
  /** Render shape outlines and fills. Default `true`. */
  drawShapes?: boolean;
  /** Render constraint lines between connected bodies. Default `true`. */
  drawConstraints?: boolean;
  /** Draw 1px outlines around filled shapes. Default `true`. */
  showOutlines?: boolean;
  /** Colour cycle for dynamic bodies (hex). */
  palette?: readonly number[];
  /** Colour used for static bodies (hex). */
  staticColor?: number;
  /** Colour used for sleeping dynamic bodies (hex). */
  sleepingColor?: number;
  /** Colour used for fluid-enabled shapes (hex). */
  fluidColor?: number;
  /** Colour used for constraint lines (hex). */
  constraintColor?: number;
  /** Dynamic-body fill alpha. Default 0.25. */
  fillAlpha?: number;
  /** Static-body fill alpha. Default 0.15. */
  staticFillAlpha?: number;
  /** Sensor shape fill alpha. Default 0.08. */
  sensorFillAlpha?: number;
  /** Fluid shape fill alpha. Default 0.25. */
  fluidFillAlpha?: number;
  /** Shape outline alpha. Default 0.8. */
  outlineAlpha?: number;
  /** Shape outline width (world units). Default 1.2. */
  lineWidth?: number;
  /** Constraint line alpha. Default 0.2. */
  constraintAlpha?: number;
  /** Constraint line width. Default 1. */
  constraintLineWidth?: number;
  /**
   * Override the colour for a body. Return `null` to fall back to the
   * static/sleeping/palette logic.
   */
  colorResolver?: (body: Body) => number | null;
  /**
   * Override the fill alpha for a body. Return `null` to fall back to the
   * static/dynamic/sensor/fluid default. Runs after the shape-type alpha
   * is chosen; return a non-null value to win.
   */
  alphaResolver?: (body: Body) => number | null;
}

// ---------------------------------------------------------------------------
// Defaults — palette matches the demo-site colour scheme.
// ---------------------------------------------------------------------------

const DEFAULT_PALETTE: readonly number[] = Object.freeze([
  0x58a6ff, // blue
  0xd29922, // gold
  0x3fb950, // green
  0xf85149, // red
  0xa371f7, // purple
  0xdbabff, // lavender
]);

const DEFAULTS = {
  staticColor: 0x607888,
  sleepingColor: 0x3fb950,
  fluidColor: 0x1e90ff,
  constraintColor: 0xd29922,
  fillAlpha: 0.25,
  staticFillAlpha: 0.15,
  sensorFillAlpha: 0.08,
  fluidFillAlpha: 0.25,
  outlineAlpha: 0.8,
  lineWidth: 1.2,
  constraintAlpha: 0.2,
  constraintLineWidth: 1,
} as const;

// Internal duck-typed view of a joint that links two bodies.
interface LinkedJoint {
  body1?: Body;
  body2?: Body;
}

// ---------------------------------------------------------------------------
// PixiDebugDraw
// ---------------------------------------------------------------------------

/**
 * On-demand debug overlay for a nape {@link Space}. Produces a single
 * `PIXI.Container` (exposed as {@link PixiDebugDraw.container}) which the
 * caller adds to their scene graph.
 *
 * ```ts
 * import * as PIXI from "pixi.js";
 * import { PixiDebugDraw } from "@newkrok/nape-pixi";
 *
 * const debug = new PixiDebugDraw({ pixi: PIXI });
 * app.stage.addChild(debug.container);
 *
 * function frame() {
 *   space.step(1 / 60);
 *   debug.render(space);
 *   app.render();
 * }
 * ```
 *
 * The overlay caches one `PIXI.Graphics` per body and transforms it by
 * setting `x` / `y` / `rotation` on the Graphics itself — shape geometry is
 * only rebuilt when {@link showOutlines} flips. Stale bodies (those whose
 * `space` became `null`) are auto-removed on the next `render()`.
 */
export class PixiDebugDraw {
  /** The PIXI container to add to your scene. */
  readonly container: ContainerLike;

  /** Toggle: render body shapes. */
  drawShapes: boolean;
  /** Toggle: render constraint lines. */
  drawConstraints: boolean;

  readonly #pixi: PixiFactory;
  #showOutlines: boolean;
  readonly #palette: readonly number[];
  readonly #staticColor: number;
  readonly #sleepingColor: number;
  readonly #fluidColor: number;
  readonly #constraintColor: number;
  readonly #fillAlpha: number;
  readonly #staticFillAlpha: number;
  readonly #sensorFillAlpha: number;
  readonly #fluidFillAlpha: number;
  readonly #outlineAlpha: number;
  readonly #lineWidth: number;
  readonly #constraintAlpha: number;
  readonly #constraintLineWidth: number;
  readonly #colorResolver?: (body: Body) => number | null;
  readonly #alphaResolver?: (body: Body) => number | null;

  readonly #shapesLayer: ContainerLike;
  readonly #constraintsGfx: GraphicsLike;
  readonly #bodyGfx = new Map<Body, GraphicsLike>();
  readonly #bodyIndex = new WeakMap<Body, number>();
  #nextBodyIndex = 0;
  #disposed = false;

  constructor(opts: PixiDebugDrawOptions) {
    this.#pixi = opts.pixi;
    this.drawShapes = opts.drawShapes ?? true;
    this.drawConstraints = opts.drawConstraints ?? true;
    this.#showOutlines = opts.showOutlines ?? true;
    this.#palette = opts.palette ?? DEFAULT_PALETTE;
    this.#staticColor = opts.staticColor ?? DEFAULTS.staticColor;
    this.#sleepingColor = opts.sleepingColor ?? DEFAULTS.sleepingColor;
    this.#fluidColor = opts.fluidColor ?? DEFAULTS.fluidColor;
    this.#constraintColor = opts.constraintColor ?? DEFAULTS.constraintColor;
    this.#fillAlpha = opts.fillAlpha ?? DEFAULTS.fillAlpha;
    this.#staticFillAlpha = opts.staticFillAlpha ?? DEFAULTS.staticFillAlpha;
    this.#sensorFillAlpha = opts.sensorFillAlpha ?? DEFAULTS.sensorFillAlpha;
    this.#fluidFillAlpha = opts.fluidFillAlpha ?? DEFAULTS.fluidFillAlpha;
    this.#outlineAlpha = opts.outlineAlpha ?? DEFAULTS.outlineAlpha;
    this.#lineWidth = opts.lineWidth ?? DEFAULTS.lineWidth;
    this.#constraintAlpha = opts.constraintAlpha ?? DEFAULTS.constraintAlpha;
    this.#constraintLineWidth = opts.constraintLineWidth ?? DEFAULTS.constraintLineWidth;
    this.#colorResolver = opts.colorResolver;
    this.#alphaResolver = opts.alphaResolver;

    this.container = new this.#pixi.Container();
    this.#shapesLayer = new this.#pixi.Container();
    this.#constraintsGfx = new this.#pixi.Graphics();
    this.container.addChild(this.#shapesLayer);
    this.container.addChild(this.#constraintsGfx);
  }

  /** Show / hide shape outlines. Triggers a rebuild of all cached shapes. */
  get showOutlines(): boolean {
    return this.#showOutlines;
  }
  set showOutlines(value: boolean) {
    if (this.#showOutlines === value) return;
    this.#showOutlines = value;
    for (const [body, gfx] of this.#bodyGfx) {
      this.#drawBodyShapes(body, gfx);
    }
  }

  /** Active bindings count — mainly for diagnostics. */
  get cachedBodyCount(): number {
    return this.#bodyGfx.size;
  }

  /** Render one frame of debug overlay for `space`. */
  render(space: Space): void {
    if (this.#disposed) return;

    if (this.drawShapes) {
      this.#shapesLayer.visible = true;
      this.#syncAndTransformBodies(space);
    } else {
      this.#shapesLayer.visible = false;
    }

    if (this.drawConstraints) {
      this.#constraintsGfx.visible = true;
      this.#drawConstraintLines(space);
    } else {
      this.#constraintsGfx.visible = false;
    }
  }

  /** Tear down the overlay. The root `container` is destroyed with its children. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#bodyGfx.clear();
    this.container.destroy({ children: true });
  }

  // -------------------------------------------------------------------------
  // Bodies / shapes
  // -------------------------------------------------------------------------

  #syncAndTransformBodies(space: Space): void {
    // Remove stale bindings (body left its space) and transform live ones.
    for (const [body, gfx] of this.#bodyGfx) {
      if (body.space == null) {
        this.#shapesLayer.removeChild(gfx);
        gfx.destroy();
        this.#bodyGfx.delete(body);
      } else {
        gfx.x = body.position.x;
        gfx.y = body.position.y;
        gfx.rotation = body.rotation;
      }
    }

    // Pick up newly added bodies.
    for (const body of space.bodies) {
      if (this.#bodyGfx.has(body)) continue;
      const gfx = new this.#pixi.Graphics();
      this.#drawBodyShapes(body, gfx);
      gfx.x = body.position.x;
      gfx.y = body.position.y;
      gfx.rotation = body.rotation;
      this.#shapesLayer.addChild(gfx);
      this.#bodyGfx.set(body, gfx);
    }
  }

  #drawBodyShapes(body: Body, gfx: GraphicsLike): void {
    gfx.clear();
    const color = this.#bodyColor(body);
    const baseAlpha = this.#bodyFillAlpha(body);
    const alphaOverride = this.#alphaResolver ? this.#alphaResolver(body) : null;

    for (const shape of body.shapes) {
      const isFluid = shape.fluidEnabled;
      const isSensor = shape.sensorEnabled;
      const fill = isFluid ? this.#fluidColor : color;
      const shapeAlpha = isFluid
        ? this.#fluidFillAlpha
        : isSensor
          ? this.#sensorFillAlpha
          : baseAlpha;
      const alpha = alphaOverride ?? shapeAlpha;

      // The Graphics object is positioned from the BODY transform, so a
      // circle/capsule sitting off the body origin (e.g.
      // `new Circle(r, new Vec2(x, y))`, common in compound static geometry)
      // must be drawn at its own localCOM or it lands on the body centre.
      // Polygons already carry the offset in localVerts — don't shift those.
      let offX = 0;
      let offY = 0;
      if (!shape.isPolygon()) {
        const com = shape.localCOM as { x: number; y: number } | undefined;
        offX = com?.x ?? 0;
        offY = com?.y ?? 0;
      }

      if (shape.isCapsule()) {
        const cap = (shape as any).castCapsule;
        if (!cap) continue;
        const hl: number = cap.halfLength;
        const r: number = cap.radius;
        gfx.roundRect(offX - hl - r, offY - r, (hl + r) * 2, r * 2, r);
        gfx.fill({ color: fill, alpha });
        if (this.#showOutlines) {
          gfx.roundRect(offX - hl - r, offY - r, (hl + r) * 2, r * 2, r);
          gfx.stroke({ color: fill, alpha: this.#outlineAlpha, width: this.#lineWidth });
        }
        continue;
      }

      if (shape.isCircle()) {
        const circle = shape.castCircle;
        if (!circle) continue;
        const r: number = (circle as any).radius;
        gfx.circle(offX, offY, r);
        gfx.fill({ color: fill, alpha });
        if (this.#showOutlines) {
          gfx.circle(offX, offY, r);
          gfx.stroke({ color: fill, alpha: this.#outlineAlpha, width: this.#lineWidth });
          // Rotation indicator: short line from centre toward local +X.
          gfx.moveTo(offX, offY);
          gfx.lineTo(offX + r, offY);
          gfx.stroke({ color: fill, alpha: 0.4, width: 1 });
        }
        continue;
      }

      if (shape.isPolygon()) {
        const poly = shape.castPolygon;
        if (!poly) continue;
        const verts = (poly as any).localVerts;
        const len: number = verts.length;
        if (len < 3) continue;
        const points: number[] = [];
        for (let i = 0; i < len; i++) {
          const v = verts.at(i);
          points.push(v.x, v.y);
        }
        gfx.poly(points, true);
        gfx.fill({ color: fill, alpha });
        if (this.#showOutlines) {
          gfx.poly(points, true);
          gfx.stroke({ color: fill, alpha: this.#outlineAlpha, width: this.#lineWidth });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Constraints
  // -------------------------------------------------------------------------

  #drawConstraintLines(space: Space): void {
    const gfx = this.#constraintsGfx;
    gfx.clear();
    const constraints = space.constraints as any;
    const len: number = constraints.length;
    if (len === 0) return;
    // The static "world body" anchor used by joints like
    // AngleJoint(space.world, body, ...) sits at the world origin
    // (0,0). Drawing a line from every participating body to (0,0)
    // is visual noise, so skip those joints. We check wrapper
    // identity, internal zpp_inner identity, and finally any static
    // body at exactly (0,0) — the last is a defensive fallback for
    // cases where the constraint accessor returns a freshly-wrapped
    // Body each access.
    const world = (space as any).world;
    const worldInner = world?.zpp_inner ?? world;
    let drew = false;
    for (let i = 0; i < len; i++) {
      const c = constraints.at(i) as LinkedJoint;
      const a = c.body1 as any;
      const b = c.body2 as any;
      if (!a || !b) continue;
      if (a === world || b === world) continue;
      const aInner = a.zpp_inner ?? a;
      const bInner = b.zpp_inner ?? b;
      if (worldInner && (aInner === worldInner || bInner === worldInner)) continue;
      const aStatic = typeof a.isStatic === "function" ? a.isStatic() : !!a.isStatic;
      const bStatic = typeof b.isStatic === "function" ? b.isStatic() : !!b.isStatic;
      const aAtOrigin = aStatic && a.position.x === 0 && a.position.y === 0;
      const bAtOrigin = bStatic && b.position.x === 0 && b.position.y === 0;
      if (aAtOrigin || bAtOrigin) continue;
      gfx.moveTo(a.position.x, a.position.y);
      gfx.lineTo(b.position.x, b.position.y);
      drew = true;
    }
    if (drew) {
      gfx.stroke({
        color: this.#constraintColor,
        alpha: this.#constraintAlpha,
        width: this.#constraintLineWidth,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Colour policy
  // -------------------------------------------------------------------------

  #bodyColor(body: Body): number {
    if (this.#colorResolver) {
      const custom = this.#colorResolver(body);
      if (custom != null) return custom;
    }
    if (body.isStatic()) return this.#staticColor;
    if (body.isSleeping) return this.#sleepingColor;
    let idx = this.#bodyIndex.get(body);
    if (idx === undefined) {
      idx = this.#nextBodyIndex++;
      this.#bodyIndex.set(body, idx);
    }
    return this.#palette[idx % this.#palette.length];
  }

  #bodyFillAlpha(body: Body): number {
    return body.isStatic() ? this.#staticFillAlpha : this.#fillAlpha;
  }
}
