/**
 * Shared rendering helpers for nape-js demo pages.
 *
 * Provides body/constraint/grid drawing and a global error overlay
 * that surfaces uncaught errors on mobile (where devtools aren't handy).
 */

// =========================================================================
// Color palette
// =========================================================================

export const COLORS = [
  { fill: "rgba(88,166,255,0.18)", stroke: "#58a6ff" },
  { fill: "rgba(210,153,34,0.18)", stroke: "#d29922" },
  { fill: "rgba(63,185,80,0.18)", stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.18)", stroke: "#f85149" },
  { fill: "rgba(163,113,247,0.18)", stroke: "#a371f7" },
  { fill: "rgba(219,171,255,0.18)", stroke: "#dbabff" },
];

export function bodyColor(body) {
  if (body.isStatic()) return { fill: "rgba(120,160,200,0.15)", stroke: "#607888" };
  if (body.isSleeping) return { fill: "rgba(100,200,100,0.12)", stroke: "#3fb950" };
  const idx = (body.userData?._colorIdx ?? 0) % COLORS.length;
  return COLORS[idx];
}

// =========================================================================
// Drawing helpers
// =========================================================================

/**
 * Draw a single physics body onto a 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {*} body  — nape-js Body instance
 * @param {boolean} [showOutlines=true] — when false, uses solid dark fills only
 */
export function drawBody(ctx, body, showOutlines = true) {
  const px = body.position.x;
  const py = body.position.y;
  const rot = body.rotation;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);

  const { fill, stroke } = showOutlines
    ? bodyColor(body)
    : { fill: body.isStatic() ? "#2a3a48" : body.isSleeping ? "#1a3020" : "#162540", stroke: null };

  for (const shape of body.shapes) {
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r, 0);
        ctx.strokeStyle = stroke + "55";
        ctx.stroke();
      }
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.get_length();
      if (len < 3) continue;

      ctx.beginPath();
      const v0 = verts.at(0);
      ctx.moveTo(v0.get_x(), v0.get_y());
      for (let i = 1; i < len; i++) {
        const v = verts.at(i);
        ctx.lineTo(v.get_x(), v.get_y());
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Draw constraint lines between connected bodies.
 * @param {CanvasRenderingContext2D} ctx
 * @param {*} space — nape-js Space instance
 */
export function drawConstraints(ctx, space) {
  try {
    const rawConstraints = space._inner.get_constraints();
    const cLen = rawConstraints.get_length();
    for (let i = 0; i < cLen; i++) {
      const c = rawConstraints.at(i);
      if (c.get_body1 && c.get_body2) {
        try {
          const b1 = c.get_body1();
          const b2 = c.get_body2();
          if (b1 && b2) {
            ctx.beginPath();
            ctx.moveTo(b1.get_position().get_x(), b1.get_position().get_y());
            ctx.lineTo(b2.get_position().get_x(), b2.get_position().get_y());
            ctx.strokeStyle = "#d2992233";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
}

/**
 * Draw a subtle background grid.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 */
export function drawGrid(ctx, W, H) {
  ctx.strokeStyle = "#1a2030";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

// =========================================================================
// Error overlay (for mobile debugging)
// =========================================================================

/**
 * Install a global error overlay that captures uncaught errors and
 * unhandled promise rejections, displaying them in a fixed red panel.
 * Also shows the library version in the bottom-left corner.
 * Call once at page load.
 * @param {string} [version] — nape-js version string to display
 */
export function installErrorOverlay(version) {
  // --- Version badge (always visible, bottom-left) ---
  if (version) {
    const badge = document.createElement("div");
    badge.id = "version-badge";
    badge.textContent = `nape-js v${version}`;
    badge.style.cssText = [
      "position:fixed",
      "bottom:6px",
      "left:8px",
      "font:11px/1 monospace",
      "color:#8b949e",
      "opacity:0.7",
      "z-index:99998",
      "pointer-events:none",
      "user-select:none",
    ].join(";");
    document.body.appendChild(badge);
  }

  // --- Error overlay (hidden until an error occurs) ---
  const el = document.createElement("div");
  el.id = "error-overlay";
  el.style.cssText = [
    "display:none",
    "position:fixed",
    "bottom:0",
    "left:0",
    "right:0",
    "max-height:40vh",
    "overflow-y:auto",
    "background:rgba(30,0,0,0.92)",
    "color:#f85149",
    "font:12px/1.5 monospace",
    "padding:12px 16px",
    "z-index:99999",
    "border-top:2px solid #f85149",
    "white-space:pre-wrap",
    "word-break:break-word",
  ].join(";");
  document.body.appendChild(el);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "\u2715";
  closeBtn.style.cssText =
    "position:absolute;top:4px;right:8px;background:none;border:none;color:#f85149;font-size:18px;cursor:pointer";
  closeBtn.addEventListener("click", () => { el.style.display = "none"; });
  el.appendChild(closeBtn);

  const log = document.createElement("div");
  el.appendChild(log);

  function show(msg) {
    const line = document.createElement("div");
    line.style.borderBottom = "1px solid #f8514933";
    line.style.padding = "4px 0";
    line.textContent = msg;
    log.appendChild(line);
    el.style.display = "block";
    el.scrollTop = el.scrollHeight;
  }

  window.addEventListener("error", (e) => {
    const loc = e.filename ? ` (${e.filename.split("/").pop()}:${e.lineno})` : "";
    show(`[Error]${loc} ${e.message}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason?.stack || e.reason?.message || String(e.reason);
    show(`[Promise] ${msg}`);
  });
}
