import {
  Body, BodyType, Vec2, Polygon, Circle,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint, PulleyJoint, SpringJoint,
} from '../nape-js.esm.js?v=3.41.0';

import { drawBody, drawGrid } from '../renderer.js?v=3.41.0';

// ── Layout ──────────────────────────────────────────────────────────────────
const T = 20; // wall thickness
const COLS = 3;
const ROWS = 3;
const SIZE = 14; // half-size of each box (smaller for clarity)

// Per-cell color indices (each constraint gets its own color pair)
const CELL_COLORS = {
  pivot:    [0, 0],  // blue
  weld:     [4, 5],  // purple, teal
  distance: [1, 1],  // yellow
  line:     [2, 2],  // green
  pulley:   [3, 3],  // red
  angle:    [4, 4],  // purple
  motor:    [3, 3],  // red
  spring:   [1, 2],  // yellow, green
};

function cellOrigin(col, row, W, H) {
  const cw = (W - 2 * T) / COLS;
  const ch = (H - 2 * T) / ROWS;
  return {
    cx: T + col * cw + cw / 2,
    cy: T + row * ch + ch / 2,
    cw,
    ch,
    left: T + col * cw,
    top: T + row * ch,
  };
}

// ── Drawing helpers ─────────────────────────────────────────────────────────
function drawPin(ctx, x, y, color = '#58a6ff') {
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSpring(ctx, x1, y1, x2, y2, color = '#d29922', coils = 8, amp = 4) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const n = coils * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * len * 0.1, y1 + uy * len * 0.1);
  for (let i = 1; i <= n; i++) {
    const t = 0.1 + (i / n) * 0.8;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x1 + ux * len * t + px * amp * sign, y1 + uy * len * t + py * amp * sign);
  }
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color + '99';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawDashedLine(ctx, x1, y1, x2, y2, color = '#ffffff33') {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Small "pin" icon for pinned bodies — hollow ring
function drawPinnedMarker(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff66';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Module-level drag state ─────────────────────────────────────────────────
let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;

// ─────────────────────────────────────────────────────────────────────────────

export default {
  id: 'constraints',
  label: 'Constraints Showcase',
  tags: ['PivotJoint', 'DistanceJoint', 'AngleJoint', 'WeldJoint', 'MotorJoint', 'LineJoint', 'PulleyJoint', 'SpringJoint'],
  featured: true,
  featuredOrder: 4,
  moduleState: `let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;`,
  desc: 'All 8 built-in constraint types in a 3×3 grid. <b>Drag</b> any body to feel how each constraint reacts.',
  walls: true,

  // Body refs for constraint rendering
  _bodies: {},
  // Track which bodies are pinned (for visual indicator)
  _pinnedBodies: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    this._bodies = {};
    this._pinnedBodies = new Set();

    // ── Cell divider walls (thin static bodies, like original nape demo) ──
    const cw = (W - 2 * T) / COLS;
    const ch = (H - 2 * T) / ROWS;
    const dividers = new Body(BodyType.STATIC);
    for (let c = 1; c < COLS; c++) {
      const x = T + c * cw;
      dividers.shapes.add(new Polygon(Polygon.rect(x - 0.5, 0, 1, H)));
    }
    for (let r = 1; r < ROWS; r++) {
      const y = T + r * ch;
      dividers.shapes.add(new Polygon(Polygon.rect(0, y - 0.5, W, 1)));
    }
    dividers.space = space;

    // Constraint settings (matching original nape demo)
    const frequency = 20;
    const damping = 1;

    function format(c) {
      c.stiff = false;
      c.frequency = frequency;
      c.damping = damping;
      c.space = space;
    }

    const pinnedSet = this._pinnedBodies;
    function box(x, y, pinned = false, colorIdx = 0) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Polygon(Polygon.box(SIZE * 2, SIZE * 2)));
      try { b.userData._colorIdx = colorIdx; } catch (_) {}
      b.space = space;
      if (pinned) {
        const pin = new PivotJoint(space.world, b, new Vec2(x, y), new Vec2(0, 0));
        pin.space = space;
        pinnedSet.add(b);
      }
      return b;
    }

    // ── PivotJoint (col=1, row=0) ─────────────────────────────────────────
    {
      const { cx, cy, cw } = cellOrigin(1, 0, W, H);
      const b1 = box(cx - cw / 6, cy, false, CELL_COLORS.pivot[0]);
      const b2 = box(cx + cw / 6, cy, false, CELL_COLORS.pivot[1]);
      const pivot = new Vec2(cx, cy);
      format(new PivotJoint(
        b1, b2,
        b1.worldPointToLocal(pivot),
        b2.worldPointToLocal(pivot),
      ));
      this._bodies.pivot = { b1, b2, px: cx, py: cy };
    }

    // ── WeldJoint (col=2, row=0) ──────────────────────────────────────────
    {
      const { cx, cy, cw } = cellOrigin(2, 0, W, H);
      const gap = SIZE + 2; // bodies nearly touching
      const b1 = box(cx - gap, cy, false, CELL_COLORS.weld[0]);
      const b2 = box(cx + gap, cy, false, CELL_COLORS.weld[1]);
      const weld = new Vec2(cx, cy);
      format(new WeldJoint(
        b1, b2,
        b1.worldPointToLocal(weld),
        b2.worldPointToLocal(weld),
        0, // no phase — bodies stay aligned
      ));
      this._bodies.weld = { b1, b2 };
    }

    // ── DistanceJoint (col=0, row=1) ──────────────────────────────────────
    {
      const { cx, cy, cw, top } = cellOrigin(0, 1, W, H);
      const startY = top + SIZE * 2; // start near top of cell so spring effect is visible
      const b1 = box(cx - cw * 0.12, startY, false, CELL_COLORS.distance[0]);
      const b2 = box(cx + cw * 0.12, startY, false, CELL_COLORS.distance[1]);
      format(new DistanceJoint(
        b1, b2,
        new Vec2(0, -SIZE),
        new Vec2(0, -SIZE),
        cw / 3 * 0.75,
        cw / 3 * 1.25,
      ));
      this._bodies.distance = { b1, b2 };
    }

    // ── LineJoint (col=1, row=1) ──────────────────────────────────────────
    {
      const { cx, cy, cw } = cellOrigin(1, 1, W, H);
      const b1 = box(cx - cw / 6, cy, false, CELL_COLORS.line[0]);
      const b2 = box(cx + cw / 6, cy, false, CELL_COLORS.line[1]);
      const anchor = new Vec2(cx, cy);
      format(new LineJoint(
        b1, b2,
        b1.worldPointToLocal(anchor),
        b2.worldPointToLocal(anchor),
        new Vec2(0, 1),
        -SIZE,
        SIZE,
      ));
      this._bodies.line = { b1, b2, ax: cx, ay: cy };
    }

    // ── PulleyJoint (col=2, row=1) ────────────────────────────────────────
    {
      const { cx, cy, cw, ch, top } = cellOrigin(2, 1, W, H);
      const barW = SIZE * 4; // narrower bar
      // Bar at top (pinned)
      const bar = new Body(BodyType.DYNAMIC, new Vec2(cx, top + SIZE + 8));
      bar.shapes.add(new Polygon(Polygon.box(barW, SIZE)));
      try { bar.userData._colorIdx = CELL_COLORS.pulley[0]; } catch (_) {}
      bar.space = space;
      const pinBar = new PivotJoint(space.world, bar, new Vec2(cx, top + SIZE + 8), new Vec2(0, 0));
      pinBar.space = space;
      pinnedSet.add(bar);

      const hangGap = barW / 2 - SIZE; // hang points near bar ends
      const b2 = box(cx - hangGap, cy - ch * 0.1, false, CELL_COLORS.pulley[0]);
      const b3 = box(cx + hangGap, cy - ch * 0.1, false, CELL_COLORS.pulley[1]);
      format(new PulleyJoint(
        bar, b2,
        bar, b3,
        new Vec2(-hangGap, 0), new Vec2(0, -SIZE / 2),
        new Vec2(hangGap, 0), new Vec2(0, -SIZE),
        ch * 0.6,
        ch * 0.6,
        2.5,
      ));
      this._bodies.pulley = { bar, b2, b3, hangGap };
    }

    // ── AngleJoint (col=0, row=2) ─────────────────────────────────────────
    {
      const { cx, cy, cw } = cellOrigin(0, 2, W, H);
      const b1 = box(cx - cw / 6, cy, true, CELL_COLORS.angle[0]);
      const b2 = box(cx + cw / 6, cy, true, CELL_COLORS.angle[1]);
      format(new AngleJoint(
        b1, b2,
        -Math.PI * 1.5,
        Math.PI * 1.5,
        2,
      ));
      this._bodies.angle = { b1, b2 };
    }

    // ── MotorJoint (col=1, row=2) ─────────────────────────────────────────
    {
      const { cx, cy, cw } = cellOrigin(1, 2, W, H);
      const b1 = box(cx - cw / 6, cy, true, CELL_COLORS.motor[0]);
      const b2 = box(cx + cw / 6, cy, true, CELL_COLORS.motor[1]);
      format(new MotorJoint(
        b1, b2,
        10,
        3,
      ));
      this._bodies.motor = { b1, b2 };
    }

    // ── SpringJoint (col=2, row=2) ────────────────────────────────────────
    {
      const { cx, cy, top } = cellOrigin(2, 2, W, H);
      const anchorY = top + SIZE + 8;

      // Static ceiling anchor (small circle)
      const pin = new Body(BodyType.STATIC, new Vec2(cx, anchorY));
      pin.shapes.add(new Circle(4));
      pin.space = space;

      // Hanging body
      const b = box(cx, cy + 10, false, CELL_COLORS.spring[1]);
      const sj = new SpringJoint(
        pin, b,
        new Vec2(0, 0), new Vec2(0, -SIZE),
        60,
      );
      sj.frequency = 3;
      sj.damping = 0.3;
      sj.space = space;

      // Give it a nudge so it oscillates
      b.applyImpulse(new Vec2(80, 0));

      this._bodies.spring = { pin, b };
    }

    // Kinematic mouse body for dragging
    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.space = space;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;
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
      _grabJoint = new PivotJoint(
        _mouseBody, body,
        new Vec2(0, 0), localPt,
      );
      _grabJoint.stiff = false;
      _grabJoint.frequency = 4;
      _grabJoint.damping = 0.9;
      _grabJoint.space = space;
    }
    if (_grabJoint) {
      const dx = _dragX - _mouseBody.position.x;
      const dy = _dragY - _mouseBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxSpeed = 800;
      if (dist > 1) {
        const speed = Math.min(dist * 60, maxSpeed);
        _mouseBody.velocity.setxy(dx / dist * speed, dy / dist * speed);
      } else {
        _mouseBody.velocity.setxy(0, 0);
      }
    }
  },

  click(x, y, space) {
    _dragX = x;
    _dragY = y;
    let best = null, bestDist = 60;
    for (const body of space.bodies) {
      if (!body.isDynamic() || body === _mouseBody) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = body; }
    }
    if (!best) return;
    const localPt = best.worldPointToLocal(new Vec2(x, y));
    _pendingGrab = { body: best, localPt };
  },

  drag(x, y) {
    _dragX = x;
    _dragY = y;
  },

  release() {
    _pendingRelease = true;
  },

  render(ctx, space, W, H, debugDraw) {
    drawGrid(ctx, W, H);
    ctx.save();

    const cw = (W - 2 * T) / COLS;
    const ch = (H - 2 * T) / ROWS;

    // ── Cell dividers ────────────────────────────────────────────────────
    ctx.strokeStyle = '#ffffff09';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    for (let c = 1; c < COLS; c++) {
      const lx = T + c * cw;
      ctx.beginPath(); ctx.moveTo(lx, T); ctx.lineTo(lx, H - T); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      const ly = T + r * ch;
      ctx.beginPath(); ctx.moveTo(T, ly); ctx.lineTo(W - T, ly); ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Constraint overlays (drawn BEFORE bodies so they appear behind) ──

    // PivotJoint: pin marker + faint lines to both bodies
    if (this._bodies.pivot) {
      const { b1, b2, px, py } = this._bodies.pivot;
      drawDashedLine(ctx, px, py, b1.position.x, b1.position.y, '#58a6ff33');
      drawDashedLine(ctx, px, py, b2.position.x, b2.position.y, '#58a6ff33');
      drawPin(ctx, px, py, '#58a6ff');
    }

    // WeldJoint: X marker at weld midpoint + dashed connection
    if (this._bodies.weld) {
      const { b1, b2 } = this._bodies.weld;
      drawDashedLine(ctx, b1.position.x, b1.position.y, b2.position.x, b2.position.y, '#a371f733');
      const mx = (b1.position.x + b2.position.x) / 2;
      const my = (b1.position.y + b2.position.y) / 2;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s);
      ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s);
      ctx.strokeStyle = '#a371f7';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // DistanceJoint: spring coil between anchor points on bodies
    if (this._bodies.distance) {
      const { b1, b2 } = this._bodies.distance;
      // Anchor is (0, -SIZE) in local space → transform to world
      const cos1 = Math.cos(b1.rotation), sin1 = Math.sin(b1.rotation);
      const cos2 = Math.cos(b2.rotation), sin2 = Math.sin(b2.rotation);
      const ax1 = b1.position.x + SIZE * sin1;
      const ay1 = b1.position.y - SIZE * cos1;
      const ax2 = b2.position.x + SIZE * sin2;
      const ay2 = b2.position.y - SIZE * cos2;
      // Draw spring coil
      drawSpring(ctx, ax1, ay1, ax2, ay2, '#d29922');
      drawPin(ctx, ax1, ay1, '#d29922');
      drawPin(ctx, ax2, ay2, '#d29922');
    }

    // LineJoint: solid rail line between bodies + direction indicator
    if (this._bodies.line) {
      const { b1, b2, ax, ay } = this._bodies.line;
      // Rail line (full cell height, vertical)
      const railLen = SIZE * 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay - railLen);
      ctx.lineTo(ax, ay + railLen);
      ctx.strokeStyle = '#3fb95033';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Limit tick marks
      for (const dy of [-SIZE, SIZE]) {
        ctx.beginPath();
        ctx.moveTo(ax - 8, ay + dy);
        ctx.lineTo(ax + 8, ay + dy);
        ctx.strokeStyle = '#3fb95088';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Lines from rail to each body
      drawDashedLine(ctx, ax, ay, b1.position.x, b1.position.y, '#3fb95033');
      drawDashedLine(ctx, ax, ay, b2.position.x, b2.position.y, '#3fb95033');
      drawPin(ctx, ax, ay, '#3fb950');
    }

    // PulleyJoint: rope lines from bar anchors to hanging bodies
    if (this._bodies.pulley) {
      const { bar, b2, b3, hangGap } = this._bodies.pulley;
      const cos = Math.cos(bar.rotation), sin = Math.sin(bar.rotation);
      const lx = bar.position.x + (-hangGap) * cos;
      const ly = bar.position.y + (-hangGap) * sin;
      const rx = bar.position.x + hangGap * cos;
      const ry = bar.position.y + hangGap * sin;
      drawDashedLine(ctx, lx, ly, b2.position.x, b2.position.y, '#f8514955');
      drawDashedLine(ctx, rx, ry, b3.position.x, b3.position.y, '#f8514955');
      drawPin(ctx, lx, ly, '#f85149');
      drawPin(ctx, rx, ry, '#f85149');
    }

    // AngleJoint: angle indicators on each body + connecting arc
    if (this._bodies.angle) {
      const { b1, b2 } = this._bodies.angle;
      const r = SIZE + 8;
      // Draw "clock hand" on each body showing current rotation
      for (const [b, color] of [[b1, '#a371f7'], [b2, '#a371f7']]) {
        // Rotation hand
        ctx.beginPath();
        ctx.moveTo(b.position.x, b.position.y);
        ctx.lineTo(
          b.position.x + Math.cos(b.rotation) * r,
          b.position.y + Math.sin(b.rotation) * r,
        );
        ctx.strokeStyle = color + '88';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Circle outline
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color + '22';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Curved arrow between bodies showing angular coupling
      const mx = (b1.position.x + b2.position.x) / 2;
      const my = (b1.position.y + b2.position.y) / 2;
      ctx.beginPath();
      ctx.moveTo(b1.position.x + r, b1.position.y);
      ctx.quadraticCurveTo(mx, my - 20, b2.position.x - r, b2.position.y);
      ctx.strokeStyle = '#a371f744';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // MotorJoint: spinning arrows on each body + link
    if (this._bodies.motor) {
      const { b1, b2 } = this._bodies.motor;
      const r = SIZE + 8;
      for (const b of [b1, b2]) {
        // Spinning arrow arc (follows body rotation)
        const arcStart = b.rotation - 1.5;
        const arcEnd = b.rotation + 1.5;
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, r, arcStart, arcEnd);
        ctx.strokeStyle = '#f8514966';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Arrowhead at arc end
        const ex = b.position.x + Math.cos(arcEnd) * r;
        const ey = b.position.y + Math.sin(arcEnd) * r;
        const ta = arcEnd + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(ta - 0.4) * 6, ey + Math.sin(ta - 0.4) * 6);
        ctx.lineTo(ex + Math.cos(ta + 0.4) * 6, ey + Math.sin(ta + 0.4) * 6);
        ctx.closePath();
        ctx.fillStyle = '#f8514977';
        ctx.fill();
      }
      // Link between bodies
      const mx = (b1.position.x + b2.position.x) / 2;
      const my = (b1.position.y + b2.position.y) / 2;
      ctx.beginPath();
      ctx.moveTo(b1.position.x + r, b1.position.y);
      ctx.quadraticCurveTo(mx, my - 20, b2.position.x - r, b2.position.y);
      ctx.strokeStyle = '#f8514933';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // SpringJoint: spring coil from anchor to body
    if (this._bodies.spring) {
      const { pin, b } = this._bodies.spring;
      const cos = Math.cos(b.rotation), sin = Math.sin(b.rotation);
      const ax = b.position.x + (-SIZE) * sin;
      const ay = b.position.y - SIZE * cos;
      drawSpring(ctx, pin.position.x, pin.position.y, ax, ay, '#3fb950');
      drawPin(ctx, pin.position.x, pin.position.y, '#3fb950');
      drawPin(ctx, ax, ay, '#3fb950');
    }

    // ── Bodies ───────────────────────────────────────────────────────────
    for (const body of space.bodies) {
      if (body === _mouseBody) continue;
      drawBody(ctx, body, debugDraw);
    }

    // ── Pinned body markers (drawn ON TOP of bodies) ────────────────────
    if (this._pinnedBodies) {
      for (const b of this._pinnedBodies) {
        drawPinnedMarker(ctx, b.position.x, b.position.y);
      }
    }

    // ── Drag indicator ──────────────────────────────────────────────────
    if (_grabJoint) {
      const grabbed = _grabJoint.body2;
      if (grabbed) {
        const lp = _grabJoint.anchor2;
        const cos = Math.cos(grabbed.rotation), sin = Math.sin(grabbed.rotation);
        const ax = grabbed.position.x + lp.x * cos - lp.y * sin;
        const ay = grabbed.position.y + lp.x * sin + lp.y * cos;
        ctx.beginPath();
        ctx.moveTo(_dragX, _dragY);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(_dragX, _dragY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff55';
        ctx.fill();
      }
    }

    // ── Cell labels ──────────────────────────────────────────────────────
    const LABELS = [
      { col: 0, row: 0, name: '', desc: `Constraints softened with\nfrequency=20  damping=1` },
      { col: 1, row: 0, name: 'PivotJoint', desc: 'shared pivot point' },
      { col: 2, row: 0, name: 'WeldJoint', desc: 'rigid weld + 45\u00B0 phase' },
      { col: 0, row: 1, name: 'DistanceJoint', desc: 'spring distance range' },
      { col: 1, row: 1, name: 'LineJoint', desc: 'vertical rail slider' },
      { col: 2, row: 1, name: 'PulleyJoint', desc: 'pulley with ratio 2.5' },
      { col: 0, row: 2, name: 'AngleJoint', desc: 'linked rotation (ratio 2)' },
      { col: 1, row: 2, name: 'MotorJoint', desc: 'driven spin (ratio 3)' },
      { col: 2, row: 2, name: 'SpringJoint', desc: 'soft spring + damper' },
    ];
    for (const { col, row, name, desc } of LABELS) {
      const c = cellOrigin(col, row, W, H);
      const lx = c.left + 8, ly = c.top + 17;
      if (name) {
        ctx.fillStyle = '#58a6ffdd';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(name, lx, ly);
        ctx.fillStyle = '#8b949eaa';
        ctx.font = '10px monospace';
        ctx.fillText(desc, lx, ly + 14);
      } else {
        ctx.fillStyle = '#8b949ecc';
        ctx.font = '11px monospace';
        const lines = desc.split('\n');
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], c.left + 12, c.top + ch / 2 - 6 + i * 16);
        }
      }
    }

    ctx.restore();
  },

  render3dOverlay(ctx, space, W, H) {
    ctx.save();
    const cw = (W - 2 * T) / COLS;
    const ch = (H - 2 * T) / ROWS;

    // Cell dividers
    ctx.strokeStyle = '#ffffff09';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    for (let c = 1; c < COLS; c++) {
      const lx = T + c * cw;
      ctx.beginPath(); ctx.moveTo(lx, T); ctx.lineTo(lx, H - T); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      const ly = T + r * ch;
      ctx.beginPath(); ctx.moveTo(T, ly); ctx.lineTo(W - T, ly); ctx.stroke();
    }
    ctx.setLineDash([]);

    // PivotJoint
    if (this._bodies.pivot) {
      const { b1, b2, px, py } = this._bodies.pivot;
      drawDashedLine(ctx, px, py, b1.position.x, b1.position.y, '#58a6ff33');
      drawDashedLine(ctx, px, py, b2.position.x, b2.position.y, '#58a6ff33');
      drawPin(ctx, px, py, '#58a6ff');
    }
    // WeldJoint
    if (this._bodies.weld) {
      const { b1, b2 } = this._bodies.weld;
      drawDashedLine(ctx, b1.position.x, b1.position.y, b2.position.x, b2.position.y, '#a371f733');
      const mx = (b1.position.x + b2.position.x) / 2;
      const my = (b1.position.y + b2.position.y) / 2;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s);
      ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s);
      ctx.strokeStyle = '#a371f7'; ctx.lineWidth = 2; ctx.stroke();
    }
    // DistanceJoint
    if (this._bodies.distance) {
      const { b1, b2 } = this._bodies.distance;
      const cos1 = Math.cos(b1.rotation), sin1 = Math.sin(b1.rotation);
      const cos2 = Math.cos(b2.rotation), sin2 = Math.sin(b2.rotation);
      const ax1 = b1.position.x + SIZE * sin1, ay1 = b1.position.y - SIZE * cos1;
      const ax2 = b2.position.x + SIZE * sin2, ay2 = b2.position.y - SIZE * cos2;
      drawSpring(ctx, ax1, ay1, ax2, ay2, '#d29922');
      drawPin(ctx, ax1, ay1, '#d29922'); drawPin(ctx, ax2, ay2, '#d29922');
    }
    // LineJoint
    if (this._bodies.line) {
      const { b1, b2, ax, ay } = this._bodies.line;
      const railLen = SIZE * 4;
      ctx.beginPath(); ctx.moveTo(ax, ay - railLen); ctx.lineTo(ax, ay + railLen);
      ctx.strokeStyle = '#3fb95033'; ctx.lineWidth = 3; ctx.stroke();
      for (const dy of [-SIZE, SIZE]) {
        ctx.beginPath(); ctx.moveTo(ax - 8, ay + dy); ctx.lineTo(ax + 8, ay + dy);
        ctx.strokeStyle = '#3fb95088'; ctx.lineWidth = 2; ctx.stroke();
      }
      drawDashedLine(ctx, ax, ay, b1.position.x, b1.position.y, '#3fb95033');
      drawDashedLine(ctx, ax, ay, b2.position.x, b2.position.y, '#3fb95033');
      drawPin(ctx, ax, ay, '#3fb950');
    }
    // PulleyJoint
    if (this._bodies.pulley) {
      const { bar, b2, b3, hangGap } = this._bodies.pulley;
      const cos = Math.cos(bar.rotation), sin = Math.sin(bar.rotation);
      const lx = bar.position.x + (-hangGap) * cos, ly = bar.position.y + (-hangGap) * sin;
      const rx = bar.position.x + hangGap * cos, ry = bar.position.y + hangGap * sin;
      drawDashedLine(ctx, lx, ly, b2.position.x, b2.position.y, '#f8514955');
      drawDashedLine(ctx, rx, ry, b3.position.x, b3.position.y, '#f8514955');
      drawPin(ctx, lx, ly, '#f85149'); drawPin(ctx, rx, ry, '#f85149');
    }
    // AngleJoint
    if (this._bodies.angle) {
      const { b1, b2 } = this._bodies.angle;
      const r = SIZE + 8;
      for (const [b, color] of [[b1, '#a371f7'], [b2, '#a371f7']]) {
        ctx.beginPath(); ctx.moveTo(b.position.x, b.position.y);
        ctx.lineTo(b.position.x + Math.cos(b.rotation) * r, b.position.y + Math.sin(b.rotation) * r);
        ctx.strokeStyle = color + '88'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color + '22'; ctx.lineWidth = 1; ctx.stroke();
      }
      const mx = (b1.position.x + b2.position.x) / 2, my = (b1.position.y + b2.position.y) / 2;
      ctx.beginPath(); ctx.moveTo(b1.position.x + r, b1.position.y);
      ctx.quadraticCurveTo(mx, my - 20, b2.position.x - r, b2.position.y);
      ctx.strokeStyle = '#a371f744'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
    // MotorJoint
    if (this._bodies.motor) {
      const { b1, b2 } = this._bodies.motor;
      const r = SIZE + 8;
      for (const b of [b1, b2]) {
        const arcStart = b.rotation - 1.5, arcEnd = b.rotation + 1.5;
        ctx.beginPath(); ctx.arc(b.position.x, b.position.y, r, arcStart, arcEnd);
        ctx.strokeStyle = '#f8514966'; ctx.lineWidth = 2; ctx.stroke();
        const ex = b.position.x + Math.cos(arcEnd) * r, ey = b.position.y + Math.sin(arcEnd) * r;
        const ta = arcEnd + Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(ta - 0.4) * 6, ey + Math.sin(ta - 0.4) * 6);
        ctx.lineTo(ex + Math.cos(ta + 0.4) * 6, ey + Math.sin(ta + 0.4) * 6);
        ctx.closePath(); ctx.fillStyle = '#f8514977'; ctx.fill();
      }
      const mx = (b1.position.x + b2.position.x) / 2, my = (b1.position.y + b2.position.y) / 2;
      ctx.beginPath(); ctx.moveTo(b1.position.x + r, b1.position.y);
      ctx.quadraticCurveTo(mx, my - 20, b2.position.x - r, b2.position.y);
      ctx.strokeStyle = '#f8514933'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
    // SpringJoint
    if (this._bodies.spring) {
      const { pin, b } = this._bodies.spring;
      const cos = Math.cos(b.rotation), sin = Math.sin(b.rotation);
      const ax = b.position.x + (-SIZE) * sin;
      const ay = b.position.y - SIZE * cos;
      drawSpring(ctx, pin.position.x, pin.position.y, ax, ay, '#3fb950');
      drawPin(ctx, pin.position.x, pin.position.y, '#3fb950');
      drawPin(ctx, ax, ay, '#3fb950');
    }

    // Pinned markers
    if (this._pinnedBodies) {
      for (const b of this._pinnedBodies) drawPinnedMarker(ctx, b.position.x, b.position.y);
    }

    // Drag indicator
    if (_grabJoint) {
      const grabbed = _grabJoint.body2;
      if (grabbed) {
        const lp = _grabJoint.anchor2;
        const cos = Math.cos(grabbed.rotation), sin = Math.sin(grabbed.rotation);
        const ax = grabbed.position.x + lp.x * cos - lp.y * sin;
        const ay = grabbed.position.y + lp.x * sin + lp.y * cos;
        ctx.beginPath(); ctx.moveTo(_dragX, _dragY); ctx.lineTo(ax, ay);
        ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(_dragX, _dragY, 5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff55'; ctx.fill();
      }
    }

    // Cell labels
    const LABELS = [
      { col: 0, row: 0, name: '', desc: `Constraints softened with\nfrequency=20  damping=1` },
      { col: 1, row: 0, name: 'PivotJoint', desc: 'shared pivot point' },
      { col: 2, row: 0, name: 'WeldJoint', desc: 'rigid weld + 45\u00B0 phase' },
      { col: 0, row: 1, name: 'DistanceJoint', desc: 'spring distance range' },
      { col: 1, row: 1, name: 'LineJoint', desc: 'vertical rail slider' },
      { col: 2, row: 1, name: 'PulleyJoint', desc: 'pulley with ratio 2.5' },
      { col: 0, row: 2, name: 'AngleJoint', desc: 'linked rotation (ratio 2)' },
      { col: 1, row: 2, name: 'MotorJoint', desc: 'driven spin (ratio 3)' },
      { col: 2, row: 2, name: 'SpringJoint', desc: 'soft spring + damper' },
    ];
    for (const { col, row, name, desc } of LABELS) {
      const c = cellOrigin(col, row, W, H);
      const lx = c.left + 8, ly = c.top + 17;
      if (name) {
        ctx.fillStyle = '#58a6ffdd'; ctx.font = 'bold 11px monospace'; ctx.fillText(name, lx, ly);
        ctx.fillStyle = '#8b949eaa'; ctx.font = '10px monospace'; ctx.fillText(desc, lx, ly + 14);
      } else {
        ctx.fillStyle = '#8b949ecc'; ctx.font = '11px monospace';
        const lines = desc.split('\n');
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], c.left + 12, c.top + ch / 2 - 6 + i * 16);
      }
    }

    ctx.restore();
  },
};

