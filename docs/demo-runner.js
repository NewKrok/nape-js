/**
 * DemoRunner — shared physics demo runtime for nape-js demo pages.
 *
 * Handles:
 *  - 2D canvas and Three.js 3D rendering
 *  - rAF loop with FPS / step-time measurement
 *  - Pointer event interaction forwarding to demo callbacks
 *  - Live stats DOM wiring
 *
 * Usage (homepage):
 *   const runner = new DemoRunner(canvasWrapEl, { W: 900, H: 500 });
 *   runner.wireStats({ fps: fpsEl, bodies: bodiesEl, step: stepEl });
 *   runner.wireInteraction(canvasWrapEl);
 *   runner.load(demoDef);
 *   runner.start();
 *
 * Usage (examples grid):
 *   const runner = new DemoRunner(cardContainerEl, { W: 480, H: 280 });
 *   runner.wireStats({ fps, bodies, step });
 *   runner.wireInteraction(cardContainerEl);
 *   // play button click:
 *   runner.load(demoDef); runner.start();
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
} from "./nape-js.esm.js";
import {
  drawBody, drawConstraints, drawGrid,
} from "./renderer.js";

// =========================================================================
// Three.js — lazy-loaded once, shared across all DemoRunner instances
// =========================================================================

let _THREE = null;

/** Pre-load Three.js. Call before setMode("3d"). */
export async function loadThree() {
  if (_THREE) return _THREE;
  _THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js");
  return _THREE;
}

const MESH_COLORS = [
  0x4fc3f7, 0xffb74d, 0x81c784, 0xef5350,
  0xce93d8, 0x4dd0e1, 0xfff176, 0xff8a65,
];

// =========================================================================
// Shared helpers — exported so demo files can import them
// =========================================================================

/** Per-space color counters so multiple DemoRunner instances don't interfere. */
const _spaceCounts = new WeakMap();

export function addWalls(space, W, H) {
  const t = 20;
  const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - t / 2));
  floor.shapes.add(new Polygon(Polygon.box(W, t)));
  floor.space = space;
  const left = new Body(BodyType.STATIC, new Vec2(t / 2, H / 2));
  left.shapes.add(new Polygon(Polygon.box(t, H)));
  left.space = space;
  const right = new Body(BodyType.STATIC, new Vec2(W - t / 2, H / 2));
  right.shapes.add(new Polygon(Polygon.box(t, H)));
  right.space = space;
  const ceil = new Body(BodyType.STATIC, new Vec2(W / 2, t / 2));
  ceil.shapes.add(new Polygon(Polygon.box(W, t)));
  ceil.space = space;
}

export function spawnRandomShape(space, x, y, opts = {}) {
  const { minR = 5, maxR = 20, minW = 8, maxW = 34 } = opts;
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(minR + Math.random() * (maxR - minR)));
  } else {
    const w = minW + Math.random() * (maxW - minW);
    const h = minW + Math.random() * (maxW - minW);
    body.shapes.add(new Polygon(Polygon.box(w, h)));
  }
  const count = _spaceCounts.get(space) ?? 0;
  _spaceCounts.set(space, count + 1);
  try { body.userData._colorIdx = count; } catch (_) {}
  body.space = space;
  return body;
}

// =========================================================================
// Syntax highlighter — exported for app.js code panel + examples view-code
// =========================================================================

export function highlightCode(code) {
  code = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const re = new RegExp([
    "(\\/\\/.*)",
    '("(?:[^"\\\\]|\\\\.)*")',
    "('(?:[^'\\\\]|\\\\.)*')",
    "(`(?:[^`\\\\]|\\\\.)*`)",
    "\\b(import|from|export|const|let|var|new|for|if|else|return|function|class|extends|of|in|true|false|null|undefined|typeof|this|continue|break)\\b",
    "\\b(\\d+\\.?\\d*)\\b",
    "\\b(Space|Body|BodyType|Vec2|Circle|Polygon|PivotJoint|DistanceJoint|AngleJoint|WeldJoint|MotorJoint|LineJoint|PulleyJoint|Material|InteractionFilter|InteractionGroup|CbType|CbEvent|InteractionType|InteractionListener|PreListener|PreFlag|MarchingSquares|AABB|GeomPoly|Math|THREE|Map)\\b",
  ].join("|"), "g");

  return code.replace(re, (match, comment, dStr, sStr, tStr, kw, num, type) => {
    if (comment !== undefined) return `<span class="cm">${comment}</span>`;
    if (dStr !== undefined)   return `<span class="str">${dStr}</span>`;
    if (sStr !== undefined)   return `<span class="str">${sStr}</span>`;
    if (tStr !== undefined)   return `<span class="str">${tStr}</span>`;
    if (kw !== undefined)     return `<span class="kw">${kw}</span>`;
    if (num !== undefined)    return `<span class="num">${num}</span>`;
    if (type !== undefined)   return `<span class="type">${type}</span>`;
    return match;
  });
}

// =========================================================================
// DemoRunner
// =========================================================================

export class DemoRunner {
  // Container element (the wrapping div that holds the canvas / WebGL canvas)
  #container;
  #W; #H;

  // 2D state
  #canvas;
  #ctx;

  // 3D state
  #threeRenderer = null;
  #threeScene    = null;
  #threeCamera   = null;
  #threeMeshes   = [];
  #threeOverlay  = null;  // 2D canvas overlay for 3D mode (cursor hints etc.)
  #threeOverlayCtx = null;

  // Runtime state
  #mode    = "2d";
  #space   = null;
  #demo    = null;
  #animId  = null;
  #debugDraw = true;  // true = show outlines (normal); false = dark silhouettes
  #resizeObserver = null;

  // FPS tracking
  #lastTime   = 0;
  #frameCount = 0;
  #fpsAccum   = 0;

  // Stats DOM elements
  #statsFps    = null;
  #statsBodies = null;
  #statsStep   = null;

  /**
   * @param {Element} container - wrapping element (holds canvas / WebGL canvas)
   * @param {{ W?: number, H?: number, canvas?: HTMLCanvasElement }} options
   *   Pass `canvas` to reuse an existing <canvas> element (homepage use case).
   *   Otherwise a new canvas is created and appended to container.
   */
  constructor(container, { W, H, canvas: existingCanvas } = {}) {
    this.#container = container;
    this.#W = W ?? 900;
    this.#H = H ?? 500;

    const dpr = window.devicePixelRatio || 1;

    if (existingCanvas) {
      this.#canvas = existingCanvas;
      // Upscale the existing canvas buffer for HiDPI displays.
      // W/H hold the logical size passed by the caller; set the physical buffer
      // to dpr× while letting CSS (width:100%; height:auto) handle layout.
      this.#canvas.width  = this.#W * dpr;
      this.#canvas.height = this.#H * dpr;
    } else {
      this.#canvas = document.createElement("canvas");
      this.#canvas.width  = this.#W * dpr;
      this.#canvas.height = this.#H * dpr;
      this.#canvas.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain";
      container.appendChild(this.#canvas);
    }
    this.#ctx = this.#canvas.getContext("2d");
    this.#ctx.scale(dpr, dpr);

    // ResizeObserver — only needed for 3D renderer; 2D canvas keeps fixed resolution.
    // We observe the canvas itself (not the container) because the container is sized
    // by aspect-ratio CSS and has no intrinsic height when canvas is absolute-positioned.
    this.#resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      this.#onResize(rect.width, rect.height);
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  get isRunning()    { return this.#animId !== null; }
  get currentDemo()  { return this.#demo; }
  get mode()         { return this.#mode; }
  get space()        { return this.#space; }
  get debugDraw()    { return this.#debugDraw; }

  set debugDraw(val) {
    this.#debugDraw = val;
    for (const { edges } of this.#threeMeshes) {
      if (edges) edges.visible = val;
    }
  }

  /** Load a demo definition. Tears down the old space and runs setup(). */
  load(demoDef, { preview = false } = {}) {
    this.stop();
    this.#demo  = demoDef;
    this.#space = null;

    // Clear 3D meshes from previous demo
    if (this.#threeScene) {
      for (const { mesh } of this.#threeMeshes) this.#threeScene.remove(mesh);
      this.#threeMeshes = [];
    }

    // Create space, run demo setup
    const space = new Space();
    this.#space = space;
    demoDef.setup(space, this.#W, this.#H);

    // Optional init hook: passes the canvas container element so demos can
    // attach DOM-level listeners (e.g. drag-and-drop file handlers).
    // Skipped during preview-only renders to avoid DOM side-effects.
    if (!preview) demoDef.init?.(this.#container, this.#W, this.#H);

    // Build 3D meshes if already in 3D mode
    if (this.#mode === "3d" && this.#threeScene) {
      this.#buildMeshes();
    }
  }

  /**
   * Async variant of load(). If the demo exports a `preload()` function it is
   * awaited before setup() is called — useful for fetching images or other
   * async resources. Falls back to synchronous load() when no preload exists.
   *
   * @returns {Promise<void>}
   */
  async loadAsync(demoDef) {
    if (demoDef.preload) await demoDef.preload();
    this.load(demoDef);
  }

  /** Begin the rAF loop. */
  start() {
    if (this.#animId) return;
    this.#lastTime  = performance.now();
    this.#frameCount = 0;
    this.#fpsAccum  = 0;
    this.#tick();
  }

  /** Pause the rAF loop (space and state are preserved). */
  stop() {
    if (this.#animId) {
      cancelAnimationFrame(this.#animId);
      this.#animId = null;
    }
  }

  /**
   * Load a demo, run one physics step, render a single frame, then stop.
   * Used for generating static preview thumbnails on the examples grid.
   */
  renderPreview(demoDef) {
    this.load(demoDef, { preview: true });
    this.#space.step(1 / 60, demoDef.velocityIterations ?? 8, demoDef.positionIterations ?? 3);
    this.#render2d();
  }

  /**
   * Async variant of renderPreview(). Awaits preload() if present before
   * loading and rendering the preview frame.
   *
   * @returns {Promise<void>}
   */
  async renderPreviewAsync(demoDef) {
    if (demoDef.preload) await demoDef.preload();
    this.load(demoDef, { preview: true });
    this.#space.step(1 / 60, demoDef.velocityIterations ?? 8, demoDef.positionIterations ?? 3);
    this.#render2d();
  }

  /**
   * Switch render mode. Call `await loadThree()` before setMode("3d").
   * Restarts the loop if it was running.
   */
  setMode(mode) {
    if (mode === this.#mode) return;
    const wasRunning = this.isRunning;
    this.stop();
    this.#mode = mode;

    if (mode === "3d") {
      this.#setup3d();
      if (this.#space) this.#buildMeshes();
    } else {
      this.#teardown3d();
    }

    if (wasRunning) this.start();
  }

  /**
   * Wire FPS / body-count / step-time DOM elements.
   * Each is a DOM element whose textContent is updated each frame.
   */
  wireStats({ fps, bodies, step } = {}) {
    this.#statsFps    = fps    ?? null;
    this.#statsBodies = bodies ?? null;
    this.#statsStep   = step   ?? null;
  }

  /**
   * Attach pointer-event interaction to an element.
   * Forwards pointerdown → demo.click, pointermove → demo.drag,
   * pointerup/cancel → demo.release.
   */
  wireInteraction(el) {
    el.style.touchAction = "none";
    el.style.userSelect  = "none";

    let isDragging = false;

    const getPos = (e) => {
      const rect = el.getBoundingClientRect();
      // Account for object-fit:contain letterboxing on the 2D canvas.
      // The canvas preserves W:H aspect ratio inside the container rect.
      const aspect  = this.#W / this.#H;
      const fitW    = Math.min(rect.width, rect.height * aspect);
      const fitH    = fitW / aspect;
      const padX    = (rect.width  - fitW) / 2;
      const padY    = (rect.height - fitH) / 2;
      return {
        x: ((e.clientX - rect.left) - padX) * (this.#W / fitW),
        y: ((e.clientY - rect.top)  - padY) * (this.#H / fitH),
      };
    };

    el.addEventListener("pointerdown", (e) => {
      if (!this.#space || !this.#demo) return;
      // Don't capture pointer when clicking overlay controls (2D/3D toggle, fullscreen, etc.)
      if (e.target.closest(".canvas-controls")) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      isDragging = true;
      const { x, y } = getPos(e);
      this.#demo.click?.(x, y, this.#space, this.#W, this.#H);
    });

    el.addEventListener("pointermove", (e) => {
      if (!this.#space || !this.#demo) return;
      const { x, y } = getPos(e);
      // Always forward hover position (e.g. for cursor indicators)
      this.#demo.hover?.(x, y, this.#space, this.#W, this.#H);
      if (!isDragging) return;
      e.preventDefault();
      this.#demo.drag?.(x, y, this.#space, this.#W, this.#H);
    });

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      this.#demo?.release?.(this.#space);
    };
    el.addEventListener("pointerup",     endDrag);
    el.addEventListener("pointercancel", endDrag);

    el.addEventListener("wheel", (e) => {
      if (!this.#space || !this.#demo?.wheel) return;
      e.preventDefault();
      this.#demo.wheel(e.deltaY, this.#space, this.#W, this.#H);
    }, { passive: false });
  }

  // -----------------------------------------------------------------------
  // rAF loop
  // -----------------------------------------------------------------------

  #tick() {
    const now = performance.now();
    const dt  = now - this.#lastTime;
    this.#lastTime = now;

    // FPS (update every 500ms)
    this.#frameCount++;
    this.#fpsAccum += dt;
    if (this.#fpsAccum >= 500) {
      const fps = Math.round((this.#frameCount / this.#fpsAccum) * 1000);
      if (this.#statsFps) this.#statsFps.textContent = `FPS: ${fps}`;
      this.#frameCount = 0;
      this.#fpsAccum   = 0;
    }

    if (this.#space) {
      // Per-frame demo hook (e.g. custom gravity application)
      this.#demo?.step?.(this.#space, this.#W, this.#H);

      // Physics step
      const stepStart = performance.now();
      this.#space.step(
        1 / 60,
        this.#demo?.velocityIterations ?? 8,
        this.#demo?.positionIterations ?? 3,
      );
      const stepMs = performance.now() - stepStart;

      if (this.#statsStep)   this.#statsStep.textContent   = `Step: ${stepMs.toFixed(2)}ms`;
      if (this.#statsBodies) this.#statsBodies.textContent = `Bodies: ${this.#space.bodies.length}`;

      // Render
      if (this.#mode === "3d" && this.#threeRenderer) {
        if (this.#demo?.render3d) {
          this.#demo.render3d(this.#threeRenderer, this.#threeScene, this.#threeCamera, this.#space, this.#W, this.#H);
        } else {
          this.#render3d();
        }
      } else {
        this.#render2d();
      }
    }

    this.#animId = requestAnimationFrame(() => this.#tick());
  }

  // -----------------------------------------------------------------------
  // 2D rendering
  // -----------------------------------------------------------------------

  #render2d() {
    const ctx = this.#ctx;
    const W = this.#W, H = this.#H;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (this.#demo?.render) {
      this.#demo.render(ctx, this.#space, W, H, this.#debugDraw);
    } else {
      drawGrid(ctx, W, H);
      drawConstraints(ctx, this.#space);
      for (const body of this.#space.bodies) drawBody(ctx, body, this.#debugDraw);
    }
  }

  // -----------------------------------------------------------------------
  // Resize handling
  // -----------------------------------------------------------------------

  #onResize(displayW, displayH) {
    if (!displayW || !displayH) return;
    // 3D renderer: update internal resolution and camera aspect.
    // updateStyle=false keeps our CSS width/height:100% intact.
    if (this.#threeRenderer) {
      this.#threeRenderer.setSize(Math.round(displayW), Math.round(displayH), false);
      if (this.#threeCamera) {
        const displayAspect = displayW / displayH;
        const sceneAspect   = this.#W / this.#H;
        this.#threeCamera.aspect = displayAspect;

        // Adjust FOV so the full W×H scene is always visible ("contain" fit).
        // Base FOV (45°) was computed for sceneAspect; when the display is
        // wider we keep the vertical FOV, when it's taller we widen it so
        // the full width still fits.
        const baseFov = 45;
        if (displayAspect < sceneAspect) {
          // Display is taller/narrower — need wider vertical FOV
          const hFov = 2 * Math.atan(Math.tan((baseFov / 2) * Math.PI / 180) * sceneAspect);
          const vFov = 2 * Math.atan(Math.tan(hFov / 2) / displayAspect);
          this.#threeCamera.fov = vFov * 180 / Math.PI;
        } else {
          this.#threeCamera.fov = baseFov;
        }
        this.#threeCamera.updateProjectionMatrix();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Three.js 3D rendering
  // -----------------------------------------------------------------------

  #setup3d() {
    if (!_THREE) return;

    // Remove any old WebGL canvas
    if (this.#threeRenderer) {
      this.#container.removeChild(this.#threeRenderer.domElement);
      this.#threeRenderer.dispose();
    }

    // Pin the container height before hiding the 2D canvas.
    // The canvas provides the container's implicit height (height:auto CSS);
    // hiding it without first pinning would collapse the container to ~0,
    // making getBoundingClientRect return 0 and the 3D renderer invisible.
    const cr = this.#container.getBoundingClientRect();
    this.#container.style.height = `${cr.height}px`;

    this.#canvas.style.display = "none";

    const W = this.#W, H = this.#H;
    const fov    = 45;
    const aspect = W / H;
    const camZ   = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / aspect;

    this.#threeScene  = new _THREE.Scene();
    this.#threeScene.background = new _THREE.Color(0x0d1117);
    this.#threeCamera = new _THREE.PerspectiveCamera(fov, aspect, 1, camZ * 6);
    this.#threeCamera.position.set(W / 2, -H / 2, camZ);
    this.#threeCamera.lookAt(W / 2, -H / 2, 0);

    // Initial size from the rect measured above
    const displayW = Math.round(cr.width)  || W;
    const displayH = Math.round(cr.height) || Math.round(displayW * (H / W));
    this.#threeRenderer = new _THREE.WebGLRenderer({ antialias: true });
    this.#threeRenderer.setSize(displayW, displayH, false);
    this.#threeRenderer.domElement.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%";
    this.#container.appendChild(this.#threeRenderer.domElement);

    // 2D overlay canvas for demos that need cursor hints etc. in 3D mode
    this.#threeOverlay = document.createElement("canvas");
    this.#threeOverlay.width = W;
    this.#threeOverlay.height = H;
    this.#threeOverlay.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
    this.#threeOverlayCtx = this.#threeOverlay.getContext("2d");
    this.#container.appendChild(this.#threeOverlay);

    // Watch the Three.js canvas for resize (it has real CSS dimensions unlike the container)
    this.#resizeObserver.observe(this.#threeRenderer.domElement);

    // 3-point lighting
    const keyLight = new _THREE.DirectionalLight(0xfff5e0, 2.0);
    keyLight.position.set(-W * 0.3, H * 0.6, 800);
    this.#threeScene.add(keyLight);
    const fillLight = new _THREE.DirectionalLight(0xadd8ff, 0.6);
    fillLight.position.set(W * 1.2, -H * 0.3, 400);
    this.#threeScene.add(fillLight);
    const rimLight = new _THREE.DirectionalLight(0xffe0b0, 0.8);
    rimLight.position.set(W * 0.5, H * 1.5, 200);
    this.#threeScene.add(rimLight);
    this.#threeScene.add(new _THREE.AmbientLight(0x1a1a2e, 1.0));

    this.#threeMeshes = [];
  }

  #teardown3d() {
    if (this.#threeRenderer) {
      this.#resizeObserver.unobserve(this.#threeRenderer.domElement);
      this.#container.removeChild(this.#threeRenderer.domElement);
      this.#threeRenderer.dispose();
      this.#threeRenderer = null;
    }
    this.#threeScene  = null;
    this.#threeCamera = null;
    this.#threeMeshes = [];
    if (this.#threeOverlay) {
      this.#container.removeChild(this.#threeOverlay);
      this.#threeOverlay = null;
      this.#threeOverlayCtx = null;
    }
    this.#canvas.style.display = "";
    this.#container.style.height = "";
  }

  #buildMeshes() {
    if (!this.#space || !this.#threeScene) return;
    for (const body of this.#space.bodies) {
      this.#addBodyMesh(body);
    }
  }

  #addBodyMesh(body) {
    if (body.userData?._hidden3d) return;
    for (const shape of body.shapes) {
      let geom;
      if (shape.isCircle()) {
        geom = new _THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
      } else if (shape.isCapsule()) {
        const cap = shape.castCapsule;
        const hl = cap.halfLength;
        const r = cap.radius;
        // Build capsule cross-section as a 2D shape (stadium)
        const pts = [];
        const segs = 12;
        // Right semicircle
        for (let i = -segs; i <= segs; i++) {
          const a = (i / segs) * Math.PI / 2;
          pts.push(new _THREE.Vector2(hl + Math.cos(a) * r, Math.sin(a) * r));
        }
        // Left semicircle (top-to-bottom to continue from right semicircle end)
        for (let i = -segs; i <= segs; i++) {
          const a = Math.PI + (i / segs) * Math.PI / 2;
          pts.push(new _THREE.Vector2(-hl + Math.cos(a) * r, Math.sin(a) * r));
        }
        geom = new _THREE.ExtrudeGeometry(
          new _THREE.Shape(pts),
          { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 },
        );
        geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
        geom.computeVertexNormals();
        geom.translate(0, 0, -15);
      } else if (shape.isPolygon()) {
        const verts = shape.castPolygon.localVerts;
        const len   = verts.length;
        if (len < 3) continue;
        const pts = [];
        for (let i = 0; i < len; i++) pts.push(new _THREE.Vector2(verts.at(i).x, verts.at(i).y));
        geom = new _THREE.ExtrudeGeometry(
          new _THREE.Shape(pts),
          { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 },
        );
        geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
        geom.computeVertexNormals();
        geom.translate(0, 0, -15);
      }
      if (!geom) continue;

      const cIdx  = (body.userData?._colorIdx ?? 0) % MESH_COLORS.length;
      const color = body.isStatic() ? 0x455a64 : MESH_COLORS[cIdx];
      const mesh  = new _THREE.Mesh(
        geom,
        new _THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444, side: _THREE.DoubleSide }),
      );
      this.#threeScene.add(mesh);

      const edges = new _THREE.LineSegments(
        new _THREE.EdgesGeometry(geom, 15),
        new _THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      );
      edges.visible = this.#debugDraw;
      mesh.add(edges);
      this.#threeMeshes.push({ mesh, body, edges });
    }
  }

  #render3d() {
    // Remove meshes for bodies no longer in the space (e.g. destroyed terrain cells)
    const spaceBodies = new Set();
    for (const body of this.#space.bodies) spaceBodies.add(body);

    for (let i = this.#threeMeshes.length - 1; i >= 0; i--) {
      const entry = this.#threeMeshes[i];
      if (!spaceBodies.has(entry.body)) {
        this.#threeScene.remove(entry.mesh);
        entry.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        this.#threeMeshes.splice(i, 1);
      }
    }

    // Sync bodies that appeared after setup (e.g. click-spawned, rebuilt terrain)
    const tracked = new Set(this.#threeMeshes.map(m => m.body));
    for (const body of this.#space.bodies) {
      if (!tracked.has(body)) this.#addBodyMesh(body);
    }

    for (const { mesh, body } of this.#threeMeshes) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;
    }

    this.#threeRenderer.render(this.#threeScene, this.#threeCamera);

    // 2D overlay for demos that need it (e.g. cursor indicators)
    if (this.#threeOverlayCtx && this.#demo?.render3dOverlay) {
      const oc = this.#threeOverlayCtx;
      oc.clearRect(0, 0, this.#W, this.#H);
      this.#demo.render3dOverlay(oc, this.#space, this.#W, this.#H);
    }
  }
}
