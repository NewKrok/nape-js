import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid, drawConstraints } from "../renderer.js?v=3.41.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.41.0";

// Popcorn — side-view bowl full of corn kernels that suddenly grow and
// pop upward. Each pop is a runtime `circle.radius =` mutation plus an
// upward impulse + spin. The bowl is KINEMATIC and given a brief shake
// velocity on every pop so it physically jiggles. The whole canvas
// also screen-shakes via the runner's built-in shakeCamera() helper.

const KERNEL_COUNT = 200;
// Pop rate over time — real popcorn ramps up: a quiet warm-up, a few first
// pops, then a rolling boil, then it tails off as the kernels run out.
// PEAK_RATE is reached around t ≈ START_DELAY + RAMP_DURATION.
const PRE_HEAT_DELAY = 1.0;      // seconds of total silence after setup
const RAMP_DURATION  = 6.0;      // seconds from first pop to peak rate
const PEAK_RATE      = 28;       // expected pops/sec at the peak
const POPPED_RADIUS_MIN = 8;
const POPPED_RADIUS_MAX = 13;
const KERNEL_RADIUS_MIN = 2.6;
const KERNEL_RADIUS_MAX = 3.6;
const RESTART_DELAY = 4.0;       // seconds after last kernel pops before auto-reset

// Bowl interior bounds (local-space, around _bowl.position). Kernels
// inside this rectangle — or anywhere inside the flame zone below the
// bowl — are eligible to pop. Once a kernel leaves both heat sources it
// just falls back down without popping again.
const BOWL_HALF_W = 230;
const BOWL_WALL_H = 110;
const BOWL_INNER_MARGIN = 30;
const BOWL_FLOOR_THICK = 14;

// Flame zone (world-space relative to the bowl). Matches the visible
// flame in the renderer so kernels that get knocked out and land in the
// fire pop too.
const FLAME_OFFSET_Y = 70;
const FLAME_RADIUS = 110;

const DT = 1 / 60;

let _bowl = null;
let _bowlAnchorX = 0;
let _bowlAnchorY = 0;
let _bowlVibT = 0;       // seconds of vibration remaining
let _bowlVibAmp = 0;     // px peak
let _kernels = [];       // {body, popped, popTime, baseR, finalR, scaleT}
let _sparks = [];        // pure decorative {x, y, age, lifetime, vx, vy}
let _flameT = 0;         // animation phase
let _restartT = 0;       // counts up after all popped
let _now = 0;
let _poppedCount = 0;

// 3D state (Three.js)
let _THREE = null;
let _flameMesh3d = null;
let _flameScene = null;
let _kernelMeshes3d = new Map(); // body -> THREE.Mesh, built at baseR

// Pixi state
let _pixiOverlay = null;
let _lastStagePixi = null;

function rand(a, b) { return a + Math.random() * (b - a); }

function makeKernel(space, x, y) {
  const r = rand(KERNEL_RADIUS_MIN, KERNEL_RADIUS_MAX);
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // Low density so pops launch them easily, mid-low restitution so they
  // settle in the bowl instead of bouncing forever.
  body.shapes.add(new Circle(r, undefined, new Material(0.35, 0.4, 0.5, 0.4)));
  body.space = space;
  const entry = {
    body,
    popped: false,
    popTime: 0,
    baseR: r,
    finalR: rand(POPPED_RADIUS_MIN, POPPED_RADIUS_MAX),
    scaleT: 0, // 0..1 visual scale-in after popping
  };
  try {
    body.userData._isKernel = true;
    body.userData._kernelEntry = entry;
    // Hide from the default Three.js adapter — we build our own kernel
    // meshes at baseR and scale them as the kernel pops, so the mesh
    // dimension stays in sync with our scale factor regardless of the
    // current physics radius.
    body.userData._hidden3d = true;
  } catch (_) {}
  return entry;
}

function buildBowl(space, W, H) {
  const cx = W * 0.5;
  const cy = H * 0.78;
  _bowlAnchorX = cx;
  _bowlAnchorY = cy;

  // Bowl shape: trapezoid floor + two slanted side walls. Built as one
  // KINEMATIC body so we can vibrate it without gravity acting on it.
  _bowl = new Body(BodyType.KINEMATIC, new Vec2(cx, cy));

  const halfW = BOWL_HALF_W;
  const wallH = BOWL_WALL_H;
  const floorThick = BOWL_FLOOR_THICK;

  // Floor (slightly curved feel via a wide thin polygon)
  _bowl.shapes.add(new Polygon(Polygon.box(halfW * 2 - 30, floorThick), undefined,
    new Material(0.05, 0.6, 0.8, 1)));

  // Left wall — slanted outward at the top
  const leftWall = [
    new Vec2(-halfW + 16, -wallH),
    new Vec2(-halfW + 16 + 10, -wallH),
    new Vec2(-halfW + 30, floorThick / 2),
    new Vec2(-halfW + 16, floorThick / 2),
  ];
  _bowl.shapes.add(new Polygon(leftWall, undefined, new Material(0.05, 0.6, 0.8, 1)));

  // Right wall — mirror
  const rightWall = [
    new Vec2(halfW - 16 - 10, -wallH),
    new Vec2(halfW - 16, -wallH),
    new Vec2(halfW - 16, floorThick / 2),
    new Vec2(halfW - 30, floorThick / 2),
  ];
  _bowl.shapes.add(new Polygon(rightWall, undefined, new Material(0.05, 0.6, 0.8, 1)));

  try { _bowl.userData._colorIdx = 4; } catch (_) {}
  _bowl.space = space;
}

function isInBowl(body) {
  const dx = body.position.x - _bowl.position.x;
  const dy = body.position.y - _bowl.position.y;
  return (
    dx > -BOWL_HALF_W + BOWL_INNER_MARGIN &&
    dx < BOWL_HALF_W - BOWL_INNER_MARGIN &&
    dy > -BOWL_WALL_H &&
    dy < BOWL_FLOOR_THICK / 2
  );
}

function isOnFire(body) {
  const dx = body.position.x - _bowl.position.x;
  const dy = body.position.y - (_bowl.position.y + FLAME_OFFSET_Y);
  return dx * dx + dy * dy < FLAME_RADIUS * FLAME_RADIUS;
}

function isHot(body) {
  return isInBowl(body) || isOnFire(body);
}

function popKernel(k) {
  if (k.popped) return;
  k.popped = true;
  k.popTime = _now;
  k.scaleT = 0;
  // Mutate the underlying physics radius so collision actually grows.
  const shape = k.body.shapes.at(0);
  shape.radius = k.finalR;
  // Upward impulse with a sideways scatter, plus spin for visual flair.
  k.body.applyImpulse(new Vec2(rand(-25, 25), rand(-150, -230)));
  k.body.angularVelocity = rand(-8, 8);
  _poppedCount++;
}

function triggerBowlShake(amp = 4) {
  _bowlVibAmp = Math.max(_bowlVibAmp, amp);
  _bowlVibT = Math.max(_bowlVibT, 0.18);
}

function emitSparks(x, y) {
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(60, 180);
    _sparks.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 80,
      age: 0,
      lifetime: rand(0.18, 0.32),
    });
  }
}

export default {
  id: "popcorn",
  label: "Popcorn",
  tags: ["Dynamic Resize", "Impulse", "Kinematic", "Effects"],
  desc:
    "200 kernels rest in a hot bowl. While they sit on the heat, each one suddenly <b>grows</b> (its <code>Circle.radius</code> is mutated at runtime), gets a small upward kick and spin, then fluffs into a popcorn cloud. Kernels pop while they're inside the bowl <i>or</i> after they tumble out into the flame below it — anywhere else they just fall harmlessly back down. The kinematic bowl jiggles on every pop and the camera shakes with it.",
  walls: true,
  noCodePen: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 900);
    _kernels = [];
    _sparks = [];
    _bowlVibT = 0;
    _bowlVibAmp = 0;
    _flameT = 0;
    _restartT = 0;
    _now = 0;
    _poppedCount = 0;

    buildBowl(space, W, H);

    // Spawn kernels piled inside the bowl.
    const cx = _bowlAnchorX;
    const cy = _bowlAnchorY;
    for (let i = 0; i < KERNEL_COUNT; i++) {
      const x = cx + rand(-180, 180);
      const y = cy - 10 - Math.random() * 90;
      _kernels.push(makeKernel(space, x, y));
    }
  },

  cleanup() {
    _bowl = null;
    _kernels = [];
    _sparks = [];
    if (_flameMesh3d && _flameScene) {
      _flameScene.remove(_flameMesh3d);
      _flameMesh3d.geometry?.dispose?.();
      _flameMesh3d.material?.dispose?.();
    }
    _flameMesh3d = null;
    if (_flameScene) {
      for (const mesh of _kernelMeshes3d.values()) {
        _flameScene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      }
    }
    _kernelMeshes3d.clear();
    _flameScene = null;
    if (_pixiOverlay) {
      _pixiOverlay.parent?.removeChild(_pixiOverlay);
      _pixiOverlay.destroy?.({ children: true });
    }
    _pixiOverlay = null;
    _lastStagePixi = null;
  },

  step(space, W, H) {
    _now += DT;
    _flameT += DT;

    // ---- 1) Random pops — kernels in the bowl OR in the flame below it ----
    // Rate ramps over time: silent for PRE_HEAT_DELAY, then a smooth
    // ease-in over RAMP_DURATION up to PEAK_RATE pops/sec, then naturally
    // tails off as the unpopped pool shrinks.
    const remaining = KERNEL_COUNT - _poppedCount;
    if (remaining > 0 && _now >= PRE_HEAT_DELAY) {
      const eligible = [];
      for (const k of _kernels) {
        if (!k.popped && isHot(k.body)) eligible.push(k);
      }
      if (eligible.length > 0) {
        const t = Math.min(1, (_now - PRE_HEAT_DELAY) / RAMP_DURATION);
        const ramp = t * t * (3 - 2 * t); // smoothstep
        const currentRate = PEAK_RATE * ramp;
        const expected = currentRate * DT * (eligible.length / KERNEL_COUNT);
        let popsThisFrame = 0;
        let acc = expected;
        while (acc > 0) {
          if (Math.random() < Math.min(acc, 1)) popsThisFrame++;
          acc -= 1;
        }
        for (let i = 0; i < popsThisFrame && eligible.length > 0; i++) {
          const idx = Math.floor(Math.random() * eligible.length);
          const k = eligible.splice(idx, 1)[0];
          popKernel(k);
          emitSparks(k.body.position.x, k.body.position.y);
          triggerBowlShake(rand(2.5, 4.5));
          this._runner?.shakeCamera?.(rand(1.5, 2.6), 0.14);
        }
      }
    }
    if (remaining === 0) {
      // All popped — auto-restart after a short pause.
      _restartT += DT;
      if (_restartT > RESTART_DELAY) {
        // Remove all kernels and rebuild the pile.
        for (const k of _kernels) {
          if (k.body.space) k.body.space = null;
        }
        _kernels = [];
        _poppedCount = 0;
        _restartT = 0;
        const cx = _bowlAnchorX;
        const cy = _bowlAnchorY;
        for (let i = 0; i < KERNEL_COUNT; i++) {
          const x = cx + rand(-180, 180);
          const y = cy - 10 - Math.random() * 90;
          _kernels.push(makeKernel(space, x, y));
        }
      }
    }

    // ---- 2) Bowl vibration (kinematic — set position directly) ----
    if (_bowlVibT > 0) {
      _bowlVibT = Math.max(0, _bowlVibT - DT);
      const t = _bowlVibT / 0.18; // 1 → 0
      const amp = _bowlVibAmp * t;
      const ox = (Math.random() - 0.5) * 2 * amp;
      const oy = (Math.random() - 0.5) * 2 * amp;
      _bowl.position = new Vec2(_bowlAnchorX + ox, _bowlAnchorY + oy);
      if (_bowlVibT === 0) {
        _bowl.position = new Vec2(_bowlAnchorX, _bowlAnchorY);
        _bowlVibAmp = 0;
      }
    }

    // ---- 3) Visual scale-in for popped kernels (decorative only) ----
    for (const k of _kernels) {
      if (k.popped && k.scaleT < 1) {
        k.scaleT = Math.min(1, k.scaleT + DT * 12); // ~80ms ease-in
      }
    }

    // ---- 4) Sparks ----
    for (let i = _sparks.length - 1; i >= 0; i--) {
      const s = _sparks[i];
      s.age += DT;
      s.x += s.vx * DT;
      s.y += s.vy * DT;
      s.vy += 600 * DT;
      if (s.age >= s.lifetime) _sparks.splice(i, 1);
    }
  },

  render(ctx, space, W, H, showOutlines) {
    // Default background grid — same look as the rest of the demos.
    drawGrid(ctx, W, H);

    // ---- Flame under the bowl (custom decorative graphic) ----
    const flameCx = _bowl.position.x;
    const flameCy = _bowl.position.y + 70;
    const flameFlick = 1 + Math.sin(_flameT * 38) * 0.06 + Math.sin(_flameT * 17) * 0.04;
    const flameW = 240 * flameFlick;
    const flameH = 80 * flameFlick;
    const flameGrad = ctx.createRadialGradient(flameCx, flameCy, 0, flameCx, flameCy, flameW);
    flameGrad.addColorStop(0, "rgba(255, 230, 120, 0.85)");
    flameGrad.addColorStop(0.35, "rgba(255, 140, 40, 0.55)");
    flameGrad.addColorStop(0.7, "rgba(220, 50, 20, 0.25)");
    flameGrad.addColorStop(1, "rgba(120, 20, 10, 0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.ellipse(flameCx, flameCy, flameW, flameH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Default rendering for everything that isn't a kernel/bowl (walls,
    // any constraints we ever add).
    drawConstraints(ctx, space);
    for (const body of space.bodies) {
      if (body === _bowl) continue;
      if (body.userData && body.userData._isKernel) continue;
      drawBody(ctx, body, showOutlines);
    }

    // ---- Bowl (custom: keep default fill but draw it ourselves so it
    // sits above the flame glow) ----
    drawBody(ctx, _bowl, showOutlines);

    // ---- Kernels ----
    for (const k of _kernels) {
      const p = k.body.position;
      if (!k.popped) {
        // Raw kernel — golden-amber circle.
        ctx.fillStyle = "#d8a23a";
        ctx.strokeStyle = "rgba(40,20,5,0.6)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, k.baseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tiny darker dot for kernel texture
        ctx.fillStyle = "rgba(80,40,10,0.5)";
        ctx.beginPath();
        ctx.arc(p.x - k.baseR * 0.3, p.y - k.baseR * 0.3, k.baseR * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Popped — fluffy multi-lobe cloud, scaled in.
        const ease = k.scaleT * (2 - k.scaleT); // ease-out quadratic
        const r = k.finalR * ease;
        const ang = k.body.rotation;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        // Lobes — 4 overlapping circles around center + 1 in middle
        const lobeR = r * 0.7;
        const lobeOff = r * 0.55;
        ctx.fillStyle = "#fff6dc";
        ctx.strokeStyle = "rgba(180,130,60,0.55)";
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const lx = Math.cos(a) * lobeOff;
          const ly = Math.sin(a) * lobeOff;
          ctx.beginPath();
          ctx.arc(lx, ly, lobeR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, lobeR * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Buttery-yellow tint patch
        ctx.fillStyle = "rgba(255, 210, 100, 0.45)";
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.25, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ---- Sparks ----
    for (const s of _sparks) {
      const a = 1 - s.age / s.lifetime;
      ctx.fillStyle = `rgba(255, 240, 200, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2 * a + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- HUD ----
    ctx.fillStyle = "rgba(13,7,5,0.7)";
    ctx.fillRect(8, 8, 220, 44);
    ctx.fillStyle = "#ffe7b8";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(`Popped: ${_poppedCount} / ${KERNEL_COUNT}`, 16, 26);
    const remaining = KERNEL_COUNT - _poppedCount;
    if (remaining === 0) {
      ctx.fillStyle = "#c9a06b";
      ctx.fillText(`restarting in ${(RESTART_DELAY - _restartT).toFixed(1)}s…`, 16, 44);
    }
  },

  // ---------------------------------------------------------------------------
  // Three.js — additive override: keep default body meshes, but rescale the
  // kernel spheres at runtime so the pop is visible, recolour popped ones to
  // creamy white, and add a glowing flame sphere under the bowl.
  // ---------------------------------------------------------------------------

  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter = null) {
    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    const T = _THREE;

    // Reset cached scene refs if the scene reference changed (adapter detach).
    if (_flameScene !== scene) {
      if (_flameMesh3d && _flameScene) _flameScene.remove(_flameMesh3d);
      _flameMesh3d = null;
      for (const mesh of _kernelMeshes3d.values()) {
        if (_flameScene) _flameScene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      }
      _kernelMeshes3d.clear();
      _flameScene = scene;
    }

    // Camera follows world-space camera offset (matches the default path).
    if (camX || camY) {
      const camZ = camera.position.z;
      camera.position.set(W / 2 + camX, -H / 2 - camY, camZ);
      camera.lookAt(W / 2 + camX, -H / 2 - camY, 0);
    }

    // Default sync — handles walls + bowl. Kernel bodies are `_hidden3d`,
    // so the adapter skips them; we own their meshes below.
    adapter?.syncBodies?.(space);

    // ---- Kernel meshes — built at baseR, scaled visually at runtime ----
    const aliveKernels = new Set();
    for (const k of _kernels) aliveKernels.add(k.body);

    // Drop meshes for kernels that no longer exist (e.g. after restart).
    for (const [body, mesh] of _kernelMeshes3d) {
      if (!aliveKernels.has(body)) {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
        _kernelMeshes3d.delete(body);
      }
    }

    // Build / sync per-kernel meshes.
    for (const k of _kernels) {
      let mesh = _kernelMeshes3d.get(k.body);
      if (!mesh) {
        const geom = new T.SphereGeometry(k.baseR, 14, 12);
        const mat = new T.MeshPhongMaterial({
          color: 0xd69d38,
          shininess: 60,
          specular: 0x553311,
        });
        mesh = new T.Mesh(geom, mat);
        scene.add(mesh);
        _kernelMeshes3d.set(k.body, mesh);
      }
      mesh.position.set(k.body.position.x, -k.body.position.y, 0);
      mesh.rotation.z = -k.body.rotation;
      if (k.popped) {
        const ease = k.scaleT * (2 - k.scaleT);
        const targetR = k.baseR + (k.finalR - k.baseR) * ease;
        mesh.scale.setScalar(targetR / k.baseR);
        mesh.material.color.setRGB(1.0, 0.96, 0.85); // creamy white
      } else {
        mesh.scale.setScalar(1);
        mesh.material.color.setRGB(0.84, 0.62, 0.22); // golden amber
      }
    }

    // ---- Flame — emissive sphere that flickers under the bowl ----
    if (!_flameMesh3d) {
      const geom = new T.SphereGeometry(40, 24, 16);
      const mat = new T.MeshBasicMaterial({
        color: 0xff7820,
        transparent: true,
        opacity: 0.55,
      });
      _flameMesh3d = new T.Mesh(geom, mat);
      scene.add(_flameMesh3d);
    }
    const flick = 1 + Math.sin(_flameT * 38) * 0.08 + Math.sin(_flameT * 17) * 0.05;
    _flameMesh3d.position.set(_bowl.position.x, -(_bowl.position.y + 70), -10);
    _flameMesh3d.scale.set(2.4 * flick, 0.9 * flick, 1.2);

    renderer.render(scene, camera);
  },

  render3dOverlay(ctx, _space, _W, _H) {
    drawHUD(ctx);
  },

  // ---------------------------------------------------------------------------
  // PixiJS — additive override: keep default body sprites, then overlay
  // popcorn cumulus graphics on popped kernels (the default debug-draw cache
  // doesn't repaint when Circle.radius mutates, so we paint the puffs on
  // top using the live radius), and a flame glow under the bowl.
  // ---------------------------------------------------------------------------

  renderPixi(adapter, space, W, H, showOutlines, camX = 0, camY = 0) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    // Camera follow (mirrors default adapter path).
    app.stage.position.set(-camX, -camY);

    // Default body rendering — walls + bowl. Kernels get drawn by us below
    // (the default debug-draw cache doesn't repaint on Circle.radius
    // mutations, so we own the kernel visuals to keep them in sync).
    adapter.syncBodies(space);

    // Lazy-create the overlay Graphics layer above the default debug layer.
    if (app.stage !== _lastStagePixi || !_pixiOverlay) {
      if (_pixiOverlay) {
        _pixiOverlay.parent?.removeChild(_pixiOverlay);
        _pixiOverlay.destroy?.({ children: true });
      }
      _pixiOverlay = new PIXI.Graphics();
      app.stage.addChild(_pixiOverlay);
      _lastStagePixi = app.stage;
    }

    const gfx = _pixiOverlay;
    gfx.clear();

    // ---- Flame — many thin translucent rings to fake a radial gradient.
    const flameCx = _bowl.position.x;
    const flameCy = _bowl.position.y + 70;
    const flick = 1 + Math.sin(_flameT * 38) * 0.06 + Math.sin(_flameT * 17) * 0.04;
    const flameLayers = 14;
    const flameRMax = 130 * flick;
    for (let i = flameLayers - 1; i >= 0; i--) {
      const t = i / (flameLayers - 1); // 0 at center, 1 at edge
      const r = flameRMax * (0.15 + t * 0.85);
      let color, alpha;
      if (t < 0.25) {
        color = 0xffe678;
        alpha = 0.18;
      } else if (t < 0.55) {
        color = 0xff8c28;
        alpha = 0.13;
      } else if (t < 0.8) {
        color = 0xdc3214;
        alpha = 0.09;
      } else {
        color = 0x781410;
        alpha = 0.06;
      }
      gfx.circle(flameCx, flameCy, r).fill({ color, alpha });
    }

    // ---- Kernels ----
    for (const k of _kernels) {
      const p = k.body.position;
      if (!k.popped) {
        // Raw kernel — golden amber circle with darker outline + texture dot.
        gfx.circle(p.x, p.y, k.baseR).fill({ color: 0xd8a23a });
        if (showOutlines) {
          gfx.circle(p.x, p.y, k.baseR).stroke({ color: 0x281405, width: 0.8, alpha: 0.7 });
        }
        gfx.circle(p.x - k.baseR * 0.3, p.y - k.baseR * 0.3, k.baseR * 0.25)
          .fill({ color: 0x50280a, alpha: 0.5 });
      } else {
        // Popped — fluffy 4-lobe cumulus, scaled in.
        const ease = k.scaleT * (2 - k.scaleT);
        const r = k.finalR * ease;
        const ang = k.body.rotation;
        const lobeR = r * 0.7;
        const lobeOff = r * 0.55;
        const outlineColor = 0xb48238;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + ang;
          const lx = p.x + Math.cos(a) * lobeOff;
          const ly = p.y + Math.sin(a) * lobeOff;
          gfx.circle(lx, ly, lobeR).fill({ color: 0xfff6dc });
          if (showOutlines) {
            gfx.circle(lx, ly, lobeR).stroke({ color: outlineColor, width: 0.8, alpha: 0.55 });
          }
        }
        gfx.circle(p.x, p.y, lobeR * 0.95).fill({ color: 0xfff6dc });
        if (showOutlines) {
          gfx.circle(p.x, p.y, lobeR * 0.95).stroke({ color: outlineColor, width: 0.8, alpha: 0.55 });
        }
        // Buttery yellow tint patch.
        gfx.circle(p.x - r * 0.2, p.y - r * 0.25, r * 0.5)
          .fill({ color: 0xffd264, alpha: 0.45 });
      }
    }

    app.render();
  },
};

function drawHUD(ctx) {
  ctx.fillStyle = "rgba(13,7,5,0.7)";
  ctx.fillRect(8, 8, 220, 44);
  ctx.fillStyle = "#ffe7b8";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`Popped: ${_poppedCount} / ${KERNEL_COUNT}`, 16, 26);
  const remaining = KERNEL_COUNT - _poppedCount;
  if (remaining === 0) {
    ctx.fillStyle = "#c9a06b";
    ctx.fillText(`restarting in ${(RESTART_DELAY - _restartT).toFixed(1)}s…`, 16, 44);
  }
}
