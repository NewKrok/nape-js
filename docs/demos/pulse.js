import { Body, BodyType, Vec2, Polygon, Circle } from "../nape-js.esm.js?v=3.41.0";

// Pulse.
//
// 1100 tiny hexagonal bodies float in a zero-gravity box, cycling between
// two states:
//
//   FORM  — every body is spring-driven to its own assigned point in a
//           lattice figure (honeycomb, triangle, rings, spiral, wave grid),
//           so the swarm resolves into a recognisable shape.
//   PULSE — a standing pressure lattice tears the figure apart and stirs the
//           swarm. Each pulse re-rolls its phase, wavelength and speed, so
//           the next figure always assembles from a different scatter.
//
// Everything is driven through `body.force` (rewritten every step — force
// persists across space.step() in nape-js), so the whole piece is one
// per-frame force loop over the body list plus a colour ramp keyed on speed.
//
// Clicking drops a static circle. The swarm has to flow around it, and that
// part is genuinely the engine's work: the detour is computed by contacts, not
// by any field in this file. The one thing this file must do is stop asking for
// the impossible — see layoutCurrentForm() for why that is harder than it looks.

const DT = 1 / 60;
const COUNT = 1100;
const TAU = Math.PI * 2;

// Phase timing: the pulse gets the longer stretch, the figure the shorter one.
//
// FORM cannot go much below this. Measured at 1100 bodies, sweeping the phase
// length in the real demo: at 1.0s one figure in ten never resolved (its mean
// speed bottomed out at 58px/s), 1.25s still lost one, and 1.5s resolved all
// ten. That is a physical floor, not a tuning miss — a spring stiff enough to
// cross the frame in under a second flings the swarm into itself at ~1000px/s,
// and the pile-up costs more time than the extra stiffness buys.
const FORM_SECONDS = 1.5;
const PULSE_SECONDS = 3;
// Crossover length between phases. This overlaps the FORM phase, so it has to
// stay well under FORM_SECONDS or the spring never reaches full strength and
// the figure never resolves. Measured against the 1s FORM phase: 0.8s left
// only 0.2s of full spring and every figure stalled; 0.5s leaves 0.5s, which
// is enough at FORM_K, and shorter blends only cost frames without helping.
const BLEND_SECONDS = 0.5;
// FORM spring: stiffness and velocity damping, kept near critical damping
// (c ≈ 2·√k) so figures snap together without ringing.
//
// Sized to land a figure inside FORM_SECONDS. Measured at 1100 bodies with
// the 1.5s phase: k=300 left four figures in ten unresolved, k=400 resolves
// all ten, and k=600 also resolves them but spends noticeably more frames on
// the resulting pile-up (2.0% of steps over the 16.6ms budget against 1.2%).
const FORM_K = 400;
const FORM_DAMP = 40;

// ===== module state =====
let _parts = [];        // { body, index, phase, size, kind, sides, vertOffset }
let _W = 900;
let _H = 500;
let _t = 0;             // seconds since setup
let _phase = "pulse";   // "form" | "pulse"
let _phaseT = 0;        // seconds spent in the current phase
let _formIdx = 0;       // index into FORMS of the figure being built
let _pulseSeed = 0;     // increments on every pulse (shown in the HUD)
let _prevSpeeds = null; // Float32Array — speed at the previous step, for colour
let _targets = null;    // Float32Array(COUNT*2) — cached FORM target points
let _obstacles = [];    // { body, x, y, r } — static circles dropped by the user
let _pendingDrop = null;

// Deterministic RNG so the piece looks the same on every load.
let _seed = 0x9e3779b9;
function rng() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 0x100000000;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// Regular hexagon, wound consistently (nape rejects a bad winding).
function hexVerts(r) {
  const v = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    v.push(new Vec2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return v;
}

// =========================================================================
// FORMS — lattice figures.
//
// Each form fills `_targets` with one (x, y) per body. Layout runs once per
// FORM phase, not per step, so a form can afford real work.
//
// The hard constraint is SPACING: these bodies are ~4-8px across, and any
// pattern that puts targets closer than ~10px apart makes them fight over
// contact space — the figure never settles and the step cost doubles. Every
// form below derives its pitch from COUNT and the frame instead of hardcoding
// a row count.
// =========================================================================

const MIN_SPACING = 11;

// Click-dropped obstacles. Radius is a compromise: big enough that the swarm
// visibly has to go around it, small enough that it doesn't swallow a figure.
const OBSTACLE_R = 34;
const MAX_OBSTACLES = 6;

const FORMS = [
  {
    name: "Honeycomb",
    blurb: "hex-packed lattice — every body on its own cell",
    layout(out, n, W, H) {
      const pad = 38;
      const aw = W - pad * 2;
      const ah = H - pad * 2;
      // Hex packing: rows offset by half a step, row pitch = step · √3/2.
      // Solve n ≈ (aw/s)·(ah/(s·√3/2)) for the step s.
      const s = Math.sqrt((aw * ah) / (n * 0.8660254));
      const cols = Math.max(2, Math.round(aw / s));
      const rowPitch = s * 0.8660254;
      const rows = Math.max(1, Math.ceil(n / cols));
      const stepX = aw / (cols - 1);
      // Centre the block vertically, whatever row count falls out.
      const y0 = (H - (rows - 1) * rowPitch) / 2;
      for (let i = 0; i < n; i++) {
        const r = (i / cols) | 0;
        const c = i % cols;
        out[i * 2] = pad + (r % 2 ? stepX * 0.5 : 0) + c * stepX;
        out[i * 2 + 1] = y0 + r * rowPitch;
      }
    },
  },
  {
    name: "Triangle",
    blurb: "filled triangular lattice, apex up",
    layout(out, n, W, H) {
      const pad = 26;
      const hh = H - pad * 2;
      // The row count is capped by HEIGHT, not by the R(R+1)/2 ≥ n formula.
      // Solving that formula alone gave 47 rows in a 448px column — a 9.7px
      // row pitch, under MIN_SPACING, so consecutive rows overlapped and the
      // figure never stopped grinding (1100 arbiters, avgV stuck at ~14).
      const Rmax = Math.floor(hh / MIN_SPACING) + 1;
      let R = 1;
      while ((R * (R + 1)) / 2 < n && R < Rmax) R++;
      const rowPitch = R > 1 ? hh / (R - 1) : 0;
      const maxHalf = (W - pad * 2) / 2;
      // Row k spans 2·half_k and holds floor(2·half_k / MIN_SPACING) + 1
      // points at legal spacing. Share n out in proportion to that capacity,
      // so wide rows near the base take more than the narrow rows up top.
      const caps = [];
      let tot = 0;
      for (let k = 0; k < R; k++) {
        const half = R === 1 ? 0 : maxHalf * (k / (R - 1));
        const c = Math.max(1, Math.floor((2 * half) / MIN_SPACING) + 1);
        caps.push(c);
        tot += c;
      }
      let i = 0;
      for (let k = 0; k < R && i < n; k++) {
        const half = R === 1 ? 0 : maxHalf * (k / (R - 1));
        // Last row soaks up the remainder so every body gets a target.
        const want = k === R - 1 ? n - i : Math.max(1, Math.round((n * caps[k]) / tot));
        const take = Math.min(want, n - i);
        const y = pad + k * rowPitch;
        for (let q = 0; q < take; q++, i++) {
          out[i * 2] = take === 1 ? W / 2 : W / 2 - half + (q * 2 * half) / (take - 1);
          out[i * 2 + 1] = y;
        }
      }
    },
  },
  {
    name: "Rings",
    blurb: "concentric circles, spaced so nothing overlaps",
    layout(out, n, W, H) {
      const maxR = Math.min(W, H) * 0.46;
      // Tightest ring pitch whose total legal capacity still covers n. Legal
      // capacity of ring j is its circumference divided by MIN_SPACING.
      let pitch = MIN_SPACING;
      let NR = 0;
      let caps = null;
      for (let cand = MIN_SPACING; cand <= 60; cand += 0.25) {
        const nr = Math.floor(maxR / cand);
        const c = [];
        let tot = 0;
        for (let j = 1; j <= nr; j++) {
          const cap = Math.max(1, Math.floor((TAU * j * cand) / MIN_SPACING));
          c.push(cap);
          tot += cap;
        }
        if (tot < n) break; // capacity only shrinks from here
        pitch = cand;
        NR = nr;
        caps = c;
      }
      if (!caps) {
        // n exceeds even the tightest packing — fall back to MIN_SPACING and
        // accept the overlap rather than leaving bodies unplaced.
        pitch = MIN_SPACING;
        NR = Math.max(1, Math.floor(maxR / pitch));
        caps = [];
        for (let j = 1; j <= NR; j++) {
          caps.push(Math.max(1, Math.floor((TAU * j * pitch) / MIN_SPACING)));
        }
      }
      // Share n out in proportion to capacity, never exceeding a ring's own
      // capacity. An earlier version dumped the whole remainder on the last
      // ring, which over-packed it: 155 targets closer than MIN_SPACING.
      let totCap = 0;
      for (let j = 0; j < NR; j++) totCap += caps[j];
      const take = new Array(NR);
      let placed = 0;
      for (let j = 0; j < NR; j++) {
        take[j] = Math.min(caps[j], Math.floor((n * caps[j]) / totCap));
        placed += take[j];
      }
      // Leftovers go to rings with room, outermost first (most circumference).
      for (let j = NR - 1; j >= 0 && placed < n; j--) {
        const add = Math.min(caps[j] - take[j], n - placed);
        take[j] += add;
        placed += add;
      }
      let i = 0;
      for (let j = 0; j < NR && i < n; j++) {
        const r = (j + 1) * pitch;
        const cnt = take[j];
        for (let q = 0; q < cnt && i < n; q++, i++) {
          const a = (q / cnt) * TAU + j * 0.4; // stagger successive rings
          out[i * 2] = W / 2 + Math.cos(a) * r;
          out[i * 2 + 1] = H / 2 + Math.sin(a) * r;
        }
      }
    },
  },
  {
    name: "Spiral",
    blurb: "one arm at the golden angle — phyllotaxis",
    layout(out, n, W, H) {
      // Vogel's model: r ∝ √i, θ = i·golden angle. Constant point density,
      // which is exactly what keeps the spacing legal all the way out.
      const GOLDEN = Math.PI * (3 - Math.sqrt(5));
      const maxR = Math.min(W, H) * 0.47;
      // Stretch horizontally so the disc uses the 16:9-ish frame.
      const ax = (W / H) * 0.62;
      for (let i = 0; i < n; i++) {
        const r = maxR * Math.sqrt((i + 0.5) / n);
        const a = i * GOLDEN;
        out[i * 2] = W / 2 + Math.cos(a) * r * ax;
        out[i * 2 + 1] = H / 2 + Math.sin(a) * r;
      }
    },
  },
  {
    name: "Wave Grid",
    blurb: "a rectangular lattice folded into a standing wave",
    layout(out, n, W, H) {
      const pad = 34;
      const aw = W - pad * 2;
      const ah = H - pad * 2;
      const cols = Math.max(2, Math.round(Math.sqrt((n * aw) / ah)));
      const rows = Math.max(1, Math.ceil(n / cols));
      const stepX = aw / (cols - 1);
      const stepY = rows > 1 ? (ah * 0.7) / (rows - 1) : 0;
      const y0 = (H - (rows - 1) * stepY) / 2;
      const amp = ah * 0.13;
      for (let i = 0; i < n; i++) {
        const r = (i / cols) | 0;
        const c = i % cols;
        out[i * 2] = pad + c * stepX;
        // Displace each row by a sine of its column — a frozen ripple.
        out[i * 2 + 1] = y0 + r * stepY + Math.sin((c / cols) * TAU * 2) * amp;
      }
    },
  },
];

// =========================================================================
// Fields
// =========================================================================

// FORM: overdamped spring to the body's assigned target. Overdamped rather
// than critically damped because 1100 bodies converging on a lattice jostle
// each other, and any ringing turns into a permanent shimmer.
// Make the current figure's targets reachable around the obstacles.
//
// The naive fix — projecting each blocked target onto the nearest rim point —
// does not work, and measurably so: the displaced targets pile up on the
// circle, dropping the minimum target separation from 19px to 1px and creating
// 34 pairs closer than 6px. That is the same defect the Triangle and Rings
// layouts had: targets too close together means bodies fight over contact
// space and the figure never settles. Redistributing them over concentric
// shells was no better (2.2px), because those shells land on top of the
// lattice points that were never blocked in the first place.
//
// What works is to keep the lattice as the only source of positions: generate
// a larger pool of lattice points, discard the ones inside an obstacle, and
// assign bodies to the survivors. Spacing is then inherited from the lattice
// itself — measured at 18px minimum with six obstacles, and zero colliding
// targets — because no point is ever moved from where the layout put it.
const POOL_GROWTH = [1, 1.15, 1.35, 1.6, 2.0, 2.6];

// Scratch buffer, reused across layouts so a form change allocates nothing.
let _pool = null;

function blocked(x, y) {
  for (let o = 0; o < _obstacles.length; o++) {
    const ob = _obstacles[o];
    const dx = x - ob.x;
    const dy = y - ob.y;
    // Clear the rim by half a spacing so the ring of bodies resting against
    // the circle isn't wrestling the contact solver for the same millimetre.
    const need = ob.r + MIN_SPACING * 0.6;
    if (dx * dx + dy * dy < need * need) return true;
  }
  return false;
}

function layoutCurrentForm(W, H) {
  const form = FORMS[_formIdx];

  if (_obstacles.length === 0) {
    form.layout(_targets, COUNT, W, H);
    return;
  }

  // Grow the candidate pool until enough points survive the obstacles.
  for (let g = 0; g < POOL_GROWTH.length; g++) {
    const want = Math.ceil(COUNT * POOL_GROWTH[g]);
    if (!_pool || _pool.length < want * 2) _pool = new Float32Array(want * 2);
    form.layout(_pool, want, W, H);
    let kept = 0;
    for (let i = 0; i < want && kept < COUNT; i++) {
      const x = _pool[i * 2];
      const y = _pool[i * 2 + 1];
      if (blocked(x, y)) continue;
      _targets[kept * 2] = x;
      _targets[kept * 2 + 1] = y;
      kept++;
    }
    if (kept >= COUNT) return;
  }

  // Obstacles cover so much of the frame that even the largest pool can't
  // seat everyone. Fall back to the unfiltered layout: some bodies will press
  // against a circle, which looks better than leaving them unplaced.
  form.layout(_targets, COUNT, W, H);
}

function formAccel(i, x, y, vx, vy, damp, out) {
  out.x = (_targets[i * 2] - x) * FORM_K - vx * damp;
  out.y = (_targets[i * 2 + 1] - y) * FORM_K - vy * damp;
}

// PULSE: the gradient of a smooth standing potential, plus its curl.
//
// Two lessons are baked in here. A single centre never works: one radial pulse
// (or one vortex) evacuates the middle and packs the swarm onto the frame edge
// — measured at 88% of bodies within 50px of a wall, against 30% for a uniform
// spread. So the pressure pattern is a lattice, present everywhere.
//
// And the lattice must be CONTINUOUS. An earlier version snapped each body to
// its nearest cell centre, and the force discontinuity at every cell border
// jammed contacts hard enough to cost 9ms/step. As the gradient of a smooth
// potential, neighbouring bodies always feel nearly the same force: same look,
// less than half the cost.
//
//   P = cos(kx·x + px)·cos(ky·y + py)·sin(t·speed)
//   pressure = -grad P   (lattice nodes breathe in and out)
//   carrier  =  curl P   (divergence-free swirl, so nothing ever settles)
//
// Wavelengths, phases and speed are re-rolled per pulse — that is what makes
// each scatter drop the swarm somewhere new.
let _pk = null;

function rollPulse() {
  _pulseSeed++;
  // Wavelengths are bounded on both sides: too coarse and the swarm just
  // sloshes to one side of the frame, too fine and the force flips faster
  // than a body can cross one cell.
  _pk = {
    kx: 0.013 + rng() * 0.012,
    ky: 0.016 + rng() * 0.014,
    px: rng() * TAU,
    py: rng() * TAU,
    speed: 1.9 + rng() * 1.1,
    amp: 105000 + rng() * 40000,
    swirl: 3000 + rng() * 3500,
  };
}

function pulseAccel(x, y, vx, vy, t, out) {
  const sx = Math.sin(_pk.kx * x + _pk.px);
  const cx = Math.cos(_pk.kx * x + _pk.px);
  const sy = Math.sin(_pk.ky * y + _pk.py);
  const cy = Math.cos(_pk.ky * y + _pk.py);
  const osc = Math.sin(t * _pk.speed);
  out.x = _pk.amp * _pk.kx * sx * cy * osc + _pk.swirl * -_pk.ky * cx * sy - vx * 0.55;
  out.y = _pk.amp * _pk.ky * cx * sy * osc + _pk.swirl * _pk.kx * sx * cy - vy * 0.55;
}

// =========================================================================
// Colour ramp — speed maps to a cool→hot gradient (velocity as a heat map).
// Precomputed into a LUT so the render loop does no string work.
// =========================================================================

const RAMP_STOPS = [
  [0.0, 40, 70, 130],
  [0.25, 60, 150, 235],
  [0.5, 90, 225, 210],
  [0.72, 240, 210, 90],
  [0.88, 250, 130, 60],
  [1.0, 255, 240, 220],
];
const RAMP_N = 64;
const _ramp = new Array(RAMP_N);

function buildRamp() {
  for (let i = 0; i < RAMP_N; i++) {
    const t = i / (RAMP_N - 1);
    let a = RAMP_STOPS[0];
    let b = RAMP_STOPS[RAMP_STOPS.length - 1];
    for (let s = 0; s < RAMP_STOPS.length - 1; s++) {
      if (t >= RAMP_STOPS[s][0] && t <= RAMP_STOPS[s + 1][0]) {
        a = RAMP_STOPS[s];
        b = RAMP_STOPS[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const k = (t - a[0]) / span;
    const r = Math.round(a[1] + (b[1] - a[1]) * k);
    const g = Math.round(a[2] + (b[2] - a[2]) * k);
    const bl = Math.round(a[3] + (b[3] - a[3]) * k);
    _ramp[i] = `rgb(${r},${g},${bl})`;
  }
}

const SPEED_MAX = 620;

function rampIndex(speed) {
  let t = speed / SPEED_MAX;
  if (t > 1) t = 1;
  // sqrt so the low end — most of the swarm once a figure settles — gets range.
  const i = (Math.sqrt(t) * (RAMP_N - 1)) | 0;
  return i < 0 ? 0 : i;
}

// =========================================================================
// Demo definition
// =========================================================================

export default {
  id: "pulse",
  label: "Pulse",
  featured: true,
  featuredOrder: 14,
  tags: ["Forces", "Particles", "Generative"],
  desc:
    "1100 hexagons in zero gravity, cycling between order and chaos. In a <b>form</b>, every body is spring-driven to its own point in a lattice figure — honeycomb, triangle, concentric rings, a golden-angle spiral, a folded wave grid. Then a <b>pulse</b> — a standing pressure field, its wavelength and phase re-rolled every time — tears the figure apart, so the next one assembles from a different scatter. Colour tracks speed, cool to hot. Every figure and every pulse is one <code>body.force</code> write per step. <b>Click</b> to drop a static circle — the swarm's detour around it is solved by contacts, and figures re-form against whatever obstacles are in the way.",
  walls: true,
  // The swarm is force-driven and lightly colliding; a small solver budget
  // keeps 1100 bodies comfortably inside the frame budget.
  velocityIterations: 4,
  positionIterations: 2,

  setup(space, W, H) {
    _W = W;
    _H = H;
    _t = 0;
    // Open on a pulse so the first figure visibly assembles out of chaos.
    _phase = "pulse";
    _phaseT = 0;
    _formIdx = 0;
    _pulseSeed = 0;
    _parts = [];
    _obstacles = [];
    _pendingDrop = null;

    _seed = 0x9e3779b9;
    buildRamp();
    rollPulse();

    space.gravity = new Vec2(0, 0);

    _targets = new Float32Array(COUNT * 2);
    layoutCurrentForm(W, H);

    for (let i = 0; i < COUNT; i++) {
      const x = 40 + rng() * (W - 80);
      const y = 40 + rng() * (H - 80);
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      const size = 2.2 + rng() * 1.9;
      // Hexagons are the staple — they tile visually and read as crystal
      // flakes rather than dots. A few boxes and triangles break up the
      // uniformity.
      // NOTE: no explicit Material on Polygon shapes (see P53 tunnelling bug).
      const kind = i % 6;
      if (kind === 4) {
        body.shapes.add(new Polygon(Polygon.box(size * 1.8, size * 1.8)));
      } else if (kind === 5) {
        body.shapes.add(
          new Polygon([
            new Vec2(0, -size * 1.2),
            new Vec2(size, size * 0.8),
            new Vec2(-size, size * 0.8),
          ]),
        );
      } else {
        body.shapes.add(new Polygon(hexVerts(size)));
      }
      body.allowRotation = true;
      body.space = space;
      // Drawing metadata: hexes get 6 sides, boxes 4 (rotated 45° so the
      // square's corners land on its vertices), triangles 3.
      const sides = kind === 4 ? 4 : kind === 5 ? 3 : 6;
      const vertOffset = kind === 4 ? Math.PI / 4 : kind === 5 ? -Math.PI / 2 : 0;
      _parts.push({ body, index: i, phase: i / COUNT, size, kind, sides, vertOffset });
    }

    _prevSpeeds = new Float32Array(COUNT);
  },

  click(x, y) {
    // Queued, not applied here: step() owns the space, and adding a body plus
    // re-projecting targets mid-frame belongs in one place.
    _pendingDrop = { x, y };
  },

  cleanup() {
    _parts = [];
    _prevSpeeds = null;
    _targets = null;
    _pk = null;
    _obstacles = [];
    _pendingDrop = null;
  },

  step(space, W, H) {
    if (W !== _W || H !== _H) {
      _W = W;
      _H = H;
      // Re-layout on resize so the figure keeps fitting the frame.
      layoutCurrentForm(W, H);
    }
    _t += DT;
    _phaseT += DT;

    // ---- Queued obstacle drop ----
    if (_pendingDrop) {
      const { x, y } = _pendingDrop;
      _pendingDrop = null;
      if (_obstacles.length >= MAX_OBSTACLES) {
        // Retire the oldest so the frame can't fill up with circles.
        const old = _obstacles.shift();
        old.body.space = null;
      }
      const body = new Body(BodyType.STATIC, new Vec2(x, y));
      // NOTE: no explicit Material — see the P53 Polygon+Material tunnelling
      // bug. A Circle is safe either way, but the default keeps it uniform.
      body.shapes.add(new Circle(OBSTACLE_R));
      body.space = space;
      _obstacles.push({ body, x, y, r: OBSTACLE_R });
      // Targets currently inside the new circle are unreachable — fix them now
      // rather than waiting for the next form phase.
      layoutCurrentForm(W, H);
    }

    // ---- Phase scheduling ----
    const dwell = _phase === "form" ? FORM_SECONDS : PULSE_SECONDS;
    if (_phaseT >= dwell) {
      _phaseT = 0;
      if (_phase === "form") {
        _phase = "pulse";
        // Fresh pulse parameters — this is what varies where the swarm lands.
        rollPulse();
      } else {
        _phase = "form";
        _formIdx = (_formIdx + 1) % FORMS.length;
        layoutCurrentForm(W, H);
      }
    }

    // Blend weight: 0 = pure pulse, 1 = pure form. Ramps over BLEND_SECONDS at
    // the start of each phase, so figures condense and dissolve instead of
    // switching on a frame boundary.
    const ramp = smooth(Math.min(1, _phaseT / BLEND_SECONDS));
    const formW = _phase === "form" ? ramp : 1 - ramp;
    // A little extra damping while a figure condenses, to absorb the momentum
    // the pulse leaves behind. Kept small: at FORM_K the spring is stiff
    // enough to do this itself, and over-damping here just slows the assembly.
    const blendDamp = FORM_DAMP + (1 - formW) * 4;

    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };

    for (let i = 0; i < _parts.length; i++) {
      const body = _parts[i].body;
      const pos = body.position;
      const vel = body.velocity;
      const x = pos.x;
      const y = pos.y;
      const vx = vel.x;
      const vy = vel.y;

      let ax;
      let ay;
      if (formW >= 0.999) {
        formAccel(i, x, y, vx, vy, FORM_DAMP, a);
        ax = a.x;
        ay = a.y;
      } else if (formW <= 0.001) {
        pulseAccel(x, y, vx, vy, _t, a);
        ax = a.x;
        ay = a.y;
      } else {
        formAccel(i, x, y, vx, vy, blendDamp, a);
        pulseAccel(x, y, vx, vy, _t, b);
        ax = b.x + (a.x - b.x) * formW;
        ay = b.y + (a.y - b.y) * formW;
      }

      // Soft edge cushion — keeps the swarm off the walls without a hard stop.
      const margin = 26;
      if (x < margin) ax += (margin - x) * 26;
      else if (x > _W - margin) ax -= (x - (_W - margin)) * 26;
      if (y < margin) ay += (margin - y) * 26;
      else if (y > _H - margin) ay -= (y - (_H - margin)) * 26;

      // force = mass · accel, rewritten every step because nape-js persists
      // body.force across space.step().
      const m = body.mass;
      body.force = new Vec2(ax * m, ay * m);

      _prevSpeeds[i] = Math.sqrt(vx * vx + vy * vy);
    }
  },

  render(ctx, space, W, H) {
    ctx.save();

    // Background — a dark radial vignette, so hot pixels pop.
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    bg.addColorStop(0, "#111a24");
    bg.addColorStop(1, "#080b10");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Obstacles, drawn under the swarm so bodies read as passing in front.
    for (let o = 0; o < _obstacles.length; o++) {
      const ob = _obstacles[o];
      const g = ctx.createRadialGradient(ob.x, ob.y, ob.r * 0.2, ob.x, ob.y, ob.r);
      g.addColorStop(0, "rgba(90,110,135,0.55)");
      g.addColorStop(1, "rgba(50,64,84,0.85)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ob.x, ob.y, ob.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(150,180,215,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Additive blending makes dense regions bloom into light.
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < _parts.length; i++) {
      const p = _parts[i];
      const pos = p.body.position;
      const speed = _prevSpeeds[i];
      ctx.fillStyle = _ramp[rampIndex(speed)];

      // Fast bodies stretch into a streak along their velocity; slow ones are
      // drawn as the hexagons (and stray boxes/triangles) they actually are,
      // rotated by the body so the tumbling reads.
      if (speed > 170) {
        const vel = p.body.velocity;
        const inv = 1 / (speed || 1);
        const len = Math.min(16, speed * 0.028);
        ctx.beginPath();
        ctx.lineWidth = p.size * 1.4;
        ctx.strokeStyle = _ramp[rampIndex(speed)];
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - vel.x * inv * len, pos.y - vel.y * inv * len);
        ctx.stroke();
      } else {
        const rot = p.body.rotation;
        const n = p.sides;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const a = rot + (k / n) * TAU + p.vertOffset;
          const px = pos.x + Math.cos(a) * p.size;
          const py = pos.y + Math.sin(a) * p.size;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "source-over";
    drawHUD(ctx, W, H);
    ctx.restore();
  },

  render3dOverlay(ctx, _space, W, H) {
    drawHUD(ctx, W, H);
  },
};

function drawHUD(ctx, W, H) {
  const form = FORMS[_formIdx];
  const inForm = _phase === "form";
  const nextForm = FORMS[(_formIdx + 1) % FORMS.length];

  ctx.save();
  ctx.fillStyle = "rgba(8,11,16,0.72)";
  ctx.fillRect(8, 8, 330, 52);

  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 14px ui-monospace, monospace";
  ctx.fillText(inForm ? form.name : `Pulse → ${nextForm.name}`, 16, 27);

  ctx.fillStyle = "#8b98a5";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(inForm ? form.blurb : `scattering — pulse variant #${_pulseSeed}`, 16, 45);

  // Phase progress along the top edge.
  const dwell = inForm ? FORM_SECONDS : PULSE_SECONDS;
  ctx.fillStyle = inForm ? "rgba(88,166,255,0.55)" : "rgba(240,180,80,0.85)";
  ctx.fillRect(0, 0, W * Math.min(1, _phaseT / dwell), 3);

  ctx.fillStyle = "#6e7b8a";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(`${COUNT} bodies — click to drop an obstacle`, 16, H - 14);
  ctx.restore();
}
