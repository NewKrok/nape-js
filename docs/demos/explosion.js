import { Body, BodyType, Vec2, Circle, Polygon } from "../nape-js.esm.js";
import { addWalls, spawnRandomShape } from "../demo-runner.js";

export default {
  id: "explosion",
  label: "Impulse Blast",
  featured: true,
  featuredOrder: 3,
  desc: '<b>Click</b> anywhere to create an impulse blast that pushes nearby bodies away.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);
    addWalls(space, W, H);
    for (let i = 0; i < 120; i++) {
      spawnRandomShape(space, 100 + Math.random() * 700, 100 + Math.random() * 350);
    }
  },

  click(x, y, space, W, H) {
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const distSq = dx * dx + dy * dy;
      const maxDist = 200;
      if (distSq < maxDist * maxDist && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const force = 2000 * (1 - dist / maxDist);
        body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
      }
    }
  },

  code2d: `// Impulse blast — apply radial impulse on click
const space = new Space(new Vec2(0, 500));

addWalls();

// Fill with mixed shapes
for (let i = 0; i < 120; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700,
    100 + Math.random() * 350,
  ));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    body.shapes.add(new Polygon(
      Polygon.box(10 + Math.random() * 24, 10 + Math.random() * 24)
    ));
  }
  body.space = space;
}

// On click: radial impulse blast
canvasWrap.addEventListener("click", (e) => {
  const rect = canvasWrap.getBoundingClientRect();
  const sx = W / rect.width, sy = H / rect.height;
  const clickX = (e.clientX - rect.left) * sx;
  const clickY = (e.clientY - rect.top) * sy;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = body.position.x - clickX;
    const dy = body.position.y - clickY;
    const distSq = dx * dx + dy * dy;
    const maxDist = 200;
    if (distSq < maxDist * maxDist && distSq > 1) {
      const dist = Math.sqrt(distSq);
      const force = 2000 * (1 - dist / maxDist);
      body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
    }
  }
});

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
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
const space = new Space(new Vec2(0, 500));
addWalls();

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
    const s = new THREE.Shape(pts);
    geom = new THREE.ExtrudeGeometry(s, { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

for (let i = 0; i < 120; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700, 100 + Math.random() * 350,
  ));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    body.shapes.add(new Polygon(Polygon.box(10 + Math.random() * 24, 10 + Math.random() * 24)));
  }
  body.space = space;
  addMesh(body, COLORS[i % COLORS.length]);
}

// Click to blast
renderer.domElement.addEventListener("click", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) / rect.width * W;
  const clickY = (e.clientY - rect.top) / rect.height * H;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = body.position.x - clickX;
    const dy = body.position.y - clickY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 40000 && distSq > 1) {
      const dist = Math.sqrt(distSq);
      body.applyImpulse(new Vec2(dx / dist * 2000 * (1 - dist / 200), dy / dist * 2000 * (1 - dist / 200)));
    }
  }
});

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
