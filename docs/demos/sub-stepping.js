/**
 * Sub-Stepping Solver demo — Pyramid Stability.
 *
 * A 14-row pyramid of boxes settles under gravity with low solver iterations.
 *   Left:  subSteps = 1 — pyramid jitters endlessly, bodies never sleep (orange)
 *   Right: subSteps = 4 — pyramid settles quickly, all bodies sleep (green)
 * Click to drop extra boxes onto the pyramids.
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
} from "../nape-js.esm.js?v=3.42.0";
import { drawGrid } from "../renderer.js?v=3.42.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.0";

let _THREE = null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROWS     = 14;
const BOX_W    = 24;
const BOX_H    = 12;
const GRAVITY  = 1500;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _spaceB = null;
let _W      = 0;
let _H      = 0;
let _frame  = 0;
let _awakeA = 0;
let _awakeB = 0;
let _totalA = 0;
let _totalB = 0;

// ---------------------------------------------------------------------------
// Custom body drawing — color based on awake/sleeping state
// ---------------------------------------------------------------------------

function drawColoredBody(ctx, body) {
  if (body.isStatic()) {
    // Static = neutral gray
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.rotation);
    for (const shape of body.shapes) {
      if (shape.isPolygon()) {
        const verts = shape.castPolygon.localVerts;
        const len = verts.length;
        if (len < 3) continue;
        ctx.beginPath();
        const v0 = verts.at(0);
        ctx.moveTo(v0.x, v0.y);
        for (let vi = 1; vi < len; vi++) {
          const v = verts.at(vi);
          ctx.lineTo(v.x, v.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(100,120,140,0.25)";
        ctx.fill();
        ctx.strokeStyle = "rgba(100,120,140,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  const sleeping = body.isSleeping;

  // Awake = orange/red glow, Sleeping = green/teal
  const fill = sleeping
    ? "rgba(50,180,80,0.3)"
    : "rgba(255,120,40,0.35)";
  const stroke = sleeping
    ? "rgba(50,200,80,0.7)"
    : "rgba(255,80,30,0.8)";

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.rotation);

  for (const shape of body.shapes) {
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.length;
      if (len < 3) continue;
      ctx.beginPath();
      const v0 = verts.at(0);
      ctx.moveTo(v0.x, v0.y);
      for (let vi = 1; vi < len; vi++) {
        const v = verts.at(vi);
        ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Scene builder
// ---------------------------------------------------------------------------

function buildScene(space, halfW, H, subSteps) {
  space.gravity = new Vec2(0, GRAVITY);
  space.subSteps = subSteps;

  // Floor
  const floor = new Body(BodyType.STATIC, new Vec2(halfW / 2, H - 10));
  floor.shapes.add(new Polygon(Polygon.box(halfW - 10, 10)));
  floor.space = space;

  // Side walls
  const lw = new Body(BodyType.STATIC, new Vec2(6, H / 2));
  lw.shapes.add(new Polygon(Polygon.box(6, H)));
  lw.space = space;

  const rw = new Body(BodyType.STATIC, new Vec2(halfW - 6, H / 2));
  rw.shapes.add(new Polygon(Polygon.box(6, H)));
  rw.space = space;

  // Build pyramid
  const cx = halfW / 2;
  const baseY = H - 10 - BOX_H / 2;

  for (let row = 0; row < ROWS; row++) {
    const count = ROWS - row;
    const startX = cx - (count - 1) * BOX_W / 2;
    for (let col = 0; col < count; col++) {
      const x = startX + col * BOX_W;
      const y = baseY - row * BOX_H;
      const box = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      box.shapes.add(new Polygon(Polygon.box(BOX_W, BOX_H)));
      box.space = space;
    }
  }
}

function countAwake(space) {
  let awake = 0;
  let total = 0;
  for (const b of space.bodies) {
    if (!b.isDynamic()) continue;
    total++;
    if (!b.isSleeping) awake++;
  }
  return { awake, total };
}

// ---------------------------------------------------------------------------
// 3D helper — shared by render3d (CodePen) and _render3d (live adapter)
// ---------------------------------------------------------------------------

function ensureMeshes3d(scene, sp, meshList, trackedSet, offsetX) {
  /* eslint-disable no-undef -- THREE: module import in CodePen, _THREE in local adapter */
  const _T = _THREE || (typeof THREE !== "undefined" ? THREE : null);
  if (!_T) return;
  for (const body of sp.bodies) {
    if (trackedSet.has(body)) continue;
    trackedSet.add(body);
    for (const shape of body.shapes) {
      let geom;
      if (shape.isCircle()) {
        geom = new _T.SphereGeometry(shape.castCircle.radius, 16, 16);
      } else if (shape.isPolygon()) {
        const verts = shape.castPolygon.localVerts;
        const len = verts.length;
        if (len < 3) continue;
        const pts = [];
        for (let i = 0; i < len; i++) pts.push(new _T.Vector2(verts.at(i).x, verts.at(i).y));
        geom = new _T.ExtrudeGeometry(new _T.Shape(pts), {
          depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2,
        });
        geom.applyMatrix4(new _T.Matrix4().makeScale(1, -1, 1));
        geom.computeVertexNormals();
        geom.translate(0, 0, -15);
      }
      if (!geom) continue;
      const color = body.isStatic() ? 0x455a64 : (body.isSleeping ? 0x32b450 : 0xff5020);
      const mesh = new _T.Mesh(geom, new _T.MeshPhongMaterial({
        color, shininess: 80, specular: 0x444444, side: _T.DoubleSide,
      }));
      scene.add(mesh);
      meshList.push({ mesh, body, mat: mesh.material, offsetX });
    }
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

const demoDef = {
  id: "sub-stepping",
  label: "Sub-Stepping Solver",
  tags: ["SubSteps", "Stacking", "Stability", "Performance"],
  desc: 'A 14-row pyramid under low solver iterations. Left: <code>subSteps=1</code> — jitters endlessly (<b style="color:#ff5020">orange</b>). Right: <code>subSteps=4</code> — settles to sleep (<b style="color:#32b450">green</b>). <b>Click</b> to drop more boxes.',
  walls: false,
  velocityIterations: 1,
  positionIterations: 1,

  setup(space, W, H) {
    _W = W;
    _H = H;
    _frame = 0;
    _awakeA = _awakeB = 0;
    _totalA = _totalB = 0;

    const halfW = W / 2;

    // Space A — subSteps=1 (left)
    buildScene(space, halfW, H, 1);

    // Space B — subSteps=4 (right)
    _spaceB = new Space();
    buildScene(_spaceB, halfW, H, 4);
  },

  step(space, W, H) {
    _frame++;

    // Step Space B with same low iterations
    _spaceB.step(1 / 60, 1, 1);

    // Count awake bodies
    const a = countAwake(space);
    const b = countAwake(_spaceB);
    _awakeA = a.awake;
    _totalA = a.total;
    _awakeB = b.awake;
    _totalB = b.total;

  },

  click(x, y, space, W, H) {
    const halfW = W / 2;
    const cx = halfW / 2;

    for (let i = 0; i < 3; i++) {
      const offX = (Math.random() - 0.5) * halfW * 0.6;
      const dropY = 20 + Math.random() * 30;

      const boxA = new Body(BodyType.DYNAMIC, new Vec2(cx + offX, dropY));
      boxA.shapes.add(new Polygon(Polygon.box(BOX_W, BOX_H)));
      boxA.space = space;

      const boxB = new Body(BodyType.DYNAMIC, new Vec2(cx + offX, dropY));
      boxB.shapes.add(new Polygon(Polygon.box(BOX_W, BOX_H)));
      boxB.space = _spaceB;
    }
  },

  render(ctx, space, W, H, showOutlines) {
    const halfW = W / 2;

    // --- Left half: Space A (subSteps=1) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfW, H);
    ctx.clip();
    drawGrid(ctx, halfW, H);
    for (const body of space.bodies) drawColoredBody(ctx, body);
    ctx.restore();

    // --- Divider ---
    ctx.save();
    ctx.strokeStyle = "rgba(255,140,50,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- Right half: Space B (subSteps=4) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(halfW, 0, halfW, H);
    ctx.clip();
    ctx.translate(halfW, 0);
    drawGrid(ctx, halfW, H);
    for (const body of _spaceB.bodies) drawColoredBody(ctx, body);
    ctx.restore();

    // --- Legend bar ---
    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(255,80,30,0.9)";
    ctx.fillText("subSteps = 1", 12, 10);

    ctx.fillStyle = "rgba(50,200,80,0.9)";
    ctx.fillText("subSteps = 4", halfW + 12, 10);

    // Awake counters
    ctx.font = "11px monospace";

    const awakeColorA = _awakeA > 0 ? "rgba(255,120,40,0.9)" : "rgba(50,200,80,0.8)";
    ctx.fillStyle = awakeColorA;
    ctx.fillText(`Awake: ${_awakeA} / ${_totalA}`, 12, 32);

    const awakeColorB = _awakeB > 0 ? "rgba(255,120,40,0.9)" : "rgba(50,200,80,0.8)";
    ctx.fillStyle = awakeColorB;
    ctx.fillText(`Awake: ${_awakeB} / ${_totalB}`, halfW + 12, 32);

    // Legend
    ctx.fillStyle = "rgba(200,220,255,0.35)";
    ctx.fillText("Solver: 1 vel / 1 pos iteration", 12, 50);

    // Color legend
    ctx.fillStyle = "rgba(255,120,40,0.7)";
    ctx.fillRect(12, 66, 10, 10);
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.fillText("= awake (jittering)", 26, 66);

    ctx.fillStyle = "rgba(50,180,80,0.7)";
    ctx.fillRect(12, 82, 10, 10);
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.fillText("= sleeping (stable)", 26, 82);

    ctx.fillStyle = "rgba(200,220,255,0.3)";
    ctx.fillText("Click to drop more boxes", 12, H - 18);

    ctx.restore();
  },

  // -------------------------------------------------------------------------
  // ThreeJS — render both spaces into one 3D scene
  // (Uses renderOverrides.threejs which receives the adapter directly)
  // -------------------------------------------------------------------------

  _render3d(adapter, space, W, H) {
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      adapter.getRenderer().render(adapter.getScene(), adapter.getCamera());
      return;
    }
    this.render3d(adapter.getRenderer(), adapter.getScene(), adapter.getCamera(), space, W, H);
  },

  render3d(renderer, scene, camera, space, W, H) {
    /* eslint-disable no-undef -- THREE: module import in CodePen, _THREE in local adapter */
    const _T = _THREE || (typeof THREE !== "undefined" ? THREE : null);
    if (!_T) return;
    const halfW = W / 2;

    if (!scene.userData._subA) {
      scene.userData._subA = [];
      scene.userData._subASet = new Set();
      scene.userData._subB = [];
      scene.userData._subBSet = new Set();
    }

    // Build meshes for both spaces
    ensureMeshes3d(scene, space, scene.userData._subA, scene.userData._subASet, 0);
    ensureMeshes3d(scene, _spaceB, scene.userData._subB, scene.userData._subBSet, halfW);

    // Sync positions + sleep color
    const allMeshes = [...scene.userData._subA, ...scene.userData._subB];
    for (const entry of allMeshes) {
      const b = entry.body;
      entry.mesh.position.set(b.position.x + entry.offsetX, -b.position.y, 0);
      entry.mesh.rotation.z = -b.rotation;
      const wantColor = b.isStatic() ? 0x455a64 : (b.isSleeping ? 0x32b450 : 0xff5020);
      if (entry.mat.color.getHex() !== wantColor) entry.mat.color.setHex(wantColor);
    }

    // Divider plane
    if (!scene.userData._divider) {
      const dg = new _T.PlaneGeometry(2, H);
      const dm = new _T.MeshBasicMaterial({ color: 0xff8c32, transparent: true, opacity: 0.4 });
      const divider = new _T.Mesh(dg, dm);
      divider.position.set(halfW, -H / 2, 10);
      scene.add(divider);
      scene.userData._divider = divider;
    }

    renderer.render(scene, camera);
  },

  // -------------------------------------------------------------------------
  // PixiJS — render both spaces with sprites
  // -------------------------------------------------------------------------

  renderPixi(adapter, space, W, H, showOutlines) {
    const { PIXI, app } = adapter.getEngine();
    const halfW = W / 2;

    // Sync Space A sprites (auto-managed)
    adapter.syncBodies(space);

    // Lazy-init Space B container
    if (!app.stage._subBContainer) {
      app.stage._subBContainer = new PIXI.Container();
      app.stage.addChild(app.stage._subBContainer);
      app.stage._subBSprites = new Map();
    }
    const container = app.stage._subBContainer;
    const sprites = app.stage._subBSprites;

    // Add sprites for new Space B bodies
    for (const body of _spaceB.bodies) {
      if (sprites.has(body)) continue;
      const gfx = new PIXI.Graphics();
      for (const shape of body.shapes) {
        const sleeping = body.isSleeping;
        const fillColor = body.isStatic() ? 0x607888
          : sleeping ? 0x32b450 : 0xff5020;

        if (shape.isCircle()) {
          gfx.circle(0, 0, shape.castCircle.radius);
          gfx.fill({ color: fillColor, alpha: 0.5 });
          gfx.stroke({ color: fillColor, alpha: 0.8, width: 1.2 });
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          const len = verts.length;
          if (len < 3) continue;
          const v0 = verts.at(0);
          gfx.moveTo(v0.x, v0.y);
          for (let i = 1; i < len; i++) {
            const v = verts.at(i);
            gfx.lineTo(v.x, v.y);
          }
          gfx.closePath();
          gfx.fill({ color: fillColor, alpha: 0.5 });
          gfx.stroke({ color: fillColor, alpha: 0.8, width: 1.2 });
        }
      }
      container.addChild(gfx);
      sprites.set(body, gfx);
    }

    // Sync positions (offset by halfW)
    for (const [body, gfx] of sprites) {
      gfx.x = body.position.x + halfW;
      gfx.y = body.position.y;
      gfx.rotation = body.rotation;
      // Update color for sleep state changes
      const sleeping = body.isSleeping;
      const isStatic = body.isStatic();
      if (!isStatic && gfx._wasSleeping !== sleeping) {
        gfx._wasSleeping = sleeping;
        gfx.clear();
        const fillColor = sleeping ? 0x32b450 : 0xff5020;
        for (const shape of body.shapes) {
          if (shape.isPolygon()) {
            const verts = shape.castPolygon.localVerts;
            const len = verts.length;
            if (len < 3) continue;
            const v0 = verts.at(0);
            gfx.moveTo(v0.x, v0.y);
            for (let i = 1; i < len; i++) gfx.lineTo(verts.at(i).x, verts.at(i).y);
            gfx.closePath();
            gfx.fill({ color: fillColor, alpha: 0.5 });
            gfx.stroke({ color: fillColor, alpha: 0.8, width: 1.2 });
          }
        }
      }
    }

    // Divider line
    if (!app.stage._subDivider) {
      const div = new PIXI.Graphics();
      div.moveTo(halfW, 0);
      div.lineTo(halfW, H);
      div.stroke({ color: 0xff8c32, alpha: 0.5, width: 2 });
      app.stage.addChild(div);
      app.stage._subDivider = div;
    }

    app.render();
  },

  // -------------------------------------------------------------------------
  // 2D overlay for 3D/PixiJS modes — legend + stats
  // -------------------------------------------------------------------------

  render3dOverlay(ctx, space, W, H) {
    const halfW = W / 2;

    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(255,80,30,0.9)";
    ctx.fillText("subSteps = 1", 12, 10);
    ctx.fillStyle = "rgba(50,200,80,0.9)";
    ctx.fillText("subSteps = 4", halfW + 12, 10);

    ctx.font = "11px monospace";
    const awakeColorA = _awakeA > 0 ? "rgba(255,120,40,0.9)" : "rgba(50,200,80,0.8)";
    ctx.fillStyle = awakeColorA;
    ctx.fillText(`Awake: ${_awakeA} / ${_totalA}`, 12, 32);
    const awakeColorB = _awakeB > 0 ? "rgba(255,120,40,0.9)" : "rgba(50,200,80,0.8)";
    ctx.fillStyle = awakeColorB;
    ctx.fillText(`Awake: ${_awakeB} / ${_totalB}`, halfW + 12, 32);

    ctx.fillStyle = "rgba(200,220,255,0.35)";
    ctx.fillText("Solver: 1 vel / 1 pos iteration", 12, 50);
    ctx.fillText("Click to drop more boxes", 12, H - 18);
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// Wire up renderOverrides so the bridge doesn't strip the adapter reference
// ---------------------------------------------------------------------------

function overlayFn(ctx, space, W, H) {
  demoDef.render3dOverlay(ctx, space, W, H);
}

demoDef.renderOverrides = {
  canvas2d: (ctx, sp, w, h, outlines) => demoDef.render(ctx, sp, w, h, outlines),
  threejs:  (adapter, sp, w, h) => demoDef._render3d(adapter, sp, w, h),
  pixijs:   (adapter, sp, w, h, outlines) => demoDef.renderPixi(adapter, sp, w, h, outlines),
  overlay:  overlayFn,
};

export default demoDef;
