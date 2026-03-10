import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js";
import { addWalls, spawnRandomShape } from "../demo-runner.js";

export default {
  id: "falling",
  label: "Falling Shapes",
  tags: ["Circle", "Polygon", "Gravity", "Click"],
  featured: true,
  featuredOrder: 0,
  desc: 'Random boxes and circles fall into a container. <b>Click</b> to spawn more shapes at the cursor.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);
    for (let i = 0; i < 80; i++) {
      spawnRandomShape(space, 100 + Math.random() * 700, 50 + Math.random() * 200);
    }
  },

  click(x, y, space, W, H) {
    for (let i = 0; i < 8; i++) {
      spawnRandomShape(space, x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
    }
  },

  code2d: `// Create a Space with downward gravity
const space = new Space(new Vec2(0, 600));

addWalls();

// Spawn random shapes
for (let i = 0; i < 80; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700,
    50 + Math.random() * 200,
  ));

  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    const w = 10 + Math.random() * 24;
    const h = 10 + Math.random() * 24;
    body.shapes.add(new Polygon(Polygon.box(w, h)));
  }

  body.space = space;
}

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
const space = new Space(new Vec2(0, 600));
const floor = addWalls();

const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7];
const meshes = [];

// Create Three.js mesh for a body
function createMesh(body) {
  let geom, depth = 20;
  const shape = body.shapes.at(0);
  if (shape.isCircle()) {
    const r = shape.castCircle.radius;
    geom = new THREE.SphereGeometry(r, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.length; i++) {
      pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    }
    const shape2d = new THREE.Shape(pts);
    geom = new THREE.ExtrudeGeometry(shape2d, { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 });
    geom.translate(0, 0, -15);
  }
  const color = body.isStatic() ? 0x455a64 : COLORS[meshes.length % COLORS.length];
  const mat = new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444 });
  const mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 15), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  mesh.add(edges);
  meshes.push({ mesh, body });
}

// Spawn shapes
for (let i = 0; i < 80; i++) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(
    100 + Math.random() * 700, 50 + Math.random() * 200,
  ));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(6 + Math.random() * 14));
  } else {
    body.shapes.add(new Polygon(Polygon.box(10 + Math.random() * 24, 10 + Math.random() * 24)));
  }
  body.space = space;
  createMesh(body);
}
// Floor mesh
createMesh(floor);

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
