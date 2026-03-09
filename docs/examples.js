/**
 * nape-js Examples Page — grid of interactive physics demos with play overlay,
 * per-card stats, and View Code toggle.
 */
import { VERSION } from "./nape-js.esm.js?v=3.4.5";
import { installErrorOverlay } from "./renderer.js?v=3.4.5";
import { DemoRunner, loadThree, highlightCode } from "./demo-runner.js";

const NAPE_CDN = "https://cdn.jsdelivr.net/npm/@newkrok/nape-js/dist/index.js";

// All demos (featured + examples)
import falling     from "./demos/falling.js";
import pyramid     from "./demos/pyramid.js";
import chain       from "./demos/chain.js";
import explosion   from "./demos/explosion.js";
import constraints from "./demos/constraints.js";
import gravity     from "./demos/gravity.js";
import stacking    from "./demos/stacking.js";
import ragdoll     from "./demos/ragdoll.js";
import strandbeast from "./demos/strandbeast.js";
import carSideview    from "./demos/car-sideview.js";
import carTopdown     from "./demos/car-topdown.js";
import platformer     from "./demos/platformer.js";
import ropeBridge     from "./demos/rope-bridge.js";
import wreckingBall   from "./demos/wrecking-ball.js";
import newtonsCradle  from "./demos/newtons-cradle.js";
import dominos        from "./demos/dominos.js";
import conveyorBelts  from "./demos/conveyor-belts.js";
import trebuchet      from "./demos/trebuchet.js";
import seesaw         from "./demos/seesaw.js";
import pinball        from "./demos/pinball.js";
import cloth          from "./demos/cloth.js";
import funnel         from "./demos/funnel.js";
import softBody       from "./demos/soft-body.js";
import oneWayPlatforms from "./demos/one-way-platforms.js";
import collisionFiltering from "./demos/collision-filtering.js";

const ALL_DEMOS = [
  falling, pyramid, chain, explosion, constraints, gravity, stacking, ragdoll, strandbeast,
  carSideview, carTopdown, platformer, ropeBridge, wreckingBall, newtonsCradle,
  dominos, conveyorBelts, trebuchet, seesaw, pinball, cloth, funnel,
  softBody, oneWayPlatforms, collisionFiltering,
];

const CW = 900;
const CH = 500;

// =========================================================================
// Card factory
// =========================================================================

function openInCodePen(demo) {
  const code = demo.code2d;
  if (!code) return;

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

function createCard(demo) {
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

  // View Code button — always shown; fetches source if no code2d
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

  // CodePen button — only for demos with code2d
  if (demo.code2d) {
    const codepenBtn = document.createElement("button");
    codepenBtn.className = "btn btn-small btn-codepen";
    codepenBtn.textContent = "CodePen";
    codepenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openInCodePen(demo);
    });
    btnGroup.appendChild(codepenBtn);
  }

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
      tagWrap.appendChild(span);
    }
    info.appendChild(tagWrap);
  }

  card.appendChild(info);
  card.appendChild(codePanel);

  // --- Play overlay click: load + start ---
  overlay.addEventListener("click", () => {
    runner.load(demo);
    runner.start();
    overlay.hidden = true;
    statsBar.hidden = false;
  });

  return { card, runner };
}

// =========================================================================
// Build grid
// =========================================================================

installErrorOverlay(VERSION);

const grid  = document.getElementById("examplesGrid");
const cards = ALL_DEMOS.map((demo) => {
  const { card, runner } = createCard(demo);
  grid.appendChild(card);
  return { card, runner };
});

// =========================================================================
// Render mode toggle
// =========================================================================

let renderMode = "2d";

document.getElementById("renderModeToggle").addEventListener("click", async (e) => {
  const btn = e.target.closest(".render-mode-btn");
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === renderMode) return;

  if (mode === "3d") await loadThree();

  renderMode = mode;
  document.querySelectorAll(".render-mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });

  for (const { runner } of cards) {
    if (runner.isRunning) runner.setMode(mode);
  }
});

// =========================================================================
// IntersectionObserver — pause/resume already-started demos
// =========================================================================

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const match = cards.find(c => c.card === entry.target);
    if (!match) continue;
    const { runner } = match;
    if (!runner.isRunning) continue;   // not started yet — play button handles start
    if (entry.isIntersecting) { runner.start(); } else { runner.stop(); }
  }
}, { threshold: 0.1 });

for (const { card } of cards) observer.observe(card);
