/**
 * Consolidated CodePen generation for nape-js demo pages.
 *
 * Provides templates for each renderer and a single openInCodePen() function
 * used by both app.js (homepage) and examples.js (grid page).
 *
 * Supports two modes:
 *  1. Explicit code strings (demo.code, demo.code2d, demo.code3d, demo.codePixi)
 *  2. Auto-generation from demo hooks (setup/step/click/drag/release) via .toString()
 */

const NAPE_VERSION = "3.35.0";
const NAPE_PIXI_VERSION = "0.1.0";
const THREE_VERSION = "0.170.0";
const PIXI_VERSION = "8";

const NAPE_CDN = `https://cdn.jsdelivr.net/npm/@newkrok/nape-js@3.35.0/dist/index.js`;
const NAPE_PIXI_CDN = `https://cdn.jsdelivr.net/npm/@newkrok/nape-pixi@0.1.0/dist/index.js`;
const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`;
const PIXI_CDN = `https://cdn.jsdelivr.net/npm/pixi.js@${PIXI_VERSION}/dist/pixi.min.mjs`;

export const PACKAGE_VERSIONS = {
  nape: NAPE_VERSION,
  napePixi: NAPE_PIXI_VERSION,
  three: THREE_VERSION,
  pixi: PIXI_VERSION,
};

// =========================================================================
// Shared embedded helpers — common to multiple templates
// =========================================================================

const SPAWN_RANDOM = `let _spawnCount = 0;
function spawnRandomShape(space, x, y, opts) {
  const { minR = 5, maxR = 20, minW = 8, maxW = 34 } = opts || {};
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(minR + Math.random() * (maxR - minR)));
  } else {
    const w = minW + Math.random() * (maxW - minW), h = minW + Math.random() * (maxW - minW);
    body.shapes.add(new Polygon(Polygon.box(w, h)));
  }
  try { body.userData._colorIdx = _spawnCount++; } catch (_) {}
  body.space = space;
  return body;
}
`;

const WALLS_HELPER = `function addWalls() {
  const t = 20;
  const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - t / 2));
  floor.shapes.add(new Polygon(Polygon.box(W, t))); floor.space = space;
  const left = new Body(BodyType.STATIC, new Vec2(t / 2, H / 2));
  left.shapes.add(new Polygon(Polygon.box(t, H))); left.space = space;
  const right = new Body(BodyType.STATIC, new Vec2(W - t / 2, H / 2));
  right.shapes.add(new Polygon(Polygon.box(t, H))); right.space = space;
  const ceil = new Body(BodyType.STATIC, new Vec2(W / 2, t / 2));
  ceil.shapes.add(new Polygon(Polygon.box(W, t))); ceil.space = space;
  return floor;
}
`;

// =========================================================================
// Water / fluid rendering helpers (from renderers/water-renderer.js)
// =========================================================================

const WATER_HELPERS = `// ── Water Renderer ──────────────────────────────────────────────────────────
function waveY(x, time) {
  return Math.sin(x * 0.02 + time * 2.0) * 3
       + Math.sin(x * 0.035 - time * 1.5) * 2
       + Math.sin(x * 0.07 + time * 3.0) * 1;
}

function drawWaveSurface2D(ctx, W, H, surfaceY, time, opts) {
  const margin = (opts && opts.margin) || 20;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(margin, H - margin / 2);
  for (let x = margin; x <= W - margin; x += 3) ctx.lineTo(x, surfaceY + waveY(x, time));
  ctx.lineTo(W - margin, H - margin / 2);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, surfaceY - 10, 0, H);
  grad.addColorStop(0, "rgba(30,144,255,0.28)");
  grad.addColorStop(0.3, "rgba(20,100,200,0.35)");
  grad.addColorStop(1, "rgba(10,50,120,0.45)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  for (let x = margin; x <= W - margin; x += 2) {
    const wy = surfaceY + waveY(x, time);
    if (x === margin) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
  }
  ctx.strokeStyle = "rgba(100,200,255,0.9)";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(80,180,255,0.6)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.beginPath();
  for (let x = margin; x <= W - margin; x += 2) {
    const wy = surfaceY + waveY(x + 40, time * 0.8) + 4;
    if (x === margin) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
  }
  ctx.strokeStyle = "rgba(150,220,255,0.3)";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}
`;

const WATER_HELPERS_3D = `// ── Water 3D Helpers ────────────────────────────────────────────────────────
function waveY(x, time) {
  return Math.sin(x * 0.02 + time * 2.0) * 3
       + Math.sin(x * 0.035 - time * 1.5) * 2
       + Math.sin(x * 0.07 + time * 3.0) * 1;
}

function buildWaveGeometry3D(W, surfaceY, time, opts) {
  const margin = (opts && opts.margin) || 20;
  const xMin = margin, xMax = W - margin, zMin = -30, zMax = 30, xSegs = 80, zSegs = 8;
  const geom = new THREE.BufferGeometry();
  const verts = [], indices = [], normals = [];
  for (let zi = 0; zi <= zSegs; zi++) {
    const z = zMin + (zi / zSegs) * (zMax - zMin);
    const zFactor = 1.0 - 0.3 * Math.abs(z / zMax);
    for (let xi = 0; xi <= xSegs; xi++) {
      const x = xMin + (xi / xSegs) * (xMax - xMin);
      verts.push(x, -(surfaceY + waveY(x + z * 0.3, time) * zFactor), z);
      normals.push(0, 1, 0);
    }
  }
  for (let zi = 0; zi < zSegs; zi++) {
    for (let xi = 0; xi < xSegs; xi++) {
      const a = zi * (xSegs + 1) + xi, b = a + 1, c = a + (xSegs + 1), d = c + 1;
      indices.push(a, b, c); indices.push(b, d, c);
    }
  }
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function updateWaveGeometry3D(geom, W, surfaceY, time, opts) {
  const margin = (opts && opts.margin) || 20;
  const xMin = margin, xMax = W - margin, zMin = -30, zMax = 30, xSegs = 80, zSegs = 8;
  const pos = geom.attributes.position;
  let idx = 0;
  for (let zi = 0; zi <= zSegs; zi++) {
    const z = zMin + (zi / zSegs) * (zMax - zMin);
    const zFactor = 1.0 - 0.3 * Math.abs(z / zMax);
    for (let xi = 0; xi <= xSegs; xi++) {
      const x = xMin + (xi / xSegs) * (xMax - xMin);
      pos.setY(idx, -(surfaceY + waveY(x + z * 0.3, time) * zFactor));
      idx++;
    }
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
}

function createWater3D(THREE_unused, W, H, surfaceY, time, opts) {
  const margin = (opts && opts.margin) || 20;
  const waterH = H - surfaceY;
  const surfGeom = buildWaveGeometry3D(W, surfaceY, time, opts);
  const surfMat = new THREE.MeshPhongMaterial({
    color: 0x1e90ff, transparent: true, opacity: 0.45, shininess: 100,
    specular: 0x66aaff, emissive: 0x1e6abf, emissiveIntensity: 0.7,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const surfaceMesh = new THREE.Mesh(surfGeom, surfMat);
  surfaceMesh.renderOrder = 999;
  const volGeom = new THREE.BoxGeometry(W - 2 * margin, waterH - 6, 60);
  const volMat = new THREE.MeshPhongMaterial({
    color: 0x1464aa, transparent: true, opacity: 0.35,
    emissive: 0x0e4478, emissiveIntensity: 0.6,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const volumeMesh = new THREE.Mesh(volGeom, volMat);
  volumeMesh.position.set(W / 2, -(surfaceY + waterH / 2 + 3), 0);
  volumeMesh.renderOrder = 998;
  const group = new THREE.Group();
  group.add(volumeMesh); group.add(surfaceMesh);
  return { group, surfaceMesh, volumeMesh };
}

function updateWater3D(water, W, surfaceY, time, opts) {
  updateWaveGeometry3D(water.surfaceMesh.geometry, W, surfaceY, time, opts);
}
`;

const WATER_HELPERS_PIXI = `// ── Water PixiJS Helper ─────────────────────────────────────────────────────
function waveY(x, time) {
  return Math.sin(x * 0.02 + time * 2.0) * 3
       + Math.sin(x * 0.035 - time * 1.5) * 2
       + Math.sin(x * 0.07 + time * 3.0) * 1;
}

function drawWaterPixi(gfx, W, H, surfaceY, time, opts) {
  const margin = (opts && opts.margin) || 20;
  const pts = [margin, H - margin / 2];
  for (let x = margin; x <= W - margin; x += 3) pts.push(x, surfaceY + waveY(x, time));
  pts.push(W - margin, H - margin / 2);
  gfx.poly(pts, true);
  gfx.fill({ color: 0x1e90ff, alpha: 0.3 });
  gfx.moveTo(margin, surfaceY + waveY(margin, time));
  for (let x = margin + 2; x <= W - margin; x += 2) gfx.lineTo(x, surfaceY + waveY(x, time));
  gfx.stroke({ color: 0x64c8ff, width: 2.5, alpha: 0.9 });
}
`;

// =========================================================================
// Renderer helpers embedded in CodePen output
// =========================================================================

const RENDERER_2D = `// ── Renderer ────────────────────────────────────────────────────────────────
const COLORS = [
  { fill: "rgba(88,166,255,0.18)",  stroke: "#58a6ff" },
  { fill: "rgba(210,153,34,0.18)",  stroke: "#d29922" },
  { fill: "rgba(63,185,80,0.18)",   stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.18)",   stroke: "#f85149" },
  { fill: "rgba(163,113,247,0.18)", stroke: "#a371f7" },
  { fill: "rgba(219,171,255,0.18)", stroke: "#dbabff" },
];
let _showOutlines = __OUTLINES__;
function bodyColor(body) {
  const custom = body.userData?._color;
  if (custom) return custom;
  if (body.isStatic()) return { fill: "rgba(120,160,200,0.15)", stroke: "#607888" };
  const idx = (body.userData?._colorIdx ?? 0) % COLORS.length;
  return COLORS[idx];
}
let drawBody = function(body) {
  const px = body.position.x, py = body.position.y;
  ctx.save(); ctx.translate(px, py); ctx.rotate(body.rotation);
  const _c = bodyColor(body);
  const { fill, stroke } = _showOutlines
    ? _c
    : { fill: _c.fill, stroke: null };
  for (const shape of body.shapes) {
    let sf = fill, ss = stroke;
    if (shape.fluidEnabled) { sf = "rgba(30,144,255,0.25)"; ss = _showOutlines ? "rgba(100,200,255,0.6)" : null; }
    else if (shape.sensorEnabled) { sf = _showOutlines ? "rgba(88,166,255,0.06)" : "rgba(88,166,255,0.03)"; ss = _showOutlines ? "rgba(88,166,255,0.3)" : null; }
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sf; ctx.fill();
      if (ss) { ctx.strokeStyle = ss; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0);
        ctx.strokeStyle = ss + "55"; ctx.stroke(); }
    } else if (shape.isCapsule()) {
      const cap = shape.castCapsule;
      const hl = cap.halfLength, r = cap.radius;
      ctx.beginPath();
      ctx.moveTo(-hl, -r); ctx.lineTo(hl, -r);
      ctx.arc(hl, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-hl, r);
      ctx.arc(-hl, 0, r, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = sf; ctx.fill();
      if (ss) { ctx.strokeStyle = ss; ctx.lineWidth = 1.2; ctx.stroke(); }
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.length; if (len < 3) continue;
      ctx.beginPath(); ctx.moveTo(verts.at(0).x, verts.at(0).y);
      for (let i = 1; i < len; i++) ctx.lineTo(verts.at(i).x, verts.at(i).y);
      ctx.closePath(); ctx.fillStyle = sf; ctx.fill();
      if (ss) { ctx.strokeStyle = ss; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
  }
  ctx.restore();
};
let drawGrid = function() {
  ctx.strokeStyle = "#1a2030"; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
};
function drawConstraintLines() {
  try {
    const raw = space.constraints;
    for (let i = 0; i < raw.length; i++) {
      const c = raw.at(i);
      if (c.body1 && c.body2) {
        ctx.beginPath();
        ctx.moveTo(c.body1.position.x, c.body1.position.y);
        ctx.lineTo(c.body2.position.x, c.body2.position.y);
        ctx.strokeStyle = "#d2992233"; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  } catch(_) {}
}
// ── End Renderer ─────────────────────────────────────────────────────────────
`;

const RENDERER_3D = `// ── Three.js Renderer ───────────────────────────────────────────────────────
const MESH_COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];
let _showOutlines3D = __OUTLINES__;
const _meshes = [];

function addBodyMesh(body) {
  if (body.userData?._hidden3d) return;
  for (const shape of body.shapes) {
    let geom;
    if (shape.isCircle()) {
      geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
    } else if (shape.isCapsule()) {
      // True 3D capsule. Three's CapsuleGeometry builds along +Y; nape's
      // capsule spine is +X, so rotate 90° around Z to align.
      const cap = shape.castCapsule;
      geom = new THREE.CapsuleGeometry(cap.radius, cap.halfLength * 2, 8, 16);
      geom.rotateZ(Math.PI / 2);
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      if (verts.length < 3) continue;
      const pts = [];
      for (let i = 0; i < verts.length; i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
      geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts),
        { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
      geom.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1));
      geom.computeVertexNormals(); geom.translate(0, 0, -15);
    }
    if (!geom) continue;
    const isSensor = shape.sensorEnabled || shape.fluidEnabled;
    const _cc = body.userData?._color;
    const cIdx = (body.userData?._colorIdx ?? 0) % MESH_COLORS.length;
    const color = _cc
      ? parseInt(_cc.stroke.replace("#", ""), 16)
      : body.isStatic() ? 0x607888 : MESH_COLORS[cIdx];
    const mat = isSensor
      ? new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 })
      : new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    scene.add(mesh);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom, 15),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    edges.visible = _showOutlines3D;
    mesh.add(edges);
    _meshes.push({ mesh, body, edges });
  }
}

function setOutlines3D(show) {
  _showOutlines3D = show;
  for (const { edges } of _meshes) { if (edges) edges.visible = show; }
}

function syncBodies3D(space) {
  const alive = new Set();
  for (const body of space.bodies) alive.add(body);
  for (let i = _meshes.length - 1; i >= 0; i--) {
    if (!alive.has(_meshes[i].body)) {
      scene.remove(_meshes[i].mesh); _meshes.splice(i, 1);
    }
  }
  const tracked = new Set(_meshes.map(m => m.body));
  for (const body of space.bodies) {
    if (!tracked.has(body)) addBodyMesh(body);
  }
  for (const { mesh, body } of _meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
}
// ── End Three.js Renderer ───────────────────────────────────────────────────
`;

const RENDERER_PIXI = `// ── PixiJS Renderer (via @newkrok/nape-pixi) ────────────────────────────────
// PixiDebugDraw handles body shapes + constraint lines. We pick the colour
// from userData._colorIdx so multiple demos look consistent.
const FILL_COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];
const STATIC_FILL = 0x607888;

const _debug = new PixiDebugDraw({
  pixi: { Container: PIXI.Container, Graphics: PIXI.Graphics },
  palette: FILL_COLORS,
  staticColor: STATIC_FILL,
  showOutlines: __OUTLINES__,
  colorResolver: (body) => {
    const custom = body.userData?._color;
    if (custom) return parseInt(custom.stroke.replace("#", ""), 16);
    if (body.isStatic()) return STATIC_FILL;
    const idx = body.userData?._colorIdx;
    if (idx != null && idx >= 0) return FILL_COLORS[idx % FILL_COLORS.length];
    return null;
  },
});
app.stage.addChild(_debug.container);

function syncBodies(space) { _debug.render(space); }

// Background grid.
let gridGfx = null;
function drawGrid() {
  if (gridGfx) return;
  gridGfx = new PIXI.Graphics();
  for (let x = 0; x < W; x += 50) { gridGfx.moveTo(x, 0); gridGfx.lineTo(x, H); }
  for (let y = 0; y < H; y += 50) { gridGfx.moveTo(0, y); gridGfx.lineTo(W, y); }
  gridGfx.stroke({ color: 0x1a2030, width: 0.5 });
  app.stage.addChildAt(gridGfx, 0);
}

// Constraint lines are drawn by PixiDebugDraw — kept as a no-op for runtime compatibility.
function drawConstraintLines() {}
// ── End PixiJS Renderer ─────────────────────────────────────────────────────
`;

// =========================================================================
// Per-adapter auto-runtime templates
//
// These are appended AFTER the extracted demo code when auto-generating.
// They provide the physics loop, rendering, and interaction forwarding.
// =========================================================================

const RUNTIME_2D = `
// ── Runtime ──────────────────────────────────────────────────────────────────
const W = canvas.width, H = canvas.height;
const space = new Space();
__WALLS__
__GRAVITY__
if (_demo.preload) await _demo.preload();
_demo.setup(space, W, H);

// ── Camera ──────────────────────────────────────────────────────────────────
let _camX = 0, _camY = 0;
const _camCfg = _demo.camera || null;
// ── Camera shake ──────────────────────────────────────────────────────────
// Mirrors the docs DemoRunner: demos call shakeCamera(amplitude, duration)
// via _demo._runner; the offset decays quadratically and is added to the
// camera each frame. Without this, shake-driven demos run but feel static.
let _shakeAmp = 0, _shakeRemaining = 0, _shakeTotal = 0, _shakeOffX = 0, _shakeOffY = 0;
function shakeCamera(amplitude, duration = 0.25) {
  if (!(amplitude > 0) || !(duration > 0)) return;
  if (amplitude < _shakeAmp && _shakeRemaining > 0) return;
  _shakeAmp = amplitude; _shakeRemaining = duration; _shakeTotal = duration;
}
function _updateShake(frameSec) {
  if (_shakeRemaining <= 0) { _shakeOffX = 0; _shakeOffY = 0; return; }
  _shakeRemaining = Math.max(0, _shakeRemaining - frameSec);
  const t = _shakeTotal > 0 ? _shakeRemaining / _shakeTotal : 0;
  const amp = _shakeAmp * t * t;
  const ang = Math.random() * Math.PI * 2;
  _shakeOffX = Math.cos(ang) * amp;
  _shakeOffY = Math.sin(ang) * amp;
}
// Expose to demos that call this._runner?.shakeCamera?.(...)
_demo._runner = { shakeCamera };
function _updateCamera() {
  const cfg = _camCfg;
  if (!cfg) return;
  let tx, ty;
  if (typeof cfg.follow === "function") {
    const p = cfg.follow();
    if (!p) return;
    tx = p.x; ty = p.y;
  } else if (cfg.follow && cfg.follow.position) {
    tx = cfg.follow.position.x; ty = cfg.follow.position.y;
  } else { return; }
  const offX = cfg.offsetX ?? 0, offY = cfg.offsetY ?? 0;
  let goalX = tx + offX - W / 2, goalY = ty + offY - H / 2;
  const b = cfg.bounds;
  if (b) {
    goalX = Math.max(b.minX, Math.min(goalX, b.maxX - W));
    goalY = Math.max(b.minY, Math.min(goalY, b.maxY - H));
  }
  const lerp = cfg.lerp ?? 0.1;
  _camX += (goalX - _camX) * lerp;
  _camY += (goalY - _camY) * lerp;
  if (b) {
    _camX = Math.max(b.minX, Math.min(_camX, b.maxX - W));
    _camY = Math.max(b.minY, Math.min(_camY, b.maxY - H));
  }
}
// Snap camera to target on first frame
if (_camCfg) { const _origLerp = _camCfg.lerp; _camCfg.lerp = 1; _updateCamera(); _camCfg.lerp = _origLerp; }

// Compat: demo render hooks call drawBody(ctx, body, outlines) and drawGrid(ctx, W, H)
// while CodePen helpers use drawBody(body) and drawGrid(). Wrap to accept both.
if (_demo.render) {
  const _origDrawBody = drawBody, _origDrawGrid = drawGrid;
  drawBody = function(a, b, c) {
    if (b !== undefined) { const prev = _showOutlines; _showOutlines = c ?? _showOutlines; _origDrawBody(b); _showOutlines = prev; }
    else _origDrawBody(a);
  };
  drawGrid = function() { _origDrawGrid(); };
  // Alias: demo render hooks call drawConstraints(ctx, space) from renderer.js import
  var drawConstraints = function() { drawConstraintLines(); };
}

function _loop() {
  if (_demo.step) _demo.step(space, W, H);
  space.step(1 / 60, __VEL_ITER__, __POS_ITER__);
  _updateCamera();
  _updateShake(1 / 60);
  const _cx = _camX + _shakeOffX, _cy = _camY + _shakeOffY;
  ctx.clearRect(0, 0, W, H);
  if (_demo.render) {
    _demo.render(ctx, space, W, H, _showOutlines, _cx, _cy);
  } else {
    ctx.save();
    ctx.translate(-_cx, -_cy);
    drawGrid();
    for (const body of space.bodies) drawBody(body);
    drawConstraintLines();
    ctx.restore();
  }
  // HUD overlay (legend, labels) — same as canvas2d-adapter locally
  if (_demo.render3dOverlay) _demo.render3dOverlay(ctx, space, W, H, _cx, _cy);
  requestAnimationFrame(_loop);
}
_loop();

// Interaction
function _getWorldPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (W / rect.width) + _camX, y: (e.clientY - rect.top) * (H / rect.height) + _camY };
}
let _dragging = false;
canvas.addEventListener("pointerdown", (e) => {
  _dragging = true;
  const { x, y } = _getWorldPos(e);
  if (_demo.click) _demo.click(x, y, space, W, H);
});
canvas.addEventListener("pointermove", (e) => {
  const { x, y } = _getWorldPos(e);
  if (_dragging && _demo.drag) _demo.drag(x, y, space, W, H);
  if (_demo.hover) _demo.hover(x, y, space, W, H);
});
canvas.addEventListener("pointerup", () => {
  _dragging = false;
  if (_demo.release) _demo.release(space);
});
canvas.addEventListener("wheel", (e) => {
  if (_demo.wheel) { e.preventDefault(); _demo.wheel(e.deltaY, space, W, H); }
}, { passive: false });
`;

const RUNTIME_3D = `
// ── Three.js Scene Setup ────────────────────────────────────────────────────
const container = document.getElementById("container");
const W = 900, H = 500;
const fov = 45, aspect = W / H;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / aspect;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const camera = new THREE.PerspectiveCamera(fov, aspect, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.DirectionalLight(0xfff5e0, 2.0).translateX(-W * 0.3).translateY(H * 0.6).translateZ(800));
scene.add(new THREE.DirectionalLight(0xadd8ff, 0.6).translateX(W * 1.2).translateY(-H * 0.3).translateZ(400));
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Grid
const _gridPts = [];
for (let x = 0; x <= W; x += 50) _gridPts.push(x, 0, 0, x, -H, 0);
for (let y = 0; y <= H; y += 50) _gridPts.push(0, -y, 0, W, -y, 0);
const _gridGeom = new THREE.BufferGeometry();
_gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(_gridPts, 3));
scene.add(new THREE.LineSegments(_gridGeom, new THREE.LineBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.5 })));

// ── Runtime ──────────────────────────────────────────────────────────────────
// Compat: demos import loadThree() from threejs-adapter — in CodePen THREE is already global
function loadThree() { return Promise.resolve(THREE); }

const space = new Space();
__WALLS__
__GRAVITY__
if (_demo.preload) await _demo.preload();
_demo.setup(space, W, H);

// ── Camera ──────────────────────────────────────────────────────────────────
let _camX = 0, _camY = 0;
const _camCfg = _demo.camera || null;
// ── Camera shake ──────────────────────────────────────────────────────────
// Mirrors the docs DemoRunner: demos call shakeCamera(amplitude, duration)
// via _demo._runner; the offset decays quadratically and is added to the
// camera each frame. Without this, shake-driven demos run but feel static.
let _shakeAmp = 0, _shakeRemaining = 0, _shakeTotal = 0, _shakeOffX = 0, _shakeOffY = 0;
function shakeCamera(amplitude, duration = 0.25) {
  if (!(amplitude > 0) || !(duration > 0)) return;
  if (amplitude < _shakeAmp && _shakeRemaining > 0) return;
  _shakeAmp = amplitude; _shakeRemaining = duration; _shakeTotal = duration;
}
function _updateShake(frameSec) {
  if (_shakeRemaining <= 0) { _shakeOffX = 0; _shakeOffY = 0; return; }
  _shakeRemaining = Math.max(0, _shakeRemaining - frameSec);
  const t = _shakeTotal > 0 ? _shakeRemaining / _shakeTotal : 0;
  const amp = _shakeAmp * t * t;
  const ang = Math.random() * Math.PI * 2;
  _shakeOffX = Math.cos(ang) * amp;
  _shakeOffY = Math.sin(ang) * amp;
}
// Expose to demos that call this._runner?.shakeCamera?.(...)
_demo._runner = { shakeCamera };
function _updateCamera() {
  const cfg = _camCfg;
  if (!cfg) return;
  let tx, ty;
  if (typeof cfg.follow === "function") {
    const p = cfg.follow();
    if (!p) return;
    tx = p.x; ty = p.y;
  } else if (cfg.follow && cfg.follow.position) {
    tx = cfg.follow.position.x; ty = cfg.follow.position.y;
  } else { return; }
  const offX = cfg.offsetX ?? 0, offY = cfg.offsetY ?? 0;
  let goalX = tx + offX - W / 2, goalY = ty + offY - H / 2;
  const b = cfg.bounds;
  if (b) {
    goalX = Math.max(b.minX, Math.min(goalX, b.maxX - W));
    goalY = Math.max(b.minY, Math.min(goalY, b.maxY - H));
  }
  const lerp = cfg.lerp ?? 0.1;
  _camX += (goalX - _camX) * lerp;
  _camY += (goalY - _camY) * lerp;
  if (b) {
    _camX = Math.max(b.minX, Math.min(_camX, b.maxX - W));
    _camY = Math.max(b.minY, Math.min(_camY, b.maxY - H));
  }
}
if (_camCfg) { const _origLerp = _camCfg.lerp; _camCfg.lerp = 1; _updateCamera(); _camCfg.lerp = _origLerp; }

// 2D overlay canvas for constraint/label overlays
let _overlayCtx = null;
if (_demo.render3dOverlay) {
  const oc = document.createElement("canvas");
  oc.width = W; oc.height = H;
  oc.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
  container.style.position = "relative";
  container.appendChild(oc);
  _overlayCtx = oc.getContext("2d");
}

function _loop() {
  if (_demo.step) _demo.step(space, W, H);
  space.step(1 / 60, __VEL_ITER__, __POS_ITER__);
  _updateCamera();
  _updateShake(1 / 60);
  const _cx = _camX + _shakeOffX, _cy = _camY + _shakeOffY;
  if (!_demo.render3d) syncBodies3D(space);
  if (_demo.render3d) {
    _demo.render3d(renderer, scene, camera, space, W, H, _cx, _cy);
  } else {
    // Offset the 3D camera for follow-camera and/or active shake. When neither
    // applies, _cx/_cy are 0 so the camera stays at its default framing.
    if (_camCfg || _shakeOffX || _shakeOffY) {
      const _baseCamX = W / 2, _baseCamY = -H / 2, _camZZ = camera.position.z;
      const _tx = _baseCamX + _cx, _ty = _baseCamY - _cy;
      camera.position.set(_tx, _ty, _camZZ);
      camera.lookAt(_tx, _ty, 0);
    }
    renderer.render(scene, camera);
  }
  if (_overlayCtx) {
    _overlayCtx.clearRect(0, 0, W, H);
    _demo.render3dOverlay(_overlayCtx, space, W, H, _cx, _cy);
  }
  requestAnimationFrame(_loop);
}
_loop();

// Interaction
function _getWorldPos(e) {
  const rect = container.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (W / rect.width) + _camX, y: (e.clientY - rect.top) * (H / rect.height) + _camY };
}
let _dragging = false;
container.addEventListener("pointerdown", (e) => {
  _dragging = true;
  const { x, y } = _getWorldPos(e);
  if (_demo.click) _demo.click(x, y, space, W, H);
});
container.addEventListener("pointermove", (e) => {
  const { x, y } = _getWorldPos(e);
  if (_dragging && _demo.drag) _demo.drag(x, y, space, W, H);
  if (_demo.hover) _demo.hover(x, y, space, W, H);
});
container.addEventListener("pointerup", () => {
  _dragging = false;
  if (_demo.release) _demo.release(space);
});
container.addEventListener("wheel", (e) => {
  if (_demo.wheel) { e.preventDefault(); _demo.wheel(e.deltaY, space, W, H); }
}, { passive: false });
`;

const RUNTIME_PIXI = `
// ── Runtime ──────────────────────────────────────────────────────────────────
const space = new Space();
__WALLS__
__GRAVITY__
if (_demo.preload) await _demo.preload();
_demo.setup(space, W, H);

// ── Camera ──────────────────────────────────────────────────────────────────
let _camX = 0, _camY = 0;
const _camCfg = _demo.camera || null;
// ── Camera shake ──────────────────────────────────────────────────────────
// Mirrors the docs DemoRunner: demos call shakeCamera(amplitude, duration)
// via _demo._runner; the offset decays quadratically and is added to the
// camera each frame. Without this, shake-driven demos run but feel static.
let _shakeAmp = 0, _shakeRemaining = 0, _shakeTotal = 0, _shakeOffX = 0, _shakeOffY = 0;
function shakeCamera(amplitude, duration = 0.25) {
  if (!(amplitude > 0) || !(duration > 0)) return;
  if (amplitude < _shakeAmp && _shakeRemaining > 0) return;
  _shakeAmp = amplitude; _shakeRemaining = duration; _shakeTotal = duration;
}
function _updateShake(frameSec) {
  if (_shakeRemaining <= 0) { _shakeOffX = 0; _shakeOffY = 0; return; }
  _shakeRemaining = Math.max(0, _shakeRemaining - frameSec);
  const t = _shakeTotal > 0 ? _shakeRemaining / _shakeTotal : 0;
  const amp = _shakeAmp * t * t;
  const ang = Math.random() * Math.PI * 2;
  _shakeOffX = Math.cos(ang) * amp;
  _shakeOffY = Math.sin(ang) * amp;
}
// Expose to demos that call this._runner?.shakeCamera?.(...)
_demo._runner = { shakeCamera };
function _updateCamera() {
  const cfg = _camCfg;
  if (!cfg) return;
  let tx, ty;
  if (typeof cfg.follow === "function") {
    const p = cfg.follow();
    if (!p) return;
    tx = p.x; ty = p.y;
  } else if (cfg.follow && cfg.follow.position) {
    tx = cfg.follow.position.x; ty = cfg.follow.position.y;
  } else { return; }
  const offX = cfg.offsetX ?? 0, offY = cfg.offsetY ?? 0;
  let goalX = tx + offX - W / 2, goalY = ty + offY - H / 2;
  const b = cfg.bounds;
  if (b) {
    goalX = Math.max(b.minX, Math.min(goalX, b.maxX - W));
    goalY = Math.max(b.minY, Math.min(goalY, b.maxY - H));
  }
  const lerp = cfg.lerp ?? 0.1;
  _camX += (goalX - _camX) * lerp;
  _camY += (goalY - _camY) * lerp;
  if (b) {
    _camX = Math.max(b.minX, Math.min(_camX, b.maxX - W));
    _camY = Math.max(b.minY, Math.min(_camY, b.maxY - H));
  }
}
if (_camCfg) { const _origLerp = _camCfg.lerp; _camCfg.lerp = 1; _updateCamera(); _camCfg.lerp = _origLerp; }

// 2D overlay canvas for constraint/label overlays
let _overlayCtx = null;
if (_demo.render3dOverlay) {
  const oc = document.createElement("canvas");
  oc.width = W; oc.height = H;
  oc.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
  container.style.position = "relative";
  container.appendChild(oc);
  _overlayCtx = oc.getContext("2d");
}

function _loop() {
  if (_demo.step) _demo.step(space, W, H);
  space.step(1 / 60, __VEL_ITER__, __POS_ITER__);
  _updateCamera();
  _updateShake(1 / 60);
  const _cx = _camX + _shakeOffX, _cy = _camY + _shakeOffY;
  if (_demo.renderPixi) {
    _demo.renderPixi({ syncBodies, getEngine: () => ({ PIXI, app }) }, space, W, H, false, _cx, _cy);
  } else {
    drawGrid();
    syncBodies(space);
    if (!_demo.render3dOverlay) drawConstraintLines();
    // Offset the stage for follow-camera and/or active shake.
    if (_camCfg || _shakeOffX || _shakeOffY) { app.stage.x = -_cx; app.stage.y = -_cy; }
    app.render();
  }
  if (_overlayCtx) {
    _overlayCtx.clearRect(0, 0, W, H);
    _demo.render3dOverlay(_overlayCtx, space, W, H, _cx, _cy);
  }
  requestAnimationFrame(_loop);
}
_loop();

// Interaction
function _getWorldPos(e) {
  const rect = app.canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (W / rect.width) + _camX, y: (e.clientY - rect.top) * (H / rect.height) + _camY };
}
let _dragging = false;
app.canvas.addEventListener("pointerdown", (e) => {
  _dragging = true;
  const { x, y } = _getWorldPos(e);
  if (_demo.click) _demo.click(x, y, space, W, H);
});
app.canvas.addEventListener("pointermove", (e) => {
  const { x, y } = _getWorldPos(e);
  if (_dragging && _demo.drag) _demo.drag(x, y, space, W, H);
  if (_demo.hover) _demo.hover(x, y, space, W, H);
});
app.canvas.addEventListener("pointerup", () => {
  _dragging = false;
  if (_demo.release) _demo.release(space);
});
app.canvas.addEventListener("wheel", (e) => {
  if (_demo.wheel) { e.preventDefault(); _demo.wheel(e.deltaY, space, W, H); }
}, { passive: false });
`;

// =========================================================================
// Auto-generation: extract demo hooks via .toString()
// =========================================================================

const NAPE_IMPORT_NAMES = `Space, Body, BodyType, Vec2, Circle, Polygon, Capsule,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint, PulleyJoint, SpringJoint,
  Material, FluidProperties, InteractionFilter, InteractionGroup, AABB, MarchingSquares,
  CbType, CbEvent, InteractionType, InteractionListener, PreListener, PreFlag,
  CharacterController, fractureBody, UserConstraint, TriggerZone,
  Ray, RayResult,
  buildTilemapBody, meshTilemap, RadialGravityField, RadialGravityFieldGroup,
  ParticleEmitter, ParticleEmitterGroup`;

const napeImports = (specifier) => `import {\n  ${NAPE_IMPORT_NAMES},\n} from "${specifier}";`;
const NAPE_IMPORTS = napeImports(NAPE_CDN);
const NAPE_IMPORTS_BARE = napeImports("@newkrok/nape-js");

/**
 * Convert a method-shorthand .toString() result to a standalone function.
 * e.g. "setup(space, W, H) { ... }" → "function setup(space, W, H) { ... }"
 */
function toFunction(fnStr, name) {
  const src = fnStr.trim();
  // Already a proper function or arrow?
  if (src.startsWith("function") || src.startsWith("(") || src.startsWith("async")) return src;
  // Method shorthand: "name(...) { ... }" → "function name(...) { ... }"
  return "function " + src;
}

/**
 * Extract module-level preamble (variables, constants, functions) from demo
 * source text. Returns the code BEFORE the `export default {` line plus any
 * top-level declarations that appear AFTER the export-default block (helper
 * functions, late constants), with import statements stripped.
 *
 * Returns empty string if nothing is found.
 */
function extractModulePreamble(sourceText) {
  const lines = sourceText.split("\n");

  // Find the end of the last import block and the export default line.
  // Handles multiline imports like: import {\n  Foo,\n  Bar,\n} from '...';
  let lastImportEndIdx = -1;
  let exportIdx = -1;
  let inMultilineImport = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith("export default")) {
      exportIdx = i;
      break;
    }

    if (inMultilineImport) {
      // Inside a multiline import — look for the closing `} from ...;`
      if (trimmed.includes("from ") || trimmed.startsWith("}")) {
        if (trimmed.endsWith(";")) {
          inMultilineImport = false;
          lastImportEndIdx = i;
        }
      }
      continue;
    }

    if (trimmed.startsWith("import ") || trimmed.startsWith("import{")) {
      if (trimmed.endsWith(";")) {
        lastImportEndIdx = i;
      } else {
        inMultilineImport = true;
      }
    }
  }

  if (exportIdx <= 0) return "";

  const startIdx = lastImportEndIdx + 1;
  const beforeExport = startIdx < exportIdx ? lines.slice(startIdx, exportIdx).join("\n").trim() : "";

  // Walk the export-default object literal with brace counting to find where
  // it ends, then collect everything after it as additional preamble.
  // Strings and template literals are skipped to avoid counting braces inside them.
  const afterExport = extractAfterExport(sourceText, lines, exportIdx);

  if (!beforeExport && !afterExport) return "";
  if (!beforeExport) return afterExport;
  if (!afterExport) return beforeExport;
  return `${beforeExport}\n\n${afterExport}`;
}

/**
 * Find the closing brace of `export default { ... }` and return the
 * trailing source (helper functions, late constants) trimmed. Returns an
 * empty string if the export block isn't a balanced object literal or if
 * nothing meaningful follows it.
 */
function extractAfterExport(sourceText, lines, exportIdx) {
  // Compute character offset of the start of the export-default line.
  let charOffset = 0;
  for (let i = 0; i < exportIdx; i++) charOffset += lines[i].length + 1;

  const src = sourceText;
  const openIdx = src.indexOf("{", charOffset);
  if (openIdx < 0) return "";

  let depth = 0;
  let i = openIdx;
  let inStr = null; // null | '"' | "'" | '`'
  let inLineComment = false;
  let inBlockComment = false;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        // Skip the closing brace and an optional trailing semicolon
        let after = i + 1;
        while (after < src.length && /\s/.test(src[after])) after++;
        if (src[after] === ";") after++;
        return src.slice(after).trim();
      }
    }
    i++;
  }
  return "";
}

// Cache of fetched demo source preambles (keyed by demo id)
const _preambleCache = new Map();

/**
 * Fetch the demo source file and extract its module-level preamble.
 * Returns the preamble string or empty string on failure.
 * Results are cached by demo id.
 *
 * The path is resolved relative to *this module's* URL (not the document
 * URL), so it works whether the consumer page is at `/`, `/examples/`,
 * or any other depth — `import.meta.url` always points at
 * `/codepen-templates.js`, which sits next to `/demos/`.
 */
async function fetchModulePreamble(demo) {
  if (!demo.id) return "";
  if (_preambleCache.has(demo.id)) return _preambleCache.get(demo.id);

  const url = new URL(`./demos/${demo.id}.js`, import.meta.url).href;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(resp.status);
    const text = await resp.text();
    const preamble = extractModulePreamble(text);
    _preambleCache.set(demo.id, preamble);
    return preamble;
  } catch {
    _preambleCache.set(demo.id, "");
    return "";
  }
}

/**
 * Extract demo hooks and build a _demo object literal.
 * Returns null if the demo has no extractable setup function.
 *
 * Module-level preamble (variables, functions, constants) is prepended before
 * the _demo object so they are available at the CodePen top-level scope.
 * Priority: fetched source preamble > demo.moduleState > nothing.
 */
function extractDemoObject(demo, preamble = "") {
  if (!demo.setup) return null;

  const hooks = [];
  for (const name of ["preload", "setup", "step", "click", "drag", "release", "hover", "wheel", "render", "renderPixi", "render3d", "render3dOverlay"]) {
    if (typeof demo[name] === "function") {
      hooks.push(`  ${demo[name].toString()}`);
    }
  }

  // Include camera: null so setup() can assign this.camera = {...}
  // Always emit null — the actual value (with Body refs) is set by setup() at runtime.
  if ("camera" in demo) {
    hooks.push(`  camera: null`);
  }

  const demoObj = `const _demo = {\n${hooks.join(",\n")}\n};`;
  const pre = preamble || demo.moduleState || "";
  if (pre) {
    return `${pre}\n\n${demoObj}`;
  }
  return demoObj;
}

/**
 * Fill runtime template placeholders with demo config values.
 */
function fillRuntime(runtime, demo) {
  const gravity = demo._extractedGravity ?? "space.gravity = new Vec2(0, 600);";
  return runtime
    .replace("__WALLS__", demo.walls !== false ? "addWalls();" : "")
    .replace("__GRAVITY__", gravity)
    .replace("__VEL_ITER__", String(demo.velocityIterations ?? 8))
    .replace("__POS_ITER__", String(demo.positionIterations ?? 3));
}

/**
 * Auto-generate CodePen code from demo hooks for a specific adapter.
 * Returns null if the demo's setup function cannot be extracted.
 */
const ASSET_BASE_URL = "https://napejs.org/";

function autoGenerateCode(demo, adapterId, preamble = "") {
  let demoObj = extractDemoObject(demo, preamble);
  if (!demoObj) return null;

  // Rewrite relative asset URLs to absolute GitHub Pages URLs for CodePen.
  // Supports both ./ (legacy) and ../ (after the examples page moved into /examples/).
  demoObj = demoObj.replace(/([\"'])\.\.?\/(assets\/[^\"']+|[^\"']+\.(svg|png|webp|jpg|jpeg|gif))/g, `$1${ASSET_BASE_URL}$2`);

  // Try to extract gravity from setup body (common pattern: space.gravity = new Vec2(...))
  const setupSrc = demo.setup.toString();
  const gravityMatch = setupSrc.match(/space\.gravity\s*=\s*new\s+Vec2\([^)]+\)\s*;?/);
  const enrichedDemo = { ...demo };
  if (gravityMatch) {
    enrichedDemo._extractedGravity = gravityMatch[0].endsWith(";") ? gravityMatch[0] : gravityMatch[0] + ";";
  }

  if (adapterId === "canvas2d") {
    return `${demoObj}\n${fillRuntime(RUNTIME_2D, enrichedDemo)}`;
  }
  if (adapterId === "threejs") {
    return `${demoObj}\n${fillRuntime(RUNTIME_3D, enrichedDemo)}`;
  }
  if (adapterId === "pixijs") {
    return `${demoObj}\n${fillRuntime(RUNTIME_PIXI, enrichedDemo)}`;
  }

  return null;
}

// =========================================================================
// Template definitions by adapter ID
// =========================================================================

// Build the canvas2d body. `napeImport` is the nape-js import line. `wrap` is
// true for the legacy explicit-code path (extra `canvasWrap` alias).
function buildCanvas2dBody(code, { napeImport, auto, wrap }) {
  const water = /\bdrawWaveSurface2D\b/.test(code) ? WATER_HELPERS : "";
  const canvasWrapLine = wrap && !auto ? `\nconst canvasWrap = canvas;` : "";
  return `${napeImport}

const canvas = document.getElementById("demoCanvas");${canvasWrapLine}
const ctx = canvas.getContext("2d");

${RENDERER_2D}
${SPAWN_RANDOM}
${WALLS_HELPER}
${water}${code}`;
}

function buildThreeBody(code, { napeImport, threeImport, auto }) {
  const water = /\bcreateWater3D\b/.test(code) ? WATER_HELPERS_3D : "";
  const renderer = auto ? `${RENDERER_3D}\n` : "";
  return `${threeImport}
${napeImport}

${renderer}${SPAWN_RANDOM}
${WALLS_HELPER}
${water}${code}`;
}

function buildPixiBody(code, { napeImport, pixiImport, napePixiImport }) {
  const water = /\bdrawWaterPixi\b/.test(code) ? WATER_HELPERS_PIXI : "";
  return `${pixiImport}
${napePixiImport}
${napeImport}

const container = document.getElementById("container");
const W = 900, H = 500;
const app = new PIXI.Application();
await app.init({ width: W, height: H, backgroundColor: 0x0d1117, antialias: true });
container.appendChild(app.canvas);

${RENDERER_PIXI}
${SPAWN_RANDOM}
${WALLS_HELPER}
${water}${code}`;
}

const SHARED_HTML = {
  canvas2d: `<canvas id="demoCanvas" width="900" height="500" style="background:#0a0e14;display:block;max-width:100%;border:1px solid #30363d;border-radius:8px"></canvas>
<a class="nape-badge" href="https://napejs.org/index.html" target="_blank">made with Nape-JS</a>`,
  threejs: `<div id="container" style="width:900px;max-width:100%;height:500px;border:1px solid #30363d;border-radius:8px;overflow:hidden"></div>
<a class="nape-badge" href="https://napejs.org/index.html" target="_blank">made with Nape-JS</a>`,
  pixijs: `<div id="container" style="width:900px;max-width:100%;height:500px;border:1px solid #30363d;border-radius:8px;overflow:hidden"></div>
<a class="nape-badge" href="https://napejs.org/index.html" target="_blank">made with Nape-JS</a>`,
};

const TEMPLATES = {
  canvas2d: {
    html: SHARED_HTML.canvas2d,
    buildJS: (code, auto = false) =>
      buildCanvas2dBody(code, { napeImport: NAPE_IMPORTS, auto, wrap: true }),
    buildJSBare: (code, auto = false) =>
      buildCanvas2dBody(code, { napeImport: NAPE_IMPORTS_BARE, auto, wrap: false }),
  },

  threejs: {
    html: SHARED_HTML.threejs,
    buildJS: (code, auto = false) =>
      buildThreeBody(code, {
        napeImport: NAPE_IMPORTS,
        threeImport: `import * as THREE from "${THREE_CDN}";`,
        auto,
      }),
    buildJSBare: (code, auto = false) =>
      buildThreeBody(code, {
        napeImport: NAPE_IMPORTS_BARE,
        threeImport: `import * as THREE from "three";`,
        auto,
      }),
  },

  pixijs: {
    html: SHARED_HTML.pixijs,
    buildJS: (code) =>
      buildPixiBody(code, {
        napeImport: NAPE_IMPORTS,
        pixiImport: `import * as PIXI from "${PIXI_CDN}";`,
        napePixiImport: `import { PixiDebugDraw } from "${NAPE_PIXI_CDN}";`,
      }),
    buildJSBare: (code) =>
      buildPixiBody(code, {
        napeImport: NAPE_IMPORTS_BARE,
        pixiImport: `import * as PIXI from "pixi.js";`,
        napePixiImport: `import { PixiDebugDraw } from "@newkrok/nape-pixi";`,
      }),
  },
};

// =========================================================================
// CSS (shared across all templates)
// =========================================================================

const CODEPEN_CSS = `body { margin: 20px; background: #0d1117; font-family: sans-serif; color: #e6edf3; }
.nape-badge { position: fixed; bottom: 12px; right: 16px; font-size: 13px; font-family: sans-serif; color: #8b949e; text-decoration: none; opacity: .75; transition: opacity .2s; z-index: 9999; }
.nape-badge:hover { opacity: 1; color: #58a6ff; }`;

// =========================================================================
// Public API
// =========================================================================

/**
 * Get the code string for a demo in the specified renderer mode.
 *
 * Priority:
 *   1. demo.codepenOverride — complete custom CodePen code (escape hatch)
 *   2. Explicit per-adapter code: code3d, codePixi, code2d, code
 *   3. Auto-generation from demo hooks (setup/step/click/drag/release)
 *
 * Returns { code, auto } where auto=true means the code was auto-generated.
 *
 * @param {Object} demo — demo definition
 * @param {string} adapterId — "canvas2d" | "threejs" | "pixijs"
 * @param {string} [preamble] — module-level code to prepend (from source fetch)
 * @returns {{ code: string, auto: boolean } | null}
 */
export function getDemoCode(demo, adapterId, preamble = "") {
  if (demo.codepenOverride) return { code: demo.codepenOverride, auto: false };

  // Check for explicit per-adapter code
  let explicit = null;
  if (adapterId === "threejs") {
    explicit = demo.code3d ?? demo.code ?? null;
  } else if (adapterId === "pixijs") {
    explicit = demo.codePixi ?? demo.code ?? null;
  } else {
    explicit = demo.code ?? demo.code2d ?? null;
  }

  if (explicit) return { code: explicit, auto: false };

  // Fall back to auto-generation from demo hooks
  const auto = autoGenerateCode(demo, adapterId, preamble);
  if (auto) return { code: auto, auto: true };

  return null;
}

/**
 * Generate CodePen data for a demo + renderer combination.
 *
 * @param {Object} demo — demo definition
 * @param {string} adapterId — "canvas2d" | "threejs" | "pixijs"
 * @param {{ showOutlines?: boolean }} [opts]
 * @param {string} [preamble] — module-level code to prepend
 * @returns {{ title, description, html, css, js, js_module } | null}
 */
export function generateCodePen(demo, adapterId, { showOutlines = true } = {}, preamble = "") {
  const template = TEMPLATES[adapterId] ?? TEMPLATES.canvas2d;
  const result = getDemoCode(demo, adapterId, preamble);

  if (!result) return null;

  const suffixes = { threejs: " (three.js)", pixijs: " (PixiJS)" };
  const suffix = suffixes[adapterId] ?? "";
  const rendererTags = { threejs: "threejs", pixijs: "pixijs", canvas2d: "canvas" };
  const rendererTag = rendererTags[adapterId] ?? "canvas";

  return {
    title: `Nape-JS — ${demo.label ?? demo.id}${suffix}`,
    description: `Interactive physics demo powered by nape-js, a fully typed TypeScript 2D physics engine.\nhttps://github.com/NewKrok/nape-js`,
    tags: ["nape-js", "physics", "2d-physics", rendererTag, "gamedev"],
    html: template.html,
    css: CODEPEN_CSS,
    js: template.buildJS(result.code, result.auto).replaceAll("__OUTLINES__", String(showOutlines)),
    js_module: true,
  };
}

/**
 * Open a CodePen with the demo's code in a new tab.
 * Async — fetches the demo source file to extract module-level preamble
 * (variables, constants, functions) needed by the CodePen.
 *
 * @param {Object} demo — demo definition
 * @param {string} adapterId — "canvas2d" | "threejs" | "pixijs"
 * @param {{ showOutlines?: boolean }} [opts]
 */
export async function openInCodePen(demo, adapterId, opts) {
  const preamble = await fetchModulePreamble(demo);
  const data = generateCodePen(demo, adapterId, opts, preamble);
  if (!data) return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://codepen.io/pen/define";
  form.target = "_blank";
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "data";
  input.value = JSON.stringify(data);
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

/**
 * Get the active code for preview/copy based on demo + current adapter.
 *
 * Returns the full, self-contained code (imports + helpers + demo code)
 * so that the preview panel shows copy-pasteable, runnable code.
 *
 * @param {Object} demo — demo definition
 * @param {string} adapterId — current adapter ID
 * @param {{ showOutlines?: boolean }} [opts]
 * @returns {Promise<string>}
 */
export async function getPreviewCode(demo, adapterId, { showOutlines = true } = {}) {
  const preamble = await fetchModulePreamble(demo);
  const result = getDemoCode(demo, adapterId, preamble);
  if (!result) return "// No source code available for this demo.";

  const template = TEMPLATES[adapterId] ?? TEMPLATES.canvas2d;
  return template.buildJS(result.code, result.auto).replaceAll("__OUTLINES__", String(showOutlines));
}

/**
 * Same as getPreviewCode, but emits bare-specifier imports (`@newkrok/nape-js`,
 * `three`, `pixi.js`, `@newkrok/nape-pixi`) instead of CDN URLs — suitable for
 * embedding in a bundler-driven sandbox (StackBlitz, CodeSandbox, local Vite).
 *
 * @returns {Promise<string | null>} JS source, or null if the demo has no extractable code.
 */
export async function getDemoSourceForBundler(demo, adapterId, { showOutlines = true } = {}) {
  const preamble = await fetchModulePreamble(demo);
  const result = getDemoCode(demo, adapterId, preamble);
  if (!result) return null;

  const template = TEMPLATES[adapterId] ?? TEMPLATES.canvas2d;
  return template.buildJSBare(result.code, result.auto).replaceAll("__OUTLINES__", String(showOutlines));
}

/**
 * Return the small HTML body for the host page of the given adapter — a
 * canvas (2D) or div container (Three.js / PixiJS) that the demo source
 * mounts to. Used when assembling a bundler project (e.g. StackBlitz).
 *
 * @param {string} adapterId — "canvas2d" | "threejs" | "pixijs"
 * @returns {string}
 */
export function getAdapterHostHtml(adapterId) {
  return SHARED_HTML[adapterId] ?? SHARED_HTML.canvas2d;
}
