import { Body, BodyType, Vec2, Circle, Polygon, PivotJoint, DistanceJoint, MotorJoint, InteractionFilter } from "../nape-js.esm.js";

export default {
  id: "strandbeast",
  label: "Strand Beast",
  featured: true,
  featuredOrder: 8,
  desc: 'A Theo Jansen-style walking mechanism with 6 legs (3 phase-offset pairs) driven by a <code>MotorJoint</code> crank. <b>Click</b> to apply impulse.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 400);

    // Floor only
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
    floor.space = space;

    // Theo Jansen mechanism geometry (from Box2D testbed)
    const S = Math.min(W, H) * 0.05; // pixel scale
    const PIVOT_Y = 0.8;
    const WHEEL_R = 1.6;
    const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
    const CRANK_R = PIVOT_Y * S; // crank pin radius from wheel center

    // Leg geometry points (Box2D Y-up coords negated for screen Y-down)
    const P1X = 5.4, P1Y = 6.1;
    const P2X = 7.2, P2Y = 1.2;
    const P3X = 4.3, P3Y = 1.9;
    const P4X = 3.1, P4Y = -0.8;
    const P5X = 6.0, P5Y = -1.5;
    const P6X = 2.5, P6Y = -3.7;

    // Position mechanism so feet (P1, lowest point) reach the floor
    const ox = W / 2;
    const oy = (H - 20) - P1Y * S;

    // Filter: mechanism parts don't collide with each other (group 2, only collide with group 1)
    const mf = new InteractionFilter(2, 1);

    // Chassis
    const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
    chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW * 2 * S, CHASSIS_HH * 2 * S), undefined, mf));
    try { chassis.userData._colorIdx = 0; } catch(_) {}
    chassis.space = space;

    // Wheel (crank)
    const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
    wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
    try { wheel.userData._colorIdx = 3; } catch(_) {}
    wheel.space = space;

    // Motor drives the wheel relative to chassis
    new PivotJoint(chassis, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
    new MotorJoint(chassis, wheel, 2.0).space = space;

    // Pre-computed rest lengths (invariant across all legs/phases)
    const D12 = Math.sqrt((P2X - P5X) * (P2X - P5X) + (P2Y - P5Y) * (P2Y - P5Y)) * S;
    const D34 = Math.sqrt((P3X - P4X) * (P3X - P4X) + (P3Y - P4Y) * (P3Y - P4Y)) * S;
    const D3W = Math.sqrt(P3X * P3X + P3Y * P3Y) * S;
    const D6W = Math.sqrt(P6X * P6X + P6Y * P6Y) * S;

    function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
      const dj = new DistanceJoint(b1, b2, new Vec2(a1x, a1y), new Vec2(a2x, a2y), d, d);
      dj.stiff = true;
      dj.space = space;
    }

    function createLeg(side, phase) {
      // side = +1 (right) or -1 (left), phase = crank angle offset
      const p1x = P1X * side, p1y = P1Y;
      const p2x = P2X * side, p2y = P2Y;
      const p3x = P3X * side, p3y = P3Y;
      const p4x = P4X * side, p4y = P4Y;
      const p5x = P5X * side, p5y = P5Y;
      const p6x = P6X * side, p6y = P6Y;

      // Crank pin on wheel (rotated by phase)
      const wax = CRANK_R * Math.sin(phase);
      const way = CRANK_R * Math.cos(phase);

      // Body 1 (lower triangle with foot) at mechanism origin
      const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
      const v1 = side > 0
        ? [new Vec2(p1x*S, p1y*S), new Vec2(p3x*S, p3y*S), new Vec2(p2x*S, p2y*S)]
        : [new Vec2(p1x*S, p1y*S), new Vec2(p2x*S, p2y*S), new Vec2(p3x*S, p3y*S)];
      body1.shapes.add(new Polygon(v1, undefined, mf));
      try { body1.userData._colorIdx = 1; } catch(_) {}
      body1.space = space;

      // Body 2 (upper triangle) at p4
      const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox + p4x * S, oy + p4y * S));
      const lp5x = (p5x - p4x) * S, lp5y = (p5y - p4y) * S;
      const lp6x = (p6x - p4x) * S, lp6y = (p6y - p4y) * S;
      const v2 = side > 0
        ? [new Vec2(0, 0), new Vec2(lp6x, lp6y), new Vec2(lp5x, lp5y)]
        : [new Vec2(0, 0), new Vec2(lp5x, lp5y), new Vec2(lp6x, lp6y)];
      body2.shapes.add(new Polygon(v2, undefined, mf));
      try { body2.userData._colorIdx = 2; } catch(_) {}
      body2.space = space;

      // 4 distance joints + 1 pivot joint form the Jansen linkage
      makeDJ(body1, body2, p2x*S, p2y*S, lp5x, lp5y, D12);
      makeDJ(body1, body2, p3x*S, p3y*S, 0, 0, D34);
      makeDJ(body1, wheel, p3x*S, p3y*S, wax, way, D3W);
      makeDJ(body2, wheel, lp6x, lp6y, wax, way, D6W);
      // body2↔chassis revolute joint at P4 (ground pivot)
      new PivotJoint(body2, chassis, new Vec2(0, 0), new Vec2(p4x*S, (p4y + PIVOT_Y) * S)).space = space;
    }

    // 3 pairs of legs with 120° phase offsets
    const phases = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
    for (const phase of phases) {
      createLeg(1, phase);   // right
      createLeg(-1, phase);  // left
    }
  },

  click(x, y, space, W, H) {
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 150) {
        const force = 800 * (1 - d / 150);
        body.applyImpulse(new Vec2(dx / d * force, dy / d * force));
      }
    }
  },

  code2d: `// Strand Beast — Theo Jansen walking mechanism (6 legs)
const space = new Space(new Vec2(0, 400));
const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
floor.space = space;

const S = Math.min(W, H) * 0.05;
const PIVOT_Y = 0.8, WHEEL_R = 1.6, CRANK_R = PIVOT_Y * S;
const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
const P = {
  p1x: 5.4, p1y: 6.1, p2x: 7.2, p2y: 1.2,
  p3x: 4.3, p3y: 1.9, p4x: 3.1, p4y: -0.8,
  p5x: 6.0, p5y: -1.5, p6x: 2.5, p6y: -3.7,
};

const ox = W / 2, oy = (H - 20) - P.p1y * S;
const mf = new InteractionFilter(2, 1);

const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW*2*S, CHASSIS_HH*2*S), undefined, mf));
chassis.space = space;
const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
wheel.space = space;
new PivotJoint(chassis, wheel, new Vec2(0,0), new Vec2(0,0)).space = space;
new MotorJoint(chassis, wheel, 2.0).space = space;

const D12 = Math.sqrt((P.p2x-P.p5x)**2+(P.p2y-P.p5y)**2)*S;
const D34 = Math.sqrt((P.p3x-P.p4x)**2+(P.p3y-P.p4y)**2)*S;
const D3W = Math.sqrt(P.p3x**2+P.p3y**2)*S;
const D6W = Math.sqrt(P.p6x**2+P.p6y**2)*S;

function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
  const dj = new DistanceJoint(b1, b2, new Vec2(a1x,a1y), new Vec2(a2x,a2y), d, d);
  dj.stiff = true;
  dj.space = space;
}
function createLeg(side, phase) {
  const p1x=P.p1x*side, p2x=P.p2x*side, p3x=P.p3x*side;
  const p4x=P.p4x*side, p5x=P.p5x*side, p6x=P.p6x*side;
  const wax = CRANK_R*Math.sin(phase), way = CRANK_R*Math.cos(phase);
  const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
  const v1 = side > 0
    ? [new Vec2(p1x*S,P.p1y*S), new Vec2(p3x*S,P.p3y*S), new Vec2(p2x*S,P.p2y*S)]
    : [new Vec2(p1x*S,P.p1y*S), new Vec2(p2x*S,P.p2y*S), new Vec2(p3x*S,P.p3y*S)];
  body1.shapes.add(new Polygon(v1, undefined, mf));
  body1.space = space;
  const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox+p4x*S, oy+P.p4y*S));
  const lp5x=(p5x-p4x)*S, lp5y=(P.p5y-P.p4y)*S;
  const lp6x=(p6x-p4x)*S, lp6y=(P.p6y-P.p4y)*S;
  const v2 = side > 0
    ? [new Vec2(0,0), new Vec2(lp6x,lp6y), new Vec2(lp5x,lp5y)]
    : [new Vec2(0,0), new Vec2(lp5x,lp5y), new Vec2(lp6x,lp6y)];
  body2.shapes.add(new Polygon(v2, undefined, mf));
  body2.space = space;
  makeDJ(body1, body2, p2x*S, P.p2y*S, lp5x, lp5y, D12);
  makeDJ(body1, body2, p3x*S, P.p3y*S, 0, 0, D34);
  makeDJ(body1, wheel, p3x*S, P.p3y*S, wax, way, D3W);
  makeDJ(body2, wheel, lp6x, lp6y, wax, way, D6W);
  new PivotJoint(body2, chassis, new Vec2(0,0), new Vec2(p4x*S,(P.p4y+PIVOT_Y)*S)).space = space;
}
[0, Math.PI*2/3, Math.PI*4/3].forEach(ph => { createLeg(1,ph); createLeg(-1,ph); });

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConstraintLines();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

  code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.8); rimLight.position.set(W*0.5, H*1.5, 200); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.0));

const space = new Space(new Vec2(0, 400));
const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
floor.space = space;

const S = Math.min(W, H) * 0.05;
const PIVOT_Y = 0.8, WHEEL_R = 1.6, CRANK_R = PIVOT_Y * S;
const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
const P = {
  p1x: 5.4, p1y: 6.1, p2x: 7.2, p2y: 1.2,
  p3x: 4.3, p3y: 1.9, p4x: 3.1, p4y: -0.8,
  p5x: 6.0, p5y: -1.5, p6x: 2.5, p6y: -3.7,
};

const ox = W / 2, oy = (H - 20) - P.p1y * S;
const mf = new InteractionFilter(2, 1);
const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149];
const meshes = [];

function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.length; i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW*2*S, CHASSIS_HH*2*S), undefined, mf));
chassis.space = space;
addMesh(chassis, COLORS[0]);
const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
wheel.space = space;
addMesh(wheel, COLORS[3]);
new PivotJoint(chassis, wheel, new Vec2(0,0), new Vec2(0,0)).space = space;
new MotorJoint(chassis, wheel, 2.0).space = space;

const D12 = Math.sqrt((P.p2x-P.p5x)**2+(P.p2y-P.p5y)**2)*S;
const D34 = Math.sqrt((P.p3x-P.p4x)**2+(P.p3y-P.p4y)**2)*S;
const D3W = Math.sqrt(P.p3x**2+P.p3y**2)*S;
const D6W = Math.sqrt(P.p6x**2+P.p6y**2)*S;

function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
  const dj = new DistanceJoint(b1, b2, new Vec2(a1x,a1y), new Vec2(a2x,a2y), d, d);
  dj.stiff = true;
  dj.space = space;
}
function createLeg(side, phase) {
  const p1x=P.p1x*side, p2x=P.p2x*side, p3x=P.p3x*side;
  const p4x=P.p4x*side, p5x=P.p5x*side, p6x=P.p6x*side;
  const wax = CRANK_R*Math.sin(phase), way = CRANK_R*Math.cos(phase);
  const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
  const v1 = side > 0
    ? [new Vec2(p1x*S,P.p1y*S), new Vec2(p3x*S,P.p3y*S), new Vec2(p2x*S,P.p2y*S)]
    : [new Vec2(p1x*S,P.p1y*S), new Vec2(p2x*S,P.p2y*S), new Vec2(p3x*S,P.p3y*S)];
  body1.shapes.add(new Polygon(v1, undefined, mf));
  body1.space = space;
  addMesh(body1, COLORS[1]);
  const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox+p4x*S, oy+P.p4y*S));
  const lp5x=(p5x-p4x)*S, lp5y=(P.p5y-P.p4y)*S;
  const lp6x=(p6x-p4x)*S, lp6y=(P.p6y-P.p4y)*S;
  const v2 = side > 0
    ? [new Vec2(0,0), new Vec2(lp6x,lp6y), new Vec2(lp5x,lp5y)]
    : [new Vec2(0,0), new Vec2(lp5x,lp5y), new Vec2(lp6x,lp6y)];
  body2.shapes.add(new Polygon(v2, undefined, mf));
  body2.space = space;
  addMesh(body2, COLORS[2]);
  makeDJ(body1, body2, p2x*S, P.p2y*S, lp5x, lp5y, D12);
  makeDJ(body1, body2, p3x*S, P.p3y*S, 0, 0, D34);
  makeDJ(body1, wheel, p3x*S, P.p3y*S, wax, way, D3W);
  makeDJ(body2, wheel, lp6x, lp6y, wax, way, D6W);
  new PivotJoint(body2, chassis, new Vec2(0,0), new Vec2(p4x*S,(P.p4y+PIVOT_Y)*S)).space = space;
}
[0, Math.PI*2/3, Math.PI*4/3].forEach(ph => { createLeg(1,ph); createLeg(-1,ph); });

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
};
