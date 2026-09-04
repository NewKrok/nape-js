/**
 * Portals — complex demo using UserConstraint + callbacks
 *
 * Ported from the original nape Haxe sample by Luca Deltodesco.
 * Uses the UserConstraint API to implement a dynamic Portal constraint
 * linking a body with a clone produced incrementally as it passes through
 * a sensor portal, handled via the Nape callbacks system.
 */
import {
  Body, BodyType, Vec2, Circle, Polygon, Capsule,
  PivotJoint, UserConstraint,
  CbType, CbEvent, InteractionType, InteractionListener, PreListener, PreFlag,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ─── Portal data structures ────────────────────────────────────────────────

// Portal:       { target, collide, ignore, body, sensor, position, direction, width }
// PortalPair:   { portalA, portalB, bodyA, bodyB }
// Body.userData: { __portal_pairs: PortalPair[] }
// Shape.userData for portable shapes: { __portal_id, __portals: [{portal, portal_target}], __portal_active }
// Shape.userData for sensor shapes:   { __portal: Portal }

// ─── PortalConstraint ──────────────────────────────────────────────────────
//
// 3-DOF constraint linking a body and its portal clone.
// Portal bodies (pb1, pb2) are registered but given implicit infinite mass.
//
// Positional constraint:
//   [ λ·s1·n1 + s2·n2 ]
//   [ λ·s1×n1 + s2×n2 ]
//   [ (b1.rot - a1) - (b2.rot - a2) - π ]
//

class PortalConstraint extends UserConstraint {
  _body1 = null;
  _body2 = null;
  _portalBody1 = null;
  _portalBody2 = null;
  _position1 = null;
  _position2 = null;
  _direction1 = null;
  _direction2 = null;
  _scale = 1;

  // Pre-allocated working vectors
  _unitDir1 = null;
  _unitDir2 = null;
  _p1 = null; _p2 = null;
  _s1 = null; _s2 = null;
  _n1 = null; _n2 = null;
  _a1 = 0; _a2 = 0;

  constructor(portalBody1, position1, direction1,
              portalBody2, position2, direction2,
              scale, body1, body2) {
    super(3); // 3 dimensional constraint

    this.body1 = body1;
    this.body2 = body2;
    this.portalBody1 = portalBody1;
    this.portalBody2 = portalBody2;
    this.position1 = position1;
    this.position2 = position2;
    this.direction1 = direction1;
    this.direction2 = direction2;
    this._scale = scale;

    this._unitDir1 = new Vec2();
    this._unitDir2 = new Vec2();
    this._p1 = new Vec2(); this._p2 = new Vec2();
    this._s1 = new Vec2(); this._s2 = new Vec2();
    this._n1 = new Vec2(); this._n2 = new Vec2();
  }

  get body1() { return this._body1; }
  set body1(v) { this._body1 = this.__registerBody(this._body1, v); }

  get body2() { return this._body2; }
  set body2(v) { this._body2 = this.__registerBody(this._body2, v); }

  get portalBody1() { return this._portalBody1; }
  set portalBody1(v) { this._portalBody1 = this.__registerBody(this._portalBody1, v); }

  get portalBody2() { return this._portalBody2; }
  set portalBody2(v) { this._portalBody2 = this.__registerBody(this._portalBody2, v); }

  get position1() { return this._position1; }
  set position1(v) {
    if (this._position1 == null) this._position1 = this.__bindVec2();
    this._position1.set(v);
  }

  get position2() { return this._position2; }
  set position2(v) {
    if (this._position2 == null) this._position2 = this.__bindVec2();
    this._position2.set(v);
  }

  get direction1() { return this._direction1; }
  set direction1(v) {
    if (this._direction1 == null) this._direction1 = this.__bindVec2();
    this._direction1.set(v);
  }

  get direction2() { return this._direction2; }
  set direction2(v) {
    if (this._direction2 == null) this._direction2 = this.__bindVec2();
    this._direction2.set(v);
  }

  get scale() { return this._scale; }
  set scale(v) {
    if (this._scale !== v) this.__invalidate();
    this._scale = v;
  }

  __copy() {
    return new PortalConstraint(
      this._portalBody1, this._position1, this._direction1,
      this._portalBody2, this._position2, this._direction2,
      this._scale, this._body1, this._body2,
    );
  }

  /** Set clone position/velocity so constraint starts solved. */
  setProperties(clone, original) {
    this.__validate();
    this.__prepare();

    const v = [0, 0, 0];
    this.__velocity(v);

    const p1 = this._p1, p2 = this._p2;
    const n1 = this._n1, n2 = this._n2;
    const s1 = this._s1, s2 = this._s2;
    const a1 = this._a1, a2 = this._a2;
    const sc = this._scale;

    if (clone === this._body2) {
      const s1dn1 = s1.dot(n1);
      const s1cn1 = s1.cross(n1);
      clone.position = new Vec2(
        this._portalBody2.position.x + p2.x - (n2.x * s1dn1 + n2.y * s1cn1) * sc,
        this._portalBody2.position.y + p2.y - (n2.y * s1dn1 - n2.x * s1cn1) * sc,
      );
      clone.rotation = -Math.PI + original.rotation - a1 + a2;
      clone.velocity = new Vec2(
        clone.velocity.x - (n2.x * v[0] + n2.y * v[1]),
        clone.velocity.y - (n2.y * v[0] - n2.x * v[1]),
      );
      clone.angularVel += v[2];
    } else {
      const s2dn2 = s2.dot(n2);
      const s2cn2 = s2.cross(n2);
      clone.position = new Vec2(
        this._portalBody1.position.x + p1.x - (n1.x * s2dn2 + n1.y * s2cn2) / sc,
        this._portalBody1.position.y + p1.y - (n1.y * s2dn2 - n1.x * s2cn2) / sc,
      );
      clone.rotation = Math.PI + original.rotation - a2 + a1;
      clone.velocity = new Vec2(
        clone.velocity.x + (n1.x * v[0] + n1.y * v[1]) / sc,
        clone.velocity.y + (n1.y * v[0] - n1.x * v[1]) / sc,
      );
      clone.angularVel += v[2];
    }
  }

  __validate() {
    const len1 = this._direction1.length;
    const len2 = this._direction2.length;
    this._unitDir1.setxy(this._direction1.x / len1, this._direction1.y / len1);
    this._unitDir2.setxy(this._direction2.x / len2, this._direction2.y / len2);
  }

  __prepare() {
    let tmp;

    tmp = this._portalBody1.localVectorToWorld(this._position1);
    this._p1.set(tmp); tmp.dispose();

    tmp = this._portalBody2.localVectorToWorld(this._position2);
    this._p2.set(tmp); tmp.dispose();

    const b1pos = this._body1.position;
    const b2pos = this._body2.position;
    const pb1pos = this._portalBody1.position;
    const pb2pos = this._portalBody2.position;

    this._s1.setxy(b1pos.x - this._p1.x - pb1pos.x, b1pos.y - this._p1.y - pb1pos.y);
    this._s2.setxy(b2pos.x - this._p2.x - pb2pos.x, b2pos.y - this._p2.y - pb2pos.y);

    tmp = this._portalBody1.localVectorToWorld(this._unitDir1);
    this._n1.set(tmp); tmp.dispose();

    tmp = this._portalBody2.localVectorToWorld(this._unitDir2);
    this._n2.set(tmp); tmp.dispose();

    this._a1 = this._unitDir1.angle + this._portalBody1.rotation;
    this._a2 = this._unitDir2.angle + this._portalBody2.rotation;
  }

  __position(err) {
    const s1 = this._s1, s2 = this._s2, n1 = this._n1, n2 = this._n2;
    const sc = this._scale;
    err[0] = sc * s1.dot(n1) + s2.dot(n2);
    err[1] = sc * s1.cross(n1) + s2.cross(n2);
    err[2] = (this._body1.rotation - this._a1) - (this._body2.rotation - this._a2) - Math.PI;
  }

  __velocity(err) {
    const b1v = this._body1.constraintVelocity;
    const b2v = this._body2.constraintVelocity;
    const b1w = this._body1.angularVel + this._body1.kinAngVel;
    const b2w = this._body2.angularVel + this._body2.kinAngVel;
    const pb1v = this._portalBody1.constraintVelocity;
    const pb2v = this._portalBody2.constraintVelocity;
    const pb1w = this._portalBody1.angularVel + this._portalBody1.kinAngVel;
    const pb2w = this._portalBody2.angularVel + this._portalBody2.kinAngVel;

    const p1 = this._p1, p2 = this._p2;
    const s1 = this._s1, s2 = this._s2;
    const n1 = this._n1, n2 = this._n2;
    const sc = this._scale;

    // u_i = body_i.vel - pb_i.angvel × p_i - pb_i.vel
    const u1x = b1v.x - (-pb1w * p1.y) - pb1v.x;
    const u1y = b1v.y - ( pb1w * p1.x) - pb1v.y;
    const u2x = b2v.x - (-pb2w * p2.y) - pb2v.x;
    const u2y = b2v.y - ( pb2w * p2.x) - pb2v.y;

    const u1dotN1  = u1x * n1.x + u1y * n1.y;
    const u1crossN1 = u1x * n1.y - u1y * n1.x;
    const u2dotN2  = u2x * n2.x + u2y * n2.y;
    const u2crossN2 = u2x * n2.y - u2y * n2.x;

    err[0] = sc * (u1dotN1   + pb1w * s1.cross(n1)) + (u2dotN2   + pb2w * s2.cross(n2));
    err[1] = sc * (u1crossN1 + pb1w * s1.dot(n1))   + (u2crossN2 + pb2w * s2.dot(n2));
    err[2] = (b1w - pb1w) - (b2w - pb2w);
  }

  __eff_mass(eff) {
    const sc = this._scale;
    eff[0] = eff[3] = this._body1.constraintMass * sc * sc + this._body2.constraintMass;
    eff[1] = eff[2] = eff[4] = 0;
    eff[5] = this._body1.constraintInertia + this._body2.constraintInertia;
  }

  __impulse(imp, body, out) {
    if (body === this._portalBody1 || body === this._portalBody2) {
      out.zpp_inner.x = 0;
      out.zpp_inner.y = 0;
      out.zpp_inner.z = 0;
    } else {
      let sc1, sc2, norm;
      if (body === this._body1) { sc1 = this._scale; sc2 =  1; norm = this._n1; }
      else                      { sc1 = 1;           sc2 = -1; norm = this._n2; }
      out.zpp_inner.x = sc1 * (norm.x * imp[0] + norm.y * imp[1]);
      out.zpp_inner.y = sc1 * (norm.y * imp[0] - norm.x * imp[1]);
      out.zpp_inner.z = sc2 * imp[2];
    }
  }
}


// ─── PortalManager ─────────────────────────────────────────────────────────

class PortalManager {
  PORTAL;
  PORTABLE;
  PARTIAL;
  _portalID = 0;

  constructor(space) {
    this.PORTAL = new CbType();
    this.PORTABLE = new CbType();
    this.PARTIAL = new CbType();

    const beginL = new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR,
      this.PORTAL, this.PORTABLE,
      (cb) => this._portalBegin(cb),
    );
    beginL.space = space;

    const endL = new InteractionListener(
      CbEvent.END, InteractionType.SENSOR,
      this.PORTAL, this.PORTABLE,
      (cb) => this._portalEnd(cb),
    );
    endL.space = space;

    const preL = new PreListener(
      InteractionType.COLLISION,
      this.PORTABLE, CbType.ANY_SHAPE,
      (cb) => this._backCollision(cb),
    );
    preL.space = space;
  }

  _portalBegin(cb) {
    const portalSensor = cb.int1.castShape;
    const shape = cb.int2.castShape;
    if (!portalSensor || !shape) return;
    const body = shape.body;
    if (body == null) return;

    const portal = portalSensor.userData.__portal;
    if (!portal || !portal.target) return;
    const shapeData = shape.userData;
    const bodyData = body.userData;

    // Search for existing PortalPair for this (portal, body) pair
    let portalPair = null;
    if (bodyData.__portal_pairs != null) {
      for (const pair of bodyData.__portal_pairs) {
        if ((pair.portalA === portal || pair.portalB === portal)
         && (pair.bodyA === body || pair.bodyB === body)) {
          portalPair = pair;
          break;
        }
      }
    }

    // Ensure we're not entering a portal behind one we're currently going through
    if (portalPair == null && shapeData.__portal_id != null && shape.cbTypes.has(this.PARTIAL)) {
      for (const pData of shapeData.__portals) {
        if (this._behindPortal(pData.portal, portal.sensor.worldCOM)) {
          return;
        }
      }
    }

    const targetPortal = portal.target;
    const scale = targetPortal.width / portal.width;

    if (portalPair == null) {
      // Check we don't have a long chain case
      if (bodyData.__portal_pairs != null) {
        const stack = [body];
        const visited = [body];
        let longChain = false;
        while (stack.length > 0 && !longChain) {
          const cur = stack.pop();
          const curData = cur.userData;
          if (curData.__portal_pairs == null) continue;
          for (const pair of curData.__portal_pairs) {
            const otherBody = pair.bodyA === cur ? pair.bodyB : pair.bodyA;
            if (visited.indexOf(otherBody) === -1) {
              visited.push(otherBody);
              stack.push(otherBody);
            }
            if (pair.portalA === portal || pair.portalB === portal) {
              longChain = true;
              break;
            }
          }
        }
        if (longChain) return;
      }

      // Brand new interaction — create cloned body
      const clone = new Body();
      const cloneShape = shape.copy();
      cloneShape.scale(scale, scale);
      cloneShape.body = clone;
      clone.space = body.space;

      // Create portal constraint
      const pcon = new PortalConstraint(
        portal.body, portal.position, portal.direction,
        targetPortal.body, targetPortal.position, targetPortal.direction,
        scale, body, clone,
      );
      pcon.space = clone.space;
      pcon.setProperties(clone, body);

      // Create portal pair
      portalPair = {
        portalA: portal,
        portalB: targetPortal,
        bodyA: body,
        bodyB: clone,
      };

      if (bodyData.__portal_pairs == null) bodyData.__portal_pairs = [];
      bodyData.__portal_pairs.push(portalPair);
      const cloneData = clone.userData;
      cloneData.__portal_pairs = [portalPair];

      // Assign shape tracking data
      let id = shapeData.__portal_id;
      let portals = shapeData.__portals;
      if (id == null) {
        id = shapeData.__portal_id = this._portalID++;
        portals = shapeData.__portals = [];
        shapeData.__portal_active = 0;
      }
      portals.push({ portal, portal_target: false });
      shapeData.__portal_active++;

      const cloneShapeData = cloneShape.userData;
      cloneShapeData.__portal_id = id;
      cloneShapeData.__portals = [{ portal: portal.target, portal_target: true }];
      cloneShapeData.__portal_active = 0;

      if (!shape.cbTypes.has(this.PARTIAL)) {
        shape.cbTypes.add(this.PARTIAL);
        cloneShape.cbTypes.add(this.PARTIAL);
      }
      // Ensure clone has PORTABLE so PreListener matches it
      cloneShape.cbTypes.add(this.PORTABLE);
    } else {
      // Portal interaction exists for this body and portal.
      let anyEqual = false;
      if (shapeData.__portals != null) {
        for (const pData of shapeData.__portals) {
          if (pData.portal.target === portal) return;
          if (pData.portal === portal) anyEqual = true;
        }
      }

      // Check if shape is already part of the interaction
      const clone = portalPair.bodyA === body ? portalPair.bodyB : portalPair.bodyA;
      let found = false;
      if (shapeData.__portal_id != null) {
        for (const cloneShape of clone.shapes) {
          const csData = cloneShape.userData;
          if (csData.__portal_id === shapeData.__portal_id) {
            found = true;
            break;
          }
        }
      }

      if (!found) {
        // Shape is not part of the interaction — create its clone
        const cloneShape = shape.copy();
        cloneShape.scale(scale, scale);
        cloneShape.body = clone;

        if (shapeData.__portal_id == null) {
          shapeData.__portal_id = this._portalID++;
          shapeData.__portals = [];
          shapeData.__portal_active = 0;
        }
        shapeData.__portals.push({ portal, portal_target: false });
        shapeData.__portal_active++;

        const csData = cloneShape.userData;
        csData.__portal_id = shapeData.__portal_id;
        csData.__portals = [{ portal: portal.target, portal_target: true }];
        csData.__portal_active = 0;

        if (!shape.cbTypes.has(this.PARTIAL)) {
          shape.cbTypes.add(this.PARTIAL);
          cloneShape.cbTypes.add(this.PARTIAL);
        }
        cloneShape.cbTypes.add(this.PORTABLE);
      } else if (anyEqual) {
        shapeData.__portal_active++;
      }
    }
  }

  _portalEnd(cb) {
    const portalSensor = cb.int1.castShape;
    const shape = cb.int2.castShape;
    if (!portalSensor || !shape) return;
    const body = shape.body;
    if (body == null) return;

    const portal = portalSensor.userData.__portal;
    const shapeData = shape.userData;
    const bodyData = body.userData;

    const portals = shapeData.__portals;
    let portalData = null;
    if (portals) {
      for (const pData of portals) {
        if (pData.portal === portal) { portalData = pData; break; }
      }
    }
    if (portalData == null) return;

    // No longer active in chain
    shapeData.__portal_active--;
    portalData.portal_target = this._behindPortal(portal, shape.worldCOM);

    // Collect all shapes in the portal chain
    const shapes = [shape];
    const stack = [body];
    while (stack.length > 0) {
      const stackBody = stack.pop();
      const stackData = stackBody.userData;
      if (stackData.__portal_pairs == null) continue;
      for (const pair of stackData.__portal_pairs) {
        const cloneBody = pair.bodyA === stackBody ? pair.bodyB : pair.bodyA;
        for (const cloneShape of cloneBody.shapes) {
          const sData = cloneShape.userData;
          if (sData.__portal_active != null) {
            if (shapes.indexOf(cloneShape) === -1) {
              shapes.push(cloneShape);
              stack.push(cloneShape.body);
            }
          }
        }
      }
    }

    // Check whether all shapes in chain are inactive
    let anyActive = false;
    for (const s of shapes) {
      if (s.userData.__portal_active !== 0) { anyActive = true; break; }
    }
    if (anyActive) return;

    // All inactive — remove shapes that passed through (portal_target = true)
    const survivors = [];
    for (const s of shapes) {
      const sData = s.userData;
      let anyTarget = false;
      for (const pData of sData.__portals) {
        if (pData.portal_target) { anyTarget = true; break; }
      }
      if (anyTarget) {
        const sBody = s.body;
        s.body = null;
        if (sBody.shapes.length === 0) {
          // Disable constraints on this body before removing from space
          let cNode = sBody.zpp_inner.constraints.head;
          while (cNode != null) {
            if (cNode.elt && cNode.elt.outer) cNode.elt.outer.active = false;
            cNode = cNode.next;
          }
          sBody.space = null;
        }
      } else {
        survivors.push(s);
      }
    }

    for (const survivor of survivors) {
      const survData = survivor.userData;
      survData.__portal_id = null;
      survData.__portals = [];
      survivor.cbTypes.remove(this.PARTIAL);

      const survBody = survivor.body;
      const bData = survBody.userData;
      if (bData.__portal_pairs) {
        let i = 0;
        while (i < bData.__portal_pairs.length) {
          const pair = bData.__portal_pairs[i];
          const clone = pair.bodyA === survBody ? pair.bodyB : pair.bodyA;
          if (clone.space == null) {
            bData.__portal_pairs.splice(i, 1);
          } else {
            i++;
          }
        }
      }
    }
  }

  _behindPortal(portal, position) {
    const wp = portal.body.localPointToWorld(portal.position);
    const ux = position.x - wp.x;
    const uy = position.y - wp.y;
    const dir = portal.body.localVectorToWorld(portal.direction);
    const behind = ux * dir.x + uy * dir.y <= 0;
    wp.dispose();
    dir.dispose();
    return behind;
  }

  _handlePartial(partial, carb, ret) {
    const partialData = partial.userData;
    const portals = partialData.__portals;
    if (!portals) return ret;

    for (const portalData of portals) {
      const portal = portalData.portal;
      let anyBehind = false;

      let i = 0;
      while (i < carb.contacts.length) {
        const contact = carb.contacts.at(i);
        const scale = partial === carb.shape1 ? 0.5 : -0.5;
        const px = contact.position.x + carb.normal.x * contact.penetration * scale;
        const py = contact.position.y + carb.normal.y * contact.penetration * scale;
        if (this._behindPortal(portal, { x: px, y: py })) {
          carb.contacts.remove(contact);
          anyBehind = true;
        } else {
          i++;
        }
      }

      // If any contact is behind, also cull virtual ones
      if (anyBehind) {
        let j = 0;
        while (j < carb.contacts.length) {
          const contact = carb.contacts.at(j);
          if (contact.penetration < 0) {
            carb.contacts.remove(contact);
          } else {
            j++;
          }
        }
      }

      if (carb.contacts.empty()) return PreFlag.IGNORE_ONCE;
    }
    return ret;
  }

  _backCollision(cb) {
    const carb = cb.arbiter.collisionArbiter;
    if (!carb) return PreFlag.ACCEPT_ONCE;

    // Use arbiter shapes for reliable reference equality
    const s1 = cb.arbiter.shape1;
    const s2 = cb.arbiter.shape2;

    // Determine which shape is the "portable" one (has __portals data)
    let partial, other;
    if (s1.userData.__portals && s1.userData.__portals.length > 0) {
      partial = s1; other = s2;
    } else if (s2.userData.__portals && s2.userData.__portals.length > 0) {
      partial = s2; other = s1;
    } else {
      // Neither shape is actively in a portal
      return PreFlag.ACCEPT_ONCE;
    }

    const portals = partial.userData.__portals;
    for (const portalData of portals) {
      const portal = portalData.portal;
      if (other.body === portal.body) {
        if (portal.collide.indexOf(other) !== -1) return PreFlag.ACCEPT_ONCE;
        if (portal.ignore.indexOf(other) !== -1) return PreFlag.IGNORE_ONCE;
      }
    }

    let ret = PreFlag.ACCEPT_ONCE;
    ret = this._handlePartial(partial, carb, ret);
    if (other.userData.__portals && other.userData.__portals.length > 0) {
      ret = this._handlePartial(other, carb, ret);
    }
    return ret;
  }
}

// ─── Portal generation helper ──────────────────────────────────────────────

let manager;

// Drag state
let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0;
let _dragY = 0;

function genPortal(width, position, rotation, body) {
  if (body == null) body = new Body();

  const sides = [
    new Polygon(Polygon.rect(-10, -width / 2, 20, -10)),
    new Polygon(Polygon.rect(-10, width / 2, 20, 10)),
  ];
  const back = new Polygon(Polygon.rect(-10, -width / 2, 5, width));

  sides[0].rotate(rotation);
  sides[1].rotate(rotation);
  back.rotate(rotation);
  if (position != null) {
    sides[0].translate(position);
    sides[1].translate(position);
    back.translate(position);
  }
  sides[0].body = body;
  sides[1].body = body;
  back.body = body;

  // Sensor extends further in the direction axis so objects trigger BEGIN
  // at least one step before they can reach the back shape
  const sensor = new Polygon(Polygon.rect(-5, -width / 2, 40, width));
  sensor.rotate(rotation);
  if (position != null) sensor.translate(position);
  sensor.sensorEnabled = true;
  sensor.cbTypes.add(manager.PORTAL);
  sensor.body = body;

  const dir = new Vec2(Math.cos(rotation), Math.sin(rotation));
  const pos = new Vec2(0, 0);
  pos.rotate(rotation);
  if (position != null) { pos.x += position.x; pos.y += position.y; }

  const portal = {
    target: null,
    collide: sides,
    ignore: [back],
    body,
    sensor,
    position: pos,
    direction: dir,
    width,
  };

  sensor.userData.__portal = portal;
  return portal;
}

function _drawPortalGlow(ctx, space) {
  ctx.save();
  let pi = 0;
  for (const body of space.bodies) {
    for (const shape of body.shapes) {
      const portal = shape.userData.__portal;
      if (!portal) continue;
      const wp = body.localPointToWorld(portal.position);
      const wd = body.localVectorToWorld(portal.direction);
      const perpX = -wd.y, perpY = wd.x;
      const hw = portal.width / 2;

      const color = pi < 2 ? "#58a6ff" : "#f85149";
      pi++;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(wp.x - perpX * hw, wp.y - perpY * hw);
      ctx.lineTo(wp.x + perpX * hw, wp.y + perpY * hw);
      ctx.stroke();
      ctx.shadowBlur = 0;
      wp.dispose();
      wd.dispose();
    }
  }
  ctx.restore();
}

let _spawnIdx = 0;
const _shapeTypes = ["circle", "box", "capsule"];

function spawnShape(space, x, y, type, mgr) {
  const body = new Body();
  const r = 12;
  if (type === "circle") {
    body.shapes.add(new Circle(r));
  } else if (type === "box") {
    body.shapes.add(new Polygon(Polygon.box(r * 2, r * 2)));
  } else {
    body.shapes.add(new Capsule(r * 2.5, r * 1.4));
  }
  body.position = new Vec2(x, y);
  body.space = space;
  for (const s of body.shapes) {
    s.cbTypes.add(mgr.PORTABLE);
  }
}

// ─── Demo export ───────────────────────────────────────────────────────────

export default {
  id: "portals",
  label: "Portals",
  tags: ["UserConstraint", "Callback", "Sensor", "Portal"],
  featured: false,
  desc: 'Portal physics with <code>UserConstraint</code> and callbacks. <b>Drag</b> shapes into portals — they emerge from the linked partner.',
  walls: true,
  workerCompatible: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    manager = new PortalManager(space);

    // Portal body (static) — add all shapes BEFORE adding to space
    const portalBody = new Body(BodyType.STATIC);

    // X-layout: 4 portals (pulled inward for tighter layout)
    // Portal A: top-left, direction RIGHT
    const portalA = genPortal(120, new Vec2(200, 100), 0, portalBody);
    // Portal A target: bottom-right, direction LEFT
    const portalA2 = genPortal(120, new Vec2(W - 200, H - 120), Math.PI, portalBody);
    // Portal B: bottom-left, direction RIGHT
    const portalB = genPortal(120, new Vec2(200, H - 120), 0, portalBody);
    // Portal B target: top-right, direction LEFT
    const portalB2 = genPortal(120, new Vec2(W - 200, 100), Math.PI, portalBody);

    portalBody.space = space;

    portalA.target = portalA2; portalA2.target = portalA;
    portalB.target = portalB2; portalB2.target = portalB;

    // Spawn initial shapes: 5 circles, 5 boxes, 5 capsules
    for (let i = 0; i < 5; i++) {
      spawnShape(space, W / 2 - 80 + i * 40, H / 2 - 60, "circle", manager);
      spawnShape(space, W / 2 - 80 + i * 40, H / 2,      "box",     manager);
      spawnShape(space, W / 2 - 80 + i * 40, H / 2 + 60,  "capsule", manager);
    }

    // Drag anchor
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
      const j = new PivotJoint(_mouseBody, body, new Vec2(0, 0), localPt);
      j.stiff = false;
      j.frequency = 6;
      j.damping = 1;
      _grabJoint = j;
      j.space = space;
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
    let best = null, bestDist = 80;
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = body; }
    }
    if (best) {
      _pendingGrab = { body: best, localPt: best.worldPointToLocal(new Vec2(x, y)) };
    }
  },

  drag(x, y) { _dragX = x; _dragY = y; },

  release() { _pendingRelease = true; },

  // Custom render: bodies + portal lines, NO constraint debug lines
  render(ctx, space, W, H, showOutlines) {
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    _drawPortalGlow(ctx, space);
  },

  // Overlay for 3D and PixiJS modes — portal glow lines on top
  render3dOverlay(ctx, space, W, H) {
    _drawPortalGlow(ctx, space);
  },
};
