/**
 * ThreeJSAdapter — Three.js 3D renderer for nape-js demos.
 *
 * Implements the RendererAdapter interface using Three.js (lazy-loaded via CDN).
 * Extracts what was previously hardcoded inside DemoRunner (#setup3d, #teardown3d,
 * #buildMeshes, #addBodyMesh, #render3d).
 */

// ---------------------------------------------------------------------------
// Three.js — lazy-loaded once, shared across all adapter instances
// ---------------------------------------------------------------------------

let _THREE = null;

/** Pre-load Three.js. Call before attach(). */
export async function loadThree() {
  if (_THREE) return _THREE;
  _THREE = await import(
    "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
  );
  return _THREE;
}

export function getThree() {
  return _THREE;
}

import {
  BODY_COLORS_HEX, STATIC_COLOR_HEX, CONSTRAINT_COLOR_HEX,
  bodyColorHex, bodyFillAlpha,
} from "./shared-colors.js?v=3.42.0";

// Alias for backward compatibility with demos that reference MESH_COLORS
const MESH_COLORS = BODY_COLORS_HEX;

// ---------------------------------------------------------------------------
// ThreeJSAdapter
// ---------------------------------------------------------------------------

export class ThreeJSAdapter {
  id = "threejs";
  displayName = "3D";

  #container = null;
  #W = 0;
  #H = 0;
  #showOutlines = true;

  // Three.js objects
  #renderer = null;
  #scene = null;
  #camera = null;
  #meshes = []; // { mesh, body, edges }

  // Background grid + constraint lines (default rendering)
  #gridMesh = null;
  #constraintLine = null;

  // 2D overlay canvas for HUD (cursor hints, legends, etc.)
  #overlay = null;
  #overlayCtx = null;

  // Resize observer
  #resizeObserver = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  attach(container, W, H) {
    if (!_THREE) throw new Error("Three.js not loaded. Call loadThree() first.");

    this.#container = container;
    this.#W = W;
    this.#H = H;

    // Pin the container height before adding WebGL canvas.
    const cr = container.getBoundingClientRect();
    container.style.height = `${cr.height}px`;

    const fov = 45;
    const aspect = W / H;
    const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / aspect;

    this.#scene = new _THREE.Scene();
    this.#scene.background = new _THREE.Color(0x0d1117);
    this.#camera = new _THREE.PerspectiveCamera(fov, aspect, 1, camZ * 6);
    this.#camera.position.set(W / 2, -H / 2, camZ);
    this.#camera.lookAt(W / 2, -H / 2, 0);

    const displayW = Math.round(cr.width) || W;
    const displayH = Math.round(cr.height) || Math.round(displayW * (H / W));
    this.#renderer = new _THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setSize(displayW, displayH, false);
    this.#renderer.domElement.style.cssText =
      "display:block;position:absolute;inset:0;width:100%;height:100%";
    container.appendChild(this.#renderer.domElement);

    // 2D overlay canvas for demos that need cursor hints etc. in 3D mode
    this.#overlay = document.createElement("canvas");
    this.#overlay.width = W;
    this.#overlay.height = H;
    this.#overlay.style.cssText =
      "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:1";
    this.#overlayCtx = this.#overlay.getContext("2d");
    container.appendChild(this.#overlay);

    // 3-point lighting
    const keyLight = new _THREE.DirectionalLight(0xfff5e0, 2.0);
    keyLight.position.set(-W * 0.3, H * 0.6, 800);
    this.#scene.add(keyLight);
    const fillLight = new _THREE.DirectionalLight(0xadd8ff, 0.6);
    fillLight.position.set(W * 1.2, -H * 0.3, 400);
    this.#scene.add(fillLight);
    const rimLight = new _THREE.DirectionalLight(0xffe0b0, 0.8);
    rimLight.position.set(W * 0.5, H * 1.5, 200);
    this.#scene.add(rimLight);
    this.#scene.add(new _THREE.AmbientLight(0x1a1a2e, 1.0));

    this.#meshes = [];

    // Background grid (matching Canvas2D's 50px grid)
    this.#gridMesh = this.#buildGrid(W, H);
    this.#scene.add(this.#gridMesh);

    // Constraint line (reused each frame)
    this.#constraintLine = null;

    // Resize observer
    this.#resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      this.onResize(rect.width, rect.height);
    });
    this.#resizeObserver.observe(this.#renderer.domElement);
  }

  detach() {
    if (this.#resizeObserver && this.#renderer) {
      this.#resizeObserver.unobserve(this.#renderer.domElement);
      this.#resizeObserver = null;
    }
    if (this.#renderer && this.#container) {
      this.#container.removeChild(this.#renderer.domElement);
      this.#renderer.dispose();
      this.#renderer = null;
    }
    if (this.#overlay && this.#container) {
      this.#container.removeChild(this.#overlay);
      this.#overlay = null;
      this.#overlayCtx = null;
    }
    if (this.#gridMesh) {
      this.#gridMesh.geometry.dispose();
      this.#gridMesh.material.dispose();
      this.#gridMesh = null;
    }
    if (this.#constraintLine) {
      this.#constraintLine.geometry.dispose();
      this.#constraintLine.material.dispose();
      this.#constraintLine = null;
    }
    this.#scene = null;
    this.#camera = null;
    this.#meshes = [];

    this.#container = null;
  }

  isAttached() {
    return this.#renderer !== null;
  }

  /** Expose internals for legacy render3d() callbacks. */
  getRenderer() { return this.#renderer; }
  getScene()    { return this.#scene; }
  getCamera()   { return this.#camera; }

  /**
   * Reconcile meshes with the current space and sync each mesh's position
   * and rotation to its body. Mirrors what the default render path does, so
   * additive `render3d` overrides can keep the standard body rendering and
   * only add their own extras (trails, overlays, etc.). Counterpart of
   * PixiJSAdapter#syncBodies.
   */
  syncBodies(space) {
    if (!this.#scene) return;
    this.#syncBodies(space);
    this.#drawConstraintLines(space);
    for (const { mesh, body } of this.#meshes) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;
    }
  }

  // ---------------------------------------------------------------------------
  // Per-demo hooks
  // ---------------------------------------------------------------------------

  onDemoLoad(space, _W, _H) {
    if (!this.#scene) return;
    // Build meshes for all bodies currently in the space
    this.#buildMeshes(space);
  }

  onDemoUnload() {
    if (!this.#scene) return;
    for (const { mesh } of this.#meshes) {
      this.#scene.remove(mesh);
      this.#disposeMesh(mesh);
    }
    this.#meshes = [];
  }

  // ---------------------------------------------------------------------------
  // Per-frame rendering
  // ---------------------------------------------------------------------------

  renderFrame(space, W, H, { showOutlines, overrides, camX = 0, camY = 0 }) {
    if (!this.#renderer || !this.#scene) return;

    if (overrides?.threejs) {
      overrides.threejs(this, space, W, H, showOutlines, camX, camY);
      // Clear + draw overlay if provided
      if (this.#overlayCtx) {
        this.#overlayCtx.clearRect(0, 0, W, H);
        if (overrides?.overlay) {
          overrides.overlay(this.#overlayCtx, space, W, H, camX, camY);
        }
      }
      return;
    }

    // Default rendering: sync body meshes + constraints
    this.#syncBodies(space);
    this.#drawConstraintLines(space);

    for (const { mesh, body } of this.#meshes) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;
    }

    // Apply camera offset (follow target)
    if (camX || camY) {
      const camZ = this.#camera.position.z;
      this.#camera.position.set(W / 2 + camX, -H / 2 - camY, camZ);
      this.#camera.lookAt(W / 2 + camX, -H / 2 - camY, 0);
    }

    this.#renderer.render(this.#scene, this.#camera);

    // 2D overlay
    if (this.#overlayCtx) {
      this.#overlayCtx.clearRect(0, 0, W, H);
      if (overrides?.overlay) {
        overrides.overlay(this.#overlayCtx, space, W, H, camX, camY);
      }
    }
  }

  renderPreview(space, W, H) {
    this.renderFrame(space, W, H, { showOutlines: true, overrides: null });
  }

  // ---------------------------------------------------------------------------
  // Worker mode — render from transform buffer
  // ---------------------------------------------------------------------------

  renderFromTransforms(transforms, shapeDescs, W, H, { showOutlines, overrides }) {
    if (!this.#renderer || !this.#scene) return;

    if (overrides?.threejs) {
      overrides.threejs(this, transforms, shapeDescs, W, H, showOutlines);
      return;
    }

    // Ensure meshes exist for all shape descriptors
    this.#ensureWorkerMeshes(shapeDescs);

    const HEADER = 3;
    const STRIDE = 3;
    const bodyCount = transforms[0] | 0;
    const count = Math.min(bodyCount, this.#meshes.length);

    for (let i = 0; i < count; i++) {
      const off = HEADER + i * STRIDE;
      const mesh = this.#meshes[i].mesh;
      mesh.position.set(transforms[off], -transforms[off + 1], 0);
      mesh.rotation.z = -transforms[off + 2];
      mesh.visible = true;
    }
    for (let i = count; i < this.#meshes.length; i++) {
      this.#meshes[i].mesh.visible = false;
    }

    this.#renderer.render(this.#scene, this.#camera);
  }

  // ---------------------------------------------------------------------------
  // Outline toggle
  // ---------------------------------------------------------------------------

  setOutlines(show) {
    this.#showOutlines = show;
    for (const { edges } of this.#meshes) {
      if (edges) edges.visible = show;
    }
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  onResize(displayW, displayH) {
    if (!displayW || !displayH) return;
    if (this.#renderer) {
      this.#renderer.setSize(Math.round(displayW), Math.round(displayH), false);
    }
    if (this.#camera) {
      const displayAspect = displayW / displayH;
      const sceneAspect = this.#W / this.#H;
      this.#camera.aspect = displayAspect;

      const baseFov = 45;
      if (displayAspect < sceneAspect) {
        const hFov = 2 * Math.atan(Math.tan((baseFov / 2) * Math.PI / 180) * sceneAspect);
        const vFov = 2 * Math.atan(Math.tan(hFov / 2) / displayAspect);
        this.#camera.fov = vFov * 180 / Math.PI;
      } else {
        this.#camera.fov = baseFov;
      }
      this.#camera.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------------------
  // Overlay context
  // ---------------------------------------------------------------------------

  getOverlayCtx() {
    return this.#overlayCtx;
  }

  // ---------------------------------------------------------------------------
  // Engine access (escape hatch for render overrides)
  // ---------------------------------------------------------------------------

  getEngine() {
    return {
      THREE: _THREE,
      scene: this.#scene,
      camera: this.#camera,
      renderer: this.#renderer,
    };
  }

  getElement() {
    return this.#renderer?.domElement ?? null;
  }

  // ---------------------------------------------------------------------------
  // Public mesh helpers (for render overrides that need to add custom meshes)
  // ---------------------------------------------------------------------------

  /** Add a mesh to the scene tracked for body sync. */
  addTrackedMesh(mesh, body, edges = null) {
    this.#scene.add(mesh);
    this.#meshes.push({ mesh, body, edges });
  }

  /** Get tracked meshes array (read-only). */
  getTrackedMeshes() {
    return this.#meshes;
  }

  /** Add an untracked mesh to the scene (for custom visuals like water). */
  addSceneMesh(mesh) {
    this.#scene.add(mesh);
  }

  /** Remove an untracked mesh from the scene. */
  removeSceneMesh(mesh) {
    this.#scene.remove(mesh);
    this.#disposeMesh(mesh);
  }

  // ---------------------------------------------------------------------------
  // Internal: grid + constraint rendering
  // ---------------------------------------------------------------------------

  #buildGrid(W, H) {
    const step = 50;
    const points = [];
    for (let x = 0; x <= W; x += step) {
      points.push(x, 0, 0, x, -H, 0);
    }
    for (let y = 0; y <= H; y += step) {
      points.push(0, -y, 0, W, -y, 0);
    }
    const geom = new _THREE.BufferGeometry();
    geom.setAttribute("position", new _THREE.Float32BufferAttribute(points, 3));
    const mat = new _THREE.LineBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.5 });
    return new _THREE.LineSegments(geom, mat);
  }

  #drawConstraintLines(space) {
    // Remove previous constraint line mesh
    if (this.#constraintLine) {
      this.#scene.remove(this.#constraintLine);
      this.#constraintLine.geometry.dispose();
      this.#constraintLine.material.dispose();
      this.#constraintLine = null;
    }

    try {
      const constraints = space.constraints;
      const len = constraints.length;
      if (len === 0) return;

      // The static "world body" anchor used by joints like
      // AngleJoint(space.world, body, ...) sits at the world origin
      // (0,0). Drawing a line from every participating body to (0,0)
      // is visual noise — fan-out toward the world origin — so skip
      // those joints. We check wrapper identity, internal zpp_inner
      // identity, and finally any static body at exactly (0,0) — the
      // last is a defensive fallback for cases where the wrapper
      // accessor returns a freshly-wrapped Body each access.
      const world = space.world;
      const worldInner = world?.zpp_inner ?? world;
      const points = [];
      for (let i = 0; i < len; i++) {
        const c = constraints.at(i);
        const b1 = c.body1;
        const b2 = c.body2;
        if (!b1 || !b2) continue;
        if (b1 === world || b2 === world) continue;
        const b1Inner = b1.zpp_inner ?? b1;
        const b2Inner = b2.zpp_inner ?? b2;
        if (worldInner && (b1Inner === worldInner || b2Inner === worldInner)) continue;
        const b1Static = typeof b1.isStatic === "function" ? b1.isStatic() : !!b1.isStatic;
        const b2Static = typeof b2.isStatic === "function" ? b2.isStatic() : !!b2.isStatic;
        const b1AtOrigin = b1Static && b1.position.x === 0 && b1.position.y === 0;
        const b2AtOrigin = b2Static && b2.position.x === 0 && b2.position.y === 0;
        if (b1AtOrigin || b2AtOrigin) continue;
        points.push(
          b1.position.x, -b1.position.y, 0,
          b2.position.x, -b2.position.y, 0,
        );
      }
      if (points.length === 0) return;

      const geom = new _THREE.BufferGeometry();
      geom.setAttribute("position", new _THREE.Float32BufferAttribute(points, 3));
      const mat = new _THREE.LineBasicMaterial({
        color: CONSTRAINT_COLOR_HEX,
        transparent: true,
        opacity: 0.2,
      });
      this.#constraintLine = new _THREE.LineSegments(geom, mat);
      this.#scene.add(this.#constraintLine);
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Internal: body mesh management
  // ---------------------------------------------------------------------------

  #buildMeshes(space) {
    for (const body of space.bodies) {
      this.#addBodyMesh(body);
    }
  }

  #syncBodies(space) {
    // Remove meshes for bodies no longer in the space
    const spaceBodies = new Set();
    for (const body of space.bodies) spaceBodies.add(body);

    for (let i = this.#meshes.length - 1; i >= 0; i--) {
      const entry = this.#meshes[i];
      if (!spaceBodies.has(entry.body)) {
        this.#scene.remove(entry.mesh);
        this.#disposeMesh(entry.mesh);
        this.#meshes.splice(i, 1);
      }
    }

    // Add meshes for newly appeared bodies
    const tracked = new Set(this.#meshes.map(m => m.body));
    for (const body of space.bodies) {
      if (!tracked.has(body)) this.#addBodyMesh(body);
    }
  }

  #addBodyMesh(body) {
    if (body.userData?._hidden3d || body.userData?._hidden) return;
    for (const shape of body.shapes) {
      let geom;
      // Circle/Capsule geometry is centred on the shape's own origin, and the
      // mesh is positioned from the BODY transform — so a shape placed off the
      // body origin (e.g. `new Circle(r, new Vec2(x, y))`, common for compound
      // static geometry) must have its localCOM baked into the geometry or it
      // renders at the body centre instead. Polygons already carry the offset
      // in localVerts, so they must NOT be shifted again.
      let offX = 0, offY = 0;
      if (!shape.isPolygon()) {
        const com = shape.localCOM;
        offX = com.x;
        offY = com.y;
      }
      if (shape.isCircle()) {
        geom = new _THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
      } else if (shape.isCapsule()) {
        // True 3D capsule (cylinder + 2 hemispheres). Three's CapsuleGeometry
        // is built along the +Y axis; nape's capsule spine runs along +X, so
        // we rotate the geometry 90° around Z to match. Body rotation is
        // applied per-frame in the render loop (mesh.rotation.z).
        const cap = shape.castCapsule;
        const r = cap.radius;
        const length = cap.halfLength * 2; // cylinder portion only
        geom = new _THREE.CapsuleGeometry(r, length, 8, 16);
        geom.rotateZ(Math.PI / 2);
      } else if (shape.isPolygon()) {
        const verts = shape.castPolygon.localVerts;
        const len = verts.length;
        if (len < 3) continue;
        const pts = [];
        for (let i = 0; i < len; i++) {
          pts.push(new _THREE.Vector2(verts.at(i).x, verts.at(i).y));
        }
        geom = new _THREE.ExtrudeGeometry(
          new _THREE.Shape(pts),
          { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 },
        );
        geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
        geom.computeVertexNormals();
        geom.translate(0, 0, -15);
      }
      if (!geom) continue;
      // World Y is flipped in the three.js scene, so the offset is too.
      if (offX || offY) geom.translate(offX, -offY, 0);

      const color = bodyColorHex(body);
      const isZone = !!body.userData?._isZone;
      const isSensor = !!shape.sensorEnabled;
      const isFluid = !!shape.fluidEnabled;
      const useTransparent = isZone || isSensor || isFluid;

      let material;
      if (isFluid) {
        // Fluid shapes: translucent blue water-like appearance
        material = new _THREE.MeshPhongMaterial({
          color: 0x1e90ff,
          transparent: true,
          opacity: 0.3,
          shininess: 100,
          specular: 0x444444,
          side: _THREE.DoubleSide,
        });
      } else if (useTransparent) {
        // Sensors / zones: wireframe
        material = new _THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: 0.5,
        });
      } else {
        material = new _THREE.MeshPhongMaterial({
          color,
          shininess: 80,
          specular: 0x444444,
          side: _THREE.DoubleSide,
        });
      }

      const mesh = new _THREE.Mesh(geom, material);
      this.#scene.add(mesh);

      const edges = new _THREE.LineSegments(
        new _THREE.EdgesGeometry(geom, 15),
        new _THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.6,
        }),
      );
      edges.visible = this.#showOutlines;
      mesh.add(edges);

      this.#meshes.push({ mesh, body, edges });
    }
  }

  #lastWorkerDescs = null;

  #ensureWorkerMeshes(shapeDescs) {
    // Rebuild all meshes when shapeDescs changes (body order may shift)
    if (this.#lastWorkerDescs !== shapeDescs) {
      this.#lastWorkerDescs = shapeDescs;
      for (const { mesh } of this.#meshes) {
        this.#scene.remove(mesh);
        this.#disposeMesh(mesh);
      }
      this.#meshes = [];
    }

    // Build meshes for shapes that don't have a mesh yet
    for (let i = this.#meshes.length; i < shapeDescs.length; i++) {
      const sd = shapeDescs[i];
      const mesh = this.#createWorkerMesh(sd, i);
      if (mesh) {
        this.#scene.add(mesh.mesh);
        this.#meshes.push(mesh);
      }
    }
  }

  #createWorkerMesh(sd, idx) {
    let geom;
    const isWall = !!sd.wall;

    if (sd.circle) {
      geom = new _THREE.SphereGeometry(sd.radius, 16, 16);
    } else {
      const pts = [
        new _THREE.Vector2(-sd.hw, -sd.hh),
        new _THREE.Vector2(sd.hw, -sd.hh),
        new _THREE.Vector2(sd.hw, sd.hh),
        new _THREE.Vector2(-sd.hw, sd.hh),
      ];
      geom = new _THREE.ExtrudeGeometry(
        new _THREE.Shape(pts),
        {
          depth: 30,
          bevelEnabled: !isWall,
          bevelSize: 2,
          bevelThickness: 2,
          bevelSegments: 2,
        },
      );
      geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
      geom.computeVertexNormals();
      geom.translate(0, 0, -15);
    }

    const color = isWall ? 0x455a64 : MESH_COLORS[idx % MESH_COLORS.length];
    const mesh = new _THREE.Mesh(
      geom,
      new _THREE.MeshPhongMaterial({
        color,
        shininess: 80,
        specular: 0x444444,
        side: _THREE.DoubleSide,
      }),
    );
    const edges = new _THREE.LineSegments(
      new _THREE.EdgesGeometry(geom, 15),
      new _THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
      }),
    );
    edges.visible = this.#showOutlines;
    mesh.add(edges);

    return { mesh, body: null, edges };
  }

  #disposeMesh(mesh) {
    mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
  }
}
