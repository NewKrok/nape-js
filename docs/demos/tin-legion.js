import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.1";
import { drawBody } from "../renderer.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";

// ── Tin Legion — a lane-siege army builder ────────────────────────────────
//
// A real-time siege on one large battlefield. Gold trickles in, a hand of
// troop cards sits at the bottom of the screen, and every card you play drops
// a squad of tin figurines onto the field. They march off on their own along
// the road network, fight whatever they meet and hammer whatever structure
// lies at the end of their path. You never steer a single soldier — you decide
// *what* to field, *where* to drop it and *when*, which is the whole game.
//
// The map is three roads between two keeps, with a forward watchtower on each
// side of the centre road and two gold mines out on the flanks, each held by a
// neutral camp until somebody clears it. A captured mine pays gold *and*
// extends the drop zone forward, so the flanks are worth the detour. A keep is
// shielded while its own watchtower stands, so the centre has to break before
// either side can win.
//
// Physics: every figurine is a dynamic circle in a zero-gravity Space, so a
// crowd shoves and flows around itself for free; terrain ridges, keeps, towers
// and mines are static bodies. Arrows, bolts and cannon shot are sensor bodies
// whose hits arrive through InteractionListeners, with side filtering done
// entirely by sensor groups and masks — friendly fire is impossible by
// construction rather than by an if-statement. Powder kegs detonate with a
// real radial impulse, so a good keg scatters a shield wall across the road.
// Flyers sit in their own collision group and simply ignore the ground crowd.
//
// 3D: the battlefield is a grassy plateau floating in the mist — painted roads,
// stone keeps with banners that ripple, timbered mine heads, tree lines, rock
// ridges and camp fires — with a jointed low-poly rig per troop type (marching
// legs, swinging arms, flapping wings, recoiling siege arms) and a tilted
// strategy camera you pan across the field.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;

// ── Battlefield ───────────────────────────────────────────────────────────
const MAP_W = 2800;
const MAP_H = 1400;
const LANE_N = 260;
const LANE_C = 700;
const LANE_S = 1140;

const SIDE_P = 0;   // the player
const SIDE_E = 1;   // the opposing commander
const SIDE_N = 2;   // neutral camps and uncaptured mines

// ── Collision filtering ───────────────────────────────────────────────────
// Collision bits decide who shoves whom: ground troops crowd each other and
// the terrain, flyers only crowd other flyers, shot never collides at all.
// Sensor bits carry *side membership*, split between troops and buildings, so
// a projectile's mask alone decides what it may hit.
const G_GROUND = 1 << 1;
const G_AIR = 1 << 2;
const G_SOLID = 1 << 3;
const G_PROJ = 1 << 4;
const S_UNIT = [1 << 5, 1 << 6, 1 << 7];
const S_BLD = [1 << 8, 1 << 9, 1 << 10];

// ── Economy ───────────────────────────────────────────────────────────────
const GOLD_MAX = 12;
const GOLD_BASE = 0.52;          // gold per second with no mines
const GOLD_PER_MINE = 0.30;
const GOLD_START = 6;
const HAND_SIZE = 5;
const DEPLOY_R = 300;            // drop radius around a friendly structure
const DEPLOY_R_KEEP = 380;       // …a keep musters over a wider yard, so the
                                 // drop's y can pick either flank road
const ARMY_CAP = 18;             // live figurines per side
const LEADER_COOLDOWN = 40 * 60; // frames before a fallen leader can return

// ── Pacing ────────────────────────────────────────────────────────────────
const FINAL_PUSH_AT = 5 * 60 * 60;   // 5:00 — shields break, damage ramps, keeps crumble
const RESULT_LOCK = 70;
const BANNER_FRAMES = 130;
const CAP_RADIUS = 130;              // how close a troop must stand to capture
const CAP_RATE = 0.9;                // capture percent per frame, per troop
const SPAWN_IN = 26;                 // frames a fresh figurine is intangible

// ── Troop definitions ─────────────────────────────────────────────────────
// `cd` is the attack cycle in frames, `windup` how far into it the blow lands.
// `range` is edge-to-edge reach, `aggro` how far a troop will step off the
// road to pick a fight. `siege` multiplies damage against buildings, `armor`
// shaves a fraction off every hit taken.
const UNIT_DEFS = {
  footman: {
    name: "Shield Guard", short: "Guard", r: 13, hp: 165, dmg: 21, cd: 54, windup: 16,
    range: 16, speed: 53, aggro: 160, mass: 1.4, color: 0x6fa8dc, rig: "footman",
    tip: "Cheap wall of shields. Nothing gets past three of them quickly.",
  },
  archer: {
    name: "Longbow", short: "Longbow", r: 12, hp: 88, dmg: 25, cd: 66, windup: 22,
    range: 215, speed: 51, aggro: 240, color: 0x9ccc65, rig: "archer",
    proj: { kind: "arrow", speed: 520, r: 4, color: "#dfe8c0" }, canHitAir: true,
    tip: "Shoots over the line and is the only cheap answer to flyers.",
  },
  bat: {
    name: "Dusk Bat", short: "Bat", r: 10, hp: 62, dmg: 13, cd: 33, windup: 9,
    range: 16, speed: 83, aggro: 210, flying: true, color: 0xb39ddb, rig: "bat",
    tip: "Flies straight over ridges and shield walls. Only bows and towers reach it.",
  },
  rider: {
    name: "Wolf Rider", short: "Rider", r: 14, hp: 215, dmg: 33, cd: 48, windup: 14,
    range: 18, speed: 100, aggro: 200, mass: 1.6, color: 0xe8a33d, rig: "rider",
    tip: "Fast flanker — runs down siege engines and bowmen before they fire twice.",
  },
  brute: {
    name: "Stone Brute", short: "Brute", r: 22, hp: 1150, dmg: 88, cd: 90, windup: 30,
    range: 26, speed: 36, aggro: 180, mass: 4.5, armor: 0.35, splash: 58,
    color: 0x9e9e9e, rig: "brute",
    tip: "A slow armoured wall that sweeps whole squads aside. Answer it with numbers.",
  },
  sapper: {
    name: "Powder Keg", short: "Keg", r: 12, hp: 95, dmg: 0, speed: 76, aggro: 80,
    color: 0xd96a4a, rig: "sapper",
    suicide: { dmg: 120, struct: 340, radius: 115, knock: 520 },
    tip: "Runs at the nearest BUILDING and detonates — never at a mine. Melts towers.",
  },
  warden: {
    name: "Grove Warden", short: "Warden", r: 13, hp: 195, dmg: 0, heal: 30, cd: 72,
    windup: 20, range: 180, speed: 49, aggro: 0, support: true, color: 0x4fc3c7,
    rig: "warden",
    tip: "Mends the most wounded ally in range. Keeps a brute standing far too long.",
  },
  ballista: {
    name: "Siege Ballista", short: "Ballista", r: 18, hp: 330, dmg: 98, cd: 126,
    windup: 36, range: 340, speed: 24, aggro: 370, mass: 3.2, siege: 2.4, noAir: true,
    color: 0xc9a227, rig: "ballista",
    proj: { kind: "bolt", speed: 600, r: 6, color: "#ffd98a" },
    tip: "Outranges every tower, and only ever marches on BUILDINGS. Escort it.",
  },
  troll: {
    name: "Bog Troll", short: "Troll", r: 18, hp: 420, dmg: 44, cd: 78, windup: 26,
    range: 24, speed: 41, aggro: 220, mass: 2.6, leash: 250, color: 0x7a9e5b,
    rig: "troll",
    tip: "Neutral camp guard. Clears out for good once killed.",
  },
  thane: {
    name: "Thane Aldric", short: "Thane", r: 19, hp: 1750, dmg: 96, cd: 66, windup: 22,
    range: 28, speed: 56, aggro: 250, mass: 3, armor: 0.2, splash: 64, leader: true,
    aura: { r: 220, dmg: 0.2 }, color: 0xf0d060, rig: "thane",
    tip: "Your commander. Free to field, and every troop near him hits harder.",
  },
  emberfang: {
    name: "Emberfang", short: "Emberfang", r: 20, hp: 1800, dmg: 90, cd: 72, windup: 24,
    range: 30, speed: 55, aggro: 260, mass: 3, armor: 0.2, splash: 60, leader: true,
    breath: true, color: 0xff6b4a, rig: "emberfang",
    tip: "The opposing commander. Breathes a cone of fire when the line gets thick.",
  },
};

// ── Cards ─────────────────────────────────────────────────────────────────
// Both commanders draw from the same deck; the hand is a rolling window over a
// shuffled cycle, so a card you spend comes back only after the rest of the
// deck has been through your hand.
const CARDS = [
  { id: "footmen", name: "Shield Guards", cost: 3, unit: "footman", count: 3, glyph: "◬", spread: 26 },
  { id: "longbows", name: "Longbows", cost: 3, unit: "archer", count: 2, glyph: "➶", spread: 26 },
  { id: "bats", name: "Dusk Bats", cost: 3, unit: "bat", count: 3, glyph: "▲", spread: 30 },
  { id: "riders", name: "Wolf Riders", cost: 4, unit: "rider", count: 2, glyph: "➤", spread: 28 },
  { id: "kegs", name: "Powder Kegs", cost: 4, unit: "sapper", count: 2, glyph: "●", spread: 30 },
  { id: "warden", name: "Grove Warden", cost: 4, unit: "warden", count: 1, glyph: "✤" },
  { id: "brute", name: "Stone Brute", cost: 5, unit: "brute", count: 1, glyph: "■" },
  { id: "ballista", name: "Siege Ballista", cost: 5, unit: "ballista", count: 1, glyph: "⚔" },
  { id: "volley", name: "Arrow Volley", cost: 3, spell: "volley", glyph: "⁂", radius: 125 },
  { id: "quake", name: "Quake", cost: 4, spell: "quake", glyph: "✹", radius: 155 },
];
const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const SPELLS = {
  volley: {
    name: "Arrow Volley", radius: 125, dmg: 150, structMul: 0.35, delay: 34,
    color: "#dfe8c0", tip: "A rain of shafts over a wide circle.",
  },
  quake: {
    name: "Quake", radius: 155, dmg: 85, structMul: 0.5, delay: 26, knock: 620, stun: 78,
    color: "#e0b070", tip: "Less damage, but it flattens and stuns everything caught.",
  },
};

// ── Difficulty ────────────────────────────────────────────────────────────
// Both commanders play the same deck and the same rules; the only thing a
// level changes is how much gold the opposing one earns and how often it stops
// to think. Chosen on the title screen and fixed for the match.
const DIFFICULTIES = [
  {
    id: "recruit", name: "Recruit", gold: 0.72, think: 1.7,
    note: "They bank less gold and are slow off the mark. Room to learn the deck.",
  },
  {
    id: "captain", name: "Captain", gold: 1, think: 1,
    note: "An even match — same income, same deck, same army cap on both sides.",
  },
  {
    id: "warlord", name: "Warlord", gold: 1.3, think: 0.68,
    note: "Richer and far quicker to answer. Take a mine early or you will not get one.",
  },
];
let _difficulty = 0;

// ── Side identity ─────────────────────────────────────────────────────────
const SIDE_INFO = [
  { name: "Bannerhold", tint: 0x5aa9e6, css: "#5aa9e6", dark: 0x2c5f86, leader: "thane" },
  { name: "Ashen Pact", tint: 0xd9534f, css: "#d9534f", dark: 0x7a2b28, leader: "emberfang" },
  { name: "Wilds", tint: 0x7a9e5b, css: "#7a9e5b", dark: 0x40543a, leader: null },
];

const HUD_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ── Road network ──────────────────────────────────────────────────────────
// Troops never pathfind; they walk a node graph. Every building sits on a
// node, and for each building we precompute a next-hop table over the graph,
// so a troop only ever asks "which neighbour brings me closer to my goal".
const NODES = [
  { id: "keepP", x: 250, y: LANE_C },
  { id: "fork", x: 470, y: LANE_C },
  { id: "n0", x: 540, y: 340 },
  { id: "n1", x: 900, y: LANE_N + 2 },
  { id: "n2", x: 1400, y: LANE_N - 2 },
  { id: "n3", x: 1900, y: LANE_N + 2 },
  { id: "n4", x: 2260, y: 340 },
  { id: "c1", x: 900, y: LANE_C },
  { id: "c2", x: 1400, y: LANE_C },
  { id: "c3", x: 1900, y: LANE_C },
  { id: "s0", x: 540, y: 1060 },
  { id: "s1", x: 900, y: LANE_S - 2 },
  { id: "s2", x: 1400, y: LANE_S + 2 },
  { id: "s3", x: 1900, y: LANE_S - 2 },
  { id: "s4", x: 2260, y: 1060 },
  { id: "gate", x: 2330, y: LANE_C },
  { id: "keepE", x: 2550, y: LANE_C },
];
const NODE_IX = Object.fromEntries(NODES.map((n, i) => [n.id, i]));
const EDGES = [
  ["keepP", "fork"], ["fork", "n0"], ["fork", "c1"], ["fork", "s0"],
  ["n0", "n1"], ["n1", "n2"], ["n2", "n3"], ["n3", "n4"], ["n4", "gate"],
  ["c1", "c2"], ["c2", "c3"], ["c3", "gate"],
  ["s0", "s1"], ["s1", "s2"], ["s2", "s3"], ["s3", "s4"], ["s4", "gate"],
  ["n1", "c1"], ["n2", "c2"], ["n3", "c3"],
  ["s1", "c1"], ["s2", "c2"], ["s3", "c3"],
  ["gate", "keepE"],
];

// Routing is per LANE as well as per goal. Every destroyable building sits on
// the centre road, so a plain shortest path sends everything — siege engines
// especially — straight down the middle, and the north and south roads become
// scenery. Charging a small toll for standing off your own lane makes the
// three roads real: a squad dropped north of your gate marches the north road
// and only cuts inward at the last crossing. The toll is small enough that
// nothing takes an absurd detour, and it is what gives the drop position its
// second meaning after picking the objective.
const LANES = [LANE_N, LANE_C, LANE_S];
const LANE_TOLL = 0.6;
let _adj = [];        // adjacency list of node indices
let _nextHop = [];    // _nextHop[lane][goal][from] → node index to step to
let _hopDist = [];    // _hopDist[lane][goal][from] → travel cost

function laneOf(y) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < LANES.length; i++) {
    const d = Math.abs(y - LANES[i]);
    if (d < bd) { bd = d; bi = i; }
  }
  return bi;
}

function buildGraph() {
  _adj = NODES.map(() => []);
  for (const [a, b] of EDGES) {
    const ia = NODE_IX[a], ib = NODE_IX[b];
    _adj[ia].push(ib);
    _adj[ib].push(ia);
  }
  _nextHop = [];
  _hopDist = [];
  for (let L = 0; L < LANES.length; L++) {
    const toll = NODES.map((n) => Math.abs(n.y - LANES[L]) * LANE_TOLL);
    const hops = [], dists = [];
    for (let g = 0; g < NODES.length; g++) {
      // Dijkstra outward from the goal; the parent pointer doubles as next hop.
      const dist = new Array(NODES.length).fill(Infinity);
      const next = new Array(NODES.length).fill(-1);
      dist[g] = 0;
      const open = [g];
      while (open.length) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
        const cur = open.splice(bi, 1)[0];
        for (const nb of _adj[cur]) {
          // Walking nb → cur pays the length plus the toll on the node entered.
          const w = Math.hypot(NODES[nb].x - NODES[cur].x, NODES[nb].y - NODES[cur].y) + toll[cur];
          if (dist[cur] + w < dist[nb] - 0.01) {
            dist[nb] = dist[cur] + w;
            next[nb] = cur;
            open.push(nb);
          }
        }
      }
      hops.push(next);
      dists.push(dist);
    }
    _nextHop.push(hops);
    _hopDist.push(dists);
  }
}

// Where a squad standing at (x, y) should JOIN the road network on its way to
// `goalNode`. Picking the geometrically nearest node is not the same thing: a
// drop halfway down the centre road is equally close to both crossroads, and
// entering at the wrong one sends the whole squad marching backwards to get
// to a mine that is plainly ahead of it. Cost = walk to the node + road
// distance from there, over the nodes close enough to be worth walking to.
const ENTRY_R = 430;
function bestEntry(lane, x, y, goalNode) {
  let bn = -1, bc = Infinity, anyN = -1, anyC = Infinity;
  for (let n = 0; n < NODES.length; n++) {
    const near = Math.hypot(NODES[n].x - x, NODES[n].y - y);
    const cost = near + (_hopDist[lane][goalNode][n] ?? Infinity);
    if (cost < anyC) { anyC = cost; anyN = n; }
    if (near <= ENTRY_R && cost < bc) { bc = cost; bn = n; }
  }
  return bn >= 0 ? { node: bn, cost: bc } : { node: anyN, cost: anyC };
}

function nearestNode(x, y) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < NODES.length; i++) {
    const d = Math.hypot(NODES[i].x - x, NODES[i].y - y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _runnerRef = null;
let _frame = 0;
let _matchT = 0;
let _phase = "title";            // title | play | win | lose
let _lockUntil = 0;
let _uid = 0;

let _units = [];
let _unitByBody = new Map();
let _structs = [];
let _structByBody = new Map();
let _projs = [];
let _terrain = [];
let _corpses = [];
let _rings = [];
let _particles = [];
let _floaters = [];
let _swings = [];
let _pendingSpells = [];
let _commanders = [null, null];
let _keepOf = [null, null];
let _towerOf = [null, null];
let _mines = [];

let _cbUnit = null, _cbBld = null, _cbProj = null;

// Camera — shared focus point, one zoom per render mode.
let _camFocus = { x: 700, y: LANE_C };
let _camGoal = { x: 700, y: LANE_C };
let _zoom2d = 0.58;
let _camDist3d = 1350;
// Looking north-to-south keeps the map's long axis across the screen, with
// the player's keep on the left exactly as the 2D view shows it.
let _camYaw3d = -Math.PI / 2;
let _shakeT = 0;
let _camEye = { x: 0, y: 0 };

// Input
let _keys = {};
let _onKeyDown = null, _onKeyUp = null;
let _selCard = -1;
let _hoverW = { x: 0, y: 0, ok: false, has: false };
let _hoverRoute = null;
let _pointer = { active: false, panning: false, x: 0, y: 0, sx: 0, sy: 0, startX: 0, startY: 0, startFrame: 0, moved: false };
let _isTouch = false;
let _banner = null;
let _toast = null;
let _hintT = 0;

// 3D
let _THREE = null;
let _scene3d = null;
let _env = null;
let _figs = new Map();
let _figPool = new Map();
let _shadows = new Map();
let _bldMeshes = new Map();
let _fxPools = null;
let _sharedGeo = null;
let _camProj = null;
let _frame3d = -1;
let _projV = null;
let _pixiApp = null, _pixiDyn = null;

// ── Small helpers ─────────────────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function hexCss(h) { return "#" + h.toString(16).padStart(6, "0"); }
function srand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}
function fmtTime(frames) {
  const t = Math.floor(frames / 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function ux(u) { return u.body ? u.body.position.x : u.deadX; }
function uy(u) { return u.body ? u.body.position.y : u.deadY; }
function foeSides(side) { return side === SIDE_N ? [SIDE_P, SIDE_E] : [1 - side, SIDE_N]; }
function shake(amp, dur) {
  if (_runnerRef?.shakeCamera) _runnerRef.shakeCamera(amp, dur);
  _shakeT = Math.max(_shakeT, Math.round(dur * 60));
}
// After the final push every blow lands harder, and harder still the longer
// the siege drags on — a stalemate is not allowed to be a strategy.
function damageScale() {
  if (_matchT < FINAL_PUSH_AT) return 1;
  return 1.5 + Math.min(1.5, ((_matchT - FINAL_PUSH_AT) / (3 * 60 * 60)) * 1.5);
}

// …and both keeps start crumbling on their own, faster for the side whose
// opponent holds the mines. Two armies content to poke at each other across
// the middle of the map still get a result.
function tickSiegeDecay() {
  if (_matchT < FINAL_PUSH_AT) return;
  const before = [_keepOf[SIDE_P]?.hp ?? 0, _keepOf[SIDE_E]?.hp ?? 0];
  for (const side of [SIDE_P, SIDE_E]) {
    const keep = _keepOf[side];
    if (!keep || !keep.alive) continue;
    keep.hp -= keep.maxHp * 0.00013 * (1 + minesOwned(1 - side) * 0.8);
  }
  // The keep that was further gone falls first; a perfect tie goes to the
  // defender, which is the player.
  const order = before[SIDE_E] <= before[SIDE_P] ? [SIDE_E, SIDE_P] : [SIDE_P, SIDE_E];
  for (const side of order) {
    const keep = _keepOf[side];
    if (keep && keep.alive && keep.hp <= 0) destroyStruct(keep, null);
  }
}

// ── World construction ────────────────────────────────────────────────────
// Static geometry is all Polygon boxes with no explicit Material — dynamic
// bodies against a material-carrying Polygon is a known engine trap.
function addStaticBox(x, y, w, h, kind) {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  const s = new Polygon(Polygon.box(w, h));
  s.filter = new InteractionFilter(G_SOLID, ~0, 1 << 20, 0);
  b.shapes.add(s);
  b.space = _space;
  try { b.userData._kind = kind; b.userData._hidden3d = true; } catch (_) { /* frozen userData */ }
  _terrain.push({ body: b, x, y, w, h, kind });
  return b;
}

// The ridges that turn three roads into three corridors. Each row of rock has
// a gap where a cross-road runs through it.
// Gaps sit where a road crosses: the two diagonals out of each keep (x ≈ 515
// and x ≈ 2285) and the three cross-roads (x = 900 / 1400 / 1900). The ground
// around each keep is left open so the yard you muster in is a yard, not a
// quarry — dropping north or south of your own gate is how you choose a flank.
const RIDGE_ROWS = [
  { y: 468, spans: [[640, 765], [1035, 1265], [1535, 1765], [2035, 2160]] },
  { y: 934, spans: [[640, 765], [1035, 1265], [1535, 1765], [2035, 2160]] },
];

function buildTerrain() {
  _terrain = [];
  const T = 70;
  addStaticBox(MAP_W / 2, -T / 2, MAP_W + T * 2, T, "edge");
  addStaticBox(MAP_W / 2, MAP_H + T / 2, MAP_W + T * 2, T, "edge");
  addStaticBox(-T / 2, MAP_H / 2, T, MAP_H + T * 2, "edge");
  addStaticBox(MAP_W + T / 2, MAP_H / 2, T, MAP_H + T * 2, "edge");
  for (const row of RIDGE_ROWS) {
    for (const [x0, x1] of row.spans) {
      addStaticBox((x0 + x1) / 2, row.y, x1 - x0, 84, "ridge");
    }
  }
}

function makeStructure(kind, side, nodeId, o) {
  const n = NODES[NODE_IX[nodeId]];
  const body = new Body(BodyType.STATIC, new Vec2(n.x, n.y));
  const shape = kind === "keep"
    ? new Polygon(Polygon.box(o.w, o.h))
    : new Circle(o.r);
  shape.filter = new InteractionFilter(G_SOLID, ~0, S_BLD[side], ~0);
  shape.cbTypes.add(_cbBld);
  body.shapes.add(shape);
  body.space = _space;
  try { body.userData._hidden3d = true; } catch (_) { /* frozen */ }
  const s = {
    kind, side, node: NODE_IX[nodeId], x: n.x, y: n.y, isStruct: true,
    r: o.r ?? Math.max(o.w, o.h) / 2, w: o.w ?? o.r * 2, h: o.h ?? o.r * 2,
    hp: o.hp ?? 0, maxHp: o.hp ?? 0, alive: true,
    body, shape,
    range: o.range ?? 0, dmg: o.dmg ?? 0, atkCd: o.atkCd ?? 90, cd: irand(0, 60),
    splash: o.splash ?? 0, deployR: kind === "keep" ? DEPLOY_R_KEEP : DEPLOY_R,
    capProg: 0, capTo: -1, guarded: side === SIDE_N,
    guards: [], hitFlash: 0, deadT: 0, shielded: false, muzzle: 0,
    flagWave: Math.random() * 6,
  };
  _structByBody.set(body, s);
  _structs.push(s);
  return s;
}

function setStructSide(s, side) {
  s.side = side;
  s.shape.filter.sensorGroup = S_BLD[side];
}

function buildStructures() {
  _structs = [];
  _structByBody = new Map();
  _keepOf[SIDE_P] = makeStructure("keep", SIDE_P, "keepP", {
    w: 150, h: 168, hp: 4200, range: 260, dmg: 58, atkCd: 70, splash: 72,
  });
  _keepOf[SIDE_E] = makeStructure("keep", SIDE_E, "keepE", {
    w: 150, h: 168, hp: 4200, range: 260, dmg: 58, atkCd: 70, splash: 72,
  });
  _towerOf[SIDE_P] = makeStructure("tower", SIDE_P, "c1", {
    r: 42, hp: 2000, range: 275, dmg: 38, atkCd: 62, splash: 54,
  });
  _towerOf[SIDE_E] = makeStructure("tower", SIDE_E, "c3", {
    r: 42, hp: 2000, range: 275, dmg: 38, atkCd: 62, splash: 54,
  });
  _mines = [
    makeStructure("mine", SIDE_N, "n2", { r: 46, range: 190, dmg: 18, atkCd: 96 }),
    makeStructure("mine", SIDE_N, "s2", { r: 46, range: 190, dmg: 18, atkCd: 96 }),
  ];
  for (const m of _mines) {
    // Each mine starts behind a neutral camp. Kill it and the shaft is yours.
    const ring = [-0.9, 0, 0.9];
    m.guards = ring.map((a) => {
      const dir = m.y < MAP_H / 2 ? Math.PI / 2 : -Math.PI / 2;
      const ang = dir + a;
      const g = spawnUnit(SIDE_N, "troll", m.x + Math.cos(ang) * 86, m.y + Math.sin(ang) * 86, {
        leash: { x: m.x, y: m.y, r: 250 },
      });
      g.spawnT = 0;
      g.homeAngle = ang;
      return g;
    });
  }
}

// ── Figurines ─────────────────────────────────────────────────────────────
function spawnUnit(side, key, x, y, opts = {}) {
  const def = { ...UNIT_DEFS[key], key };
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const shape = new Circle(def.r, undefined, new Material(0.02, 0.25, 0.3, def.mass ?? 1));
  shape.filter = def.flying
    ? new InteractionFilter(G_AIR, G_AIR, S_UNIT[side], ~0)
    : new InteractionFilter(G_GROUND, G_GROUND | G_SOLID, S_UNIT[side], ~0);
  shape.cbTypes.add(_cbUnit);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.space = _space;
  try {
    body.userData._hidden3d = true;
    body.userData._colorIdx = side === SIDE_P ? 0 : side === SIDE_E ? 3 : 2;
  } catch (_) { /* frozen userData */ }
  const u = {
    uid: ++_uid, side, key, def, body, shape,
    alive: true, isStruct: false,
    hp: def.hp, maxHp: def.hp,
    face: side === SIDE_P ? 0 : Math.PI,
    cd: irand(0, Math.max(1, Math.round((def.cd ?? 60) * 0.5))),
    windT: -1, atkTarget: null, target: null, retargetT: irand(0, 14),
    goal: null, node: -1, repath: 0,
    stun: 0, spawnT: opts.spawnT ?? SPAWN_IN,
    lane: laneOf(y),
    stallCheck: irand(1, 18), stallT: 0, stallX: x, stallY: y,
    stallSide: Math.random() < 0.5 ? -1 : 1,
    hitFlash: 0, atkFlash: 0, healFlash: 0,
    z: def.flying ? 44 : 0, bob: Math.random() * 6.28,
    vx: 0, vy: 0, speedMul: 1, moving: 0,
    leash: opts.leash ?? null, homeAngle: 0,
    laneOff: rand(-38, 38),
    breathCd: irand(180, 420), breathT: 0,
    deadT: 0, deadX: x, deadY: y, born: _frame,
  };
  setSolid(u, false);
  _units.push(u);
  _unitByBody.set(body, u);
  u.node = nearestNode(x, y);
  if (side !== SIDE_N) chooseGoal(u);
  return u;
}

function setSolid(u, solid) {
  if (!u.shape) return;
  const f = u.shape.filter;
  f.collisionMask = solid
    ? (u.def.flying ? G_AIR : G_GROUND | G_SOLID)
    : (u.def.flying ? 0 : G_SOLID);
  f.sensorGroup = solid ? S_UNIT[u.side] : 0;
}

function removeUnit(u) {
  if (u.body) {
    _unitByBody.delete(u.body);
    if (u.body.space) u.body.space = null;
    u.body = null;
  }
}

function killUnit(u, from) {
  if (!u.alive) return;
  u.alive = false;
  u.deadX = ux(u); u.deadY = uy(u); u.deadZ = u.z;
  u.deadT = 0.001;
  if (u.def.suicide) detonate(u);
  addParticles(u.deadX, u.deadY, u.z + 10, 9, hexCss(u.def.color), 18, 120, 26);
  removeUnit(u);
  _corpses.push(u);
  const cmd = _commanders[u.side];
  if (cmd && u.def.leader) {
    cmd.leaderUnit = null;
    cmd.leaderCd = LEADER_COOLDOWN;
    toast(`${SIDE_INFO[u.side].name} commander has fallen`, u.side === SIDE_P ? "#ff8f6b" : "#9ee37d");
  }
  void from;
}

// ── Goals and pathing ─────────────────────────────────────────────────────
// Which building a squad marches on. Road distance decides most of it, but a
// straight-line term makes the *drop position* the tie-breaker: two mines the
// same number of road-metres from your gate scored identically, so every squad
// dropped at the keep walked to the same one and the player had no say in it.
function pickGoal(side, lane, x, y, def) {
  let best = null, bestScore = Infinity, bestNode = -1;
  for (const s of _structs) {
    if (!s.alive || s.side === side) continue;
    if (s.kind === "mine" && def && (def.siege || def.suicide)) continue;
    if (s.kind === "keep" && s.shielded) continue;
    const e = bestEntry(lane, x, y, s.node);
    const pref = s.kind === "mine" ? (s.side === SIDE_N ? 0.78 : 1.3)
      : s.kind === "tower" ? 0.92 : 1;
    const sc = (e.cost + Math.hypot(s.x - x, s.y - y) * 0.5) * pref;
    if (sc < bestScore) { bestScore = sc; best = s; bestNode = e.node; }
  }
  if (!best) {
    const keep = _keepOf[1 - side];
    if (keep && keep.alive) { best = keep; bestNode = bestEntry(lane, x, y, keep.node).node; }
  }
  return { goal: best, node: bestNode };
}

function chooseGoal(u) {
  if (u.side === SIDE_N) { u.goal = null; return; }
  const r = pickGoal(u.side, u.lane, ux(u), uy(u), u.def);
  u.goal = r.goal;
  if (r.node >= 0) u.node = r.node;
}

// Where a troop walks when nothing is worth fighting.
//
// Two details matter more than they look. A waypoint is left behind as soon as
// the troop is nearer the *next* one than the leg is long — waiting to come
// within some radius of the node makes a big squad pile into a permanent scrum
// around it, because the ones at the back never get close enough. And each
// troop carries a fixed sideways offset, so a column spreads across the width
// of the road instead of queueing through a single point.
function marchPoint(u) {
  if (!u.goal) return null;
  const g = u.goal.node;
  if (u.def.flying) return { x: u.goal.x, y: u.goal.y };
  if (u.node === g) return { x: u.goal.x, y: u.goal.y };
  let n = NODES[u.node];
  let nx = _nextHop[u.lane][g][u.node];
  for (let guard = 0; guard < 4 && nx >= 0; guard++) {
    const nn = NODES[nx];
    const leg = Math.hypot(nn.x - n.x, nn.y - n.y);
    const here = Math.hypot(n.x - ux(u), n.y - uy(u));
    const ahead = Math.hypot(nn.x - ux(u), nn.y - uy(u));
    if (here >= 60 && ahead >= leg - 6) break;
    u.node = nx;
    if (u.node === g) return { x: u.goal.x, y: u.goal.y };
    n = NODES[u.node];
    nx = _nextHop[u.lane][g][u.node];
  }
  if (nx < 0) return { x: n.x, y: n.y };
  const nn = NODES[nx];
  const dx = nn.x - n.x, dy = nn.y - n.y;
  const L = Math.hypot(dx, dy) || 1;
  const k = clamp(1 - Math.hypot(n.x - ux(u), n.y - uy(u)) / 260, 0, 0.6);
  return {
    x: lerp(n.x, nn.x, k) + (-dy / L) * u.laneOff,
    y: lerp(n.y, nn.y, k) + (dx / L) * u.laneOff,
  };
}

// ── Rock awareness ────────────────────────────────────────────────────────
// The ridges are a handful of wide, axis-aligned boxes, so "is there rock in
// the way" is a slab test rather than anything resembling pathfinding.
function ridgeAt(x, y, pad) {
  for (const t of _terrain) {
    if (t.kind !== "ridge") continue;
    if (Math.abs(x - t.x) <= t.w / 2 + pad && Math.abs(y - t.y) <= t.h / 2 + pad) return t;
  }
  return null;
}

function segHitsBox(x1, y1, x2, y2, bx, by, hw, hh) {
  let t0 = 0, t1 = 1;
  const d = [x2 - x1, y2 - y1];
  const o = [x1, y1];
  const lo = [bx - hw, by - hh];
  const hi = [bx + hw, by + hh];
  for (let i = 0; i < 2; i++) {
    if (Math.abs(d[i]) < 1e-6) {
      if (o[i] < lo[i] || o[i] > hi[i]) return false;
      continue;
    }
    let ta = (lo[i] - o[i]) / d[i];
    let tb = (hi[i] - o[i]) / d[i];
    if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}

function rockBetween(x1, y1, x2, y2) {
  for (const t of _terrain) {
    if (t.kind !== "ridge") continue;
    if (segHitsBox(x1, y1, x2, y2, t.x, t.y, t.w / 2, t.h / 2)) return true;
  }
  return false;
}

// A ridge row is only crossable at its gaps — the same places the roads run
// through. Rather than re-deciding how to dodge the rock every frame (which
// leaves a figurine jittering against a corner, because the decision flips as
// it inches back and forth), work out which gap it should use and walk it to
// the mouth. The answer depends only on where the troop is, so it is stable.
const ROW_GAPS = RIDGE_ROWS.map((row) => {
  const gaps = [];
  let prev = 0;
  for (const [a, b] of row.spans) {
    if (a - prev > 60) gaps.push([prev, a]);
    prev = b;
  }
  if (MAP_W - prev > 60) gaps.push([prev, MAP_W]);
  return gaps;
});

function avoidRidges(u, tx, ty) {
  if (u.def.flying || !u.body) return null;
  const x = ux(u), y = uy(u);
  let dx = tx - x, dy = ty - y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return null;
  dx /= d; dy /= d;
  for (let i = 0; i < RIDGE_ROWS.length; i++) {
    const row = RIDGE_ROWS[i];
    const band = 42 + u.def.r + 8;
    const crossing = (y <= row.y) !== (ty <= row.y);
    if (!crossing) continue;
    const margin = u.def.r + 8;
    let best = null, bd = Infinity;
    for (const [a, b] of ROW_GAPS[i]) {
      const c = (a + b) / 2;
      const inside = x > a + margin && x < b - margin;
      const d = inside ? 0 : Math.abs(x - c);
      if (d < bd) { bd = d; best = { a, b, c, inside }; }
    }
    if (!best) continue;
    // Lined up already: go straight through, but stay between the rocks —
    // spread across the pass so a column does not queue through one point.
    if (best.inside) {
      return { x: clamp(tx + u.laneOff * 0.6, best.a + margin + 2, best.b - margin - 2), y: ty };
    }
    // Not lined up: walk to the mouth of the gap on this side of the row.
    return {
      x: clamp(best.c + u.laneOff * 0.7, best.a + margin + 2, best.b - margin - 2),
      y: row.y + (y <= row.y ? -band : band),
    };
  }
  // Not crossing anything — so the only thing rock can do is block us
  // sideways. Drop the part of the heading that presses into the face and
  // keep walking the way we were already going. A detour to a gap here is
  // what used to send troops marching backwards past their own tower.
  const box = ridgeAt(x, y, u.def.r + 3);
  if (box) {
    const ox = box.w / 2 + u.def.r + 3 - Math.abs(x - box.x);
    const oy = box.h / 2 + u.def.r + 3 - Math.abs(y - box.y);
    if (ox > 0 && oy > 0) {
      if (oy <= ox) {
        if ((box.y - y) * dy > 0 && Math.abs(dx) > 0.12) return { x: x + dx * 240, y };
      } else if ((box.x - x) * dx > 0 && Math.abs(dy) > 0.12) {
        return { x, y: y + dy * 240 };
      }
    }
  }
  return null;
}

// The road a squad dropped here would actually walk, and the building at the
// end of it. Drawn under the cursor before you spend the gold, because "where
// will this lot go" is the only question the player has to answer.
function previewRoute(x, y, card) {
  if (_phase !== "play") return null;
  const def = card && card.unit ? UNIT_DEFS[card.unit] : null;
  const lane = laneOf(y);
  const plan = pickGoal(SIDE_P, lane, x, y, def);
  const goal = plan.goal;
  if (!goal) return null;
  if (def?.flying) return { goal, pts: [{ x, y }, { x: goal.x, y: goal.y }], flying: true };
  const pts = [{ x, y }];
  let n = plan.node >= 0 ? plan.node : nearestNode(x, y);
  if (n !== goal.node) {
    // Mirror marchPoint: a node already behind us is not walked back to.
    const nx = _nextHop[lane][goal.node][n];
    if (nx >= 0) {
      const nd = NODES[n], nn = NODES[nx];
      const leg = Math.hypot(nn.x - nd.x, nn.y - nd.y);
      if (Math.hypot(nd.x - x, nd.y - y) < 60 || Math.hypot(nn.x - x, nn.y - y) < leg - 6) n = nx;
    }
  }
  for (let guard = 0; n !== goal.node && guard < 24; guard++) {
    pts.push({ x: NODES[n].x, y: NODES[n].y });
    const nx = _nextHop[lane][goal.node][n];
    if (nx < 0) break;
    n = nx;
  }
  pts.push({ x: goal.x, y: goal.y });
  return { goal, pts: routeThroughGaps(pts, def?.r ?? 14), flying: false };
}

// Bend any leg that crosses a ridge row through the gap the troops will
// actually use, so the previewed line matches the walk they take.
function routeThroughGaps(pts, r) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1], b = pts[i];
    for (let ri = 0; ri < RIDGE_ROWS.length; ri++) {
      const row = RIDGE_ROWS[ri];
      if ((a.y <= row.y) === (b.y <= row.y)) continue;
      const margin = r + 8, band = 42 + r + 8;
      const t = (row.y - a.y) / (b.y - a.y || 1);
      const cx = a.x + (b.x - a.x) * t;
      let best = null, bd = Infinity;
      for (const [g0, g1] of ROW_GAPS[ri]) {
        const c = (g0 + g1) / 2;
        const inside = cx > g0 + margin && cx < g1 - margin;
        const d = inside ? 0 : Math.abs(cx - c);
        if (d < bd) { bd = d; best = { c, inside }; }
      }
      if (best && !best.inside) {
        const side = a.y <= row.y ? -1 : 1;
        out.push({ x: best.c, y: row.y + side * band });
        out.push({ x: best.c, y: row.y - side * band });
      }
    }
    out.push(b);
  }
  return out;
}

/** Route points spaced evenly, for the marching pips the preview draws. */
function routeDots(route, spacing = 34) {
  const out = [];
  const pts = route.flying ? [route.pts[0], route.pts[route.pts.length - 1]] : route.pts;
  let carry = (_frame * 1.1) % spacing;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = carry; d < len; d += spacing) {
      out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
      if (out.length > 120) return out;
    }
    carry = (carry - len) % spacing;
    if (carry < 0) carry += spacing;
  }
  return out;
}

function structLabel(s) {
  if (s.kind === "keep") return `${SIDE_INFO[s.side].name} keep`;
  if (s.kind === "tower") return "watchtower";
  return s.side === SIDE_N ? "guarded mine" : "gold mine";
}

// ── Targeting ─────────────────────────────────────────────────────────────
function canHitAir(u) { return !!(u.def.canHitAir || u.def.flying || u.def.range > 100) && !u.def.noAir; }

function reachTo(u, o) {
  const r = o.isStruct ? Math.max(o.w, o.h) * 0.42 : o.def.r;
  return Math.hypot(ux(o) - ux(u), uy(o) - uy(u)) - r - u.def.r;
}

function retarget(u) {
  if (u.def.support) { u.target = mostWounded(u); return; }
  let best = null, bd = Infinity;
  const aggro = u.def.aggro || 0;
  for (const o of _units) {
    if (!o.alive || o.side === u.side || o.spawnT > 0) continue;
    if (o.def.flying && !canHitAir(u)) continue;
    if (u.leash && Math.hypot(ux(o) - u.leash.x, uy(o) - u.leash.y) > u.leash.r) continue;
    const d = reachTo(u, o);
    if (d > aggro) continue;
    // No picking a fight through solid rock.
    if (!u.def.flying && !o.def.flying && rockBetween(ux(u), uy(u), ux(o), uy(o))) continue;
    // Siege engines and kegs would rather look at the walls.
    const w = (u.def.siege || u.def.suicide) ? d + 130 : d;
    if (w < bd) { bd = w; best = o; }
  }
  if (!best && u.goal && u.goal.alive && !u.def.support) {
    const d = reachTo(u, u.goal);
    if (d <= Math.max(aggro, u.def.range + 24) || u.def.suicide) best = u.goal;
  }
  if (!best && !u.leash) {
    // Anything hostile standing in the road, building or not.
    for (const s of _structs) {
      if (!s.alive || s.side === u.side || s.kind === "mine" || s.shielded) continue;
      const d = reachTo(u, s);
      if (d <= aggro && d < bd) { bd = d; best = s; }
    }
  }
  u.target = best;
}

function mostWounded(u) {
  let best = null, bw = 0;
  for (const o of _units) {
    if (!o.alive || o.side !== u.side || o === u || o.spawnT > 0) continue;
    const miss = o.maxHp - o.hp;
    if (miss < 12) continue;
    const d = reachTo(u, o);
    if (d > u.def.range + 90) continue;
    const w = miss / o.maxHp + (d < u.def.range ? 0.4 : 0);
    if (w > bw) { bw = w; best = o; }
  }
  return best;
}

function auraFor(u) {
  let bonus = 0;
  for (const o of _units) {
    if (!o.alive || o.side !== u.side || !o.def.aura) continue;
    if (Math.hypot(ux(o) - ux(u), uy(o) - uy(u)) <= o.def.aura.r) bonus = Math.max(bonus, o.def.aura.dmg);
  }
  return bonus;
}

// ── Damage ────────────────────────────────────────────────────────────────
function dealDamage(target, amount, from, o = {}) {
  if (!target || !target.alive) return 0;
  if (target.isStruct) return damageStruct(target, amount, from, o);
  const armor = o.trueDamage ? 0 : (target.def.armor || 0);
  const amt = amount * damageScale() * (1 - armor);
  target.hp -= amt;
  target.hitFlash = 8;
  if (o.stun) target.stun = Math.max(target.stun, o.stun);
  if ((o.kx || o.ky) && target.body && !target.def.leader) {
    const m = target.body.mass || 1;
    target.body.applyImpulse(new Vec2(o.kx * m * 0.5, o.ky * m * 0.5));
  }
  addFloater(ux(target), uy(target), target.z + target.def.r + 10, Math.round(amt), "#ffd7c0", o.big);
  if (target.hp <= 0) killUnit(target, from);
  return amt;
}

function damageStruct(s, amount, from, o = {}) {
  if (!s.alive || s.kind === "mine") return 0;
  if (s.shielded) {
    if (_frame % 24 === 0) addFloater(s.x, s.y, 90, "shielded", "#8ecbff");
    return 0;
  }
  const amt = amount * damageScale();
  s.hp -= amt;
  s.hitFlash = 8;
  addFloater(s.x + rand(-24, 24), s.y + rand(-16, 16), 70, Math.round(amt), "#ffe3a0", o.big);
  if (s.hp <= 0) destroyStruct(s, from);
  return amt;
}

function destroyStruct(s, from) {
  if (!s.alive) return;
  s.alive = false;
  s.hp = 0;
  s.deadT = 0.001;
  s.deadX = s.x; s.deadY = s.y;
  if (s.body?.space) s.body.space = null;
  _structByBody.delete(s.body);
  s.body = null;
  addRing(s.x, s.y, 20, s.kind === "keep" ? 220 : 140, 40, "#ffb066");
  addParticles(s.x, s.y, 40, 34, "#c8bba8", 60, 300, 90);
  shake(s.kind === "keep" ? 16 : 9, s.kind === "keep" ? 0.9 : 0.5);
  const owner = s.side;
  if (s.kind === "tower") {
    banner(
      owner === SIDE_P ? "Your watchtower has fallen" : "Enemy watchtower destroyed",
      owner === SIDE_P ? "Your keep is exposed" : "Their keep is exposed",
      owner === SIDE_P ? "#ff8f6b" : "#9ee37d",
    );
  }
  refreshShields();
  // Everyone marching at a building that no longer exists needs a new errand.
  for (const u of _units) {
    if (u.goal === s) chooseGoal(u);
    if (u.target === s) u.target = null;
  }
  if (s.kind === "keep" && _phase === "play") {
    _phase = owner === SIDE_P ? "lose" : "win";
    _lockUntil = _frame + RESULT_LOCK;
  }
  void from;
}

function refreshShields() {
  for (const side of [SIDE_P, SIDE_E]) {
    const keep = _keepOf[side];
    const tower = _towerOf[side];
    if (!keep) continue;
    const wasShielded = keep.shielded;
    keep.shielded = !!(tower && tower.alive) && _matchT < FINAL_PUSH_AT;
    if (wasShielded && !keep.shielded) {
      for (const u of _units) if (u.side !== side) chooseGoal(u);
    }
  }
}

// ── Projectiles ───────────────────────────────────────────────────────────
// Sensor bodies moved by the engine. The mask names the *other* side's troops
// or buildings, so a shot can never touch a friend.
function fireProjectile(from, target, o) {
  const sx = o.x, sy = o.y;
  const side = o.side ?? from?.side ?? SIDE_N;
  const tx = ux(target) + (target.isStruct ? 0 : (target.vx || 0) * (o.lead ?? 0.16));
  const ty = uy(target) + (target.isStruct ? 0 : (target.vy || 0) * (o.lead ?? 0.16));
  const angle = Math.atan2(ty - sy, tx - sx);
  const body = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  const shape = new Circle(o.r ?? 5);
  shape.sensorEnabled = true;
  let mask = 0;
  for (const fs of foeSides(side)) mask |= (o.vsUnits === false ? 0 : S_UNIT[fs]) | (o.vsBuildings ? S_BLD[fs] : 0);
  shape.filter = new InteractionFilter(G_PROJ, 0, G_PROJ, mask);
  shape.cbTypes.add(_cbProj);
  body.shapes.add(shape);
  body.velocity = new Vec2(Math.cos(angle) * o.speed, Math.sin(angle) * o.speed);
  body.allowRotation = false;
  body.space = _space;
  try { body.userData._hidden = true; body.userData._hidden3d = true; } catch (_) { /* frozen */ }
  const p = {
    body, side, owner: from, angle, speed: o.speed, r: o.r ?? 5,
    kind: o.kind ?? "arrow", dmg: o.dmg, siege: o.siege ?? 1,
    splash: o.splash ?? 0, knock: o.knock ?? 0, noAir: !!o.noAir,
    color: o.color ?? "#ffe8b0", z: o.z ?? 22, life: Math.ceil((o.range / o.speed) * 60) + 20,
    t: 0, dead: false,
  };
  _projs.push(p);
  return p;
}

function killProjectile(p) {
  if (p.body?.space) p.body.space = null;
  p.body = null;
  p.dead = true;
}

function onProjectileHit(p, thing, hx, hy) {
  if (!p.body || p.dead) return;
  if (!thing || !thing.alive) return;
  if (thing.side === p.side) return;
  if (!thing.isStruct && thing.def.flying && p.noAir) return;
  if (p.splash > 0) {
    splashDamage(p.side, hx, hy, p.splash, p.dmg, { knock: p.knock, siege: p.siege, owner: p.owner });
    addRing(hx, hy, 8, p.splash, 16, p.color);
    addParticles(hx, hy, p.z, 12, p.color, 30, 190, 40);
  } else {
    dealDamage(thing, p.dmg * (thing.isStruct ? p.siege : 1), p.owner, {
      kx: Math.cos(p.angle) * p.knock, ky: Math.sin(p.angle) * p.knock,
    });
    addParticles(hx, hy, p.z, 4, p.color, 10, 110, 26);
  }
  killProjectile(p);
}

function splashDamage(side, x, y, radius, dmg, o = {}) {
  for (const t of _units) {
    if (!t.alive || t.side === side || t.spawnT > 0) continue;
    const dx = ux(t) - x, dy = uy(t) - y;
    const d = Math.hypot(dx, dy);
    if (d > radius + t.def.r) continue;
    const fall = clamp(1 - d / (radius + t.def.r), 0.35, 1);
    const k = d > 1 ? (o.knock || 0) / d : 0;
    dealDamage(t, dmg * fall, o.owner, { kx: dx * k, ky: dy * k, stun: o.stun });
  }
  for (const s of _structs) {
    if (!s.alive || s.side === side || s.kind === "mine") continue;
    if (Math.hypot(s.x - x, s.y - y) > radius + Math.max(s.w, s.h) * 0.42) continue;
    damageStruct(s, dmg * (o.siege ?? 1) * (o.structMul ?? 1), o.owner, {});
  }
}

function detonate(u) {
  const s = u.def.suicide;
  const x = ux(u), y = uy(u);
  splashDamage(u.side, x, y, s.radius, s.dmg, {
    knock: s.knock, owner: u, structMul: s.struct / s.dmg,
  });
  addRing(x, y, 10, s.radius, 22, "#ffb066");
  addParticles(x, y, 14, 26, "#ff9a4a", 40, 260, 70);
  shake(8, 0.4);
}

function installListeners(space) {
  _cbUnit = new CbType();
  _cbBld = new CbType();
  _cbProj = new CbType();
  const resolve = (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body ?? null;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
    return [b1, b2];
  };
  const projOf = (b1, b2) => {
    for (const p of _projs) if (p.body === b1 || p.body === b2) return p;
    return null;
  };
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbProj, _cbUnit,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const p = projOf(b1, b2);
      if (!p || !p.body) return;
      const unit = _unitByBody.get(p.body === b1 ? b2 : b1);
      if (!unit) return;
      onProjectileHit(p, unit, p.body.position.x, p.body.position.y);
    },
  ));
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbProj, _cbBld,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const p = projOf(b1, b2);
      if (!p || !p.body) return;
      const s = _structByBody.get(p.body === b1 ? b2 : b1);
      if (!s) return;
      onProjectileHit(p, s, p.body.position.x, p.body.position.y);
    },
  ));
}

function tickProjectiles() {
  for (let i = _projs.length - 1; i >= 0; i--) {
    const p = _projs[i];
    if (p.body) {
      p.t++;
      if (--p.life <= 0) killProjectile(p);
      else {
        const pos = p.body.position;
        if (pos.x < -40 || pos.x > MAP_W + 40 || pos.y < -40 || pos.y > MAP_H + 40) killProjectile(p);
      }
    }
    if (!p.body) _projs.splice(i, 1);
  }
}

// ── Movement ──────────────────────────────────────────────────────────────
// Velocity is written every frame, but blended, so a crowd still shoves and
// squeezes: the engine's contact impulses survive into the next frame.
function steerTo(u, tx, ty, mul = 1) {
  if (!u.body) return;
  const around = avoidRidges(u, tx, ty);
  if (around) { tx = around.x; ty = around.y; }
  if (u.stallT > 30) {
    const a = Math.atan2(ty - uy(u), tx - ux(u)) + u.stallSide * (Math.PI / 2);
    tx = ux(u) + Math.cos(a) * 140;
    ty = uy(u) + Math.sin(a) * 140;
  }
  const dx = tx - ux(u), dy = ty - uy(u);
  const d = Math.hypot(dx, dy) || 1;
  const sp = u.def.speed * mul * u.speedMul;
  const wx = (dx / d) * sp, wy = (dy / d) * sp;
  const v = u.body.velocity;
  u.body.velocity = new Vec2(lerp(v.x, wx, 0.22), lerp(v.y, wy, 0.22));
  u.face = Math.atan2(dy, dx);
  u.vx = wx; u.vy = wy;
  u.moving = Math.min(1, u.moving + 0.2);
}

function brake(u, k = 0.8) {
  if (!u.body) return;
  const v = u.body.velocity;
  u.body.velocity = new Vec2(v.x * k, v.y * k);
  u.vx = v.x; u.vy = v.y;
  u.moving = Math.max(0, u.moving - 0.2);
}

function faceTo(u, t) {
  u.face = Math.atan2(uy(t) - uy(u), ux(t) - ux(u));
}

// ── Attacking ─────────────────────────────────────────────────────────────
function startAttack(u, t) {
  u.windT = u.def.windup ?? 12;
  u.cd = u.def.cd ?? 60;
  u.atkTarget = t;
  u.atkFlash = (u.def.windup ?? 12) + 10;
}

function landBlow(u) {
  const t = u.atkTarget;
  u.atkTarget = null;
  if (!t || !t.alive || !u.alive) return;
  const reach = reachTo(u, t);
  if (reach > (u.def.range ?? 20) + 46) return;
  const bonus = 1 + auraFor(u);

  if (u.def.support) {
    const amt = u.def.heal * bonus;
    t.hp = Math.min(t.maxHp, t.hp + amt);
    t.healFlash = 16;
    addFloater(ux(t), uy(t), t.z + t.def.r + 10, `+${Math.round(amt)}`, "#7de8a8");
    addRing(ux(t), uy(t), 6, t.def.r + 16, 18, "#7de8a8");
    return;
  }

  if (u.def.proj) {
    const pr = u.def.proj;
    fireProjectile(u, t, {
      x: ux(u) + Math.cos(u.face) * (u.def.r + 6),
      y: uy(u) + Math.sin(u.face) * (u.def.r + 6),
      side: u.side, speed: pr.speed, r: pr.r, kind: pr.kind, color: pr.color,
      dmg: u.def.dmg * bonus, siege: u.def.siege ?? 0.8, noAir: !!u.def.noAir,
      range: u.def.range + 120, vsBuildings: true, z: u.z + u.def.r,
    });
    return;
  }

  // Melee: a swept arc in front of the figurine.
  addSwing(ux(u), uy(u), u.face, u.def.splash ? 1.5 : 0.9, u.def.r + (u.def.range ?? 18) + 8,
    hexCss(SIDE_INFO[u.side].tint));
  const dmg = u.def.dmg * bonus * (t.isStruct ? (u.def.siege ?? 1) : 1);
  dealDamage(t, dmg, u, {
    kx: Math.cos(u.face) * (u.def.splash ? 180 : 70),
    ky: Math.sin(u.face) * (u.def.splash ? 180 : 70),
  });
  if (u.def.splash) {
    for (const o of _units) {
      if (!o.alive || o === t || o.side === u.side || o.spawnT > 0) continue;
      if (o.def.flying && !canHitAir(u)) continue;
      const dx = ux(o) - ux(u), dy = uy(o) - uy(u);
      const d = Math.hypot(dx, dy);
      if (d > u.def.splash + o.def.r) continue;
      if (Math.abs(wrapAngle(Math.atan2(dy, dx) - u.face)) > 1.1) continue;
      dealDamage(o, dmg * 0.7, u, { kx: (dx / d) * 150, ky: (dy / d) * 150 });
    }
  }
}

function breathAttack(u) {
  u.breathT = 26;
  u.breathCd = irand(330, 520);
  const reach = 230, half = 0.55;
  for (const o of _units) {
    if (!o.alive || o.side === u.side || o.spawnT > 0) continue;
    const dx = ux(o) - ux(u), dy = uy(o) - uy(u);
    const d = Math.hypot(dx, dy);
    if (d > reach + o.def.r) continue;
    if (Math.abs(wrapAngle(Math.atan2(dy, dx) - u.face)) > half) continue;
    dealDamage(o, 70 * (1 + auraFor(u)), u, { kx: (dx / d) * 120, ky: (dy / d) * 120 });
  }
  for (let i = 0; i < 16; i++) {
    const a = u.face + rand(-half, half), d = rand(30, reach);
    addParticles(ux(u) + Math.cos(a) * d, uy(u) + Math.sin(a) * d, 20, 1, "#ff8a3a", 20, 90, 40);
  }
}

// ── One figurine's turn ───────────────────────────────────────────────────
function tickUnit(u) {
  if (u.hitFlash > 0) u.hitFlash--;
  if (u.atkFlash > 0) u.atkFlash--;
  if (u.healFlash > 0) u.healFlash--;
  if (u.breathT > 0) u.breathT--;
  if (u.cd > 0) u.cd--;
  if (u.breathCd > 0) u.breathCd--;
  if (u.def.flying) { u.bob += 0.11; u.z = 44 + Math.sin(u.bob) * 5; }

  if (u.spawnT > 0) {
    u.spawnT--;
    if (u.spawnT === 0) setSolid(u, true);
    brake(u, 0.6);
    return;
  }
  if (u.stun > 0) { u.stun--; brake(u, 0.9); return; }

  if (u.windT >= 0) {
    u.windT--;
    if (u.atkTarget && u.atkTarget.alive) faceTo(u, u.atkTarget);
    if (u.windT < 0) landBlow(u);
    brake(u, 0.72);
    return;
  }

  if (--u.stallCheck <= 0) {
    u.stallCheck = 18;
    const gone = Math.hypot(ux(u) - u.stallX, uy(u) - u.stallY);
    // The bar has to scale with the troop's own pace: a siege engine covers
    // barely 7 px in these 18 frames even when nothing is in its way.
    const expect = u.def.speed * 0.3 * 0.35;
    const wantsToMove = u.windT < 0 && u.stun <= 0 &&
      (!u.target || reachTo(u, u.target) > (u.def.range ?? 20) + 8);
    u.stallT = gone < expect && wantsToMove ? Math.min(96, u.stallT + 18) : Math.max(0, u.stallT - 24);
    if (u.stallT === 0) u.stallSide = Math.random() < 0.5 ? -1 : 1;
    // Sidestepping one way and still going nowhere? Try the other way.
    else if (u.stallT >= 96) { u.stallSide = -u.stallSide; u.stallT = 42; }
    u.stallX = ux(u); u.stallY = uy(u);
  }
  if (--u.retargetT <= 0) { retarget(u); u.retargetT = 11 + irand(0, 8); }
  if (u.goal && !u.goal.alive) chooseGoal(u);
  if (u.side !== SIDE_N && --u.repath <= 0) { u.repath = 150 + irand(0, 90); chooseGoal(u); }

  // Kegs run at the nearest building and blow up on arrival.
  if (u.def.suicide) {
    const aim = kegTarget(u);
    if (aim) {
      const d = reachTo(u, aim);
      faceTo(u, aim);
      if (d <= (aim.isStruct ? 26 : 18)) { killUnit(u, u); return; }
      steerTo(u, ux(aim), uy(aim), 1);
      return;
    }
    const mp = marchPoint(u);
    if (mp) steerTo(u, mp.x, mp.y);
    return;
  }

  if (u.def.breath && u.breathCd <= 0) {
    let near = 0;
    for (const o of _units) {
      if (o.alive && o.side !== u.side && o.spawnT <= 0 &&
          Math.abs(wrapAngle(Math.atan2(uy(o) - uy(u), ux(o) - ux(u)) - u.face)) < 0.6 &&
          Math.hypot(ux(o) - ux(u), uy(o) - uy(u)) < 230) near++;
    }
    if (near >= 2) { breathAttack(u); brake(u, 0.6); return; }
  }

  const t = u.target;
  if (t && t.alive) {
    const d = reachTo(u, t);
    const want = u.def.support ? u.def.range * 0.75 : u.def.range;
    if (d <= want) {
      faceTo(u, t);
      brake(u, 0.78);
      if (u.cd <= 0 && u.windT < 0) startAttack(u, t);
      return;
    }
    // Chase — but a camp guard never leaves its mine.
    if (u.leash && Math.hypot(ux(t) - u.leash.x, uy(t) - u.leash.y) > u.leash.r) {
      u.target = null;
    } else {
      steerTo(u, ux(t), uy(t), d > 240 ? 1 : 0.95);
      return;
    }
  }

  if (u.side === SIDE_N && u.leash) {
    const hx = u.leash.x + Math.cos(u.homeAngle) * 86;
    const hy = u.leash.y + Math.sin(u.homeAngle) * 86;
    if (Math.hypot(hx - ux(u), hy - uy(u)) > 16) steerTo(u, hx, hy, 0.75);
    else { brake(u, 0.85); u.face = lerp(u.face, u.homeAngle, 0.05); }
    return;
  }

  const mp = marchPoint(u);
  if (mp) steerTo(u, mp.x, mp.y);
  else brake(u, 0.9);
}

function kegTarget(u) {
  let best = null, bd = Infinity;
  for (const s of _structs) {
    if (!s.alive || s.side === u.side || s.kind === "mine" || s.shielded) continue;
    const d = reachTo(u, s);
    if (d < bd) { bd = d; best = s; }
  }
  // A tight knot of enemies is worth a keg too.
  let clump = null, cn = 0;
  for (const o of _units) {
    if (!o.alive || o.side === u.side || o.spawnT > 0 || o.def.flying) continue;
    const d = reachTo(u, o);
    if (d > 130) continue;
    let n = 0;
    for (const q of _units) {
      if (q.alive && q.side === o.side && !q.def.flying &&
          Math.hypot(ux(q) - ux(o), uy(q) - uy(o)) < 70) n++;
    }
    if (n >= 3 && n > cn) { cn = n; clump = o; }
  }
  if (clump && (!best || bd > 90)) return clump;
  return best;
}

function tickUnits() {
  for (const u of _units) if (u.alive) tickUnit(u);
  if (_units.some((u) => !u.alive)) _units = _units.filter((u) => u.alive);
}

function armySize(side) {
  let n = 0;
  for (const u of _units) if (u.alive && u.side === side) n++;
  return n;
}

// ── Buildings ─────────────────────────────────────────────────────────────
function tickStructs() {
  for (const s of _structs) {
    if (!s.alive) { if (s.deadT > 0) s.deadT = Math.min(1, s.deadT + 0.02); continue; }
    if (s.hitFlash > 0) s.hitFlash--;
    s.flagWave += 0.05;
    if (s.kind === "mine") tickMine(s);
    if (s.range > 0 && s.side !== SIDE_N && s.cd-- <= 0) {
      const t = nearestFoeUnit(s.side, s.x, s.y, s.range);
      if (t) {
        // A keep whose watchtower has fallen fires twice as fast — a last
        // stand that gives the losing side a chance to buy its army back.
        const lastStand = s.kind === "keep" && !_towerOf[s.side]?.alive;
        s.cd = Math.round(s.atkCd * (lastStand ? 0.55 : 1));
        s.muzzle = 10;
        fireProjectile(null, t, {
          x: s.x, y: s.y, side: s.side, speed: 560, r: s.splash ? 7 : 5, kind: "shot",
          color: s.kind === "keep" ? "#ffd48a" : "#ffbf6b",
          dmg: s.dmg, splash: s.splash, knock: s.splash ? 160 : 0,
          range: s.range + 140, z: s.kind === "keep" ? 92 : 66,
        });
      } else s.cd = 10;
    }
    if (s.muzzle > 0) s.muzzle--;
  }
}

function nearestFoeUnit(side, x, y, range) {
  let best = null, bd = Infinity;
  for (const u of _units) {
    if (!u.alive || u.side === side || u.spawnT > 0) continue;
    const d = Math.hypot(ux(u) - x, uy(u) - y) - u.def.r;
    if (d > range || d >= bd) continue;
    bd = d; best = u;
  }
  return best;
}

function tickMine(m) {
  m.guarded = m.guards.some((g) => g.alive);
  if (m.guarded) { m.capProg = 0; m.capTo = -1; return; }
  const near = [0, 0];
  for (const u of _units) {
    if (!u.alive || u.spawnT > 0 || u.side === SIDE_N) continue;
    if (Math.hypot(ux(u) - m.x, uy(u) - m.y) <= CAP_RADIUS + u.def.r) near[u.side]++;
  }
  const diff = near[SIDE_P] - near[SIDE_E];
  if (diff === 0) {
    if (m.capProg > 0) m.capProg = Math.max(0, m.capProg - 1.1);
    if (m.capProg === 0) m.capTo = -1;
    return;
  }
  const side = diff > 0 ? SIDE_P : SIDE_E;
  if (side === m.side) {
    if (m.capProg > 0) m.capProg = Math.max(0, m.capProg - 2);
    if (m.capProg === 0) m.capTo = -1;
    return;
  }
  if (m.capTo !== side) { m.capTo = side; m.capProg = 0; }
  m.capProg += CAP_RATE * Math.min(3, Math.abs(diff));
  if (m.capProg >= 100) {
    m.capProg = 0;
    m.capTo = -1;
    setStructSide(m, side);
    addRing(m.x, m.y, 20, CAP_RADIUS, 34, hexCss(SIDE_INFO[side].tint));
    toast(
      side === SIDE_P ? "Mine captured — income up, drop zone extended" : "The enemy has taken a mine",
      side === SIDE_P ? "#9ee37d" : "#ff8f6b",
    );
    for (const u of _units) if (u.goal === m) chooseGoal(u);
  }
}

function minesOwned(side) {
  let n = 0;
  for (const m of _mines) if (m.alive && m.side === side) n++;
  return n;
}

// ── Commanders, gold and the hand ─────────────────────────────────────────
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCommander(side) {
  const cycle = shuffled(CARDS.map((c) => c.id));
  const hand = cycle.splice(0, HAND_SIZE);
  return {
    side, gold: GOLD_START, cycle, hand,
    leaderCd: 0, leaderUnit: null, leaderKey: SIDE_INFO[side].leader,
    think: irand(90, 170), lane: 1, deployFlash: new Array(HAND_SIZE).fill(0),
  };
}

// A side with nothing left on the field musters faster, so losing one fight
// does not simply end the siege — you get one real chance to buy a defence.
function goldRate(side) {
  let base = GOLD_BASE + GOLD_PER_MINE * minesOwned(side);
  if (side === SIDE_E) base *= DIFFICULTIES[_difficulty].gold;
  return armySize(side) === 0 ? base * 2.1 : base;
}

function tickCommanders() {
  for (const cmd of _commanders) {
    if (!cmd) continue;
    cmd.gold = Math.min(GOLD_MAX, cmd.gold + goldRate(cmd.side) * DT);
    if (cmd.leaderCd > 0) cmd.leaderCd--;
    for (let i = 0; i < cmd.deployFlash.length; i++) if (cmd.deployFlash[i] > 0) cmd.deployFlash[i]--;
  }
  if (_commanders[SIDE_E]) aiThink(_commanders[SIDE_E]);
}

function canDeployAt(side, x, y) {
  if (x < 46 || x > MAP_W - 46 || y < 46 || y > MAP_H - 46) return false;
  for (const t of _terrain) {
    if (t.kind === "edge") continue;
    if (Math.abs(x - t.x) < t.w / 2 + 18 && Math.abs(y - t.y) < t.h / 2 + 18) return false;
  }
  for (const s of _structs) {
    if (!s.alive || s.side !== side) continue;
    if (Math.hypot(x - s.x, y - s.y) <= s.deployR) return true;
  }
  return false;
}

function deployReason(cmd, card) {
  if (armySize(cmd.side) >= ARMY_CAP && !card.spell) return "Army at full strength";
  if (cmd.gold < card.cost) return "Not enough gold";
  return null;
}

function placeSquad(side, card, x, y) {
  const n = card.count ?? 1;
  const spread = card.spread ?? 0;
  const base = side === SIDE_P ? 0 : Math.PI;
  for (let i = 0; i < n; i++) {
    let px = x, py = y;
    if (n > 1) {
      const a = base + (i - (n - 1) / 2) * (Math.PI / 3);
      px = x + Math.cos(a + Math.PI / 2) * spread;
      py = y + Math.sin(a + Math.PI / 2) * spread;
    }
    px = clamp(px, 40, MAP_W - 40);
    py = clamp(py, 40, MAP_H - 40);
    spawnUnit(side, card.unit, px, py, {});
  }
  addRing(x, y, 12, 54 + spread, 26, hexCss(SIDE_INFO[side].tint));
  for (let i = 0; i < 10; i++) addParticles(x, y, 6, 1, hexCss(SIDE_INFO[side].tint), 20, 120, 60);
}

function castSpell(side, card, x, y) {
  const sp = SPELLS[card.spell];
  _pendingSpells.push({ side, spell: card.spell, x, y, t: sp.delay, T: sp.delay });
}

function resolveSpell(ps) {
  const sp = SPELLS[ps.spell];
  splashDamage(ps.side, ps.x, ps.y, sp.radius, sp.dmg, {
    knock: sp.knock ?? 0, stun: sp.stun ?? 0, structMul: sp.structMul, owner: null,
  });
  addRing(ps.x, ps.y, 10, sp.radius, 26, sp.color);
  if (ps.spell === "volley") {
    for (let i = 0; i < 26; i++) {
      const a = rand(0, 6.28), d = rand(0, sp.radius);
      addParticles(ps.x + Math.cos(a) * d, ps.y + Math.sin(a) * d, 8, 1, sp.color, 10, 40, 10);
    }
  } else {
    addRing(ps.x, ps.y, sp.radius * 0.4, sp.radius * 1.15, 34, "#a8794a");
    shake(9, 0.45);
    for (let i = 0; i < 20; i++) {
      const a = rand(0, 6.28), d = rand(0, sp.radius);
      addParticles(ps.x + Math.cos(a) * d, ps.y + Math.sin(a) * d, 4, 1, "#c8a070", 40, 170, 90);
    }
  }
}

function tickSpells() {
  for (let i = _pendingSpells.length - 1; i >= 0; i--) {
    const ps = _pendingSpells[i];
    if (--ps.t <= 0) { resolveSpell(ps); _pendingSpells.splice(i, 1); }
  }
}

function playCard(cmd, slot, x, y) {
  const card = CARD_BY_ID[cmd.hand[slot]];
  if (!card) return false;
  if (deployReason(cmd, card)) return false;
  if (!card.spell && !canDeployAt(cmd.side, x, y)) return false;
  cmd.gold -= card.cost;
  if (card.spell) castSpell(cmd.side, card, x, y);
  else placeSquad(cmd.side, card, x, y);
  cmd.hand[slot] = cmd.cycle.shift();
  cmd.cycle.push(card.id);
  cmd.deployFlash[slot] = 18;
  return true;
}

function leaderReady(cmd) {
  return cmd.leaderKey && !cmd.leaderUnit && cmd.leaderCd <= 0 && armySize(cmd.side) < ARMY_CAP;
}

function playLeader(cmd, x, y) {
  if (!leaderReady(cmd) || !canDeployAt(cmd.side, x, y)) return false;
  const u = spawnUnit(cmd.side, cmd.leaderKey, x, y, {});
  cmd.leaderUnit = u;
  addRing(x, y, 14, 90, 32, hexCss(SIDE_INFO[cmd.side].tint));
  shake(5, 0.3);
  if (cmd.side === SIDE_P) toast("Thane Aldric takes the field", "#ffd97a");
  return true;
}

// ── The opposing commander ────────────────────────────────────────────────
function aiThink(cmd) {
  if (--cmd.think > 0) return;
  cmd.think = Math.max(8, Math.round(irand(22, 46) * DIFFICULTIES[_difficulty].think));
  const foe = 1 - cmd.side;

  // What is the player fielding right now?
  let flyers = 0, heavies = 0, siege = 0, foeCount = 0;
  for (const u of _units) {
    if (!u.alive || u.side !== foe) continue;
    foeCount++;
    if (u.def.flying) flyers++;
    if ((u.def.mass ?? 1) >= 3 || u.def.hp >= 600) heavies++;
    if (u.def.siege || (u.def.range ?? 0) >= 250) siege++;
  }
  let haveAntiAir = 0;
  for (const u of _units) if (u.alive && u.side === cmd.side && canHitAir(u)) haveAntiAir++;

  // The densest knot of player troops — a spell target if it is big enough.
  let clump = null, clumpN = 0;
  for (const u of _units) {
    if (!u.alive || u.side !== foe || u.def.flying) continue;
    let n = 0, cx = 0, cy = 0;
    for (const o of _units) {
      if (!o.alive || o.side !== foe) continue;
      if (Math.hypot(ux(o) - ux(u), uy(o) - uy(u)) > 110) continue;
      n++; cx += ux(o); cy += uy(o);
    }
    if (n > clumpN) { clumpN = n; clump = { x: cx / n, y: cy / n }; }
  }

  // Is anything of ours in danger?
  let threat = null, threatD = Infinity;
  for (const s of _structs) {
    if (!s.alive || s.side !== cmd.side) continue;
    for (const u of _units) {
      if (!u.alive || u.side !== foe || u.spawnT > 0) continue;
      const d = Math.hypot(ux(u) - s.x, uy(u) - s.y);
      if (d < 460 && d < threatD) { threatD = d; threat = { s, u, d }; }
    }
  }
  // A mine somebody else holds, or a neutral one worth clearing.
  let grab = null;
  for (const m of _mines) {
    if (!m.alive || m.side === cmd.side) continue;
    if (m.guarded && cmd.gold < 4) continue;
    const own = _units.some((u) => u.alive && u.side === cmd.side &&
      Math.hypot(ux(u) - m.x, uy(u) - m.y) < CAP_RADIUS + 70);
    if (!own) { grab = m; break; }
  }

  // Only a troop that has actually arrived counts as a threat: reacting to
  // anything within half the map keeps the commander permanently on the back
  // foot, never contesting a mine and never pushing.
  const urgent = !!threat && threatD < 300;
  const mode = urgent ? "defend"
    : grab ? "grab"
      : threat && threatD < 460 && Math.random() < 0.5 ? "defend"
        : "push";
  const focus = mode === "defend"
    ? { x: threat.s.x * 0.55 + ux(threat.u) * 0.45, y: threat.s.y * 0.55 + uy(threat.u) * 0.45 }
    : mode === "grab" ? { x: grab.x, y: grab.y }
      : aiPushFocus(cmd);
  if (!focus) return;

  // Hold gold unless something is urgent — a bank buys a real push.
  if (!urgent && cmd.gold < 5) return;

  if (leaderReady(cmd) && (mode !== "defend" || threatD < 360) && cmd.gold >= 3) {
    const p = aiDeployPoint(cmd.side, focus.x, focus.y);
    if (p && playLeader(cmd, p.x, p.y)) { cmd.think += 40; return; }
  }

  let bestSlot = -1, bestScore = 0, bestPoint = null;
  for (let i = 0; i < cmd.hand.length; i++) {
    const card = CARD_BY_ID[cmd.hand[i]];
    if (!card || cmd.gold < card.cost) continue;
    if (!card.spell && armySize(cmd.side) >= ARMY_CAP) continue;
    let score = mode === "defend" ? 1 : 0.9;
    let point = null;
    if (card.spell) {
      if (!clump || clumpN < (card.spell === "volley" ? 4 : 3)) continue;
      score = 0.5 + clumpN * 0.5;
      if (card.spell === "quake") score *= 0.9;
      point = clump;
    } else {
      const d = UNIT_DEFS[card.unit];
      if (d.flying) score *= haveAntiAir > 0 ? 0.8 : 1.2;
      if (d.canHitAir) score *= flyers >= 2 ? (haveAntiAir < 2 ? 3.2 : 1.4) : 0.9;
      if (d.speed >= 110) score *= siege >= 1 ? 2.4 : 1.05;
      if ((d.mass ?? 1) >= 3 && !d.siege) score *= mode === "push" ? 1.35 : 1.1;
      if (d.siege) score *= mode === "push" ? 1.4 : 0.35;
      if (d.suicide) score *= mode === "push" ? 1.2 : heavies >= 1 ? 1.3 : 0.6;
      if (d.support) score *= armySize(cmd.side) >= 5 ? 1.3 : 0.4;
      if (heavies >= 1 && (d.canHitAir || d.suicide)) score *= 1.3;
      if (foeCount === 0 && mode !== "push") score *= 0.5;
      point = aiDeployPoint(cmd.side, focus.x, focus.y);
    }
    if (!point) continue;
    score *= 0.75 + Math.random() * 0.5;
    if (score > bestScore) { bestScore = score; bestSlot = i; bestPoint = point; }
  }
  if (bestSlot < 0 || !bestPoint) return;
  const card = CARD_BY_ID[cmd.hand[bestSlot]];
  if (card.spell) {
    // Spells land anywhere, so no drop-zone check.
    cmd.gold -= card.cost;
    castSpell(cmd.side, card, bestPoint.x, bestPoint.y);
    cmd.hand[bestSlot] = cmd.cycle.shift();
    cmd.cycle.push(card.id);
  } else {
    playCard(cmd, bestSlot, bestPoint.x, bestPoint.y);
  }
  cmd.think += Math.round(16 * DIFFICULTIES[_difficulty].think);
}

function aiPushFocus(cmd) {
  // Push down whichever road the player is thinnest on, biased to the centre
  // once the player's watchtower is the last thing in the way.
  const lanes = [LANE_N, LANE_C, LANE_S];
  const load = [0, 0, 0];
  for (const u of _units) {
    if (!u.alive || u.side === cmd.side) continue;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < 3; i++) { const d = Math.abs(uy(u) - lanes[i]); if (d < bd) { bd = d; bi = i; } }
    load[bi]++;
  }
  let bi = 0;
  for (let i = 1; i < 3; i++) if (load[i] < load[bi]) bi = i;
  if (Math.random() < 0.35) bi = irand(0, 2);
  cmd.lane = bi;
  return { x: MAP_W * 0.55, y: lanes[bi] };
}

function aiDeployPoint(side, tx, ty) {
  let best = null, bd = Infinity;
  for (const s of _structs) {
    if (!s.alive || s.side !== side) continue;
    const d = Math.hypot(s.x - tx, s.y - ty);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best) return null;
  const a = Math.atan2(ty - best.y, tx - best.x);
  for (let i = 0; i < 10; i++) {
    const rr = Math.min(best.deployR - 30, Math.max(70, bd * 0.85)) * rand(0.55, 1);
    const aa = a + rand(-0.5, 0.5);
    const px = best.x + Math.cos(aa) * rr;
    const py = best.y + Math.sin(aa) * rr;
    if (canDeployAt(side, px, py)) return { x: px, y: py };
  }
  return canDeployAt(side, best.x + Math.cos(a) * 90, best.y + Math.sin(a) * 90)
    ? { x: best.x + Math.cos(a) * 90, y: best.y + Math.sin(a) * 90 } : null;
}

// ── Transient effects ─────────────────────────────────────────────────────
function addFloater(x, y, z, text, color, big) {
  if (_floaters.length > 60) _floaters.shift();
  _floaters.push({ x, y, z, text: String(text), color, t: 0, big: !!big });
}
function addRing(x, y, r, R, T, color) { _rings.push({ x, y, r, R, T, t: 0, color }); }
function addSwing(x, y, a, arc, r, color) { _swings.push({ x, y, a, arc, r, t: 0, T: 12, color }); }
function addParticles(x, y, z, n, color, vmin, vmax, vz) {
  for (let i = 0; i < n; i++) {
    if (_particles.length > 240) break;
    const a = rand(0, Math.PI * 2), sp = rand(vmin, vmax);
    _particles.push({
      x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(0, vz),
      r: rand(1.6, 3.6), color, t: 0, life: irand(20, 42),
    });
  }
}
function banner(text, sub, color) { _banner = { text, sub, color, t: BANNER_FRAMES }; }
function toast(text, color) { _toast = { text, color, t: 170 }; }

function tickEffects() {
  for (let i = _rings.length - 1; i >= 0; i--) if (++_rings[i].t >= _rings[i].T) _rings.splice(i, 1);
  for (let i = _swings.length - 1; i >= 0; i--) if (++_swings[i].t >= _swings[i].T) _swings.splice(i, 1);
  for (let i = _floaters.length - 1; i >= 0; i--) {
    const f = _floaters[i];
    f.t++; f.z += 0.9;
    if (f.t > 52) _floaters.splice(i, 1);
  }
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.t++;
    p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT;
    p.vz -= 640 * DT;
    p.vx *= 0.93; p.vy *= 0.93;
    if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
    if (p.t >= p.life) _particles.splice(i, 1);
  }
  for (let i = _corpses.length - 1; i >= 0; i--) {
    const c = _corpses[i];
    c.deadT += 0.016;
    if (c.deadT >= 1) _corpses.splice(i, 1);
  }
  if (_banner && --_banner.t <= 0) _banner = null;
  if (_toast && --_toast.t <= 0) _toast = null;
  if (_shakeT > 0) _shakeT--;
  if (_hintT > 0) _hintT--;
}

// ── Match lifecycle ───────────────────────────────────────────────────────
function clearWorld() {
  for (const p of _projs) killProjectile(p);
  _projs = [];
  for (const u of _units) removeUnit(u);
  for (const c of _corpses) removeUnit(c);
  for (const s of _structs) { if (s.body?.space) s.body.space = null; }
  for (const t of _terrain) { if (t.body?.space) t.body.space = null; }
  _units = []; _corpses = []; _structs = []; _terrain = []; _mines = [];
  _unitByBody = new Map();
  _structByBody = new Map();
  _rings = []; _particles = []; _floaters = []; _swings = []; _pendingSpells = [];
  _keepOf = [null, null];
  _towerOf = [null, null];
  _groundCache = null;
}

function startMatch() {
  clearWorld();
  _matchT = 0;
  _uid = 0;
  buildTerrain();
  buildStructures();
  _commanders = [makeCommander(SIDE_P), makeCommander(SIDE_E)];
  refreshShields();
  _selCard = -1;
  _camGoal = { x: 640, y: LANE_C };
  _camFocus = { x: 640, y: LANE_C };
  _zoom2d = 0.58;
  _camDist3d = 1350;
  _phase = "play";
  _banner = null;
  _hintT = 7 * 60;
  banner("Break the keep", "Their keep is shielded until the watchtower falls", "#ffd97a");
}

function stepWorld() {
  _frame++;
  if (_phase === "play") {
    _matchT++;
    if (_matchT === FINAL_PUSH_AT) {
      refreshShields();
      banner("Final push", "Shields fail, blows land harder, and both keeps start to crumble", "#ffcf6b");
    }
    tickCommanders();
    tickUnits();
    tickStructs();
    tickSiegeDecay();
    tickProjectiles();
    tickSpells();
  } else {
    tickProjectiles();
  }
  tickEffects();
  _hoverRoute = _phase === "play" && _selCard >= 0 && _hoverW.has && _hoverW.ok && !holdingSpell()
    ? previewRoute(_hoverW.x, _hoverW.y, heldCard())
    : null;
  handleCameraKeys();
  updateCamera();
}

// ── Camera ────────────────────────────────────────────────────────────────
const GROUND_Z = 1;
const PAN_SPEED = 10;

function is3d() { return _frame3d >= _frame - 2 && !!_camProj; }

/** Screen pixels per world pixel, near the focus point. */
function viewScale() {
  // The steeper the camera looks down, the closer the ground is to a plain
  // scaled top-down view, so the vertical extent stops foreshortening.
  if (is3d()) return VIEW_H / (2 * _camDist3d * 0.4142) * 0.78;
  return _zoom2d;
}

function handleCameraKeys() {
  let dx = 0, dy = 0;
  if (_keys.ArrowLeft || _keys.KeyA) dx -= 1;
  if (_keys.ArrowRight || _keys.KeyD) dx += 1;
  if (_keys.ArrowUp || _keys.KeyW) dy -= 1;
  if (_keys.ArrowDown || _keys.KeyS) dy += 1;
  if (!dx && !dy) return;
  const sp = PAN_SPEED / viewScale();
  const n = Math.hypot(dx, dy) || 1;
  panCamera((dx / n) * sp, (dy / n) * sp);
}

function panCamera(dx, dy) {
  _camGoal.x = clamp(_camGoal.x + dx, 120, MAP_W - 120);
  _camGoal.y = clamp(_camGoal.y + dy, 120, MAP_H - 120);
}

function lookAt(x, y, snap = false) {
  _camGoal.x = clamp(x, 120, MAP_W - 120);
  _camGoal.y = clamp(y, 120, MAP_H - 120);
  if (snap) { _camFocus.x = _camGoal.x; _camFocus.y = _camGoal.y; }
}

function updateCamera() {
  _camFocus.x += (_camGoal.x - _camFocus.x) * 0.17;
  _camFocus.y += (_camGoal.y - _camFocus.y) * 0.17;
}

function zoomBy(delta) {
  _zoom2d = clamp(_zoom2d * (delta > 0 ? 0.9 : 1.1), 0.34, 1.15);
  _camDist3d = clamp(_camDist3d * (delta > 0 ? 1.1 : 0.9), 700, 2100);
}

// ── Screen ⇄ world ────────────────────────────────────────────────────────
function screenToWorld(sx, sy) {
  if (is3d() && _THREE) {
    const v = new _THREE.Vector3((sx / VIEW_W) * 2 - 1, -(sy / VIEW_H) * 2 + 1, 0.5);
    v.unproject(_camProj);
    v.sub(_camProj.position).normalize();
    if (Math.abs(v.z) < 1e-5) return { x: _camFocus.x, y: _camFocus.y };
    const t = (GROUND_Z - _camProj.position.z) / v.z;
    return { x: _camProj.position.x + v.x * t, y: -(_camProj.position.y + v.y * t) };
  }
  return {
    x: (sx - VIEW_W / 2) / _zoom2d + _camFocus.x,
    y: (sy - VIEW_H / 2) / _zoom2d + _camFocus.y,
  };
}

function toScreen(x, y, z = 0) {
  if (is3d() && _THREE) {
    if (!_projV) _projV = new _THREE.Vector3();
    _projV.set(x, -y, z);
    const cx = _camProj.position.x - x, cy = _camProj.position.y + y, cz = _camProj.position.z - z;
    const d = Math.hypot(cx, cy, cz);
    _projV.project(_camProj);
    return {
      x: (_projV.x + 1) * 0.5 * VIEW_W, y: (1 - _projV.y) * 0.5 * VIEW_H,
      s: clamp(900 / Math.max(1, d), 0.35, 1.6), behind: _projV.z > 1,
    };
  }
  return {
    x: (x - _camFocus.x) * _zoom2d + VIEW_W / 2,
    y: (y - _camFocus.y) * _zoom2d + VIEW_H / 2 - z * 0.55 * _zoom2d,
    s: _zoom2d, behind: false,
  };
}

// ── HUD geometry (screen space, shared by input and drawing) ──────────────
const CARD_W = 92, CARD_H = 64, CARD_GAP = 8;
const CARD_Y = VIEW_H - 74;
const CARD_X0 = (VIEW_W - (HAND_SIZE * CARD_W + (HAND_SIZE - 1) * CARD_GAP)) / 2;
const LEADER_BTN = { x: CARD_X0 - 46, y: CARD_Y + CARD_H / 2, r: 30 };
const MINI = { x: VIEW_W - 176, y: VIEW_H - 100, w: 162, h: 81 };
const MINI_K = MINI.w / MAP_W;

/** The card the pointer is currently holding, or null for the commander. */
function heldCard() {
  if (_selCard < 0 || _selCard >= HAND_SIZE) return null;
  return CARD_BY_ID[_commanders[SIDE_P]?.hand[_selCard]] ?? null;
}
/** A spell lands anywhere on the map, so no drop zone is drawn for one. */
function holdingSpell() { return !!heldCard()?.spell; }

function cardRect(i) { return { x: CARD_X0 + i * (CARD_W + CARD_GAP), y: CARD_Y, w: CARD_W, h: CARD_H }; }
const DIFF_W = 126, DIFF_H = 32, DIFF_GAP = 10, DIFF_Y = 336;
function diffChipRect(i) {
  const total = DIFFICULTIES.length * DIFF_W + (DIFFICULTIES.length - 1) * DIFF_GAP;
  return { x: (VIEW_W - total) / 2 + i * (DIFF_W + DIFF_GAP), y: DIFF_Y, w: DIFF_W, h: DIFF_H };
}
function inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
function miniToWorld(sx, sy) {
  return { x: (sx - MINI.x) / MINI_K, y: (sy - MINI.y) / (MINI.h / MAP_H) };
}

function hudHit(sx, sy) {
  for (let i = 0; i < HAND_SIZE; i++) if (inRect(sx, sy, cardRect(i))) return { kind: "card", i };
  if (Math.hypot(sx - LEADER_BTN.x, sy - LEADER_BTN.y) <= LEADER_BTN.r) return { kind: "leader" };
  if (sx >= MINI.x - 6 && sx <= MINI.x + MINI.w + 6 && sy >= MINI.y - 6 && sy <= MINI.y + MINI.h + 6) {
    return { kind: "mini" };
  }
  return null;
}

// ── 2D world pass ─────────────────────────────────────────────────────────
const UNIT_GLYPH = {
  footman: "◬", archer: "➶", bat: "▲", rider: "➤", brute: "■",
  sapper: "●", warden: "✤", ballista: "✖", troll: "✦", thane: "★", emberfang: "★",
};

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// The grass and the road network never change, so they are painted once into
// an offscreen canvas at half resolution and blitted each frame.
let _groundCache = null;
function groundCanvas() {
  if (_groundCache) return _groundCache;
  const K = 0.5;
  const cv = document.createElement("canvas");
  cv.width = Math.round(MAP_W * K);
  cv.height = Math.round(MAP_H * K);
  const c = cv.getContext("2d");
  c.scale(K, K);
  c.fillStyle = "#2c3f2a";
  c.fillRect(0, 0, MAP_W, MAP_H);
  c.lineCap = "round";
  for (const pass of [{ w: 86, c: "#413b2e" }, { w: 74, c: "#4a4436" }, { w: 58, c: "#5c5341" }]) {
    c.strokeStyle = pass.c;
    c.lineWidth = pass.w;
    c.beginPath();
    for (const [a, b] of EDGES) {
      const na = NODES[NODE_IX[a]], nb = NODES[NODE_IX[b]];
      c.moveTo(na.x, na.y);
      c.lineTo(nb.x, nb.y);
    }
    c.stroke();
  }
  // Trodden earth under every building.
  for (const st of _structs) {
    const g = c.createRadialGradient(st.x, st.y, 8, st.x, st.y, st.r + 90);
    g.addColorStop(0, st.kind === "mine" ? "rgba(120,96,52,0.8)" : "rgba(92,82,66,0.75)");
    g.addColorStop(1, "rgba(92,82,66,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(st.x, st.y, st.r + 90, 0, Math.PI * 2); c.fill();
  }
  _groundCache = cv;
  return cv;
}

function drawGround2d(ctx) {
  ctx.drawImage(groundCanvas(), 0, 0, MAP_W, MAP_H);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeRect(0, 0, MAP_W, MAP_H);
}

function drawDeployZone2d(ctx) {
  if (_phase !== "play" || _selCard < 0 || holdingSpell()) return;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = SIDE_INFO[SIDE_P].css;
  for (const s of _structs) {
    if (!s.alive || s.side !== SIDE_P) continue;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.deployR, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(140,200,255,0.35)";
  ctx.lineWidth = 2;
  for (const s of _structs) {
    if (!s.alive || s.side !== SIDE_P) continue;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.deployR, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawRoute2d(ctx) {
  if (!_hoverRoute) return;
  const col = SIDE_INFO[SIDE_P].css;
  ctx.save();
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.8;
  for (const d of routeDots(_hoverRoute)) {
    ctx.beginPath(); ctx.arc(d.x, d.y, 5.5, 0, Math.PI * 2); ctx.fill();
  }
  const g = _hoverRoute.goal;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = col;
  ctx.lineWidth = 4;
  const rr = Math.max(g.w, g.h) * 0.62 + 14 + Math.sin(_frame * 0.12) * 5;
  ctx.beginPath(); ctx.arc(g.x, g.y, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawStructures2d(ctx) {
  for (const s of _structs) {
    const col = SIDE_INFO[s.side].css;
    if (!s.alive) {
      ctx.fillStyle = "rgba(60,54,48,0.85)";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.7, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.save();
    if (s.hitFlash > 0) ctx.globalAlpha = 0.75;
    if (s.kind === "keep") {
      ctx.fillStyle = "#5d5347";
      roundRect(ctx, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = col;
      roundRect(ctx, s.x - s.w / 2 + 12, s.y - s.h / 2 + 12, s.w - 24, 18, 4); ctx.fill();
    } else if (s.kind === "tower") {
      ctx.fillStyle = "#5d5347";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.stroke();
    } else {
      ctx.fillStyle = "#4e4535";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = "#e8c860";
      ctx.font = "bold 34px " + HUD_FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("◆", s.x, s.y + 1);
      ctx.strokeStyle = s.guarded ? "rgba(180,120,90,0.55)" : "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.arc(s.x, s.y, CAP_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (s.capTo >= 0 && s.capProg > 0) {
        ctx.strokeStyle = SIDE_INFO[s.capTo].css;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 12, -Math.PI / 2, -Math.PI / 2 + (s.capProg / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }
    if (s.shielded) {
      ctx.strokeStyle = "rgba(140,200,255,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(s.w, s.h) * 0.62, 0, Math.PI * 2); ctx.stroke();
    }
    if (s.range > 0 && s.side !== SIDE_N) {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawUnit2d(ctx, u) {
  const x = ux(u), y = uy(u), r = u.def.r;
  const info = SIDE_INFO[u.side];
  ctx.save();
  if (u.spawnT > 0) ctx.globalAlpha = 0.45;
  // Shadow.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 0.95, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  const cy = y - (u.def.flying ? 16 : 0);
  ctx.fillStyle = u.hitFlash > 0 ? "#ffffff" : hexCss(u.def.color);
  ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = u.def.leader ? 4 : 2.5;
  ctx.strokeStyle = info.css;
  ctx.stroke();
  if (u.healFlash > 0) {
    ctx.strokeStyle = "rgba(125,232,168,0.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, cy, r + 5, 0, Math.PI * 2); ctx.stroke();
  }
  const g = UNIT_GLYPH[u.key];
  if (g && _zoom2d * r > 7) {
    ctx.fillStyle = "rgba(18,20,24,0.82)";
    ctx.font = `bold ${Math.round(r * 1.25)}px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g, x, cy + 1);
  }
  // Facing tick.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(u.face) * r * 0.8, cy + Math.sin(u.face) * r * 0.8);
  ctx.lineTo(x + Math.cos(u.face) * (r + 6), cy + Math.sin(u.face) * (r + 6));
  ctx.stroke();
  if (u.hp < u.maxHp) {
    const bw = r * 2.4;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - bw / 2, cy - r - 9, bw, 4);
    ctx.fillStyle = u.side === SIDE_P ? "#6fe27a" : u.side === SIDE_E ? "#ff7a68" : "#d8c46a";
    ctx.fillRect(x - bw / 2, cy - r - 9, bw * clamp(u.hp / u.maxHp, 0, 1), 4);
  }
  ctx.restore();
}

function drawEffects2d(ctx) {
  for (const s of _swings) {
    const k = s.t / s.T;
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.lineWidth = 5 * (1 - k * 0.5);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (0.8 + k * 0.3), s.a - s.arc / 2, s.a + s.arc / 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const ps of _pendingSpells) {
    const sp = SPELLS[ps.spell];
    const k = 1 - ps.t / ps.T;
    ctx.strokeStyle = sp.color;
    ctx.globalAlpha = 0.35 + k * 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ps.x, ps.y, sp.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.12 + k * 0.2;
    ctx.fillStyle = sp.color;
    ctx.beginPath(); ctx.arc(ps.x, ps.y, sp.radius * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const r of _rings) {
    const k = r.t / r.T;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r, r.R, k), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of _projs) {
    if (!p.body) continue;
    const px = p.body.position.x, py = p.body.position.y;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    if (p.kind === "arrow" || p.kind === "bolt") {
      const L = p.kind === "bolt" ? 18 : 12;
      ctx.lineWidth = p.kind === "bolt" ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(p.angle) * L, py - Math.sin(p.angle) * L);
      ctx.lineTo(px + Math.cos(p.angle) * 4, py + Math.sin(p.angle) * 4);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const p of _particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y - p.z * 0.5, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const c of _corpses) {
    ctx.globalAlpha = 1 - c.deadT;
    ctx.fillStyle = hexCss(c.def.color);
    ctx.beginPath(); ctx.arc(c.deadX, c.deadY, c.def.r * (1 - c.deadT * 0.6), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGhost2d(ctx) {
  if (_phase !== "play" || _selCard < 0 || !_hoverW.has) return;
  const card = heldCard();
  const radius = card?.spell ? SPELLS[card.spell].radius : 46;
  const ok = card?.spell ? true : _hoverW.ok;
  ctx.strokeStyle = ok ? "rgba(150,230,255,0.9)" : "rgba(255,120,100,0.9)";
  ctx.fillStyle = ok ? "rgba(150,230,255,0.16)" : "rgba(255,120,100,0.14)";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(_hoverW.x, _hoverW.y, radius, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

// ── HUD ───────────────────────────────────────────────────────────────────
function drawBar(ctx, x, y, w, h, k, color, bg = "rgba(0,0,0,0.5)") {
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, Math.max(2, w * clamp(k, 0, 1)), h, h / 2); ctx.fill();
}

function drawKeepPanel(ctx, side, x, y, align) {
  const keep = _keepOf[side];
  const tower = _towerOf[side];
  const info = SIDE_INFO[side];
  const w = 246, h = 40;
  ctx.fillStyle = "rgba(12,16,22,0.78)";
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = info.css; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `bold 12px ${HUD_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  const tx = align === "left" ? x + 10 : x + w - 10;
  ctx.fillStyle = info.css;
  ctx.fillText(side === SIDE_E ? `${info.name} · ${DIFFICULTIES[_difficulty].name}` : info.name, tx, y + 12);
  ctx.font = `10px ${HUD_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const towerTxt = tower && tower.alive ? "tower up · keep shielded" : "tower down";
  ctx.fillText(keep && keep.alive ? towerTxt : "keep destroyed", tx, y + 29);
  const bw = 118;
  const bx = align === "left" ? x + w - bw - 10 : x + 10;
  if (keep) drawBar(ctx, bx, y + 7, bw, 8, keep.hp / keep.maxHp, side === SIDE_P ? "#6fe27a" : "#ff7a68");
  if (tower) drawBar(ctx, bx, y + 21, bw, 5, tower.alive ? tower.hp / tower.maxHp : 0, "#d8c46a");
}

function drawTopHud(ctx) {
  drawKeepPanel(ctx, SIDE_P, 12, 10, "left");
  drawKeepPanel(ctx, SIDE_E, VIEW_W - 258, 10, "right");
  // Clock and mine tally.
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(12,16,22,0.78)";
  roundRect(ctx, VIEW_W / 2 - 66, 10, 132, 40, 8); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = _matchT >= FINAL_PUSH_AT ? "#ffcf6b" : "#e6edf3";
  ctx.font = `bold 15px ${HUD_FONT}`;
  ctx.fillText(fmtTime(_matchT), VIEW_W / 2, 23);
  for (let i = 0; i < _mines.length; i++) {
    const m = _mines[i];
    const cx = VIEW_W / 2 - 22 + i * 44;
    ctx.fillStyle = m.alive ? SIDE_INFO[m.side].css : "#555";
    ctx.beginPath(); ctx.arc(cx, 38, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1d22";
    ctx.font = `bold 9px ${HUD_FONT}`;
    ctx.fillText("◆", cx, 39);
  }
}

function drawCards(ctx) {
  const cmd = _commanders[SIDE_P];
  if (!cmd) return;
  // Gold rail above the hand.
  const gx = CARD_X0, gw = HAND_SIZE * CARD_W + (HAND_SIZE - 1) * CARD_GAP;
  const gy = CARD_Y - 16;
  drawBar(ctx, gx, gy, gw, 9, cmd.gold / GOLD_MAX, "#ffd166", "rgba(0,0,0,0.62)");
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GOLD_MAX; i++) {
    const px = gx + (gw * i) / GOLD_MAX;
    ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + 9); ctx.stroke();
  }
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold 13px ${HUD_FONT}`;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(`${Math.floor(cmd.gold)}`, gx + gw + 8, gy + 5);
  ctx.font = `9px ${HUD_FONT}`;
  const mustering = armySize(SIDE_P) === 0;
  ctx.fillStyle = mustering ? "#9ee37d" : "rgba(255,255,255,0.45)";
  ctx.fillText(`+${goldRate(SIDE_P).toFixed(2)}/s${mustering ? " · mustering" : ""}`, gx + gw + 8, gy + 17);

  for (let i = 0; i < HAND_SIZE; i++) {
    const r = cardRect(i);
    const card = CARD_BY_ID[cmd.hand[i]];
    if (!card) continue;
    const afford = cmd.gold >= card.cost;
    const sel = _selCard === i;
    const pop = cmd.deployFlash[i] > 0 ? cmd.deployFlash[i] / 18 : 0;
    ctx.save();
    ctx.translate(0, -pop * 5);
    ctx.fillStyle = sel ? "rgba(36,52,72,0.95)" : "rgba(14,18,26,0.88)";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = sel ? "#8ecbff" : afford ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)";
    ctx.lineWidth = sel ? 2.5 : 1.2;
    ctx.stroke();
    ctx.globalAlpha = afford ? 1 : 0.42;
    const def = card.unit ? UNIT_DEFS[card.unit] : null;
    ctx.fillStyle = def ? hexCss(def.color) : SPELLS[card.spell].color;
    ctx.font = `bold 20px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(card.glyph, r.x + r.w / 2, r.y + 22);
    ctx.fillStyle = "#dbe4ee";
    ctx.font = `bold 10px ${HUD_FONT}`;
    ctx.fillText(card.name, r.x + r.w / 2, r.y + 43);
    if (card.count > 1) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `9px ${HUD_FONT}`;
      ctx.fillText(`×${card.count}`, r.x + r.w - 13, r.y + 12);
    }
    ctx.globalAlpha = 1;
    // Cost pill.
    ctx.fillStyle = afford ? "#ffd166" : "rgba(255,209,102,0.35)";
    roundRect(ctx, r.x + r.w / 2 - 13, r.y + r.h - 16, 26, 13, 6); ctx.fill();
    ctx.fillStyle = "#1a1d22";
    ctx.font = `bold 10px ${HUD_FONT}`;
    ctx.fillText(String(card.cost), r.x + r.w / 2, r.y + r.h - 9);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `9px ${HUD_FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1), r.x + 6, r.y + 11);
    ctx.restore();
  }

  // Commander button.
  const b = LEADER_BTN;
  const ready = leaderReady(cmd);
  ctx.fillStyle = _selCard === HAND_SIZE ? "rgba(36,52,72,0.95)" : "rgba(14,18,26,0.9)";
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = _selCard === HAND_SIZE ? "#8ecbff" : ready ? "#ffd97a" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = _selCard === HAND_SIZE ? 2.5 : 1.6;
  ctx.stroke();
  ctx.fillStyle = ready ? "#ffd97a" : "rgba(255,255,255,0.3)";
  ctx.font = `bold 22px ${HUD_FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("★", b.x, b.y - 4);
  ctx.font = `8px ${HUD_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(cmd.leaderUnit ? "AFIELD" : ready ? "FREE" : fmtTime(cmd.leaderCd), b.x, b.y + 13);
  if (!ready && cmd.leaderCd > 0) {
    ctx.strokeStyle = "rgba(255,217,122,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r - 2, -Math.PI / 2,
      -Math.PI / 2 + (1 - cmd.leaderCd / LEADER_COOLDOWN) * Math.PI * 2);
    ctx.stroke();
  }

  // Tip line for the selected card.
  if (_selCard >= 0) {
    const card = heldCard();
    const tip = card
      ? (card.spell ? SPELLS[card.spell].tip : UNIT_DEFS[card.unit].tip)
      : UNIT_DEFS[cmd.leaderKey].tip;
    ctx.fillStyle = "rgba(10,14,20,0.8)";
    ctx.font = `11px ${HUD_FONT}`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(tip).width + 20;
    roundRect(ctx, VIEW_W / 2 - tw / 2, CARD_Y - 40, tw, 19, 6); ctx.fill();
    ctx.fillStyle = "#cfe0f0";
    ctx.fillText(tip, VIEW_W / 2, CARD_Y - 30);
  }
}

function drawMinimap(ctx) {
  const ky = MINI.h / MAP_H;
  ctx.fillStyle = "rgba(10,14,18,0.82)";
  roundRect(ctx, MINI.x - 5, MINI.y - 5, MINI.w + 10, MINI.h + 10, 7); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#25331f";
  ctx.fillRect(MINI.x, MINI.y, MINI.w, MINI.h);
  ctx.strokeStyle = "rgba(120,110,80,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [a, b] of EDGES) {
    const na = NODES[NODE_IX[a]], nb = NODES[NODE_IX[b]];
    ctx.moveTo(MINI.x + na.x * MINI_K, MINI.y + na.y * ky);
    ctx.lineTo(MINI.x + nb.x * MINI_K, MINI.y + nb.y * ky);
  }
  ctx.stroke();
  for (const s of _structs) {
    if (!s.alive) continue;
    const px = MINI.x + s.x * MINI_K, py = MINI.y + s.y * ky;
    ctx.fillStyle = SIDE_INFO[s.side].css;
    const sz = s.kind === "keep" ? 8 : s.kind === "tower" ? 6 : 5;
    ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
  }
  for (const u of _units) {
    if (!u.alive) continue;
    ctx.fillStyle = SIDE_INFO[u.side].css;
    ctx.fillRect(MINI.x + ux(u) * MINI_K - 1.2, MINI.y + uy(u) * ky - 1.2, 2.4, 2.4);
  }
  // Viewport box.
  const vs = viewScale();
  const vw = (VIEW_W / vs) * MINI_K, vh = (VIEW_H / vs) * ky;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(MINI.x + _camFocus.x * MINI_K - vw / 2, MINI.y + _camFocus.y * ky - vh / 2, vw, vh);
}

function drawWorldCues(ctx) {
  // Building name plates and health.
  for (const s of _structs) {
    if (!s.alive) continue;
    const top = s.kind === "keep" ? 150 : s.kind === "tower" ? 120 : 60;
    const p = toScreen(s.x, s.y, top);
    if (p.behind || p.x < -90 || p.x > VIEW_W + 90 || p.y < -40 || p.y > VIEW_H + 40) continue;
    const info = SIDE_INFO[s.side];
    if (s.kind !== "mine") {
      const bw = 54 * p.s;
      drawBar(ctx, p.x - bw / 2, p.y, bw, 5 * p.s, s.hp / s.maxHp, info.css);
      if (s.shielded) {
        ctx.fillStyle = "#8ecbff";
        ctx.font = `bold ${Math.round(10 * p.s)}px ${HUD_FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⛨", p.x, p.y - 10 * p.s);
      }
    } else {
      ctx.fillStyle = s.guarded ? "#d8a05a" : info.css;
      ctx.font = `bold ${Math.round(10 * p.s)}px ${HUD_FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.guarded ? "GUARDED" : s.side === SIDE_N ? "UNCLAIMED" : info.name, p.x, p.y);
      if (s.capTo >= 0 && s.capProg > 0) {
        drawBar(ctx, p.x - 30 * p.s, p.y + 10 * p.s, 60 * p.s, 5 * p.s,
          s.capProg / 100, SIDE_INFO[s.capTo].css);
      }
    }
  }
  if (!is3d()) return;
  for (const u of _units) {
    if (!u.alive || u.hp >= u.maxHp) continue;
    const p = toScreen(ux(u), uy(u), u.z + u.def.r * 2.4 + 10);
    if (p.behind || p.x < -40 || p.x > VIEW_W + 40 || p.y < -20 || p.y > VIEW_H + 20) continue;
    const bw = 26 * p.s;
    drawBar(ctx, p.x - bw / 2, p.y, bw, 3.4 * p.s, u.hp / u.maxHp,
      u.side === SIDE_P ? "#6fe27a" : u.side === SIDE_E ? "#ff7a68" : "#d8c46a");
  }
}

function drawFloaters(ctx) {
  for (const f of _floaters) {
    const k = f.t / 52;
    const p = toScreen(f.x, f.y, f.z);
    if (p.behind || p.x < -60 || p.x > VIEW_W + 60 || p.y < -30 || p.y > VIEW_H + 30) continue;
    ctx.save();
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.font = `bold ${Math.round((f.big ? 17 : 12) * Math.max(0.8, p.s))}px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(f.text, p.x, p.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, p.x, p.y);
    ctx.restore();
  }
}

// "Shield Guards → watchtower", pinned over the cursor, so the answer to
// "where will this lot go" is readable before the gold is spent.
function drawRouteLabel(ctx) {
  if (!_hoverRoute || _selCard < 0) return;
  const p = toScreen(_hoverW.x, _hoverW.y, 46);
  if (p.behind) return;
  const card = heldCard();
  const name = card ? card.name : UNIT_DEFS[_commanders[SIDE_P].leaderKey].name;
  const text = `${name}  →  ${structLabel(_hoverRoute.goal)}`;
  ctx.save();
  ctx.font = `bold 11px ${HUD_FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 20;
  const x = clamp(p.x, w / 2 + 6, VIEW_W - w / 2 - 6);
  const y = clamp(p.y - 14, 70, CARD_Y - 54);
  ctx.fillStyle = "rgba(8,12,18,0.86)";
  roundRect(ctx, x - w / 2, y - 10, w, 20, 6); ctx.fill();
  ctx.strokeStyle = SIDE_INFO[SIDE_P].css;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#dbe9f7";
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawBanners(ctx) {
  if (_toast) {
    const k = Math.min(1, _toast.t / 22);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(_toast.text).width + 26;
    ctx.fillStyle = "rgba(10,14,20,0.85)";
    roundRect(ctx, VIEW_W / 2 - w / 2, 60, w, 26, 7); ctx.fill();
    ctx.fillStyle = _toast.color;
    ctx.fillText(_toast.text, VIEW_W / 2, 74);
    ctx.restore();
  }
  if (_banner) {
    const k = 1 - _banner.t / BANNER_FRAMES;
    const a = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(8,11,16,0.72)";
    ctx.fillRect(0, VIEW_H / 2 - 56, VIEW_W, 92);
    ctx.fillStyle = _banner.color;
    ctx.font = `bold 30px ${HUD_FONT}`;
    ctx.fillText(_banner.text, VIEW_W / 2, VIEW_H / 2 - 22);
    ctx.fillStyle = "rgba(230,237,243,0.8)";
    ctx.font = `13px ${HUD_FONT}`;
    ctx.fillText(_banner.sub, VIEW_W / 2, VIEW_H / 2 + 10);
    ctx.restore();
  }
}

function drawHint(ctx) {
  if (_hintT <= 0 || _selCard >= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, _hintT / 50);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(10,14,20,0.8)";
  const msg = _isTouch
    ? "Tap a card, then tap the glowing ground. Drag to pan."
    : "Pick a card (1–5), then click the glowing ground. Drag or WASD to pan, wheel to zoom.";
  ctx.font = `12px ${HUD_FONT}`;
  const w = ctx.measureText(msg).width + 26;
  roundRect(ctx, VIEW_W / 2 - w / 2, VIEW_H - 132, w, 24, 7); ctx.fill();
  ctx.fillStyle = "#cfe0f0";
  ctx.fillText(msg, VIEW_W / 2, VIEW_H - 120);
  ctx.restore();
}

function drawTitle(ctx) {
  // A veil rather than a curtain: the battlefield behind the title is the
  // best advertisement the demo has, and it is also what the poster captures.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(8,11,16,0.82)");
  g.addColorStop(0.62, "rgba(8,11,16,0.74)");
  g.addColorStop(1, "rgba(8,11,16,0.5)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd97a";
  ctx.font = `bold 46px ${HUD_FONT}`;
  ctx.fillText("TIN LEGION", VIEW_W / 2, 108);
  ctx.fillStyle = "rgba(230,237,243,0.85)";
  ctx.font = `14px ${HUD_FONT}`;
  ctx.fillText("Field an army of figurines and break the enemy keep.", VIEW_W / 2, 146);
  const lines = [
    ["Gold", "trickles in and caps at 12. Every card costs gold; spend it or bank it."],
    ["Hand", "five cards from a rolling deck — click one, then click the glowing ground."],
    ["Mines", "on the north and south roads pay gold and push your drop zone forward."],
    ["Keeps", "are shielded until the matching watchtower falls. Break the centre first."],
    ["Commander", "is free but slow to return. His banner makes nearby troops hit harder."],
  ];
  let y = 196;
  for (const [k, v] of lines) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#8ecbff";
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillText(k, VIEW_W / 2 - 96, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(230,237,243,0.75)";
    ctx.font = `12px ${HUD_FONT}`;
    ctx.fillText(v, VIEW_W / 2 - 86, y);
    y += 26;
  }
  // Difficulty — the only thing it changes is the enemy commander's purse
  // and how fast it reacts; the deck and the map are the same either way.
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `10px ${HUD_FONT}`;
  ctx.fillText("OPPOSING COMMANDER — press 1 / 2 / 3", VIEW_W / 2, DIFF_Y - 14);
  for (let i = 0; i < DIFFICULTIES.length; i++) {
    const r = diffChipRect(i);
    const on = i === _difficulty;
    ctx.fillStyle = on ? "rgba(40,60,84,0.95)" : "rgba(16,22,30,0.9)";
    roundRect(ctx, r.x, r.y, r.w, r.h, 7); ctx.fill();
    ctx.strokeStyle = on ? "#8ecbff" : "rgba(255,255,255,0.16)";
    ctx.lineWidth = on ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = on ? "#dbe9f7" : "rgba(255,255,255,0.45)";
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillText(DIFFICULTIES[i].name, r.x + r.w / 2, r.y + r.h / 2 + 1);
  }
  ctx.fillStyle = "rgba(230,237,243,0.7)";
  ctx.font = `11px ${HUD_FONT}`;
  ctx.fillText(DIFFICULTIES[_difficulty].note, VIEW_W / 2, DIFF_Y + DIFF_H + 16);

  ctx.fillStyle = Math.floor(_frame / 26) % 2 ? "#ffffff" : "#ffd97a";
  ctx.font = `bold 16px ${HUD_FONT}`;
  ctx.fillText("Click  ·  SPACE  ·  ENTER   to take the field", VIEW_W / 2, VIEW_H - 62);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `11px ${HUD_FONT}`;
  ctx.fillText("WASD / arrows pan · wheel zooms · click the minimap to jump", VIEW_W / 2, VIEW_H - 34);
}

function drawResult(ctx) {
  const won = _phase === "win";
  ctx.fillStyle = "rgba(8,11,16,0.82)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = won ? "#9ee37d" : "#ff8f6b";
  ctx.font = `bold 42px ${HUD_FONT}`;
  ctx.fillText(won ? "KEEP BROKEN" : "YOUR KEEP HAS FALLEN", VIEW_W / 2, 176);
  ctx.fillStyle = "rgba(230,237,243,0.85)";
  ctx.font = `15px ${HUD_FONT}`;
  ctx.fillText(
    won ? `The Ashen Pact banner is down after ${fmtTime(_matchT)}.`
      : `Bannerhold held for ${fmtTime(_matchT)}.`,
    VIEW_W / 2, 220,
  );
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `12px ${HUD_FONT}`;
  ctx.fillText(`Mines held at the end — you ${minesOwned(SIDE_P)} · them ${minesOwned(SIDE_E)}`, VIEW_W / 2, 250);
  if (_frame >= _lockUntil) {
    ctx.fillStyle = Math.floor(_frame / 26) % 2 ? "#ffffff" : "#ffd97a";
    ctx.font = `bold 16px ${HUD_FONT}`;
    ctx.fillText("Click  ·  SPACE   to fight again", VIEW_W / 2, 312);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `11px ${HUD_FONT}`;
    ctx.fillText(`Opposing commander: ${DIFFICULTIES[_difficulty].name} — press 1 / 2 / 3 to change it`, VIEW_W / 2, 340);
  }
}

function drawOverlay(ctx) {
  if (_phase === "title") { drawTitle(ctx); return; }
  drawWorldCues(ctx);
  drawFloaters(ctx);
  drawTopHud(ctx);
  drawCards(ctx);
  drawMinimap(ctx);
  drawRouteLabel(ctx);
  drawHint(ctx);
  drawBanners(ctx);
  if (_phase === "win" || _phase === "lose") drawResult(ctx);
}

// ── 3D: shared helpers ────────────────────────────────────────────────────
function lam(color, extra = {}) {
  return new _THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
}
function box3(w, d, h, material) {
  return new _THREE.Mesh(new _THREE.BoxGeometry(w, d, h), material);
}
function rest(obj) {
  obj.userData.rest = {
    rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
    px: obj.position.x, py: obj.position.y, pz: obj.position.z,
    sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z,
  };
  return obj;
}
function resetJoints(f) {
  for (const j of f.parts.joints) {
    const r = j.userData.rest;
    j.rotation.set(r.rx, r.ry, r.rz);
    j.position.set(r.px, r.py, r.pz);
    j.scale.set(r.sx, r.sy, r.sz);
  }
}
function darken(hex, k) {
  const r = Math.round(((hex >> 16) & 0xff) * k);
  const g = Math.round(((hex >> 8) & 0xff) * k);
  const b = Math.round((hex & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

function ensureScene(adapter, scene) {
  if (_scene3d === scene) return;
  _scene3d = scene;
  _env = null;
  _figs = new Map();
  _figPool = new Map();
  _shadows = new Map();
  _bldMeshes = new Map();
  _fxPools = { swing: [], ring: [], part: [], proj: [], zone: [], ghost: null, cap: [], route: [], dest: null };
  _projV = null;
  _sharedGeo = {
    sector: new _THREE.RingGeometry(0.62, 1, 26, 1, -1, 2),
    ring: new _THREE.RingGeometry(0.88, 1, 44),
    disc: new _THREE.CircleGeometry(1, 32),
    sphere: new _THREE.SphereGeometry(1, 7, 5),
    shadow: new _THREE.CircleGeometry(1, 18),
  };
  scene.background = new _THREE.Color(0x8fb4d8);
  // The adapter's helper grid sits under the board and is not wanted here.
  for (const c of scene.children) if (c.isLineSegments) c.visible = false;
  void adapter;
}

// ── 3D: ground texture ────────────────────────────────────────────────────
function makeFieldTexture() {
  const S = 2048, SH = 1024;
  const k = S / MAP_W;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = SH;
  const c = cv.getContext("2d");
  const rnd = srand(9317);
  c.fillStyle = "#41632f";
  c.fillRect(0, 0, S, SH);
  // Grass mottling.
  for (let i = 0; i < 2600; i++) {
    const shade = rnd();
    c.fillStyle = shade > 0.72 ? "rgba(255,255,255,0.05)"
      : shade > 0.45 ? "rgba(0,0,0,0.07)" : "rgba(120,160,80,0.12)";
    const r = 6 + rnd() * 34;
    c.beginPath();
    c.ellipse(rnd() * S, rnd() * SH, r, r * 0.62, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
  // Roads.
  c.lineCap = "round";
  for (const pass of [{ w: 92, c: "#4c4232" }, { w: 74, c: "#5e5341" }, { w: 58, c: "#6a5e48" }]) {
    c.strokeStyle = pass.c;
    c.lineWidth = pass.w * k;
    c.beginPath();
    for (const [a, b] of EDGES) {
      const na = NODES[NODE_IX[a]], nb = NODES[NODE_IX[b]];
      c.moveTo(na.x * k, na.y * k);
      c.lineTo(nb.x * k, nb.y * k);
    }
    c.stroke();
  }
  // Wheel ruts and scuffs on the roads.
  for (const [a, b] of EDGES) {
    const na = NODES[NODE_IX[a]], nb = NODES[NODE_IX[b]];
    for (let i = 0; i < 26; i++) {
      const t = rnd();
      const x = lerp(na.x, nb.x, t) * k + rnd() * 40 - 20;
      const y = lerp(na.y, nb.y, t) * k + rnd() * 40 - 20;
      c.fillStyle = rnd() > 0.5 ? "rgba(0,0,0,0.10)" : "rgba(255,240,200,0.06)";
      c.beginPath(); c.ellipse(x, y, 6 + rnd() * 16, 3 + rnd() * 7, rnd() * 3, 0, Math.PI * 2); c.fill();
    }
  }
  // Trodden earth around every building, and gold spoil at the mines.
  for (const s of _structs) {
    const g = c.createRadialGradient(s.x * k, s.y * k, 10, s.x * k, s.y * k, (s.r + 96) * k);
    g.addColorStop(0, s.kind === "mine" ? "rgba(120,96,52,0.85)" : "rgba(92,82,66,0.8)");
    g.addColorStop(1, "rgba(92,82,66,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(s.x * k, s.y * k, (s.r + 96) * k, 0, Math.PI * 2); c.fill();
  }
  // Scrub along the rock ridges.
  for (const row of RIDGE_ROWS) {
    for (const [x0, x1] of row.spans) {
      for (let i = 0; i < 60; i++) {
        const x = lerp(x0, x1, rnd()) * k;
        const y = (row.y + rnd() * 90 - 45) * k;
        c.fillStyle = rnd() > 0.5 ? "rgba(60,54,44,0.35)" : "rgba(70,84,50,0.35)";
        c.beginPath(); c.ellipse(x, y, 8 + rnd() * 18, 5 + rnd() * 9, rnd() * 3, 0, Math.PI * 2); c.fill();
      }
    }
  }
  // Wild flowers.
  for (let i = 0; i < 420; i++) {
    c.fillStyle = ["#e8d86a", "#f4f0e8", "#d98ac0", "#c8e0f0"][Math.floor(rnd() * 4)];
    c.fillRect(rnd() * S, rnd() * SH, 3, 3);
  }
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  return tex;
}

function makeSkyTexture() {
  const cv = document.createElement("canvas");
  cv.width = 4; cv.height = 256;
  const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#22407a");
  g.addColorStop(0.38, "#5b8fc9");
  g.addColorStop(0.5, "#a9c6e2");
  g.addColorStop(0.58, "#e8cba4");
  g.addColorStop(1, "#c08a62");
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 256);
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  return tex;
}

// ── 3D: environment ───────────────────────────────────────────────────────
function ensureEnvironment(adapter) {
  if (_env) return;
  const T = _THREE;
  const env = { all: [], clouds: [], fires: [], sky: null, trees: [] };
  const add = (m) => { adapter.addSceneMesh(m); env.all.push(m); return m; };
  const rnd = srand(20260911);

  const sky = new T.Mesh(
    new T.SphereGeometry(5200, 24, 12),
    new T.MeshBasicMaterial({ map: makeSkyTexture(), side: T.BackSide, depthWrite: false }),
  );
  sky.rotation.x = Math.PI / 2;
  sky.renderOrder = -30;
  add(sky);
  env.sky = sky;

  // The battlefield itself: one painted plate.
  const field = new T.Mesh(
    new T.PlaneGeometry(MAP_W, MAP_H),
    new T.MeshLambertMaterial({ map: makeFieldTexture() }),
  );
  field.position.set(MAP_W / 2, -MAP_H / 2, GROUND_Z);
  add(field);

  // A rock plinth under the plate, so the field reads as a plateau in mist.
  const rockMat = lam(0x6b6258);
  const rockDark = lam(0x4a443c);
  const plinth = box3(MAP_W + 60, MAP_H + 60, 240, rockDark);
  plinth.position.set(MAP_W / 2, -MAP_H / 2, GROUND_Z - 122);
  add(plinth);
  for (let i = 0; i < 54; i++) {
    // Broken cliff edge — slabs hung around the rim.
    const edge = Math.floor(rnd() * 4);
    let x, y;
    if (edge === 0) { x = rnd() * MAP_W; y = 0; }
    else if (edge === 1) { x = rnd() * MAP_W; y = MAP_H; }
    else if (edge === 2) { x = 0; y = rnd() * MAP_H; }
    else { x = MAP_W; y = rnd() * MAP_H; }
    const s = 40 + rnd() * 110;
    const slab = new T.Mesh(new T.IcosahedronGeometry(s, 0), rnd() > 0.5 ? rockMat : rockDark);
    slab.position.set(x + rnd() * 60 - 30, -y + rnd() * 60 - 30, GROUND_Z - 40 - rnd() * 180);
    slab.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    slab.scale.set(1, 1, 0.8 + rnd() * 0.8);
    add(slab);
  }
  // Mist ring under the plateau.
  const mist = new T.Mesh(
    new T.CircleGeometry(4200, 40),
    new T.MeshBasicMaterial({ color: 0xcfd9e6, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  mist.position.set(MAP_W / 2, -MAP_H / 2, GROUND_Z - 330);
  add(mist);

  // Ridges: every static rock body gets a run of boulders.
  for (const t of _terrain) {
    if (t.kind !== "ridge") continue;
    // Boulders are kept inside the static box's footprint. Bigger, prettier
    // rocks spilled a good 25 px past the collision edge, so troops walking
    // the road looked buried in stone they could not actually touch.
    const n = Math.max(4, Math.round(t.w / 56));
    const halfY = t.h / 2;
    for (let i = 0; i < n; i++) {
      const px = t.x - t.w / 2 + ((i + 0.5) / n) * t.w + rnd() * 14 - 7;
      const py = t.y + rnd() * 14 - 7;
      const s = 23 + rnd() * 15;
      const rock = new T.Mesh(new T.IcosahedronGeometry(s, 0), rnd() > 0.4 ? rockMat : rockDark);
      const sy = Math.min(0.8, (halfY - 7) / s);
      rock.position.set(px, -py, GROUND_Z + s * 0.5);
      rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      rock.scale.set(0.95, sy, 1.02);
      add(rock);
      if (rnd() > 0.7) {
        const cap = new T.Mesh(new T.IcosahedronGeometry(s * 0.5, 0), rockDark);
        cap.position.set(px + rnd() * 12 - 6, -(py + rnd() * 10 - 5), GROUND_Z + s * 0.82);
        cap.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        cap.scale.set(1, 0.8, 0.8);
        add(cap);
      }
    }
  }

  // Tree lines in the green, well clear of the roads and the drop zones.
  const trunkMat = lam(0x53392a);
  const leafMats = [lam(0x2f6b3a), lam(0x3c7f44), lam(0x27583a), lam(0x497f3a)];
  const roadClear = (x, y) => {
    for (const [a, b] of EDGES) {
      const na = NODES[NODE_IX[a]], nb = NODES[NODE_IX[b]];
      const vx = nb.x - na.x, vy = nb.y - na.y;
      const L2 = vx * vx + vy * vy;
      const t = clamp(((x - na.x) * vx + (y - na.y) * vy) / L2, 0, 1);
      if (Math.hypot(x - (na.x + vx * t), y - (na.y + vy * t)) < 92) return false;
    }
    for (const s of _structs) if (Math.hypot(x - s.x, y - s.y) < s.r + 110) return false;
    for (const t of _terrain) {
      if (t.kind === "edge") continue;
      if (Math.abs(x - t.x) < t.w / 2 + 40 && Math.abs(y - t.y) < t.h / 2 + 40) return false;
    }
    return true;
  };
  let placed = 0, tries = 0;
  while (placed < 104 && tries < 3000) {
    tries++;
    const x = rnd() * MAP_W, y = rnd() * MAP_H;
    if (!roadClear(x, y)) continue;
    placed++;
    const h = 58 + rnd() * 62;
    const trunk = new T.Mesh(new T.CylinderGeometry(4, 6.5, h * 0.46, 6), trunkMat);
    trunk.rotation.x = Math.PI / 2;
    trunk.position.set(x, -y, GROUND_Z + h * 0.23);
    add(trunk);
    const mat = leafMats[Math.floor(rnd() * leafMats.length)];
    const c1 = new T.Mesh(new T.ConeGeometry(h * 0.33, h * 0.56, 7), mat);
    c1.rotation.x = Math.PI / 2;
    c1.position.set(x, -y, GROUND_Z + h * 0.58);
    add(c1);
    const c2 = new T.Mesh(new T.ConeGeometry(h * 0.22, h * 0.44, 7), mat);
    c2.rotation.x = Math.PI / 2;
    c2.position.set(x, -y, GROUND_Z + h * 0.9);
    add(c2);
  }
  // Loose boulders and stumps for texture.
  for (let i = 0; i < 42; i++) {
    const x = rnd() * MAP_W, y = rnd() * MAP_H;
    if (!roadClear(x, y)) continue;
    const s = 8 + rnd() * 16;
    const rock = new T.Mesh(new T.IcosahedronGeometry(s, 0), rockMat);
    rock.position.set(x, -y, GROUND_Z + s * 0.4);
    rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    rock.scale.set(1, 1, 0.6);
    add(rock);
  }

  // Distant hills and peaks beyond the mist.
  const hillMat = lam(0x46603e);
  const mtnMats = [lam(0x5a6a8e), lam(0x66789e), lam(0x4e5e80)];
  for (let i = 0; i < 17; i++) {
    const a = (i / 17) * Math.PI * 2 + rnd() * 0.2;
    const r = 2300 + rnd() * 500;
    const h = 200 + rnd() * 240;
    const hill = new T.Mesh(new T.ConeGeometry(300 + rnd() * 220, h, 8), hillMat);
    hill.rotation.x = Math.PI / 2;
    hill.position.set(MAP_W / 2 + Math.cos(a) * r, -MAP_H / 2 + Math.sin(a) * r, GROUND_Z - 240 + h / 2);
    add(hill);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rnd() * 0.2;
    const r = 3200 + rnd() * 700;
    const h = 520 + rnd() * 560;
    const rr = 380 + rnd() * 300;
    const m = new T.Mesh(new T.ConeGeometry(rr, h, 6), mtnMats[i % 3]);
    m.rotation.set(Math.PI / 2, 0, rnd() * 3);
    m.position.set(MAP_W / 2 + Math.cos(a) * r, -MAP_H / 2 + Math.sin(a) * r, GROUND_Z - 300 + h / 2);
    add(m);
    const cap = new T.Mesh(new T.ConeGeometry(rr * 0.3, h * 0.3, 6), lam(0xe8eef8));
    cap.rotation.copy(m.rotation);
    cap.position.set(m.position.x, m.position.y, GROUND_Z - 300 + h - h * 0.15);
    add(cap);
  }
  // Clouds.
  const cloudMat = new T.MeshLambertMaterial({ color: 0xf7f4f0, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 10; i++) {
    const g = new T.Group();
    const a = rnd() * Math.PI * 2, r = 900 + rnd() * 2000;
    g.position.set(MAP_W / 2 + Math.cos(a) * r, -MAP_H / 2 + Math.sin(a) * r, 560 + rnd() * 320);
    for (let j = 0; j < 4; j++) {
      const s = 44 + rnd() * 56;
      const b = new T.Mesh(new T.IcosahedronGeometry(s, 0), cloudMat);
      b.position.set((j - 1.5) * s * 1.05, rnd() * 26, rnd() * 12);
      b.scale.set(1, 0.9, 0.4);
      g.add(b);
    }
    add(g);
    env.clouds.push({ g, speed: 0.06 + rnd() * 0.1 });
  }
  const sun = new T.Mesh(new T.SphereGeometry(120, 12, 8), new T.MeshBasicMaterial({ color: 0xfff4d0 }));
  sun.position.set(-1800, 2400, 1500);
  add(sun);
  // The strategy camera always looks north, so the faces that matter are the
  // ones pointing at it. A key light from behind the camera keeps the keeps
  // and towers lit; without it every wall falls back to the hemisphere's
  // ground colour and the buildings read as black cut-outs.
  add(new T.HemisphereLight(0xc6dcff, 0x6a7255, 0.72));
  const key = new T.DirectionalLight(0xfff2d8, 1.05);
  key.position.set(-900, -1700, 1500);
  add(key);
  add(new T.AmbientLight(0xffffff, 0.3));
  const rim = new T.DirectionalLight(0xd8e6ff, 0.45);
  rim.position.set(1400, 1500, 900);
  add(rim);

  // Neutral camps: tents and a fire beside each mine.
  const canvasMat = lam(0x9a8a6a);
  const woodMat = lam(0x5a4632);
  for (const m of _mines) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.6;
      const tx = m.x + Math.cos(a) * 150, ty = m.y + Math.sin(a) * 150;
      const tent = new T.Mesh(new T.ConeGeometry(26, 40, 4), canvasMat);
      tent.rotation.set(Math.PI / 2, 0, rnd() * 3);
      tent.position.set(tx, -ty, GROUND_Z + 20);
      add(tent);
      const pole = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 52, 5), woodMat);
      pole.rotation.x = Math.PI / 2;
      pole.position.set(tx, -ty, GROUND_Z + 26);
      add(pole);
    }
    const fx = m.x, fy = m.y + (m.y < MAP_H / 2 ? 150 : -150);
    for (let i = 0; i < 5; i++) {
      const log = box3(26, 6, 6, woodMat);
      log.position.set(fx, -fy, GROUND_Z + 3);
      log.rotation.z = (i / 5) * Math.PI;
      add(log);
    }
    const flame = new T.Mesh(
      new T.ConeGeometry(11, 26, 6),
      new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.95 }),
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.set(fx, -fy, GROUND_Z + 16);
    add(flame);
    const light = new T.PointLight(0xff9a40, 14000, 300, 2);
    light.position.set(fx, -fy, GROUND_Z + 40);
    add(light);
    env.fires.push({ flame, phase: rnd() * 6 });
  }

  _env = env;
}

function syncEnvironment() {
  if (!_env) return;
  if (_env.sky) _env.sky.position.set(_camEye.x, _camEye.y, 0);
  for (const f of _env.fires) {
    const k = 0.85 + Math.sin(_frame * 0.3 + f.phase) * 0.15 + Math.sin(_frame * 0.71 + f.phase * 2) * 0.08;
    f.flame.scale.set(k, 1 + (k - 1) * 1.7, k);
    f.flame.rotation.z = Math.sin(_frame * 0.2 + f.phase) * 0.18;
  }
  for (const c of _env.clouds) {
    c.g.position.x += c.speed;
    if (c.g.position.x > MAP_W / 2 + 3600) c.g.position.x = MAP_W / 2 - 3600;
  }
}

// ── 3D: buildings ─────────────────────────────────────────────────────────
function makeBanner(T, tint, w, h) {
  const g = new T.Group();
  const pole = new T.Mesh(new T.CylinderGeometry(1.8, 1.8, h * 1.7, 5), lam(0x6a5236));
  pole.rotation.x = Math.PI / 2;
  pole.position.z = h * 0.85;
  g.add(pole);
  const clothMat = lam(tint, { side: T.DoubleSide });
  const cloth = new T.Mesh(new T.PlaneGeometry(w, h, 4, 1), clothMat);
  cloth.position.set(w / 2 + 2, 0, h * 1.22);
  cloth.rotation.set(Math.PI / 2, 0, 0);
  g.add(cloth);
  g.userData.cloth = cloth;
  g.userData.clothMat = clothMat;
  return g;
}

function buildKeep(s) {
  const T = _THREE;
  const g = new T.Group();
  const tint = SIDE_INFO[s.side].tint;
  const stone = lam(0x8e8479);
  const stoneDark = lam(0x6a6157);
  const roofMat = lam(darken(tint, 0.72));
  const w = s.w, h = s.h;
  const wall = new T.Mesh(new T.BoxGeometry(w, h, 88), stone);
  wall.position.z = GROUND_Z + 44;
  g.add(wall);
  const cap = box3(w + 10, h + 10, 12, stoneDark);
  cap.position.z = GROUND_Z + 92;
  g.add(cap);
  // Crenellations.
  for (let i = 0; i < 7; i++) {
    for (const sy of [-1, 1]) {
      const m = box3(13, 12, 16, stoneDark);
      m.position.set(-w / 2 + 12 + i * ((w - 24) / 6), (sy * h) / 2, GROUND_Z + 104);
      g.add(m);
    }
  }
  // Corner towers.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const tw = new T.Mesh(new T.CylinderGeometry(20, 23, 136, 8), stone);
      tw.rotation.x = Math.PI / 2;
      tw.position.set((sx * w) / 2, (sy * h) / 2, GROUND_Z + 68);
      g.add(tw);
      const roof = new T.Mesh(new T.ConeGeometry(27, 46, 8), roofMat);
      roof.rotation.x = Math.PI / 2;
      roof.position.set((sx * w) / 2, (sy * h) / 2, GROUND_Z + 159);
      g.add(roof);
    }
  }
  // Central donjon.
  const keepTop = new T.Mesh(new T.CylinderGeometry(30, 34, 72, 8), stone);
  keepTop.rotation.x = Math.PI / 2;
  keepTop.position.z = GROUND_Z + 124;
  g.add(keepTop);
  const roof = new T.Mesh(new T.ConeGeometry(40, 56, 8), roofMat);
  roof.rotation.x = Math.PI / 2;
  roof.position.z = GROUND_Z + 188;
  g.add(roof);
  // Gate facing the enemy.
  const dir = s.side === SIDE_P ? 1 : -1;
  const gate = box3(10, 46, 54, lam(0x4a3626));
  gate.position.set((dir * w) / 2, 0, GROUND_Z + 27);
  g.add(gate);
  const banners = [];
  for (const sy of [-1, 1]) {
    // Hung from the gatehouse, high enough to clear the parapet.
    const b = makeBanner(T, tint, 34, 26);
    b.position.set((dir * w) / 2 + dir * 14, (sy * h) / 2 - sy * 24, GROUND_Z + 58);
    b.rotation.z = dir > 0 ? 0 : Math.PI;
    g.add(b);
    banners.push(b);
  }
  const flag = makeBanner(T, tint, 58, 42);
  flag.position.set(0, 0, GROUND_Z + 206);
  g.add(flag);
  banners.push(flag);
  return { group: g, banners, tintMats: [roofMat, ...banners.map((b) => b.userData.clothMat)] };
}

function buildTower(s) {
  const T = _THREE;
  const g = new T.Group();
  const tint = SIDE_INFO[s.side].tint;
  const stone = lam(0x8e8479);
  const stoneDark = lam(0x6a6157);
  const roofMat = lam(darken(tint, 0.72));
  const shaft = new T.Mesh(new T.CylinderGeometry(s.r * 0.78, s.r, 118, 9), stone);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = GROUND_Z + 59;
  g.add(shaft);
  const ring = new T.Mesh(new T.CylinderGeometry(s.r * 1.05, s.r * 1.05, 12, 9), stoneDark);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = GROUND_Z + 120;
  g.add(ring);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const m = box3(11, 11, 16, stoneDark);
    m.position.set(Math.cos(a) * s.r * 0.98, Math.sin(a) * s.r * 0.98, GROUND_Z + 132);
    m.rotation.z = a;
    g.add(m);
  }
  const roof = new T.Mesh(new T.ConeGeometry(s.r * 1.1, 42, 9), roofMat);
  roof.rotation.x = Math.PI / 2;
  roof.position.z = GROUND_Z + 158;
  g.add(roof);
  const flag = makeBanner(T, tint, 40, 30);
  flag.position.set(0, 0, GROUND_Z + 172);
  g.add(flag);
  // A stubby cannon that swings toward whatever the tower is shooting at.
  const turret = new T.Group();
  turret.position.z = GROUND_Z + 128;
  const barrel = new T.Mesh(new T.CylinderGeometry(5, 7, 34, 7), lam(0x3d3730));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(17, 0, 0);
  turret.add(barrel);
  g.add(turret);
  return { group: g, banners: [flag], turret, tintMats: [roofMat, flag.userData.clothMat] };
}

function buildMine(s) {
  const T = _THREE;
  const g = new T.Group();
  const wood = lam(0x5d4630);
  const woodDark = lam(0x3f3020);
  const rock = lam(0x6e655b);
  const goldMat = lam(0xe0b84a);
  const mound = new T.Mesh(new T.ConeGeometry(s.r * 1.7, 54, 9), rock);
  mound.rotation.x = Math.PI / 2;
  mound.position.z = GROUND_Z + 26;
  g.add(mound);
  // Head frame over the shaft.
  const dir = s.y < MAP_H / 2 ? 1 : -1;
  for (const sx of [-1, 1]) {
    const post = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 74, 5), wood);
    post.rotation.x = Math.PI / 2;
    post.position.set(sx * 20, dir * 26, GROUND_Z + 37);
    g.add(post);
  }
  const lintel = box3(52, 7, 8, wood);
  lintel.position.set(0, dir * 26, GROUND_Z + 76);
  g.add(lintel);
  const gable = new T.Mesh(new T.ConeGeometry(34, 26, 4), woodDark);
  gable.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  gable.position.set(0, dir * 26, GROUND_Z + 92);
  g.add(gable);
  const mouth = box3(40, 10, 44, lam(0x20180f));
  mouth.position.set(0, dir * 30, GROUND_Z + 22);
  g.add(mouth);
  // Cart and spoil.
  const cart = box3(30, 20, 16, woodDark);
  cart.position.set(38, dir * 12, GROUND_Z + 12);
  g.add(cart);
  for (let i = 0; i < 5; i++) {
    const n = new T.Mesh(new T.IcosahedronGeometry(4.5, 0), goldMat);
    n.position.set(38 + rand(-9, 9), dir * 12 + rand(-6, 6), GROUND_Z + 20 + rand(0, 5));
    g.add(n);
  }
  for (let i = 0; i < 3; i++) {
    const pile = new T.Mesh(new T.ConeGeometry(11, 12, 6), goldMat);
    pile.rotation.x = Math.PI / 2;
    pile.position.set(rand(-46, 46), -dir * rand(26, 48), GROUND_Z + 6);
    g.add(pile);
  }
  const flagMat = lam(SIDE_INFO[s.side].tint, { side: T.DoubleSide });
  const pole = new T.Mesh(new T.CylinderGeometry(2, 2, 96, 5), wood);
  pole.rotation.x = Math.PI / 2;
  pole.position.set(-s.r * 1.1, 0, GROUND_Z + 48);
  g.add(pole);
  const cloth = new T.Mesh(new T.PlaneGeometry(34, 24, 4, 1), flagMat);
  cloth.position.set(-s.r * 1.1 + 18, 0, GROUND_Z + 82);
  cloth.rotation.set(Math.PI / 2, 0, 0);
  g.add(cloth);
  const banner = new T.Group();
  banner.userData.cloth = cloth;
  banner.userData.clothMat = flagMat;
  return { group: g, banners: [banner], tintMats: [flagMat], flagMat };
}

function ensureBuildings(adapter) {
  for (const [s, rec] of _bldMeshes) {
    if (_structs.includes(s)) continue;
    adapter.removeSceneMesh(rec.group);
    _bldMeshes.delete(s);
  }
  for (const s of _structs) {
    if (_bldMeshes.has(s)) continue;
    const rec = s.kind === "keep" ? buildKeep(s) : s.kind === "tower" ? buildTower(s) : buildMine(s);
    rec.group.position.set(s.x, -s.y, 0);
    rec.side = s.side;
    adapter.addSceneMesh(rec.group);
    _bldMeshes.set(s, rec);
    if (s.kind === "keep") {
      const shield = new _THREE.Mesh(
        new _THREE.SphereGeometry(Math.max(s.w, s.h) * 0.72, 16, 10),
        new _THREE.MeshBasicMaterial({ color: 0x8ecbff, transparent: true, opacity: 0.17, depthWrite: false }),
      );
      shield.position.z = GROUND_Z + 60;
      rec.group.add(shield);
      rec.shield = shield;
    }
  }
}

function syncBuildings() {
  for (const [s, rec] of _bldMeshes) {
    if (rec.side !== s.side) {
      rec.side = s.side;
      for (const m of rec.tintMats) m.color.setHex(s.kind === "mine" ? SIDE_INFO[s.side].tint : darken(SIDE_INFO[s.side].tint, 0.72));
      if (rec.flagMat) rec.flagMat.color.setHex(SIDE_INFO[s.side].tint);
    }
    if (!s.alive) {
      const k = 1 - Math.min(0.75, s.deadT * 0.75);
      rec.group.scale.set(1, 1, Math.max(0.12, k * 0.35));
      rec.group.rotation.z = Math.sin(s.deadT * 6) * 0.05;
      if (rec.shield) rec.shield.visible = false;
      continue;
    }
    rec.group.position.z = s.hitFlash > 0 ? Math.sin(_frame) * 1.6 : 0;
    if (rec.shield) {
      rec.shield.visible = s.shielded;
      if (s.shielded) {
        const p = 1 + Math.sin(_frame * 0.06) * 0.02;
        rec.shield.scale.set(p, p, p);
        rec.shield.material.opacity = 0.15 + Math.sin(_frame * 0.09) * 0.04;
      }
    }
    for (const b of rec.banners) {
      const cloth = b.userData.cloth;
      if (!cloth) continue;
      const pos = cloth.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setY(i, Math.sin(_frame * 0.12 + x * 0.14 + s.flagWave) * (2 + Math.abs(x) * 0.12));
      }
      pos.needsUpdate = true;
    }
    if (rec.turret) {
      const t = nearestFoeUnit(s.side, s.x, s.y, s.range);
      if (t) {
        const want = -Math.atan2(-(uy(t) - s.y), ux(t) - s.x);
        rec.turret.rotation.z = lerp(rec.turret.rotation.z, want, 0.2);
      }
      rec.turret.position.z = GROUND_Z + 128 - (s.muzzle > 0 ? s.muzzle * 0.3 : 0);
    }
  }
}

// ── 3D: figurine rigs ─────────────────────────────────────────────────────
// Every rig faces its own local +Y, stands on a painted base disc and hangs
// its limbs along -Z, so a positive rotation.x on a shoulder or hip swings the
// limb forward. That one convention is what makes the pose code readable.
function rigConfig(u) {
  const info = SIDE_INFO[u.side];
  const tint = info.tint;
  const dark = darken(tint, 0.55);
  const common = { tint, skin: 0xe8b48a, metal: 0xb9bec7, boots: 0x3c2c1e };
  switch (u.key) {
    case "footman":
      return { ...common, kind: "humanoid", scale: 1.02, bulk: 1.08, cloth: tint, trim: 0xd6d2c6, legs: dark, helm: "pot", weapon: "sword", shield: true };
    case "archer":
      return { ...common, kind: "humanoid", scale: 0.98, bulk: 0.94, cloth: darken(tint, 0.85), trim: 0x9ccc65, legs: 0x4a4434, helm: "hood", weapon: "bow", quiver: true };
    case "sapper":
      return { ...common, kind: "humanoid", scale: 0.92, bulk: 1.02, cloth: 0xb2643f, trim: tint, legs: 0x4d3a28, helm: "none", hair: 0x2e2620, weapon: "barrel" };
    case "warden":
      return { ...common, kind: "humanoid", scale: 1.0, bulk: 0.95, cloth: 0xd8d4ee, trim: 0x4fc3c7, legs: 0x8a86a8, helm: "hood", weapon: "staff", robe: true };
    case "brute":
      return { ...common, kind: "humanoid", scale: 1.02, bulk: 1.55, cloth: 0x8d8c88, trim: 0x6c6b66, legs: 0x7a7975, skin: 0x9b9a95, helm: "none", weapon: "club", stone: true };
    case "troll":
      return { ...common, kind: "humanoid", scale: 1.0, bulk: 1.4, cloth: 0x6c8a4e, trim: 0x4a5c34, legs: 0x5e7a44, skin: 0x88a860, helm: "horn", weapon: "club", hunch: true };
    case "thane":
      return { ...common, kind: "humanoid", scale: 1.06, bulk: 1.18, cloth: tint, trim: 0xf0d060, legs: darken(tint, 0.45), helm: "crown", weapon: "greatsword", cape: true, banner: true };
    case "rider":
      return { ...common, kind: "beast", scale: 1.0, fur: 0x6e6257, furDark: 0x4b4239, rider: true, cloth: tint, trim: 0xe8a33d, ears: true };
    case "emberfang":
      return { ...common, kind: "beast", scale: 1.22, fur: 0x8c3a2a, furDark: 0x5e241a, horns: true, glow: 0xff8a3a, tailSpike: true };
    case "bat":
      return { ...common, kind: "bat", scale: 1.05, fur: 0x6f5d84, wing: 0xb49ad8, tint };
    case "ballista":
      return { ...common, kind: "ballista", scale: 1.0, wood: 0x6b5136, woodDark: 0x46341f, cloth: tint };
    default:
      return { ...common, kind: "humanoid", scale: 1, bulk: 1, cloth: tint, trim: 0xcccccc, legs: dark, helm: "none", weapon: "sword" };
  }
}

function buildBaseDisc(T, r, tint) {
  const g = new T.Group();
  const disc = new T.Mesh(new T.CylinderGeometry(r * 0.86, r * 0.96, 3.5, 14), lam(darken(tint, 0.62)));
  disc.rotation.x = Math.PI / 2;
  disc.position.z = 1.8;
  g.add(disc);
  const rim = new T.Mesh(new T.TorusGeometry(r * 0.91, 1.1, 4, 14), lam(tint));
  rim.position.z = 3.5;
  g.add(rim);
  return g;
}

function buildWeapon(T, kind, u, cfg) {
  const g = new T.Group();
  if (kind === "sword" || kind === "greatsword") {
    const big = kind === "greatsword";
    const bladeL = u * (big ? 1.25 : 0.92);
    const blade = box3(u * (big ? 0.14 : 0.1), u * 0.05, bladeL, lam(cfg.metal));
    blade.position.z = -bladeL / 2 - u * 0.14;
    g.add(blade);
    const guard = box3(u * (big ? 0.5 : 0.38), u * 0.08, u * 0.08, lam(cfg.trim));
    guard.position.z = -u * 0.12;
    g.add(guard);
    const grip = box3(u * 0.08, u * 0.08, u * 0.2, lam(0x3a2a1e));
    g.add(grip);
    const pommel = new T.Mesh(new T.SphereGeometry(u * 0.07, 6, 5), lam(cfg.trim));
    pommel.position.z = u * 0.12;
    g.add(pommel);
  } else if (kind === "club") {
    const shaft = new T.Mesh(new T.CylinderGeometry(u * 0.06, u * 0.09, u * 0.85, 6), lam(0x5a4531));
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -u * 0.42;
    g.add(shaft);
    const head = new T.Mesh(new T.IcosahedronGeometry(u * 0.24, 0), lam(cfg.stone ? 0x8a8a86 : 0x6d5b44));
    head.position.z = -u * 0.88;
    g.add(head);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const spike = new T.Mesh(new T.ConeGeometry(u * 0.05, u * 0.16, 4), lam(cfg.metal));
      spike.position.set(Math.cos(a) * u * 0.2, Math.sin(a) * u * 0.2, -u * 0.88);
      spike.rotation.z = a - Math.PI / 2;
      g.add(spike);
    }
  } else if (kind === "bow") {
    const arc = new T.Mesh(new T.TorusGeometry(u * 0.46, u * 0.035, 4, 10, Math.PI * 1.15), lam(0x6b5136));
    arc.rotation.y = Math.PI / 2;
    arc.rotation.z = -Math.PI * 0.075;
    g.add(arc);
    const string = box3(u * 0.012, u * 0.012, u * 0.84, lam(0xe8e0cc));
    string.position.x = u * 0.16;
    g.add(string);
    g.userData.string = string;
  } else if (kind === "staff") {
    const shaft = new T.Mesh(new T.CylinderGeometry(u * 0.045, u * 0.05, u * 1.3, 6), lam(0x6a5236));
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -u * 0.45;
    g.add(shaft);
    const orb = new T.Mesh(new T.IcosahedronGeometry(u * 0.16, 0), new T.MeshBasicMaterial({ color: 0x7de8c8 }));
    orb.position.z = -u * 1.1;
    g.add(orb);
    g.userData.orb = orb;
  } else if (kind === "barrel") {
    const keg = new T.Mesh(new T.CylinderGeometry(u * 0.42, u * 0.42, u * 0.72, 9), lam(0x8a6238));
    keg.rotation.x = Math.PI / 2;
    g.add(keg);
    for (const z of [-u * 0.22, 0, u * 0.22]) {
      const band = new T.Mesh(new T.TorusGeometry(u * 0.435, u * 0.045, 4, 10), lam(0x40382e));
      band.position.z = z;
      g.add(band);
    }
    const fuse = new T.Mesh(new T.SphereGeometry(u * 0.11, 6, 5), new T.MeshBasicMaterial({ color: 0xffc04a }));
    fuse.position.z = u * 0.46;
    g.add(fuse);
    g.userData.fuse = fuse;
  }
  return g;
}

function buildHumanoid(un, cfg) {
  const T = _THREE;
  const u = un * (cfg.scale ?? 1);
  const bulk = cfg.bulk ?? 1;
  const root = new T.Group();
  const parts = { joints: [], flashMats: [], u };
  const skinM = lam(cfg.skin);
  const clothM = lam(cfg.cloth);
  const trimM = lam(cfg.trim);
  const legM = lam(cfg.legs);
  const bootM = lam(cfg.boots);
  parts.flashMats.push(skinM, clothM, legM);

  root.add(buildBaseDisc(T, un, cfg.tint));

  const thighL = u * 0.46, shinL = u * 0.42, bootH = u * 0.15;
  const legLen = thighL + shinL + bootH + 4;
  const torsoH = u * 0.86;

  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const hip = new T.Group();
    hip.rotation.order = "ZYX";
    hip.position.set(sx * u * 0.2 * bulk, 0, legLen);
    const thigh = box3(u * 0.26 * bulk, u * 0.27, thighL, legM);
    thigh.position.z = -thighL / 2;
    hip.add(thigh);
    const knee = new T.Group();
    knee.position.z = -thighL;
    const shin = box3(u * 0.22 * bulk, u * 0.24, shinL, legM);
    shin.position.z = -shinL / 2;
    knee.add(shin);
    const boot = box3(u * 0.26 * bulk, u * 0.4, bootH, bootM);
    boot.position.set(0, u * 0.07, -shinL - bootH / 2);
    knee.add(boot);
    hip.add(knee);
    root.add(hip);
    parts[side + "Hip"] = rest(hip);
    parts[side + "Knee"] = rest(knee);
    parts.joints.push(hip, knee);
  }

  const torsoG = new T.Group();
  torsoG.rotation.order = "ZYX";
  torsoG.position.z = legLen;
  root.add(torsoG);
  parts.torso = rest(torsoG);
  parts.joints.push(torsoG);
  const torso = box3(u * 0.78 * bulk, u * 0.44 * bulk, torsoH, clothM);
  torso.position.z = torsoH / 2;
  torsoG.add(torso);
  const belt = box3(u * 0.82 * bulk, u * 0.48 * bulk, u * 0.09, trimM);
  belt.position.z = u * 0.09;
  torsoG.add(belt);
  if (cfg.robe) {
    const robe = new T.Mesh(new T.ConeGeometry(u * 0.5 * bulk, u * 0.8, 8), clothM);
    robe.rotation.x = Math.PI / 2;
    robe.position.z = u * 0.1;
    torsoG.add(robe);
  }
  if (cfg.stone) {
    for (let i = 0; i < 3; i++) {
      const slab = box3(u * 0.26, u * 0.06, u * 0.16, lam(0x6f7a5e));
      slab.position.set((i - 1) * u * 0.26, u * 0.23 * bulk, torsoH * (0.3 + i * 0.22));
      torsoG.add(slab);
    }
  }
  for (const sx of [-1, 1]) {
    const pad = box3(u * 0.26, u * 0.42 * bulk, u * 0.14, trimM);
    pad.position.set(sx * u * 0.46 * bulk, 0, torsoH - u * 0.02);
    torsoG.add(pad);
  }
  if (cfg.cape || cfg.banner) {
    const capeG = new T.Group();
    capeG.position.set(0, -u * 0.24 * bulk, torsoH - u * 0.06);
    const cape = new T.Mesh(new T.PlaneGeometry(u * 0.78, u * 1.0, 2, 2), lam(darken(cfg.tint, 0.7), { side: T.DoubleSide }));
    cape.rotation.x = Math.PI / 2;
    cape.position.z = -u * 0.5;
    capeG.add(cape);
    torsoG.add(capeG);
    parts.cape = rest(capeG);
    parts.joints.push(capeG);
  }
  if (cfg.banner) {
    const pole = new T.Mesh(new T.CylinderGeometry(u * 0.035, u * 0.035, u * 1.5, 5), lam(0x6a5236));
    pole.rotation.x = Math.PI / 2;
    pole.position.set(-u * 0.32, -u * 0.26 * bulk, torsoH * 0.4);
    torsoG.add(pole);
    const flagMat = lam(cfg.tint, { side: T.DoubleSide });
    const flag = new T.Mesh(new T.PlaneGeometry(u * 0.5, u * 0.38, 3, 1), flagMat);
    flag.position.set(-u * 0.32 - u * 0.26, -u * 0.26 * bulk, torsoH * 0.95);
    flag.rotation.set(Math.PI / 2, 0, 0);
    torsoG.add(flag);
    parts.flag = flag;
  }
  if (cfg.quiver) {
    const q = new T.Mesh(new T.CylinderGeometry(u * 0.09, u * 0.09, u * 0.44, 6), lam(0x5a4230));
    q.rotation.set(Math.PI / 2.4, 0, 0.3);
    q.position.set(-u * 0.3, -u * 0.22 * bulk, torsoH * 0.7);
    torsoG.add(q);
    for (let i = 0; i < 3; i++) {
      const shaft = box3(u * 0.02, u * 0.02, u * 0.3, lam(0xd8cba8));
      shaft.position.set(-u * 0.3 + (i - 1) * u * 0.04, -u * 0.24 * bulk, torsoH * 0.98);
      shaft.rotation.x = 0.35;
      torsoG.add(shaft);
    }
  }

  const upperL = u * 0.44, foreL = u * 0.4;
  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const shoulder = new T.Group();
    shoulder.rotation.order = "ZYX";
    shoulder.position.set(sx * u * 0.5 * bulk, 0, torsoH - u * 0.09);
    const upper = box3(u * 0.2 * bulk, u * 0.22, upperL, clothM);
    upper.position.z = -upperL / 2;
    shoulder.add(upper);
    const elbow = new T.Group();
    elbow.rotation.order = "ZYX";
    elbow.position.z = -upperL;
    const fore = box3(u * 0.18 * bulk, u * 0.2, foreL, cfg.stone ? clothM : skinM);
    fore.position.z = -foreL / 2;
    elbow.add(fore);
    const hand = new T.Group();
    hand.rotation.order = "ZYX";
    hand.position.z = -foreL - u * 0.06;
    hand.add(box3(u * 0.19 * bulk, u * 0.2, u * 0.16, skinM));
    elbow.add(hand);
    shoulder.add(elbow);
    torsoG.add(shoulder);
    parts[side + "Shoulder"] = rest(shoulder);
    parts[side + "Elbow"] = rest(elbow);
    parts[side + "Hand"] = rest(hand);
    parts.joints.push(shoulder, elbow, hand);
  }
  if (cfg.weapon) {
    const w = buildWeapon(T, cfg.weapon, u, cfg);
    parts.rightHand.add(w);
    parts.weapon = w;
    parts.weaponKind = cfg.weapon;
  }
  if (cfg.shield) {
    const sh = new T.Group();
    const disc = new T.Mesh(new T.CylinderGeometry(u * 0.34, u * 0.34, u * 0.06, 10), lam(cfg.tint));
    disc.rotation.z = Math.PI / 2;
    disc.rotation.x = Math.PI / 2;
    sh.add(disc);
    const boss = new T.Mesh(new T.SphereGeometry(u * 0.09, 6, 5), lam(cfg.metal));
    boss.position.y = u * 0.06;
    sh.add(boss);
    sh.position.set(0, u * 0.12, -u * 0.1);
    parts.leftHand.add(sh);
    parts.shield = sh;
  }

  const neck = new T.Group();
  neck.rotation.order = "ZYX";
  neck.position.z = torsoH;
  torsoG.add(neck);
  parts.neck = rest(neck);
  parts.joints.push(neck);
  const headW = u * 0.54;
  const head = box3(headW, headW * 0.92, u * 0.56, skinM);
  head.position.z = u * 0.36;
  neck.add(head);
  const eyeMat = cfg.glow ? new T.MeshBasicMaterial({ color: cfg.glow }) : lam(0x14181d);
  for (const sx of [-1, 1]) {
    const eye = box3(u * 0.07, u * 0.035, u * 0.09, eyeMat);
    eye.position.set(sx * headW * 0.25, headW * 0.47, u * 0.4);
    neck.add(eye);
  }
  const helm = cfg.helm ?? "none";
  if (helm === "pot") {
    const cap = new T.Mesh(new T.SphereGeometry(headW * 0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), lam(cfg.metal));
    cap.rotation.x = Math.PI / 2;
    cap.position.z = u * 0.6;
    neck.add(cap);
    const nose = box3(u * 0.06, u * 0.08, u * 0.22, lam(cfg.metal));
    nose.position.set(0, headW * 0.46, u * 0.48);
    neck.add(nose);
  } else if (helm === "hood") {
    const hood = box3(headW * 1.22, headW * 1.14, u * 0.44, lam(darken(cfg.cloth, 0.85)));
    hood.position.set(0, -headW * 0.06, u * 0.52);
    neck.add(hood);
    const cowl = box3(headW * 1.24, headW * 0.26, u * 0.4, lam(darken(cfg.cloth, 0.85)));
    cowl.position.set(0, -headW * 0.52, u * 0.16);
    neck.add(cowl);
  } else if (helm === "horn") {
    for (const sx of [-1, 1]) {
      const horn = new T.Mesh(new T.ConeGeometry(u * 0.07, u * 0.3, 5), lam(0xe8dfc8));
      horn.position.set(sx * headW * 0.5, 0, u * 0.62);
      horn.rotation.set(Math.PI / 2, sx * 0.5, 0);
      neck.add(horn);
    }
  } else if (helm === "crown") {
    const band = new T.Mesh(new T.TorusGeometry(headW * 0.55, u * 0.045, 4, 10), lam(cfg.trim));
    band.position.z = u * 0.62;
    neck.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new T.Mesh(new T.ConeGeometry(u * 0.05, u * 0.16, 4), lam(cfg.trim));
      spike.position.set(Math.cos(a) * headW * 0.5, Math.sin(a) * headW * 0.5, u * 0.7);
      spike.rotation.x = Math.PI / 2;
      neck.add(spike);
    }
  }
  if (cfg.hair) {
    const hairM = lam(cfg.hair);
    const capH = box3(headW * 1.05, headW * 1.0, u * 0.14, hairM);
    capH.position.set(0, -headW * 0.03, u * 0.64);
    neck.add(capH);
  }
  if (cfg.hunch) {
    torsoG.rotation.x = 0.25;
    parts.torso.userData.rest.rx = 0.25;
  }
  return { kind: "humanoid", root, parts, cfg };
}

function buildBeast(un, cfg) {
  const T = _THREE;
  const u = un * (cfg.scale ?? 1);
  const root = new T.Group();
  const parts = { joints: [], flashMats: [], u };
  const furM = lam(cfg.fur);
  const furD = lam(cfg.furDark);
  parts.flashMats.push(furM, furD);
  root.add(buildBaseDisc(T, un, cfg.tint));

  const legLen = u * 0.62;
  const bodyG = new T.Group();
  bodyG.rotation.order = "ZYX";
  bodyG.position.z = legLen + u * 0.3;
  root.add(bodyG);
  parts.body = rest(bodyG);
  parts.joints.push(bodyG);
  const body = box3(u * 0.62, u * 1.3, u * 0.56, furM);
  bodyG.add(body);
  const haunch = box3(u * 0.7, u * 0.5, u * 0.62, furM);
  haunch.position.y = -u * 0.5;
  bodyG.add(haunch);

  for (const [name, sx, sy] of [["FL", -1, 1], ["FR", 1, 1], ["BL", -1, -1], ["BR", 1, -1]]) {
    const hip = new T.Group();
    hip.rotation.order = "ZYX";
    hip.position.set(sx * u * 0.28, sy * u * 0.46, 0);
    const leg = box3(u * 0.18, u * 0.2, legLen, sy > 0 ? furM : furD);
    leg.position.z = -legLen / 2;
    hip.add(leg);
    const paw = box3(u * 0.22, u * 0.3, u * 0.14, furD);
    paw.position.set(0, u * 0.05, -legLen - u * 0.05);
    hip.add(paw);
    bodyG.add(hip);
    parts["leg" + name] = rest(hip);
    parts.joints.push(hip);
  }

  const neck = new T.Group();
  neck.rotation.order = "ZYX";
  neck.position.set(0, u * 0.62, u * 0.16);
  bodyG.add(neck);
  parts.neck = rest(neck);
  parts.joints.push(neck);
  const head = box3(u * 0.44, u * 0.6, u * 0.4, furM);
  head.position.y = u * 0.22;
  neck.add(head);
  const snout = box3(u * 0.26, u * 0.32, u * 0.24, furD);
  snout.position.set(0, u * 0.52, -u * 0.06);
  neck.add(snout);
  const eyeMat = new T.MeshBasicMaterial({ color: cfg.glow ?? 0xffd76a });
  for (const sx of [-1, 1]) {
    const eye = box3(u * 0.07, u * 0.04, u * 0.07, eyeMat);
    eye.position.set(sx * u * 0.13, u * 0.4, u * 0.1);
    neck.add(eye);
  }
  if (cfg.ears) {
    for (const sx of [-1, 1]) {
      const ear = new T.Mesh(new T.ConeGeometry(u * 0.1, u * 0.24, 4), furD);
      ear.position.set(sx * u * 0.16, u * 0.1, u * 0.3);
      ear.rotation.set(Math.PI / 2 - 0.25, sx * 0.25, 0);
      neck.add(ear);
    }
  }
  if (cfg.horns) {
    for (const sx of [-1, 1]) {
      const horn = new T.Mesh(new T.ConeGeometry(u * 0.1, u * 0.46, 5), lam(0x2c2420));
      horn.position.set(sx * u * 0.2, u * 0.06, u * 0.34);
      horn.rotation.set(Math.PI / 2 - 0.6, 0, sx * 0.45);
      neck.add(horn);
    }
    for (let i = 0; i < 5; i++) {
      const spine = new T.Mesh(new T.ConeGeometry(u * 0.07, u * 0.24, 4), lam(0x2c2420));
      spine.position.set(0, u * 0.4 - i * u * 0.26, u * 0.34);
      spine.rotation.x = Math.PI / 2;
      bodyG.add(spine);
    }
  }
  if (cfg.glow) {
    const maw = new T.Mesh(new T.SphereGeometry(u * 0.11, 6, 5), new T.MeshBasicMaterial({ color: cfg.glow }));
    maw.position.set(0, u * 0.66, -u * 0.08);
    neck.add(maw);
    parts.maw = maw;
  }

  const tail = new T.Group();
  tail.rotation.order = "ZYX";
  tail.position.set(0, -u * 0.72, u * 0.14);
  const tailMesh = box3(u * 0.16, u * 0.62, u * 0.16, furD);
  tailMesh.position.y = -u * 0.31;
  tail.add(tailMesh);
  if (cfg.tailSpike) {
    const spike = new T.Mesh(new T.ConeGeometry(u * 0.14, u * 0.34, 5), lam(0x2c2420));
    spike.position.y = -u * 0.76;
    spike.rotation.x = Math.PI;
    tail.add(spike);
  }
  bodyG.add(tail);
  parts.tail = rest(tail);
  parts.joints.push(tail);

  if (cfg.rider) {
    const rg = new T.Group();
    rg.rotation.order = "ZYX";
    rg.position.set(0, u * 0.1, u * 0.34);
    const clothM = lam(cfg.cloth);
    parts.flashMats.push(clothM);
    const torso = box3(u * 0.42, u * 0.3, u * 0.5, clothM);
    torso.position.z = u * 0.25;
    rg.add(torso);
    const head = box3(u * 0.3, u * 0.28, u * 0.3, lam(cfg.skin));
    head.position.z = u * 0.66;
    rg.add(head);
    const helm = new T.Mesh(new T.ConeGeometry(u * 0.22, u * 0.24, 6), lam(cfg.trim));
    helm.rotation.x = Math.PI / 2;
    helm.position.z = u * 0.88;
    rg.add(helm);
    const armG = new T.Group();
    armG.rotation.order = "ZYX";
    armG.position.set(u * 0.26, 0, u * 0.44);
    const arm = box3(u * 0.14, u * 0.14, u * 0.36, clothM);
    arm.position.z = -u * 0.18;
    armG.add(arm);
    const spear = new T.Mesh(new T.CylinderGeometry(u * 0.035, u * 0.035, u * 1.1, 5), lam(0x6a5236));
    spear.rotation.x = Math.PI / 2;
    spear.position.set(0, 0, -u * 0.5);
    armG.add(spear);
    const tipM = new T.Mesh(new T.ConeGeometry(u * 0.08, u * 0.24, 5), lam(cfg.metal));
    tipM.position.z = -u * 1.1;
    tipM.rotation.x = -Math.PI / 2;
    armG.add(tipM);
    rg.add(armG);
    bodyG.add(rg);
    parts.riderTorso = rest(rg);
    parts.riderArm = rest(armG);
    parts.joints.push(rg, armG);
  }
  return { kind: "beast", root, parts, cfg };
}

function buildBat(un, cfg) {
  const T = _THREE;
  const u = un * (cfg.scale ?? 1);
  const root = new T.Group();
  const parts = { joints: [], flashMats: [], u };
  const furM = lam(cfg.fur);
  parts.flashMats.push(furM);
  const bodyG = new T.Group();
  bodyG.rotation.order = "ZYX";
  root.add(bodyG);
  parts.body = rest(bodyG);
  parts.joints.push(bodyG);
  const body = new T.Mesh(new T.IcosahedronGeometry(u * 0.44, 0), furM);
  body.scale.set(0.9, 1.25, 1.3);
  bodyG.add(body);
  const snout = new T.Mesh(new T.ConeGeometry(u * 0.16, u * 0.3, 5), furM);
  snout.position.y = u * 0.5;
  bodyG.add(snout);
  const eyeMat = new T.MeshBasicMaterial({ color: 0xffd76a });
  for (const sx of [-1, 1]) {
    const eye = box3(u * 0.08, u * 0.05, u * 0.08, eyeMat);
    eye.position.set(sx * u * 0.14, u * 0.34, u * 0.1);
    bodyG.add(eye);
    const ear = new T.Mesh(new T.ConeGeometry(u * 0.14, u * 0.4, 4), furM);
    ear.position.set(sx * u * 0.2, u * 0.04, u * 0.44);
    ear.rotation.set(Math.PI / 2, sx * 0.3, 0);
    bodyG.add(ear);
  }
  const wingMat = lam(cfg.wing, { side: T.DoubleSide });
  parts.flashMats.push(wingMat);
  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const wg = new T.Group();
    wg.rotation.order = "ZYX";
    wg.position.set(sx * u * 0.34, 0, u * 0.1);
    wg.rotation.y = sx * -0.5;
    const shape = new T.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(u * 0.98 * sx, u * 0.3);
    shape.lineTo(u * 0.9 * sx, -u * 0.14);
    shape.lineTo(u * 0.48 * sx, -u * 0.36);
    shape.lineTo(0, -u * 0.18);
    const wing = new T.Mesh(new T.ShapeGeometry(shape), wingMat);
    wg.add(wing);
    for (let i = 0; i < 3; i++) {
      const rib = box3(u * 0.9, u * 0.03, u * 0.03, lam(darken(cfg.wing, 0.7)));
      rib.position.set(sx * u * 0.5, u * (0.2 - i * 0.2), 0);
      rib.rotation.z = sx * (0.24 - i * 0.24);
      wg.add(rib);
    }
    bodyG.add(wg);
    parts[side + "Wing"] = rest(wg);
    parts.joints.push(wg);
  }
  const tail = new T.Mesh(new T.ConeGeometry(u * 0.1, u * 0.4, 4), furM);
  tail.rotation.x = Math.PI;
  tail.position.y = -u * 0.62;
  bodyG.add(tail);
  return { kind: "bat", root, parts, cfg };
}

function buildBallista(un, cfg) {
  const T = _THREE;
  const u = un * (cfg.scale ?? 1);
  const root = new T.Group();
  const parts = { joints: [], flashMats: [], u };
  const woodM = lam(cfg.wood);
  const woodD = lam(cfg.woodDark);
  parts.flashMats.push(woodM, woodD);
  root.add(buildBaseDisc(T, un, cfg.tint));
  const frame = new T.Group();
  frame.position.z = u * 0.42;
  root.add(frame);
  const deck = box3(u * 0.62, u * 1.25, u * 0.14, woodM);
  frame.add(deck);
  const spine = box3(u * 0.16, u * 1.0, u * 0.16, woodD);
  spine.position.z = u * 0.15;
  frame.add(spine);
  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const wheel = new T.Mesh(new T.CylinderGeometry(u * 0.42, u * 0.42, u * 0.12, 10), woodD);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * u * 0.38, -u * 0.2, 0);
    frame.add(wheel);
    for (let i = 0; i < 4; i++) {
      const spoke = box3(u * 0.05, u * 0.7, u * 0.05, woodM);
      spoke.rotation.x = (i / 4) * Math.PI;
      wheel.add(spoke);
    }
    parts[side + "Wheel"] = rest(wheel);
    parts.joints.push(wheel);
  }
  const arm = new T.Group();
  arm.rotation.order = "ZYX";
  arm.position.set(0, u * 0.34, u * 0.24);
  const bowArm = box3(u * 1.3, u * 0.1, u * 0.1, woodD);
  arm.add(bowArm);
  const string = box3(u * 1.24, u * 0.02, u * 0.02, lam(0xe8e0cc));
  string.position.y = -u * 0.16;
  arm.add(string);
  parts.string = string;
  const bolt = new T.Mesh(new T.CylinderGeometry(u * 0.05, u * 0.05, u * 0.9, 5), lam(0xd8cba8));
  bolt.position.set(0, u * 0.2, 0);
  arm.add(bolt);
  const tip = new T.Mesh(new T.ConeGeometry(u * 0.1, u * 0.24, 5), lam(cfg.metal));
  tip.position.set(0, u * 0.74, 0);
  arm.add(tip);
  parts.bolt = bolt;
  frame.add(arm);
  parts.arm = rest(arm);
  parts.joints.push(arm);
  const flagMat = lam(cfg.cloth, { side: T.DoubleSide });
  const pole = new T.Mesh(new T.CylinderGeometry(u * 0.03, u * 0.03, u * 0.9, 5), woodM);
  pole.rotation.x = Math.PI / 2;
  pole.position.set(-u * 0.28, -u * 0.5, u * 0.45);
  frame.add(pole);
  const flag = new T.Mesh(new T.PlaneGeometry(u * 0.4, u * 0.28), flagMat);
  flag.position.set(-u * 0.28 - u * 0.2, -u * 0.5, u * 0.8);
  flag.rotation.set(Math.PI / 2, 0, 0);
  frame.add(flag);
  return { kind: "ballista", root, parts, cfg };
}

function buildFigure(u) {
  const cfg = rigConfig(u);
  const un = u.def.r * 1.45;
  if (cfg.kind === "beast") return buildBeast(un, cfg);
  if (cfg.kind === "bat") return buildBat(un, cfg);
  if (cfg.kind === "ballista") return buildBallista(un, cfg);
  return buildHumanoid(un, cfg);
}

// ── 3D: figure bookkeeping ────────────────────────────────────────────────
function figKey(u) { return `${u.key}:${u.side}`; }

function ensureFigures(adapter) {
  const want = new Set();
  for (const u of _units) if (u.alive) want.add(u);
  for (const c of _corpses) want.add(c);
  for (const [u, f] of _figs) {
    if (want.has(u)) continue;
    f.root.visible = false;
    const key = figKey(u);
    if (!_figPool.has(key)) _figPool.set(key, []);
    const pool = _figPool.get(key);
    if (pool.length < 8) pool.push(f);
    else adapter.removeSceneMesh(f.root);
    _figs.delete(u);
    const sh = _shadows.get(u);
    if (sh) { sh.visible = false; _fxPools.shadowPool = _fxPools.shadowPool || []; _fxPools.shadowPool.push(sh); _shadows.delete(u); }
  }
  for (const u of want) {
    if (_figs.has(u)) continue;
    const key = figKey(u);
    const pool = _figPool.get(key);
    let f = pool && pool.length ? pool.pop() : null;
    if (!f) { f = buildFigure(u); adapter.addSceneMesh(f.root); }
    f.root.visible = true;
    f.phase = Math.random() * 6.28;
    f.amp = 0; f.lastX = null; f.lastY = null; f.flashOn = false;
    f.mats = f.parts.flashMats;
    _figs.set(u, f);
    _fxPools.shadowPool = _fxPools.shadowPool || [];
    let sh = _fxPools.shadowPool.pop();
    if (!sh) {
      sh = new _THREE.Mesh(_sharedGeo.shadow, new _THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false,
      }));
      adapter.addSceneMesh(sh);
    }
    sh.visible = true;
    _shadows.set(u, sh);
  }
}

function flashFigure(f, on, color = 0xffffff, strength = 0.8) {
  if (on === f.flashOn) return;
  f.flashOn = on;
  for (const m of f.mats) {
    if (!m.emissive) continue;
    if (on) { m.emissive.setHex(color); m.emissiveIntensity = strength; }
    else { m.emissive.setHex(0x000000); m.emissiveIntensity = 1; }
  }
}

function strideOf(f, u, x, y) {
  const d = f.lastX === null ? 0 : Math.hypot(x - f.lastX, y - f.lastY);
  f.lastX = x; f.lastY = y;
  f.phase += (d / (u.def.r * 1.9)) * Math.PI * 2;
  const target = Math.min(1, d / (u.def.r * 0.1));
  f.amp += (target - f.amp) * 0.22;
  return f.amp;
}

function atkPhase(u) {
  const w = Math.max(1, u.def.windup ?? 12);
  if (u.windT >= 0) return { ph: "wind", k: clamp(1 - u.windT / w, 0, 1) };
  if (u.atkFlash > 0) return { ph: "strike", k: clamp(1 - u.atkFlash / 10, 0, 1) };
  return { ph: null, k: 0 };
}
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

function armPose(p, side, sx, sz, ex, hx = 0) {
  const s = p[side + "Shoulder"], e = p[side + "Elbow"], h = p[side + "Hand"];
  if (!s) return;
  s.rotation.x += sx; s.rotation.z += sz;
  e.rotation.x += ex;
  h.rotation.x += hx;
}

// ── 3D: posing ────────────────────────────────────────────────────────────
function poseHumanoid(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const amp = strideOf(f, u, ux(u), uy(u));
  const w = p.weaponKind;
  const twoHanded = w === "club" || w === "greatsword";
  const swing = Math.sin(f.phase) * 0.78 * amp;

  p.leftHip.rotation.x = swing;
  p.rightHip.rotation.x = -swing;
  p.leftKnee.rotation.x = -Math.max(0, -swing) * 1.35;
  p.rightKnee.rotation.x = -Math.max(0, swing) * 1.35;
  p.torso.rotation.x += -0.14 * amp;
  p.torso.position.z += Math.abs(Math.cos(f.phase)) * un * 0.05 * amp;
  p.torso.position.z += Math.sin(_frame * 0.05 + f.phase) * un * 0.012;
  p.neck.rotation.x = 0.04 * Math.sin(_frame * 0.045);

  // Resting weapon hold.
  if (w === "bow") {
    armPose(p, "left", 1.35, 0.25, 0.15);
    armPose(p, "right", 0.55, -0.2, 0.9);
    if (p.weapon) p.weapon.rotation.set(0, 0, 0);
  } else if (w === "barrel") {
    armPose(p, "left", 2.5, 0.5, 0.5);
    armPose(p, "right", 2.5, -0.5, 0.5);
    if (p.weapon) p.weapon.position.set(-un * 0.52, 0, -un * 0.18);
  } else if (w === "staff") {
    armPose(p, "right", 0.5, -0.3, 0.7);
    armPose(p, "left", -swing * 0.5, 0, 0.3);
    if (p.weapon) p.weapon.rotation.x = -0.25;
    if (p.weapon?.userData.orb) {
      const s = 1 + Math.sin(_frame * 0.1) * 0.12;
      p.weapon.userData.orb.scale.set(s, s, s);
    }
  } else if (twoHanded) {
    armPose(p, "right", 0.7, -0.45, 0.85);
    armPose(p, "left", 0.8, 0.75, 1.0);
    if (p.weapon) p.weapon.rotation.x = -1.1;
  } else {
    armPose(p, "left", -swing * 0.6, 0, 0.3 + Math.max(0, -swing) * 0.45);
    armPose(p, "right", swing * 0.5, 0, 0.3 + Math.max(0, swing) * 0.4);
    if (p.weapon) p.weapon.rotation.x = -1.3;
  }
  if (p.shield) {
    const guard = u.target && reachTo(u, u.target) < 90 ? 1 : 0;
    armPose(p, "left", 0.55 * guard, 0.35 * guard, 0.9 * guard);
  }
  if (p.cape) {
    p.cape.rotation.x = -0.15 - amp * 0.5 - Math.sin(f.phase) * 0.08 * amp;
  }
  if (p.flag) p.flag.rotation.y = Math.sin(_frame * 0.13) * 0.25;

  const { ph, k } = atkPhase(u);
  if (ph) {
    const kw = ph === "wind" ? easeIn(k) : 1;
    const ks = ph === "strike" ? easeOut(k) : 0;
    if (w === "bow") {
      armPose(p, "left", 0.2, 0, 0);
      armPose(p, "right", 0.9 - ks * 0.3, -0.2 - kw * 0.7 + ks * 0.8, 0.5 + kw * 1.3 - ks * 1.2);
      p.torso.rotation.z += 0.4;
      if (p.weapon?.userData.string) {
        p.weapon.userData.string.position.x = un * (0.16 + (ph === "wind" ? kw * 0.3 : (1 - ks) * 0.3));
      }
    } else if (w === "staff") {
      armPose(p, "right", 1.6 * kw - ks * 0.4, -0.2, -0.3 * kw);
      p.torso.rotation.x -= 0.12 * kw;
      if (p.weapon?.userData.orb) {
        const s = 1 + kw * 0.8;
        p.weapon.userData.orb.scale.set(s, s, s);
      }
    } else if (w === "barrel") {
      armPose(p, "left", 0.4 * kw, 0, 0);
      armPose(p, "right", 0.4 * kw, 0, 0);
    } else if (twoHanded) {
      // Overhead smash.
      armPose(p, "right", 2.7 * kw - ks * 2.4, -0.3, 0.3 * kw);
      armPose(p, "left", 2.5 * kw - ks * 2.2, 0.4, 0.5 * kw);
      p.torso.rotation.x += -0.35 * kw + ks * 0.55;
      if (p.weapon) p.weapon.rotation.x = -1.1 - kw * 1.2 + ks * 2.2;
    } else {
      // Shoulder cut across the body.
      armPose(p, "right", 2.4 * kw - ks * 2.0, 0.3 * kw - ks * 0.7, 0.4 * kw);
      p.torso.rotation.z += -0.45 * kw + ks * 0.7;
      if (p.weapon) p.weapon.rotation.x = -1.3 - kw * 0.7 + ks * 1.5;
      if (p.shield) armPose(p, "left", 0.5, 0.4, 0.8);
    }
  }
  if (u.hitFlash > 0) {
    p.torso.rotation.x -= 0.18;
    p.neck.rotation.x -= 0.2;
  }
}

function poseBeast(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const amp = strideOf(f, u, ux(u), uy(u));
  const g = Math.sin(f.phase);
  const g2 = Math.sin(f.phase + Math.PI * 0.5);
  p.legFL.rotation.x = g * 0.9 * amp;
  p.legBR.rotation.x = g * 0.9 * amp;
  p.legFR.rotation.x = -g * 0.9 * amp;
  p.legBL.rotation.x = -g * 0.9 * amp;
  p.body.position.z += Math.abs(g2) * un * 0.1 * amp;
  p.body.rotation.x += -0.1 * amp + g2 * 0.08 * amp;
  p.tail.rotation.z = Math.sin(_frame * 0.14) * 0.3;
  p.tail.rotation.x = -0.3 - amp * 0.3;
  p.neck.rotation.x = -0.1 + Math.sin(_frame * 0.06) * 0.05;
  if (p.riderTorso) {
    p.riderTorso.position.z += Math.abs(g2) * un * 0.06 * amp;
    p.riderTorso.rotation.x += -0.12 * amp;
    p.riderArm.rotation.x += 0.25 + Math.sin(f.phase) * 0.12 * amp;
  }
  const { ph, k } = atkPhase(u);
  if (ph) {
    const kw = ph === "wind" ? easeIn(k) : 1;
    const ks = ph === "strike" ? easeOut(k) : 0;
    p.body.rotation.x += -0.4 * kw + ks * 0.5;
    p.neck.rotation.x += -0.5 * kw + ks * 0.9;
    if (p.riderArm) p.riderArm.rotation.x += -1.4 * kw + ks * 2.4;
  }
  if (u.breathT > 0) {
    p.neck.rotation.x += -0.5;
    if (p.maw) {
      const s = 1 + (u.breathT / 26) * 1.6;
      p.maw.scale.set(s, s, s);
    }
  } else if (p.maw) {
    const s = 1 + Math.sin(_frame * 0.09) * 0.12;
    p.maw.scale.set(s, s, s);
  }
}

function poseBat(f, u) {
  const p = f.parts;
  resetJoints(f);
  strideOf(f, u, ux(u), uy(u));
  const flap = Math.sin(_frame * 0.42 + f.phase);
  p.leftWing.rotation.y += -flap * 0.55;
  p.rightWing.rotation.y += flap * 0.55;
  p.leftWing.rotation.x = flap * 0.2;
  p.rightWing.rotation.x = flap * 0.2;
  p.body.rotation.x = -0.25 + flap * 0.08;
  const { ph, k } = atkPhase(u);
  if (ph) {
    const kw = ph === "wind" ? easeIn(k) : 1;
    const ks = ph === "strike" ? easeOut(k) : 0;
    p.body.rotation.x += -0.6 * kw + ks * 1.0;
    p.body.position.y += (kw - ks) * p.u * 0.3;
  }
}

function poseBallista(f, u) {
  const p = f.parts;
  resetJoints(f);
  strideOf(f, u, ux(u), uy(u));
  const spin = f.phase * 0.6;
  p.leftWheel.rotation.y = spin;
  p.rightWheel.rotation.y = spin;
  const { ph, k } = atkPhase(u);
  if (ph) {
    const kw = ph === "wind" ? easeIn(k) : 1;
    const ks = ph === "strike" ? easeOut(k) : 0;
    // String drawn back through the wind-up, released on the strike.
    const draw = (kw - ks) * p.u * 0.42;
    if (p.string) p.string.position.y = -p.u * 0.16 - draw;
    if (p.bolt) {
      p.bolt.position.y = p.u * 0.2 - draw;
      p.bolt.visible = !(ph === "strike" && ks > 0.3);
    }
    p.arm.position.y += -draw * 0.2 + ks * p.u * 0.16;
  } else if (p.bolt) {
    p.bolt.visible = u.cd < (u.def.cd ?? 120) * 0.55;
    if (p.string) p.string.position.y = -p.u * 0.16;
  }
}

function syncFigures() {
  for (const [u, f] of _figs) {
    const dead = !u.alive;
    const x = dead ? u.deadX : ux(u);
    const y = dead ? u.deadY : uy(u);
    let z = dead ? (u.deadZ ?? 0) : u.z;
    // Fresh figurines are set down from above, the way a hand places them.
    if (!dead && u.spawnT > 0) z += (u.spawnT / SPAWN_IN) * 120;
    f.root.visible = true;
    f.root.position.set(x, -y, z + GROUND_Z);
    f.root.rotation.set(0, 0, -u.face - Math.PI / 2);
    f.root.scale.set(1, 1, 1);
    const sh = _shadows.get(u);
    if (sh) {
      sh.position.set(x, -y, GROUND_Z + 0.6);
      const s = u.def.r * 1.15 * clamp(1 - z / 200, 0.4, 1);
      sh.scale.set(s, s, 1);
      sh.visible = !dead;
      sh.material.opacity = 0.3 * clamp(1 - z / 260, 0.3, 1);
    }
    switch (f.kind) {
      case "beast": poseBeast(f, u); break;
      case "bat": poseBat(f, u); break;
      case "ballista": poseBallista(f, u); break;
      default: poseHumanoid(f, u); break;
    }
    if (!dead && u.hitFlash > 0) flashFigure(f, true, 0xffffff, 0.9);
    else if (!dead && u.healFlash > 0) flashFigure(f, true, 0x3cff9a, 0.5);
    else flashFigure(f, false);
    if (dead) {
      const kd = clamp(u.deadT, 0, 1);
      f.root.rotation.x = kd * 1.4;
      f.root.position.z = GROUND_Z + z - kd * u.def.r * 0.4;
      const s = 1 - kd * 0.25;
      f.root.scale.set(s, s, s);
    } else {
      f.root.rotation.x = 0;
    }
  }
}

// ── 3D: effects ───────────────────────────────────────────────────────────
function poolTake(pool, used, make, adapter) {
  if (used.n < pool.length) { const m = pool[used.n++]; m.visible = true; return m; }
  const m = make();
  adapter.addSceneMesh(m);
  pool.push(m);
  used.n++;
  return m;
}
function poolPark(pool, from) { for (let i = from; i < pool.length; i++) pool[i].visible = false; }

function syncEffects3d(adapter) {
  const T = _THREE;
  const P = _fxPools;

  // Melee arcs.
  const su = { n: 0 };
  for (const s of _swings) {
    const m = poolTake(P.swing, su, () => new T.Mesh(
      _sharedGeo.sector,
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }),
    ), adapter);
    const k = s.t / s.T;
    m.position.set(s.x, -s.y, GROUND_Z + 16);
    m.rotation.set(0, 0, -s.a - Math.PI / 2);
    const r = s.r * (0.85 + k * 0.35);
    m.scale.set(r, r, 1);
    m.material.color.set(s.color);
    m.material.opacity = (1 - k) * 0.75;
  }
  poolPark(P.swing, su.n);

  // Expanding rings.
  const ru = { n: 0 };
  for (const r of _rings) {
    const m = poolTake(P.ring, ru, () => new T.Mesh(
      _sharedGeo.ring,
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }),
    ), adapter);
    const k = r.t / r.T;
    const rr = lerp(r.r, r.R, k);
    m.position.set(r.x, -r.y, GROUND_Z + 3);
    m.scale.set(rr, rr, 1);
    m.material.color.set(r.color);
    m.material.opacity = (1 - k) * 0.8;
  }
  poolPark(P.ring, ru.n);

  // Sparks and debris.
  const pu = { n: 0 };
  for (const p of _particles) {
    const m = poolTake(P.part, pu, () => new T.Mesh(
      _sharedGeo.sphere, new T.MeshBasicMaterial({ color: 0xffffff }),
    ), adapter);
    m.position.set(p.x, -p.y, GROUND_Z + p.z);
    const s = p.r * (1 - (p.t / p.life) * 0.5);
    m.scale.set(s, s, s);
    m.material.color.set(p.color);
  }
  poolPark(P.part, pu.n);

  // Shot in flight.
  const qu = { n: 0 };
  for (const p of _projs) {
    if (!p.body) continue;
    const m = poolTake(P.proj, qu, () => {
      const g = new T.Group();
      const shaft = box3(3, 22, 3, new T.MeshBasicMaterial({ color: 0xffe8b0 }));
      g.add(shaft);
      const head = new T.Mesh(new T.ConeGeometry(4, 9, 5), new T.MeshBasicMaterial({ color: 0xd8d8d0 }));
      head.position.y = 14;
      head.rotation.x = -Math.PI / 2;
      g.add(head);
      g.userData.shaft = shaft;
      g.userData.head = head;
      return g;
    }, adapter);
    const pos = p.body.position;
    m.position.set(pos.x, -pos.y, GROUND_Z + p.z);
    m.rotation.set(0, 0, -p.angle - Math.PI / 2);
    const round = p.kind === "shot";
    const len = p.kind === "bolt" ? 1.6 : round ? 0.4 : 1;
    m.scale.set(round ? 2.4 : 1, len, round ? 2.4 : 1);
    m.userData.shaft.material.color.set(p.color);
    m.userData.head.visible = !round;
  }
  poolPark(P.proj, qu.n);

  // Drop zone, ghost and spell telegraphs.
  const zu = { n: 0 };
  if (_phase === "play" && _selCard >= 0 && !holdingSpell()) {
    for (const s of _structs) {
      if (!s.alive || s.side !== SIDE_P) continue;
      const m = poolTake(P.zone, zu, () => new T.Mesh(
        _sharedGeo.disc,
        new T.MeshBasicMaterial({ color: 0x5aa9e6, transparent: true, opacity: 0.18, depthWrite: false }),
      ), adapter);
      m.position.set(s.x, -s.y, GROUND_Z + 1.2);
      m.scale.set(s.deployR, s.deployR, 1);
      m.material.color.setHex(0x7ec2f2);
      m.material.opacity = 0.17 + Math.sin(_frame * 0.07) * 0.03;
    }
  }
  for (const ps of _pendingSpells) {
    const sp = SPELLS[ps.spell];
    const m = poolTake(P.zone, zu, () => new T.Mesh(
      _sharedGeo.disc,
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false }),
    ), adapter);
    const k = 1 - ps.t / ps.T;
    m.position.set(ps.x, -ps.y, GROUND_Z + 1.6);
    const r = sp.radius * (0.35 + k * 0.65);
    m.scale.set(r, r, 1);
    m.material.color.set(sp.color);
    m.material.opacity = 0.18 + k * 0.3;
  }
  poolPark(P.zone, zu.n);

  // Placement ghost.
  if (!P.ghost) {
    P.ghost = new T.Mesh(
      _sharedGeo.ring,
      new T.MeshBasicMaterial({ color: 0x8ecbff, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }),
    );
    adapter.addSceneMesh(P.ghost);
  }
  if (_phase === "play" && _selCard >= 0 && _hoverW.has) {
    const card = heldCard();
    const rr = card?.spell ? SPELLS[card.spell].radius : 52;
    P.ghost.visible = true;
    P.ghost.position.set(_hoverW.x, -_hoverW.y, GROUND_Z + 2.4);
    P.ghost.scale.set(rr, rr, 1);
    P.ghost.material.color.setHex(card?.spell || _hoverW.ok ? 0x8ecbff : 0xff6a55);
  } else {
    P.ghost.visible = false;
  }

  // Previewed march route: a line of pips flowing toward the target building.
  const eu = { n: 0 };
  if (_hoverRoute) {
    for (const d of routeDots(_hoverRoute, 38)) {
      const m = poolTake(P.route, eu, () => new T.Mesh(
        _sharedGeo.disc,
        new T.MeshBasicMaterial({ color: 0x8ecbff, transparent: true, opacity: 0.85, depthWrite: false }),
      ), adapter);
      m.position.set(d.x, -d.y, GROUND_Z + 3.2);
      m.scale.set(5.5, 5.5, 1);
    }
  }
  poolPark(P.route, eu.n);
  if (!P.dest) {
    P.dest = new T.Mesh(
      _sharedGeo.ring,
      new T.MeshBasicMaterial({ color: 0x8ecbff, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }),
    );
    adapter.addSceneMesh(P.dest);
  }
  if (_hoverRoute) {
    const g = _hoverRoute.goal;
    const rr = Math.max(g.w, g.h) * 0.62 + 16 + Math.sin(_frame * 0.12) * 6;
    P.dest.visible = true;
    P.dest.position.set(g.x, -g.y, GROUND_Z + 3.6);
    P.dest.scale.set(rr, rr, 1);
  } else {
    P.dest.visible = false;
  }

  // Capture progress rings around the mines.
  const cu = { n: 0 };
  for (const m of _mines) {
    if (!m.alive || m.capTo < 0 || m.capProg <= 0) continue;
    const mesh = poolTake(P.cap, cu, () => new T.Mesh(
      new T.RingGeometry(0.86, 1, 40),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }),
    ), adapter);
    mesh.position.set(m.x, -m.y, GROUND_Z + 2);
    const r = CAP_RADIUS * (0.35 + (m.capProg / 100) * 0.65);
    mesh.scale.set(r, r, 1);
    mesh.material.color.setHex(SIDE_INFO[m.capTo].tint);
  }
  poolPark(P.cap, cu.n);
}

// ── 3D: camera ────────────────────────────────────────────────────────────
const _camM = { m: null, eye: null, look: null, up: null };
function placeCamera3d(camera) {
  const T = _THREE;
  if (!_camM.m) {
    _camM.m = new T.Matrix4();
    _camM.eye = new T.Vector3();
    _camM.look = new T.Vector3();
    _camM.up = new T.Vector3(0, 0, 1);
  }
  if (camera.far < 9000) { camera.near = 8; camera.far = 14000; camera.updateProjectionMatrix(); }
  const pitch = 0.84;
  const d = _camDist3d;
  const fx = _camFocus.x, fy = _camFocus.y;
  const ex = fx - Math.cos(_camYaw3d) * d * Math.cos(pitch);
  const ey = fy - Math.sin(_camYaw3d) * d * Math.cos(pitch);
  const ez = d * Math.sin(pitch) + 30;
  let jx = 0, jy = 0;
  if (_shakeT > 0) { jx = rand(-1, 1) * _shakeT * 0.5; jy = rand(-1, 1) * _shakeT * 0.5; }
  _camM.eye.set(ex + jx, -ey + jy, ez);
  _camEye.x = ex; _camEye.y = -ey;
  _camM.look.set(fx, -fy, 40);
  camera.position.copy(_camM.eye);
  _camM.m.lookAt(_camM.eye, _camM.look, _camM.up);
  camera.quaternion.setFromRotationMatrix(_camM.m);
  camera.updateMatrixWorld();
  _camProj = camera;
  _frame3d = _frame;
}

// ── PixiJS ────────────────────────────────────────────────────────────────
function cssHexInt(c) { return parseInt(c.slice(1, 7), 16); }

// The PixiJS adapter already draws every body, so this layer only paints what
// has no body at all: the ground, the roads, the zones and the effects. It is
// inserted under the adapter's sprite container.
function drawPixiWorld(PIXI, g) {
  g.clear();
  g.rect(0, 0, MAP_W, MAP_H).fill({ color: 0x2c3f2a });
  for (const pass of [{ w: 82, c: 0x4a4436 }, { w: 62, c: 0x5c5341 }]) {
    for (const [a, b] of EDGES) {
      const na = NODES[NODE_IX[a]], nb = NODES[NODE_IX[b]];
      g.moveTo(na.x, na.y).lineTo(nb.x, nb.y)
        .stroke({ color: pass.c, width: pass.w, cap: "round" });
    }
  }
  if (_phase === "play" && _selCard >= 0 && !holdingSpell()) {
    for (const s of _structs) {
      if (!s.alive || s.side !== SIDE_P) continue;
      g.circle(s.x, s.y, s.deployR).fill({ color: 0x5aa9e6, alpha: 0.12 });
    }
  }
  for (const m of _mines) {
    if (!m.alive) continue;
    const col = cssHexInt(SIDE_INFO[m.side].css);
    g.circle(m.x, m.y, CAP_RADIUS).stroke({ color: col, width: 3, alpha: 0.4 });
    if (m.capTo >= 0 && m.capProg > 0) {
      g.circle(m.x, m.y, CAP_RADIUS * (0.35 + (m.capProg / 100) * 0.65))
        .stroke({ color: cssHexInt(SIDE_INFO[m.capTo].css), width: 5 });
    }
  }
  // Solid silhouettes under the adapter's translucent body fills, so a keep
  // reads as stone rather than as a faint wash over the grass.
  for (const t of _terrain) {
    if (t.kind === "edge") continue;
    g.rect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h).fill({ color: 0x57503f });
  }
  for (const s of _structs) {
    if (!s.alive) continue;
    const col = cssHexInt(SIDE_INFO[s.side].css);
    if (s.kind === "keep") {
      g.rect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h)
        .fill({ color: 0x5d5347 }).stroke({ color: col, width: 5 });
    } else {
      g.circle(s.x, s.y, s.r)
        .fill({ color: s.kind === "mine" ? 0x4e4535 : 0x5d5347 })
        .stroke({ color: col, width: 5 });
    }
    if (s.shielded) {
      g.circle(s.x, s.y, Math.max(s.w, s.h) * 0.62).stroke({ color: 0x8ecbff, width: 3, alpha: 0.7 });
    }
  }
  for (const ps of _pendingSpells) {
    const sp = SPELLS[ps.spell];
    const k = 1 - ps.t / ps.T;
    g.circle(ps.x, ps.y, sp.radius).fill({ color: cssHexInt(sp.color), alpha: 0.12 + k * 0.2 })
      .stroke({ color: cssHexInt(sp.color), width: 3 });
  }
  if (_hoverRoute) {
    for (const d of routeDots(_hoverRoute)) g.circle(d.x, d.y, 4.5).fill({ color: 0x8ecbff, alpha: 0.8 });
    const gl = _hoverRoute.goal;
    g.circle(gl.x, gl.y, Math.max(gl.w, gl.h) * 0.62 + 14 + Math.sin(_frame * 0.12) * 5)
      .stroke({ color: 0x8ecbff, width: 4 });
  }
  for (const s of _swings) {
    const k = s.t / s.T;
    const r = s.r * (0.85 + k * 0.3);
    g.moveTo(s.x + Math.cos(s.a - s.arc / 2) * r, s.y + Math.sin(s.a - s.arc / 2) * r)
      .arc(s.x, s.y, r, s.a - s.arc / 2, s.a + s.arc / 2)
      .stroke({ color: cssHexInt(s.color), width: 5 * (1 - k * 0.5), alpha: (1 - k) * 0.8 });
  }
  for (const r of _rings) {
    const k = r.t / r.T;
    g.circle(r.x, r.y, lerp(r.r, r.R, k))
      .stroke({ color: cssHexInt(r.color), width: 3 * (1 - k) + 1, alpha: (1 - k) * 0.85 });
  }
  for (const p of _projs) {
    if (!p.body) continue;
    const px = p.body.position.x, py = p.body.position.y;
    if (p.kind === "shot") g.circle(px, py, p.r).fill({ color: cssHexInt(p.color) });
    else {
      const L = p.kind === "bolt" ? 18 : 12;
      g.moveTo(px - Math.cos(p.angle) * L, py - Math.sin(p.angle) * L)
        .lineTo(px + Math.cos(p.angle) * 4, py + Math.sin(p.angle) * 4)
        .stroke({ color: cssHexInt(p.color), width: p.kind === "bolt" ? 3 : 2 });
    }
  }
  for (const p of _particles) {
    g.circle(p.x, p.y - p.z * 0.5, p.r).fill({ color: cssHexInt(p.color), alpha: 1 - p.t / p.life });
  }
  if (_phase === "play" && _selCard >= 0 && _hoverW.has) {
    const card = heldCard();
    const rr = card?.spell ? SPELLS[card.spell].radius : 46;
    g.circle(_hoverW.x, _hoverW.y, rr)
      .stroke({ color: card?.spell || _hoverW.ok ? 0x8ecbff : 0xff6a55, width: 2.5 });
  }
}

// ── Input ─────────────────────────────────────────────────────────────────
function selectSlot(i) {
  if (_phase !== "play") return;
  _selCard = _selCard === i ? -1 : i;
  _hintT = 0;
}

function updateHover(sx, sy) {
  if (hudHit(sx, sy)) { _hoverW.has = false; return; }
  const w = screenToWorld(sx, sy);
  _hoverW.x = w.x; _hoverW.y = w.y; _hoverW.has = true;
  _hoverW.ok = canDeployAt(SIDE_P, w.x, w.y);
}

function tryDeploy(wx, wy) {
  const cmd = _commanders[SIDE_P];
  if (!cmd) return;
  if (_selCard === HAND_SIZE) {
    if (!leaderReady(cmd)) { toast(cmd.leaderUnit ? "Your commander is already afield" : "Your commander is still mustering", "#ff9a7a"); return; }
    if (!playLeader(cmd, wx, wy)) { toast("Outside your drop zone", "#ff9a7a"); return; }
    _selCard = -1;
    return;
  }
  const card = CARD_BY_ID[cmd.hand[_selCard]];
  if (!card) return;
  const reason = deployReason(cmd, card);
  if (reason) { toast(reason, "#ff9a7a"); return; }
  if (!card.spell && !canDeployAt(SIDE_P, wx, wy)) { toast("Outside your drop zone", "#ff9a7a"); return; }
  if (playCard(cmd, _selCard, wx, wy)) _selCard = -1;
}

function primaryAction() {
  if (_phase === "title") { startMatch(); return true; }
  if (_phase === "win" || _phase === "lose") {
    if (_frame >= _lockUntil) startMatch();
    return true;
  }
  return false;
}

function frontLine() {
  // The midpoint of the closest pair of opposing troops — where the fight is.
  let bx = null, by = null, bd = Infinity;
  for (const a of _units) {
    if (!a.alive || a.side !== SIDE_P) continue;
    for (const b of _units) {
      if (!b.alive || b.side === SIDE_P) continue;
      const d = Math.hypot(ux(a) - ux(b), uy(a) - uy(b));
      if (d < bd) { bd = d; bx = (ux(a) + ux(b)) / 2; by = (uy(a) + uy(b)) / 2; }
    }
  }
  return bx === null ? null : { x: bx, y: by };
}

// ── Demo definition ───────────────────────────────────────────────────────
const PREVENT_KEYS = ["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export default {
  id: "tin-legion",
  label: "Tin Legion",
  tags: ["Gameplay", "AI", "Waypoints", "Sensors", "Groups", "Camera", "Mobile"],
  desc:
    "A <b>lane-siege army builder</b> on one large battlefield: gold trickles in, five troop cards wait at the bottom of the screen, and each one you play drops a squad of tin figurines that marches off on its own. You never steer a soldier — you choose <b>what</b> to field, <b>where</b> to drop it and <b>when</b>; hold a card and the road that squad would take is drawn on the ground, and the side of your gate you drop on picks its lane. Three roads run between the two keeps, a <b>watchtower</b> guards each centre road, and two <b>gold mines</b> sit on the flanks behind neutral camps. A captured mine pays gold and pushes your drop zone forward; a keep is <b>shielded until its own watchtower falls</b>. Ten cards, a free commander, and three difficulty levels for the opposing one. Physics: every figurine is a dynamic circle in a zero-gravity <code>Space</code>, so crowds shove and flow for free; shot is a <b>sensor body</b> delivered by <code>InteractionListener</code>s, with friendly fire ruled out by sensor groups and masks rather than an if-statement; kegs detonate with a real radial impulse, and flyers have their own collision group. In <b>3D</b> it is a grassy plateau floating in mist, with a jointed low-poly rig per troop type.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner || null;
    space.gravity = new Vec2(0, 0);
    buildGraph();
    installListeners(space);
    startMatch();
    _phase = "title";
    _frame = 0;
    // The title sits over the whole battlefield, pulled back far enough to
    // show both keeps; starting a match snaps back to your own gate.
    _camFocus = { x: MAP_W / 2, y: LANE_C };
    _camGoal = { x: MAP_W / 2, y: LANE_C };
    _zoom2d = 0.33;
    _camDist3d = 2000;
    _scene3d = null;
    _pixiApp = null; _pixiDyn = null;
    _frame3d = -1; _camProj = null;
    _keys = {};
    _selCard = -1;
    _hoverW.has = false;

    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Re-entrant setup: the runner has no teardown hook, so drop any listeners
    // a previous play of this demo left on the window.
    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
      _onKeyDown = (e) => {
        if (!_space) return;
        if (e.repeat) { if (PREVENT_KEYS.includes(e.code)) e.preventDefault(); return; }
        _keys[e.code] = true;
        if (/^(Digit|Numpad)[1-5]$/.test(e.code)) {
          const n = Number(e.code.slice(-1)) - 1;
          if (_phase === "play") selectSlot(n);
          else if (n < DIFFICULTIES.length) _difficulty = n;
        }
        switch (e.code) {
          case "Space": case "Enter":
            if (!primaryAction()) selectSlot(HAND_SIZE);
            break;
          case "Escape": _selCard = -1; break;
          case "KeyR": lookAt(_keepOf[SIDE_P]?.x ?? 640, LANE_C); break;
          case "KeyF": { const p = frontLine(); if (p) lookAt(p.x, p.y); break; }
          case "Equal": case "NumpadAdd": zoomBy(-1); break;
          case "Minus": case "NumpadSubtract": zoomBy(1); break;
          default: break;
        }
        if (PREVENT_KEYS.includes(e.code)) e.preventDefault();
      };
      _onKeyUp = (e) => {
        if (!_space) return;
        _keys[e.code] = false;
      };
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  // The demo owns both cameras, so the runner hands plain viewport coords.
  click(x, y) {
    if (_phase === "title") {
      for (let i = 0; i < DIFFICULTIES.length; i++) {
        if (inRect(x, y, diffChipRect(i))) { _difficulty = i; return; }
      }
      primaryAction();
      return;
    }
    if (_phase === "win" || _phase === "lose") { primaryAction(); return; }
    const hit = hudHit(x, y);
    if (hit) {
      if (hit.kind === "card") selectSlot(hit.i);
      else if (hit.kind === "leader") selectSlot(HAND_SIZE);
      else if (hit.kind === "mini") {
        const w = miniToWorld(x, y);
        lookAt(w.x, w.y, true);
        _pointer.active = true; _pointer.mini = true;
      }
      return;
    }
    _pointer.active = true;
    _pointer.mini = false;
    _pointer.moved = false;
    _pointer.x = x; _pointer.y = y;
    _pointer.startX = x; _pointer.startY = y;
    _pointer.camX = _camGoal.x; _pointer.camY = _camGoal.y;
    updateHover(x, y);
  },

  drag(x, y) {
    _pointer.x = x; _pointer.y = y;
    if (_pointer.mini) { const w = miniToWorld(x, y); lookAt(w.x, w.y, true); return; }
    if (_pointer.active) {
      const dx = x - _pointer.startX, dy = y - _pointer.startY;
      if (Math.hypot(dx, dy) > 7) _pointer.moved = true;
      if (_selCard < 0 && _pointer.moved) {
        const k = 1 / viewScale();
        lookAt(_pointer.camX - dx * k, _pointer.camY - dy * k, true);
      }
    }
    updateHover(x, y);
  },

  release() {
    if (_pointer.active && !_pointer.mini && _selCard >= 0 && !hudHit(_pointer.x, _pointer.y)) {
      const w = screenToWorld(_pointer.x, _pointer.y);
      tryDeploy(w.x, w.y);
    }
    _pointer.active = false;
    _pointer.mini = false;
  },

  hover(x, y) { updateHover(x, y); },

  wheel(deltaY) { zoomBy(deltaY); },

  step() { stepWorld(); },

  // Canvas2D — top-down, the demo's own follow camera and zoom.
  render(ctx, space, W, H, showOutlines) {
    ctx.fillStyle = "#10161c";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    const jx = _shakeT > 0 ? rand(-1, 1) * _shakeT * 0.35 : 0;
    const jy = _shakeT > 0 ? rand(-1, 1) * _shakeT * 0.35 : 0;
    ctx.translate(W / 2 + jx, H / 2 + jy);
    ctx.scale(_zoom2d, _zoom2d);
    ctx.translate(-_camFocus.x, -_camFocus.y);
    drawGround2d(ctx);
    drawDeployZone2d(ctx);
    drawRoute2d(ctx);
    ctx.fillStyle = "#57503f";
    for (const t of _terrain) {
      if (t.kind === "edge") continue;
      ctx.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
    }
    for (const t of _terrain) if (t.kind !== "edge") drawBody(ctx, t.body, showOutlines);
    drawStructures2d(ctx);
    const pad = 60 / _zoom2d;
    const vx0 = _camFocus.x - W / 2 / _zoom2d - pad, vx1 = _camFocus.x + W / 2 / _zoom2d + pad;
    const vy0 = _camFocus.y - H / 2 / _zoom2d - pad, vy1 = _camFocus.y + H / 2 / _zoom2d + pad;
    const order = _units
      .filter((u) => u.alive && ux(u) > vx0 && ux(u) < vx1 && uy(u) > vy0 && uy(u) < vy1)
      .sort((a, b) => uy(a) - uy(b));
    for (const u of order) drawUnit2d(ctx, u);
    drawEffects2d(ctx);
    drawGhost2d(ctx);
    ctx.restore();
    void space;
  },

  renderPixi(adapter, space, W, H, showOutlines) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;
    adapter.setOutlines(showOutlines);
    if (_pixiApp !== app || !_pixiDyn || _pixiDyn.parent !== app.stage) {
      if (_pixiDyn?.parent) _pixiDyn.parent.removeChild(_pixiDyn);
      _pixiApp = app;
      _pixiDyn = new PIXI.Graphics();
      app.stage.addChild(_pixiDyn);
    }
    adapter.syncBodies(space);
    drawPixiWorld(PIXI, _pixiDyn);
    // Under the body sprites (the adapter re-adds its container on load).
    app.stage.setChildIndex(_pixiDyn, Math.min(1, app.stage.children.length - 1));
    app.stage.scale.set(_zoom2d);
    app.stage.position.set(W / 2 - _camFocus.x * _zoom2d, H / 2 - _camFocus.y * _zoom2d);
    app.render();
  },

  // 3D — the demo draws everything: bodies are hidden from the adapter's pass
  // and replaced by rigs, buildings and a painted battlefield.
  render3d(renderer, scene, camera, space, W, H, camX, camY, adapter) {
    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    ensureScene(adapter, scene);
    ensureEnvironment(adapter);
    ensureBuildings(adapter);
    ensureFigures(adapter);
    syncBuildings();
    syncFigures();
    syncEffects3d(adapter);
    placeCamera3d(camera);
    syncEnvironment();
    renderer.render(scene, camera);
    void space; void W; void H; void camX; void camY;
  },

  // Every render mode: projected world cues plus the screen-space HUD.
  render3dOverlay(ctx) { drawOverlay(ctx); },
};
