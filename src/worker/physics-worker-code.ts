/**
 * Generates the worker script source code as a string.
 *
 * This is embedded into the main bundle so that `PhysicsWorkerManager` can
 * create an inline Blob worker without requiring the consumer to host a
 * separate worker file.
 *
 * The generated code is **self-contained** — it imports the full nape-js
 * engine from the URL provided at init time.
 */

import type { FLOATS_PER_BODY, HEADER_FLOATS } from "./types";

/**
 * Returns the full worker script as a string.
 *
 * @param napeUrl - CDN / local URL to the nape-js ESM bundle.  The worker
 *   will `import(...)` this URL at runtime.
 */
export function buildWorkerScript(napeUrl: string): string {
  // The constants are inlined so the worker doesn't need to import types.
  const FLOATS_PER_BODY_VAL: typeof FLOATS_PER_BODY = 3;
  const HEADER_FLOATS_VAL: typeof HEADER_FLOATS = 3;

  return `
/* nape-js physics worker — auto-generated, do not edit */
const FLOATS_PER_BODY = ${FLOATS_PER_BODY_VAL};
const HEADER_FLOATS = ${HEADER_FLOATS_VAL};

let Space, Body, BodyType, Vec2, Circle, Polygon, Material;
let space = null;
let transforms = null;  // Float32Array view over shared or local buffer
let useShared = false;
let running = false;
let intervalId = null;
let timestep = 1 / 60;
let velIters = 10;
let posIters = 10;
let bodyMap = new Map();  // id → Body
let bodyIndex = new Map(); // id → buffer index (slot number)
let nextSlot = 0;

async function init(napeUrl) {
  const mod = await import(napeUrl);
  Space = mod.Space;
  Body = mod.Body;
  BodyType = mod.BodyType;
  Vec2 = mod.Vec2;
  Circle = mod.Circle;
  Polygon = mod.Polygon;
  Material = mod.Material;
}

function writeTransforms() {
  if (!transforms || !space) return;
  transforms[0] = bodyMap.size;
  transforms[1] = space.timeStamp;
  transforms[2] = 0; // will be overwritten with step time

  for (const [id, body] of bodyMap) {
    const slot = bodyIndex.get(id);
    if (slot === undefined) continue;
    const off = HEADER_FLOATS + slot * FLOATS_PER_BODY;
    transforms[off]     = body.position.x;
    transforms[off + 1] = body.position.y;
    transforms[off + 2] = body.rotation;
  }
}

function doStep() {
  if (!space) return;
  const t0 = performance.now();
  space.step(timestep, velIters, posIters);
  const stepMs = performance.now() - t0;
  writeTransforms();
  if (transforms) transforms[2] = stepMs;

  if (!useShared) {
    // postMessage fallback: send a copy
    const copy = new Float32Array(transforms.length);
    copy.set(transforms);
    self.postMessage({ type: "frame", buffer: copy }, [copy.buffer]);
  } else {
    self.postMessage({ type: "frame" });
  }
}

function startLoop() {
  if (intervalId !== null) return;
  running = true;
  intervalId = setInterval(doStep, timestep * 1000);
}

function stopLoop() {
  running = false;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function addShape(body, desc) {
  switch (desc.type) {
    case "circle": {
      const c = new Circle(desc.radius);
      if (desc.offsetX || desc.offsetY) {
        c.localCOM = new Vec2(desc.offsetX || 0, desc.offsetY || 0);
      }
      body.shapes.add(c);
      break;
    }
    case "box":
      body.shapes.add(new Polygon(Polygon.box(desc.width, desc.height)));
      break;
    case "polygon": {
      const verts = desc.vertices.map(v => new Vec2(v.x, v.y));
      body.shapes.add(new Polygon(verts));
      break;
    }
  }
}

function getBodyType(t) {
  switch (t) {
    case "dynamic": return BodyType.DYNAMIC;
    case "static": return BodyType.STATIC;
    case "kinematic": return BodyType.KINEMATIC;
    default: return BodyType.DYNAMIC;
  }
}

self.onmessage = async (e) => {
  const msg = e.data;

  switch (msg.type) {
    case "init": {
      await init("${napeUrl}");

      timestep = msg.timestep;
      velIters = msg.velocityIterations;
      posIters = msg.positionIterations;

      const totalFloats = HEADER_FLOATS + msg.maxBodies * FLOATS_PER_BODY;
      if (msg.buffer) {
        transforms = new Float32Array(msg.buffer);
        useShared = true;
      } else {
        transforms = new Float32Array(totalFloats);
        useShared = false;
      }

      space = new Space(new Vec2(msg.gravityX, msg.gravityY));
      bodyMap = new Map();
      bodyIndex = new Map();
      nextSlot = 0;

      self.postMessage({ type: "ready" });
      break;
    }

    case "start":
      startLoop();
      break;

    case "stop":
      stopLoop();
      break;

    case "step":
      doStep();
      break;

    case "addBody": {
      if (!space) break;
      const bt = getBodyType(msg.bodyType);
      const body = new Body(bt, new Vec2(msg.x, msg.y));

      const opts = msg.options || {};
      if (opts.rotation !== undefined) body.rotation = opts.rotation;
      if (opts.isBullet !== undefined) body.isBullet = opts.isBullet;
      if (opts.allowRotation !== undefined) body.allowRotation = opts.allowRotation;
      if (opts.allowMovement !== undefined) body.allowMovement = opts.allowMovement;

      for (const sd of msg.shapes) {
        addShape(body, sd);
      }

      if (opts.elasticity !== undefined || opts.dynamicFriction !== undefined ||
          opts.staticFriction !== undefined || opts.density !== undefined) {
        const mat = new Material(
          opts.elasticity ?? 0.0,
          opts.dynamicFriction ?? 0.2,
          opts.staticFriction ?? 0.4,
          opts.density ?? 1.0,
        );
        for (const shape of body.shapes) shape.material = mat;
      }

      body.space = space;

      if (opts.velocityX !== undefined || opts.velocityY !== undefined) {
        body.velocity = new Vec2(opts.velocityX ?? 0, opts.velocityY ?? 0);
      }
      if (opts.angularVel !== undefined) body.angularVel = opts.angularVel;

      bodyMap.set(msg.id, body);
      bodyIndex.set(msg.id, nextSlot++);
      break;
    }

    case "removeBody": {
      const body = bodyMap.get(msg.id);
      if (body) {
        body.space = null;
        bodyMap.delete(msg.id);
        bodyIndex.delete(msg.id);
      }
      break;
    }

    case "applyForce": {
      const body = bodyMap.get(msg.id);
      if (body) body.force = new Vec2(msg.fx, msg.fy);
      break;
    }

    case "applyImpulse": {
      const body = bodyMap.get(msg.id);
      if (body) body.applyImpulse(new Vec2(msg.ix, msg.iy));
      break;
    }

    case "setVelocity": {
      const body = bodyMap.get(msg.id);
      if (body) body.velocity = new Vec2(msg.vx, msg.vy);
      break;
    }

    case "setPosition": {
      const body = bodyMap.get(msg.id);
      if (body) body.position = new Vec2(msg.x, msg.y);
      break;
    }

    case "setGravity": {
      if (space) space.gravity = new Vec2(msg.gravityX, msg.gravityY);
      break;
    }

    case "destroy": {
      stopLoop();
      if (space) space.clear();
      space = null;
      bodyMap.clear();
      bodyIndex.clear();
      transforms = null;
      break;
    }
  }
};
`;
}
