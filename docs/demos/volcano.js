import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  RadialGravityField, ParticleEmitter,
} from "../nape-js.esm.js?v=3.40.0";
import { drawBody } from "../renderer.js?v=3.40.0";

// (Polygon is used for the volcano cone shape on top of the planet.)

// Physics-aware particle showcase: a planet with its own gravity well, a
// volcano emitting lava drops upward in a 40-degree cone — the radial
// field pulls every drop back, drops collide with rocky debris on the
// surface and sometimes settle into a pile. Click anywhere to detonate
// a 60-particle burst at the cursor.

const PLANET_X = 450;
const PLANET_Y = 320;
const PLANET_R = 90;
const FIELD_STRENGTH = 1100;
const FIELD_MAX = 380;

const VENT_OFFSET = -PLANET_R - 18; // sits just above the volcano cone opening
const VENT_DIR = -Math.PI / 2;     // straight up
const VENT_HALF_CONE = Math.PI / 5; // ±36°
// Volcano cone (decorative + collidable) — sits on top of the planet.
const CONE_BASE_HALF = 26;
const CONE_TOP_HALF = 10;
const CONE_BASE_Y = -PLANET_R * 0.95; // slightly inside planet so they merge
const CONE_TOP_Y = -PLANET_R - 16;    // tip just below the vent emit point

const DT = 1 / 60;

let _planet = null;
let _coneVerts = null;   // local-space vertices for the volcano cone trapezoid
let _field = null;
let _emitter = null;
let _burstEmitter = null;
let _debris = [];
let _pendingBurst = null;

function lavaColor(age, lifetime) {
  // Yellow → orange → red → black-red, roughly mapped to age/lifetime.
  const t = Math.min(1, age / lifetime);
  if (t < 0.25) {
    const k = t / 0.25;
    return `rgb(${255}, ${230 - 90 * k}, ${80 - 60 * k})`;
  }
  if (t < 0.7) {
    const k = (t - 0.25) / 0.45;
    return `rgb(${255 - 80 * k}, ${140 - 100 * k}, ${20})`;
  }
  const k = Math.min(1, (t - 0.7) / 0.3);
  return `rgb(${175 - 130 * k}, ${40 - 35 * k}, ${20 - 20 * k})`;
}

export default {
  id: "volcano",
  label: "Volcano",
  featured: true,
  featuredOrder: 8,
  tags: ["ParticleEmitter", "RadialGravityField", "Particles"],
  desc:
    "Physics-aware particles. A vent fires lava drops upward in a 40-degree cone; a <b>RadialGravityField</b> pulls every drop back to the planet, where it collides with the rocky debris on the surface. <b>Click</b> to detonate a 60-particle burst at the cursor — sparks bounce off the world like any other dynamic body. ~600 live particles at 60 FPS.",
  walls: false,

  setup(space, _W, _H) {
    space.gravity = new Vec2(0, 0); // only the radial field matters
    _pendingBurst = null;

    // ---- Planet + volcano cone (single static body, two shapes) ----
    _planet = new Body(BodyType.STATIC, new Vec2(PLANET_X, PLANET_Y));
    _planet.shapes.add(new Circle(PLANET_R, undefined, new Material(0.1, 0.7, 0.9, 1)));
    // Volcano cone — convex trapezoid on top of the planet.
    _coneVerts = [
      new Vec2(-CONE_BASE_HALF, CONE_BASE_Y),
      new Vec2(-CONE_TOP_HALF, CONE_TOP_Y),
      new Vec2(CONE_TOP_HALF, CONE_TOP_Y),
      new Vec2(CONE_BASE_HALF, CONE_BASE_Y),
    ];
    _planet.shapes.add(new Polygon(_coneVerts, new Material(0.05, 0.7, 0.9, 1)));
    try { _planet.userData._colorIdx = 4; } catch (_) {}
    _planet.space = space;

    // ---- Radial gravity field (Newtonian-ish, softened near the centre) ----
    _field = new RadialGravityField({
      source: _planet,
      strength: FIELD_STRENGTH,
      falloff: "inverse",
      scaleByMass: false,    // direct accel — easier to tune
      maxRadius: FIELD_MAX,
      minRadius: PLANET_R + 4,
      softening: 200,
    });

    // ---- Surface debris (small dynamic boulders the lava can collide with) ----
    _debris = [];
    let seed = 4242;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const debrisCount = 40;
    for (let i = 0; i < debrisCount; i++) {
      // Avoid spawning near the vent (top) so emitter has clear airspace.
      let ang = rng() * Math.PI * 2;
      while (Math.abs(((ang + Math.PI / 2 + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.4) {
        ang = rng() * Math.PI * 2;
      }
      const r = PLANET_R + 4 + rng() * 6;
      const x = PLANET_X + Math.cos(ang) * r;
      const y = PLANET_Y + Math.sin(ang) * r;
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      const radius = 4 + rng() * 4;
      body.shapes.add(new Circle(radius, undefined, new Material(0.1, 0.6, 0.9, 1.4)));
      body.space = space;
      try { body.userData._colorIdx = (i % 3) + 1; } catch (_) {}
      _debris.push(body);
    }

    // ---- Continuous lava emitter ----
    const ventX = PLANET_X;
    const ventY = PLANET_Y + VENT_OFFSET;
    _emitter = new ParticleEmitter({
      space,
      origin: new Vec2(ventX, ventY),
      spawn: { kind: "arc", radius: 6, angleStart: -Math.PI, angleEnd: 0 },
      velocity: {
        kind: "cone",
        direction: VENT_DIR,
        spread: VENT_HALF_CONE,
        speedMin: 320,
        speedMax: 520,
      },
      rate: 90,
      maxParticles: 600,
      lifetimeMin: 4,
      lifetimeMax: 7,
      particleRadius: 2.5,
      particleMaterial: new Material(0.05, 0.4, 0.6, 0.6),
      // Don't let lava drops collide with each other (would lock the cone
      // into a chunky stream). They still collide with the planet + debris.
      selfCollision: false,
    });

    // ---- Click-to-burst emitter ----
    _burstEmitter = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0), // moved on click
      velocity: {
        kind: "radial",
        speedMin: 200,
        speedMax: 480,
      },
      maxParticles: 200,
      lifetimeMin: 0.6,
      lifetimeMax: 1.4,
      particleRadius: 2,
      particleMaterial: new Material(0.6, 0.4, 0.8, 0.4),
      selfCollision: false,
    });

  },

  click(x, y) {
    _pendingBurst = { x, y };
  },

  cleanup() {
    if (_emitter) { _emitter.destroy(); _emitter = null; }
    if (_burstEmitter) { _burstEmitter.destroy(); _burstEmitter = null; }
    _pendingBurst = null;
    _planet = null;
    _coneVerts = null;
    _field = null;
    _debris = [];
  },

  step(space, _W, _H) {
    // ---- 1) Click burst ----
    if (_pendingBurst && _burstEmitter) {
      const { x, y } = _pendingBurst;
      _pendingBurst = null;
      if (_burstEmitter.origin instanceof Vec2) {
        _burstEmitter.origin.x = x;
        _burstEmitter.origin.y = y;
      } else {
        _burstEmitter.origin = new Vec2(x, y);
      }
      _burstEmitter.emit(60);
    }

    // ---- 2) Clear forces, apply field, advance emitters ----
    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      if (b.isDynamic()) b.force = new Vec2(0, 0);
    }
    if (_field) _field.apply(space);
    if (_emitter) _emitter.update(DT);
    if (_burstEmitter) _burstEmitter.update(DT);
  },

  render(ctx, space, W, H) {
    ctx.save();
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // Draw the radial field's max-radius ring.
    ctx.strokeStyle = "rgba(255,170,40,0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(PLANET_X, PLANET_Y, FIELD_MAX, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Planet (circle + volcano cone, both rendered as one body).
    drawBody(ctx, _planet, false);

    // Glowing crater opening at the cone's tip.
    const craterX = PLANET_X;
    const craterY = PLANET_Y + CONE_TOP_Y;
    const grad = ctx.createRadialGradient(craterX, craterY, 0, craterX, craterY, CONE_TOP_HALF * 2.2);
    grad.addColorStop(0, "rgba(255, 200, 80, 0.95)");
    grad.addColorStop(0.4, "rgba(230, 90, 30, 0.55)");
    grad.addColorStop(1, "rgba(140, 30, 10, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(craterX, craterY, CONE_TOP_HALF * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Debris.
    for (const d of _debris) drawBody(ctx, d, false);

    // Particles — coloured by age.
    if (_emitter) {
      const live = _emitter.active;
      const ages = _emitter.ages;
      const lts = _emitter.lifetimes;
      ctx.strokeStyle = "rgba(20,10,5,0.4)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < live.length; i++) {
        const b = live[i];
        ctx.fillStyle = lavaColor(ages[i], lts[i]);
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, _emitter.particleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Burst sparks (cyan-white).
    if (_burstEmitter) {
      const live = _burstEmitter.active;
      const ages = _burstEmitter.ages;
      const lts = _burstEmitter.lifetimes;
      for (let i = 0; i < live.length; i++) {
        const b = live[i];
        const t = Math.min(1, ages[i] / lts[i]);
        const a = (1 - t).toFixed(2);
        ctx.fillStyle = `rgba(180,220,255,${a})`;
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, _burstEmitter.particleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawHUD(ctx, W, H, _emitter, _burstEmitter);
    ctx.restore();
  },

  render3dOverlay(ctx, _space, W, H) {
    drawHUD(ctx, W, H, _emitter, _burstEmitter);
  },
};

function drawHUD(ctx, _W, _H, lava, burst) {
  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.7)";
  ctx.fillRect(8, 8, 220, 44);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(
    `Lava:  ${lava ? lava.active.length : 0} live (pool ${lava ? lava.poolSize : 0})`,
    16,
    24,
  );
  ctx.fillText(
    `Burst: ${burst ? burst.active.length : 0} live — click to fire`,
    16,
    42,
  );
  ctx.restore();
}

