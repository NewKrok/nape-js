/**
 * benchmark-engines.js — Adapter layer for physics engine benchmarks
 *
 * Provides a uniform API for nape-js, Matter.js, Planck.js, and Rapier
 * so identical scenarios can be run and compared fairly.
 *
 * Each adapter implements:
 *   createWorld(gravity)          → world handle
 *   addStaticBox(world, x, y, w, h)
 *   addDynamicBox(world, x, y, w, h)
 *   addDynamicCircle(world, x, y, r)
 *   addJoint(world, bodyA, bodyB, anchorA, anchorB)
 *   step(world, dt)
 *   getBodyCount(world)
 *   getBodies(world)              → [{x, y, rotation, w, h, r, isStatic}]
 *   destroyWorld(world)
 */

// ---------------------------------------------------------------------------
// nape-js (local ESM bundle)
// ---------------------------------------------------------------------------
import {
  Space, Body, BodyType, Vec2, Circle as NapeCircle, Polygon as NapePolygon,
  PivotJoint, Material, FluidProperties
} from "./nape-js.esm.js";

export const NapeAdapter = {
  name: "nape-js",
  color: "#58a6ff",
  loaded: true,

  // nape-js uses pixel units directly — gravity in px/s²
  createWorld(gravityY_px = 600) {
    return new Space(new Vec2(0, gravityY_px));
  },

  addStaticBox(space, x, y, w, h) {
    const body = new Body(BodyType.STATIC, new Vec2(x, y));
    body.shapes.add(new NapePolygon(NapePolygon.box(w, h)));
    body.space = space;
    body._benchW = w;
    body._benchH = h;
    return body;
  },

  addDynamicBox(space, x, y, w, h) {
    const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    body.shapes.add(new NapePolygon(NapePolygon.box(w, h)));
    body.space = space;
    body._benchW = w;
    body._benchH = h;
    return body;
  },

  addDynamicCircle(space, x, y, r) {
    const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    body.shapes.add(new NapeCircle(r));
    body.space = space;
    body._benchR = r;
    return body;
  },

  addJoint(space, bodyA, bodyB, ax, ay, bx, by) {
    const j = new PivotJoint(bodyA, bodyB, new Vec2(ax, ay), new Vec2(bx, by));
    j.space = space;
    return j;
  },

  addFluidBox(space, x, y, w, h) {
    const body = new Body(BodyType.STATIC, new Vec2(x, y));
    const shape = new NapePolygon(NapePolygon.box(w, h));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(1.5, 3.0);
    body.shapes.add(shape);
    body.space = space;
    return body;
  },

  enableCCD(body) {
    body.isBullet = true;
  },

  step(space, dt) {
    // Use engine defaults: 10 velocity, 10 position iterations
    space.step(dt);
  },

  getBodyCount(space) {
    let count = 0;
    for (const _ of space.bodies) count++;
    return count;
  },

  getBodies(space) {
    const result = [];
    for (const b of space.bodies) {
      const isCircle = !!b._benchR;
      result.push({
        x: b.position.x,
        y: b.position.y,
        rotation: b.rotation,
        w: b._benchW || 0,
        h: b._benchH || 0,
        r: b._benchR || 0,
        isStatic: b.type === BodyType.STATIC,
        isCircle,
      });
    }
    return result;
  },

  destroyWorld(space) {
    space.clear();
  },
};

// ---------------------------------------------------------------------------
// nape-js GPU (WebGPU compute shader path)
// ---------------------------------------------------------------------------

/**
 * GPU adapter — identical scene setup to NapeAdapter, but uses
 * space.initGPU() + space.stepGPU() for the velocity solver.
 * Falls back gracefully to CPU if WebGPU is unavailable.
 */
export const NapeGPUAdapter = {
  name: "nape-js (GPU)",
  color: "#a371f7",
  loaded: true,
  _gpuInitialized: false,

  createWorld(gravityY_px = 600) {
    const space = new Space(new Vec2(0, gravityY_px));
    // GPU init is async — we do it lazily on first step
    space._benchGPUReady = false;
    space.initGPU().then((ok) => {
      space._benchGPUReady = ok;
      NapeGPUAdapter._gpuInitialized = ok;
    });
    return space;
  },

  addStaticBox: NapeAdapter.addStaticBox,
  addDynamicBox: NapeAdapter.addDynamicBox,
  addDynamicCircle: NapeAdapter.addDynamicCircle,
  addJoint: NapeAdapter.addJoint,
  addFluidBox: NapeAdapter.addFluidBox,
  enableCCD: NapeAdapter.enableCCD,

  async step(space, dt) {
    await space.stepGPU(dt);
  },

  getBodyCount: NapeAdapter.getBodyCount,
  getBodies: NapeAdapter.getBodies,

  destroyWorld(space) {
    space.clear();
  },
};

// ---------------------------------------------------------------------------
// Matter.js (loaded via <script> tag, global `Matter`)
// ---------------------------------------------------------------------------
export const MatterAdapter = {
  name: "Matter.js",
  color: "#f85149",
  loaded: false,

  init() {
    this.loaded = typeof Matter !== "undefined";
    return this.loaded;
  },

  // Matter.js gravity is a scale factor (1 = default ≈ 980 px/s² at 60fps).
  // To match nape-js 600 px/s²: scale = 600 / 980 ≈ 0.612
  createWorld(gravityY_px = 600) {
    const engine = Matter.Engine.create();
    engine.gravity.y = gravityY_px / 980;
    return engine;
  },

  addStaticBox(engine, x, y, w, h) {
    const body = Matter.Bodies.rectangle(x, y, w, h, { isStatic: true });
    body._benchW = w;
    body._benchH = h;
    Matter.Composite.add(engine.world, body);
    return body;
  },

  addDynamicBox(engine, x, y, w, h) {
    const body = Matter.Bodies.rectangle(x, y, w, h);
    body._benchW = w;
    body._benchH = h;
    Matter.Composite.add(engine.world, body);
    return body;
  },

  addDynamicCircle(engine, x, y, r) {
    const body = Matter.Bodies.circle(x, y, r);
    body._benchR = r;
    Matter.Composite.add(engine.world, body);
    return body;
  },

  addJoint(engine, bodyA, bodyB, ax, ay, bx, by) {
    const c = Matter.Constraint.create({
      bodyA,
      bodyB,
      pointA: { x: ax, y: ay },
      pointB: { x: bx, y: by },
      stiffness: 1,
      length: 0,
    });
    Matter.Composite.add(engine.world, c);
    return c;
  },

  addFluidBox() { return null; /* not supported */ },

  enableCCD() { /* not supported */ },

  step(engine, dt) {
    Matter.Engine.update(engine, dt * 1000);
  },

  getBodyCount(engine) {
    return Matter.Composite.allBodies(engine.world).length;
  },

  getBodies(engine) {
    return Matter.Composite.allBodies(engine.world).map((b) => ({
      x: b.position.x,
      y: b.position.y,
      rotation: b.angle,
      w: b._benchW || 0,
      h: b._benchH || 0,
      r: b._benchR || 0,
      isStatic: b.isStatic,
      isCircle: !!b._benchR,
    }));
  },

  destroyWorld(engine) {
    Matter.World.clear(engine.world);
    Matter.Engine.clear(engine);
  },
};

// ---------------------------------------------------------------------------
// Planck.js (loaded via <script> tag, global `planck`)
// ---------------------------------------------------------------------------
export const PlanckAdapter = {
  name: "Planck.js",
  color: "#3fb950",
  loaded: false,

  // Planck uses meters (Box2D convention), so we use a pixel-to-meter scale
  SCALE: 30,

  init() {
    this.loaded = typeof planck !== "undefined";
    return this.loaded;
  },

  // Planck uses meters (Box2D). Convert px/s² → m/s² by dividing by SCALE.
  createWorld(gravityY_px = 600) {
    return planck.World(planck.Vec2(0, gravityY_px / this.SCALE));
  },

  addStaticBox(world, x, y, w, h) {
    const S = this.SCALE;
    const body = world.createBody({ position: planck.Vec2(x / S, y / S) });
    body.createFixture(planck.Box(w / 2 / S, h / 2 / S), 0);
    body._benchW = w;
    body._benchH = h;
    return body;
  },

  addDynamicBox(world, x, y, w, h) {
    const S = this.SCALE;
    const body = world.createBody({
      type: "dynamic",
      position: planck.Vec2(x / S, y / S),
    });
    body.createFixture(planck.Box(w / 2 / S, h / 2 / S), { density: 1.0 });
    body._benchW = w;
    body._benchH = h;
    return body;
  },

  addDynamicCircle(world, x, y, r) {
    const S = this.SCALE;
    const body = world.createBody({
      type: "dynamic",
      position: planck.Vec2(x / S, y / S),
    });
    body.createFixture(planck.Circle(r / S), { density: 1.0 });
    body._benchR = r;
    return body;
  },

  addJoint(world, bodyA, bodyB, ax, ay, bx, by) {
    const S = this.SCALE;
    // Use explicit local anchors (single-arg JointDef form)
    return world.createJoint(
      planck.RevoluteJoint({
        bodyA,
        bodyB,
        localAnchorA: planck.Vec2(ax / S, ay / S),
        localAnchorB: planck.Vec2(bx / S, by / S),
        collideConnected: false,
      })
    );
  },

  addFluidBox() { return null; /* not supported */ },

  enableCCD(body) {
    body.setBullet(true);
  },

  step(world, dt) {
    // Planck.js default: 8 velocity, 3 position iterations
    world.step(dt);
  },

  getBodyCount(world) {
    let count = 0;
    for (let b = world.getBodyList(); b; b = b.getNext()) count++;
    return count;
  },

  getBodies(world) {
    const S = this.SCALE;
    const result = [];
    for (let b = world.getBodyList(); b; b = b.getNext()) {
      const pos = b.getPosition();
      const isCircle = !!b._benchR;
      result.push({
        x: pos.x * S,
        y: pos.y * S,
        rotation: b.getAngle(),
        w: b._benchW || 0,
        h: b._benchH || 0,
        r: b._benchR || 0,
        isStatic: b.isStatic(),
        isCircle,
      });
    }
    return result;
  },

  destroyWorld(world) {
    // Planck has no explicit destroy — just let GC handle it
  },
};

// ---------------------------------------------------------------------------
// Rapier (loaded via ESM import, async WASM init)
// ---------------------------------------------------------------------------
export const RapierAdapter = {
  name: "Rapier",
  color: "#d29922",
  loaded: false,
  RAPIER: null,

  async init() {
    try {
      // Try SIMD build first (Chrome 91+, Firefox 89+, Safari 16.4+)
      let RAPIER;
      try {
        RAPIER = await import(
          "https://cdn.jsdelivr.net/npm/@dimforge/rapier2d-simd-compat@0.19.3/rapier.mjs"
        );
      } catch (_simdErr) {
        // Fall back to non-SIMD compat build
        RAPIER = await import(
          "https://cdn.jsdelivr.net/npm/@dimforge/rapier2d-compat@0.19.3/rapier.mjs"
        );
      }
      await RAPIER.init();
      this.RAPIER = RAPIER;
      this.loaded = true;
    } catch (e) {
      console.warn("Rapier failed to load:", e);
      this.loaded = false;
    }
    return this.loaded;
  },

  // Rapier uses meters. Convert px/s² → m/s² by dividing by SCALE (30).
  createWorld(gravityY_px = 600) {
    const R = this.RAPIER;
    const S = 30;
    const world = new R.World(new R.Vector2(0.0, gravityY_px / S));
    world._bodies = [];
    return world;
  },

  addStaticBox(world, x, y, w, h) {
    const R = this.RAPIER;
    const S = 30; // pixel-to-meter
    const bodyDesc = R.RigidBodyDesc.fixed().setTranslation(x / S, y / S);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = R.ColliderDesc.cuboid(w / 2 / S, h / 2 / S);
    world.createCollider(colliderDesc, body);
    const entry = { handle: body, w, h, r: 0, isStatic: true, isCircle: false };
    world._bodies.push(entry);
    return entry;
  },

  addDynamicBox(world, x, y, w, h) {
    const R = this.RAPIER;
    const S = 30;
    const bodyDesc = R.RigidBodyDesc.dynamic().setTranslation(x / S, y / S);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = R.ColliderDesc.cuboid(w / 2 / S, h / 2 / S).setDensity(1.0);
    world.createCollider(colliderDesc, body);
    const entry = { handle: body, w, h, r: 0, isStatic: false, isCircle: false };
    world._bodies.push(entry);
    return entry;
  },

  addDynamicCircle(world, x, y, r) {
    const R = this.RAPIER;
    const S = 30;
    const bodyDesc = R.RigidBodyDesc.dynamic().setTranslation(x / S, y / S);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = R.ColliderDesc.ball(r / S).setDensity(1.0);
    world.createCollider(colliderDesc, body);
    const entry = { handle: body, w: 0, h: 0, r, isStatic: false, isCircle: true };
    world._bodies.push(entry);
    return entry;
  },

  addJoint(world, entryA, entryB, ax, ay, bx, by) {
    const R = this.RAPIER;
    const S = 30;
    // Rapier revolute: local anchor on bodyA, local anchor on bodyB
    const params = R.JointData.revolute(
      { x: ax / S, y: ay / S },
      { x: bx / S, y: by / S }
    );
    return world.createImpulseJoint(params, entryA.handle, entryB.handle, true);
  },

  addFluidBox() { return null; /* not supported */ },

  enableCCD(entry) {
    entry.handle.enableCcd(true);
  },

  step(world) {
    world.step();
  },

  getBodyCount(world) {
    return world._bodies.length;
  },

  getBodies(world) {
    const S = 30;
    return world._bodies.map((entry) => {
      const pos = entry.handle.translation();
      return {
        x: pos.x * S,
        y: pos.y * S,
        rotation: entry.handle.rotation(),
        w: entry.w,
        h: entry.h,
        r: entry.r,
        isStatic: entry.isStatic,
        isCircle: entry.isCircle,
      };
    });
  },

  destroyWorld(world) {
    world.free();
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const ALL_ENGINES = [NapeAdapter, NapeGPUAdapter, MatterAdapter, PlanckAdapter, RapierAdapter];
