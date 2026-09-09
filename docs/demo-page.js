/**
 * nape-js docs — runtime for the generated per-demo pages (/examples/<id>/).
 *
 * The page HTML is produced by scripts/build-site-pages.mjs and carries the
 * demo id on <body data-demo-id>. This module loads just that one demo module
 * (dynamic import, so a page costs one demo, not the whole registry), runs it
 * in the full-width canvas with the same controls as the home page (2D / 3D /
 * PixiJS, outlines, profiler, worker, reset, fullscreen) and fills the code
 * panel with CodePen / StackBlitz export.
 *
 * URL options: ?mode=3d|pixi  ?outline=0
 */
import { VERSION } from "./nape-js.esm.js?v=3.42.1";
import { installErrorOverlay } from "./renderer.js?v=3.42.1";
import { DemoRunner } from "./demo-runner.js?v=3.42.1";
import { Canvas2DAdapter } from "./renderers/canvas2d-adapter.js?v=3.42.1";
import { ThreeJSAdapter, loadThree } from "./renderers/threejs-adapter.js?v=3.42.1";
import { PixiJSAdapter, loadPixi } from "./renderers/pixijs-adapter.js?v=3.42.1";
import { openInCodePen, getPreviewCode } from "./codepen-templates.js?v=3.42.1";
import { openInStackBlitz } from "./stackblitz-templates.js?v=3.42.1";
import { t as i18n } from "./i18n/i18n.js?v=3.42.1";

const gtag = window.gtag || function () {};

// The demo module must be imported through the SAME ?v= stamp as this file,
// or the browser loads a second engine instance (see stamp-docs.mjs). The
// stamp is read off our own URL so it also works unstamped in local dev.
const ownVersion = new URL(import.meta.url).searchParams.get("v");
const stamped = (path) => (ownVersion ? `${path}?v=${ownVersion}` : path);

const demoId = document.body.dataset.demoId;
const canvasWrap = document.getElementById("canvasWrap");
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("demoCanvas"));
const overlay = document.getElementById("canvasOverlay");
const codeBodyEl = document.getElementById("codeBody");
const codepenBtn = document.getElementById("codepenBtn");
const stackblitzBtn = document.getElementById("stackblitzBtn");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const codeToggleBtn = document.getElementById("codeToggleBtn");
const codePanel = document.getElementById("codePanel");

installErrorOverlay(VERSION);

const runner = new DemoRunner(canvasWrap, { W: canvas.width, H: canvas.height });
runner.registerAdapter(new Canvas2DAdapter({ canvas }));
let threeRegistered = false;
let pixiRegistered = false;

runner.wireStats({
  fps: document.getElementById("fpsLabel"),
  bodies: document.getElementById("bodyCount"),
  step: document.getElementById("stepTime"),
});
runner.wireInteraction(canvasWrap);
runner.debugDraw = true;

let demo = null;
let codeDirty = true;

async function updateCodePreview() {
  if (!demo || codePanel.hidden) { codeDirty = true; return; }
  const source = await getPreviewCode(demo, runner.mode, { showOutlines: runner.debugDraw });
  const escaped = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  codeBodyEl.innerHTML = `<pre class="line-numbers"><code class="language-javascript">${escaped}</code></pre>`;
  if (typeof Prism !== "undefined") Prism.highlightAllUnder(codeBodyEl);
  codeDirty = false;
}

// --- Render mode -----------------------------------------------------------

const MODE_MAP = { "2d": "canvas2d", "3d": "threejs", pixi: "pixijs" };

async function setMode(mode) {
  const adapterId = MODE_MAP[mode] ?? mode;
  if (adapterId === "threejs" && !threeRegistered) {
    await loadThree();
    runner.registerAdapter(new ThreeJSAdapter());
    threeRegistered = true;
  }
  if (adapterId === "pixijs" && !pixiRegistered) {
    await loadPixi();
    runner.registerAdapter(new PixiJSAdapter());
    pixiRegistered = true;
  }
  document.querySelectorAll(".card-render-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  if (adapterId !== runner.mode) await runner.setMode(adapterId);
  updateCodePreview();
}

document.getElementById("renderModeToggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".card-render-btn");
  if (!btn) return;
  gtag("event", "click", { event_category: "render_mode", event_label: btn.dataset.mode, demo: demoId });
  setMode(btn.dataset.mode);
});

// --- Canvas controls -------------------------------------------------------

const outlineBtn = document.getElementById("outlineBtn");
outlineBtn.addEventListener("click", () => {
  runner.debugDraw = !runner.debugDraw;
  outlineBtn.classList.toggle("active", runner.debugDraw);
  updateCodePreview();
});

const profilerBtn = document.getElementById("profilerBtn");
profilerBtn.addEventListener("click", () => {
  runner.showProfiler = !runner.showProfiler;
  profilerBtn.classList.toggle("active", runner.showProfiler);
});

const workerBtn = document.getElementById("workerBtn");
workerBtn.addEventListener("click", async () => {
  const enable = !runner.workerMode;
  await runner.toggleWorker(enable);
  workerBtn.classList.toggle("active", runner.workerMode);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  gtag("event", "click", { event_category: "demo_action", event_label: "reset", demo: demoId });
  startDemo();
});

// Fullscreen: native API where available, CSS pseudo-fullscreen on iPhone.
const fsBtn = document.getElementById("fsBtn");
const supportsFullscreen =
  typeof document.documentElement.requestFullscreen === "function" &&
  typeof document.exitFullscreen === "function";
let pseudoFs = false;
function setPseudoFs(on) {
  pseudoFs = on;
  canvasWrap.classList.toggle("native-fs", on);
  canvasWrap.classList.toggle("pseudo-fs", on);
  document.body.classList.toggle("has-pseudo-fs", on);
  document.body.style.overflow = on ? "hidden" : "";
}
fsBtn.addEventListener("click", async () => {
  gtag("event", "click", { event_category: "demo_action", event_label: "fullscreen", demo: demoId });
  if (supportsFullscreen) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvasWrap.classList.add("native-fs");
      try {
        await canvasWrap.requestFullscreen();
      } catch {
        canvasWrap.classList.remove("native-fs");
        setPseudoFs(true);
      }
    }
  } else {
    setPseudoFs(!pseudoFs);
  }
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) canvasWrap.classList.remove("native-fs");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pseudoFs) setPseudoFs(false);
});

// --- Code panel ------------------------------------------------------------

codeToggleBtn.addEventListener("click", () => {
  codePanel.hidden = !codePanel.hidden;
  codeToggleBtn.setAttribute("aria-expanded", String(!codePanel.hidden));
  if (!codePanel.hidden) {
    gtag("event", "click", { event_category: "code_action", event_label: "view_code", demo: demoId });
    if (codeDirty) updateCodePreview();
  }
});

copyCodeBtn.addEventListener("click", async () => {
  gtag("event", "click", { event_category: "code_action", event_label: "copy_code", demo: demoId });
  const code = await getPreviewCode(demo, runner.mode, { showOutlines: runner.debugDraw });
  await navigator.clipboard.writeText(code);
  const prev = copyCodeBtn.textContent;
  copyCodeBtn.textContent = i18n("code.copiedToast", "Copied to clipboard!");
  setTimeout(() => { copyCodeBtn.textContent = prev; }, 1800);
});

codepenBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_codepen", demo: demoId });
  if (demo && !demo.noCodePen) openInCodePen(demo, runner.mode, { showOutlines: runner.debugDraw });
});

stackblitzBtn.addEventListener("click", () => {
  gtag("event", "click", { event_category: "code_action", event_label: "open_stackblitz", demo: demoId });
  if (demo && !demo.noCodePen) openInStackBlitz(demo, runner.mode, { showOutlines: runner.debugDraw });
});

// --- Boot ------------------------------------------------------------------

async function startDemo() {
  await runner.loadAsync(demo);
  runner.start();
  codeDirty = true;
  updateCodePreview();
}

(async () => {
  try {
    const mod = await import(stamped(`./demos/${demoId}.js`));
    demo = mod.default;
  } catch (err) {
    overlay.textContent = `Failed to load demo "${demoId}": ${err?.message ?? err}`;
    console.error(err);
    return;
  }

  workerBtn.style.display = demo.workerCompatible ? "" : "none";
  if (demo.canvas2dOnly) {
    document.querySelectorAll('.card-render-btn[data-mode="3d"], .card-render-btn[data-mode="pixi"]')
      .forEach((b) => { b.style.display = "none"; });
  }
  if (demo.noCodePen) {
    codepenBtn.style.display = "none";
    stackblitzBtn.style.display = "none";
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("outline") === "0") {
    runner.debugDraw = false;
    outlineBtn.classList.remove("active");
  }

  overlay.classList.add("hidden");
  await startDemo();

  const mode = params.get("mode");
  if ((mode === "3d" || mode === "pixi") && !demo.canvas2dOnly) await setMode(mode);
})();
