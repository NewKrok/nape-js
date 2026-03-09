import { Body, BodyType, Vec2, Circle, Polygon, PivotJoint, DistanceJoint, MotorJoint, InteractionFilter, Material } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "strandbeast",
  label: "Strand Beast",
  featured: true,
  featuredOrder: 8,
  desc: 'A Theo Jansen-style walking mechanism with 6 legs (3 phase-offset pairs) driven by a <code>MotorJoint</code> crank. Reverses direction at the walls. <b>Click</b> to drop a ball.',

  _motor: null,
  _chassis: null,
  _motorSpeed: 2.0,
  _W: 0,
  _t: 20,

  setup(space, W, H) {
    this._W = W;
    this._motorSpeed = 2.0;
    space.gravity = new Vec2(0, 400);

    addWalls(space, W, H);
    const t = 20;

    // Theo Jansen mechanism geometry (from Box2D testbed)
    const S = Math.min(W, H) * 0.05 * 0.6; // pixel scale (60% of original)
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

    // Start ~15% from left edge
    const ox = W * 0.15;
    const oy = (H - t) - P1Y * S;

    // Random obstacles scattered on the floor (40% smaller than before)
    const obstacleCount = 5;
    const obstacleMinX = ox + CHASSIS_HW * 4 * S;
    const obstacleMaxX = W - t - 40;
    for (let i = 0; i < obstacleCount; i++) {
      const rx = obstacleMinX + (obstacleMaxX - obstacleMinX) * (i + 0.5 + (Math.random() - 0.5) * 0.7) / obstacleCount;
      const rh = (15 + Math.random() * 30) * 0.6;
      const rw = (10 + Math.random() * 20) * 0.6;
      const obs = new Body(BodyType.DYNAMIC, new Vec2(rx, H - t - rh / 2));
      obs.shapes.add(new Polygon(Polygon.box(rw, rh)));
      obs.space = space;
    }

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
    const motor = new MotorJoint(chassis, wheel, this._motorSpeed, 1.0);
    motor.space = space;
    this._motor = motor;
    this._chassis = chassis;

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

      // Body 1 (lower triangle with foot):
      // Place body at centroid of P1/P2/P3 so anchor offsets are correct.
      const c1x = (p1x + p2x + p3x) / 3 * S;
      const c1y = (p1y + p2y + p3y) / 3 * S;
      const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox + c1x, oy + c1y));
      const v1 = side > 0
        ? [new Vec2(p1x*S - c1x, p1y*S - c1y), new Vec2(p3x*S - c1x, p3y*S - c1y), new Vec2(p2x*S - c1x, p2y*S - c1y)]
        : [new Vec2(p1x*S - c1x, p1y*S - c1y), new Vec2(p2x*S - c1x, p2y*S - c1y), new Vec2(p3x*S - c1x, p3y*S - c1y)];
      body1.shapes.add(new Polygon(v1, undefined, mf));
      try { body1.userData._colorIdx = 1; } catch(_) {}
      body1.space = space;

      // Body 2 (upper triangle) at P4 world position.
      const lp5x = (p5x - p4x) * S, lp5y = (p5y - p4y) * S;
      const lp6x = (p6x - p4x) * S, lp6y = (p6y - p4y) * S;
      const c2x = (lp5x + lp6x) / 3;
      const c2y = (lp5y + lp6y) / 3;
      const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox + p4x * S + c2x, oy + p4y * S + c2y));
      const v2 = side > 0
        ? [new Vec2(-c2x, -c2y), new Vec2(lp6x - c2x, lp6y - c2y), new Vec2(lp5x - c2x, lp5y - c2y)]
        : [new Vec2(-c2x, -c2y), new Vec2(lp5x - c2x, lp5y - c2y), new Vec2(lp6x - c2x, lp6y - c2y)];
      body2.shapes.add(new Polygon(v2, undefined, mf));
      try { body2.userData._colorIdx = 2; } catch(_) {}
      body2.space = space;

      // 4 distance joints + 1 pivot joint form the Jansen linkage.
      // Anchor coords are body-local (relative to centroid).
      makeDJ(body1, body2, p2x*S - c1x, p2y*S - c1y, lp5x - c2x, lp5y - c2y, D12);
      makeDJ(body1, body2, p3x*S - c1x, p3y*S - c1y, -c2x, -c2y, D34);
      makeDJ(body1, wheel, p3x*S - c1x, p3y*S - c1y, wax, way, D3W);
      makeDJ(body2, wheel, lp6x - c2x, lp6y - c2y, wax, way, D6W);
      // body2↔chassis revolute joint at P4 (ground pivot)
      new PivotJoint(body2, chassis, new Vec2(-c2x, -c2y), new Vec2(p4x*S, (p4y + PIVOT_Y) * S)).space = space;
    }

    // 3 pairs of legs with 120° phase offsets
    const phases = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
    for (const phase of phases) {
      createLeg(1, phase);   // right
      createLeg(-1, phase);  // left
    }
  },

  step(_space, W, _H) {
    if (!this._motor || !this._chassis) return;
    const x = this._chassis.position.x;
    const margin = 220;
    const speed = this._motorSpeed;
    if (x < margin && speed < 0) {
      this._motorSpeed = Math.abs(speed);
      this._motor.rate = this._motorSpeed;
    } else if (x > W - margin && speed > 0) {
      this._motorSpeed = -Math.abs(speed);
      this._motor.rate = this._motorSpeed;
    }
  },

  click(x, y, space) {
    const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    ball.shapes.add(new Circle(8, undefined, new Material(0.3, 0.2, 0.8, 2)));
    try { ball.userData._colorIdx = 3; } catch(_) {}
    ball.space = space;
  },

  code2d: `// Strand Beast — Theo Jansen walking mechanism (6 legs)
const space = new Space(new Vec2(0, 400));
addWalls();
const t = 20;

const S = Math.min(W, H) * 0.05 * 0.6;
const PIVOT_Y = 0.8, WHEEL_R = 1.6, CRANK_R = PIVOT_Y * S;
const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
const P = {
  p1x: 5.4, p1y: 6.1, p2x: 7.2, p2y: 1.2,
  p3x: 4.3, p3y: 1.9, p4x: 3.1, p4y: -0.8,
  p5x: 6.0, p5y: -1.5, p6x: 2.5, p6y: -3.7,
};

const ox = W * 0.15, oy = (H - t) - P.p1y * S;
const mf = new InteractionFilter(2, 1);

// Random obstacles (60% of original size)
const obstacleMinX = ox + CHASSIS_HW*4*S, obstacleMaxX = W - t - 40;
for (let i = 0; i < 5; i++) {
  const rx = obstacleMinX + (obstacleMaxX - obstacleMinX) * (i + 0.5 + (Math.random()-0.5)*0.7) / 5;
  const rh = (15 + Math.random()*30)*0.6, rw = (10 + Math.random()*20)*0.6;
  const obs = new Body(BodyType.DYNAMIC, new Vec2(rx, H - t - rh/2));
  obs.shapes.add(new Polygon(Polygon.box(rw, rh)));
  obs.space = space;
}

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
  const c1x=(p1x+p2x+p3x)/3*S, c1y=(P.p1y+P.p2y+P.p3y)/3*S;
  const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox+c1x, oy+c1y));
  const v1 = side > 0
    ? [new Vec2(p1x*S-c1x,P.p1y*S-c1y), new Vec2(p3x*S-c1x,P.p3y*S-c1y), new Vec2(p2x*S-c1x,P.p2y*S-c1y)]
    : [new Vec2(p1x*S-c1x,P.p1y*S-c1y), new Vec2(p2x*S-c1x,P.p2y*S-c1y), new Vec2(p3x*S-c1x,P.p3y*S-c1y)];
  body1.shapes.add(new Polygon(v1, undefined, mf));
  body1.space = space;
  const lp5x=(p5x-p4x)*S, lp5y=(P.p5y-P.p4y)*S;
  const lp6x=(p6x-p4x)*S, lp6y=(P.p6y-P.p4y)*S;
  const c2x=(lp5x+lp6x)/3, c2y=(lp5y+lp6y)/3;
  const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox+p4x*S+c2x, oy+P.p4y*S+c2y));
  const v2 = side > 0
    ? [new Vec2(-c2x,-c2y), new Vec2(lp6x-c2x,lp6y-c2y), new Vec2(lp5x-c2x,lp5y-c2y)]
    : [new Vec2(-c2x,-c2y), new Vec2(lp5x-c2x,lp5y-c2y), new Vec2(lp6x-c2x,lp6y-c2y)];
  body2.shapes.add(new Polygon(v2, undefined, mf));
  body2.space = space;
  makeDJ(body1, body2, p2x*S-c1x, P.p2y*S-c1y, lp5x-c2x, lp5y-c2y, D12);
  makeDJ(body1, body2, p3x*S-c1x, P.p3y*S-c1y, -c2x, -c2y, D34);
  makeDJ(body1, wheel, p3x*S-c1x, P.p3y*S-c1y, wax, way, D3W);
  makeDJ(body2, wheel, lp6x-c2x, lp6y-c2y, wax, way, D6W);
  new PivotJoint(body2, chassis, new Vec2(-c2x,-c2y), new Vec2(p4x*S,(P.p4y+PIVOT_Y)*S)).space = space;
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
const t = 20;
[
  new Body(BodyType.STATIC, new Vec2(W/2, H-t/2)),
  new Body(BodyType.STATIC, new Vec2(t/2, H/2)),
  new Body(BodyType.STATIC, new Vec2(W-t/2, H/2)),
].forEach((b, i) => {
  b.shapes.add(new Polygon(i === 0 ? Polygon.box(W, t) : Polygon.box(t, H)));
  b.space = space;
  addMesh(b, 0x30363d);
});

const S = Math.min(W, H) * 0.05 * 0.6;
const PIVOT_Y = 0.8, WHEEL_R = 1.6, CRANK_R = PIVOT_Y * S;
const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
const P = {
  p1x: 5.4, p1y: 6.1, p2x: 7.2, p2y: 1.2,
  p3x: 4.3, p3y: 1.9, p4x: 3.1, p4y: -0.8,
  p5x: 6.0, p5y: -1.5, p6x: 2.5, p6y: -3.7,
};

const ox = W * 0.15, oy = (H - t) - P.p1y * S;
const mf = new InteractionFilter(2, 1);
const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149];
const meshes = [];

// Random obstacles (60% of original size)
const obstacleMinX = ox + CHASSIS_HW*4*S, obstacleMaxX = W - t - 40;
for (let i = 0; i < 5; i++) {
  const rx = obstacleMinX + (obstacleMaxX - obstacleMinX) * (i + 0.5 + (Math.random()-0.5)*0.7) / 5;
  const rh = (15 + Math.random()*30)*0.6, rw = (10 + Math.random()*20)*0.6;
  const obs = new Body(BodyType.STATIC, new Vec2(rx, H - t - rh/2));
  obs.shapes.add(new Polygon(Polygon.box(rw, rh)));
  obs.space = space;
  addMesh(obs, 0x8b949e);
}

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
    geom.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1));
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
  const c1x=(p1x+p2x+p3x)/3*S, c1y=(P.p1y+P.p2y+P.p3y)/3*S;
  const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox+c1x, oy+c1y));
  const v1 = side > 0
    ? [new Vec2(p1x*S-c1x,P.p1y*S-c1y), new Vec2(p3x*S-c1x,P.p3y*S-c1y), new Vec2(p2x*S-c1x,P.p2y*S-c1y)]
    : [new Vec2(p1x*S-c1x,P.p1y*S-c1y), new Vec2(p2x*S-c1x,P.p2y*S-c1y), new Vec2(p3x*S-c1x,P.p3y*S-c1y)];
  body1.shapes.add(new Polygon(v1, undefined, mf));
  body1.space = space;
  addMesh(body1, COLORS[1]);
  const lp5x=(p5x-p4x)*S, lp5y=(P.p5y-P.p4y)*S;
  const lp6x=(p6x-p4x)*S, lp6y=(P.p6y-P.p4y)*S;
  const c2x=(lp5x+lp6x)/3, c2y=(lp5y+lp6y)/3;
  const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox+p4x*S+c2x, oy+P.p4y*S+c2y));
  const v2 = side > 0
    ? [new Vec2(-c2x,-c2y), new Vec2(lp6x-c2x,lp6y-c2y), new Vec2(lp5x-c2x,lp5y-c2y)]
    : [new Vec2(-c2x,-c2y), new Vec2(lp5x-c2x,lp5y-c2y), new Vec2(lp6x-c2x,lp6y-c2y)];
  body2.shapes.add(new Polygon(v2, undefined, mf));
  body2.space = space;
  addMesh(body2, COLORS[2]);
  makeDJ(body1, body2, p2x*S-c1x, P.p2y*S-c1y, lp5x-c2x, lp5y-c2y, D12);
  makeDJ(body1, body2, p3x*S-c1x, P.p3y*S-c1y, -c2x, -c2y, D34);
  makeDJ(body1, wheel, p3x*S-c1x, P.p3y*S-c1y, wax, way, D3W);
  makeDJ(body2, wheel, lp6x-c2x, lp6y-c2y, wax, way, D6W);
  new PivotJoint(body2, chassis, new Vec2(-c2x,-c2y), new Vec2(p4x*S,(P.p4y+PIVOT_Y)*S)).space = space;
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
