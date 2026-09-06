import { Body, BodyType, Vec2, Circle, DistanceJoint, PivotJoint, InteractionFilter } from "../nape-js.esm.js?v=3.42.0";
import { drawBody, drawGrid, drawConstraints } from "../renderer.js?v=3.42.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.0";

// ── Module-level state for drag + texture ──────────────────────────────────
let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0, _dragY = 0;
let _clothBodies = null;   // 2D grid [row][col] of particle bodies
let _clothCols = 0;
let _clothRows = 0;
let _logoImg = null;
let _THREE = null;
let _clothMesh3d = null;
let _lastScene3d = null;
let _bodyMeshes3d = [];

function loadLogo() {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { _logoImg = img; done(); };
    img.onerror = done;
    setTimeout(done, 2000);
    img.src = "../logo.svg";
  });
}

// ── Affine-textured triangle via canvas setTransform ────────────────────────
function drawTexturedTriangle(ctx, img,
  x0, y0, x1, y1, x2, y2,
  u0, v0, u1, v1, u2, v2,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  // Source pixel coords
  const sx0 = u0 * iw, sy0 = v0 * ih;
  const sx1 = u1 * iw, sy1 = v1 * ih;
  const sx2 = u2 * iw, sy2 = v2 * ih;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  // Solve affine: [sx, sy] → [dx, dy]
  // We need transform T such that T * [sx, sy, 1] = [dx, dy]
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
  if (Math.abs(denom) < 1e-10) { ctx.restore(); return; }
  const invD = 1 / denom;

  const a = (x0 * (sy1 - sy2) + x1 * (sy2 - sy0) + x2 * (sy0 - sy1)) * invD;
  const b = (x0 * (sx2 - sx1) + x1 * (sx0 - sx2) + x2 * (sx1 - sx0)) * invD;
  const e = (x0 * (sx1 * sy2 - sx2 * sy1) + x1 * (sx2 * sy0 - sx0 * sy2) + x2 * (sx0 * sy1 - sx1 * sy0)) * invD;
  const c = (y0 * (sy1 - sy2) + y1 * (sy2 - sy0) + y2 * (sy0 - sy1)) * invD;
  const d = (y0 * (sx2 - sx1) + y1 * (sx0 - sx2) + y2 * (sx1 - sx0)) * invD;
  const f = (y0 * (sx1 * sy2 - sx2 * sy1) + y1 * (sx2 * sy0 - sx0 * sy2) + y2 * (sx0 * sy1 - sx1 * sy0)) * invD;

  ctx.setTransform(a, c, b, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export default {
  id: "cloth",
  label: "Cloth Simulation",
  featured: false,
  tags: ["DistanceJoint", "Springs", "Grid"],
  desc: "A grid of particles connected by springs, simulating cloth with a logo texture. <b>Drag</b> the cloth with the mouse. A circle obstacle drifts across.",
  walls: false,
  moduleState: `let _mouseBody = null;
let _grabJoint = null;
let _pendingGrab = null;
let _pendingRelease = false;
let _dragX = 0, _dragY = 0;
let _clothBodies = null;
let _clothCols = 0;
let _clothRows = 0;`,

  async preload() {
    await loadLogo();
  },

  setup(space, W, H) {
    space.gravity = new Vec2(0, 300);

    const cols = 20, rows = 14, gap = 20;
    _clothCols = cols;
    _clothRows = rows;
    const startX = W / 2 - (cols * gap) / 2;
    const startY = 30;
    const bodies = [];

    for (let r = 0; r < rows; r++) {
      bodies[r] = [];
      for (let c = 0; c < cols; c++) {
        const isTop = r === 0 && (c % 4 === 0 || c === cols - 1);
        const b = new Body(
          isTop ? BodyType.STATIC : BodyType.DYNAMIC,
          new Vec2(startX + c * gap, startY + r * gap),
        );
        const circle = new Circle(2);
        circle.filter = new InteractionFilter(2, ~2);
        b.shapes.add(circle);
        try {
          b.userData._colorIdx = isTop ? 3 : (r + c) % 6;
          b.userData._hidden3d = true;
        } catch(_) {}
        b.space = space;
        bodies[r][c] = b;
      }
    }
    _clothBodies = bodies;

    function connect(b1, b2, rest) {
      const dj = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), rest * 0.9, rest * 1.1);
      dj.stiff = false;
      dj.frequency = 20;
      dj.damping = 0.3;
      dj.space = space;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c < cols - 1) connect(bodies[r][c], bodies[r][c + 1], gap);
        if (r < rows - 1) connect(bodies[r][c], bodies[r + 1][c], gap);
      }
    }

    // Moving circle obstacle
    const obstacleR = 29;
    const obstacle = new Body(BodyType.KINEMATIC, new Vec2(obstacleR + 20, H * 0.55 - 50));
    obstacle.shapes.add(new Circle(obstacleR));
    try { obstacle.userData._colorIdx = 4; } catch(_) {}
    try { obstacle.userData._clothObstacle = true; } catch(_) {}
    obstacle.space = space;

    // Kinematic mouse anchor for dragging
    _mouseBody = new Body(BodyType.KINEMATIC, new Vec2(-1000, -1000));
    _mouseBody.space = space;
    _grabJoint = null;
    _pendingGrab = null;
    _pendingRelease = false;
  },

  step(space, W, H) {
    // Animate the kinematic obstacle — full canvas width
    const obstacleR = 29;
    for (const body of space.bodies) {
      try {
        if (!body.userData._clothObstacle) continue;
      } catch(_) { continue; }
      const range = W / 2 - obstacleR - 20; // go near the edges (20px margin)
      const cx = W / 2;
      const speed = 0.35;
      const t = performance.now() / 1000;
      const targetX = cx + Math.sin(t * speed - Math.PI / 2) * range;
      body.velocity = new Vec2((targetX - body.position.x) * 5, 0);
      break;
    }

    // Handle drag release
    if (_pendingRelease) {
      _pendingRelease = false;
      if (_grabJoint) {
        _grabJoint.space = null;
        _grabJoint = null;
      }
      _mouseBody.position.setxy(-1000, -1000);
      _mouseBody.velocity.setxy(0, 0);
    }

    // Handle pending grab
    if (_pendingGrab) {
      const { body, localPt } = _pendingGrab;
      _pendingGrab = null;
      if (_grabJoint) { _grabJoint.space = null; _grabJoint = null; }
      _mouseBody.position.setxy(_dragX, _dragY);
      _grabJoint = new PivotJoint(
        _mouseBody, body,
        new Vec2(0, 0), localPt,
      );
      _grabJoint.stiff = false;
      _grabJoint.frequency = 8;
      _grabJoint.damping = 0.9;
      _grabJoint.space = space;
    }

    // Move mouse body toward cursor
    if (_grabJoint) {
      const dx = _dragX - _mouseBody.position.x;
      const dy = _dragY - _mouseBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxSpeed = 600;
      if (dist > 1) {
        const speed = Math.min(dist * 60, maxSpeed);
        _mouseBody.velocity.setxy(dx / dist * speed, dy / dist * speed);
      } else {
        _mouseBody.velocity.setxy(0, 0);
      }
    }
  },

  click(x, y, space) {
    _dragX = x;
    _dragY = y;
    // Find nearest dynamic cloth particle
    let best = null, bestDist = 40;
    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = body; }
    }
    if (!best) return;
    const localPt = best.worldPointToLocal(new Vec2(x, y));
    _pendingGrab = { body: best, localPt };
  },

  drag(x, y) {
    _dragX = x;
    _dragY = y;
  },

  release() {
    _pendingRelease = true;
  },

  render(ctx, space, W, H, showOutlines) {
    drawGrid(ctx, W, H);

    // Draw textured cloth quads
    if (_clothBodies && _logoImg) {
      const cols = _clothCols;
      const rows = _clothRows;

      // White background behind the logo texture
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const tl = _clothBodies[r][c].position;
          const tr = _clothBodies[r][c + 1].position;
          const bl = _clothBodies[r + 1][c].position;
          const br = _clothBodies[r + 1][c + 1].position;
          ctx.beginPath();
          ctx.moveTo(tl.x, tl.y);
          ctx.lineTo(tr.x, tr.y);
          ctx.lineTo(br.x, br.y);
          ctx.lineTo(bl.x, bl.y);
          ctx.closePath();
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
      }

      // Logo texture on top
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const tl = _clothBodies[r][c].position;
          const tr = _clothBodies[r][c + 1].position;
          const bl = _clothBodies[r + 1][c].position;
          const br = _clothBodies[r + 1][c + 1].position;

          // UV coords for this quad cell
          const u0 = c / (cols - 1);
          const u1 = (c + 1) / (cols - 1);
          const v0 = r / (rows - 1);
          const v1 = (r + 1) / (rows - 1);

          // Draw two textured triangles per quad using canvas transform trick
          drawTexturedTriangle(ctx, _logoImg,
            tl.x, tl.y, tr.x, tr.y, bl.x, bl.y,
            u0, v0, u1, v0, u0, v1,
          );
          drawTexturedTriangle(ctx, _logoImg,
            tr.x, tr.y, br.x, br.y, bl.x, bl.y,
            u1, v0, u1, v1, u0, v1,
          );
        }
      }
    } else if (_clothBodies) {
      // Fallback: light cloth with visible grid lines (no texture available)
      const cols = _clothCols;
      const rows = _clothRows;
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const tl = _clothBodies[r][c].position;
          const tr = _clothBodies[r][c + 1].position;
          const bl = _clothBodies[r + 1][c].position;
          const br = _clothBodies[r + 1][c + 1].position;
          ctx.beginPath();
          ctx.moveTo(tl.x, tl.y);
          ctx.lineTo(tr.x, tr.y);
          ctx.lineTo(br.x, br.y);
          ctx.lineTo(bl.x, bl.y);
          ctx.closePath();
          ctx.fillStyle = "rgba(88,166,255,0.15)";
          ctx.fill();
          ctx.strokeStyle = "rgba(88,166,255,0.5)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw constraint debug lines (springs) when outlines enabled
    if (showOutlines) {
      drawConstraints(ctx, space);
    }

    // Draw non-cloth bodies (obstacle, static anchors) on top
    for (const body of space.bodies) {
      if (body === _mouseBody) continue;
      // Skip cloth particles — they're part of the texture
      let isCloth = false;
      if (_clothBodies) {
        outer:
        for (let r = 0; r < _clothRows; r++) {
          for (let c = 0; c < _clothCols; c++) {
            if (_clothBodies[r][c] === body) { isCloth = true; break outer; }
          }
        }
      }
      if (isCloth) continue;
      drawBody(ctx, body, showOutlines);
    }
  },

  renderPixi(adapter, space, W, H) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    // Sync non-cloth body graphics (obstacle, walls)
    // Cloth particles are skipped via _hidden3d flag
    adapter.syncBodies(space);

    if (_clothBodies) {
      const cols = _clothCols;
      const rows = _clothRows;

      // Lazy-create textured Mesh or Graphics fallback
      if (!app.stage._clothMesh && _logoImg) {
        // Build UV coords and triangle indices (static — only positions change)
        const uvs = new Float32Array(cols * rows * 2);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = (r * cols + c) * 2;
            uvs[idx]     = c / (cols - 1);
            uvs[idx + 1] = r / (rows - 1);
          }
        }
        const indices = [];
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const tl = r * cols + c;
            const tr = tl + 1;
            const bl = tl + cols;
            const br = bl + 1;
            indices.push(tl, tr, bl, tr, br, bl);
          }
        }

        const positions = new Float32Array(cols * rows * 2);
        const texture = PIXI.Texture.from(_logoImg);
        const geom = new PIXI.MeshGeometry({
          positions,
          uvs,
          indices: new Uint32Array(indices),
        });
        // White background mesh (same geometry, white texture)
        const bgMesh = new PIXI.Mesh({ geometry: geom, texture: PIXI.Texture.WHITE });
        app.stage.addChildAt(bgMesh, 0);
        app.stage._clothBg = bgMesh;

        // Textured mesh on top
        const mesh = new PIXI.Mesh({ geometry: geom, texture });
        app.stage.addChildAt(mesh, 1);
        app.stage._clothMesh = mesh;
        app.stage._clothPositions = positions;
      }

      if (app.stage._clothMesh) {
        // Update vertex positions from physics bodies
        const positions = app.stage._clothPositions;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = (r * cols + c) * 2;
            const pos = _clothBodies[r][c].position;
            positions[idx]     = pos.x;
            positions[idx + 1] = pos.y;
          }
        }
        app.stage._clothMesh.geometry.getAttribute("aPosition").buffer.update();
      } else {
        // Fallback: draw cloth quads as colored polygons (no texture)
        if (!app.stage._clothGfx) {
          app.stage._clothGfx = new PIXI.Graphics();
          app.stage.addChildAt(app.stage._clothGfx, 0);
        }
        const gfx = app.stage._clothGfx;
        gfx.clear();
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const tl = _clothBodies[r][c].position;
            const tr = _clothBodies[r][c + 1].position;
            const bl = _clothBodies[r + 1][c].position;
            const br = _clothBodies[r + 1][c + 1].position;
            gfx.poly([tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y], true);
            gfx.fill({ color: 0x58a6ff, alpha: 0.15 });
            gfx.poly([tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y], true);
            gfx.stroke({ color: 0x58a6ff, width: 0.5, alpha: 0.5 });
          }
        }
      }
    }

    app.render();
  },

  render3d(renderer, scene, camera, space, W, H) {
    // Reset 3D state when scene changes (e.g. 2d→3d→2d→3d toggle)
    if (scene !== _lastScene3d) {
      _clothMesh3d = null;
      _bodyMeshes3d = [];
      _lastScene3d = scene;
    }

    // Lazy-load THREE
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }

    const rows = _clothRows;
    const cols = _clothCols;

    // Build cloth mesh (subdivided plane with logo texture)
    if (!_clothMesh3d && _clothBodies) {
      // Create texture from logo on white background
      const texCanvas = document.createElement("canvas");
      texCanvas.width = 512;
      texCanvas.height = 512;
      const tc = texCanvas.getContext("2d");
      tc.fillStyle = "#ffffff";
      tc.fillRect(0, 0, 512, 512);
      if (_logoImg) {
        tc.drawImage(_logoImg, 0, 0, 512, 512);
      }
      const texture = new _THREE.CanvasTexture(texCanvas);
      texture.minFilter = _THREE.LinearFilter;
      texture.magFilter = _THREE.LinearFilter;

      // Build a PlaneGeometry with (cols) x (rows) vertices
      const geom = new _THREE.PlaneGeometry(1, 1, cols - 1, rows - 1);
      const positions = geom.attributes.position;

      // Initialize vertex positions from cloth body positions
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const body = _clothBodies[r][c];
          positions.setXYZ(idx, body.position.x, -body.position.y, 0);
        }
      }
      positions.needsUpdate = true;

      // MeshBasicMaterial — no lighting dependency, so no triangle-shaped
      // shadow artifacts on the flat deforming cloth mesh.
      const mat = new _THREE.MeshBasicMaterial({
        map: texture,
        side: _THREE.DoubleSide,
      });
      _clothMesh3d = new _THREE.Mesh(geom, mat);
      scene.add(_clothMesh3d);
    }

    // Update cloth vertex positions each frame
    if (_clothMesh3d && _clothBodies) {
      const positions = _clothMesh3d.geometry.attributes.position;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const body = _clothBodies[r][c];
          positions.setXYZ(idx, body.position.x, -body.position.y, 0);
        }
      }
      positions.needsUpdate = true;
    }

    // Sync non-cloth body meshes (obstacle etc.)
    const COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xef5350, 0xce93d8, 0x4dd0e1, 0xfff176, 0xff8a65];
    const clothSet = new Set();
    if (_clothBodies) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) clothSet.add(_clothBodies[r][c]);
      }
    }

    // Remove stale meshes
    const spaceBodies = new Set();
    for (const body of space.bodies) spaceBodies.add(body);
    for (let i = _bodyMeshes3d.length - 1; i >= 0; i--) {
      if (!spaceBodies.has(_bodyMeshes3d[i].body)) {
        scene.remove(_bodyMeshes3d[i].mesh);
        _bodyMeshes3d[i].mesh.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        });
        _bodyMeshes3d.splice(i, 1);
      }
    }

    // Add new body meshes (skip cloth particles and mouse body)
    const tracked = new Set(_bodyMeshes3d.map(m => m.body));
    for (const body of space.bodies) {
      if (tracked.has(body) || clothSet.has(body) || body === _mouseBody) continue;
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
        _bodyMeshes3d.push({ mesh, body, edges });
      }
    }

    // Update positions
    for (const { mesh, body } of _bodyMeshes3d) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;
    }

    renderer.render(scene, camera);
  },
};
