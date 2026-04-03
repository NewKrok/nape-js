/**
 * nape-js Demo Page — interactive demos + live benchmarks + code preview + CodePen export
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon, VERSION,
} from "./nape-js.esm.js?v=3.23.0";
import { installErrorOverlay } from "./renderer.js?v=3.23.0";
import { DemoRunner } from "./demo-runner.js?v=3.23.0";
import { Canvas2DAdapter } from "./renderers/canvas2d-adapter.js?v=3.23.0";
import { ThreeJSAdapter, loadThree } from "./renderers/threejs-adapter.js?v=3.23.0";
import { PixiJSAdapter, loadPixi } from "./renderers/pixijs-adapter.js?v=3.23.0";
import { openInCodePen as _openInCodePen, getPreviewCode } from "./codepen-templates.js?v=3.23.0";

// Demo definitions — one file each
import falling     from "./demos/falling.js?v=3.23.0";
import pyramid     from "./demos/pyramid.js?v=3.23.0";
import chain       from "./demos/chain.js?v=3.23.0";
import explosion   from "./demos/explosion.js?v=3.23.0";
import constraints from "./demos/constraints.js?v=3.23.0";
import gravity     from "./demos/gravity.js?v=3.23.0";
import stacking    from "./demos/stacking.js?v=3.23.0";
import ragdoll     from "./demos/ragdoll.js?v=3.23.0";
import strandbeast from "./demos/strandbeast.js?v=3.23.0";
import softBody    from "./demos/soft-body.js?v=3.23.0";

// =========================================================================
// Demo registry
// =========================================================================

const ALL_DEMOS = [
  falling, pyramid, chain, explosion, constraints,
  gravity, stacking, ragdoll, strandbeast, softBody,
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
  updateWorkerBtnVisibility();
  codepenBtn.style.display = demo.noCodePen ? "none" : "";
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

function getActiveCode() {
  const demo = runner.currentDemo;
  if (!demo) return "// No demo loaded.";
  return getPreviewCode(demo, runner.mode);
}

function updateCodePreview() {
  const source = getActiveCode();
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

copyCodeBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "copy_code", demo: currentDemoId });
  navigator.clipboard.writeText(getActiveCode()).then(() => showToast("Copied to clipboard!"));
});

codepenBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_codepen", demo: currentDemoId });
  const demo = runner.currentDemo;
  if (demo && !demo.noCodePen) _openInCodePen(demo, runner.mode);
});


// =========================================================================
// Benchmarks
// =========================================================================

function runBenchmarkSuite() {
  const resultsEl = document.getElementById("benchResults");
  resultsEl.innerHTML = '<p class="bench-running">Running benchmarks&hellip;</p>';

  setTimeout(async () => {
    const cpuResults = [];
    const gpuResults = [];

    function benchStepCPU(label, bodyCount, iterations) {
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
      for (let i = 0; i < 5; i++) try { sp.step(1/60, 8, 3); } catch(_) {}
      const times = [];
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        try { sp.step(1/60, 8, 3); } catch(_) {}
        times.push(performance.now() - t0);
      }
      const sorted = [...times].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      cpuResults.push({ label, bodyCount, med, avg, min: sorted[0], max: sorted[sorted.length - 1] });
    }

    async function benchStepGPU(label, bodyCount, iterations) {
      const sp = new Space(new Vec2(0, 600));
      const hasGPU = await sp.initGPU();
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
      for (let i = 0; i < 5; i++) try { await sp.stepGPU(1/60, 8, 3); } catch(_) {}
      const times = [];
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        try { await sp.stepGPU(1/60, 8, 3); } catch(_) {}
        times.push(performance.now() - t0);
      }
      const sorted = [...times].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      gpuResults.push({ label, bodyCount, med, avg, min: sorted[0], max: sorted[sorted.length - 1], hasGPU });
    }

    // Run CPU benchmarks
    benchStepCPU("100 bodies",   100, 200);
    benchStepCPU("200 bodies",   200, 150);
    benchStepCPU("500 bodies",   500, 100);
    benchStepCPU("1 000 bodies", 1000, 50);
    benchStepCPU("2 000 bodies", 2000, 30);
    benchStepCPU("5 000 bodies", 5000, 15);
    benchStepCPU("10 000 bodies", 10000, 10);

    // Run GPU benchmarks
    await benchStepGPU("100 bodies",   100, 200);
    await benchStepGPU("200 bodies",   200, 150);
    await benchStepGPU("500 bodies",   500, 100);
    await benchStepGPU("1 000 bodies", 1000, 50);
    await benchStepGPU("2 000 bodies", 2000, 30);
    await benchStepGPU("5 000 bodies", 5000, 15);
    await benchStepGPU("10 000 bodies", 10000, 10);

    const allResults = [...cpuResults, ...gpuResults];
    const maxAvg = Math.max(...allResults.map(r => r.avg));
    let html = `<div class="bench-table-wrap"><table class="bench-table">
      <thead><tr><th>Scenario</th><th>Solver</th><th>Median</th><th>Average</th><th>Min</th><th>Max</th><th class="bench-bar-col"></th></tr></thead>
      <tbody>`;
    for (let i = 0; i < cpuResults.length; i++) {
      const c = cpuResults[i];
      const g = gpuResults[i];
      const cBarWidth = Math.max(4, (c.avg / maxAvg) * 100);
      const gBarWidth = Math.max(4, (g.avg / maxAvg) * 100);
      html += `<tr><td rowspan="2">${c.label}</td><td style="color:#58a6ff">CPU</td><td>${formatMs(c.med)}</td><td>${formatMs(c.avg)}</td><td>${formatMs(c.min)}</td><td>${formatMs(c.max)}</td>
        <td class="bench-bar-col"><div class="bench-bar" style="width:${cBarWidth}px;background:#58a6ff"></div></td></tr>`;
      html += `<tr><td style="color:#a371f7">GPU</td><td>${formatMs(g.med)}</td><td>${formatMs(g.avg)}</td><td>${formatMs(g.min)}</td><td>${formatMs(g.max)}</td>
        <td class="bench-bar-col"><div class="bench-bar" style="width:${gBarWidth}px;background:#a371f7"></div></td></tr>`;
    }
    const gpuNote = gpuResults[0]?.hasGPU
      ? "WebGPU active — GPU compute shaders enabled."
      : "WebGPU not available — GPU path uses CPU SoA fallback.";
    html += `</tbody></table></div>
      <p style="margin-top:12px;color:var(--text-dim);font-size:0.82rem">
        Measured with <code>step()</code> / <code>stepGPU()</code> at 1/60s, 8 vel, 3 pos iterations.
        Mixed circle/box shapes. ${gpuNote}
        <br><a href="benchmark.html" style="color:var(--accent)">Full engine comparison benchmarks &rarr;</a>
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
