import { Body, BodyType, Vec2, Circle, Polygon } from "../nape-js.esm.js";
import { spawnRandomShape } from "../demo-runner.js";

// Module-level planet position (reset in setup)
let _planetX = 0;
let _planetY = 0;

export default {
  id: "gravity",
  label: "Orbital Gravity",
  featured: true,
  featuredOrder: 5,
  desc: 'Mario Galaxy-style gravity: bodies are pulled toward a central planet. <b>Click</b> to spawn orbiting bodies.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // no global gravity

    _planetX = W / 2;
    _planetY = H / 2;

    // Central "planet"
    const planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
    planet.shapes.add(new Circle(40));
    planet.space = space;

    // Orbiting bodies
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 180;
      const b = spawnRandomShape(
        space,
        W / 2 + Math.cos(angle) * dist,
        H / 2 + Math.sin(angle) * dist,
      );
      // Give tangential velocity for orbit
      const speed = 80 + Math.random() * 60;
      b.velocity = new Vec2(
        -Math.sin(angle) * speed,
        Math.cos(angle) * speed,
      );
    }
  },

  step(space, W, H) {
    // Apply gravity toward center for all dynamic bodies
    const cx = _planetX;
    const cy = _planetY;
    const G = 800000;
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = cx - body.position.x;
      const dy = cy - body.position.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 100) continue;
      const dist = Math.sqrt(distSq);
      const force = G / distSq;
      body.force = new Vec2(dx / dist * force, dy / dist * force);
    }
  },

  click(x, y, space, W, H) {
    const b = spawnRandomShape(space, x, y);
    const dx = _planetX - x;
    const dy = _planetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 100;
    b.velocity = new Vec2(-dy / dist * speed, dx / dist * speed);
  },

  code2d: `// Orbital gravity — Mario Galaxy style
const space = new Space(new Vec2(0, 0)); // no global gravity!

// Static "planet" at center
const planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
planet.shapes.add(new Circle(40));
planet.space = space;

// Spawn orbiting bodies with tangential velocity
for (let i = 0; i < 50; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 100 + Math.random() * 180;
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    W / 2 + Math.cos(angle) * dist,
    H / 2 + Math.sin(angle) * dist,
  ));
  body.shapes.add(new Circle(6 + Math.random() * 10));
  body.space = space;
  const speed = 80 + Math.random() * 60;
  body.velocity = new Vec2(-Math.sin(angle) * speed, Math.cos(angle) * speed);
}

// Gravitational pull
function applyGravity() {
  const G = 800000;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = W / 2 - body.position.x;
    const dy = H / 2 - body.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 100) continue;
    const dist = Math.sqrt(distSq);
    const force = G / distSq;
    body.force = new Vec2(dx / dist * force, dy / dist * force);
  }
}

function loop() {
  applyGravity();
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

// Physics — no global gravity
const space = new Space(new Vec2(0, 0));
const planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
planet.shapes.add(new Circle(40));
planet.space = space;

const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
const meshes = [];

// Planet mesh
const planetMesh = new THREE.Mesh(
  new THREE.SphereGeometry(40, 32, 32),
  new THREE.MeshPhongMaterial({ color: 0x455a64 }),
);
planetMesh.position.set(W / 2, -H / 2, 0);
scene.add(planetMesh);

// Orbiting bodies
for (let i = 0; i < 50; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 100 + Math.random() * 180;
  const r = 6 + Math.random() * 10;
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    W / 2 + Math.cos(angle) * dist, H / 2 + Math.sin(angle) * dist,
  ));
  body.shapes.add(new Circle(r));
  body.space = space;
  const speed = 80 + Math.random() * 60;
  body.velocity = new Vec2(-Math.sin(angle) * speed, Math.cos(angle) * speed);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 12),
    new THREE.MeshPhongMaterial({ color: COLORS[i % COLORS.length] }),
  );
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

function applyGravity() {
  const G = 800000;
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    const dx = W / 2 - body.position.x;
    const dy = H / 2 - body.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 100) continue;
    const dist = Math.sqrt(distSq);
    const force = G / distSq;
    body.force = new Vec2(dx / dist * force, dy / dist * force);
  }
}

function loop() {
  applyGravity();
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
};
