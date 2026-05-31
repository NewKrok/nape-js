import { Body, BodyType, Vec2, Polygon } from "../nape-js.esm.js";

// Exploding "50" — a celebration demo for the project's 50th GitHub star.
// The number "50" is spelled out of a grid of solid square blocks, each a
// real dynamic Body sitting still in formation. After a short "charge-up"
// (a building camera shake) the formation detonates: a radial impulse from
// the blast center launches every block outward, they tumble, collide with
// each other and the arena walls, and pile up on the floor — then the "50"
// re-assembles and detonates again, forever.
//
// Blocks that take a hard hit shatter: when a block's blast (or collision)
// impulse exceeds a threshold it is replaced, at runtime, by four smaller
// squares carrying its velocity — a cheap deterministic fracture that shows
// off live body swapping during simulation.
//
// What it demonstrates: many-body rigid collision (hundreds of convex
// polygons interacting), radial impulse application, runtime body fracture,
// and the engine settling a chaotic pile back to rest — all with the stock
// debug renderer (no custom drawing, no canvas shadow blur), so it runs at
// full frame rate and the visuals come straight out of the physics.
//
// Engine-bug note (see project memory): dynamic Polygon + an explicit
// Material tunnels through static Polygon floors. Every block here uses the
// engine-default material — no Material argument anywhere — so the pile
// rests cleanly on the floor instead of falling through it.

const DT = 1 / 60;

// --- Tunables -------------------------------------------------------------
const BLOCK = 10; // block edge in px (also the grid pitch base)
const GAP = 1; // visual gap between blocks in formation
const GRAVITY_Y = 900;
const HOLD_FORMED = 1.6; // seconds the "50" sits intact (incl. charge-up)
const CHARGE_DURATION = 0.9; // seconds of building shake just before the blast
const HOLD_SCATTERED = 4.2; // seconds the debris tumbles before re-forming
const BLAST_IMPULSE = 1500; // peak radial impulse at the blast center
const BLAST_FALLOFF = 1.0; // 1 = linear falloff to the formation edge
const FONT_UPSCALE = 2; // each glyph cell becomes UPSCALE×UPSCALE blocks (≈4× count)

// Collision-driven fracture: a block shatters into 4 when the contact
// impulse it receives in a step (slamming the floor/walls or another block)
// exceeds this. Because it's measured every step — not just at the blast —
// the "50" keeps breaking up as the debris lands and piles, so most of the
// formation ends up as small fragments rather than whole blocks.
const SHATTER_IMPULSE = 60; // contact-impulse magnitude threshold (Vec3.length)
const MIN_SHATTER_EDGE = 5; // blocks at/below this edge no longer split (frags stay whole)
const SHATTER_GRACE = 0.12; // s after a block is born before it may shatter (avoids instant chain-split)

// 7×9 pixel font for the two glyphs we need. 1 = block, 0 = empty.
// Hand-drawn with 2-block-thick strokes so the "50" reads boldly.
// prettier-ignore
const GLYPHS = {
  "5": [
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1],
    [1,1,0,0,0,0,0],
    [1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1],
    [0,0,0,0,0,1,1],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,0],
  ],
  "0": [
    [0,1,1,1,1,1,0],
    [1,1,1,1,1,1,1],
    [1,1,0,0,0,1,1],
    [1,1,0,0,1,1,1],
    [1,1,0,1,1,1,1],
    [1,1,1,1,0,1,1],
    [1,1,1,0,0,1,1],
    [1,1,1,1,1,1,1],
    [0,1,1,1,1,1,0],
  ],
};

const GLYPH_W = 7;
const GLYPH_H = 9;
const GLYPH_SPACING = 1; // empty (upscaled) block-columns between the two glyphs

// --- State ----------------------------------------------------------------
let _blocks = []; // { body } — live debris/formation bodies
let _W = 0;
let _H = 0;
let _space = null;
let _phase = "formed"; // "formed" | "scattered"
let _phaseT = 0;
let _blastX = 0;
let _blastY = 0;
let _formationR = 1; // max distance from blast center to a block (for falloff)
let _detonated = false; // guards the one-shot blast within the formed phase
let _elapsed = 0; // monotonic clock (never resets) for per-block shatter grace

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// The host runner (docs DemoRunner, or the CodePen template's stub) is set on
// the demo object as `this._runner`. step()/click() cache it here so the
// module-level helper detonate() can reach shakeCamera too. Reading
// `this._runner` from inside a method (rather than referencing the demo
// object by name) is what makes the shake survive the CodePen export.
let _runnerRef = null;

// HSL (h in degrees, s/l in 0..1) → "#rrggbb". The renderers' custom-color
// path parses stroke as hex (Three.js / PixiJS do parseInt(stroke)), so the
// gradient must resolve to a real hex string, not an hsl() literal.
function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Map t ∈ [0,1] to a celebratory hue sweep and return a renderer color object
// ({ fill, stroke }). Using userData._color (a custom color) rather than
// _colorIdx (a 6-entry palette) gives a smooth gradient across the whole "50"
// and survives the blast — debris keeps the hue it was assigned in formation.
function gradientColor(t) {
  // Sweep cyan → blue → violet → magenta → warm pink across the number.
  const hex = hslHex(190 + t * 140, 0.85, 0.62);
  // Stroke is the hex (used as-is by Canvas2D, parsed to int by 3D/Pixi).
  // Fill is the same hex at ~0.42 alpha so blocks read clearly with outlines off.
  return { fill: hex + "6b", stroke: hex };
}

// Spawn one solid square block. Stores its home + pin state on userData so
// the formed phase can hold it still and the blast can read its edge size.
function spawnBlock(x, y, edge, color, homeX, homeY, pinned) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // No Material argument — engine default avoids the polygon-tunneling bug.
  body.shapes.add(new Polygon(Polygon.box(edge, edge)));
  body.userData._color = color; // custom gradient color — kept through the blast
  body.userData._edge = edge;
  body.userData._homeX = homeX;
  body.userData._homeY = homeY;
  body.userData._pinned = pinned;
  body.userData._bornT = _elapsed;
  body.space = _space;
  _blocks.push({ body });
  return body;
}

// Lay the "50" out of blocks, centered in the upper portion of the canvas.
function buildFormation() {
  for (const b of _blocks) b.body.space = null;
  _blocks = [];

  const pitch = BLOCK + GAP;
  const glyphs = ["5", "0"];
  const cellsPerGlyphW = GLYPH_W * FONT_UPSCALE;
  const totalCols = cellsPerGlyphW * glyphs.length + GLYPH_SPACING * FONT_UPSCALE * (glyphs.length - 1);
  const totalW = totalCols * pitch;
  const totalH = GLYPH_H * FONT_UPSCALE * pitch;
  const originX = _W / 2 - totalW / 2 + pitch / 2;
  const originY = _H * 0.4 - totalH / 2 + pitch / 2;

  const maxCol = Math.max(1, totalCols - 1); // for the left→right gradient sweep
  let colOffset = 0;
  for (const g of glyphs) {
    const grid = GLYPHS[g];
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        if (!grid[row][col]) continue;
        // Upscale each filled cell into an UPSCALE×UPSCALE patch of blocks.
        for (let sy = 0; sy < FONT_UPSCALE; sy++) {
          for (let sx = 0; sx < FONT_UPSCALE; sx++) {
            const gx = colOffset + col * FONT_UPSCALE + sx;
            const gy = row * FONT_UPSCALE + sy;
            const x = originX + gx * pitch;
            const y = originY + gy * pitch;
            // Hue sweeps left→right across the whole "50".
            spawnBlock(x, y, BLOCK, gradientColor(gx / maxCol), x, y, true);
          }
        }
      }
    }
    colOffset += cellsPerGlyphW + GLYPH_SPACING * FONT_UPSCALE;
  }

  // Blast center = formation center; precompute the max radius for falloff.
  _blastX = _W / 2;
  _blastY = originY + (totalH - pitch) / 2;
  _formationR = 1;
  for (const blk of _blocks) {
    const dx = blk.body.userData._homeX - _blastX;
    const dy = blk.body.userData._homeY - _blastY;
    _formationR = Math.max(_formationR, Math.hypot(dx, dy));
  }
}

// Replace one block with four half-size squares inheriting its motion.
// Removes the original from the space and returns the four new fragment
// entries ({ body }) so the caller can splice them into its working list.
function shatter(body) {
  const ud = body.userData;
  const edge = ud._edge;
  const color = ud._color; // fragments inherit the parent's gradient color
  const half = edge / 2;
  const p = body.position;
  const v = body.velocity;
  const av = body.angularVel;
  const rot = body.rotation;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  body.space = null;

  const offset = half / 2;
  const local = [
    [-offset, -offset],
    [offset, -offset],
    [-offset, offset],
    [offset, offset],
  ];
  const frags = [];
  for (const [lx, ly] of local) {
    // Rotate the local quarter-offset into world space.
    const wx = p.x + lx * cos - ly * sin;
    const wy = p.y + lx * sin + ly * cos;
    const frag = new Body(BodyType.DYNAMIC, new Vec2(wx, wy));
    frag.shapes.add(new Polygon(Polygon.box(half, half)));
    frag.userData._color = color; // keep the parent's gradient hue
    frag.userData._edge = half;
    frag.userData._pinned = false;
    frag.userData._bornT = _elapsed;
    frag.rotation = rot;
    // Inherit motion + a small outward kick so the piece visibly separates.
    frag.velocity = new Vec2(v.x + rand(-50, 50), v.y + rand(-50, 50));
    frag.angularVel = av + rand(-8, 8);
    frag.space = _space;
    frags.push({ body: frag });
  }
  return frags;
}

function detonate() {
  _detonated = true;
  _phase = "scattered";
  _phaseT = 0;

  // The blast only launches blocks — it does not split them. Fracture happens
  // afterwards, in step(), driven by the actual contact impulse each block
  // takes as it slams the floor, the walls, and the rest of the debris. So
  // the breaking-up reads as a consequence of the collisions, not a scripted
  // event, and keeps going as the pile forms.
  for (const blk of _blocks) {
    const b = blk.body;
    b.userData._pinned = false;
    b.userData._bornT = _elapsed; // start the grace window from the blast
    const dx = b.position.x - _blastX;
    const dy = b.position.y - _blastY;
    const dist = Math.hypot(dx, dy) || 1;
    // Linear falloff: center blocks get the full kick, edge blocks less.
    const k = 1 - BLAST_FALLOFF * (dist / _formationR);
    const mag = BLAST_IMPULSE * Math.max(0.25, k);
    const ix = (dx / dist) * mag + rand(-120, 120);
    const iy = (dy / dist) * mag - rand(120, 320);
    b.applyImpulse(new Vec2(ix, iy));
    b.angularVel = rand(-12, 12);
    // Keep _color — debris stays the gradient hue it had in formation.
  }
  _runnerRef?.shakeCamera?.(16, 0.5);
}

function reform() {
  _phase = "formed";
  _phaseT = 0;
  _detonated = false;
  buildFormation();
}

export default {
  id: "exploding-50",
  label: "Exploding 50",
  tags: ["Impulse", "Collision", "Fracture", "Many-body"],
  featured: false,
  desc: "<b>50 GitHub stars!</b> 🎉 The number 50, built from hundreds of rigid blocks, charges up then detonates with a radial impulse — hard-hit blocks shatter into four — before re-assembling. <b>Click</b> to blow it up early.",
  walls: true,
  workerCompatible: false,

  setup(space, W, H) {
    _space = space;
    _W = W;
    _H = H;
    _blocks = [];
    space.gravity = new Vec2(0, GRAVITY_Y);
    _phase = "formed";
    _phaseT = 0;
    _elapsed = 0;
    _detonated = false;
    buildFormation();
  },

  step(space, W, H) {
    _runnerRef = this._runner; // cache host runner for the module-level helpers
    _phaseT += DT;
    _elapsed += DT;

    if (_phase === "formed") {
      // Pin every block to its home position so the "50" stays crisp and
      // unaffected by gravity until the blast.
      for (const blk of _blocks) {
        const b = blk.body;
        if (!b.userData._pinned) continue;
        b.position = new Vec2(b.userData._homeX, b.userData._homeY);
        b.velocity = new Vec2(0, 0);
        b.angularVel = 0;
        b.rotation = 0;
      }

      // Charge-up: a camera shake that builds in the last CHARGE_DURATION
      // seconds before detonation, so the blast feels "wound up".
      const tToBlast = HOLD_FORMED - _phaseT;
      if (tToBlast <= CHARGE_DURATION && tToBlast > 0) {
        const ramp = 1 - tToBlast / CHARGE_DURATION; // 0 → 1 as blast nears
        // Short, frequent shakes whose amplitude grows toward the blast.
        _runnerRef?.shakeCamera?.(1 + ramp * ramp * 9, 0.12);
      }

      if (_phaseT >= HOLD_FORMED && !_detonated) detonate();
    } else {
      // Collision-driven fracture: any block whose contact impulse this step
      // crossed the threshold splits into four. Rebuild the working list in
      // one pass, swapping shattered blocks for their fragments.
      const next = [];
      for (const blk of _blocks) {
        const b = blk.body;
        const ud = b.userData;
        const splittable = ud._edge > MIN_SHATTER_EDGE && _elapsed - ud._bornT >= SHATTER_GRACE;
        if (splittable) {
          // totalContactsImpulse() sums normal+tangent impulses from this
          // step's collision arbiters; its magnitude is the "hit hardness".
          // An arbiter can expire between steps ("Arbiter not currently in
          // use") — harmless here, just skip the block this frame.
          let hardness = 0;
          try {
            const imp = b.totalContactsImpulse();
            hardness = imp.length;
            imp.dispose?.();
          } catch {
            hardness = 0;
          }
          if (hardness >= SHATTER_IMPULSE) {
            for (const f of shatter(b)) next.push(f);
            continue;
          }
        }
        next.push(blk);
      }
      _blocks = next;

      if (_phaseT >= HOLD_SCATTERED) reform();
    }
  },

  // Click anywhere to detonate early (only meaningful while formed).
  click() {
    _runnerRef = this._runner; // cache host runner so click-detonate can shake
    if (_phase === "formed" && !_detonated) detonate();
  },
};
