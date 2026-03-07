/**
 * nape-js Demo Page — interactive demos + live benchmarks + code preview + CodePen export
 *
 * Imports the bundled ESM library from nape-js.esm.js
 * (copied from dist/index.js during build:docs).
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint,
  Material, InteractionFilter, InteractionGroup,
  CbType, CbEvent, InteractionType, InteractionListener, PreListener, PreFlag,
  VERSION,
} from "./nape-js.esm.js?v=3.4.5";
import {
  bodyColor, drawBody as _drawBody, drawConstraints, drawGrid,
  installErrorOverlay,
} from "./renderer.js?v=3.4.5";

// =========================================================================
// Canvas & state
// =========================================================================

const canvasWrap = document.getElementById("canvasWrap");
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("demoCanvas"));
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("canvasOverlay");
const fpsLabel = document.getElementById("fpsLabel");
const bodyCountLabel = document.getElementById("bodyCount");
const stepTimeLabel = document.getElementById("stepTime");
const demoDescEl = document.getElementById("demoDescription");
const debugDrawCb = /** @type {HTMLInputElement} */ (document.getElementById("debugDraw"));

const codePreviewEl = document.getElementById("codePreview");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const codepenBtn = document.getElementById("codepenBtn");

const W = canvas.width;
const H = canvas.height;

let space = null;
let currentDemo = "falling";
let animId = null;
let lastTime = 0;
let frameCount = 0;
let fpsAccum = 0;
let mouseDown = false;
let mouseX = 0;
let mouseY = 0;
let renderMode = "2d"; // "2d" or "3d"

// =========================================================================
// Three.js state
// =========================================================================

let THREE = null;
let three_renderer = null;
let three_scene = null;
let three_camera = null;
let three_meshes = []; // { mesh, body }

const MESH_COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xef5350, 0xce93d8, 0x4dd0e1, 0xfff176, 0xff8a65];

async function loadThree() {
  if (THREE) return THREE;
  THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js");
  return THREE;
}

function setup3d() {
  // Remove old WebGL canvas if any
  if (three_renderer) {
    three_renderer.dispose();
    three_renderer = null;
  }
  canvas.style.display = "none";

  three_scene = new THREE.Scene();
  three_scene.background = new THREE.Color(0x0d1117);
  // Perspective camera: slight top-down angle so object sides are visible
  const fov = 45;
  const aspect = W / H;
  // Z so the W-wide physics space fits horizontally at z=0
  const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / aspect;
  three_camera = new THREE.PerspectiveCamera(fov, aspect, 1, camZ * 6);
  three_camera.position.set(W / 2, -H / 2, camZ);
  three_camera.lookAt(W / 2, -H / 2, 0);
  const displayW = canvasWrap.clientWidth || W;
  const displayH = Math.round(displayW * (H / W));
  three_renderer = new THREE.WebGLRenderer({ antialias: true });
  three_renderer.setSize(displayW, displayH);
  canvasWrap.appendChild(three_renderer.domElement);

  // Key light — warm, top-left, strong
  const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
  keyLight.position.set(-W * 0.3, H * 0.6, 800);
  three_scene.add(keyLight);
  // Fill light — cool blue, opposite side, softer
  const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6);
  fillLight.position.set(W * 1.2, -H * 0.3, 400);
  three_scene.add(fillLight);
  // Rim light — top, slight warm, separates objects from bg
  const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8);
  rimLight.position.set(W * 0.5, H * 1.5, 200);
  three_scene.add(rimLight);
  // Low ambient so shadows stay dark
  three_scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

  three_meshes = [];
}

function teardown3d() {
  if (three_renderer) {
    canvasWrap.removeChild(three_renderer.domElement);
    three_renderer.dispose();
    three_renderer = null;
  }
  three_scene = null;
  three_camera = null;
  three_meshes = [];
  canvas.style.display = "";
}

function buildThreeMeshes() {
  if (!space || !three_scene) return;
  for (const body of space.bodies) {
    for (const shape of body.shapes) {
      let geom;
      if (shape.isCircle()) {
        geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
      } else if (shape.isPolygon()) {
        const verts = shape.castPolygon.localVerts;
        const len = verts.get_length();
        if (len < 3) continue;
        const pts = [];
        for (let i = 0; i < len; i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
        geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
        geom.translate(0, 0, -15);
      }
      if (!geom) continue;
      const cIdx = (body.userData?._colorIdx ?? 0) % MESH_COLORS.length;
      const color = body.isStatic() ? 0x455a64 : MESH_COLORS[cIdx];
      const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
      three_scene.add(mesh);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom, 15),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
      );
      edges.visible = debugDrawCb.checked;
      mesh.add(edges);
      three_meshes.push({ mesh, body, edges });
    }
  }
}

function updateWireframeVisibility() {
  for (const { edges } of three_meshes) {
    if (edges) edges.visible = debugDrawCb.checked;
  }
}

// =========================================================================
// Rendering helpers
// =========================================================================

function getCanvasScale() {
  const rect = canvasWrap.getBoundingClientRect();
  return { sx: W / rect.width, sy: H / rect.height };
}

/** Wrapper around shared drawBody — passes ctx and debugDraw state. */
function drawBody(body) {
  _drawBody(ctx, body, debugDrawCb.checked);
}

// =========================================================================
// Code preview & CodePen
// =========================================================================

/** Simple syntax highlighter for JS/TS code (single-pass to avoid mangling) */
function highlightCode(code) {
  code = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const re = new RegExp([
    '(\\/\\/.*)',                                         // [1] single-line comments
    '("(?:[^"\\\\]|\\\\.)*")',                            // [2] double-quoted strings
    "('(?:[^'\\\\]|\\\\.)*')",                            // [3] single-quoted strings
    '(`(?:[^`\\\\]|\\\\.)*`)',                            // [4] template literals
    '\\b(import|from|export|const|let|var|new|for|if|else|return|function|class|extends|of|in|true|false|null|undefined|typeof|this|continue|break)\\b', // [5] keywords
    '\\b(\\d+\\.?\\d*)\\b',                              // [6] numbers
    '\\b(Space|Body|BodyType|Vec2|Circle|Polygon|PivotJoint|DistanceJoint|AngleJoint|WeldJoint|MotorJoint|LineJoint|PulleyJoint|Material|InteractionFilter|InteractionGroup|CbType|CbEvent|InteractionType|InteractionListener|PreListener|PreFlag|Math|THREE|Map)\\b' // [7] types
  ].join('|'), 'g');

  return code.replace(re, function(match, comment, dStr, sStr, tStr, kw, num, type) {
    if (comment !== undefined) return '<span class="cm">' + comment + '</span>';
    if (dStr !== undefined) return '<span class="str">' + dStr + '</span>';
    if (sStr !== undefined) return '<span class="str">' + sStr + '</span>';
    if (tStr !== undefined) return '<span class="str">' + tStr + '</span>';
    if (kw !== undefined) return '<span class="kw">' + kw + '</span>';
    if (num !== undefined) return '<span class="num">' + num + '</span>';
    if (type !== undefined) return '<span class="type">' + type + '</span>';
    return match;
  });
}

function getActiveCode(demo) {
  if (renderMode === "3d" && demo.code3d) return demo.code3d;
  return demo.code2d || demo.code || "// No source code available for this demo.";
}

function updateCodePreview(demo) {
  const code = getActiveCode(demo);
  codePreviewEl.innerHTML = highlightCode(code);
}

function copyCode() {
  const demo = DEMOS[currentDemo];
  const code = getActiveCode(demo);
  navigator.clipboard.writeText(code).then(() => {
    showToast("Copied to clipboard!");
  });
}

function showToast(msg) {
  let toast = document.querySelector(".copy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "copy-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 1800);
}

const NAPE_CDN = "https://cdn.jsdelivr.net/npm/@newkrok/nape-js/dist/index.js";

function openInCodePen() {
  const demo = DEMOS[currentDemo];
  const code = getActiveCode(demo);
  const is3d = renderMode === "3d" && demo.code3d;

  const html = is3d
    ? `<div id="container" style="width:900px;max-width:100%;height:500px;border:1px solid #30363d;border-radius:8px;overflow:hidden"></div>`
    : `<canvas id="demoCanvas" width="900" height="500" style="background:#0a0e14;display:block;max-width:100%;border:1px solid #30363d;border-radius:8px"></canvas>`;

  const css = `body { margin: 20px; background: #0d1117; font-family: sans-serif; color: #e6edf3; }`;

  const RENDERER_2D = `// ── Renderer ────────────────────────────────────────────────────────────────
const COLORS = [
  { fill: "rgba(88,166,255,0.18)",  stroke: "#58a6ff" },
  { fill: "rgba(210,153,34,0.18)",  stroke: "#d29922" },
  { fill: "rgba(63,185,80,0.18)",   stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.18)",   stroke: "#f85149" },
  { fill: "rgba(163,113,247,0.18)", stroke: "#a371f7" },
  { fill: "rgba(219,171,255,0.18)", stroke: "#dbabff" },
];
function bodyColor(body) {
  if (body.isStatic()) return { fill: "rgba(120,160,200,0.15)", stroke: "#607888" };
  const idx = (body.userData?._colorIdx ?? Math.abs(Math.round(body.position.x * 0.1))) % COLORS.length;
  return COLORS[idx];
}
function drawBody(body) {
  const px = body.position.x, py = body.position.y;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(body.rotation);
  const { fill, stroke } = bodyColor(body);
  for (const shape of body.shapes) {
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0);
      ctx.strokeStyle = stroke + "55"; ctx.stroke();
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.get_length();
      if (len < 3) continue;
      ctx.beginPath();
      ctx.moveTo(verts.at(0).x, verts.at(0).y);
      for (let i = 1; i < len; i++) ctx.lineTo(verts.at(i).x, verts.at(i).y);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  ctx.restore();
}
function drawGrid() {
  ctx.strokeStyle = "#1a2030"; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}
function drawConstraintLines() {
  try {
    const raw = space._inner.get_constraints();
    for (let i = 0; i < raw.get_length(); i++) {
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

function addWalls() {
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

  let js;
  const WALLS_3D = `function addWalls() {
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

  if (is3d) {
    js = `import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint,
  Material, InteractionFilter, InteractionGroup,
  CbType, CbEvent, InteractionType, InteractionListener, PreListener, PreFlag,
} from "${NAPE_CDN}";

${WALLS_3D}
${code}`;
  } else {
    js = `import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint,
  Material, InteractionFilter, InteractionGroup,
  CbType, CbEvent, InteractionType, InteractionListener, PreListener, PreFlag,
} from "${NAPE_CDN}";

const canvas = document.getElementById("demoCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

${RENDERER_2D}
${code}`;
  }

  // Create a hidden form and submit to CodePen
  const data = {
    title: `nape-js — ${demo.label || currentDemo}${is3d ? " (3D)" : ""}`,
    description: `Interactive physics demo using nape-js TypeScript wrapper.\nhttps://github.com/NewKrok/nape-js`,
    html,
    css,
    js,
    js_module: true,
  };

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

debugDrawCb.addEventListener("change", updateWireframeVisibility);

copyCodeBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "copy_code", demo: currentDemo });
  copyCode();
});
codepenBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_codepen", demo: currentDemo });
  openInCodePen();
});

// Render mode toggle
document.getElementById("renderModeToggle").addEventListener("click", async (e) => {
  const btn = e.target.closest(".render-mode-btn");
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === renderMode) return;
  gtag("event", "click", { event_category: "render_mode", event_label: mode });

  if (mode === "3d") await loadThree();

  renderMode = mode;
  document.querySelectorAll(".render-mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  updateCodePreview(DEMOS[currentDemo]);

  // Restart the current demo in the new render mode
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (mode === "2d") {
    teardown3d();
    DEMOS[currentDemo].setup();
  } else {
    setup3d();
    DEMOS[currentDemo].setup();
    buildThreeMeshes();
  }
  lastTime = performance.now();
  frameCount = 0;
  fpsAccum = 0;
  loop();
});

// =========================================================================
// Shared helpers
// =========================================================================

let _colorCounter = 0;

function addWalls() {
  const thickness = 20;
  const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - thickness / 2));
  floor.shapes.add(new Polygon(Polygon.box(W, thickness)));
  floor.space = space;
  const left = new Body(BodyType.STATIC, new Vec2(thickness / 2, H / 2));
  left.shapes.add(new Polygon(Polygon.box(thickness, H)));
  left.space = space;
  const right = new Body(BodyType.STATIC, new Vec2(W - thickness / 2, H / 2));
  right.shapes.add(new Polygon(Polygon.box(thickness, H)));
  right.space = space;
  const ceil = new Body(BodyType.STATIC, new Vec2(W / 2, thickness / 2));
  ceil.shapes.add(new Polygon(Polygon.box(W, thickness)));
  ceil.space = space;
}

function spawnRandomShape(x, y) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    const w = 10 + Math.random() * 24;
    const h = 10 + Math.random() * 24;
    body.shapes.add(new Polygon(Polygon.box(w, h)));
  }
  try { body.userData._colorIdx = _colorCounter++; } catch(_) {}
  body.space = space;
  return body;
}

// =========================================================================
// Demo definitions
// =========================================================================

const DEMOS = {
  // ------ Falling Shapes ------
  falling: {
    label: "Falling Shapes",
    desc: 'Random boxes and circles fall into a container. <b>Click</b> to spawn more shapes at the cursor.',
    setup() {
      space = new Space(new Vec2(0, 600));
      _colorCounter = 0;
      addWalls();
      for (let i = 0; i < 80; i++) {
        spawnRandomShape(100 + Math.random() * 700, 50 + Math.random() * 200);
      }
    },
    click(x, y) {
      for (let i = 0; i < 8; i++) {
        spawnRandomShape(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      }
    },
    code2d: `// Create a Space with downward gravity
const space = new Space(new Vec2(0, 600));

addWalls();

// Spawn random shapes
for (let i = 0; i < 80; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700,
    50 + Math.random() * 200,
  ));

  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    const w = 10 + Math.random() * 24;
    const h = 10 + Math.random() * 24;
    body.shapes.add(new Polygon(Polygon.box(w, h)));
  }

  body.space = space;
}

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics
const space = new Space(new Vec2(0, 600));
const floor = addWalls();

const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
const meshes = [];

// Create Three.js mesh for a body
function createMesh(body) {
  let geom, depth = 20;
  const shape = body.shapes.at(0);
  if (shape.isCircle()) {
    const r = shape.castCircle.radius;
    geom = new THREE.SphereGeometry(r, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) {
      pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    }
    const shape2d = new THREE.Shape(pts);
    geom = new THREE.ExtrudeGeometry(shape2d, { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const color = body.isStatic() ? 0x455a64 : COLORS[meshes.length % COLORS.length];
  const mat = new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 });
  const mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

// Spawn shapes
for (let i = 0; i < 80; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700, 50 + Math.random() * 200,
  ));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    body.shapes.add(new Polygon(Polygon.box(10 + Math.random() * 24, 10 + Math.random() * 24)));
  }
  body.space = space;
  createMesh(body);
}
// Floor mesh
createMesh(floor);

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Pyramid ------
  pyramid: {
    label: "Pyramid Stress Test",
    desc: 'A classic box-stacking pyramid. <b>Click</b> to drop a heavy ball onto it.',
    setup() {
      space = new Space(new Vec2(0, 600));
      _colorCounter = 0;
      addWalls();

      const boxSize = 28;
      const rows = 14;
      const startX = W / 2;
      const startY = H - 30 - boxSize / 2;

      for (let row = 0; row < rows; row++) {
        const cols = rows - row;
        const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
        for (let col = 0; col < cols; col++) {
          const b = new Body(BodyType.DYNAMIC, new Vec2(
            offsetX + col * boxSize,
            startY - row * boxSize,
          ));
          b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
          try { b.userData._colorIdx = row; } catch(_) {}
          b.space = space;
        }
      }
    },
    click(x, y) {
      const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      ball.shapes.add(new Circle(25, undefined, new Material(0.3, 0.2, 0.3, 5)));
      try { ball.userData._colorIdx = 3; } catch(_) {}
      ball.space = space;
    },
    code2d: `// Pyramid stress test — stacking many boxes
const space = new Space(new Vec2(0, 600));

addWalls();

// Build a pyramid of boxes
const boxSize = 28;
const rows = 14;
const startX = W / 2;
const startY = H - 30 - boxSize / 2;

for (let row = 0; row < rows; row++) {
  const cols = rows - row;
  const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
  for (let col = 0; col < cols; col++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(
      offsetX + col * boxSize,
      startY - row * boxSize,
    ));
    b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
    b.space = space;
  }
}

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics
const space = new Space(new Vec2(0, 600));
const floor = addWalls();

const ROW_COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];
const meshes = [];

function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    const s = new THREE.Shape(pts);
    geom = new THREE.ExtrudeGeometry(s, { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

const boxSize = 28;
const rows = 14;
const startX = W / 2;
const startY = H - 30 - boxSize / 2;

for (let row = 0; row < rows; row++) {
  const cols = rows - row;
  const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
  for (let col = 0; col < cols; col++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(offsetX + col * boxSize, startY - row * boxSize));
    b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
    b.space = space;
    addMesh(b, ROW_COLORS[row % ROW_COLORS.length]);
  }
}
addMesh(floor, 0x455a64);

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Pendulum Chain ------
  chain: {
    label: "Pendulum Chain",
    desc: 'A pendulum chain with a heavy bob. <b>Drag</b> any link to grab and pull it.',
    velocityIterations: 10,
    positionIterations: 8,
    _mouseBody: null,
    _grabJoint: null,
    _pendingGrab: null,
    _pendingRelease: false,
    _dragX: 0,
    _dragY: 0,
    setup() {
      space = new Space(new Vec2(0, 500));
      addWalls();

      const links = 14;
      const linkLen = 20;
      const anchorX = W / 2;
      const anchorY = 50;

      const anchor = new Body(BodyType.STATIC, new Vec2(anchorX, anchorY));
      anchor.shapes.add(new Circle(6));
      anchor.space = space;

      let prev = anchor;
      for (let i = 0; i < links; i++) {
        const link = new Body(BodyType.DYNAMIC, new Vec2(
          anchorX,
          anchorY + (i + 1) * linkLen,
        ));
        link.shapes.add(new Circle(5));
        try { link.userData._colorIdx = i % 2; } catch(_) {}
        link.space = space;

        new PivotJoint(
          prev, link,
          i === 0 ? new Vec2(0, 0) : new Vec2(0, linkLen / 2),
          new Vec2(0, -linkLen / 2),
        ).space = space;
        prev = link;
      }

      const bob = new Body(BodyType.DYNAMIC, new Vec2(
        anchorX,
        anchorY + (links + 1) * linkLen + 18,
      ));
      bob.shapes.add(new Circle(18, undefined, new Material(0.3, 0.2, 0.5, 10)));
      try { bob.userData._colorIdx = 3; } catch(_) {}
      bob.space = space;

      new PivotJoint(
        prev, bob,
        new Vec2(0, linkLen / 2),
        new Vec2(0, -18),
      ).space = space;

      bob.applyImpulse(new Vec2(220, 0));

      // Kinematic mouse anchor — lives in space, position freely settable
      this._mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
      this._mouseBody.space = space;
      this._grabJoint = null;
      this._pendingGrab = null;
      this._pendingRelease = false;
    },
    step() {
      if (this._pendingRelease) {
        this._pendingRelease = false;
        if (this._grabJoint) {
          this._grabJoint.space = null;
          this._grabJoint = null;
        }
        // Park mouse body off-screen
        this._mouseBody.position.setxy(-1000, -1000);
        this._mouseBody.velocity.setxy(0, 0);
      }
      if (this._pendingGrab) {
        const { body, localPt } = this._pendingGrab;
        this._pendingGrab = null;
        if (this._grabJoint) { this._grabJoint.space = null; this._grabJoint = null; }
        this._mouseBody.position.setxy(this._dragX, this._dragY);
        this._grabJoint = new PivotJoint(
          this._mouseBody, body,
          new Vec2(0, 0), localPt,
        );
        // Soft enough that chain joints always win, stiff enough to feel responsive
        this._grabJoint.stiff = false;
        this._grabJoint.frequency = 4;
        this._grabJoint.damping = 0.9;
        this._grabJoint.space = space;
      }
      // Move mouse body smoothly toward cursor — capped speed prevents sudden forces
      if (this._grabJoint) {
        const dx = this._dragX - this._mouseBody.position.x;
        const dy = this._dragY - this._mouseBody.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxSpeed = 800;
        if (dist > 1) {
          const speed = Math.min(dist * 60, maxSpeed);
          this._mouseBody.velocity.setxy(dx / dist * speed, dy / dist * speed);
        } else {
          this._mouseBody.velocity.setxy(0, 0);
        }
      }
    },
    click(x, y) {
      this._dragX = x;
      this._dragY = y;
      let best = null, bestDist = 60;
      for (const body of space.bodies) {
        if (!body.isDynamic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; best = body; }
      }
      if (!best) return;
      const localPt = best.worldPointToLocal(new Vec2(x, y));
      this._pendingGrab = { body: best, localPt };
    },
    drag(x, y) {
      this._dragX = x;
      this._dragY = y;
    },
    release() {
      this._pendingRelease = true;
    },
    code2d: `// Pendulum chain — grab and drag any link
const space = new Space(new Vec2(0, 500));

// Static anchor point
const anchor = new Body(BodyType.STATIC, new Vec2(W / 2, 50));
anchor.shapes.add(new Circle(6));
anchor.space = space;

// 14 links hanging straight down
const links = 14, linkLen = 20;
let prev = anchor;
for (let i = 0; i < links; i++) {
  const link = new Body(BodyType.DYNAMIC,
    new Vec2(W / 2, 50 + (i + 1) * linkLen));
  link.shapes.add(new Circle(5));
  link.space = space;
  new PivotJoint(
    prev, link,
    i === 0 ? new Vec2(0, 0) : new Vec2(0, linkLen / 2),
    new Vec2(0, -linkLen / 2),
  ).space = space;
  prev = link;
}

// Heavy bob
const bob = new Body(BodyType.DYNAMIC,
  new Vec2(W / 2, 50 + (links + 1) * linkLen + 18));
bob.shapes.add(new Circle(18, undefined,
  new Material(0.3, 0.2, 0.5, 10)));
bob.space = space;
new PivotJoint(prev, bob,
  new Vec2(0, linkLen / 2), new Vec2(0, -18)).space = space;

// Initial nudge
bob.applyImpulse(new Vec2(220, 0));

function loop() {
  space.step(1 / 60, 10, 8);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConstraintLines();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics
const space = new Space(new Vec2(0, 500));
const anchor = new Body(BodyType.STATIC, new Vec2(W / 2, 50));
anchor.shapes.add(new Circle(6));
anchor.space = space;

const meshes = [];
function addSphere(body, r, color) {
  const geom = new THREE.SphereGeometry(r, 16, 16);
  const mesh = new THREE.Mesh(
    geom,
    new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }),
  );
  scene.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geom, 15),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }),
  );
  mesh.add(edges);
  meshes.push({ mesh, body });
}

addSphere(anchor, 6, 0x455a64);

const links = 14, linkLen = 20;
let prev = anchor;
for (let i = 0; i < links; i++) {
  const link = new Body(BodyType.DYNAMIC, new Vec2(W / 2, 50 + (i + 1) * linkLen));
  link.shapes.add(new Circle(5));
  link.space = space;
  new PivotJoint(prev, link,
    i === 0 ? new Vec2(0, 0) : new Vec2(0, linkLen / 2),
    new Vec2(0, -linkLen / 2)).space = space;
  prev = link;
  addSphere(link, 5, i % 2 === 0 ? 0x58a6ff : 0xd29922);
}

const bob = new Body(BodyType.DYNAMIC, new Vec2(W / 2, 50 + (links + 1) * linkLen + 18));
bob.shapes.add(new Circle(18, undefined, new Material(0.3, 0.2, 0.5, 10)));
bob.space = space;
new PivotJoint(prev, bob, new Vec2(0, linkLen / 2), new Vec2(0, -18)).space = space;
addSphere(bob, 18, 0xf85149);
bob.applyImpulse(new Vec2(220, 0));

function loop() {
  space.step(1 / 60, 10, 8);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Explosion / Impulse Blast ------
  explosion: {
    label: "Impulse Blast",
    desc: '<b>Click</b> anywhere to create an impulse blast that pushes nearby bodies away.',
    setup() {
      space = new Space(new Vec2(0, 500));
      _colorCounter = 0;
      addWalls();
      for (let i = 0; i < 120; i++) {
        spawnRandomShape(100 + Math.random() * 700, 100 + Math.random() * 350);
      }
    },
    click(x, y) {
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const distSq = dx * dx + dy * dy;
        const maxDist = 200;
        if (distSq < maxDist * maxDist && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = 2000 * (1 - dist / maxDist);
          body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
        }
      }
      // Visual pulse
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 200, 0, Math.PI * 2);
      ctx.strokeStyle = "#f8514944";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    },
    code2d: `// Impulse blast — apply radial impulse on click
const space = new Space(new Vec2(0, 500));

addWalls();

// Fill with mixed shapes
for (let i = 0; i < 120; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700,
    100 + Math.random() * 350,
  ));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    body.shapes.add(new Polygon(
      Polygon.box(10 + Math.random() * 24, 10 + Math.random() * 24)
    ));
  }
  body.space = space;
}

// On click: radial impulse blast
canvasWrap.addEventListener("click", (e) => {
  const rect = canvasWrap.getBoundingClientRect();
  const sx = W / rect.width, sy = H / rect.height;
  const clickX = (e.clientX - rect.left) * sx;
  const clickY = (e.clientY - rect.top) * sy;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = body.position.x - clickX;
    const dy = body.position.y - clickY;
    const distSq = dx * dx + dy * dy;
    const maxDist = 200;
    if (distSq < maxDist * maxDist && distSq > 1) {
      const dist = Math.sqrt(distSq);
      const force = 2000 * (1 - dist / maxDist);
      body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
    }
  }
});

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics
const space = new Space(new Vec2(0, 500));
addWalls();

const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
const meshes = [];

function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    const s = new THREE.Shape(pts);
    geom = new THREE.ExtrudeGeometry(s, { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

for (let i = 0; i < 120; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700, 100 + Math.random() * 350,
  ));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    body.shapes.add(new Polygon(Polygon.box(10 + Math.random() * 24, 10 + Math.random() * 24)));
  }
  body.space = space;
  addMesh(body, COLORS[i % COLORS.length]);
}

// Click to blast
renderer.domElement.addEventListener("click", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) / rect.width * W;
  const clickY = (e.clientY - rect.top) / rect.height * H;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = body.position.x - clickX;
    const dy = body.position.y - clickY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 40000 && distSq > 1) {
      const dist = Math.sqrt(distSq);
      body.applyImpulse(new Vec2(dx / dist * 2000 * (1 - dist / 200), dy / dist * 2000 * (1 - dist / 200)));
    }
  }
});

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Constraints Showcase ------
  constraints: {
    label: "Constraints Showcase",
    desc: 'All built-in constraint types in one scene: PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint. <b>Click</b> to apply impulse.',
    setup() {
      space = new Space(new Vec2(0, 300));
      addWalls();

      // --- PivotJoint (pinned rotating bar) ---
      const pivotAnchor = new Body(BodyType.STATIC, new Vec2(120, 80));
      pivotAnchor.shapes.add(new Circle(5));
      pivotAnchor.space = space;

      const bar1 = new Body(BodyType.DYNAMIC, new Vec2(120, 80));
      bar1.shapes.add(new Polygon(Polygon.box(80, 10)));
      try { bar1.userData._colorIdx = 0; } catch(_) {}
      bar1.space = space;

      const pj = new PivotJoint(pivotAnchor, bar1, new Vec2(0, 0), new Vec2(0, 0));
      pj.space = space;

      // --- DistanceJoint (spring) ---
      const dAnchor = new Body(BodyType.STATIC, new Vec2(300, 60));
      dAnchor.shapes.add(new Circle(5));
      dAnchor.space = space;

      const dBall = new Body(BodyType.DYNAMIC, new Vec2(300, 180));
      dBall.shapes.add(new Circle(15));
      try { dBall.userData._colorIdx = 1; } catch(_) {}
      dBall.space = space;

      const dj = new DistanceJoint(dAnchor, dBall, new Vec2(0, 0), new Vec2(0, 0), 80, 120);
      dj.stiff = false;
      dj.frequency = 2;
      dj.damping = 0.3;
      dj.space = space;

      // --- AngleJoint ---
      const aAnchor = new Body(BodyType.STATIC, new Vec2(480, 80));
      aAnchor.shapes.add(new Circle(5));
      aAnchor.space = space;

      const aBar = new Body(BodyType.DYNAMIC, new Vec2(480, 80));
      aBar.shapes.add(new Polygon(Polygon.box(60, 10)));
      try { aBar.userData._colorIdx = 2; } catch(_) {}
      aBar.space = space;

      const apj = new PivotJoint(aAnchor, aBar, new Vec2(0, 0), new Vec2(0, 0));
      apj.space = space;

      const aj = new AngleJoint(aAnchor, aBar, -Math.PI / 4, Math.PI / 4);
      aj.stiff = false;
      aj.frequency = 3;
      aj.damping = 0.5;
      aj.space = space;

      // --- WeldJoint (two bodies glued) ---
      const w1 = new Body(BodyType.DYNAMIC, new Vec2(640, 100));
      w1.shapes.add(new Polygon(Polygon.box(30, 30)));
      try { w1.userData._colorIdx = 4; } catch(_) {}
      w1.space = space;

      const w2 = new Body(BodyType.DYNAMIC, new Vec2(670, 100));
      w2.shapes.add(new Circle(15));
      try { w2.userData._colorIdx = 5; } catch(_) {}
      w2.space = space;

      const wj = new WeldJoint(w1, w2, new Vec2(15, 0), new Vec2(-15, 0));
      wj.space = space;

      // --- MotorJoint (spinning wheel) ---
      const mAnchor = new Body(BodyType.STATIC, new Vec2(800, 100));
      mAnchor.shapes.add(new Circle(5));
      mAnchor.space = space;

      const wheel = new Body(BodyType.DYNAMIC, new Vec2(800, 100));
      wheel.shapes.add(new Polygon(Polygon.regular(30, 30, 6)));
      try { wheel.userData._colorIdx = 3; } catch(_) {}
      wheel.space = space;

      const mpj = new PivotJoint(mAnchor, wheel, new Vec2(0, 0), new Vec2(0, 0));
      mpj.space = space;

      const mj = new MotorJoint(mAnchor, wheel, 3);
      mj.space = space;

      // --- LineJoint (slider) ---
      const lAnchor = new Body(BodyType.STATIC, new Vec2(120, 300));
      lAnchor.shapes.add(new Circle(5));
      lAnchor.space = space;

      const slider = new Body(BodyType.DYNAMIC, new Vec2(200, 300));
      slider.shapes.add(new Polygon(Polygon.box(30, 20)));
      try { slider.userData._colorIdx = 1; } catch(_) {}
      slider.space = space;

      const lj = new LineJoint(lAnchor, slider, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -80, 80);
      lj.space = space;

      // Some loose shapes to interact with
      for (let i = 0; i < 30; i++) {
        spawnRandomShape(100 + Math.random() * 700, 200 + Math.random() * 200);
      }
    },
    click(x, y) {
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = 600 * (1 - dist / 150);
          body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
        }
      }
    },
    code2d: `// Constraints showcase — all built-in joint types
const space = new Space(new Vec2(0, 300));

// --- PivotJoint: pin two bodies at a shared point ---
const pivotAnchor = new Body(BodyType.STATIC, new Vec2(120, 80));
pivotAnchor.shapes.add(new Circle(5));
pivotAnchor.space = space;

const bar = new Body(BodyType.DYNAMIC, new Vec2(120, 80));
bar.shapes.add(new Polygon(Polygon.box(80, 10)));
bar.space = space;

const pivot = new PivotJoint(
  pivotAnchor, bar, new Vec2(0, 0), new Vec2(0, 0),
);
pivot.space = space;

// --- DistanceJoint: spring between two bodies ---
const dAnchor = new Body(BodyType.STATIC, new Vec2(300, 60));
dAnchor.shapes.add(new Circle(5));
dAnchor.space = space;

const ball = new Body(BodyType.DYNAMIC, new Vec2(300, 180));
ball.shapes.add(new Circle(15));
ball.space = space;

const spring = new DistanceJoint(
  dAnchor, ball, new Vec2(0, 0), new Vec2(0, 0), 80, 120,
);
spring.stiff = false;
spring.frequency = 2;
spring.damping = 0.3;
spring.space = space;

// --- AngleJoint: limit rotation range ---
const aj = new AngleJoint(pivotAnchor, bar, -Math.PI / 4, Math.PI / 4);
aj.space = space;

// --- MotorJoint: constant angular velocity ---
const mAnchor = new Body(BodyType.STATIC, new Vec2(500, 100));
mAnchor.shapes.add(new Circle(5));
mAnchor.space = space;

const wheel = new Body(BodyType.DYNAMIC, new Vec2(500, 100));
wheel.shapes.add(new Polygon(Polygon.regular(30, 30, 6)));
wheel.space = space;

new PivotJoint(mAnchor, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
const motor = new MotorJoint(mAnchor, wheel, 3);
motor.space = space;

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConstraintLines();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

const space = new Space(new Vec2(0, 300));
const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
const meshes = [];

function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

// PivotJoint: rotating bar
const pivotAnchor = new Body(BodyType.STATIC, new Vec2(120, 80));
pivotAnchor.shapes.add(new Circle(5));
pivotAnchor.space = space;
const bar = new Body(BodyType.DYNAMIC, new Vec2(120, 80));
bar.shapes.add(new Polygon(Polygon.box(80, 10)));
bar.space = space;
new PivotJoint(pivotAnchor, bar, new Vec2(0, 0), new Vec2(0, 0)).space = space;
addMesh(pivotAnchor, 0x455a64);
addMesh(bar, COLORS[0]);

// DistanceJoint: spring
const dAnchor = new Body(BodyType.STATIC, new Vec2(300, 60));
dAnchor.shapes.add(new Circle(5));
dAnchor.space = space;
const ball = new Body(BodyType.DYNAMIC, new Vec2(300, 180));
ball.shapes.add(new Circle(15));
ball.space = space;
const spring = new DistanceJoint(dAnchor, ball, new Vec2(0, 0), new Vec2(0, 0), 80, 120);
spring.stiff = false; spring.frequency = 2; spring.damping = 0.3;
spring.space = space;
addMesh(dAnchor, 0x455a64);
addMesh(ball, COLORS[1]);

// MotorJoint: spinning wheel
const mAnchor = new Body(BodyType.STATIC, new Vec2(500, 100));
mAnchor.shapes.add(new Circle(5));
mAnchor.space = space;
const wheel = new Body(BodyType.DYNAMIC, new Vec2(500, 100));
wheel.shapes.add(new Polygon(Polygon.regular(30, 30, 6)));
wheel.space = space;
new PivotJoint(mAnchor, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
new MotorJoint(mAnchor, wheel, 3).space = space;
addMesh(mAnchor, 0x455a64);
addMesh(wheel, COLORS[3]);

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Orbital Gravity (Mario Galaxy style) ------
  gravity: {
    label: "Orbital Gravity",
    desc: 'Mario Galaxy-style gravity: bodies are pulled toward a central planet. <b>Click</b> to spawn orbiting bodies.',
    setup() {
      space = new Space(new Vec2(0, 0)); // no global gravity
      _colorCounter = 0;

      // Central "planet"
      const planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
      planet.shapes.add(new Circle(40));
      planet.space = space;

      // Orbiting bodies
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 180;
        const b = spawnRandomShape(
          W / 2 + Math.cos(angle) * dist,
          H / 2 + Math.sin(angle) * dist,
        );
        // Give tangential velocity for orbit
        const speed = 80 + Math.random() * 60;
        b.velocity = new Vec2(
          -Math.sin(angle) * speed,
          Math.cos(angle) * speed,
        );
      }

      this._planetX = W / 2;
      this._planetY = H / 2;
    },
    step() {
      // Apply gravity toward center for all dynamic bodies
      const cx = this._planetX;
      const cy = this._planetY;
      const G = 800000;
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = cx - body.position.x;
        const dy = cy - body.position.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 100) continue;
        const dist = Math.sqrt(distSq);
        const force = G / distSq;
        body.force = new Vec2(dx / dist * force, dy / dist * force);
      }
    },
    click(x, y) {
      const b = spawnRandomShape(x, y);
      const dx = this._planetX - x;
      const dy = this._planetY - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 100;
      b.velocity = new Vec2(-dy / dist * speed, dx / dist * speed);
    },
    code2d: `// Orbital gravity — Mario Galaxy style
const space = new Space(new Vec2(0, 0)); // no global gravity!

// Static "planet" at center
const planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
planet.shapes.add(new Circle(40));
planet.space = space;

// Spawn orbiting bodies with tangential velocity
for (let i = 0; i < 50; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 100 + Math.random() * 180;
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    W / 2 + Math.cos(angle) * dist,
    H / 2 + Math.sin(angle) * dist,
  ));
  body.shapes.add(new Circle(6 + Math.random() * 10));
  body.space = space;
  const speed = 80 + Math.random() * 60;
  body.velocity = new Vec2(-Math.sin(angle) * speed, Math.cos(angle) * speed);
}

// Gravitational pull
function applyGravity() {
  const G = 800000;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = W / 2 - body.position.x;
    const dy = H / 2 - body.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 100) continue;
    const dist = Math.sqrt(distSq);
    const force = G / distSq;
    body.force = new Vec2(dx / dist * force, dy / dist * force);
  }
}

function loop() {
  applyGravity();
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics — no global gravity
const space = new Space(new Vec2(0, 0));
const planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
planet.shapes.add(new Circle(40));
planet.space = space;

const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
const meshes = [];

// Planet mesh
const planetMesh = new THREE.Mesh(
  new THREE.SphereGeometry(40, 32, 32),
  new THREE.MeshPhongMaterial({ color: 0x455a64 }),
);
planetMesh.position.set(W / 2, -H / 2, 0);
scene.add(planetMesh);

// Orbiting bodies
for (let i = 0; i < 50; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 100 + Math.random() * 180;
  const r = 6 + Math.random() * 10;
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    W / 2 + Math.cos(angle) * dist, H / 2 + Math.sin(angle) * dist,
  ));
  body.shapes.add(new Circle(r));
  body.space = space;
  const speed = 80 + Math.random() * 60;
  body.velocity = new Vec2(-Math.sin(angle) * speed, Math.cos(angle) * speed);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 12),
    new THREE.MeshPhongMaterial({ color: COLORS[i % COLORS.length] }),
  );
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

function applyGravity() {
  const G = 800000;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = W / 2 - body.position.x;
    const dy = H / 2 - body.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 100) continue;
    const dist = Math.sqrt(distSq);
    const force = G / distSq;
    body.force = new Vec2(dx / dist * force, dy / dist * force);
  }
}

function loop() {
  applyGravity();
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Ragdoll ------
  ragdoll: {
    label: "Ragdoll",
    desc: 'Ragdoll figures built from <code>PivotJoint</code> and <code>AngleJoint</code> constraints. <b>Click</b> to spawn a new ragdoll at the cursor.',
    setup() {
      space = new Space(new Vec2(0, 600));
      _colorCounter = 0;
      addWalls();
      this._spawnRagdoll(W / 2, 120, 0);
      this._spawnRagdoll(W / 2 - 150, 80, 2);
      this._spawnRagdoll(W / 2 + 150, 60, 4);
    },
    _spawnRagdoll(x, y, colorBase) {
      // Torso
      const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      torso.shapes.add(new Polygon(Polygon.box(24, 48)));
      try { torso.userData._colorIdx = colorBase; } catch(_) {}
      torso.space = space;

      // Head
      const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
      head.shapes.add(new Circle(12));
      try { head.userData._colorIdx = colorBase; } catch(_) {}
      head.space = space;

      const neckPivot = new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12));
      neckPivot.space = space;
      const neckAngle = new AngleJoint(torso, head, -0.4, 0.4);
      neckAngle.stiff = false;
      neckAngle.frequency = 8;
      neckAngle.damping = 0.6;
      neckAngle.space = space;

      // Upper arms
      const armLen = 28, armW = 8;
      const lUpperArm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
      lUpperArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
      try { lUpperArm.userData._colorIdx = colorBase + 1; } catch(_) {}
      lUpperArm.space = space;

      const rUpperArm = new Body(BodyType.DYNAMIC, new Vec2(x + 26, y - 14));
      rUpperArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
      try { rUpperArm.userData._colorIdx = colorBase + 1; } catch(_) {}
      rUpperArm.space = space;

      const lShoulderP = new PivotJoint(torso, lUpperArm, new Vec2(-12, -20), new Vec2(14, 0));
      lShoulderP.space = space;
      const lShoulderA = new AngleJoint(torso, lUpperArm, -Math.PI * 0.75, Math.PI * 0.75);
      lShoulderA.space = space;

      const rShoulderP = new PivotJoint(torso, rUpperArm, new Vec2(12, -20), new Vec2(-14, 0));
      rShoulderP.space = space;
      const rShoulderA = new AngleJoint(torso, rUpperArm, -Math.PI * 0.75, Math.PI * 0.75);
      rShoulderA.space = space;

      // Lower arms
      const lLowerArm = new Body(BodyType.DYNAMIC, new Vec2(x - 54, y - 14));
      lLowerArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
      try { lLowerArm.userData._colorIdx = colorBase + 1; } catch(_) {}
      lLowerArm.space = space;

      const rLowerArm = new Body(BodyType.DYNAMIC, new Vec2(x + 54, y - 14));
      rLowerArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
      try { rLowerArm.userData._colorIdx = colorBase + 1; } catch(_) {}
      rLowerArm.space = space;

      const lElbowP = new PivotJoint(lUpperArm, lLowerArm, new Vec2(-14, 0), new Vec2(14, 0));
      lElbowP.space = space;
      const lElbowA = new AngleJoint(lUpperArm, lLowerArm, -Math.PI * 0.6, 0.1);
      lElbowA.space = space;

      const rElbowP = new PivotJoint(rUpperArm, rLowerArm, new Vec2(14, 0), new Vec2(-14, 0));
      rElbowP.space = space;
      const rElbowA = new AngleJoint(rUpperArm, rLowerArm, -0.1, Math.PI * 0.6);
      rElbowA.space = space;

      // Upper legs
      const legLen = 32, legW = 10;
      const lUpperLeg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
      lUpperLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
      try { lUpperLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
      lUpperLeg.space = space;

      const rUpperLeg = new Body(BodyType.DYNAMIC, new Vec2(x + 8, y + 40));
      rUpperLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
      try { rUpperLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
      rUpperLeg.space = space;

      const lHipP = new PivotJoint(torso, lUpperLeg, new Vec2(-8, 24), new Vec2(0, -16));
      lHipP.space = space;
      const lHipA = new AngleJoint(torso, lUpperLeg, -0.6, 0.6);
      lHipA.space = space;

      const rHipP = new PivotJoint(torso, rUpperLeg, new Vec2(8, 24), new Vec2(0, -16));
      rHipP.space = space;
      const rHipA = new AngleJoint(torso, rUpperLeg, -0.6, 0.6);
      rHipA.space = space;

      // Lower legs
      const lLowerLeg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 72));
      lLowerLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
      try { lLowerLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
      lLowerLeg.space = space;

      const rLowerLeg = new Body(BodyType.DYNAMIC, new Vec2(x + 8, y + 72));
      rLowerLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
      try { rLowerLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
      rLowerLeg.space = space;

      const lKneeP = new PivotJoint(lUpperLeg, lLowerLeg, new Vec2(0, 16), new Vec2(0, -16));
      lKneeP.space = space;
      const lKneeA = new AngleJoint(lUpperLeg, lLowerLeg, -0.1, Math.PI * 0.5);
      lKneeA.space = space;

      const rKneeP = new PivotJoint(rUpperLeg, rLowerLeg, new Vec2(0, 16), new Vec2(0, -16));
      rKneeP.space = space;
      const rKneeA = new AngleJoint(rUpperLeg, rLowerLeg, -0.1, Math.PI * 0.5);
      rKneeA.space = space;
    },
    click(x, y) {
      this._spawnRagdoll(x, y, Math.floor(Math.random() * 6));
    },
    code2d: `// Ragdoll using PivotJoint + AngleJoint constraints
const space = new Space(new Vec2(0, 600));

addWalls();

function spawnRagdoll(x, y) {
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  torso.space = space;

  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  head.space = space;

  new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12)).space = space;
  const neckAngle = new AngleJoint(torso, head, -0.4, 0.4);
  neckAngle.stiff = false; neckAngle.frequency = 8; neckAngle.damping = 0.6;
  neckAngle.space = space;

  const arm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  arm.shapes.add(new Polygon(Polygon.box(28, 8)));
  arm.space = space;
  new PivotJoint(torso, arm, new Vec2(-12, -20), new Vec2(14, 0)).space = space;
  new AngleJoint(torso, arm, -Math.PI * 0.75, Math.PI * 0.75).space = space;

  const leg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
  leg.shapes.add(new Polygon(Polygon.box(10, 32)));
  leg.space = space;
  new PivotJoint(torso, leg, new Vec2(-8, 24), new Vec2(0, -16)).space = space;
  new AngleJoint(torso, leg, -0.6, 0.6).space = space;
}

spawnRagdoll(W / 2, 120);

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConstraintLines();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics
const space = new Space(new Vec2(0, 600));
addWalls();

const meshes = [];
function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

function spawnRagdoll(x, y, color) {
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  torso.space = space;
  addMesh(torso, color);

  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  head.space = space;
  addMesh(head, color);

  new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12)).space = space;
  const na = new AngleJoint(torso, head, -0.4, 0.4);
  na.stiff = false; na.frequency = 8; na.damping = 0.6;
  na.space = space;

  const arm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  arm.shapes.add(new Polygon(Polygon.box(28, 8)));
  arm.space = space;
  addMesh(arm, color);
  new PivotJoint(torso, arm, new Vec2(-12, -20), new Vec2(14, 0)).space = space;
  new AngleJoint(torso, arm, -Math.PI * 0.75, Math.PI * 0.75).space = space;

  const leg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
  leg.shapes.add(new Polygon(Polygon.box(10, 32)));
  leg.space = space;
  addMesh(leg, color);
  new PivotJoint(torso, leg, new Vec2(-8, 24), new Vec2(0, -16)).space = space;
  new AngleJoint(torso, leg, -0.6, 0.6).space = space;
}

spawnRagdoll(W / 2, 120, 0x58a6ff);
spawnRagdoll(W / 2 - 150, 80, 0x3fb950);
spawnRagdoll(W / 2 + 150, 60, 0xf85149);

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Stacking / Balance ------
  stacking: {
    label: "Stacking",
    desc: 'Towers of various shapes testing stacking stability. <b>Click</b> to drop a heavy box.',
    setup() {
      space = new Space(new Vec2(0, 600));
      _colorCounter = 0;
      addWalls();

      // Tower 1: boxes
      for (let i = 0; i < 12; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
        b.shapes.add(new Polygon(Polygon.box(40, 25)));
        try { b.userData._colorIdx = 0; } catch(_) {}
        b.space = space;
      }

      // Tower 2: circles
      for (let i = 0; i < 10; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
        b.shapes.add(new Circle(12));
        try { b.userData._colorIdx = 1; } catch(_) {}
        b.space = space;
      }

      // Tower 3: mixed hexagons
      for (let i = 0; i < 10; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          600 + (Math.random() - 0.5) * 4,
          H - 30 - 28 * i - 14,
        ));
        b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
        try { b.userData._colorIdx = 2; } catch(_) {}
        b.space = space;
      }

      // Tower 4: wide thin boxes
      for (let i = 0; i < 14; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          780 + (i % 2 === 0 ? 0 : 10),
          H - 30 - 16 * i - 8,
        ));
        b.shapes.add(new Polygon(Polygon.box(60, 14)));
        try { b.userData._colorIdx = 4; } catch(_) {}
        b.space = space;
      }
    },
    click(x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Polygon(Polygon.box(50, 50), new Material(0.3, 0.3, 0.3, 5)));
      try { b.userData._colorIdx = 3; } catch(_) {}
      b.space = space;
    },
    code2d: `// Stacking stability test — towers of various shapes
const space = new Space(new Vec2(0, 600));

addWalls();

// Tower of boxes
for (let i = 0; i < 12; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
  b.shapes.add(new Polygon(Polygon.box(40, 25)));
  b.space = space;
}

// Tower of circles
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
  b.shapes.add(new Circle(12));
  b.space = space;
}

// Tower of hexagons
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(600, H - 30 - 28 * i - 14));
  b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
  b.space = space;
}

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

// Physics
const space = new Space(new Vec2(0, 600));
addWalls();

const meshes = [];
function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

// Tower of boxes
for (let i = 0; i < 12; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
  b.shapes.add(new Polygon(Polygon.box(40, 25)));
  b.space = space;
  addMesh(b, 0x58a6ff);
}

// Tower of circles
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
  b.shapes.add(new Circle(12));
  b.space = space;
  addMesh(b, 0xd29922);
}

// Tower of hexagons
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(600, H - 30 - 28 * i - 14));
  b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
  b.space = space;
  addMesh(b, 0x3fb950);
}

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },

  // ------ Strand Beast ------
  strandbeast: {
    label: "Strand Beast",
    desc: 'A Theo Jansen-style walking mechanism with 6 legs (3 phase-offset pairs) driven by a <code>MotorJoint</code> crank. <b>Click</b> to apply impulse.',
    setup() {
      space = new Space(new Vec2(0, 400));
      // Floor only
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
      floor.space = space;

      // Theo Jansen mechanism geometry (from Box2D testbed)
      const S = Math.min(W, H) * 0.05; // pixel scale
      const PIVOT_Y = 0.8;
      const WHEEL_R = 1.6;
      const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
      const CRANK_R = PIVOT_Y * S; // crank pin radius from wheel center

      // Leg geometry points (Box2D Y-up coords negated for screen Y-down)
      const P1X = 5.4, P1Y = 6.1;
      const P2X = 7.2, P2Y = 1.2;
      const P3X = 4.3, P3Y = 1.9;
      const P4X = 3.1, P4Y = -0.8;
      const P5X = 6.0, P5Y = -1.5;
      const P6X = 2.5, P6Y = -3.7;

      // Position mechanism so feet (P1, lowest point) reach the floor
      const ox = W / 2;
      const oy = (H - 20) - P1Y * S;

      // Filter: mechanism parts don't collide with each other (group 2, only collide with group 1)
      const mf = new InteractionFilter(2, 1);

      // Chassis
      const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
      chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW * 2 * S, CHASSIS_HH * 2 * S), undefined, mf));
      try { chassis.userData._colorIdx = 0; } catch(_) {}
      chassis.space = space;

      // Wheel (crank)
      const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
      wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
      try { wheel.userData._colorIdx = 3; } catch(_) {}
      wheel.space = space;

      // Motor drives the wheel relative to chassis
      new PivotJoint(chassis, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
      new MotorJoint(chassis, wheel, 2.0).space = space;

      // Pre-computed rest lengths (invariant across all legs/phases)
      const D12 = Math.sqrt((P2X - P5X) * (P2X - P5X) + (P2Y - P5Y) * (P2Y - P5Y)) * S;
      const D34 = Math.sqrt((P3X - P4X) * (P3X - P4X) + (P3Y - P4Y) * (P3Y - P4Y)) * S;
      const D3W = Math.sqrt(P3X * P3X + P3Y * P3Y) * S;
      const D6W = Math.sqrt(P6X * P6X + P6Y * P6Y) * S;

      function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
        const dj = new DistanceJoint(b1, b2, new Vec2(a1x, a1y), new Vec2(a2x, a2y), d, d);
        dj.stiff = true;
        dj.space = space;
      }

      function createLeg(side, phase) {
        // side = +1 (right) or -1 (left), phase = crank angle offset
        const p1x = P1X * side, p1y = P1Y;
        const p2x = P2X * side, p2y = P2Y;
        const p3x = P3X * side, p3y = P3Y;
        const p4x = P4X * side, p4y = P4Y;
        const p5x = P5X * side, p5y = P5Y;
        const p6x = P6X * side, p6y = P6Y;

        // Crank pin on wheel (rotated by phase)
        const wax = CRANK_R * Math.sin(phase);
        const way = CRANK_R * Math.cos(phase);

        // Body 1 (lower triangle with foot) at mechanism origin
        const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
        const v1 = side > 0
          ? [new Vec2(p1x*S, p1y*S), new Vec2(p3x*S, p3y*S), new Vec2(p2x*S, p2y*S)]
          : [new Vec2(p1x*S, p1y*S), new Vec2(p2x*S, p2y*S), new Vec2(p3x*S, p3y*S)];
        body1.shapes.add(new Polygon(v1, undefined, mf));
        try { body1.userData._colorIdx = 1; } catch(_) {}
        body1.space = space;

        // Body 2 (upper triangle) at p4
        const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox + p4x * S, oy + p4y * S));
        const lp5x = (p5x - p4x) * S, lp5y = (p5y - p4y) * S;
        const lp6x = (p6x - p4x) * S, lp6y = (p6y - p4y) * S;
        const v2 = side > 0
          ? [new Vec2(0, 0), new Vec2(lp6x, lp6y), new Vec2(lp5x, lp5y)]
          : [new Vec2(0, 0), new Vec2(lp5x, lp5y), new Vec2(lp6x, lp6y)];
        body2.shapes.add(new Polygon(v2, undefined, mf));
        try { body2.userData._colorIdx = 2; } catch(_) {}
        body2.space = space;

        // 4 distance joints + 1 pivot joint form the Jansen linkage
        makeDJ(body1, body2, p2x*S, p2y*S, lp5x, lp5y, D12);
        makeDJ(body1, body2, p3x*S, p3y*S, 0, 0, D34);
        makeDJ(body1, wheel, p3x*S, p3y*S, wax, way, D3W);
        makeDJ(body2, wheel, lp6x, lp6y, wax, way, D6W);
        // body2↔chassis revolute joint at P4 (ground pivot)
        new PivotJoint(body2, chassis, new Vec2(0, 0), new Vec2(p4x*S, (p4y + PIVOT_Y) * S)).space = space;
      }

      // 3 pairs of legs with 120° phase offsets
      const phases = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
      for (const phase of phases) {
        createLeg(1, phase);   // right
        createLeg(-1, phase);  // left
      }
    },
    click(x, y) {
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          const force = 800 * (1 - d / 150);
          body.applyImpulse(new Vec2(dx / d * force, dy / d * force));
        }
      }
    },
    code2d: `// Strand Beast — Theo Jansen walking mechanism (6 legs)
const space = new Space(new Vec2(0, 400));
const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
floor.space = space;

const S = Math.min(W, H) * 0.05;
const PIVOT_Y = 0.8, WHEEL_R = 1.6, CRANK_R = PIVOT_Y * S;
const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
const P = {
  p1x: 5.4, p1y: 6.1, p2x: 7.2, p2y: 1.2,
  p3x: 4.3, p3y: 1.9, p4x: 3.1, p4y: -0.8,
  p5x: 6.0, p5y: -1.5, p6x: 2.5, p6y: -3.7,
};

const ox = W / 2, oy = (H - 20) - P.p1y * S;
const mf = new InteractionFilter(2, 1);

const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW*2*S, CHASSIS_HH*2*S), undefined, mf));
chassis.space = space;
const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
wheel.space = space;
new PivotJoint(chassis, wheel, new Vec2(0,0), new Vec2(0,0)).space = space;
new MotorJoint(chassis, wheel, 2.0).space = space;

const D12 = Math.sqrt((P.p2x-P.p5x)**2+(P.p2y-P.p5y)**2)*S;
const D34 = Math.sqrt((P.p3x-P.p4x)**2+(P.p3y-P.p4y)**2)*S;
const D3W = Math.sqrt(P.p3x**2+P.p3y**2)*S;
const D6W = Math.sqrt(P.p6x**2+P.p6y**2)*S;

function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
  const dj = new DistanceJoint(b1, b2, new Vec2(a1x,a1y), new Vec2(a2x,a2y), d, d);
  dj.stiff = true;
  dj.space = space;
}
function createLeg(side, phase) {
  const p1x=P.p1x*side, p2x=P.p2x*side, p3x=P.p3x*side;
  const p4x=P.p4x*side, p5x=P.p5x*side, p6x=P.p6x*side;
  const wax = CRANK_R*Math.sin(phase), way = CRANK_R*Math.cos(phase);
  const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
  const v1 = side > 0
    ? [new Vec2(p1x*S,P.p1y*S), new Vec2(p3x*S,P.p3y*S), new Vec2(p2x*S,P.p2y*S)]
    : [new Vec2(p1x*S,P.p1y*S), new Vec2(p2x*S,P.p2y*S), new Vec2(p3x*S,P.p3y*S)];
  body1.shapes.add(new Polygon(v1, undefined, mf));
  body1.space = space;
  const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox+p4x*S, oy+P.p4y*S));
  const lp5x=(p5x-p4x)*S, lp5y=(P.p5y-P.p4y)*S;
  const lp6x=(p6x-p4x)*S, lp6y=(P.p6y-P.p4y)*S;
  const v2 = side > 0
    ? [new Vec2(0,0), new Vec2(lp6x,lp6y), new Vec2(lp5x,lp5y)]
    : [new Vec2(0,0), new Vec2(lp5x,lp5y), new Vec2(lp6x,lp6y)];
  body2.shapes.add(new Polygon(v2, undefined, mf));
  body2.space = space;
  makeDJ(body1, body2, p2x*S, P.p2y*S, lp5x, lp5y, D12);
  makeDJ(body1, body2, p3x*S, P.p3y*S, 0, 0, D34);
  makeDJ(body1, wheel, p3x*S, P.p3y*S, wax, way, D3W);
  makeDJ(body2, wheel, lp6x, lp6y, wax, way, D6W);
  new PivotJoint(body2, chassis, new Vec2(0,0), new Vec2(p4x*S,(P.p4y+PIVOT_Y)*S)).space = space;
}
[0, Math.PI*2/3, Math.PI*4/3].forEach(ph => { createLeg(1,ph); createLeg(-1,ph); });

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConstraintLines();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

    code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

const space = new Space(new Vec2(0, 400));
const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
floor.space = space;

const S = Math.min(W, H) * 0.05;
const PIVOT_Y = 0.8, WHEEL_R = 1.6, CRANK_R = PIVOT_Y * S;
const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
const P = {
  p1x: 5.4, p1y: 6.1, p2x: 7.2, p2y: 1.2,
  p3x: 4.3, p3y: 1.9, p4x: 3.1, p4y: -0.8,
  p5x: 6.0, p5y: -1.5, p6x: 2.5, p6y: -3.7,
};

const ox = W / 2, oy = (H - 20) - P.p1y * S;
const mf = new InteractionFilter(2, 1);
const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149];
const meshes = [];

function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.get_length(); i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW*2*S, CHASSIS_HH*2*S), undefined, mf));
chassis.space = space;
addMesh(chassis, COLORS[0]);
const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
wheel.space = space;
addMesh(wheel, COLORS[3]);
new PivotJoint(chassis, wheel, new Vec2(0,0), new Vec2(0,0)).space = space;
new MotorJoint(chassis, wheel, 2.0).space = space;

const D12 = Math.sqrt((P.p2x-P.p5x)**2+(P.p2y-P.p5y)**2)*S;
const D34 = Math.sqrt((P.p3x-P.p4x)**2+(P.p3y-P.p4y)**2)*S;
const D3W = Math.sqrt(P.p3x**2+P.p3y**2)*S;
const D6W = Math.sqrt(P.p6x**2+P.p6y**2)*S;

function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
  const dj = new DistanceJoint(b1, b2, new Vec2(a1x,a1y), new Vec2(a2x,a2y), d, d);
  dj.stiff = true;
  dj.space = space;
}
function createLeg(side, phase) {
  const p1x=P.p1x*side, p2x=P.p2x*side, p3x=P.p3x*side;
  const p4x=P.p4x*side, p5x=P.p5x*side, p6x=P.p6x*side;
  const wax = CRANK_R*Math.sin(phase), way = CRANK_R*Math.cos(phase);
  const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
  const v1 = side > 0
    ? [new Vec2(p1x*S,P.p1y*S), new Vec2(p3x*S,P.p3y*S), new Vec2(p2x*S,P.p2y*S)]
    : [new Vec2(p1x*S,P.p1y*S), new Vec2(p2x*S,P.p2y*S), new Vec2(p3x*S,P.p3y*S)];
  body1.shapes.add(new Polygon(v1, undefined, mf));
  body1.space = space;
  addMesh(body1, COLORS[1]);
  const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox+p4x*S, oy+P.p4y*S));
  const lp5x=(p5x-p4x)*S, lp5y=(P.p5y-P.p4y)*S;
  const lp6x=(p6x-p4x)*S, lp6y=(P.p6y-P.p4y)*S;
  const v2 = side > 0
    ? [new Vec2(0,0), new Vec2(lp6x,lp6y), new Vec2(lp5x,lp5y)]
    : [new Vec2(0,0), new Vec2(lp5x,lp5y), new Vec2(lp6x,lp6y)];
  body2.shapes.add(new Polygon(v2, undefined, mf));
  body2.space = space;
  addMesh(body2, COLORS[2]);
  makeDJ(body1, body2, p2x*S, P.p2y*S, lp5x, lp5y, D12);
  makeDJ(body1, body2, p3x*S, P.p3y*S, 0, 0, D34);
  makeDJ(body1, wheel, p3x*S, P.p3y*S, wax, way, D3W);
  makeDJ(body2, wheel, lp6x, lp6y, wax, way, D6W);
  new PivotJoint(body2, chassis, new Vec2(0,0), new Vec2(p4x*S,(P.p4y+PIVOT_Y)*S)).space = space;
}
[0, Math.PI*2/3, Math.PI*4/3].forEach(ph => { createLeg(1,ph); createLeg(-1,ph); });

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
  },
};

// =========================================================================
// Soft body helper
// =========================================================================

function createSoftBody(startX, startY, cols, rows, gap, colorIdx) {
  const bodies = [];
  for (let r = 0; r < rows; r++) {
    bodies[r] = [];
    for (let c = 0; c < cols; c++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        startX + c * gap,
        startY + r * gap,
      ));
      b.shapes.add(new Circle(4));
      try { b.userData._colorIdx = colorIdx; } catch(_) {}
      b.space = space;
      bodies[r][c] = b;
    }
  }

  function springConnect(b1, b2, restLen) {
    const dj = new DistanceJoint(
      b1, b2,
      new Vec2(0, 0), new Vec2(0, 0),
      restLen * 0.8, restLen * 1.2,
    );
    dj.stiff = false;
    dj.frequency = 15;
    dj.damping = 0.4;
    dj.space = space;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1) springConnect(bodies[r][c], bodies[r][c + 1], gap);
      if (r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c], gap);
      if (c < cols - 1 && r < rows - 1) {
        springConnect(bodies[r][c], bodies[r + 1][c + 1], gap * Math.SQRT2);
      }
      if (c > 0 && r < rows - 1) {
        springConnect(bodies[r][c], bodies[r + 1][c - 1], gap * Math.SQRT2);
      }
    }
  }
}

// =========================================================================
// Game loop
// =========================================================================

function startDemo(name) {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  // Teardown 3D if switching away
  if (renderMode === "3d") teardown3d();
  currentDemo = name;

  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.demo === name);
  });

  const demo = DEMOS[name];
  demoDescEl.innerHTML = demo.desc;
  updateCodePreview(demo);
  demo.setup();

  if (renderMode === "3d" && THREE) {
    setup3d();
    buildThreeMeshes();
  }

  lastTime = performance.now();
  frameCount = 0;
  fpsAccum = 0;
  loop();
}

function loop() {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;

  frameCount++;
  fpsAccum += dt;
  if (fpsAccum >= 500) {
    const fps = Math.round((frameCount / fpsAccum) * 1000);
    fpsLabel.textContent = `FPS: ${fps}`;
    frameCount = 0;
    fpsAccum = 0;
  }

  // Per-demo step logic (e.g. custom gravity)
  const demo = DEMOS[currentDemo];
  if (demo.step) demo.step();

  const stepStart = performance.now();
  space.step(1 / 60, demo.velocityIterations ?? 8, demo.positionIterations ?? 3);
  const stepMs = performance.now() - stepStart;
  stepTimeLabel.textContent = `Step: ${stepMs.toFixed(2)}ms`;

  bodyCountLabel.textContent = `Bodies: ${space.bodies.length}`;

  if (renderMode === "3d" && three_renderer && three_scene && three_camera) {
    // Sync new bodies that appeared after setup (e.g. click-spawned)
    const tracked = new Set(three_meshes.map(m => m.body));
    for (const body of space.bodies) {
      if (tracked.has(body)) continue;
      for (const shape of body.shapes) {
        let geom;
        if (shape.isCircle()) {
          geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          const len = verts.get_length();
          if (len < 3) continue;
          const pts = [];
          for (let i = 0; i < len; i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
          geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
          geom.translate(0, 0, -15);
        }
        if (!geom) continue;
        const cIdx = (body.userData?._colorIdx ?? 0) % MESH_COLORS.length;
        const color = body.isStatic() ? 0x455a64 : MESH_COLORS[cIdx];
        const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
        three_scene.add(mesh);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geom, 15),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
        );
        edges.visible = debugDrawCb.checked;
        mesh.add(edges);
        three_meshes.push({ mesh, body, edges });
      }
    }
    for (const { mesh, body } of three_meshes) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;
    }
    three_renderer.render(three_scene, three_camera);
  } else {
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);
    drawConstraints(ctx, space);
    for (const body of space.bodies) drawBody(body);
  }

  animId = requestAnimationFrame(loop);
}

// =========================================================================
// Interaction
// =========================================================================

canvasWrap.addEventListener("mousedown", (e) => {
  mouseDown = true;
  const rect = canvasWrap.getBoundingClientRect();
  const { sx, sy } = getCanvasScale();
  mouseX = (e.clientX - rect.left) * sx;
  mouseY = (e.clientY - rect.top) * sy;
  DEMOS[currentDemo].click?.(mouseX, mouseY);
});

document.addEventListener("mousemove", (e) => {
  if (!mouseDown) return;
  const rect = canvasWrap.getBoundingClientRect();
  const { sx, sy } = getCanvasScale();
  mouseX = (e.clientX - rect.left) * sx;
  mouseY = (e.clientY - rect.top) * sy;
  if (currentDemo === "falling") {
    spawnRandomShape(mouseX + (Math.random()-0.5)*20, mouseY + (Math.random()-0.5)*20);
  }
  DEMOS[currentDemo].drag?.(mouseX, mouseY);
});

document.addEventListener("mouseup", () => {
  mouseDown = false;
  DEMOS[currentDemo].release?.();
});
canvasWrap.addEventListener("mouseleave", () => {
  // only stop spawning shapes, don't end drag
  if (currentDemo === "falling") mouseDown = false;
});

canvasWrap.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvasWrap.getBoundingClientRect();
  const { sx, sy } = getCanvasScale();
  mouseX = (touch.clientX - rect.left) * sx;
  mouseY = (touch.clientY - rect.top) * sy;
  DEMOS[currentDemo].click?.(mouseX, mouseY);
}, { passive: false });

document.getElementById("demoTabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) {
    const demo = tab.dataset.demo;
    if (demo) {
      gtag("event", "navigation", { event_category: "demo_tab", event_label: demo });
    }
    startDemo(demo);
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  gtag("event", "click", { event_category: "demo_action", event_label: "reset", demo: currentDemo });
  startDemo(currentDemo);
});

// =========================================================================
// Benchmarks
// =========================================================================

function runBenchmarkSuite() {
  const resultsEl = document.getElementById("benchResults");
  resultsEl.innerHTML = '<p class="bench-running">Running benchmarks&hellip;</p>';

  setTimeout(() => {
    const results = [];

    function benchStep(label, bodyCount, iterations) {
      const sp = new Space(new Vec2(0, 600));
      const fl = new Body(BodyType.STATIC, new Vec2(450, 550));
      fl.shapes.add(new Polygon(Polygon.box(900, 20)));
      fl.space = sp;

      for (let i = 0; i < bodyCount; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          50 + Math.random() * 800,
          -Math.random() * 1500,
        ));
        const size = 8 + Math.random() * 16;
        if (Math.random() < 0.5) {
          b.shapes.add(new Circle(size / 2));
        } else {
          b.shapes.add(new Polygon(Polygon.box(size, size)));
        }
        b.space = sp;
      }

      for (let i = 0; i < 5; i++) sp.step(1/60, 8, 3);

      const times = [];
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        sp.step(1/60, 8, 3);
        times.push(performance.now() - t0);
      }

      const sorted = [...times].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      results.push({ label, bodyCount, med, avg, min, max });
    }

    benchStep("100 bodies", 100, 200);
    benchStep("200 bodies", 200, 150);
    benchStep("500 bodies", 500, 100);
    benchStep("1 000 bodies", 1000, 50);
    benchStep("2 000 bodies", 2000, 30);

    const maxAvg = Math.max(...results.map(r => r.avg));

    let html = `
      <div class="bench-table-wrap"><table class="bench-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Median</th>
            <th>Average</th>
            <th>Min</th>
            <th>Max</th>
            <th class="bench-bar-col"></th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const r of results) {
      const barWidth = Math.max(4, (r.avg / maxAvg) * 100);
      html += `
        <tr>
          <td>${r.label}</td>
          <td>${formatMs(r.med)}</td>
          <td>${formatMs(r.avg)}</td>
          <td>${formatMs(r.min)}</td>
          <td>${formatMs(r.max)}</td>
          <td class="bench-bar-col"><div class="bench-bar" style="width:${barWidth}px"></div></td>
        </tr>
      `;
    }

    html += "</tbody></table></div>";
    html += `<p style="margin-top:12px;color:var(--text-dim);font-size:0.82rem">
      Measured with <code>space.step(1/60, 8, 3)</code> per iteration.
      Mixed circle/box shapes. Your results may vary by browser and hardware.
    </p>`;

    resultsEl.innerHTML = html;
  }, 50);
}

function formatMs(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`;
}

document.getElementById("runBenchmark").addEventListener("click", () => {
  gtag("event", "click", { event_category: "benchmark", event_label: "run_benchmarks" });
  runBenchmarkSuite();
});

// =========================================================================
// Boot
// =========================================================================

installErrorOverlay(VERSION);
const versionBadge = document.getElementById("versionBadge");
if (versionBadge) versionBadge.textContent = `v${VERSION}`;
overlay.classList.add("hidden");
startDemo("falling");
