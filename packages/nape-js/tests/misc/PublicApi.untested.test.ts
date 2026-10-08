/**
 * Public API members that had no test of their own: CharacterController's
 * ground getters and slope setter, TriggerZone's onExit setter, the
 * ParticleEmitter per-particle arrays and onCollide, Player's replay /
 * applyInput accessors, and Compound.copy() re-targeting angle / motor joints. Each is checked through its observable effect, not just that it
 * returns something.
 */
import { describe, it, expect } from "vitest";
import {
  AngleJoint,
  Body,
  BodyType,
  CbType,
  CharacterController,
  Circle,
  Compound,
  MotorJoint,
  ParticleEmitter,
  Polygon,
  Space,
  TriggerZone,
  Vec2,
} from "../../src";
import { Player, Recorder } from "../../src/replay";

function floorSpace(): { space: Space; floor: Body } {
  const space = new Space(new Vec2(0, 600));
  const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
  floor.shapes.add(new Polygon(Polygon.box(800, 20)));
  floor.space = space;
  return { space, floor };
}

describe("CharacterController ground state", () => {
  it("groundBody / groundNormal report the floor the character stands on", () => {
    const { space, floor } = floorSpace();
    const player = new Body(BodyType.DYNAMIC, new Vec2(0, 175));
    player.shapes.add(new Polygon(Polygon.box(20, 30)));
    player.allowRotation = false;
    player.space = space;
    const cc = new CharacterController(space, player);
    expect(cc.groundBody).toBeNull();
    expect(cc.groundNormal).toBeNull();
    for (let i = 0; i < 10; i++) {
      cc.setVelocity(0, 0);
      space.step(1 / 60);
      cc.update();
    }
    expect(cc.groundBody).toBe(floor);
    const n = cc.groundNormal!;
    // Ground normal points up (against gravity), unit length.
    expect(n.y).toBeLessThan(-0.99);
    expect(Math.hypot(n.x, n.y)).toBeCloseTo(1, 6);
    cc.destroy();
  });

  it("maxSlopeAngle setter decides whether a slope counts as ground", () => {
    const space = new Space(new Vec2(0, 600));
    // 40° ramp
    const ramp = new Body(BodyType.STATIC, new Vec2(0, 0));
    const a = (40 * Math.PI) / 180;
    ramp.shapes.add(
      new Polygon([
        new Vec2(-300, 300),
        new Vec2(300, 300 - 600 * Math.tan(a)),
        new Vec2(300, 300),
      ]),
    );
    ramp.space = space;
    const run = (maxSlope: number): boolean => {
      const player = new Body(BodyType.DYNAMIC, new Vec2(0, 20));
      player.shapes.add(new Circle(10));
      player.space = space;
      const cc = new CharacterController(space, player);
      cc.maxSlopeAngle = maxSlope;
      expect(cc.maxSlopeAngle).toBe(maxSlope);
      let grounded = false;
      for (let i = 0; i < 60; i++) {
        space.step(1 / 60);
        grounded = cc.update().grounded || grounded;
      }
      cc.destroy();
      player.space = null;
      return grounded;
    };
    expect(run((60 * Math.PI) / 180)).toBe(true);
    expect(run((20 * Math.PI) / 180)).toBe(false);
  });
});

describe("TriggerZone.onExit set after construction", () => {
  it("fires when a body leaves the zone", () => {
    const space = new Space(new Vec2(0, 0));
    const zoneBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    zoneBody.shapes.add(new Polygon(Polygon.box(100, 100)));
    zoneBody.space = space;
    const zone = new TriggerZone(space, zoneBody);
    const exited: Body[] = [];
    zone.onExit = (b: any) => exited.push(b.castBody ?? b);
    expect(zone.onExit).not.toBeNull();
    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(5));
    ball.velocity = new Vec2(600, 0);
    ball.space = space;
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(exited).toHaveLength(1);
    expect(exited[0]).toBe(ball);
    zone.onExit = null;
    expect(zone.onExit).toBeNull();
  });
});

describe("ParticleEmitter per-particle arrays", () => {
  it("ages and lifetimes run parallel to active", () => {
    const space = new Space(new Vec2(0, 0));
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 2,
      lifetimeMax: 3,
    });
    e.emit(5);
    e.update(0.25);
    expect(e.ages).toHaveLength(e.active.length);
    expect(e.lifetimes).toHaveLength(e.active.length);
    expect(e.active.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(e.ages[i]).toBeCloseTo(0.25, 9);
      expect(e.lifetimes[i]).toBeGreaterThanOrEqual(2);
      expect(e.lifetimes[i]).toBeLessThanOrEqual(3);
    }
  });
});

describe("Player accessors", () => {
  it("replay returns the replay; applyInput can be swapped and is used while stepping", () => {
    const space = new Space(new Vec2(0, 100));
    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(5));
    ball.space = space;
    const r = new Recorder<number>(space, { keyframeEvery: 0 });
    for (let f = 0; f < 10; f++) {
      r.recordFrame(f % 3 === 0 ? f : null);
      space.step(1 / 60);
    }
    const replay = r.finish();
    const p = new Player<number>(replay);
    expect(p.replay).toBe(replay);
    expect(p.applyInput).toBeNull();
    const seen: number[] = [];
    p.applyInput = (input) => seen.push(input);
    expect(p.applyInput).not.toBeNull();
    p.restore();
    while (!p.finished) p.step();
    expect(seen).toEqual([0, 3, 6, 9]);
  });
});

describe("ParticleEmitter.onCollide", () => {
  it("fires with (particle, other) when a tagged particle hits a body", () => {
    const { space, floor } = floorSpace();
    const tag = new CbType();
    const hits: Array<[Body, Body]> = [];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 150),
      particleCbType: tag,
      onCollide: (p, other) => hits.push([p, other]),
    });
    e.emit(1);
    const particle = e.active[0];
    for (let i = 0; i < 60 && hits.length === 0; i++) {
      space.step(1 / 60);
      e.update(1 / 60);
    }
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0][0]).toBe(particle);
    expect(hits[0][1]).toBe(floor);
  });
});

describe("Compound.copy() with angle / motor joints", () => {
  it("re-targets both joint ends at the copied bodies", () => {
    const c = new Compound();
    const bodies: Body[] = [];
    for (let i = 0; i < 2; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(i * 30, 0));
      b.shapes.add(new Circle(5));
      b.compound = c;
      bodies.push(b);
    }
    new AngleJoint(bodies[0], bodies[1], -0.5, 0.5).compound = c;
    new MotorJoint(bodies[0], bodies[1], 2).compound = c;
    const copy = c.copy();
    const copiedBodies = new Set<Body>();
    copy.visitBodies((b) => copiedBodies.add(b));
    expect(copiedBodies.size).toBe(2);
    let joints = 0;
    copy.visitConstraints((j: any) => {
      joints++;
      expect(copiedBodies.has(j.body1)).toBe(true);
      expect(copiedBodies.has(j.body2)).toBe(true);
      expect(j.body1).not.toBe(j.body2);
    });
    expect(joints).toBe(2);
  });
});
