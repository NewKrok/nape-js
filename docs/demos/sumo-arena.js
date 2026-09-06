import { Body, BodyType, Vec2, Circle, Material } from "../nape-js.esm.js?v=3.42.0";

// ── Sumo Arena — 10-player free-for-all knock-out ────────────────────────
// One circular platform floating over the void. 10 round fighters (you + 9
// AI) shove each other around with body contact and a forward dash; anyone
// whose center slides past the rim falls out. The arena slowly shrinks so
// stalemates can't last. Last one standing wins.

const VIEW_W = 900;
const VIEW_H = 500;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

// Arena
const ARENA_R_START = 222;
const ARENA_R_MIN = 92;
const SHRINK_DELAY = 600;              // frames of grace before shrinking (10s)
const SHRINK_PER_FRAME = (ARENA_R_START - ARENA_R_MIN) / (47 * 60); // full shrink ≈ 47s

// Fighters
const PLAYER_COUNT = 10;               // you + 9 AI
const FIGHTER_RADIUS = 15;
const PLAYER_SPEED = 185;
const CONTROL_BLEND = 0.12;            // low blend → shoves carry momentum
const DRAG = 0.965;                    // per-frame velocity decay — shoves fade
const SPAWN_RING = 0.5;                // spawn radius as a fraction of the arena

// Dash (the shove ability)
const DASH_SPEED = 660;
const DASH_FRAMES = 11;
const DASH_COOLDOWN = 95;              // player cooldown (frames)
const KNOCK_BONUS = 260;               // extra velocity injected into dash victims
const STAGGER_FRAMES = 18;             // victim loses control briefly → gets carried

// AI tuning ranges (rolled per-AI so the field doesn't move in lockstep)
const AI_SPEED_MIN = 148, AI_SPEED_MAX = 178;
const AI_DASH_CD_MIN = 130, AI_DASH_CD_MAX = 240;
const AI_DASH_RANGE = 140;             // start considering a dash inside this
const AI_EDGE_PANIC = 0.66;            // danger ratio where center-seeking kicks in

const FIGHTER_COLORS = [
  "#58a6ff", // you
  "#f85149", "#3fb950", "#d29922", "#a371f7",
  "#f778ba", "#39c5cf", "#ff9d5c", "#9ecb2d", "#8b949e",
];

// ── Module state (reset in resetGame) ────────────────────────────────────
let _space = null;
let _players = [];        // { body, color, isHuman, alive, rank, ... }
let _arenaR = ARENA_R_START;
let _frame = 0;
let _gameOver = false;
let _playerRank = 0;      // final placement of the human (1 = winner)
let _restartLockUntil = 0; // brief lock after a KO/game over — a spammed
                           // dash key/tap must not skip the result screen
let _falls = [];          // fall-out animations { x, y, vx, vy, color, t }
let _sparks = [];         // dash-impact flashes { x, y, t }
let _isTouch = false;

// Input — keyboard plus a single-pointer scheme that works on mobile:
// hold to steer toward the finger, quick tap to dash toward the tap.
// (The demo-runner dispatches one pointer, so a stick + separate button
// can't work: a second finger's release would kill the stick drag.)
const _keys = Object.create(null);
let _onKeyDown = null;
let _onKeyUp = null;
const _moveDir = { x: 0, y: 0 };
const _pointer = { active: false, x: 0, y: 0, startX: 0, startY: 0, startFrame: 0 };
const TAP_MAX_FRAMES = 18;   // press shorter than this …
const TAP_MAX_DRIFT = 14;    // …and steadier than this = tap → dash
const STEER_DEADZONE = 14;   // stop steering when the finger sits on the puck

// ── Helpers ──────────────────────────────────────────────────────────────
function rand(min, max) {
  return min + Math.random() * (max - min);
}

function aliveCount() {
  let n = 0;
  for (const p of _players) if (p.alive) n++;
  return n;
}

function humanPlayer() {
  return _players[0];
}

// ── Spawning ─────────────────────────────────────────────────────────────
function spawnFighter(idx) {
  // Ring formation: the human at the bottom, AI spread around the circle.
  const ang = Math.PI / 2 + (idx / PLAYER_COUNT) * Math.PI * 2;
  const r = ARENA_R_START * SPAWN_RING;
  const x = CX + Math.cos(ang) * r;
  const y = CY + Math.sin(ang) * r;
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // Bouncy, slippery pucks — elastic contacts make shoves feel chunky.
  const shape = new Circle(FIGHTER_RADIUS, undefined, new Material(0.45, 0.05, 0.05, 1));
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true; // dash speeds are high enough to tunnel otherwise
  body.space = _space;

  const isHuman = idx === 0;
  return {
    body,
    color: FIGHTER_COLORS[idx % FIGHTER_COLORS.length],
    isHuman,
    alive: true,
    rank: 0,
    speed: isHuman ? PLAYER_SPEED : rand(AI_SPEED_MIN, AI_SPEED_MAX),
    // Facing — dash goes here when there's no live move input.
    faceX: (CX - x) / Math.hypot(CX - x, CY - y),
    faceY: (CY - y) / Math.hypot(CX - x, CY - y),
    dashCd: isHuman ? 0 : rand(90, 280), // AI opening dashes trickle in
    dashTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
    dashHits: null,       // Set of fighters already knocked by the active dash
    stagger: 0,
    // Per-AI personality
    aggro: rand(0.45, 0.9),         // chance gate on each dash opportunity
    wanderPhase: rand(0, Math.PI * 2),
    wanderFreq: rand(0.01, 0.025),
  };
}

function resetGame(space) {
  for (const p of _players) {
    if (p.body?.space) p.body.space = null;
  }
  _players = [];
  _space = space;
  for (let i = 0; i < PLAYER_COUNT; i++) _players.push(spawnFighter(i));

  _arenaR = ARENA_R_START;
  _frame = 0;
  _gameOver = false;
  _playerRank = 0;
  _restartLockUntil = 0;
  _falls = [];
  _sparks = [];

  _pointer.active = false;
  _moveDir.x = 0; _moveDir.y = 0;
  for (const k in _keys) delete _keys[k];
}

// ── Dash ─────────────────────────────────────────────────────────────────
function tryDash(p, dirX, dirY) {
  if (!p.alive || p.dashCd > 0 || p.dashTimer > 0) return false;
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
// pure momentum transfer alone reads too soft for a party knock-out.
function resolveDashImpacts() {
  for (const p of _players) {
    if (!p.alive || p.dashTimer <= 0) continue;
    const px = p.body.position.x, py = p.body.position.y;
    for (const q of _players) {
      if (q === p || !q.alive || p.dashHits.has(q)) continue;
      const dx = q.body.position.x - px;
      const dy = q.body.position.y - py;
      const reach = FIGHTER_RADIUS * 2 + 4;
      if (dx * dx + dy * dy > reach * reach) continue;
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
      _sparks.push({
        x: (px + q.body.position.x) / 2,
        y: (py + q.body.position.y) / 2,
        t: 12,
      });
    }
  }
}

// ── Per-fighter movement ─────────────────────────────────────────────────
function applyControl(p, dirX, dirY) {
  if (p.dashTimer > 0) {
    p.body.velocity = new Vec2(p.dashDirX * DASH_SPEED, p.dashDirY * DASH_SPEED);
    p.dashTimer--;
    return;
  }
  if (p.stagger > 0) return; // knocked — no control, ride the shove
  const tvx = dirX * p.speed;
  const tvy = dirY * p.speed;
  const v = p.body.velocity;
  // Grip hardens near the rim — a fighter scrambling at the edge digs in,
  // which turns center knocks into scrapes and rim knocks into kills.
  const blend = CONTROL_BLEND + 0.3 * Math.max(0, dangerOf(p) - 0.6);
  p.body.velocity = new Vec2(
    v.x + (tvx - v.x) * blend,
    v.y + (tvy - v.y) * blend,
  );
  const mag = Math.hypot(dirX, dirY);
  if (mag > 0.05) { p.faceX = dirX / mag; p.faceY = dirY / mag; }
}

// ── AI ───────────────────────────────────────────────────────────────────
function nearestOpponent(p) {
  let best = null, bestD2 = Infinity;
  const px = p.body.position.x, py = p.body.position.y;
  for (const q of _players) {
    if (q === p || !q.alive) continue;
    const dx = q.body.position.x - px;
    const dy = q.body.position.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = q; }
  }
  return best;
}

function dangerOf(p) {
  const dx = p.body.position.x - CX;
  const dy = p.body.position.y - CY;
  return Math.hypot(dx, dy) / _arenaR;
}

function tickAI(p) {
  if (p.dashTimer > 0 || p.stagger > 0) {
    applyControl(p, 0, 0);
    return;
  }

  const px = p.body.position.x, py = p.body.position.y;
  const target = nearestOpponent(p);
  const danger = dangerOf(p);

  // Base intent: chase the nearest opponent.
  let dx = 0, dy = 0;
  let td = 1;
  if (target) {
    dx = target.body.position.x - px;
    dy = target.body.position.y - py;
    td = Math.hypot(dx, dy) || 1;
    dx /= td; dy /= td;
  }

  // Edge panic: blend toward the center the deeper into the rim we drift.
  if (danger > AI_EDGE_PANIC) {
    const cdx = (CX - px) / (danger * _arenaR || 1);
    const cdy = (CY - py) / (danger * _arenaR || 1);
    const cm = Math.hypot(cdx, cdy) || 1;
    const w = Math.min(1, (danger - AI_EDGE_PANIC) / (1 - AI_EDGE_PANIC) * 1.6);
    dx = dx * (1 - w) + (cdx / cm) * w;
    dy = dy * (1 - w) + (cdy / cm) * w;
  }

  // Light wander so the pack doesn't collapse into one straight-line scrum.
  p.wanderPhase += p.wanderFreq;
  const wob = Math.sin(p.wanderPhase) * 0.25;
  const wx = dx - dy * wob;
  const wy = dy + dx * wob;
  const wm = Math.hypot(wx, wy) || 1;

  applyControl(p, wx / wm, wy / wm);

  // Dash decision: cooldown ready, target roughly in reach, and the lunge
  // must not carry us off the platform ourselves.
  if (p.dashCd <= 0 && target && td < AI_DASH_RANGE) {
    // Prefer victims already near the rim — that's where kills happen.
    const victimDanger = dangerOf(target);
    const gate = p.aggro + (victimDanger > 0.55 ? 0.25 : 0);
    if (Math.random() < gate) {
      const lunge = DASH_SPEED * (DASH_FRAMES / 60);
      const lx = px + dx * lunge;
      const ly = py + dy * lunge;
      const landDanger = Math.hypot(lx - CX, ly - CY) / _arenaR;
      if (landDanger < 0.88) tryDash(p, dx, dy);
    } else {
      p.dashCd = 25; // passed on the chance — re-check soon
    }
  }
}

// ── Ring-out ─────────────────────────────────────────────────────────────
function checkRingOuts() {
  for (const p of _players) {
    if (!p.alive) continue;
    const dx = p.body.position.x - CX;
    const dy = p.body.position.y - CY;
    const d = Math.hypot(dx, dy);
    // Out once the center crosses the rim — half the puck already hangs over.
    if (d <= _arenaR) continue;

    p.alive = false;
    p.rank = aliveCount() + 1; // rank before this frame's removal
    const v = p.body.velocity;
    const outX = dx / (d || 1), outY = dy / (d || 1);
    _falls.push({
      x: p.body.position.x,
      y: p.body.position.y,
      // Carry the exit velocity, guarantee some outward drift.
      vx: v.x * 0.35 + outX * 60,
      vy: v.y * 0.35 + outY * 60,
      color: p.color,
      t: 0,
    });
    p.body.space = null;

    if (p.isHuman) {
      _playerRank = p.rank;
      _restartLockUntil = _frame + 45;
    }
  }

  const alive = aliveCount();
  if (alive <= 1 && !_gameOver) {
    _gameOver = true;
    _restartLockUntil = Math.max(_restartLockUntil, _frame + 45);
    for (const p of _players) {
      if (p.alive) {
        p.rank = 1;
        if (p.isHuman) _playerRank = 1;
      }
    }
  }
}

// ── Arena shrink ─────────────────────────────────────────────────────────
function tickArena() {
  if (_frame < SHRINK_DELAY) return;
  if (_arenaR > ARENA_R_MIN) {
    _arenaR = Math.max(ARENA_R_MIN, _arenaR - SHRINK_PER_FRAME);
  }
}

// ── Effects ──────────────────────────────────────────────────────────────
function tickEffects() {
  for (const f of _falls) {
    f.x += f.vx / 60;
    f.y += f.vy / 60;
    f.t++;
  }
  _falls = _falls.filter((f) => f.t < 45);
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
  // No keys — steer toward the held pointer/finger.
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
function drawArenaFloor(ctx) {
  // Void backdrop
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Platform disc with a sumo-style border ring
  ctx.beginPath();
  ctx.arc(CX, CY, _arenaR, 0, Math.PI * 2);
  ctx.fillStyle = "#1b2230";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(CX, CY, _arenaR * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 22, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawArenaRim(ctx) {
  // Rim — drawn in the overlay so it shows in all render modes.
  const shrinking = _frame >= SHRINK_DELAY && _arenaR > ARENA_R_MIN;
  ctx.beginPath();
  ctx.arc(CX, CY, _arenaR, 0, Math.PI * 2);
  if (shrinking) {
    const pulse = 0.55 + Math.sin(_frame * 0.12) * 0.25;
    ctx.strokeStyle = `rgba(248,81,73,${pulse})`;
    ctx.lineWidth = 3;
  } else {
    ctx.strokeStyle = "rgba(214,222,235,0.5)";
    ctx.lineWidth = 3;
  }
  ctx.stroke();
}

function drawFighter(ctx, p, showOutlines) {
  const x = p.body.position.x, y = p.body.position.y;
  ctx.beginPath();
  ctx.arc(x, y, FIGHTER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = p.color + "44";
  ctx.fill();
  ctx.strokeStyle = p.color;
  ctx.lineWidth = p.isHuman ? 2.5 : 1.5;
  ctx.stroke();

  // Facing nub — shows where a dash would go.
  ctx.beginPath();
  ctx.arc(x + p.faceX * (FIGHTER_RADIUS - 4), y + p.faceY * (FIGHTER_RADIUS - 4), 3.5, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();

  // Dash trail
  if (p.dashTimer > 0) {
    ctx.beginPath();
    ctx.moveTo(x - p.dashDirX * FIGHTER_RADIUS * 2.4, y - p.dashDirY * FIGHTER_RADIUS * 2.4);
    ctx.lineTo(x, y);
    ctx.strokeStyle = p.color + "88";
    ctx.lineWidth = FIGHTER_RADIUS * 1.2;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  void showOutlines;
}

function drawFallEffects(ctx) {
  for (const f of _falls) {
    const k = 1 - f.t / 45;
    ctx.beginPath();
    ctx.arc(f.x, f.y, Math.max(0.5, FIGHTER_RADIUS * k), 0, Math.PI * 2);
    ctx.fillStyle = f.color + Math.floor(k * 160).toString(16).padStart(2, "0");
    ctx.fill();
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
  if (!p.alive) return;
  const x = p.body.position.x, y = p.body.position.y;
  ctx.beginPath();
  ctx.arc(x, y, FIGHTER_RADIUS + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("YOU", x, y - FIGHTER_RADIUS - 8);
}

function drawHUD(ctx) {
  // Alive counter — top center.
  ctx.fillStyle = "rgba(13,17,23,0.8)";
  ctx.fillRect(CX - 60, 8, 120, 24);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Alive ${aliveCount()} / ${PLAYER_COUNT}`, CX, 20);

  // Shrink warning
  if (_frame >= SHRINK_DELAY && _arenaR > ARENA_R_MIN && !_gameOver) {
    ctx.fillStyle = "rgba(248,81,73,0.85)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("The arena is shrinking!", CX, 42);
  }

  // Dash cooldown — bottom center bar.
  const p = humanPlayer();
  if (p.alive) {
    const w = 130, h = 8;
    const x = CX - w / 2, y = VIEW_H - 24;
    const pct = 1 - Math.max(0, p.dashCd) / DASH_COOLDOWN;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pct >= 1 ? "#3fb950" : "#d29922";
    ctx.fillRect(x, y, w * pct, h);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui, sans-serif";
    const ready = _isTouch ? "DASH READY (TAP)" : "DASH READY (SPACE)";
    ctx.fillText(pct >= 1 ? ready : "DASH", CX, y - 7);
  }
}

function drawPointerUI(ctx) {
  const p = humanPlayer();

  // Steering marker while the pointer/finger is held down.
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

  // Control hint for the opening seconds (touch has no keyboard prompt).
  if (_frame < 420 && p.alive) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hint = _isTouch
      ? "Hold to move · quick tap to dash"
      : "WASD to move · SPACE to dash (or hold / tap the mouse)";
    ctx.fillText(hint, CX, 58);
  }
}

function drawBanners(ctx) {
  const p = humanPlayer();

  if (_gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const won = _playerRank === 1;
    ctx.fillStyle = won ? "#3fb950" : "#f85149";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(won ? "Victory!" : "Knocked out", CX, CY - 20);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(won ? "Last one standing." : `You placed #${_playerRank} of ${PLAYER_COUNT}.`, CX, CY + 10);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      _isTouch ? "Tap anywhere to restart" : "Click or press SPACE to restart",
      CX, CY + 36,
    );
    return;
  }

  if (!p.alive) {
    ctx.fillStyle = "rgba(13,17,23,0.8)";
    ctx.fillRect(CX - 150, VIEW_H - 52, 300, 24);
    ctx.fillStyle = "#f85149";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const restartHint = _isTouch ? "tap to restart" : "click or SPACE to restart";
    ctx.fillText(`Out! You placed #${_playerRank} — ${restartHint}`, CX, VIEW_H - 40);
  }
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "sumo-arena",
  label: "Sumo Arena",
  tags: ["Gameplay", "AI", "Momentum", "Zero Gravity", "Mobile"],
  desc:
    "10-player free-for-all knock-out on a floating circular platform — shove everyone else off and be the last one standing. You control the blue puck against <b>9 AI fighters</b> with edge-awareness, target picking and their own dash timing. Move with <b>WASD</b>/arrows and <b>SPACE</b>/<b>E</b> to <b>dash</b> — or on any device <b>hold</b> the pointer/finger to steer toward it and <b>quick-tap</b> to dash that way. A dash is a short lunge that knocks whoever it hits flying (they lose control while staggered, so a rim dash is lethal). Contact pushes are pure rigid-body momentum on bouncy, slippery pucks. After 10 seconds the arena starts <b>shrinking</b>, so play the center. Fall out and you can watch the AI finish the brawl.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);

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
        // SPACE doubles as restart once the round is over (or you're out
        // and spectating) — same as clicking. The lock swallows presses in
        // the first moments after a KO so dash-spam can't skip the result.
        if (_gameOver || !humanPlayer().alive) {
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

    // Cooldown / stagger timers + drag for everyone. Drag is what lets a
    // shoved fighter recover at all — knock velocity decays while control
    // velocity is re-applied every frame, so movement speed is unaffected.
    for (const p of _players) {
      if (!p.alive) continue;
      if (p.dashCd > 0) p.dashCd--;
      if (p.stagger > 0) p.stagger--;
      if (p.dashTimer <= 0) {
        const v = p.body.velocity;
        p.body.velocity = new Vec2(v.x * DRAG, v.y * DRAG);
      }
    }

    // Human control.
    const human = humanPlayer();
    if (human.alive) {
      computeMoveDir();
      applyControl(human, _moveDir.x, _moveDir.y);
    }

    // AI control.
    for (const p of _players) {
      if (!p.isHuman && p.alive) tickAI(p);
    }

    resolveDashImpacts();
    checkRingOuts();
    if (!_gameOver) tickArena();
    tickEffects();
  },

  click(x, y) {
    // Restart when the round is over or the player is out and spectating
    // (locked briefly after the KO so a spammed tap can't skip the result).
    if (_gameOver || !humanPlayer().alive) {
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
    const p = humanPlayer();
    if (!p.alive) return;
    const held = _frame - _pointer.startFrame;
    const drift = Math.hypot(_pointer.x - _pointer.startX, _pointer.y - _pointer.startY);
    if (held < TAP_MAX_FRAMES && drift < TAP_MAX_DRIFT) {
      // Quick tap → dash toward the tap point (facing dir if it's on the puck).
      const dx = _pointer.startX - p.body.position.x;
      const dy = _pointer.startY - p.body.position.y;
      if (Math.hypot(dx, dy) > STEER_DEADZONE) tryDash(p, dx, dy);
      else tryDash(p, 0, 0);
    }
  },

  // Canvas2d: full custom draw — arena floor + fighters (no default grid).
  render(ctx, space, W, H, showOutlines) {
    drawArenaFloor(ctx);
    for (const p of _players) {
      if (p.alive) drawFighter(ctx, p, showOutlines);
    }
    void space; void W; void H;
  },

  // All render modes: rim, effects, marker, HUD, touch UI, banners. The
  // canvas2d adapter calls this after render(); the three.js/pixi adapters
  // call it after their own body rendering, so the boundary and HUD stay
  // visible everywhere.
  render3dOverlay(ctx, space, W, H) {
    drawArenaRim(ctx);
    drawFallEffects(ctx);
    drawSparks(ctx);
    drawPlayerMarker(ctx);
    drawHUD(ctx);
    drawPointerUI(ctx);
    drawBanners(ctx);
    void space; void W; void H;
  },
};
