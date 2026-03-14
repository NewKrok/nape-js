import {
  Body, BodyType, Vec2, AABB, Circle, Polygon, MarchingSquares,
} from "../nape-js.esm.js";
import { drawBody, drawGrid } from "../renderer.js";

// ---------------------------------------------------------------------------
// Simple value noise (no external deps)
// ---------------------------------------------------------------------------

function hash(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
}

function fbm(x, y, octaves = 4) {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / max;
}

// ---------------------------------------------------------------------------
// Terrain bitmap (alpha channel based, like the original Haxe demo)
// ---------------------------------------------------------------------------

const CELL_SIZE = 25;       // physics chunk grid cell size (px)
const SUB_SIZE  = 5;        // marching squares granularity
const ISO_QUAL  = 4;        // iso-surface refinement quality
const BLAST_R_MIN = 25;     // min explosion radius (50% of max)
const BLAST_R_MAX = 50;     // max explosion radius
const BLAST_R_STEP = 5;     // scroll step
let _blastR = 37;           // current explosion radius (midpoint default)

let _bitmap = null;   // Uint8Array — alpha mask (W×H)
let _bmpW = 0;
let _bmpH = 0;

function createTerrainBitmap(W, H) {
  _bmpW = W;
  _bmpH = H;
  _bitmap = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Terrain starts from ~60% height, noise modulates the surface
      const baseY = H * 0.4;
      const noiseVal = fbm(x / 120, y / 120, 5);
      const surfaceY = baseY + noiseVal * H * 0.35;
      // Solid below surface, empty above
      _bitmap[y * W + x] = y >= surfaceY ? 255 : 0;
    }
  }
}

function sampleAlpha(x, y) {
  const ix = Math.max(0, Math.min(_bmpW - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(_bmpH - 1, Math.floor(y)));
  return _bitmap[iy * _bmpW + ix];
}

// Bilinear-interpolated iso function: negative = inside (solid), positive = outside
function terrainIso(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const a00 = sampleAlpha(ix, iy);
  const a10 = sampleAlpha(ix + 1, iy);
  const a01 = sampleAlpha(ix, iy + 1);
  const a11 = sampleAlpha(ix + 1, iy + 1);
  const fx = x - ix, fy = y - iy;
  const alpha = a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy)
              + a01 * (1 - fx) * fy + a11 * fx * fy;
  return 128 - alpha; // negative = solid
}

// ---------------------------------------------------------------------------
// Chunked terrain — each cell has its own static Body
// ---------------------------------------------------------------------------

let _cellsX = 0;
let _cellsY = 0;
let _cellBodies = null; // Body[][] (or null per cell)

function initCells(W, H) {
  _cellsX = Math.ceil(W / CELL_SIZE);
  _cellsY = Math.ceil(H / CELL_SIZE);
  _cellBodies = new Array(_cellsX * _cellsY).fill(null);
}

function buildCell(cx, cy, space) {
  const x0 = cx * CELL_SIZE;
  const y0 = cy * CELL_SIZE;
  const x1 = Math.min(x0 + CELL_SIZE, _bmpW);
  const y1 = Math.min(y0 + CELL_SIZE, _bmpH);
  if (x1 <= x0 || y1 <= y0) return;

  const bounds = new AABB(x0, y0, x1 - x0, y1 - y0);
  const cellsize = Vec2.weak(SUB_SIZE, SUB_SIZE);
  let polys;
  try {
    polys = MarchingSquares.run(terrainIso, bounds, cellsize, ISO_QUAL);
  } catch (_) {
    return;
  }

  if (polys.length === 0) { polys.clear(); return; }

  const body = new Body(BodyType.STATIC);

  for (let i = 0; i < polys.length; i++) {
    const p = polys.at(i);
    let convexParts;
    try {
      convexParts = p.simplify(1.5).convexDecomposition(true);
    } catch (_) {
      p.dispose();
      continue;
    }
    for (let j = 0; j < convexParts.length; j++) {
      const q = convexParts.at(j);
      try {
        body.shapes.add(new Polygon(q));
      } catch (_) { /* degenerate polygon — skip */ }
      q.dispose();
    }
    convexParts.clear();
    p.dispose();
  }
  polys.clear();

  if (body.shapes.length === 0) return;
  body.space = space;
  _cellBodies[cy * _cellsX + cx] = body;
}

function buildAllCells(space) {
  for (let cy = 0; cy < _cellsY; cy++) {
    for (let cx = 0; cx < _cellsX; cx++) {
      buildCell(cx, cy, space);
    }
  }
}

// Invalidate cells overlapping a region
function invalidateRegion(rx, ry, rr, space) {
  const cx0 = Math.max(0, Math.floor((rx - rr) / CELL_SIZE));
  const cy0 = Math.max(0, Math.floor((ry - rr) / CELL_SIZE));
  const cx1 = Math.min(_cellsX - 1, Math.floor((rx + rr) / CELL_SIZE));
  const cy1 = Math.min(_cellsY - 1, Math.floor((ry + rr) / CELL_SIZE));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const idx = cy * _cellsX + cx;
      if (_cellBodies[idx]) {
        _cellBodies[idx].space = null;
        _cellBodies[idx] = null;
      }
      buildCell(cx, cy, space);
    }
  }
}

// Blast: erase a circle from the bitmap, then rebuild affected cells
function blast(bx, by, space) {
  const r = _blastR;
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(bx - r));
  const y0 = Math.max(0, Math.floor(by - r));
  const x1 = Math.min(_bmpW - 1, Math.ceil(bx + r));
  const y1 = Math.min(_bmpH - 1, Math.ceil(by + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - bx, dy = y - by;
      if (dx * dx + dy * dy <= r2) {
        _bitmap[y * _bmpW + x] = 0;
      }
    }
  }
  invalidateRegion(bx, by, r, space);
}

// ---------------------------------------------------------------------------
// Offscreen canvas for terrain visualization
// ---------------------------------------------------------------------------

let _terrainCanvas = null;
let _terrainCtx = null;
let _terrainDirty = true;

function ensureTerrainCanvas(W, H) {
  if (!_terrainCanvas || _terrainCanvas.width !== W) {
    _terrainCanvas = document.createElement("canvas");
    _terrainCanvas.width = W;
    _terrainCanvas.height = H;
    _terrainCtx = _terrainCanvas.getContext("2d");
    _terrainDirty = true;
  }
}

function updateTerrainImage(W, H) {
  ensureTerrainCanvas(W, H);
  if (!_terrainDirty) return;
  const imgData = _terrainCtx.createImageData(W, H);
  const d = imgData.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = _bitmap[y * W + x];
      const i = (y * W + x) * 4;
      if (a > 128) {
        // Terrain color — earthy brown with slight depth variation
        const depth = Math.min(1, (y / H - 0.3) * 2);
        d[i]     = Math.floor(60 + depth * 40);   // R
        d[i + 1] = Math.floor(40 + depth * 30);   // G
        d[i + 2] = Math.floor(20 + depth * 15);   // B
        d[i + 3] = 220;
      } else {
        d[i + 3] = 0;
      }
    }
  }
  _terrainCtx.putImageData(imgData, 0, 0);
  _terrainDirty = false;
}

// ---------------------------------------------------------------------------
// Spawn timer state
// ---------------------------------------------------------------------------

let _spawnTimer = 0;
const SPAWN_INTERVAL = 40; // frames between spawns (~0.67s at 60fps)

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "destructible-terrain",
  label: "Destructible Terrain",
  featured: false,
  tags: ["MarchingSquares", "Terrain", "Procedural", "Click"],
  desc: "Procedural terrain built with <b>MarchingSquares</b>. <b>Click</b> to blast holes. Dynamic shapes spawn and interact with the evolving terrain.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Side walls only (no floor — terrain is the ground)
    const wallT = 20;
    const left = new Body(BodyType.STATIC, new Vec2(wallT / 2, H / 2));
    left.shapes.add(new Polygon(Polygon.box(wallT, H)));
    left.userData._isWall = true;
    left.space = space;
    const right = new Body(BodyType.STATIC, new Vec2(W - wallT / 2, H / 2));
    right.shapes.add(new Polygon(Polygon.box(wallT, H)));
    right.userData._isWall = true;
    right.space = space;

    // Generate terrain
    createTerrainBitmap(W, H);
    initCells(W, H);
    buildAllCells(space);
    _terrainDirty = true;

    // Spawn a few initial objects
    _spawnTimer = 0;
    for (let i = 0; i < 8; i++) {
      spawnObject(space, 80 + Math.random() * (W - 160), 30 + Math.random() * 60, i);
    }
  },

  step(space, W, H) {
    // Auto-spawn objects periodically
    _spawnTimer++;
    if (_spawnTimer >= SPAWN_INTERVAL && space.bodies.length < 80) {
      _spawnTimer = 0;
      spawnObject(space, 80 + Math.random() * (W - 160), 20, Math.floor(Math.random() * 100));
    }

    // Teleport fallen dynamic bodies back to the top at a random X
    for (const body of space.bodies) {
      if (body.isDynamic() && body.position.y > H + 40) {
        body.position = new Vec2(80 + Math.random() * (W - 160), -20);
        body.velocity = new Vec2(0, 0);
        body.angularVel = 0;
      }
    }
  },

  click(x, y, space, W, H) {
    blast(x, y, space);
    _terrainDirty = true;
  },

  // Custom renderer: draw terrain bitmap + physics bodies on top
  render(ctx, space, W, H, debugDraw) {
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);

    // Draw terrain bitmap
    updateTerrainImage(W, H);
    ctx.drawImage(_terrainCanvas, 0, 0);

    // Draw dynamic bodies + side walls (terrain bodies are visualized via bitmap)
    for (const body of space.bodies) {
      if (body.isDynamic() || body.userData._isWall) drawBody(ctx, body, debugDraw);
    }

    // Draw blast cursor hint
    drawBlastCursor(ctx);
  },

  // 3D overlay: blast cursor hint on top of the 3D scene
  render3dOverlay(ctx, space, W, H) {
    drawBlastCursor(ctx);
  },

  hover(x, y) {
    _lastMouseX = x;
    _lastMouseY = y;
  },

  wheel(deltaY) {
    _blastR += deltaY > 0 ? -BLAST_R_STEP : BLAST_R_STEP;
    _blastR = Math.max(BLAST_R_MIN, Math.min(BLAST_R_MAX, _blastR));
  },

  code2d: `// Destructible Terrain — MarchingSquares + bitmap erosion
const space = new Space(new Vec2(0, 600));
const W = 900, H = 500;

// Value noise for terrain generation
function hash(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
}
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx*fx*(3-2*fx), sy = fy*fy*(3-2*fy);
  return hash(ix,iy)*(1-sx)*(1-sy) + hash(ix+1,iy)*sx*(1-sy)
       + hash(ix,iy+1)*(1-sx)*sy + hash(ix+1,iy+1)*sx*sy;
}
function fbm(x, y) {
  let v=0, a=1, f=1, m=0;
  for (let i=0;i<4;i++) { v+=smoothNoise(x*f,y*f)*a; m+=a; a*=0.5; f*=2; }
  return v/m;
}

// Alpha bitmap: 255 = solid, 0 = empty
const bitmap = new Uint8Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const surfY = H*0.4 + fbm(x/120, y/120)*H*0.35;
    bitmap[y*W+x] = y >= surfY ? 255 : 0;
  }

// Iso function (negative = solid)
function iso(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x-ix, fy = y-iy;
  const s = (px,py) => bitmap[Math.max(0,Math.min(H-1,py))*W + Math.max(0,Math.min(W-1,px))];
  return 128 - (s(ix,iy)*(1-fx)*(1-fy) + s(ix+1,iy)*fx*(1-fy)
              + s(ix,iy+1)*(1-fx)*fy + s(ix+1,iy+1)*fx*fy);
}

// Build chunked terrain
const CELL = 25;
const cellsX = Math.ceil(W/CELL), cellsY = Math.ceil(H/CELL);
const cells = new Array(cellsX*cellsY).fill(null);

function buildCell(cx, cy) {
  const x0=cx*CELL, y0=cy*CELL;
  const bounds = new AABB(x0, y0, Math.min(CELL,W-x0), Math.min(CELL,H-y0));
  const polys = MarchingSquares.run(iso, bounds, Vec2.weak(5,5), 4);
  if (!polys.length) { polys.clear(); return; }
  const body = new Body(BodyType.STATIC);
  for (let i=0;i<polys.length;i++) {
    const parts = polys.at(i).simplify(1.5).convexDecomposition(true);
    for (let j=0;j<parts.length;j++) {
      try { body.shapes.add(new Polygon(parts.at(j))); } catch(_) {}
      parts.at(j).dispose();
    }
    parts.clear(); polys.at(i).dispose();
  }
  polys.clear();
  if (body.shapes.length) { body.space = space; cells[cy*cellsX+cx] = body; }
}

for (let cy=0;cy<cellsY;cy++) for (let cx=0;cx<cellsX;cx++) buildCell(cx,cy);

// Click to blast
canvasWrap.addEventListener("click", (e) => {
  const rect = canvasWrap.getBoundingClientRect();
  const bx = (e.clientX-rect.left)/rect.width*W;
  const by = (e.clientY-rect.top)/rect.height*H;
  const R = 50, R2 = R*R;
  for (let y=Math.max(0,by-R|0);y<=Math.min(H-1,by+R|0);y++)
    for (let x=Math.max(0,bx-R|0);x<=Math.min(W-1,bx+R|0);x++)
      if ((x-bx)**2+(y-by)**2 <= R2) bitmap[y*W+x] = 0;
  // Rebuild affected cells
  const cx0=Math.max(0,(bx-R)/CELL|0), cy0=Math.max(0,(by-R)/CELL|0);
  const cx1=Math.min(cellsX-1,(bx+R)/CELL|0), cy1=Math.min(cellsY-1,(by+R)/CELL|0);
  for (let cy=cy0;cy<=cy1;cy++) for (let cx=cx0;cx<=cx1;cx++) {
    if (cells[cy*cellsX+cx]) { cells[cy*cellsX+cx].space=null; cells[cy*cellsX+cx]=null; }
    buildCell(cx,cy);
  }
});

// Spawn shapes
for (let i=0;i<8;i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(80+Math.random()*740, 30+Math.random()*60));
  b.shapes.add(Math.random()<0.5 ? new Circle(8+Math.random()*12) : new Polygon(Polygon.regular(12+Math.random()*10, 12+Math.random()*10, 3+Math.floor(Math.random()*3))));
  b.space = space;
}

function loop() {
  space.step(1/60, 8, 3);
  ctx.clearRect(0,0,W,H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _lastMouseX = 450;
let _lastMouseY = 250;

function drawBlastCursor(ctx) {
  ctx.strokeStyle = "rgba(255,100,50,0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(_lastMouseX, _lastMouseY, _blastR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function spawnObject(space, x, y, idx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(8 + Math.random() * 12));
  } else {
    const sides = 3 + Math.floor(Math.random() * 3);
    const r = 10 + Math.random() * 12;
    body.shapes.add(new Polygon(Polygon.regular(r, r, sides)));
  }
  body.userData._colorIdx = idx;
  body.space = space;
  return body;
}
