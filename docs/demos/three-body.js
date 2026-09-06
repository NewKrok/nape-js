import {
  Body, BodyType, Vec2, Circle, RadialGravityField, RadialGravityFieldGroup,
} from "../nape-js.esm.js?v=3.42.0";
import { drawBody, drawGrid, drawConstraints } from "../renderer.js?v=3.42.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.0";

// ===== module state =====
let _bodies = [];
let _trails = [];
let _fields = new RadialGravityFieldGroup();
let _G = 5000;
let _currentPreset = "figure8";
let _W = 900, _H = 500;
let _space = null;
let _stepCount = 0;

// Pixi state
let _lastStagePixi = null;
let _pixiTrailGfx = null;

// 3D state
let _THREE = null;
let _lastScene3d = null;
let _trails3d = [];   // [{ body, line, geometry, positions, colors, baseColor }]

const TRAIL_LEN = 80;

// Default body palette (matches docs/renderers/shared-colors and the CodePen
// runtime's MESH_COLORS / FILL_COLORS / COLORS arrays). Inlined so the demo
// doesn't depend on a helper that only exists in the docs/ build.
const _PALETTE_HEX = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];
function _bodyColorHex(body) {
  if (body.isStatic && body.isStatic()) return 0x607888;
  const idx = body.userData?._colorIdx ?? 0;
  return _PALETTE_HEX[idx % _PALETTE_HEX.length];
}

// ===== presets =====
// Each preset returns { G, bodies: [{ x, y, vx, vy, r, m, color }, ...] }.

// Chenciner–Montgomery (2000) periodic 3-body figure-8.
// Normalized initial conditions (G=m=1) scaled to viewport units.
function makeFigure8(W, H) {
  const cx = W / 2, cy = H / 2;
  const L = 180;
  const r = 12;
  const m = Math.PI * r * r;
  const G = 5000;
  const vScale = Math.sqrt(G * m / L);
  const px = 0.97000436, py = -0.24308753;
  const vx3 = -0.93240737, vy3 = -0.86473146;
  return {
    G,
    bodies: [
      { x: cx + px * L, y: cy + py * L, vx: -vx3 / 2 * vScale, vy: -vy3 / 2 * vScale, r, m, color: 0 },
      { x: cx - px * L, y: cy - py * L, vx: -vx3 / 2 * vScale, vy: -vy3 / 2 * vScale, r, m, color: 1 },
      { x: cx,          y: cy,          vx:  vx3     * vScale, vy:  vy3     * vScale, r, m, color: 2 },
    ],
  };
}

// Lagrange equilateral configuration: 3 equal masses at the vertices of an
// equilateral triangle, all rotating around the common centre at the same
// angular velocity. Unstable on long timescales but visually clean for ~minutes.
function makeLagrange(W, H) {
  const cx = W / 2, cy = H / 2;
  const R = 150;                                // circumradius
  const r = 12;
  const m = Math.PI * r * r;
  const G = 5000;
  // Net force on each body points toward origin with magnitude G·m²/(R²·√3).
  // Setting m·v²/R equal to that gives v = √(G·m/(R·√3)).
  const v = Math.sqrt(G * m / (R * Math.sqrt(3)));
  return {
    G,
    bodies: [0, 1, 2].map((i) => {
      const a = i * (2 * Math.PI / 3) - Math.PI / 2;
      return {
        x: cx + Math.cos(a) * R,
        y: cy + Math.sin(a) * R,
        vx: -Math.sin(a) * v,
        vy:  Math.cos(a) * v,
        r, m, color: i,
      };
    }),
  };
}

// Heavy central body + two light planets on different orbits. The two planets
// share a "sun" but interact gravitationally with each other too — the close
// approach periodically nudges their orbits, producing slow precession.
function makeSunPlanets(W, H) {
  const cx = W / 2, cy = H / 2;
  const G = 5000;
  const Rsun = 18;
  const Rp = 9;
  const Msun = Math.PI * Rsun * Rsun * 25;     // density 25 → dominant mass
  const Mp   = Math.PI * Rp   * Rp;
  const r1 = 110;
  const r2 = 200;
  const v1 = Math.sqrt(G * Msun / r1);
  const v2 = Math.sqrt(G * Msun / r2);
  const a2 = Math.PI * 0.7;                     // off-axis to add interaction
  // Recoil sun so net momentum is zero (system stays put on screen).
  const px = Mp * 0           + Mp * (-Math.sin(a2) * v2);
  const py = Mp * v1          + Mp * ( Math.cos(a2) * v2);
  return {
    G,
    bodies: [
      { x: cx, y: cy, vx: -px / Msun, vy: -py / Msun, r: Rsun, m: Msun, color: 3 },
      { x: cx + r1, y: cy, vx: 0, vy: v1, r: Rp, m: Mp, color: 0 },
      {
        x: cx + Math.cos(a2) * r2,
        y: cy + Math.sin(a2) * r2,
        vx: -Math.sin(a2) * v2,
        vy:  Math.cos(a2) * v2,
        r: Rp, m: Mp, color: 1,
      },
    ],
  };
}

// Random chaotic — 3 equal masses, random positions and velocities with the
// total momentum subtracted so the system stays roughly centred.
function makeChaos(W, H) {
  const cx = W / 2, cy = H / 2;
  const G = 5000;
  const r = 12;
  const m = Math.PI * r * r;
  const bodies = [];
  let totalVx = 0, totalVy = 0;
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 110;
    const vmag = 50 + Math.random() * 50;
    const va = Math.random() * Math.PI * 2;
    const vx = Math.cos(va) * vmag;
    const vy = Math.sin(va) * vmag;
    totalVx += vx;
    totalVy += vy;
    bodies.push({
      x: cx + Math.cos(a) * dist,
      y: cy + Math.sin(a) * dist,
      vx, vy, r, m, color: i,
    });
  }
  const avgVx = totalVx / 3, avgVy = totalVy / 3;
  for (const b of bodies) { b.vx -= avgVx; b.vy -= avgVy; }
  return { G, bodies };
}

const PRESETS = {
  "figure8":     makeFigure8,
  "lagrange":    makeLagrange,
  "sun-planets": makeSunPlanets,
  "chaos":       makeChaos,
};

const PRESET_LABELS = {
  "figure8":     "Figure-8 — Chenciner–Montgomery periodic orbit",
  "lagrange":    "Lagrange triangle — three equal masses, equilateral",
  "sun-planets": "Sun + 2 planets — quasi-Keplerian orbits",
  "chaos":       "Random chaos — sensitive to initial conditions",
};

// ===== body construction =====
// `removeOld` is true only when switching presets at runtime (same Space).
// On a fresh setup() the previous bodies belong to a Space that was already
// torn down by the runner, so we just drop the references.
function spawnPreset(space, W, H, name, { removeOld = false } = {}) {
  if (removeOld) {
    for (const b of _bodies) b.space = null;
  }
  _bodies = [];
  _trails = [];
  _fields.clear();
  _stepCount = 0;

  const preset = PRESETS[name](W, H);
  _G = preset.G;

  for (const def of preset.bodies) {
    const body = new Body(BodyType.DYNAMIC, new Vec2(def.x, def.y));
    body.shapes.add(new Circle(def.r));
    body.mass = def.m;
    body.velocity = new Vec2(def.vx, def.vy);
    body.userData._colorIdx = def.color;
    body.userData._radius = def.r;
    body.space = space;
    _bodies.push(body);
    _trails.push({
      x: new Float32Array(TRAIL_LEN),
      y: new Float32Array(TRAIL_LEN),
      idx: 0,
      count: 0,
    });
  }

  // Each body becomes a gravity source for the OTHER bodies. Newton's law
  // F = G·m_i·m_j/r² emerges naturally: strength = G·mass[i] and the default
  // scaleByMass: true contributes the m_j factor. The bodyFilter excludes
  // each body from being pulled by its own field.
  for (const source of _bodies) {
    _fields.add(new RadialGravityField({
      source,
      strength: _G * source.mass,
      softening: 25, // matches the original eps² to keep close passes stable
      bodyFilter: (b) => b !== source,
    }));
  }
}

export default {
  id: "three-body",
  label: "Three-Body Problem",
  tags: ["Zero Gravity", "Custom Force", "Orbital", "Chaos", "N-Body"],
  featured: true,
  featuredOrder: 6,
  desc: 'Three masses, mutual gravity, no closed-form solution. Switch between the famous <b>figure-8</b> orbit, the rotating <b>Lagrange triangle</b>, a sun + planets system, or pure <b>chaos</b>. <b>Click</b> a body to perturb it.',
  walls: false,
  moduleState: `let _bodies = [];
let _trails = [];
let _G = 5000;
let _currentPreset = "figure8";
let _W = 900, _H = 500;
let _space = null;
let _stepCount = 0;
const TRAIL_LEN = 80;`,

  setup(space, W, H) {
    _space = space;
    _W = W; _H = H;
    space.gravity = new Vec2(0, 0);
    spawnPreset(space, W, H, _currentPreset);
  },

  init(container) {
    if (container.querySelector(".three-body-presets")) return;
    const bar = document.createElement("div");
    bar.className = "three-body-presets";
    bar.style.cssText =
      "position:absolute;bottom:8px;left:8px;z-index:10;display:flex;gap:6px;flex-wrap:wrap;";
    bar.addEventListener("pointerdown", (e) => e.stopPropagation());

    const presets = [
      ["figure8",     "Figure-8"],
      ["lagrange",    "Triangle"],
      ["sun-planets", "Sun + Planets"],
      ["chaos",       "Chaos"],
    ];

    const refresh = () => {
      for (const b of bar.querySelectorAll("button")) {
        const active = b.dataset.preset === _currentPreset;
        b.style.background = active ? "rgba(88,166,255,0.25)" : "rgba(13,17,23,0.75)";
        b.style.borderColor = active ? "rgba(88,166,255,0.6)" : "rgba(255,255,255,0.12)";
        b.style.color = active ? "#fff" : "#c9d1d9";
      }
    };

    for (const [id, label] of presets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.dataset.preset = id;
      btn.style.cssText =
        "background:rgba(13,17,23,0.75);color:#c9d1d9;border:1px solid rgba(255,255,255,0.12);" +
        "padding:5px 10px;border-radius:5px;font:11px/1 system-ui;cursor:pointer;" +
        "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        _currentPreset = id;
        if (_space) spawnPreset(_space, _W, _H, id, { removeOld: true });
        refresh();
      });
      bar.appendChild(btn);
    }
    refresh();
    container.appendChild(bar);
  },

  step(space, W, H) {
    _stepCount++;

    // Pairwise gravity — one RadialGravityField per body, each pulling the
    // OTHERS toward itself. The field's softening prevents singularities in
    // close passes (chaotic preset). Replaces the manual N² force loop.
    // body.force is persistent across step()s — apply() *adds* to it, so
    // we have to clear each dynamic body's force first or it accumulates
    // unbounded and the orbits collapse.
    const n = _bodies.length;
    for (let i = 0; i < n; i++) _bodies[i].force = new Vec2(0, 0);
    _fields.apply(space);

    // Trail sampling — every other frame keeps the buffer covering more time.
    if (_stepCount % 2 === 0) {
      for (let i = 0; i < n; i++) {
        const t = _trails[i];
        t.x[t.idx] = _bodies[i].position.x;
        t.y[t.idx] = _bodies[i].position.y;
        t.idx = (t.idx + 1) % TRAIL_LEN;
        if (t.count < TRAIL_LEN) t.count++;
      }
    }

    // Auto-reset if a body is ejected far off-screen.
    for (const b of _bodies) {
      if (b.position.x < -W || b.position.x > 2 * W ||
          b.position.y < -H || b.position.y > 2 * H) {
        spawnPreset(space, W, H, _currentPreset);
        break;
      }
    }
  },

  click(x, y) {
    let best = null, bestD2 = Infinity;
    for (const b of _bodies) {
      const dx = b.position.x - x;
      const dy = b.position.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = b; }
    }
    if (!best) return;
    const dx = best.position.x - x;
    const dy = best.position.y - y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const kick = 80;
    best.velocity = new Vec2(
      best.velocity.x + dx / d * kick,
      best.velocity.y + dy / d * kick,
    );
  },

  render(ctx, space, W, H, showOutlines) {
    // Default scene scaffolding — same look as every other demo
    drawGrid(ctx, W, H, 0, 0);
    drawConstraints(ctx, space);

    // Trails — drawn under the bodies. Tapered: thin/transparent at the
    // oldest end, thick/opaque near the body. Colour matches the default
    // body palette.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < _bodies.length; i++) {
      const t = _trails[i];
      if (t.count < 2) continue;
      const hex = _bodyColorHex(_bodies[i]);
      ctx.strokeStyle = "#" + hex.toString(16).padStart(6, "0");
      const start = (t.idx - t.count + TRAIL_LEN) % TRAIL_LEN;
      for (let k = 1; k < t.count; k++) {
        const aIdx = (start + k - 1) % TRAIL_LEN;
        const bIdx = (start + k) % TRAIL_LEN;
        const u = k / t.count;
        ctx.globalAlpha = u * 0.425;
        ctx.lineWidth = 0.5 + u * 3.5;
        ctx.beginPath();
        ctx.moveTo(t.x[aIdx], t.y[aIdx]);
        ctx.lineTo(t.x[bIdx], t.y[bIdx]);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Bodies — default rendering (uses _colorIdx from userData)
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);

    // Caption
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "left";
    ctx.fillText(PRESET_LABELS[_currentPreset] ?? "", 12, 22);
  },

  render3dOverlay(ctx, space, W, H) {
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "left";
    ctx.fillText(PRESET_LABELS[_currentPreset] ?? "", 12, 22);
  },

  renderPixi(adapter, space, W, H) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    // Default body sprites (palette-coloured circles, matching every other demo)
    adapter.syncBodies(space);

    // Reset trail Graphics if the stage was swapped (e.g. adapter reattach)
    if (app.stage !== _lastStagePixi) {
      _pixiTrailGfx = null;
      _lastStagePixi = app.stage;
    }
    if (!_pixiTrailGfx) {
      _pixiTrailGfx = new PIXI.Graphics();
      // Insert trail under the body sprites so the bodies stay on top
      app.stage.addChildAt(_pixiTrailGfx, 0);
    }

    const trailGfx = _pixiTrailGfx;
    trailGfx.clear();
    for (let i = 0; i < _bodies.length; i++) {
      const t = _trails[i];
      if (t.count < 2) continue;
      const hex = _bodyColorHex(_bodies[i]);
      const start = (t.idx - t.count + TRAIL_LEN) % TRAIL_LEN;
      for (let k = 1; k < t.count; k++) {
        const aIdx = (start + k - 1) % TRAIL_LEN;
        const bIdx = (start + k) % TRAIL_LEN;
        const u = k / t.count;
        trailGfx
          .moveTo(t.x[aIdx], t.y[aIdx])
          .lineTo(t.x[bIdx], t.y[bIdx])
          .stroke({ color: hex, width: 0.5 + u * 3.5, alpha: u * 0.425 });
      }
    }

    app.render();
  },

  render3d(renderer, scene, camera, space, W, H, _cx, _cy, adapter) {
    // Reset trail meshes when the scene reference changes (adapter detach).
    if (scene !== _lastScene3d) {
      _trails3d = [];
      _lastScene3d = scene;
    }

    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    const T = _THREE;

    // Default body meshes (sphere per circle body, plus lighting/grid/etc.)
    // — same path the runner takes when no override is registered.
    // In docs/, the runner passes the adapter as the 9th arg; in CodePen,
    // the runtime exposes a global `syncBodies3D` instead.
    if (adapter?.syncBodies) {
      adapter.syncBodies(space);
    } else if (typeof globalThis !== "undefined" && typeof globalThis.syncBodies3D === "function") {
      globalThis.syncBodies3D(space);
    }

    // Reconcile trail Lines vs current bodies (presets swap them out wholesale).
    const liveBodies = new Set(_bodies);
    for (let i = _trails3d.length - 1; i >= 0; i--) {
      if (!liveBodies.has(_trails3d[i].body)) {
        const tr = _trails3d[i];
        scene.remove(tr.line);
        tr.line.geometry.dispose();
        tr.line.material.dispose();
        _trails3d.splice(i, 1);
      }
    }
    const tracked = new Set(_trails3d.map((tr) => tr.body));
    for (const body of _bodies) {
      if (tracked.has(body)) continue;
      const positions = new Float32Array(TRAIL_LEN * 3);
      const colors = new Float32Array(TRAIL_LEN * 3);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
      const line = new T.Line(
        geometry,
        new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45 }),
      );
      line.frustumCulled = false;
      scene.add(line);
      _trails3d.push({
        body, line, geometry, positions, colors,
        baseColor: new T.Color(_bodyColorHex(body)),
      });
    }

    // Update trail vertex positions + per-vertex colours every frame.
    // 2D coords map directly to (x, -y, 0) — the adapter camera looks at
    // (W/2, -H/2, 0) along -Z, same as every other 3D demo.
    for (const tr of _trails3d) {
      const idx = _bodies.indexOf(tr.body);
      if (idx === -1) continue;
      const t = _trails[idx];
      const start = (t.idx - t.count + TRAIL_LEN) % TRAIL_LEN;
      const padX = tr.body.position.x;
      const padY = -tr.body.position.y;
      for (let k = 0; k < TRAIL_LEN; k++) {
        const o = k * 3;
        if (k < t.count) {
          const ri = (start + k) % TRAIL_LEN;
          tr.positions[o]     = t.x[ri];
          tr.positions[o + 1] = -t.y[ri];
          tr.positions[o + 2] = 0;
          const u = k / Math.max(1, t.count - 1);
          tr.colors[o]     = tr.baseColor.r * u;
          tr.colors[o + 1] = tr.baseColor.g * u;
          tr.colors[o + 2] = tr.baseColor.b * u;
        } else {
          tr.positions[o]     = padX;
          tr.positions[o + 1] = padY;
          tr.positions[o + 2] = 0;
          tr.colors[o] = tr.colors[o + 1] = tr.colors[o + 2] = 0;
        }
      }
      tr.geometry.attributes.position.needsUpdate = true;
      tr.geometry.attributes.color.needsUpdate = true;
      tr.geometry.setDrawRange(0, Math.max(2, t.count));
    }

    renderer.render(scene, camera);
  },
};
