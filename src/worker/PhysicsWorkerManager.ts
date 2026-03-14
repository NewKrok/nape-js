/**
 * PhysicsWorkerManager — runs nape-js physics in a Web Worker.
 *
 * The simulation runs off the main thread at a fixed timestep.  Body
 * transforms (x, y, rotation) are shared with the main thread via a
 * {@link SharedArrayBuffer} when available, falling back to `postMessage`
 * copies when COOP/COEP headers are absent.
 *
 * ```ts
 * import { PhysicsWorkerManager } from "@newkrok/nape-js/worker";
 *
 * const mgr = new PhysicsWorkerManager({ gravityY: 600, maxBodies: 256 });
 * await mgr.init();
 *
 * const id = mgr.addBody("dynamic", 100, 50, [{ type: "circle", radius: 20 }]);
 * mgr.start();
 *
 * function render() {
 *   const t = mgr.getTransforms();
 *   // t[id] = { x, y, rotation }
 *   requestAnimationFrame(render);
 * }
 * render();
 * ```
 *
 * @module
 */

import type { PhysicsWorkerOptions, ShapeDesc, BodyOptions, WorkerOutMessage } from "./types";
import { FLOATS_PER_BODY, HEADER_FLOATS } from "./types";
import { buildWorkerScript } from "./physics-worker-code";

/** Default CDN URL for the nape-js ESM bundle used inside the worker. */
const DEFAULT_NAPE_URL = "https://cdn.jsdelivr.net/npm/@newkrok/nape-js/dist/index.js";

/** Per-body transform read from the shared buffer. */
export interface BodyTransform {
  x: number;
  y: number;
  rotation: number;
}

export class PhysicsWorkerManager {
  private worker: Worker | null = null;
  private buffer: SharedArrayBuffer | ArrayBuffer | null = null;
  private transforms: Float32Array | null = null;
  private useShared = false;
  private maxBodies: number;
  private timestep: number;
  private velocityIterations: number;
  private positionIterations: number;
  private gravityX: number;
  private gravityY: number;
  private workerUrl: string | undefined;
  private autoStep: boolean;
  private nextId = 0;
  private bodySlots = new Map<number, number>(); // id → slot index
  private readyPromise: Promise<void> | null = null;
  private onFrame: ((buffer: Float32Array) => void) | null = null;
  private destroyed = false;

  /**
   * URL to the nape-js ESM bundle that the worker will import.
   * Override this before calling `init()` if you self-host the bundle.
   */
  napeUrl = DEFAULT_NAPE_URL;

  constructor(options: PhysicsWorkerOptions = {}) {
    this.maxBodies = options.maxBodies ?? 512;
    this.timestep = options.timestep ?? 1 / 60;
    this.velocityIterations = options.velocityIterations ?? 10;
    this.positionIterations = options.positionIterations ?? 10;
    this.gravityX = options.gravityX ?? 0;
    this.gravityY = options.gravityY ?? 600;
    this.workerUrl = options.workerUrl;
    this.autoStep = options.autoStep ?? true;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /**
   * Create the worker and initialize the physics space.
   * Resolves when the worker reports `"ready"`.
   */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = this.doInit();
    return this.readyPromise;
  }

  private async doInit(): Promise<void> {
    // Create worker
    if (this.workerUrl) {
      this.worker = new Worker(this.workerUrl, { type: "module" });
    } else {
      const script = buildWorkerScript(this.napeUrl);
      const blob = new Blob([script], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url, { type: "module" });
      // Clean up the object URL after the worker has loaded
      URL.revokeObjectURL(url);
    }

    // Allocate transform buffer
    const totalBytes =
      (HEADER_FLOATS + this.maxBodies * FLOATS_PER_BODY) * Float32Array.BYTES_PER_ELEMENT;

    if (typeof SharedArrayBuffer !== "undefined") {
      this.buffer = new SharedArrayBuffer(totalBytes);
      this.transforms = new Float32Array(this.buffer);
      this.useShared = true;
    } else {
      this.buffer = null;
      this.transforms = new Float32Array(HEADER_FLOATS + this.maxBodies * FLOATS_PER_BODY);
      this.useShared = false;
    }

    // Wire up message handler
    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.type === "frame" && !this.useShared && msg.buffer) {
        // Copy fallback: overwrite local transforms
        this.transforms = msg.buffer;
        this.onFrame?.(msg.buffer);
      } else if (msg.type === "frame" && this.useShared) {
        this.onFrame?.(this.transforms!);
      }
    };

    // Send init message
    return new Promise<void>((resolve, reject) => {
      const handler = (e: MessageEvent<WorkerOutMessage>) => {
        if (e.data.type === "ready") {
          this.worker!.removeEventListener("message", handler);
          resolve();
        } else if (e.data.type === "error") {
          this.worker!.removeEventListener("message", handler);
          reject(new Error(e.data.message));
        }
      };
      this.worker!.addEventListener("message", handler);

      this.worker!.postMessage({
        type: "init",
        maxBodies: this.maxBodies,
        timestep: this.timestep,
        velocityIterations: this.velocityIterations,
        positionIterations: this.positionIterations,
        gravityX: this.gravityX,
        gravityY: this.gravityY,
        buffer: this.useShared ? this.buffer : null,
      });
    });
  }

  /**
   * Start the fixed-timestep physics loop in the worker.
   * Only meaningful when `autoStep` is `true` (default).
   */
  start(): void {
    this.post({ type: "start" });
  }

  /** Pause the physics loop. */
  stop(): void {
    this.post({ type: "stop" });
  }

  /** Trigger a single physics step (for manual stepping). */
  step(): void {
    this.post({ type: "step" });
  }

  /** Terminate the worker and release all resources. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.post({ type: "destroy" });
    this.worker?.terminate();
    this.worker = null;
    this.transforms = null;
    this.buffer = null;
    this.bodySlots.clear();
  }

  // ── Body management ────────────────────────────────────────────────────

  /**
   * Add a body to the physics world.
   *
   * @returns A unique body ID used to read transforms and send commands.
   */
  addBody(
    bodyType: "dynamic" | "static" | "kinematic",
    x: number,
    y: number,
    shapes: ShapeDesc[],
    options?: BodyOptions,
  ): number {
    const id = this.nextId++;
    this.bodySlots.set(id, this.bodySlots.size);
    this.post({
      type: "addBody",
      id,
      bodyType,
      x,
      y,
      shapes,
      options,
    });
    return id;
  }

  /** Remove a body from the physics world. */
  removeBody(id: number): void {
    this.bodySlots.delete(id);
    this.post({ type: "removeBody", id });
  }

  // ── Body commands ──────────────────────────────────────────────────────

  /** Set cumulative force on a body for the current step. */
  applyForce(id: number, fx: number, fy: number): void {
    this.post({ type: "applyForce", id, fx, fy });
  }

  /** Apply an instantaneous impulse. */
  applyImpulse(id: number, ix: number, iy: number): void {
    this.post({ type: "applyImpulse", id, ix, iy });
  }

  /** Override linear velocity. */
  setVelocity(id: number, vx: number, vy: number): void {
    this.post({ type: "setVelocity", id, vx, vy });
  }

  /** Teleport a body. */
  setPosition(id: number, x: number, y: number): void {
    this.post({ type: "setPosition", id, x, y });
  }

  /** Change world gravity. */
  setGravity(gx: number, gy: number): void {
    this.post({ type: "setGravity", gravityX: gx, gravityY: gy });
  }

  // ── Transform reading ─────────────────────────────────────────────────

  /**
   * Read the transform for a single body.
   * Returns `null` if the body ID is unknown.
   */
  getTransform(id: number): BodyTransform | null {
    const slot = this.bodySlots.get(id);
    if (slot === undefined || !this.transforms) return null;
    const off = HEADER_FLOATS + slot * FLOATS_PER_BODY;
    return {
      x: this.transforms[off],
      y: this.transforms[off + 1],
      rotation: this.transforms[off + 2],
    };
  }

  /**
   * Read all transforms into a caller-supplied map (avoids allocations).
   * Populates `out` with `id → { x, y, rotation }` for every known body.
   */
  readAllTransforms(out: Map<number, BodyTransform>): void {
    if (!this.transforms) return;
    for (const [id, slot] of this.bodySlots) {
      const off = HEADER_FLOATS + slot * FLOATS_PER_BODY;
      const existing = out.get(id);
      if (existing) {
        existing.x = this.transforms[off];
        existing.y = this.transforms[off + 1];
        existing.rotation = this.transforms[off + 2];
      } else {
        out.set(id, {
          x: this.transforms[off],
          y: this.transforms[off + 1],
          rotation: this.transforms[off + 2],
        });
      }
    }
  }

  /** Raw Float32Array view of the transform buffer (header + body data). */
  get rawTransforms(): Float32Array | null {
    return this.transforms;
  }

  /** Number of bodies reported by the worker in the last frame. */
  get bodyCount(): number {
    return this.transforms ? this.transforms[0] : 0;
  }

  /** Physics timestamp (number of steps taken). */
  get timestamp(): number {
    return this.transforms ? this.transforms[1] : 0;
  }

  /** Last physics step duration in milliseconds. */
  get stepTimeMs(): number {
    return this.transforms ? this.transforms[2] : 0;
  }

  /** Whether SharedArrayBuffer is in use (zero-copy reads). */
  get isSharedBuffer(): boolean {
    return this.useShared;
  }

  /**
   * Register a callback invoked after each physics frame.
   * In SharedArrayBuffer mode the buffer is already up-to-date when this fires.
   * In fallback mode the callback receives the fresh copy.
   */
  set onFrameCallback(fn: ((buffer: Float32Array) => void) | null) {
    this.onFrame = fn;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private post(msg: unknown): void {
    this.worker?.postMessage(msg);
  }
}
