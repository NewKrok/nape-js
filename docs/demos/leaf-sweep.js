import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter, FluidProperties,
} from "../nape-js.esm.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";

// ── Leaf Sweep — clear the whole yard before the trees are done ─────────
//
// A top-down autumn cleaning game. The yard is five zones — front lawn,
// driveway, flower garden, patio and pool deck — behind garden gates, and
// every leaf on the ground is a dynamic body. You start with bare hands
// and a small sack, pick leaves up, empty the sack into the compost bin
// and spend the money on a rake, a leaf blower, bigger sacks, faster
// trainers and vacuum chutes built into the walls. A zone at 100 % pays a
// reward of your choice and opens the next gate. The trees keep dropping
// leaves while their zone is open and every so often a gust of wind blows
// your neat piles apart, so the yard is only clean when the last tree is
// bare and the last leaf is gone.
//
// Physics: zero-gravity Space seen from above. Leaves are small circles
// with their own ground friction that depends on what they lie on (grass
// holds them, the driveway lets them slide, flower-bed mulch nearly glues
// them down), so each tool has its place. The rake is a kinematic body
// driven with setVelocityFromTarget, so it really shoves the pile in
// front of it. The blower is a cone-shaped force field; blow too hard
// close up and leaves lift off — an airborne leaf swaps to an
// InteractionFilter that only meets tall walls, sails over hedges and the
// pile, and flutters back down. The pool is a fluid-enabled shape: leaves
// that land in it float, get dragged by the water and drift on a current
// towards the skimmer.
//
// 3D: a golden-hour garden with long shadows, a modelled house with a
// smoking chimney, gates that swing open, autumn trees whose canopies thin
// out as they drop their leaves, every leaf an instance with its own
// flutter and pile height, blower air streams, a low-poly gardener whose
// sack swells as it fills, floating leaves on an animated pool, and a
// street of neighbouring houses beyond the fence.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;

// Collision bits. Tall things stop everything, including airborne leaves;
// low things (fences, hedges, furniture) stop the gardener and grounded
// leaves, but a leaf in the air sails over them.
const B_PLAYER = 1 << 1;
const B_LEAF = 1 << 2;
const B_AIR = 1 << 3;
const B_LOW = 1 << 4;
const B_TALL = 1 << 5;
const B_RAKE = 1 << 6;
const B_GATE = 1 << 7;
const B_PWALL = 1 << 8;

//                      collisionGroup, collisionMask, sensorG, sensorM, fluidG, fluidM
const F_LEAF = new InteractionFilter(B_LEAF, B_LOW | B_TALL | B_LEAF | B_PLAYER | B_RAKE, 1, -1, 1, -1);
const F_AIR = new InteractionFilter(B_AIR, B_TALL, 1, -1, 0, 0);
const F_PLAYER = new InteractionFilter(B_PLAYER, B_LOW | B_TALL | B_GATE | B_PWALL | B_LEAF, 1, -1, 0, 0);
const F_LOW = new InteractionFilter(B_LOW, B_PLAYER | B_LEAF, 1, -1, 0, 0);
const F_TALL = new InteractionFilter(B_TALL, B_PLAYER | B_LEAF | B_AIR, 1, -1, 0, 0);
const F_GATE = new InteractionFilter(B_GATE, B_PLAYER, 1, -1, 0, 0);
const F_PWALL = new InteractionFilter(B_PWALL, B_PLAYER, 1, -1, 0, 0);
const F_RAKE = new InteractionFilter(B_RAKE, B_LEAF, 1, -1, 0, 0);
const F_WATER = new InteractionFilter(0, 0, 1, -1, 1, -1);

const MAT_LEAF = new Material(0.05, 0.35, 0.45, 0.35, 0.001);
const MAT_PLAYER = new Material(0, 0.2, 0.2, 5, 0.001);
const MAT_STATIC = new Material(0.1, 0.4, 0.5, 1, 0.001);
const MAT_RAKE = new Material(0, 0.25, 0.3, 1, 0.001);

// Ground friction per surface, as a Coulomb deceleration in px/s².
const SURF = {
  lawn:    { mu: 360, name: "grass" },
  asphalt: { mu: 125, name: "asphalt" },
  tiles:   { mu: 165, name: "tiles" },
  stone:   { mu: 190, name: "stone" },
  gravel:  { mu: 270, name: "gravel" },
  bed:     { mu: 720, name: "mulch" },
  water:   { mu: 0,   name: "water" },
};

const LEAF_R = 3.3;               // collision radius (px)
const AIR_G = 150;                // px/s² pulling an airborne leaf down
const AIR_TERM = 34;              // px/s — a leaf flutters, it does not drop
const AIR_DRAG = 0.9;             // 1/s horizontal drag in the air
const MAX_H = 52;

// Leaf kinds. `shape` picks the outline; value is paid when it is binned.
const LEAF_TYPES = {
  oak:    { col: 0x9a6431, edge: 0x5e3a18, val: 1, shape: "oak",   len: 9.5, name: "Oak" },
  birch:  { col: 0xe9c43c, edge: 0x9a7a1a, val: 1, shape: "oval",  len: 7.5, name: "Birch" },
  linden: { col: 0xd8b23a, edge: 0x8a6f1a, val: 1, shape: "heart", len: 8.5, name: "Linden" },
  chest:  { col: 0xb8742e, edge: 0x6e4012, val: 2, shape: "long",  len: 11,  name: "Chestnut" },
  maple:  { col: 0xe8722a, edge: 0x9a3e10, val: 2, shape: "maple", len: 10,  name: "Maple" },
  red:    { col: 0xc8362a, edge: 0x761610, val: 3, shape: "maple", len: 10,  name: "Red maple" },
  gold:   { col: 0xffd54a, edge: 0xb88a10, val: 12, shape: "maple", len: 11, name: "Golden", gold: true },
};
const GOLD_CHANCE = 0.018;

// Outlines in unit length, tip at +x. Flat [x, y, …] arrays.
const LEAF_SHAPES = (() => {
  const mirror = (half) => {
    const out = [];
    for (const [x, y] of half) out.push(x, y);
    for (let i = half.length - 2; i > 0; i--) out.push(half[i][0], -half[i][1]);
    return out;
  };
  return {
    oval: mirror([[0.5, 0], [0.34, 0.17], [0.08, 0.24], [-0.22, 0.19], [-0.44, 0.08], [-0.5, 0]]),
    heart: mirror([[0.5, 0], [0.3, 0.2], [0.02, 0.32], [-0.26, 0.3], [-0.42, 0.14], [-0.36, 0.02], [-0.5, 0]]),
    long: mirror([[0.5, 0], [0.3, 0.12], [0, 0.17], [-0.3, 0.13], [-0.48, 0.04], [-0.5, 0]]),
    oak: mirror([[0.5, 0], [0.36, 0.15], [0.26, 0.09], [0.14, 0.23], [0.02, 0.12], [-0.1, 0.24], [-0.22, 0.12], [-0.34, 0.2], [-0.44, 0.06], [-0.5, 0]]),
    maple: mirror([[0.5, 0], [0.2, 0.1], [0.3, 0.36], [0.04, 0.22], [-0.06, 0.44], [-0.16, 0.18], [-0.4, 0.26], [-0.3, 0.06], [-0.5, 0]]),
  };
})();

// ── Yard layout (px, y down) ─────────────────────────────────────────────
// Zones in unlock order. `rect` = [x0, y0, x1, y1]; the gate is what opens
// when the previous zone is cleared.
const ZONES = [
  { id: "lawn",   name: "Front lawn",    rect: [8, 166, 465, 492], surf: "lawn",    initial: 96,
    gate: null,
    chute: { x: 362, y: 166, nx: 0, ny: 1, cost: 160 } },
  { id: "drive",  name: "Driveway",      rect: [465, 166, 650, 492], surf: "asphalt", initial: 54,
    gate: { x0: 462, y0: 166, x1: 468, y1: 262, hinge: "top" },
    chute: { x: 578, y: 166, nx: 0, ny: 1, cost: 180 } },
  { id: "garden", name: "Flower garden", rect: [650, 172, 892, 492], surf: "lawn",    initial: 72,
    gate: { x0: 647, y0: 300, x1: 653, y1: 352, hinge: "top" },
    chute: { x: 814, y: 454, nx: -1, ny: 0, cost: 200 } },
  { id: "patio",  name: "Patio",         rect: [8, 8, 330, 169],    surf: "tiles",   initial: 64,
    gate: { x0: 220, y0: 169, x1: 280, y1: 175, hinge: "left" },
    chute: { x: 330, y: 112, nx: -1, ny: 0, cost: 220 } },
  { id: "pool",   name: "Pool deck",     rect: [600, 8, 892, 172],  surf: "stone",   initial: 62,
    gate: { x0: 600, y0: 169, x1: 646, y1: 175, hinge: "left" },
    chute: { x: 600, y: 112, nx: 1, ny: 0, cost: 240 } },
];

// Surface patches drawn on the ground and read by the leaf friction.
const PATCHES = [
  { surf: "water",  rect: [652, 34, 858, 136] },
  { surf: "stone",  rect: [600, 8, 892, 172] },
  { surf: "bed",    rect: [668, 190, 760, 232] },
  { surf: "bed",    rect: [778, 190, 880, 226] },
  { surf: "bed",    rect: [668, 430, 780, 480] },
  { surf: "bed",    rect: [16, 176, 110, 204] },
  { surf: "gravel", rect: [653, 316, 830, 336] },
  { surf: "gravel", rect: [814, 336, 836, 416] },
  { surf: "tiles",  rect: [120, 8, 330, 169] },
  { surf: "lawn",   rect: [8, 8, 120, 169] },
  { surf: "tiles",  rect: [476, 166, 536, 186] },
  { surf: "asphalt", rect: [465, 166, 650, 492] },
];
const POOL = { x0: 652, y0: 34, x1: 858, y1: 136 };
const PUMP = { x: 850, y: 43, r: 16, cost: 140 };
const BIN = { x: 420, y: 179, w: 40, h: 22, drop: { x: 420, y: 205 }, r: 26 };

// Static obstacles. `layer` picks the collision filter.
const STATICS = [
  // Outer fence.
  { kind: "outer", x0: 0, y0: 0, x1: 900, y1: 8, layer: "tall" },
  { kind: "outer", x0: 0, y0: 492, x1: 900, y1: 500, layer: "tall" },
  { kind: "outer", x0: 0, y0: 0, x1: 8, y1: 500, layer: "tall" },
  { kind: "outer", x0: 892, y0: 0, x1: 900, y1: 500, layer: "tall" },
  // House.
  { kind: "house", x0: 330, y0: 8, x1: 600, y1: 166, layer: "tall" },
  // Zone fences and hedges (low: airborne leaves blow over them).
  { kind: "fence", x0: 8, y0: 169, x1: 220, y1: 175, layer: "low" },
  { kind: "fence", x0: 280, y0: 169, x1: 330, y1: 175, layer: "low" },
  { kind: "fence", x0: 646, y0: 169, x1: 892, y1: 175, layer: "low" },
  { kind: "hedge", x0: 461, y0: 262, x1: 469, y1: 492, layer: "low" },
  { kind: "fence", x0: 647, y0: 175, x1: 653, y1: 300, layer: "low" },
  { kind: "fence", x0: 647, y0: 352, x1: 653, y1: 492, layer: "low" },
  // Lawn.
  { kind: "bin", x0: BIN.x - BIN.w / 2, y0: BIN.y - BIN.h / 2, x1: BIN.x + BIN.w / 2, y1: BIN.y + BIN.h / 2, layer: "tall" },
  { kind: "bench", x0: 48, y0: 462, x1: 94, y1: 474, layer: "low" },
  // Driveway.
  { kind: "car", x0: 542, y0: 360, x1: 572, y1: 426, layer: "tall" },
  { kind: "wheelie", x0: 634, y0: 448, x1: 647, y1: 461, layer: "tall", col: 0x2f5a3a },
  { kind: "wheelie", x0: 634, y0: 463, x1: 647, y1: 476, layer: "tall", col: 0x3a4a6a },
  { kind: "pumpkin", x: 484, y: 193, r: 5, layer: "low" },
  { kind: "pumpkin", x: 530, y: 192, r: 4, layer: "low" },
  // Garden.
  { kind: "shed", x0: 814, y0: 416, x1: 892, y1: 492, layer: "tall" },
  { kind: "birdbath", x: 742, y: 290, r: 9, layer: "low" },
  { kind: "hay", x0: 848, y0: 364, x1: 876, y1: 380, layer: "low" },
  { kind: "pumpkin", x: 842, y: 373, r: 6, layer: "low" },
  { kind: "pumpkin", x: 858, y: 356, r: 4, layer: "low" },
  // Patio.
  { kind: "table", x: 196, y: 88, r: 15, layer: "low" },
  { kind: "chair", x: 170, y: 88, r: 5, layer: "low" },
  { kind: "chair", x: 222, y: 88, r: 5, layer: "low" },
  { kind: "chair", x: 196, y: 62, r: 5, layer: "low" },
  { kind: "chair", x: 196, y: 114, r: 5, layer: "low" },
  { kind: "grill", x0: 288, y0: 24, x1: 312, y1: 38, layer: "tall" },
  { kind: "planter", x0: 128, y0: 157, x1: 160, y1: 169, layer: "low" },
  // Pool deck.
  { kind: "lounger", x0: 676, y0: 155, x1: 712, y1: 167, layer: "low" },
  { kind: "lounger", x0: 728, y0: 155, x1: 764, y1: 167, layer: "low" },
];

// Trees: canopy radius `r`, trunk `tr`, leaf stock that falls while the
// zone is open. `kinds` are weights over LEAF_TYPES.
const TREES = [
  { name: "Oak",       x: 150, y: 318, r: 64, tr: 9, h: 60, zone: 0, stock: 86, kinds: { oak: 1 },               pal: [0x9a5a22, 0xb87a2e, 0x7a4a1a, 0xc8902e] },
  { name: "Maple",     x: 352, y: 408, r: 48, tr: 7, h: 50, zone: 0, stock: 66, kinds: { maple: 3, red: 1 },     pal: [0xe06a22, 0xf08a2a, 0xc84a1a, 0xf2a83a] },
  { name: "Linden",    x: 626, y: 226, r: 40, tr: 6, h: 46, zone: 1, stock: 52, kinds: { linden: 1 },            pal: [0xd8b43a, 0xe8c84a, 0xb8942a, 0xc8a83a] },
  { name: "Birch",     x: 842, y: 282, r: 38, tr: 5, h: 50, zone: 2, stock: 52, kinds: { birch: 1 },             pal: [0xf0cc40, 0xe8b830, 0xf8dc60, 0xd8a828] },
  { name: "Rowan",     x: 706, y: 390, r: 36, tr: 6, h: 42, zone: 2, stock: 38, kinds: { red: 2, maple: 1 },     pal: [0xc8402a, 0xd8602e, 0xa8301e, 0xe07a3a] },
  { name: "Chestnut",  x: 70,  y: 72,  r: 62, tr: 8, h: 58, zone: 3, stock: 84, kinds: { chest: 3, oak: 1 },     pal: [0xb8742e, 0xc8903a, 0x9a5a22, 0xd8a040] },
  { name: "Red maple", x: 866, y: 146, r: 48, tr: 7, h: 52, zone: 4, stock: 70, kinds: { red: 3, maple: 1 },     pal: [0xc83028, 0xe0482e, 0xa82018, 0xf06a3a] },
];

// ── Shop ─────────────────────────────────────────────────────────────────
const SHOP = [
  { id: "rake",   name: "Rake",          icon: "rake",   tiers: [40],        desc: "Scoops leaves fast and shoves whole piles out of corners." },
  { id: "blower", name: "Leaf blower",   icon: "blower", tiers: [150],       desc: "Blows leaves a long way. Too close and they take off.", },
  { id: "bag",    name: "Bigger sack",   icon: "bag",    tiers: [60, 200, 450], desc: "25 → 60 → 120 → 250 leaves per trip." },
  { id: "wide",   name: "Wide rake",     icon: "rake",   tiers: [180],       desc: "A 50 % wider rake head and a bigger scoop.", req: "rake" },
  { id: "power",  name: "Blower power",  icon: "blower", tiers: [300, 650],  desc: "More reach and push per tier.", req: "blower" },
  { id: "boots",  name: "Trainers",      icon: "boots",  tiers: [90, 280],   desc: "+20 % walking speed per tier." },
  { id: "chute0", name: "Lawn chute",    icon: "chute",  tiers: [ZONES[0].chute.cost], desc: "A vacuum vent in the house wall — blow leaves in.", zone: 0 },
  { id: "chute1", name: "Driveway chute", icon: "chute", tiers: [ZONES[1].chute.cost], desc: "A vacuum vent by the porch.", zone: 1 },
  { id: "chute2", name: "Garden chute",  icon: "chute",  tiers: [ZONES[2].chute.cost], desc: "A vacuum vent on the shed.", zone: 2 },
  { id: "chute3", name: "Patio chute",   icon: "chute",  tiers: [ZONES[3].chute.cost], desc: "A vacuum vent on the patio wall.", zone: 3 },
  { id: "chute4", name: "Pool chute",    icon: "chute",  tiers: [ZONES[4].chute.cost], desc: "A vacuum vent on the pool side.", zone: 4 },
  { id: "pump",   name: "Pool pump",     icon: "pump",   tiers: [PUMP.cost], desc: "The skimmer sucks up floating leaves.", zone: 4 },
];
const BAG_CAPS = [25, 60, 120, 250];
const SPEED = 96;                 // px/s walking
const HAND = { reach: 28, pick: 11, rate: 5 };
const RAKE = { off: 17, w: 26, wWide: 39, scoop: 14, scoopWide: 20, rate: 20, rateWide: 32 };
const BLOWER = { range: [125, 155, 190], power: [1000, 1300, 1650], cone: 0.4, lift: 640 };
const GUST_FIRST = 70, GUST_GAP = [48, 72], GUST_WARN = 3, GUST_LEN = 2.8, GUST_ACC = 430;

// ── State ────────────────────────────────────────────────────────────────
let _space = null;
let _gen = 0;                    // bumps on every rebuild — the renderers watch it
let _phase = "title";            // title | play | done
let _phaseT = 0;
let _clock = 0;
let _leaves = [];                // { body, shape, type, h, vz, air, ph, flip, ... }
let _player = null;              // { body, vx, vy, face, walk, tool, ... }
let _rake = null;                // { body, ang, on }
let _trees = [];                 // { def, stock, stock0, blobs, sway }
let _gates = [];                 // { zone, def, body, open, t }
let _zones = [];                 // { def, dirt, ref, open, cleared, count }
let _intakes = [];               // { kind, x, y, r, pull, on, acc, accN, t, zone }
let _money = 0;
let _earned = 0;
let _collected = 0;
let _golds = 0;
let _valMul = 1;
let _speedMul = 1;
let _reachMul = 1;
let _owned = {};                 // shop id → tier count
let _bag = { n: 0, value: 0 };
let _tool = "hand";
let _gentle = false;
let _using = false;
let _blowFx = 0;                 // 0..1 blower spool-up (visual + force)
let _shopOpen = false;
let _choice = null;              // { zone, options }
let _pauseMenu = false;
let _gust = null;                // { dir, t, warn, next }
let _nextGust = GUST_FIRST;
let _floaters = [];
let _banners = [];
let _sparks = [];                // short-lived world particles
let _keys = {};
let _kbMoveT = -99;              // last time a movement key was held
let _ptr = { sx: VIEW_W / 2, sy: VIEW_H / 2, down: false, moveT: -99, has: false };
let _aimW = { x: 300, y: 300 };
let _onKeyDown = null, _onKeyUp = null;
let _best = null;
let _result = null;
let _autopilot = null;
let _rnd = null;
let _stepN = 0;
let _time = 0;
let _camMode = 0;                // 3D: 0 follow, 1 overview, 2 low
let _camDist = 1;
let _screenToWorld = null;       // set by the active renderer
let _leafId = 0;
let _stats = { hand: 0, rake: 0, blowerBin: 0, chute: 0, pump: 0 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const hypot = Math.hypot;
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function pickWeighted(rnd, w) {
  let sum = 0;
  for (const k in w) sum += w[k];
  let r = rnd() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return Object.keys(w)[0];
}
const inRect = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

try {
  const raw = typeof localStorage !== "undefined" && localStorage.getItem("leaf-sweep.best");
  if (raw) _best = JSON.parse(raw);
} catch (_) { _best = null; }
function saveBest() {
  try { if (typeof localStorage !== "undefined") localStorage.setItem("leaf-sweep.best", JSON.stringify(_best)); } catch (_) { /* private mode */ }
}

// ── Yard queries ─────────────────────────────────────────────────────────
function zoneAt(x, y) {
  // Pool deck and patio first: their rects share the fence line with the
  // front zones.
  if (inRect(x, y, ZONES[4].rect)) return 4;
  if (inRect(x, y, ZONES[3].rect)) return 3;
  if (x < 465) return 0;
  if (x < 650) return 1;
  return 2;
}

function surfaceAt(x, y) {
  for (let i = 0; i < PATCHES.length; i++) {
    const p = PATCHES[i];
    const r = p.rect;
    if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return p.surf;
  }
  return ZONES[zoneAt(x, y)].surf;
}
const inPool = (x, y) => x > POOL.x0 && x < POOL.x1 && y > POOL.y0 && y < POOL.y1;

// Is (x, y) inside anything solid (for spawning leaves)?
function blocked(x, y, pad = 4) {
  for (const s of STATICS) {
    if (s.r !== undefined) {
      if (hypot(x - s.x, y - s.y) < s.r + pad) return true;
    } else if (x > s.x0 - pad && x < s.x1 + pad && y > s.y0 - pad && y < s.y1 + pad) return true;
  }
  for (const t of TREES) if (hypot(x - t.x, y - t.y) < t.tr + pad) return true;
  for (const z of ZONES) {
    const g = z.gate;
    if (g && x > g.x0 - pad && x < g.x1 + pad && y > g.y0 - pad && y < g.y1 + pad) return true;
  }
  return false;
}

// ── World build ──────────────────────────────────────────────────────────
function rectBody(def, filter, type = BodyType.STATIC) {
  const w = def.x1 - def.x0, h = def.y1 - def.y0;
  const b = new Body(type, new Vec2((def.x0 + def.x1) / 2, (def.y0 + def.y1) / 2));
  b.shapes.add(new Polygon(Polygon.box(w, h), MAT_STATIC, filter));
  b.space = _space;
  return b;
}
function circleBody(x, y, r, filter) {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(r, undefined, MAT_STATIC, filter));
  b.space = _space;
  return b;
}

function spawnLeaf(x, y, kind, o = {}) {
  const rnd = _rnd;
  const air = (o.h ?? 0) > 0.5;
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const sh = new Circle(LEAF_R, undefined, MAT_LEAF, air ? F_AIR : F_LEAF);
  b.shapes.add(sh);
  b.rotation = o.rot ?? rnd() * Math.PI * 2;
  b.space = _space;
  if (o.vx || o.vy) b.velocity.setxy(o.vx ?? 0, o.vy ?? 0);
  const t = LEAF_TYPES[kind];
  const rec = {
    id: _leafId++, body: b, shape: sh, kind, t,
    h: air ? o.h : 0, vz: o.vz ?? 0, air,
    ph: rnd() * Math.PI * 2, flip: rnd() < 0.5 ? 1 : -1, curl: 0.2 + rnd() * 0.5,
    scale: 0.85 + rnd() * 0.3, fall: !!o.fall, lift: 0, stack: 0, idx: _leaves.length,
  };
  b.userData._leaf = rec;
  _leaves.push(rec);
  return rec;
}

function removeLeaf(rec) {
  if (rec.idx < 0) return;
  rec.body.space = null;
  const last = _leaves.pop();
  if (last !== rec) { _leaves[rec.idx] = last; last.idx = rec.idx; }
  rec.idx = -1;
}

function leafKindFor(rnd, kinds) {
  if (rnd() < GOLD_CHANCE) return "gold";
  return pickWeighted(rnd, kinds);
}

function setAir(rec, vz) {
  if (!rec.air) {
    rec.air = true;
    rec.shape.filter = F_AIR;
    rec.h = Math.max(rec.h, 0.8);
  }
  rec.vz = Math.max(rec.vz, vz);
}
function land(rec) {
  rec.air = false;
  rec.h = 0;
  rec.vz = 0;
  rec.fall = false;
  rec.shape.filter = F_LEAF;
  const v = rec.body.velocity;
  v.setxy(v.x * 0.55, v.y * 0.55);
}

function buildWorld() {
  const space = _space;
  space.clear();
  _gen++;
  _rnd = lcg(20261028);
  const rnd = _rnd;
  _leaves = [];
  _leafId = 0;

  for (const s of STATICS) {
    const f = s.layer === "tall" ? F_TALL : F_LOW;
    const b = s.r !== undefined ? circleBody(s.x, s.y, s.r, f) : rectBody(s, f);
    b.userData._static = s;
  }
  // Trunks.
  _trees = TREES.map((def, i) => {
    circleBody(def.x, def.y, def.tr, F_TALL);
    return { def, i, stock: def.stock, stock0: def.stock, acc: 0, sway: 0, drop: 0 };
  });
  // Gates (they only stop the gardener: leaves slip under them).
  _gates = [];
  ZONES.forEach((z, i) => {
    if (!z.gate) return;
    const body = rectBody(z.gate, F_GATE);
    _gates.push({ zone: i, def: z.gate, body, open: false, t: 0 });
  });
  // The pool: a fluid-enabled static shape (drag, no collision) plus a
  // rim wall only the gardener bumps into.
  const pw = POOL.x1 - POOL.x0, ph = POOL.y1 - POOL.y0;
  const water = new Body(BodyType.STATIC, new Vec2((POOL.x0 + POOL.x1) / 2, (POOL.y0 + POOL.y1) / 2));
  const ws = new Polygon(Polygon.box(pw, ph), MAT_STATIC, F_WATER);
  ws.fluidEnabled = true;
  ws.fluidProperties = new FluidProperties(1.1, 3.2);
  water.shapes.add(ws);
  water.shapes.add(new Polygon(Polygon.box(pw - 4, ph - 4), MAT_STATIC, F_PWALL));
  water.space = space;

  // The gardener.
  const pb = new Body(BodyType.DYNAMIC, new Vec2(250, 250));
  pb.shapes.add(new Circle(7, undefined, MAT_PLAYER, F_PLAYER));
  pb.allowRotation = false;
  pb.space = space;
  _player = { body: pb, face: -Math.PI / 2, walk: 0, speed: 0, carry: 0, useT: 0, pickAcc: 0, bump: 0, emptyAcc: 0, fullT: -9 };

  // The rake head: a kinematic cup that is only in the Space while held.
  const rb = new Body(BodyType.KINEMATIC, new Vec2(250, 235));
  _rake = { body: rb, ang: -Math.PI / 2, on: false, wide: false };
  buildRakeShapes(false);

  _zones = ZONES.map((def, i) => ({ def, i, dirt: 0, ref: def.initial, open: i === 0, cleared: false, pct: 0, openT: i === 0 ? 0 : -1 }));

  _intakes = [];
  _intakes.push({ kind: "bin", x: BIN.drop.x, y: BIN.drop.y, r: BIN.r, pull: 560, on: true, acc: 0, accN: 0, t: 0, zone: 0 });
  ZONES.forEach((z, i) => {
    const c = z.chute;
    _intakes.push({ kind: "chute", x: c.x + c.nx * 14, y: c.y + c.ny * 14, r: 42, pull: 760, on: false, acc: 0, accN: 0, t: 0, zone: i, def: c, spin: 0 });
  });
  _intakes.push({ kind: "pump", x: PUMP.x, y: PUMP.y, r: PUMP.r, pull: 240, on: false, acc: 0, accN: 0, t: 0, zone: 4 });

  // Leaves already down: most of them under the trees, the rest anywhere.
  ZONES.forEach((z, zi) => {
    const trees = TREES.filter((t) => t.zone === zi || hypot(t.x - (z.rect[0] + z.rect[2]) / 2, t.y - (z.rect[1] + z.rect[3]) / 2) < 200);
    let n = 0, guard = 0;
    while (n < z.initial && guard++ < 5000) {
      let x, y, kind;
      const own = TREES.filter((t) => t.zone === zi);
      if (own.length && rnd() < 0.62) {
        const t = own[Math.floor(rnd() * own.length)];
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * t.r * 1.15;
        x = t.x + Math.cos(a) * d; y = t.y + Math.sin(a) * d;
        kind = leafKindFor(rnd, t.kinds);
      } else {
        const r = z.rect;
        x = lerp(r[0] + 10, r[2] - 10, rnd()); y = lerp(r[1] + 10, r[3] - 10, rnd());
        const t = trees.length ? trees[Math.floor(rnd() * trees.length)] : TREES[0];
        kind = leafKindFor(rnd, t.kinds);
      }
      if (zoneAt(x, y) !== zi || blocked(x, y, 5)) continue;
      if (inPool(x, y) && zi === 4 && rnd() < 0.5) continue;
      spawnLeaf(x, y, kind);
      n++;
    }
  });

  _money = 0; _earned = 0; _collected = 0; _golds = 0;
  _valMul = 1; _speedMul = 1; _reachMul = 1;
  _owned = {};
  _bag = { n: 0, value: 0 };
  _tool = "hand";
  _gentle = false;
  _using = false;
  _blowFx = 0;
  _shopOpen = false;
  _choice = null;
  _pauseMenu = false;
  _gust = null;
  _nextGust = GUST_FIRST;
  _floaters = [];
  _banners = [];
  _sparks = [];
  _clock = 0;
  _result = null;
  _stepN = 0;
  _stats = { hand: 0, rake: 0, blowerBin: 0, chute: 0, pump: 0 };
  countZones();
  for (const z of _zones) z.ref = Math.max(z.def.initial, z.dirt);
}

function buildRakeShapes(wide) {
  const b = _rake.body;
  const inSpace = !!b.space;
  if (inSpace) b.space = null;
  b.shapes.clear();
  const w = wide ? RAKE.wWide : RAKE.w;
  // A shallow cup facing +x: the head bar and two short wings angled
  // forward, so the pile collects in front of the head instead of rolling
  // off its ends.
  b.shapes.add(new Polygon(Polygon.box(3, w), MAT_RAKE, F_RAKE));
  for (const s of [1, -1]) {
    const wing = new Polygon(Polygon.box(11, 2.6), MAT_RAKE, F_RAKE);
    wing.rotate(-s * 0.42);
    wing.translate(new Vec2(4.6, s * (w / 2 - 2)));
    b.shapes.add(wing);
  }
  _rake.wide = wide;
  if (inSpace) b.space = _space;
}

function countZones() {
  for (const z of _zones) { z.dirt = 0; z.air = 0; }
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    const p = L.body.position;
    const z = _zones[zoneAt(p.x, p.y)];
    z.dirt++;
    if (L.air) z.air++;
  }
  for (const z of _zones) {
    z.ref = Math.max(z.ref, z.dirt);
    z.pct = z.ref > 0 ? 1 - z.dirt / z.ref : 1;
  }
}

// ── Feedback ─────────────────────────────────────────────────────────────
function floater(x, y, text, color, size = 13) {
  _floaters.push({ x, y, text, color, size, t: 0, life: 1.3 });
  if (_floaters.length > 28) _floaters.shift();
}
// Banners queue up and show one at a time; a waiting one cuts the current
// one short.
function pushBanner(text, color, life = 1.8, sub = "") {
  if (_banners.some((b) => b.text === text)) return;
  _banners.push({ text, sub, color, t: 0, life });
  if (_banners.length > 4) _banners.splice(1, 1);
}
function spark(x, y, z, col, n = 4, sp = 30) {
  const rnd = Math.random;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    _sparks.push({ x, y, z, vx: Math.cos(a) * sp * (0.4 + rnd()), vy: Math.sin(a) * sp * (0.4 + rnd()), vz: 20 + rnd() * 30, t: 0, life: 0.5 + rnd() * 0.3, col });
  }
  if (_sparks.length > 220) _sparks.splice(0, _sparks.length - 220);
}

// ── Economy ──────────────────────────────────────────────────────────────
const tierOf = (id) => _owned[id] ?? 0;
const bagCap = () => BAG_CAPS[tierOf("bag")];
const has = (id) => tierOf(id) > 0;
const toolOwned = (t) => t === "hand" || has(t);

function pay(val, intake) {
  const m = val * _valMul;
  _money += m;
  _earned += m;
  if (intake) { intake.acc += m; intake.accN++; }
}

function collectDirect(L, intake) {
  pay(L.t.val, intake);
  _collected++;
  if (L.t.gold) { _golds++; floater(L.body.position.x, L.body.position.y - 6, "GOLDEN LEAF!", "#ffd54a", 12); }
  spark(L.body.position.x, L.body.position.y, L.h + 2, L.t.col, 3, 26);
  removeLeaf(L);
}

function toBag(L) {
  if (_bag.n >= bagCap()) {
    if (_clock - _player.fullT > 1.4) {
      _player.fullT = _clock;
      floater(_player.body.position.x, _player.body.position.y - 16, "SACK FULL — empty it at the bin", "#ffb347", 12);
    }
    return false;
  }
  _bag.n++;
  _bag.value += L.t.val;
  if (L.t.gold) { _bag.gold = (_bag.gold ?? 0) + 1; floater(L.body.position.x, L.body.position.y - 6, "★", "#ffd54a", 16); }
  spark(L.body.position.x, L.body.position.y, L.h + 2, L.t.col, 2, 18);
  removeLeaf(L);
  return true;
}

// Nearest pickable leaf around (x, y).
function nearestLeaf(x, y, r) {
  let best = null, bd = r * r;
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    if (L.air && L.h > 6) continue;
    const p = L.body.position;
    const dx = p.x - x, dy = p.y - y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = L; }
  }
  return best;
}

function buy(item) {
  const tier = tierOf(item.id);
  if (tier >= item.tiers.length) return false;
  if (item.req && !has(item.req)) { pushBanner(`Needs the ${SHOP.find((s) => s.id === item.req).name.toLowerCase()} first`, "#ffb347", 1.4); return false; }
  if (item.zone !== undefined && !_zones[item.zone].open) { pushBanner(`Open the ${ZONES[item.zone].name.toLowerCase()} first`, "#ffb347", 1.4); return false; }
  const cost = item.tiers[tier];
  if (_money < cost) { pushBanner("Not enough money", "#ff6b6b", 1.2); return false; }
  _money -= cost;
  _owned[item.id] = tier + 1;
  if (item.id === "rake") setTool("rake");
  else if (item.id === "blower") setTool("blower");
  else if (item.id === "wide") buildRakeShapes(true);
  else if (item.id.startsWith("chute")) {
    const I = _intakes.find((q) => q.kind === "chute" && q.zone === item.zone);
    if (I) I.on = true;
  } else if (item.id === "pump") {
    _intakes.find((q) => q.kind === "pump").on = true;
  }
  pushBanner(`${item.name.toUpperCase()}${item.tiers.length > 1 ? " " + "I".repeat(tier + 1) : ""}`, "#7ee787", 1.3, "bought");
  return true;
}

function setTool(t) {
  if (!toolOwned(t)) return;
  _tool = t;
}

// ── Zones, rewards, gates ────────────────────────────────────────────────
function rewardOptions(i) {
  return [
    { id: "value", label: "+25 % leaf value", sub: "every leaf pays more" },
    { id: "cash", label: `+$${90 + i * 70}`, sub: "cash in hand, right now" },
    i % 2 === 0
      ? { id: "speed", label: "+15 % walking speed", sub: "quicker trips to the bin" }
      : { id: "reach", label: "+30 % reach", sub: "bigger hand grab and rake scoop" },
  ];
}

function zoneCleared(z) {
  z.cleared = true;
  _choice = { zone: z.i, opts: rewardOptions(z.i), t: 0 };
  pushBanner(`${z.def.name.toUpperCase()} — 100 %`, "#7ee787", 2.2);
}

function pickReward(k) {
  const c = _choice;
  if (!c) return;
  const o = c.opts[k];
  if (!o) return;
  if (o.id === "value") _valMul += 0.25;
  else if (o.id === "cash") { const v = 90 + c.zone * 70; _money += v; _earned += v; }
  else if (o.id === "speed") _speedMul += 0.15;
  else if (o.id === "reach") _reachMul += 0.3;
  _choice = null;
  const next = _zones[c.zone + 1];
  if (next && !next.open) openZone(next.i);
  else if (!next) pushBanner("Every gate is open", "#ffd166", 2, "now finish the job before the trees do");
}

function openZone(i) {
  const z = _zones[i];
  z.open = true;
  z.openT = _clock;
  const g = _gates.find((q) => q.zone === i);
  if (g && !g.open) {
    g.open = true;
    g.body.space = null;
  }
  pushBanner(`GATE OPEN: ${z.def.name.toUpperCase()}`, "#ffd166", 2.2);
}

// ── Input ────────────────────────────────────────────────────────────────
function readInput() {
  if (_autopilot) return _autopilot(debugState());
  const k = _keys;
  let mx = 0, my = 0;
  if (k.KeyA || k.ArrowLeft) mx -= 1;
  if (k.KeyD || k.ArrowRight) mx += 1;
  if (k.KeyW || k.ArrowUp) my -= 1;
  if (k.KeyS || k.ArrowDown) my += 1;
  if (mx || my) _kbMoveT = _clock;
  const use = _ptr.down || !!k.Space;
  const aim = _ptr.has ? pointerWorld() : null;
  // No movement keys lately: holding the pointer walks the gardener there
  // (touch play), stopping at the tool's working distance.
  if (_ptr.down && aim && _clock - _kbMoveT > 2.5 && !mx && !my) {
    const p = _player.body.position;
    const dx = aim.x - p.x, dy = aim.y - p.y, d = hypot(dx, dy);
    const stop = _tool === "blower" ? 105 : _tool === "rake" ? 26 : 28;
    if (d > stop) { mx = dx / d; my = dy / d; }
  }
  return { mx, my, use, aim, gentle: _gentle || !!k.ShiftLeft || !!k.ShiftRight };
}

function pointerWorld() {
  if (_screenToWorld) {
    const w = _screenToWorld(_ptr.sx, _ptr.sy);
    if (w) return w;
  }
  return { x: _ptr.sx, y: _ptr.sy };
}

// ── Player + tools ───────────────────────────────────────────────────────
const wrapPi = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

function movePlayer(inp) {
  const P = _player, b = P.body;
  let mx = inp.mx, my = inp.my;
  const m = hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  const sp = SPEED * _speedMul * (1 + 0.2 * tierOf("boots")) * (_tool === "blower" && inp.use ? 0.8 : 1);
  const tx = mx * sp, ty = my * sp;
  const v = b.velocity;
  const acc = 1100 * DT;
  const dx = tx - v.x, dy = ty - v.y, dd = hypot(dx, dy);
  const k = dd > acc ? acc / dd : 1;
  v.setxy(v.x + dx * k, v.y + dy * k);
  b.angularVel = 0;
  P.speed = hypot(v.x, v.y);
  P.walk += P.speed * DT * 0.16;
  // Facing: towards the pointer while it is live, else where we walk.
  const p = b.position;
  let want = P.face;
  const pointerLive = inp.aim && (_clock - _ptr.moveT < 2.5 || inp.use || _clock - _kbMoveT > 2.5);
  if (pointerLive) {
    const ax = inp.aim.x - p.x, ay = inp.aim.y - p.y;
    if (ax * ax + ay * ay > 16) want = Math.atan2(ay, ax);
    _aimW = inp.aim;
  } else if (P.speed > 8) {
    want = Math.atan2(v.y, v.x);
    _aimW = { x: p.x + Math.cos(want) * 60, y: p.y + Math.sin(want) * 60 };
  } else {
    _aimW = { x: p.x + Math.cos(P.face) * 60, y: p.y + Math.sin(P.face) * 60 };
  }
  const d = wrapPi(want - P.face);
  const turn = 13 * DT;
  P.face = wrapPi(P.face + clamp(d, -turn, turn));
  P.aimD = inp.aim ? hypot(_aimW.x - p.x, _aimW.y - p.y) : 60;
}

function updateRake(inp) {
  const R = _rake, P = _player, b = R.body;
  const want = _tool === "rake" && _phase === "play";
  if (!want) {
    if (R.on) { b.space = null; R.on = false; }
    return;
  }
  const p = P.body.position;
  const off = RAKE.off;
  if (!R.on) {
    R.ang = P.face;
    b.position.setxy(p.x + Math.cos(R.ang) * off, p.y + Math.sin(R.ang) * off);
    b.rotation = R.ang;
    b.velocity.setxy(0, 0);
    b.angularVel = 0;
    b.space = _space;
    R.on = true;
  }
  // The head follows the facing with a rate limit (a snap would fling the
  // pile) and is driven by velocity, so the solver sees it moving.
  const d = wrapPi(P.face - R.ang);
  R.ang += clamp(d, -9 * DT, 9 * DT);
  const tx = p.x + Math.cos(R.ang) * off, ty = p.y + Math.sin(R.ang) * off;
  const rot = b.rotation + wrapPi(R.ang - b.rotation);
  b.setVelocityFromTarget(new Vec2(tx, ty), rot, DT);
  // The tines hold what is in the cup: leaves just in front of the head are
  // dragged along with it instead of rolling off its ends.
  const rv = b.velocity, rc = Math.cos(R.ang), rs = Math.sin(R.ang);
  const half = (R.wide ? RAKE.wWide : RAKE.w) / 2 + 1;
  if (hypot(rv.x, rv.y) > 5) {
    for (let i = 0; i < _leaves.length; i++) {
      const L = _leaves[i];
      if (L.air) continue;
      const q = L.body.position;
      const dx = q.x - b.position.x, dy = q.y - b.position.y;
      const lx = dx * rc + dy * rs;
      if (lx < -1 || lx > 22) continue;
      const ly = -dx * rs + dy * rc;
      if (ly > half + 3 || ly < -half - 3) continue;
      // Carried along, and gathered towards the middle of the head.
      const v = L.body.velocity;
      const k = 0.5 * (1 - lx / 26);
      const gx = rv.x + rs * ly * 3.5, gy = rv.y - rc * ly * 3.5;
      v.setxy(v.x + (gx - v.x) * k, v.y + (gy - v.y) * k);
    }
  }
  if (inp.use) {
    const w = R.wide;
    const r = (w ? RAKE.scoopWide : RAKE.scoop) * _reachMul;
    const cx = tx + Math.cos(R.ang) * 5, cy = ty + Math.sin(R.ang) * 5;
    P.pickAcc += (w ? RAKE.rateWide : RAKE.rate) * DT;
    while (P.pickAcc >= 1) {
      P.pickAcc -= 1;
      const L = nearestLeaf(cx, cy, r);
      if (!L) { P.pickAcc = Math.min(P.pickAcc, 1); break; }
      if (!toBag(L)) break;
      _stats.rake++;
    }
  }
}

function handPick(inp) {
  const P = _player, p = P.body.position;
  const reach = HAND.reach * _reachMul;
  let ax = _aimW.x - p.x, ay = _aimW.y - p.y;
  const d = hypot(ax, ay);
  if (d > reach) { ax *= reach / d; ay *= reach / d; }
  const tx = p.x + ax, ty = p.y + ay;
  P.handX = tx; P.handY = ty;
  if (!inp.use) return;
  const r = HAND.pick * _reachMul;
  // Swipe: leaves around the hand drift into it.
  const r2 = r * 2.2;
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    if (L.air) continue;
    const q = L.body.position;
    const dx = tx - q.x, dy = ty - q.y, dd = hypot(dx, dy);
    if (dd < r2 && dd > 0.5) {
      const v = L.body.velocity;
      v.setxy(v.x + dx / dd * 260 * DT, v.y + dy / dd * 260 * DT);
    }
  }
  P.pickAcc += HAND.rate * DT;
  while (P.pickAcc >= 1) {
    P.pickAcc -= 1;
    const L = nearestLeaf(tx, ty, r);
    if (!L) { P.pickAcc = Math.min(P.pickAcc, 1); break; }
    if (!toBag(L)) break;
    _stats.hand++;
  }
}

function blow(inp) {
  const on = _tool === "blower" && inp.use && has("blower");
  _blowFx = on ? Math.min(1, _blowFx + DT * 4) : Math.max(0, _blowFx - DT * 3);
  _player.blowing = on;
  _player.gentle = inp.gentle;
  if (_blowFx <= 0.01) return;
  const tier = tierOf("power");
  const gentle = inp.gentle;
  const power = BLOWER.power[tier] * _blowFx * (gentle ? 0.68 : 1);
  const R = BLOWER.range[tier] * (gentle ? 0.85 : 1);
  const P = _player, p = P.body.position;
  const c = Math.cos(P.face), s = Math.sin(P.face);
  const ox = p.x + c * 11, oy = p.y + s * 11;
  const tanC = Math.tan(BLOWER.cone);
  _player.nozzle = { x: ox, y: oy, R, c, s };
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    const q = L.body.position;
    const dx = q.x - ox, dy = q.y - oy;
    const along = dx * c + dy * s;
    if (along < -3 || along > R) continue;
    const lat = -dx * s + dy * c;
    const half = 5 + Math.max(0, along) * tanC;
    const u = lat / half;
    if (u > 1 || u < -1) continue;
    const k = 1 - Math.max(0, along) / R;
    let f = power * Math.pow(k, 0.75) * (1 - 0.55 * u * u);
    if (L.air && L.h > 30) f *= 0.5;
    // Mostly down the axis, spreading out a little, with turbulence.
    const turb = (Math.random() - 0.5) * 0.55;
    const sx = u * 0.3 + turb;
    const fx = c - s * sx, fy = s + c * sx;
    const v = L.body.velocity;
    const water = !L.air && inPool(q.x, q.y);
    const fk = (water ? 0.45 : 1) * f * DT;
    v.setxy(v.x + fx * fk, v.y + fy * fk);
    L.body.angularVel += (Math.random() - 0.5) * f * 0.02 * DT * 60;
    if (L.air) {
      L.vz += f * 0.16 * DT;
    } else if (!gentle && !water && f > BLOWER.lift) {
      // Too much air under a leaf and it takes off.
      L.lift += (f - BLOWER.lift) * DT;
      if (L.lift > 8) { setAir(L, 16 + L.lift * 1.5); L.lift = 0; }
    }
  }
}

// ── Trees, wind ──────────────────────────────────────────────────────────
function dropFromTree(T, n = 1) {
  const d = T.def, rnd = _rnd;
  for (let k = 0; k < n && T.stock > 0; k++) {
    let x, y, g = 0;
    do {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * d.r * 0.92;
      x = d.x + Math.cos(a) * rr; y = d.y + Math.sin(a) * rr;
    } while ((hypot(x - d.x, y - d.y) < d.tr + 5 || x < 12 || x > 888 || y < 12 || y > 488) && g++ < 20);
    const gv = _gust && _gust.t > 0 ? _gust : null;
    const vx = (rnd() - 0.5) * 18 + (gv ? Math.cos(gv.dir) * 50 : 0);
    const vy = (rnd() - 0.5) * 18 + (gv ? Math.sin(gv.dir) * 50 : 0);
    spawnLeaf(x, y, leafKindFor(rnd, d.kinds), { h: d.h * (0.55 + rnd() * 0.35), vz: -4, vx, vy, fall: true });
    T.stock--;
    T.drop = 1;
  }
}

function updateTrees() {
  for (const T of _trees) {
    T.drop = Math.max(0, T.drop - DT * 2);
    if (T.stock <= 0 || !_zones[T.def.zone].open) continue;
    const rate = T.stock0 / 150 * (0.7 + 0.6 * Math.sin(_clock * 0.37 + T.i * 1.7) ** 2);
    T.acc += rate * DT;
    while (T.acc >= 1 && T.stock > 0) { T.acc -= 1; dropFromTree(T, 1); }
  }
}

function updateGust() {
  if (!_gust) {
    if (_clock >= _nextGust) {
      _gust = { dir: _rnd() * Math.PI * 2, t: -GUST_WARN, burst: false };
      pushBanner("GUST INCOMING", "#9fd8ff", GUST_WARN, "pile up and bag what you can");
    }
    return;
  }
  const G = _gust;
  G.t += DT;
  if (G.t > 0 && G.t < GUST_LEN) {
    const env = Math.sin(Math.PI * G.t / GUST_LEN);
    const c = Math.cos(G.dir), s = Math.sin(G.dir);
    for (let i = 0; i < _leaves.length; i++) {
      const L = _leaves[i];
      const q = L.body.position;
      // Gusty, not uniform: a travelling wave across the yard.
      const wave = 0.55 + 0.45 * Math.sin((q.x * c + q.y * s) * 0.03 - G.t * 5);
      let a = GUST_ACC * env * wave;
      if (!L.air && inPool(q.x, q.y)) a *= 0.25;
      const v = L.body.velocity;
      if (L.air) a *= 0.7;
      v.setxy(v.x + c * a * DT, v.y + s * a * DT);
      if (!L.air && env > 0.6 && _rnd() < 0.0025 * env) setAir(L, 18 + _rnd() * 16);
    }
    if (!G.burst && G.t > 0.4) {
      G.burst = true;
      for (const T of _trees) if (_zones[T.def.zone].open && T.stock > 0) dropFromTree(T, Math.ceil(T.stock * 0.12));
    }
    for (const T of _trees) T.sway = env;
  } else if (G.t >= GUST_LEN) {
    _gust = null;
    for (const T of _trees) T.sway = 0;
    _nextGust = _clock + lerp(GUST_GAP[0], GUST_GAP[1], _rnd());
  }
}

// ── Leaves ───────────────────────────────────────────────────────────────
function updateLeaves() {
  const cx = (POOL.x0 + POOL.x1) / 2, cy = (POOL.y0 + POOL.y1) / 2;
  const pumpOn = _intakes[_intakes.length - 1].on;
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    const b = L.body;
    if (L.air) {
      L.vz -= AIR_G * DT;
      if (L.vz < -AIR_TERM) L.vz = -AIR_TERM;
      L.h += L.vz * DT;
      if (L.h > MAX_H) { L.h = MAX_H; L.vz = Math.min(L.vz, 0); }
      const v = b.velocity;
      const dr = 1 - AIR_DRAG * DT;
      // Flutter: a falling leaf rocks side to side as it drops.
      const fl = L.vz < 0 ? 46 * Math.sin(_time * 4.1 + L.ph) : 0;
      const a = b.rotation;
      v.setxy(v.x * dr - Math.sin(a) * fl * DT, v.y * dr + Math.cos(a) * fl * DT);
      b.angularVel = b.angularVel * 0.96 + Math.sin(_time * 2.3 + L.ph) * 0.12;
      if (L.h <= 0) land(L);
      continue;
    }
    if (b.isSleeping) continue;
    const p = b.position, v = b.velocity;
    const vx = v.x, vy = v.y;
    const sp = hypot(vx, vy);
    if (sp > 360) v.setxy(vx * 360 / sp, vy * 360 / sp);
    if (inPool(p.x, p.y)) {
      // Floating: the fluid shape drags it; the water circulates, and the
      // skimmer pulls towards its corner once the pump runs.
      let tx = -(p.y - cy) * 0.22, ty = (p.x - cx) * 0.08;
      if (pumpOn) {
        const dx = PUMP.x - p.x, dy = PUMP.y - p.y, d = hypot(dx, dy) || 1;
        tx += dx / d * 26; ty += dy / d * 26;
      }
      v.setxy(vx + (tx - vx) * 1.2 * DT, vy + (ty - vy) * 1.2 * DT);
      b.angularVel *= 0.97;
    } else {
      const mu = SURF[surfaceAt(p.x, p.y)].mu;
      const dv = mu * DT;
      if (sp > 0) {
        const f = sp <= dv ? 0 : (sp - dv) / sp;
        v.setxy(vx * f, vy * f);
      }
      const w = b.angularVel;
      if (w !== 0) b.angularVel = Math.abs(w) < 0.05 ? 0 : w * 0.86;
    }
    L.lift *= 0.9;
    // Anything that escaped the fence comes back in.
    if (p.x < 10 || p.x > 890 || p.y < 10 || p.y > 490) p.setxy(clamp(p.x, 12, 888), clamp(p.y, 12, 488));
  }
}

function updateIntakes() {
  for (const I of _intakes) {
    I.t += DT;
    if (I.kind === "chute") I.spin += (I.on ? 18 : 0) * DT;
    if (!I.on) continue;
    const r2 = I.r * I.r;
    for (let i = _leaves.length - 1; i >= 0; i--) {
      const L = _leaves[i];
      if (L.air && L.h > 14) continue;
      const q = L.body.position;
      const dx = I.x - q.x, dy = I.y - q.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      if (I.kind === "pump" && !inPool(q.x, q.y)) continue;
      const d = Math.sqrt(d2) || 1;
      if (d < (I.kind === "pump" ? 7 : 9)) {
        _stats[I.kind === "bin" ? "blowerBin" : I.kind]++;
        collectDirect(L, I);
        continue;
      }
      const a = I.pull * (1 - 0.5 * d / I.r);
      const v = L.body.velocity;
      v.setxy(v.x * 0.97 + dx / d * a * DT, v.y * 0.97 + dy / d * a * DT);
    }
    if (I.acc > 0 && I.t > 0.35) {
      floater(I.x, I.y - 10, `+$${Math.round(I.acc)}`, "#7ee787", I.accN > 6 ? 15 : 13);
      I.acc = 0; I.accN = 0; I.t = 0;
    }
  }
}

function emptyBag() {
  const P = _player;
  const p = P.body.position;
  const d = hypot(p.x - BIN.drop.x, p.y - BIN.drop.y);
  P.atBin = d < 40;
  if (!P.atBin || _bag.n <= 0) { P.emptyAcc = 0; return; }
  P.emptyAcc += 60 * DT;
  const bin = _intakes[0];
  while (P.emptyAcc >= 1 && _bag.n > 0) {
    P.emptyAcc -= 1;
    const each = _bag.value / _bag.n;
    _bag.value -= each;
    _bag.n--;
    pay(each, bin);
    _collected++;
    if (_bag.n === 0) { _bag.value = 0; if (_bag.gold) { _golds += _bag.gold; _bag.gold = 0; } }
  }
  bin.t = Math.max(bin.t, 0.2);
  if (_rnd() < 0.4) spark(BIN.x + (_rnd() - 0.5) * 20, BIN.y, 14, [0xe8722a, 0x9a6431, 0xe9c43c][Math.floor(_rnd() * 3)], 1, 14);
}

// ── Game flow ────────────────────────────────────────────────────────────
function newGame() {
  buildWorld();
  _phase = "play";
  _phaseT = 0;
  pushBanner("CLEAR THE FRONT LAWN", "#ffd166", 2.4, "pick leaves up and empty the sack in the bin");
}

function goTitle() {
  buildWorld();
  _phase = "title";
  _phaseT = 0;
}

function finishGame() {
  _phase = "done";
  _phaseT = 0;
  const prev = _best?.time ?? Infinity;
  const isBest = _clock < prev;
  if (isBest) { _best = { time: _clock, earned: Math.round(_earned) }; saveBest(); }
  _result = { time: _clock, collected: _collected, earned: _earned, golds: _golds, isBest };
  _banners = [];
}

const paused = () => _shopOpen || !!_choice || _pauseMenu;
const treesLeft = () => _trees.reduce((s, t) => s + t.stock, 0);

// The per-physics-step game tick (runs from the Space.step wrapper).
// Returns false when the world is frozen (shop / reward choice / pause).
function tickGame() {
  _stepN++;
  for (const f of _floaters) f.t += DT;
  _floaters = _floaters.filter((f) => f.t < f.life);
  if (_banners.length) {
    const bn = _banners[0];
    bn.t += DT;
    if (_banners.length > 1) bn.life = Math.min(bn.life, Math.max(bn.t + 0.4, 0.9));
    if (bn.t >= bn.life) _banners.shift();
  }
  if (_choice) _choice.t += DT;
  if (paused()) return false;
  _phaseT += DT;
  const play = _phase === "play";
  const inp = play ? readInput() : { mx: 0, my: 0, use: false, aim: null, gentle: false };
  if (play) _clock += DT;
  _using = inp.use;
  movePlayer(inp);
  if (play) {
    if (_tool === "hand") handPick(inp);
    updateRake(inp);
    blow(inp);
    updateTrees();
    updateGust();
    emptyBag();
  } else {
    updateRake(inp);
    blow(inp);
  }
  updateLeaves();
  updateIntakes();
  for (const g of _gates) if (g.open) g.t = Math.min(1, g.t + DT * 1.4);
  for (const s of _sparks) { s.t += DT; s.x += s.vx * DT; s.y += s.vy * DT; s.z += s.vz * DT; s.vz -= 120 * DT; }
  _sparks = _sparks.filter((s) => s.t < s.life);

  if (_stepN % 6 === 0) {
    countZones();
    if (play) {
      for (const z of _zones) if (z.open && !z.cleared && z.dirt === 0 && !_choice) zoneCleared(z);
      if (_zones[4].cleared && !_choice && _leaves.length === 0 && treesLeft() === 0) finishGame();
    }
  }
  return true;
}

// ── 2D drawing ───────────────────────────────────────────────────────────
// The flat renderers share one scene description. The ground (grass,
// asphalt, tiles, water, beds) is baked once into a canvas that also
// becomes the 3D ground texture; the static props are baked into a second
// canvas. Only the moving things — leaves, gardener, tools, gates, tree
// canopies — are drawn every frame, through a tiny painter interface with a
// Canvas2D and a PixiJS Graphics implementation.

const hexCss = (h) => "#" + (h >>> 0).toString(16).padStart(6, "0");
function shade(hex, k) {
  let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}

class CanvasPainter {
  constructor(ctx) { this.ctx = ctx; }
  poly(pts, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  circle(x, y, r, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  // Many polygons in one path: one fill and one stroke for the lot.
  polys(list, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    if (!list.length) return;
    const c = this.ctx;
    c.beginPath();
    for (const pts of list) {
      c.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
      c.closePath();
    }
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  line(pts, color, width = 1, alpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.globalAlpha = alpha;
    c.strokeStyle = hexCss(color);
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
    c.globalAlpha = 1;
  }
}

class PixiPainter {
  constructor(g) { this.g = g; }
  poly(pts, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const g = this.g.poly(pts, true);
    if (fill !== null) g.fill({ color: fill, alpha });
    if (stroke !== null) g.stroke({ color: stroke, width: sw, alpha: salpha });
  }
  circle(x, y, r, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const g = this.g.circle(x, y, r);
    if (fill !== null) g.fill({ color: fill, alpha });
    if (stroke !== null) g.stroke({ color: stroke, width: sw, alpha: salpha });
  }
  polys(list, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    if (!list.length) return;
    const g = this.g;
    for (const pts of list) g.poly(pts, true);
    if (fill !== null) g.fill({ color: fill, alpha });
    if (stroke !== null) g.stroke({ color: stroke, width: sw, alpha: salpha });
  }
  line(pts, color, width = 1, alpha = 1) {
    const g = this.g;
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke({ color, width, alpha, cap: "round", join: "round" });
  }
}

function xform(x, y, a, pts, sx = 1, sy = 1) {
  const c = Math.cos(a), s = Math.sin(a);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    const lx = pts[i] * sx, ly = pts[i + 1] * sy;
    out[i] = x + lx * c - ly * s;
    out[i + 1] = y + lx * s + ly * c;
  }
  return out;
}
const rectPts = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined" && typeof document === "undefined") return new OffscreenCanvas(w, h);
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function speckle(ctx, rnd, n, x0, y0, x1, y1, colors, size = 1.4, alpha = 0.1) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const s = size * (0.5 + rnd());
    ctx.fillRect(lerp(x0, x1, rnd()), lerp(y0, y1, rnd()), s, s);
  }
  ctx.globalAlpha = 1;
}
const fillR = (ctx, r, col) => { ctx.fillStyle = col; ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); };

// The ground: one canvas, shared by all three renderers.
function drawGround(ctx, opts = {}) {
  const rnd = lcg(77);
  // Grass everywhere first, with mower stripes and autumn-dry patches.
  ctx.fillStyle = "#6f8d38";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let x = 0; x < VIEW_W; x += 28) {
    ctx.fillStyle = (x / 28) % 2 ? "rgba(255,255,220,0.05)" : "rgba(0,30,0,0.05)";
    ctx.fillRect(x, 0, 28, VIEW_H);
  }
  for (let i = 0; i < 70; i++) {
    const x = rnd() * VIEW_W, y = rnd() * VIEW_H, r = 10 + rnd() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() < 0.5 ? "rgba(170,160,70,0.18)" : "rgba(60,90,30,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  speckle(ctx, rnd, 9000, 0, 0, VIEW_W, VIEW_H, ["#8fae4a", "#5a7a2a", "#a6b85a", "#4d6a22"], 1.6, 0.35);

  // Driveway.
  const D = [465, 166, 650, 492];
  fillR(ctx, D, "#5b5e62");
  speckle(ctx, rnd, 5000, D[0], D[1], D[2], D[3], ["#6e7176", "#46494d", "#80838a"], 1.3, 0.5);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(540, 250, 34, 230);            // oil-darkened tyre tracks
  ctx.fillStyle = "#8c8e90";
  ctx.fillRect(465, 166, 4, 326);
  ctx.fillRect(646, 166, 4, 326);
  // Porch.
  fillR(ctx, [476, 166, 536, 186], "#b79c7c");
  ctx.strokeStyle = "rgba(60,40,20,0.35)";
  ctx.lineWidth = 0.8;
  for (let x = 476; x <= 536; x += 12) { ctx.beginPath(); ctx.moveTo(x, 166); ctx.lineTo(x, 186); ctx.stroke(); }
  ctx.fillStyle = "#8d6a4a"; ctx.fillRect(476, 184, 60, 2);

  // Patio tiles.
  const Pt = [120, 8, 330, 169];
  fillR(ctx, Pt, "#b9a486");
  for (let y = 8; y < 169; y += 18) {
    for (let x = 120 + ((y / 18) % 2 ? 9 : 0); x < 330; x += 18) {
      ctx.fillStyle = ["#c2ad8f", "#b19b7c", "#bca788", "#a8937a"][Math.floor(rnd() * 4)];
      ctx.fillRect(x + 0.6, y + 0.6, 16.8, 16.8);
    }
  }
  speckle(ctx, rnd, 1600, Pt[0], Pt[1], Pt[2], Pt[3], ["#8a7660", "#d8c8ae"], 1.2, 0.4);

  // Pool deck: flagstones.
  const Pd = [600, 8, 892, 169];
  fillR(ctx, Pd, "#c8bfae");
  for (let i = 0; i < 260; i++) {
    const x = lerp(Pd[0], Pd[2], rnd()), y = lerp(Pd[1], Pd[3], rnd());
    ctx.fillStyle = ["#d4ccbc", "#bdb4a2", "#cfc5b2", "#b5ab98"][i % 4];
    ctx.beginPath();
    const r = 9 + rnd() * 9;
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd() * 0.4; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8); }
    ctx.fill();
  }
  // Pool: coping, basin, water.
  ctx.fillStyle = "#e8e2d4";
  ctx.fillRect(POOL.x0 - 7, POOL.y0 - 7, POOL.x1 - POOL.x0 + 14, POOL.y1 - POOL.y0 + 14);
  ctx.fillStyle = "#9d978a";
  for (let x = POOL.x0 - 7; x < POOL.x1 + 7; x += 14) { ctx.fillRect(x, POOL.y0 - 7, 0.8, 7); ctx.fillRect(x, POOL.y1, 0.8, 7); }
  if (!opts.noWater) {
    const wg = ctx.createLinearGradient(POOL.x0, POOL.y0, POOL.x1, POOL.y1);
    wg.addColorStop(0, "#3fa6c8"); wg.addColorStop(0.5, "#2b8fb8"); wg.addColorStop(1, "#1f78a4");
    ctx.fillStyle = wg;
    ctx.fillRect(POOL.x0, POOL.y0, POOL.x1 - POOL.x0, POOL.y1 - POOL.y0);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const x = lerp(POOL.x0 + 8, POOL.x1 - 20, rnd()), y = lerp(POOL.y0 + 6, POOL.y1 - 6, rnd());
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y - 3, x + 14, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,40,70,0.25)";
    ctx.fillRect(POOL.x0, POOL.y0, POOL.x1 - POOL.x0, 5);
  } else {
    ctx.fillStyle = "#1c6f96";
    ctx.fillRect(POOL.x0, POOL.y0, POOL.x1 - POOL.x0, POOL.y1 - POOL.y0);
  }
  // Pool ladder.
  ctx.strokeStyle = "#e8eef2"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(POOL.x0 + 18, POOL.y1 - 1); ctx.lineTo(POOL.x0 + 18, POOL.y1 - 12); ctx.moveTo(POOL.x0 + 28, POOL.y1 - 1); ctx.lineTo(POOL.x0 + 28, POOL.y1 - 12); ctx.stroke();

  // Flower beds: mulch with autumn flowers.
  const flowers = ["#8a4ab8", "#e0a02a", "#d8582a", "#f0d050", "#b83a5a", "#f4f0e8"];
  for (const p of PATCHES) {
    if (p.surf !== "bed") continue;
    const r = p.rect;
    ctx.fillStyle = "#6a6a62";
    ctx.fillRect(r[0] - 2, r[1] - 2, r[2] - r[0] + 4, r[3] - r[1] + 4);
    fillR(ctx, r, "#4a3222");
    speckle(ctx, rnd, 900, r[0], r[1], r[2], r[3], ["#6a4a30", "#2e1e12", "#7a5a38"], 1.6, 0.6);
    const n = Math.floor((r[2] - r[0]) * (r[3] - r[1]) / 60);
    for (let i = 0; i < n; i++) {
      const x = lerp(r[0] + 3, r[2] - 3, rnd()), y = lerp(r[1] + 3, r[3] - 3, rnd());
      ctx.fillStyle = "#3d6a2a";
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flowers[Math.floor(rnd() * flowers.length)];
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.57) * 1.3, y + Math.sin(k * 1.57) * 1.3, 1.3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // Gravel path to the shed.
  for (const p of PATCHES) {
    if (p.surf !== "gravel") continue;
    const r = p.rect;
    fillR(ctx, r, "#b8ab94");
    speckle(ctx, rnd, 700, r[0], r[1], r[2], r[3], ["#8a7e6a", "#d8cbb2", "#9a8e78"], 1.6, 0.8);
  }
  // Stepping stones across the lawn to the patio gate and the driveway.
  ctx.fillStyle = "#b8b0a0";
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(250 - i * 3, 190 + i * 22, 8, 5.5, 0.2, 0, Math.PI * 2); ctx.fill(); }
  // House footprint shadow (evening sun from the south-west).
  ctx.fillStyle = "rgba(20,25,10,0.28)";
  ctx.beginPath(); ctx.moveTo(600, 14); ctx.lineTo(624, 30); ctx.lineTo(624, 172); ctx.lineTo(600, 166); ctx.fill();
  // Street beyond the fence (bottom strip is under the fence; the verge).
  ctx.fillStyle = "#4a5a2a";
  ctx.fillRect(0, 492, VIEW_W, 8);
}

// Static props, top-down.
function drawStatic(p, s) {
  const k = s.kind;
  const R = s.r !== undefined ? null : [s.x0, s.y0, s.x1, s.y1];
  const box = (inset = 0) => rectPts(R[0] + inset, R[1] + inset, R[2] - inset, R[3] - inset);
  if (k === "outer") {
    p.poly(box(), 0x7a5634, 1, 0x4a321c, 1);
    const horiz = R[2] - R[0] > R[3] - R[1];
    const len = horiz ? R[2] - R[0] : R[3] - R[1];
    for (let o = 0; o < len; o += 9) {
      const pts = horiz ? [R[0] + o, R[1], R[0] + o, R[3]] : [R[0], R[1] + o, R[2], R[1] + o];
      p.line(pts, 0x4a321c, 0.7, 0.8);
    }
  } else if (k === "house") {
    drawRoofTop(p);
  } else if (k === "fence") {
    const horiz = R[2] - R[0] > R[3] - R[1];
    p.poly(box(1.5), 0xe8e2d4, 1, 0x9a9486, 0.8);
    const len = horiz ? R[2] - R[0] : R[3] - R[1];
    for (let o = 3; o < len; o += 6) {
      const q = horiz ? [R[0] + o, (R[1] + R[3]) / 2] : [(R[0] + R[2]) / 2, R[1] + o];
      p.circle(q[0], q[1], 1.9, 0xf4f0e6, 1, 0x9a9486, 0.6);
    }
  } else if (k === "hedge") {
    p.poly(box(-2), 0x24401a);
    const len = R[3] - R[1];
    for (let o = 0; o < len; o += 5) {
      const cx = (R[0] + R[2]) / 2 + ((o * 7) % 5 - 2) * 0.6;
      p.circle(cx, R[1] + o, 5.4, [0x3d6a24, 0x4a7a2a, 0x355e20, 0x6a7a2a][(o / 5) % 4]);
    }
  } else if (k === "bin") {
    p.poly(xform(0, 0, 0, box(-2)), 0x000000, 0.25);
    p.poly(box(), 0x6a4a2a, 1, 0x3a2412, 1.2);
    for (let x = R[0] + 5; x < R[2]; x += 6) p.line([x, R[1] + 1, x, R[3] - 1], 0x4a3018, 1);
    p.poly(box(3), 0x3a2a18, 1);
    for (let i = 0; i < 9; i++) p.circle(R[0] + 6 + (i * 13) % 28, R[1] + 6 + (i * 7) % 10, 3, [0x9a6431, 0xe8722a, 0xc8362a, 0xe9c43c][i % 4]);
  } else if (k === "bench") {
    p.poly(box(), 0x8a6238, 1, 0x4d351d, 0.8);
    p.line([R[0] + 2, (R[1] + R[3]) / 2, R[2] - 2, (R[1] + R[3]) / 2], 0x5a3f1e, 0.8);
  } else if (k === "car") {
    const cx = (R[0] + R[2]) / 2, cy = (R[1] + R[3]) / 2, L = R[3] - R[1], W = R[2] - R[0];
    p.poly(rectPts(R[0] + 3, R[1] + 4, R[2] + 3, R[3] + 4), 0x000000, 0.28);
    p.poly(rectPts(R[0], R[1] + 2, R[2], R[3] - 2), 0x2d5a8a, 1, 0x16304a, 1);
    p.poly(rectPts(R[0] + 1, R[1], R[2] - 1, R[1] + 4), 0x2d5a8a);
    p.poly(rectPts(cx - W / 2 + 3, cy - L * 0.24, cx + W / 2 - 3, cy + L * 0.2), 0x1a2430, 1);
    p.poly(rectPts(cx - W / 2 + 4, cy - L * 0.16, cx + W / 2 - 4, cy + L * 0.12), 0x3a6a9a, 1);
    p.circle(R[0] + 4, R[1] + 3, 1.8, 0xfff2cc);
    p.circle(R[2] - 4, R[1] + 3, 1.8, 0xfff2cc);
    p.circle(R[0] + 4, R[3] - 3, 1.6, 0xc81a1a);
    p.circle(R[2] - 4, R[3] - 3, 1.6, 0xc81a1a);
  } else if (k === "wheelie") {
    p.poly(box(), s.col, 1, shade(s.col, -0.5), 1);
    p.line([R[0] + 2, R[1] + 3, R[2] - 2, R[1] + 3], shade(s.col, -0.4), 1);
  } else if (k === "pumpkin") {
    p.circle(s.x + 1, s.y + 1.5, s.r, 0x000000, 0.25);
    p.circle(s.x, s.y, s.r, 0xe0761e, 1, 0x8a3e0a, 0.8);
    for (let i = 0; i < 3; i++) p.line([s.x - s.r * 0.6 + i * s.r * 0.6, s.y - s.r * 0.8, s.x - s.r * 0.6 + i * s.r * 0.6, s.y + s.r * 0.8], 0xb85a14, 0.6);
    p.circle(s.x, s.y, 1.3, 0x4a6a1a);
  } else if (k === "shed") {
    p.poly(rectPts(R[0] - 3, R[1] - 3, R[2] + 5, R[3] + 5), 0x000000, 0.25);
    p.poly(rectPts(R[0] - 3, R[1] - 3, R[2] + 3, R[3] + 3), 0x6a3a2a, 1, 0x3a1e12, 1);
    const mid = (R[0] + R[2]) / 2;
    p.poly([R[0] - 3, R[1] - 3, mid, R[1] - 3, mid, R[3] + 3, R[0] - 3, R[3] + 3], 0x7a4432);
    for (let y = R[1]; y < R[3]; y += 6) p.line([R[0] - 3, y, R[2] + 3, y], 0x4a2a1c, 0.6, 0.7);
    p.line([mid, R[1] - 3, mid, R[3] + 3], 0x3a1e12, 1.4);
  } else if (k === "birdbath") {
    p.circle(s.x + 1.5, s.y + 2, s.r, 0x000000, 0.2);
    p.circle(s.x, s.y, s.r, 0xbab4a6, 1, 0x7a7466, 1);
    p.circle(s.x, s.y, s.r - 2.4, 0x4a8ab0);
  } else if (k === "hay") {
    p.poly(box(), 0xd8b458, 1, 0x9a7a2a, 1);
    for (let x = R[0] + 3; x < R[2]; x += 4) p.line([x, R[1] + 1, x + 1, R[3] - 1], 0xb8943a, 0.6);
    p.line([R[0], R[1] + 5, R[2], R[1] + 5], 0x8a5a2a, 0.8);
    p.line([R[0], R[3] - 5, R[2], R[3] - 5], 0x8a5a2a, 0.8);
  } else if (k === "table") {
    p.circle(s.x + 2, s.y + 3, s.r, 0x000000, 0.2);
    p.circle(s.x, s.y, s.r, 0xe8e4da, 1, 0x9a968c, 1);
    p.circle(s.x, s.y, 2, 0x9a968c);
    p.circle(s.x - 4, s.y + 3, 3.2, 0xc86a2a);
  } else if (k === "chair") {
    p.circle(s.x, s.y, s.r, 0x3a3f46, 1, 0x1a1d22, 0.8);
  } else if (k === "grill") {
    p.poly(box(), 0x2a2d32, 1, 0x101215, 1);
    p.poly(box(3), 0x40454c, 1);
    for (let x = R[0] + 5; x < R[2] - 3; x += 3) p.line([x, R[1] + 3, x, R[3] - 3], 0x7a7f86, 0.5);
  } else if (k === "planter") {
    p.poly(box(), 0xa7a39a, 1, 0x6e6a62, 1);
    for (let i = 0; i < 4; i++) p.circle(R[0] + 5 + i * 7.5, (R[1] + R[3]) / 2, 4, [0xd8582a, 0xe0a02a, 0x8a4ab8, 0xd8582a][i]);
  } else if (k === "lounger") {
    p.poly(box(), 0xf2f0e8, 1, 0x9a968c, 0.8);
    p.poly(rectPts(R[0], R[1], R[0] + 11, R[3]), 0x3a8ab8, 1);
    for (let x = R[0] + 14; x < R[2] - 2; x += 4) p.line([x, R[1] + 1.5, x, R[3] - 1.5], 0xbab6ac, 0.5);
  }
}

// Hipped roof with shingles, seen from above.
function drawRoofTop(p) {
  const x0 = 326, y0 = 4, x1 = 604, y1 = 170, rx0 = 400, rx1 = 530, ry = 87;
  p.poly(rectPts(x0 + 6, y0 + 6, x1 + 8, y1 + 8), 0x000000, 0.3);
  const faces = [
    { pts: [x0, y0, x1, y0, rx1, ry, rx0, ry], col: 0x7a3e2e },
    { pts: [x0, y1, rx0, ry, rx1, ry, x1, y1], col: 0x9a4e3a },
    { pts: [x0, y0, rx0, ry, x0, y1], col: 0x6a3426 },
    { pts: [x1, y0, x1, y1, rx1, ry], col: 0x8a4634 },
  ];
  for (const f of faces) p.poly(f.pts, f.col, 1, 0x3a1e14, 1);
  // Shingle courses.
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    p.line([lerp(x0, rx0, t), lerp(y1, ry, t), lerp(x1, rx1, t), lerp(y1, ry, t)], 0x6a3226, 0.7, 0.8);
    p.line([lerp(x0, rx0, t), lerp(y0, ry, t), lerp(x1, rx1, t), lerp(y0, ry, t)], 0x5a2a1e, 0.7, 0.8);
  }
  p.line([rx0, ry, rx1, ry], 0x4a2418, 2);
  p.line([x0, y0, rx0, ry], 0x4a2418, 1.4);
  p.line([x0, y1, rx0, ry], 0x4a2418, 1.4);
  p.line([x1, y0, rx1, ry], 0x4a2418, 1.4);
  p.line([x1, y1, rx1, ry], 0x4a2418, 1.4);
  // Gutters with a few leaves in them.
  p.line([x0, y1, x1, y1], 0x9aa0a6, 2.2);
  // Chimney.
  p.poly(rectPts(446, 40, 466, 58), 0x8a4a3a, 1, 0x3a1e14, 1);
  p.poly(rectPts(449, 43, 463, 55), 0x2a1a14, 1);
  // Skylight.
  p.poly(rectPts(500, 118, 522, 138), 0x3a5a7a, 1, 0xd8d8d0, 1.2);
  p.line([511, 118, 511, 138], 0xd8d8d0, 0.8);
}

// Baked layers.
let _layers = null;          // { gen, ground, statics, scale }
function ensureLayers(scale = 2) {
  if (_layers && _layers.gen === _gen && _layers.scale === scale) return _layers;
  const W = VIEW_W * scale, H = VIEW_H * scale;
  const ground = makeCanvas(W, H), statics = makeCanvas(W, H);
  if (!ground) return null;
  let ctx = ground.getContext("2d");
  ctx.scale(scale, scale);
  drawGround(ctx);
  ctx = statics.getContext("2d");
  ctx.scale(scale, scale);
  const sp = new CanvasPainter(ctx);
  for (const s of STATICS) if (s.kind !== "house") drawStatic(sp, s);
  for (const t of TREES) {
    sp.circle(t.x + 2, t.y + 3, t.tr + 1, 0x000000, 0.25);
    sp.circle(t.x, t.y, t.tr, 0x5a3d24, 1, 0x2d1d10, 1);
  }
  _layers = { gen: _gen, ground, statics, scale };
  return _layers;
}

// ── Moving things ────────────────────────────────────────────────────────
// Leaves are drawn from small pre-rendered sprites (one per kind and side,
// plus a shadow silhouette): a few hundred textured quads a frame instead of
// a few hundred anti-aliased polygons.
const LEAF_SPR = 40, LEAF_SPR_LEN = 32;
const _leafSpr = new Map();
function leafSprite(key) {
  let c = _leafSpr.get(key);
  if (c) return c;
  const [kind, side] = key.split("|");
  const t = LEAF_TYPES[kind];
  c = makeCanvas(LEAF_SPR, LEAF_SPR);
  if (!c) return null;
  const p = new CanvasPainter(c.getContext("2d"));
  const pts = xform(LEAF_SPR / 2, LEAF_SPR / 2, 0, LEAF_SHAPES[t.shape], LEAF_SPR_LEN, LEAF_SPR_LEN);
  if (side === "shadow") p.poly(pts, 0x000000, 1);
  else {
    const col = side === "under" ? shade(t.col, -0.22) : t.col;
    p.poly(pts, col, 1, t.edge, 1.6, 0.75);
    p.line([LEAF_SPR / 2 - LEAF_SPR_LEN * 0.62, LEAF_SPR / 2, LEAF_SPR / 2 + LEAF_SPR_LEN * 0.38, LEAF_SPR / 2], t.edge, 1.3, 0.8);
    if (t.gold) p.poly(pts, 0xffffff, 0.18);
  }
  _leafSpr.set(key, c);
  return c;
}

// Draw records for this frame: { k, x, y, rot, sx, sy, a }.
function leafDraws(time, air) {
  const out = [];
  const u = 1 / LEAF_SPR_LEN;
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    if (L.air !== air) continue;
    const b = L.body, t = L.t;
    const x = b.position.x, y = b.position.y, rot = b.rotation;
    const len = t.len * L.scale;
    if (!air) {
      out.push({ k: L.kind + "|top", x, y, rot, sx: len * u, sy: len * L.flip * u, a: 1 });
    } else {
      const h = L.h;
      out.push({ k: L.kind + "|shadow", x: x + h * 0.35, y: y + h * 0.5, rot, sx: len * u, sy: len * 0.9 * u, a: 0.18 });
      const tum = Math.cos(time * 6 + L.ph);
      const s = 1 + h / 70;
      out.push({ k: L.kind + (tum > 0 ? "|top" : "|under"), x, y: y - h * 0.25, rot, sx: len * s * u, sy: len * s * (0.25 + 0.75 * Math.abs(tum)) * u, a: 1 });
    }
  }
  return out;
}

function canvasLeaves(ctx, recs) {
  if (!recs.length) return;
  const m = ctx.getTransform();
  const o = -LEAF_SPR / 2;
  for (const r of recs) {
    const img = leafSprite(r.k);
    if (!img) continue;
    const c = Math.cos(r.rot), s = Math.sin(r.rot);
    const La = c * r.sx, Lb = s * r.sx, Lc = -s * r.sy, Ld = c * r.sy;
    ctx.setTransform(m.a * La + m.c * Lb, m.b * La + m.d * Lb, m.a * Lc + m.c * Ld, m.b * Lc + m.d * Ld, m.a * r.x + m.c * r.y + m.e, m.b * r.x + m.d * r.y + m.f);
    ctx.globalAlpha = r.a;
    ctx.drawImage(img, o, o);
  }
  ctx.setTransform(m);
  ctx.globalAlpha = 1;
}

function pixiLeaves(PIXI, layer, recs) {
  const pool = layer.__pool || (layer.__pool = []);
  const tex = layer.__tex || (layer.__tex = new Map());
  let i = 0;
  for (const r of recs) {
    let sp = pool[i];
    if (!sp) { sp = new PIXI.Sprite(); sp.anchor.set(0.5); layer.addChild(sp); pool.push(sp); }
    let t = tex.get(r.k);
    if (!t) { const c = leafSprite(r.k); t = PIXI.Texture.from(c); tex.set(r.k, t); }
    if (sp.texture !== t) sp.texture = t;
    sp.position.set(r.x, r.y);
    sp.rotation = r.rot;
    sp.scale.set(r.sx, r.sy);
    sp.alpha = r.a;
    sp.visible = true;
    i++;
  }
  for (; i < pool.length; i++) pool[i].visible = false;
}

function drawGoldGlints(p, time) {
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    if (!L.t.gold || L.air) continue;
    p.circle(L.body.position.x, L.body.position.y, 2 + Math.sin(time * 5 + L.ph) * 0.8, 0xfff6c0, 0.55);
  }
}

function drawGates(p) {
  for (const g of _gates) {
    const d = g.def;
    const horiz = d.x1 - d.x0 > d.y1 - d.y0;
    const len = horiz ? d.x1 - d.x0 : d.y1 - d.y0;
    // Hinge at the start; an open gate swings through 100°.
    const hx = d.x0 + (horiz ? 0 : (d.x1 - d.x0) / 2), hy = d.y0 + (horiz ? (d.y1 - d.y0) / 2 : 0);
    const base = horiz ? 0 : Math.PI / 2;
    const a = base + (g.open ? g.t * 1.75 : 0) * (horiz ? -1 : 1);
    const ex = hx + Math.cos(a) * len, ey = hy + Math.sin(a) * len;
    p.line([hx, hy, ex, ey], 0x5a3a1e, 5.5);
    p.line([hx, hy, ex, ey], 0x9a6a3a, 3.5);
    for (let i = 1; i < 5; i++) {
      const q = i / 5;
      p.circle(lerp(hx, ex, q), lerp(hy, ey, q), 1.2, 0x5a3a1e);
    }
    p.circle(hx, hy, 2.4, 0x3a3a3a);
    if (!g.open) {
      const mx = (hx + ex) / 2, my = (hy + ey) / 2;
      p.circle(mx, my, 5.5, 0x1b1f27, 0.85);
      p.poly(rectPts(mx - 3, my - 1, mx + 3, my + 3.4), 0xffd166);
      p.line([mx - 2, my - 1, mx - 2, my - 3.4, mx + 2, my - 3.4, mx + 2, my - 1], 0xffd166, 1.1);
    }
  }
}

function drawIntakes(p, time) {
  for (const I of _intakes) {
    if (I.kind === "chute") {
      const c = I.def;
      const horiz = c.ny !== 0;
      const w = 22, d = 8;
      const r = horiz ? rectPts(c.x - w / 2, c.y - (c.ny > 0 ? 0 : d), c.x + w / 2, c.y + (c.ny > 0 ? d : 0))
        : rectPts(c.x - (c.nx > 0 ? 0 : d), c.y - w / 2, c.x + (c.nx > 0 ? d : 0), c.y + w / 2);
      p.poly(r, I.on ? 0x8b939c : 0x5a5652, 1, 0x2a2d32, 1);
      if (I.on) {
        for (let k = 0; k < 4; k++) {
          const a = I.spin + k * Math.PI / 2;
          p.line([I.x - c.nx * 10, I.y - c.ny * 10, I.x - c.nx * 10 + Math.cos(a) * 4, I.y - c.ny * 10 + Math.sin(a) * 4], 0x2a2d32, 1.4);
        }
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        p.circle(I.x, I.y, I.r * (0.55 + 0.1 * pulse), 0x7fd8ff, 0.07, 0x7fd8ff, 1, 0.25);
      } else {
        const mx = I.x - c.nx * 10, my = I.y - c.ny * 10;
        p.line([mx - 3, my - 3, mx + 3, my + 3], 0xc85a3a, 1.4);
        p.line([mx - 3, my + 3, mx + 3, my - 3], 0xc85a3a, 1.4);
      }
    } else if (I.kind === "pump") {
      p.poly(rectPts(PUMP.x - 8, PUMP.y - 8, PUMP.x + 8, PUMP.y + 2), I.on ? 0xdfe6ea : 0x8a8f94, 1, 0x4a5058, 1);
      if (I.on) p.circle(PUMP.x, PUMP.y, 9 + 2 * Math.sin(time * 3), 0xffffff, 0, 0xffffff, 1, 0.5);
    } else if (I.kind === "bin") {
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      p.circle(I.x, I.y, I.r, 0xffd166, 0.05 + (_player?.atBin && _bag.n ? 0.12 : 0), 0xffd166, 1, 0.25 + 0.2 * pulse);
    }
  }
}

function drawCanopies(p, time) {
  for (const T of _trees) {
    const d = T.def;
    const f = T.stock0 ? T.stock / T.stock0 : 0;
    const g = _gust && _gust.t > 0 ? _gust : null;
    const sx = g ? Math.cos(g.dir) * T.sway * 3 : 0, sy = g ? Math.sin(g.dir) * T.sway * 3 : 0;
    const shake = T.drop * Math.sin(time * 40) * 0.6;
    // Branches always; they show through as the canopy thins.
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + d.x * 0.01;
      p.line([d.x, d.y, d.x + Math.cos(a) * d.r * 0.7 + sx, d.y + Math.sin(a) * d.r * 0.7 + sy], 0x4a3220, 2.2 - k * 0.15, 0.85);
    }
    const n = 11;
    const vis = Math.ceil(n * (0.12 + 0.88 * f));
    for (let i = 0; i < n; i++) {
      if (i >= vis) break;
      const a = i * 2.39 + d.y * 0.01, dd = i === 0 ? 0 : d.r * (0.35 + 0.35 * ((i * 37) % 10) / 10);
      const rr = d.r * (i === 0 ? 0.62 : 0.42) * (0.75 + 0.25 * f);
      p.circle(d.x + Math.cos(a) * dd + sx + shake, d.y + Math.sin(a) * dd + sy, rr, d.pal[i % d.pal.length], 0.6);
    }
  }
}

function drawPlayer(p, time) {
  const P = _player;
  if (!P) return;
  const b = P.body, x = b.position.x, y = b.position.y, a = P.face;
  const c = Math.cos(a), s = Math.sin(a);
  const fill = clamp(_bag.n / bagCap(), 0, 1);
  p.circle(x + 2, y + 3, 8.5, 0x000000, 0.25);
  // Sack on the back.
  const sr = 3.5 + fill * 4.5;
  p.circle(x - c * (6 + sr * 0.4), y - s * (6 + sr * 0.4), sr, 0xc8b48a, 1, 0x6a5a3a, 0.8);
  // Legs (walk cycle).
  const sw = Math.sin(P.walk * 2.2) * Math.min(1, P.speed / 60) * 4;
  for (const side of [-1, 1]) {
    const lx = x - s * side * 3 + c * sw * side, ly = y + c * side * 3 + s * sw * side;
    p.circle(lx, ly, 2.4, 0x2a3a5a);
  }
  // Body: a flannel shirt.
  p.poly(xform(x, y, a, [4, -6, 4, 6, -4, 6.5, -4.5, -6.5]), 0xb8302a, 1, 0x5a1410, 0.8);
  p.line(xform(x, y, a, [-4, -2, 4, -2]), 0x5a1410, 0.6, 0.7);
  p.line(xform(x, y, a, [-4, 2.5, 4, 2.5]), 0x5a1410, 0.6, 0.7);
  // Arms towards the tool.
  const hx = x + c * 9, hy = y + s * 9;
  p.line([x - s * 5, y + c * 5, hx - s * 1.5, hy + c * 1.5], 0xb8302a, 2.6);
  p.line([x + s * 5, y - c * 5, hx + s * 1.5, hy - c * 1.5], 0xb8302a, 2.6);
  // Tool.
  if (_tool === "rake" && _rake.on) {
    const rb = _rake.body;
    const rx = rb.position.x, ry = rb.position.y;
    p.line([x, y, rx, ry], 0x8a6238, 1.8);
    const w = _rake.wide ? RAKE.wWide : RAKE.w;
    const hc = Math.cos(rb.rotation), hs = Math.sin(rb.rotation);
    p.line([rx - hs * w / 2, ry + hc * w / 2, rx + hs * w / 2, ry - hc * w / 2], 0x3a3f46, 2.6);
    for (let i = 0; i <= 8; i++) {
      const q = -w / 2 + (w * i) / 8;
      p.line([rx - hs * q, ry + hc * q, rx - hs * q + hc * 4, ry + hc * q + hs * 4], 0x6a7078, 0.8);
    }
  } else if (_tool === "blower") {
    const nx = x + c * 16, ny = y + s * 16;
    p.circle(x - c * 3, y - s * 3, 4.6, 0xe0762a, 1, 0x6a300a, 0.8);
    p.line([x + c * 4, y + s * 4, nx, ny], 0x3a3f46, 3);
    p.line([nx - c * 2, ny - s * 2, nx + c * 1, ny + s * 1], 0xe0762a, 3.4);
  } else if (_tool === "hand") {
    const tx = P.handX ?? hx, ty = P.handY ?? hy;
    p.circle(tx, ty, 2.6, 0xe8c040, 1, 0x7a5a10, 0.8);
  }
  // Head with a beanie.
  p.circle(x + c * 0.5, y + s * 0.5, 4.4, 0xf0c8a0, 1, 0x8a5a3a, 0.6);
  p.circle(x - c * 0.6, y - s * 0.6, 4, 0x2f5a8a);
  p.circle(x - c * 2.6, y - s * 2.6, 1.6, 0xe8e0d0);
}

// Tool footprint on the ground: hand reach, rake scoop, blower cone.
function drawToolCue(p, time) {
  const P = _player;
  if (!P || _phase !== "play") return;
  const x = P.body.position.x, y = P.body.position.y;
  if (_tool === "hand") {
    const tx = P.handX ?? x, ty = P.handY ?? y;
    p.circle(tx, ty, HAND.pick * _reachMul, 0xffffff, _using ? 0.14 : 0.06, 0xffffff, 1, 0.45);
  } else if (_tool === "rake" && _rake.on) {
    const rb = _rake.body;
    const r = (_rake.wide ? RAKE.scoopWide : RAKE.scoop) * _reachMul;
    p.circle(rb.position.x + Math.cos(rb.rotation) * 5, rb.position.y + Math.sin(rb.rotation) * 5, r, 0xffffff, _using ? 0.12 : 0.04, 0xffffff, 1, 0.3);
  } else if (_tool === "blower") {
    const tier = tierOf("power");
    const R = BLOWER.range[tier] * (P.gentle ? 0.85 : 1);
    const a = P.face, ox = x + Math.cos(a) * 11, oy = y + Math.sin(a) * 11;
    const pts = [ox, oy];
    for (let i = 0; i <= 8; i++) {
      const u = -1 + i / 4;
      const along = R, half = 5 + along * Math.tan(BLOWER.cone);
      pts.push(ox + Math.cos(a) * along - Math.sin(a) * half * u, oy + Math.sin(a) * along + Math.cos(a) * half * u);
    }
    p.poly(pts, 0xdff4ff, 0.05 + _blowFx * 0.1, 0xdff4ff, 1, 0.12 + _blowFx * 0.2);
    // Air streaks.
    if (_blowFx > 0.05) {
      for (let i = 0; i < 14; i++) {
        const q = ((time * 2.2 + i * 0.137) % 1);
        const along = q * R * 0.95, u = Math.sin(i * 12.9898) * 0.8;
        const half = 5 + along * Math.tan(BLOWER.cone);
        const sx = ox + Math.cos(a) * along - Math.sin(a) * half * u, sy = oy + Math.sin(a) * along + Math.cos(a) * half * u;
        p.line([sx, sy, sx + Math.cos(a) * 9, sy + Math.sin(a) * 9], 0xffffff, 1.2, (1 - q) * 0.6 * _blowFx);
      }
    }
  }
}

function drawGustStreaks(p, time) {
  const G = _gust;
  if (!G || G.t <= 0) return;
  const env = Math.sin(Math.PI * clamp(G.t / GUST_LEN, 0, 1));
  const c = Math.cos(G.dir), s = Math.sin(G.dir);
  for (let i = 0; i < 30; i++) {
    const bx = (Math.sin(i * 91.7) * 0.5 + 0.5) * VIEW_W, by = (Math.sin(i * 47.3) * 0.5 + 0.5) * VIEW_H;
    const q = (time * 0.9 + i * 0.071) % 1;
    const x = bx + c * (q - 0.5) * 500, y = by + s * (q - 0.5) * 500;
    p.line([x, y, x + c * 34, y + s * 34], 0xffffff, 1.2, 0.35 * env * Math.sin(q * Math.PI));
  }
}

function drawSparks(p) {
  for (const s of _sparks) {
    const k = 1 - s.t / s.life;
    p.circle(s.x, s.y - s.z * 0.3, 1.6 * k + 0.4, s.col, k);
  }
}

// Flat scene order: ground · under · leaves · over · roof · canopy · air leaves · top.
function drawUnder(p, time) {
  drawIntakes(p, time);
  drawGates(p);
}
function drawOver(p, time) {
  drawGoldGlints(p, time);
  drawToolCue(p, time);
  drawPlayer(p, time);
}
function drawTop(p, time) {
  drawSparks(p);
  drawGustStreaks(p, time);
}

// ── Overlay: HUD, menus, world cues ──────────────────────────────────────
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const C_PANEL = "rgba(24,16,10,0.8)";
const C_EDGE = "rgba(255,230,190,0.14)";
const C_TEXT = "#f4ece0";
const C_DIM = "#c0ae98";
const C_GOLD = "#ffd166";
const C_OK = "#8fe39a";
const C_BAD = "#ff7a6b";
const C_LEAF = "#f08a2a";

let _mode3d = false;
let _drawFrame = 0;
let _frame3d = -1;
let _project = null;             // (x, y, z) → { x, y } screen, or null in 2D
let _buttons = [];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function panel(ctx, x, y, w, h, r = 8, fill = C_PANEL) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = C_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function text(ctx, s, x, y, size, color = C_TEXT, align = "left", weight = 600, base = "middle") {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(s, x, y);
}
function wrapText(ctx, s, x, y, maxW, lh, size, color, align = "center", weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const words = s.split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      text(ctx, line, x, yy, size, color, align, weight);
      line = w; yy += lh;
    } else line = t;
  }
  if (line) text(ctx, line, x, yy, size, color, align, weight);
  return yy;
}
const fmtTime = (t) => {
  const m = Math.floor(t / 60), s = Math.floor(t - m * 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};
const fmtMoney = (m) => `$${Math.floor(m + 1e-6)}`;
function button(ctx, id, label, key, x, y, w, h, primary = false, disabled = false) {
  panel(ctx, x, y, w, h, 7, primary ? "rgba(255,209,102,0.94)" : disabled ? "rgba(40,32,26,0.7)" : "rgba(58,42,30,0.94)");
  text(ctx, label, x + w / 2, y + h / 2 - (key ? 5 : 0), 14, primary ? "#2a1e10" : disabled ? "#7a6a58" : C_TEXT, "center", 800);
  if (key) text(ctx, key, x + w / 2, y + h / 2 + 10, 10, primary ? "#5a4320" : C_DIM, "center", 600);
  _buttons.push({ id, x, y, w, h });
}
function buttonAt(x, y) {
  for (let i = _buttons.length - 1; i >= 0; i--) {
    const b = _buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}
function toScreen(x, y, z = 0) {
  if (_mode3d && _project) return _project(x, y, z);
  return { x, y: y - z * 0.25 };
}

// Tiny vector icons for the tool bar and the shop.
function icon(ctx, kind, x, y, s = 1, col = "#f4ece0") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "hand") {
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-7, -3, 12, 11, 4) : ctx.rect(-7, -3, 12, 11); ctx.fill();
    for (let i = 0; i < 4; i++) ctx.fillRect(-7 + i * 3.2, -10, 2.4, 8);
    ctx.fillRect(4, -2, 5, 3);
  } else if (kind === "rake") {
    ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(6, -5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -10); ctx.lineTo(11, 0); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(2 + i * 2.5, -9 + i * 2.5); ctx.lineTo(5 + i * 2.5, -12 + i * 2.5); ctx.stroke(); }
  } else if (kind === "blower") {
    ctx.beginPath(); ctx.arc(-4, 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, -7); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(12, -10 + i * 3); ctx.lineTo(16, -12 + i * 4); ctx.stroke(); }
  } else if (kind === "bag") {
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-10, 10, 0, 10); ctx.quadraticCurveTo(10, 10, 6, -6); ctx.closePath(); ctx.fill();
    ctx.fillRect(-5, -10, 10, 3);
  } else if (kind === "boots") {
    ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-2, -9); ctx.lineTo(-1, 3); ctx.lineTo(9, 5); ctx.lineTo(9, 9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill();
  } else if (kind === "chute") {
    ctx.strokeRect(-9, -7, 18, 14);
    for (let i = -5; i <= 5; i += 5) { ctx.beginPath(); ctx.moveTo(i, -5); ctx.lineTo(i, 5); ctx.stroke(); }
  } else if (kind === "pump") {
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.quadraticCurveTo(6, 4, 0, 5); ctx.quadraticCurveTo(-6, 4, 0, -5); ctx.fill();
  } else if (kind === "leaf") {
    ctx.beginPath();
    const pts = LEAF_SHAPES.maple;
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i + 1] * 22, -pts[i] * 22);
    ctx.closePath(); ctx.fill();
  } else if (kind === "lock") {
    ctx.fillRect(-5, -1, 10, 8);
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, -2, 3.6, Math.PI, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawTitle(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(28,14,6,0.85)");
  g.addColorStop(0.3, "rgba(28,14,6,0.3)");
  g.addColorStop(0.55, "rgba(28,14,6,0.2)");
  g.addColorStop(0.72, "rgba(28,14,6,0.65)");
  g.addColorStop(1, "rgba(28,14,6,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 14;
  text(ctx, "LEAF SWEEP", VIEW_W / 2, 62, 54, "#ffe2b0", "center", 900);
  ctx.restore();
  for (let i = 0; i < 7; i++) icon(ctx, "leaf", VIEW_W / 2 - 190 + i * 63, 104, 0.7, ["#e8722a", "#c8362a", "#e9c43c", "#9a6431"][i % 4]);
  text(ctx, "Five zones, seven trees, one very long afternoon. Clear the yard.", VIEW_W / 2, 136, 15, "#e8d6bc", "center", 600);
  button(ctx, "start", "START", "ENTER / SPACE", VIEW_W / 2 - 80, 196, 160, 46, true);
  const rows = [
    ["WASD / arrows", "walk"],
    ["mouse + hold click / SPACE", "use the tool"],
    ["1 2 3 / Q E", "hand · rake · blower"],
    ["SHIFT or G", "gentle blowing (no lift-off)"],
    ["B", "garden shop"],
    ["touch", "hold to walk there and work"],
  ];
  const x0 = VIEW_W / 2 - 250;
  panel(ctx, x0, 290, 500, 132, 10, "rgba(24,16,10,0.72)");
  rows.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + 20 + col * 250, y = 312 + row * 38;
    text(ctx, k, x, y, 12, C_GOLD, "left", 800);
    text(ctx, v, x, y + 15, 12, C_DIM, "left", 500);
  });
  const best = _best ? `Best: ${fmtTime(_best.time)} · ${fmtMoney(_best.earned)} earned` : "Grass holds leaves, the driveway lets them slide, mulch glues them down.";
  text(ctx, best, VIEW_W / 2, 446, 12, C_DIM, "center", 600);
  text(ctx, "3D:  C camera  ·  wheel zoom", VIEW_W / 2, 470, 11, "#8a7a66", "center", 500);
}

// HUD panels fade out while the gardener or the pointer is underneath, so
// the fixed 2D view never hides the corner of the yard you are working in.
const _hudFade = {};
function hudAlpha(ctx, key, x, y, w, h) {
  let under = false;
  if (_player && _phase === "play") {
    const p = _player.body.position;
    const s = toScreen(p.x, p.y, 12);
    const m = 26;
    if (s && s.x > x - m && s.x < x + w + m && s.y > y - m && s.y < y + h + m) under = true;
  }
  if (_ptr.has && _ptr.sx > x && _ptr.sx < x + w && _ptr.sy > y && _ptr.sy < y + h && _tool !== "hand") under = under || _ptr.down;
  const want = under ? 0.22 : 1;
  const cur = _hudFade[key] ?? 1;
  const a = cur + (want - cur) * 0.15;
  _hudFade[key] = a;
  ctx.globalAlpha = a;
}

function drawHud(ctx) {
  // Money and sack.
  hudAlpha(ctx, "money", 10, 10, 214, 66);
  panel(ctx, 10, 10, 214, 66);
  icon(ctx, "leaf", 28, 30, 0.8, C_LEAF);
  text(ctx, fmtMoney(_money), 44, 30, 22, C_GOLD, "left", 900);
  if (_valMul > 1) text(ctx, `×${_valMul.toFixed(2)} value`, 212, 30, 10, C_OK, "right", 700);
  const cap = bagCap();
  const f = clamp(_bag.n / cap, 0, 1);
  const full = _bag.n >= cap;
  text(ctx, "SACK", 22, 57, 9, C_DIM, "left", 800);
  roundRect(ctx, 54, 51, 120, 12, 6);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();
  if (f > 0) {
    roundRect(ctx, 54, 51, Math.max(12, 120 * f), 12, 6);
    ctx.fillStyle = full ? (Math.sin(_time * 8) > 0 ? "#ff9a4a" : "#ff6a3a") : "#d8a24a";
    ctx.fill();
  }
  text(ctx, `${_bag.n}/${cap}`, 212, 57, 11, full ? C_BAD : C_TEXT, "right", 800);

  // Zones and clock.
  const zx = VIEW_W - 222, zy = 46;
  hudAlpha(ctx, "zones", zx, zy, 212, 42 + _zones.length * 17);
  panel(ctx, zx, zy, 212, 28 + _zones.length * 17);
  text(ctx, "YARD", zx + 12, zy + 14, 10, C_DIM, "left", 800);
  text(ctx, fmtTime(_clock), zx + 200, zy + 14, 14, C_TEXT, "right", 800);
  _zones.forEach((z, i) => {
    const y = zy + 30 + i * 17;
    const name = z.def.name;
    text(ctx, name, zx + 12, y, 11, z.open ? (z.cleared && z.dirt === 0 ? C_OK : C_TEXT) : "#7a6a58", "left", 700);
    if (!z.open) { icon(ctx, "lock", zx + 196, y, 0.8, "#7a6a58"); return; }
    const bw = 64, bx = zx + 116;
    roundRect(ctx, bx, y - 4, bw, 8, 4); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();
    const pct = z.pct;
    if (pct > 0) { roundRect(ctx, bx, y - 4, Math.max(8, bw * pct), 8, 4); ctx.fillStyle = pct >= 1 ? "#6ad37a" : "#e0a040"; ctx.fill(); }
    text(ctx, pct >= 1 ? "✓" : `${Math.floor(pct * 100)}%`, zx + 200, y, 10, pct >= 1 ? C_OK : C_DIM, "right", 800);
  });
  const left = treesLeft();
  text(ctx, left ? `${left} leaves still up in the trees` : "the trees are bare", zx + 106, zy + 36 + _zones.length * 17, 10, C_DIM, "center", 600);

  ctx.globalAlpha = 1;
  // Tool bar + shop.
  const tools = [["hand", "Hand", "1"], ["rake", "Rake", "2"], ["blower", "Blower", "3"]];
  const bw = 56, gap = 6, tw = tools.length * (bw + gap) + 76;
  const tx0 = VIEW_W / 2 - tw / 2, ty = VIEW_H - 64;
  hudAlpha(ctx, "tools", tx0, ty - 26, tw, 90);
  tools.forEach(([id, label, key], i) => {
    const x = tx0 + i * (bw + gap);
    const own = toolOwned(id);
    const sel = _tool === id;
    panel(ctx, x, ty, bw, 54, 8, sel ? "rgba(92,62,30,0.95)" : "rgba(24,16,10,0.82)");
    if (sel) { roundRect(ctx, x - 1, ty - 1, bw + 2, 56, 9); ctx.strokeStyle = C_GOLD; ctx.lineWidth = 2; ctx.stroke(); }
    icon(ctx, id, x + bw / 2, ty + 20, 1, own ? C_TEXT : "#6a5a48");
    text(ctx, own ? label : fmtMoney(SHOP.find((s) => s.id === id).tiers[0]), x + bw / 2, ty + 42, 10, own ? C_DIM : "#8a7a66", "center", 700);
    text(ctx, key, x + 7, ty + 9, 9, "#8a7a66", "left", 800);
    _buttons.push({ id: "tool:" + id, x, y: ty, w: bw, h: 54 });
  });
  const sx = tx0 + tools.length * (bw + gap);
  button(ctx, "shop", "SHOP", "B", sx, ty, 70, 54, affordableCount() > 0);
  if (_tool === "blower") {
    const gx = tx0 + 2 * (bw + gap) - 12, gy = ty - 26;
    panel(ctx, gx, gy, 80, 20, 10, _gentle ? "rgba(80,140,200,0.9)" : "rgba(24,16,10,0.82)");
    text(ctx, _gentle ? "GENTLE ✓" : "GENTLE (G)", gx + 40, gy + 10, 10, _gentle ? "#fff" : C_DIM, "center", 800);
    _buttons.push({ id: "gentle", x: gx, y: gy, w: 80, h: 20 });
  }
  ctx.globalAlpha = 1;
  // Hints.
  let hint = "";
  if (_bag.n >= bagCap()) hint = "Sack full — walk to the compost bin to empty it";
  else if (_tool === "hand" && _collected < 6) hint = "Hold click near leaves to pick them up";
  else if (_money >= 40 && !has("rake")) hint = "You can afford a rake — press B";
  else if (_tool === "blower" && _collected < 400 && !_using) hint = "Blow leaves into the bin or a chute — SHIFT for a gentle push";
  if (hint) text(ctx, hint, 12, VIEW_H - 12, 11, "rgba(255,236,210,0.85)", "left", 600, "alphabetic");
  text(ctx, "Esc pause", VIEW_W - 12, VIEW_H - 12, 10, "rgba(255,236,210,0.5)", "right", 600, "alphabetic");

  // Gust compass.
  if (_gust && _gust.t < 0) {
    const cx = VIEW_W / 2, cy = 162;
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(_time * 10);
    ctx.translate(cx, cy);
    ctx.rotate(_gust.dir);
    ctx.fillStyle = "#9fd8ff";
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(4, -12); ctx.lineTo(4, -5); ctx.lineTo(-22, -5); ctx.lineTo(-22, 5); ctx.lineTo(4, 5); ctx.lineTo(4, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function affordableCount() {
  let n = 0;
  for (const it of SHOP) {
    const t = tierOf(it.id);
    if (t >= it.tiers.length) continue;
    if (it.req && !has(it.req)) continue;
    if (it.zone !== undefined && !_zones[it.zone].open) continue;
    if (_money >= it.tiers[t]) n++;
  }
  return n;
}

// Pulsing markers over the last few leaves of a zone.
function drawRadar(ctx) {
  const show = new Set();
  let total = 0;
  for (const z of _zones) if (z.open) total += z.dirt;
  for (const z of _zones) if (z.open && z.dirt > 0 && (z.dirt <= 8 || total <= 12)) show.add(z.i);
  if (!show.size) return;
  const pulse = (Math.sin(_time * 5) + 1) / 2;
  for (const L of _leaves) {
    const p = L.body.position;
    if (!show.has(zoneAt(p.x, p.y))) continue;
    let s = toScreen(p.x, p.y, L.h + 4);
    if (!s) continue;
    const off = s.x < 8 || s.x > VIEW_W - 8 || s.y < 8 || s.y > VIEW_H - 8;
    s = { x: clamp(s.x, 14, VIEW_W - 14), y: clamp(s.y, 14, VIEW_H - 14) };
    ctx.strokeStyle = `rgba(255,209,102,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, 8 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
    if (!off) {
      ctx.fillStyle = C_GOLD;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 12); ctx.lineTo(s.x - 5, s.y - 21); ctx.lineTo(s.x + 5, s.y - 21); ctx.closePath(); ctx.fill();
    }
  }
}

function drawFloaters(ctx) {
  for (const f of _floaters) {
    const s = toScreen(f.x, f.y, 18);
    if (!s) continue;
    const k = f.t / f.life;
    ctx.globalAlpha = clamp(1.4 - k * 1.4, 0, 1);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.font = `900 ${f.size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(f.text, s.x, s.y - k * 24);
    text(ctx, f.text, s.x, s.y - k * 24, f.size, f.color, "center", 900);
  }
  ctx.globalAlpha = 1;
}

function drawBanners(ctx) {
  for (const b of _banners.slice(0, 1)) {
    const k = b.t / b.life;
    const a = clamp(Math.min(k * 6, (1 - k) * 3), 0, 1);
    ctx.globalAlpha = a;
    const s = 1 + (1 - Math.min(1, k * 5)) * 0.25;
    ctx.save();
    ctx.translate(VIEW_W / 2, 98);
    ctx.scale(s, s);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(20,10,4,0.6)";
    ctx.font = `900 32px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    if (b.sub) {
      ctx.font = `700 13px ${FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeText(b.sub, 0, 27);
      ctx.fillStyle = "#f4ece0";
      ctx.fillText(b.sub, 0, 27);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawShop(ctx) {
  ctx.fillStyle = "rgba(10,6,2,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 704, h = 404, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2 - 6;
  panel(ctx, x, y, w, h, 14, "rgba(30,20,12,0.97)");
  text(ctx, "GARDEN SHOP", x + 22, y + 26, 20, "#ffe2b0", "left", 900);
  text(ctx, fmtMoney(_money), x + w - 22, y + 26, 20, C_GOLD, "right", 900);
  const cw = 162, ch = 98, gx = 10, gy = 10;
  SHOP.forEach((it, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const cx = x + 18 + col * (cw + gx), cy = y + 50 + row * (ch + gy);
    const tier = tierOf(it.id);
    const maxed = tier >= it.tiers.length;
    const needs = it.req && !has(it.req);
    const locked = it.zone !== undefined && !_zones[it.zone].open;
    const cost = maxed ? 0 : it.tiers[tier];
    const ok = !maxed && !needs && !locked && _money >= cost;
    panel(ctx, cx, cy, cw, ch, 9, ok ? "rgba(74,52,28,0.96)" : "rgba(40,28,18,0.9)");
    if (ok) { roundRect(ctx, cx, cy, cw, ch, 9); ctx.strokeStyle = "rgba(255,209,102,0.7)"; ctx.lineWidth = 1.5; ctx.stroke(); }
    icon(ctx, it.icon, cx + 20, cy + 22, 0.95, maxed ? C_OK : locked || needs ? "#6a5a48" : C_TEXT);
    text(ctx, it.name, cx + 38, cy + 17, 12.5, locked || needs ? "#8a7a66" : C_TEXT, "left", 800);
    if (it.tiers.length > 1) {
      for (let k = 0; k < it.tiers.length; k++) {
        ctx.fillStyle = k < tier ? C_GOLD : "rgba(255,255,255,0.18)";
        ctx.beginPath(); ctx.arc(cx + 42 + k * 10, cy + 31, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    wrapText(ctx, it.desc, cx + 10, cy + 50, cw - 20, 13, 10.5, C_DIM, "left");
    let label, lc;
    if (maxed) { label = tier > 1 ? "MAX" : "OWNED"; lc = C_OK; }
    else if (locked) { label = "zone locked"; lc = "#8a7a66"; }
    else if (needs) { label = `needs ${it.req}`; lc = "#8a7a66"; }
    else { label = fmtMoney(cost); lc = ok ? C_GOLD : C_BAD; }
    text(ctx, label, cx + cw - 10, cy + ch - 13, 13, lc, "right", 900);
    _buttons.push({ id: "buy:" + it.id, x: cx, y: cy, w: cw, h: ch });
  });
  button(ctx, "close", "Close", "B / ESC", x + w / 2 - 60, y + h - 50, 120, 40, true);
}

function drawChoice(ctx) {
  const c = _choice;
  ctx.fillStyle = `rgba(10,6,2,${0.5 * clamp(c.t / 0.3, 0, 1)})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 600, h = 232, x = (VIEW_W - w) / 2, y = 124;
  panel(ctx, x, y, w, h, 14, "rgba(30,20,12,0.97)");
  const z = _zones[c.zone];
  text(ctx, `${z.def.name.toUpperCase()} IS CLEAN`, VIEW_W / 2, y + 30, 22, C_OK, "center", 900);
  const next = _zones[c.zone + 1];
  text(ctx, next ? `Pick a reward — the gate to the ${next.def.name.toLowerCase()} opens` : "Pick a reward — that was the last gate", VIEW_W / 2, y + 56, 13, C_DIM, "center", 600);
  const cw = 176, ch = 120;
  c.opts.forEach((o, i) => {
    const cx = x + 18 + i * (cw + 11), cy = y + 80;
    panel(ctx, cx, cy, cw, ch, 10, "rgba(74,52,28,0.96)");
    roundRect(ctx, cx, cy, cw, ch, 10); ctx.strokeStyle = "rgba(255,209,102,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, String(i + 1), cx + 14, cy + 16, 14, C_GOLD, "left", 900);
    let fs = 16;
    ctx.font = `900 ${fs}px ${FONT}`;
    while (fs > 11 && ctx.measureText(o.label).width > cw - 18) { fs -= 1; ctx.font = `900 ${fs}px ${FONT}`; }
    text(ctx, o.label, cx + cw / 2, cy + 50, fs, C_TEXT, "center", 900);
    wrapText(ctx, o.sub, cx + cw / 2, cy + 80, cw - 24, 14, 11, C_DIM);
    _buttons.push({ id: "pick:" + i, x: cx, y: cy, w: cw, h: ch });
  });
}

function drawPause(ctx) {
  ctx.fillStyle = "rgba(10,6,2,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 300, h = 210, x = (VIEW_W - w) / 2, y = 140;
  panel(ctx, x, y, w, h, 14, "rgba(30,20,12,0.97)");
  text(ctx, "PAUSED", VIEW_W / 2, y + 30, 22, C_TEXT, "center", 900);
  button(ctx, "resume", "Resume", "ESC", x + 40, y + 56, w - 80, 40, true);
  button(ctx, "restart", "Restart", "", x + 40, y + 104, w - 80, 36);
  button(ctx, "title", "Title screen", "", x + 40, y + 148, w - 80, 36);
}

function drawResult(ctx) {
  const r = _result;
  if (!r) return;
  const k = clamp(_phaseT / 0.4, 0, 1);
  ctx.fillStyle = `rgba(10,6,2,${0.5 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 400, h = 270, x = (VIEW_W - w) / 2, y = 110 + (1 - k) * 20;
  ctx.globalAlpha = k;
  panel(ctx, x, y, w, h, 14, "rgba(30,20,12,0.97)");
  text(ctx, "YARD CLEAN!", VIEW_W / 2, y + 32, 28, C_OK, "center", 900);
  const rows = [
    ["Time", fmtTime(r.time) + (r.isBest ? "   NEW BEST" : "")],
    ["Leaves cleared", String(r.collected)],
    ["Money earned", fmtMoney(r.earned)],
    ["Golden leaves", String(r.golds)],
  ];
  rows.forEach(([a, b], i) => {
    const yy = y + 76 + i * 28;
    text(ctx, a, x + 34, yy, 14, C_DIM, "left", 700);
    text(ctx, b, x + w - 34, yy, 14, i === 0 && r.isBest ? C_GOLD : C_TEXT, "right", 800);
  });
  button(ctx, "title", "Title", "ESC", x + 30, y + h - 58, 150, 42);
  button(ctx, "again", "Play again", "ENTER", x + w - 180, y + h - 58, 150, 42, true);
  ctx.globalAlpha = 1;
}

function drawOverlay(ctx) {
  _buttons = [];
  if (_phase === "title") drawTitle(ctx);
  else {
    if (_phase === "play") drawRadar(ctx);
    drawFloaters(ctx);
    drawHud(ctx);
    if (_shopOpen) drawShop(ctx);
    if (_choice) drawChoice(ctx);
    if (_pauseMenu) drawPause(ctx);
    if (_phase === "done") drawResult(ctx);
  }
  drawBanners(ctx);
}

function handleAction(id) {
  if (!id) return false;
  if (id === "start" || id === "again") { newGame(); return true; }
  if (id === "title") { _pauseMenu = false; goTitle(); return true; }
  if (id === "restart") { _pauseMenu = false; newGame(); return true; }
  if (id === "resume") { _pauseMenu = false; return true; }
  if (id === "shop") { _shopOpen = !_shopOpen; return true; }
  if (id === "close") { _shopOpen = false; return true; }
  if (id === "gentle") { _gentle = !_gentle; return true; }
  if (id.startsWith("tool:")) {
    const t = id.slice(5);
    if (toolOwned(t)) setTool(t); else _shopOpen = true;
    return true;
  }
  if (id.startsWith("buy:")) { buy(SHOP.find((s) => s.id === id.slice(4))); return true; }
  if (id.startsWith("pick:")) { pickReward(Number(id.slice(5))); return true; }
  return false;
}

// ── Canvas2D + PixiJS passes ─────────────────────────────────────────────
function roofLayer(L) {
  if (!L.roof) {
    L.roof = makeCanvas(VIEW_W * L.scale, VIEW_H * L.scale);
    const rc = L.roof.getContext("2d");
    rc.scale(L.scale, L.scale);
    drawRoofTop(new CanvasPainter(rc));
  }
  return L.roof;
}

function renderCanvas(ctx) {
  const L = ensureLayers(2);
  if (L) {
    ctx.drawImage(L.ground, 0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(L.statics, 0, 0, VIEW_W, VIEW_H);
  }
  const p = new CanvasPainter(ctx);
  drawUnder(p, _time);
  canvasLeaves(ctx, leafDraws(_time, false));
  drawOver(p, _time);
  // The roof sits above the leaves that blow against the house.
  if (L) ctx.drawImage(roofLayer(L), 0, 0, VIEW_W, VIEW_H);
  drawCanopies(p, _time);
  canvasLeaves(ctx, leafDraws(_time, true));
  drawTop(p, _time);
}

let _pixi = null;                // { app, root, ground, statics, roof, under, leaves, over, canopy, air, top, gen }
function renderPixiScene(adapter) {
  const { PIXI, app } = adapter.getEngine();
  if (!PIXI || !app) return;
  const L = ensureLayers(2);
  if (!_pixi || _pixi.app !== app || _pixi.root.parent !== app.stage) {
    if (_pixi?.root?.parent) _pixi.root.parent.removeChild(_pixi.root);
    const root = new PIXI.Container();
    _pixi = {
      app, root, ground: null, statics: null, roof: null, gen: -1,
      under: new PIXI.Graphics(), leaves: new PIXI.Container(), over: new PIXI.Graphics(),
      canopy: new PIXI.Graphics(), air: new PIXI.Container(), top: new PIXI.Graphics(),
    };
    app.stage.addChild(root);
  }
  if (_pixi.gen !== _gen && L) {
    for (const k of ["ground", "statics", "roof"]) {
      if (_pixi[k]) { _pixi.root.removeChild(_pixi[k]); _pixi[k].texture.destroy(true); }
    }
    const spr = (c) => { const s = new PIXI.Sprite(PIXI.Texture.from(c)); s.width = VIEW_W; s.height = VIEW_H; return s; };
    _pixi.ground = spr(L.ground);
    _pixi.statics = spr(L.statics);
    _pixi.roof = spr(roofLayer(L));
    _pixi.root.removeChildren();
    _pixi.root.addChild(_pixi.ground, _pixi.statics, _pixi.under, _pixi.leaves, _pixi.over, _pixi.roof, _pixi.canopy, _pixi.air, _pixi.top);
    _pixi.gen = _gen;
  }
  app.stage.setChildIndex(_pixi.root, app.stage.children.length - 1);
  for (const k of ["under", "over", "canopy", "top"]) _pixi[k].clear();
  drawUnder(new PixiPainter(_pixi.under), _time);
  pixiLeaves(PIXI, _pixi.leaves, leafDraws(_time, false));
  drawOver(new PixiPainter(_pixi.over), _time);
  drawCanopies(new PixiPainter(_pixi.canopy), _time);
  pixiLeaves(PIXI, _pixi.air, leafDraws(_time, true));
  drawTop(new PixiPainter(_pixi.top), _time);
  app.render();
}

// ── 3D ───────────────────────────────────────────────────────────────────
// World (x, y) px maps to three (x, −y, z) with z up; a body's rotation a
// becomes rotation.z = −a. The yard is built once per game into one group;
// leaves, canopy blobs, fence pickets, flowers and particles are instanced.
let _THREE = null;
let _scene3d = null;
let _g3 = null;                  // scene-level resources
let _lv3 = null;                 // per-game scene graph
let _camPos = null, _camTgt = null;

const SUN = { dir: [-0.55, -0.8, 0.46], color: 0xffc88a, i: 2.5, sky: 0xc8dcf4, gnd: 0x7a6a48, hemi: 1.35, top: "#5f8fd0", mid: "#b8c8d8", bot: "#f6c890", fog: 0xe6c8a2 };
const WALL_H = 46, ROOF_H = 40, EAVE = 6;

function owned(x) { x.userData.owned = true; return x; }

function canvasTex(w, h, draw, opts = {}) {
  const T = _THREE;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = opts.linear ? T.NoColorSpace : T.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  t.anisotropy = 8;
  return owned(t);
}

function std(o) { return owned(new _THREE.MeshStandardMaterial(o)); }

function ensureScene(adapter, scene, renderer) {
  if (_scene3d === scene && _g3) return;
  const T = _THREE;
  if (_g3 && _g3.scene === scene) {
    for (const m of _g3.all) scene.remove(m);
    if (_lv3) teardownWorld3d();
  }
  _lv3 = null;
  _scene3d = scene;
  _camPos = null; _camTgt = null;
  const g = { scene, all: [], renderer, v: new T.Vector3(), v2: new T.Vector3(), dummy: new T.Object3D(), col: new T.Color(), last: 0 };
  _g3 = g;
  const add = (o) => { scene.add(o); g.all.push(o); return o; };

  for (const c of scene.children) {
    if (c.isLineSegments) c.visible = false;
    if (c.isDirectionalLight || c.isAmbientLight) c.intensity = 0;
  }
  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
  }
  const sun = add(new T.DirectionalLight(SUN.color, SUN.i));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -640; sc.right = 640; sc.top = 440; sc.bottom = -440; sc.near = 10; sc.far = 3600;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.6;
  const tgt = add(new T.Object3D());
  tgt.position.set(VIEW_W / 2, -VIEW_H / 2, 0);
  sun.target = tgt;
  const dv = new T.Vector3(...SUN.dir).normalize();
  sun.position.set(VIEW_W / 2 + dv.x * 1500, -VIEW_H / 2 + dv.y * 1500, dv.z * 1500);
  g.sun = sun;
  g.hemi = add(new T.HemisphereLight(SUN.sky, SUN.gnd, SUN.hemi));
  g.hemi.up.set(0, 0, 1);
  g.hemi.position.set(0, 0, 1);
  scene.background = canvasTex(4, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, SUN.top); gr.addColorStop(0.55, SUN.mid); gr.addColorStop(1, SUN.bot);
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  scene.fog = new T.Fog(SUN.fog, 1100, 3400);

  g.box = new T.BoxGeometry(1, 1, 1);
  g.cylZ = new T.CylinderGeometry(1, 1, 1, 14).rotateX(Math.PI / 2);
  g.cylZ8 = new T.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI / 2);
  g.trunkGeo = new T.CylinderGeometry(0.62, 1, 1, 9).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  g.sphere = new T.SphereGeometry(1, 16, 12);
  g.ico = new T.IcosahedronGeometry(1, 1);
  g.plane = new T.PlaneGeometry(1, 1);
  g.disc = new T.CircleGeometry(1, 24);
  g.ring = new T.RingGeometry(0.86, 1, 40);
  g.cone = new T.ConeGeometry(1, 1, 16).rotateX(Math.PI / 2);
  // Pumpkin: a ribbed, squashed sphere.
  g.pumpkin = (() => {
    const geo = new T.SphereGeometry(1, 24, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const k = 1 - 0.09 * Math.pow(Math.abs(Math.cos(a * 5)), 0.6);
      pos.setXYZ(i, x * k, y * 0.72, z * k);
    }
    geo.rotateX(Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  })();
  // One gently cupped geometry per leaf outline, unit length along +x.
  g.leafGeo = {};
  for (const name in LEAF_SHAPES) {
    const pts = LEAF_SHAPES[name];
    const s = new T.Shape();
    s.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]);
    const geo = new T.ShapeGeometry(s);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, y * y * 0.9 - (x + 0.5) * (x + 0.5) * 0.12);
    }
    geo.computeVertexNormals();
    g.leafGeo[name] = geo;
  }

  g.vcWhite = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  g.leafMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: T.DoubleSide });
  g.blobMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  g.softTex = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  g.streakTex = canvasTex(64, 8, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  g.wood = std({ color: 0xffffff, roughness: 0.85, map: canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = "#8a6238"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? "#7a5530" : "#946a3e"; c.fillRect(0, y, w, 14); c.fillStyle = "#4d3518"; c.fillRect(0, y + 14, w, 2); }
    c.globalAlpha = 0.25; c.strokeStyle = "#3a2410";
    const r = lcg(3);
    for (let i = 0; i < 50; i++) { const y = r() * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + (r() - 0.5) * 6); c.stroke(); }
  }, { repeat: true }) });
  g.fenceWood = std({ color: 0x9a7048, roughness: 0.9 });
  g.picket = std({ color: 0xf2eee4, roughness: 0.7 });
  g.hedgeMat = std({ color: 0xffffff, roughness: 0.95, map: canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = "#3d6a24"; c.fillRect(0, 0, w, h);
    const r = lcg(9);
    for (let i = 0; i < 900; i++) { c.fillStyle = ["#4a7a2a", "#2e5a1c", "#5a8a34", "#8a8a2a", "#a87a2a"][i % 5]; c.beginPath(); c.arc(r() * w, r() * h, 1.5 + r() * 3, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true }) });
  g.metal = std({ color: 0x8b939c, roughness: 0.4, metalness: 0.7 });
  g.darkMetal = std({ color: 0x2c3036, roughness: 0.5, metalness: 0.6 });
  g.rust = std({ color: 0x7a4a30, roughness: 0.9, metalness: 0.2 });
  g.white = std({ color: 0xf1efe8, roughness: 0.6 });
  g.stone = std({ color: 0xd8d0c0, roughness: 0.85 });
  g.skin = std({ color: 0xf0c8a0, roughness: 0.7 });
  g.orange = std({ color: 0xe06a1e, roughness: 0.55 });
  g.pumpkinMat = std({ color: 0xe0761e, roughness: 0.6 });
  g.stem = std({ color: 0x4a5a1a, roughness: 0.9 });
  g.trunk = std({ color: 0x5a3d24, roughness: 0.95 });
  g.birchTrunk = std({ color: 0xe8e4da, roughness: 0.8, map: canvasTex(32, 128, (c, w, h) => {
    c.fillStyle = "#ebe7dc"; c.fillRect(0, 0, w, h);
    const r = lcg(12);
    for (let i = 0; i < 26; i++) { c.fillStyle = "#2a2622"; c.fillRect(r() * w, r() * h, 4 + r() * 10, 1.5 + r() * 2); }
  }, { repeat: true }) });
  g.glass = std({ color: 0x1a2430, metalness: 0.8, roughness: 0.15 });
  g.hay = std({ color: 0xffffff, roughness: 1, map: canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = "#d8b458"; c.fillRect(0, 0, w, h);
    const r = lcg(5);
    for (let i = 0; i < 300; i++) { c.strokeStyle = ["#b8943a", "#e8c870", "#a88a3a"][i % 3]; c.beginPath(); const x = r() * w, y = r() * h; c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y + 3 + r() * 5); c.stroke(); }
  }, { repeat: true }) });
  g.flannel = std({ color: 0xffffff, roughness: 0.85, map: canvasTex(32, 32, (c, w, h) => {
    c.fillStyle = "#b8302a"; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(20,10,10,0.55)"; c.fillRect(0, 12, w, 6); c.fillRect(12, 0, 6, h);
    c.fillStyle = "rgba(255,220,200,0.18)"; c.fillRect(0, 26, w, 2); c.fillRect(26, 0, 2, h);
  }, { repeat: true }) });
  g.flannel.map.repeat.set(2, 2);
  g.jeans = std({ color: 0x2a3a5a, roughness: 0.85 });
  g.beanie = std({ color: 0x2f5a8a, roughness: 0.9 });
  g.burlap = std({ color: 0xffffff, roughness: 1, map: canvasTex(32, 32, (c, w, h) => {
    c.fillStyle = "#c8b48a"; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(90,70,40,0.35)";
    for (let i = 0; i < w; i += 3) { c.fillRect(i, 0, 1, h); c.fillRect(0, i, w, 1); }
  }, { repeat: true }) });
  g.additive = (col, op = 0.5, map = g.softTex) => owned(new T.MeshBasicMaterial({ color: col, map, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
  g.cellMap = new Map();
  // Scene-level materials and textures outlive a rebuild of the yard.
  for (const v of Object.values(g)) {
    if (v?.isMaterial) { v.userData.shared = true; if (v.map) v.map.userData.shared = true; }
    if (v?.isTexture) v.userData.shared = true;
  }
}

function teardownWorld3d() {
  const lv = _lv3;
  if (!lv) return;
  _g3.scene.remove(lv.group);
  lv.group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry?.userData?.owned) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (!m.userData?.owned || m.userData.shared) continue;
      if (m.map?.userData?.owned && !m.map.userData.shared) m.map.dispose();
      if (m.emissiveMap?.userData?.owned) m.emissiveMap.dispose();
      if (m.normalMap?.userData?.owned) m.normalMap.dispose();
      m.dispose();
    }
  });
  _lv3 = null;
}

// A mesh from a shared unit geometry.
function mesh(geo, mat, x, y, z, sx, sy, sz, rz = 0, shadow = true) {
  const m = new _THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.z = rz;
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
// Box from world-px rect (y down) and a height band.
function boxAt(mat, x0, y0, x1, y1, z0, z1, shadow = true) {
  return mesh(_g3.box, mat, (x0 + x1) / 2, -(y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, shadow);
}

// Instanced boxes: list of { x, y (three), z, sx, sy, sz, rz, col? }.
function instBoxes(list, mat, geo = null) {
  const T = _THREE, g = _g3;
  const im = new T.InstancedMesh(geo ?? g.box, mat, Math.max(1, list.length));
  const d = g.dummy;
  list.forEach((q, i) => {
    d.position.set(q.x, q.y, q.z);
    d.rotation.set(q.rx ?? 0, q.ry ?? 0, q.rz ?? 0);
    d.scale.set(q.sx, q.sy, q.sz);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (q.col !== undefined) im.setColorAt(i, g.col.setHex(q.col));
  });
  im.count = list.length;
  im.castShadow = true;
  im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

// Hipped roof: eave rect (three coords) at z0, ridge along x from rx0 to rx1
// at y = ry, height h.
function hipRoofGeo(x0, y0, x1, y1, rx0, rx1, ry, z0, h) {
  const T = _THREE;
  const v = [], uv = [];
  const tri = (a, b, c) => {
    v.push(...a, ...b, ...c);
    for (const p of [a, b, c]) uv.push(p[0] / 40, (p[1] + p[2]) / 30);
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const z1 = z0 + h;
  const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y1, z0], D = [x0, y1, z0];
  const R0 = [rx0, ry, z1], R1 = [rx1, ry, z1];
  quad(A, B, R1, R0);
  quad(C, D, R0, R1);
  tri(D, A, R0);
  tri(B, C, R1);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(new Float32Array(v), 3));
  geo.setAttribute("uv", new T.BufferAttribute(new Float32Array(uv), 2));
  geo.computeVertexNormals();
  return owned(geo);
}
// Gable roof along x: eaves at y0 / y1, ridge at mid-y.
function gableRoofGeo(x0, y0, x1, y1, z0, h) {
  const T = _THREE;
  const my = (y0 + y1) / 2, z1 = z0 + h;
  const v = [], uv = [];
  const tri = (a, b, c) => { v.push(...a, ...b, ...c); for (const p of [a, b, c]) uv.push(p[0] / 30, (p[1] + p[2]) / 20); };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  quad([x0, y0, z0], [x1, y0, z0], [x1, my, z1], [x0, my, z1]);
  quad([x1, y1, z0], [x0, y1, z0], [x0, my, z1], [x1, my, z1]);
  tri([x0, y1, z0], [x0, y0, z0], [x0, my, z1]);
  tri([x1, y0, z0], [x1, y1, z0], [x1, my, z1]);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(new Float32Array(v), 3));
  geo.setAttribute("uv", new T.BufferAttribute(new Float32Array(uv), 2));
  geo.computeVertexNormals();
  return owned(geo);
}

function shingleMat(base, dark) {
  return std({ color: 0xffffff, roughness: 0.85, side: _THREE.DoubleSide, map: canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    const r = lcg(base.length * 7);
    for (let y = 0; y < h; y += 8) {
      c.fillStyle = dark; c.fillRect(0, y + 7, w, 1);
      for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) {
        c.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.15})`; c.fillRect(x, y, 7, 7);
        c.fillStyle = dark; c.fillRect(x + 7, y, 1, 7);
      }
    }
  }, { repeat: true }) });
}

function facadeTex(w, h, opts) {
  return canvasTex(w * 2, h * 2, (c, W, H) => {
    c.fillStyle = opts.base; c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 7) { c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(0, y + 6, W, 1); }
    c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(0, H - 10, W, 10);
    const n = opts.windows ?? Math.max(1, Math.floor(W / 90));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * W / n - 16;
      if (opts.skip && opts.skip(i, n)) continue;
      c.fillStyle = "#f4f0e6"; c.fillRect(x - 3, H * 0.28 - 3, 38, 44);
      c.fillStyle = opts.lit ? "#ffcf7a" : "#2a3440"; c.fillRect(x, H * 0.28, 32, 38);
      c.fillStyle = "#f4f0e6"; c.fillRect(x + 15, H * 0.28, 2, 38); c.fillRect(x, H * 0.28 + 18, 32, 2);
      c.fillStyle = opts.shutter; c.fillRect(x - 12, H * 0.28 - 3, 8, 44); c.fillRect(x + 36, H * 0.28 - 3, 8, 44);
    }
  });
}
function windowGlowTex(w, h, n, skip) {
  return canvasTex(w * 2, h * 2, (c, W, H) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      if (skip && skip(i, n)) continue;
      const x = (i + 0.5) * W / n - 16;
      c.fillStyle = i % 3 === 1 ? "#6a4a20" : "#ffb04a"; c.fillRect(x, H * 0.28, 32, 38);
    }
  });
}

function buildHouse(G) {
  const T = _THREE, g = _g3;
  const x0 = 330, y0 = 8, x1 = 600, y1 = 166;
  const W = x1 - x0, D = y1 - y0;
  const skipDoor = (i, n) => i === Math.floor(n * (505 - x0) / W);
  const frontT = facadeTex(W, WALL_H, { base: "#e6dcc6", shutter: "#3a5a4a", lit: true, windows: 5, skip: skipDoor });
  const sideT = facadeTex(D, WALL_H, { base: "#e0d6c0", shutter: "#3a5a4a", lit: true, windows: 3 });
  const backT = facadeTex(W, WALL_H, { base: "#e0d6c0", shutter: "#3a5a4a", lit: true, windows: 5 });
  const mk = (map, glow) => std({ map, roughness: 0.85, emissive: 0xffc070, emissiveIntensity: 0.9, emissiveMap: glow });
  const mats = [
    mk(sideT, windowGlowTex(D, WALL_H, 3)), mk(sideT, windowGlowTex(D, WALL_H, 3)),
    mk(backT, windowGlowTex(W, WALL_H, 5)), mk(frontT, windowGlowTex(W, WALL_H, 5, skipDoor)),
    g.white, g.white,
  ];
  const walls = new T.Mesh(g.box, mats);
  walls.position.set((x0 + x1) / 2, -(y0 + y1) / 2, WALL_H / 2);
  walls.scale.set(W, D, WALL_H);
  walls.castShadow = true; walls.receiveShadow = true;
  G.add(walls);
  // Foundation band.
  G.add(boxAt(g.stone, x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5, 0, 3.5));
  // Roof.
  const roof = new T.Mesh(hipRoofGeo(x0 - EAVE, -(y0 - EAVE), x1 + EAVE, -(y1 + EAVE), 400, 530, -87, WALL_H, ROOF_H), shingleMat("#7a3a2a", "#4a2018"));
  roof.castShadow = true; roof.receiveShadow = true;
  G.add(roof);
  // Gutters: a thin metal rail round the eaves.
  for (const [a, b, c, d] of [[x0 - EAVE, y1 + EAVE - 1, x1 + EAVE, y1 + EAVE + 1], [x0 - EAVE, y0 - EAVE - 1, x1 + EAVE, y0 - EAVE + 1], [x0 - EAVE - 1, y0 - EAVE, x0 - EAVE + 1, y1 + EAVE], [x1 + EAVE - 1, y0 - EAVE, x1 + EAVE + 1, y1 + EAVE]]) {
    G.add(boxAt(g.metal, a, b, c, d, WALL_H - 2, WALL_H + 0.5, false));
  }
  // Chimney.
  const brick = std({ color: 0xffffff, roughness: 0.9, map: canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = "#8a4a3a"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#c8b8a8";
    for (let y = 0; y < h; y += 8) { c.fillRect(0, y, w, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < w; x += 16) c.fillRect(x, y, 1, 8); }
  }, { repeat: true }) });
  G.add(boxAt(brick, 446, 40, 466, 58, WALL_H, WALL_H + ROOF_H + 18));
  G.add(boxAt(g.darkMetal, 444, 38, 468, 60, WALL_H + ROOF_H + 18, WALL_H + ROOF_H + 21));
  _lv3.chimney = { x: 456, y: -49, z: WALL_H + ROOF_H + 22 };
  // Porch: door, canopy on two posts, steps, a lamp.
  G.add(boxAt(std({ color: 0x6a2a1e, roughness: 0.6 }), 497, 165, 513, 167.5, 0, 26));
  G.add(boxAt(g.metal, 510, 167, 511.5, 168.5, 12, 13.5, false));
  G.add(boxAt(g.stone, 478, 166, 534, 186, 0, 1.6));
  G.add(boxAt(g.stone, 484, 186, 528, 191, 0, 0.8));
  G.add(boxAt(g.white, 480, 166, 532, 184, 30, 32));
  for (const px of [482, 530]) G.add(boxAt(g.white, px - 1.2, 181, px + 1.2, 183.4, 0, 30));
  const lamp = boxAt(std({ color: 0xfff0c0, emissive: 0xffc060, emissiveIntensity: 2 }), 490, 166, 494, 169, 20, 25, false);
  G.add(lamp);
  const pool = new T.Mesh(g.disc, g.additive(0xffc070, 0.28));
  pool.position.set(505, -178, 0.4); pool.scale.set(34, 22, 1); pool.renderOrder = 2;
  G.add(pool);
}

function buildFences(G) {
  const T = _THREE, g = _g3;
  const boards = [], pickets = [], rails = [];
  // Outer fence: tall boards on posts.
  for (const s of STATICS) {
    if (s.kind === "outer") {
      const horiz = s.x1 - s.x0 > s.y1 - s.y0;
      const len = horiz ? s.x1 - s.x0 : s.y1 - s.y0;
      for (let o = 3; o < len; o += 6.2) {
        const x = horiz ? s.x0 + o : (s.x0 + s.x1) / 2, y = horiz ? (s.y0 + s.y1) / 2 : s.y0 + o;
        const hh = 21 + ((o * 7) % 3) * 0.5;
        boards.push({ x, y: -y, z: hh / 2, sx: horiz ? 5.6 : 2.2, sy: horiz ? 2.2 : 5.6, sz: hh, col: [0x8a6440, 0x7e5a38, 0x946c46][Math.floor(o) % 3] });
      }
    } else if (s.kind === "fence") {
      const horiz = s.x1 - s.x0 > s.y1 - s.y0;
      const len = horiz ? s.x1 - s.x0 : s.y1 - s.y0;
      for (let o = 2; o < len; o += 5) {
        const x = horiz ? s.x0 + o : (s.x0 + s.x1) / 2, y = horiz ? (s.y0 + s.y1) / 2 : s.y0 + o;
        pickets.push({ x, y: -y, z: 6.5, sx: horiz ? 2.6 : 1.2, sy: horiz ? 1.2 : 2.6, sz: 13 });
      }
      for (const zz of [4, 10]) rails.push({ x: (s.x0 + s.x1) / 2, y: -(s.y0 + s.y1) / 2, z: zz, sx: horiz ? len : 1, sy: horiz ? 1 : len, sz: 1.6 });
    } else if (s.kind === "hedge") {
      G.add(boxAt(g.hedgeMat, s.x0 - 1, s.y0, s.x1 + 1, s.y1, 0, 15));
    }
  }
  G.add(instBoxes(boards, g.vcWhite));
  G.add(instBoxes(pickets, g.picket));
  G.add(instBoxes(rails, g.picket));
  // Hedge top: lumpy blobs.
  const hedge = STATICS.find((s) => s.kind === "hedge");
  const blobs = [];
  const r = lcg(44);
  for (let y = hedge.y0 + 3; y < hedge.y1; y += 7) blobs.push({ x: (hedge.x0 + hedge.x1) / 2 + (r() - 0.5) * 2, y: -y, z: 14 + r() * 2, sx: 6 + r() * 1.5, sy: 6, sz: 4 + r() * 2, col: [0x3d6a24, 0x4a7a2a, 0x6a7a2a, 0x8a6a2a][Math.floor(r() * 4)] });
  G.add(instBoxes(blobs, g.blobMat, g.ico));
}

function buildGates(G) {
  const T = _THREE, g = _g3;
  _lv3.gates = [];
  for (const gt of _gates) {
    const d = gt.def;
    const horiz = d.x1 - d.x0 > d.y1 - d.y0;
    const len = horiz ? d.x1 - d.x0 : d.y1 - d.y0;
    const hx = d.x0 + (horiz ? 0 : (d.x1 - d.x0) / 2), hy = d.y0 + (horiz ? (d.y1 - d.y0) / 2 : 0);
    const pivot = new T.Group();
    pivot.position.set(hx, -hy, 0);
    pivot.rotation.z = horiz ? 0 : -Math.PI / 2;
    const leaf = new T.Group();
    for (const zz of [3.5, 11]) leaf.add(mesh(g.box, g.wood, len / 2, 0, zz, len, 1.6, 2.2));
    for (let o = 2; o < len; o += 4) leaf.add(mesh(g.box, g.wood, o, 0, 7.2, 2.4, 1.2, 12.5));
    leaf.add(mesh(g.box, g.wood, len / 2, 0, 7.2, Math.hypot(len, 7), 1, 1.6, 0));
    leaf.children[leaf.children.length - 1].rotation.y = -Math.atan2(7, len);
    const lock = mesh(g.box, std({ color: 0xffd166, metalness: 0.7, roughness: 0.3 }), len - 3, 0, 8, 2.4, 2.6, 3);
    leaf.add(lock);
    pivot.add(leaf);
    // Posts.
    G.add(mesh(g.box, g.wood, hx, -hy, 8, 3, 3, 16));
    G.add(mesh(g.box, g.wood, hx + (horiz ? len : 0), -(hy + (horiz ? 0 : len)), 8, 3, 3, 16));
    G.add(pivot);
    _lv3.gates.push({ rec: gt, pivot, lock, horiz });
  }
}

function buildTrees3d(G) {
  const T = _THREE, g = _g3;
  const all = [];
  _lv3.trees = [];
  _trees.forEach((tr, ti) => {
    const d = tr.def;
    const tmat = d.name === "Birch" ? g.birchTrunk : g.trunk;
    const trunkH = d.h * 0.72;
    G.add(mesh(g.trunkGeo, tmat, d.x, -d.y, 0, d.tr, d.tr, trunkH));
    // Branches fanning out of the trunk top.
    const r = lcg(ti * 131 + 7);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + r() * 0.5;
      const len = d.r * (0.55 + r() * 0.25);
      const br = new T.Mesh(g.trunkGeo, tmat);
      br.position.set(d.x, -d.y, trunkH * (0.7 + r() * 0.25));
      br.scale.set(d.tr * 0.32, d.tr * 0.32, len);
      br.rotation.set(0, 0, 0);
      br.lookAt(d.x + Math.cos(a) * len, -d.y + Math.sin(a) * len, br.position.z + len * 0.55);
      br.castShadow = true;
      G.add(br);
    }
    const blobs = [];
    const n = 16;
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, dd = k === 0 ? 0 : Math.sqrt(r()) * d.r * 0.62;
      blobs.push({
        x: d.x + Math.cos(a) * dd, y: -d.y + Math.sin(a) * dd,
        z: d.h * (0.82 + r() * 0.35) - dd * 0.15,
        s: d.r * (k === 0 ? 0.55 : 0.3 + r() * 0.16), col: d.pal[Math.floor(r() * d.pal.length)],
        ph: r() * 6.28, base: all.length,
      });
      all.push(null);
    }
    _lv3.trees.push({ rec: tr, blobs, n });
  });
  const im = new T.InstancedMesh(g.ico, g.blobMat, all.length);
  im.castShadow = true;
  im.receiveShadow = true;
  let i = 0;
  for (const t of _lv3.trees) for (const b of t.blobs) { b.i = i; im.setColorAt(i, g.col.setHex(b.col)); i++; }
  im.instanceColor.needsUpdate = true;
  G.add(im);
  _lv3.canopy = im;
}

function buildProps(G) {
  const T = _THREE, g = _g3;
  const flowers = [];
  for (const s of STATICS) {
    const k = s.kind;
    if (k === "bin") {
      // Slatted compost crate; the leaf mound inside grows as you bin leaves.
      for (let i = 0; i < 4; i++) {
        const z = 2 + i * 4.5;
        G.add(boxAt(g.wood, s.x0, s.y1 - 2, s.x1, s.y1, z, z + 3.4));
        G.add(boxAt(g.wood, s.x0, s.y0, s.x0 + 2, s.y1, z, z + 3.4));
        G.add(boxAt(g.wood, s.x1 - 2, s.y0, s.x1, s.y1, z, z + 3.4));
      }
      for (const [px, py] of [[s.x0, s.y0], [s.x1 - 2.5, s.y0], [s.x0, s.y1 - 2.5], [s.x1 - 2.5, s.y1 - 2.5]]) G.add(boxAt(g.wood, px, py, px + 2.5, py + 2.5, 0, 20));
      const mound = new T.Mesh(g.sphere, std({ color: 0xffffff, roughness: 1, map: canvasTex(64, 64, (c, w, h) => {
        c.fillStyle = "#8a5a2a"; c.fillRect(0, 0, w, h);
        const r = lcg(8);
        for (let i = 0; i < 180; i++) { c.fillStyle = ["#e8722a", "#c8362a", "#e9c43c", "#9a6431", "#6a4a2a"][i % 5]; c.beginPath(); c.ellipse(r() * w, r() * h, 3, 1.6, r() * 3, 0, Math.PI * 2); c.fill(); }
      }) }));
      mound.position.set((s.x0 + s.x1) / 2, -(s.y0 + s.y1) / 2, 2);
      mound.scale.set((s.x1 - s.x0) / 2 - 2, (s.y1 - s.y0) / 2 - 2, 4);
      mound.castShadow = true;
      G.add(mound);
      _lv3.mound = mound;
      // A sign.
      G.add(boxAt(std({ color: 0x3a6a3a, roughness: 0.7 }), s.x0 + 4, s.y1 + 0.2, s.x0 + 16, s.y1 + 1, 10, 17, false));
    } else if (k === "bench") {
      G.add(boxAt(g.wood, s.x0, s.y0, s.x1, s.y1, 6, 8));
      G.add(boxAt(g.wood, s.x0, s.y0 - 1, s.x1, s.y0 + 1.5, 8, 15));
      for (const px of [s.x0 + 3, s.x1 - 5]) G.add(boxAt(g.darkMetal, px, s.y0, px + 2, s.y1, 0, 6));
    } else if (k === "car") {
      const paint = std({ color: 0x2d5a8a, metalness: 0.5, roughness: 0.35 });
      G.add(boxAt(paint, s.x0, s.y0, s.x1, s.y1, 3, 11));
      G.add(boxAt(g.glass, s.x0 + 2, s.y0 + 17, s.x1 - 2, s.y1 - 16, 11, 19));
      G.add(boxAt(paint, s.x0 + 3, s.y0 + 20, s.x1 - 3, s.y1 - 19, 19, 20));
      for (const [wx, wy] of [[s.x0, s.y0 + 12], [s.x1, s.y0 + 12], [s.x0, s.y1 - 12], [s.x1, s.y1 - 12]]) {
        const w = mesh(g.cylZ, std({ color: 0x16171a, roughness: 0.9 }), wx, -wy, 4, 4.2, 4.2, 3.4);
        w.rotation.set(0, Math.PI / 2, 0);
        G.add(w);
      }
      G.add(boxAt(std({ color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: 0.4 }), s.x0 + 2, s.y0 - 0.5, s.x0 + 7, s.y0 + 0.5, 7, 9, false));
      G.add(boxAt(std({ color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: 0.4 }), s.x1 - 7, s.y0 - 0.5, s.x1 - 2, s.y0 + 0.5, 7, 9, false));
      G.add(boxAt(std({ color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.3 }), s.x0 + 2, s.y1 - 0.5, s.x1 - 2, s.y1 + 0.5, 8, 10, false));
    } else if (k === "wheelie") {
      const m = std({ color: s.col, roughness: 0.6 });
      G.add(boxAt(m, s.x0, s.y0, s.x1, s.y1, 0, 15));
      G.add(boxAt(m, s.x0 - 0.5, s.y0 - 1, s.x1 + 0.5, s.y1 + 0.5, 15, 16.5));
    } else if (k === "pumpkin") {
      G.add(mesh(g.pumpkin, g.pumpkinMat, s.x, -s.y, s.r * 0.7, s.r, s.r, s.r));
      G.add(mesh(g.cylZ8, g.stem, s.x, -s.y, s.r * 1.45, 0.7, 0.7, 2));
    } else if (k === "shed") {
      const sw = std({ color: 0xffffff, roughness: 0.85, map: canvasTex(128, 64, (c, w, h) => {
        c.fillStyle = "#7a4432"; c.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 8) { c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x, 0, 1, h); }
      }, { repeat: true }) });
      G.add(boxAt(sw, s.x0, s.y0, s.x1, s.y1, 0, 28));
      const roof = new T.Mesh(gableRoofGeo(s.x0 - 4, -(s.y0 - 4), s.x1 + 4, -(s.y1 + 4), 28, 14), shingleMat("#4a5058", "#2a2e34"));
      roof.castShadow = true;
      G.add(roof);
      G.add(boxAt(std({ color: 0x5a3020, roughness: 0.8 }), s.x0 - 0.6, s.y0 + 6, s.x0 + 0.6, s.y0 + 26, 0, 22));
      G.add(boxAt(g.glass, s.x0 - 0.6, s.y1 - 22, s.x0 + 0.4, s.y1 - 8, 12, 22, false));
    } else if (k === "birdbath") {
      G.add(mesh(g.cylZ, g.stone, s.x, -s.y, 5, 2.4, 2.4, 10));
      G.add(mesh(g.cylZ, g.stone, s.x, -s.y, 11, s.r, s.r, 2.4));
      G.add(mesh(g.disc, std({ color: 0x5a9ac0, roughness: 0.1, metalness: 0.2 }), s.x, -s.y, 12.3, s.r - 1.6, s.r - 1.6, 1, 0, false));
    } else if (k === "hay") {
      G.add(boxAt(g.hay, s.x0, s.y0, s.x1, s.y1, 0, 14));
    } else if (k === "table") {
      G.add(mesh(g.cylZ, g.white, s.x, -s.y, 11, s.r, s.r, 1.4));
      G.add(mesh(g.cylZ8, g.darkMetal, s.x, -s.y, 5.5, 1.2, 1.2, 11));
      // Closed parasol.
      G.add(mesh(g.cylZ8, g.white, s.x, -s.y, 20, 0.7, 0.7, 30));
      const pc = mesh(g.cone, std({ color: 0xc86a2a, roughness: 0.8 }), s.x, -s.y, 28, 3, 3, 14);
      pc.rotation.set(Math.PI, 0, 0);
      G.add(pc);
      // Pumpkin centrepiece.
      G.add(mesh(g.pumpkin, g.pumpkinMat, s.x - 5, -s.y - 3, 13.4, 3, 3, 3));
    } else if (k === "chair") {
      G.add(mesh(g.cylZ, g.darkMetal, s.x, -s.y, 6, s.r, s.r, 1.2));
      const dx = s.x - 196, dy = s.y - 88, d = Math.hypot(dx, dy) || 1;
      G.add(mesh(g.box, g.darkMetal, s.x + dx / d * s.r, -(s.y + dy / d * s.r), 10, Math.abs(dy) > Math.abs(dx) ? 9 : 1.2, Math.abs(dy) > Math.abs(dx) ? 1.2 : 9, 8));
      G.add(mesh(g.cylZ8, g.darkMetal, s.x, -s.y, 3, 0.8, 0.8, 6));
    } else if (k === "grill") {
      G.add(boxAt(g.darkMetal, s.x0, s.y0, s.x1, s.y1, 10, 15));
      const lid = mesh(g.sphere, g.darkMetal, (s.x0 + s.x1) / 2, -(s.y0 + s.y1) / 2, 15, (s.x1 - s.x0) / 2, (s.y1 - s.y0) / 2, 4);
      G.add(lid);
      for (const [px, py] of [[s.x0 + 1, s.y0 + 1], [s.x1 - 2, s.y0 + 1], [s.x0 + 1, s.y1 - 2], [s.x1 - 2, s.y1 - 2]]) G.add(boxAt(g.darkMetal, px, py, px + 1, py + 1, 0, 10));
    } else if (k === "planter") {
      G.add(boxAt(g.stone, s.x0, s.y0, s.x1, s.y1, 0, 8));
      for (let i = 0; i < 6; i++) flowers.push({ x: s.x0 + 3 + i * 5.2, y: -(s.y0 + s.y1) / 2, z: 10, sx: 2.6, sy: 2.6, sz: 2.4, col: [0xd8582a, 0xe0a02a, 0x8a4ab8][i % 3] });
    } else if (k === "lounger") {
      G.add(boxAt(g.white, s.x0, s.y0, s.x1, s.y1, 4, 5.5));
      const back = boxAt(std({ color: 0x3a8ab8, roughness: 0.8 }), s.x0, s.y0, s.x0 + 12, s.y1, 5.5, 7);
      back.rotation.y = -0.5; back.position.z += 3;
      G.add(back);
      for (const px of [s.x0 + 2, s.x1 - 3]) G.add(boxAt(g.darkMetal, px, s.y0, px + 1, s.y1, 0, 4));
    }
  }
  // Flower beds: instanced blooms on leafy clumps.
  const r = lcg(61);
  for (const p of PATCHES) {
    if (p.surf !== "bed") continue;
    const R = p.rect;
    G.add(boxAt(g.stone, R[0] - 2, R[1] - 2, R[2] + 2, R[1], 0, 2.5, false));
    G.add(boxAt(g.stone, R[0] - 2, R[3], R[2] + 2, R[3] + 2, 0, 2.5, false));
    const n = Math.floor((R[2] - R[0]) * (R[3] - R[1]) / 34);
    for (let i = 0; i < n; i++) {
      const x = lerp(R[0] + 3, R[2] - 3, r()), y = lerp(R[1] + 3, R[3] - 3, r());
      const h = 3 + r() * 5;
      flowers.push({ x, y: -y, z: h * 0.5, sx: 2.4, sy: 2.4, sz: h * 0.55, col: [0x3d6a2a, 0x4a7a2a, 0x5a6a2a][i % 3] });
      flowers.push({ x, y: -y, z: h, sx: 1.8, sy: 1.8, sz: 1.3, col: [0x8a4ab8, 0xe0a02a, 0xd8582a, 0xf0d050, 0xb83a5a, 0xf4f0e8][Math.floor(r() * 6)] });
    }
  }
  G.add(instBoxes(flowers, g.blobMat, g.ico));
}

function buildPool(G) {
  const T = _THREE, g = _g3;
  const w = POOL.x1 - POOL.x0, h = POOL.y1 - POOL.y0;
  // Coping.
  for (const [a, b, c, d] of [[POOL.x0 - 7, POOL.y0 - 7, POOL.x1 + 7, POOL.y0], [POOL.x0 - 7, POOL.y1, POOL.x1 + 7, POOL.y1 + 7], [POOL.x0 - 7, POOL.y0, POOL.x0, POOL.y1], [POOL.x1, POOL.y0, POOL.x1 + 7, POOL.y1]]) {
    G.add(boxAt(g.stone, a, b, c, d, 0, 1.4, false));
  }
  const nrm = canvasTex(128, 128, (c, W, H) => {
    const r = lcg(33);
    c.fillStyle = "rgb(128,128,255)"; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
      const x = r() * W, y = r() * H, rr = 4 + r() * 12;
      const gr = c.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(${100 + r() * 60},${100 + r() * 60},255,0.5)`); gr.addColorStop(1, "rgba(128,128,255,0)");
      c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }, { repeat: true, linear: true });
  nrm.repeat.set(4, 2);
  const water = new T.Mesh(owned(new T.PlaneGeometry(w, h)), std({ color: 0x3aa8d0, transparent: true, opacity: 0.72, roughness: 0.06, metalness: 0.15, normalMap: nrm, normalScale: new T.Vector2(0.6, 0.6) }));
  water.position.set((POOL.x0 + POOL.x1) / 2, -(POOL.y0 + POOL.y1) / 2, 0.5);
  water.receiveShadow = true;
  water.renderOrder = 1;
  G.add(water);
  _lv3.water = water;
  // Ladder rails.
  for (const px of [POOL.x0 + 18, POOL.x0 + 28]) {
    const rail = mesh(g.cylZ8, g.metal, px, -(POOL.y1 - 4), 6, 0.7, 0.7, 12);
    G.add(rail);
  }
}

function buildIntakes3d(G) {
  const T = _THREE, g = _g3;
  _lv3.intakes = [];
  for (const I of _intakes) {
    if (I.kind === "chute") {
      const c = I.def;
      const grp = new T.Group();
      grp.position.set(c.x, -c.y, 0);
      grp.rotation.z = Math.atan2(-c.ny, c.nx);
      // Local +x points out of the wall.
      const body = mesh(g.box, g.metal, 4, 0, 9, 8, 22, 18);
      const mouth = mesh(g.box, std({ color: 0x0d0f12, roughness: 0.9 }), 8.2, 0, 7, 0.6, 16, 10, 0, false);
      const hood = mesh(g.box, g.metal, 6, 0, 16.5, 12, 24, 1.4);
      const fan = new T.Group();
      fan.position.set(8.6, 0, 7);
      for (let k = 0; k < 3; k++) {
        const bl = mesh(g.box, g.darkMetal, 0, 0, 0, 0.5, 13, 2.4, 0, false);
        bl.rotation.x = k * Math.PI / 3;
        fan.add(bl);
      }
      const tag = mesh(g.box, std({ color: 0xc85a3a, roughness: 0.6 }), 8.8, 0, 16, 0.5, 8, 3, 0, false);
      grp.add(body, mouth, hood, fan, tag);
      const glow = new T.Mesh(g.disc, g.additive(0x7fd8ff, 0));
      glow.position.set(I.x, -I.y, 0.6);
      glow.scale.set(I.r * 0.8, I.r * 0.8, 1);
      glow.renderOrder = 2;
      G.add(grp, glow);
      _lv3.intakes.push({ rec: I, grp, body, fan, tag, glow, mat: body.material });
    } else if (I.kind === "pump") {
      const grp = new T.Group();
      grp.add(boxAt(g.white, PUMP.x - 9, PUMP.y - 13, PUMP.x + 9, PUMP.y - 5, 0, 2.4));
      const glow = new T.Mesh(g.ring, g.additive(0xffffff, 0, null));
      glow.position.set(PUMP.x, -PUMP.y, 0.9);
      glow.scale.set(8, 8, 1);
      G.add(grp, glow);
      _lv3.intakes.push({ rec: I, grp, glow });
    } else if (I.kind === "bin") {
      const glow = new T.Mesh(g.ring, g.additive(0xffd166, 0.25, null));
      glow.position.set(I.x, -I.y, 0.6);
      glow.scale.set(I.r, I.r, 1);
      glow.renderOrder = 2;
      G.add(glow);
      _lv3.intakes.push({ rec: I, glow });
    }
  }
}

// The neighbourhood beyond the fence.
function buildSurroundings(G) {
  const T = _THREE, g = _g3;
  const grass = new T.Mesh(owned(new T.PlaneGeometry(5200, 3800)), std({ color: 0x66783a, roughness: 1 }));
  grass.position.set(VIEW_W / 2, -VIEW_H / 2, -0.4);
  grass.receiveShadow = true;
  G.add(grass);
  // Street to the south: verge, pavement, kerb, road with a centre line.
  G.add(boxAt(std({ color: 0xbab6ac, roughness: 0.95 }), -2000, 504, 2900, 530, -0.3, 0.6, false));
  G.add(boxAt(std({ color: 0x8a8a86, roughness: 0.9 }), -2000, 530, 2900, 533, -0.3, 1.2, false));
  const road = std({ color: 0xffffff, roughness: 0.95, map: canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = "#4a4d52"; c.fillRect(0, 0, w, h);
    const r = lcg(2);
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? "#5a5d62" : "#3a3d42"; c.fillRect(r() * w, r() * h, 1.5, 1.5); }
    c.fillStyle = "#e8e4d8"; c.fillRect(0, h / 2 - 1.5, w * 0.55, 3);
  }, { repeat: true }) });
  road.map.repeat.set(30, 1);
  const rd = new T.Mesh(owned(new T.PlaneGeometry(4900, 64)), road);
  rd.position.set(450, -565, 0.05);
  rd.receiveShadow = true;
  G.add(rd);
  // Driveway apron across the verge.
  G.add(boxAt(std({ color: 0x6a6d72, roughness: 0.9 }), 470, 500, 646, 531, -0.3, 0.7, false));
  // Neighbours' houses.
  const houses = [
    { x0: -260, y0: 60, x1: -60, y1: 200, base: "#d8c8b0", roof: "#4a5a6a" },
    { x0: 980, y0: 40, x1: 1180, y1: 190, base: "#c8d0d8", roof: "#6a3a2a" },
    { x0: 120, y0: -240, x1: 360, y1: -90, base: "#e0d0b8", roof: "#5a4a3a" },
    { x0: 560, y0: -250, x1: 790, y1: -100, base: "#d0c0a0", roof: "#3a4a3a" },
    { x0: 40, y0: 640, x1: 260, y1: 790, base: "#e8dcc8", roof: "#7a3a2a" },
    { x0: 420, y0: 650, x1: 640, y1: 800, base: "#c8b8a0", roof: "#4a4a52" },
    { x0: 800, y0: 640, x1: 1010, y1: 780, base: "#d8d0c0", roof: "#6a4a2a" },
    { x0: -300, y0: 360, x1: -100, y1: 480, base: "#d0d8c8", roof: "#5a3a2a" },
    { x0: 990, y0: 330, x1: 1190, y1: 470, base: "#e0c8b0", roof: "#3a4a5a" },
  ];
  for (const h of houses) {
    const wh = 40;
    const t = facadeTex(h.x1 - h.x0, wh, { base: h.base, shutter: "#3a3a3a", lit: true, windows: 4 });
    const m = std({ map: t, roughness: 0.9, emissive: 0xffb050, emissiveIntensity: 0.6, emissiveMap: windowGlowTex(h.x1 - h.x0, wh, 4) });
    G.add(boxAt(m, h.x0, h.y0, h.x1, h.y1, 0, wh));
    const w = h.x1 - h.x0, d = h.y1 - h.y0;
    const roof = new T.Mesh(hipRoofGeo(h.x0 - 5, -(h.y0 - 5), h.x1 + 5, -(h.y1 + 5), h.x0 + w * 0.28, h.x1 - w * 0.28, -(h.y0 + d / 2), wh, 34), shingleMat(h.roof, "#1a1a1a"));
    roof.castShadow = true;
    G.add(roof);
  }
  // Street lamps.
  for (let x = -300; x <= 1200; x += 250) {
    G.add(mesh(g.cylZ8, g.darkMetal, x, -518, 22, 1, 1, 44));
    G.add(mesh(g.box, std({ color: 0xfff0c0, emissive: 0xffd080, emissiveIntensity: 1.6 }), x, -522, 44, 4, 8, 3, 0, false));
  }
  // A ring of autumn trees around the block.
  const r = lcg(99);
  const blobs = [], trunks = [];
  const pals = [[0xe06a22, 0xf08a2a, 0xc84a1a], [0xd8b43a, 0xe8c84a, 0xb8942a], [0xc83028, 0xe0482e, 0xa82018], [0x9a5a22, 0xb87a2e, 0x6a8a2a]];
  for (let i = 0; i < 70; i++) {
    let x, y;
    do { x = -700 + r() * 2300; y = -520 + r() * 1500; } while (x > -40 && x < 940 && y > -40 && y < 620);
    if (houses.some((h) => x > h.x0 - 30 && x < h.x1 + 30 && y > h.y0 - 30 && y < h.y1 + 30)) continue;
    const s = 26 + r() * 30, hh = 40 + r() * 34;
    const pal = pals[Math.floor(r() * pals.length)];
    trunks.push({ x, y: -y, z: hh * 0.35, sx: 3, sy: 3, sz: hh * 0.7, col: 0x5a3d24 });
    for (let k = 0; k < 5; k++) {
      const a = r() * 6.28, dd = k ? s * 0.45 : 0;
      blobs.push({ x: x + Math.cos(a) * dd, y: -y + Math.sin(a) * dd, z: hh * (0.8 + r() * 0.3), sx: s * 0.55, sy: s * 0.55, sz: s * 0.5, col: pal[Math.floor(r() * pal.length)] });
    }
  }
  G.add(instBoxes(trunks, g.vcWhite, g.cylZ8));
  G.add(instBoxes(blobs, g.blobMat, g.ico));
}

function buildPlayer3d(G) {
  const T = _THREE, g = _g3;
  const root = new T.Group();
  const body = new T.Group();
  root.add(body);
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new T.Group();
    hip.position.set(0, side * 2.4, 9);
    hip.add(mesh(g.box, g.jeans, 0, 0, -4.5, 3, 2.8, 9));
    hip.add(mesh(g.box, g.darkMetal, 1, 0, -8.8, 4.4, 3, 1.6));
    body.add(hip);
    legs.push(hip);
  }
  body.add(mesh(g.box, g.flannel, 0, 0, 13.2, 4.6, 8.4, 8.6));
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new T.Group();
    sh.position.set(0, side * 5.1, 16.4);
    sh.add(mesh(g.box, g.flannel, 0, 0, -3.6, 2.4, 2.4, 7.6));
    sh.add(mesh(g.box, std({ color: 0xe8c040, roughness: 0.8 }), 0, 0, -7.6, 2.8, 2.8, 2.4));
    body.add(sh);
    arms.push(sh);
  }
  body.add(mesh(g.sphere, g.skin, 0, 0, 20.4, 3.2, 3.2, 3.4));
  body.add(mesh(g.sphere, g.beanie, -0.3, 0, 21.8, 3.4, 3.4, 2.4));
  body.add(mesh(g.box, g.beanie, 0, 0, 20.6, 6.6, 6.8, 1.4));
  body.add(mesh(g.sphere, g.white, -0.4, 0, 24.4, 1.1, 1.1, 1.1));
  const sack = mesh(g.sphere, g.burlap, -5.2, 0, 13, 3.5, 3.5, 4);
  body.add(sack);
  // Tools, in player-local coordinates (+x forward).
  const rake = new T.Group();
  // Handle from the hands (x 4, z 10) down to the head (x 17, z 1.5).
  const handle = mesh(g.cylZ8, g.wood, 10.5, 0, 5.8, 0.6, 0.6, 15.6);
  handle.rotation.y = Math.atan2(13, -8.5);
  rake.add(handle);
  const head = new T.Group();
  head.position.set(17, 0, 1.2);
  head.add(mesh(g.box, g.darkMetal, 0, 0, 0, 1.6, 1, 1.2));
  const bar = mesh(g.box, g.darkMetal, 0, 0, 0, 1.4, RAKE.w, 1.2);
  head.add(bar);
  const tines = [];
  for (let i = 0; i <= 10; i++) {
    const t = mesh(g.box, g.metal, 2, -RAKE.w / 2 + RAKE.w * i / 10, -0.4, 4, 0.5, 0.4, 0, false);
    head.add(t);
    tines.push(t);
  }
  rake.add(head);
  body.add(rake);
  const blower = new T.Group();
  blower.add(mesh(g.box, g.orange, -5.4, 0, 14, 4.4, 7, 7));
  blower.add(mesh(g.cylZ, g.darkMetal, -5.4, 0, 14, 2.4, 2.4, 7.4));
  const tube = mesh(g.cylZ8, g.darkMetal, 0, 0, 0, 1.1, 1.1, 1);
  blower.add(tube);
  const nozzle = mesh(g.cylZ8, g.orange, 16, 0, 6.6, 1.5, 1.5, 4);
  nozzle.rotation.y = Math.PI / 2;
  blower.add(nozzle);
  body.add(blower);
  // Tube from the hip down to the nozzle.
  tube.position.set(8.5, 1, 7.8);
  tube.scale.set(1.1, 1.1, 13.4);
  tube.rotation.y = Math.atan2(13, -2.4);
  const shadow = new T.Mesh(g.disc, owned(new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })));
  shadow.scale.set(8, 8, 1);
  shadow.position.z = 0.3;
  root.add(shadow);
  for (const o of [root]) o.traverse((q) => { if (q.isMesh && q !== shadow) q.castShadow = true; });
  G.add(root);
  _lv3.player = { root, body, legs, arms, sack, rake, head, bar, tines, blower };
}

function buildLeaves3d(G) {
  const T = _THREE, g = _g3;
  _lv3.leafMesh = {};
  for (const name in LEAF_SHAPES) {
    const im = new T.InstancedMesh(g.leafGeo[name], g.leafMat, 900);
    im.count = 0;
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = false;
    im.setColorAt(0, g.col.setHex(0xffffff));
    G.add(im);
    _lv3.leafMesh[name] = im;
  }
  // Glints over golden leaves.
  const glint = new T.InstancedMesh(g.plane, g.additive(0xfff0a0, 0.9), 40);
  glint.count = 0;
  glint.frustumCulled = false;
  glint.renderOrder = 5;
  G.add(glint);
  _lv3.glint = glint;
}

function buildFx3d(G) {
  const T = _THREE, g = _g3;
  // Blower air: additive streaks.
  const air = new T.InstancedMesh(g.plane, g.additive(0xeaf6ff, 0.32, g.streakTex), 140);
  air.count = 0; air.frustumCulled = false; air.renderOrder = 6;
  G.add(air);
  _lv3.air = air;
  _lv3.airP = [];
  // Pick-up bits.
  const bits = new T.InstancedMesh(g.leafGeo.oval, g.leafMat, 240);
  bits.count = 0; bits.frustumCulled = false;
  bits.setColorAt(0, g.col.setHex(0xffffff));
  G.add(bits);
  _lv3.bits = bits;
  // Gust streaks.
  const gust = new T.InstancedMesh(g.plane, g.additive(0xffffff, 0.6, g.streakTex), 40);
  gust.count = 0; gust.frustumCulled = false; gust.renderOrder = 6;
  G.add(gust);
  _lv3.gust = gust;
  // Chimney smoke.
  _lv3.smoke = [];
  for (let i = 0; i < 16; i++) {
    const s = new T.Sprite(owned(new T.SpriteMaterial({ map: g.softTex, color: 0xd8d0c8, transparent: true, opacity: 0, depthWrite: false })));
    s.userData.ph = i / 16;
    G.add(s);
    _lv3.smoke.push(s);
  }
  // Decorative leaves drifting over the neighbourhood (not physics).
  const deco = new T.InstancedMesh(g.leafGeo.maple, g.leafMat, 60);
  deco.frustumCulled = false;
  const r = lcg(71);
  _lv3.deco = [];
  for (let i = 0; i < 60; i++) {
    let x, y;
    do { x = -300 + r() * 1500; y = -250 + r() * 1000; } while (x > -10 && x < 910 && y > -10 && y < 510);
    _lv3.deco.push({ x, y, z: r() * 90, ph: r() * 6.28, s: 8 + r() * 4 });
    deco.setColorAt(i, g.col.setHex([0xe8722a, 0xc8362a, 0xe9c43c, 0x9a6431][i % 4]));
  }
  deco.instanceColor.needsUpdate = true;
  G.add(deco);
  _lv3.decoMesh = deco;
  // Ground cursor: ring + blower fan.
  const ring = new T.Mesh(g.ring, g.additive(0xffffff, 0.55, null));
  ring.renderOrder = 7;
  G.add(ring);
  const fanGeo = (() => {
    const v = [0, 0, 0];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const u = -1 + 2 * i / n;
      v.push(1, u * Math.tan(BLOWER.cone), 0);
    }
    const idx = [];
    for (let i = 1; i <= n; i++) idx.push(0, i, i + 1);
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(new Float32Array(v), 3));
    geo.setIndex(idx);
    return owned(geo);
  })();
  const fan = new T.Mesh(fanGeo, g.additive(0xdff4ff, 0.12, null));
  fan.renderOrder = 7;
  G.add(fan);
  _lv3.cursor = { ring, fan };
}

function buildWorld3d() {
  const T = _THREE, g = _g3;
  if (_lv3) teardownWorld3d();
  const lv = { gen: _gen, group: new T.Group() };
  _lv3 = lv;
  g.scene.add(lv.group);
  const G = lv.group;
  // Ground: the same baked canvas the flat renderers use, at 3× resolution.
  const S = 3;
  const cv = makeCanvas(VIEW_W * S, VIEW_H * S);
  const cx = cv.getContext("2d");
  cx.scale(S, S);
  drawGround(cx, { noWater: true });
  // Pool basin tiles under the water.
  cx.fillStyle = "#2a8ab4";
  cx.fillRect(POOL.x0, POOL.y0, POOL.x1 - POOL.x0, POOL.y1 - POOL.y0);
  cx.strokeStyle = "rgba(255,255,255,0.25)";
  cx.lineWidth = 0.4;
  for (let x = POOL.x0; x < POOL.x1; x += 6) { cx.beginPath(); cx.moveTo(x, POOL.y0); cx.lineTo(x, POOL.y1); cx.stroke(); }
  for (let y = POOL.y0; y < POOL.y1; y += 6) { cx.beginPath(); cx.moveTo(POOL.x0, y); cx.lineTo(POOL.x1, y); cx.stroke(); }
  cx.fillStyle = "#1a4a7a";
  cx.fillRect(POOL.x0 + 10, (POOL.y0 + POOL.y1) / 2 - 1.5, POOL.x1 - POOL.x0 - 20, 3);
  const gtex = owned(new T.CanvasTexture(cv));
  gtex.colorSpace = T.SRGBColorSpace;
  gtex.anisotropy = g.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
  const ground = new T.Mesh(owned(new T.PlaneGeometry(VIEW_W, VIEW_H)), std({ map: gtex, roughness: 0.95, metalness: 0 }));
  ground.position.set(VIEW_W / 2, -VIEW_H / 2, 0);
  ground.receiveShadow = true;
  G.add(ground);

  buildSurroundings(G);
  buildHouse(G);
  buildFences(G);
  buildGates(G);
  buildTrees3d(G);
  buildProps(G);
  buildPool(G);
  buildIntakes3d(G);
  buildLeaves3d(G);
  buildPlayer3d(G);
  buildFx3d(G);
  _camPos = null;
}

// ── 3D per-frame sync ────────────────────────────────────────────────────
function sync3d(dtR) {
  const lv = _lv3, g = _g3, T = _THREE;
  if (!lv || !_player) return;
  const d = g.dummy;
  const t = _time;

  // Leaves: grounded ones stack by cell so a pile has real height.
  const cells = g.cellMap;
  cells.clear();
  const counts = {};
  for (const name in lv.leafMesh) counts[name] = 0;
  let gl = 0;
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    const b = L.body;
    const x = b.position.x, y = b.position.y;
    const len = L.t.len * L.scale;
    let z, rx, ry;
    if (L.air) {
      z = L.h + 0.6;
      rx = Math.sin(t * 6.3 + L.ph) * 1.1;
      ry = Math.cos(t * 4.1 + L.ph) * 0.7;
    } else if (inPool(x, y)) {
      z = 0.85 + Math.sin(t * 1.7 + L.ph) * 0.18;
      rx = Math.sin(t * 1.3 + L.ph) * 0.08; ry = 0;
    } else {
      const key = ((x / 5) | 0) * 1000 + ((y / 5) | 0);
      const k = cells.get(key) ?? 0;
      cells.set(key, k + 1);
      z = 0.35 + Math.min(k, 12) * 0.62;
      rx = (L.flip > 0 ? 0 : Math.PI) + (L.curl - 0.45) * 0.5;
      ry = (L.curl - 0.45) * 0.6;
    }
    d.position.set(x, -y, z);
    d.rotation.set(rx, ry, -b.rotation, "ZXY");
    d.scale.set(len * 1.3, len * 1.3, len * 1.3);
    d.updateMatrix();
    const im = lv.leafMesh[L.t.shape];
    const n = counts[L.t.shape]++;
    if (n >= im.instanceMatrix.count) continue;
    im.setMatrixAt(n, d.matrix);
    if (L.t.gold && gl < 40) {
      d.position.set(x, -y, z + 2.2);
      d.rotation.set(0, 0, t * 2 + L.ph);
      const s = 4 + Math.sin(t * 6 + L.ph) * 1.5;
      d.scale.set(s, s, 1);
      d.updateMatrix();
      lv.glint.setMatrixAt(gl++, d.matrix);
    }
  }
  // Instance colours follow the (reshuffled) leaf order every frame.
  for (const name in lv.leafMesh) {
    const im = lv.leafMesh[name];
    im.count = counts[name];
    im.instanceMatrix.needsUpdate = true;
  }
  const idx = {};
  for (const name in lv.leafMesh) idx[name] = 0;
  for (let i = 0; i < _leaves.length; i++) {
    const L = _leaves[i];
    const im = lv.leafMesh[L.t.shape];
    const n = idx[L.t.shape]++;
    if (n >= 900) continue;
    const c = L.air ? L.t.col : shade(L.t.col, L.flip > 0 ? 0 : -0.18);
    im.setColorAt(n, g.col.setHex(c));
  }
  for (const name in lv.leafMesh) { const ic = lv.leafMesh[name].instanceColor; if (ic) ic.needsUpdate = true; }
  lv.glint.count = gl;
  lv.glint.instanceMatrix.needsUpdate = true;

  // Canopies: blobs vanish (biggest last) as a tree empties; they sway in
  // a gust and shiver when a leaf lets go.
  const G = _gust && _gust.t > 0 ? _gust : null;
  // Blobs between the camera and the gardener shrink out of the way.
  const cp = _camPos, ppx = _player.body.position.x, ppy = -_player.body.position.y, ppz = 12;
  for (const tr of lv.trees) {
    const rec = tr.rec;
    const f = rec.stock0 ? rec.stock / rec.stock0 : 0;
    const vis = Math.ceil(tr.n * (0.1 + 0.9 * f));
    const sw = rec.sway * 4, sx = G ? Math.cos(G.dir) : 0, sy = G ? Math.sin(G.dir) : 0;
    tr.blobs.forEach((b, k) => {
      const on = k < vis;
      const wob = Math.sin(t * 1.3 + b.ph) * 0.6 + rec.drop * Math.sin(t * 30 + k) * 0.5;
      const bx = b.x + sx * sw * (b.z / 60) + wob * 0.4, by = b.y - sy * sw * (b.z / 60);
      d.position.set(bx, by, b.z);
      d.rotation.set(b.ph, b.ph * 0.7, 0);
      let fade = 1;
      if (cp && _phase === "play") {
        const vx = ppx - cp.x, vy = ppy - cp.y, vz = ppz - cp.z;
        const wx = bx - cp.x, wy = by - cp.y, wz = b.z - cp.z;
        const vv = vx * vx + vy * vy + vz * vz;
        const u = clamp((wx * vx + wy * vy + wz * vz) / vv, 0, 1);
        const ex = wx - vx * u, ey = wy - vy * u, ez = wz - vz * u;
        if (u > 0.05 && u < 0.98 && ex * ex + ey * ey + ez * ez < (b.s + 10) ** 2) fade = 0.18;
      }
      b.fade = (b.fade ?? 1) + (fade - (b.fade ?? 1)) * Math.min(1, dtR * 8);
      const s = on ? b.s * (0.8 + 0.2 * f) * b.fade : 0.001;
      d.scale.set(s, s, s * 0.85);
      d.updateMatrix();
      lv.canopy.setMatrixAt(b.i, d.matrix);
    });
  }
  lv.canopy.instanceMatrix.needsUpdate = true;

  // Gardener.
  const P = _player, pl = lv.player;
  const pb = P.body;
  pl.root.position.set(pb.position.x, -pb.position.y, 0);
  pl.body.rotation.z = -P.face;
  const wk = Math.min(1, P.speed / 60);
  const ph = Math.sin(P.walk * 2.2);
  pl.legs[0].rotation.y = ph * 0.7 * wk;
  pl.legs[1].rotation.y = -ph * 0.7 * wk;
  pl.body.position.z = Math.abs(ph) * 0.7 * wk;
  const working = _using && _phase === "play";
  const hand = _tool === "hand";
  pl.arms[0].rotation.y = hand ? (working ? -1.1 + Math.sin(t * 14) * 0.35 : -ph * 0.5 * wk) : -0.9;
  pl.arms[1].rotation.y = hand ? (working ? -0.6 : ph * 0.5 * wk) : -0.9;
  const fill = clamp(_bag.n / bagCap(), 0, 1);
  const ss = 2.6 + fill * 3.4;
  pl.sack.scale.set(ss * 0.9, ss, ss * 1.15);
  pl.sack.position.set(-4 - ss * 0.55, 0, 11 + ss * 0.3);
  pl.rake.visible = _tool === "rake";
  pl.blower.visible = _tool === "blower";
  if (_tool === "rake") {
    const w = _rake.wide ? RAKE.wWide : RAKE.w;
    pl.bar.scale.y = w;
    pl.tines.forEach((tn, i) => { tn.position.y = -w / 2 + w * i / 10; });
    // The head follows the rake body's own (rate-limited) angle.
    pl.rake.rotation.z = -wrapPi(_rake.ang - P.face);
    pl.head.position.x = 17 + (working ? Math.sin(t * 9) * 1.2 : 0);
  }

  // Gates swing open.
  for (const gv of lv.gates) {
    const a = gv.rec.open ? gv.rec.t * 1.75 : 0;
    gv.pivot.rotation.z = (gv.horiz ? 0 : -Math.PI / 2) + (gv.horiz ? a : -a);
    gv.lock.visible = !gv.rec.open;
  }

  // Intakes.
  for (const iv of lv.intakes) {
    const I = iv.rec;
    if (I.kind === "chute") {
      iv.fan.rotation.x = I.spin;
      iv.tag.visible = !I.on;
      iv.glow.material.opacity = I.on ? 0.12 + 0.06 * Math.sin(t * 4) : 0;
    } else if (I.kind === "pump") {
      iv.glow.material.opacity = I.on ? 0.35 + 0.2 * Math.sin(t * 3) : 0;
      iv.glow.scale.setScalar(7 + Math.sin(t * 3) * 1.5);
    } else if (I.kind === "bin") {
      iv.glow.material.opacity = (P.atBin && _bag.n ? 0.55 : 0.18) + 0.1 * Math.sin(t * 3);
    }
  }
  if (lv.mound) lv.mound.scale.z = 3 + Math.min(12, _collected / 60);

  // Water.
  if (lv.water) lv.water.material.normalMap.offset.set(t * 0.01, t * 0.017);

  // Chimney smoke.
  for (const s of lv.smoke) {
    const q = (t * 0.08 + s.userData.ph) % 1;
    s.position.set(lv.chimney.x + q * 40 + Math.sin(q * 6 + s.userData.ph * 9) * 4, lv.chimney.y + q * 26, lv.chimney.z + q * 70);
    const sc = 6 + q * 26;
    s.scale.set(sc, sc, 1);
    s.material.opacity = Math.sin(q * Math.PI) * 0.35;
  }

  // Blower air.
  const air = lv.airP;
  if (_player.blowing && _player.nozzle && _blowFx > 0.1) {
    const nz = _player.nozzle;
    for (let k = 0; k < 4; k++) {
      const u = (Math.random() - 0.5) * 2 * Math.tan(BLOWER.cone) * 0.9;
      const sp = nz.R * (2.2 + Math.random());
      air.push({ x: nz.x, y: nz.y, z: 6.6, vx: (nz.c - nz.s * u) * sp, vy: (nz.s + nz.c * u) * sp, t: 0, life: 0.38 });
    }
  }
  let an = 0;
  for (let i = air.length - 1; i >= 0; i--) {
    const a = air[i];
    a.t += dtR;
    if (a.t > a.life) { air.splice(i, 1); continue; }
    a.x += a.vx * dtR; a.y += a.vy * dtR; a.z = Math.max(0.8, a.z - dtR * 12);
    if (an >= 140) continue;
    const k = a.t / a.life;
    d.position.set(a.x, -a.y, a.z);
    d.rotation.set(0, 0, -Math.atan2(a.vy, a.vx));
    d.scale.set(8 + k * 14, 1.6 + k * 3, 1);
    d.updateMatrix();
    lv.air.setMatrixAt(an++, d.matrix);
  }
  lv.air.count = an;
  lv.air.instanceMatrix.needsUpdate = true;
  lv.air.material.opacity = 0.32;

  // Pick-up bits.
  let bn = 0;
  for (const s of _sparks) {
    if (bn >= 240) break;
    const k = 1 - s.t / s.life;
    d.position.set(s.x, -s.y, Math.max(0.5, s.z));
    d.rotation.set(s.t * 9, s.t * 7, s.t * 5);
    d.scale.setScalar(5 * k + 1);
    d.updateMatrix();
    lv.bits.setMatrixAt(bn, d.matrix);
    lv.bits.setColorAt(bn, g.col.setHex(s.col));
    bn++;
  }
  lv.bits.count = bn;
  lv.bits.instanceMatrix.needsUpdate = true;
  if (lv.bits.instanceColor) lv.bits.instanceColor.needsUpdate = true;

  // Gust streaks.
  let gn = 0;
  if (G) {
    const env = Math.sin(Math.PI * clamp(G.t / GUST_LEN, 0, 1));
    const c = Math.cos(G.dir), s = Math.sin(G.dir);
    for (let i = 0; i < 40; i++) {
      const q = (t * 0.8 + i * 0.061) % 1;
      const bx = (Math.sin(i * 91.7) * 0.5 + 0.5) * VIEW_W, by = (Math.sin(i * 47.3) * 0.5 + 0.5) * VIEW_H;
      const x = bx + c * (q - 0.5) * 700, y = by + s * (q - 0.5) * 700;
      d.position.set(x, -y, 8 + (i % 7) * 5);
      d.rotation.set(0, 0, -G.dir);
      const e = env * Math.sin(q * Math.PI);
      d.scale.set(70 * e + 0.01, 2.8, 1);
      d.updateMatrix();
      lv.gust.setMatrixAt(gn++, d.matrix);
    }
  }
  lv.gust.count = gn;
  lv.gust.instanceMatrix.needsUpdate = true;

  // Decorative leaves.
  lv.deco.forEach((q, i) => {
    q.z -= dtR * 9;
    q.x += dtR * (10 + Math.sin(t + q.ph) * 8);
    if (q.z < 0) { q.z = 80 + Math.random() * 30; q.x -= 60; }
    d.position.set(q.x, -q.y, q.z);
    d.rotation.set(Math.sin(t * 3 + q.ph) * 1.2, Math.cos(t * 2 + q.ph), t + q.ph);
    d.scale.setScalar(q.s);
    d.updateMatrix();
    lv.decoMesh.setMatrixAt(i, d.matrix);
  });
  lv.decoMesh.instanceMatrix.needsUpdate = true;

  // Ground cursor.
  const cur = lv.cursor;
  const show = _phase === "play" && !paused();
  cur.ring.visible = show && _tool !== "blower";
  cur.fan.visible = show && _tool === "blower";
  if (_tool === "hand") {
    const r = HAND.pick * _reachMul;
    cur.ring.position.set(P.handX ?? pb.position.x, -(P.handY ?? pb.position.y), 0.9);
    cur.ring.scale.set(r, r, 1);
    cur.ring.material.opacity = working ? 0.8 : 0.4;
  } else if (_tool === "rake" && _rake.on) {
    const rb = _rake.body, r = (_rake.wide ? RAKE.scoopWide : RAKE.scoop) * _reachMul;
    cur.ring.position.set(rb.position.x + Math.cos(rb.rotation) * 5, -(rb.position.y + Math.sin(rb.rotation) * 5), 0.9);
    cur.ring.scale.set(r, r, 1);
    cur.ring.material.opacity = working ? 0.7 : 0.3;
  } else if (_tool === "blower") {
    const R = BLOWER.range[tierOf("power")] * (P.gentle ? 0.85 : 1);
    cur.fan.position.set(pb.position.x + Math.cos(P.face) * 11, -(pb.position.y + Math.sin(P.face) * 11), 0.7);
    cur.fan.rotation.z = -P.face;
    cur.fan.scale.set(R, R, 1);
    cur.fan.material.opacity = 0.06 + _blowFx * 0.12;
  }
}

function placeCamera(camera, dtR) {
  const T = _THREE;
  const P = _player;
  if (!P) return;
  const p = P.body.position;
  let ex, ey, ez, tx, ty, tz;
  const title = _phase === "title";
  if (title) {
    const a = _time * 0.07 - 1.2;
    tx = VIEW_W / 2; ty = -VIEW_H / 2; tz = 0;
    ex = tx + Math.cos(a) * 640; ey = ty + Math.sin(a) * 460; ez = 380;
  } else if (_camMode === 1) {
    tx = VIEW_W / 2; ty = -VIEW_H / 2 + 20; tz = 0;
    ex = VIEW_W / 2; ey = -VIEW_H / 2 - 430 * _camDist; ez = 560 * _camDist;
  } else {
    const low = _camMode === 2;
    const lead = 0.25;
    const fx = p.x + (_aimW.x - p.x) * lead, fy = p.y + (_aimW.y - p.y) * lead;
    const D = (low ? 210 : 330) * _camDist, pitch = low ? 0.62 : 0.98;
    tx = clamp(fx, 60, VIEW_W - 60); ty = -clamp(fy, 40, VIEW_H - 30); tz = 4;
    ex = tx; ey = ty - Math.cos(pitch) * D; ez = Math.sin(pitch) * D;
  }
  if (!_camPos) {
    _camPos = new T.Vector3(ex, ey, ez);
    _camTgt = new T.Vector3(tx, ty, tz);
  } else {
    const k = 1 - Math.exp(-dtR * (title ? 3 : 4.5));
    _camPos.lerp(_g3.v.set(ex, ey, ez), k);
    _camTgt.lerp(_g3.v.set(tx, ty, tz), k);
  }
  camera.position.copy(_camPos);
  camera.up.set(0, 0, 1);
  camera.lookAt(_camTgt);
  camera.updateMatrixWorld();
}

function render3dScene(renderer, scene, camera, adapter) {
  ensureScene(adapter, scene, renderer);
  if (!_lv3 || _lv3.gen !== _gen) buildWorld3d();
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  const dtR = clamp((now - (_g3.last || now)) / 1000, 0, 0.1);
  _g3.last = now;
  sync3d(dtR);
  placeCamera(camera, dtR);
  renderer.render(scene, camera);
  // World ⇄ overlay mapping (the overlay is the 900×500 viewport letterboxed
  // into the renderer).
  const T = _THREE;
  const size = renderer.getSize(_g3.size || (_g3.size = new T.Vector2()));
  const sc = Math.min(size.x / VIEW_W, size.y / VIEW_H);
  const ox = (size.x - VIEW_W * sc) / 2, oy = (size.y - VIEW_H * sc) / 2;
  const pv = _g3.pv || (_g3.pv = new T.Vector3());
  _project = (x, y, z = 0) => {
    pv.set(x, -y, z).project(camera);
    if (pv.z > 1) return null;
    return { x: ((pv.x + 1) / 2 * size.x - ox) / sc, y: ((1 - pv.y) / 2 * size.y - oy) / sc };
  };
  const rv = _g3.rv || (_g3.rv = new T.Vector3());
  _screenToWorld = (sx, sy) => {
    const nx = (ox + sx * sc) / size.x * 2 - 1, ny = 1 - (oy + sy * sc) / size.y * 2;
    rv.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
    if (rv.z > -1e-4) return null;
    const k = -camera.position.z / rv.z;
    return { x: camera.position.x + rv.x * k, y: -(camera.position.y + rv.y * k) };
  };
}

// ── Demo definition ──────────────────────────────────────────────────────
function debugState() {
  return { rake: _rake, player: _player, leaves: _leaves, zones: _zones, tool: _tool, bag: _bag, bagTier: tierOf("bag"), money: _money, phase: _phase, clock: _clock, intakes: _intakes, trees: _trees };
}

function cycleTool(dir) {
  const order = ["hand", "rake", "blower"].filter(toolOwned);
  const i = order.indexOf(_tool);
  setTool(order[(i + dir + order.length) % order.length]);
}

export default {
  id: "leaf-sweep",
  label: "Leaf Sweep",
  tags: ["Gameplay", "Top-down", "Fluid", "Kinematic", "Filtering", "Mobile"],
  desc:
    "An <b>autumn yard-cleaning game</b> seen from above, in the <i>Leaf it Alone</i> mould: five zones behind garden gates, seven trees still dropping leaves and a gust now and then that scatters your piles. Start with bare hands and a small sack, empty it into the compost bin, then buy a <b>rake</b>, a <b>leaf blower</b>, bigger sacks and <b>vacuum chutes</b>; each zone at 100 % pays a reward of your choice and opens the next gate. <b>WASD</b> walk, <b>mouse + hold</b> use the tool, <b>1 2 3</b> switch, <b>SHIFT</b> gentle blow, <b>B</b> shop; on touch, hold where you want to work. Physics: every leaf is a body with <b>surface-dependent friction</b> (grass holds, asphalt slides, mulch sticks); the rake is a <b>kinematic</b> body that shoves real piles; blow too hard and a leaf lifts onto an <code>InteractionFilter</code> that only meets tall walls; the pool is a <b>fluid</b> shape leaves float on. In <b>3D</b>: a golden-hour garden, thinning canopies and stacked leaf piles.",
  walls: false,
  workerCompatible: false,
  camera: null,
  velocityIterations: 6,
  positionIterations: 3,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);
    _keys = {};
    _mode3d = false;
    _project = null;
    _screenToWorld = null;
    _layers = null;
    _ptr = { sx: VIEW_W / 2, sy: VIEW_H / 2, down: false, moveT: -99, has: false };
    goTitle();

    // Tools, friction, wind and the tree drops belong to the physics clock
    // (the runner may run several fixed steps per frame, or none), so the
    // game tick runs from the Space's own step. Menus freeze the world.
    const spaceStep = space.step.bind(space);
    space.step = (dt, velIter, posIter) => {
      if (tickGame()) spaceStep(dt, velIter, posIter);
    };

    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
      _onKeyDown = (e) => {
        if (!_space) return;
        const code = e.code;
        const typing = e.target && /input|textarea|select/i.test(e.target.tagName || "");
        if (typing) return;
        _keys[code] = true;
        if (_phase === "title") {
          if (code === "Enter" || code === "Space") newGame();
        } else if (_phase === "done") {
          if (code === "Enter" || code === "Space") newGame();
          if (code === "Escape") goTitle();
        } else if (_choice) {
          const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
          if (n !== undefined) pickReward(n);
        } else if (_pauseMenu) {
          if (code === "Escape" || code === "Enter") _pauseMenu = false;
        } else if (_shopOpen) {
          if (code === "Escape" || code === "KeyB") _shopOpen = false;
        } else {
          if (code === "Digit1" || code === "Numpad1") setTool("hand");
          if (code === "Digit2" || code === "Numpad2") { if (toolOwned("rake")) setTool("rake"); }
          if (code === "Digit3" || code === "Numpad3") { if (toolOwned("blower")) setTool("blower"); }
          if (code === "KeyQ") cycleTool(-1);
          if (code === "KeyE") cycleTool(1);
          if (code === "KeyB") _shopOpen = true;
          if (code === "KeyG") _gentle = !_gentle;
          if (code === "Escape") _pauseMenu = true;
        }
        if (code === "KeyC") _camMode = (_camMode + 1) % 3;
        if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(code)) e.preventDefault();
      };
      _onKeyUp = (e) => { _keys[e.code] = false; };
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  click(x, y) {
    _ptr.sx = x; _ptr.sy = y; _ptr.has = true; _ptr.moveT = _clock;
    const id = buttonAt(x, y);
    if (handleAction(id)) return;
    if (_phase === "title") { newGame(); return; }
    if (_phase !== "play" || paused()) return;
    _ptr.down = true;
  },

  hover(x, y) {
    _ptr.sx = x; _ptr.sy = y; _ptr.has = true; _ptr.moveT = _clock;
  },

  drag(x, y) {
    _ptr.sx = x; _ptr.sy = y; _ptr.has = true; _ptr.moveT = _clock;
  },

  release() {
    _ptr.down = false;
  },

  // Mouse wheel zooms the 3D cameras.
  wheel(dy) {
    _camDist = clamp(_camDist * (dy > 0 ? 1.08 : 1 / 1.08), 0.55, 1.8);
  },

  step() {
    // Visual clock only — the game runs from the Space.step wrapper.
    _time += 1 / 60;
  },

  render(ctx, space, W, H, showOutlines) {
    _mode3d = false;
    _project = null;
    _screenToWorld = null;
    void showOutlines;
    renderCanvas(ctx);
    void space; void W; void H;
  },

  renderPixi(adapter, space, W, H, showOutlines) {
    _mode3d = false;
    _project = null;
    _screenToWorld = null;
    void showOutlines;
    renderPixiScene(adapter);
    void space; void W; void H;
  },

  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter) {
    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    _mode3d = true;
    render3dScene(renderer, scene, camera, adapter);
    _frame3d = _drawFrame;
    void space; void W; void H; void camX; void camY;
  },

  // Every render mode: HUD, menus and world cues.
  render3dOverlay(ctx, space, W, H) {
    if (_frame3d !== _drawFrame) { _mode3d = false; _project = null; _screenToWorld = null; }
    drawOverlay(ctx);
    _drawFrame++;
    void space; void W; void H;
  },

  // Harness access (not used by the site).
  _debug() {
    return {
      get state() { return debugState(); },
      get phase() { return _phase; },
      get money() { return _money; },
      get leaves() { return _leaves; },
      get zones() { return _zones; },
      get result() { return _result; },
      get stats() { return _stats; },
      get space() { return _space; },
      advance: (n) => { for (let i = 0; i < n; i++) _space.step(DT, 6, 3); },
      get clock() { return _clock; },
      get bag() { return _bag; },
      start: () => newGame(),
      title: () => goTitle(),
      tick: () => tickGame(),
      setAutopilot: (f) => { _autopilot = f; },
      setThree: (T) => { _THREE = T; },
      setCam: (m) => { _camMode = m; },
      give: (m) => { _money += m; },
      buy: (id) => buy(SHOP.find((s) => s.id === id)),
      tool: (t) => setTool(t),
      pick: (k) => pickReward(k),
      openZone: (i) => openZone(i),
      gust: () => { _nextGust = _clock; },
      shop: (v) => { _shopOpen = v; },
      info: () => { const r = _g3?.renderer?.info?.render; return r ? { calls: r.calls, tris: r.triangles } : null; },
      treesLeft: () => treesLeft(),
      layout: { STATICS, TREES, ZONES, POOL, BIN },
      spawn: (x, y, kind = "oak", o = {}) => spawnLeaf(x, y, kind, o),
      clearLeaves: () => { while (_leaves.length) removeLeaf(_leaves[_leaves.length - 1]); },
      freezeTrees: () => { for (const t of _trees) t.stock = 0; },
    };
  },
};
