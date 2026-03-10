/**
 * nape-js Examples Page — grid of interactive physics demos with play overlay,
 * per-card stats, search/tag filtering, size toggle, outline toggle, and View Code.
 */
import { VERSION } from "./nape-js.esm.js?v=3.6.2";
import { installErrorOverlay } from "./renderer.js?v=3.6.2";
import { DemoRunner, loadThree, highlightCode } from "./demo-runner.js?v=3.6.2";

const NAPE_CDN = "https://cdn.jsdelivr.net/npm/@newkrok/nape-js/dist/index.js";

// All demos (featured + examples)
import falling     from "./demos/falling.js?v=3.6.2";
import pyramid     from "./demos/pyramid.js?v=3.6.2";
import chain       from "./demos/chain.js?v=3.6.2";
import explosion   from "./demos/explosion.js?v=3.6.2";
import constraints from "./demos/constraints.js?v=3.6.2";
import gravity     from "./demos/gravity.js?v=3.6.2";
import stacking    from "./demos/stacking.js?v=3.6.2";
import ragdoll     from "./demos/ragdoll.js?v=3.6.2";
import strandbeast from "./demos/strandbeast.js?v=3.6.2";
import carSideview    from "./demos/car-sideview.js?v=3.6.2";
import carTopdown     from "./demos/car-topdown.js?v=3.6.2";
import platformer     from "./demos/platformer.js?v=3.6.2";
import ropeBridge     from "./demos/rope-bridge.js?v=3.6.2";
import wreckingBall   from "./demos/wrecking-ball.js?v=3.6.2";
import newtonsCradle  from "./demos/newtons-cradle.js?v=3.6.2";
import dominos        from "./demos/dominos.js?v=3.6.2";
import conveyorBelts  from "./demos/conveyor-belts.js?v=3.6.2";
import trebuchet      from "./demos/trebuchet.js?v=3.6.2";
import seesaw         from "./demos/seesaw.js?v=3.6.2";
import pinball        from "./demos/pinball.js?v=3.6.2";
import cloth          from "./demos/cloth.js?v=3.6.2";
import funnel         from "./demos/funnel.js?v=3.6.2";
import softBody       from "./demos/soft-body.js?v=3.6.2";
import oneWayPlatforms from "./demos/one-way-platforms.js?v=3.6.2";
import collisionFiltering from "./demos/collision-filtering.js?v=3.6.2";
import bodyFromGraphic    from "./demos/body-from-graphic.js?v=3.6.2";
import dropImageBody     from "./demos/drop-image-body.js?v=3.6.2";

const ALL_DEMOS = [
  falling, pyramid, chain, explosion, constraints, gravity, stacking, ragdoll, strandbeast,
  carSideview, carTopdown, platformer, ropeBridge, wreckingBall, newtonsCradle,
  dominos, conveyorBelts, trebuchet, seesaw, pinball, cloth, funnel,
  softBody, oneWayPlatforms, collisionFiltering, bodyFromGraphic, dropImageBody,
];

const CW = 900;
const CH = 500;

// =========================================================================
// CodePen helper
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
function bodyColor(body) {
  if (body.isStatic()) return { fill: "rgba(120,160,200,0.15)", stroke: "#607888" };
  const idx = (body.userData?._colorIdx ?? Math.abs(Math.round(body.position.x * 0.1))) % COLORS.length;
  return COLORS[idx];
}
function drawBody(body) {
  const px = body.position.x, py = body.position.y;
  ctx.save(); ctx.translate(px, py); ctx.rotate(body.rotation);
  const { fill, stroke } = bodyColor(body);
  for (const shape of body.shapes) {
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.length; if (len < 3) continue;
      ctx.beginPath(); ctx.moveTo(verts.at(0).x, verts.at(0).y);
      for (let i = 1; i < len; i++) ctx.lineTo(verts.at(i).x, verts.at(i).y);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  ctx.restore();
}
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
}
// ── End Renderer ─────────────────────────────────────────────────────────────

`;

function openInCodePen(demo) {
  // Use code2d if available; otherwise fetch the raw module source
  const code = demo.code2d ?? `// Source: ./demos/${demo.id}.js\n// (open the demo page to view full source)`;

  const html = `<canvas id="demoCanvas" width="900" height="500" style="background:#0a0e14;display:block;max-width:100%;border:1px solid #30363d;border-radius:8px"></canvas>`;
  const css  = `body { margin: 20px; background: #0d1117; font-family: sans-serif; color: #e6edf3; }`;
  const js   = `import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint,
  Material, InteractionFilter, InteractionGroup,
  CbType, CbEvent, InteractionType, InteractionListener, PreListener, PreFlag,
} from "${NAPE_CDN}";

const canvas = document.getElementById("demoCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

${RENDERER_2D}${code}`;

  const data = {
    title: `nape-js — ${demo.label ?? demo.id}`,
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
// Card factory
// =========================================================================

function createCard(demo, { onTagClick } = {}) {
  // --- Card container ---
  const card = document.createElement("div");
  card.className = "example-card";

  // --- Render container (holds canvas or WebGL canvas) ---
  const renderWrap = document.createElement("div");
  renderWrap.className = "example-card-canvas";
  renderWrap.style.position = "relative";
  card.appendChild(renderWrap);

  // --- DemoRunner ---
  const runner = new DemoRunner(renderWrap, { W: CW, H: CH });

  // --- Play overlay ---
  const overlay = document.createElement("div");
  overlay.className = "play-overlay";
  overlay.innerHTML = `<div class="play-btn" aria-label="Play"></div>`;
  renderWrap.appendChild(overlay);

  // --- Stats bar ---
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

  // --- Canvas overlay controls (top-right corner, always visible) ---
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
  renderToggle.append(btn2d, btn3d);

  let cardMode = "2d";
  renderToggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    const btn = e.target.closest(".card-render-btn");
    if (!btn || btn.dataset.mode === cardMode) return;
    const mode = btn.dataset.mode;
    if (mode === "3d") await loadThree();
    cardMode = mode;
    btn2d.classList.toggle("active", mode === "2d");
    btn3d.classList.toggle("active", mode === "3d");
    runner.setMode(mode);
    updateUrlForCard(demo.id, { mode: cardMode, outline: runner.debugDraw });
  });

  // Outline toggle (per-card)
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
    overlay.hidden = false;
    statsBar.hidden = true;
    card.classList.remove("running");
    started = false;
    await runner.renderPreviewAsync(demo);
    previewReady = true;
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
    // Scroll lock
    document.body.style.overflow = expand ? "hidden" : "";
  }

  fsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setExpanded(!isExpanded);
  });

  // Escape key closes expanded mode
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isExpanded) setExpanded(false);
  });

  canvasControls.append(renderToggle, outlineToggleBtn, resetBtn, fsBtn);
  renderWrap.appendChild(canvasControls);

  runner.wireStats({ fps: fpsEl, step: stepEl, bodies: bodiesEl });
  runner.wireInteraction(renderWrap);

  // --- Info section ---
  const info = document.createElement("div");
  info.className = "example-card-info";

  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";
  const h3 = document.createElement("h3");
  h3.textContent = demo.label;

  // Action buttons (code toggle + codepen)
  const btnGroup = document.createElement("div");
  btnGroup.className = "card-btn-group";

  // View Code button — always shown
  const codeToggle = document.createElement("button");
  codeToggle.className = "btn btn-small code-toggle-btn";
  codeToggle.textContent = "{ } Code";

  const codePanel = document.createElement("pre");
  codePanel.className = "card-code-panel";
  codePanel.hidden = true;

  let rendered = false;
  codeToggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    codePanel.hidden = !codePanel.hidden;
    if (!codePanel.hidden && !rendered) {
      rendered = true;
      const source = demo.code2d ?? await fetch(`./demos/${demo.id}.js`).then(r => r.text());
      codePanel.innerHTML = `<code>${highlightCode(source)}</code>`;
    }
  });

  btnGroup.appendChild(codeToggle);

  // CodePen button — shown for ALL demos
  const codepenBtn = document.createElement("button");
  codepenBtn.className = "btn btn-small btn-codepen";
  codepenBtn.textContent = "CodePen";
  codepenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openInCodePen(demo);
  });
  btnGroup.appendChild(codepenBtn);

  // Share / copy link button
  const shareBtn = document.createElement("button");
  shareBtn.className = "btn btn-small btn-share";
  shareBtn.title = "Copy link to this demo";
  shareBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13" cy="2.5" r="1.5"/><circle cx="13" cy="13.5" r="1.5"/><circle cx="3" cy="8" r="1.5"/>
    <line x1="11.5" y1="3.3" x2="4.4" y2="7.2"/><line x1="4.4" y1="8.8" x2="11.5" y2="12.7"/>
  </svg>`;
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const params = new URLSearchParams();
    params.set("open", demo.id);
    if (cardMode === "3d") params.set("mode", "3d");
    if (!runner.debugDraw) params.set("outline", "0");
    const url = window.location.origin + window.location.pathname + "?" + params.toString();
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

  // --- Render a static preview frame (async-safe: awaits preload if present) ---
  let previewReady = false;
  runner.renderPreviewAsync(demo).then(() => { previewReady = true; });

  // --- Play overlay: start demo ---
  let started = false;
  let loading = false;

  async function startDemo() {
    if (loading) return;
    loading = true;
    if (!previewReady) {
      await runner.renderPreviewAsync(demo);
    } else {
      await runner.loadAsync(demo);
    }
    started = true;
    loading = false;
    runner.start();
    overlay.hidden = true;
    statsBar.hidden = false;
    card.classList.add("running");
  }

  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
  overlay.addEventListener("click", startDemo);

  return {
    card, runner, overlay, statsBar,
    isStarted: () => started,
    startDemo,
    setExpanded,
    setMode: async (mode) => {
      if (mode === "3d") await loadThree();
      cardMode = mode;
      btn2d.classList.toggle("active", mode === "2d");
      btn3d.classList.toggle("active", mode === "3d");
      runner.setMode(mode);
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
  const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
  history.replaceState(null, "", newUrl);
}

// =========================================================================
// Build grid + filtering
// =========================================================================

installErrorOverlay(VERSION);

const grid      = document.getElementById("examplesGrid");
const searchEl  = document.getElementById("searchInput");
const tagBar    = document.getElementById("tagFilterBar");

// Collect all unique tags across demos (sorted)
const allTags = [...new Set(ALL_DEMOS.flatMap(d => d.tags ?? []))].sort();

let activeTag    = null;
let searchQuery  = "";

// Build tag filter buttons
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
  buildTagBar();
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
    const visible = matchesSearch && matchesTag;
    card.style.display = visible ? "" : "none";
    if (visible) anyVisible = true;
  }

  // Show/hide no-results placeholder
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

// Wire search
searchEl.addEventListener("input", () => {
  searchQuery = searchEl.value;
  applyFilter();
});

// Build cards
const cardEntries = ALL_DEMOS.map((demo) => {
  const result = createCard(demo, {
    onTagClick: (tag) => setActiveTag(activeTag === tag ? null : tag),
  });
  grid.appendChild(result.card);
  return { ...result, demo };
});

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

  // Apply outline before start
  if (urlOutline === "0") entry.setOutline(false);

  // Apply mode (loads Three.js if needed), then start
  if (urlMode === "3d") await entry.setMode("3d");

  // Scroll into view and expand to fullscreen
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
  document.querySelectorAll(".grid-size-btn").forEach(b => b.classList.toggle("active", b.dataset.size === size));
  grid.classList.toggle("size-small", size === "small");
  grid.classList.toggle("size-full",  size === "full");
});

// =========================================================================
// IntersectionObserver — pause/resume already-started demos
// =========================================================================

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const match = cardEntries.find(c => c.card === entry.target);
    if (!match) continue;
    const { runner, overlay, statsBar, isStarted } = match;
    if (!isStarted()) continue;   // not started yet — play button handles start
    if (entry.isIntersecting) {
      runner.start();
      overlay.hidden = true;
      statsBar.hidden = false;
    } else {
      runner.stop();
      // Show play button again so user can see it's paused
      overlay.hidden = false;
      statsBar.hidden = true;
    }
  }
}, { threshold: 0.1 });

for (const { card } of cardEntries) observer.observe(card);
