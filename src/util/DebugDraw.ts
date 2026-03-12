/**
 * A minimal 2D point used by {@link DebugDraw} draw callbacks.
 * Renderer implementations receive read-only snapshots — do NOT store these
 * references; they may be reused by the engine after the call returns.
 */
export interface DebugVec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * Abstract interface for debug rendering of a physics space.
 *
 * Implement this class and pass an instance to `Space.debugDraw()` to visualise
 * the physics world — shapes, joints, contacts, AABBs, velocities, and
 * centre-of-mass markers — using any 2D rendering backend (Canvas 2D, PixiJS,
 * p5.js, Three.js, etc.).
 *
 * None of the methods are abstract by language enforcement — they all default
 * to no-ops so you can override only the primitives your renderer needs.
 *
 * @example
 * ```ts
 * class CanvasDebugDraw extends DebugDraw {
 *   constructor(private ctx: CanvasRenderingContext2D) { super(); }
 *
 *   drawSegment(p1: DebugVec2, p2: DebugVec2): void {
 *     this.ctx.beginPath();
 *     this.ctx.moveTo(p1.x, p1.y);
 *     this.ctx.lineTo(p2.x, p2.y);
 *     this.ctx.stroke();
 *   }
 *   // ... other methods ...
 * }
 *
 * space.debugDraw(new CanvasDebugDraw(ctx), DebugDrawFlags.ALL);
 * ```
 */
export abstract class DebugDraw {
  /**
   * Draw a line segment between two world-space points.
   * Used for: polygon edges, velocity vectors, joint lines, AABB edges.
   * @param p1 - Start point (world space).
   * @param p2 - End point (world space).
   * @param colour - Optional ARGB colour hint (0xAARRGGBB). Renderers may ignore this.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawSegment(p1: DebugVec2, p2: DebugVec2, colour?: number): void {}

  /**
   * Draw a circle outline.
   * Used for: static/kinematic circle shapes.
   * @param centre - World-space centre.
   * @param radius - Circle radius.
   * @param colour - Optional ARGB colour hint.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawCircle(centre: DebugVec2, radius: number, colour?: number): void {}

  /**
   * Draw a filled circle with an orientation indicator segment.
   * Used for: dynamic circle shapes. The `axis` segment shows body rotation.
   * @param centre - World-space centre.
   * @param radius - Circle radius.
   * @param axis - World-space end-point of the orientation indicator (from centre).
   * @param colour - Optional ARGB colour hint.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawSolidCircle(centre: DebugVec2, radius: number, axis: DebugVec2, colour?: number): void {}

  /**
   * Draw a polygon outline.
   * Used for: static/kinematic polygon shapes.
   * @param vertices - World-space vertices in order. Do NOT store this array.
   * @param colour - Optional ARGB colour hint.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawPolygon(vertices: DebugVec2[], colour?: number): void {}

  /**
   * Draw a filled polygon.
   * Used for: dynamic polygon shapes.
   * @param vertices - World-space vertices in order. Do NOT store this array.
   * @param colour - Optional ARGB colour hint.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawSolidPolygon(vertices: DebugVec2[], colour?: number): void {}

  /**
   * Draw a point marker.
   * Used for: contact points, centre-of-mass markers.
   * @param position - World-space position.
   * @param colour - Optional ARGB colour hint.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawPoint(position: DebugVec2, colour?: number): void {}
}
