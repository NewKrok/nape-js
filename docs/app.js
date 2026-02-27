/**
 * nape-js Demo Page — interactive demos + live benchmarks
 *
 * Imports the bundled ESM library from nape-js.esm.js
 * (copied from dist/index.js during build:docs).
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, Material, InteractionFilter,
} from "./nape-js.esm.js";

// =========================================================================
// Canvas & state
// =========================================================================

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("demoCanvas"));
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("canvasOverlay");
const fpsLabel = document.getElementById("fpsLabel");
const bodyCountLabel = document.getElementById("bodyCount");
const stepTimeLabel = document.getElementById("stepTime");
const demoDescEl = document.getElementById("demoDescription");
const debugDrawCb = /** @type {HTMLInputElement} */ (document.getElementById("debugDraw"));

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

// =========================================================================
// Rendering helpers
// =========================================================================

function getCanvasScale() {
  const rect = canvas.getBoundingClientRect();
  return { sx: W / rect.width, sy: H / rect.height };
}

function drawBody(body) {
  const px = body.position.x;
  const py = body.position.y;
  const rot = body.rotation;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);

  const isStatic = body.isStatic();
  const sleeping = body.isSleeping();

  for (const shape of body.shapes) {
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);

      if (debugDrawCb.checked) {
        ctx.fillStyle = isStatic
          ? "rgba(120,160,200,0.15)"
          : sleeping
            ? "rgba(100,200,100,0.12)"
            : "rgba(88,166,255,0.18)";
        ctx.fill();
        ctx.strokeStyle = isStatic ? "#607888" : sleeping ? "#3fb950" : "#58a6ff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Radius line to show rotation
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r, 0);
        ctx.strokeStyle = isStatic ? "#607888" : "#58a6ff55";
        ctx.stroke();
      } else {
        ctx.fillStyle = isStatic
          ? "#2a3a48"
          : sleeping
            ? "#1a3020"
            : "#162540";
        ctx.fill();
      }
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.get_length();
      if (len < 3) continue;

      ctx.beginPath();
      const v0 = verts.at(0);
      ctx.moveTo(v0.get_x(), v0.get_y());
      for (let i = 1; i < len; i++) {
        const v = verts.at(i);
        ctx.lineTo(v.get_x(), v.get_y());
      }
      ctx.closePath();

      if (debugDrawCb.checked) {
        ctx.fillStyle = isStatic
          ? "rgba(120,160,200,0.15)"
          : sleeping
            ? "rgba(100,200,100,0.12)"
            : "rgba(88,166,255,0.18)";
        ctx.fill();
        ctx.strokeStyle = isStatic ? "#607888" : sleeping ? "#3fb950" : "#58a6ff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = isStatic
          ? "#2a3a48"
          : sleeping
            ? "#1a3020"
            : "#162540";
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawConstraint(constraint) {
  // Only draw PivotJoints for now
  if (!constraint._inner || !constraint._inner.get_body1 || !constraint._inner.get_body2) return;
  try {
    const b1 = constraint._inner.get_body1();
    const b2 = constraint._inner.get_body2();
    if (!b1 || !b2) return;

    const p1x = b1.get_position().get_x();
    const p1y = b1.get_position().get_y();
    const p2x = b2.get_position().get_x();
    const p2y = b2.get_position().get_y();

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.strokeStyle = "#d2992266";
    ctx.lineWidth = 1;
    ctx.stroke();
  } catch (_) {
    // Ignore render errors for unsupported constraint types
  }
}

// =========================================================================
// Demo definitions
// =========================================================================

const DEMOS = {
  // ------ Falling Shapes ------
  falling: {
    desc: 'Random boxes and circles fall into a container. <b>Click</b> to spawn more shapes at the cursor.',
    setup() {
      space = new Space(new Vec2(0, 600));
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
  },

  // ------ Pyramid ------
  pyramid: {
    desc: 'A classic box-stacking pyramid. <b>Click</b> to drop a heavy ball onto it.',
    setup() {
      space = new Space(new Vec2(0, 600));
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
          b.space = space;
        }
      }
    },
    click(x, y) {
      const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      ball.shapes.add(new Circle(25, undefined, new Material(0.3, 0.2, 0.3, 5)));
      ball.space = space;
    },
  },

  // ------ Pendulum Chain ------
  chain: {
    desc: 'A pendulum chain made of <code>PivotJoint</code> constraints. <b>Click</b> to apply an impulse near the cursor.',
    setup() {
      space = new Space(new Vec2(0, 400));
      addWalls();

      const links = 20;
      const linkLen = 18;
      const anchorX = W / 2;
      const anchorY = 40;

      const anchor = new Body(BodyType.STATIC, new Vec2(anchorX, anchorY));
      anchor.shapes.add(new Circle(6));
      anchor.space = space;

      let prev = anchor;
      for (let i = 0; i < links; i++) {
        const link = new Body(BodyType.DYNAMIC, new Vec2(
          anchorX + (i + 1) * linkLen,
          anchorY,
        ));
        link.shapes.add(new Circle(5));
        link.space = space;

        const joint = new PivotJoint(
          prev, link,
          new Vec2(i === 0 ? 0 : linkLen / 2, 0),
          new Vec2(-linkLen / 2, 0),
        );
        joint.space = space;
        prev = link;
      }

      // Heavy bob at the end
      const bob = new Body(BodyType.DYNAMIC, new Vec2(
        anchorX + links * linkLen + linkLen,
        anchorY,
      ));
      bob.shapes.add(new Circle(18, undefined, new Material(0.3, 0.3, 0.5, 8)));
      bob.space = space;

      const lastJoint = new PivotJoint(
        prev, bob,
        new Vec2(linkLen / 2, 0),
        new Vec2(-18, 0),
      );
      lastJoint.space = space;
    },
    click(x, y) {
      // Apply impulse to nearby bodies
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = 800 * (1 - dist / 150);
          body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
        }
      }
    },
  },

  // ------ Explosion / Impulse Blast ------
  explosion: {
    desc: '<b>Click</b> anywhere to create an impulse blast that pushes nearby bodies away.',
    setup() {
      space = new Space(new Vec2(0, 500));
      addWalls();

      // Fill with mixed shapes
      for (let i = 0; i < 120; i++) {
        const x = 100 + Math.random() * 700;
        const y = 100 + Math.random() * 350;
        spawnRandomShape(x, y);
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

      // Visual pulse (draw a circle briefly)
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 200, 0, Math.PI * 2);
      ctx.strokeStyle = "#f8514944";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    },
  },
};

function addWalls() {
  const thickness = 20;
  // Floor
  const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - thickness / 2));
  floor.shapes.add(new Polygon(Polygon.box(W, thickness)));
  floor.space = space;
  // Left wall
  const left = new Body(BodyType.STATIC, new Vec2(thickness / 2, H / 2));
  left.shapes.add(new Polygon(Polygon.box(thickness, H)));
  left.space = space;
  // Right wall
  const right = new Body(BodyType.STATIC, new Vec2(W - thickness / 2, H / 2));
  right.shapes.add(new Polygon(Polygon.box(thickness, H)));
  right.space = space;
  // Ceiling (to keep things in bounds)
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
  body.space = space;
  return body;
}

// =========================================================================
// Game loop
// =========================================================================

function startDemo(name) {
  if (animId) cancelAnimationFrame(animId);
  currentDemo = name;

  // Update tabs
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.demo === name);
  });

  const demo = DEMOS[name];
  demoDescEl.innerHTML = demo.desc;
  demo.setup();

  lastTime = performance.now();
  frameCount = 0;
  fpsAccum = 0;
  loop();
}

function loop() {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;

  // FPS counter
  frameCount++;
  fpsAccum += dt;
  if (fpsAccum >= 500) {
    const fps = Math.round((frameCount / fpsAccum) * 1000);
    fpsLabel.textContent = `FPS: ${fps}`;
    frameCount = 0;
    fpsAccum = 0;
  }

  // Physics step
  const stepStart = performance.now();
  space.step(1 / 60, 8, 3);
  const stepMs = performance.now() - stepStart;
  stepTimeLabel.textContent = `Step: ${stepMs.toFixed(2)}ms`;

  // Count bodies
  bodyCountLabel.textContent = `Bodies: ${space.bodies.length}`;

  // Render
  ctx.clearRect(0, 0, W, H);

  // Draw background grid
  ctx.strokeStyle = "#1a2030";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Draw constraints (raw access for now)
  try {
    const rawConstraints = space._inner.get_constraints();
    const cLen = rawConstraints.get_length();
    for (let i = 0; i < cLen; i++) {
      const c = rawConstraints.at(i);
      if (c.get_body1 && c.get_body2) {
        try {
          const b1 = c.get_body1();
          const b2 = c.get_body2();
          if (b1 && b2) {
            ctx.beginPath();
            ctx.moveTo(b1.get_position().get_x(), b1.get_position().get_y());
            ctx.lineTo(b2.get_position().get_x(), b2.get_position().get_y());
            ctx.strokeStyle = "#d2992233";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Draw bodies
  for (const body of space.bodies) {
    drawBody(body);
  }

  animId = requestAnimationFrame(loop);
}

// =========================================================================
// Interaction
// =========================================================================

canvas.addEventListener("mousedown", (e) => {
  mouseDown = true;
  const rect = canvas.getBoundingClientRect();
  const { sx, sy } = getCanvasScale();
  mouseX = (e.clientX - rect.left) * sx;
  mouseY = (e.clientY - rect.top) * sy;
  DEMOS[currentDemo].click?.(mouseX, mouseY);
});

canvas.addEventListener("mousemove", (e) => {
  if (!mouseDown) return;
  const rect = canvas.getBoundingClientRect();
  const { sx, sy } = getCanvasScale();
  mouseX = (e.clientX - rect.left) * sx;
  mouseY = (e.clientY - rect.top) * sy;
  // Continuous spawning for falling demo
  if (currentDemo === "falling") {
    spawnRandomShape(mouseX + (Math.random()-0.5)*20, mouseY + (Math.random()-0.5)*20);
  }
});

canvas.addEventListener("mouseup", () => { mouseDown = false; });
canvas.addEventListener("mouseleave", () => { mouseDown = false; });

// Touch support
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const { sx, sy } = getCanvasScale();
  mouseX = (touch.clientX - rect.left) * sx;
  mouseY = (touch.clientY - rect.top) * sy;
  DEMOS[currentDemo].click?.(mouseX, mouseY);
}, { passive: false });

// Demo tab switching
document.getElementById("demoTabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) startDemo(tab.dataset.demo);
});

// Reset
document.getElementById("resetBtn").addEventListener("click", () => {
  startDemo(currentDemo);
});

// =========================================================================
// Benchmarks
// =========================================================================

function runBenchmarkSuite() {
  const resultsEl = document.getElementById("benchResults");
  resultsEl.innerHTML = '<p class="bench-running">Running benchmarks&hellip;</p>';

  // Use setTimeout to let the UI update
  setTimeout(() => {
    const results = [];

    // Benchmark helper
    function benchStep(label, bodyCount, iterations) {
      const sp = new Space(new Vec2(0, 600));
      // floor
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

      // Warm up
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

    // Render results
    const maxAvg = Math.max(...results.map(r => r.avg));

    let html = `
      <table class="bench-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Median</th>
            <th>Average</th>
            <th>Min</th>
            <th>Max</th>
            <th style="width:200px"></th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const r of results) {
      const barWidth = Math.max(4, (r.avg / maxAvg) * 180);
      html += `
        <tr>
          <td>${r.label}</td>
          <td>${formatMs(r.med)}</td>
          <td>${formatMs(r.avg)}</td>
          <td>${formatMs(r.min)}</td>
          <td>${formatMs(r.max)}</td>
          <td><div class="bench-bar" style="width:${barWidth}px"></div></td>
        </tr>
      `;
    }

    html += "</tbody></table>";
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

document.getElementById("runBenchmark").addEventListener("click", runBenchmarkSuite);

// =========================================================================
// Boot
// =========================================================================

overlay.classList.add("hidden");
startDemo("falling");
