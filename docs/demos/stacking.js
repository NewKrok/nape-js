import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "stacking",
  label: "Stacking",
  tags: ["Stacking", "Stability", "Click"],
  featured: false,
  desc: 'Towers of various shapes testing stacking stability. <b>Click</b> to drop a heavy box.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);

    // Tower 1: boxes
    for (let i = 0; i < 12; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
      b.shapes.add(new Polygon(Polygon.box(40, 25)));
      try { b.userData._colorIdx = 0; } catch(_) {}
      b.space = space;
    }

    // Tower 2: circles
    for (let i = 0; i < 10; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
      b.shapes.add(new Circle(12));
      try { b.userData._colorIdx = 1; } catch(_) {}
      b.space = space;
    }

    // Tower 3: mixed hexagons
    for (let i = 0; i < 10; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        600 + (Math.random() - 0.5) * 4,
        H - 30 - 28 * i - 14,
      ));
      b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
      try { b.userData._colorIdx = 2; } catch(_) {}
      b.space = space;
    }

    // Tower 4: wide thin boxes
    for (let i = 0; i < 14; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        780 + (i % 2 === 0 ? 0 : 10),
        H - 30 - 16 * i - 8,
      ));
      b.shapes.add(new Polygon(Polygon.box(60, 14)));
      try { b.userData._colorIdx = 4; } catch(_) {}
      b.space = space;
    }
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Polygon(Polygon.box(50, 50), new Material(0.3, 0.3, 0.3, 5)));
    try { b.userData._colorIdx = 3; } catch(_) {}
    b.space = space;
  },

  code2d: `// Stacking stability test — towers of various shapes
const space = new Space(new Vec2(0, 600));

addWalls();

// Tower of boxes
for (let i = 0; i < 12; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
  b.shapes.add(new Polygon(Polygon.box(40, 25)));
  b.space = space;
}

// Tower of circles
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
  b.shapes.add(new Circle(12));
  b.space = space;
}

// Tower of hexagons
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(600, H - 30 - 28 * i - 14));
  b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
  b.space = space;
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

// Tower of boxes
for (let i = 0; i < 12; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
  b.shapes.add(new Polygon(Polygon.box(40, 25)));
  b.space = space;
  addMesh(b, 0x58a6ff);
}

// Tower of circles
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
  b.shapes.add(new Circle(12));
  b.space = space;
  addMesh(b, 0xd29922);
}

// Tower of hexagons
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(600, H - 30 - 28 * i - 14));
  b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
  b.space = space;
  addMesh(b, 0x3fb950);
}

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
