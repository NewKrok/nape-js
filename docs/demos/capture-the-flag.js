import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.40.0";

// ── Capture the Flag — 3v3 top-down arena ────────────────────────────────
// Two bases, two flags, six pucks. Run into the enemy flag to pick it up,
// carry it back into your own base circle to score — but only while your
// OWN flag sits at home, so defense matters as much as the raid. A dash
// (SPACE / quick tap) is both escape and tackle: dashing into an opponent
// staggers them and always knocks a carried flag loose. Momentum shoves,
// mid-field cover blocks, sprint stamina and per-AI personalities carry
// over from the kickoff / dodgeball / sumo demos. First to 3 captures.

const VIEW_W = 900;
const VIEW_H = 500;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

// Field geometry
const FIELD_L = 70;
const FIELD_R = 830;
const FIELD_T = 50;
const FIELD_B = 450;
const WALL_T = 16;

// Bases — score by standing in your own circle with the enemy flag.
const BASE_X = [150, 750];             // blue base, red base
const BASE_R = 58;

// Mid-field cover — symmetric static blocks that break sight lines and turn
// straight chases into cornering duels. { rects, circles } drawn + collided.
const COVER_RECTS = [
  { x: CX - 45, y: CY - 158, w: 90, h: 24 },
  { x: CX - 45, y: CY + 134, w: 90, h: 24 },
];
const COVER_CIRCLES = [
  { x: CX - 175, y: CY, r: 26 },
  { x: CX + 175, y: CY, r: 26 },
];

// Players
const TEAM_SIZE = 3;
const PLAYER_R = 15;
const PLAYER_SPEED = 185;
const CONTROL_BLEND = 0.16;            // soft acceleration → shoves carry through
const PLAYER_DRAG = 0.96;
const CARRIER_SPEED_MULT = 0.95;       // the flag is heavy — carriers can be run down

// Sprint & stamina — same scheme as the kickoff/dodgeball demos: SHIFT (or
// pushing the pointer far from your puck) sprints on a tank that burns in
// ~2.5s and refills in ~6s; drain it fully and you're winded until 30%.
const SPRINT_MULT = 1.45;
const STAMINA_DRAIN = 1 / 150;
const STAMINA_REGEN = 1 / 360;
const WINDED_RECOVER = 0.3;
const TIRED_SPEED_FLOOR = 0.85;        // base speed multiplier at empty stamina
const SPRINT_POINTER_DIST = 150;       // touch scheme: push the finger far = sprint

// Dash (the tackle / escape ability) — same feel as the sumo-arena lunge.
const DASH_SPEED = 620;
const DASH_FRAMES = 10;
const DASH_COOLDOWN = 90;              // player cooldown (frames)
const KNOCK_BONUS = 240;               // extra velocity injected into dash victims
const STAGGER_FRAMES = 20;             // victim loses control briefly
const DASH_REACH = PLAYER_R * 2 + 4;

// Flags — pure game objects, not physics bodies: carried flags ride their
// carrier, dropped ones slide out with a hand-integrated skid and stop.
const FLAG_PICKUP_RANGE = PLAYER_R + 12;
const FLAG_RETURN_SECONDS = 10;        // a dropped flag walks home on its own
const FLAG_DROP_SPEED = 220;           // pop-loose velocity on a tackle
const FLAG_SKID_DRAG = 0.9;            // per-frame decay of a dropped flag's slide
const STRIP_CHANCE = 0.012;            // per frame while an opponent overlaps a carrier
const PICKUP_CD_AFTER_DROP = 30;       // frames the loser can't instantly re-grab

// Match flow
const WIN_SCORE = 3;
const MATCH_SECONDS = 150;             // full time — leader wins, tie → sudden death
const SUDDEN_MAX_SECONDS = 60;         // still level after this → draw
const READY_FRAMES = 70;               // control freeze after every reset
const CAPTURE_FRAMES = 110;            // celebration length before the reset

// AI tuning ranges (rolled per-AI so the six pucks don't move in lockstep)
const AI_SPEED_MIN = 152, AI_SPEED_MAX = 176;
const AI_DASH_CD_MIN = 120, AI_DASH_CD_MAX = 260;
const AI_DASH_RANGE = 70;              // chase dash considered inside this
const ESCORT_DIST = 90;                // escort holds this far from the carrier

const TEAM_COLORS = ["#58a6ff", "#f85149"]; // blue = you, red = them

// ── Module state (reset in resetGame) ────────────────────────────────────
let _space = null;
let _players = [];        // { body, team, isHuman, role, speed, ... }
let _flags = [];          // per team: { team, state, x, y, vx, vy, carrier, ... }
let _frame = 0;
let _phase = "ready";     // "ready" | "play" | "capture" | "over"
let _phaseT = 0;
let _score = [0, 0];
let _lastScorer = 0;      // team index of the most recent capture
let _clock = 0;           // frames of actual play time elapsed
let _sudden = false;      // full time at a tie — next capture wins
let _restartLockUntil = 0;
let _sparks = [];         // dash/tackle flashes { x, y, t }
let _isTouch = false;

// Input — keyboard plus a single-pointer scheme that works on mobile:
// hold to steer toward the finger, quick tap to dash toward the tap.
// (Same scheme as the sumo-arena/kickoff/dodgeball demos.)
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

function baseX(team) {
  return BASE_X[team];
}

function enemyFlag(p) {
  return _flags[1 - p.team];
}

function ownFlag(p) {
  return _flags[p.team];
}

// ── Field construction ───────────────────────────────────────────────────
// One static body holds every wall and cover block. Everything uses the
// DEFAULT material on purpose: dynamic-vs-Polygon pairs with explicit
// materials are a known engine trap (P53) best avoided entirely.
function buildField(space) {
  const walls = new Body(BodyType.STATIC);
  const rect = (x, y, w, h) => walls.shapes.add(new Polygon(Polygon.rect(x, y, w, h)));
  const fieldW = FIELD_R - FIELD_L;
  const fieldH = FIELD_B - FIELD_T;

  rect(FIELD_L - WALL_T, FIELD_T - WALL_T, fieldW + WALL_T * 2, WALL_T);
  rect(FIELD_L - WALL_T, FIELD_B, fieldW + WALL_T * 2, WALL_T);
  rect(FIELD_L - WALL_T, FIELD_T, WALL_T, fieldH);
  rect(FIELD_R, FIELD_T, WALL_T, fieldH);

  for (const c of COVER_RECTS) rect(c.x, c.y, c.w, c.h);
  for (const c of COVER_CIRCLES) walls.shapes.add(new Circle(c.r, new Vec2(c.x, c.y)));

  walls.space = space;
  return walls;
}

// ── Spawning ─────────────────────────────────────────────────────────────
// Blue column on the left, red on the right; the human takes the middle slot.
function spawnSpot(team, idx) {
  const x = team === 0 ? BASE_X[0] + 60 : BASE_X[1] - 60;
  const y = CY + (idx - 1) * 90;
  return { x, y };
}

function spawnPlayer(team, idx) {
  const spot = spawnSpot(team, idx);
  const body = new Body(BodyType.DYNAMIC, new Vec2(spot.x, spot.y));
  // Firm, grippy pucks — shoves should read as momentum, not pinball.
  body.shapes.add(new Circle(PLAYER_R, undefined, new Material(0.3, 0.05, 0.05, 1)));
  body.allowRotation = false;
  body.isBullet = true; // dash speeds are high enough to tunnel otherwise
  body.space = _space;

  const isHuman = team === 0 && idx === 1;
  return {
    body,
    team,
    idx,
    isHuman,
    // Base jobs: 0 = raid, 1 = mid, 2 = guard. The human replaces the blue
    // mid, so the two AI teammates cover raid and guard.
    role: ["raid", "mid", "guard"][idx],
    speed: isHuman ? PLAYER_SPEED : rand(AI_SPEED_MIN, AI_SPEED_MAX),
    faceX: team === 0 ? 1 : -1,
    faceY: 0,
    // Dash
    dashCd: isHuman ? 0 : rand(60, 200), // AI opening dashes trickle in
    dashTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
    dashHits: null,       // Set of players already knocked by the active dash
    stagger: 0,
    pickupCd: 0,          // just-tackled players can't instantly re-grab
    // Sprint & stamina
    stamina: 1,
    winded: false,
    sprinting: false,
    // Per-AI personality
    aggro: rand(0.4, 0.85),           // per-frame gate on dash opportunities
    wanderPhase: rand(0, Math.PI * 2),
    wanderFreq: rand(0.012, 0.03),
  };
}

function makeFlag(team) {
  return {
    team,
    state: "home",        // "home" | "carried" | "dropped"
    x: baseX(team),
    y: CY,
    vx: 0,
    vy: 0,
    carrier: null,
    returnT: 0,           // frames left before a dropped flag walks home
  };
}

function resetFlag(flag) {
  flag.state = "home";
  flag.x = baseX(flag.team);
  flag.y = CY;
  flag.vx = 0;
  flag.vy = 0;
  flag.carrier = null;
  flag.returnT = 0;
}

function placeReady() {
  for (const p of _players) {
    const spot = spawnSpot(p.team, p.idx);
    p.body.position = new Vec2(spot.x, spot.y);
    p.body.velocity = new Vec2(0, 0);
    p.dashCd = p.isHuman ? 0 : rand(60, 200);
    p.dashTimer = 0;
    p.stagger = 0;
    p.pickupCd = 0;
    p.faceX = p.team === 0 ? 1 : -1;
    p.faceY = 0;
    p.stamina = 1;
    p.winded = false;
    p.sprinting = false;
  }
  for (const f of _flags) resetFlag(f);
  _phase = "ready";
  _phaseT = READY_FRAMES;
}

function resetGame(space) {
  for (const p of _players) {
    if (p.body?.space) p.body.space = null;
  }
  _players = [];
  _space = space;

  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < TEAM_SIZE; i++) _players.push(spawnPlayer(team, i));
  }
  // Keep the human at index 0 — every input path reads _players[0].
  const humanIdx = _players.findIndex((p) => p.isHuman);
  const [human] = _players.splice(humanIdx, 1);
  _players.unshift(human);

  _flags = [makeFlag(0), makeFlag(1)];

  _frame = 0;
  _score = [0, 0];
  _lastScorer = 0;
  _clock = 0;
  _sudden = false;
  _restartLockUntil = 0;
  _sparks = [];
  _phase = "ready";
  _phaseT = READY_FRAMES;

  _pointer.active = false;
  _moveDir.x = 0;
  _moveDir.y = 0;
  for (const k in _keys) delete _keys[k];
}

// ── Dash ─────────────────────────────────────────────────────────────────
function tryDash(p, dirX, dirY) {
  if (p.dashCd > 0 || p.dashTimer > 0 || p.stagger > 0 || _phase !== "play") return false;
  let nx = dirX, ny = dirY;
  const mag = Math.hypot(nx, ny);
  if (mag < 0.01) { nx = p.faceX; ny = p.faceY; }
  else { nx /= mag; ny /= mag; }
  p.dashDirX = nx;
  p.dashDirY = ny;
  p.dashTimer = DASH_FRAMES;
  p.dashCd = p.isHuman ? DASH_COOLDOWN : rand(AI_DASH_CD_MIN, AI_DASH_CD_MAX);
  p.dashHits = new Set();
  return true;
}

// Extra shove injected on dash contact, on top of the physical collision —
// pure momentum transfer alone reads too soft for a tackle. A dashed-into
// carrier ALWAYS loses the flag.
function resolveDashImpacts() {
  for (const p of _players) {
    if (p.dashTimer <= 0) continue;
    const px = p.body.position.x, py = p.body.position.y;
    for (const q of _players) {
      // Teammates still get shoved by the physical collision, but the
      // stagger + knock bonus is opponents-only — a friendly dash through
      // your own carrier must never strip the flag.
      if (q.team === p.team || p.dashHits.has(q)) continue;
      const dx = q.body.position.x - px;
      const dy = q.body.position.y - py;
      if (dx * dx + dy * dy > DASH_REACH * DASH_REACH) continue;
      // Knock along the contact direction (dash dir blended with the offset
      // so glancing hits deflect sideways instead of dragging the victim).
      const d = Math.hypot(dx, dy) || 1;
      const kx = p.dashDirX * 0.6 + (dx / d) * 0.4;
      const ky = p.dashDirY * 0.6 + (dy / d) * 0.4;
      const km = Math.hypot(kx, ky) || 1;
      const v = q.body.velocity;
      q.body.velocity = new Vec2(v.x + (kx / km) * KNOCK_BONUS, v.y + (ky / km) * KNOCK_BONUS);
      q.stagger = STAGGER_FRAMES;
      p.dashHits.add(q);
      p.dashTimer = Math.min(p.dashTimer, 3); // the hit spends the lunge
      dropFlagOf(q, kx / km, ky / km);
      _sparks.push({
        x: (px + q.body.position.x) / 2,
        y: (py + q.body.position.y) / 2,
        t: 12,
      });
    }
  }
}

// ── Flags ────────────────────────────────────────────────────────────────
function dropFlagOf(p, dirX, dirY) {
  const flag = enemyFlag(p);
  if (flag.carrier !== p) return;
  flag.state = "dropped";
  flag.carrier = null;
  flag.x = p.body.position.x;
  flag.y = p.body.position.y;
  // The flag pops loose along the hit direction plus the carrier's momentum.
  const v = p.body.velocity;
  flag.vx = dirX * FLAG_DROP_SPEED + v.x * 0.3;
  flag.vy = dirY * FLAG_DROP_SPEED + v.y * 0.3;
  flag.returnT = FLAG_RETURN_SECONDS * 60;
  p.pickupCd = PICKUP_CD_AFTER_DROP;
}

function tickFlags() {
  for (const flag of _flags) {
    if (flag.state === "carried") {
      // Riding the carrier — nothing to integrate.
      flag.x = flag.carrier.body.position.x;
      flag.y = flag.carrier.body.position.y;
      continue;
    }

    if (flag.state === "dropped") {
      // Hand-integrated skid: the flag isn't a physics body, it just slides
      // out of the tackle and dies quickly.
      flag.x += flag.vx / 60;
      flag.y += flag.vy / 60;
      flag.vx *= FLAG_SKID_DRAG;
      flag.vy *= FLAG_SKID_DRAG;
      flag.x = Math.max(FIELD_L + 12, Math.min(FIELD_R - 12, flag.x));
      flag.y = Math.max(FIELD_T + 12, Math.min(FIELD_B - 12, flag.y));
      if (--flag.returnT <= 0) {
        resetFlag(flag); // nobody claimed it — the flag walks home
        continue;
      }
    }

    if (_phase !== "play") continue;

    // Touch resolution — enemies steal it, teammates send a dropped one home.
    for (const p of _players) {
      const d = Math.hypot(flag.x - p.body.position.x, flag.y - p.body.position.y);
      if (d > FLAG_PICKUP_RANGE) continue;
      if (p.team !== flag.team) {
        // An enemy touch grabs the flag (home or dropped alike) — unless
        // this player just got tackled off it.
        if (p.pickupCd > 0) continue;
        flag.state = "carried";
        flag.carrier = p;
        _sparks.push({ x: flag.x, y: flag.y, t: 12 });
        break;
      } else if (flag.state === "dropped") {
        resetFlag(flag); // a teammate's touch returns it instantly
        _sparks.push({ x: baseX(flag.team), y: CY, t: 12 });
        break;
      }
    }
  }

  // Passive strip — an opponent overlapping a carrier can wrestle the flag
  // loose without a dash, so scrums resolve instead of stalling.
  for (const flag of _flags) {
    if (flag.state !== "carried") continue;
    const c = flag.carrier;
    for (const q of _players) {
      if (q.team === c.team) continue;
      const dx = c.body.position.x - q.body.position.x;
      const dy = c.body.position.y - q.body.position.y;
      const d = Math.hypot(dx, dy);
      if (d < PLAYER_R * 2 + 3 && Math.random() < STRIP_CHANCE) {
        const n = d || 1;
        dropFlagOf(c, dx / n, dy / n);
        _sparks.push({ x: c.body.position.x, y: c.body.position.y, t: 12 });
        break;
      }
    }
  }
}

// A capture needs BOTH: the carrier standing in their own base circle AND
// their own flag sitting at home — the classic CTF rule that makes defense
// worth playing.
function checkCaptures() {
  for (const p of _players) {
    const flag = enemyFlag(p);
    if (flag.carrier !== p) continue;
    const d = Math.hypot(p.body.position.x - baseX(p.team), p.body.position.y - CY);
    if (d > BASE_R || ownFlag(p).state !== "home") continue;

    _score[p.team]++;
    _lastScorer = p.team;
    resetFlag(flag);
    _phase = "capture";
    _phaseT = CAPTURE_FRAMES;
    if (_score[p.team] >= WIN_SCORE || _sudden) {
      _restartLockUntil = _frame + CAPTURE_FRAMES + 30;
    }
    return;
  }
}

// ── Sprint & stamina ─────────────────────────────────────────────────────
function tickStamina(p, wantSprint) {
  if (p.winded && p.stamina >= WINDED_RECOVER) p.winded = false;
  p.sprinting = wantSprint && !p.winded && p.stamina > 0;
  if (p.sprinting) {
    p.stamina = Math.max(0, p.stamina - STAMINA_DRAIN);
    if (p.stamina === 0) p.winded = true;
  } else {
    p.stamina = Math.min(1, p.stamina + STAMINA_REGEN);
  }
}

// ── Per-player movement ──────────────────────────────────────────────────
function applyControl(p, dirX, dirY) {
  if (p.dashTimer > 0) {
    p.body.velocity = new Vec2(p.dashDirX * DASH_SPEED, p.dashDirY * DASH_SPEED);
    p.dashTimer--;
    return;
  }
  if (p.stagger > 0) return; // tackled — no control, ride the shove
  const carrying = enemyFlag(p).carrier === p;
  const eff = p.speed
    * (p.sprinting ? SPRINT_MULT : 1)
    * (carrying ? CARRIER_SPEED_MULT : 1)
    * (TIRED_SPEED_FLOOR + (1 - TIRED_SPEED_FLOOR) * p.stamina);
  const tvx = dirX * eff;
  const tvy = dirY * eff;
  const v = p.body.velocity;
  p.body.velocity = new Vec2(
    v.x + (tvx - v.x) * CONTROL_BLEND,
    v.y + (tvy - v.y) * CONTROL_BLEND,
  );
  const mag = Math.hypot(dirX, dirY);
  if (mag > 0.05) { p.faceX = dirX / mag; p.faceY = dirY / mag; }
}

// ── AI ───────────────────────────────────────────────────────────────────
function flagPos(flag) {
  return flag.state === "carried"
    ? { x: flag.carrier.body.position.x, y: flag.carrier.body.position.y }
    : { x: flag.x, y: flag.y };
}

function nearestEnemyDist(p) {
  let best = Infinity;
  for (const q of _players) {
    if (q.team === p.team) continue;
    best = Math.min(best, Math.hypot(
      q.body.position.x - p.body.position.x,
      q.body.position.y - p.body.position.y,
    ));
  }
  return best;
}

// Rank my team's non-carrying players by distance to a point — used to pick
// which two chase an enemy carrier so the whole team never abandons base.
function chaseRank(p, x, y) {
  const myD = Math.hypot(p.body.position.x - x, p.body.position.y - y);
  let rank = 0;
  for (const q of _players) {
    if (q === p || q.team !== p.team) continue;
    if (enemyFlag(q).carrier === q) continue; // carriers don't chase
    const d = Math.hypot(q.body.position.x - x, q.body.position.y - y);
    if (d < myD) rank++;
  }
  return rank;
}

function tickAI(p) {
  const px = p.body.position.x, py = p.body.position.y;
  const eFlag = enemyFlag(p);     // the flag we want to steal
  const oFlag = ownFlag(p);       // the flag we defend
  const carrying = eFlag.carrier === p;
  const oppD = nearestEnemyDist(p);
  const oCarrier = oFlag.state === "carried" ? oFlag.carrier : null;

  let tx, ty;                     // steer target
  let wantSprint = false;
  let wantDashAt = null;          // player to dash-tackle, or "escape"

  if (carrying) {
    // On the flag: run it home. Weave around enemies — a straight line into
    // a waiting tackle donates the flag right back.
    tx = baseX(p.team); ty = CY;
    for (const q of _players) {
      if (q.team === p.team) continue;
      const sx = px - q.body.position.x, sy = py - q.body.position.y;
      const sd = Math.hypot(sx, sy);
      if (sd > 1 && sd < 130) {
        tx += (sx / sd) * 90;
        ty += (sy / sd) * 90;
      }
    }
    wantSprint = oppD < 200;
    // Cornered — burn the dash to break the tackle window.
    if (oppD < 70 && Math.random() < 0.5) wantDashAt = "escape";
  } else if (oCarrier && chaseRank(p, oCarrier.body.position.x, oCarrier.body.position.y) < 1) {
    // An enemy runs off with our flag and I'm the closest — hunt them down.
    // ONE chaser only: two dash-tacklers converging made every single carry
    // die within seconds (a 4% steal→capture conversion in headless sims).
    // Aim slightly ahead of their velocity so cuts connect.
    const c = oCarrier;
    tx = c.body.position.x + c.body.velocity.x * 0.25;
    ty = c.body.position.y + c.body.velocity.y * 0.25;
    wantSprint = true;
    const d = Math.hypot(c.body.position.x - px, c.body.position.y - py);
    if (d < AI_DASH_RANGE && Math.random() < p.aggro * 0.15) wantDashAt = c;
  } else if (oFlag.state === "dropped" && chaseRank(p, oFlag.x, oFlag.y) < 1) {
    // Our flag lies loose — the nearest of us touches it home.
    tx = oFlag.x; ty = oFlag.y;
    wantSprint = true;
  } else if (eFlag.state === "dropped" && chaseRank(p, eFlag.x, eFlag.y) < 1) {
    // Their flag lies loose in the open — snatch it before it walks home.
    tx = eFlag.x; ty = eFlag.y;
    wantSprint = true;
  } else if (eFlag.state === "carried" && eFlag.carrier.team === p.team && p.role !== "guard") {
    // A teammate carries their flag — escort: hold between the carrier and
    // the nearest threat, and body anyone who closes in.
    const c = eFlag.carrier;
    let thx = 0, thy = 0, thD = Infinity;
    for (const q of _players) {
      if (q.team === p.team) continue;
      const d = Math.hypot(q.body.position.x - c.body.position.x, q.body.position.y - c.body.position.y);
      if (d < thD) { thD = d; thx = q.body.position.x; thy = q.body.position.y; }
    }
    if (thD < Infinity) {
      let dx = thx - c.body.position.x, dy = thy - c.body.position.y;
      const dd = Math.hypot(dx, dy) || 1;
      tx = c.body.position.x + (dx / dd) * ESCORT_DIST;
      ty = c.body.position.y + (dy / dd) * ESCORT_DIST;
      const meToThreat = Math.hypot(thx - px, thy - py);
      wantSprint = thD < 180;
      if (meToThreat < AI_DASH_RANGE && Math.random() < p.aggro * 0.3) {
        for (const q of _players) {
          if (q.team === p.team) continue;
          if (Math.hypot(q.body.position.x - px, q.body.position.y - py) < AI_DASH_RANGE) {
            wantDashAt = q;
            break;
          }
        }
      }
    } else {
      tx = c.body.position.x; ty = c.body.position.y;
    }
  } else if (p.role === "guard" && !_sudden) {
    // Guard: hold a spot just inside our base, between the flag and the
    // field; engage anyone who comes shopping. In sudden death the guards
    // abandon their post and raid too — the tie MUST break.
    const fp = flagPos(oFlag);
    const inward = p.team === 0 ? 1 : -1;
    tx = fp.x + inward * 45;
    ty = fp.y;
    let raiderD = Infinity, raider = null;
    for (const q of _players) {
      if (q.team === p.team) continue;
      const d = Math.hypot(q.body.position.x - fp.x, q.body.position.y - fp.y);
      if (d < raiderD) { raiderD = d; raider = q; }
    }
    if (raider && raiderD < 190) {
      tx = raider.body.position.x;
      ty = raider.body.position.y;
      wantSprint = raiderD < 130;
      const d = Math.hypot(raider.body.position.x - px, raider.body.position.y - py);
      if (d < AI_DASH_RANGE && Math.random() < p.aggro * 0.2) wantDashAt = raider;
    }
  } else if (p.role === "raid" || eFlag.state !== "home" || _sudden) {
    // Raider (and the mid once the enemy flag is in play; everyone in
    // sudden death): go take the flag wherever it is.
    const fp = flagPos(eFlag);
    tx = fp.x; ty = fp.y;
    // Sprint the open mid-field crossing, jog inside our own half.
    const inEnemyHalf = p.team === 0 ? px > CX : px < CX;
    wantSprint = inEnemyHalf && oppD < 220;
  } else {
    // Mid: hover on our side of center, cutting the lane between the enemy
    // spawn and our flag; harass whoever crosses.
    const inward = p.team === 0 ? 1 : -1;
    tx = CX - inward * 110;
    ty = CY + (p.idx - 1) * 70;
    let crosserD = Infinity, crosser = null;
    for (const q of _players) {
      if (q.team === p.team) continue;
      const inOurHalf = p.team === 0 ? q.body.position.x < CX : q.body.position.x > CX;
      if (!inOurHalf) continue;
      const d = Math.hypot(q.body.position.x - px, q.body.position.y - py);
      if (d < crosserD) { crosserD = d; crosser = q; }
    }
    if (crosser && crosserD < 260) {
      tx = crosser.body.position.x;
      ty = crosser.body.position.y;
      wantSprint = crosserD < 140;
      if (crosserD < AI_DASH_RANGE && Math.random() < p.aggro * 0.2) wantDashAt = crosser;
    }
  }

  // Keep steer targets on the field.
  tx = Math.max(FIELD_L + PLAYER_R + 2, Math.min(FIELD_R - PLAYER_R - 2, tx));
  ty = Math.max(FIELD_T + PLAYER_R + 2, Math.min(FIELD_B - PLAYER_R - 2, ty));

  // Light teammate repulsion so the trio never stacks on one pixel.
  for (const q of _players) {
    if (q === p || q.team !== p.team) continue;
    const sx = px - q.body.position.x, sy = py - q.body.position.y;
    const sd = Math.hypot(sx, sy);
    if (sd > 1 && sd < 55) { tx += (sx / sd) * 35; ty += (sy / sd) * 35; }
  }

  // Steer around the cover blocks — the AI has no pathfinding, so a gentle
  // sideways bias near a block keeps pucks from grinding on the corners.
  for (const c of COVER_CIRCLES) {
    const sx = px - c.x, sy = py - c.y;
    const sd = Math.hypot(sx, sy);
    if (sd > 1 && sd < c.r + PLAYER_R + 30) { tx += (sx / sd) * 50; ty += (sy / sd) * 50; }
  }
  for (const c of COVER_RECTS) {
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const sx = px - cx, sy = py - cy;
    const sd = Math.hypot(sx, sy);
    if (sd > 1 && sd < 70) { tx += (sx / sd) * 50; ty += (sy / sd) * 50; }
  }

  let dx = tx - px, dy = ty - py;
  const dd = Math.hypot(dx, dy);
  if (dd > 4) { dx /= dd; dy /= dd; } else { dx = 0; dy = 0; }

  // Don't sprint on an empty tank unless a flag run is live — ours being
  // carried off, or me carrying theirs.
  const emergency = oFlag.state === "carried" || carrying;
  if (!emergency && !p.sprinting && p.stamina < 0.35) wantSprint = false;
  tickStamina(p, wantSprint && dd > 4);

  // Small wander so the AI reads as alive, not laser-guided.
  p.wanderPhase += p.wanderFreq;
  const wob = Math.sin(p.wanderPhase) * 0.15;
  const wx = dx - dy * wob;
  const wy = dy + dx * wob;
  const wm = Math.hypot(wx, wy) || 1;
  applyControl(p, dd > 4 ? wx / wm : 0, dd > 4 ? wy / wm : 0);

  // Dash resolution — after control so it reads this frame's facing.
  if (wantDashAt === "escape") {
    tryDash(p, dx, dy);
  } else if (wantDashAt) {
    const qx = wantDashAt.body.position.x - px;
    const qy = wantDashAt.body.position.y - py;
    tryDash(p, qx, qy);
  }
}

// ── Effects ──────────────────────────────────────────────────────────────
function tickEffects() {
  for (const s of _sparks) s.t--;
  _sparks = _sparks.filter((s) => s.t > 0);
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
  if (_pointer.active) {
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
function drawField(ctx) {
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#161d29";
  ctx.fillRect(FIELD_L, FIELD_T, FIELD_R - FIELD_L, FIELD_B - FIELD_T);

  // Half tint — each side wears a whisper of its team color.
  ctx.fillStyle = "rgba(88,166,255,0.03)";
  ctx.fillRect(FIELD_L, FIELD_T, CX - FIELD_L, FIELD_B - FIELD_T);
  ctx.fillStyle = "rgba(248,81,73,0.03)";
  ctx.fillRect(CX, FIELD_T, FIELD_R - CX, FIELD_B - FIELD_T);

  // Markings
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD_L, FIELD_T, FIELD_R - FIELD_L, FIELD_B - FIELD_T);
  ctx.beginPath();
  ctx.moveTo(CX, FIELD_T);
  ctx.lineTo(CX, FIELD_B);
  ctx.stroke();

  // Bases
  for (const team of [0, 1]) {
    ctx.beginPath();
    ctx.arc(baseX(team), CY, BASE_R, 0, Math.PI * 2);
    ctx.fillStyle = TEAM_COLORS[team] + "14";
    ctx.fill();
    ctx.strokeStyle = TEAM_COLORS[team] + "88";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Cover blocks
  ctx.fillStyle = "#2b3547";
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  for (const c of COVER_RECTS) {
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
  for (const c of COVER_CIRCLES) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawFlag(ctx, flag) {
  let x, y, waveT = 0;
  if (flag.state === "carried") {
    // The carried flag rides above its carrier and waves with the frame.
    x = flag.carrier.body.position.x;
    y = flag.carrier.body.position.y - PLAYER_R - 4;
    waveT = _frame * 0.25;
  } else {
    x = flag.x;
    y = flag.y;
    waveT = _frame * 0.08;
  }
  const color = TEAM_COLORS[flag.team];

  // A dropped flag blinks as its auto-return approaches.
  if (flag.state === "dropped" && flag.returnT < 180 && Math.floor(_frame / 6) % 2 === 0) {
    return;
  }

  // Pole
  ctx.strokeStyle = "#c9d1d9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 22);
  ctx.stroke();
  // Pennant — two-segment wave.
  const w1 = Math.sin(waveT) * 2.5;
  const w2 = Math.sin(waveT + 1.2) * 3.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + 9, y - 19 + w1);
  ctx.lineTo(x + 17, y - 17 + w2);
  ctx.lineTo(x + 17, y - 9 + w2);
  ctx.lineTo(x + 9, y - 11 + w1);
  ctx.lineTo(x, y - 12);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // Home marker under a flag at base.
  if (flag.state === "home") {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color + "aa";
    ctx.fill();
  }
}

function drawPlayer(ctx, p) {
  const x = p.body.position.x, y = p.body.position.y;
  const color = TEAM_COLORS[p.team];

  // Dash streak
  if (p.dashTimer > 0) {
    ctx.beginPath();
    ctx.moveTo(x - p.dashDirX * 26, y - p.dashDirY * 26);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color + "88";
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = color + (p.stagger > 0 ? "22" : "44");
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = p.isHuman ? 2.5 : 1.5;
  ctx.stroke();

  // Stagger stars
  if (p.stagger > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✶", x, y - PLAYER_R - 6);
  }
}

function drawStaminaBars(ctx) {
  if (_phase === "over") return;
  const w = 26, h = 3;
  for (const p of _players) {
    const x = p.body.position.x - w / 2;
    const y = p.body.position.y + PLAYER_R + 6;
    ctx.fillStyle = "rgba(13,17,23,0.6)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = p.winded ? "#f85149" : p.sprinting ? "#d29922" : "#3fb950";
    ctx.fillRect(x, y, w * p.stamina, h);
  }
}

function drawSparks(ctx) {
  for (const s of _sparks) {
    const k = s.t / 12;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6 + (1 - k) * 14, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPlayerMarker(ctx) {
  const p = humanPlayer();
  const x = p.body.position.x, y = p.body.position.y;

  // Dash-ready cue: the dashed ring lights up when the lunge is off cooldown.
  const ready = _phase === "play" && p.dashCd <= 0 && p.stagger <= 0;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = ready ? "rgba(63,185,80,0.95)" : "rgba(255,255,255,0.55)";
  ctx.lineWidth = ready ? 2.5 : 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("YOU", x, y - PLAYER_R - 8);
}

function drawHUD(ctx) {
  // Scoreboard — top center.
  const w = 150, h = 26;
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(CX - w / 2, 8, w, h);
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEAM_COLORS[0];
  ctx.fillText(String(_score[0]), CX - 34, 21);
  ctx.fillStyle = "#c9d1d9";
  ctx.fillText("–", CX, 21);
  ctx.fillStyle = TEAM_COLORS[1];
  ctx.fillText(String(_score[1]), CX + 34, 21);
  ctx.font = "9px system-ui, sans-serif";
  if (_sudden) {
    ctx.fillStyle = "#d29922";
    ctx.fillText("SUDDEN DEATH — next capture wins", CX, 40);
  } else {
    const left = Math.max(0, MATCH_SECONDS * 60 - _clock);
    const secs = Math.ceil(left / 60);
    const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
    ctx.fillStyle = secs <= 15 ? "#d29922" : "rgba(255,255,255,0.45)";
    ctx.fillText(`${mm}:${ss} · first to ${WIN_SCORE}`, CX, 40);
  }

  // A carrier waiting at base with their own flag away gets told why the
  // capture isn't counting.
  const hp = humanPlayer();
  if (
    _phase === "play" &&
    enemyFlag(hp).carrier === hp &&
    ownFlag(hp).state !== "home" &&
    Math.hypot(hp.body.position.x - baseX(0), hp.body.position.y - CY) < BASE_R + 30
  ) {
    ctx.fillStyle = "#d29922";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("YOUR FLAG MUST BE HOME TO SCORE", CX, 56);
  }

  // Stamina bar — bottom center.
  if (_phase === "play" || _phase === "ready") {
    const p = humanPlayer();
    const bw = 130, bh = 8;
    const x = CX - bw / 2, y = VIEW_H - 24;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = p.winded ? "#f85149" : p.sprinting ? "#d29922" : "#3fb950";
    ctx.fillRect(x, y, bw * p.stamina, bh);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = p.winded
      ? "WINDED"
      : _isTouch ? "SPRINT (PUSH FAR)" : "SPRINT (SHIFT)";
    ctx.fillText(label, CX, y - 7);
  }

  // Return countdown over a dropped flag.
  for (const flag of _flags) {
    if (flag.state !== "dropped") continue;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.ceil(flag.returnT / 60)}s`, flag.x, flag.y + 12);
  }
}

function drawPointerUI(ctx) {
  const p = humanPlayer();
  if (_pointer.active) {
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
      ? "Hold to move (far = sprint) · tap to dash — steal their flag, carry it into your circle"
      : "WASD move · SHIFT sprint · SPACE dash — steal their flag, carry it into your circle";
    ctx.fillText(hint, CX, VIEW_H - 44);
  }
}

function drawBanners(ctx) {
  if (_phase === "ready") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CAPTURE THE FLAG", CX, CY - 78);
    return;
  }

  if (_phase === "capture") {
    const k = Math.min(1, (CAPTURE_FRAMES - _phaseT) / 12);
    ctx.fillStyle = TEAM_COLORS[_lastScorer] + Math.floor(k * 230).toString(16).padStart(2, "0");
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CAPTURE!", CX, CY - 70);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    const you = _lastScorer === 0;
    ctx.fillText(you ? "Your team scores!" : "The reds take one…", CX, CY - 42);
    return;
  }

  if (_phase === "over") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const draw = _score[0] === _score[1];
    const won = _score[0] > _score[1];
    ctx.fillStyle = draw ? "#d29922" : won ? "#3fb950" : "#f85149";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(draw ? "Draw" : won ? "Victory!" : "Defeat", CX, CY - 20);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(`Final score ${_score[0]} – ${_score[1]}`, CX, CY + 10);
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
  id: "capture-the-flag",
  label: "Capture the Flag",
  tags: ["Gameplay", "AI", "Momentum", "Zero Gravity", "Mobile"],
  desc:
    "3v3 top-down capture the flag. Run into the enemy flag to <b>steal it</b>, then carry it back into your own base circle — but a capture only counts while your <b>own flag sits at home</b>, so someone has to defend. A <b>dash</b> (<b>SPACE</b>/<b>E</b>, or a <b>quick tap</b>) is both tackle and escape: dashing into an opponent staggers them with a real momentum shove and <b>always knocks a carried flag loose</b>; a dropped flag skids, blinks, and walks home after 10s unless someone claims it — your own team's touch returns it instantly. Mid-field <b>cover blocks</b> turn straight chases into cornering duels. Move with <b>WASD</b>/arrows, hold <b>SHIFT</b> to <b>sprint</b> on a stamina tank that drains in seconds and refills slowly (drain it fully and you're winded; flag carriers run slightly heavy) — or on any device <b>hold</b> the pointer to steer (push it far to sprint) and <b>tap</b> to dash. Each AI rolls its own speed and aggression and plays a live role — <b>raider, mid-field interceptor, or goalkeeper-style flag guard</b> — chasing carriers, escorting yours home, and racing loose flags. First to 3 captures inside the <b>2:30 clock</b>; a tie at full time goes to sudden death, where even the guards abandon post and raid.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    buildField(space);
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
        // presses right after full time so dash-spam can't skip the result.
        if (_phase === "over") {
          if (_frame >= _restartLockUntil) resetGame(_space);
          return;
        }
        computeMoveDir();
        tryDash(humanPlayer(), _moveDir.x, _moveDir.y);
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
      if (p.dashCd > 0) p.dashCd--;
      if (p.stagger > 0) p.stagger--;
      if (p.pickupCd > 0) p.pickupCd--;
      const v = p.body.velocity;
      p.body.velocity = new Vec2(v.x * PLAYER_DRAG, v.y * PLAYER_DRAG);
    }

    if (_phase === "ready") {
      if (--_phaseT <= 0) _phase = "play";
    } else if (_phase === "play") {
      _clock++;
      if (_clock >= MATCH_SECONDS * 60 && !_sudden) {
        if (_score[0] !== _score[1]) {
          _phase = "over";
          _restartLockUntil = _frame + 45;
        } else {
          _sudden = true; // next capture wins
        }
      } else if (_sudden && _clock >= (MATCH_SECONDS + SUDDEN_MAX_SECONDS) * 60) {
        _phase = "over"; // nobody broke the tie — call it a draw
        _restartLockUntil = _frame + 45;
      }

      computeMoveDir();
      const human = humanPlayer();
      const moving = _moveDir.x !== 0 || _moveDir.y !== 0;
      let wantSprint = moving && (_keys["ShiftLeft"] || _keys["ShiftRight"]);
      if (!wantSprint && moving && _pointer.active) {
        // Touch scheme: pushing the finger far from your puck means sprint.
        wantSprint = Math.hypot(
          _pointer.x - human.body.position.x,
          _pointer.y - human.body.position.y,
        ) > SPRINT_POINTER_DIST;
      }
      tickStamina(human, wantSprint);
      applyControl(human, _moveDir.x, _moveDir.y);
      for (const p of _players) {
        if (!p.isHuman) tickAI(p);
      }
      resolveDashImpacts();
      tickFlags();
      checkCaptures();
    } else if (_phase === "capture") {
      // Everyone glides, the banner plays — then reset or full time.
      if (--_phaseT <= 0) {
        if (_score[0] >= WIN_SCORE || _score[1] >= WIN_SCORE || _sudden) _phase = "over";
        else placeReady();
      }
    }

    tickEffects();
  },

  click(x, y) {
    if (_phase === "over") {
      if (_frame >= _restartLockUntil) resetGame(_space);
      return;
    }
    // Press begins pointer steering; whether it was a tap (→ dash) is
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
      // Dash toward the tap point.
      const p = humanPlayer();
      tryDash(p, _pointer.x - p.body.position.x, _pointer.y - p.body.position.y);
    }
  },

  // Canvas2d: full custom draw — field, flags, players (no default grid).
  render(ctx, space, W, H, showOutlines) {
    drawField(ctx);
    for (const p of _players) drawPlayer(ctx, p);
    for (const flag of _flags) drawFlag(ctx, flag);
    void space; void W; void H; void showOutlines;
  },

  // All render modes: HUD, effects, marker, banners. The canvas2d adapter
  // calls this after render(); the three.js/pixi adapters call it after
  // their own body rendering, so the scoreboard stays visible everywhere.
  render3dOverlay(ctx, space, W, H) {
    drawStaminaBars(ctx);
    drawSparks(ctx);
    drawPlayerMarker(ctx);
    drawHUD(ctx);
    drawPointerUI(ctx);
    drawBanners(ctx);
    void space; void W; void H;
  },
};
