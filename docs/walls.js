/**
 * Wall creation utility for nape-js demos.
 *
 * Handles the `walls` config from demo definitions:
 *   - `true`  (default): standard 4-wall box matching W x H, 20px thick
 *   - `false`: no walls
 *   - `{ width, height }`: custom-sized 4-wall box (e.g. wider than canvas)
 *   - `{ floor, left, right, ceiling }`: selective walls (booleans)
 */
import { Body, BodyType, Vec2, Polygon } from "./nape-js.esm.js?v=3.40.0";

const WALL_THICKNESS = 20;

/**
 * Create walls in a space based on the demo's walls config.
 *
 * @param {*} space — nape-js Space instance
 * @param {number} W — canvas logical width
 * @param {number} H — canvas logical height
 * @param {boolean|Object} config — walls configuration from demo definition
 * @returns {{ floor?, left?, right?, ceiling? }} — created wall bodies (if any)
 */
export function createWalls(space, W, H, config = true) {
  if (config === false) return {};

  const t = WALL_THICKNESS;
  let wallW = W;
  let wallH = H;
  let showFloor = true;
  let showLeft = true;
  let showRight = true;
  let showCeiling = true;

  if (config !== true && typeof config === "object") {
    // Custom dimensions: { width, height }
    if (config.width != null) wallW = config.width;
    if (config.height != null) wallH = config.height;

    // Selective walls: { floor, left, right, ceiling }
    if (config.floor != null) showFloor = config.floor;
    if (config.left != null) showLeft = config.left;
    if (config.right != null) showRight = config.right;
    if (config.ceiling != null) showCeiling = config.ceiling;
  }

  // Center offset — when wallW > W, walls extend beyond canvas edges symmetrically
  const cx = W / 2;
  const cy = H / 2;
  const result = {};

  if (showFloor) {
    const floor = new Body(BodyType.STATIC, new Vec2(cx, H - t / 2));
    floor.shapes.add(new Polygon(Polygon.box(wallW, t)));
    floor.space = space;
    result.floor = floor;
  }

  if (showLeft) {
    const leftX = cx - wallW / 2 + t / 2;
    const left = new Body(BodyType.STATIC, new Vec2(leftX, cy));
    left.shapes.add(new Polygon(Polygon.box(t, wallH)));
    left.space = space;
    result.left = left;
  }

  if (showRight) {
    const rightX = cx + wallW / 2 - t / 2;
    const right = new Body(BodyType.STATIC, new Vec2(rightX, cy));
    right.shapes.add(new Polygon(Polygon.box(t, wallH)));
    right.space = space;
    result.right = right;
  }

  if (showCeiling) {
    const ceil = new Body(BodyType.STATIC, new Vec2(cx, t / 2));
    ceil.shapes.add(new Polygon(Polygon.box(wallW, t)));
    ceil.space = space;
    result.ceiling = ceil;
  }

  return result;
}

/** Re-export the wall thickness constant for CodePen templates */
export { WALL_THICKNESS };
