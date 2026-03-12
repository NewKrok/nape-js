/**
 * Bitmask flags for controlling which elements are drawn by {@link DebugDraw}.
 *
 * Pass a combination of these flags (bitwise OR) to `Space.debugDraw()` to
 * select which layers are rendered.
 *
 * @example
 * ```ts
 * space.debugDraw(myDrawer, DebugDrawFlags.SHAPES | DebugDrawFlags.JOINTS);
 * ```
 */
export const DebugDrawFlags = {
  /** Draw shape outlines (circles and polygons). */
  SHAPES: 1 << 0,
  /** Draw joint/constraint anchor points and connecting lines. */
  JOINTS: 1 << 1,
  /** Draw contact points and normals. */
  CONTACTS: 1 << 2,
  /** Draw broadphase axis-aligned bounding boxes. */
  AABB: 1 << 3,
  /** Draw body centre-of-mass markers. */
  CENTER_OF_MASS: 1 << 4,
  /** Draw body linear velocity vectors. */
  VELOCITIES: 1 << 5,
  /** All flags combined. */
  ALL: (1 << 6) - 1,
} as const;

export type DebugDrawFlags = (typeof DebugDrawFlags)[keyof typeof DebugDrawFlags];
