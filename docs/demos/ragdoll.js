import { Body, BodyType, Vec2, Circle, Polygon, PivotJoint, AngleJoint } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "ragdoll",
  label: "Ragdoll",
  featured: true,
  featuredOrder: 7,
  desc: 'Ragdoll figures built from <code>PivotJoint</code> and <code>AngleJoint</code> constraints. <b>Click</b> to spawn a new ragdoll at the cursor.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);
    spawnRagdoll(space, W / 2, 120, 0);
    spawnRagdoll(space, W / 2 - 150, 80, 2);
    spawnRagdoll(space, W / 2 + 150, 60, 4);
  },

  click(x, y, space, W, H) {
    spawnRagdoll(space, x, y, Math.floor(Math.random() * 6));
  },

  code2d: `// Ragdoll using PivotJoint + AngleJoint constraints
const space = new Space(new Vec2(0, 600));

addWalls();

function spawnRagdoll(x, y) {
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  torso.space = space;

  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  head.space = space;

  new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12)).space = space;
  const neckAngle = new AngleJoint(torso, head, -0.4, 0.4);
  neckAngle.stiff = false; neckAngle.frequency = 8; neckAngle.damping = 0.6;
  neckAngle.space = space;

  const arm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  arm.shapes.add(new Polygon(Polygon.box(28, 8)));
  arm.space = space;
  new PivotJoint(torso, arm, new Vec2(-12, -20), new Vec2(14, 0)).space = space;
  new AngleJoint(torso, arm, -Math.PI * 0.75, Math.PI * 0.75).space = space;

  const leg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
  leg.shapes.add(new Polygon(Polygon.box(10, 32)));
  leg.space = space;
  new PivotJoint(torso, leg, new Vec2(-8, 24), new Vec2(0, -16)).space = space;
  new AngleJoint(torso, leg, -0.6, 0.6).space = space;
}

spawnRagdoll(W / 2, 120);

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

// Physics
const space = new Space(new Vec2(0, 600));
addWalls();

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

function spawnRagdoll(x, y, color) {
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  torso.space = space;
  addMesh(torso, color);

  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  head.space = space;
  addMesh(head, color);

  new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12)).space = space;
  const na = new AngleJoint(torso, head, -0.4, 0.4);
  na.stiff = false; na.frequency = 8; na.damping = 0.6;
  na.space = space;

  const arm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  arm.shapes.add(new Polygon(Polygon.box(28, 8)));
  arm.space = space;
  addMesh(arm, color);
  new PivotJoint(torso, arm, new Vec2(-12, -20), new Vec2(14, 0)).space = space;
  new AngleJoint(torso, arm, -Math.PI * 0.75, Math.PI * 0.75).space = space;

  const leg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
  leg.shapes.add(new Polygon(Polygon.box(10, 32)));
  leg.space = space;
  addMesh(leg, color);
  new PivotJoint(torso, leg, new Vec2(-8, 24), new Vec2(0, -16)).space = space;
  new AngleJoint(torso, leg, -0.6, 0.6).space = space;
}

spawnRagdoll(W / 2, 120, 0x58a6ff);
spawnRagdoll(W / 2 - 150, 80, 0x3fb950);
spawnRagdoll(W / 2 + 150, 60, 0xf85149);

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

function spawnRagdoll(space, x, y, colorBase) {
  // Torso
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  try { torso.userData._colorIdx = colorBase; } catch(_) {}
  torso.space = space;

  // Head
  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  try { head.userData._colorIdx = colorBase; } catch(_) {}
  head.space = space;

  const neckPivot = new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12));
  neckPivot.space = space;
  const neckAngle = new AngleJoint(torso, head, -0.4, 0.4);
  neckAngle.stiff = false;
  neckAngle.frequency = 8;
  neckAngle.damping = 0.6;
  neckAngle.space = space;

  // Upper arms
  const armLen = 28, armW = 8;
  const lUpperArm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  lUpperArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { lUpperArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  lUpperArm.space = space;

  const rUpperArm = new Body(BodyType.DYNAMIC, new Vec2(x + 26, y - 14));
  rUpperArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { rUpperArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  rUpperArm.space = space;

  const lShoulderP = new PivotJoint(torso, lUpperArm, new Vec2(-12, -20), new Vec2(14, 0));
  lShoulderP.space = space;
  const lShoulderA = new AngleJoint(torso, lUpperArm, -Math.PI * 0.75, Math.PI * 0.75);
  lShoulderA.space = space;

  const rShoulderP = new PivotJoint(torso, rUpperArm, new Vec2(12, -20), new Vec2(-14, 0));
  rShoulderP.space = space;
  const rShoulderA = new AngleJoint(torso, rUpperArm, -Math.PI * 0.75, Math.PI * 0.75);
  rShoulderA.space = space;

  // Lower arms
  const lLowerArm = new Body(BodyType.DYNAMIC, new Vec2(x - 54, y - 14));
  lLowerArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { lLowerArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  lLowerArm.space = space;

  const rLowerArm = new Body(BodyType.DYNAMIC, new Vec2(x + 54, y - 14));
  rLowerArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { rLowerArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  rLowerArm.space = space;

  const lElbowP = new PivotJoint(lUpperArm, lLowerArm, new Vec2(-14, 0), new Vec2(14, 0));
  lElbowP.space = space;
  const lElbowA = new AngleJoint(lUpperArm, lLowerArm, -Math.PI * 0.6, 0.1);
  lElbowA.space = space;

  const rElbowP = new PivotJoint(rUpperArm, rLowerArm, new Vec2(14, 0), new Vec2(-14, 0));
  rElbowP.space = space;
  const rElbowA = new AngleJoint(rUpperArm, rLowerArm, -0.1, Math.PI * 0.6);
  rElbowA.space = space;

  // Upper legs
  const legLen = 32, legW = 10;
  const lUpperLeg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
  lUpperLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { lUpperLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  lUpperLeg.space = space;

  const rUpperLeg = new Body(BodyType.DYNAMIC, new Vec2(x + 8, y + 40));
  rUpperLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { rUpperLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  rUpperLeg.space = space;

  const lHipP = new PivotJoint(torso, lUpperLeg, new Vec2(-8, 24), new Vec2(0, -16));
  lHipP.space = space;
  const lHipA = new AngleJoint(torso, lUpperLeg, -0.6, 0.6);
  lHipA.space = space;

  const rHipP = new PivotJoint(torso, rUpperLeg, new Vec2(8, 24), new Vec2(0, -16));
  rHipP.space = space;
  const rHipA = new AngleJoint(torso, rUpperLeg, -0.6, 0.6);
  rHipA.space = space;

  // Lower legs
  const lLowerLeg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 72));
  lLowerLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { lLowerLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  lLowerLeg.space = space;

  const rLowerLeg = new Body(BodyType.DYNAMIC, new Vec2(x + 8, y + 72));
  rLowerLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { rLowerLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  rLowerLeg.space = space;

  const lKneeP = new PivotJoint(lUpperLeg, lLowerLeg, new Vec2(0, 16), new Vec2(0, -16));
  lKneeP.space = space;
  const lKneeA = new AngleJoint(lUpperLeg, lLowerLeg, -0.1, Math.PI * 0.5);
  lKneeA.space = space;

  const rKneeP = new PivotJoint(rUpperLeg, rLowerLeg, new Vec2(0, 16), new Vec2(0, -16));
  rKneeP.space = space;
  const rKneeA = new AngleJoint(rUpperLeg, rLowerLeg, -0.1, Math.PI * 0.5);
  rKneeA.space = space;
}
