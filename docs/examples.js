/**
 * nape-js Examples Page — grid of interactive physics demos with play overlay,
 * per-card stats, and View Code toggle.
 */
import { VERSION } from "./nape-js.esm.js?v=3.4.5";
import { installErrorOverlay } from "./renderer.js?v=3.4.5";
import { DemoRunner, loadThree, highlightCode } from "./demo-runner.js";

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

const CW = 480;
const CH = 280;

// =========================================================================
// Card factory
// =========================================================================

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
  const stepEl   = document.createElement("span");
  const bodiesEl = document.createElement("span");
  fpsEl.textContent    = "FPS: —";
  stepEl.textContent   = "Step: —";
  bodiesEl.textContent = "Bodies: —";
  statsBar.append(fpsEl, " · ", stepEl, " · ", bodiesEl);
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

  // View Code button (only if code2d is provided)
  let codePanel = null;
  if (demo.code2d) {
    const codeToggle = document.createElement("button");
    codeToggle.className = "btn btn-small code-toggle-btn";
    codeToggle.textContent = "{ } Code";

    codePanel = document.createElement("pre");
    codePanel.className = "card-code-panel";
    codePanel.hidden = true;

    let rendered = false;
    codeToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      codePanel.hidden = !codePanel.hidden;
      if (!codePanel.hidden && !rendered) {
        codePanel.innerHTML = `<code>${highlightCode(demo.code2d)}</code>`;
        rendered = true;
      }
    });

    titleRow.append(h3, codeToggle);
  } else {
    titleRow.appendChild(h3);
  }

  info.appendChild(titleRow);

  const p = document.createElement("p");
  p.textContent = demo.desc ?? "";
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
  if (codePanel) card.appendChild(codePanel);

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
