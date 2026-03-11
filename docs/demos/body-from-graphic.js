import {
  Body, BodyType, Vec2, AABB, Polygon, MarchingSquares, PivotJoint,
} from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

// ---------------------------------------------------------------------------
// IsoBody — mirrors the Haxe IsoBody utility class
// ---------------------------------------------------------------------------

function isoBodyRun(isoFn, bounds, granularity = null, quality = 2, simplification = 1.5) {
  const body = new Body();
  const cellsize = granularity ?? Vec2.weak(8, 8);
  const polys = MarchingSquares.run(isoFn, bounds, cellsize, quality);

  for (let i = 0; i < polys.length; i++) {
    const p = polys.at(i);
    const qolys = p.simplify(simplification).convexDecomposition(true);
    for (let j = 0; j < qolys.length; j++) {
      const q = qolys.at(j);
      body.shapes.add(new Polygon(q));
      q.dispose();
    }
    qolys.clear();
    p.dispose();
  }
  polys.clear();

  const com = body.localCOM;
  const pivot = Vec2.get(-com.x, -com.y);
  body.translateShapes(pivot);
  pivot.dispose();

  return body;
}

// ---------------------------------------------------------------------------
// Luminance-based iso (opaque image, dark = inside)
// ---------------------------------------------------------------------------

function createLuminanceIso(canvas, threshold = 128) {
  const w = canvas.width, h = canvas.height;
  const data = canvas.getContext("2d").getImageData(0, 0, w, h).data;

  function luma(ix, iy) {
    ix = Math.max(0, Math.min(w - 1, ix));
    iy = Math.max(0, Math.min(h - 1, iy));
    const i = (iy * w + ix) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return {
    bounds: new AABB(0, 0, w, h),
    iso(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const a11 = luma(ix,     iy)     - threshold;
      const a12 = luma(ix + 1, iy)     - threshold;
      const a21 = luma(ix,     iy + 1) - threshold;
      const a22 = luma(ix + 1, iy + 1) - threshold;
      const fx = x - ix, fy = y - iy;
      return a11*(1-fx)*(1-fy) + a12*fx*(1-fy) + a21*(1-fx)*fy + a22*fx*fy;
    },
  };
}

// ---------------------------------------------------------------------------
// Preloaded assets
// ---------------------------------------------------------------------------

let _cogCanvas = null;

async function loadImageToCanvas(src, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { canvas.getContext("2d").drawImage(img, 0, 0, width, height); resolve(); };
    img.onerror = reject;
    img.src = src;
  });
  return canvas;
}

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

let _mouseBody   = null;
let _grabJoint   = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0, _dragY = 0;

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

// 3 cogs at different physical sizes (px) — each gets its own MarchingSquares run
const COG_SIZES = [120, 160, 200];

export default {
  id: "body-from-graphic",
  label: "Body From Graphic",
  featured: false,
  tags: ["MarchingSquares", "Procedural"],
  desc: "Uses <b>MarchingSquares</b> to extract physics bodies from the cog bitmap. Three sizes, each processed independently. <b>Drag</b> any cog with the mouse.",

  async preload() {
    // Load at the largest required size; smaller ones will be downscaled from this
    _cogCanvas = await loadImageToCanvas("./assets/cog.webp", COG_SIZES[COG_SIZES.length - 1], COG_SIZES[COG_SIZES.length - 1]);
  },

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);

    // Reset drag state
    _mouseBody = null;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;
    _dragX = 0; _dragY = 0;

    // Kinematic mouse body for drag interaction
    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.space = space;

    const xs = [W * 0.22, W * 0.5, W * 0.78];

    COG_SIZES.forEach((size, i) => {
      // Rescale the source image to this cog's exact target size
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d").drawImage(_cogCanvas, 0, 0, size, size);

      // Smaller cell = more detail; clamp so it stays fast
      const cellSize = Math.max(2, Math.round(size / 40));
      const cogIso = createLuminanceIso(canvas, 128);
      const body   = isoBodyRun(cogIso.iso.bind(cogIso), cogIso.bounds, Vec2.weak(cellSize, cellSize));

      body.position.setxy(xs[i], H * 0.45);
      body.userData._colorIdx = i;
      body.space = space;
    });
  },

  step(space) {
    if (_pendingRelease) {
      _pendingRelease = false;
      if (_grabJoint) { _grabJoint.space = null; _grabJoint = null; }
      _mouseBody.position.setxy(-1000, -1000);
      _mouseBody.velocity.setxy(0, 0);
    }
    if (_pendingGrab) {
      const { body, localPt } = _pendingGrab;
      _pendingGrab = null;
      if (_grabJoint) { _grabJoint.space = null; _grabJoint = null; }
      _mouseBody.position.setxy(_dragX, _dragY);
      _grabJoint = new PivotJoint(_mouseBody, body, new Vec2(0, 0), localPt);
      _grabJoint.stiff = false;
      _grabJoint.frequency = 5;
      _grabJoint.damping = 0.9;
      _grabJoint.space = space;
    }
    if (_grabJoint) {
      const dx = _dragX - _mouseBody.position.x;
      const dy = _dragY - _mouseBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const speed = Math.min(dist * 60, 1200);
        _mouseBody.velocity.setxy(dx / dist * speed, dy / dist * speed);
      } else {
        _mouseBody.velocity.setxy(0, 0);
      }
    }
  },

  click(x, y, space) {
    _dragX = x; _dragY = y;
    let best = null, bestDist = 120;
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = body; }
    }
    if (!best) return;
    _pendingGrab = { body: best, localPt: best.worldPointToLocal(new Vec2(x, y)) };
  },

  drag(x, y) {
    _dragX = x; _dragY = y;
  },

  release() {
    _pendingRelease = true;
  },
};
