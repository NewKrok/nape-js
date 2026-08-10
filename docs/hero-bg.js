/**
 * nape-js docs — live physics background for the hero.
 *
 * The hero of a physics-engine site should be running the physics engine, so
 * this is a real nape-js `Space` drifting behind the headline rather than a
 * decorative animation: ~28 bodies in zero gravity, perfectly elastic, gently
 * pushed away from the pointer. It imports the same `nape-js.esm.js` URL as
 * app.js, so the module is shared — no second copy of the engine is fetched.
 *
 * The demo canvas further down the page runs its own simulation, so this one
 * is deliberately cheap and yields the CPU whenever it isn't being looked at:
 *
 *   - stepping stops when the hero scrolls out of view (IntersectionObserver)
 *   - stepping stops when the tab is hidden (visibilitychange)
 *   - `prefers-reduced-motion` renders a single static frame and never loops
 *   - the device pixel ratio is capped at 2
 *
 * Contrast is protected two ways: the shapes are drawn at low alpha, and the
 * canvas carries a radial CSS mask that fades them out behind the centre
 * column where the headline and buttons live (see `.hero-bg` in style.css).
 */
import { Space, Body, BodyType, Vec2, Circle, Polygon, Material } from "./nape-js.esm.js?v=3.39.1";

// Density, not a fixed count: one body per ~18k px² of hero, clamped. A
// phone's hero is a fraction of a desktop's area, so a fixed count would
// crowd the headline there while looking sparse on a wide screen.
const BODY_DENSITY = 1 / 18000;
const BODY_MIN = 14;
const BODY_MAX = 40;
// Bodies closer than this get a connecting line, so the field reads as one
// linked structure — a constraint graph — instead of scattered debris. The
// lines are drawn, not simulated: no joints are created.
const LINK_DISTANCE = 165;
const MAX_SPEED = 34; // px/s — a slow drift, not a screensaver
const MIN_SPEED = 8; // px/s — nothing is allowed to stall out and freeze
const POINTER_RADIUS = 130;
const POINTER_PUSH = 26;
const STEP = 1 / 60;

// Brand blue → green, matching the logo gradient. Alpha stays low: these sit
// behind text, so they read as texture rather than as content.
const PALETTE = [
  { fill: "rgba(88,166,255,0.07)", stroke: "rgba(88,166,255,0.42)", glow: "rgba(88,166,255,0.10)" },
  { fill: "rgba(63,185,80,0.065)", stroke: "rgba(63,185,80,0.40)", glow: "rgba(63,185,80,0.09)" },
  { fill: "rgba(163,113,247,0.06)", stroke: "rgba(163,113,247,0.34)", glow: "rgba(163,113,247,0.08)" },
  { fill: "rgba(210,153,34,0.055)", stroke: "rgba(210,153,34,0.32)", glow: "rgba(210,153,34,0.08)" },
];

const hero = document.querySelector(".hero");
const canvas = document.getElementById("heroBg");

// Bail out quietly on any page that doesn't have the hero canvas.
if (hero && canvas) init();

function init() {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let space = null;
  let bodies = [];
  let width = 0;
  let height = 0;
  let running = false;
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  const pointer = { x: 0, y: 0, active: false };

  // --- world ---------------------------------------------------------------

  /**
   * Build (or rebuild) the world at the current hero size.
   *
   * Walls are static boxes just outside the visible area so bodies bounce
   * back in without their outlines ever showing. Everything is rebuilt on
   * resize rather than repositioned — at this body count it is cheap and
   * avoids a pile of edge cases around shrinking viewports.
   */
  function build() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    space = new Space(new Vec2(0, 0));
    bodies = [];

    // Fully elastic, frictionless walls and bodies: with zero gravity the
    // drift then sustains itself instead of decaying to a dead screen.
    const bouncy = new Material(1, 0, 0, 1);

    const T = 60;
    const walls = [
      [width / 2, -T / 2, width + T * 2, T],
      [width / 2, height + T / 2, width + T * 2, T],
      [-T / 2, height / 2, T, height + T * 2],
      [width + T / 2, height / 2, T, height + T * 2],
    ];
    for (const [x, y, w, h] of walls) {
      const wall = new Body(BodyType.STATIC, new Vec2(x, y));
      // NOTE: no Material argument on these Polygons — a dynamic Polygon that
      // carries an explicit Material tunnels through static Polygon walls
      // (known engine bug), and the bodies below are Polygons too.
      wall.shapes.add(new Polygon(Polygon.box(w, h)));
      wall.space = space;
    }

    const count = Math.round(
      Math.min(BODY_MAX, Math.max(BODY_MIN, width * height * BODY_DENSITY)),
    );
    for (let i = 0; i < count; i++) {
      const body = new Body(
        BodyType.DYNAMIC,
        new Vec2(rand(40, width - 40), rand(40, height - 40)),
      );
      const kind = i % 3;
      if (kind === 0) {
        body.shapes.add(new Circle(rand(10, 34), null, bouncy));
      } else if (kind === 1) {
        const s = rand(22, 54);
        body.shapes.add(new Polygon(Polygon.box(s, s * rand(0.7, 1.3))));
      } else {
        const r = rand(18, 34);
        body.shapes.add(new Polygon(Polygon.regular(r, r * rand(0.8, 1.2), 3 + (i % 4))));
      }
      body.space = space;
      body.velocity = new Vec2(rand(-MAX_SPEED, MAX_SPEED), rand(-MAX_SPEED, MAX_SPEED));
      body.angularVel = rand(-0.5, 0.5);
      body.userData.color = PALETTE[i % PALETTE.length];
      bodies.push(body);
    }
  }

  const rand = (min, max) => min + Math.random() * (max - min);

  // --- simulation ----------------------------------------------------------

  function step() {
    // Nudge bodies away from the cursor, then clamp every body back under the
    // speed limit — the walls are perfectly elastic, so without this the
    // pointer could pump energy in until the drift turns into a pinball table.
    for (const body of bodies) {
      if (pointer.active) {
        const dx = body.position.x - pointer.x;
        const dy = body.position.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001 && dist < POINTER_RADIUS) {
          const falloff = 1 - dist / POINTER_RADIUS;
          const push = (POINTER_PUSH * falloff * falloff) / dist;
          body.velocity = new Vec2(
            body.velocity.x + dx * push,
            body.velocity.y + dy * push,
          );
        }
      }

      // Clamp into a speed band. The upper bound stops the pointer from
      // pumping energy into a perfectly elastic world; the lower bound keeps
      // a body that lost most of its speed in a collision from creeping to a
      // halt (and from falling asleep, which would freeze it mid-scene).
      const v = body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_SPEED) {
        const k = MAX_SPEED / speed;
        body.velocity = new Vec2(v.x * k, v.y * k);
      } else if (speed < MIN_SPEED) {
        const angle = speed > 0.001 ? Math.atan2(v.y, v.x) : Math.random() * Math.PI * 2;
        body.velocity = new Vec2(Math.cos(angle) * MIN_SPEED, Math.sin(angle) * MIN_SPEED);
      }
    }

    space.step(STEP);
  }

  /**
   * Link lines between nearby bodies, faded by distance.
   *
   * O(n²) over ~38 bodies is under 750 pair tests per frame — cheaper than
   * the solver step it follows, and it is what turns a scatter of shapes into
   * something that looks composed. Compared against squared distance so the
   * inner loop stays free of Math.hypot.
   */
  function renderLinks() {
    const maxSq = LINK_DISTANCE * LINK_DISTANCE;
    ctx.lineWidth = 1;
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i].position;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j].position;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > maxSq) continue;
        const strength = 1 - Math.sqrt(distSq) / LINK_DISTANCE;
        ctx.strokeStyle = `rgba(110,180,240,${(strength * 0.16).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    renderLinks();

    for (const body of bodies) {
      const color = body.userData.color;

      for (const shape of body.shapes) {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.rotation);

        if (shape.isCircle()) {
          ctx.beginPath();
          ctx.arc(0, 0, shape.castCircle.radius, 0, Math.PI * 2);
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          const len = verts.length;
          if (len < 3) {
            ctx.restore();
            continue;
          }
          ctx.beginPath();
          const v0 = verts.at(0);
          ctx.moveTo(v0.x, v0.y);
          for (let v = 1; v < len; v++) {
            const p = verts.at(v);
            ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
        } else {
          ctx.restore();
          continue;
        }

        ctx.fillStyle = color.fill;
        ctx.fill();
        // Two-pass outline: a wide, near-transparent pass reads as glow, then
        // the crisp edge on top. Much cheaper than canvas shadowBlur, which
        // would be re-rasterised for every shape every frame.
        ctx.strokeStyle = color.glow;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /**
   * Fixed-timestep loop. The accumulator is clamped so a long stall (tab
   * restore, blocked main thread) resumes with one step instead of trying to
   * catch up on every frame it missed.
   */
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.25);
    lastTime = now;
    accumulator = Math.min(accumulator + dt, STEP * 5);
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
    }
    render();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastTime = performance.now();
    accumulator = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // --- wiring --------------------------------------------------------------

  build();
  // Let the shapes settle into a less grid-like arrangement before the first
  // paint, so the hero never flashes a raw random scatter.
  for (let i = 0; i < 90; i++) step();
  render();

  if (reduceMotion) return; // static frame only — no loop, no listeners

  let inView = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    ).observe(hero);
  } else {
    start();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (inView) start();
  });

  hero.addEventListener(
    "pointermove",
    (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasRunning = running;
      stop();
      build();
      for (let i = 0; i < 60; i++) step();
      render();
      if (wasRunning) start();
    }, 200);
  });

  start();
}
