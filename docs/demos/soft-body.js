import { Body, BodyType, Vec2, Polygon, PivotJoint } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

// All active soft bodies — each entry holds segment bodies and rest area
const _softBodies = [];

// Compute signed area of a polygon defined by world-space vertex pairs
// verts: Array of {x, y} in order
function polygonalArea(verts) {
  let area = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return Math.abs(area) * 0.5;
}

// Build a list of outer-edge vertices from a convex polygon template (array of {x,y}).
// Returns array of {x,y} world positions (not deflated — that happens per-segment).
function buildPerimeter(cx, cy, angle, verts) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map((v) => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos,
  }));
}

// Deflate a convex polygon perimeter inward by `thickness` units.
// Returns new array of {x,y}.
function deflatePolygon(perim, thickness) {
  const n = perim.length;
  return perim.map((_, i) => {
    const prev = perim[(i - 1 + n) % n];
    const next = perim[(i + 1) % n];
    // Edge normals (inward)
    const e1x = perim[i].x - prev.x;
    const e1y = perim[i].y - prev.y;
    const len1 = Math.sqrt(e1x * e1x + e1y * e1y);
    const n1x = e1y / len1;
    const n1y = -e1x / len1;

    const e2x = next.x - perim[i].x;
    const e2y = next.y - perim[i].y;
    const len2 = Math.sqrt(e2x * e2x + e2y * e2y);
    const n2x = e2y / len2;
    const n2y = -e2x / len2;

    // Average inward normal
    let nx = n1x + n2x;
    let ny = n1y + n2y;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    if (nlen > 1e-6) { nx /= nlen; ny /= nlen; }

    return {
      x: perim[i].x + nx * thickness,
      y: perim[i].y + ny * thickness,
    };
  });
}

/**
 * Create a pneumatic soft body.
 *
 * @param space      - The physics space
 * @param cx, cy     - Centre position
 * @param outerVerts - Array of {x,y} defining the convex outer perimeter (local, centred)
 * @param thickness  - Shell thickness (inner skin offset)
 * @param discretisation - Max segment length before splitting
 * @param colorIdx   - Colour index for rendering
 * @returns object with `segments` (Body[]) and `restArea`
 */
function createSoftBody(space, cx, cy, outerVerts, thickness, discretisation, colorIdx) {
  const angle = 0;
  const outerPerim = buildPerimeter(cx, cy, angle, outerVerts);
  const innerPerim = deflatePolygon(outerPerim, thickness);

  const n = outerPerim.length;
  const segments = []; // Body[]

  // For each edge of the polygon, subdivide into small trapezoidal segments
  // and build Body with Polygon shape.
  // segInfo[i] stores the list of segment bodies for edge i, in order.
  // Each segment body has:
  //   .userData._outerLeft, ._outerRight, ._innerLeft, ._innerRight  (world-space Vec2 at creation)
  //   .userData._edgeNormalX, ._edgeNormalY  — outward unit normal of outer edge

  const edgeSegments = []; // edgeSegments[edgeIdx] = [body, ...]

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const oA = outerPerim[i];
    const oB = outerPerim[j];
    const iA = innerPerim[i];
    const iB = innerPerim[j];

    const edgeLen = Math.sqrt((oB.x - oA.x) ** 2 + (oB.y - oA.y) ** 2);
    const numSegs = Math.max(1, Math.ceil(edgeLen / discretisation));

    // Outward normal of the outer edge
    const ex = oB.x - oA.x;
    const ey = oB.y - oA.y;
    const elen = Math.sqrt(ex * ex + ey * ey);
    const nx = ey / elen;
    const ny = -ex / elen;

    const segsForEdge = [];
    for (let s = 0; s < numSegs; s++) {
      const t0 = s / numSegs;
      const t1 = (s + 1) / numSegs;

      // World-space corners
      const olx = oA.x + t0 * (oB.x - oA.x);
      const oly = oA.y + t0 * (oB.y - oA.y);
      const orx = oA.x + t1 * (oB.x - oA.x);
      const ory = oA.y + t1 * (oB.y - oA.y);
      const ilx = iA.x + t0 * (iB.x - iA.x);
      const ily = iA.y + t0 * (iB.y - iA.y);
      const irx = iA.x + t1 * (iB.x - iA.x);
      const iry = iA.y + t1 * (iB.y - iA.y);

      // Centroid of trapezoid
      const bx = (olx + orx + ilx + irx) / 4;
      const by = (oly + ory + ily + iry) / 4;

      // Local vertices relative to centroid
      const verts = [
        new Vec2(olx - bx, oly - by),
        new Vec2(orx - bx, ory - by),
        new Vec2(irx - bx, iry - by),
        new Vec2(ilx - bx, ily - by),
      ];

      const body = new Body(BodyType.DYNAMIC, new Vec2(bx, by));
      body.shapes.add(new Polygon(verts));
      try {
        body.userData._colorIdx = colorIdx;
        // Store outer/inner anchors in LOCAL space for pressure force application
        body.userData._outerMidX = (olx + orx) / 2 - bx;
        body.userData._outerMidY = (oly + ory) / 2 - by;
        body.userData._edgeNormalX = nx;
        body.userData._edgeNormalY = ny;
        // Store world corners for rest-area computation
        body.userData._olx = olx - bx;
        body.userData._oly = oly - by;
        body.userData._orx = orx - bx;
        body.userData._ory = ory - by;
      } catch (_) {}
      body.space = space;
      segsForEdge.push(body);
      segments.push(body);
    }
    edgeSegments.push(segsForEdge);
  }

  // Connect adjacent segments with PivotJoints.
  // The "outer" shared vertex between two adjacent segments → stiff PivotJoint
  // The "inner" shared vertex → soft PivotJoint
  //
  // For two segments A (right end) and B (left end) of the same edge:
  //   outer shared world point = orx/ory of A = olx/oly of B
  //   inner shared world point = irx/iry of A = ilx/ily of B
  //
  // Across edges: last segment of edge i connects to first segment of edge i+1.

  // Flatten all segments in order with their edge/sub-index for easy adjacency
  const allSegs = []; // { body, olx,oly,orx,ory,ilx,ily,irx,iry } in world-space at creation
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const oA = outerPerim[i];
    const oB = outerPerim[j];
    const iA = innerPerim[i];
    const iB = innerPerim[j];
    const numSegs = edgeSegments[i].length;
    for (let s = 0; s < numSegs; s++) {
      const t0 = s / numSegs;
      const t1 = (s + 1) / numSegs;
      const bx = edgeSegments[i][s].position.x;
      const by = edgeSegments[i][s].position.y;
      allSegs.push({
        body: edgeSegments[i][s],
        olx: oA.x + t0 * (oB.x - oA.x) - bx,
        oly: oA.y + t0 * (oB.y - oA.y) - by,
        orx: oA.x + t1 * (oB.x - oA.x) - bx,
        ory: oA.y + t1 * (oB.y - oA.y) - by,
        ilx: iA.x + t0 * (iB.x - iA.x) - bx,
        ily: iA.y + t0 * (iB.y - iA.y) - by,
        irx: iA.x + t1 * (iB.x - iA.x) - bx,
        iry: iA.y + t1 * (iB.y - iA.y) - by,
      });
    }
  }

  const totalSegs = allSegs.length;
  for (let k = 0; k < totalSegs; k++) {
    const A = allSegs[k];
    const B = allSegs[(k + 1) % totalSegs];

    // Outer shared vertex: A.orx/ory (local to A), B.olx/oly (local to B)
    const outerJoint = new PivotJoint(
      A.body, B.body,
      new Vec2(A.orx, A.ory),
      new Vec2(B.olx, B.oly),
    );
    outerJoint.stiff = true;
    outerJoint.space = space;

    // Inner shared vertex: A.irx/iry (local to A), B.ilx/ily (local to B)
    const innerJoint = new PivotJoint(
      A.body, B.body,
      new Vec2(A.irx, A.iry),
      new Vec2(B.ilx, B.ily),
    );
    innerJoint.stiff = false;
    innerJoint.frequency = 30;
    innerJoint.damping = 10;
    // Don't let adjacent segments collide with each other
    innerJoint.ignore = true;
    innerJoint.space = space;
  }

  // Compute rest area from outer perimeter
  const restArea = polygonalArea(outerPerim);

  return { segments, restArea };
}

// Returns world-space outer edge midpoint of a segment body
function getOuterMidWorld(body) {
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  const lx = body.userData._outerMidX;
  const ly = body.userData._outerMidY;
  return {
    x: body.position.x + lx * cos - ly * sin,
    y: body.position.y + lx * sin + ly * cos,
  };
}

// Apply gas pressure force to all soft bodies each step
function applyPressure(softBodies, dt) {
  for (const sb of softBodies) {
    // Gather outer vertex positions (outer-left of each segment in world space)
    const outerVerts = sb.segments.map((body) => {
      const cos = Math.cos(body.rotation);
      const sin = Math.sin(body.rotation);
      const lx = body.userData._olx;
      const ly = body.userData._oly;
      return {
        x: body.position.x + lx * cos - ly * sin,
        y: body.position.y + lx * sin + ly * cos,
      };
    });

    const currentArea = polygonalArea(outerVerts);
    const pressure = dt * (sb.restArea - currentArea);

    for (const body of sb.segments) {
      const mid = getOuterMidWorld(body);
      // Rotate the stored rest-pose normal by current body rotation
      const cos = Math.cos(body.rotation);
      const sin = Math.sin(body.rotation);
      const nx = body.userData._edgeNormalX * cos - body.userData._edgeNormalY * sin;
      const ny = body.userData._edgeNormalX * sin + body.userData._edgeNormalY * cos;

      body.applyImpulse(
        new Vec2(nx * pressure, ny * pressure),
        new Vec2(mid.x, mid.y),
        false, // depositEnergy=false so sleeping bodies wake up if needed
      );
    }
  }
}

// Convex polygon templates (local, centred at 0,0)
function boxVerts(w, h) {
  const hw = w / 2, hh = h / 2;
  // Counter-clockwise
  return [
    { x: -hw, y: -hh },
    { x:  hw, y: -hh },
    { x:  hw, y:  hh },
    { x: -hw, y:  hh },
  ];
}

function regularVerts(rx, ry, sides) {
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides - Math.PI / 2;
    verts.push({ x: rx * Math.cos(a), y: ry * Math.sin(a) });
  }
  return verts;
}

export default {
  id: "soft-body",
  label: "Soft Body",
  featured: true,
  featuredOrder: 2,
  tags: ["PivotJoint", "Pressure", "Soft Body"],
  desc: "Pneumatic soft bodies: a trapezoidal shell with stiff outer skin, elastic inner skin, and gas-pressure volume conservation.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 400);
    addWalls(space, W, H);

    _softBodies.length = 0;

    // Square soft body
    _softBodies.push(
      createSoftBody(space, W / 2 - 80, 120, boxVerts(80, 80), 10, 15, 0),
    );
    // Pentagon soft body
    _softBodies.push(
      createSoftBody(space, W / 2 + 90, 100, regularVerts(40, 40, 5), 10, 15, 2),
    );
  },

  step(space, W, H) {
    applyPressure(_softBodies, 1 / 60);
  },

  click(x, y, space, W, H) {
    const shapes = [
      boxVerts(70, 70),
      regularVerts(38, 38, 6),
      regularVerts(35, 35, 8),
    ];
    const idx = Math.floor(Math.random() * shapes.length);
    const colorIdx = Math.floor(Math.random() * 6);
    _softBodies.push(
      createSoftBody(space, x, y, shapes[idx], 10, 15, colorIdx),
    );
  },
};
