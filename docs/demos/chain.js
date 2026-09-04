import { Body, BodyType, Vec2, Circle, Polygon, Material, PivotJoint } from "../nape-js.esm.js?v=3.41.0";

// Module-level drag state (reset in setup)
let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;

export default {
  id: "chain",
  label: "Pendulum Chain",
  tags: ["PivotJoint", "Chain", "Drag"],
  featured: false,
  desc: 'A pendulum chain with a heavy bob. <b>Drag</b> any link to grab and pull it.',
  walls: true,
  moduleState: `let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;`,
  velocityIterations: 10,
  positionIterations: 8,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);

    // Reset drag state
    _mouseBody = null;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;
    _dragX = 0;
    _dragY = 0;

    const links = 14;
    const linkLen = 20;
    const anchorX = W / 2;
    const anchorY = 50;

    const anchor = new Body(BodyType.STATIC, new Vec2(anchorX, anchorY));
    anchor.shapes.add(new Circle(6));
    anchor.space = space;

    let prev = anchor;
    for (let i = 0; i < links; i++) {
      const link = new Body(BodyType.DYNAMIC, new Vec2(
        anchorX,
        anchorY + (i + 1) * linkLen,
      ));
      link.shapes.add(new Circle(5));
      try { link.userData._colorIdx = i % 2; } catch(_) {}
      link.space = space;

      new PivotJoint(
        prev, link,
        i === 0 ? new Vec2(0, 0) : new Vec2(0, linkLen / 2),
        new Vec2(0, -linkLen / 2),
      ).space = space;
      prev = link;
    }

    const bob = new Body(BodyType.DYNAMIC, new Vec2(
      anchorX,
      anchorY + (links + 1) * linkLen + 18,
    ));
    bob.shapes.add(new Circle(18, undefined, new Material(0.3, 0.2, 0.5, 10)));
    try { bob.userData._colorIdx = 3; } catch(_) {}
    bob.space = space;

    new PivotJoint(
      prev, bob,
      new Vec2(0, linkLen / 2),
      new Vec2(0, -18),
    ).space = space;

    bob.applyImpulse(new Vec2(220, 0));

    // Kinematic mouse anchor — lives in space, position freely settable
    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.space = space;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;
  },

  step(space, W, H) {
    if (_pendingRelease) {
      _pendingRelease = false;
      if (_grabJoint) {
        _grabJoint.space = null;
        _grabJoint = null;
      }
      // Park mouse body off-screen
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
      // Soft enough that chain joints always win, stiff enough to feel responsive
      _grabJoint.stiff = false;
      _grabJoint.frequency = 4;
      _grabJoint.damping = 0.9;
      _grabJoint.space = space;
    }
    // Move mouse body smoothly toward cursor — capped speed prevents sudden forces
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

  click(x, y, space, W, H) {
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

  drag(x, y, space, W, H) {
    _dragX = x;
    _dragY = y;
  },

  release(space) {
    _pendingRelease = true;
  },
};
