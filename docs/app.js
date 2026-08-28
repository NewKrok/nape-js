/**
 * nape-js Demo Page — interactive demos + live benchmarks + code preview + CodePen export
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon, VERSION,
} from "./nape-js.esm.js?v=3.40.0";
import { installErrorOverlay } from "./renderer.js?v=3.40.0";
import { DemoRunner } from "./demo-runner.js?v=3.40.0";
import { Canvas2DAdapter } from "./renderers/canvas2d-adapter.js?v=3.40.0";
import { ThreeJSAdapter, loadThree } from "./renderers/threejs-adapter.js?v=3.40.0";
import { PixiJSAdapter, loadPixi } from "./renderers/pixijs-adapter.js?v=3.40.0";
import { openInCodePen as _openInCodePen, getPreviewCode } from "./codepen-templates.js?v=3.40.0";
import { openInStackBlitz as _openInStackBlitz } from "./stackblitz-templates.js?v=3.40.0";

import { categoryOf } from "./demo-categories.js?v=3.40.0";
import { t as i18n } from "./i18n/i18n.js?v=3.40.0";

// Localized demo label/desc with English-source fallback.
const demoLabel = (demo) => i18n(`demo.${demo.id}.label`, demo.label);
const demoDesc = (demo) => i18n(`demo.${demo.id}.desc`, demo.desc ?? "");

// Demo definitions — one file each
import falling     from "./demos/falling.js?v=3.40.0";
import pyramid     from "./demos/pyramid.js?v=3.40.0";
import chain       from "./demos/chain.js?v=3.40.0";
import explosion   from "./demos/explosion.js?v=3.40.0";
import constraints from "./demos/constraints.js?v=3.40.0";
import gravity     from "./demos/gravity.js?v=3.40.0";
import stacking    from "./demos/stacking.js?v=3.40.0";
import ragdoll     from "./demos/ragdoll.js?v=3.40.0";
import strandbeast from "./demos/strandbeast.js?v=3.40.0";
import softBody    from "./demos/soft-body.js?v=3.40.0";
import destructibleArena from "./demos/destructible-arena.js?v=3.40.0";

// =========================================================================
// Demo registry
// =========================================================================

const ALL_DEMOS = [
  falling, pyramid, chain, explosion, constraints,
  gravity, stacking, ragdoll, strandbeast, softBody,
  destructibleArena,
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
const codePreviewEl = document.getElementById("codePreview");
const codeBodyEl    = codePreviewEl.closest(".code-panel-body") ?? codePreviewEl.parentElement;
const copyCodeBtn   = document.getElementById("copyCodeBtn");
const codepenBtn    = document.getElementById("codepenBtn");
const stackblitzBtn = document.getElementById("stackblitzBtn");

const W = canvas.width;
const H = canvas.height;

// =========================================================================
// Runner + Adapters
// =========================================================================

const runner = new DemoRunner(canvasWrap, { W, H });

// Register Canvas2D adapter with the existing canvas element
runner.registerAdapter(new Canvas2DAdapter({ canvas }));

// ThreeJS adapter is registered lazily (on first 3D toggle)
let threeAdapterRegistered = false;
let pixiAdapterRegistered = false;

runner.wireStats({ fps: fpsLabel, bodies: bodyCountLabel, step: stepTimeLabel });
runner.wireInteraction(canvasWrap);
runner.debugDraw = true;

// --- Outline toggle ---
const outlineBtn = document.getElementById("outlineBtn");
outlineBtn.addEventListener("click", () => {
  runner.debugDraw = !runner.debugDraw;
  outlineBtn.classList.toggle("active", runner.debugDraw);
  updateCodePreview();
});

// --- Profiler toggle ---
const profilerBtn = document.getElementById("profilerBtn");
if (profilerBtn) {
  profilerBtn.addEventListener("click", () => {
    runner.showProfiler = !runner.showProfiler;
    profilerBtn.classList.toggle("active", runner.showProfiler);
  });
}

// --- Worker toggle ---
const workerBtn = document.getElementById("workerBtn");
if (workerBtn) {
  workerBtn.addEventListener("click", async () => {
    const enable = !runner.workerMode;
    await runner.toggleWorker(enable);
    workerBtn.classList.toggle("active", runner.workerMode);
    workerBtn.title = runner.workerMode ? "Worker ON — click to disable" : "Toggle Web Worker physics";
  });
}

function updateWorkerBtnVisibility() {
  if (!workerBtn) return;
  const demo = runner.currentDemo;
  workerBtn.style.display = demo?.workerCompatible ? "" : "none";
  workerBtn.classList.remove("active");
}

// =========================================================================
// Tabs
// =========================================================================

let currentDemoId = null;

function buildTabs() {
  const nav = document.getElementById("demoTabs");
  for (const demo of FEATURED) {
    const btn = document.createElement("button");
    btn.className = "tab tab-cat-" + categoryOf(demo);
    btn.dataset.demo = demo.id;
    const cat = categoryOf(demo);
    const dot = document.createElement("span");
    dot.className = "tab-cat-dot tab-cat-dot-" + cat;
    dot.title = cat === "game" ? "Game example" : "Physics example";
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(demoLabel(demo)));
    btn.dataset.demoLabel = "1";
    nav.insertBefore(btn, nav.querySelector(".tab-more"));
  }
}

// Re-localize the featured tab labels and the active demo description
// when the language changes.
document.addEventListener("nape:langchange", () => {
  for (const btn of document.querySelectorAll('.tab[data-demo-label="1"]')) {
    const demo = FEATURED.find((d) => d.id === btn.dataset.demo);
    if (!demo) continue;
    const dot = btn.querySelector(".tab-cat-dot");
    btn.textContent = "";
    if (dot) btn.appendChild(dot);
    btn.appendChild(document.createTextNode(demoLabel(demo)));
  }
  if (currentDemoId) {
    const demo = FEATURED.find((d) => d.id === currentDemoId);
    if (demo) demoDescEl.innerHTML = demoDesc(demo);
  }
});

async function startDemo(id) {
  const demo = FEATURED.find(d => d.id === id) ?? FEATURED[0];
  currentDemoId = demo.id;

  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.demo === demo.id);
  });

  demoDescEl.innerHTML = demoDesc(demo);
  await runner.loadAsync(demo);
  runner.start();
  updateCodePreview();
  updateWorkerBtnVisibility();
  codepenBtn.style.display = demo.noCodePen ? "none" : "";
  stackblitzBtn.style.display = demo.noCodePen ? "none" : "";
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
  const btn = e.target.closest(".card-render-btn");
  if (!btn) return;
  const mode = btn.dataset.mode;

  // Map UI mode labels to adapter IDs
  const modeMap = { "2d": "canvas2d", "3d": "threejs", "pixi": "pixijs" };
  const adapterId = modeMap[mode] ?? mode;
  if (adapterId === runner.mode) return;

  gtag("event", "click", { event_category: "render_mode", event_label: mode });

  // Lazy-register adapters on first use
  if (adapterId === "threejs" && !threeAdapterRegistered) {
    await loadThree();
    runner.registerAdapter(new ThreeJSAdapter());
    threeAdapterRegistered = true;
  }
  if (adapterId === "pixijs" && !pixiAdapterRegistered) {
    await loadPixi();
    runner.registerAdapter(new PixiJSAdapter());
    pixiAdapterRegistered = true;
  }

  document.querySelectorAll(".card-render-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  await runner.setMode(adapterId);
  updateCodePreview();
});

// =========================================================================
// Code preview
// =========================================================================

async function getActiveCode() {
  const demo = runner.currentDemo;
  if (!demo) return "// No demo loaded.";
  return getPreviewCode(demo, runner.mode, { showOutlines: runner.debugDraw });
}

async function updateCodePreview() {
  const source = await getActiveCode();
  const escaped = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  codeBodyEl.innerHTML = `<pre class="line-numbers"><code class="language-javascript">${escaped}</code></pre>`;
  Prism.highlightAllUnder(codeBodyEl);
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

copyCodeBtn.addEventListener("click", async () => {
  gtag("event", "click", { event_category: "code_action", event_label: "copy_code", demo: currentDemoId });
  const code = await getActiveCode();
  navigator.clipboard.writeText(code).then(() => showToast(i18n("code.copiedToast", "Copied to clipboard!")));
});

codepenBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_codepen", demo: currentDemoId });
  const demo = runner.currentDemo;
  if (demo && !demo.noCodePen) _openInCodePen(demo, runner.mode, { showOutlines: runner.debugDraw });
});

stackblitzBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_stackblitz", demo: currentDemoId });
  const demo = runner.currentDemo;
  if (demo && !demo.noCodePen) _openInStackBlitz(demo, runner.mode, { showOutlines: runner.debugDraw });
});


// =========================================================================
// Benchmarks
// =========================================================================

function runBenchmarkSuite() {
  const resultsEl = document.getElementById("benchResults");
  resultsEl.innerHTML = `<p class="bench-running">${i18n("bench.running", "Running benchmarks…")}</p>`;

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
