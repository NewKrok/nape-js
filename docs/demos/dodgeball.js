import { Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter } from "../nape-js.esm.js?v=3.40.0";

// ── Dodgeball — 3v3 top-down court, best of 3 rounds ─────────────────────
// A walled court split by a center line only PLAYERS can't cross (a static
// wall collision-filtered to player pucks — balls fly straight over it).
// Four balls start on the line; grab one, walk it up and throw. A thrown
// ball is LIVE until it touches a wall or slows down: a live ball that
// touches an opposing player knocks them out. There is no catching — when
// a ball comes at you, you dodge. Last team with players standing takes
// the round; first to 2 rounds wins the match.

const VIEW_W = 900;
const VIEW_H = 500;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

// Court geometry
const COURT_L = 70;
const COURT_R = 830;
const COURT_T = 50;
const COURT_B = 450;
const WALL_T = 16;
const CENTER_WALL_HALF = 3;            // the player fence on the line is 6px thin
const CENTER_GROUP = 1 << 10;          // collision-group bit of that fence

// Players
const TEAM_SIZE = 3;
const PLAYER_R = 15;
const PLAYER_SPEED = 190;
const CONTROL_BLEND = 0.16;            // soft acceleration → shoves carry through
const PLAYER_DRAG = 0.96;

// Balls
const BALL_COUNT = 4;
const BALL_R = 9;
const BALL_DRAG = 0.987;               // floor friction — deep throws die mid-court
const BALL_MAX_SPEED = 900;

// Throw
const THROW_SPEED = 700;
const THROW_CARRY = 0.25;              // fraction of the thrower's velocity added
const DEAD_SPEED = 180;                // a live ball slower than this goes dead
const WALL_DEAD_PAD = 6;               // live ball this close to a wall goes dead
const THROW_GRACE = 14;                // frames the ball ignores its thrower
const THROW_CD_HUMAN = 18;             // frames
const THROW_CD_AI = 45;
const HIT_REACH = PLAYER_R + BALL_R + 1;

// Grab (pickup carry) — walk into a slow dead ball and it sticks.
const GRAB_RANGE = PLAYER_R + BALL_R + 8;
const GRAB_MAX_BALL_SPEED = 260;       // a live-speed ball can't be scooped up
const GRAB_BREAK = PLAYER_R + BALL_R + 30; // carried ball knocked this far → dropped
const HOLD_DIST = PLAYER_R + BALL_R + 2;   // where the carried ball sits (facing dir)
const HOLD_PULL = 14;                  // per-frame P-gain steering the ball there
const HOLD_PULL_CAP = 520;
const GRAB_CD_AFTER_THROW = 22;        // thrower can't vacuum their own ball back
// A fresh pickup must be carried this long before it can be thrown — the
// "take it back behind the line" rule. Without it the opening rush is a
// point-blank wipe at the center line and rounds end in 3 seconds.
const ARM_FRAMES = 55;

// Match flow
const ROUNDS_TO_WIN = 2;
const OVERTIME_SECONDS = 45;           // the center fence DROPS — no safe half
const ROUND_MAX_SECONDS = 75;          // timeout → more players standing wins
const READY_FRAMES = 75;               // "ROUND n" freeze before each round
const ROUNDEND_FRAMES = 110;           // round-result banner length

// AI tuning ranges (rolled per-AI so the field doesn't move in lockstep)
const AI_SPEED_MIN = 152, AI_SPEED_MAX = 180;
const AI_THROW_ZONE = 210;             // how deep the armed advance pushes toward the line
const AI_ATTACK_RANGE = 330;           // fence up: throw once this close to the victim
const AI_MELEE_RANGE = 260;            // fence down: throw once this close to the victim
const AI_HOLD_MAX = 240;               // frames of hoarding before a forced throw
const AI_REACT_MIN = 70, AI_REACT_MAX = 200; // dodge trigger distance (per-AI skill)
const DODGE_STEP = 130;                // how far a dodge steer target sits sideways

const TEAM_COLORS = ["#58a6ff", "#f85149"]; // blue = you, red = them
const TEAM_NAMES = ["BLUE", "RED"];

// ── Module state (reset in resetGame) ────────────────────────────────────
let _space = null;
let _players = [];        // { body, team, isHuman, alive, speed, throwCd, ... }
let _balls = [];          // { body, holder, liveTeam, graceT, graceBit, trail }
let _fence = null;        // the players-only center wall (dropped in overtime)
let _frame = 0;
let _phase = "ready";     // "ready" | "play" | "roundend" | "over"
let _phaseT = 0;
let _round = 1;
let _rounds = [0, 0];     // round wins per team
let _roundClock = 0;      // frames of play in the current round
let _lastRoundWinner = -1; // -1 = draw (round is replayed)
let _restartLockUntil = 0;
let _sparks = [];         // hit/throw flashes { x, y, t }
let _fades = [];          // knock-out fade-outs { x, y, color, t }
// AI throws queue up during the tick and fire after every AI has moved —
// releasing them mid-loop hands the later-ticking team a free same-frame
// head start on the dodge, which skews win rates measurably.
let _pendingThrows = [];  // { p, aimX, aimY }
let _isTouch = false;

// Input — keyboard plus a single-pointer scheme that works on mobile:
// hold to steer toward the finger, quick tap to throw at the tap point.
// (Same scheme as the sumo-arena/kickoff demos — the runner dispatches a
// single pointer only.)
const _keys = Object.create(null);
let _onKeyDown = null;
let _onKeyUp = null;
const _moveDir = { x: 0, y: 0 };
const _pointer = { active: false, x: 0, y: 0, startX: 0, startY: 0, startFrame: 0 };
const TAP_MAX_FRAMES = 18;
const TAP_MAX_DRIFT = 14;
const STEER_DEADZONE = 14;

// ── Helpers ──────────────────────────────────────────────────────────────
function rand(min, max) {
  return min + Math.random() * (max - min);
}

function humanPlayer() {
  return _players[0];
}

function aliveCount(team) {
  let n = 0;
  for (const p of _players) if (p.alive && p.team === team) n++;
  return n;
}

// Deepest x a puck's center can reach on its own side of the fence.
function lineLimitX(team) {
  return team === 0
    ? CX - CENTER_WALL_HALF - PLAYER_R
    : CX + CENTER_WALL_HALF + PLAYER_R;
}

function heldBall(p) {
  for (const b of _balls) if (b.holder === p) return b;
  return null;
}

function fenceUp() {
  return _fence !== null && _fence.space !== null;
}

function nearestOpponent(team, x, y) {
  let best = null, bestD = Infinity;
  for (const q of _players) {
    if (!q.alive || q.team === team) continue;
    const d = Math.hypot(q.body.position.x - x, q.body.position.y - y);
    if (d < bestD) { bestD = d; best = q; }
  }
  return best;
}

// ── Court construction ───────────────────────────────────────────────────
// Outer walls use the DEFAULT material/filter — balls bounce off them and
// everything collides. The center fence is its OWN static body (it drops in
// overtime) and carries its own group bit; balls exclude that bit from
// their mask, so only pucks are penned in.
function buildCourt(space) {
  const walls = new Body(BodyType.STATIC);
  const rect = (body, x, y, w, h) => {
    const s = new Polygon(Polygon.rect(x, y, w, h));
    body.shapes.add(s);
    return s;
  };
  const w = COURT_R - COURT_L;
  const h = COURT_B - COURT_T;
  rect(walls, COURT_L - WALL_T, COURT_T - WALL_T, w + WALL_T * 2, WALL_T);
  rect(walls, COURT_L - WALL_T, COURT_B, w + WALL_T * 2, WALL_T);
  rect(walls, COURT_L - WALL_T, COURT_T, WALL_T, h);
  rect(walls, COURT_R, COURT_T, WALL_T, h);
  walls.space = space;

  _fence = new Body(BodyType.STATIC);
  const fenceShape = rect(_fence, CX - CENTER_WALL_HALF, COURT_T, CENTER_WALL_HALF * 2, h);
  fenceShape.filter = new InteractionFilter(CENTER_GROUP, -1);
  _fence.space = space;
  return walls;
}

// ── Spawning ─────────────────────────────────────────────────────────────
// The human spawns mid-row on the blue (left) side.
const SPAWN_SPOTS = [
  { x: COURT_L + 120, y: CY },
  { x: COURT_L + 120, y: CY - 120 },
  { x: COURT_L + 120, y: CY + 120 },
  { x: COURT_R - 120, y: CY },
  { x: COURT_R - 120, y: CY - 120 },
  { x: COURT_R - 120, y: CY + 120 },
];

const BALL_SPOTS = [
  { x: CX, y: CY - 135 },
  { x: CX, y: CY - 45 },
  { x: CX, y: CY + 45 },
  { x: CX, y: CY + 135 },
];

function spawnPlayer(idx) {
  const spot = SPAWN_SPOTS[idx];
  const body = new Body(BodyType.DYNAMIC, new Vec2(spot.x, spot.y));
  // Firm, grippy pucks — body contact nudges, the throw does the damage.
  const shape = new Circle(PLAYER_R, undefined, new Material(0.3, 0.05, 0.05, 1));
  // Each player gets a unique collision-group bit so a carried ball can be
  // filtered against JUST its holder (see setBallMask) — otherwise the
  // carry pull rams the ball into the holder and the contact impulses
  // rocket them across the court.
  const groupBit = 2 << idx;
  shape.filter = new InteractionFilter(groupBit, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true;
  body.space = _space;

  const isHuman = idx === 0;
  const team = idx < TEAM_SIZE ? 0 : 1;
  return {
    body,
    groupBit,
    team,
    isHuman,
    alive: true,
    speed: isHuman ? PLAYER_SPEED : rand(AI_SPEED_MIN, AI_SPEED_MAX),
    throwCd: 0,
    grabCd: 0,
    holdT: 0,             // frames spent carrying the current ball (AI hoard cap)
    // Facing — a carried ball rides here; a blind throw fires this way.
    faceX: team === 0 ? 1 : -1,
    faceY: 0,
    // Frame-start velocity snapshot (fed to opponents' lead-aim)
    snapVX: 0,
    snapVY: 0,
    // Per-AI personality
    aggro: rand(0.35, 0.85),          // per-frame gate on in-zone throws
    leadSkill: rand(0.45, 1),         // how well throws lead a moving target
    aimJitter: rand(0.03, 0.14),      // radians of throw scatter
    reactDist: rand(AI_REACT_MIN, AI_REACT_MAX), // how early incoming fire is dodged
    dodgeSide: Math.random() < 0.5 ? 1 : -1,     // preferred side for dead-on threats
    wanderPhase: rand(0, Math.PI * 2),
    wanderFreq: rand(0.012, 0.03),
  };
}

// While carried (or freshly thrown), the ball must NOT collide with its
// holder/thrower; it must never collide with the center fence.
function setBallMask(ball, excludeBit) {
  ball.body.shapes.at(0).filter.collisionMask = ~(CENTER_GROUP | excludeBit);
}

function spawnBall(idx) {
  const spot = BALL_SPOTS[idx];
  const body = new Body(BodyType.DYNAMIC, new Vec2(spot.x, spot.y));
  // Grippy and only mildly bouncy — a wall hit visibly kills the throw.
  const shape = new Circle(BALL_R, undefined, new Material(0.6, 0.05, 0.03, 0.5));
  shape.filter = new InteractionFilter(1, ~CENTER_GROUP);
  body.shapes.add(shape);
  body.isBullet = true; // throws are fast enough to tunnel a puck otherwise
  body.space = _space;
  return { body, holder: null, liveTeam: -1, graceT: 0, graceBit: 0, trail: [] };
}

function placeRound() {
  for (let i = 0; i < _players.length; i++) {
    const p = _players[i];
    p.alive = true;
    if (!p.body.space) p.body.space = _space; // revive last round's casualties
    p.body.position = new Vec2(SPAWN_SPOTS[i].x, SPAWN_SPOTS[i].y);
    p.body.velocity = new Vec2(0, 0);
    p.throwCd = 0;
    p.grabCd = 0;
    p.holdT = 0;
    p.faceX = p.team === 0 ? 1 : -1;
    p.faceY = 0;
  }
  for (let i = 0; i < _balls.length; i++) {
    const b = _balls[i];
    b.holder = null;
    b.liveTeam = -1;
    b.graceT = 0;
    b.graceBit = 0;
    b.trail = [];
    setBallMask(b, 0);
    b.body.position = new Vec2(BALL_SPOTS[i].x, BALL_SPOTS[i].y);
    b.body.velocity = new Vec2(0, 0);
    b.body.angularVel = 0;
  }
  if (_fence && !_fence.space) _fence.space = _space; // overtime dropped it
  _roundClock = 0;
  _phase = "ready";
  _phaseT = READY_FRAMES;
}

function resetGame(space) {
  for (const p of _players) {
    if (p.body?.space) p.body.space = null;
  }
  for (const b of _balls) {
    if (b.body?.space) b.body.space = null;
  }
  _players = [];
  _balls = [];
  _space = space;

  for (let i = 0; i < TEAM_SIZE * 2; i++) _players.push(spawnPlayer(i));
  for (let i = 0; i < BALL_COUNT; i++) _balls.push(spawnBall(i));

  _frame = 0;
  _round = 1;
  _rounds = [0, 0];
  _lastRoundWinner = -1;
  _restartLockUntil = 0;
  _sparks = [];
  _fades = [];
  _pendingThrows = [];

  placeRound();

  _pointer.active = false;
  _moveDir.x = 0; _moveDir.y = 0;
  for (const k in _keys) delete _keys[k];
}

// ── Throw ────────────────────────────────────────────────────────────────
// Fires the carried ball at an aim point. The ball goes LIVE for the
// thrower's team until it touches a wall or slows below DEAD_SPEED.
function tryThrow(p, aimX, aimY) {
  if (p.throwCd > 0 || _phase !== "play" || !p.alive) return false;
  const ball = heldBall(p);
  if (!ball || p.holdT < ARM_FRAMES) return false;

  const bx = ball.body.position.x, by = ball.body.position.y;
  let dx = aimX - bx, dy = aimY - by;
  const d = Math.hypot(dx, dy);
  if (d < 8) { dx = p.faceX; dy = p.faceY; }
  else { dx /= d; dy /= d; }

  const pv = p.body.velocity;
  ball.body.velocity = new Vec2(
    dx * THROW_SPEED + pv.x * THROW_CARRY,
    dy * THROW_SPEED + pv.y * THROW_CARRY,
  );
  ball.holder = null;
  ball.liveTeam = p.team;
  // Brief thrower immunity — the ball launches from inside grab range and
  // must not clip the thrower's own puck on the way out.
  ball.graceT = THROW_GRACE;
  ball.graceBit = p.groupBit;
  setBallMask(ball, p.groupBit);

  p.throwCd = p.isHuman ? THROW_CD_HUMAN : THROW_CD_AI;
  p.grabCd = Math.max(p.grabCd, GRAB_CD_AFTER_THROW);
  p.holdT = 0;
  _sparks.push({ x: bx, y: by, t: 10 });
  return true;
}

// Keyboard throw: auto-aims the nearest standing opponent — positioning and
// timing are the skill, the tap/pointer scheme keeps free aim.
function humanKeyThrow() {
  const p = humanPlayer();
  if (!heldBall(p)) return;
  const target = nearestOpponent(p.team, p.body.position.x, p.body.position.y);
  if (!target) return;
  tryThrow(p, target.body.position.x, target.body.position.y);
}

// ── Knock-out ────────────────────────────────────────────────────────────
function eliminate(p) {
  p.alive = false;
  _fades.push({ x: p.body.position.x, y: p.body.position.y, color: TEAM_COLORS[p.team], t: 0 });
  const held = heldBall(p);
  if (held) {
    held.holder = null;
    setBallMask(held, 0);
  }
  p.body.space = null;
}

// ── Live-ball resolution ─────────────────────────────────────────────────
// Hits are checked before the wall/speed dead-marking so a throw that
// reaches its victim on the same frame it grazes a wall still counts.
function tickLiveBalls() {
  for (const b of _balls) {
    // Thrower-immunity countdown (independent of live state — a dropped
    // grace mask must restore even if the ball dies instantly on a wall).
    if (b.graceT > 0 && !b.holder) {
      if (--b.graceT <= 0) {
        b.graceBit = 0;
        setBallMask(b, 0);
      }
    }
    if (b.liveTeam < 0) continue;

    const bx = b.body.position.x, by = b.body.position.y;
    for (const p of _players) {
      if (!p.alive || p.team === b.liveTeam) continue;
      if (Math.hypot(p.body.position.x - bx, p.body.position.y - by) > HIT_REACH) continue;
      eliminate(p);
      _sparks.push({ x: bx, y: by, t: 14 });
      // One knock-out per throw — the ball drops dead at the impact.
      b.liveTeam = -1;
      const v = b.body.velocity;
      b.body.velocity = new Vec2(v.x * 0.35, v.y * 0.35);
      break;
    }
    if (b.liveTeam < 0) continue;

    const v = b.body.velocity;
    const touchedWall =
      bx < COURT_L + BALL_R + WALL_DEAD_PAD || bx > COURT_R - BALL_R - WALL_DEAD_PAD ||
      by < COURT_T + BALL_R + WALL_DEAD_PAD || by > COURT_B - BALL_R - WALL_DEAD_PAD;
    if (touchedWall || Math.hypot(v.x, v.y) < DEAD_SPEED) b.liveTeam = -1;
  }
}

// ── Grab / carry ─────────────────────────────────────────────────────────
// A slow dead ball sticks to the first eligible player who overlaps it and
// rides in front of them; it stays a live physics body, so a hard shove can
// still knock it loose. There is no stealing — ammo is contested on the
// floor, not in hand.
function tickGrab() {
  if (_phase !== "play") {
    for (const b of _balls) {
      if (b.holder) { b.holder = null; setBallMask(b, 0); }
    }
    return;
  }

  // Drop a carried ball that got punched out of carry range.
  for (const b of _balls) {
    if (!b.holder) continue;
    const d = Math.hypot(
      b.body.position.x - b.holder.body.position.x,
      b.body.position.y - b.holder.body.position.y,
    );
    if (d > GRAB_BREAK || !b.holder.alive) {
      b.holder.grabCd = Math.max(b.holder.grabCd, 30);
      b.holder = null;
      setBallMask(b, 0);
    }
  }

  // Pickups: each free slow ball goes to the nearest overlapping empty-handed
  // player. Near-ties go to the human — the AI teammate snatching your
  // pickup feels terrible.
  for (const b of _balls) {
    if (b.holder || b.liveTeam >= 0) continue;
    const v = b.body.velocity;
    if (Math.hypot(v.x, v.y) > GRAB_MAX_BALL_SPEED) continue;
    const bx = b.body.position.x, by = b.body.position.y;
    let best = null, bestD = GRAB_RANGE;
    for (const p of _players) {
      if (!p.alive || p.grabCd > 0 || heldBall(p)) continue;
      let d = Math.hypot(bx - p.body.position.x, by - p.body.position.y);
      if (p.isHuman) d -= 6;
      if (d < bestD) { best = p; bestD = d; }
    }
    if (best) {
      b.holder = best;
      b.liveTeam = -1;
      best.holdT = 0;
      setBallMask(b, best.groupBit);
    }
  }

  // Carry: steer each held ball toward the spot in front of its holder.
  for (const b of _balls) {
    if (!b.holder) continue;
    const h = b.holder;
    h.holdT++;
    const hx = h.body.position.x + h.faceX * HOLD_DIST;
    const hy = h.body.position.y + h.faceY * HOLD_DIST;
    const hv = h.body.velocity;
    let vx = (hx - b.body.position.x) * HOLD_PULL + hv.x;
    let vy = (hy - b.body.position.y) * HOLD_PULL + hv.y;
    const sp = Math.hypot(vx, vy);
    if (sp > HOLD_PULL_CAP) { vx *= HOLD_PULL_CAP / sp; vy *= HOLD_PULL_CAP / sp; }
    b.body.velocity = new Vec2(vx, vy);
  }
}

// ── Per-player movement ──────────────────────────────────────────────────
function applyControl(p, dirX, dirY) {
  const tvx = dirX * p.speed;
  const tvy = dirY * p.speed;
  const v = p.body.velocity;
  p.body.velocity = new Vec2(
    v.x + (tvx - v.x) * CONTROL_BLEND,
    v.y + (tvy - v.y) * CONTROL_BLEND,
  );
  const mag = Math.hypot(dirX, dirY);
  if (mag > 0.05) { p.faceX = dirX / mag; p.faceY = dirY / mag; }
}

// ── AI ───────────────────────────────────────────────────────────────────
// Nearest live enemy ball actually closing on this puck, or null. "Closing"
// means the ball's velocity points near the puck, inside this AI's personal
// reaction distance — sharper AI notice threats from farther out.
function scanThreat(p) {
  const px = p.body.position.x, py = p.body.position.y;
  let best = null, bestD = Infinity;
  for (const b of _balls) {
    if (b.liveTeam < 0 || b.liveTeam === p.team) continue;
    const v = b.body.velocity;
    const sp = Math.hypot(v.x, v.y);
    if (sp < DEAD_SPEED) continue;
    const rx = px - b.body.position.x, ry = py - b.body.position.y;
    const d = Math.hypot(rx, ry) || 1;
    if (d > p.reactDist) continue;
    const closing = (v.x / sp) * (rx / d) + (v.y / sp) * (ry / d);
    if (closing < 0.7) continue;
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// Would this throw line pass through a teammate first? A blocked throw just
// bounces off a friendly back — hold fire and reposition instead.
function friendlyBlocked(p, fromX, fromY, dirX, dirY, dist) {
  for (const q of _players) {
    if (q === p || !q.alive || q.team !== p.team) continue;
    const rx = q.body.position.x - fromX, ry = q.body.position.y - fromY;
    const along = rx * dirX + ry * dirY;
    if (along < 0 || along > dist) continue;
    const across = Math.abs(rx * dirY - ry * dirX);
    if (across < PLAYER_R + BALL_R + 4) return true;
  }
  return false;
}

function tickAI(p) {
  const px = p.body.position.x, py = p.body.position.y;
  const holding = heldBall(p);

  // 1) Incoming fire trumps everything: step off the ball's flight line.
  const threat = scanThreat(p);
  let tx, ty;
  if (threat) {
    const v = threat.body.velocity;
    const sp = Math.hypot(v.x, v.y) || 1;
    const dirX = v.x / sp, dirY = v.y / sp;
    const rx = px - threat.body.position.x, ry = py - threat.body.position.y;
    // Lateral offset from the flight line — dodge along it, away from the path.
    const along = rx * dirX + ry * dirY;
    let lx = rx - dirX * along, ly = ry - dirY * along;
    const lm = Math.hypot(lx, ly);
    if (lm < 4) {
      // Dead-on shot — no natural side, use this AI's habitual one.
      lx = -dirY * p.dodgeSide; ly = dirX * p.dodgeSide;
    } else {
      lx /= lm; ly /= lm;
    }
    tx = px + lx * DODGE_STEP;
    ty = py + ly * DODGE_STEP;
  } else if (holding) {
    // 2) Carrying: while the ball is still arming, fall back from the line
    // (the classic retreat); once armed, press right up to it (or, with the
    // fence down, charge the victim) and throw close — a short flight is
    // the only thing a good dodger can't beat.
    const target = nearestOpponent(p.team, px, py);
    const armed = p.holdT >= ARM_FRAMES;
    if (target) {
      const ttx = target.body.position.x, tty = target.body.position.y;
      if (!armed && fenceUp()) {
        const half = CX - COURT_L;
        tx = p.team === 0 ? CX - half * 0.5 : CX + half * 0.5;
        ty = py;
      } else if (fenceUp()) {
        tx = p.team === 0 ? CX - rand(40, 150) : CX + rand(40, 150);
        ty = tty;
      } else {
        tx = ttx; ty = tty;
      }

      // Gate on distance to the VICTIM, not to the line — a deep lob is
      // free dodge practice; the AI has to walk its throw up to the fence.
      const targetD = Math.hypot(ttx - px, tty - py);
      const inRange = targetD < (fenceUp() ? AI_ATTACK_RANGE : AI_MELEE_RANGE);
      if (armed && p.throwCd <= 0 && (inRange || p.holdT > AI_HOLD_MAX)) {
        // Lead the target by its velocity over the flight time, scaled by
        // this AI's lead skill, then scatter by its aim jitter. Reads the
        // frame-start velocity SNAPSHOT: live velocity is fresher for
        // whichever team ticks later, and that asymmetry alone skews the
        // AI-vs-AI win rate to ~70/30.
        const d = targetD || 1;
        const tof = d / THROW_SPEED;
        let aimX = ttx + target.snapVX * tof * p.leadSkill;
        let aimY = tty + target.snapVY * tof * p.leadSkill;
        const jitter = (Math.random() * 2 - 1) * p.aimJitter;
        const c = Math.cos(jitter), s = Math.sin(jitter);
        const ax = aimX - px, ay = aimY - py;
        aimX = px + ax * c - ay * s;
        aimY = py + ax * s + ay * c;

        let dirX = aimX - px, dirY = aimY - py;
        const dm = Math.hypot(dirX, dirY) || 1;
        dirX /= dm; dirY /= dm;
        const gate = 0.06 + p.aggro * 0.08 + (p.holdT > AI_HOLD_MAX ? 1 : 0);
        if (!friendlyBlocked(p, px, py, dirX, dirY, d) && Math.random() < gate) {
          _pendingThrows.push({ p, aimX, aimY });
        }
      }
    } else {
      tx = px; ty = py; // round is ending anyway
    }
  } else {
    // 3) Empty-handed: chase the closest free ball on our side of the court
    // (leaning over the line reaches balls resting on it; with the fence
    // down every ball is fair game), yielding when a teammate — the human
    // especially — is clearly first to it.
    let ball = null, ballD = Infinity;
    for (const b of _balls) {
      if (b.holder || b.liveTeam >= 0) continue;
      const bx = b.body.position.x;
      const onOurSide = p.team === 0 ? bx < CX + BALL_R : bx > CX - BALL_R;
      if (fenceUp() && !onOurSide) continue;
      const d = Math.hypot(b.body.position.x - px, b.body.position.y - py);
      if (d >= ballD) continue;
      let mateD = Infinity;
      for (const q of _players) {
        if (q === p || !q.alive || q.team !== p.team || heldBall(q)) continue;
        mateD = Math.min(mateD, Math.hypot(
          q.body.position.x - b.body.position.x,
          q.body.position.y - b.body.position.y,
        ));
      }
      if (mateD < d - 25) continue; // theirs — pick another or hover
      ball = b; ballD = d;
    }

    if (ball) {
      tx = ball.body.position.x;
      ty = ball.body.position.y;
    } else if (!fenceUp()) {
      // Overtime, unarmed, no ammo loose: kite away from the nearest
      // opponent until a ball frees up.
      const opp = nearestOpponent(p.team, px, py);
      if (opp) {
        const ox = px - opp.body.position.x, oy = py - opp.body.position.y;
        const od = Math.hypot(ox, oy) || 1;
        tx = px + (ox / od) * 140;
        ty = py + (oy / od) * 140;
      } else {
        tx = px; ty = py;
      }
    } else {
      // No ammo to be had: hold a mid-depth lane and wait for a loose ball.
      // Hug the line only while the enemy has nothing to punish it with.
      let enemyArmed = false;
      for (const q of _players) {
        if (q.alive && q.team !== p.team && heldBall(q)) { enemyArmed = true; break; }
      }
      for (const b of _balls) {
        if (b.liveTeam >= 0 && b.liveTeam !== p.team) enemyArmed = true;
      }
      const depth = enemyArmed ? 0.45 : 0.22;
      const half = CX - COURT_L;
      tx = p.team === 0 ? CX - half * depth : CX + half * depth;
      ty = py; // keep the current lane; wander adds the drift
    }
  }

  // Keep steer targets reachable: inside the court and, while the fence
  // stands, on our side of it — a target beyond it means grinding the wall
  // forever.
  if (fenceUp()) {
    if (p.team === 0) tx = Math.min(tx, lineLimitX(0));
    else tx = Math.max(tx, lineLimitX(1));
  }
  tx = Math.max(COURT_L + PLAYER_R + 2, Math.min(COURT_R - PLAYER_R - 2, tx));
  ty = Math.max(COURT_T + PLAYER_R + 2, Math.min(COURT_B - PLAYER_R - 2, ty));

  // Light teammate repulsion so the team never stacks on one pixel.
  for (const q of _players) {
    if (q === p || !q.alive || q.team !== p.team) continue;
    const sx = px - q.body.position.x, sy = py - q.body.position.y;
    const sd = Math.hypot(sx, sy);
    if (sd > 1 && sd < 60) { tx += (sx / sd) * 40; ty += (sy / sd) * 40; }
  }

  let dx = tx - px, dy = ty - py;
  const dd = Math.hypot(dx, dy);
  if (dd > 4) { dx /= dd; dy /= dd; } else { dx = 0; dy = 0; }

  // Small wander so the AI reads as alive, not laser-guided — suppressed
  // while dodging, where a wobble can wander back into the flight line.
  p.wanderPhase += p.wanderFreq;
  const wob = threat ? 0 : Math.sin(p.wanderPhase) * 0.2;
  const wx = dx - dy * wob;
  const wy = dy + dx * wob;
  const wm = Math.hypot(wx, wy) || 1;
  applyControl(p, wx / wm, wy / wm);
}

// ── Round flow ───────────────────────────────────────────────────────────
function endRound(winner) {
  _lastRoundWinner = winner;
  if (winner >= 0) _rounds[winner]++;
  _phase = "roundend";
  _phaseT = ROUNDEND_FRAMES;
  if (winner >= 0 && _rounds[winner] >= ROUNDS_TO_WIN) {
    _restartLockUntil = _frame + ROUNDEND_FRAMES + 30;
  }
}

function checkRoundEnd() {
  const a0 = aliveCount(0), a1 = aliveCount(1);
  if (a0 === 0 || a1 === 0) {
    // Both teams wiped on the same frame is a draw — the round is replayed.
    endRound(a0 === a1 ? -1 : a0 === 0 ? 1 : 0);
    return;
  }
  if (_roundClock >= ROUND_MAX_SECONDS * 60) {
    // Timeout: the team with more players standing takes it; a tie replays.
    endRound(a0 === a1 ? -1 : a0 > a1 ? 0 : 1);
  }
}

// ── Effects ──────────────────────────────────────────────────────────────
function tickEffects() {
  for (const s of _sparks) s.t--;
  _sparks = _sparks.filter((s) => s.t > 0);
  for (const f of _fades) f.t++;
  _fades = _fades.filter((f) => f.t < 40);

  for (const b of _balls) {
    const v = b.body.velocity;
    if (b.liveTeam >= 0 && Math.hypot(v.x, v.y) > 240) {
      b.trail.push({ x: b.body.position.x, y: b.body.position.y });
      if (b.trail.length > 8) b.trail.shift();
    } else if (b.trail.length) {
      b.trail.shift();
    }
  }
}

// ── Player input ─────────────────────────────────────────────────────────
function computeMoveDir() {
  let x = 0, y = 0;
  if (_keys["KeyW"] || _keys["ArrowUp"])    y -= 1;
  if (_keys["KeyS"] || _keys["ArrowDown"])  y += 1;
  if (_keys["KeyA"] || _keys["ArrowLeft"])  x -= 1;
  if (_keys["KeyD"] || _keys["ArrowRight"]) x += 1;
  const len = Math.hypot(x, y);
  if (len > 0) {
    _moveDir.x = x / len;
    _moveDir.y = y / len;
    return;
  }
  const p = humanPlayer();
  if (_pointer.active && p.alive) {
    const dx = _pointer.x - p.body.position.x;
    const dy = _pointer.y - p.body.position.y;
    const d = Math.hypot(dx, dy);
    if (d > STEER_DEADZONE) {
      _moveDir.x = dx / d;
      _moveDir.y = dy / d;
      return;
    }
  }
  _moveDir.x = 0;
  _moveDir.y = 0;
}

// ── Rendering ────────────────────────────────────────────────────────────
function drawCourt(ctx) {
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Hardwood floor with a faint team tint on each half.
  ctx.fillStyle = "#161b26";
  ctx.fillRect(COURT_L, COURT_T, COURT_R - COURT_L, COURT_B - COURT_T);
  ctx.fillStyle = "rgba(88,166,255,0.04)";
  ctx.fillRect(COURT_L, COURT_T, CX - COURT_L, COURT_B - COURT_T);
  ctx.fillStyle = "rgba(248,81,73,0.04)";
  ctx.fillRect(CX, COURT_T, COURT_R - CX, COURT_B - COURT_T);

  // Floorboards
  ctx.strokeStyle = "rgba(255,255,255,0.02)";
  ctx.lineWidth = 1;
  for (let y = COURT_T + 25; y < COURT_B; y += 25) {
    ctx.beginPath(); ctx.moveTo(COURT_L, y); ctx.lineTo(COURT_R, y); ctx.stroke();
  }

  // Boundary + attack-zone lines
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(COURT_L, COURT_T, COURT_R - COURT_L, COURT_B - COURT_T);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  for (const x of [CX - AI_THROW_ZONE, CX + AI_THROW_ZONE]) {
    ctx.beginPath(); ctx.moveTo(x, COURT_T); ctx.lineTo(x, COURT_B); ctx.stroke();
  }

  // Center line — the fence players can't cross (faded once it drops).
  ctx.strokeStyle = fenceUp() ? "rgba(230,237,243,0.5)" : "rgba(230,237,243,0.08)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(CX, COURT_T);
  ctx.lineTo(CX, COURT_B);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ball spawn dots on the line
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (const s of BALL_SPOTS) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, p) {
  if (!p.alive) return;
  const x = p.body.position.x, y = p.body.position.y;
  const color = TEAM_COLORS[p.team];
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = color + "44";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = p.isHuman ? 2.5 : 1.5;
  ctx.stroke();

  // Facing nub — where a carried ball rides and a blind throw goes.
  ctx.beginPath();
  ctx.arc(x + p.faceX * (PLAYER_R - 4), y + p.faceY * (PLAYER_R - 4), 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBall(ctx, b) {
  // Motion streak in the throwing team's color while the ball is live.
  const live = b.liveTeam >= 0;
  const trailColor = live ? TEAM_COLORS[b.liveTeam] : "#e6edf3";
  for (let i = 0; i < b.trail.length; i++) {
    const k = (i + 1) / (b.trail.length + 1);
    ctx.beginPath();
    ctx.arc(b.trail[i].x, b.trail[i].y, BALL_R * k * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = trailColor + Math.floor(k * 56).toString(16).padStart(2, "0");
    ctx.fill();
  }

  const x = b.body.position.x, y = b.body.position.y;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = "#e6edf3";
  ctx.fill();
  // A live ball wears the throwing team's color; a held one its holder's.
  ctx.strokeStyle = live ? TEAM_COLORS[b.liveTeam]
    : b.holder ? TEAM_COLORS[b.holder.team] : "#8b949e";
  ctx.lineWidth = live || b.holder ? 2.5 : 1.5;
  ctx.stroke();
  // Rolling seam mark so spin reads visually.
  const rot = b.body.rotation;
  ctx.beginPath();
  ctx.arc(x + Math.cos(rot) * BALL_R * 0.45, y + Math.sin(rot) * BALL_R * 0.45, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#57606a";
  ctx.fill();
}

function drawFades(ctx) {
  for (const f of _fades) {
    const k = 1 - f.t / 40;
    ctx.beginPath();
    ctx.arc(f.x, f.y, Math.max(0.5, PLAYER_R * k), 0, Math.PI * 2);
    ctx.fillStyle = f.color + Math.floor(k * 150).toString(16).padStart(2, "0");
    ctx.fill();
    ctx.beginPath();
    ctx.arc(f.x, f.y, PLAYER_R + (1 - k) * 22, 0, Math.PI * 2);
    ctx.strokeStyle = f.color + Math.floor(k * 120).toString(16).padStart(2, "0");
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawSparks(ctx) {
  for (const s of _sparks) {
    const k = s.t / 14;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5 + (1 - k) * 13, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPlayerMarker(ctx) {
  const p = humanPlayer();
  if (!p.alive) return;
  const x = p.body.position.x, y = p.body.position.y;
  const armed = heldBall(p) !== null && p.holdT >= ARM_FRAMES;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = armed ? "rgba(63,185,80,0.95)" : "rgba(255,255,255,0.55)";
  ctx.lineWidth = armed ? 2.5 : 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("YOU", x, y - PLAYER_R - 8);

  // Auto-aim cue: the opponent a keyboard throw (SPACE) would target.
  if (armed && _phase === "play") {
    const target = nearestOpponent(p.team, x, y);
    if (target) {
      ctx.beginPath();
      ctx.arc(target.body.position.x, target.body.position.y, PLAYER_R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(230,237,243,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawHUD(ctx) {
  // Round score — top center.
  const w = 170, h = 26;
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(CX - w / 2, 8, w, h);
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEAM_COLORS[0];
  ctx.fillText(String(_rounds[0]), CX - 40, 21);
  ctx.fillStyle = "#c9d1d9";
  ctx.fillText("–", CX, 21);
  ctx.fillStyle = TEAM_COLORS[1];
  ctx.fillText(String(_rounds[1]), CX + 40, 21);
  ctx.font = "9px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`ROUND ${_round} · first to ${ROUNDS_TO_WIN} · ${aliveCount(0)}v${aliveCount(1)}`, CX, 40);

  // Overtime warning / status.
  if (_phase === "play") {
    const toDrop = OVERTIME_SECONDS * 60 - _roundClock;
    if (!fenceUp()) {
      const pulse = 0.55 + Math.sin(_frame * 0.12) * 0.25;
      ctx.fillStyle = `rgba(248,81,73,${pulse})`;
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("THE LINE IS DOWN — no safe half!", CX, 54);
    } else if (toDrop <= 5 * 60) {
      ctx.fillStyle = "rgba(210,153,34,0.85)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(`Center line drops in ${Math.ceil(toDrop / 60)}…`, CX, 54);
    }
  }

  // Ammo/status bar — bottom center.
  if (_phase === "play" || _phase === "ready") {
    const p = humanPlayer();
    if (p.alive) {
      const holding = heldBall(p) !== null;
      const armed = holding && p.holdT >= ARM_FRAMES;
      ctx.fillStyle = "rgba(13,17,23,0.7)";
      ctx.fillRect(CX - 90, VIEW_H - 30, 180, 18);
      if (holding && !armed) {
        // Arming progress fill behind the label.
        ctx.fillStyle = "rgba(210,153,34,0.35)";
        ctx.fillRect(CX - 90, VIEW_H - 30, 180 * (p.holdT / ARM_FRAMES), 18);
      }
      ctx.fillStyle = armed ? "#3fb950" : holding ? "#d29922" : "rgba(255,255,255,0.55)";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = armed
        ? (_isTouch ? "THROW READY — TAP A TARGET" : "THROW READY (SPACE)")
        : holding ? "ARMING…" : "GRAB A BALL";
      ctx.fillText(label, CX, VIEW_H - 21);
    } else {
      ctx.fillStyle = "rgba(13,17,23,0.7)";
      ctx.fillRect(CX - 110, VIEW_H - 30, 220, 18);
      ctx.fillStyle = "#f85149";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("OUT! — watching the round", CX, VIEW_H - 21);
    }
  }
}

function drawPointerUI(ctx) {
  const p = humanPlayer();
  if (_pointer.active && p.alive) {
    const px = p.body.position.x, py = p.body.position.y;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(_pointer.x, _pointer.y);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(_pointer.x, _pointer.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (_frame < 420) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hint = _isTouch
      ? "Hold to move · grab a ball, then tap where to throw — no catching, dodge!"
      : "WASD move · SPACE throws at the nearest red (tap to aim free) — no catching, dodge!";
    ctx.fillText(hint, CX, 56);
  }
}

function drawBanners(ctx) {
  if (_phase === "ready") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`ROUND ${_round}`, CX, CY - 78);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Rush the line!", CX, CY - 54);
    return;
  }

  if (_phase === "roundend") {
    const k = Math.min(1, (ROUNDEND_FRAMES - _phaseT) / 12);
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (_lastRoundWinner < 0) {
      ctx.fillStyle = `rgba(210,153,34,${k})`;
      ctx.fillText("DOUBLE KO — round replayed", CX, CY - 70);
    } else {
      ctx.fillStyle = TEAM_COLORS[_lastRoundWinner] + Math.floor(k * 230).toString(16).padStart(2, "0");
      ctx.fillText(`${TEAM_NAMES[_lastRoundWinner]} takes the round!`, CX, CY - 70);
    }
    return;
  }

  if (_phase === "over") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const won = _rounds[0] > _rounds[1];
    ctx.fillStyle = won ? "#3fb950" : "#f85149";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(won ? "Victory!" : "Defeat", CX, CY - 20);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(`Rounds ${_rounds[0]} – ${_rounds[1]}`, CX, CY + 10);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      _isTouch ? "Tap anywhere for a rematch" : "Click or press SPACE for a rematch",
      CX, CY + 36,
    );
  }
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "dodgeball",
  label: "Dodgeball",
  tags: ["Gameplay", "AI", "Momentum", "Zero Gravity", "Mobile"],
  desc:
    "3v3 top-down dodgeball, best of 3 rounds. The center line is a wall only for <b>players</b> — a collision-filtered fence pucks can't cross but balls fly straight over. Four balls start on the line: <b>rush</b>, walk into one to <b>pick it up</b>, carry it a beat to <b>arm</b> it (the classic fall-back-before-you-throw rule), then <b>throw</b> — <b>SPACE</b>/<b>E</b> auto-aims the nearest red, a <b>tap</b> throws exactly where you tap. A thrown ball is <b>live</b> (it wears the thrower's color) until it touches a wall or slows down; a live ball that touches an opponent <b>knocks them out</b>. There is <b>no catching</b> — when a ball comes at you, <b>dodge</b>. Move with <b>WASD</b>/arrows, or on any device <b>hold</b> the pointer to steer and <b>quick-tap</b> to throw. Every AI rolls its own <b>reaction distance, lead-aim skill, throw scatter and aggression</b>, so reds dodge your throws sideways off the flight line and lead yours. Stall too long and at 45s <b>the line drops</b> — the fence body leaves the space and the round turns into a point-blank melee. Last team standing takes the round; first to 2 rounds wins.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    buildCourt(space);
    resetGame(space);

    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Re-entrant setup: drop any listeners left from a previous play of this
    // demo (the runner has no teardown hook on card stop).
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);

    _onKeyDown = (e) => {
      if (!_space) return;
      _keys[e.code] = true;
      if (e.code === "Space" || e.code === "KeyE") {
        // SPACE doubles as rematch once the match is over. The lock swallows
        // presses right after match point so throw-spam can't skip the result.
        if (_phase === "over") {
          if (_frame >= _restartLockUntil) resetGame(_space);
          return;
        }
        humanKeyThrow();
      }
    };
    _onKeyUp = (e) => {
      if (!_space) return;
      _keys[e.code] = false;
    };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  teardown() {
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = null;
    _onKeyUp = null;
    _space = null;
  },

  step() {
    _frame++;

    // Timers + drag. Control velocity is re-applied every frame, so drag only
    // bleeds off shove/bounce momentum, not movement speed.
    for (const p of _players) {
      if (!p.alive) continue;
      if (p.throwCd > 0) p.throwCd--;
      if (p.grabCd > 0) p.grabCd--;
      const v = p.body.velocity;
      p.body.velocity = new Vec2(v.x * PLAYER_DRAG, v.y * PLAYER_DRAG);
    }
    for (const b of _balls) {
      if (b.holder) continue; // the carry pull overrides drag anyway
      const v = b.body.velocity;
      let vx = v.x * BALL_DRAG, vy = v.y * BALL_DRAG;
      const sp = Math.hypot(vx, vy);
      if (sp > BALL_MAX_SPEED) { vx *= BALL_MAX_SPEED / sp; vy *= BALL_MAX_SPEED / sp; }
      b.body.velocity = new Vec2(vx, vy);
    }

    if (_phase === "ready") {
      if (--_phaseT <= 0) _phase = "play";
    } else if (_phase === "play") {
      _roundClock++;
      // Overtime: the center fence drops — no safe half, point-blank throws.
      if (_roundClock === OVERTIME_SECONDS * 60 && fenceUp()) {
        _fence.space = null;
        _sparks.push({ x: CX, y: CY, t: 14 });
      }
      computeMoveDir();
      const human = humanPlayer();
      if (human.alive) applyControl(human, _moveDir.x, _moveDir.y);
      // Frame-start velocity snapshot for the AI lead-aim (see tickAI).
      for (const p of _players) {
        const v = p.body.velocity;
        p.snapVX = v.x;
        p.snapVY = v.y;
      }
      for (const p of _players) {
        if (!p.isHuman && p.alive) tickAI(p);
      }
      // Release the AI throws queued this tick (tryThrow re-validates each).
      for (const t of _pendingThrows) tryThrow(t.p, t.aimX, t.aimY);
      _pendingThrows.length = 0;
    } else if (_phase === "roundend") {
      // Pucks glide, the banner plays — then the next round or match point.
      if (--_phaseT <= 0) {
        if (_rounds[0] >= ROUNDS_TO_WIN || _rounds[1] >= ROUNDS_TO_WIN) {
          _phase = "over";
        } else {
          if (_lastRoundWinner >= 0) _round++;
          placeRound();
        }
      }
    }

    // Runs in every phase — it releases carries outside of play, and in play
    // it must run after control so the hold pull reads this frame's facing.
    tickGrab();
    if (_phase === "play") {
      tickLiveBalls();
      checkRoundEnd();
    }
    tickEffects();
  },

  click(x, y) {
    if (_phase === "over") {
      if (_frame >= _restartLockUntil) resetGame(_space);
      return;
    }
    // Press begins pointer steering; whether it was a tap (→ throw) is
    // decided on release.
    _pointer.active = true;
    _pointer.x = x; _pointer.y = y;
    _pointer.startX = x; _pointer.startY = y;
    _pointer.startFrame = _frame;
  },

  drag(x, y) {
    if (!_pointer.active) return;
    _pointer.x = x;
    _pointer.y = y;
  },

  release() {
    if (!_pointer.active) return;
    _pointer.active = false;
    const held = _frame - _pointer.startFrame;
    const drift = Math.hypot(_pointer.x - _pointer.startX, _pointer.y - _pointer.startY);
    if (held < TAP_MAX_FRAMES && drift < TAP_MAX_DRIFT) {
      tryThrow(humanPlayer(), _pointer.startX, _pointer.startY);
    }
  },

  // Canvas2d: full custom draw — court, players, balls (no default grid).
  render(ctx, space, W, H, showOutlines) {
    drawCourt(ctx);
    for (const p of _players) drawPlayer(ctx, p);
    for (const b of _balls) drawBall(ctx, b);
    void space; void W; void H; void showOutlines;
  },

  // All render modes: HUD, effects, marker, banners. The canvas2d adapter
  // calls this after render(); the three.js/pixi adapters call it after
  // their own body rendering, so the scoreboard stays visible everywhere.
  render3dOverlay(ctx, space, W, H) {
    drawFades(ctx);
    drawSparks(ctx);
    drawPlayerMarker(ctx);
    drawHUD(ctx);
    drawPointerUI(ctx);
    drawBanners(ctx);
    void space; void W; void H;
  },
};
