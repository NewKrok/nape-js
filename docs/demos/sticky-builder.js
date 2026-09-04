import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  DistanceJoint, PivotJoint, InteractionFilter,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ---------------------------------------------------------------------------
// Sticky Builder — physics construction mini-game.
//
// A wide chasm with a low rock pillar separates two platforms — the far one
// elevated, with the beacon hovering above it. The player drags spare
// "blobs" onto a growing truss structure: releasing a blob near at least two
// existing nodes welds it in with soft DistanceJoints (springy struts).
// Spare blobs wander along the struts while they wait. Bridge the chasm
// (the pillar makes a handy mid-span support) and touch the beacon — every
// spare blob still alive then marches home along the struts to the
// connecting node and beams into the beacon. Run out of spare blobs before
// connecting and the level is lost. Grabbing a welded node (with no spare
// blob under the pointer) attaches a springy pivot "hand": yank it and the
// struts stretch, redden and snap — sustained overstretch or one violent
// pull both tear. A node that loses all of its struts pops off as a loose
// blob, so tearing doubles as demolition/recycling (rescue it before it
// rolls into the pit!).
//
// Engine features showcased:
//   * Soft DistanceJoint constraints (stiff=false + frequency/damping) as
//     load-bearing spring struts.
//   * Strain measurement on joints (|dist - rest| / rest) driving a
//     break-under-stress rule and a live stress color ramp.
//   * InteractionFilter groups — blobs collide with the world but never
//     with each other, so the truss can overlap freely.
//   * PivotJoint terrain anchors — only the two seed feet are pinned;
//     everything past them stands, sags and collapses purely through
//     contacts, friction and joints.
// ---------------------------------------------------------------------------

const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 40;

// ── Level geometry ───────────────────────────────────────────────────────
// A wide chasm with a low rock pillar in the middle. The right platform is
// elevated, so the bridge has to climb as it crosses; the pillar offers a
// mid-span resting point for a sagging truss.
const PLATFORM_TOP = 400;                 // left platform surface
const LEFT_EDGE = 260;                    // right edge of the left platform
const RIGHT_EDGE = 660;                   // left edge of the right platform
const RIGHT_TOP = 340;                    // elevated right platform surface
const PILLAR_X = 450;                     // mid-chasm pillar center
const PILLAR_W = 44;
const PILLAR_TOP = 452;                   // pillar surface (below both platforms)
const GOAL = { x: 700, y: 285 };          // beacon hovering above the far platform
const GOAL_RANGE = 60;                    // a node inside this radius connects
const FALL_OFF_Y = SCREEN_H + 40;         // below this, a loose blob is lost

// ── Blob / structure tuning ──────────────────────────────────────────────
const BALL_R = 9;                         // structure node radius
const WALKER_R = 6;                       // wandering spare blob radius
const START_WALKERS = 24;                 // spare-blob budget per level
const GRAB_R = 40;                        // pick-up radius around the pointer
const LINK_RANGE = 90;                    // max strut length at attach time
const MAX_LINKS = 3;                      // new node welds to up to 3 nodes
const MIN_NODE_GAP = BALL_R * 2;          // can't drop a node onto another
const STRUT_FREQ = 12;                    // soft-joint spring frequency (Hz)
const STRUT_DAMP = 0.9;                   // soft-joint damping ratio

// Struts snap when strained: sustained moderate overstretch (a sagging
// span left hanging without support) or a single violent yank both break
// the joint. Strain is |current - rest| / rest, recomputed every step.
// The overload counter decays instead of resetting, so an oscillating
// strut that spends most of its time overstretched still accumulates
// damage — but the brief swing after each weld is forgiven. Tuned so a
// settled, supported bridge (resting strain ≈ 0.11) holds while a long
// unsupported span (persistently ≥ threshold) tears within a second.
const BREAK_STRAIN = 0.18;                // sustained-strain threshold
const BREAK_SUSTAIN = 45;                 // net steps above threshold before snap
const BREAK_INSTANT = 0.6;                // immediate snap threshold

const WALKER_SPEED_MIN = 40;              // px/sec along struts
const WALKER_SPEED_MAX = 75;
const HOME_SPEED = 130;                   // px/sec marching home along struts
const SUCK_SPEED = 240;                   // px/sec toward the beacon on win
const LOSE_DELAY_STEPS = 45;              // grace period before "out of blobs"
const RESTART_LOCK_STEPS = 45;            // ignore clicks right after end

// Blobs share collision group 2 and exclude it from their mask, so they
// collide with platforms (group 1) but pass through each other — the truss
// can overlap and loose blobs never shove the structure.
const BLOB_FILTER_GROUP = 2;

// High friction so the truss feet grip the platform instead of skating into
// the pit; non-zero rollingFriction so loose blobs come to rest instead of
// rolling forever.
const BLOB_ELASTICITY = 0.02;
const BLOB_DYN_FRICTION = 1.4;
const BLOB_STATIC_FRICTION = 2.2;
const BLOB_DENSITY = 0.8;                 // light nodes → gentler cantilever load
const BLOB_ROLL_FRICTION = 0.1;

const BLOB_COLOR_IDX = 2;                 // green palette slot for blob bodies
const BLOB_FILL = "#2ea043";
const BLOB_EYE = "#0d1117";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
let _nodes = [];                          // { body, links: Link[] }
let _links = [];                          // { a, b, joint, rest, strain, over }
// Walker modes: "wander" roams the struts at random; once the beacon
// connects, "home" marches along the struts (BFS shortest path) to the
// tractor node, "approach" flies a rescued loose blob to the nearest node
// to join the march, and "beam" is the final hop from the tractor node
// into the beacon.
let _walkers = [];                        // { mode, link, t, dir, speed, x, y, target }
let _freeBodies = [];                     // loose dynamic blob bodies
let _held = null;                         // { x, y, targets: node[] } while dragging
let _grabbed = null;                      // { body, joint } while yanking a welded node
let _mouse = null;                        // last hover position for highlights

let _phase = "play";                      // "play" | "won" | "lost"
let _connected = false;
let _tractorNode = null;                  // the node that reached the beacon
let _collected = 0;                       // blobs pulled into the beacon
let _best = 0;
let _losePending = 0;
let _restartLockTimer = 0;
let _fx = [];                             // snap rings — { x, y, life }
let _snapCount = 0;                       // struts torn by strain this round
let _tick = 0;                            // animation clock (beacon pulse)
let _lastKeyDown = null;

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

function blobMaterial() {
  return new Material(
    BLOB_ELASTICITY, BLOB_DYN_FRICTION, BLOB_STATIC_FRICTION,
    BLOB_DENSITY, BLOB_ROLL_FRICTION,
  );
}

function blobFilter() {
  return new InteractionFilter(BLOB_FILTER_GROUP, ~BLOB_FILTER_GROUP);
}

function spawnPlatforms() {
  const left = new Body(BodyType.STATIC, new Vec2(LEFT_EDGE / 2, (PLATFORM_TOP + SCREEN_H) / 2));
  left.shapes.add(new Polygon(Polygon.box(LEFT_EDGE, SCREEN_H - PLATFORM_TOP)));
  left.space = _space;

  const rw = SCREEN_W - RIGHT_EDGE;
  const right = new Body(BodyType.STATIC, new Vec2(RIGHT_EDGE + rw / 2, (RIGHT_TOP + SCREEN_H) / 2));
  right.shapes.add(new Polygon(Polygon.box(rw, SCREEN_H - RIGHT_TOP)));
  right.space = _space;

  const pillar = new Body(BodyType.STATIC, new Vec2(PILLAR_X, (PILLAR_TOP + SCREEN_H) / 2));
  pillar.shapes.add(new Polygon(Polygon.box(PILLAR_W, SCREEN_H - PILLAR_TOP)));
  pillar.space = _space;
}

function spawnBlobBody(x, y) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const shape = new Circle(BALL_R, undefined, blobMaterial(), blobFilter());
  body.shapes.add(shape);
  try { body.userData._colorIdx = BLOB_COLOR_IDX; } catch (_) { /* userData may be frozen */ }
  try { body.userData._blob = true; } catch (_) { /* same */ }
  body.space = _space;
  return body;
}

function addNode(x, y) {
  const node = { body: spawnBlobBody(x, y), links: [], anchored: false, pin: null };
  _nodes.push(node);
  return node;
}

// Anchor blobs are pinned to the terrain with a stiff PivotJoint — the
// structure's root. Without them the first cantilevered node simply tips
// the whole seed over the cliff edge (friction resists sliding, not
// tipping). This mirrors how construction levels start from fixed
// attachment points.
function addAnchorNode(x, y) {
  const node = addNode(x, y);
  node.anchored = true;
  node.pin = new PivotJoint(_space.world, node.body, new Vec2(x, y), new Vec2(0, 0));
  node.pin.space = _space;
  try { node.body.userData._colorIdx = 1; } catch (_) { /* userData may be frozen */ }
  return node;
}

function addLink(a, b) {
  const dx = b.body.position.x - a.body.position.x;
  const dy = b.body.position.y - a.body.position.y;
  const rest = Math.max(30, Math.sqrt(dx * dx + dy * dy));
  const joint = new DistanceJoint(
    a.body, b.body, new Vec2(0, 0), new Vec2(0, 0), rest, rest,
  );
  joint.stiff = false;
  joint.frequency = STRUT_FREQ;
  joint.damping = STRUT_DAMP;
  joint.space = _space;
  const link = { a, b, joint, rest, strain: 0, over: 0 };
  a.links.push(link);
  b.links.push(link);
  _links.push(link);
  return link;
}

function addWalkerOnLink(link, t) {
  _walkers.push({
    mode: "wander",
    link,
    t,
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: WALKER_SPEED_MIN + Math.random() * (WALKER_SPEED_MAX - WALKER_SPEED_MIN),
    x: 0, y: 0,
    target: null,
  });
}

function releaseGrab() {
  if (!_grabbed) return;
  if (_grabbed.joint.space) _grabbed.joint.space = null;
  _grabbed = null;
}

function clearWorld() {
  releaseGrab();
  for (const l of _links) if (l.joint.space) l.joint.space = null;
  for (const n of _nodes) {
    if (n.pin && n.pin.space) n.pin.space = null;
    if (n.body.space) n.body.space = null;
  }
  for (const b of _freeBodies) if (b.space) b.space = null;
  _nodes = [];
  _links = [];
  _walkers = [];
  _freeBodies = [];
  _held = null;
  _phase = "play";
  _connected = false;
  _tractorNode = null;
  _collected = 0;
  _losePending = 0;
  _restartLockTimer = 0;
  _fx = [];
  _snapCount = 0;
}

function resetGame() {
  clearWorld();

  // Seed truss: a triangle at the edge of the left platform whose two feet
  // are anchor blobs pinned to the terrain.
  const restY = PLATFORM_TOP - BALL_R;
  const a = addAnchorNode(185, restY);
  const b = addAnchorNode(245, restY);
  const c = addNode(215, restY - 52);
  addLink(a, b);
  addLink(a, c);
  addLink(b, c);

  // The spare-blob budget starts out wandering on the seed triangle.
  for (let i = 0; i < START_WALKERS; i++) {
    addWalkerOnLink(_links[i % _links.length], Math.random());
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function walkerPos(w) {
  if (w.mode === "beam" || w.mode === "approach") return { x: w.x, y: w.y };
  const pa = w.link.a.body.position;
  const pb = w.link.b.body.position;
  const x = pa.x + (pb.x - pa.x) * w.t;
  const y = pa.y + (pb.y - pa.y) * w.t;
  // Ride on top of the strut: offset along the upward-facing perpendicular.
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  let nx = dy / len, ny = -dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const off = WALKER_R + 2;
  return { x: x + nx * off, y: y + ny * off };
}

// Up to MAX_LINKS nearest nodes within strut range of (x, y). A valid weld
// needs at least two targets and clearance from every existing node.
function computeAttachTargets(x, y) {
  const inRange = [];
  for (const n of _nodes) {
    const d = dist(x, y, n.body.position.x, n.body.position.y);
    if (d < MIN_NODE_GAP) return [];   // dropped on top of an existing node
    if (d <= LINK_RANGE) inRange.push({ n, d });
  }
  inRange.sort((p, q) => p.d - q.d);
  return inRange.slice(0, MAX_LINKS).map((p) => p.n);
}

function spareCount() {
  return _walkers.length + _freeBodies.length + (_held ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Structure maintenance
// ---------------------------------------------------------------------------

function removeLink(link, withFx) {
  if (link.joint.space) link.joint.space = null;
  const ia = link.a.links.indexOf(link);
  if (ia >= 0) link.a.links.splice(ia, 1);
  const ib = link.b.links.indexOf(link);
  if (ib >= 0) link.b.links.splice(ib, 1);
  const il = _links.indexOf(link);
  if (il >= 0) _links.splice(il, 1);

  if (withFx) {
    _snapCount++;
    const pa = link.a.body.position, pb = link.b.body.position;
    _fx.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, life: 18 });
  }

  // Re-home walkers riding the vanished strut onto the nearest surviving
  // structure; with the whole truss gone they simply drop as loose blobs.
  for (let i = _walkers.length - 1; i >= 0; i--) {
    const w = _walkers[i];
    if ((w.mode !== "wander" && w.mode !== "home") || w.link !== link) continue;
    const pos = walkerPos(w);
    const home = nearestNodeWithLinks(pos.x, pos.y);
    if (home) {
      const nl = home.links[Math.floor(Math.random() * home.links.length)];
      w.link = nl;
      w.t = nl.a === home ? 0 : 1;
      w.dir = w.t === 0 ? 1 : -1;
    } else {
      _walkers.splice(i, 1);
      const b = spawnBlobBody(pos.x, pos.y);
      _freeBodies.push(b);
    }
  }
}

function nearestNodeWithLinks(x, y) {
  let best = null, bestD = Infinity;
  for (const n of _nodes) {
    if (n.links.length === 0) continue;
    const d = dist(x, y, n.body.position.x, n.body.position.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function updateLinks() {
  const doomed = [];
  for (const link of _links) {
    const pa = link.a.body.position, pb = link.b.body.position;
    const d = dist(pa.x, pa.y, pb.x, pb.y);
    link.strain = Math.abs(d - link.rest) / link.rest;
    if (link.strain > BREAK_INSTANT) {
      doomed.push(link);
    } else if (link.strain > BREAK_STRAIN) {
      if (++link.over >= BREAK_SUSTAIN) doomed.push(link);
    } else {
      link.over = Math.max(0, link.over - 1);
    }
  }
  for (const link of doomed) removeLink(link, true);
}

function updateNodes() {
  for (let i = _nodes.length - 1; i >= 0; i--) {
    const n = _nodes[i];
    if (n.anchored) continue;            // pinned to the terrain, never lost
    // Fell out of the world (dragged down by a collapsing cluster).
    if (n.body.position.y > FALL_OFF_Y) {
      if (_grabbed && _grabbed.body === n.body) releaseGrab();
      for (const link of [...n.links]) removeLink(link, false);
      _nodes.splice(i, 1);
      if (n.body.space) n.body.space = null;
      if (_tractorNode === n) { _tractorNode = null; }
      continue;
    }
    // A node with no struts left is just a loose blob again — reclaim it.
    if (n.links.length === 0) {
      _nodes.splice(i, 1);
      _freeBodies.push(n.body);
      if (_tractorNode === n) { _tractorNode = null; }
    }
  }
  // The beacon holds the connection as long as ANY node stays in range.
  if (_connected && !_tractorNode) {
    _tractorNode = _nodes.find(
      (n) => dist(n.body.position.x, n.body.position.y, GOAL.x, GOAL.y) <= GOAL_RANGE,
    ) ?? null;
  }
}

function updateFreeBodies() {
  for (let i = _freeBodies.length - 1; i >= 0; i--) {
    const b = _freeBodies[i];
    // A ripped-out node still in the player's hand: leave it alone until
    // release — converting it would strand the live grab joint.
    if (_grabbed && _grabbed.body === b) continue;
    const p = b.position;
    if (p.y > FALL_OFF_Y) {              // lost in the pit
      _freeBodies.splice(i, 1);
      if (b.space) b.space = null;
      continue;
    }
    if (_connected) {                    // loose blobs fly to the truss and join the march
      _freeBodies.splice(i, 1);
      if (b.space) b.space = null;
      _walkers.push({
        mode: "approach", link: null, t: 0, dir: 1, speed: 0,
        x: p.x, y: p.y, target: nearestNodeWithLinks(p.x, p.y),
      });
      continue;
    }
    // A loose blob that comes to rest near the truss climbs back on.
    const v = b.velocity;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y);
    if (speed < 40) {
      const home = nearestNodeWithLinks(p.x, p.y);
      if (home && dist(p.x, p.y, home.body.position.x, home.body.position.y) < LINK_RANGE) {
        _freeBodies.splice(i, 1);
        if (b.space) b.space = null;
        const nl = home.links[Math.floor(Math.random() * home.links.length)];
        addWalkerOnLink(nl, nl.a === home ? 0 : 1);
      }
    }
  }
}

// BFS hop counts from every reachable node to the tractor node — the
// homing walkers follow this gradient downhill along the struts.
function hopsToTractor() {
  const hops = new Map();
  if (!_tractorNode) return hops;
  hops.set(_tractorNode, 0);
  const queue = [_tractorNode];
  while (queue.length) {
    const n = queue.shift();
    const d = hops.get(n);
    for (const link of n.links) {
      const other = link.a === n ? link.b : link.a;
      if (!hops.has(other)) {
        hops.set(other, d + 1);
        queue.push(other);
      }
    }
  }
  return hops;
}

// The strut out of `node` whose far end is closest (in hops) to the
// tractor node. Falls back to any strut when the map has no path.
function pickHomeLink(node, hops) {
  let best = null, bestH = Infinity;
  for (const link of node.links) {
    const other = link.a === node ? link.b : link.a;
    const h = hops.has(other) ? hops.get(other) : Infinity;
    if (h < bestH) { bestH = h; best = link; }
  }
  if (!best && node.links.length > 0) best = node.links[0];
  return best;
}

function beamFrom(w, x, y) {
  w.mode = "beam";
  w.x = x;
  w.y = y;
}

function updateWalkers(dt) {
  const hops = _connected ? hopsToTractor() : null;

  for (let i = _walkers.length - 1; i >= 0; i--) {
    const w = _walkers[i];

    // Beacon connected: wanderers stop drifting and march home instead.
    if (_connected && w.mode === "wander") {
      w.mode = "home";
      w.speed = HOME_SPEED;
    }

    if (w.mode === "beam") {
      const d = dist(w.x, w.y, GOAL.x, GOAL.y);
      if (d < 12) {
        _walkers.splice(i, 1);
        _collected++;
        if (_collected > _best) _best = _collected;
        continue;
      }
      const step = SUCK_SPEED * dt;
      w.x += ((GOAL.x - w.x) / d) * step;
      w.y += ((GOAL.y - w.y) / d) * step;
      continue;
    }

    if (w.mode === "approach") {
      // Fly a rescued loose blob to its entry node, then continue on foot.
      if (!w.target || w.target.links.length === 0) {
        w.target = nearestNodeWithLinks(w.x, w.y);
        if (!w.target) { beamFrom(w, w.x, w.y); continue; }
      }
      const tp = w.target.body.position;
      const d = dist(w.x, w.y, tp.x, tp.y);
      const step = SUCK_SPEED * dt;
      if (d <= step) {
        const node = w.target;
        w.target = null;
        if (node === _tractorNode) { beamFrom(w, tp.x, tp.y); continue; }
        const entry = hops ? pickHomeLink(node, hops) : null;
        if (!entry) { beamFrom(w, tp.x, tp.y); continue; }
        w.mode = "home";
        w.speed = HOME_SPEED;
        w.link = entry;
        w.t = entry.a === node ? 0 : 1;
        w.dir = w.t === 0 ? 1 : -1;
        continue;
      }
      w.x += ((tp.x - w.x) / d) * step;
      w.y += ((tp.y - w.y) / d) * step;
      continue;
    }

    // On a strut ("wander" | "home"): advance along it.
    const pa = w.link.a.body.position, pb = w.link.b.body.position;
    const len = dist(pa.x, pa.y, pb.x, pb.y) || 1;

    if (w.mode === "home") {
      // Head toward whichever end of the current strut is closer to the
      // tractor node; a walker cut off from the structure beams straight in.
      const ha = hops.has(w.link.a) ? hops.get(w.link.a) : Infinity;
      const hb = hops.has(w.link.b) ? hops.get(w.link.b) : Infinity;
      if (ha === Infinity && hb === Infinity) {
        const pos = walkerPos(w);
        beamFrom(w, pos.x, pos.y);
        continue;
      }
      if (hb < ha) w.dir = 1;
      else if (ha < hb) w.dir = -1;
    }

    w.t += (w.dir * w.speed * dt) / len;
    if (w.t >= 1 || w.t <= 0) {
      const node = w.t >= 1 ? w.link.b : w.link.a;
      if (w.mode === "home" && node === _tractorNode) {
        const p = node.body.position;
        beamFrom(w, p.x, p.y);
        continue;
      }
      const next = w.mode === "home"
        ? pickHomeLink(node, hops)
        : node.links[Math.floor(Math.random() * node.links.length)];
      if (next) {
        w.link = next;
        w.t = next.a === node ? 0 : 1;
        w.dir = w.t === 0 ? 1 : -1;
      } else {
        w.t = Math.max(0, Math.min(1, w.t));
        w.dir = -w.dir;
      }
    }
  }
}

function checkGoal() {
  if (_connected) return;
  for (const n of _nodes) {
    if (dist(n.body.position.x, n.body.position.y, GOAL.x, GOAL.y) <= GOAL_RANGE) {
      _connected = true;
      _tractorNode = n;
      _losePending = 0;
      releaseGrab();                     // hands off during the tractor beam
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "sticky-builder",
  label: "Sticky Builder",
  tags: ["DistanceJoint", "Soft Constraints", "Building", "Drag", "Gameplay"],
  featured: false,
  desc:
    "Physics construction game. <b>Drag</b> a spare blob near the truss and <b>release</b> to weld it in " +
    "with springy <b>DistanceJoint</b> struts (soft constraints — <code>stiff=false</code>). " +
    "Bridge the wide chasm — a mid-span rock pillar helps — and reach the beacon above the far " +
    "platform before the spare blobs run out; on connect the survivors march home along the struts. " +
    "Struts show live <b>strain</b> and snap when overstretched — <b>yank</b> a welded node " +
    "(springy <b>PivotJoint</b> hand) to tear the truss apart and reclaim its blob. " +
    "The seed's feet are pinned with <b>PivotJoint</b> anchors, and blobs never collide " +
    "with each other thanks to <b>InteractionFilter</b> groups.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 600);

    spawnPlatforms();
    resetGame();
    _mouse = null;
    _tick = 0;

    // Keyboard: R restarts anytime (also confirms the win/lose overlay).
    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      _lastKeyDown = (e) => {
        if (e.code !== "KeyR") return;
        e.preventDefault();
        if (_phase === "play" || _restartLockTimer <= 0) resetGame();
      };
      window.addEventListener("keydown", _lastKeyDown);
    }
  },

  step() {
    _tick++;
    if (_restartLockTimer > 0) _restartLockTimer--;
    for (let i = _fx.length - 1; i >= 0; i--) {
      if (--_fx[i].life <= 0) _fx.splice(i, 1);
    }
    if (_phase !== "play") return;

    updateLinks();
    updateNodes();
    updateFreeBodies();
    updateWalkers(1 / 60);
    checkGoal();

    if (_connected && _walkers.length === 0 && _freeBodies.length === 0 && !_held) {
      _phase = "won";
      _restartLockTimer = RESTART_LOCK_STEPS;
      return;
    }
    if (!_connected && spareCount() === 0) {
      if (++_losePending >= LOSE_DELAY_STEPS) {
        _phase = "lost";
        _restartLockTimer = RESTART_LOCK_STEPS;
      }
    } else {
      _losePending = 0;
    }
  },

  click(x, y) {
    if (_phase !== "play") {
      if (_restartLockTimer <= 0) resetGame();
      return;
    }
    if (_connected) return;              // hands off during the tractor beam

    // Grab the nearest spare blob (walker or loose body) under the pointer.
    let bestWalker = -1, bestFree = -1, bestD = GRAB_R;
    for (let i = 0; i < _walkers.length; i++) {
      if (_walkers[i].mode !== "wander") continue;
      const p = walkerPos(_walkers[i]);
      const d = dist(x, y, p.x, p.y);
      if (d < bestD) { bestD = d; bestWalker = i; bestFree = -1; }
    }
    for (let i = 0; i < _freeBodies.length; i++) {
      const p = _freeBodies[i].position;
      const d = dist(x, y, p.x, p.y);
      if (d < bestD) { bestD = d; bestFree = i; bestWalker = -1; }
    }

    if (bestWalker >= 0) {
      _walkers.splice(bestWalker, 1);
    } else if (bestFree >= 0) {
      const b = _freeBodies.splice(bestFree, 1)[0];
      if (b.space) b.space = null;
    } else {
      // No spare under the pointer — yank a welded node instead. A springy
      // pivot "hand" lets the player stress the truss for real: pulled
      // struts stretch, redden and snap, and a node that loses every strut
      // pops off as a reclaimable loose blob (demolition!). Anchors are
      // pinned to the terrain and can't be yanked.
      let node = null, nodeD = GRAB_R;
      for (const n of _nodes) {
        if (n.anchored) continue;
        const d = dist(x, y, n.body.position.x, n.body.position.y);
        if (d < nodeD) { nodeD = d; node = n; }
      }
      if (!node) return;
      const joint = new PivotJoint(_space.world, node.body, new Vec2(x, y), new Vec2(0, 0));
      joint.stiff = false;
      joint.frequency = 20;
      joint.damping = 1.2;
      joint.space = _space;
      _grabbed = { body: node.body, joint };
      return;
    }
    _held = { x, y, targets: computeAttachTargets(x, y) };
  },

  drag(x, y) {
    _mouse = { x, y };
    if (_grabbed) {
      _grabbed.joint.anchor1 = new Vec2(x, y);
      return;
    }
    if (!_held) return;
    _held.x = x;
    _held.y = y;
    _held.targets = computeAttachTargets(x, y);
  },

  release() {
    if (_grabbed) {
      releaseGrab();
      return;
    }
    if (!_held) return;
    const { x, y, targets } = _held;
    _held = null;
    if (_phase !== "play") return;

    if (targets.length >= 2) {
      // Weld in: new node + soft struts to each nearby node.
      const node = addNode(x, y);
      for (const target of targets) addLink(node, target);
    } else {
      // No weld — the blob hops back onto the truss instead of being
      // dropped (mis-releases shouldn't cost a blob; only structural
      // collapse feeds the pit).
      const home = nearestNodeWithLinks(x, y);
      if (home) {
        const nl = home.links[Math.floor(Math.random() * home.links.length)];
        addWalkerOnLink(nl, nl.a === home ? 0 : 1);
      } else {
        _freeBodies.push(spawnBlobBody(x, y));
      }
    }
  },

  hover(x, y) {
    _mouse = { x, y };
  },

  // Headless-test hook (Node smoke tests) — not a DemoRunner callback and
  // not included in generated CodePen/StackBlitz previews.
  _testState() {
    return {
      phase: _phase, connected: _connected, collected: _collected,
      nodes: _nodes, links: _links, walkers: _walkers, freeBodies: _freeBodies,
      spare: spareCount(), walkerPos, snaps: _snapCount,
    };
  },

  render(ctx, space, W, H, showOutlines) {
    drawGrid(ctx, W, H, 0, 0);
    drawGoal(ctx);
    drawLinks(ctx);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    drawBlobFaces(ctx);
    drawWalkers(ctx);
    drawHeld(ctx);
    drawFx(ctx);
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS render bodies natively; everything game-specific is
  // painted on the shared overlay canvas.
  render3dOverlay(ctx, space, W, H) {
    drawGoal(ctx);
    drawLinks(ctx);
    drawBlobFaces(ctx);
    drawWalkers(ctx);
    drawHeld(ctx);
    drawFx(ctx);
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Rendering — goal beacon, struts, blobs, HUD
// ---------------------------------------------------------------------------

function strainColor(strain) {
  // Green → amber → red as the strut approaches its breaking point.
  const t = Math.max(0, Math.min(1, strain / BREAK_STRAIN));
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const from = [63, 185, 80], to = [248, 81, 73];
  return `rgb(${lerp(from[0], to[0])},${lerp(from[1], to[1])},${lerp(from[2], to[2])})`;
}

function drawGoal(ctx) {
  const pulse = 1 + 0.08 * Math.sin(_tick * 0.08);

  // Capture ring
  ctx.strokeStyle = _connected ? "rgba(63,185,80,0.5)" : "rgba(88,166,255,0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(GOAL.x, GOAL.y, GOAL_RANGE * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Beacon orb
  const grad = ctx.createRadialGradient(GOAL.x, GOAL.y, 2, GOAL.x, GOAL.y, 22);
  grad.addColorStop(0, _connected ? "rgba(126,231,135,0.95)" : "rgba(88,166,255,0.9)");
  grad.addColorStop(1, "rgba(88,166,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(GOAL.x, GOAL.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = _connected ? "#7ee787" : "#58a6ff";
  ctx.beginPath();
  ctx.arc(GOAL.x, GOAL.y, 7 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Tractor line to the connecting node
  if (_connected && _tractorNode) {
    const p = _tractorNode.body.position;
    ctx.strokeStyle = "rgba(126,231,135,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(GOAL.x, GOAL.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawLinks(ctx) {
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const link of _links) {
    const pa = link.a.body.position, pb = link.b.body.position;
    ctx.strokeStyle = strainColor(link.strain);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

function drawEyes(ctx, x, y, r) {
  const e = Math.max(1.4, r * 0.22);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.2, e, 0, Math.PI * 2);
  ctx.arc(x + r * 0.34, y - r * 0.2, e, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BLOB_EYE;
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.2, e * 0.5, 0, Math.PI * 2);
  ctx.arc(x + r * 0.34, y - r * 0.2, e * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBlobFaces(ctx) {
  for (const n of _nodes) {
    const p = n.body.position;
    if (n.anchored) {
      // Ground stake under the anchor blobs.
      ctx.strokeStyle = "#d29922";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + BALL_R);
      ctx.lineTo(p.x, PLATFORM_TOP + 8);
      ctx.stroke();
    }
    drawEyes(ctx, p.x, p.y, BALL_R);
  }
  for (const b of _freeBodies) drawEyes(ctx, b.position.x, b.position.y, BALL_R);
}

function drawWalkers(ctx) {
  for (const w of _walkers) {
    const p = walkerPos(w);
    ctx.fillStyle = BLOB_FILL;
    ctx.beginPath();
    ctx.arc(p.x, p.y, WALKER_R, 0, Math.PI * 2);
    ctx.fill();
    drawEyes(ctx, p.x, p.y, WALKER_R);
  }
  // Grab hint: ring the nearest pick-up target under the pointer.
  if (_mouse && !_held && _phase === "play" && !_connected) {
    let best = null, bestD = GRAB_R;
    for (const w of _walkers) {
      if (w.mode !== "wander") continue;
      const p = walkerPos(w);
      const d = dist(_mouse.x, _mouse.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    for (const b of _freeBodies) {
      const d = dist(_mouse.x, _mouse.y, b.position.x, b.position.y);
      if (d < bestD) { bestD = d; best = { x: b.position.x, y: b.position.y }; }
    }
    if (best) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(best.x, best.y, WALKER_R + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (!_grabbed) {
      // No spare in reach — hint that a welded node can be yanked instead.
      let node = null, nodeD = GRAB_R;
      for (const n of _nodes) {
        if (n.anchored) continue;
        const d = dist(_mouse.x, _mouse.y, n.body.position.x, n.body.position.y);
        if (d < nodeD) { nodeD = d; node = n; }
      }
      if (node) {
        const p = node.body.position;
        ctx.strokeStyle = "rgba(240,136,62,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, BALL_R + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

function drawHeld(ctx) {
  if (_grabbed) {
    // Yank line from the pointer to the grabbed node.
    const p = _grabbed.body.position;
    const a = _grabbed.joint.anchor1;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#f0883e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, BALL_R + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (!_held) return;
  const ok = _held.targets.length >= 2;

  // Preview struts
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = ok ? "rgba(63,185,80,0.8)" : "rgba(139,148,158,0.5)";
  for (const t of _held.targets) {
    const p = t.body.position;
    ctx.beginPath();
    ctx.moveTo(_held.x, _held.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // The blob in hand
  ctx.fillStyle = BLOB_FILL;
  ctx.beginPath();
  ctx.arc(_held.x, _held.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ok ? "#3fb950" : "#8b949e";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawEyes(ctx, _held.x, _held.y, BALL_R);
}

function drawFx(ctx) {
  for (const f of _fx) {
    const t = 1 - f.life / 18;
    ctx.strokeStyle = `rgba(248,81,73,${(1 - t).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4 + t * 20, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Blobs ${spareCount()}`, 16, HUD_H / 2);

  ctx.textAlign = "right";
  ctx.fillStyle = "#8b949e";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Nodes ${_nodes.length} · Struts ${_links.length}`, W - 16, HUD_H / 2);

  ctx.textAlign = "center";
  ctx.fillStyle = "#58a6ff";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(
    _connected ? "Connected! Collecting blobs…" : "Drag blobs to build · yank nodes to tear · R restarts",
    W / 2, HUD_H / 2,
  );

  if (_phase === "play") return;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (_phase === "won") {
    ctx.fillStyle = "#7ee787";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("Beacon reached!", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(`Blobs collected ${_collected}  ·  Best ${_best}`, W / 2, H / 2 + 6);
  } else {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("Out of blobs", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("The chasm keeps what it catches.", W / 2, H / 2 + 6);
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    _restartLockTimer > 0 ? "…" : "Click / tap or press R to restart",
    W / 2, H / 2 + 32,
  );
}
