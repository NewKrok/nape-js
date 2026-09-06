/**
 * DemoRunner — shared physics demo runtime for nape-js demo pages.
 *
 * Handles:
 *  - rAF loop with FPS / step-time measurement
 *  - Pointer event interaction forwarding to demo callbacks
 *  - Live stats DOM wiring
 *  - Pluggable renderer adapters (Canvas2D, Three.js, PixiJS, etc.)
 *  - Automatic wall creation from demo config
 *
 * Usage:
 *   import { Canvas2DAdapter } from "./renderers/canvas2d-adapter.js?v=3.42.0";
 *   import { ThreeJSAdapter } from "./renderers/threejs-adapter.js?v=3.42.0";
 *
 *   const runner = new DemoRunner(canvasWrapEl, { W: 900, H: 500 });
 *   runner.registerAdapter(new Canvas2DAdapter());
 *   runner.registerAdapter(new ThreeJSAdapter());
 *   runner.setMode("canvas2d");
 *   runner.wireStats({ fps, bodies, step });
 *   runner.wireInteraction(canvasWrapEl);
 *   runner.load(demoDef);
 *   runner.start();
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
} from "./nape-js.esm.js?v=3.42.0";
import { createWalls } from "./walls.js?v=3.42.0";
import { WorkerPhysicsBridge } from "./worker-bridge.js?v=3.42.0";

// =========================================================================
// Shared helpers — exported so demo files can import them
// =========================================================================

/** Per-space color counters so multiple DemoRunner instances don't interfere. */
const _spaceCounts = new WeakMap();

/**
 * Legacy addWalls() — kept for backward compatibility during migration.
 * New demos should use `walls: true` config instead.
 * @deprecated Use demo `walls` config instead
 */
export function addWalls(space, W, H) {
  createWalls(space, W, H, true);
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
    "\\b(Space|Body|BodyType|Vec2|Circle|Polygon|Capsule|PivotJoint|DistanceJoint|AngleJoint|WeldJoint|MotorJoint|LineJoint|PulleyJoint|Material|InteractionFilter|InteractionGroup|CbType|CbEvent|InteractionType|InteractionListener|PreListener|PreFlag|MarchingSquares|AABB|GeomPoly|FluidProperties|Broadphase|Math|THREE|PIXI|Map)\\b",
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
  #container;
  #W; #H;

  // Adapter system
  #adapters = new Map();     // id -> RendererAdapter instance
  #activeAdapter = null;     // Currently active adapter
  #defaultAdapterId = null;  // First registered adapter ID

  // Runtime state
  #space   = null;
  #demo    = null;
  #animId  = null;
  #debugDraw = true;
  #showProfiler = false;
  #profilerState = null;  // lazy-init on first toggle

  // Camera state (opt-in per demo via demo.camera config)
  #camX = 0;
  #camY = 0;
  #cameraConfig = null;  // { follow, offsetX, offsetY, bounds, lerp, deadzone }

  // Camera shake — superimposes a decaying random offset on top of the
  // smoothed camera position. Use shakeCamera(amplitude, duration) to trigger.
  #shakeAmp = 0;       // current peak amplitude in px
  #shakeRemaining = 0; // seconds left
  #shakeTotal = 0;     // duration of current shake (for decay normalisation)
  #shakeOffX = 0;      // last applied offset (so we can undo before next update)
  #shakeOffY = 0;

  // Worker bridge
  #workerBridge = null;
  #workerMode = false;

  // Physics-pause flag — when true, #tick() still renders + calls demo.step()
  // but skips space.step() entirely. Used by demos that pause-and-scrub
  // through serialized history (P71 save/load+rewind).
  #physicsPaused = false;

  // FPS tracking
  #lastTime   = 0;
  #frameCount = 0;
  #fpsAccum   = 0;

  // Fixed-timestep accumulator (prevents 2× speed on 120 Hz displays)
  #accumulator = 0;
  static FIXED_DT = 1 / 60;            // 16.667 ms
  static MAX_FRAME_TIME = 1 / 15;       // cap to avoid spiral of death

  // Stats DOM elements
  #statsFps    = null;
  #statsBodies = null;
  #statsStep   = null;

  /**
   * @param {Element} container - wrapping element (holds canvases)
   * @param {{ W?: number, H?: number }} options
   */
  constructor(container, { W, H } = {}) {
    this.#container = container;
    this.#W = W ?? 900;
    this.#H = H ?? 500;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  get isRunning()    { return this.#animId !== null; }
  get currentDemo()  { return this.#demo; }
  get space()        { return this.#space; }
  get debugDraw()    { return this.#debugDraw; }

  /** Current camera offset (read-only). */
  get camera() { return { x: this.#camX, y: this.#camY }; }

  /** Returns the active adapter ID (e.g. "canvas2d", "threejs", "pixijs"). */
  get mode() {
    return this.#activeAdapter?.id ?? this.#defaultAdapterId ?? "canvas2d";
  }

  set debugDraw(val) {
    this.#debugDraw = val;
    this.#activeAdapter?.setOutlines(val);
  }

  get showProfiler() { return this.#showProfiler; }
  set showProfiler(val) {
    this.#showProfiler = val;
    if (val && this.#space) {
      this.#space.profilerEnabled = true;
      if (!this.#profilerState) this.#profilerState = createProfilerState();
    }
    if (!val && this.#space) {
      this.#space.profilerEnabled = false;
    }
  }

  get workerMode() { return this.#workerMode; }

  get physicsPaused() { return this.#physicsPaused; }
  set physicsPaused(val) { this.#physicsPaused = !!val; }

  /** Returns an array of registered adapter IDs. */
  getAvailableAdapters() {
    return [...this.#adapters.values()].map(a => ({
      id: a.id,
      displayName: a.displayName,
    }));
  }

  /**
   * Toggle Web Worker mode. When enabled, physics runs off-thread.
   * Only works for demos with `workerCompatible: true`.
   */
  async toggleWorker(enable) {
    if (enable === this.#workerMode) return;

    const wasRunning = this.isRunning;
    this.stop();

    if (enable && this.#demo) {
      // Clear adapter state from main-thread mode before switching to worker
      this.#activeAdapter?.onDemoUnload();

      // Create and init worker bridge
      this.#workerBridge = new WorkerPhysicsBridge(this.#demo, {
        W: this.#W,
        H: this.#H,
      });
      await this.#workerBridge.init();
      this.#workerMode = true;
      if (wasRunning) {
        this.#workerBridge.start();
        this.start();
      }
    } else {
      // Destroy worker bridge and reload demo on main thread
      if (this.#workerBridge) {
        this.#workerBridge.destroy();
        this.#workerBridge = null;
      }
      this.#workerMode = false;
      // Reload demo in main thread
      if (this.#demo) {
        this.load(this.#demo);
        if (wasRunning) this.start();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Adapter registration
  // -----------------------------------------------------------------------

  /**
   * Register a renderer adapter. The first adapter registered becomes the
   * default and is immediately attached.
   */
  registerAdapter(adapter) {
    this.#adapters.set(adapter.id, adapter);
    if (!this.#defaultAdapterId) {
      this.#defaultAdapterId = adapter.id;
      // Attach the first adapter immediately
      adapter.attach(this.#container, this.#W, this.#H);
      this.#activeAdapter = adapter;
      adapter.setOutlines(this.#debugDraw);
    }
  }

  /**
   * Switch render mode to a different adapter.
   * @param {string} adapterId — e.g. "canvas2d", "threejs", "pixijs"
   */
  async setMode(adapterId) {
    if (this.#activeAdapter?.id === adapterId) return;

    const adapter = this.#adapters.get(adapterId);
    if (!adapter) throw new Error(`Adapter "${adapterId}" not registered`);

    const wasRunning = this.isRunning;
    this.stop();

    // Pin container height before detaching, so new adapter can read it
    if (this.#container) {
      const cr = this.#container.getBoundingClientRect();
      this.#container.style.height = `${cr.height}px`;
    }

    // Detach old adapter
    if (this.#activeAdapter) {
      this.#activeAdapter.onDemoUnload();
      // For canvas2d: hide instead of detach (to preserve the canvas element)
      if (this.#activeAdapter.hide) {
        this.#activeAdapter.hide();
      } else {
        this.#activeAdapter.detach();
      }
    }

    // Attach new adapter (if not already attached).
    // Await in case attach() is async (e.g. PixiJS app.init()).
    if (!adapter.isAttached()) {
      await adapter.attach(this.#container, this.#W, this.#H);
    } else if (adapter.show) {
      adapter.show();
    }
    this.#activeAdapter = adapter;
    adapter.setOutlines(this.#debugDraw);

    // Rebuild demo state in new renderer
    if (this.#space && this.#demo) {
      const hasOverride = this.#demo.renderOverrides?.[adapterId];
      if (!hasOverride) {
        adapter.onDemoLoad(this.#space, this.#W, this.#H);
      }
    }

    if (wasRunning) this.start();
  }

  // -----------------------------------------------------------------------
  // Demo loading
  // -----------------------------------------------------------------------

  /** Load a demo definition. Tears down the old space and runs setup(). */
  load(demoDef, { preview = false } = {}) {
    this.stop();

    // Tear down worker bridge if active
    if (this.#workerBridge) {
      this.#workerBridge.destroy();
      this.#workerBridge = null;
      this.#workerMode = false;
    }

    // Unload previous demo from adapter
    this.#activeAdapter?.onDemoUnload();

    this.#demo  = demoDef;
    this.#space = null;

    // Create space
    const space = new Space();
    this.#space = space;

    this.#camX = 0;
    this.#camY = 0;
    this.#cameraConfig = null;
    this.#shakeAmp = 0;
    this.#shakeRemaining = 0;
    this.#shakeTotal = 0;
    this.#shakeOffX = 0;
    this.#shakeOffY = 0;
    this.#physicsPaused = false;
    // Expose self to the demo so it can call shakeCamera() etc.
    demoDef._runner = this;

    // Create walls from demo config (before setup).
    // Only auto-create walls if the demo explicitly defines a `walls` property.
    // Legacy demos that call addWalls() manually in setup() won't have this property.
    if (demoDef.walls !== undefined) {
      createWalls(space, this.#W, this.#H, demoDef.walls);
    }

    // Enable profiler if toggle is on
    if (this.#showProfiler) space.profilerEnabled = true;

    // Run demo setup
    demoDef.setup(space, this.#W, this.#H);

    // Initialize camera from demo config (read AFTER setup so the demo can
    // create bodies and reference them in camera.follow).
    // demo.camera = { follow, offsetX, offsetY, bounds, lerp, deadzone }
    if (demoDef.camera) {
      this.#cameraConfig = demoDef.camera;
      // Snap to target immediately so the first frame doesn't start at (0,0)
      this.snapCamera();
    }

    // Optional init hook (DOM-level listeners, overlays)
    if (!preview) demoDef.init?.(this.#container, this.#W, this.#H);

    // Bridge legacy render/render3d/render3dOverlay → renderOverrides
    if (!demoDef.renderOverrides) {
      const ro = {};
      if (demoDef.render) {
        ro.canvas2d = (ctx, sp, w, h, outlines, cx, cy) => demoDef.render(ctx, sp, w, h, outlines, cx, cy);
      }
      if (demoDef.render3d) {
        ro.threejs = (adapter, sp, w, h, outlines, cx, cy) => {
          const r = adapter.getRenderer(), s = adapter.getScene(), c = adapter.getCamera();
          demoDef.render3d(r, s, c, sp, w, h, cx, cy, adapter);
        };
      }
      if (demoDef.renderPixi) {
        ro.pixijs = (adapter, sp, w, h, outlines, cx, cy) => demoDef.renderPixi(adapter, sp, w, h, outlines, cx, cy);
      }
      if (demoDef.render3dOverlay) {
        // overlay is used by threejs and pixijs modes (canvas2d custom render
        // already includes the legend, so we skip it there to avoid duplication)
        ro.overlay = (ctx, sp, w, h, cx, cy) => demoDef.render3dOverlay(ctx, sp, w, h, cx, cy);
      }
      if (Object.keys(ro).length > 0) {
        demoDef.renderOverrides = ro;
      }
    }

    // Tell the active adapter about the new demo.
    // Skip onDemoLoad only for adapters where the override fully replaces
    // rendering (threejs custom render3d builds its own meshes).
    // For PixiJS, always call onDemoLoad — additive overrides (e.g. fluid
    // water overlay) rely on the default body sprites being created.
    if (this.#activeAdapter) {
      const adapterId = this.#activeAdapter.id;
      const hasOverride = demoDef.renderOverrides?.[adapterId];
      if (!hasOverride || adapterId === "pixijs") {
        this.#activeAdapter.onDemoLoad(space, this.#W, this.#H);
      }
    }
  }

  /**
   * Async variant of load(). Awaits preload() if present before setup().
   */
  async loadAsync(demoDef) {
    if (demoDef.preload) await demoDef.preload();
    this.load(demoDef);
  }

  /**
   * Replace the active Space with a different instance. Used by demos that
   * deserialize or rewind state — `spaceFromBinary` returns a new Space, so
   * the demo asks the runner to swap its reference.
   *
   * Skips if the new space is null or already the active one.
   */
  replaceSpace(newSpace) {
    if (!newSpace || newSpace === this.#space) return;
    this.#space = newSpace;
    if (this.#showProfiler) newSpace.profilerEnabled = true;
    if (this.#activeAdapter) {
      const adapterId = this.#activeAdapter.id;
      const hasOverride = this.#demo?.renderOverrides?.[adapterId];
      if (!hasOverride || adapterId === "pixijs") {
        this.#activeAdapter.onDemoUnload();
        this.#activeAdapter.onDemoLoad(newSpace, this.#W, this.#H);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Loop control
  // -----------------------------------------------------------------------

  /** Begin the rAF loop. */
  start() {
    if (this.#animId) return;
    this.#lastTime   = performance.now();
    this.#frameCount  = 0;
    this.#fpsAccum   = 0;
    this.#accumulator = 0;
    this.#tick();
  }

  /** Pause the rAF loop (space and state are preserved). */
  stop() {
    if (this.#animId) {
      cancelAnimationFrame(this.#animId);
      this.#animId = null;
    }
  }

  // -----------------------------------------------------------------------
  // Preview rendering
  // -----------------------------------------------------------------------

  /**
   * Load a demo, run one physics step, render a single frame, then stop.
   * Used for generating static preview thumbnails on the examples grid.
   */
  renderPreview(demoDef) {
    this.load(demoDef, { preview: true });
    this.#space.step(1 / 60, demoDef.velocityIterations ?? 8, demoDef.positionIterations ?? 3);
    if (this.#activeAdapter) {
      this.#activeAdapter.renderFrame(this.#space, this.#W, this.#H, {
        showOutlines: this.#debugDraw,
        overrides: demoDef.renderOverrides ?? null,
      });
    }
  }

  /**
   * Async variant of renderPreview().
   */
  async renderPreviewAsync(demoDef) {
    if (demoDef.preload) await demoDef.preload();
    this.renderPreview(demoDef);
  }

  // -----------------------------------------------------------------------
  // Stats wiring
  // -----------------------------------------------------------------------

  wireStats({ fps, bodies, step } = {}) {
    this.#statsFps    = fps    ?? null;
    this.#statsBodies = bodies ?? null;
    this.#statsStep   = step   ?? null;
  }

  // -----------------------------------------------------------------------
  // Interaction
  // -----------------------------------------------------------------------

  wireInteraction(el) {
    el.style.touchAction = "none";
    el.style.userSelect  = "none";

    let isDragging = false;

    const getPos = (e) => {
      const rect = el.getBoundingClientRect();
      const aspect  = this.#W / this.#H;
      const fitW    = Math.min(rect.width, rect.height * aspect);
      const fitH    = fitW / aspect;
      const padX    = (rect.width  - fitW) / 2;
      const padY    = (rect.height - fitH) / 2;
      // Screen-to-viewport coords
      const vx = ((e.clientX - rect.left) - padX) * (this.#W / fitW);
      const vy = ((e.clientY - rect.top)  - padY) * (this.#H / fitH);
      // Apply camera offset to get world coords
      return { x: vx + this.#camX, y: vy + this.#camY };
    };

    el.addEventListener("pointerdown", (e) => {
      if (!this.#demo) return;
      if (!this.#space && !this.#workerBridge) return;
      if (e.target.closest(".canvas-controls")) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      isDragging = true;
      const { x, y } = getPos(e);
      if (this.#workerMode && this.#workerBridge) {
        this.#workerBridge.sendClick(x, y);
      } else {
        this.#demo.click?.(x, y, this.#space, this.#W, this.#H);
      }
    });

    el.addEventListener("pointermove", (e) => {
      if (!this.#demo) return;
      if (!this.#space && !this.#workerBridge) return;
      const { x, y } = getPos(e);
      this.#demo.hover?.(x, y, this.#space, this.#W, this.#H);
      if (!isDragging) return;
      e.preventDefault();
      if (this.#workerMode && this.#workerBridge) {
        this.#workerBridge.sendDrag(x, y);
      } else {
        this.#demo.drag?.(x, y, this.#space, this.#W, this.#H);
      }
    });

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      if (this.#workerMode && this.#workerBridge) {
        this.#workerBridge.sendRelease();
      } else {
        this.#demo?.release?.(this.#space);
      }
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

    if (this.#activeAdapter) {
      if (this.#workerMode && this.#workerBridge) {
        // Worker mode: read transforms from bridge, render via adapter
        const state = this.#workerBridge.getState();
        if (state.ready) {
          const renderStart = performance.now();
          this.#activeAdapter.renderFromTransforms(
            state.transforms, state.shapeDescs, this.#W, this.#H,
            { showOutlines: this.#debugDraw, overrides: this.#demo?.renderOverrides ?? null },
          );
          const renderMs = performance.now() - renderStart;
          if (this.#statsStep)   this.#statsStep.textContent   = `Step: ${state.stepMs.toFixed(2)}ms (worker) | Render: ${renderMs.toFixed(2)}ms`;
          if (this.#statsBodies) this.#statsBodies.textContent = `Bodies: ${state.bodyCount}`;
        }
      } else if (this.#space) {
        // Fixed-timestep accumulator: decouple physics rate from display
        // refresh rate so the simulation runs at the same speed on 60 Hz,
        // 120 Hz, and 240 Hz displays.
        const frameSec = Math.min(dt / 1000, DemoRunner.MAX_FRAME_TIME);
        this.#accumulator += frameSec;

        const FIXED_DT = DemoRunner.FIXED_DT;
        const velIter = this.#demo?.velocityIterations ?? 8;
        const posIter = this.#demo?.positionIterations ?? 3;

        // Call demo.step() once per frame (not per physics substep) so that
        // frame counters, animation timers (_time += 1/60), and other
        // per-frame logic run at the correct rate.
        this.#demo?.step?.(this.#space, this.#W, this.#H);

        let stepMs = 0;
        let stepped = false;
        if (this.#physicsPaused) {
          // Drain accumulator without stepping so resuming doesn't burst-step.
          this.#accumulator = 0;
        } else {
          while (this.#accumulator >= FIXED_DT) {
            const stepStart = performance.now();
            this.#space.step(FIXED_DT, velIter, posIter);
            stepMs += performance.now() - stepStart;

            this.#accumulator -= FIXED_DT;
            stepped = true;
          }
        }

        // Update camera only on physics steps. On a 120/144 Hz monitor with
        // 60 Hz physics, frames where the accumulator hadn't reached FIXED_DT
        // were rendering the previous body snapshot while the camera (lerping
        // every frame toward the follow target) kept moving — producing a
        // visible mismatch where the background slid while the followed body
        // appeared to stutter. Locking camera lerp to the physics tick keeps
        // both in lockstep.
        if (stepped) this.#updateCamera();
        // Shake stays per-frame so its decay reads smoothly regardless of
        // physics rate; it's an additive offset, not tied to body positions.
        this.#updateShake(Math.min(dt / 1000, DemoRunner.MAX_FRAME_TIME));

        const renderStart = performance.now();
        this.#activeAdapter.renderFrame(this.#space, this.#W, this.#H, {
          showOutlines: this.#debugDraw,
          overrides: this.#demo?.renderOverrides ?? null,
          camX: this.#camX + this.#shakeOffX,
          camY: this.#camY + this.#shakeOffY,
        });
        const renderMs = performance.now() - renderStart;

        if (this.#statsStep)   this.#statsStep.textContent   = `Step: ${stepMs.toFixed(2)}ms | Render: ${renderMs.toFixed(2)}ms`;
        if (this.#statsBodies) this.#statsBodies.textContent = `Bodies: ${this.#space.bodies.length}`;
      }

      // Profiler overlay (drawn on top of everything via adapter overlay ctx)
      if (this.#showProfiler) {
        const overlayCtx = this.#activeAdapter?.getOverlayCtx?.();
        if (overlayCtx) {
          if (!this.#profilerState) this.#profilerState = createProfilerState();
          if (this.#workerMode && this.#workerBridge) {
            const ws = this.#workerBridge.getState();
            if (ws.bodyCount > 0) drawProfilerOverlayWorker(overlayCtx, this.#W, this.#profilerState, ws.stepMs, ws.bodyCount);
          } else if (this.#demo?.getProfilerStats) {
            const ws = this.#demo.getProfilerStats();
            if (ws) drawProfilerOverlayWorker(overlayCtx, this.#W, this.#profilerState, ws.stepMs, ws.bodyCount);
          } else if (this.#space && this.#space.metrics?.bodyCount) {
            drawProfilerOverlay(overlayCtx, this.#space, this.#W, this.#profilerState);
          }
        }
      }
    }

    this.#animId = requestAnimationFrame(() => this.#tick());
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  /**
   * Update camera position toward the follow target.
   * Called once per frame after physics step.
   */
  #updateCamera() {
    const cfg = this.#cameraConfig;
    if (!cfg) return;

    // Resolve follow target position
    let tx, ty;
    if (typeof cfg.follow === "function") {
      const p = cfg.follow();
      if (!p) return;
      tx = p.x;
      ty = p.y;
    } else if (cfg.follow && cfg.follow.position) {
      tx = cfg.follow.position.x;
      ty = cfg.follow.position.y;
    } else {
      return;
    }

    // Target camera position = follow position + offset, centered in viewport
    const offsetX = cfg.offsetX ?? 0;
    const offsetY = cfg.offsetY ?? 0;
    let goalX = tx + offsetX - this.#W / 2;
    let goalY = ty + offsetY - this.#H / 2;

    // Clamp to world bounds
    const bounds = cfg.bounds;
    if (bounds) {
      goalX = Math.max(bounds.minX, Math.min(goalX, bounds.maxX - this.#W));
      goalY = Math.max(bounds.minY, Math.min(goalY, bounds.maxY - this.#H));
    }

    // Deadzone — only move camera if target leaves deadzone area on each
    // axis. Independently per axis so vertical motion isn't ignored when
    // horizontal sits inside the deadzone (and vice versa).
    const dz = cfg.deadzone;
    if (dz) {
      const dcx = this.#camX + this.#W / 2;
      const dcy = this.#camY + this.#H / 2;
      const dx = tx + offsetX - dcx;
      const dy = ty + offsetY - dcy;
      const outX = Math.abs(dx) > dz.halfW;
      const outY = Math.abs(dy) > dz.halfH;
      if (!outX && !outY) return;
      // Inside the deadzone on an axis → keep that axis where it is.
      // Outside → only catch up by the overshoot, not by the full distance.
      if (!outX) goalX = this.#camX;
      else       goalX = this.#camX + Math.sign(dx) * (Math.abs(dx) - dz.halfW);
      if (!outY) goalY = this.#camY;
      else       goalY = this.#camY + Math.sign(dy) * (Math.abs(dy) - dz.halfH);
    }

    // Lerp
    const lerp = cfg.lerp ?? 0.1;
    this.#camX += (goalX - this.#camX) * lerp;
    this.#camY += (goalY - this.#camY) * lerp;

    // Re-clamp after lerp (avoids overshoot)
    if (bounds) {
      this.#camX = Math.max(bounds.minX, Math.min(this.#camX, bounds.maxX - this.#W));
      this.#camY = Math.max(bounds.minY, Math.min(this.#camY, bounds.maxY - this.#H));
    }
  }

  /**
   * Allow demos to update camera config at runtime (e.g. set follow target
   * after body creation in setup()).
   */
  updateCamera(cfg) {
    if (!cfg) return;
    if (!this.#cameraConfig) this.#cameraConfig = {};
    Object.assign(this.#cameraConfig, cfg);
  }

  /**
   * Snap camera to follow target immediately (no lerp).
   * Useful after teleporting the player or on initial setup.
   */
  snapCamera() {
    const lerp = this.#cameraConfig?.lerp;
    if (this.#cameraConfig) this.#cameraConfig.lerp = 1;
    this.#updateCamera();
    if (this.#cameraConfig) this.#cameraConfig.lerp = lerp;
  }

  /**
   * Trigger a camera shake — superimposes a decaying random offset on top of
   * the smoothed follow position. If a shake is already active, the new one
   * replaces it when its peak amplitude is greater (keeps small shakes from
   * cutting off bigger ones).
   *
   * @param {number} amplitude — peak offset in px (typical 4–20).
   * @param {number} duration  — seconds of shake (typical 0.15–0.5).
   */
  shakeCamera(amplitude, duration = 0.25) {
    if (!(amplitude > 0) || !(duration > 0)) return;
    if (amplitude < this.#shakeAmp && this.#shakeRemaining > 0) return;
    this.#shakeAmp = amplitude;
    this.#shakeRemaining = duration;
    this.#shakeTotal = duration;
  }

  #updateShake(frameSec) {
    if (this.#shakeRemaining <= 0) {
      this.#shakeOffX = 0;
      this.#shakeOffY = 0;
      return;
    }
    this.#shakeRemaining = Math.max(0, this.#shakeRemaining - frameSec);
    // Decay quadratically so the tail fades out smoothly instead of cutting.
    const t = this.#shakeTotal > 0 ? this.#shakeRemaining / this.#shakeTotal : 0;
    const amp = this.#shakeAmp * t * t;
    const ang = Math.random() * Math.PI * 2;
    this.#shakeOffX = Math.cos(ang) * amp;
    this.#shakeOffY = Math.sin(ang) * amp;
  }
}

// =========================================================================
// Profiler overlay — drawn by DemoRunner when showProfiler is true
// =========================================================================

const PROFILER_PHASES = [
  { field: "broadphaseTime",     color: "#4fc3f7", label: "Broad" },
  { field: "narrowphaseTime",    color: "#ffb74d", label: "Narrow" },
  { field: "velocitySolverTime", color: "#81c784", label: "VelSolve" },
  { field: "positionSolverTime", color: "#ce93d8", label: "PosSolve" },
  { field: "ccdTime",            color: "#ef5350", label: "CCD" },
  { field: "sleepTime",          color: "#90a4ae", label: "Sleep" },
];

const P_HIST = 120, P_PAD = 12, P_GAP = 10, P_GRAPH_H = 34, P_BAR_H = 8;
const P_LEG_ROW = 12, P_LINE_H = 14, P_RADIUS = 6;

function createProfilerState() {
  return {
    history: new Float64Array(P_HIST),
    histIdx: 0,
    accum: new Float64Array(6),
    display: new Float64Array(6),
    accumFrames: 0,
    lastFlush: 0,
  };
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawProfilerOverlay(ctx, space, W, st) {
  const m = space.metrics;
  if (!m) return;

  const now = performance.now();
  st.history[st.histIdx % P_HIST] = m.totalStepTime;
  st.histIdx++;

  for (let i = 0; i < 6; i++) st.accum[i] += m[PROFILER_PHASES[i].field];
  st.accumFrames++;
  if (now - st.lastFlush >= 1000 && st.accumFrames > 0) {
    for (let i = 0; i < 6; i++) { st.display[i] = st.accum[i] / st.accumFrames; st.accum[i] = 0; }
    st.accumFrames = 0;
    st.lastFlush = now;
  }

  const ow = Math.min(260, W - P_PAD * 2);
  if (ow < 100) return; // canvas too small for overlay
  const oh = P_PAD + P_LINE_H + P_GAP + P_GRAPH_H + P_GAP + P_LINE_H + 4 + P_BAR_H + 4 + P_LEG_ROW * 2 + P_GAP + P_LINE_H + 2 + P_LINE_H + P_PAD;
  const ox = P_PAD, oy = P_PAD;
  const ix = ox + P_PAD, iw = ow - P_PAD * 2;

  ctx.save();
  ctx.textAlign = "left";
  _roundRect(ctx, ox, oy, ow, oh, P_RADIUS);
  ctx.fillStyle = "rgba(13,17,23,0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = oy + P_PAD;

  // Step time
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#00ff88";
  ctx.fillText(`Step: ${m.totalStepTime.toFixed(2)} ms`, ix, y + 10);
  y += P_LINE_H + P_GAP;

  // Graph
  _roundRect(ctx, ix, y, iw, P_GRAPH_H, 3);
  ctx.fillStyle = "rgba(0,255,136,0.06)";
  ctx.fill();
  let max = 0;
  for (let i = 0; i < P_HIST; i++) if (st.history[i] > max) max = st.history[i];
  if (max < 0.5) max = 0.5;
  const bf = 16.67 / max;
  if (bf < 1) {
    const ry = y + P_GRAPH_H - bf * P_GRAPH_H;
    ctx.strokeStyle = "rgba(239,83,80,0.3)"; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ix, ry); ctx.lineTo(ix + iw, ry); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(239,83,80,0.5)";
    ctx.font = "8px monospace"; ctx.fillText("16.67ms", ix + 3, ry - 2);
  }
  ctx.strokeStyle = "#00ff88"; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < P_HIST; i++) {
    const idx = (st.histIdx + i) % P_HIST;
    const px = ix + (i / (P_HIST - 1)) * iw;
    const py = y + P_GRAPH_H - Math.min(st.history[idx] / max, 1) * P_GRAPH_H;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.lineWidth = 1;
  y += P_GRAPH_H + P_GAP;

  // Phase breakdown
  ctx.font = "10px monospace"; ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("PHASE BREAKDOWN", ix, y + 10);
  y += P_LINE_H + 4;
  let ds = 0;
  for (let i = 0; i < 6; i++) ds += st.display[i];
  if (ds < 0.0001) ds = 1;
  _roundRect(ctx, ix, y, iw, P_BAR_H, 3);
  ctx.save(); ctx.clip();
  let bx = ix;
  for (let i = 0; i < 6; i++) {
    const w = (st.display[i] / ds) * iw;
    if (w > 0.3) { ctx.fillStyle = PROFILER_PHASES[i].color; ctx.fillRect(bx, y, w, P_BAR_H); }
    bx += w;
  }
  ctx.restore();
  y += P_BAR_H + 4;
  ctx.font = "9px monospace";
  const cw = Math.floor(iw / 3);
  for (let row = 0; row < 2; row++) {
    let lx = ix;
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col, pct = Math.round((st.display[i] / ds) * 100);
      ctx.fillStyle = PROFILER_PHASES[i].color;
      ctx.beginPath(); ctx.arc(lx + 3, y + 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(`${PROFILER_PHASES[i].label} ${pct}%`, lx + 9, y + 7);
      lx += cw;
    }
    y += P_LEG_ROW;
  }
  y += P_GAP;

  // Counters
  ctx.font = "11px monospace"; ctx.fillStyle = "#c9d1d9";
  const bl = `Bodies: ${m.bodyCount}  `;
  ctx.fillText(bl, ix, y + 10);
  const bw = ctx.measureText(bl).width;
  ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px monospace";
  ctx.fillText(`D:${m.dynamicBodyCount} S:${m.staticBodyCount} K:${m.kinematicBodyCount}`, ix + bw, y + 10);
  y += P_LINE_H + 2;
  ctx.font = "11px monospace"; ctx.fillStyle = "#c9d1d9";
  ctx.fillText(`Sleep: ${m.sleepingBodyCount}  Contacts: ${m.contactCount}  Constr: ${m.constraintCount}`, ix, y + 10);

  ctx.restore();
}

/** Simplified overlay for worker mode — only step time graph + body count. */
function drawProfilerOverlayWorker(ctx, W, st, stepMs, bodyCount) {
  const now = performance.now();
  st.history[st.histIdx % P_HIST] = stepMs;
  st.histIdx++;

  const ow = Math.min(260, W - P_PAD * 2);
  if (ow < 100) return;
  const oh = P_PAD + P_LINE_H + P_GAP + P_GRAPH_H + P_GAP + P_LINE_H + P_GAP + P_LINE_H + P_PAD;
  const ox = P_PAD, oy = P_PAD;
  const ix = ox + P_PAD, iw = ow - P_PAD * 2;

  ctx.save();
  ctx.textAlign = "left";
  _roundRect(ctx, ox, oy, ow, oh, P_RADIUS);
  ctx.fillStyle = "rgba(13,17,23,0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = oy + P_PAD;

  // Step time
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#00ff88";
  ctx.fillText(`Step: ${stepMs.toFixed(2)} ms`, ix, y + 10);
  y += P_LINE_H + P_GAP;

  // Graph
  _roundRect(ctx, ix, y, iw, P_GRAPH_H, 3);
  ctx.fillStyle = "rgba(0,255,136,0.06)";
  ctx.fill();
  let max = 0;
  for (let i = 0; i < P_HIST; i++) if (st.history[i] > max) max = st.history[i];
  if (max < 0.5) max = 0.5;
  const bf = 16.67 / max;
  if (bf < 1) {
    const ry = y + P_GRAPH_H - bf * P_GRAPH_H;
    ctx.strokeStyle = "rgba(239,83,80,0.3)"; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ix, ry); ctx.lineTo(ix + iw, ry); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(239,83,80,0.5)";
    ctx.font = "8px monospace"; ctx.fillText("16.67ms", ix + 3, ry - 2);
  }
  ctx.strokeStyle = "#00ff88"; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < P_HIST; i++) {
    const idx = (st.histIdx + i) % P_HIST;
    const px = ix + (i / (P_HIST - 1)) * iw;
    const py = y + P_GRAPH_H - Math.min(st.history[idx] / max, 1) * P_GRAPH_H;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.lineWidth = 1;
  y += P_GRAPH_H + P_GAP;

  // Body count
  ctx.font = "11px monospace"; ctx.fillStyle = "#c9d1d9";
  ctx.fillText(`Bodies: ${bodyCount}`, ix, y + 10);
  y += P_LINE_H + P_GAP;

  // Worker mode label
  ctx.font = "9px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText("WORKER MODE", ix, y + 10);

  ctx.restore();
}
