import { Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter } from "../nape-js.esm.js?v=3.41.0";

// ── Kickoff — 2v2 top-down arena soccer (Haxball-style) ──────────────────
// A walled pitch with a goal pocket on each side. You + an AI teammate (blue)
// against two AI opponents (red). Players are round pucks; the ball is a
// light, bouncy circle. Get close to the ball and kick — the kick fires the
// ball away from your center, so you aim by positioning around it, exactly
// like Haxball. First team to 3 goals wins.

const VIEW_W = 900;
const VIEW_H = 500;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

// Pitch geometry
const PITCH_L = 70;
const PITCH_R = 830;
const PITCH_T = 50;
const PITCH_B = 450;
const GOAL_HALF = 72;                  // goal mouth half-height
const GOAL_DEPTH = 36;                 // net pocket depth behind the goal line
const WALL_T = 16;
const POST_R = 5;

// Players
const PLAYER_R = 15;
const PLAYER_SPEED = 180;
const CONTROL_BLEND = 0.16;            // soft acceleration → shoves carry through
const PLAYER_DRAG = 0.96;

// Ball
const BALL_R = 10;
const BALL_DRAG = 0.992;               // turf friction — long passes slow down
const BALL_MAX_SPEED = 820;

// Kick
const KICK_REACH = PLAYER_R + BALL_R + 10;
const KICK_SPEED = 520;
const KICK_CARRY = 0.25;               // fraction of the ball's old velocity kept
const KICK_CD_HUMAN = 14;              // frames
const KICK_CD_AI = 30;

// Grab (dribble carry) — walk into a slow ball and it sticks to your feet.
const GRAB_RANGE = PLAYER_R + BALL_R + 8;
const GRAB_BREAK = PLAYER_R + BALL_R + 30;  // carried ball knocked this far → lost
const GRAB_MAX_BALL_SPEED = 350;       // a full-speed shot can't be caught mid-air
const HOLD_DIST = PLAYER_R + BALL_R + 2;    // where the carried ball sits (facing dir)
const HOLD_PULL = 14;                  // per-frame P-gain steering the ball to that spot
const HOLD_PULL_CAP = 480;
const STEAL_CHANCE = 0.045;            // per frame while an opponent overlaps the ball
const GRAB_CD_AFTER_KICK = 25;         // kicker can't vacuum their own shot back
const GRAB_CD_STOLEN = 50;             // tackled player can't instantly re-steal

// Sprint & stamina
const SPRINT_MULT = 1.45;
const STAMINA_DRAIN = 1 / 150;         // full tank burns in ~2.5s
const STAMINA_REGEN = 1 / 360;         // ~6s to refill
const WINDED_RECOVER = 0.3;            // drained to zero → must regen to here first
const TIRED_SPEED_FLOOR = 0.85;        // base speed multiplier at empty stamina
const SPRINT_POINTER_DIST = 150;       // touch scheme: push the finger far = sprint

// Match flow
const WIN_SCORE = 3;
const MATCH_SECONDS = 120;             // full time — leader wins, tie → golden goal
const GOLDEN_MAX_SECONDS = 60;         // sudden death cap — still level → draw
const KICKOFF_FRAMES = 55;             // control freeze after every reset
const GOAL_FRAMES = 110;               // celebration length before the kickoff

// AI tuning ranges (rolled per-AI so the two reds don't move in lockstep)
const AI_SPEED_MIN = 150, AI_SPEED_MAX = 172;
const AI_SHOT_ALIGN = 0.45;            // min cosine between kick dir and goal dir
const AI_CLEAR_ALIGN = 0.15;           // defenders clear with far looser aim
const ROLE_HYSTERESIS = 40;            // px advantage needed to steal the attacker role

const TEAM_COLORS = ["#58a6ff", "#f85149"]; // blue = you, red = them
const TEAM_NAMES = ["BLUE", "RED"];

// ── Module state (reset in resetGame) ────────────────────────────────────
let _space = null;
let _players = [];        // { body, team, isHuman, role, speed, kickCd, ... }
let _ball = null;
let _frame = 0;
let _phase = "kickoff";   // "kickoff" | "play" | "goal" | "over"
let _phaseT = 0;
let _score = [0, 0];
let _lastScorer = 0;      // team index of the most recent goal
let _clock = 0;           // frames of actual play time elapsed
let _golden = false;      // full time at a tie — next goal wins
let _restartLockUntil = 0;
let _holder = null;       // player currently carrying the ball, or null
let _sparks = [];         // kick flashes { x, y, t }
let _trail = [];          // recent ball positions for the motion streak
let _isTouch = false;

// Input — keyboard plus a single-pointer scheme that works on mobile:
// hold to steer toward the finger, quick tap to kick. (Same scheme as the
// sumo-arena demo — the runner dispatches a single pointer only.)
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

function goalX(team) {
  // The goal a team ATTACKS: blue (0) shoots right, red (1) shoots left.
  return team === 0 ? PITCH_R : PITCH_L;
}

function ownGoalX(team) {
  return team === 0 ? PITCH_L : PITCH_R;
}

// ── Pitch construction ───────────────────────────────────────────────────
// One static body holds every wall. Walls use the DEFAULT material on
// purpose: the ball's own elastic material dominates the combined contact,
// and dynamic-vs-Polygon pairs with explicit materials are a known engine
// trap (P53) best avoided entirely.
function buildPitch(space) {
  const walls = new Body(BodyType.STATIC);
  const rect = (x, y, w, h) => walls.shapes.add(new Polygon(Polygon.rect(x, y, w, h)));
  const pitchW = PITCH_R - PITCH_L;

  // Top / bottom rails span past the corners so nothing leaks diagonally.
  rect(PITCH_L - WALL_T, PITCH_T - WALL_T, pitchW + WALL_T * 2, WALL_T);
  rect(PITCH_L - WALL_T, PITCH_B, pitchW + WALL_T * 2, WALL_T);

  // Side walls, split around each goal mouth.
  for (const side of [0, 1]) {
    const x = side === 0 ? PITCH_L - WALL_T : PITCH_R;
    rect(x, PITCH_T - WALL_T, WALL_T, CY - GOAL_HALF - (PITCH_T - WALL_T));
    rect(x, CY + GOAL_HALF, WALL_T, PITCH_B + WALL_T - (CY + GOAL_HALF));

    // Net pocket behind the goal line — catches the ball for the replay beat.
    const backX = side === 0 ? PITCH_L - GOAL_DEPTH - WALL_T : PITCH_R + GOAL_DEPTH;
    const lipX = side === 0 ? PITCH_L - GOAL_DEPTH - WALL_T : PITCH_R - WALL_T;
    rect(backX, CY - GOAL_HALF - WALL_T, WALL_T, GOAL_HALF * 2 + WALL_T * 2);
    rect(lipX, CY - GOAL_HALF - WALL_T, GOAL_DEPTH + WALL_T, WALL_T);
    rect(lipX, CY + GOAL_HALF, GOAL_DEPTH + WALL_T, WALL_T);

    // Goal posts — little round bumpers at the mouth corners for lucky
    // deflections, straight out of the Haxball playbook.
    const px = side === 0 ? PITCH_L : PITCH_R;
    walls.shapes.add(new Circle(POST_R, new Vec2(px, CY - GOAL_HALF)));
    walls.shapes.add(new Circle(POST_R, new Vec2(px, CY + GOAL_HALF)));
  }

  walls.space = space;
  return walls;
}

// ── Spawning ─────────────────────────────────────────────────────────────
const KICKOFF_SPOTS = [
  { x: CX - 110, y: CY },       // you — blue attacker
  { x: CX - 290, y: CY },       // blue teammate — starts as defender
  { x: CX + 110, y: CY },       // red attacker
  { x: CX + 290, y: CY },       // red defender
];

function spawnPlayer(idx) {
  const spot = KICKOFF_SPOTS[idx];
  const body = new Body(BodyType.DYNAMIC, new Vec2(spot.x, spot.y));
  // Firm, grippy pucks — body contact should nudge the ball, not launch it.
  const shape = new Circle(PLAYER_R, undefined, new Material(0.3, 0.05, 0.05, 1));
  // Each player gets a unique collision-group bit so the carried ball can be
  // filtered against JUST its holder (see setHolder) — otherwise the carry
  // pull rams the ball into the holder's back and the contact impulses
  // rocket them well past sprint speed.
  const groupBit = 2 << idx;
  shape.filter = new InteractionFilter(groupBit, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true;
  body.space = _space;

  const isHuman = idx === 0;
  const team = idx < 2 ? 0 : 1;
  return {
    body,
    groupBit,
    team,
    isHuman,
    role: idx % 2 === 0 ? "attack" : "defend",
    speed: isHuman ? PLAYER_SPEED : rand(AI_SPEED_MIN, AI_SPEED_MAX),
    kickCd: 0,
    grabCd: 0,
    // Facing — a carried ball rides here, and a kick fires this way.
    faceX: team === 0 ? 1 : -1,
    faceY: 0,
    // Sprint & stamina
    stamina: 1,
    winded: false,
    sprinting: false,
    // Per-AI personality
    aggro: rand(0.35, 0.8),           // per-frame gate on aligned shots
    wanderPhase: rand(0, Math.PI * 2),
    wanderFreq: rand(0.012, 0.03),
    // Where in the goal mouth this AI is currently aiming. Re-rolled
    // periodically — a center-only aim gets walled off by the defender
    // camping the ball–goal line, and matches stall goalless.
    aimY: rand(-1, 1) * GOAL_HALF * 0.6,
    aimTimer: rand(40, 120),
  };
}

function spawnBall() {
  const body = new Body(BodyType.DYNAMIC, new Vec2(CX, CY));
  // Light and lively — high elasticity halves against the default walls,
  // which lands right in the "ping off the post" zone.
  body.shapes.add(new Circle(BALL_R, undefined, new Material(1.0, 0.02, 0.01, 0.4)));
  body.isBullet = true; // kicks are fast enough to tunnel a 16px wall
  body.space = _space;
  return body;
}

function placeKickoff() {
  for (let i = 0; i < _players.length; i++) {
    const p = _players[i];
    p.body.position = new Vec2(KICKOFF_SPOTS[i].x, KICKOFF_SPOTS[i].y);
    p.body.velocity = new Vec2(0, 0);
    p.kickCd = 0;
    p.grabCd = 0;
    p.role = i % 2 === 0 ? "attack" : "defend";
    p.faceX = p.team === 0 ? 1 : -1;
    p.faceY = 0;
    p.stamina = 1;
    p.winded = false;
    p.sprinting = false;
  }
  setHolder(null);
  _ball.position = new Vec2(CX, CY);
  _ball.velocity = new Vec2(0, 0);
  _ball.angularVel = 0;
  _trail = [];
  _phase = "kickoff";
  _phaseT = KICKOFF_FRAMES;
}

function resetGame(space) {
  for (const p of _players) {
    if (p.body?.space) p.body.space = null;
  }
  if (_ball?.space) _ball.space = null;
  _players = [];
  _space = space;

  for (let i = 0; i < 4; i++) _players.push(spawnPlayer(i));
  _ball = spawnBall();
  _holder = null; // fresh ball spawns with the default (collide-all) mask

  _frame = 0;
  _score = [0, 0];
  _lastScorer = 0;
  _clock = 0;
  _golden = false;
  _restartLockUntil = 0;
  _sparks = [];
  _trail = [];
  _phase = "kickoff";
  _phaseT = KICKOFF_FRAMES;

  _pointer.active = false;
  _moveDir.x = 0; _moveDir.y = 0;
  for (const k in _keys) delete _keys[k];
}

// ── Kick ─────────────────────────────────────────────────────────────────
// The kick fires the ball straight away from the kicker's center — aim is
// entirely about where you stand relative to the ball.
function tryKick(p) {
  if (p.kickCd > 0 || _phase !== "play") return false;
  const dx = _ball.position.x - p.body.position.x;
  const dy = _ball.position.y - p.body.position.y;
  const d = Math.hypot(dx, dy);
  if (d > KICK_REACH || d < 0.01) return false;

  const nx = dx / d, ny = dy / d;
  const v = _ball.velocity;
  _ball.velocity = new Vec2(
    nx * KICK_SPEED + v.x * KICK_CARRY,
    ny * KICK_SPEED + v.y * KICK_CARRY,
  );
  p.kickCd = p.isHuman ? KICK_CD_HUMAN : KICK_CD_AI;
  // Any kick frees the ball — otherwise the carry-pull would cancel the
  // shot on the very next frame. The kicker can't re-grab immediately.
  if (_holder) _holder.grabCd = Math.max(_holder.grabCd, GRAB_CD_AFTER_KICK);
  setHolder(null);
  p.grabCd = Math.max(p.grabCd, GRAB_CD_AFTER_KICK);
  _sparks.push({ x: _ball.position.x, y: _ball.position.y, t: 12 });
  return true;
}

// Possession switch: while carried, the ball collides with everything EXCEPT
// its holder — the carry pull would otherwise ram it into the holder's body
// and the contact impulses launch them far past sprint speed.
function setHolder(p) {
  _holder = p;
  if (_ball) _ball.shapes.at(0).filter.collisionMask = p ? ~p.groupBit : -1;
}

// ── Grab / dribble carry ─────────────────────────────────────────────────
// A slow ball sticks to the nearest eligible player and rides in front of
// them; opponents overlapping the carried ball can tackle it away. The ball
// stays a live physics body (a hard shoulder still knocks it loose).
function tickGrab() {
  if (_phase !== "play") { setHolder(null); return; }
  const bx = _ball.position.x, by = _ball.position.y;

  if (_holder) {
    const d = Math.hypot(bx - _holder.body.position.x, by - _holder.body.position.y);
    if (d > GRAB_BREAK) {
      _holder.grabCd = Math.max(_holder.grabCd, 30);
      setHolder(null);
    }
  }

  // Tackle contest — an overlapping opponent rips the ball away.
  if (_holder) {
    for (const q of _players) {
      if (q.team === _holder.team || q.grabCd > 0) continue;
      const d = Math.hypot(bx - q.body.position.x, by - q.body.position.y);
      if (d < GRAB_RANGE && Math.random() < STEAL_CHANCE) {
        _holder.grabCd = GRAB_CD_STOLEN;
        _sparks.push({ x: bx, y: by, t: 12 });
        setHolder(q);
        break;
      }
    }
  }

  // Free ball: nearest eligible player picks it up (shots are too fast to catch).
  if (!_holder) {
    const v = _ball.velocity;
    if (Math.hypot(v.x, v.y) < GRAB_MAX_BALL_SPEED) {
      let best = null, bestD = GRAB_RANGE;
      for (const p of _players) {
        if (p.grabCd > 0) continue;
        let d = Math.hypot(bx - p.body.position.x, by - p.body.position.y);
        if (p.isHuman) d -= 6; // near-ties go to the human — the AI teammate
                               // snatching your pickup feels terrible
        if (d < bestD) { best = p; bestD = d; }
      }
      if (best) setHolder(best);
    }
  }

  // Carry: steer the ball toward the spot in front of the holder's facing.
  if (_holder) {
    const hx = _holder.body.position.x + _holder.faceX * HOLD_DIST;
    const hy = _holder.body.position.y + _holder.faceY * HOLD_DIST;
    const hv = _holder.body.velocity;
    let vx = (hx - bx) * HOLD_PULL + hv.x;
    let vy = (hy - by) * HOLD_PULL + hv.y;
    const sp = Math.hypot(vx, vy);
    if (sp > HOLD_PULL_CAP) { vx *= HOLD_PULL_CAP / sp; vy *= HOLD_PULL_CAP / sp; }
    _ball.velocity = new Vec2(vx, vy);
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
  // Tired legs are slower legs, sprinting ones much faster.
  const eff = p.speed
    * (p.sprinting ? SPRINT_MULT : 1)
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
function distToBall(p) {
  return Math.hypot(
    _ball.position.x - p.body.position.x,
    _ball.position.y - p.body.position.y,
  );
}

// Nearest-to-ball attacks, the other covers — with hysteresis so the pair
// doesn't flicker roles every frame. On the blue team the human's position
// decides which job the AI teammate takes.
function assignRoles() {
  const mate = _players[1];
  mate.role = distToBall(mate) < distToBall(humanPlayer()) - ROLE_HYSTERESIS
    ? "attack" : "defend";

  const [a, b] = [_players[2], _players[3]];
  const attacker = a.role === "attack" ? a : b;
  const other = attacker === a ? b : a;
  if (distToBall(other) < distToBall(attacker) - ROLE_HYSTERESIS) {
    other.role = "attack";
    attacker.role = "defend";
  }
}

function tickAI(p) {
  const px = p.body.position.x, py = p.body.position.y;
  const bx = _ball.position.x, by = _ball.position.y;

  // Re-roll the aim point now and then so shots spray across the mouth.
  if (--p.aimTimer <= 0) {
    p.aimY = rand(-1, 1) * GOAL_HALF * 0.6;
    p.aimTimer = rand(60, 140);
  }

  // Smart aim: when an opponent hovers near the ball, shoot for the corner
  // on the far side of them — a random corner walks straight into the block.
  let blockerD = Infinity, blockerSide = 0;
  {
    const cgx = goalX(p.team) - bx, cgy = CY - by;
    for (const q of _players) {
      if (q.team === p.team) continue;
      const qx = q.body.position.x - bx, qy = q.body.position.y - by;
      const d = Math.hypot(qx, qy);
      if (d < blockerD) {
        blockerD = d;
        blockerSide = cgx * qy - cgy * qx >= 0 ? 1 : -1;
      }
    }
    if (blockerD < 130) p.aimY = -blockerSide * GOAL_HALF * 0.62;
  }

  // Direction the ball should travel: toward the spot we aim at in the
  // goal we attack. Since a kick fires player→ball, standing on the
  // ball–aim line IS the aim.
  const gx = goalX(p.team), gy = CY + p.aimY;
  let gdx = gx - bx, gdy = gy - by;
  const gd = Math.hypot(gdx, gdy) || 1;
  gdx /= gd; gdy /= gd;

  // Ball hugging a wall: kicking "at goal" means kicking into the wall, so
  // redirect the working direction along the wall toward the goal instead —
  // wall scrums turn into along-the-boards progress. Dead in a corner, the
  // only way out is straight off the wall.
  {
    let wnx = 0, wny = 0;
    if (by < PITCH_T + BALL_R + 10) wny = 1;
    else if (by > PITCH_B - BALL_R - 10) wny = -1;
    if (bx < PITCH_L + BALL_R + 10 && Math.abs(by - CY) > GOAL_HALF - 4) wnx = 1;
    else if (bx > PITCH_R - BALL_R - 10 && Math.abs(by - CY) > GOAL_HALF - 4) wnx = -1;
    if (wnx !== 0 || wny !== 0) {
      const wn = Math.hypot(wnx, wny);
      wnx /= wn; wny /= wn;
      const dot = gdx * wnx + gdy * wny;
      let tgx = gdx - dot * wnx, tgy = gdy - dot * wny;
      const tm = Math.hypot(tgx, tgy);
      if (tm > 0.25) { gdx = tgx / tm; gdy = tgy / tm; }
      else { gdx = wnx; gdy = wny; }
    }
  }

  const holding = _holder === p;
  const mateHolds = _holder !== null && _holder.team === p.team && !holding;
  const oppHolds = _holder !== null && _holder.team !== p.team;

  // Nearest opponent to ME (pressure) — sprint and panic-shot decisions.
  let oppD = Infinity;
  for (const q of _players) {
    if (q.team === p.team) continue;
    oppD = Math.min(oppD, Math.hypot(q.body.position.x - px, q.body.position.y - py));
  }

  // Ball distances: mine, and my nearest teammate's (the human included) —
  // whoever of us is clearly closer owns the play, the other gives space.
  const myBallD = Math.hypot(px - bx, py - by) || 1;
  let mateBallD = Infinity;
  for (const q of _players) {
    if (q === p || q.team !== p.team) continue;
    mateBallD = Math.min(
      mateBallD,
      Math.hypot(q.body.position.x - bx, q.body.position.y - by),
    );
  }
  // Yield a free ball to the human when they're clearly first to it — an AI
  // teammate racing you to your own pickup feels awful. AI-to-AI yielding is
  // NOT done here (roles handle it: the closer one becomes the attacker); a
  // blanket closer-teammate yield deadlocks, with the attacker waiting on a
  // defender who will never chase.
  const hp = humanPlayer();
  const yieldToHuman = !_holder && p.team === 0 &&
    Math.hypot(hp.body.position.x - bx, hp.body.position.y - by) < myBallD - 25;

  let tx, ty; // steer target

  if (holding) {
    // On the ball: carry it straight at the aim point.
    tx = gx; ty = gy;
  } else if (mateHolds || (yieldToHuman && p.role === "attack")) {
    // A teammate carries the ball (or the human is clearly first to a free
    // one) — don't crowd them off it; make a supporting run ahead, on our flank.
    const s = (px - bx) * gdy - (py - by) * gdx >= 0 ? 1 : -1;
    tx = bx + gdx * 150 - gdy * s * 90;
    ty = by + gdy * 150 + gdx * s * 90;
  } else if (oppHolds && p.role === "attack") {
    // Opponent carries — hunt the ball; the steal happens on overlap.
    tx = bx; ty = by;
  } else if (p.role === "attack") {
    if (blockerD < 55 && blockerD < myBallD - 15) {
      // The opponent won the race to the ball. Joining them produces a
      // kick-for-kick scrum that pins the ball in place forever — drop back
      // goal-side instead and wait to intercept their next kick.
      const ox = ownGoalX(p.team);
      let cdx = ox - bx, cdy = CY - by;
      const cd = Math.hypot(cdx, cdy) || 1;
      tx = bx + (cdx / cd) * 150;
      ty = by + (cdy / cd) * 150;
      // …but never camp inside the goalmouth as a permanent keeper — hold a
      // spot in front of it so corner shots (and rebounds) stay live.
      if (p.team === 0) tx = Math.max(tx, PITCH_L + 60);
      else tx = Math.min(tx, PITCH_R - 60);
    } else {
      // Run straight onto the ball — the grab picks it up and the carry
      // branch takes over aiming. (An older line-up-behind-the-ball dance
      // predates the carry mechanic; against a wall-pinned ball its two
      // steer targets reached equilibrium ~55px out — beyond both grab and
      // kick range — and the AI hovered there forever.)
      tx = bx; ty = by;
    }
  } else {
    // Defender: hold a spot between our goal and the ball, never straying
    // past midfield.
    const ox = ownGoalX(p.team);
    tx = ox + (bx - ox) * 0.35;
    ty = CY + (by - CY) * 0.45;
    if (p.team === 0) tx = Math.min(tx, CX - 50);
    else tx = Math.max(tx, CX + 50);
    ty = Math.max(PITCH_T + 40, Math.min(PITCH_B - 40, ty));

    // Danger close — step up, grab it, and the carry/clear logic takes it
    // from there. Only when no teammate is already on the ball (two of us
    // swarming one ball helps nobody) — except right in front of a goal,
    // where double-team pressure is worth the crowd.
    const ballDeep = p.team === 0 ? bx < CX - 90 : bx > CX + 90;
    const ballAtGoal = p.team === 0 ? bx < PITCH_L + 160 : bx > PITCH_R - 160;
    if (ballDeep && (mateBallD > 60 || ballAtGoal)) { tx = bx; ty = by; }
  }

  // Keep steer targets on the field — a standoff spot computed behind a
  // wall-hugging ball lands inside the wall, and the AI would plow forever.
  tx = Math.max(PITCH_L + PLAYER_R + 2, Math.min(PITCH_R - PLAYER_R - 2, tx));
  ty = Math.max(PITCH_T + PLAYER_R + 2, Math.min(PITCH_B - PLAYER_R - 2, ty));

  // Light teammate repulsion so the pair never stacks on one pixel.
  for (const q of _players) {
    if (q === p || q.team !== p.team) continue;
    const sx = px - q.body.position.x, sy = py - q.body.position.y;
    const sd = Math.hypot(sx, sy);
    if (sd > 1 && sd < 60) { tx += (sx / sd) * 40; ty += (sy / sd) * 40; }
  }

  let dx = tx - px, dy = ty - py;
  const dd = Math.hypot(dx, dy);
  if (dd > 4) { dx /= dd; dy /= dd; } else { dx = 0; dy = 0; }

  // Sprint tactics: break away with the ball under pressure, chase a
  // carrying opponent, or close a long gap — but keep gas in the tank
  // unless someone is carrying the ball toward our goal.
  let wantSprint;
  if (holding) wantSprint = oppD < 110 || gd > 320;
  else if (oppHolds) wantSprint = true;
  else wantSprint = dd > 140;
  const emergency = oppHolds &&
    Math.hypot(bx - ownGoalX(p.team), by - CY) < 300;
  if (!emergency && !p.sprinting && p.stamina < 0.35) wantSprint = false;
  tickStamina(p, wantSprint);

  // Small wander so the AI reads as alive, not laser-guided.
  p.wanderPhase += p.wanderFreq;
  const wob = Math.sin(p.wanderPhase) * 0.18;
  const wx = dx - dy * wob;
  const wy = dy + dx * wob;
  const wm = Math.hypot(wx, wy) || 1;
  applyControl(p, wx / wm, wy / wm);

  // On the ball: shoot when in range of goal, boot it under pressure, and
  // defenders who picked it up clear early rather than dribble out.
  if (holding && p.kickCd <= 0) {
    const faceAligned = p.faceX * gdx + p.faceY * gdy;
    const wantShot =
      (gd < 280 && faceAligned > 0.6 && Math.random() < 0.25 + p.aggro * 0.3) ||
      (oppD < 60 && gd < 620 && Math.random() < 0.4) ||
      (p.role === "defend" && gd < 560 && faceAligned > 0.3 && Math.random() < 0.08);
    if (wantShot && tryKick(p)) {
      p.aimY = rand(-1, 1) * GOAL_HALF * 0.6;
      p.aimTimer = rand(60, 140);
    }
    return;
  }
  if (mateHolds || oppHolds) return; // no free-ball kicks — steals dispossess

  // Free ball — the kick goes player→ball, so alignment IS the aim.
  // Attackers demand a tight angle on goal; defenders just need "roughly
  // upfield".
  if (p.kickCd <= 0) {
    const pbx = bx - px, pby = by - py;
    const pd = Math.hypot(pbx, pby);
    if (pd <= KICK_REACH && pd > 0.01) {
      // A ball hugging a wall can NEVER be kicked wall-inward with proper
      // alignment (the required standing spot is inside the wall), so any
      // touch is allowed just to pry it loose — the wall bounce does the
      // rest. Without this rule matches deadlock into rail scrums.
      const pinned =
        by < PITCH_T + BALL_R + 8 || by > PITCH_B - BALL_R - 8 ||
        ((bx < PITCH_L + BALL_R + 8 || bx > PITCH_R - BALL_R - 8) &&
          Math.abs(by - CY) > GOAL_HALF - 4);

      // …but never pry it toward our own goal mouth from close range.
      const ox = ownGoalX(p.team);
      let ogx = ox - bx, ogy = CY - by;
      const ogd = Math.hypot(ogx, ogy) || 1;
      const towardOwnGoal = (pbx / pd) * (ogx / ogd) + (pby / pd) * (ogy / ogd);
      const suicidal = ogd < 200 && towardOwnGoal > 0.7;

      const aligned = (pbx / pd) * gdx + (pby / pd) * gdy;
      const need = p.role === "attack" ? AI_SHOT_ALIGN : AI_CLEAR_ALIGN;
      // Close to goal, don't dither — poke it over the line.
      const gate = 0.3 + p.aggro * 0.5 + (gd < 260 ? 0.3 : 0);
      if (aligned > need && Math.random() < gate) {
        if (tryKick(p)) {
          // Next attempt goes for a different corner.
          p.aimY = rand(-1, 1) * GOAL_HALF * 0.6;
          p.aimTimer = rand(60, 140);
        }
      } else if (!suicidal && Math.random() < (pinned ? 0.12 : 0.015)) {
        tryKick(p); // pry a pinned ball loose / rare desperation poke
      }
    }
  }
}

// ── Goals ────────────────────────────────────────────────────────────────
function checkGoal() {
  const bx = _ball.position.x, by = _ball.position.y;
  if (Math.abs(by - CY) > GOAL_HALF + 8) return;

  let scorer = -1;
  if (bx > PITCH_R + BALL_R) scorer = 0;      // ball fully across the right line
  else if (bx < PITCH_L - BALL_R) scorer = 1; // …or the left one
  if (scorer < 0) return;

  _score[scorer]++;
  _lastScorer = scorer;
  _phase = "goal";
  _phaseT = GOAL_FRAMES;
  if (_score[scorer] >= WIN_SCORE || _golden) {
    _restartLockUntil = _frame + GOAL_FRAMES + 30;
  }
}

// ── Effects ──────────────────────────────────────────────────────────────
function tickEffects() {
  for (const s of _sparks) s.t--;
  _sparks = _sparks.filter((s) => s.t > 0);

  const v = _ball.velocity;
  if (Math.hypot(v.x, v.y) > 120) {
    _trail.push({ x: _ball.position.x, y: _ball.position.y });
    if (_trail.length > 9) _trail.shift();
  } else if (_trail.length) {
    _trail.shift();
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
function drawPitch(ctx) {
  // Backdrop + turf
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#10261a";
  ctx.fillRect(PITCH_L, PITCH_T, PITCH_R - PITCH_L, PITCH_B - PITCH_T);

  // Mowing stripes
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  const stripeW = (PITCH_R - PITCH_L) / 10;
  for (let i = 0; i < 10; i += 2) {
    ctx.fillRect(PITCH_L + i * stripeW, PITCH_T, stripeW, PITCH_B - PITCH_T);
  }

  // Markings
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(PITCH_L, PITCH_T, PITCH_R - PITCH_L, PITCH_B - PITCH_T);
  ctx.beginPath();
  ctx.moveTo(CX, PITCH_T);
  ctx.lineTo(CX, PITCH_B);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, 58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();

  // Penalty boxes
  for (const side of [0, 1]) {
    const x = side === 0 ? PITCH_L : PITCH_R - 90;
    ctx.strokeRect(x, CY - 110, 90, 220);
  }

  // Net pockets
  for (const side of [0, 1]) {
    const x0 = side === 0 ? PITCH_L - GOAL_DEPTH : PITCH_R;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(x0, CY - GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const nx = x0 + (GOAL_DEPTH / 4) * i;
      ctx.beginPath(); ctx.moveTo(nx, CY - GOAL_HALF); ctx.lineTo(nx, CY + GOAL_HALF); ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const ny = CY - GOAL_HALF + (GOAL_HALF * 2 / 8) * i;
      ctx.beginPath(); ctx.moveTo(x0, ny); ctx.lineTo(x0 + GOAL_DEPTH, ny); ctx.stroke();
    }
    // Goal mouth line, in the attacking team's color
    const teamHere = side === 0 ? 1 : 0; // the team that scores INTO this goal
    ctx.strokeStyle = TEAM_COLORS[teamHere] + "66";
    ctx.lineWidth = 3;
    const gx = side === 0 ? PITCH_L : PITCH_R;
    ctx.beginPath(); ctx.moveTo(gx, CY - GOAL_HALF); ctx.lineTo(gx, CY + GOAL_HALF); ctx.stroke();
    // Posts
    for (const py of [CY - GOAL_HALF, CY + GOAL_HALF]) {
      ctx.beginPath();
      ctx.arc(gx, py, POST_R, 0, Math.PI * 2);
      ctx.fillStyle = "#c9d1d9";
      ctx.fill();
    }
  }
}

function drawPlayer(ctx, p) {
  const x = p.body.position.x, y = p.body.position.y;
  const color = TEAM_COLORS[p.team];
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = color + "44";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = p.isHuman ? 2.5 : 1.5;
  ctx.stroke();
}

function drawBall(ctx) {
  // Motion streak
  for (let i = 0; i < _trail.length; i++) {
    const k = (i + 1) / (_trail.length + 1);
    ctx.beginPath();
    ctx.arc(_trail[i].x, _trail[i].y, BALL_R * k * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.10 * k})`;
    ctx.fill();
  }
  const x = _ball.position.x, y = _ball.position.y;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = "#e6edf3";
  ctx.fill();
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // A rolling seam mark so spin reads visually.
  const rot = _ball.rotation;
  ctx.beginPath();
  ctx.arc(x + Math.cos(rot) * BALL_R * 0.45, y + Math.sin(rot) * BALL_R * 0.45, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "#57606a";
  ctx.fill();
}

function drawStaminaBars(ctx) {
  // Tiny tank readout under every puck — you can see who's gassed.
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

function drawHoldRing(ctx) {
  // Possession cue: the carried ball wears the holder's color.
  if (!_holder) return;
  ctx.beginPath();
  ctx.arc(_ball.position.x, _ball.position.y, BALL_R + 4, 0, Math.PI * 2);
  ctx.strokeStyle = TEAM_COLORS[_holder.team];
  ctx.lineWidth = 2.5;
  ctx.stroke();
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

  // Kick-range cue: dashed ring lights up when the ball is kickable.
  const inReach = _phase === "play" && p.kickCd <= 0 && distToBall(p) <= KICK_REACH;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = inReach ? "rgba(63,185,80,0.95)" : "rgba(255,255,255,0.55)";
  ctx.lineWidth = inReach ? 2.5 : 1.5;
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
  if (_golden) {
    ctx.fillStyle = "#d29922";
    ctx.fillText("GOLDEN GOAL — next goal wins", CX, 40);
  } else {
    const left = Math.max(0, MATCH_SECONDS * 60 - _clock);
    const secs = Math.ceil(left / 60);
    const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
    ctx.fillStyle = secs <= 15 ? "#d29922" : "rgba(255,255,255,0.45)";
    ctx.fillText(`${mm}:${ss} · first to ${WIN_SCORE}`, CX, 40);
  }

  // Stamina bar — bottom center.
  if (_phase === "play" || _phase === "kickoff") {
    const p = humanPlayer();
    const w = 130, h = 8;
    const x = CX - w / 2, y = VIEW_H - 24;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = p.winded ? "#f85149" : p.sprinting ? "#d29922" : "#3fb950";
    ctx.fillRect(x, y, w * p.stamina, h);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = p.winded
      ? "WINDED"
      : _isTouch ? "SPRINT (PUSH FAR)" : "SPRINT (SHIFT)";
    ctx.fillText(label, CX, y - 7);
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
      ? "Hold to move (far = sprint) · tap to kick — walk into the ball to carry it"
      : "WASD move · SHIFT sprint · SPACE kick — walk into the ball to carry it";
    ctx.fillText(hint, CX, 56);
  }
}

function drawBanners(ctx) {
  if (_phase === "kickoff") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("KICKOFF", CX, CY - 78);
    return;
  }

  if (_phase === "goal") {
    const k = Math.min(1, (GOAL_FRAMES - _phaseT) / 12);
    ctx.fillStyle = TEAM_COLORS[_lastScorer] + Math.floor(k * 230).toString(16).padStart(2, "0");
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GOAL!", CX, CY - 70);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    const you = _lastScorer === 0;
    ctx.fillText(you ? "Your team scores!" : "The reds score…", CX, CY - 42);
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
  id: "kickoff",
  label: "Kickoff",
  tags: ["Gameplay", "AI", "Momentum", "Zero Gravity", "Mobile"],
  desc:
    "2v2 top-down arena soccer. You and an <b>AI teammate</b> (blue) take on two AI opponents on a walled pitch with recessed goal pockets and round posts. Walk into a slow ball to <b>carry it</b> at your feet; a <b>kick</b> (<b>SPACE</b>/<b>E</b>) fires it the way you're facing, and an opponent overlapping your carried ball can <b>tackle it away</b> — a full-speed shot is too fast to catch. Move with <b>WASD</b>/arrows, hold <b>SHIFT</b> to <b>sprint</b> on a stamina tank that drains in seconds and refills slowly (drain it fully and you're winded) — or on any device <b>hold</b> the pointer to steer (push it far to sprint) and <b>quick-tap</b> to kick. The AI pairs split into <b>attacker and defender roles</b> dynamically, dribble for the corners, make supporting runs, and manage their own stamina. First to 3 goals inside the <b>2-minute clock</b> — a tie at full time goes to golden goal.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    buildPitch(space);
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
        // presses right after full time so kick-spam can't skip the result.
        if (_phase === "over") {
          if (_frame >= _restartLockUntil) resetGame(_space);
          return;
        }
        tryKick(humanPlayer());
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
      if (p.kickCd > 0) p.kickCd--;
      if (p.grabCd > 0) p.grabCd--;
      const v = p.body.velocity;
      p.body.velocity = new Vec2(v.x * PLAYER_DRAG, v.y * PLAYER_DRAG);
    }
    {
      const v = _ball.velocity;
      let vx = v.x * BALL_DRAG, vy = v.y * BALL_DRAG;
      const sp = Math.hypot(vx, vy);
      if (sp > BALL_MAX_SPEED) { vx *= BALL_MAX_SPEED / sp; vy *= BALL_MAX_SPEED / sp; }
      _ball.velocity = new Vec2(vx, vy);
    }

    if (_phase === "kickoff") {
      if (--_phaseT <= 0) _phase = "play";
    } else if (_phase === "play") {
      _clock++;
      if (_clock >= MATCH_SECONDS * 60 && !_golden) {
        if (_score[0] !== _score[1]) {
          _phase = "over";
          _restartLockUntil = _frame + 45;
        } else {
          _golden = true; // sudden death — next goal wins
        }
      } else if (_golden && _clock >= (MATCH_SECONDS + GOLDEN_MAX_SECONDS) * 60) {
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
      assignRoles();
      for (const p of _players) {
        if (!p.isHuman) tickAI(p);
      }
      checkGoal();
    } else if (_phase === "goal") {
      // Ball rattles in the net, players glide — then kickoff or full time.
      if (--_phaseT <= 0) {
        if (_score[0] >= WIN_SCORE || _score[1] >= WIN_SCORE || _golden) _phase = "over";
        else placeKickoff();
      }
    }

    // Runs in every phase — it releases the carry outside of play, and in
    // play it must run after control so it reads this frame's facing.
    tickGrab();

    tickEffects();
  },

  click(x, y) {
    if (_phase === "over") {
      if (_frame >= _restartLockUntil) resetGame(_space);
      return;
    }
    // Press begins pointer steering; whether it was a tap (→ kick) is
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
      tryKick(humanPlayer());
    }
  },

  // Canvas2d: full custom draw — pitch, players, ball (no default grid).
  render(ctx, space, W, H, showOutlines) {
    drawPitch(ctx);
    for (const p of _players) drawPlayer(ctx, p);
    drawBall(ctx);
    void space; void W; void H; void showOutlines;
  },

  // All render modes: HUD, effects, marker, banners. The canvas2d adapter
  // calls this after render(); the three.js/pixi adapters call it after
  // their own body rendering, so the scoreboard stays visible everywhere.
  render3dOverlay(ctx, space, W, H) {
    drawStaminaBars(ctx);
    drawHoldRing(ctx);
    drawSparks(ctx);
    drawPlayerMarker(ctx);
    drawHUD(ctx);
    drawPointerUI(ctx);
    drawBanners(ctx);
    void space; void W; void H;
  },
};
