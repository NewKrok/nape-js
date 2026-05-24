/**
 * nape-js Examples Page — grid of interactive physics demos with play overlay,
 * per-card stats, search/tag filtering, size toggle, outline toggle, and View Code.
 */
import { VERSION } from "./nape-js.esm.js?v=3.35.0";
import { installErrorOverlay } from "./renderer.js?v=3.35.0";
import { DemoRunner } from "./demo-runner.js?v=3.35.0";
import { Canvas2DAdapter } from "./renderers/canvas2d-adapter.js?v=3.35.0";
import { ThreeJSAdapter, loadThree } from "./renderers/threejs-adapter.js?v=3.35.0";
import { PixiJSAdapter, loadPixi } from "./renderers/pixijs-adapter.js?v=3.35.0";
import { openInCodePen as _openInCodePen, getPreviewCode } from "./codepen-templates.js?v=3.35.0";
import { openInStackBlitz as _openInStackBlitz } from "./stackblitz-templates.js?v=3.35.0";
import { CATEGORIES, categoryOf } from "./demo-categories.js?v=3.35.0";

// All demos
import falling     from "./demos/falling.js?v=3.35.0";
import pyramid     from "./demos/pyramid.js?v=3.35.0";
import chain       from "./demos/chain.js?v=3.35.0";
import explosion   from "./demos/explosion.js?v=3.35.0";
import constraints from "./demos/constraints.js?v=3.35.0";
import gravity     from "./demos/gravity.js?v=3.35.0";
import stacking    from "./demos/stacking.js?v=3.35.0";
import ragdoll     from "./demos/ragdoll.js?v=3.35.0";
import strandbeast from "./demos/strandbeast.js?v=3.35.0";
import carSideview    from "./demos/car-sideview.js?v=3.35.0";
import trackedVehicle from "./demos/tracked-vehicle.js?v=3.35.0";
import carTopdown     from "./demos/car-topdown.js?v=3.35.0";
import ropeBridge     from "./demos/rope-bridge.js?v=3.35.0";
import wreckingBall   from "./demos/wrecking-ball.js?v=3.35.0";
import newtonsCradle  from "./demos/newtons-cradle.js?v=3.35.0";
import dominos        from "./demos/dominos.js?v=3.35.0";
import conveyorBelts  from "./demos/conveyor-belts.js?v=3.35.0";
import trebuchet      from "./demos/trebuchet.js?v=3.35.0";
import seesaw         from "./demos/seesaw.js?v=3.35.0";
import pinball        from "./demos/pinball.js?v=3.35.0";
import cloth          from "./demos/cloth.js?v=3.35.0";
import funnel         from "./demos/funnel.js?v=3.35.0";
import softBody       from "./demos/soft-body.js?v=3.35.0";
import oneWayPlatforms from "./demos/one-way-platforms.js?v=3.35.0";
import filteringInteractions from "./demos/filtering-interactions.js?v=3.35.0";
import bodyFromGraphic    from "./demos/body-from-graphic.js?v=3.35.0";
import dropImageBody     from "./demos/drop-image-body.js?v=3.35.0";
import capsule           from "./demos/capsule.js?v=3.35.0";
import destructibleTerrain from "./demos/destructible-terrain.js?v=3.35.0";
import webWorker           from "./demos/web-worker.js?v=3.35.0";
import asteroidField       from "./demos/asteroid-field.js?v=3.35.0";
import fluidBuoyancy       from "./demos/fluid-buoyancy.js?v=3.35.0";
import deterministic       from "./demos/deterministic.js?v=3.35.0";
import subStepping         from "./demos/sub-stepping.js?v=3.35.0";
import characterController from "./demos/character-controller.js?v=3.35.0";
import triggerZones        from "./demos/trigger-zones.js?v=3.35.0";
import fracture            from "./demos/fracture.js?v=3.35.0";
import slingshot           from "./demos/slingshot.js?v=3.35.0";
import springJoint         from "./demos/spring-joint.js?v=3.35.0";
import portals             from "./demos/portals.js?v=3.35.0";
import towerDefense        from "./demos/tower-defense.js?v=3.35.0";
import topDownShooter      from "./demos/top-down-shooter.js?v=3.35.0";
import mobaLite            from "./demos/moba-lite.js?v=3.35.0";
import plinko              from "./demos/plinko.js?v=3.35.0";
import threeBody           from "./demos/three-body.js?v=3.35.0";
import tilemap             from "./demos/tilemap.js?v=3.35.0";
import planetPlatformer    from "./demos/planet-platformer.js?v=3.35.0";
import volcano             from "./demos/volcano.js?v=3.35.0";
import destructibleArena   from "./demos/destructible-arena.js?v=3.35.0";
import arenaDefense        from "./demos/arena-defense.js?v=3.35.0";
import saveLoadRewind      from "./demos/save-load-rewind.js?v=3.35.0";
import replayRecorder      from "./demos/replay-recorder.js?v=3.35.0";
import popcorn             from "./demos/popcorn.js?v=3.35.0";
import rollercoaster       from "./demos/rollercoaster.js?v=3.35.0";
import convexCast          from "./demos/convex-cast.js?v=3.35.0";
import floppyFists         from "./demos/floppy-fists.js?v=3.35.0";
import minigolf             from "./demos/minigolf.js?v=3.35.0";
import wyrm                 from "./demos/wyrm.js?v=3.35.0";
import brickline            from "./demos/brickline.js?v=3.35.0";
import pulleyCrane          from "./demos/pulley-crane.js?v=3.35.0";
import cordfall            from "./demos/cordfall.js?v=3.35.0";

// Note on order: cardEntries reverses ALL_DEMOS, so the LAST tuple entry
// becomes the TOP card in the grid. New demos go at the end so they take
// the top slot in the grid.
const ALL_DEMOS = [
  falling, pyramid, chain, explosion, constraints, gravity, stacking, ragdoll, strandbeast,
  carSideview, carTopdown, ropeBridge, wreckingBall, newtonsCradle,
  dominos, conveyorBelts, trebuchet, seesaw, pinball, cloth, funnel,
  softBody, oneWayPlatforms, filteringInteractions, bodyFromGraphic, dropImageBody, capsule,
  destructibleTerrain,
  webWorker,
  asteroidField,
  fluidBuoyancy,
  deterministic,
  subStepping,
  characterController,
  triggerZones,
  fracture,
  slingshot,
  springJoint,
  portals,
  trackedVehicle,
  towerDefense,
  topDownShooter,
  mobaLite,
  plinko,
  threeBody,
  tilemap,
  planetPlatformer,
  volcano,
  destructibleArena,
  saveLoadRewind,
  replayRecorder,
  arenaDefense,
  popcorn,
  rollercoaster,
  convexCast,
  floppyFists,
  minigolf,
  wyrm,
  brickline,
  pulleyCrane,
  cordfall,
];

const gtag = window.gtag || function() {};

const CW = 900;
const CH = 500;

// =========================================================================
// CodePen helper — uses shared codepen-templates.js
// =========================================================================

function openInCodePen(demo, adapterId = "canvas2d", opts) {
  _openInCodePen(demo, adapterId, opts);
}

// =========================================================================
// Card factory
// =========================================================================

let activeCardEntry = null;

function stopActiveDemo() {
  if (!activeCardEntry) return;
  const { runner, overlay, statsBar, card } = activeCardEntry;
  runner.stop();
  overlay.hidden = false;
  statsBar.hidden = true;
  card.classList.remove("running");
  activeCardEntry._started = false;
  activeCardEntry = null;
}

function createCard(demo, { onTagClick } = {}) {
  const card = document.createElement("div");
  card.className = "example-card";

  const renderWrap = document.createElement("div");
  renderWrap.className = "example-card-canvas";
  renderWrap.style.position = "relative";
  card.appendChild(renderWrap);

  // --- DemoRunner with adapters ---
  const runner = new DemoRunner(renderWrap, { W: CW, H: CH });
  runner.registerAdapter(new Canvas2DAdapter());
  // ThreeJS/PixiJS adapters are registered lazily on first use
  let threeRegistered = false;
  let pixiRegistered = false;

  const overlay = document.createElement("div");
  overlay.className = "play-overlay";
  overlay.innerHTML = `<div class="play-btn" aria-label="Play"></div>`;
  renderWrap.appendChild(overlay);

  const statsBar = document.createElement("div");
  statsBar.className = "card-stats";
  statsBar.hidden = true;
  const fpsEl    = document.createElement("span");
  const bodiesEl = document.createElement("span");
  const stepEl   = document.createElement("span");
  fpsEl.textContent    = "FPS: —";
  bodiesEl.textContent = "Bodies: —";
  stepEl.className = "card-stats-step";
  stepEl.textContent = "Step: —";
  statsBar.append(fpsEl, " · ", bodiesEl, " · ", stepEl);
  card.appendChild(statsBar);

  // --- Canvas overlay controls ---
  const canvasControls = document.createElement("div");
  canvasControls.className = "canvas-controls";

  // 2D/3D render mode toggle
  const renderToggle = document.createElement("div");
  renderToggle.className = "card-render-toggle";
  const btn2d = document.createElement("button");
  btn2d.className = "card-render-btn active";
  btn2d.dataset.mode = "2d";
  btn2d.textContent = "2D";
  const btn3d = document.createElement("button");
  btn3d.className = "card-render-btn";
  btn3d.dataset.mode = "3d";
  btn3d.textContent = "3D";
  const btnPixi = document.createElement("button");
  btnPixi.className = "card-render-btn";
  btnPixi.dataset.mode = "pixi";
  btnPixi.textContent = "PixiJS";
  renderToggle.append(btn2d, btn3d, btnPixi);
  if (demo.canvas2dOnly) {
    btn3d.style.display = "none";
    btnPixi.style.display = "none";
  }

  let cardMode = "2d";
  const modeMap = { "2d": "canvas2d", "3d": "threejs", "pixi": "pixijs" };

  renderToggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    const btn = e.target.closest(".card-render-btn");
    if (!btn || btn.dataset.mode === cardMode) return;
    const mode = btn.dataset.mode;
    const adapterId = modeMap[mode] ?? mode;

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

    cardMode = mode;
    btn2d.classList.toggle("active", mode === "2d");
    btn3d.classList.toggle("active", mode === "3d");
    btnPixi.classList.toggle("active", mode === "pixi");
    gtag("event", "click", { event_category: "render_mode", event_label: mode, demo: demo.id });
    await runner.setMode(adapterId);
    updateUrlForCard(demo.id, { mode: cardMode, outline: runner.debugDraw });
    // Refresh code preview if panel is open
    if (!codePanel.hidden) updateCodePreview();
  });

  // Outline toggle
  const outlineToggleBtn = document.createElement("button");
  outlineToggleBtn.className = "canvas-outline-btn active";
  outlineToggleBtn.title = "Toggle outlines";
  outlineToggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2"/>
    <circle cx="8" cy="8" r="3"/>
  </svg>`;
  outlineToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    runner.debugDraw = !runner.debugDraw;
    outlineToggleBtn.classList.toggle("active", runner.debugDraw);
    updateUrlForCard(demo.id, { mode: cardMode, outline: runner.debugDraw });
    renderedMode = null; // force code preview refresh
    if (!codePanel.hidden) updateCodePreview();
  });

  // Profiler toggle
  const profilerBtn = document.createElement("button");
  profilerBtn.className = "canvas-fs-btn canvas-profiler-btn";
  profilerBtn.title = "Toggle profiler overlay";
  profilerBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1,12 4,5 7,9 10,2 14,7"/>
    <line x1="1" y1="14" x2="14" y2="14"/>
  </svg>`;
  profilerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    runner.showProfiler = !runner.showProfiler;
    profilerBtn.classList.toggle("active", runner.showProfiler);
  });

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "canvas-fs-btn canvas-reset-btn";
  resetBtn.title = "Reset demo";
  resetBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3"/>
    <polyline points="2.5,3.5 2.5,8 7,8"/>
  </svg>`;
  resetBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    runner.stop();
    started = false;
    cardRef._started = false;
    await runner.renderPreviewAsync(demo);
    previewReady = true;
    await startDemo();
  });

  // Fullscreen button
  const fsBtn = document.createElement("button");
  fsBtn.className = "canvas-fs-btn";
  fsBtn.title = "Fullscreen";
  fsBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1,5 1,1 5,1"/><polyline points="15,5 15,1 11,1"/>
    <polyline points="1,11 1,15 5,15"/><polyline points="15,11 15,15 11,15"/>
  </svg>`;
  const ICON_EXPAND   = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 1,1 5,1"/><polyline points="15,5 15,1 11,1"/><polyline points="1,11 1,15 5,15"/><polyline points="15,11 15,15 11,15"/></svg>`;
  const ICON_COLLAPSE = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,1 1,1 1,5"/><polyline points="11,1 15,1 15,5"/><polyline points="1,11 1,15 5,15"/><polyline points="15,11 15,15 11,15"/></svg>`;

  let isExpanded = false;

  function setExpanded(expand) {
    isExpanded = expand;
    card.classList.toggle("expanded", expand);
    document.body.classList.toggle("has-expanded-demo", expand);
    fsBtn.title = expand ? "Exit fullscreen" : "Fullscreen";
    fsBtn.innerHTML = expand ? ICON_COLLAPSE : ICON_EXPAND;
    document.body.style.overflow = expand ? "hidden" : "";
    // Clear any inline height left by renderer switching so the card
    // falls back to the CSS aspect-ratio sizing when collapsed.
    if (!expand) renderWrap.style.height = "";
    if (expand) {
      updateUrlForCard(demo.id, { mode: cardMode, outline: runner.debugDraw });
    } else {
      updateUrlForCard(null);
    }
  }

  fsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const expand = !isExpanded;
    gtag("event", "click", { event_category: "demo_action", event_label: expand ? "fullscreen" : "exit_fullscreen", demo: demo.id });
    setExpanded(expand);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isExpanded) setExpanded(false);
  });

  // Native browser fullscreen — the canvas only, no UI chrome
  const nativeFsBtn = document.createElement("button");
  nativeFsBtn.className = "canvas-fs-btn";
  nativeFsBtn.title = "Native fullscreen (canvas only)";
  nativeFsBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="12" height="10" rx="1"/>
    <polyline points="6,7 8,5 10,7"/><polyline points="6,11 8,9 10,11" transform="rotate(180 8 10)"/>
  </svg>`;
  const supportsFullscreenAPI =
    typeof document.documentElement.requestFullscreen === "function" &&
    typeof document.exitFullscreen === "function";

  let pseudoFs = false;
  function setPseudoFs(on) {
    pseudoFs = on;
    renderWrap.classList.toggle("native-fs", on);
    renderWrap.classList.toggle("pseudo-fs", on);
    document.body.classList.toggle("has-pseudo-fs", on);
    document.body.style.overflow = on ? "hidden" : "";
    if (on) {
      // Nudge Safari to minimize the address bar
      setTimeout(() => window.scrollTo(0, 1), 50);
    }
  }

  nativeFsBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (supportsFullscreenAPI) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        renderWrap.classList.add("native-fs");
        try {
          await renderWrap.requestFullscreen();
        } catch (_) {
          // API exists but rejected (e.g. iPadOS quirks) → fall back to pseudo
          renderWrap.classList.remove("native-fs");
          setPseudoFs(true);
        }
      }
    } else {
      // iPhone Safari: no Fullscreen API for non-video elements
      setPseudoFs(!pseudoFs);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) renderWrap.classList.remove("native-fs");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pseudoFs) setPseudoFs(false);
  });

  // Worker toggle button (only for workerCompatible demos)
  const workerBtn = document.createElement("button");
  workerBtn.className = "canvas-fs-btn canvas-worker-btn";
  workerBtn.title = "Toggle Web Worker physics";
  workerBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 4v4l3 2"/>
  </svg>`;
  workerBtn.style.display = demo.workerCompatible ? "" : "none";
  workerBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const enable = !runner.workerMode;
    await runner.toggleWorker(enable);
    workerBtn.classList.toggle("active", runner.workerMode);
    workerBtn.title = runner.workerMode ? "Worker ON — click to disable" : "Toggle Web Worker physics";
  });

  canvasControls.append(renderToggle, outlineToggleBtn, profilerBtn, workerBtn, resetBtn, fsBtn, nativeFsBtn);
  renderWrap.appendChild(canvasControls);

  runner.wireStats({ fps: fpsEl, step: stepEl, bodies: bodiesEl });
  runner.wireInteraction(renderWrap);

  // --- Info section ---
  const info = document.createElement("div");
  info.className = "example-card-info";

  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";
  const h3 = document.createElement("h3");

  const catId = categoryOf(demo);
  const catBadge = document.createElement("span");
  catBadge.className = "card-category-badge category-pill-" + catId;
  catBadge.textContent = catId === "game" ? "Game" : "Physics";
  catBadge.title = "Filter to " + (catId === "game" ? "Game" : "Physics") + " demos";
  catBadge.addEventListener("click", (e) => {
    e.stopPropagation();
    setActiveCategory(activeCategory === catId ? null : catId);
  });
  h3.appendChild(catBadge);
  h3.appendChild(document.createTextNode(demo.label));

  const btnGroup = document.createElement("div");
  btnGroup.className = "card-btn-group";

  const codeToggle = document.createElement("button");
  codeToggle.className = "btn btn-small code-toggle-btn";
  codeToggle.textContent = "{ } Code";

  const codePanel = document.createElement("pre");
  codePanel.className = "card-code-panel";
  codePanel.hidden = true;

  let renderedMode = null;
  async function updateCodePreview() {
    const adapterId = modeMap[cardMode] ?? "canvas2d";
    if (renderedMode === adapterId) return;
    renderedMode = adapterId;
    const source = await getPreviewCode(demo, adapterId, { showOutlines: runner.debugDraw });
    const escaped = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    codePanel.innerHTML = `<pre class="line-numbers"><code class="language-javascript">${escaped}</code></pre>`;
    if (typeof Prism !== "undefined") Prism.highlightAllUnder(codePanel);
  }
  codeToggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    codePanel.hidden = !codePanel.hidden;
    if (!codePanel.hidden) {
      gtag("event", "click", { event_category: "code_action", event_label: "view_code", demo: demo.id });
      updateCodePreview();
    }
  });

  btnGroup.appendChild(codeToggle);

  if (!demo.noCodePen) {
    const codepenBtn = document.createElement("button");
    codepenBtn.className = "btn btn-small btn-icon btn-codepen";
    codepenBtn.title = "Open in CodePen";
    codepenBtn.setAttribute("aria-label", "Open in CodePen");
    codepenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
      <line x1="12" y1="22" x2="12" y2="15.5"/>
      <polyline points="22 8.5 12 15.5 2 8.5"/>
      <polyline points="2 15.5 12 8.5 22 15.5"/>
      <line x1="12" y1="2" x2="12" y2="8.5"/>
    </svg>`;
    codepenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      gtag("event", "click", { event_category: "code_action", event_label: "open_codepen", demo: demo.id });
      openInCodePen(demo, modeMap[cardMode] ?? "canvas2d", { showOutlines: runner.debugDraw });
    });
    btnGroup.appendChild(codepenBtn);

    const stackblitzBtn = document.createElement("button");
    stackblitzBtn.className = "btn btn-small btn-icon btn-stackblitz";
    stackblitzBtn.title = "Open in StackBlitz (real npm install)";
    stackblitzBtn.setAttribute("aria-label", "Open in StackBlitz");
    stackblitzBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.797 14.182H3.635L16.728 0l-3.525 9.818h7.162L7.272 24l3.525-9.818z"/>
    </svg>`;
    stackblitzBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      gtag("event", "click", { event_category: "code_action", event_label: "open_stackblitz", demo: demo.id });
      _openInStackBlitz(demo, modeMap[cardMode] ?? "canvas2d", { showOutlines: runner.debugDraw });
    });
    btnGroup.appendChild(stackblitzBtn);
  }

  const shareBtn = document.createElement("button");
  shareBtn.className = "btn btn-small btn-share";
  shareBtn.title = "Copy link to this demo";
  shareBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13" cy="2.5" r="1.5"/><circle cx="13" cy="13.5" r="1.5"/><circle cx="3" cy="8" r="1.5"/>
    <line x1="11.5" y1="3.3" x2="4.4" y2="7.2"/><line x1="4.4" y1="8.8" x2="11.5" y2="12.7"/>
  </svg>`;
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    gtag("event", "click", { event_category: "demo_action", event_label: "share", demo: demo.id });
    const params = new URLSearchParams();
    params.set("open", demo.id);
    if (cardMode === "3d") params.set("mode", "3d");
    if (!runner.debugDraw) params.set("outline", "0");
    const url = window.location.origin + "/examples?" + params.toString();
    navigator.clipboard.writeText(url).then(() => {
      const prev = shareBtn.innerHTML;
      shareBtn.textContent = "Copied!";
      shareBtn.classList.add("btn-share-copied");
      setTimeout(() => {
        shareBtn.innerHTML = prev;
        shareBtn.classList.remove("btn-share-copied");
      }, 1800);
    });
  });
  btnGroup.appendChild(shareBtn);

  titleRow.append(h3, btnGroup);
  info.appendChild(titleRow);

  const p = document.createElement("p");
  p.innerHTML = demo.desc ?? "";
  info.appendChild(p);

  if (demo.tags?.length) {
    const tagWrap = document.createElement("div");
    for (const t of demo.tags) {
      const span = document.createElement("span");
      span.className = "example-tag";
      span.textContent = t;
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        onTagClick?.(t);
      });
      tagWrap.appendChild(span);
    }
    info.appendChild(tagWrap);
  }

  card.appendChild(info);
  card.appendChild(codePanel);

  // --- Preview (lazy: rendered on first viewport approach via IntersectionObserver) ---
  let previewReady = false;
  let previewPromise = null;
  function ensurePreview() {
    if (previewReady || previewPromise) return previewPromise ?? Promise.resolve();
    previewPromise = runner.renderPreviewAsync(demo).then(() => { previewReady = true; });
    return previewPromise;
  }

  // --- Play ---
  let started = false;
  let loading = false;

  const cardRef = { runner, overlay, statsBar, card, _started: false };

  async function startDemo() {
    if (loading) return;
    if (activeCardEntry && activeCardEntry !== cardRef) stopActiveDemo();
    loading = true;
    // Always do a fresh load before starting. ensurePreview() runs one
    // physics step to produce the thumbnail; if we relied on it here the
    // first play would start from a state that's already advanced by 1/60s
    // (visibly different from every subsequent reset, which does its own
    // fresh loadAsync).
    if (!previewReady) await ensurePreview();
    await runner.loadAsync(demo);
    started = true;
    cardRef._started = true;
    loading = false;
    runner.start();
    overlay.hidden = true;
    statsBar.hidden = false;
    card.classList.add("running");
    activeCardEntry = cardRef;
  }

  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
  overlay.addEventListener("click", () => {
    gtag("event", "click", { event_category: "demo_play", event_label: demo.id });
    startDemo();
  });

  return {
    card, runner, overlay, statsBar, cardRef,
    isStarted: () => started,
    startDemo,
    ensurePreview,
    setExpanded,
    setMode: async (mode) => {
      const adapterId = modeMap[mode] ?? mode;
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
      cardMode = mode;
      btn2d.classList.toggle("active", mode === "2d");
      btn3d.classList.toggle("active", mode === "3d");
      btnPixi.classList.toggle("active", mode === "pixi");
      await runner.setMode(adapterId);
      outlineToggleBtn.classList.toggle("active", runner.debugDraw);
    },
    setOutline: (val) => {
      runner.debugDraw = val;
      outlineToggleBtn.classList.toggle("active", val);
    },
  };
}

// =========================================================================
// URL deep-link helpers
// =========================================================================

function updateUrlForCard(demoId, { mode, outline } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (demoId) {
    params.set("open", demoId);
    if (mode && mode !== "2d") params.set("mode", mode);
    else params.delete("mode");
    if (outline === false) params.set("outline", "0");
    else params.delete("outline");
  } else {
    params.delete("open");
    params.delete("mode");
    params.delete("outline");
  }
  // Prefer the bare /examples form (no trailing slash, no .html) for share links.
  let path = window.location.pathname;
  if (/\/examples\/?(?:index\.html)?$/i.test(path)) {
    path = path.replace(/\/index\.html$/i, "/").replace(/\/$/, "") || "/examples";
    if (!/\/examples$/.test(path)) path = "/examples";
  }
  const newUrl = path + (params.toString() ? "?" + params.toString() : "");
  history.replaceState(null, "", newUrl);
}

// =========================================================================
// Build grid + filtering
// =========================================================================

installErrorOverlay(VERSION);

const grid      = document.getElementById("examplesGrid");
const searchEl  = document.getElementById("searchInput");
const tagBar    = document.getElementById("tagFilterBar");
const tagToggle = document.getElementById("tagToggleBtn");
const categoryBar = document.getElementById("categoryFilterBar");
let tagsExpanded = false;

tagToggle.addEventListener("click", () => {
  tagsExpanded = !tagsExpanded;
  tagBar.classList.toggle("collapsed", !tagsExpanded);
  tagBar.classList.toggle("expanded", tagsExpanded);
  tagToggle.textContent = tagsExpanded ? "Tags ▴" : "Tags ▾";
});

const allTags = [...new Set(ALL_DEMOS.flatMap(d => d.tags ?? []))].sort();

let activeTag      = null;
let activeCategory = null;
let searchQuery    = "";

function buildCategoryBar() {
  if (!categoryBar) return;
  categoryBar.innerHTML = "";
  // "All" pill
  const all = document.createElement("button");
  all.className = "category-pill" + (!activeCategory ? " active" : "");
  all.textContent = `All (${ALL_DEMOS.length})`;
  all.addEventListener("click", () => setActiveCategory(null));
  categoryBar.appendChild(all);

  for (const cat of CATEGORIES) {
    const count = ALL_DEMOS.filter(d => categoryOf(d) === cat.id).length;
    const btn = document.createElement("button");
    btn.className = "category-pill category-pill-" + cat.id + (activeCategory === cat.id ? " active" : "");
    btn.textContent = `${cat.label} (${count})`;
    btn.title = cat.desc;
    btn.addEventListener("click", () => setActiveCategory(activeCategory === cat.id ? null : cat.id));
    categoryBar.appendChild(btn);
  }
}

function buildTagBar() {
  tagBar.innerHTML = "";
  for (const tag of allTags) {
    const btn = document.createElement("button");
    btn.className = "filter-tag" + (activeTag === tag ? " active" : "");
    btn.textContent = tag;
    btn.addEventListener("click", () => setActiveTag(activeTag === tag ? null : tag));
    tagBar.appendChild(btn);
  }
  if (activeTag) {
    const clear = document.createElement("button");
    clear.className = "filter-tag filter-tag-clear";
    clear.textContent = "✕ Clear";
    clear.addEventListener("click", () => setActiveTag(null));
    tagBar.appendChild(clear);
  }
}

function setActiveTag(tag) {
  activeTag = tag;
  if (tag) gtag("event", "click", { event_category: "tag_filter", event_label: tag });
  if (tag && !tagsExpanded) {
    tagsExpanded = true;
    tagBar.classList.remove("collapsed");
    tagBar.classList.add("expanded");
    tagToggle.textContent = "Tags ▴";
  }
  buildTagBar();
  applyFilter();
}

function setActiveCategory(cat) {
  activeCategory = cat;
  if (cat) gtag("event", "click", { event_category: "category_filter", event_label: cat });
  buildCategoryBar();
  applyFilter();
}

function applyFilter() {
  const q = searchQuery.toLowerCase().trim();
  let anyVisible = false;
  for (const { card, demo } of cardEntries) {
    const matchesSearch = !q
      || demo.label?.toLowerCase().includes(q)
      || demo.desc?.toLowerCase().includes(q)
      || demo.tags?.some(t => t.toLowerCase().includes(q));
    const matchesTag = !activeTag || demo.tags?.includes(activeTag);
    const matchesCategory = !activeCategory || categoryOf(demo) === activeCategory;
    const visible = matchesSearch && matchesTag && matchesCategory;
    card.style.display = visible ? "" : "none";
    if (visible) anyVisible = true;
  }

  let noResults = grid.querySelector(".no-results");
  if (!anyVisible) {
    if (!noResults) {
      noResults = document.createElement("div");
      noResults.className = "no-results";
      noResults.textContent = "No demos match your search.";
      grid.appendChild(noResults);
    }
    noResults.style.display = "";
  } else if (noResults) {
    noResults.style.display = "none";
  }
}

let searchDebounce;
searchEl.addEventListener("input", () => {
  searchQuery = searchEl.value;
  applyFilter();
  clearTimeout(searchDebounce);
  if (searchQuery.trim()) {
    searchDebounce = setTimeout(() => {
      gtag("event", "search", { event_category: "examples", search_term: searchQuery.trim() });
    }, 800);
  }
});

const cardEntries = [...ALL_DEMOS].reverse().map((demo) => {
  const result = createCard(demo, {
    onTagClick: (tag) => setActiveTag(activeTag === tag ? null : tag),
  });
  grid.appendChild(result.card);
  return { ...result, demo };
});

buildCategoryBar();
buildTagBar();

// =========================================================================
// Deep-link auto-start
// =========================================================================

(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const openId = urlParams.get("open");
  if (!openId) return;

  const entry = cardEntries.find(e => e.demo.id === openId);
  if (!entry) return;

  const urlMode    = urlParams.get("mode");
  const urlOutline = urlParams.get("outline");

  if (urlOutline === "0") entry.setOutline(false);
  await entry.ensurePreview();
  if (urlMode === "3d") await entry.setMode("3d");

  entry.card.scrollIntoView({ behavior: "smooth", block: "center" });
  entry.setExpanded(true);
})();

// =========================================================================
// Grid size toggle
// =========================================================================

document.getElementById("gridSizeToggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".grid-size-btn");
  if (!btn) return;
  const size = btn.dataset.size;
  gtag("event", "click", { event_category: "grid_size", event_label: size });
  document.querySelectorAll(".grid-size-btn").forEach(b => b.classList.toggle("active", b.dataset.size === size));
  grid.classList.toggle("size-small", size === "small");
  grid.classList.toggle("size-full",  size === "full");
});

// =========================================================================
// IntersectionObserver — lazy preview render
// =========================================================================

const previewObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const match = cardEntries.find(c => c.card === entry.target);
    if (!match) continue;
    match.ensurePreview();
    previewObserver.unobserve(entry.target);
  }
}, { rootMargin: "400px 0px" });

for (const { card } of cardEntries) previewObserver.observe(card);

// =========================================================================
// IntersectionObserver — pause/resume
// =========================================================================

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const match = cardEntries.find(c => c.card === entry.target);
    if (!match || !match.isStarted()) continue;
    if (activeCardEntry && activeCardEntry === match.cardRef) {
      if (entry.isIntersecting) {
        match.runner.start();
        match.overlay.hidden = true;
        match.statsBar.hidden = false;
      } else {
        match.runner.stop();
        match.overlay.hidden = false;
        match.statsBar.hidden = true;
      }
    }
  }
}, { threshold: 0.1 });

for (const { card } of cardEntries) observer.observe(card);
