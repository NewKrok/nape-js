import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "pyramid",
  label: "Pyramid Stress Test",
  featured: true,
  featuredOrder: 1,
  desc: 'A classic box-stacking pyramid. <b>Click</b> to drop a heavy ball onto it.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);

    const boxSize = 28;
    const rows = 14;
    const startX = W / 2;
    const startY = H - 30 - boxSize / 2;

    for (let row = 0; row < rows; row++) {
      const cols = rows - row;
      const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
      for (let col = 0; col < cols; col++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          offsetX + col * boxSize,
          startY - row * boxSize,
        ));
        b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
        try { b.userData._colorIdx = row; } catch(_) {}
        b.space = space;
      }
    }
  },

  click(x, y, space, W, H) {
    const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    ball.shapes.add(new Circle(25, undefined, new Material(0.3, 0.2, 0.3, 5)));
    try { ball.userData._colorIdx = 3; } catch(_) {}
    ball.space = space;
  },

  code2d: `// Pyramid stress test — stacking many boxes
const space = new Space(new Vec2(0, 600));

addWalls();

// Build a pyramid of boxes
const boxSize = 28;
const rows = 14;
const startX = W / 2;
const startY = H - 30 - boxSize / 2;

for (let row = 0; row < rows; row++) {
  const cols = rows - row;
  const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
  for (let col = 0; col < cols; col++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(
      offsetX + col * boxSize,
      startY - row * boxSize,
    ));
    b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
    b.space = space;
  }
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

const ROW_COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];
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

const boxSize = 28;
const rows = 14;
const startX = W / 2;
const startY = H - 30 - boxSize / 2;

for (let row = 0; row < rows; row++) {
  const cols = rows - row;
  const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
  for (let col = 0; col < cols; col++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(offsetX + col * boxSize, startY - row * boxSize));
    b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
    b.space = space;
    addMesh(b, ROW_COLORS[row % ROW_COLORS.length]);
  }
}
addMesh(floor, 0x455a64);

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
