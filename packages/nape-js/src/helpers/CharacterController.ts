import { Body } from "../phys/Body";
import { BodyType } from "../phys/BodyType";
import { Vec2 } from "../geom/Vec2";
import { Ray } from "../geom/Ray";
import type { Space } from "../space/Space";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { CbType } from "../callbacks/CbType";
import { InteractionType } from "../callbacks/InteractionType";
import { PreListener } from "../callbacks/PreListener";
import { PreFlag } from "../callbacks/PreFlag";
import type { CollisionArbiter } from "../dynamics/CollisionArbiter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result returned by {@link CharacterController.update}. */
export interface MoveResult {
  /** True if the character is standing on a surface within slope limits. */
  grounded: boolean;
  /** Ground surface normal, or null if not grounded. */
  groundNormal: Vec2 | null;
  /** The body the character is standing on, or null. */
  groundBody: Body | null;
  /** True if standing on a kinematic (moving) platform. */
  onMovingPlatform: boolean;
  /** Angle of the ground slope in radians (0 = flat). */
  slopeAngle: number;
  /** True if touching a wall on the left side. */
  wallLeft: boolean;
  /** True if touching a wall on the right side. */
  wallRight: boolean;
  /** Seconds since the character was last grounded (for coyote-time). */
  timeSinceGrounded: number;
}

/** Configuration options for {@link CharacterController}. */
export interface CharacterControllerOptions {
  /**
   * Maximum climbable slope angle in radians.
   * @default Math.PI / 4 (45 degrees)
   */
  maxSlopeAngle?: number;

  /**
   * CbType for one-way platforms. When set, the controller automatically
   * creates a PreListener that ignores collisions when the character
   * approaches from below — matching the original nape Haxe engine pattern.
   */
  oneWayPlatformTag?: CbType;

  /**
   * CbType assigned to the character body (required if oneWayPlatformTag is set).
   */
  characterTag?: CbType;

  /**
   * InteractionFilter used for ground/wall detection raycasts.
   * When null, an auto-generated filter excluding the character's own
   * shapes is used.
   * @default null
   */
  filter?: InteractionFilter | null;

  /**
   * World-space "down" direction used for ground / wall raycasts.
   *
   * Default `Vec2(0, 1)` matches a standard top-down-Y platformer (gravity
   * points along +Y). Override for radial-gravity / planet-platformer
   * scenarios — set `cc.down` each frame to the unit vector pointing from
   * the character toward whatever you treat as "down" (e.g. the nearest
   * planet's centre). Walls are detected perpendicular to this direction.
   *
   * The vector is normalized internally; magnitude is ignored.
   *
   * @default Vec2(0, 1)
   */
  down?: Vec2;

  /**
   * Friction coefficient the controller applies to contacts with surfaces it
   * does **not** treat as ground — walls, ceilings and slopes steeper than
   * `maxSlopeAngle`. Ground contacts keep the friction derived from the two
   * shapes' materials.
   *
   * A velocity-driven character that is pushed into a wall every frame
   * generates a large normal impulse there, and material friction turns that
   * into a tangential impulse big enough to cancel gravity outright: the
   * character hangs on the wall (or the side of a ledge) for as long as the
   * key is held, instead of sliding down. Overriding wall friction to `0`
   * removes the hang while leaving floors and slopes untouched, so wall-slide
   * / wall-jump logic layered on top sees the real fall speed.
   *
   * Set a small positive value for a natural "scrape" against walls, or
   * `null` to disable the override entirely and use material friction
   * everywhere (the behaviour before this option existed).
   *
   * @default 0
   */
  wallFriction?: number | null;
}

// ---------------------------------------------------------------------------
// CharacterController
// ---------------------------------------------------------------------------

/**
 * Velocity-based character controller for 2D platformers.
 *
 * The character uses a **dynamic body** whose velocity is set each frame.
 * Collision response (including one-way platforms) is handled entirely by
 * the physics engine via `space.step()` and `PreListener` callbacks —
 * matching the original nape Haxe engine pattern.
 *
 * The controller provides:
 * - Velocity application (`setVelocity`)
 * - Ground/slope detection (raycast queries)
 * - Wall detection (raycast queries)
 * - One-way platform support (auto-configured PreListener)
 * - Moving platform tracking
 * - Coyote time helper (`timeSinceGrounded`)
 * - Frictionless walls by default (`wallFriction`), so pushing into a wall
 *   never cancels gravity
 *
 * @example
 * ```ts
 * const body = new Body(BodyType.DYNAMIC, new Vec2(100, 100));
 * body.shapes.add(new Circle(14));
 * body.allowRotation = false;
 * body.isBullet = true;
 * body.space = space;
 *
 * const cc = new CharacterController(space, body, {
 *   maxSlopeAngle: Math.PI / 4,
 *   oneWayPlatformTag: platformCbType,
 *   characterTag: playerCbType,
 * });
 *
 * // Each frame (before space.step):
 * cc.setVelocity(moveX, velY);
 * space.step(1/60);
 * const result = cc.update();
 * if (result.grounded) velY = 0;
 * ```
 */
export class CharacterController {
  /** The physics space. */
  readonly space: Space;

  /** The character body being controlled. */
  readonly body: Body;

  // Configuration
  private _maxSlopeAngle: number;
  private _maxSlopeCos: number;
  private _filter: InteractionFilter | null;
  private _downX = 0;
  private _downY = 1;

  // One-way platform support
  private _oneWayListener: PreListener | null = null;

  // Wall friction override
  private _wallFriction: number | null;
  private _wallListener: PreListener | null = null;
  private _wallTag: CbType | null = null;

  // State
  private _grounded = false;
  private _groundNormal: Vec2 | null = null;
  private _groundBody: Body | null = null;
  private _onMovingPlatform = false;
  private _slopeAngle = 0;
  private _wallLeft = false;
  private _wallRight = false;
  private _timeSinceGrounded = 0;

  constructor(space: Space, body: Body, options: CharacterControllerOptions = {}) {
    this.space = space;
    this.body = body;

    this._maxSlopeAngle = options.maxSlopeAngle ?? Math.PI / 4;
    this._maxSlopeCos = Math.cos(this._maxSlopeAngle);

    if (options.down) this._setDown(options.down.x, options.down.y);

    // Auto-setup raycast filter to exclude the character's own shapes.
    const CHAR_GROUP = 1 << 8;
    if (options.filter) {
      this._filter = options.filter;
    } else {
      const shapes = body.shapes;
      for (let i = 0; i < shapes.length; i++) {
        const s = shapes.at(i);
        const f = s.filter;
        f.collisionGroup = f.collisionGroup | CHAR_GROUP;
      }
      this._filter = new InteractionFilter(1, ~CHAR_GROUP);
    }

    // Auto-setup one-way platform PreListener
    if (options.oneWayPlatformTag && options.characterTag) {
      this._setupOneWayPlatforms(options.oneWayPlatformTag, options.characterTag);
    }

    // Auto-setup wall-friction PreListener (see `wallFriction` option).
    this._wallFriction = options.wallFriction === undefined ? 0 : options.wallFriction;
    if (this._wallFriction !== null) {
      this._setupWallFriction(options.characterTag ?? null);
    }
  }

  // -----------------------------------------------------------------------
  // Public getters
  // -----------------------------------------------------------------------

  get grounded(): boolean {
    return this._grounded;
  }

  get groundNormal(): Vec2 | null {
    return this._groundNormal;
  }

  get groundBody(): Body | null {
    return this._groundBody;
  }

  get timeSinceGrounded(): number {
    return this._timeSinceGrounded;
  }

  get maxSlopeAngle(): number {
    return this._maxSlopeAngle;
  }

  set maxSlopeAngle(v: number) {
    this._maxSlopeAngle = v;
    this._maxSlopeCos = Math.cos(v);
  }

  /**
   * Friction coefficient applied to wall / ceiling contacts, or `null` when
   * the override is disabled. See {@link CharacterControllerOptions.wallFriction}.
   */
  get wallFriction(): number | null {
    return this._wallFriction;
  }

  /**
   * Current world-space "down" direction used for ground / wall raycasts.
   * Returns a fresh `Vec2` each call; mutate via {@link setDown} or by
   * assigning a new `Vec2` to this property.
   */
  get down(): Vec2 {
    return new Vec2(this._downX, this._downY);
  }

  set down(value: Vec2) {
    this._setDown(value.x, value.y);
  }

  /** Update the down direction from raw components (normalized internally). */
  setDown(x: number, y: number): void {
    this._setDown(x, y);
  }

  private _setDown(x: number, y: number): void {
    const len = Math.sqrt(x * x + y * y);
    if (len > 1e-6) {
      this._downX = x / len;
      this._downY = y / len;
    }
  }

  // -----------------------------------------------------------------------
  // Core API
  // -----------------------------------------------------------------------

  /**
   * Set the character body's velocity. Call this each frame **before**
   * `space.step()`.
   *
   * @param vx - Horizontal velocity (px/s). Set to 0 for no horizontal input.
   * @param vy - Vertical velocity (px/s). Typically includes gravity accumulation.
   */
  setVelocity(vx: number, vy: number): void {
    this.body.velocity = new Vec2(vx, vy);
  }

  /**
   * Query the character's state after `space.step()` has run.
   * Detects ground, walls, slope angle, moving platforms, etc.
   *
   * Call this each frame **after** `space.step()`.
   */
  update(): MoveResult {
    this._wallLeft = false;
    this._wallRight = false;

    const px = this.body.position.x;
    const py = this.body.position.y;

    // Ground detection
    this._detectGround(px, py);

    // Wall detection
    this._detectWalls(px, py);

    // Moving platform tracking
    if (this._grounded && this._groundBody) {
      this._onMovingPlatform = this._groundBody.type === BodyType.KINEMATIC;
    } else {
      this._onMovingPlatform = false;
    }

    // Coyote time
    if (this._grounded) {
      this._timeSinceGrounded = 0;
    } else {
      this._timeSinceGrounded += 1 / 60;
    }

    return {
      grounded: this._grounded,
      groundNormal: this._groundNormal,
      groundBody: this._groundBody,
      onMovingPlatform: this._onMovingPlatform,
      slopeAngle: this._slopeAngle,
      wallLeft: this._wallLeft,
      wallRight: this._wallRight,
      timeSinceGrounded: this._timeSinceGrounded,
    };
  }

  /**
   * Remove the one-way platform PreListener and detach from space.
   */
  destroy(): void {
    if (this._oneWayListener) {
      this._oneWayListener.space = null;
      this._oneWayListener = null;
    }
    if (this._wallListener) {
      this._wallListener.space = null;
      this._wallListener = null;
    }
    if (this._wallTag) {
      try {
        this.body.cbTypes.remove(this._wallTag);
      } catch {
        // body may already be detached / disposed
      }
      this._wallTag = null;
    }
  }

  // -----------------------------------------------------------------------
  // Private: ground detection
  // -----------------------------------------------------------------------

  private _detectGround(px: number, py: number): void {
    const dx = this._downX;
    const dy = this._downY;
    const charRadius = this._getCharacterRadius(dx, dy);
    const castDist = charRadius + 4; // small tolerance

    const ray = new Ray(new Vec2(px, py), new Vec2(dx, dy));
    ray.maxDistance = castDist;

    const hit = this.space.rayCast(ray, false, this._filter);

    if (hit && hit.distance <= castDist) {
      // Surface is "ground" when its normal points opposite to down (i.e.
      // dot(normal, -down) >= cos(maxSlopeAngle)).
      const cosAngle = -(hit.normal.x * dx + hit.normal.y * dy);
      if (cosAngle > 0 && cosAngle >= this._maxSlopeCos) {
        this._grounded = true;
        this._groundNormal = new Vec2(hit.normal.x, hit.normal.y);
        this._groundBody = hit.shape?.body ?? null;
        this._slopeAngle = Math.acos(Math.min(1, cosAngle));
        return;
      }
    }

    this._grounded = false;
    this._groundNormal = null;
    this._groundBody = null;
    this._slopeAngle = 0;
  }

  // -----------------------------------------------------------------------
  // Private: wall detection
  // -----------------------------------------------------------------------

  private _detectWalls(px: number, py: number): void {
    // Wall directions are perpendicular to "down" (so "right" is down rotated
    // 90° CCW = (down.y, -down.x); "left" is the negation). With the default
    // down = (0, 1) this reduces to the original (±1, 0).
    const dx = this._downX;
    const dy = this._downY;
    const rightX = dy;
    const rightY = -dx;
    const charRadius = this._getCharacterRadius(rightX, rightY);
    const castDist = charRadius + 2;

    // Left
    const leftRay = new Ray(new Vec2(px, py), new Vec2(-rightX, -rightY));
    leftRay.maxDistance = castDist;
    const leftHit = this.space.rayCast(leftRay, false, this._filter);
    if (leftHit && leftHit.distance <= castDist) {
      // Wall normal should be opposite to ray direction (i.e. point right).
      const dot = leftHit.normal.x * rightX + leftHit.normal.y * rightY;
      if (Math.abs(dot) > 0.7) this._wallLeft = true;
    }

    // Right
    const rightRay = new Ray(new Vec2(px, py), new Vec2(rightX, rightY));
    rightRay.maxDistance = castDist;
    const rightHit = this.space.rayCast(rightRay, false, this._filter);
    if (rightHit && rightHit.distance <= castDist) {
      const dot = rightHit.normal.x * rightX + rightHit.normal.y * rightY;
      if (Math.abs(dot) > 0.7) this._wallRight = true;
    }
  }

  // -----------------------------------------------------------------------
  // Private: one-way platforms
  // -----------------------------------------------------------------------

  private _setupOneWayPlatforms(platformTag: CbType, characterTag: CbType): void {
    const listener = new PreListener(
      InteractionType.COLLISION,
      platformTag,
      characterTag,
      (cb) => {
        try {
          const colArb = cb.arbiter.collisionArbiter;
          if (!colArb) return PreFlag.ACCEPT;

          // Mirror original nape pattern: check normal direction relative
          // to swapped flag. Normal points from int1 to int2 when not swapped.
          // We want to IGNORE when normal points downward from the platform
          // (character is below), and ACCEPT when it points upward (character above).
          const ny = colArb.normal.y;
          const swapped = cb.swapped;

          // If swapped, normal direction is flipped
          if (ny > 0 !== swapped) {
            return PreFlag.IGNORE;
          }
          return PreFlag.ACCEPT;
        } catch {
          return PreFlag.ACCEPT;
        }
      },
      0,
      true, // pure — allows sleeping on the platform
    );
    listener.space = this.space;
    this._oneWayListener = listener;
  }

  // -----------------------------------------------------------------------
  // Private: wall friction
  // -----------------------------------------------------------------------

  private _setupWallFriction(characterTag: CbType | null): void {
    // The one-way listener needs a user-supplied tag so it can tell platform
    // from character. Here there is no such ambiguity — the listener only has
    // to find the character — so fall back to a private tag on the body when
    // the caller did not provide one.
    let tag = characterTag;
    if (!tag) {
      tag = new CbType();
      this.body.cbTypes.add(tag);
      this._wallTag = tag;
    }

    const listener = new PreListener(
      InteractionType.COLLISION,
      tag,
      CbType.ANY_BODY,
      (cb) => {
        try {
          const colArb = cb.arbiter.collisionArbiter;
          if (colArb) this._applyWallFriction(colArb);
        } catch {
          // Arbiter not mutable / not active — leave it alone.
        }
        // Never return a flag: accept / ignore stays with the engine default
        // and with any other PreListener (e.g. the one-way platform one).
        // Returning nothing also keeps the arbiter re-evaluated every step,
        // which matters when the same contact rolls from a wall face onto the
        // top of a ledge and has to get its ground friction back.
        return null;
      },
      0,
      false,
    );
    listener.space = this.space;
    this._wallListener = listener;
  }

  private _applyWallFriction(colArb: CollisionArbiter): void {
    const wallFriction = this._wallFriction;
    if (wallFriction === null) return;

    // `normal` points from shape1 toward shape2; flip it so it is always the
    // other surface's outward normal, pointing at the character.
    const n = colArb.normal;
    let nx = n.x;
    let ny = n.y;
    if (colArb.body1 === this.body) {
      nx = -nx;
      ny = -ny;
    }

    const cosAngle = -(nx * this._downX + ny * this._downY);
    if (cosAngle >= this._maxSlopeCos) {
      // Ground-like surface: restore the material-derived coefficients. This
      // is exactly what the engine computes on its own, but the arbiter may
      // still carry the wall override from a previous step.
      const m1 = colArb.shape1.material;
      const m2 = colArb.shape2.material;
      colArb.dynamicFriction = Math.sqrt(m1.dynamicFriction * m2.dynamicFriction);
      colArb.staticFriction = Math.sqrt(m1.staticFriction * m2.staticFriction);
    } else {
      colArb.dynamicFriction = wallFriction;
      colArb.staticFriction = wallFriction;
    }
  }

  // -----------------------------------------------------------------------
  // Private: shape helpers
  // -----------------------------------------------------------------------

  private _getCharacterRadius(dirX: number, dirY: number): number {
    const shape = this.body.shapes.at(0);
    if (!shape) return 0;
    if (shape.isCircle()) {
      return (shape.castCircle as any)?.radius ?? 0;
    }
    if (shape.isCapsule()) {
      const cap = shape.castCapsule as any;
      if (cap) {
        const r = cap.radius as number;
        const hl = cap.halfLength as number;
        const rot = this.body.rotation;
        const sx = Math.cos(rot);
        const sy = Math.sin(rot);
        const spineDot = Math.abs(dirX * sx + dirY * sy) * hl;
        return spineDot + r;
      }
    }
    const b = shape.bounds;
    const hw = b.width / 2;
    const hh = b.height / 2;
    return Math.abs(dirX) * hw + Math.abs(dirY) * hh;
  }
}
