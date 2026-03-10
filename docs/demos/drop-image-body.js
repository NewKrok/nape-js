import {
  Body, BodyType, Vec2, AABB, Polygon, MarchingSquares, PivotJoint,
} from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

// ---------------------------------------------------------------------------
// IsoBody — generate a physics body from an image using MarchingSquares
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
// Alpha-based iso: transparent = outside, opaque = inside
// ---------------------------------------------------------------------------

function createAlphaIso(canvas, threshold = 64) {
  const w = canvas.width, h = canvas.height;
  const data = canvas.getContext("2d").getImageData(0, 0, w, h).data;

  function alpha(ix, iy) {
    ix = Math.max(0, Math.min(w - 1, ix));
    iy = Math.max(0, Math.min(h - 1, iy));
    return data[(iy * w + ix) * 4 + 3];
  }

  return {
    bounds: new AABB(0, 0, w, h),
    iso(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const a11 = alpha(ix,     iy)     - threshold;
      const a12 = alpha(ix + 1, iy)     - threshold;
      const a21 = alpha(ix,     iy + 1) - threshold;
      const a22 = alpha(ix + 1, iy + 1) - threshold;
      const fx = x - ix, fy = y - iy;
      return a11*(1-fx)*(1-fy) + a12*fx*(1-fy) + a21*(1-fx)*fy + a22*fx*fy;
    },
  };
}

// ---------------------------------------------------------------------------
// Luminance-based iso: dark = inside (for opaque images)
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
// Image to physics body — auto-detect alpha vs luminance
// ---------------------------------------------------------------------------

const TARGET_SIZE = 120;
const COLOR_PALETTE = [
  { fill: "rgba(88,166,255,0.35)",  stroke: "#58a6ff" },
  { fill: "rgba(210,153,34,0.35)",  stroke: "#d29922" },
  { fill: "rgba(63,185,80,0.35)",   stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.35)",   stroke: "#f85149" },
  { fill: "rgba(163,113,247,0.35)", stroke: "#a371f7" },
  { fill: "rgba(219,171,255,0.35)", stroke: "#dbabff" },
];

let _colorCounter = 0;

function imageToBody(imgCanvas) {
  const aspect = imgCanvas.width / imgCanvas.height;
  const tw = aspect >= 1 ? TARGET_SIZE : Math.round(TARGET_SIZE * aspect);
  const th = aspect >= 1 ? Math.round(TARGET_SIZE / aspect) : TARGET_SIZE;

  const scaled = document.createElement("canvas");
  scaled.width  = tw;
  scaled.height = th;
  scaled.getContext("2d").drawImage(imgCanvas, 0, 0, tw, th);

  // Decide: does the image have a meaningful alpha channel?
  const pxData = scaled.getContext("2d").getImageData(0, 0, tw, th).data;
  let hasAlpha = false;
  for (let i = 3; i < pxData.length; i += 4) {
    if (pxData[i] < 200) { hasAlpha = true; break; }
  }

  const isoSrc = hasAlpha
    ? createAlphaIso(scaled, 64)
    : createLuminanceIso(scaled, 128);

  const cellSize = Math.max(2, Math.round(Math.min(tw, th) / 30));
  const body = isoBodyRun(
    isoSrc.iso.bind(isoSrc),
    isoSrc.bounds,
    Vec2.weak(cellSize, cellSize),
  );

  // If body is empty (e.g. fully white image), fall back to a box
  if (body.shapes.length === 0) {
    body.shapes.add(new Polygon(Polygon.box(tw * 0.8, th * 0.8)));
    const com = body.localCOM;
    const pivot = Vec2.get(-com.x, -com.y);
    body.translateShapes(pivot);
    pivot.dispose();
  }

  const colorIdx = (_colorCounter++) % COLOR_PALETTE.length;
  body.userData._colorIdx = colorIdx;

  return body;
}

// ---------------------------------------------------------------------------
// Drag state (mouse drag to move existing bodies)
// ---------------------------------------------------------------------------

let _mouseBody      = null;
let _grabJoint      = null;
let _pendingGrab    = null;
let _pendingRelease = false;
let _dragX = 0, _dragY = 0;
let _space = null;
let _W = 900, _H = 500;
let _dropWired = false;

// ---------------------------------------------------------------------------
// File drop handler
// ---------------------------------------------------------------------------

function processDroppedFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth  || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const body = imageToBody(canvas);
      body.position.setxy(_W / 2, _H / 2);
      body.space = _space;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ---------------------------------------------------------------------------
// Wire drop event listeners onto a DOM element
// ---------------------------------------------------------------------------

function wireDrop(wrapperEl, overlayEl) {
  wrapperEl.addEventListener("dragenter", (e) => {
    e.preventDefault();
    overlayEl.classList.add("active");
  });
  wrapperEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    overlayEl.classList.add("active");
  });
  wrapperEl.addEventListener("dragleave", (e) => {
    if (!wrapperEl.contains(e.relatedTarget)) {
      overlayEl.classList.remove("active");
    }
  });
  wrapperEl.addEventListener("drop", (e) => {
    e.preventDefault();
    overlayEl.classList.remove("active");
    processDroppedFile(e.dataTransfer?.files?.[0]);
  });
}

// ---------------------------------------------------------------------------
// Custom body renderer
// ---------------------------------------------------------------------------

function drawDropBody(ctx, body, showOutlines = true) {
  const colorIdx = body.userData?._colorIdx ?? 0;
  const pal      = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.rotation);

  for (const shape of body.shapes) {
    if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.length;
      if (len < 3) continue;
      ctx.beginPath();
      ctx.moveTo(verts.at(0).x, verts.at(0).y);
      for (let i = 1; i < len; i++) ctx.lineTo(verts.at(i).x, verts.at(i).y);
      ctx.closePath();
      ctx.fillStyle = showOutlines ? pal.fill : "#162540";
      ctx.fill();
      if (showOutlines) {
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "drop-image-body",
  label: "Drop Image → Body",
  featured: false,
  tags: ["MarchingSquares", "Procedural", "Interactive"],
  desc: "Drag any image file onto the canvas — <b>MarchingSquares</b> extracts the physics contour instantly and spawns a dynamic body. <b>Drag</b> bodies with the mouse.",

  setup(space, W, H) {
    _space = space;
    _W = W; _H = H;
    _colorCounter = 0;

    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);

    _mouseBody      = null;
    _grabJoint      = null;
    _pendingGrab    = null;
    _pendingRelease = false;
    _dragX = 0; _dragY = 0;

    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.space = space;
  },

  // Called by DemoRunner after setup — receives the canvas wrapper element
  init(container) {
    let overlay = container.querySelector(".drop-image-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "drop-image-overlay";
      overlay.innerHTML = `
        <div class="drop-image-hint">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Drop image here</span>
        </div>`;
      container.appendChild(overlay);
    }

    // Static "drag image here" hint at the bottom
    let hint = container.querySelector(".drop-image-static-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "drop-image-static-hint";
      hint.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Drag an image file onto the canvas`;
      container.appendChild(hint);
    }

    if (!_dropWired) {
      _dropWired = true;
      wireDrop(container, overlay);
    }
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
      _grabJoint.stiff     = false;
      _grabJoint.frequency = 5;
      _grabJoint.damping   = 0.9;
      _grabJoint.space     = space;
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

  render(ctx, space, W, H, showOutlines = true) {
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth   = 1;
    const step = 40;
    for (let x = 0; x <= W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    for (const body of space.bodies) {
      drawDropBody(ctx, body, showOutlines);
    }
  },

  click(x, y, space) {
    _dragX = x; _dragY = y;
    let best = null, bestDist = 120;
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d  = Math.sqrt(dx * dx + dy * dy);
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
