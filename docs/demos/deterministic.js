/**
 * Deterministic Twin-Simulation demo.
 *
 * Two identical physics spaces run side by side. With `space.deterministic = true`,
 * every body position matches bit-for-bit on every frame. A live status overlay
 * shows the match state and frame count.
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon, PivotJoint, DistanceJoint,
} from "../nape-js.esm.js";
import { drawBody, drawGrid } from "../renderer.js";
import { loadThree } from "../renderers/threejs-adapter.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _spaceB = null;
let _frame = 0;
let _matched = 0;   // count of frames that matched perfectly
let _mismatched = 0;
let _lastComparedStamp = -1;
let _pendingSpawns = [];
let _W = 0;
let _H = 0;
let _THREE = null;

// Seeded PRNG for reproducible "random" setups across both spaces
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Scene builder — called identically for both spaces
// ---------------------------------------------------------------------------

function buildScene(space, W, H, rng) {
  space.gravity = new Vec2(0, 600);
  space.deterministic = true;

  const halfW = W / 2;

  // Floor
  const floor = new Body(BodyType.STATIC, new Vec2(halfW, H - 20));
  floor.shapes.add(new Polygon(Polygon.box(halfW - 10, 20)));
  floor.space = space;

  // Angled ramp
  const ramp = new Body(BodyType.STATIC, new Vec2(halfW * 0.6, H * 0.45));
  ramp.shapes.add(new Polygon(Polygon.box(halfW * 0.55, 12)));
  ramp.rotation = -0.25;
  ramp.space = space;

  // Small shelf on the right
  const shelf = new Body(BodyType.STATIC, new Vec2(halfW * 0.85, H * 0.65));
  shelf.shapes.add(new Polygon(Polygon.box(halfW * 0.25, 10)));
  shelf.rotation = 0.15;
  shelf.space = space;

  // Dynamic bodies — mixed circles and boxes
  for (let i = 0; i < 20; i++) {
    const x = halfW * 0.2 + rng() * halfW * 0.6;
    const y = 40 + rng() * H * 0.25;
    const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));

    if (rng() < 0.5) {
      body.shapes.add(new Circle(6 + rng() * 10));
    } else {
      const w = 10 + rng() * 16;
      const h = 10 + rng() * 16;
      body.shapes.add(new Polygon(Polygon.box(w, h)));
    }

    body.space = space;
  }

  // Chain — a series of bodies linked by distance joints
  let prev = null;
  const chainStart = halfW * 0.15;
  for (let i = 0; i < 6; i++) {
    const cx = chainStart + i * 22;
    const cy = H * 0.2;
    const link = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
    link.shapes.add(new Circle(5));
    link.space = space;

    if (prev) {
      const joint = new DistanceJoint(
        prev, link,
        Vec2.weak(0, 0), Vec2.weak(0, 0),
        18, 24,
      );
      joint.space = space;
    } else {
      // Pin first link to world
      const pin = new PivotJoint(
        space.world, link,
        Vec2.weak(cx, cy), Vec2.weak(0, 0),
      );
      pin.space = space;
    }
    prev = link;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compare two spaces — return true if all dynamic body positions match. */
function spacesMatch(spA, spB) {
  const aPos = [];
  const bPos = [];

  for (const b of spA.bodies) {
    if (b.isDynamic()) aPos.push(b.position.x, b.position.y, b.rotation);
  }
  for (const b of spB.bodies) {
    if (b.isDynamic()) bPos.push(b.position.x, b.position.y, b.rotation);
  }

  if (aPos.length !== bPos.length) return false;
  for (let i = 0; i < aPos.length; i++) {
    if (aPos[i] !== bPos[i]) return false;
  }
  return true;
}

/** Spawn matching shapes in both spaces on click. */
function spawnInBoth(x, y, spA, spB, halfW) {
  // Clamp x to the left half (single-space coordinates)
  const localX = Math.min(Math.max(x, 30), halfW - 30);
  const localY = Math.max(y, 30);

  for (const sp of [spA, spB]) {
    for (let i = 0; i < 4; i++) {
      const bx = localX + (i % 2) * 16 - 8;
      const by = localY - Math.floor(i / 2) * 16;
      const body = new Body(BodyType.DYNAMIC, new Vec2(bx, by));
      if (i % 2 === 0) {
        body.shapes.add(new Circle(7 + i));
      } else {
        body.shapes.add(new Polygon(Polygon.box(14, 14)));
      }
      body.space = sp;
    }
  }
}

// ---------------------------------------------------------------------------
// Overlay — shared by canvas2d render and 3D/PixiJS overlay
// ---------------------------------------------------------------------------

function drawOverlay(ctx, W, H) {
  const halfW = W / 2;
  ctx.save();
  ctx.font = "bold 13px monospace";
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(88,166,255,0.8)";
  ctx.fillText("Space A", 12, 10);
  ctx.fillText("Space B", halfW + 12, 10);

  const statusY = 34;
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(200,220,255,0.6)";
  ctx.fillText(`Frame: ${_frame}`, 12, statusY);

  const allMatch = _mismatched === 0;
  if (allMatch) {
    ctx.fillStyle = "rgba(63,185,80,0.9)";
    ctx.fillText(`MATCH  ${_matched}/${_frame}`, 12, statusY + 16);
  } else {
    ctx.fillStyle = "rgba(248,81,73,0.9)";
    ctx.fillText(`MISMATCH  ${_mismatched}/${_frame}`, 12, statusY + 16);
  }

  ctx.fillStyle = "rgba(200,220,255,0.4)";
  ctx.fillText("Click to drop shapes", 12, H - 20);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3D mesh builder helper (shared by render3d)
// ---------------------------------------------------------------------------

function ensureMeshes3d(scene, sp, meshList, trackedSet, offsetX) {
  /* eslint-disable no-undef -- THREE: module import in CodePen, _THREE in local adapter */
  const _T = _THREE || (typeof THREE !== "undefined" ? THREE : null);
  if (!_T) return;
  for (const body of sp.bodies) {
    if (trackedSet.has(body)) continue;
    trackedSet.add(body);
    for (const shape of body.shapes) {
      let geom;
      if (shape.isCircle()) {
        geom = new _T.SphereGeometry(shape.castCircle.radius, 16, 16);
      } else if (shape.isPolygon()) {
        const verts = shape.castPolygon.localVerts;
        const len = verts.length;
        if (len < 3) continue;
        const pts = [];
        for (let i = 0; i < len; i++) pts.push(new _T.Vector2(verts.at(i).x, verts.at(i).y));
        geom = new _T.ExtrudeGeometry(new _T.Shape(pts), {
          depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2,
        });
        geom.applyMatrix4(new _T.Matrix4().makeScale(1, -1, 1));
        geom.computeVertexNormals();
        geom.translate(0, 0, -15);
      }
      if (!geom) continue;
      const cIdx = (body.userData?._colorIdx ?? 0) % 6;
      const MESH_COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xef5350, 0xce93d8, 0x4dd0e1];
      const color = body.isStatic() ? 0x455a64 : MESH_COLORS[cIdx];
      const mesh = new _T.Mesh(geom, new _T.MeshPhongMaterial({
        color, shininess: 80, specular: 0x444444, side: _T.DoubleSide,
      }));
      scene.add(mesh);
      meshList.push({ mesh, body, offsetX });
    }
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

const demoDef = {
  id: "deterministic",
  label: "Deterministic Mode",
  tags: ["Deterministic", "Multiplayer", "Constraint", "Polygon", "Circle"],
  desc: 'Two identical simulations run side by side with <code>space.deterministic = true</code>. Every position matches bit-for-bit. <b>Click</b> to drop shapes into both.',
  walls: false,

  setup(space, W, H) {
    _W = W;
    _H = H;
    _frame = 0;
    _matched = 0;
    _mismatched = 0;
    _lastComparedStamp = -1;
    _pendingSpawns = [];

    const rngA = mulberry32(42);
    buildScene(space, W / 2, H, rngA);

    _spaceB = new Space();
    const rngB = mulberry32(42);
    buildScene(_spaceB, W / 2, H, rngB);
  },

  step(space, W, H) {
    // demo.step() runs once per DISPLAY frame, while the runner steps Space A
    // on a fixed 60 Hz accumulator (0, 1 or 2 steps per frame on 60/120 Hz
    // monitors). Stepping B blindly here would run it at the display rate —
    // 2× speed on a 120 Hz screen — so instead keep B in lockstep by catching
    // it up to A's timeStamp, and compare only once per physics step.
    while (_spaceB.timeStamp < space.timeStamp) {
      _spaceB.step(1 / 60, 8, 3);
    }
    // Apply queued click-spawns only while the stamps are equal, so both
    // spaces receive the new bodies at the exact same simulation time.
    if (_pendingSpawns.length > 0) {
      for (const s of _pendingSpawns) spawnInBoth(s.x, s.y, space, _spaceB, s.halfW);
      _pendingSpawns = [];
    }
    if (space.timeStamp !== _lastComparedStamp) {
      _lastComparedStamp = space.timeStamp;
      _frame++;
      if (spacesMatch(space, _spaceB)) {
        _matched++;
      } else {
        _mismatched++;
      }
    }
  },

  click(x, y, space, W, H) {
    // Queue instead of spawning immediately: a click lands between display
    // frames, when Space A may be 1-2 physics steps ahead of Space B.
    const halfW = W / 2;
    const localX = x < halfW ? x : x - halfW;
    _pendingSpawns.push({ x: localX, y, halfW });
  },

  render(ctx, space, W, H, showOutlines) {
    const halfW = W / 2;

    // --- Left half: Space A ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfW, H);
    ctx.clip();
    drawGrid(ctx, halfW, H);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    ctx.restore();

    // --- Divider ---
    ctx.save();
    ctx.strokeStyle = "rgba(88,166,255,0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- Right half: Space B (translated) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(halfW, 0, halfW, H);
    ctx.clip();
    ctx.translate(halfW, 0);
    drawGrid(ctx, halfW, H);
    for (const body of _spaceB.bodies) drawBody(ctx, body, showOutlines);
    ctx.restore();

    drawOverlay(ctx, W, H);
  },

  // -------------------------------------------------------------------------
  // ThreeJS
  // -------------------------------------------------------------------------

  _render3d(adapter, space, W, H) {
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      adapter.getRenderer().render(adapter.getScene(), adapter.getCamera());
      return;
    }
    this.render3d(adapter.getRenderer(), adapter.getScene(), adapter.getCamera(), space, W, H);
  },

  render3d(renderer, scene, camera, space, W, H) {
    /* eslint-disable no-undef -- THREE: module import in CodePen, _THREE in local adapter */
    const _T = _THREE || (typeof THREE !== "undefined" ? THREE : null);
    if (!_T) return;
    const halfW = W / 2;

    if (!scene.userData._detA) {
      scene.userData._detA = [];
      scene.userData._detASet = new Set();
      scene.userData._detB = [];
      scene.userData._detBSet = new Set();
    }

    ensureMeshes3d(scene, space, scene.userData._detA, scene.userData._detASet, 0);
    ensureMeshes3d(scene, _spaceB, scene.userData._detB, scene.userData._detBSet, halfW);

    const allMeshes = [...scene.userData._detA, ...scene.userData._detB];
    for (const entry of allMeshes) {
      const b = entry.body;
      entry.mesh.position.set(b.position.x + entry.offsetX, -b.position.y, 0);
      entry.mesh.rotation.z = -b.rotation;
    }

    // Divider
    if (!scene.userData._divider) {
      const dg = new _T.PlaneGeometry(2, H);
      const dm = new _T.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0.4 });
      const divider = new _T.Mesh(dg, dm);
      divider.position.set(halfW, -H / 2, 10);
      scene.add(divider);
      scene.userData._divider = divider;
    }

    renderer.render(scene, camera);
  },

  // -------------------------------------------------------------------------
  // PixiJS
  // -------------------------------------------------------------------------

  renderPixi(adapter, space, W, H, showOutlines) {
    const { PIXI, app } = adapter.getEngine();
    const halfW = W / 2;

    adapter.syncBodies(space);

    if (!app.stage._detBContainer) {
      app.stage._detBContainer = new PIXI.Container();
      app.stage._detBContainer.x = halfW;
      app.stage.addChild(app.stage._detBContainer);
      app.stage._detBSprites = new Map();
    }
    const container = app.stage._detBContainer;
    const sprites = app.stage._detBSprites;

    const FILL_COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];

    for (const body of _spaceB.bodies) {
      if (sprites.has(body)) continue;
      const gfx = new PIXI.Graphics();
      const isStatic = body.isStatic();
      const cIdx = (body.userData?._colorIdx ?? 0) % FILL_COLORS.length;
      const color = isStatic ? 0x607888 : FILL_COLORS[cIdx];

      for (const shape of body.shapes) {
        if (shape.isCircle()) {
          const r = shape.castCircle.radius;
          gfx.circle(0, 0, r);
          gfx.fill({ color, alpha: 0.35 });
          gfx.stroke({ color, alpha: 0.8, width: 1.2 });
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          const len = verts.length;
          if (len < 3) continue;
          gfx.moveTo(verts.at(0).x, verts.at(0).y);
          for (let i = 1; i < len; i++) gfx.lineTo(verts.at(i).x, verts.at(i).y);
          gfx.closePath();
          gfx.fill({ color, alpha: 0.35 });
          gfx.stroke({ color, alpha: 0.8, width: 1.2 });
        }
      }
      container.addChild(gfx);
      sprites.set(body, gfx);
    }

    for (const [body, gfx] of sprites) {
      gfx.x = body.position.x;
      gfx.y = body.position.y;
      gfx.rotation = body.rotation;
    }

    // Divider
    if (!app.stage._detDivider) {
      const div = new PIXI.Graphics();
      div.moveTo(halfW, 0);
      div.lineTo(halfW, H);
      div.stroke({ color: 0x58a6ff, alpha: 0.4, width: 2 });
      app.stage.addChild(div);
      app.stage._detDivider = div;
    }

    app.render();
  },

  // -------------------------------------------------------------------------
  // 2D overlay for 3D/PixiJS modes
  // -------------------------------------------------------------------------

  render3dOverlay(ctx, space, W, H) {
    drawOverlay(ctx, W, H);
  },

};

// ---------------------------------------------------------------------------
// Wire up renderOverrides (adapter-aware threejs callback)
// ---------------------------------------------------------------------------

function overlayFn(ctx, space, W, H) {
  demoDef.render3dOverlay(ctx, space, W, H);
}

demoDef.renderOverrides = {
  canvas2d: (ctx, sp, w, h, outlines) => demoDef.render(ctx, sp, w, h, outlines),
  threejs:  (adapter, sp, w, h) => demoDef._render3d(adapter, sp, w, h),
  pixijs:   (adapter, sp, w, h, outlines) => demoDef.renderPixi(adapter, sp, w, h, outlines),
  overlay:  overlayFn,
};

export default demoDef;
