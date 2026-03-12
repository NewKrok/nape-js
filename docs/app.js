/**
 * nape-js Demo Page — interactive demos + live benchmarks + code preview + CodePen export
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon, VERSION,
} from "./nape-js.esm.js?v=3.10.3";
import { installErrorOverlay } from "./renderer.js?v=3.10.3";
import { DemoRunner, loadThree, highlightCode } from "./demo-runner.js?v=3.10.3";

// Demo definitions — one file each
import falling     from "./demos/falling.js?v=3.10.3";
import pyramid     from "./demos/pyramid.js?v=3.10.3";
import chain       from "./demos/chain.js?v=3.10.3";
import explosion   from "./demos/explosion.js?v=3.10.3";
import constraints from "./demos/constraints.js?v=3.10.3";
import gravity     from "./demos/gravity.js?v=3.10.3";
import stacking    from "./demos/stacking.js?v=3.10.3";
import ragdoll     from "./demos/ragdoll.js?v=3.10.3";
import strandbeast from "./demos/strandbeast.js?v=3.10.3";

// =========================================================================
// Demo registry
// =========================================================================

const ALL_DEMOS = [
  falling, pyramid, chain, explosion, constraints,
  gravity, stacking, ragdoll, strandbeast,
];

const FEATURED = ALL_DEMOS
  .filter(d => d.featured)
  .sort((a, b) => a.featuredOrder - b.featuredOrder);

// =========================================================================
// DOM refs
// =========================================================================

const canvasWrap    = document.getElementById("canvasWrap");
const canvas        = /** @type {HTMLCanvasElement} */ (document.getElementById("demoCanvas"));
const loadingOverlay = document.getElementById("canvasOverlay");
const fpsLabel      = document.getElementById("fpsLabel");
const bodyCountLabel = document.getElementById("bodyCount");
const stepTimeLabel = document.getElementById("stepTime");
const demoDescEl    = document.getElementById("demoDescription");
const debugDrawCb   = /** @type {HTMLInputElement} */ (document.getElementById("debugDraw"));
const codePreviewEl = document.getElementById("codePreview");
const copyCodeBtn   = document.getElementById("copyCodeBtn");
const codepenBtn    = document.getElementById("codepenBtn");

const W = canvas.width;
const H = canvas.height;

// =========================================================================
// Runner
// =========================================================================

const runner = new DemoRunner(canvasWrap, { W, H, canvas });
runner.wireStats({ fps: fpsLabel, bodies: bodyCountLabel, step: stepTimeLabel });
runner.wireInteraction(canvasWrap);
runner.debugDraw = debugDrawCb.checked;

debugDrawCb.addEventListener("change", () => { runner.debugDraw = debugDrawCb.checked; });

// =========================================================================
// Tabs
// =========================================================================

let currentDemoId = null;

function buildTabs() {
  const nav = document.getElementById("demoTabs");
  for (const demo of FEATURED) {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.demo = demo.id;
    btn.textContent = demo.label;
    nav.insertBefore(btn, nav.querySelector(".tab-more"));
  }
}

async function startDemo(id) {
  const demo = FEATURED.find(d => d.id === id) ?? FEATURED[0];
  currentDemoId = demo.id;

  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.demo === demo.id);
  });

  demoDescEl.innerHTML = demo.desc ?? "";
  await runner.loadAsync(demo);
  runner.start();
  updateCodePreview();
}

document.getElementById("demoTabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab || !tab.dataset.demo) return;
  gtag("event", "navigation", { event_category: "demo_tab", event_label: tab.dataset.demo });
  startDemo(tab.dataset.demo);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  gtag("event", "click", { event_category: "demo_action", event_label: "reset", demo: currentDemoId });
  startDemo(currentDemoId);
});

// =========================================================================
// Render mode
// =========================================================================

document.getElementById("renderModeToggle").addEventListener("click", async (e) => {
  const btn = e.target.closest(".render-mode-btn");
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === runner.mode) return;
  gtag("event", "click", { event_category: "render_mode", event_label: mode });

  if (mode === "3d") await loadThree();

  document.querySelectorAll(".render-mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  runner.setMode(mode);
  updateCodePreview();
});

// =========================================================================
// Code preview
// =========================================================================

function getActiveCode() {
  const demo = runner.currentDemo;
  if (!demo) return "// No demo loaded.";
  if (runner.mode === "3d" && demo.code3d) return demo.code3d;
  return demo.code2d ?? demo.code ?? "// No source code available for this demo.";
}

function updateCodePreview() {
  codePreviewEl.innerHTML = highlightCode(getActiveCode());
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

copyCodeBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "copy_code", demo: currentDemoId });
  navigator.clipboard.writeText(getActiveCode()).then(() => showToast("Copied to clipboard!"));
});

codepenBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_codepen", demo: currentDemoId });
  openInCodePen();
});

const NAPE_CDN = "https://cdn.jsdelivr.net/npm/@newkrok/nape-js/dist/index.js";

function openInCodePen() {
  const demo = runner.currentDemo;
  if (!demo) return;
  const code = getActiveCode();
  const is3d = runner.mode === "3d" && demo.code3d;

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
      const len = verts.length;
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

  let js;
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

  const data = {
    title: `nape-js — ${demo.label ?? currentDemoId}${is3d ? " (3D)" : ""}`,
    description: `Interactive physics demo using nape-js TypeScript wrapper.\nhttps://github.com/NewKrok/nape-js`,
    html, css, js, js_module: true,
  };
  const form  = document.createElement("form");
  form.method = "POST";
  form.action = "https://codepen.io/pen/define";
  form.target = "_blank";
  const input = document.createElement("input");
  input.type  = "hidden";
  input.name  = "data";
  input.value = JSON.stringify(data);
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

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
        const b = new Body(BodyType.DYNAMIC, new Vec2(50 + Math.random() * 800, -Math.random() * 1500));
        const size = 8 + Math.random() * 16;
        if (Math.random() < 0.5) { b.shapes.add(new Circle(size / 2)); }
        else { b.shapes.add(new Polygon(Polygon.box(size, size))); }
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
      results.push({ label, bodyCount, med, avg, min: sorted[0], max: sorted[sorted.length - 1] });
    }

    benchStep("100 bodies",   100, 200);
    benchStep("200 bodies",   200, 150);
    benchStep("500 bodies",   500, 100);
    benchStep("1 000 bodies", 1000, 50);
    benchStep("2 000 bodies", 2000, 30);

    const maxAvg = Math.max(...results.map(r => r.avg));
    let html = `<div class="bench-table-wrap"><table class="bench-table">
      <thead><tr><th>Scenario</th><th>Median</th><th>Average</th><th>Min</th><th>Max</th><th class="bench-bar-col"></th></tr></thead>
      <tbody>`;
    for (const r of results) {
      const barWidth = Math.max(4, (r.avg / maxAvg) * 100);
      html += `<tr><td>${r.label}</td><td>${formatMs(r.med)}</td><td>${formatMs(r.avg)}</td><td>${formatMs(r.min)}</td><td>${formatMs(r.max)}</td>
        <td class="bench-bar-col"><div class="bench-bar" style="width:${barWidth}px"></div></td></tr>`;
    }
    html += `</tbody></table></div>
      <p style="margin-top:12px;color:var(--text-dim);font-size:0.82rem">
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
loadingOverlay.classList.add("hidden");

buildTabs();
startDemo(FEATURED[0].id);
