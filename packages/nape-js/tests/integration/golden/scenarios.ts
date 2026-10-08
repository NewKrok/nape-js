/**
 * Scenario catalogue for the behaviour golden suite.
 *
 * One scenario per engine subsystem, so a golden mismatch after a refactor
 * points at the area that changed. Each scenario must be fully deterministic
 * in construction (seeded RNG only) and must label every body it tracks.
 *
 * `stable: true` marks scenarios whose trajectories are not chaotic: a tiny
 * perturbation of the input changes the output by a proportionally tiny
 * amount. Those are also compared against the golden with a tolerance, on
 * every platform, so a refactor that legitimately changes floating-point
 * rounding (operation reordering, fused expressions, caching) can still be
 * checked for physical equivalence. Chaotic scenarios (piles, CCD swarms)
 * only have the bit-exact tier. The test file verifies the `stable` flags.
 */
import {
  AABB,
  AngleJoint,
  Body,
  BodyType,
  Broadphase,
  Capsule,
  CbEvent,
  CbType,
  CharacterController,
  Circle,
  Compound,
  DistanceJoint,
  FluidProperties,
  GravMassMode,
  InertiaMode,
  InteractionFilter,
  InteractionGroup,
  InteractionListener,
  InteractionType,
  LineJoint,
  MassMode,
  Material,
  MotorJoint,
  OptionType,
  PivotJoint,
  Polygon,
  PreFlag,
  PreListener,
  PulleyJoint,
  RadialGravityField,
  Ray,
  Space,
  SpringJoint,
  UserConstraint,
  Vec2,
  Vec3,
  WeldJoint,
  buildTilemapBody,
  meshTilemap,
} from "../../../src";
import type { CollisionArbiter, Shape } from "../../../src";
import {
  spaceFromBinary,
  spaceFromJSON,
  spaceToBinary,
  spaceToJSON,
} from "../../../src/serialization";
import { Trace, makeRng } from "./harness";

export interface Scenario {
  build: (t: Trace) => void;
  stable?: boolean;
}

// ── construction helpers ─────────────────────────────────────────────────────

function staticBox(space: Space, x: number, y: number, w: number, h: number): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  b.space = space;
  return b;
}

function dynBox(space: Space, x: number, y: number, w: number, h: number, mat?: Material): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h), mat));
  b.space = space;
  return b;
}

function dynCircle(space: Space, x: number, y: number, r: number, mat?: Material): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r, undefined, mat));
  b.space = space;
  return b;
}

const r = (v: Vec2): number[] => [v.x, v.y];
const r3 = (v: Vec3): number[] => [v.x, v.y, v.z];

/** Labels of the bodies in a nape list, in list order. */
function labels(t: Trace, list: any): string[] {
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list.at(i);
    out.push(t.label(item.body ?? item));
  }
  return out;
}

/** Same as {@link labels} but sorted — for queries whose order is unspecified. */
function labelSet(t: Trace, list: any): string[] {
  return labels(t, list).sort();
}

/** Every collision arbiter on a body, with its contact data. */
function arbiterProbe(t: Trace, body: Body): unknown[] {
  const out: unknown[] = [];
  const arbs = body.arbiters;
  for (let i = 0; i < arbs.length; i++) {
    const arb = arbs.at(i);
    if (!arb.isCollisionArbiter()) {
      out.push({
        type: arb.isFluidArbiter() ? "fluid" : "sensor",
        b1: t.label(arb.body1),
        b2: t.label(arb.body2),
      });
      continue;
    }
    const col = arb.collisionArbiter as CollisionArbiter;
    const contacts: unknown[] = [];
    const cs: any = col.contacts;
    for (let j = 0; j < cs.length; j++) {
      const c = cs.at(j);
      contacts.push({
        pos: r(c.position),
        pen: c.penetration,
        fresh: c.fresh,
        friction: c.friction,
        jn: r3(c.normalImpulse()),
        jt: r3(c.tangentImpulse()),
        jr: c.rollingImpulse(),
      });
    }
    out.push({
      b1: t.label(arb.body1),
      b2: t.label(arb.body2),
      normal: r(col.normal),
      radius: col.radius,
      elasticity: col.elasticity,
      dynamicFriction: col.dynamicFriction,
      staticFriction: col.staticFriction,
      rollingFriction: col.rollingFriction,
      total: r3(col.totalImpulse()),
      contacts,
    });
  }
  return out;
}

// ── scenarios ────────────────────────────────────────────────────────────────

export const scenarios: Record<string, Scenario> = {
  // ── integration / body API ─────────────────────────────────────────────────

  /** Free flight: gravity, world drag, gravMassScale, fixed mass / inertia. */
  "integrate-free-flight": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      space.worldLinearDrag = 0.05;
      space.worldAngularDrag = 0.1;
      const a = t.body(dynCircle(space, 0, 0, 10));
      a.velocity = new Vec2(120, -300);
      a.angularVel = 3;
      const b = t.body(dynBox(space, 100, 0, 20, 10));
      b.gravMassMode = GravMassMode.SCALED;
      b.gravMassScale = -0.5;
      b.angularVel = -2;
      const c = t.body(dynBox(space, 200, 0, 30, 30));
      c.massMode = MassMode.FIXED;
      c.mass = 7;
      c.inertiaMode = InertiaMode.FIXED;
      c.inertia = 250;
      c.velocity = new Vec2(-50, 0);
      const d = t.body(dynBox(space, 300, 0, 10, 40));
      d.allowRotation = false;
      d.angularVel = 5;
      const e = t.body(dynCircle(space, 400, 0, 5));
      e.allowMovement = false;
      e.angularVel = 1;
      t.run(space, { steps: 120, every: 20 });
      t.probe(
        "mass",
        [a, b, c, d, e].map((x) => [x.mass, x.inertia, x.gravMass]),
      );
    },
  },

  /** Forces, torques, impulses at points, angular impulses, kinematicVel. */
  "integrate-forces-impulses": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 0));
      const a = t.body(dynBox(space, 0, 0, 40, 20));
      const b = t.body(dynCircle(space, 200, 0, 15));
      const k = t.body(new Body(BodyType.KINEMATIC, new Vec2(400, 0)));
      k.shapes.add(new Polygon(Polygon.box(50, 10)));
      k.space = space;
      k.velocity = new Vec2(30, 10);
      k.angularVel = 0.5;
      t.run(space, {
        steps: 90,
        every: 15,
        before(i) {
          a.force = new Vec2(100 * Math.cos(i * 0.1), 50);
          a.torque = i < 30 ? 1000 : -500;
          if (i % 20 === 0) b.applyImpulse(new Vec2(20, -10), new Vec2(200, 10 + i * 0.1));
          if (i === 45) b.applyAngularImpulse(-300);
          if (i === 60) a.applyImpulse(new Vec2(0, 50));
        },
      });
    },
  },

  /** Derived mass properties of every shape kind (no stepping). */
  "mass-properties": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 0));
      const shapes: Array<[string, () => Shape]> = [
        ["circle", () => new Circle(12)],
        ["circle-offset", () => new Circle(8, new Vec2(5, -3))],
        ["box", () => new Polygon(Polygon.box(30, 12))],
        ["regular7", () => new Polygon(Polygon.regular(14, 9, 7, 0.3))],
        ["triangle", () => new Polygon([new Vec2(0, 0), new Vec2(40, 5), new Vec2(10, 30)])],
        ["capsule", () => new Capsule(60, 20)],
        ["capsule-long", () => new Capsule(90, 16)],
        ["dense", () => new Polygon(Polygon.box(10, 10), new Material(0, 1, 2, 5))],
      ];
      const rows: Record<string, unknown> = {};
      for (const [name, make] of shapes) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
        b.rotation = 0.4;
        const s = make();
        b.shapes.add(s);
        b.space = space;
        rows[name] = {
          area: s.area,
          inertia: s.inertia,
          shapeLocalCOM: r(s.localCOM),
          bodyMass: b.mass,
          bodyInertia: b.inertia,
          localCOM: r(b.localCOM),
          worldCOM: r(b.worldCOM),
          bounds: [b.bounds.x, b.bounds.y, b.bounds.width, b.bounds.height],
        };
      }
      const multi = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      multi.shapes.add(new Circle(10, new Vec2(-20, 0)));
      multi.shapes.add(new Polygon(Polygon.box(20, 40), new Material(0, 1, 2, 3)));
      multi.shapes.add(new Capsule(30, 10, new Vec2(20, 15)));
      multi.space = space;
      rows.multi = {
        mass: multi.mass,
        inertia: multi.inertia,
        localCOM: r(multi.localCOM),
        bounds: [multi.bounds.x, multi.bounds.y, multi.bounds.width, multi.bounds.height],
      };
      t.probe("shapes", rows);
    },
  },

  // ── contacts / materials ───────────────────────────────────────────────────

  /** Restitution: balls of different elasticity bouncing on a floor. */
  "material-restitution": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      t.body(staticBox(space, 0, 300, 2000, 20), "floor");
      [0, 0.3, 0.6, 0.9].forEach((e, i) => {
        t.body(dynCircle(space, -300 + i * 200, 0, 15, new Material(e, 0, 0, 1, 0)), `e${e}`);
      });
      // Impacts just below / above Config.elasticThreshold: the slow ball must
      // not bounce, the fast one must (moving the threshold flips "slow").
      const slow = t.body(dynCircle(space, 500, 274.5, 15, new Material(0.9, 0, 0, 1, 0)), "slow");
      slow.velocity = new Vec2(0, 30);
      const fast = t.body(dynCircle(space, 600, 274.5, 15, new Material(0.9, 0, 0, 1, 0)), "fast");
      fast.velocity = new Vec2(0, 45);
      t.logEvents(space);
      t.run(space, { steps: 240, every: 20 });
    },
  },

  /** Friction: boxes / rolling circles on a slope with different materials. */
  "material-friction-slope": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const slope = new Body(BodyType.STATIC, new Vec2(0, 0));
      slope.shapes.add(
        new Polygon([new Vec2(-600, -200), new Vec2(600, 150), new Vec2(-600, 150)]),
      );
      slope.space = space;
      t.body(slope, "slope");
      const angle = Math.atan2(350, 1200);
      const place = (x: number, h: number): Vec2 =>
        new Vec2(x, -200 + (x + 600) * Math.tan(angle) - h);
      t.body(dynBox(space, -500, place(-500, 12).y, 20, 20, new Material(0, 0.1, 0.2)), "slick");
      t.body(dynBox(space, -350, place(-350, 12).y, 20, 20, new Material(0, 0.6, 0.9)), "grip");
      t.body(dynBox(space, -200, place(-200, 12).y, 20, 20, new Material(0, 0.25, 0.3)), "mid");
      t.body(dynCircle(space, -50, place(-50, 12).y, 10, new Material(0, 1, 2, 1, 0.001)), "ball");
      t.body(dynCircle(space, 100, place(100, 12).y, 10, new Material(0, 1, 2, 1, 2)), "rollf");
      t.run(space, { steps: 150, every: 25 });
    },
  },

  /** Resting contact: arbiter / contact data of a small, settled stack. */
  "contact-resting-stack": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 600));
      const floor = t.body(staticBox(space, 0, 100, 400, 20), "floor");
      const a = t.body(dynBox(space, 0, 70, 40, 40), "a");
      const b = t.body(dynBox(space, 5, 30, 30, 40), "b");
      const c = t.body(dynCircle(space, -60, 75, 15), "c");
      t.logEvents(space);
      t.run(space, { steps: 60, every: 20 });
      t.probe("floor", arbiterProbe(t, floor));
      t.probe("a", arbiterProbe(t, a));
      t.probe("b", arbiterProbe(t, b));
      t.probe("c", arbiterProbe(t, c));
      t.probe("impulses", {
        aTotal: r3(a.totalImpulse()),
        aNormal: r3(a.normalImpulse()),
        aTangent: r3(a.tangentImpulse()),
        aOnB: r3(a.totalImpulse(b)),
        crush: a.crushFactor(),
        interacting: labelSet(t, a.interactingBodies()),
        spaceArbiters: (space.arbiters as any).zpp_gl(),
      });
    },
  },

  /** Every shape-pair kind: circle / polygon / capsule against each other. */
  "narrowphase-shape-pairs": {
    stable: false,
    build(t) {
      const space = new Space(new Vec2(0, 300));
      t.body(staticBox(space, 0, 200, 1600, 20), "floor");
      const makers: Array<[string, () => Shape]> = [
        ["circle", () => new Circle(12)],
        ["box", () => new Polygon(Polygon.box(24, 24))],
        ["hex", () => new Polygon(Polygon.regular(13, 13, 6))],
        ["capsule", () => new Capsule(40, 16)],
      ];
      let x = -700;
      for (const [na, ma] of makers) {
        for (const [nb, mb] of makers) {
          const lo = new Body(BodyType.DYNAMIC, new Vec2(x, 170));
          lo.shapes.add(ma());
          lo.space = space;
          t.body(lo, `${na}<${nb}`);
          const hi = new Body(BodyType.DYNAMIC, new Vec2(x + 4, 120));
          hi.rotation = 0.3;
          hi.shapes.add(mb());
          hi.space = space;
          t.body(hi, `${nb}>${na}`);
          x += 90;
        }
      }
      t.logEvents(space);
      t.run(space, { steps: 120, every: 30 });
    },
  },

  /** Multi-shape bodies with offset shapes and an Edge-sliding capsule. */
  "multi-shape-bodies": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      t.body(staticBox(space, 0, 250, 1000, 20), "floor");
      const dumbbell = new Body(BodyType.DYNAMIC, new Vec2(-200, 0));
      dumbbell.shapes.add(new Circle(15, new Vec2(-40, 0)));
      dumbbell.shapes.add(new Circle(15, new Vec2(40, 0)));
      dumbbell.shapes.add(new Polygon(Polygon.box(80, 6)));
      dumbbell.angularVel = 2;
      dumbbell.space = space;
      t.body(dumbbell, "dumbbell");
      const lshape = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      lshape.shapes.add(new Polygon(Polygon.rect(0, 0, 60, 15)));
      lshape.shapes.add(new Polygon(Polygon.rect(0, 15, 15, 45)));
      lshape.angularVel = -1;
      lshape.space = space;
      t.body(lshape, "L");
      const cap = new Body(BodyType.DYNAMIC, new Vec2(200, 0));
      cap.shapes.add(new Capsule(70, 20));
      cap.rotation = 1;
      cap.space = space;
      t.body(cap, "capsule");
      t.logEvents(space);
      t.run(space, { steps: 180, every: 30 });
    },
  },

  // ── interaction types ──────────────────────────────────────────────────────

  /** Sensors: overlap events, no collision response, sensor arbiters. */
  "interaction-sensor": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 200));
      const zone = new Body(BodyType.STATIC, new Vec2(0, 150));
      const s = new Polygon(Polygon.box(200, 60));
      s.sensorEnabled = true;
      zone.shapes.add(s);
      zone.space = space;
      t.body(zone, "zone");
      t.body(dynCircle(space, -50, 0, 10), "ballA");
      t.body(dynBox(space, 50, -60, 15, 15), "boxB");
      const sensorBall = dynCircle(space, 0, 50, 8);
      sensorBall.shapes.at(0).sensorEnabled = true;
      t.body(sensorBall, "sensorBall");
      t.logEvents(space);
      t.run(space, {
        steps: 150,
        every: 25,
        after(i) {
          if (i === 80) t.probe("zoneArbiters@80", arbiterProbe(t, zone));
        },
      });
    },
  },

  /** Fluids: buoyancy, drag, fluid gravity override, density differences. */
  "interaction-fluid": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const tank = new Body(BodyType.STATIC, new Vec2(0, 200));
      const water = new Polygon(Polygon.box(800, 200));
      water.fluidEnabled = true;
      water.fluidProperties = new FluidProperties(2, 4);
      tank.shapes.add(water);
      tank.space = space;
      t.body(tank, "tank");
      const heavyTank = new Body(BodyType.STATIC, new Vec2(1000, 200));
      const oil = new Polygon(Polygon.box(400, 200));
      oil.fluidEnabled = true;
      oil.fluidProperties = new FluidProperties(1.5, 0.5);
      oil.fluidProperties.gravity = new Vec2(0, 150);
      heavyTank.shapes.add(oil);
      heavyTank.space = space;
      t.body(heavyTank, "oilTank");
      t.body(dynBox(space, -200, 0, 30, 30, new Material(0, 1, 2, 0.5)), "light");
      t.body(dynBox(space, 0, 0, 30, 30, new Material(0, 1, 2, 4)), "heavy");
      t.body(dynCircle(space, 200, 0, 20, new Material(0, 1, 2, 1)), "neutralish");
      const raft = dynBox(space, 1000, 50, 80, 10, new Material(0, 1, 2, 0.3));
      raft.angularVel = 1;
      t.body(raft, "raft");
      t.logEvents(space);
      t.run(space, { steps: 240, every: 30 });
    },
  },

  /** Filters & groups: masks, group ignore, mid-run filter changes. */
  "interaction-filters": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      t.body(staticBox(space, 0, 200, 800, 20), "floor");
      const ghost = dynBox(space, -150, 100, 20, 20);
      ghost.shapes.at(0).filter = new InteractionFilter(2, ~1);
      t.body(ghost, "ghost");
      const group = new InteractionGroup(true);
      const g1 = dynBox(space, 0, 150, 40, 20);
      const g2 = dynBox(space, 0, 100, 40, 20);
      g1.group = group;
      g2.group = group;
      t.body(g1, "grp1");
      t.body(g2, "grp2");
      const late = dynBox(space, 150, 150, 20, 20);
      late.shapes.at(0).filter = new InteractionFilter(4, ~1);
      t.body(late, "late");
      t.logEvents(space);
      t.run(space, {
        steps: 120,
        every: 20,
        before(i) {
          if (i === 10) late.shapes.at(0).filter = new InteractionFilter(1, -1);
          if (i === 30) g2.group = null;
        },
      });
    },
  },

  /** Switching sensor / fluid / collision mid-contact; shape material swaps. */
  "interaction-type-switch": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const floor = staticBox(space, 0, 100, 600, 20);
      t.body(floor, "floor");
      const box = t.body(dynBox(space, 0, 70, 30, 30), "box");
      const ball = t.body(dynCircle(space, 100, 75, 15), "ball");
      t.logEvents(space);
      t.run(space, {
        steps: 160,
        every: 20,
        before(i) {
          const s = floor.shapes.at(0);
          if (i === 30) s.sensorEnabled = true;
          if (i === 40) s.sensorEnabled = false;
          if (i === 60) {
            s.fluidEnabled = true;
            s.fluidProperties = new FluidProperties(3, 2);
          }
          if (i === 90) s.fluidEnabled = false;
          if (i === 110) ball.shapes.at(0).material = new Material(0.9, 0, 0, 1, 0);
          if (i === 112) box.applyImpulse(new Vec2(0, -400));
        },
      });
    },
  },

  // ── callbacks ──────────────────────────────────────────────────────────────

  /** Pre-listeners: one-way platform, IGNORE_ONCE, ACCEPT with arbiter edits. */
  "callbacks-prelistener": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      const platformType = new CbType();
      const bouncyType = new CbType();
      const ghostOnceType = new CbType();
      const platform = staticBox(space, 0, 100, 200, 10);
      platform.cbTypes.add(platformType);
      t.body(platform, "platform");
      t.body(staticBox(space, 0, 300, 1000, 20), "floor");
      // Jumps up through the platform and lands on it.
      const jumper = dynCircle(space, 0, 200, 10);
      jumper.velocity = new Vec2(0, -650);
      t.body(jumper, "jumper");
      const bouncy = dynBox(space, -300, 200, 20, 20);
      bouncy.cbTypes.add(bouncyType);
      t.body(bouncy, "bouncy");
      const ghost = dynBox(space, 300, 200, 20, 20);
      ghost.cbTypes.add(ghostOnceType);
      t.body(ghost, "ghostOnce");
      let preCalls = 0;
      space.listeners.add(
        new PreListener(InteractionType.COLLISION, platformType, CbType.ANY_BODY, (cb) => {
          preCalls++;
          const arb = cb.arbiter.collisionArbiter as CollisionArbiter;
          // Normal points from shape1 to shape2; ignore when moving upward.
          const dir = cb.swapped ? -1 : 1;
          return arb.normal.y * dir < 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
        }),
      );
      space.listeners.add(
        new PreListener(InteractionType.COLLISION, bouncyType, CbType.ANY_BODY, (cb) => {
          const arb = cb.arbiter.collisionArbiter as CollisionArbiter;
          arb.elasticity = 0.8;
          arb.dynamicFriction = 0;
          return PreFlag.ACCEPT;
        }),
      );
      let onceCount = 0;
      space.listeners.add(
        new PreListener(
          InteractionType.COLLISION,
          ghostOnceType,
          CbType.ANY_BODY,
          () => (onceCount++ < 20 ? PreFlag.IGNORE_ONCE : PreFlag.ACCEPT),
          0,
          true,
        ),
      );
      t.logEvents(space);
      t.run(space, { steps: 150, every: 15 });
      t.probe("counts", { preCalls, onceCount });
    },
  },

  /** ONGOING events and listener precedence / option-type filtering. */
  "callbacks-ongoing-precedence": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      const tagA = new CbType();
      const tagB = new CbType();
      t.body(staticBox(space, 0, 100, 400, 20), "floor");
      const a = dynBox(space, -50, 50, 20, 20);
      a.cbTypes.add(tagA);
      t.body(a, "a");
      const b = dynBox(space, 50, 50, 20, 20);
      b.cbTypes.add(tagA);
      b.cbTypes.add(tagB);
      t.body(b, "b");
      t.logEvents(space, { ongoing: true });
      const order: string[] = [];
      const onlyA = new OptionType(tagA).excluding(tagB);
      for (const [prec, name] of [
        [5, "p5"],
        [-1, "p-1"],
        [10, "p10"],
      ] as Array<[number, string]>) {
        space.listeners.add(
          new InteractionListener(
            CbEvent.BEGIN,
            InteractionType.COLLISION,
            onlyA,
            CbType.ANY_BODY,
            () => order.push(name),
            prec,
          ),
        );
      }
      t.run(space, { steps: 40, every: 10 });
      t.probe("order", order);
    },
  },

  /** Sleeping: islands fall asleep, wake on contact, manual wake, teleport. */
  "sleep-wake-islands": {
    stable: false,
    build(t) {
      const space = new Space(new Vec2(0, 600));
      t.body(staticBox(space, 0, 200, 1000, 20), "floor");
      for (let i = 0; i < 3; i++) t.body(dynBox(space, -200, 170 - i * 40, 40, 40), `tower${i}`);
      const lone = t.body(dynBox(space, 200, 170, 40, 40), "lone");
      const dropper = new Body(BodyType.DYNAMIC, new Vec2(-200, -2000));
      dropper.shapes.add(new Circle(10));
      t.body(dropper, "dropper");
      t.logEvents(space);
      t.run(space, {
        steps: 400,
        every: 40,
        before(i) {
          if (i === 150) dropper.space = space;
          if (i === 300) lone.velocity = new Vec2(0, -100);
          if (i === 350) lone.position = new Vec2(300, 0);
        },
      });
    },
  },

  // ── constraints ────────────────────────────────────────────────────────────

  "joint-pivot": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const bob = t.body(dynBox(space, 100, 0, 20, 20), "bob");
      const j = t.name(new PivotJoint(space.world, bob, new Vec2(0, 0), new Vec2(-10, 0)), "pivot");
      j.space = space;
      const bob2 = t.body(dynCircle(space, 160, 0, 8), "bob2");
      const soft = t.name(new PivotJoint(bob, bob2, new Vec2(10, 0), new Vec2(0, 0)), "soft");
      soft.stiff = false;
      soft.frequency = 3;
      soft.damping = 0.2;
      soft.space = space;
      t.logEvents(space);
      t.run(space, { steps: 120, every: 20 });
      t.probe("impulse", [r3(j.bodyImpulse(bob)!), r3(soft.bodyImpulse(bob2)!)]);
    },
  },

  "joint-distance": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const anchor = t.body(staticBox(space, 0, 0, 10, 10), "anchor");
      const rope = t.body(dynCircle(space, 50, 0, 6), "rope");
      const j = new DistanceJoint(anchor, rope, new Vec2(0, 0), new Vec2(0, 0), 20, 80);
      t.name(j, "dist").space = space;
      const springy = t.body(dynBox(space, -100, 0, 12, 12), "springy");
      const k = new DistanceJoint(anchor, springy, new Vec2(0, 0), new Vec2(6, 0), 60, 60);
      k.stiff = false;
      k.frequency = 2;
      k.damping = 0.1;
      t.name(k, "softDist").space = space;
      t.run(space, { steps: 150, every: 25 });
      t.probe("impulse", [j.impulse()!.x(0, 0), k.impulse()!.x(0, 0)]);
    },
  },

  "joint-angle-motor-weld": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 0));
      const hub = t.body(dynCircle(space, 0, 0, 20), "hub");
      const pin = new PivotJoint(space.world, hub, new Vec2(0, 0), new Vec2(0, 0));
      pin.space = space;
      const motor = t.name(new MotorJoint(space.world, hub, 4, 1), "motor");
      motor.maxForce = 5e4;
      motor.space = space;
      const arm = t.body(dynBox(space, 60, 0, 60, 8), "arm");
      const armPin = new PivotJoint(hub, arm, new Vec2(30, 0), new Vec2(-30, 0));
      armPin.space = space;
      const limit = t.name(new AngleJoint(hub, arm, -0.5, 0.25), "limit");
      limit.space = space;
      const welded = t.body(dynCircle(space, 100, 0, 6), "welded");
      const weld = t.name(
        new WeldJoint(arm, welded, new Vec2(30, 0), new Vec2(-10, 0), 0.3),
        "weld",
      );
      weld.space = space;
      const geared = t.body(dynCircle(space, 0, 100, 10), "geared");
      const gearPin = new PivotJoint(space.world, geared, new Vec2(0, 100), new Vec2(0, 0));
      gearPin.space = space;
      const gear = t.name(new AngleJoint(hub, geared, 0, 0, -2), "gear");
      gear.space = space;
      t.run(space, { steps: 120, every: 20 });
      t.probe("impulses", {
        motor: motor.impulse()!.x(0, 0),
        limit: limit.impulse()!.x(0, 0),
        weld: [0, 1, 2].map((i) => weld.impulse()!.x(i, 0)),
        gear: gear.impulse()!.x(0, 0),
      });
    },
  },

  "joint-line-pulley-spring": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const slider = t.body(dynBox(space, 0, 0, 20, 20), "slider");
      const rail = t.name(
        new LineJoint(
          space.world,
          slider,
          new Vec2(0, 0),
          new Vec2(0, 0),
          new Vec2(1, 1),
          -50,
          120,
        ),
        "rail",
      );
      rail.space = space;
      const left = t.body(dynBox(space, 200, 100, 20, 20, new Material(0, 1, 2, 1)), "left");
      const right = t.body(dynBox(space, 300, 100, 20, 20, new Material(0, 1, 2, 1.5)), "right");
      const pulley = t.name(
        new PulleyJoint(
          space.world,
          left,
          space.world,
          right,
          new Vec2(200, 0),
          new Vec2(0, 0),
          new Vec2(300, 0),
          new Vec2(0, 0),
          150,
          250,
          2,
        ),
        "pulley",
      );
      pulley.space = space;
      const hanging = t.body(dynCircle(space, -200, 50, 10), "hanging");
      const spring = t.name(
        new SpringJoint(space.world, hanging, new Vec2(-200, 0), new Vec2(0, 0), 40),
        "spring",
      );
      spring.frequency = 1.5;
      spring.damping = 0.05;
      spring.space = space;
      t.run(space, { steps: 180, every: 30 });
    },
  },

  /** Breakable joints: BREAK events, removeOnBreak, maxError. */
  "joint-break": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      const bobs = [1, 3, 8].map((d, i) =>
        t.body(dynBox(space, i * 100, 50, 20, 20, new Material(0, 1, 2, d)), `bob${i}`),
      );
      const joints = bobs.map((b, i) => {
        const j = new PivotJoint(space.world, b, new Vec2(i * 100, 0), new Vec2(0, -50));
        j.maxForce = i === 1 ? 300 : 9000;
        j.breakUnderForce = true;
        j.removeOnBreak = i !== 1;
        t.name(j, `j${i}`);
        j.space = space;
        return j;
      });
      const errBob = t.body(dynCircle(space, 400, 0, 10), "errBob");
      const errJ = new DistanceJoint(space.world, errBob, new Vec2(400, 0), new Vec2(0, 0), 0, 0);
      errJ.maxError = 5;
      errJ.breakUnderError = true;
      t.name(errJ, "errJ").space = space;
      t.logEvents(space);
      t.run(space, {
        steps: 90,
        every: 15,
        before(i) {
          if (i === 30) bobs[2].applyImpulse(new Vec2(4000, 0));
          if (i === 45) errBob.position = new Vec2(460, 0);
        },
      });
      t.probe("state", {
        inSpace: joints.map((j) => j.space === space),
        active: joints.map((j) => j.active),
        errInSpace: errJ.space === space,
        constraints: space.constraints.length,
      });
    },
  },

  /** Joint chain sleeping and waking (constraint WAKE/SLEEP events). */
  "joint-chain-sleep": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 600));
      t.body(staticBox(space, 0, 100, 600, 20), "floor");
      let prev: Body | null = null;
      for (let i = 0; i < 6; i++) {
        const link = t.body(dynBox(space, -100 + i * 32, 80, 30, 10), `link${i}`);
        if (prev) {
          t.name(new PivotJoint(prev, link, new Vec2(16, 0), new Vec2(-16, 0)), `pin${i}`).space =
            space;
        }
        prev = link;
      }
      const kicker = t.body(dynCircle(space, -100, -500, 8), "kicker");
      kicker.space = null;
      t.logEvents(space);
      t.run(space, {
        steps: 360,
        every: 40,
        before(i) {
          if (i === 200) kicker.space = space;
        },
      });
    },
  },

  /** UserConstraint: a custom rope written only against the public API. */
  "joint-user-constraint": {
    stable: true,
    build(t) {
      class Rope extends UserConstraint {
        private b1: Body | null = null;
        private b2: Body | null = null;
        constructor(
          a: Body,
          b: Body,
          public length: number,
        ) {
          super(1);
          this.b1 = this.__registerBody(this.b1, a);
          this.b2 = this.__registerBody(this.b2, b);
        }
        private dir(): [number, number, number] {
          const dx = this.b2!.position.x - this.b1!.position.x;
          const dy = this.b2!.position.y - this.b1!.position.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          return d === 0 ? [0, 0, 0] : [dx / d, dy / d, d];
        }
        __copy(): UserConstraint {
          return new Rope(this.b1!, this.b2!, this.length);
        }
        __position(err: number[]): void {
          err[0] = this.dir()[2] - this.length;
        }
        __velocity(err: number[]): void {
          const [nx, ny] = this.dir();
          const v1 = this.b1!.velocity;
          const v2 = this.b2!.velocity;
          err[0] = (v2.x - v1.x) * nx + (v2.y - v1.y) * ny;
        }
        __eff_mass(eff: number[]): void {
          const m1 = this.b1!.isDynamic() ? 1 / this.b1!.mass : 0;
          eff[0] = m1 + 1 / this.b2!.mass;
        }
        __clamp(jAcc: number[]): void {
          if (jAcc[0] > 0) jAcc[0] = 0;
        }
        __impulse(imp: number[], body: Body, out: Vec3): void {
          const [nx, ny] = this.dir();
          const s = body === this.b1 ? -1 : 1;
          out.x = s * imp[0] * nx;
          out.y = s * imp[0] * ny;
          out.z = 0;
        }
      }
      const space = new Space(new Vec2(0, 400));
      const top = t.body(staticBox(space, 0, 0, 10, 10), "top");
      const bob = t.body(dynCircle(space, 70, 30, 10), "bob");
      bob.velocity = new Vec2(0, -50);
      const rope = t.name(new Rope(top, bob, 60), "rope");
      rope.space = space;
      t.run(space, { steps: 150, every: 25 });
    },
  },

  // ── kinematic / compound ───────────────────────────────────────────────────

  /** Kinematic platform carrying a box; kinematic rotation; surfaceVel belt. */
  "kinematic-platform-belt": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      const plat = new Body(BodyType.KINEMATIC, new Vec2(0, 100));
      plat.shapes.add(new Polygon(Polygon.box(150, 10)));
      plat.space = space;
      t.body(plat, "platform");
      const rider = t.body(dynBox(space, 0, 75, 20, 20), "rider");
      const belt = new Body(BodyType.STATIC, new Vec2(400, 100));
      belt.shapes.add(new Polygon(Polygon.box(300, 10)));
      belt.surfaceVel = new Vec2(60, 0);
      belt.space = space;
      t.body(belt, "belt");
      t.body(dynBox(space, 350, 80, 20, 20), "parcel");
      const spinner = new Body(BodyType.KINEMATIC, new Vec2(-300, 100));
      spinner.shapes.add(new Polygon(Polygon.box(120, 8)));
      spinner.angularVel = 0.8;
      spinner.space = space;
      t.body(spinner, "spinner");
      t.body(dynCircle(space, -330, 40, 8), "spun");
      t.logEvents(space);
      t.run(space, {
        steps: 200,
        every: 25,
        before(i) {
          plat.velocity = new Vec2(80 * Math.sin(i / 20), i > 100 ? -20 : 0);
          if (i === 150) plat.kinematicVel = new Vec2(0, 0);
        },
      });
      void rider;
    },
  },

  /** Compounds: constraints inside compounds, translate/rotate, breakApart. */
  "compound-lifecycle": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      t.body(staticBox(space, 0, 250, 1000, 20), "floor");
      const car = new Compound();
      const chassis = t.body(dynBox(space, 0, 0, 80, 20), "chassis");
      chassis.space = null;
      chassis.compound = car;
      const w1 = new Body(BodyType.DYNAMIC, new Vec2(-30, 20));
      w1.shapes.add(new Circle(12));
      w1.compound = car;
      t.body(w1, "w1");
      const w2 = new Body(BodyType.DYNAMIC, new Vec2(30, 20));
      w2.shapes.add(new Circle(12));
      w2.compound = car;
      t.body(w2, "w2");
      for (const [w, x] of [
        [w1, -30],
        [w2, 30],
      ] as Array<[Body, number]>) {
        new PivotJoint(chassis, w, new Vec2(x, 20), new Vec2(0, 0)).compound = car;
      }
      const drive = new MotorJoint(chassis, w1, 6);
      drive.compound = car;
      car.translate(new Vec2(-200, 100));
      car.rotate(new Vec2(-200, 100), 0.1);
      car.space = space;
      t.probe("com", r(car.COM()));
      t.logEvents(space);
      t.run(space, {
        steps: 200,
        every: 25,
        before(i) {
          if (i === 120) car.breakApart();
        },
      });
      t.probe("after", {
        compounds: space.compounds.length,
        constraints: space.constraints.length,
        bodies: space.bodies.length,
      });
    },
  },

  // ── broadphase / CCD ───────────────────────────────────────────────────────

  "broadphase-sweep-pile": {
    stable: false,
    build: (t) => pile(t, Broadphase.SWEEP_AND_PRUNE),
  },
  "broadphase-aabbtree-pile": {
    stable: false,
    build: (t) => pile(t, Broadphase.DYNAMIC_AABB_TREE),
  },
  "broadphase-spatialhash-pile": {
    stable: false,
    build: (t) => pile(t, Broadphase.SPATIAL_HASH),
  },

  /** CCD: fast bodies vs thin walls, bullets vs dynamics, spinning bar, disableCCD. */
  "ccd-cases": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 0));
      t.body(staticBox(space, 300, 0, 4, 600), "wall");
      const fast = t.body(dynCircle(space, 0, -200, 5), "fastCircle");
      fast.velocity = new Vec2(4000, 0);
      const fastBox = t.body(dynBox(space, 0, -150, 8, 8), "fastBox");
      fastBox.velocity = new Vec2(5000, 50);
      fastBox.angularVel = 30;
      const noCcd = t.body(dynCircle(space, 0, -100, 5), "noCCD");
      noCcd.velocity = new Vec2(4000, 0);
      noCcd.disableCCD = true;
      const target = t.body(dynBox(space, 200, 0, 10, 40), "target");
      const bullet = t.body(dynCircle(space, 0, 0, 3), "bullet");
      bullet.isBullet = true;
      bullet.velocity = new Vec2(6000, 0);
      const spinner = t.body(dynBox(space, 250, 150, 200, 4), "spinner");
      spinner.angularVel = 60;
      const victim = t.body(dynCircle(space, 330, 150, 6), "victim");
      victim.velocity = new Vec2(-100, 0);
      t.logEvents(space);
      t.run(space, { steps: 40, every: 5 });
      void target;
    },
  },

  /** Sub-stepping and varying dt / iteration counts. */
  "stepping-substeps-dt": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      space.subSteps = 4;
      t.body(staticBox(space, 0, 100, 400, 20), "floor");
      const ball = t.body(dynCircle(space, 0, 0, 10, new Material(0.5, 1, 2, 1, 0)), "ball");
      const box = t.body(dynBox(space, 50, 0, 20, 20), "box");
      box.angularVel = 1;
      t.logEvents(space);
      t.run(space, { steps: 60, every: 20, dt: 1 / 60, velIter: 4, posIter: 2 });
      space.subSteps = 1;
      t.run(space, { steps: 30, every: 10, dt: 1 / 30, velIter: 20, posIter: 20 });
      t.run(space, { steps: 30, every: 10, dt: 1 / 240 });
      t.probe("time", [space.timeStamp, space.elapsedTime]);
      void ball;
    },
  },

  /** Mid-step mutation: add / remove bodies & shapes, type switches, gravity. */
  "mutation-mid-simulation": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 400));
      t.body(staticBox(space, 0, 200, 800, 20), "floor");
      const a = t.body(dynBox(space, -100, 100, 30, 30), "a");
      const b = t.body(dynBox(space, 0, 100, 30, 30), "b");
      const c = t.body(dynCircle(space, 100, 100, 15), "c");
      const extra = new Circle(10, new Vec2(20, 0));
      t.logEvents(space);
      t.run(space, {
        steps: 200,
        every: 25,
        before(i) {
          if (i === 20) a.shapes.add(extra);
          if (i === 40) b.type = BodyType.STATIC;
          if (i === 60) b.type = BodyType.DYNAMIC;
          if (i === 70) c.space = null;
          if (i === 90) {
            c.position = new Vec2(0, 0);
            c.space = space;
          }
          if (i === 110) a.shapes.remove(extra);
          if (i === 130) space.gravity = new Vec2(200, -100);
          if (i === 160) b.type = BodyType.KINEMATIC;
          if (i === 170) b.velocity = new Vec2(-30, 0);
        },
      });
    },
  },

  // ── queries ────────────────────────────────────────────────────────────────

  /** Every space query against a fixed, frozen scene. */
  "queries-fixed-scene": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 0));
      const rng = makeRng(0x5eed);
      for (let i = 0; i < 24; i++) {
        const x = (i % 6) * 60 - 150 + rng() * 10;
        const y = Math.floor(i / 6) * 60 - 90 + rng() * 10;
        const b = new Body(BodyType.STATIC, new Vec2(x, y));
        b.rotation = rng() * Math.PI;
        if (i % 3 === 0) b.shapes.add(new Circle(12 + rng() * 8));
        else if (i % 3 === 1) b.shapes.add(new Polygon(Polygon.box(20 + rng() * 15, 15)));
        else b.shapes.add(new Capsule(40, 14));
        if (i % 7 === 0) b.shapes.at(0).filter = new InteractionFilter(2, -1);
        b.space = space;
        t.body(b, `s${i}`);
      }
      const onlyGroup2 = new InteractionFilter(1, 2);
      const ray = (ox: number, oy: number, dx: number, dy: number, max = 1000): Ray => {
        const rr = new Ray(new Vec2(ox, oy), new Vec2(dx, dy));
        rr.maxDistance = max;
        return rr;
      };
      const rayRes = (res: any): unknown =>
        res == null
          ? null
          : { shape: t.label(res.shape.body), d: res.distance, n: r(res.normal), inner: res.inner };
      const rays: unknown[] = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.1;
        rays.push(rayRes(space.rayCast(ray(0, 0, Math.cos(a), Math.sin(a)))));
        rays.push(rayRes(space.rayCast(ray(-300, -200 + k * 50, 1, 0.05), true)));
      }
      t.probe("rayCast", rays);
      t.probe("rayCastFiltered", rayRes(space.rayCast(ray(-400, -90, 1, 0), false, onlyGroup2)));
      const multi = space.rayMultiCast(ray(-400, -30, 1, 0.1));
      const multiOut: unknown[] = [];
      for (let i = 0; i < multi.length; i++) multiOut.push(rayRes(multi.at(i)));
      t.probe("rayMultiCast", multiOut);
      t.probe("bodiesUnderPoint", [
        labelSet(t, space.bodiesUnderPoint(new Vec2(-150, -90))),
        labelSet(t, space.shapesUnderPoint(new Vec2(30, 30))),
      ]);
      const box = new AABB(-100, -60, 140, 90);
      t.probe("inAABB", {
        loose: labelSet(t, space.bodiesInAABB(box, false, false)),
        strict: labelSet(t, space.bodiesInAABB(box, false, true)),
        contained: labelSet(t, space.bodiesInAABB(box, true, true)),
        shapes: labelSet(t, space.shapesInAABB(box)),
        filtered: labelSet(t, space.bodiesInAABB(box, false, true, onlyGroup2)),
      });
      t.probe("inCircle", {
        overlap: labelSet(t, space.bodiesInCircle(new Vec2(0, 0), 70)),
        contained: labelSet(t, space.bodiesInCircle(new Vec2(0, 0), 120, true)),
      });
      const probe = new Body(BodyType.DYNAMIC, new Vec2(20, -10));
      probe.rotation = 0.6;
      const probeShape = new Polygon(Polygon.box(90, 30));
      probe.shapes.add(probeShape);
      t.probe("inShape", {
        overlap: labelSet(t, space.bodiesInShape(probeShape)),
        contained: labelSet(t, space.shapesInShape(probeShape, true)),
      });
      probe.space = space;
      t.probe("inBody", labelSet(t, space.bodiesInBody(probe)));
      probe.space = null;
      const caster = new Body(BodyType.DYNAMIC, new Vec2(-320, -60));
      caster.shapes.add(new Circle(8));
      caster.velocity = new Vec2(600, 40);
      caster.angularVel = 3;
      const boxCaster = new Body(BodyType.DYNAMIC, new Vec2(-320, 60));
      boxCaster.shapes.add(new Polygon(Polygon.box(12, 12)));
      boxCaster.velocity = new Vec2(500, -60);
      boxCaster.angularVel = 4;
      const conv = (res: any): unknown =>
        res == null
          ? null
          : {
              body: t.label(res.shape.body),
              toi: res.toi,
              n: r(res.normal),
              p: r(res.position),
            };
      const multiConv = space.convexMultiCast(boxCaster.shapes.at(0), 1, true);
      const mc: unknown[] = [];
      for (let i = 0; i < multiConv.length; i++) mc.push(conv(multiConv.at(i)));
      t.probe("convexCast", {
        circle: conv(space.convexCast(caster.shapes.at(0), 1)),
        circleLive: conv(space.convexCast(caster.shapes.at(0), 1, true)),
        boxMulti: mc,
      });
    },
  },

  // ── helpers ────────────────────────────────────────────────────────────────

  /** CharacterController walking a tilemap level with a slope and a step. */
  "helper-character-tilemap": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 900));
      const grid = [
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ];
      t.probe("mesh", {
        greedy: meshTilemap(grid),
        rows: meshTilemap(grid, { merge: "rows" }),
      });
      const level = buildTilemapBody(grid, { tileSize: 32 });
      level.space = space;
      t.body(level, "level");
      const ramp = new Body(BodyType.STATIC, new Vec2(0, 0));
      ramp.shapes.add(new Polygon([new Vec2(32, 128), new Vec2(140, 128), new Vec2(140, 100)]));
      ramp.space = space;
      t.body(ramp, "ramp");
      const player = new Body(BodyType.DYNAMIC, new Vec2(60, 100));
      player.shapes.add(new Polygon(Polygon.box(14, 28)));
      player.allowRotation = false;
      player.space = space;
      t.body(player, "player");
      const cc = new CharacterController(space, player);
      const states: unknown[] = [];
      let vy = 0;
      t.run(space, {
        steps: 150,
        every: 15,
        before(i) {
          const vx = i < 100 ? 120 : -150;
          vy = Math.min(vy + 900 / 60, 600);
          if (i === 50 || i === 110) vy = -350;
          cc.setVelocity(vx, vy);
        },
        after(i) {
          const res = cc.update();
          if (res.grounded && vy > 0) vy = 0;
          if (i % 10 === 0) {
            states.push([
              i,
              res.grounded,
              res.wallLeft,
              res.wallRight,
              res.slopeAngle,
              t.label(res.groundBody),
              res.groundNormal ? r(res.groundNormal) : null,
            ]);
          }
        },
      });
      t.probe("controller", states);
      cc.destroy();
    },
  },

  /** RadialGravityField orbits. */
  "helper-radial-gravity": {
    stable: true,
    build(t) {
      const space = new Space(new Vec2(0, 0));
      const planet = t.body(new Body(BodyType.STATIC, new Vec2(0, 0)), "planet");
      planet.shapes.add(new Circle(40));
      planet.space = space;
      const field = new RadialGravityField({ source: planet, strength: 4e6, maxRadius: 600 });
      const moon = t.body(dynCircle(space, 200, 0, 5), "moon");
      moon.velocity = new Vec2(0, 140);
      const linear = new RadialGravityField({
        source: new Vec2(500, 0),
        strength: 300,
        falloff: "constant",
        scaleByMass: false,
      });
      const drifter = t.body(dynBox(space, 560, 30, 10, 10), "drifter");
      t.run(space, {
        steps: 180,
        every: 30,
        before() {
          field.apply(space);
          linear.apply(space);
        },
      });
      void drifter;
    },
  },

  // ── serialization continuation ─────────────────────────────────────────────

  /** JSON + binary round-trip mid-simulation, then continue in the copy. */
  "serialization-continue": {
    stable: false,
    build(t) {
      const space = new Space(new Vec2(0, 500));
      space.deterministic = true;
      staticBox(space, 0, 200, 600, 20);
      const rng = makeRng(77);
      for (let i = 0; i < 12; i++) {
        const b = dynBox(space, -100 + (i % 4) * 50, 100 - Math.floor(i / 4) * 40, 30, 30);
        b.angularVel = rng() - 0.5;
      }
      const pivotA = space.bodies.at(1);
      new PivotJoint(space.world, pivotA, r2v(pivotA.position), new Vec2(0, 0)).space = space;
      for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);
      const fromJson = spaceFromJSON(JSON.parse(JSON.stringify(spaceToJSON(space))));
      const fromBin = spaceFromBinary(spaceToBinary(space));
      const track = (s: Space, prefix: string): void => {
        for (let i = 0; i < s.bodies.length; i++) t.body(s.bodies.at(i), `${prefix}${i}`);
      };
      track(space, "orig");
      track(fromJson, "json");
      track(fromBin, "bin");
      // Contact / warm-start state is not part of a snapshot, so a copy taken
      // mid-contact drifts from the original (see the replay guide's
      // determinism contract); record how far, so a change shows up.
      const drift = (copy: Space): number => {
        let max = 0;
        for (let i = 0; i < space.bodies.length; i++) {
          const a = space.bodies.at(i).position;
          const b = copy.bodies.at(i).position;
          max = Math.max(max, Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        }
        return max;
      };
      const drifts: number[] = [];
      for (let i = 0; i < 90; i++) {
        t.stepIndex = i;
        for (const s of [space, fromJson, fromBin]) s.step(1 / 60, 10, 10);
        if ((i + 1) % 30 === 0) {
          t.sample();
          drifts.push(drift(fromJson), drift(fromBin));
        }
      }
      t.probe("driftFromOriginal", drifts);
    },
  },
};

function r2v(v: Vec2): Vec2 {
  return new Vec2(v.x, v.y);
}

/** Random pile used by the three broadphase scenarios. */
function pile(t: Trace, bp: Broadphase): void {
  const rng = makeRng(0xabcdef);
  const space = new Space(new Vec2(0, 600), bp);
  t.body(staticBox(space, 0, 300, 900, 20), "floor");
  const wallL = staticBox(space, -440, 150, 20, 300);
  const wallR = staticBox(space, 440, 150, 20, 300);
  t.body(wallL, "wallL");
  t.body(wallR, "wallR");
  for (let i = 0; i < 40; i++) {
    const x = (rng() - 0.5) * 700;
    const y = -rng() * 500;
    const b =
      i % 4 === 0
        ? dynCircle(space, x, y, 8 + rng() * 10)
        : i % 4 === 1
          ? dynBox(space, x, y, 12 + rng() * 20, 12 + rng() * 10)
          : i % 4 === 2
            ? (() => {
                const c = new Body(BodyType.DYNAMIC, new Vec2(x, y));
                c.shapes.add(new Capsule(30 + rng() * 20, 12));
                c.space = space;
                return c;
              })()
            : (() => {
                const p = new Body(BodyType.DYNAMIC, new Vec2(x, y));
                p.shapes.add(new Polygon(Polygon.regular(10 + rng() * 5, 10, 5)));
                p.space = space;
                return p;
              })();
    b.angularVel = (rng() - 0.5) * 4;
    t.body(b);
  }
  t.logEvents(space);
  t.run(space, { steps: 200, every: 50 });
  t.probe("query", {
    rays: [0, 1, 2, 3].map((k) => {
      const ray = new Ray(new Vec2(-430 + k * 200, -400), new Vec2(0.05, 1));
      ray.maxDistance = 1000;
      const res = space.rayCast(ray);
      return res ? [t.label(res.shape.body), res.distance] : null;
    }),
    aabb: labelSet(t, space.bodiesInAABB(new AABB(-200, 150, 400, 150))),
  });
}
