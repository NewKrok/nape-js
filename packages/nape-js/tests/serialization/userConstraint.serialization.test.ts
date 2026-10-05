/**
 * UserConstraint serialization through UserConstraintCodec (JSON + binary),
 * SpringJoint support, and type detection that survives minification.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Compound } from "../../src/phys/Compound";
import { UserConstraint } from "../../src/constraint/UserConstraint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import {
  spaceToJSON,
  spaceFromJSON,
  spaceToBinary,
  spaceFromBinary,
  type UserConstraintCodec,
  type UserConstraintData,
  type SerializationOptions,
} from "../../src/serialization/index";
import { Recorder, Player } from "../../src/replay/index";

type Any = any;

// ---------------------------------------------------------------------------
// A real, solvable UserConstraint: keeps two bodies `length` apart.
// ---------------------------------------------------------------------------

class Rope extends UserConstraint {
  private _b1: Body | null = null;
  private _b2: Body | null = null;
  length: number;
  label: string;

  constructor(b1: Body | null, b2: Body | null, length: number, label = "") {
    super(1);
    this.length = length;
    this.label = label;
    this._b1 = this.__registerBody(this._b1, b1);
    this._b2 = this.__registerBody(this._b2, b2);
  }
  get body1() {
    return this._b1;
  }
  get body2() {
    return this._b2;
  }
  __copy() {
    return new Rope(this._b1, this._b2, this.length, this.label);
  }
  private axis(): [number, number, number] {
    const a = (this._b1 as Any).zpp_inner;
    const b = (this._b2 as Any).zpp_inner;
    const dx = b.posx - a.posx;
    const dy = b.posy - a.posy;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d === 0 ? [0, 0, 0] : [dx / d, dy / d, d];
  }
  __position(err: number[]) {
    err[0] = this.axis()[2] - this.length;
  }
  __velocity(err: number[]) {
    const a = (this._b1 as Any).zpp_inner;
    const b = (this._b2 as Any).zpp_inner;
    const [nx, ny] = this.axis();
    err[0] = (b.velx - a.velx) * nx + (b.vely - a.vely) * ny;
  }
  __eff_mass(eff: number[]) {
    eff[0] = (this._b1 as Any).zpp_inner.imass + (this._b2 as Any).zpp_inner.imass;
  }
  __impulse(imp: number[], body: Body, out: Any) {
    const [nx, ny] = this.axis();
    const sign = body === this._b1 ? -1 : 1;
    out.zpp_inner.x = sign * imp[0] * nx;
    out.zpp_inner.y = sign * imp[0] * ny;
    out.zpp_inner.z = 0;
  }
}

/** A subclass of Rope — matched by a codec for Rope unless a more specific one comes first. */
class ElasticRope extends Rope {}

const ropeCodec: UserConstraintCodec<Rope> = {
  type: "test/Rope",
  ctor: Rope,
  bodies: (c) => [c.body1, c.body2],
  save: (c) => ({ length: c.length, label: c.label }),
  load: (data, [b1, b2]) => new Rope(b1, b2, data.length as number, data.label as string),
};

const options: SerializationOptions = { userConstraints: [ropeCodec] };

function ball(space: Space | null, x: number, y: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(5));
  if (space) b.space = space;
  return b;
}

function ropeScene() {
  const space = new Space(new Vec2(0, 400));
  const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
  anchor.shapes.add(new Circle(2));
  anchor.space = space;
  const weight = ball(space, 80, 10);
  const rope = new Rope(anchor, weight, 60, "árvíztűrő 🪢");
  rope.stiff = false;
  rope.frequency = 7;
  rope.damping = 0.3;
  rope.maxForce = 1e6;
  rope.userData.tag = "main";
  rope.space = space;
  return { space, weight, rope };
}

function positions(space: Space): string {
  const out: string[] = [];
  for (let i = 0; i < space.bodies.length; i++) {
    const b = space.bodies.at(i);
    out.push(`${b.position.x},${b.position.y}`);
  }
  // A restored space lists its bodies in a different order; compare as a set.
  return out.sort().join(";");
}

function onlyRope(space: Space): Rope {
  expect(space.constraints.length).toBe(1);
  const c = space.constraints.at(0);
  expect(c).toBeInstanceOf(Rope);
  return c as unknown as Rope;
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

describe("UserConstraint — JSON", () => {
  it("saves the codec type, body ids, custom data and base properties", () => {
    const { space } = ropeScene();
    const snap = spaceToJSON(space, options);
    expect(snap.constraints).toHaveLength(1);
    const d = snap.constraints[0] as UserConstraintData;
    expect(d.type).toBe("UserConstraint");
    expect(d.userType).toBe("test/Rope");
    const anchorId = snap.bodies.findIndex((b) => b.type === "STATIC");
    const weightId = snap.bodies.findIndex((b) => b.type === "DYNAMIC");
    expect(d.bodyIds).toEqual([anchorId, weightId]);
    expect(d.body1Id).toBe(anchorId);
    expect(d.body2Id).toBe(weightId);
    expect(d.data).toEqual({ length: 60, label: "árvíztűrő 🪢" });
    expect(d.stiff).toBe(false);
    expect(d.frequency).toBe(7);
    expect(d.userData).toEqual({ tag: "main" });
  });

  it("restores the subclass with its state, bodies and base properties", () => {
    const { space } = ropeScene();
    const json = JSON.stringify(spaceToJSON(space, options));
    const restored = spaceFromJSON(JSON.parse(json), options);
    const rope = onlyRope(restored);
    expect(rope.length).toBe(60);
    expect(rope.label).toBe("árvíztűrő 🪢");
    expect(rope.body1!.type).toBe(BodyType.STATIC);
    expect(rope.body2!.type).toBe(BodyType.DYNAMIC);
    expect(rope.body1!.space).toBe(restored);
    expect(rope.body2!.space).toBe(restored);
    expect(rope.stiff).toBe(false);
    expect(rope.frequency).toBe(7);
    expect(rope.damping).toBeCloseTo(0.3, 12);
    expect(rope.maxForce).toBe(1e6);
    expect(rope.userData.tag).toBe("main");
  });

  it("the restored space simulates exactly like the original", () => {
    const { space } = ropeScene();
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    const restored = spaceFromJSON(spaceToJSON(space, options), options);
    for (let i = 0; i < 60; i++) {
      space.step(1 / 60);
      restored.step(1 / 60);
    }
    expect(positions(restored)).toBe(positions(space));
  });

  it("actually constrains after restore (the weight hangs at the rope length)", () => {
    const { space } = ropeScene();
    const restored = spaceFromJSON(spaceToJSON(space, options), options);
    for (let i = 0; i < 240; i++) restored.step(1 / 60);
    const w = onlyRope(restored).body2!.position;
    expect(Math.hypot(w.x, w.y)).toBeCloseTo(60, 0);
  });

  it("is skipped without a codec, as before", () => {
    const { space } = ropeScene();
    expect(spaceToJSON(space).constraints).toEqual([]);
    expect(spaceToJSON(space, { userConstraints: [] }).constraints).toEqual([]);
  });

  it("throws a clear error when the codec is missing on load", () => {
    const { space } = ropeScene();
    const snap = spaceToJSON(space, options);
    expect(() => spaceFromJSON(snap)).toThrow(/"test\/Rope".*options\.userConstraints/);
  });

  it("rejects a codec whose save() does not return an object", () => {
    const { space } = ropeScene();
    const bad: UserConstraintCodec<Rope> = { ...ropeCodec, save: () => 42 as Any };
    expect(() => spaceToJSON(space, { userConstraints: [bad] })).toThrow(/plain object/);
    const arr: UserConstraintCodec<Rope> = { ...ropeCodec, save: () => [] as Any };
    expect(() => spaceToBinary(space, { userConstraints: [arr] })).toThrow(/plain object/);
  });

  it("snapshots a copy of the saved data, not the live object", () => {
    const { space, rope } = ropeScene();
    const state = { length: 60, nested: { a: 1 } };
    const live: UserConstraintCodec<Rope> = { ...ropeCodec, save: () => state };
    const snap = spaceToJSON(space, { userConstraints: [live] });
    state.nested.a = 2;
    expect((snap.constraints[0] as UserConstraintData).data).toEqual({
      length: 60,
      nested: { a: 1 },
    });
    expect(rope.length).toBe(60);
  });

  it("keeps a null body slot and a body outside the space as null", () => {
    const space = new Space();
    const a = ball(space, 0, 0);
    const outside = ball(null, 50, 0);
    const rope = new Rope(a, outside, 10);
    rope.space = space;
    const snap0 = spaceToJSON(space, options);
    const d = snap0.constraints[0] as UserConstraintData;
    expect(d.bodyIds).toEqual([0, null]);
    expect(snap0.bodies).toHaveLength(1);
    expect(d.body2Id).toBe(null);

    const seen: (Body | null)[][] = [];
    const spy: UserConstraintCodec<Rope> = {
      ...ropeCodec,
      load: (data, bodies) => {
        seen.push(bodies);
        return new Rope(bodies[0], ball(null, 0, 0), data.length as number);
      },
    };
    spaceFromJSON(spaceToJSON(space, options), { userConstraints: [spy] });
    expect(seen[0][1]).toBe(null);
  });

  it("picks the first codec whose ctor matches", () => {
    const space = new Space();
    const a = ball(space, 0, 0);
    const b = ball(space, 30, 0);
    new ElasticRope(a, b, 30).space = space;
    const elasticCodec: UserConstraintCodec<ElasticRope> = {
      ...ropeCodec,
      type: "test/ElasticRope",
      ctor: ElasticRope,
      load: (data, [b1, b2]) => new ElasticRope(b1, b2, data.length as number),
    };
    const specificFirst = spaceToJSON(space, { userConstraints: [elasticCodec, ropeCodec] });
    expect((specificFirst.constraints[0] as UserConstraintData).userType).toBe("test/ElasticRope");
    const generalFirst = spaceToJSON(space, { userConstraints: [ropeCodec, elasticCodec] });
    expect((generalFirst.constraints[0] as UserConstraintData).userType).toBe("test/Rope");
    expect(
      spaceFromJSON(specificFirst, { userConstraints: [elasticCodec] }).constraints.at(0),
    ).toBeInstanceOf(ElasticRope);
  });

  it("round-trips a UserConstraint owned by a compound", () => {
    const space = new Space();
    const compound = new Compound();
    const a = ball(null, 0, 0);
    const b = ball(null, 25, 0);
    a.compound = compound;
    b.compound = compound;
    new Rope(a, b, 25).compound = compound;
    compound.space = space;

    const snap = spaceToJSON(space, options);
    expect(snap.compounds[0].constraintIndices).toEqual([0]);
    const restored = spaceFromJSON(snap, options);
    const rc = restored.compounds.at(0);
    expect(rc.constraints.length).toBe(1);
    expect(rc.constraints.at(0)).toBeInstanceOf(Rope);
  });

  it("mixes with built-in constraints, keeping indices consistent", () => {
    const { space, weight } = ropeScene();
    const other = ball(space, 120, 10);
    new PivotJoint(weight, other, new Vec2(20, 0), new Vec2(-20, 0)).space = space;
    const snap = spaceToJSON(space, options);
    expect(snap.constraints.map((c) => c.type).sort()).toEqual(["PivotJoint", "UserConstraint"]);
    const restored = spaceFromJSON(snap, options);
    expect(restored.constraints.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Binary
// ---------------------------------------------------------------------------

describe("UserConstraint — binary", () => {
  it("round-trips state, bodies and base properties", () => {
    const { space } = ropeScene();
    const restored = spaceFromBinary(spaceToBinary(space, options), options);
    const rope = onlyRope(restored);
    expect(rope.length).toBe(60);
    expect(rope.label).toBe("árvíztűrő 🪢");
    expect(rope.body1!.type).toBe(BodyType.STATIC);
    expect(rope.body2!.type).toBe(BodyType.DYNAMIC);
    expect(rope.stiff).toBe(false);
    expect(rope.frequency).toBe(7);
    expect(rope.maxForce).toBe(1e6);
  });

  it("the restored space simulates exactly like the original", () => {
    const { space } = ropeScene();
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    const restored = spaceFromBinary(spaceToBinary(space, options), options);
    for (let i = 0; i < 60; i++) {
      space.step(1 / 60);
      restored.step(1 / 60);
    }
    expect(positions(restored)).toBe(positions(space));
  });

  it("is skipped without a codec, and the rest of the snapshot still decodes", () => {
    const { space, weight } = ropeScene();
    new PivotJoint(weight, null, new Vec2(), new Vec2(80, 10)).space = space;
    const restored = spaceFromBinary(spaceToBinary(space));
    expect(restored.constraints.length).toBe(1);
    expect(restored.constraints.at(0)).toBeInstanceOf(PivotJoint);
  });

  it("throws a clear error when the codec is missing on load", () => {
    const { space } = ropeScene();
    const bin = spaceToBinary(space, options);
    expect(() => spaceFromBinary(bin)).toThrow(/"test\/Rope"/);
  });

  it("round-trips a compound-owned UserConstraint", () => {
    const space = new Space();
    const compound = new Compound();
    const a = ball(null, 0, 0);
    const b = ball(null, 25, 0);
    a.compound = compound;
    b.compound = compound;
    new Rope(a, b, 25).compound = compound;
    compound.space = space;
    const restored = spaceFromBinary(spaceToBinary(space, options), options);
    expect(restored.compounds.at(0).constraints.at(0)).toBeInstanceOf(Rope);
  });

  it("rejects a truncated string instead of reading past the end", () => {
    const { space } = ropeScene();
    const bin = spaceToBinary(space, options);
    expect(() => spaceFromBinary(bin.slice(0, bin.length - 5), options)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SpringJoint (was silently dropped by both formats)
// ---------------------------------------------------------------------------

describe("SpringJoint serialization", () => {
  function springScene() {
    const space = new Space(new Vec2(0, 300));
    const a = ball(space, 0, 0);
    a.type = BodyType.STATIC;
    const b = ball(space, 0, 50);
    const spring = new SpringJoint(a, b, new Vec2(1, 2), new Vec2(-3, 4), 42);
    spring.frequency = 4;
    spring.damping = 0.2;
    spring.space = space;
    return space;
  }

  for (const [name, roundTrip] of [
    ["JSON", (s: Space) => spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(s))))],
    ["binary", (s: Space) => spaceFromBinary(spaceToBinary(s))],
  ] as const) {
    it(`${name}: restores anchors, rest length and spring settings`, () => {
      const space = springScene();
      const restored = roundTrip(space);
      expect(restored.constraints.length).toBe(1);
      const s = restored.constraints.at(0) as unknown as SpringJoint;
      expect(s).toBeInstanceOf(SpringJoint);
      expect([s.anchor1.x, s.anchor1.y, s.anchor2.x, s.anchor2.y]).toEqual([1, 2, -3, 4]);
      expect(s.restLength).toBe(42);
      expect(s.frequency).toBe(4);
      expect(s.damping).toBeCloseTo(0.2, 12);
      for (let i = 0; i < 30; i++) {
        space.step(1 / 60);
        restored.step(1 / 60);
      }
      expect(positions(restored)).toBe(positions(space));
    });
  }
});

// ---------------------------------------------------------------------------
// Minification: the published bundle renames classes, so `constructor.name`
// is "b" or similar. Type detection must not depend on it.
// ---------------------------------------------------------------------------

describe("constraint type detection survives minified class names", () => {
  const classes = [
    PivotJoint,
    DistanceJoint,
    AngleJoint,
    MotorJoint,
    LineJoint,
    PulleyJoint,
    WeldJoint,
    SpringJoint,
  ];

  function allJoints() {
    const space = new Space();
    const a = ball(space, 0, 0);
    const b = ball(space, 30, 0);
    const c = ball(space, 60, 0);
    const d = ball(space, 90, 0);
    const v = () => new Vec2(0, 0);
    new PivotJoint(a, b, v(), v()).space = space;
    new DistanceJoint(a, b, v(), v(), 10, 20).space = space;
    new AngleJoint(a, b, -1, 1).space = space;
    new MotorJoint(a, b, 1).space = space;
    new LineJoint(a, b, v(), v(), new Vec2(1, 0), -5, 5).space = space;
    new PulleyJoint(a, b, c, d, v(), v(), v(), v(), 50, 100).space = space;
    new WeldJoint(a, b, v(), v()).space = space;
    new SpringJoint(a, b, v(), v(), 30).space = space;
    return space;
  }

  it("saves every built-in joint even when class names are mangled", () => {
    const original = classes.map((k) => Object.getOwnPropertyDescriptor(k, "name")!);
    try {
      for (const k of classes) Object.defineProperty(k, "name", { value: "b" });
      const space = allJoints();
      expect(
        spaceToJSON(space)
          .constraints.map((c) => c.type)
          .sort(),
      ).toEqual([
        "AngleJoint",
        "DistanceJoint",
        "LineJoint",
        "MotorJoint",
        "PivotJoint",
        "PulleyJoint",
        "SpringJoint",
        "WeldJoint",
      ]);
      expect(spaceFromBinary(spaceToBinary(space)).constraints.length).toBe(8);
    } finally {
      classes.forEach((k, i) => Object.defineProperty(k, "name", original[i]));
    }
  });
});

// ---------------------------------------------------------------------------
// Unlimited maxForce / maxError across JSON.stringify
// ---------------------------------------------------------------------------

describe("unlimited maxForce / maxError survive JSON.stringify", () => {
  function pinned() {
    const space = new Space(new Vec2(0, 400));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.space = space;
    const b = ball(space, 0, 0);
    new PivotJoint(anchor, b, new Vec2(0, 0), new Vec2(0, 0)).space = space;
    return { space, b };
  }

  it("stores Infinity as null, so the snapshot is stable across stringify", () => {
    const snap = spaceToJSON(pinned().space);
    expect(snap.constraints[0].maxForce).toBe(null);
    expect(snap.constraints[0].maxError).toBe(null);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
  });

  it("restores null as Infinity — the joint still holds the body", () => {
    const { space } = pinned();
    const restored = spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(space))));
    const joint = restored.constraints.at(0);
    expect(joint.maxForce).toBe(Infinity);
    expect(joint.maxError).toBe(Infinity);
    for (let i = 0; i < 60; i++) restored.step(1 / 60);
    // Without the fix the joint had maxForce 0 and the body fell ~200 px.
    const body = (joint as unknown as PivotJoint).body2;
    expect(body.type).toBe(BodyType.DYNAMIC);
    expect(Math.abs(body.position.y)).toBeLessThan(1);
  });

  it("keeps finite limits as numbers", () => {
    const { space } = pinned();
    space.constraints.at(0).maxForce = 500;
    space.constraints.at(0).maxError = 3;
    const snap = spaceToJSON(space);
    expect(snap.constraints[0].maxForce).toBe(500);
    const joint = spaceFromJSON(JSON.parse(JSON.stringify(snap))).constraints.at(0);
    expect(joint.maxForce).toBe(500);
    expect(joint.maxError).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Replay: Recorder / Player snapshots carry UserConstraints through codecs
// ---------------------------------------------------------------------------

describe("UserConstraint in a replay", () => {
  function record(withCodec: boolean) {
    const { space } = ropeScene();
    space.deterministic = true;
    const recorder = new Recorder(space, {
      keyframeEvery: 30,
      userConstraints: withCodec ? [ropeCodec] : undefined,
    });
    for (let i = 0; i < 90; i++) {
      recorder.recordFrame();
      space.step(1 / 60);
    }
    return { space, replay: recorder.finish() };
  }

  it("plays back to the recorded end state, including scrubbing to a keyframe", () => {
    const { space, replay } = record(true);
    const player = new Player(replay, null, { userConstraints: [ropeCodec] });
    player.restore();
    expect(onlyRope(player.space!).length).toBe(60);
    player.stepTo(90);
    expect(positions(player.space!)).toBe(positions(space));
    player.stepTo(45); // backward: restores the frame-30 keyframe
    expect(onlyRope(player.space!).label).toBe("árvíztűrő 🪢");
  });

  it("needs the codec on playback too", () => {
    const { replay } = record(true);
    expect(() => new Player(replay).restore()).toThrow(/"test\/Rope"/);
  });

  it("without a codec the rope is not recorded and the playback diverges", () => {
    const { space, replay } = record(false);
    const player = new Player(replay);
    player.restore();
    expect(player.space!.constraints.length).toBe(0);
    player.stepTo(90);
    expect(positions(player.space!)).not.toBe(positions(space));
  });
});

// ---------------------------------------------------------------------------
// Every built-in joint, through both formats
// ---------------------------------------------------------------------------

describe("every built-in joint round-trips through JSON and binary", () => {
  /** A chain of distinct bodies with one of each joint, all with non-default settings. */
  function jointZoo() {
    const space = new Space(new Vec2(0, 200));
    const ground = new Body(BodyType.STATIC, new Vec2(0, 0));
    ground.shapes.add(new Circle(3));
    ground.space = space;
    const bs = [1, 2, 3, 4, 5, 6].map((i) => ball(space, i * 40, 0));
    const [b1, b2, b3, b4, b5, b6] = bs;
    const pivot = new PivotJoint(ground, b1, new Vec2(40, 0), new Vec2(0, 0));
    const dist = new DistanceJoint(b1, b2, new Vec2(1, 0), new Vec2(-1, 0), 30, 45);
    const angle = new AngleJoint(b2, b3, -0.5, 0.75, 2);
    const motor = new MotorJoint(b3, b4, 1.5, 0.5);
    const line = new LineJoint(
      ground,
      b4,
      new Vec2(160, 0),
      new Vec2(0, 0),
      new Vec2(0, 1),
      -20,
      20,
    );
    const pulley = new PulleyJoint(
      b4,
      b5,
      b5,
      b6,
      new Vec2(0, 1),
      new Vec2(0, -1),
      new Vec2(1, 0),
      new Vec2(-1, 0),
      40,
      120,
      1.5,
    );
    const weld = new WeldJoint(b5, b6, new Vec2(20, 0), new Vec2(-20, 0), 0.25);
    const spring = new SpringJoint(ground, b6, new Vec2(0, 0), new Vec2(0, 0), 200);
    const all = [pivot, dist, angle, motor, line, pulley, weld, spring];
    all.forEach((c, i) => {
      c.stiff = i % 2 === 0;
      c.frequency = 3 + i;
      c.damping = 0.1 * (i + 1);
      c.maxForce = i === 3 ? Infinity : 1e5 + i;
      c.maxError = i === 4 ? Infinity : 50 + i;
      c.breakUnderForce = i === 5;
      c.breakUnderError = i === 6;
      c.removeOnBreak = i !== 7;
      c.space = space;
    });
    return space;
  }

  /** Every saved field, read back from the live constraints, keyed by type. */
  function describeJoints(space: Space): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < space.constraints.length; i++) {
      const c = space.constraints.at(i) as Any;
      const v = (p: Vec2) => [p.x, p.y];
      const fields: Record<string, unknown> = {
        stiff: c.stiff,
        frequency: c.frequency,
        damping: c.damping,
        maxForce: c.maxForce,
        maxError: c.maxError,
        breakUnderForce: c.breakUnderForce,
        breakUnderError: c.breakUnderError,
        removeOnBreak: c.removeOnBreak,
      };
      for (const k of ["jointMin", "jointMax", "ratio", "rate", "phase", "restLength"]) {
        if (typeof c[k] === "number") fields[k] = c[k];
      }
      for (const k of ["anchor1", "anchor2", "anchor3", "anchor4", "direction"]) {
        if (c[k] instanceof Vec2) fields[k] = v(c[k]);
      }
      const name = classes.find((k) => c instanceof k)!;
      out[name.prototype.constructor === name ? typeName(name) : "?"] = fields;
    }
    return out;
  }

  const classes = [
    PivotJoint,
    DistanceJoint,
    AngleJoint,
    MotorJoint,
    LineJoint,
    PulleyJoint,
    WeldJoint,
    SpringJoint,
  ];
  const typeName = (k: unknown) =>
    ["Pivot", "Distance", "Angle", "Motor", "Line", "Pulley", "Weld", "Spring"][
      classes.indexOf(k as (typeof classes)[number])
    ];

  for (const [name, roundTrip] of [
    ["JSON", (s: Space) => spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(s))))],
    ["binary", (s: Space) => spaceFromBinary(spaceToBinary(s))],
  ] as const) {
    it(`${name}: same joints, same settings, same simulation`, () => {
      const space = jointZoo();
      const restored = roundTrip(space);
      expect(restored.constraints.length).toBe(8);
      expect(describeJoints(restored)).toEqual(describeJoints(space));
      for (let i = 0; i < 60; i++) {
        space.step(1 / 60);
        restored.step(1 / 60);
      }
      expect(positions(restored)).toBe(positions(space));
    });
  }
});

// ---------------------------------------------------------------------------
// Restore order: the solver is order-dependent, so a restored space must
// iterate bodies and constraints in the original order to reproduce it.
// ---------------------------------------------------------------------------

describe("a restored space keeps the original iteration order", () => {
  function tagged(space: Space) {
    for (let i = 0; i < 5; i++) {
      const b = ball(space, i * 12, 0);
      b.userData.i = i;
    }
    const compound = new Compound();
    for (let i = 5; i < 8; i++) {
      const b = ball(null, i * 12, 40);
      b.userData.i = i;
      b.compound = compound;
    }
    compound.space = space;
    const bs = [...space.bodies];
    for (let i = 0; i < 4; i++) {
      const j = new PivotJoint(bs[i], bs[i + 1], new Vec2(6, 0), new Vec2(-6, 0));
      j.userData.i = i;
      j.space = space;
    }
  }
  const order = (list: Iterable<{ userData: Record<string, unknown> }>) =>
    [...list].map((x) => x.userData.i);

  for (const [name, roundTrip] of [
    ["JSON", (s: Space) => spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(s))))],
    ["binary", (s: Space) => spaceFromBinary(spaceToBinary(s))],
  ] as const) {
    it(`${name}: bodies, constraints and compound members in the same order`, () => {
      const space = new Space();
      tagged(space);
      const restored = roundTrip(space);
      if (name === "JSON") {
        expect(order(restored.bodies)).toEqual(order(space.bodies));
        expect(order(restored.constraints)).toEqual(order(space.constraints));
        expect(order(restored.compounds.at(0).bodies)).toEqual(order(space.compounds.at(0).bodies));
      } else {
        // Binary carries no userData; compare positions in list order instead.
        const xs = (l: Iterable<Body>) => [...l].map((b) => b.position.x);
        expect(xs(restored.bodies)).toEqual(xs(space.bodies));
        expect(xs(restored.compounds.at(0).bodies)).toEqual(xs(space.compounds.at(0).bodies));
      }
    });
  }

  it("a stack restored mid-simulation continues bit-identically (rollback)", () => {
    const space = new Space(new Vec2(0, 600));
    space.deterministic = true;
    const floor = new Body(BodyType.STATIC, new Vec2(200, 410));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    floor.space = space;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4 - (row % 2); col++) {
        const b = ball(space, 160 + col * 21 + (row % 2) * 10, 380 - row * 21);
        b.shapes.at(0).material.dynamicFriction = 0.8;
      }
    }
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(space.arbiters.length).toBeGreaterThan(10); // a real contact pile
    const json = spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(space))));
    const bin = spaceFromBinary(spaceToBinary(space));
    json.deterministic = bin.deterministic = true;
    for (let i = 0; i < 90; i++) {
      space.step(1 / 60);
      json.step(1 / 60);
      bin.step(1 / 60);
    }
    const exact = (s: Space) =>
      [...s.bodies].map((b) => `${b.position.x},${b.position.y}`).join(";");
    expect(exact(json)).toBe(exact(space));
    expect(exact(bin)).toBe(exact(space));
  });
});
