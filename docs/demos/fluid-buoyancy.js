import {
  Body, BodyType, Vec2, Circle, Polygon, FluidProperties,
} from "../nape-js.esm.js?v=3.40.0";
import { drawBody, drawGrid, drawConstraints } from "../renderer.js?v=3.40.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.40.0";
import {
  waveY, drawWaveSurface2D,
  createWater3D, updateWater3D,
  drawWaterPixi,
} from "../renderers/water-renderer.js?v=3.40.0";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _waterBody = null;
let _waterY = 0;
let _W = 0;
let _H = 0;
let _time = 0;
let _THREE = null;
let _waterMesh3d = null;
let _boatFlagMesh3d = null;
let _lastScene = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnObject(space, x, y, type) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));

  switch (type) {
    case 0: { // Light beach ball — floats high
      body.shapes.add(new Circle(18));
      for (const s of body.shapes) {
        s.material.density = 0.3;
        s.material.elasticity = 0.6;
      }
      try { body.userData._colorIdx = 0; body.userData._label = "ball"; } catch (_) {}
      break;
    }
    case 1: { // Wooden crate — floats partially submerged
      body.shapes.add(new Polygon(Polygon.box(28, 28)));
      for (const s of body.shapes) {
        s.material.density = 0.7;
        s.material.elasticity = 0.2;
      }
      try { body.userData._colorIdx = 1; body.userData._label = "wood"; } catch (_) {}
      break;
    }
    case 2: { // Rubber duck (small circle) — bobs on surface
      body.shapes.add(new Circle(12));
      for (const s of body.shapes) {
        s.material.density = 0.5;
        s.material.elasticity = 0.4;
      }
      try { body.userData._colorIdx = 5; body.userData._label = "duck"; } catch (_) {}
      break;
    }
    case 3: { // Steel block — sinks slowly
      body.shapes.add(new Polygon(Polygon.box(22, 22)));
      for (const s of body.shapes) {
        s.material.density = 3.0;
        s.material.elasticity = 0.1;
      }
      try { body.userData._colorIdx = 3; body.userData._label = "steel"; } catch (_) {}
      break;
    }
    case 4: { // Heavy anchor — sinks fast
      body.shapes.add(new Circle(14));
      for (const s of body.shapes) {
        s.material.density = 7.0;
        s.material.elasticity = 0.05;
      }
      try { body.userData._colorIdx = 4; body.userData._label = "anchor"; } catch (_) {}
      break;
    }
  }

  body.space = space;
  return body;
}

function spawnBoat(space, x, y) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));

  // Hull bottom — V-shaped keel (pointed bow, tapered stern)
  const keelVerts = [
    new Vec2(-38, 0),
    new Vec2(50, 0),
    new Vec2(58, 6),
    new Vec2(0, 14),
    new Vec2(-42, 10),
  ];
  const keel = new Polygon(keelVerts);
  keel.material.density = 0.25;
  keel.material.elasticity = 0.1;
  keel.material.dynamicFriction = 0.4;
  keel.material.staticFriction = 0.4;
  body.shapes.add(keel);

  // Deck — flat top section
  const deckVerts = [
    new Vec2(-38, -4),
    new Vec2(50, -4),
    new Vec2(50, 0),
    new Vec2(-38, 0),
  ];
  const deck = new Polygon(deckVerts);
  deck.material.density = 0.2;
  deck.material.elasticity = 0.1;
  body.shapes.add(deck);

  // Cabin — small box on top
  const cabinVerts = [
    new Vec2(-12, -16),
    new Vec2(8, -16),
    new Vec2(8, -4),
    new Vec2(-12, -4),
  ];
  const cabin = new Polygon(cabinVerts);
  cabin.material.density = 0.15;
  body.shapes.add(cabin);

  try {
    body.userData._colorIdx = 1;
    body.userData._isBoat = true;
  } catch (_) {}

  body.space = space;
  return body;
}

// waveY, drawWaveSurface2D, createWater3D, updateWater3D, drawWaterPixi
// are now imported from ../renderers/water-renderer.js

// ---------------------------------------------------------------------------
// Custom 2D renderer
// ---------------------------------------------------------------------------

function renderFluid(ctx, space, W, H, showOutlines) {
  _time += 1 / 60;

  drawGrid(ctx, W, H);
  drawConstraints(ctx, space);

  // Separate bodies into above/below water for layering
  const below = [];
  const above = [];
  for (const body of space.bodies) {
    if (body === _waterBody) continue;
    if (body.isStatic()) continue;
    if (body.position.y > _waterY - 10) {
      below.push(body);
    } else {
      above.push(body);
    }
  }

  // Draw submerged bodies
  for (const body of below) drawBody(ctx, body, showOutlines);

  // Draw water with animated waves
  drawWaveSurface2D(ctx, W, H, _waterY, _time);

  // Draw above-water bodies
  for (const body of above) drawBody(ctx, body, showOutlines);

  // Draw walls (static bodies except water)
  for (const body of space.bodies) {
    if (body.isStatic() && body !== _waterBody) drawBody(ctx, body, showOutlines);
  }

  // Draw boat details (mast + flag) on top of any boat body
  for (const body of space.bodies) {
    if (!body.userData?._isBoat) continue;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.rotation);

    // Mast
    ctx.strokeStyle = "#c8a060";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5, -18);
    ctx.lineTo(-5, -55);
    ctx.stroke();

    // Flag (small triangle)
    ctx.fillStyle = "rgba(248,81,73,0.8)";
    ctx.beginPath();
    ctx.moveTo(-5, -55);
    ctx.lineTo(15, -47);
    ctx.lineTo(-5, -40);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

}

// buildWaveGeometry3D / updateWaveGeometry3D are now in water-renderer.js
// createWater3D / updateWater3D wrap them for easy use.

// ---------------------------------------------------------------------------
// 3D boat flag helper
// ---------------------------------------------------------------------------

function buildBoatFlag(THREE) {
  const group = new THREE.Group();

  // Mast — thin cylinder
  const mastGeom = new THREE.CylinderGeometry(1.2, 1.2, 37, 6);
  const mastMat = new THREE.MeshPhongMaterial({ color: 0xc8a060, shininess: 40 });
  const mast = new THREE.Mesh(mastGeom, mastMat);
  mast.position.set(-5, 18.5 + 18, 0); // relative to boat body center, Y up in 3D
  group.add(mast);

  // Flag — flat triangle
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(20, 8);
  flagShape.lineTo(0, 15);
  flagShape.closePath();
  const flagGeom = new THREE.ShapeGeometry(flagShape);
  const flagMat = new THREE.MeshPhongMaterial({
    color: 0xf85149,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const flag = new THREE.Mesh(flagGeom, flagMat);
  flag.position.set(-5, 18 + 22, 0);
  group.add(flag);

  return group;
}


export default {
  id: "fluid-buoyancy",
  label: "Fluid & Buoyancy",
  featured: true,
  featuredOrder: 6,
  tags: ["Fluid", "Buoyancy", "Density", "Boat", "Click"],
  desc: 'Objects with different densities interact with a fluid pool — light ones float, heavy ones sink. A small boat bobs on the waves. <b>Click</b> to drop objects.',
  walls: false,

  setup(space, W, H) {
    _W = W;
    _H = H;
    _time = 0;
    _waterMesh3d = null;
    _boatFlagMesh3d = null;
    space.gravity = new Vec2(0, 600);

    const t = 20;

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - t / 2));
    floor.shapes.add(new Polygon(Polygon.box(W, t)));
    floor.space = space;

    // Left wall
    const left = new Body(BodyType.STATIC, new Vec2(t / 2, H / 2));
    left.shapes.add(new Polygon(Polygon.box(t, H)));
    left.space = space;

    // Right wall
    const right = new Body(BodyType.STATIC, new Vec2(W - t / 2, H / 2));
    right.shapes.add(new Polygon(Polygon.box(t, H)));
    right.space = space;

    // Ceiling
    const ceil = new Body(BodyType.STATIC, new Vec2(W / 2, t / 2));
    ceil.shapes.add(new Polygon(Polygon.box(W, t)));
    ceil.space = space;

    // Water pool — fluid-enabled static body covering bottom 60%
    _waterY = H * 0.4;
    const waterH = H - _waterY;
    const waterBody = new Body(BodyType.STATIC, new Vec2(W / 2, _waterY + waterH / 2));
    const waterShape = new Polygon(Polygon.box(W - 2 * t, waterH));
    waterShape.fluidEnabled = true;
    waterShape.fluidProperties = new FluidProperties(1.5, 3.0);
    waterShape.body = waterBody;
    try { waterBody.userData._hidden3d = true; } catch (_) {}
    waterBody.space = space;
    _waterBody = waterBody;

    // Spawn boat
    spawnBoat(space, W / 2, _waterY - 10);

    // Spawn initial objects — spread to sides so they don't land on the boat
    const types = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 2];
    const leftZone = { min: 60, max: W / 2 - 80 };
    const rightZone = { min: W / 2 + 80, max: W - 60 };
    for (let i = 0; i < types.length; i++) {
      // Alternate between left and right zones
      const zone = i % 2 === 0 ? leftZone : rightZone;
      const x = zone.min + Math.random() * (zone.max - zone.min);
      const y = _waterY + 20 + Math.random() * (waterH - 60);
      spawnObject(space, x, y, types[i]);
    }
  },

  render(ctx, space, W, H, showOutlines) {
    renderFluid(ctx, space, W, H, showOutlines);
  },

  render3d(renderer, scene, camera, space, W, H) {
    _time += 1 / 60;

    // Reset 3D state when scene changes (e.g. 2d→3d→2d→3d toggle)
    if (scene !== _lastScene) {
      _waterMesh3d = null;
      _boatFlagMesh3d = null;
      _lastScene = scene;
    }

    // Lazy-load THREE (cached by loadThree from demo-runner)
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }

    // Create/update animated wave water surface
    if (!_waterMesh3d) {
      _waterMesh3d = createWater3D(_THREE, W, H, _waterY, _time);
      scene.add(_waterMesh3d.group);
    } else {
      updateWater3D(_waterMesh3d, W, _waterY, _time);
    }

    // Sync body meshes — replicate DemoRunner's default logic
    const spaceBodies = new Set();
    for (const body of space.bodies) spaceBodies.add(body);

    // Lazy mesh-set on the scene
    if (!scene.userData._fluidMeshes) scene.userData._fluidMeshes = [];
    const meshes = scene.userData._fluidMeshes;
    const COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xef5350, 0xce93d8, 0x4dd0e1, 0xfff176, 0xff8a65];

    // Remove stale
    for (let i = meshes.length - 1; i >= 0; i--) {
      if (!spaceBodies.has(meshes[i].body)) {
        scene.remove(meshes[i].mesh);
        meshes[i].mesh.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        });
        meshes.splice(i, 1);
      }
    }

    // Add new
    const tracked = new Set(meshes.map(m => m.body));
    for (const body of space.bodies) {
      if (tracked.has(body)) continue;
      if (body.userData?._hidden3d) continue;
      for (const shape of body.shapes) {
        let geom;
        if (shape.isCircle()) {
          geom = new _THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          if (verts.length < 3) continue;
          const pts = [];
          for (let i = 0; i < verts.length; i++) pts.push(new _THREE.Vector2(verts.at(i).x, verts.at(i).y));
          geom = new _THREE.ExtrudeGeometry(new _THREE.Shape(pts), {
            depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2,
          });
          geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
          geom.computeVertexNormals();
          geom.translate(0, 0, -15);
        }
        if (!geom) continue;
        const cIdx = (body.userData?._colorIdx ?? 0) % COLORS.length;
        const color = body.isStatic() ? 0x455a64 : COLORS[cIdx];
        const mesh = new _THREE.Mesh(geom, new _THREE.MeshPhongMaterial({
          color, shininess: 80, specular: 0x444444, side: _THREE.DoubleSide,
        }));
        scene.add(mesh);
        const edges = new _THREE.LineSegments(
          new _THREE.EdgesGeometry(geom, 15),
          new _THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
        );
        mesh.add(edges);
        meshes.push({ mesh, body, edges, isBoat: !!body.userData?._isBoat });
      }
    }

    // Sync positions + boat flag
    for (const { mesh, body, isBoat } of meshes) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;

      // Attach flag to boat on first encounter
      if (isBoat && !_boatFlagMesh3d) {
        _boatFlagMesh3d = buildBoatFlag(_THREE);
        mesh.add(_boatFlagMesh3d);
      }
    }

    renderer.render(scene, camera);
  },

  render3dOverlay(ctx, space, W, H) {
    ctx.save();
    ctx.font = "11px monospace";
    const labels = [
      { color: "#58a6ff", text: "Light (0.3)" },
      { color: "#d29922", text: "Wood (0.7)" },
      { color: "#dbabff", text: "Rubber (0.5)" },
      { color: "#f85149", text: "Steel (3.0)" },
      { color: "#a371f7", text: "Anchor (7.0)" },
      { color: "#c8a060", text: "Boat (0.25)" },
    ];
    const lx = 30;
    let ly = 24;
    for (const l of labels) {
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, ly - 8, 10, 10);
      ctx.fillStyle = "rgba(200,220,255,0.7)";
      ctx.fillText(l.text, lx + 14, ly);
      ly += 14;
    }
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.fillText("Click to drop objects", lx, ly + 6);
    ctx.restore();
  },

  renderPixi(adapter, space, W, H) {
    _time += 1 / 60;
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    // Sync body sprites (add/remove/update positions)
    adapter.syncBodies(space);

    // Lazy-create a Graphics overlay for the water
    if (!app.stage._waterGfx) {
      app.stage._waterGfx = new PIXI.Graphics();
      app.stage.addChild(app.stage._waterGfx);
    }
    const gfx = app.stage._waterGfx;

    // Keep water overlay on top of body sprites
    app.stage.setChildIndex(gfx, app.stage.children.length - 1);

    gfx.clear();
    drawWaterPixi(gfx, W, H, _waterY, _time);

    // Boat mast + flag
    if (!app.stage._boatGfx) {
      app.stage._boatGfx = new PIXI.Graphics();
      app.stage.addChild(app.stage._boatGfx);
    }
    const boatGfx = app.stage._boatGfx;
    boatGfx.clear();
    for (const body of space.bodies) {
      if (!body.userData?._isBoat) continue;
      boatGfx.position.set(body.position.x, body.position.y);
      boatGfx.rotation = body.rotation;
      // Mast
      boatGfx.moveTo(-5, -18);
      boatGfx.lineTo(-5, -55);
      boatGfx.stroke({ color: 0xc8a060, width: 2.5, alpha: 1 });
      // Flag (triangle)
      boatGfx.poly([-5, -55, 15, -47, -5, -40], true);
      boatGfx.fill({ color: 0xf85149, alpha: 0.8 });
    }

    app.render();
  },

  click(x, y, space) {
    const spawnY = Math.min(y, _waterY - 30);
    const type = Math.floor(Math.random() * 5);
    spawnObject(space, x, spawnY, type);
  },
};
