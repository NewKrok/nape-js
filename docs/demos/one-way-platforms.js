import { Body, BodyType, Vec2, Polygon, CbType, InteractionType, PreListener, PreFlag, PivotJoint } from "../nape-js.esm.js?v=3.40.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.40.0";

// ── Module-level state for drag ──────────────────────────────────────────────
let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0, _dragY = 0;

export default {
  id: "one-way-platforms",
  label: "One-Way Platforms",
  featured: false,
  tags: ["PreListener", "CbType", "Kinematic"],
  desc: "Bodies pass through platforms from below but rest on them from above. Click &amp; drag a body to pull it through a platform — release to watch it land. Click empty space to spawn a new shape. The bottom conveyor belt pushes shapes sideways.",
  walls: true,
  moduleState: `let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0, _dragY = 0;`,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const platformType = new CbType();
    const objectType = new CbType();

    // Normal points from body1 → body2 (by shape-id order).
    // We need the component pointing from the platform toward the object:
    // if the platform is body1 we use normal as-is, otherwise flip it.
    // When that adjusted ny < 0 the object is above → ACCEPT; otherwise IGNORE.
    const preListener = new PreListener(
      InteractionType.COLLISION,
      platformType,
      objectType,
      (cb) => {
        const colArb = cb.arbiter.collisionArbiter;
        if (!colArb) return PreFlag.ACCEPT;
        const platBody = cb.swapped ? cb.int2 : cb.int1;
        const ny = colArb.normal.y;
        const platformIsBody1 = cb.arbiter.body1 === platBody;
        const platToObj = platformIsBody1 ? ny : -ny;
        return platToObj > 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
      },
    );
    space.listeners.add(preListener);

    const platformPositions = [
      { x: W * 0.35, y: H * 0.7, w: W * 0.35 },
      { x: W * 0.65, y: H * 0.5, w: W * 0.3 },
      { x: W * 0.3, y: H * 0.35, w: W * 0.35 },
    ];

    for (const p of platformPositions) {
      const plat = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
      plat.shapes.add(new Polygon(Polygon.box(p.w, 10)));
      plat.shapes.at(0).cbTypes.add(platformType);
      plat.space = space;
    }

    const conveyor = new Body(BodyType.KINEMATIC, new Vec2(W / 2, H * 0.85));
    conveyor.shapes.add(new Polygon(Polygon.box(W * 0.5, 10)));
    conveyor.surfaceVel = new Vec2(80, 0);
    conveyor.space = space;

    for (let i = 0; i < 20; i++) {
      const b = spawnRandomShape(space,
        40 + Math.random() * (W - 80),
        -Math.random() * 200,
      );
      for (const s of b.shapes) {
        s.cbTypes.add(objectType);
      }
    }

    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.space = space;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;

    space._objectType = objectType;
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
      _grabJoint.frequency = 8;
      _grabJoint.damping = 0.9;
      _grabJoint.space = space;
    }
    if (_grabJoint) {
      const dx = _dragX - _mouseBody.position.x;
      const dy = _dragY - _mouseBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxSpeed = 600;
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
    let best = null, bestDist = 50;
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = body; }
    }
    if (!best) {
      // No body nearby — spawn a new one
      const b = spawnRandomShape(space, x, y);
      if (space._objectType) {
        for (const s of b.shapes) s.cbTypes.add(space._objectType);
      }
      return;
    }
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
};
