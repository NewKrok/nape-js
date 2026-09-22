import { describe, it, expect, beforeEach } from "vitest";
import "../../src/core/engine";
import { CharacterController } from "../../src/helpers/CharacterController";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { CbType } from "../../src/callbacks/CbType";
import { Material } from "../../src/phys/Material";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSpace(): Space {
  const space = new Space();
  space.gravity = new Vec2(0, 600);
  return space;
}

function addFloor(space: Space, y = 490, w = 900): Body {
  const floor = new Body(BodyType.STATIC, new Vec2(450, y));
  floor.shapes.add(new Polygon(Polygon.box(w, 20)));
  floor.space = space;
  return floor;
}

function createPlayer(space: Space, x = 100, y = 400): Body {
  const player = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  player.shapes.add(new Circle(12, undefined, new Material(0, 0.3, 0.3, 1)));
  player.allowRotation = false;
  player.isBullet = true;
  player.space = space;
  return player;
}

function step(space: Space, n = 1) {
  for (let i = 0; i < n; i++) {
    space.step(1 / 60, 8, 3);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CharacterController", () => {
  let space: Space;
  let player: Body;

  beforeEach(() => {
    space = createSpace();
    player = createPlayer(space);
  });

  // ---- Construction ----

  describe("constructor", () => {
    it("creates with default options", () => {
      const cc = new CharacterController(space, player);
      expect(cc.space).toBe(space);
      expect(cc.body).toBe(player);
      expect(cc.maxSlopeAngle).toBeCloseTo(Math.PI / 4);
      expect(cc.grounded).toBe(false);
      cc.destroy();
    });

    it("creates with custom options", () => {
      const cc = new CharacterController(space, player, {
        maxSlopeAngle: Math.PI / 3,
      });
      expect(cc.maxSlopeAngle).toBeCloseTo(Math.PI / 3);
      cc.destroy();
    });

    it("tags character shapes with CHAR_GROUP bit", () => {
      const cc = new CharacterController(space, player);
      const charGroup = player.shapes.at(0)!.filter.collisionGroup;
      expect(charGroup & (1 << 8)).toBe(1 << 8);
      cc.destroy();
    });
  });

  // ---- setVelocity + update ----

  describe("setVelocity + update", () => {
    it("applies velocity to the body", () => {
      const cc = new CharacterController(space, player);
      cc.setVelocity(100, 0);
      expect(player.velocity.x).toBeCloseTo(100);
      expect(player.velocity.y).toBeCloseTo(0);
      cc.destroy();
    });

    it("update returns grounded state after physics step", () => {
      addFloor(space);
      player.position = new Vec2(100, 465);
      const cc = new CharacterController(space, player);

      cc.setVelocity(0, 0);
      step(space, 5);
      const result = cc.update();
      expect(result.grounded).toBe(true);
      expect(result.groundBody).not.toBeNull();
      cc.destroy();
    });

    it("not grounded when in the air", () => {
      addFloor(space);
      player.position = new Vec2(100, 100);
      const cc = new CharacterController(space, player);

      cc.setVelocity(0, 0);
      step(space);
      const result = cc.update();
      expect(result.grounded).toBe(false);
      cc.destroy();
    });
  });

  // ---- Ground detection ----

  describe("ground detection", () => {
    it("detects ground when resting on floor", () => {
      addFloor(space);
      player.position = new Vec2(100, 465);
      const cc = new CharacterController(space, player);

      cc.setVelocity(0, 100);
      step(space, 3);
      const result = cc.update();
      expect(result.grounded).toBe(true);
      cc.destroy();
    });

    it("tracks timeSinceGrounded", () => {
      addFloor(space);
      player.position = new Vec2(100, 465);
      const cc = new CharacterController(space, player);

      cc.setVelocity(0, 0);
      step(space, 3);
      cc.update();
      expect(cc.timeSinceGrounded).toBe(0);

      // Launch upward
      player.position = new Vec2(100, 100);
      cc.setVelocity(0, 0);
      step(space);
      cc.update();
      expect(cc.timeSinceGrounded).toBeGreaterThan(0);
      cc.destroy();
    });
  });

  // ---- One-way platforms ----

  describe("one-way platforms", () => {
    it("sets up PreListener", () => {
      const platformTag = new CbType();
      const playerTag = new CbType();
      player.shapes.at(0)!.cbTypes.add(playerTag);

      const before = space.listeners.length;
      const cc = new CharacterController(space, player, {
        oneWayPlatformTag: platformTag,
        characterTag: playerTag,
        wallFriction: null, // isolate the one-way listener
      });
      expect(space.listeners.length).toBe(before + 1);

      cc.destroy();
      expect(space.listeners.length).toBe(before);
    });

    it("character passes through one-way platform from below", () => {
      const platformTag = new CbType();
      const playerTag = new CbType();

      // One-way platform
      const platform = new Body(BodyType.STATIC, new Vec2(100, 420));
      const pShape = new Polygon(Polygon.box(100, 8));
      pShape.cbTypes.add(platformTag);
      platform.shapes.add(pShape);
      platform.space = space;

      player.shapes.at(0)!.cbTypes.add(playerTag);
      player.position = new Vec2(100, 460);

      const cc = new CharacterController(space, player, {
        oneWayPlatformTag: platformTag,
        characterTag: playerTag,
      });

      // Launch upward through the platform
      cc.setVelocity(0, -400);
      step(space, 10);
      cc.update();

      // Character should have passed above the platform (y=420)
      expect(player.position.y).toBeLessThan(420);
      cc.destroy();
    });

    it("character lands on one-way platform from above", () => {
      const platformTag = new CbType();
      const playerTag = new CbType();

      const platform = new Body(BodyType.STATIC, new Vec2(100, 450));
      const pShape = new Polygon(Polygon.box(100, 8));
      pShape.cbTypes.add(platformTag);
      platform.shapes.add(pShape);
      platform.space = space;

      player.shapes.at(0)!.cbTypes.add(playerTag);
      player.position = new Vec2(100, 400);

      const cc = new CharacterController(space, player, {
        oneWayPlatformTag: platformTag,
        characterTag: playerTag,
      });

      // Fall down onto the platform
      cc.setVelocity(0, 200);
      step(space, 20);
      cc.update();

      // Character should be resting on or near the platform, not fallen through
      const RADIUS = 12;
      const platformTop = 450 - 4;
      expect(player.position.y + RADIUS).toBeLessThanOrEqual(platformTop + 5);
      cc.destroy();
    });
  });

  // ---- Wall detection ----

  describe("wall detection", () => {
    it("detects wall on the right", () => {
      addFloor(space);
      const wall = new Body(BodyType.STATIC, new Vec2(150, 450));
      wall.shapes.add(new Polygon(Polygon.box(20, 80)));
      wall.space = space;

      player.position = new Vec2(120, 465);
      const cc = new CharacterController(space, player);

      cc.setVelocity(200, 0);
      step(space, 5);
      const result = cc.update();
      expect(result.wallRight).toBe(true);
      cc.destroy();
    });
  });

  // ---- Destroy ----

  describe("destroy", () => {
    it("removes PreListener on destroy", () => {
      const platformTag = new CbType();
      const playerTag = new CbType();
      player.shapes.at(0)!.cbTypes.add(playerTag);

      const cc = new CharacterController(space, player, {
        oneWayPlatformTag: platformTag,
        characterTag: playerTag,
      });

      // One-way PreListener + wall-friction PreListener
      const count = space.listeners.length;
      expect(count).toBe(2);
      cc.destroy();
      expect(space.listeners.length).toBe(0);
    });

    it("removes the internal wall-friction tag from the body on destroy", () => {
      const before = player.cbTypes.length;
      const cc = new CharacterController(space, player);
      expect(player.cbTypes.length).toBe(before + 1);
      expect(space.listeners.length).toBe(1);
      cc.destroy();
      expect(player.cbTypes.length).toBe(before);
      expect(space.listeners.length).toBe(0);
    });

    it("does not tag the body when characterTag is supplied", () => {
      const playerTag = new CbType();
      player.shapes.at(0)!.cbTypes.add(playerTag);
      const before = player.cbTypes.length;
      const cc = new CharacterController(space, player, { characterTag: playerTag });
      expect(player.cbTypes.length).toBe(before);
      cc.destroy();
    });

    it("destroy is safe to call multiple times", () => {
      const cc = new CharacterController(space, player);
      cc.destroy();
      cc.destroy();
    });
  });

  // ---- Edge cases ----

  describe("edge cases", () => {
    it("update works without prior setVelocity", () => {
      addFloor(space);
      player.position = new Vec2(100, 465);
      const cc = new CharacterController(space, player);

      step(space);
      const result = cc.update();
      expect(result).toBeDefined();
      expect(result.grounded).toBeDefined();
      cc.destroy();
    });

    it("works with polygon-shaped characters", () => {
      const boxPlayer = new Body(BodyType.DYNAMIC, new Vec2(100, 465));
      boxPlayer.shapes.add(new Polygon(Polygon.box(20, 24)));
      boxPlayer.allowRotation = false;
      boxPlayer.space = space;

      addFloor(space);
      const cc = new CharacterController(space, boxPlayer);
      cc.setVelocity(5, 0);
      step(space);
      const result = cc.update();
      expect(result).toBeDefined();
      cc.destroy();
    });
  });

  // ---- down direction override (radial gravity / planet platformer) ----

  describe("down direction override", () => {
    it("defaults to (0, 1)", () => {
      const cc = new CharacterController(space, player);
      expect(cc.down.x).toBeCloseTo(0, 5);
      expect(cc.down.y).toBeCloseTo(1, 5);
      cc.destroy();
    });

    it("accepts a constructor-time down option (normalized)", () => {
      const cc = new CharacterController(space, player, {
        down: new Vec2(2, 0),
      });
      expect(cc.down.x).toBeCloseTo(1, 5);
      expect(cc.down.y).toBeCloseTo(0, 5);
      cc.destroy();
    });

    it("normalizes when assigned via the setter", () => {
      const cc = new CharacterController(space, player);
      cc.down = new Vec2(0, 5);
      expect(cc.down.x).toBeCloseTo(0, 5);
      expect(cc.down.y).toBeCloseTo(1, 5);
      cc.setDown(3, 4);
      expect(cc.down.x).toBeCloseTo(0.6, 5);
      expect(cc.down.y).toBeCloseTo(0.8, 5);
      cc.destroy();
    });

    it("ignores zero / near-zero down vectors", () => {
      const cc = new CharacterController(space, player);
      cc.down = new Vec2(1, 0);
      cc.setDown(0, 0);
      // Last good value should still apply
      expect(cc.down.x).toBeCloseTo(1, 5);
      expect(cc.down.y).toBeCloseTo(0, 5);
      cc.destroy();
    });

    it("detects ground using a sideways down vector (player on a vertical wall)", () => {
      // Disable global gravity so the player isn't pulled "down" the screen.
      space.gravity = new Vec2(0, 0);

      // A vertical "wall" the character treats as ground:
      const wall = new Body(BodyType.STATIC, new Vec2(150, 250));
      wall.shapes.add(new Polygon(Polygon.box(20, 400)));
      wall.space = space;

      // Place player just to the left of the wall (well within charRadius + 4).
      player.position = new Vec2(150 - 10 - 12, 250); // wall center - half-width - circle radius
      player.velocity = new Vec2(0, 0);

      const cc = new CharacterController(space, player, {
        down: new Vec2(1, 0), // "down" points toward the wall
      });
      step(space);
      const result = cc.update();
      expect(result.grounded).toBe(true);
      // Ground normal should point opposite to down (i.e. away from wall, -X).
      expect(result.groundNormal!.x).toBeLessThan(-0.7);
      cc.destroy();
    });

    it("does not detect a sideways floor as ground when down is still (0, 1)", () => {
      space.gravity = new Vec2(0, 0);
      const wall = new Body(BodyType.STATIC, new Vec2(150, 250));
      wall.shapes.add(new Polygon(Polygon.box(20, 400)));
      wall.space = space;

      player.position = new Vec2(150 - 10 - 12, 250);
      player.velocity = new Vec2(0, 0);

      const cc = new CharacterController(space, player); // default down (0, 1)
      step(space);
      const result = cc.update();
      expect(result.grounded).toBe(false);
      cc.destroy();
    });

    it("rotates wall detection with the down direction", () => {
      // With down pointing right (+X), walls are perpendicular to that — i.e.
      // up (+Y is "right wall" relative to gravity) and down (-Y is "left wall").
      // Build a horizontal floor below the player; with down=+X it should
      // register as a wall, not as ground.
      space.gravity = new Vec2(0, 0);
      addFloor(space);
      player.position = new Vec2(450, 478); // sitting on the floor (12 radius)
      player.velocity = new Vec2(0, 0);

      const cc = new CharacterController(space, player, {
        down: new Vec2(1, 0),
      });
      step(space);
      const result = cc.update();
      // Floor (normal pointing up) is NOT ground when down is sideways.
      expect(result.grounded).toBe(false);
      // Floor normal is (0, -1) which projects onto right=(0, -1) with |dot| ≈ 1
      // -> registered as a wall.
      expect(result.wallLeft || result.wallRight).toBe(true);
      cc.destroy();
    });

    it("can be updated each frame to change down direction (planet-style)", () => {
      // Simulates choosing a new down direction across frames; verify the
      // controller picks it up without re-construction.
      const cc = new CharacterController(space, player);
      cc.setDown(0, 1);
      cc.setDown(1, 0);
      cc.setDown(0, -1);
      expect(cc.down.x).toBeCloseTo(0, 5);
      expect(cc.down.y).toBeCloseTo(-1, 5);
      cc.destroy();
    });
  });

  // ---- Wall friction override (issue #238) ----
  //
  // A velocity-driven character pushed into a wall every frame produces a big
  // normal impulse there, and material friction turns it into a tangential
  // impulse that cancels gravity: the character hangs on the wall for as long
  // as the key is held. The controller zeroes friction on non-ground contacts
  // so the character keeps falling.

  describe("wall friction override", () => {
    const GRAVITY = 900;
    const PUSH = 210;

    function createCapsulePlayer(x: number, y: number, material?: Material): Body {
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      body.shapes.add(new Capsule(40, 18, undefined, material));
      body.rotation = Math.PI / 2; // stand upright
      body.allowRotation = false;
      body.isBullet = true;
      body.space = space;
      return body;
    }

    /** Tall wall whose left face is at x = 180. */
    function addWall(): Body {
      const wall = new Body(BodyType.STATIC, new Vec2(200, 300));
      wall.shapes.add(new Polygon(Polygon.box(40, 400)));
      wall.space = space;
      return wall;
    }

    /** Push `body` into the wall on its right for `n` frames. */
    function pushRight(cc: CharacterController, body: Body, n: number) {
      for (let i = 0; i < n; i++) {
        cc.setVelocity(PUSH, body.velocity.y);
        step(space);
        cc.update();
      }
    }

    beforeEach(() => {
      space.gravity = new Vec2(0, GRAVITY);
      player.space = null; // the shared circle player is not used here
    });

    it("defaults to 0 and exposes the configured value", () => {
      const body = createCapsulePlayer(100, 100);
      const cc = new CharacterController(space, body);
      expect(cc.wallFriction).toBe(0);
      cc.destroy();

      const cc2 = new CharacterController(space, body, { wallFriction: 0.25 });
      expect(cc2.wallFriction).toBe(0.25);
      cc2.destroy();

      const cc3 = new CharacterController(space, body, { wallFriction: null });
      expect(cc3.wallFriction).toBeNull();
      expect(space.listeners.length).toBe(0);
      cc3.destroy();
    });

    it("keeps falling while pushed into a wall (default material)", () => {
      addWall();
      const body = createCapsulePlayer(180 - 9 - 1, 100);
      const cc = new CharacterController(space, body);

      // Still pressed against the wall while falling...
      pushRight(cc, body, 20);
      expect(cc.update().wallRight).toBe(true);
      expect(body.position.y).toBeGreaterThan(130);

      // ...and one second of free fall under 900 px/s² is ~450 px; the wall
      // must not hold the character up.
      pushRight(cc, body, 40);
      expect(body.position.y).toBeGreaterThan(400);
      cc.destroy();
    });

    it("keeps falling while pushed into a wall (low-friction material)", () => {
      addWall();
      const body = createCapsulePlayer(180 - 9 - 1, 100, new Material(0, 0.3, 0.3, 1));
      const cc = new CharacterController(space, body);

      pushRight(cc, body, 60);
      expect(body.position.y).toBeGreaterThan(400);
      cc.destroy();
    });

    it("works with a circle character too", () => {
      addWall();
      const body = new Body(BodyType.DYNAMIC, new Vec2(180 - 9 - 1, 100));
      body.shapes.add(new Circle(9));
      body.allowRotation = false;
      body.isBullet = true;
      body.space = space;
      const cc = new CharacterController(space, body);

      pushRight(cc, body, 60);
      expect(body.position.y).toBeGreaterThan(400);
      cc.destroy();
    });

    it("wallFriction: null restores the legacy sticking behaviour", () => {
      addWall();
      const body = createCapsulePlayer(180 - 9 - 1, 100);
      const cc = new CharacterController(space, body, { wallFriction: null });

      pushRight(cc, body, 60);

      // Material friction against the re-asserted push cancels gravity — the
      // character hangs where it started. This is the bug the default fixes.
      expect(body.position.y).toBeLessThan(110);
      cc.destroy();
    });

    it("does not hang on the side of a one-way platform (issue #238)", () => {
      const platformTag = new CbType();
      const playerTag = new CbType();

      // Thin one-way platform, left edge at x = 235.
      const platform = new Body(BodyType.STATIC, new Vec2(300, 200));
      const pShape = new Polygon(Polygon.box(130, 12));
      pShape.cbTypes.add(platformTag);
      platform.shapes.add(pShape);
      platform.space = space;

      // Character beside the edge, upper body level with the platform, tag on
      // the shape as the demos do.
      const body = createCapsulePlayer(235 - 9 - 1, 210);
      body.shapes.at(0)!.cbTypes.add(playerTag);
      const cc = new CharacterController(space, body, {
        oneWayPlatformTag: platformTag,
        characterTag: playerTag,
      });

      const y0 = body.position.y;
      pushRight(cc, body, 60);
      expect(body.position.y - y0).toBeGreaterThan(300);
      cc.destroy();
    });

    it("keeps material friction on the ground: no creep on a 30° slope", () => {
      const slope = new Body(BodyType.STATIC, new Vec2(300, 400));
      slope.shapes.add(new Polygon(Polygon.box(600, 20)));
      slope.rotation = Math.PI / 6;
      slope.space = space;

      const body = createCapsulePlayer(300, 300);
      const cc = new CharacterController(space, body, { maxSlopeAngle: Math.PI / 4 });

      // Settle onto the slope, then hold still for two seconds.
      for (let i = 0; i < 60; i++) {
        cc.setVelocity(0, body.velocity.y);
        step(space);
      }
      const x0 = body.position.x;
      for (let i = 0; i < 120; i++) {
        cc.setVelocity(0, body.velocity.y);
        step(space);
      }
      const result = cc.update();
      expect(result.grounded).toBe(true);
      expect(result.slopeAngle).toBeCloseTo(Math.PI / 6, 2);
      expect(Math.abs(body.position.x - x0)).toBeLessThan(1);
      cc.destroy();
    });

    it("restores material friction once the contact rolls onto a ledge top", () => {
      const floor = new Body(BodyType.STATIC, new Vec2(300, 500));
      floor.shapes.add(new Polygon(Polygon.box(600, 20)));
      floor.space = space;
      // 6px step the capsule's rounded foot can climb; its side face is a wall
      // first, then the same arbiter becomes a ground contact.
      const ledge = new Body(BodyType.STATIC, new Vec2(500, 487));
      ledge.shapes.add(new Polygon(Polygon.box(400, 6)));
      ledge.space = space;

      const body = createCapsulePlayer(260, 490 - 20 - 9);
      const cc = new CharacterController(space, body);

      pushRight(cc, body, 90);
      for (let i = 0; i < 10; i++) {
        cc.setVelocity(0, body.velocity.y);
        step(space);
      }
      const result = cc.update();
      expect(body.position.x).toBeGreaterThan(320); // climbed the step
      expect(result.grounded).toBe(true);
      expect(result.groundBody === ledge).toBe(true);

      let ledgeFriction = -1;
      const arbs = space.arbiters;
      for (let i = 0; i < arbs.length; i++) {
        const a = arbs.at(i);
        if (a.isCollisionArbiter() && (a.body1 === ledge || a.body2 === ledge)) {
          ledgeFriction = a.collisionArbiter.dynamicFriction;
        }
      }
      // Default materials on both sides: sqrt(1 * 1) = 1, not the wall override.
      expect(ledgeFriction).toBeCloseTo(1, 5);
      cc.destroy();
    });

    it("applies a positive wallFriction as a slower slide, not a hang", () => {
      addWall();
      const body = createCapsulePlayer(180 - 9 - 1, 100);
      const cc = new CharacterController(space, body, { wallFriction: 0.02 });

      pushRight(cc, body, 60);
      // Friction 0.02 × 210 px/s push ≈ 4 px/s of drag per step vs 15 px/s of
      // gravity per step — visibly slower than free fall, but still falling.
      expect(body.position.y).toBeGreaterThan(200);
      expect(body.position.y).toBeLessThan(500);
      cc.destroy();
    });
  });
});
