/**
 * Web Worker Stress Test demo.
 *
 * Runs physics in a Web Worker so the main thread stays free for rendering.
 * The worker sends back shape descriptions on init (and on spawn), so the
 * main thread knows exactly what to draw.
 *
 * Click to spawn 8 new shapes + impulse blast nearby bodies.
 */
import {
  Vec2,
} from "../nape-js.esm.js";
import { loadThree } from "../demo-runner.js";

/* ── Constants ──────────────────────────────────────────────────────── */
const BODY_COUNT      = 300;
const MAX_BODIES      = 1024; // room for walls + initial + spawned
const FLOATS_PER_BODY = 3;
const HEADER_FLOATS   = 3;
const SPAWN_COUNT     = 8;
const BLAST_RADIUS    = 200;
const BLAST_FORCE     = 2000;

/* ── Colour palette ─────────────────────────────────────────────────── */
const COLORS_2D = [
  { fill: "rgba(88,166,255,0.25)",  stroke: "#58a6ff" },
  { fill: "rgba(210,153,34,0.25)",  stroke: "#d29922" },
  { fill: "rgba(63,185,80,0.25)",   stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.25)",   stroke: "#f85149" },
  { fill: "rgba(163,113,247,0.25)", stroke: "#a371f7" },
  { fill: "rgba(77,208,225,0.25)",  stroke: "#4dd0e1" },
];
const COLORS_3D = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0x4dd0e1];
const WALL_FILL   = "rgba(120,160,200,0.10)";
const WALL_STROKE = "#607888";

/* ── Worker script (inlined as Blob) ────────────────────────────────── */

function buildWorkerScript(napeUrl) {
  return `
const FLOATS_PER_BODY = ${FLOATS_PER_BODY};
const HEADER_FLOATS = ${HEADER_FLOATS};

let Space, Body, BodyType, Vec2, Circle, Polygon;
let space = null;
let transforms = null;
let useShared = false;
let running = false;
let intervalId = null;
let timestep = 1/60;
let velIters = 8, posIters = 3;
let bodies = [];
let maxBodies = ${MAX_BODIES};

async function loadNape(url) {
  const mod = await import(url);
  Space = mod.Space; Body = mod.Body; BodyType = mod.BodyType;
  Vec2 = mod.Vec2; Circle = mod.Circle; Polygon = mod.Polygon;
}

function writeTransforms() {
  if (!transforms || !space) return;
  transforms[0] = bodies.length;
  transforms[1] = space.timeStamp;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const off = HEADER_FLOATS + i * FLOATS_PER_BODY;
    transforms[off]   = b.position.x;
    transforms[off+1] = b.position.y;
    transforms[off+2] = b.rotation;
  }
}

function doStep() {
  if (!space) return;
  const t0 = performance.now();
  space.step(timestep, velIters, posIters);
  const ms = performance.now() - t0;
  writeTransforms();
  if (transforms) transforms[2] = ms;
  if (!useShared) {
    const copy = new Float32Array(transforms.length);
    copy.set(transforms);
    self.postMessage({ type: "frame", buffer: copy }, [copy.buffer]);
  } else {
    self.postMessage({ type: "frame" });
  }
}

function spawnBody(x, y) {
  if (bodies.length >= maxBodies) return null;
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  let desc;
  if (Math.random() < 0.5) {
    const r = 5 + Math.random() * 10;
    b.shapes.add(new Circle(r));
    desc = { circle: true, radius: r };
  } else {
    const w = 8 + Math.random() * 16;
    const h = 8 + Math.random() * 16;
    b.shapes.add(new Polygon(Polygon.box(w, h)));
    desc = { box: true, hw: w/2, hh: h/2 };
  }
  b.space = space;
  bodies.push(b);
  return desc;
}

self.onmessage = async (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "init": {
      await loadNape("${napeUrl}");
      timestep = msg.timestep;
      velIters = msg.velIters;
      posIters = msg.posIters;
      maxBodies = msg.maxBodies;
      const totalFloats = HEADER_FLOATS + msg.maxBodies * FLOATS_PER_BODY;
      if (msg.buffer) {
        transforms = new Float32Array(msg.buffer);
        useShared = true;
      } else {
        transforms = new Float32Array(totalFloats);
      }
      space = new Space(new Vec2(msg.gravityX, msg.gravityY));
      bodies = [];

      const shapeDescs = [];
      const t = 20;
      [[msg.W/2, msg.H-t/2, msg.W, t],
       [t/2, msg.H/2, t, msg.H],
       [msg.W-t/2, msg.H/2, t, msg.H],
       [msg.W/2, t/2, msg.W, t]].forEach(([x,y,w,h]) => {
        const b = new Body(BodyType.STATIC, new Vec2(x, y));
        b.shapes.add(new Polygon(Polygon.box(w, h)));
        b.space = space;
        bodies.push(b);
        shapeDescs.push({ wall: true, hw: w/2, hh: h/2 });
      });

      for (let i = 0; i < msg.count; i++) {
        const x = 40 + Math.random() * (msg.W - 80);
        const y = 40 + Math.random() * (msg.H * 0.6);
        const d = spawnBody(x, y);
        if (d) shapeDescs.push(d);
      }

      writeTransforms();
      self.postMessage({ type: "ready", shapeDescs });
      break;
    }
    case "start":
      if (intervalId !== null) break;
      running = true;
      intervalId = setInterval(doStep, timestep * 1000);
      break;
    case "stop":
      running = false;
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      break;
    case "blast": {
      if (!space) break;
      const newDescs = [];
      // Spawn new bodies near click
      for (let i = 0; i < msg.spawnCount; i++) {
        const sx = msg.x + (Math.random() - 0.5) * 40;
        const sy = msg.y + (Math.random() - 0.5) * 40;
        const d = spawnBody(sx, sy);
        if (d) newDescs.push(d);
      }
      // Impulse blast on nearby bodies
      for (const body of bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - msg.x;
        const dy = body.position.y - msg.y;
        const distSq = dx * dx + dy * dy;
        const maxDist = msg.radius;
        if (distSq < maxDist * maxDist && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const f = msg.force * (1 - dist / maxDist);
          body.applyImpulse(new Vec2(dx / dist * f, dy / dist * f));
        }
      }
      if (newDescs.length > 0) {
        self.postMessage({ type: "spawned", shapeDescs: newDescs });
      }
      break;
    }
    case "destroy":
      running = false;
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      if (space) space.clear();
      space = null; bodies = []; transforms = null;
      break;
  }
};
`;
}

/* ── Demo state ─────────────────────────────────────────────────────── */

let worker = null;
let transforms = null;
let shapeData = null;
let workerReady = false;
let useShared = false;
let workerStepMs = 0;
let overlayEl = null;
// 3D state
let threeMeshes = [];
let threeScene = null;
let threeInited = false;
let _THREE = null;

function cleanup() {
  if (worker) {
    worker.postMessage({ type: "destroy" });
    worker.terminate();
    worker = null;
  }
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
  }
  transforms = null;
  shapeData = null;
  workerReady = false;
  workerStepMs = 0;
  threeMeshes = [];
  threeScene = null;
  threeInited = false;
}

/* ── 3D helpers ─────────────────────────────────────────────────────── */

function createMesh3D(sd, idx) {
  if (!_THREE) return null;
  let geom;
  const isWall = !!sd.wall;

  if (sd.circle) {
    geom = new _THREE.SphereGeometry(sd.radius, 16, 16);
  } else {
    // Box or wall
    const pts = [
      new _THREE.Vector2(-sd.hw, -sd.hh),
      new _THREE.Vector2( sd.hw, -sd.hh),
      new _THREE.Vector2( sd.hw,  sd.hh),
      new _THREE.Vector2(-sd.hw,  sd.hh),
    ];
    geom = new _THREE.ExtrudeGeometry(
      new _THREE.Shape(pts),
      { depth: 30, bevelEnabled: !isWall, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 },
    );
    geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
    geom.computeVertexNormals();
    geom.translate(0, 0, -15);
  }

  const color = isWall ? 0x455a64 : COLORS_3D[idx % COLORS_3D.length];
  const mesh = new _THREE.Mesh(
    geom,
    new _THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444, side: _THREE.DoubleSide }),
  );
  const edges = new _THREE.LineSegments(
    new _THREE.EdgesGeometry(geom, 15),
    new _THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
  );
  mesh.add(edges);
  return mesh;
}

function ensureThreeScene(renderer, scene) {
  if (threeInited) return;
  threeInited = true;
  threeScene = scene;
  _THREE = _THREE || window.THREE;
  // Try to resolve THREE from an already-loaded module
  if (!_THREE) {
    try { _THREE = loadThree(); } catch (_) { /* will be set when 3D mode activates */ }
  }
  // Build meshes for all existing shapes
  if (_THREE && shapeData) {
    for (let i = 0; i < shapeData.length; i++) {
      const mesh = createMesh3D(shapeData[i], i);
      if (mesh) {
        scene.add(mesh);
        threeMeshes.push(mesh);
      }
    }
  }
}

/* ── Demo definition ────────────────────────────────────────────────── */

export default {
  id: "web-worker",
  label: "Web Worker Physics",
  tags: ["Worker", "Performance", "Stress Test", "Click"],
  featured: false,
  desc:
    "Physics simulation runs <b>off the main thread</b> in a Web Worker. " +
    "300 bodies at 60 Hz — main thread only renders. " +
    "<b>Click</b> to spawn shapes + impulse blast.",

  setup(space, W, H) {
    cleanup();
    space.gravity = new Vec2(0, 0);

    const totalFloats = HEADER_FLOATS + MAX_BODIES * FLOATS_PER_BODY;

    if (typeof SharedArrayBuffer !== "undefined") {
      try {
        const sab = new SharedArrayBuffer(totalFloats * Float32Array.BYTES_PER_ELEMENT);
        transforms = new Float32Array(sab);
        useShared = true;
      } catch (_) {
        transforms = new Float32Array(totalFloats);
        useShared = false;
      }
    } else {
      transforms = new Float32Array(totalFloats);
      useShared = false;
    }

    const napeUrl = new URL("../nape-js.esm.js", import.meta.url).href;
    const script = buildWorkerScript(napeUrl);
    const blob = new Blob([script], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    worker = new Worker(blobUrl, { type: "module" });
    URL.revokeObjectURL(blobUrl);

    workerReady = false;
    shapeData = null;

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "ready") {
        shapeData = msg.shapeDescs;
        workerReady = true;
        worker.postMessage({ type: "start" });
      } else if (msg.type === "frame") {
        if (!useShared && msg.buffer) transforms = msg.buffer;
        if (transforms) workerStepMs = transforms[2] || 0;
      } else if (msg.type === "spawned") {
        // Append new shape descriptions
        if (shapeData && msg.shapeDescs) {
          for (const sd of msg.shapeDescs) {
            shapeData.push(sd);
            // Add 3D mesh if in 3D mode
            if (threeScene && _THREE) {
              const mesh = createMesh3D(sd, shapeData.length - 1);
              if (mesh) {
                threeScene.add(mesh);
                threeMeshes.push(mesh);
              }
            }
          }
        }
      }
    };

    worker.onerror = (err) => {
      console.error("[web-worker demo] Worker error:", err);
    };

    worker.postMessage({
      type: "init",
      maxBodies: MAX_BODIES,
      timestep: 1/60,
      velIters: 8,
      posIters: 3,
      gravityX: 0,
      gravityY: 600,
      W, H,
      count: BODY_COUNT,
      buffer: useShared ? transforms.buffer : null,
    });
  },

  init(container) {
    overlayEl = document.createElement("div");
    overlayEl.style.cssText =
      "position:absolute;top:8px;left:8px;z-index:10;" +
      "display:flex;gap:8px;align-items:center;pointer-events:none;";
    overlayEl.innerHTML =
      '<span style="background:rgba(63,185,80,0.85);color:#fff;font:bold 11px/1 system-ui;' +
      'padding:3px 8px;border-radius:4px;letter-spacing:0.5px">WORKER</span>' +
      '<span id="__worker_step" style="color:#8b949e;font:11px/1 monospace"></span>' +
      '<span style="color:#8b949e;font:11px/1 monospace">' +
      (useShared ? "SharedArrayBuffer" : "postMessage fallback") + '</span>';
    container.appendChild(overlayEl);
  },

  /* Click → spawn + blast in worker */
  click(x, y) {
    if (!worker || !workerReady) return;
    worker.postMessage({
      type: "blast",
      x, y,
      spawnCount: SPAWN_COUNT,
      radius: BLAST_RADIUS,
      force: BLAST_FORCE,
    });
  },

  /* ── 2D render ───────────────────────────────────────────────────── */
  render(ctx, _space, W, H) {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(48,54,61,0.4)";
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= W; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += 50) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    if (!transforms || !workerReady || !shapeData) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Starting worker\u2026", W / 2, H / 2);
      return;
    }

    const bodyCount = transforms[0] | 0;
    const count = Math.min(bodyCount, shapeData.length);

    for (let i = 0; i < count; i++) {
      const off = HEADER_FLOATS + i * FLOATS_PER_BODY;
      const bx  = transforms[off];
      const by  = transforms[off + 1];
      const rot = transforms[off + 2];
      const sd  = shapeData[i];

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);

      if (sd.wall) {
        ctx.fillStyle = WALL_FILL;
        ctx.strokeStyle = WALL_STROKE;
        ctx.lineWidth = 1;
        ctx.fillRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
        ctx.strokeRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
      } else if (sd.circle) {
        const c = COLORS_2D[i % COLORS_2D.length];
        ctx.beginPath();
        ctx.arc(0, 0, sd.radius, 0, Math.PI * 2);
        ctx.fillStyle = c.fill;
        ctx.fill();
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (sd.box) {
        const c = COLORS_2D[i % COLORS_2D.length];
        ctx.fillStyle = c.fill;
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 1.2;
        ctx.fillRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
        ctx.strokeRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
      }

      ctx.restore();
    }

    // Update worker step time badge
    const stepEl = document.getElementById("__worker_step");
    if (stepEl) stepEl.textContent = `Step: ${workerStepMs.toFixed(2)}ms`;
  },

  /* ── 3D render (called by DemoRunner via render3d hook) ──────────── */
  render3d(renderer, scene, camera) {
    // loadThree() is always called before setMode("3d"), so it's cached
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }

    ensureThreeScene(renderer, scene);

    if (!transforms || !workerReady || !shapeData) {
      renderer.render(scene, camera);
      return;
    }

    const bodyCount = transforms[0] | 0;
    const count = Math.min(bodyCount, threeMeshes.length);

    for (let i = 0; i < count; i++) {
      const off = HEADER_FLOATS + i * FLOATS_PER_BODY;
      const mesh = threeMeshes[i];
      mesh.position.set(transforms[off], -transforms[off + 1], 0);
      mesh.rotation.z = -transforms[off + 2];
      mesh.visible = true;
    }
    // Hide excess meshes (shouldn't happen, but safety)
    for (let i = count; i < threeMeshes.length; i++) {
      threeMeshes[i].visible = false;
    }

    renderer.render(scene, camera);
  },

  code2d: `// Web Worker Physics — off-thread simulation
//
// 1. Build an inline Blob worker that imports nape-js
// 2. Allocate a SharedArrayBuffer for body transforms
// 3. Worker writes [x, y, rotation] per body at 60 Hz
// 4. Main thread reads the buffer for rendering (zero-copy)
// 5. Click to spawn shapes + impulse blast

import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
} from "https://cdn.jsdelivr.net/npm/@newkrok/nape-js/dist/index.js";

const BODY_COUNT = 300;
const FLOATS_PER_BODY = 3;
const HEADER_FLOATS = 3;
const maxBodies = 1024;
const totalFloats = HEADER_FLOATS + maxBodies * FLOATS_PER_BODY;

// SharedArrayBuffer for zero-copy transform sharing
const sab = new SharedArrayBuffer(totalFloats * 4);
const transforms = new Float32Array(sab);

// Worker script (inlined)
const workerCode = \`
  // ... import nape-js, create Space, spawn bodies ...
  // On "blast" message: spawn + applyImpulse on nearby
  // Each tick: space.step(1/60)
  // Write transforms to SharedArrayBuffer
  // transforms[HEADER + i*3]   = body.position.x
  // transforms[HEADER + i*3+1] = body.position.y
  // transforms[HEADER + i*3+2] = body.rotation
\`;

const blob = new Blob([workerCode], { type: "application/javascript" });
const worker = new Worker(URL.createObjectURL(blob), { type: "module" });

// Click handler: spawn + blast
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  const y = (e.clientY - rect.top) / rect.height * H;
  worker.postMessage({ type: "blast", x, y, spawnCount: 8, radius: 200, force: 2000 });
});

// Main thread: render from SharedArrayBuffer
function render() {
  ctx.clearRect(0, 0, W, H);
  const bodyCount = transforms[0];
  for (let i = 0; i < bodyCount; i++) {
    const off = HEADER_FLOATS + i * FLOATS_PER_BODY;
    const x = transforms[off], y = transforms[off+1], rot = transforms[off+2];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  requestAnimationFrame(render);
}
render();`,
};
