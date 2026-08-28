import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener,
} from "../nape-js.esm.js?v=3.40.0";

// ── Module-level state ───────────────────────────────────────────────────────
const keys = {};
let _lFlipper = null, _rFlipper = null;
let _lPivot = null, _rPivot = null;
let _flipW = 0;
let _oscillator = null;
let _oscCenter = 0;
let _oscTime = 0;
let _tableW = 0;

const FLIP_REST = 0.4;       // resting angle (tips pointing down-outward)
const FLIP_ACTIVE = -0.4;    // flipped angle (tips pointing up-outward)
const FLIP_SPEED = 14;       // rad/s angular velocity cap
const BUMPER_IMPULSE = 350;
const SLINGSHOT_IMPULSE = 280;

export default {
  id: "pinball",
  label: "Pinball",
  featured: false,
  tags: ["Circle", "Restitution", "Bumpers", "Kinematic"],
  moduleState: `const keys = {};
let _lFlipper = null, _rFlipper = null;
let _lPivot = null, _rPivot = null;
let _flipW = 0;
let _oscillator = null;
let _oscCenter = 0;
let _oscTime = 0;
let _tableW = 0;
const FLIP_REST = 0.4;
const FLIP_ACTIVE = -0.4;
const FLIP_SPEED = 14;
const BUMPER_IMPULSE = 350;
const SLINGSHOT_IMPULSE = 280;`,
  desc: "Pinball with asymmetric bumpers, slingshots, pegs, a launch lane, and an oscillating blocker. Left/Right arrows or A/D to flip. Click left/right half to flip on mobile. Click upper area to spawn balls.",
  walls: false,
  workerCompatible: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const bumperType = new CbType();
    const ballType = new CbType();
    const slingshotType = new CbType();

    // ── Layout constants ─────────────────────────────────────────────────
    const wallT = 12;
    const flipY = H - 50;             // flipper Y position
    const drainGap = W * 0.34;        // gap width between flippers
    const lPivotX = W / 2 - drainGap / 2;  // left flipper pivot (inner)
    const rPivotX = W / 2 + drainGap / 2;  // right flipper pivot (inner)

    // Guide walls start from outer edge, angle down to the flipper pivot
    const guideTopY = H * 0.5;

    // Launch lane width (right side channel)
    const laneW = W * 0.08;

    // ── Table walls ──────────────────────────────────────────────────────
    const wallB = (x, y, w, h) => {
      const b = new Body(BodyType.STATIC, new Vec2(x, y));
      b.shapes.add(new Polygon(Polygon.box(w, h)));
      b.space = space;
    };
    wallB(wallT / 2, H / 2, wallT, H);           // left
    wallB(W - wallT / 2, H / 2, wallT, H);       // right
    wallB(W / 2, wallT / 2, W, wallT);           // top

    // Bottom floor — two segments with drain gap in center
    const floorSegW = (W - drainGap) / 2;
    wallB(floorSegW / 2, H - wallT / 2, floorSegW, wallT);
    wallB(W - floorSegW / 2, H - wallT / 2, floorSegW, wallT);

    // ── Launch lane (right side channel) ─────────────────────────────────
    const laneX = W - wallT - laneW;
    const laneInner = new Body(BodyType.STATIC);
    laneInner.shapes.add(new Polygon([
      new Vec2(laneX, H * 0.08),
      new Vec2(laneX + 6, H * 0.08),
      new Vec2(laneX + 6, guideTopY - 20),
      new Vec2(laneX, guideTopY - 20),
    ]));
    laneInner.space = space;

    // Lane curve at top — small deflector to kick ball left into play
    const laneDeflector = new Body(BodyType.STATIC, new Vec2(laneX + laneW / 2, H * 0.06));
    laneDeflector.shapes.add(new Circle(6));
    laneDeflector.space = space;

    // ── Drain guides (angled walls leading to flipper pivots) ────────────
    // End point overlaps slightly under the flipper paddle so there's no
    // gap/step where the ball can snag at the pivot corner.
    const guideOverlap = 2;   // how far past pivot toward flipper center

    const lGuide = new Body(BodyType.STATIC);
    lGuide.shapes.add(new Polygon([
      new Vec2(wallT, guideTopY),
      new Vec2(wallT + 8, guideTopY),
      new Vec2(lPivotX + guideOverlap + 8, flipY),
      new Vec2(lPivotX + guideOverlap, flipY),
    ]));
    lGuide.space = space;

    const rGuide = new Body(BodyType.STATIC);
    rGuide.shapes.add(new Polygon([
      new Vec2(W - wallT - 8, guideTopY),
      new Vec2(W - wallT, guideTopY),
      new Vec2(rPivotX - guideOverlap, flipY),
      new Vec2(rPivotX - guideOverlap - 8, flipY),
    ]));
    rGuide.space = space;

    // ── Drain divider (small triangle between flippers) ──────────────────
    const dividerY = flipY + 8;
    const divider = new Body(BodyType.STATIC);
    divider.shapes.add(new Polygon([
      new Vec2(W / 2, dividerY - 14),
      new Vec2(W / 2 + 10, dividerY + 4),
      new Vec2(W / 2 - 10, dividerY + 4),
    ]));
    divider.space = space;

    // ── Slingshot walls (triangles on inner side of drain guides) ───────
    // Left guide: (wallT, guideTopY) → (lPivotX, flipY)
    // The playfield side of the left guide is to the RIGHT of the line.
    // We place a triangle offset to the right, with its base parallel to
    // the guide and the peak pointing further inward (right).
    const slingLen = 110;  // length along the guide direction
    const slingBulge = 22; // how far the peak pokes inward

    // Guide direction vector (normalized)
    const gdx = lPivotX - wallT;
    const gdy = flipY - guideTopY;
    const glen = Math.sqrt(gdx * gdx + gdy * gdy);
    const gux = gdx / glen;  // unit along guide
    const guy = gdy / glen;
    // Inward normal for left guide: 90° CW rotation = (gdy, -gdx) → points right-up
    const gnx = guy;    // gdy/glen  (positive = right)
    const gny = -gux;   // -gdx/glen (negative = up)

    // Center point at 65% along the left guide, offset 32px inward from guide
    const t = 0.80;
    const cx = wallT + gdx * t + gnx * 32;
    const cy = guideTopY + gdy * t + gny * 32;

    // Triangle: base along guide direction, peak pointing inward (right-up)
    const lSling = new Body(BodyType.STATIC);
    lSling.shapes.add(new Polygon([
      new Vec2(cx - gux * slingLen / 2, cy - guy * slingLen / 2),  // base top-left
      new Vec2(cx + gux * slingLen / 2, cy + guy * slingLen / 2),  // base bottom-right
      new Vec2(cx + gnx * slingBulge, cy + gny * slingBulge),      // peak (inward)
    ]));
    lSling.shapes.at(0).cbTypes.add(slingshotType);
    lSling.space = space;

    // Right guide: (W-wallT, guideTopY) → (rPivotX, flipY) — goes left-down
    const rgdx = rPivotX - (W - wallT);
    const rgdy = flipY - guideTopY;
    const rglen = Math.sqrt(rgdx * rgdx + rgdy * rgdy);
    const rgux = rgdx / rglen;
    const rguy = rgdy / rglen;
    // Inward normal for right guide: 90° CCW rotation = (-gdy, gdx) → points left-up
    const rgnx = -rguy;   // -rgdy/rglen (negative = left)
    const rgny = rgux;    // rgdx/rglen  (negative = up, since rgdx < 0)

    const rcx = (W - wallT) + rgdx * t + rgnx * 26;
    const rcy = guideTopY + rgdy * t + rgny * 26;

    const rSling = new Body(BodyType.STATIC);
    rSling.shapes.add(new Polygon([
      new Vec2(rcx - rgux * slingLen / 2, rcy - rguy * slingLen / 2),
      new Vec2(rcx + rgux * slingLen / 2, rcy + rguy * slingLen / 2),
      new Vec2(rcx + rgnx * slingBulge, rcy + rgny * slingBulge),
    ]));
    rSling.shapes.at(0).cbTypes.add(slingshotType);
    rSling.space = space;

    // ── Bumpers — asymmetric layout with active impulse ──────────────────
    const bumperMat = new Material(1.2, 0, 0, 1);
    const bumpers = [
      // Top cluster — offset, not symmetric
      { x: W * 0.25, y: H * 0.14, r: 22 },
      { x: W * 0.55, y: H * 0.12, r: 18 },
      { x: W * 0.42, y: H * 0.24, r: 24 },
      // Mid section — staggered
      { x: W * 0.18, y: H * 0.36, r: 16 },
      { x: W * 0.68, y: H * 0.32, r: 20 },
      { x: W * 0.45, y: H * 0.44, r: 18 },
      { x: W * 0.75, y: H * 0.48, r: 14 },
    ];

    for (const pos of bumpers) {
      const bumper = new Body(BodyType.STATIC, new Vec2(pos.x, pos.y));
      bumper.shapes.add(new Circle(pos.r, undefined, bumperMat));
      bumper.shapes.at(0).cbTypes.add(bumperType);
      bumper.space = space;
    }

    // ── Pegs (small static circles scattered for deflection) ─────────────
    const pegR = 5;
    const pegs = [
      { x: W * 0.15, y: H * 0.22 },
      { x: W * 0.72, y: H * 0.20 },
      { x: W * 0.35, y: H * 0.35 },
      { x: W * 0.58, y: H * 0.38 },
      { x: W * 0.82, y: H * 0.40 },
      { x: W * 0.28, y: H * 0.50 },
      { x: W * 0.62, y: H * 0.54 },
    ];
    for (const p of pegs) {
      const peg = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
      peg.shapes.add(new Circle(pegR));
      peg.space = space;
    }

    // ── Oscillating blocker (kinematic, moves side-to-side) ──────────────
    _oscCenter = W * 0.5;
    _oscTime = 0;
    _oscillator = new Body(BodyType.KINEMATIC, new Vec2(_oscCenter, H * 0.64));
    _oscillator.shapes.add(new Polygon(Polygon.box(52, 8)));
    _oscillator.space = space;

    // ── Listeners ────────────────────────────────────────────────────────
    // Bumper impulse
    const bumperListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      bumperType,
      ballType,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        const ball = b1?.isDynamic() ? b1 : b2;
        const bumper = b1?.isStatic() ? b1 : b2;
        if (!ball || !bumper) return;
        const dx = ball.position.x - bumper.position.x;
        const dy = ball.position.y - bumper.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        ball.applyImpulse(new Vec2(dx / dist * BUMPER_IMPULSE, dy / dist * BUMPER_IMPULSE));
      },
    );
    space.listeners.add(bumperListener);

    // Slingshot impulse — kick ball along the inward normal (away from guide wall)
    // Store each slingshot's normal direction on the body for the listener
    lSling._slingNx = gnx;
    lSling._slingNy = gny;
    rSling._slingNx = rgnx;
    rSling._slingNy = rgny;

    const slingshotListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      slingshotType,
      ballType,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        const ball = b1?.isDynamic() ? b1 : b2;
        const sling = b1?.isStatic() ? b1 : b2;
        if (!ball || !sling) return;
        // Push ball along slingshot's inward normal + slight upward bias
        const snx = sling._slingNx || 0;
        const sny = sling._slingNy || 0;
        ball.applyImpulse(new Vec2(
          snx * SLINGSHOT_IMPULSE,
          (sny - 0.3) * SLINGSHOT_IMPULSE,  // slight upward boost
        ));
      },
    );
    space.listeners.add(slingshotListener);

    // ── Flippers (kinematic — driven via velocity each step) ─────────────
    //
    // Layout:
    //   Left flipper:  pivot at lPivotX, paddle extends LEFT (outward)
    //   Right flipper: pivot at rPivotX, paddle extends RIGHT (outward)
    //
    // Rest: tips hang down-outward (+FLIP_REST for left, -FLIP_REST for right)
    // Active: tips swing up-outward
    _flipW = W * 0.12;
    const flipH = 10;

    _lPivot = new Vec2(lPivotX, flipY);
    _rPivot = new Vec2(rPivotX, flipY);

    // Helper: given a rotation, compute body position so that a local
    // offset point stays fixed at the given world pivot.
    //   worldPivot = bodyPos + rotate(localOffset, rotation)
    //   bodyPos = worldPivot - rotate(localOffset, rotation)
    function posFromPivot(pivot, localX, localY, rot) {
      const c = Math.cos(rot), s = Math.sin(rot);
      return {
        x: pivot.x - (localX * c - localY * s),
        y: pivot.y - (localX * s + localY * c),
      };
    }

    // Left flipper — pivot at its LEFT end (-flipW/2, 0), paddle extends right
    _lFlipper = new Body(BodyType.KINEMATIC);
    _lFlipper.shapes.add(new Polygon(Polygon.box(_flipW, flipH)));
    _lFlipper.rotation = FLIP_REST;
    const lp = posFromPivot(_lPivot, -_flipW / 2, 0, FLIP_REST);
    _lFlipper.position.setxy(lp.x, lp.y);
    _lFlipper.space = space;

    // Right flipper — pivot at its RIGHT end (+flipW/2, 0), paddle extends left
    _rFlipper = new Body(BodyType.KINEMATIC);
    _rFlipper.shapes.add(new Polygon(Polygon.box(_flipW, flipH)));
    _rFlipper.rotation = -FLIP_REST;
    const rp = posFromPivot(_rPivot, _flipW / 2, 0, -FLIP_REST);
    _rFlipper.position.setxy(rp.x, rp.y);
    _rFlipper.space = space;

    // ── Balls — spawn in the launch lane ───────────────────────────────
    const ballMat = new Material(0.5, 0.2, 0.1, 3);
    const spawnX = W - wallT - laneW / 2;  // center of launch lane
    const b = new Body(BodyType.DYNAMIC, new Vec2(spawnX, H * 0.45));
    b.shapes.add(new Circle(8, undefined, ballMat));
    b.shapes.at(0).cbTypes.add(ballType);
    try { b.userData._colorIdx = 0; } catch (_) {}
    b.space = space;

    space._ballType = ballType;
    _tableW = W;

    // ── Keyboard ─────────────────────────────────────────────────────────
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  },

  step(space) {
    if (!_lFlipper || !_rFlipper) return;

    // ── Oscillating blocker ──────────────────────────────────────────────
    if (_oscillator) {
      _oscTime += 1 / 60;
      const amplitude = 50;
      const freq = 0.4;  // cycles per second
      const targetX = _oscCenter + Math.sin(_oscTime * freq * Math.PI * 2) * amplitude;
      _oscillator.velocity.setxy((targetX - _oscillator.position.x) * 60, 0);
    }

    const lActive = keys["ArrowLeft"] || keys["KeyA"] || keys._touchLeft;
    const rActive = keys["ArrowRight"] || keys["KeyD"] || keys._touchRight;
    const hw = _flipW / 2;
    const dt = 1 / 60;

    // Helper: compute body center so that localOffset stays at worldPivot
    function pivotPos(pivot, lx, ly, rot) {
      const c = Math.cos(rot), s = Math.sin(rot);
      return {
        x: pivot.x - (lx * c - ly * s),
        y: pivot.y - (lx * s + ly * c),
      };
    }

    // Left flipper — pivot local offset is (-hw, 0)
    const lTarget = lActive ? FLIP_ACTIVE : FLIP_REST;
    const lDiff = lTarget - _lFlipper.rotation;
    const lAngVel = Math.max(-FLIP_SPEED, Math.min(FLIP_SPEED, lDiff * 30));
    _lFlipper.angularVel = lAngVel;
    const lNextRot = Math.max(FLIP_ACTIVE, Math.min(FLIP_REST, _lFlipper.rotation + lAngVel * dt));
    const lPos = pivotPos(_lPivot, -hw, 0, lNextRot);
    _lFlipper.velocity.setxy(
      (lPos.x - _lFlipper.position.x) / dt,
      (lPos.y - _lFlipper.position.y) / dt,
    );

    // Right flipper — pivot local offset is (+hw, 0)
    const rTarget = rActive ? -FLIP_ACTIVE : -FLIP_REST;
    const rDiff = rTarget - _rFlipper.rotation;
    const rAngVel = Math.max(-FLIP_SPEED, Math.min(FLIP_SPEED, rDiff * 30));
    _rFlipper.angularVel = rAngVel;
    const rNextRot = Math.max(-FLIP_REST, Math.min(-FLIP_ACTIVE, _rFlipper.rotation + rAngVel * dt));
    const rPos = pivotPos(_rPivot, hw, 0, rNextRot);
    _rFlipper.velocity.setxy(
      (rPos.x - _rFlipper.position.x) / dt,
      (rPos.y - _rFlipper.position.y) / dt,
    );

    // Respawn balls that fall through the drain — back into the launch lane
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
      if (body.position.y > _lPivot.y + 80) {
        body.position.setxy(
          _tableW - 12 - _tableW * 0.04,  // launch lane center
          30,
        );
        body.velocity.setxy(0, 0);
        body.angularVel = 0;
      }
    }
  },

  click(x, y, space, W, H) {
    if (y > H * 0.6) {
      // Hold flipper active until release
      if (x < W / 2) {
        keys._touchLeft = true;
      } else {
        keys._touchRight = true;
      }
      return;
    }
    const ballMat = new Material(0.5, 0.2, 0.1, 3);
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Circle(8, undefined, ballMat));
    if (space._ballType) b.shapes.at(0).cbTypes.add(space._ballType);
    try { b.userData._colorIdx = Math.floor(Math.random() * 6); } catch (_) {}
    b.space = space;
  },

  release() {
    keys._touchLeft = false;
    keys._touchRight = false;
  },
};
