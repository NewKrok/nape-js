import {
  Body, BodyType, Vec2, Circle, Polygon, PivotJoint, SpringJoint,
} from '../nape-js.esm.js?v=3.42.0';

import { drawBody, drawGrid } from '../renderer.js?v=3.42.0';

// ── Drawing helpers ────────────────────────────────────────────────────────
function drawSpring(ctx, x1, y1, x2, y2, color = '#58a6ff', coils = 10, amp = 5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const n = coils * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * len * 0.08, y1 + uy * len * 0.08);
  for (let i = 1; i <= n; i++) {
    const t = 0.08 + (i / n) * 0.84;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x1 + ux * len * t + px * amp * sign, y1 + uy * len * t + py * amp * sign);
  }
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawPin(ctx, x, y, color = '#ffffff66') {
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawLabel(ctx, x, y, text, color = '#ffffff99', fontSize = 11) {
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

// ── Module-level state ─────────────────────────────────────────────────────
let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;
let _sections = {};

export default {
  id: 'spring-joint',
  label: 'Spring / Damper Joint',
  tags: ['SpringJoint', 'Spring', 'Damper', 'Soft-body'],
  featured: true,
  featuredOrder: 5,
  desc: 'SpringJoint demo — spring chain and soft-body blob. <b>Drag</b> any body to interact.',
  walls: true,
  moduleState: `let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;
let _sections = {};`,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.shapes.add(new Circle(0.1));
    _mouseBody.space = space;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;
    _sections = {};

    const T = 20; // wall thickness

    // Divider line (vertical at 1/2)
    const div = new Body(BodyType.STATIC);
    const half = (W - 2 * T) / 2;
    div.shapes.add(new Polygon(Polygon.rect(T + half - 0.5, T, 1, H - 2 * T)));
    div.space = space;

    // ── Section 1: Spring Chain (left half) ──────────────────────────────
    {
      const cx = T + half / 2;
      const startY = 60;
      const links = 8;
      const linkDist = 30;
      const bodies = [];

      const anchor = new Body(BodyType.STATIC, new Vec2(cx, startY));
      anchor.shapes.add(new Circle(5));
      anchor.space = space;
      bodies.push(anchor);

      let prev = anchor;
      for (let i = 0; i < links; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(cx, startY + (i + 1) * linkDist));
        b.shapes.add(new Circle(8));
        try { b.userData._colorIdx = i % 2 === 0 ? 0 : 1; } catch(_) {}
        b.space = space;

        const spring = new SpringJoint(
          prev, b,
          new Vec2(0, 0), new Vec2(0, 0),
          linkDist,
        );
        spring.frequency = 6;
        spring.damping = 0.4;
        spring.space = space;

        bodies.push(b);
        prev = b;
      }

      // Heavy bob at the end
      const bob = new Body(BodyType.DYNAMIC, new Vec2(cx, startY + (links + 1) * linkDist));
      bob.shapes.add(new Circle(18));
      try { bob.userData._colorIdx = 3; } catch(_) {}
      bob.space = space;

      const bobSpring = new SpringJoint(
        prev, bob,
        new Vec2(0, 0), new Vec2(0, 0),
        linkDist,
      );
      bobSpring.frequency = 6;
      bobSpring.damping = 0.4;
      bobSpring.space = space;

      bodies.push(bob);
      _sections.chain = { bodies, anchor };
    }

    // ── Section 2: Soft-body Blob (right half) ──────────────────────────
    {
      const cx = T + half + half / 2;
      const cy = H / 2 - 20;
      const numPoints = 10;
      const radius = 50;
      const bodies = [];

      // Center body
      const center = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
      center.shapes.add(new Circle(12));
      try { center.userData._colorIdx = 5; } catch(_) {}
      center.space = space;

      // Ring of bodies
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const bx = cx + Math.cos(angle) * radius;
        const by = cy + Math.sin(angle) * radius;

        const b = new Body(BodyType.DYNAMIC, new Vec2(bx, by));
        b.shapes.add(new Circle(8));
        try { b.userData._colorIdx = i % 2 === 0 ? 0 : 1; } catch(_) {}
        b.space = space;
        bodies.push(b);

        // Spring to center
        const toCenter = new SpringJoint(
          center, b,
          new Vec2(0, 0), new Vec2(0, 0),
          radius,
        );
        toCenter.frequency = 3;
        toCenter.damping = 0.3;
        toCenter.space = space;
      }

      // Springs between adjacent ring bodies
      for (let i = 0; i < numPoints; i++) {
        const next = (i + 1) % numPoints;
        const dx = bodies[next].position.x - bodies[i].position.x;
        const dy = bodies[next].position.y - bodies[i].position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const ring = new SpringJoint(
          bodies[i], bodies[next],
          new Vec2(0, 0), new Vec2(0, 0),
          dist,
        );
        ring.frequency = 4;
        ring.damping = 0.3;
        ring.space = space;
      }

      // Cross-bracing springs (every other body across the ring for rigidity)
      for (let i = 0; i < numPoints; i++) {
        const opposite = (i + Math.floor(numPoints / 2)) % numPoints;
        const dx = bodies[opposite].position.x - bodies[i].position.x;
        const dy = bodies[opposite].position.y - bodies[i].position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const cross = new SpringJoint(
          bodies[i], bodies[opposite],
          new Vec2(0, 0), new Vec2(0, 0),
          dist,
        );
        cross.frequency = 2;
        cross.damping = 0.4;
        cross.space = space;
      }

      _sections.blob = { center, bodies };
    }
  },

  // ── Interactive drag ────────────────────────────────────────────────────

  click(x, y, space) {
    _dragX = x;
    _dragY = y;
    let best = null, bestDist = 60;
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
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

  step(space) {
    // Handle drag release
    if (_pendingRelease) {
      _pendingRelease = false;
      if (_grabJoint) {
        _grabJoint.space = null;
        _grabJoint = null;
      }
      _mouseBody.position.setxy(-1000, -1000);
      _mouseBody.velocity.setxy(0, 0);
    }

    // Handle pending grab
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

    // Move mouse body toward cursor via velocity
    if (_grabJoint) {
      const dx = _dragX - _mouseBody.position.x;
      const dy = _dragY - _mouseBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const speed = Math.min(dist * 60, 800);
        _mouseBody.velocity.setxy(dx / dist * speed, dy / dist * speed);
      } else {
        _mouseBody.velocity.setxy(0, 0);
      }
    }
  },

  // ── Rendering ──────────────────────────────────────────────────────────

  render(ctx, space, W, H) {
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);

    // Draw all bodies
    const bodies = space.bodies;
    for (let it = bodies.iterator(); it.hasNext(); ) {
      const b = it.next();
      if (b === _mouseBody) continue;
      drawBody(ctx, b);
    }

    // Draw springs for chain section
    if (_sections.chain) {
      const { bodies } = _sections.chain;
      for (let i = 0; i < bodies.length - 1; i++) {
        const a = bodies[i].position;
        const b = bodies[i + 1].position;
        drawSpring(ctx, a.x, a.y, b.x, b.y, '#58a6ff88', 6, 4);
      }
      drawPin(ctx, bodies[0].position.x, bodies[0].position.y);
    }

    // Draw springs for soft-body blob
    if (_sections.blob) {
      const { center, bodies } = _sections.blob;
      const cp = center.position;
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < bodies.length; i++) {
        const bp = bodies[i].position;
        drawSpring(ctx, cp.x, cp.y, bp.x, bp.y, '#7ee787', 4, 3);
        const next = bodies[(i + 1) % bodies.length];
        const np = next.position;
        drawSpring(ctx, bp.x, bp.y, np.x, np.y, '#7ee78766', 3, 2);
      }
      ctx.globalAlpha = 1;

      // Draw membrane
      ctx.beginPath();
      const first = bodies[0].position;
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < bodies.length; i++) {
        ctx.lineTo(bodies[i].position.x, bodies[i].position.y);
      }
      ctx.closePath();
      ctx.fillStyle = '#7ee78710';
      ctx.fill();
      ctx.strokeStyle = '#7ee78744';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Section labels
    const T = 20;
    const half = (W - 2 * T) / 2;
    drawLabel(ctx, T + half / 2, 30, 'Spring Chain', '#ffffff88', 12);
    drawLabel(ctx, T + half + half / 2, 30, 'Soft-body Blob', '#ffffff88', 12);
  },

};
