import {
  Body, BodyType, Vec2, Capsule, Material,
  buildTilemapBody, meshTilemap, CharacterController,
} from "../nape-js.esm.js?v=3.42.0";
import { drawBody, drawGrid, COLORS } from "../renderer.js?v=3.42.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.0";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE = 24;
const COLS = 108; // 3× wider than the original 36
const ROWS = 40;  // 2× taller than the original 20
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const PLAYER_W = 16;
const PLAYER_H = 30;
const GRAVITY = 800;
const MOVE_SPEED = 180;
const JUMP_SPEED = 380;
const COYOTE_MS = 100;
const JUMP_BUFFER_MS = 100;
const WALL_JUMP_VX = 200;
const WALL_JUMP_VY = -340;
const WALL_SLIDE_MAX_VY = 80;
const WALL_JUMP_LOCK_MS = 150;
const DT = 1 / 60;

// ---------------------------------------------------------------------------
// Procedural level generator
// ---------------------------------------------------------------------------
// Builds a wide platformer level with a varying ground line + floating
// platforms scattered across the world. Deterministic seeded RNG so the
// layout is the same each load.

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateLevel(cols, rows, seed = 1337) {
  const rng = makeRng(seed);
  const grid = [];
  for (let y = 0; y < rows; y++) grid.push(new Array(cols).fill(0));

  // Outer walls + floor
  for (let x = 0; x < cols; x++) {
    grid[0][x] = 1;
    grid[rows - 1][x] = 1;
  }
  for (let y = 0; y < rows; y++) {
    grid[y][0] = 1;
    grid[y][cols - 1] = 1;
  }

  // Ground line (varying height, never above row rows-6)
  const groundMin = rows - 10;
  const groundMax = rows - 2;
  let g = rows - 4;
  for (let x = 1; x < cols - 1; x++) {
    if (rng() < 0.18) g += rng() < 0.5 ? -1 : 1;
    if (g < groundMin) g = groundMin;
    if (g > groundMax) g = groundMax;
    for (let y = g; y < rows - 1; y++) grid[y][x] = 1;
  }

  // Carve a few caves / overhangs in the ground
  for (let i = 0; i < 14; i++) {
    const cx = 4 + Math.floor(rng() * (cols - 8));
    const cy = rows - 4 - Math.floor(rng() * 4);
    const w = 2 + Math.floor(rng() * 4);
    const h = 1 + Math.floor(rng() * 2);
    for (let y = cy; y < cy + h; y++) {
      for (let x = cx; x < cx + w; x++) {
        if (y > 0 && y < rows - 1 && x > 0 && x < cols - 1) grid[y][x] = 0;
      }
    }
  }

  // Floating platforms — varied sizes, spread across the level
  const platCount = 60;
  for (let i = 0; i < platCount; i++) {
    const w = 2 + Math.floor(rng() * 6);
    const h = 1;
    const x = 3 + Math.floor(rng() * (cols - w - 6));
    const y = 3 + Math.floor(rng() * (rows - 14));
    // Avoid overlapping the ground line area too aggressively
    let ok = true;
    for (let yy = y - 2; yy <= y + 2 && ok; yy++) {
      for (let xx = x - 1; xx <= x + w && ok; xx++) {
        if (yy < 0 || yy >= rows || xx < 0 || xx >= cols) continue;
        if (grid[yy][xx]) ok = false;
      }
    }
    if (!ok) continue;
    for (let xx = x; xx < x + w; xx++) {
      for (let yy = y; yy < y + h; yy++) grid[yy][xx] = 1;
    }
  }

  // Tall pillars (vertical chunks) for variety
  for (let i = 0; i < 10; i++) {
    const x = 5 + Math.floor(rng() * (cols - 10));
    const top = 6 + Math.floor(rng() * 10);
    const height = 3 + Math.floor(rng() * 6);
    for (let y = top; y < top + height && y < rows - 2; y++) {
      grid[y][x] = 1;
      if (rng() < 0.4) grid[y][x + 1] = 1;
    }
  }

  // Carve guaranteed clear spawn area in the lower-left
  for (let y = rows - 8; y < rows - 4; y++) {
    for (let x = 2; x < 8; x++) grid[y][x] = 0;
  }

  // Stamp "NAPE-JS" out of solid tiles near spawn so it's immediately visible.
  // Glyphs are 5 wide + 1 space = 6 per char × 7 chars = 42 columns.
  stampText(grid, "NAPE-JS", 10, rows - 18);

  return grid;
}

// ---------------------------------------------------------------------------
// 5×7 bitmap font — just the glyphs we need for "NAPE-JS"
// ---------------------------------------------------------------------------
// Each glyph is 7 rows of 5 chars; '#' = solid, '.' = empty.

const FONT_5x7 = {
  N: [
    "#...#",
    "##..#",
    "#.#.#",
    "#..##",
    "#...#",
    "#...#",
    "#...#",
  ],
  A: [
    ".###.",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  P: [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  E: [
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#####",
  ],
  J: [
    "..###",
    "...#.",
    "...#.",
    "...#.",
    "...#.",
    "#..#.",
    ".##..",
  ],
  S: [
    ".####",
    "#....",
    "#....",
    ".###.",
    "....#",
    "....#",
    "####.",
  ],
  "-": [
    ".....",
    ".....",
    ".....",
    "#####",
    ".....",
    ".....",
    ".....",
  ],
};

function stampText(grid, text, gx, gy) {
  const rows = grid.length;
  const cols = grid[0].length;
  let cx = gx;
  for (const ch of text) {
    const glyph = FONT_5x7[ch];
    if (!glyph) { cx += 6; continue; }
    for (let yy = 0; yy < 7; yy++) {
      const row = glyph[yy];
      for (let xx = 0; xx < 5; xx++) {
        const tx = cx + xx;
        const ty = gy + yy;
        if (ty < 1 || ty >= rows - 1 || tx < 1 || tx >= cols - 1) continue;
        if (row.charCodeAt(xx) === 35 /* '#' */) {
          grid[ty][tx] = 1;
        } else {
          // Carve an air pocket around letters so they read clearly
          grid[ty][tx] = 0;
        }
      }
    }
    cx += 6; // glyph width + 1 space
  }
}

// ---------------------------------------------------------------------------
// Procedural texture cache (built once on demand)
// ---------------------------------------------------------------------------
// Generates 4 dirt-tile variants + 1 grass-top overlay on an OffscreenCanvas
// (or regular canvas fallback). Used by both the canvas2d renderer and the
// PixiJS adapter (as a Texture).

let _tileAtlas = null; // { canvas, dirt: [4 sub-rects], grass: rect }

function buildTileAtlas() {
  if (_tileAtlas) return _tileAtlas;

  const W = TILE * 5;     // 4 dirt + 1 grass
  const H = TILE;
  const cnv = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(W, H)
    : Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = cnv.getContext("2d");

  const rng = makeRng(424242);
  const drawDirt = (ox) => {
    // Base brown gradient (lighter on top)
    const grad = ctx.createLinearGradient(0, 0, 0, TILE);
    grad.addColorStop(0, "#8b5a2b");
    grad.addColorStop(1, "#5a3a1a");
    ctx.fillStyle = grad;
    ctx.fillRect(ox, 0, TILE, TILE);

    // Speckle noise
    for (let i = 0; i < 60; i++) {
      const x = ox + Math.floor(rng() * TILE);
      const y = Math.floor(rng() * TILE);
      const v = Math.floor(rng() * 60) - 30;
      ctx.fillStyle = v >= 0
        ? `rgba(255,220,170,${(v / 30) * 0.18})`
        : `rgba(0,0,0,${(-v / 30) * 0.22})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // 2-3 pebbles
    const pebbles = 2 + Math.floor(rng() * 2);
    for (let p = 0; p < pebbles; p++) {
      const px = ox + 2 + rng() * (TILE - 4);
      const py = 2 + rng() * (TILE - 4);
      const r = 1 + rng() * 1.6;
      ctx.fillStyle = `rgba(40,25,12,${0.5 + rng() * 0.3})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,230,190,0.18)";
      ctx.beginPath();
      ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner edge shading (darker outline for tile separation)
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, 0.5, TILE - 1, TILE - 1);
  };

  for (let i = 0; i < 4; i++) drawDirt(i * TILE);

  // Grass top overlay (transparent bg, drawn over dirt where tile-above is empty)
  const gx = 4 * TILE;
  // Green gradient band on top ~9 px
  const grassGrad = ctx.createLinearGradient(0, 0, 0, 10);
  grassGrad.addColorStop(0, "#5fcc4f");
  grassGrad.addColorStop(1, "#2f7a28");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(gx, 0, TILE, 7);

  // Random grass blades sticking up
  for (let i = 0; i < 9; i++) {
    const x = gx + Math.floor(rng() * TILE);
    const h = 2 + Math.floor(rng() * 5);
    ctx.fillStyle = i % 2 === 0 ? "#8be36b" : "#5fcc4f";
    ctx.fillRect(x, 7 - h, 1, h);
    if (rng() < 0.4) ctx.fillRect(x + 1, 7 - h + 1, 1, h - 1);
  }

  // Soft highlight along the very top
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(gx, 0, TILE, 1);

  _tileAtlas = {
    canvas: cnv,
    dirt: [0, TILE, TILE * 2, TILE * 3], // x offsets
    grass: gx,
  };
  return _tileAtlas;
}

// Pick a tile variant from grid coords (deterministic so it doesn't flicker)
function tileVariant(x, y) {
  return ((x * 73856093) ^ (y * 19349663)) & 3;
}

// ---------------------------------------------------------------------------
// Module-scope state
// ---------------------------------------------------------------------------

let grid = null;
let mapBody = null;
let mapRects = [];
let player = null;
let cc = null;
let keys = {};
let prevJumpKey = false;
let jumpBufferTimer = 0;
let _THREE = null;
let _lastCamX = 0;
let _lastCamY = 0;
let _showGreedyOverlay = false;
let playerFacingRight = true;
let wallJumpLockTimer = 0;
let wallJumpKickVx = 0;
let wallSliding = false;
let lastWallJumpSide = 0;

// ---------------------------------------------------------------------------
// Build / rebuild the tilemap body
// ---------------------------------------------------------------------------

function rebuildMap(space) {
  if (mapBody) {
    mapBody.space = null;
    mapBody = null;
  }
  mapRects = meshTilemap(grid, { merge: "greedy" });
  mapBody = buildTilemapBody(grid, {
    tileSize: TILE,
    merge: "greedy",
    material: new Material(0, 0.6, 0.8, 1),
  });
  try {
    mapBody.userData._isTilemap = true;
    mapBody.userData._isZone = true;     // makes Pixi debug-fill nearly transparent
    mapBody.userData._hidden3d = true;   // 3D builds its own meshes from `grid`
  } catch (_) {}
  mapBody.space = space;
}

// True if the tile above (x, y) is empty — we draw a grass cap there.
function hasGrassTop(x, y) {
  if (y <= 0) return true;
  return !grid[y - 1][x];
}

function countSolid(g) {
  let n = 0;
  for (const row of g) for (const v of row) if (v) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

export default {
  id: "tilemap",
  label: "Tilemap (Greedy Meshing)",
  featured: false,
  tags: ["Tilemap", "Greedy Meshing", "Platformer", "CharacterController", "Click", "Camera"],
  desc:
    "A 108×40 procedurally-generated platformer level converted to physics with " +
    "<b>buildTilemapBody</b>. Greedy meshing reduces hundreds of solid tiles into " +
    "a handful of rectangles. Procedurally-textured dirt + grass tiles, camera " +
    "follows the player. <b>Click</b> a tile to toggle solid/empty (rebuilds the body). " +
    "<b>WASD/Arrows</b> + <b>Space</b> to play. <b>O</b> toggles greedy-rect overlay.",
  walls: false,

  camera: null,

  setup(space, W, H) {
    // Drop any stale handlers from a previous demo run before installing
    // new ones — otherwise hot-reloading the demo registers the toggle
    // listener twice and `O` cancels itself out within the same keystroke.
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);

    space.gravity = new Vec2(0, GRAVITY);

    grid = generateLevel(COLS, ROWS, 1337);
    rebuildMap(space);
    buildTileAtlas();

    // Spawn at the cleared lower-left area
    const spawnX = 4 * TILE;
    const spawnY = (ROWS - 6) * TILE;

    player = new Body(BodyType.DYNAMIC, new Vec2(spawnX, spawnY));
    const playerShape = new Capsule(PLAYER_H, PLAYER_W, undefined, new Material(0, 0.3, 0.3, 1));
    player.shapes.add(playerShape);
    player.rotation = Math.PI / 2;
    player.allowRotation = false;
    player.isBullet = true;
    player.space = space;
    try { player.userData._colorIdx = 3; } catch (_) {}

    cc = new CharacterController(space, player, {
      maxSlopeAngle: Math.PI / 3,
    });

    this.camera = {
      follow: player,
      offsetX: 0,
      offsetY: -40,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.14,
    };

    keys = {};
    prevJumpKey = false;
    jumpBufferTimer = 0;
    playerFacingRight = true;
    wallJumpLockTimer = 0;
    wallJumpKickVx = 0;
    wallSliding = false;
    lastWallJumpSide = 0;

    this._onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "KeyO") _showGreedyOverlay = !_showGreedyOverlay;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") e.preventDefault();
    };
    this._onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  },

  cleanup() {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
  },

  step(space, W, H) {
    if (!cc || !player) return;

    const left = keys["ArrowLeft"] || keys["KeyA"];
    const right = keys["ArrowRight"] || keys["KeyD"];
    const jumpKey = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];
    const jumpJustPressed = jumpKey && !prevJumpKey;
    prevJumpKey = jumpKey;

    let moveX = 0;
    if (left) { moveX = -MOVE_SPEED; playerFacingRight = false; }
    if (right) { moveX = MOVE_SPEED; playerFacingRight = true; }

    const result = cc.update();

    // Jump buffer
    if (jumpJustPressed) jumpBufferTimer = JUMP_BUFFER_MS;
    else jumpBufferTimer = Math.max(0, jumpBufferTimer - 1000 * DT);

    // Wall-jump lock — briefly prevents horizontal input override
    wallJumpLockTimer = Math.max(0, wallJumpLockTimer - 1000 * DT);

    let velY = player.velocity.y;

    // Wall-slide detection
    const onWall = !result.grounded && (result.wallLeft || result.wallRight);
    const holdingIntoWall =
      (result.wallLeft && left) || (result.wallRight && right);
    wallSliding = onWall && holdingIntoWall && velY >= 0;

    if (result.grounded) lastWallJumpSide = 0;

    const canJump = result.grounded || result.timeSinceGrounded * 1000 < COYOTE_MS;
    const wallSide = result.wallLeft ? -1 : result.wallRight ? 1 : 0;
    const canWallJump = !result.grounded && onWall && wallSide !== lastWallJumpSide;
    let jumped = false;
    let wallJumped = false;

    if (jumpBufferTimer > 0 && canJump) {
      velY = -JUMP_SPEED;
      jumpBufferTimer = 0;
      jumped = true;
      lastWallJumpSide = 0;
    } else if (jumpBufferTimer > 0 && canWallJump) {
      velY = WALL_JUMP_VY;
      wallJumpKickVx = result.wallLeft ? WALL_JUMP_VX : -WALL_JUMP_VX;
      moveX = wallJumpKickVx;
      playerFacingRight = result.wallLeft;
      wallJumpLockTimer = WALL_JUMP_LOCK_MS;
      jumpBufferTimer = 0;
      wallJumped = true;
      lastWallJumpSide = wallSide;
    }

    if (!jumpKey && velY < 0) velY *= 0.85;

    // Compose final velocity
    let newVx;
    if (wallJumpLockTimer > 0) {
      newVx = wallJumpKickVx;
    } else {
      newVx = moveX;
    }

    let newVy = player.velocity.y;
    if (jumped || wallJumped) {
      newVy = velY;
    } else if (wallSliding && newVy > WALL_SLIDE_MAX_VY) {
      newVy = WALL_SLIDE_MAX_VY;
    } else if (!jumpKey && newVy < 0) {
      newVy = velY;
    }

    player.velocity = new Vec2(newVx, newVy);

    if (player.position.y > WORLD_H + 100) {
      player.position = new Vec2(4 * TILE, (ROWS - 6) * TILE);
      player.velocity = new Vec2(0, 0);
    }
  },

  click(x, y, space, W, H) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (ty < 0 || ty >= grid.length) return;
    if (tx < 0 || tx >= grid[ty].length) return;
    grid[ty][tx] = grid[ty][tx] ? 0 : 1;
    rebuildMap(space);
  },

  // ---- Canvas2D render ----
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);

    // Sky gradient backdrop (in viewport space — fills behind everything)
    ctx.restore();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0d1117");
    sky.addColorStop(1, "#1a2332");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-camX, -camY);

    // Subtle grid only in empty tiles area (behind tiles)
    drawGrid(ctx, W, H, camX, camY);

    // ---- Tilemap textured rendering (only visible tiles) ----
    const atlas = buildTileAtlas();
    const minTx = Math.max(0, Math.floor(camX / TILE));
    const maxTx = Math.min(COLS - 1, Math.ceil((camX + W) / TILE));
    const minTy = Math.max(0, Math.floor(camY / TILE));
    const maxTy = Math.min(ROWS - 1, Math.ceil((camY + H) / TILE));

    // Pass 1: dirt
    for (let y = minTy; y <= maxTy; y++) {
      const row = grid[y];
      for (let x = minTx; x <= maxTx; x++) {
        if (!row[x]) continue;
        const v = tileVariant(x, y);
        ctx.drawImage(
          atlas.canvas,
          atlas.dirt[v], 0, TILE, TILE,
          x * TILE, y * TILE, TILE, TILE,
        );
      }
    }
    // Pass 2: grass tops where tile above is empty
    for (let y = minTy; y <= maxTy; y++) {
      const row = grid[y];
      for (let x = minTx; x <= maxTx; x++) {
        if (!row[x] || !hasGrassTop(x, y)) continue;
        ctx.drawImage(
          atlas.canvas,
          atlas.grass, 0, TILE, TILE,
          x * TILE, y * TILE, TILE, TILE,
        );
      }
    }

    // Greedy rect overlay (toggle with O)
    if (_showGreedyOverlay) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(77,193,255,0.85)";
      for (const r of mapRects) {
        ctx.strokeRect(r.x * TILE + 1, r.y * TILE + 1, r.w * TILE - 2, r.h * TILE - 2);
      }
    }

    // Player — same renderer as the CharacterController demo
    if (player) {
      drawBody(ctx, player, showOutlines);
      const px = player.position.x;
      const py = player.position.y;
      ctx.fillStyle = cc?.grounded ? "#3fb950" : "#f85149";
      ctx.beginPath();
      ctx.arc(px + (playerFacingRight ? 4 : -4), py - PLAYER_H / 2 + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // ---- HUD (screen space) ----
    const solidCount = countSolid(grid);
    ctx.fillStyle = "rgba(13,17,23,0.7)";
    ctx.fillRect(8, 8, 240, 64);
    ctx.fillStyle = COLORS?.text ?? "#e6edf3";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(`Solid tiles: ${solidCount}`, 16, 26);
    ctx.fillText(`Greedy rects: ${mapRects.length}` +
      (solidCount > 0 ? `  (${(solidCount / mapRects.length).toFixed(1)}× fewer)` : ""), 16, 44);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("[O] toggle greedy overlay", 16, 62);
  },

  // ---- PixiJS render ----
  renderPixi(adapter, space, W, H, showOutlines, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    // Lazy-build the texture atlas for Pixi from the same off-screen canvas
    if (!app.stage._tileTextures) {
      const atlas = buildTileAtlas();
      const baseTex = PIXI.Texture.from(atlas.canvas);
      const dirt = atlas.dirt.map(ox =>
        new PIXI.Texture({ source: baseTex.source, frame: new PIXI.Rectangle(ox, 0, TILE, TILE) }),
      );
      const grass = new PIXI.Texture({
        source: baseTex.source,
        frame: new PIXI.Rectangle(atlas.grass, 0, TILE, TILE),
      });
      app.stage._tileTextures = { dirt, grass };
    }
    const { dirt, grass } = app.stage._tileTextures;

    // Tile container — rebuild lazily when grid mutates.
    // Added on top so textured tiles cover the debug-draw shapes (the tilemap
    // body has _isZone=true so its fill alpha is already near-transparent,
    // but we still want to hide the outline).
    if (!app.stage._tileContainer) {
      app.stage._tileContainer = new PIXI.Container();
      app.stage.addChild(app.stage._tileContainer);
      app.stage._tileGridStamp = -1;
    }
    const stamp = countSolid(grid);
    if (app.stage._tileGridStamp !== stamp) {
      const c = app.stage._tileContainer;
      c.removeChildren();
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!grid[y][x]) continue;
          const v = tileVariant(x, y);
          const s = new PIXI.Sprite(dirt[v]);
          s.x = x * TILE;
          s.y = y * TILE;
          c.addChild(s);
          if (hasGrassTop(x, y)) {
            const g = new PIXI.Sprite(grass);
            g.x = x * TILE;
            g.y = y * TILE;
            c.addChild(g);
          }
        }
      }
      app.stage._tileGridStamp = stamp;
    }

    // Sync the debug draw — it draws into its own container which we keep
    // below the tile container so the textured tiles cover the debug shapes
    // for the static tilemap body.
    adapter.syncBodies(space);

    // Greedy rect overlay
    if (!app.stage._greedyGfx) {
      app.stage._greedyGfx = new PIXI.Graphics();
      app.stage.addChild(app.stage._greedyGfx);
    }
    const gfx = app.stage._greedyGfx;
    gfx.clear();
    if (_showGreedyOverlay) {
      for (const r of mapRects) {
        gfx.rect(r.x * TILE + 1, r.y * TILE + 1, r.w * TILE - 2, r.h * TILE - 2);
      }
      gfx.stroke({ color: 0x4dc1ff, width: 2, alpha: 0.85 });
    }

    // Z-order: tile container above debug, greedy overlay above tiles.
    const last = app.stage.children.length - 1;
    app.stage.setChildIndex(app.stage._tileContainer, last - 1);
    app.stage.setChildIndex(app.stage._greedyGfx, last);

    // Camera offset
    app.stage.x = -camX;
    app.stage.y = -camY;

    app.render();
  },

  // ---- Three.js render ----
  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter = null) {
    _lastCamX = camX;
    _lastCamY = camY;

    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    const THREE = _THREE;

    // Camera follows world-space camera offset
    const camZ = camera.position.z;
    camera.position.set(W / 2 + camX, -H / 2 - camY, camZ);
    camera.lookAt(W / 2 + camX, -H / 2 - camY, 0);

    // Let the default adapter manage every body that isn't the tilemap
    // (the tilemap body is `_hidden3d`, so the adapter skips it). This way
    // the player capsule uses the shared CapsuleGeometry path and stays
    // visually consistent with the CharacterController demo.
    adapter?.syncBodies(space);

    // Build tilemap meshes from greedy rects (lazy + invalidate when grid changes)
    const stamp = countSolid(grid);
    if (scene.userData._tileStamp !== stamp) {
      // Dispose old
      if (scene.userData._tileGroup) {
        const old = scene.userData._tileGroup;
        scene.remove(old);
        old.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        });
      }

      const group = new THREE.Group();
      // Build a dirt texture from our atlas
      if (!scene.userData._dirtTex) {
        const atlas = buildTileAtlas();
        // Crop the atlas down to a single dirt tile so it tiles cleanly
        const sliceCnv = (typeof OffscreenCanvas !== "undefined")
          ? new OffscreenCanvas(TILE, TILE)
          : Object.assign(document.createElement("canvas"), { width: TILE, height: TILE });
        const sctx = sliceCnv.getContext("2d");
        sctx.drawImage(atlas.canvas, atlas.dirt[0], 0, TILE, TILE, 0, 0, TILE, TILE);
        const tex = new THREE.CanvasTexture(sliceCnv);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.magFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.userData._dirtTex = tex;

        // Grass top texture
        const grassCnv = (typeof OffscreenCanvas !== "undefined")
          ? new OffscreenCanvas(TILE, TILE)
          : Object.assign(document.createElement("canvas"), { width: TILE, height: TILE });
        const gctx = grassCnv.getContext("2d");
        gctx.drawImage(atlas.canvas, atlas.grass, 0, TILE, TILE, 0, 0, TILE, TILE);
        const gtex = new THREE.CanvasTexture(grassCnv);
        gtex.wrapS = THREE.RepeatWrapping;
        gtex.wrapT = THREE.RepeatWrapping;
        gtex.magFilter = THREE.NearestFilter;
        gtex.colorSpace = THREE.SRGBColorSpace;
        scene.userData._grassTex = gtex;
      }

      const grassMat = new THREE.MeshPhongMaterial({
        color: 0x4ea83a, shininess: 20, specular: 0x335533,
      });

      // One BoxGeometry per greedy rect. Each rect needs its own texture
      // instance because we set per-rect `repeat` to tile the dirt pattern
      // across the full width/height of the merged rectangle.
      for (const r of mapRects) {
        const w = r.w * TILE;
        const h = r.h * TILE;
        const depth = 30;
        const cx = r.x * TILE + w / 2;
        const cy = -(r.y * TILE + h / 2); // three uses +Y up

        const geom = new THREE.BoxGeometry(w, h, depth);
        const tex = scene.userData._dirtTex.clone();
        tex.repeat.set(r.w, r.h);
        tex.needsUpdate = true;
        const mat = new THREE.MeshPhongMaterial({
          map: tex, shininess: 8, specular: 0x222222,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(cx, cy, 0);
        group.add(mesh);

        // Grass cap on top if any tile in this rect's top row has empty above
        let hasAnyGrass = false;
        for (let xi = r.x; xi < r.x + r.w && !hasAnyGrass; xi++) {
          if (hasGrassTop(xi, r.y)) hasAnyGrass = true;
        }
        if (hasAnyGrass) {
          const grassH = 4;
          const gGeom = new THREE.BoxGeometry(w, grassH, depth + 0.5);
          const gMesh = new THREE.Mesh(gGeom, grassMat);
          gMesh.position.set(cx, cy + h / 2 + grassH / 2, 0);
          group.add(gMesh);
        }
      }

      scene.add(group);
      scene.userData._tileGroup = group;
      scene.userData._tileStamp = stamp;
    }

    // Greedy rect overlay (lazy + invalidate when grid changes). Drawn as
    // line segments floating just in front of the tile blocks so it reads
    // clearly against the textured surface.
    if (scene.userData._greedyStamp !== stamp) {
      if (scene.userData._greedyLines) {
        scene.remove(scene.userData._greedyLines);
        scene.userData._greedyLines.geometry.dispose();
        scene.userData._greedyLines.material.dispose();
        scene.userData._greedyLines = null;
      }
      const positions = [];
      const zFront = 17; // just in front of tile depth (boxes span -15..+15)
      for (const r of mapRects) {
        const x0 = r.x * TILE + 1;
        const y0 = -(r.y * TILE + 1);
        const x1 = (r.x + r.w) * TILE - 1;
        const y1 = -((r.y + r.h) * TILE - 1);
        positions.push(
          x0, y0, zFront, x1, y0, zFront,
          x1, y0, zFront, x1, y1, zFront,
          x1, y1, zFront, x0, y1, zFront,
          x0, y1, zFront, x0, y0, zFront,
        );
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const lm = new THREE.LineBasicMaterial({
        color: 0x4dc1ff, transparent: true, opacity: 0.85,
      });
      const lines = new THREE.LineSegments(lg, lm);
      lines.visible = _showGreedyOverlay;
      scene.add(lines);
      scene.userData._greedyLines = lines;
      scene.userData._greedyStamp = stamp;
    }
    if (scene.userData._greedyLines) {
      scene.userData._greedyLines.visible = _showGreedyOverlay;
    }

    // Lights (lazy)
    if (!scene.userData._tileLightsAdded) {
      const amb = new THREE.AmbientLight(0xffffff, 0.55);
      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(0.4, 1, 0.6);
      scene.add(amb);
      scene.add(dir);
      scene.userData._tileLightsAdded = true;
    }

    renderer.render(scene, camera);
  },

  // ---- HUD overlay (used by both Three.js and PixiJS modes) ----
  render3dOverlay(ctx, space, W, H) {
    const solidCount = countSolid(grid);
    ctx.save();
    ctx.fillStyle = "rgba(13,17,23,0.7)";
    ctx.fillRect(8, 8, 240, 64);
    ctx.fillStyle = COLORS?.text ?? "#e6edf3";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(`Solid tiles: ${solidCount}`, 16, 26);
    ctx.fillText(`Greedy rects: ${mapRects.length}` +
      (solidCount > 0 ? `  (${(solidCount / mapRects.length).toFixed(1)}× fewer)` : ""), 16, 44);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("[O] toggle greedy overlay", 16, 62);
    ctx.restore();
  },
};
