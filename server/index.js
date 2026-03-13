/**
 * nape-js Multiplayer Demo Server
 *
 * Server-authoritative physics at 60 Hz.
 * Protocol:
 *   Client → Server (JSON):
 *     { type: "input", keys: { left, right, jump } }
 *   Server → Client (JSON, on join):
 *     { type: "init", playerId, W, H, bodies: [{id, type, shape, x, y, w, h, r}] }
 *   Server → All (Binary, every frame):
 *     [bodyCount: Uint16] + per body: [id: Uint16, x: Float32, y: Float32, rot: Float32]
 *   Server → All (JSON, on player join/leave):
 *     { type: "players", count, players: [{id, colorIdx}] }
 */

import { createServer } from "http";
import { WebSocketServer } from "ws";
import {
  Space, Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, InteractionType, PreListener, PreFlag, DistanceJoint,
} from "@newkrok/nape-js";

// ─── Constants ───────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const W = 900;
const H = 500;
const TICK_MS = 1000 / 60;
const PLAYER_R = 16;   // player circle radius
const PLAYER_MASS_MATERIAL = new Material(0.1, 0.5, 0.4, 2);
const JUMP_FORCE = -480;
const MOVE_FORCE = 220;
const MAX_PLAYERS = 8;

const PLAYER_COLORS = [
  { fill: "rgba(88,166,255,0.35)",  stroke: "#58a6ff" },
  { fill: "rgba(63,185,80,0.35)",   stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.35)",   stroke: "#f85149" },
  { fill: "rgba(210,153,34,0.35)",  stroke: "#d29922" },
  { fill: "rgba(163,113,247,0.35)", stroke: "#a371f7" },
  { fill: "rgba(219,171,255,0.35)", stroke: "#dbabff" },
  { fill: "rgba(77,208,225,0.35)",  stroke: "#4dd0e1" },
  { fill: "rgba(255,138,101,0.35)", stroke: "#ff8a65" },
];

// ─── Physics world ────────────────────────────────────────────────────────────

const space = new Space();
space.gravity = new Vec2(0, 600);

// Track all dynamic bodies with stable IDs
let nextBodyId = 1;
const dynamicBodies = new Map(); // id → Body
const staticBodies = [];         // for init packet (shape descriptors)

// CbTypes for one-way platform
const platformType = new CbType();
const playerType = new CbType();

const preListener = new PreListener(
  InteractionType.COLLISION,
  platformType, playerType,
  (cb) => {
    try {
      const arb = cb.get_arbiter().get_collisionArbiter();
      if (!arb) return PreFlag.ACCEPT;
      return arb.get_normal().get_y() < 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
    } catch (_) {
      return PreFlag.ACCEPT;
    }
  },
);
preListener.space = space;

// ─── Build static scene ───────────────────────────────────────────────────────

function addStatic(x, y, w, h) {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  b.space = space;
  staticBodies.push({ x, y, w, h });
  return b;
}

// Walls & floor
const WALL = 20;
addStatic(W / 2,      H - WALL / 2, W,      WALL);      // floor
addStatic(WALL / 2,   H / 2,        WALL,   H);          // left wall
addStatic(W - WALL/2, H / 2,        WALL,   H);          // right wall
addStatic(W / 2,      WALL / 2,     W,      WALL);       // ceiling

// One-way floating platform (centre)
const platBody = new Body(BodyType.STATIC, new Vec2(W / 2, H * 0.65));
platBody.shapes.add(new Polygon(Polygon.box(180, 14)));
platBody.shapes.at(0).cbTypes.add(platformType);
platBody.space = space;
staticBodies.push({ x: W / 2, y: H * 0.65, w: 180, h: 14, oneWay: true });

// Smaller side platforms
const sidePlats = [
  { x: 190, y: H * 0.50, w: 110, h: 12 },
  { x: 710, y: H * 0.50, w: 110, h: 12 },
  { x: 330, y: H * 0.35, w: 100, h: 12 },
  { x: 580, y: H * 0.35, w: 100, h: 12 },
  { x: 450, y: H * 0.20, w: 130, h: 12 },
];
for (const p of sidePlats) {
  const pb = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
  pb.shapes.add(new Polygon(Polygon.box(p.w, p.h)));
  pb.shapes.at(0).cbTypes.add(platformType);
  pb.space = space;
  staticBodies.push({ ...p, oneWay: true });
}

// ─── Spawn scattered dynamic objects ─────────────────────────────────────────

function spawnObject(x, y, shape /* "circle"|"box" */, size) {
  const id = nextBodyId++;
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  if (shape === "circle") {
    body.shapes.add(new Circle(size, undefined, new Material(0.3, 0.5, 0.4, 1)));
  } else {
    body.shapes.add(new Polygon(Polygon.box(size, size), undefined, new Material(0.2, 0.5, 0.4, 1)));
  }
  body.isBullet = true;
  body.space = space;
  dynamicBodies.set(id, body);
  return { id, shape, size, x, y };
}

// ─── Spawn hanging objects (DistanceJoint pendulums) ─────────────────────────

function spawnHanging(anchorX, anchorY, ropeLen, shape, size) {
  const id = nextBodyId++;
  const body = new Body(BodyType.DYNAMIC, new Vec2(anchorX, anchorY + ropeLen));
  if (shape === "circle") {
    body.shapes.add(new Circle(size, undefined, new Material(0.2, 0.4, 0.3, 1.5)));
  } else {
    body.shapes.add(new Polygon(Polygon.box(size, size), undefined, new Material(0.2, 0.4, 0.3, 1.5)));
  }
  body.isBullet = true;
  body.space = space;
  dynamicBodies.set(id, body);

  // Static anchor body (invisible, just for the joint)
  const anchor = new Body(BodyType.STATIC, new Vec2(anchorX, anchorY));
  anchor.space = space;

  const joint = new DistanceJoint(anchor, body, new Vec2(0, 0), new Vec2(0, 0), ropeLen, ropeLen);
  joint.stiff = false;
  joint.damping = 2;
  joint.frequency = 4;
  joint.space = space;

  return { id, shape, size, x: anchorX, y: anchorY + ropeLen, anchorX, anchorY, ropeLen };
}

const sceneObjects = [
  // Labdák — padlón
  spawnObject(200, 350, "circle", 14),
  spawnObject(400, 380, "circle", 10),
  spawnObject(650, 350, "circle", 16),
  spawnObject(300, 400, "circle", 12),
  spawnObject(580, 370, "circle", 11),
  spawnObject(750, 400, "circle", 13),
  spawnObject(120, 380, "circle",  9),
  // Dobozok — padlón
  spawnObject(260, 360, "box", 22),
  spawnObject(500, 380, "box", 18),
  spawnObject(730, 360, "box", 24),
  spawnObject(450, 400, "box", 16),
  // Dobozok — platformokon
  spawnObject(W / 2 - 30, H * 0.65 - 30, "box",    18),
  spawnObject(W / 2 + 30, H * 0.65 - 30, "circle", 10),
  spawnObject(190,         H * 0.50 - 25, "box",    16),
  spawnObject(710,         H * 0.50 - 25, "circle", 11),
  // Lelógó elemek — mennyezetről
  spawnHanging(160,  WALL,       110, "circle", 16),
  spawnHanging(W/2,  H * 0.65,   60, "box",    20),
  spawnHanging(740,  WALL,       120, "circle", 13),
  spawnHanging(310,  WALL,        70, "box",    16),
  spawnHanging(610,  WALL,        80, "circle", 11),
];

// ─── Player management ────────────────────────────────────────────────────────

let nextPlayerId = 1;
const players = new Map();    // playerId → { ws, body, bodyId, colorIdx, keys, onGround }
const spectators = new Set(); // ws handles of spectator connections

function spawnPlayer(ws) {
  if (players.size >= MAX_PLAYERS) return null;

  const playerId = nextPlayerId++;
  const colorIdx = (playerId - 1) % PLAYER_COLORS.length;
  const bodyId = nextBodyId++;

  const spawnX = WALL + PLAYER_R + Math.random() * (W - WALL * 2 - PLAYER_R * 2);
  const body = new Body(BodyType.DYNAMIC, new Vec2(spawnX, 60));
  body.shapes.add(new Circle(PLAYER_R, undefined, PLAYER_MASS_MATERIAL));
  body.shapes.at(0).cbTypes.add(playerType);
  body.allowRotation = false;
  body.isBullet = true;
  body.space = space;

  dynamicBodies.set(bodyId, body);

  const player = { ws, body, bodyId, colorIdx, keys: { left: false, right: false, jump: false }, onGround: false, jumpCooldown: 0 };
  players.set(playerId, player);

  return { playerId, bodyId, colorIdx };
}

function removePlayer(playerId) {
  const player = players.get(playerId);
  if (!player) return;
  player.body.space = null;
  dynamicBodies.delete(player.bodyId);
  lastState.delete(player.bodyId);
  players.delete(playerId);
}

// ─── Ground detection via space arbiters ─────────────────────────────────────
// A body is on the ground if it has a collision contact where the normal's Y
// component (pointing away from the other body toward the player) is upward,
// i.e. the floor pushes the player up (effNy < 0 in canvas coords where +y=down).

function isOnGround(body) {
  // Sleeping bodies have no active arbiters — treat as grounded if nearly stationary.
  if (body.isSleeping) return true;
  try {
    const arbs = space.arbiters;
    const count = arbs.zpp_gl();
    for (let i = 0; i < count; i++) {
      const arb = arbs.at(i);
      try {
        if (arb.body1 !== body && arb.body2 !== body) continue;
        const col = arb.collisionArbiter;
        if (!col) continue;
        const ny = col.normal.y;
        // normal points from body1 → body2.
        // If player is body1: effNy = -ny (floor pushes up → effNy < 0)
        // If player is body2: effNy = ny  (normal already points into player upward)
        const effNy = arb.body1 === body ? -ny : ny;
        if (effNy < -0.3) return true;
      } catch (_) {}
    }
  } catch (_) {}
  return false;
}

// ─── Physics tick ─────────────────────────────────────────────────────────────

function applyPlayerInputs() {
  for (const [, player] of players) {
    const { body, keys } = player;
    const vel = body.velocity;

    // Horizontal movement — directly set velocity for responsive feel
    let targetVx = 0;
    if (keys.left)  targetVx = -MOVE_FORCE;
    if (keys.right) targetVx =  MOVE_FORCE;
    body.velocity = new Vec2(targetVx, vel.y);

    // Jump
    player.onGround = isOnGround(body);
    if (player.jumpCooldown > 0) player.jumpCooldown--;
    if (keys.jump && player.onGround && player.jumpCooldown === 0) {
      body.velocity = new Vec2(targetVx, JUMP_FORCE);
      player.jumpCooldown = 10; // ~167ms at 60Hz
    }
  }
}

// ─── Build binary state frame (delta — only changed bodies) ───────────────────
// Format: [bodyCount: Uint16] + N × [id: Uint16, x: Float32, y: Float32, rot: Float32]
// Total: 2 + N×14 bytes

const POS_THRESHOLD = 0.1;   // px
const ROT_THRESHOLD = 0.001; // rad
const lastState = new Map(); // id → { x, y, rot }

function buildStateFrame() {
  const changed = [];
  for (const [id, body] of dynamicBodies) {
    const x   = body.position.x;
    const y   = body.position.y;
    const rot = body.rotation;
    const prev = lastState.get(id);
    if (
      !prev ||
      Math.abs(x - prev.x)     > POS_THRESHOLD ||
      Math.abs(y - prev.y)     > POS_THRESHOLD ||
      Math.abs(rot - prev.rot) > ROT_THRESHOLD
    ) {
      changed.push({ id, x, y, rot });
      lastState.set(id, { x, y, rot });
    }
  }
  if (changed.length === 0) return null;
  const buf = Buffer.allocUnsafe(2 + changed.length * 14);
  buf.writeUInt16LE(changed.length, 0);
  let offset = 2;
  for (const { id, x, y, rot } of changed) {
    buf.writeUInt16LE(id, offset);     offset += 2;
    buf.writeFloatLE(x,   offset);     offset += 4;
    buf.writeFloatLE(y,   offset);     offset += 4;
    buf.writeFloatLE(rot, offset);     offset += 4;
  }
  return buf;
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function broadcastBinary(buf) {
  for (const [, player] of players) {
    if (player.ws.readyState === 1 /* OPEN */) player.ws.send(buf);
  }
  for (const ws of spectators) {
    if (ws.readyState === 1 /* OPEN */) ws.send(buf);
  }
}

function broadcastJSON(msg) {
  const str = JSON.stringify(msg);
  for (const [, player] of players) {
    if (player.ws.readyState === 1) {
      player.ws.send(str);
    }
  }
}

function broadcastPlayerList() {
  broadcastJSON({
    type: "players",
    count: players.size,
    players: [...players.entries()].map(([id, p]) => ({ id, colorIdx: p.colorIdx, bodyId: p.bodyId })),
  });
}

// ─── Init packet for new client ───────────────────────────────────────────────

function buildInitPacket(playerId, bodyId, colorIdx) {
  return {
    type: "init",
    playerId,
    bodyId,
    colorIdx,
    W,
    H,
    staticBodies,
    sceneObjects,
    playerColors: PLAYER_COLORS,
    players: [...players.entries()].map(([id, p]) => ({ id, colorIdx: p.colorIdx, bodyId: p.bodyId })),
  };
}

// ─── Main loop ────────────────────────────────────────────────────────────────

setInterval(() => {
  applyPlayerInputs();
  space.step(TICK_MS / 1000);
  const frame = buildStateFrame();
  if (frame) broadcastBinary(frame);
}, TICK_MS);

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`nape-js multiplayer server — ${players.size}/${MAX_PLAYERS} players\n`);
});

const ALLOWED_ORIGINS = [
  "https://newkrok.github.io",
  "http://localhost:5500",   // Live Server (VS Code)
  "http://localhost:3000",
  "http://127.0.0.1:5500",
];

const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ origin }) => {
    if (!origin) return false; // parancssorból jövő raw WS kapcsolat elutasítva
    const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith("http://localhost"));
    if (!allowed) console.warn(`Rejected connection from origin: ${origin}`);
    return allowed;
  },
});

wss.on("connection", (ws) => {
  const result = spawnPlayer(ws);

  // ── Spectator mode ────────────────────────────────────────────────────────
  if (!result) {
    spectators.add(ws);
    console.log(`Spectator connected, total spectators: ${spectators.size}`);
    ws.send(JSON.stringify({
      type: "init",
      spectator: true,
      staticBodies,
      sceneObjects,
      playerColors: PLAYER_COLORS,
      players: [...players.entries()].map(([id, p]) => ({ id, colorIdx: p.colorIdx, bodyId: p.bodyId })),
    }));
    broadcastPlayerList();

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch (_) {}
    });

    ws.on("close", () => {
      spectators.delete(ws);
      console.log(`Spectator disconnected, total spectators: ${spectators.size}`);
    });

    ws.on("error", () => { spectators.delete(ws); });
    return;
  }

  // ── Player mode ───────────────────────────────────────────────────────────
  const { playerId, bodyId, colorIdx } = result;
  console.log(`Player ${playerId} connected (body ${bodyId}), total: ${players.size}`);

  ws.send(JSON.stringify(buildInitPacket(playerId, bodyId, colorIdx)));
  broadcastPlayerList();

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "input") {
        const player = players.get(playerId);
        if (player) player.keys = msg.keys;
      }
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (_) {}
  });

  ws.on("close", () => {
    removePlayer(playerId);
    console.log(`Player ${playerId} disconnected, total: ${players.size}`);
    broadcastPlayerList();
  });

  ws.on("error", () => {
    removePlayer(playerId);
    broadcastPlayerList();
  });
});

httpServer.listen(PORT, () => {
  console.log(`nape-js multiplayer server listening on port ${PORT}`);
});
