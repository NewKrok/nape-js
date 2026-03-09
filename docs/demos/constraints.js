import { Body, BodyType, Vec2, Circle, Polygon, Material, PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint } from "../nape-js.esm.js";
import { addWalls, spawnRandomShape } from "../demo-runner.js";

export default {
  id: "constraints",
  label: "Constraints Showcase",
  featured: true,
  featuredOrder: 4,
  desc: 'All built-in constraint types in one scene: PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint. <b>Click</b> to apply impulse.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 300);
    addWalls(space, W, H);

    // --- PivotJoint (pinned rotating bar) ---
    const pivotAnchor = new Body(BodyType.STATIC, new Vec2(120, 80));
    pivotAnchor.shapes.add(new Circle(5));
    pivotAnchor.space = space;

    const bar1 = new Body(BodyType.DYNAMIC, new Vec2(120, 80));
    bar1.shapes.add(new Polygon(Polygon.box(80, 10)));
    try { bar1.userData._colorIdx = 0; } catch(_) {}
    bar1.space = space;

    const pj = new PivotJoint(pivotAnchor, bar1, new Vec2(0, 0), new Vec2(0, 0));
    pj.space = space;

    // --- DistanceJoint (spring) ---
    const dAnchor = new Body(BodyType.STATIC, new Vec2(300, 60));
    dAnchor.shapes.add(new Circle(5));
    dAnchor.space = space;

    const dBall = new Body(BodyType.DYNAMIC, new Vec2(300, 180));
    dBall.shapes.add(new Circle(15));
    try { dBall.userData._colorIdx = 1; } catch(_) {}
    dBall.space = space;

    const dj = new DistanceJoint(dAnchor, dBall, new Vec2(0, 0), new Vec2(0, 0), 80, 120);
    dj.stiff = false;
    dj.frequency = 2;
    dj.damping = 0.3;
    dj.space = space;

    // --- AngleJoint ---
    const aAnchor = new Body(BodyType.STATIC, new Vec2(480, 80));
    aAnchor.shapes.add(new Circle(5));
    aAnchor.space = space;

    const aBar = new Body(BodyType.DYNAMIC, new Vec2(480, 80));
    aBar.shapes.add(new Polygon(Polygon.box(60, 10)));
    try { aBar.userData._colorIdx = 2; } catch(_) {}
    aBar.space = space;

    const apj = new PivotJoint(aAnchor, aBar, new Vec2(0, 0), new Vec2(0, 0));
    apj.space = space;

    const aj = new AngleJoint(aAnchor, aBar, -Math.PI / 4, Math.PI / 4);
    aj.stiff = false;
    aj.frequency = 3;
    aj.damping = 0.5;
    aj.space = space;

    // --- WeldJoint (two bodies glued) ---
    const w1 = new Body(BodyType.DYNAMIC, new Vec2(640, 100));
    w1.shapes.add(new Polygon(Polygon.box(30, 30)));
    try { w1.userData._colorIdx = 4; } catch(_) {}
    w1.space = space;

    const w2 = new Body(BodyType.DYNAMIC, new Vec2(670, 100));
    w2.shapes.add(new Circle(15));
    try { w2.userData._colorIdx = 5; } catch(_) {}
    w2.space = space;

    const wj = new WeldJoint(w1, w2, new Vec2(15, 0), new Vec2(-15, 0));
    wj.space = space;

    // --- MotorJoint (spinning wheel) ---
    const mAnchor = new Body(BodyType.STATIC, new Vec2(800, 100));
    mAnchor.shapes.add(new Circle(5));
    mAnchor.space = space;

    const wheel = new Body(BodyType.DYNAMIC, new Vec2(800, 100));
    wheel.shapes.add(new Polygon(Polygon.regular(30, 30, 6)));
    try { wheel.userData._colorIdx = 3; } catch(_) {}
    wheel.space = space;

    const mpj = new PivotJoint(mAnchor, wheel, new Vec2(0, 0), new Vec2(0, 0));
    mpj.space = space;

    const mj = new MotorJoint(mAnchor, wheel, 3);
    mj.space = space;

    // --- LineJoint (slider) ---
    const lAnchor = new Body(BodyType.STATIC, new Vec2(120, 300));
    lAnchor.shapes.add(new Circle(5));
    lAnchor.space = space;

    const slider = new Body(BodyType.DYNAMIC, new Vec2(200, 300));
    slider.shapes.add(new Polygon(Polygon.box(30, 20)));
    try { slider.userData._colorIdx = 1; } catch(_) {}
    slider.space = space;

    const lj = new LineJoint(lAnchor, slider, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -80, 80);
    lj.space = space;

    // Some loose shapes to interact with
    for (let i = 0; i < 30; i++) {
      spawnRandomShape(space, 100 + Math.random() * 700, 200 + Math.random() * 200);
    }
  },

  click(x, y, space, W, H) {
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const force = 600 * (1 - dist / 150);
        body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
      }
    }
  },

  code2d: `// Constraints showcase — all built-in joint types
const space = new Space(new Vec2(0, 300));

// --- PivotJoint: pin two bodies at a shared point ---
const pivotAnchor = new Body(BodyType.STATIC, new Vec2(120, 80));
pivotAnchor.shapes.add(new Circle(5));
pivotAnchor.space = space;

const bar = new Body(BodyType.DYNAMIC, new Vec2(120, 80));
bar.shapes.add(new Polygon(Polygon.box(80, 10)));
bar.space = space;

const pivot = new PivotJoint(
  pivotAnchor, bar, new Vec2(0, 0), new Vec2(0, 0),
);
pivot.space = space;

// --- DistanceJoint: spring between two bodies ---
const dAnchor = new Body(BodyType.STATIC, new Vec2(300, 60));
dAnchor.shapes.add(new Circle(5));
dAnchor.space = space;

const ball = new Body(BodyType.DYNAMIC, new Vec2(300, 180));
ball.shapes.add(new Circle(15));
ball.space = space;

const spring = new DistanceJoint(
  dAnchor, ball, new Vec2(0, 0), new Vec2(0, 0), 80, 120,
);
spring.stiff = false;
spring.frequency = 2;
spring.damping = 0.3;
spring.space = space;

// --- AngleJoint: limit rotation range ---
const aj = new AngleJoint(pivotAnchor, bar, -Math.PI / 4, Math.PI / 4);
aj.space = space;

// --- MotorJoint: constant angular velocity ---
const mAnchor = new Body(BodyType.STATIC, new Vec2(500, 100));
mAnchor.shapes.add(new Circle(5));
mAnchor.space = space;

const wheel = new Body(BodyType.DYNAMIC, new Vec2(500, 100));
wheel.shapes.add(new Polygon(Polygon.regular(30, 30, 6)));
wheel.space = space;

new PivotJoint(mAnchor, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
const motor = new MotorJoint(mAnchor, wheel, 3);
motor.space = space;

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

const space = new Space(new Vec2(0, 300));
const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
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

// PivotJoint: rotating bar
const pivotAnchor = new Body(BodyType.STATIC, new Vec2(120, 80));
pivotAnchor.shapes.add(new Circle(5));
pivotAnchor.space = space;
const bar = new Body(BodyType.DYNAMIC, new Vec2(120, 80));
bar.shapes.add(new Polygon(Polygon.box(80, 10)));
bar.space = space;
new PivotJoint(pivotAnchor, bar, new Vec2(0, 0), new Vec2(0, 0)).space = space;
addMesh(pivotAnchor, 0x455a64);
addMesh(bar, COLORS[0]);

// DistanceJoint: spring
const dAnchor = new Body(BodyType.STATIC, new Vec2(300, 60));
dAnchor.shapes.add(new Circle(5));
dAnchor.space = space;
const ball = new Body(BodyType.DYNAMIC, new Vec2(300, 180));
ball.shapes.add(new Circle(15));
ball.space = space;
const spring = new DistanceJoint(dAnchor, ball, new Vec2(0, 0), new Vec2(0, 0), 80, 120);
spring.stiff = false; spring.frequency = 2; spring.damping = 0.3;
spring.space = space;
addMesh(dAnchor, 0x455a64);
addMesh(ball, COLORS[1]);

// MotorJoint: spinning wheel
const mAnchor = new Body(BodyType.STATIC, new Vec2(500, 100));
mAnchor.shapes.add(new Circle(5));
mAnchor.space = space;
const wheel = new Body(BodyType.DYNAMIC, new Vec2(500, 100));
wheel.shapes.add(new Polygon(Polygon.regular(30, 30, 6)));
wheel.space = space;
new PivotJoint(mAnchor, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
new MotorJoint(mAnchor, wheel, 3).space = space;
addMesh(mAnchor, 0x455a64);
addMesh(wheel, COLORS[3]);

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
