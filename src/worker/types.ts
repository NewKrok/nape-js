/**
 * Shared types for the Web Worker physics bridge.
 *
 * The protocol uses a flat transform buffer layout:
 *   [x0, y0, rot0, x1, y1, rot1, ...]
 *
 * When SharedArrayBuffer is available the main thread can read transforms
 * at any time without waiting for a message.  When it is not available
 * (missing COOP/COEP headers) the worker posts a copy of the buffer each
 * tick via `postMessage`.
 */

// ── Transform buffer layout ────────────────────────────────────────────

/** Floats per body in the transform buffer: x, y, rotation. */
export const FLOATS_PER_BODY = 3;

/**
 * Metadata slots at the start of the transform buffer.
 *
 * Layout: [bodyCount, timestamp, stepTimeMs, ...transforms]
 */
export const HEADER_FLOATS = 3;

// ── Message protocol (main → worker) ───────────────────────────────────

export interface InitMessage {
  type: "init";
  /** Max number of bodies the buffer can hold. */
  maxBodies: number;
  /** Physics timestep in seconds (default 1/60). */
  timestep: number;
  /** Velocity iterations per step (default 10). */
  velocityIterations: number;
  /** Position iterations per step (default 10). */
  positionIterations: number;
  /** Gravity X component. */
  gravityX: number;
  /** Gravity Y component. */
  gravityY: number;
  /** SharedArrayBuffer (if available) or null for postMessage fallback. */
  buffer: SharedArrayBuffer | null;
}

export interface StepMessage {
  type: "step";
}

export interface AddBodyMessage {
  type: "addBody";
  id: number;
  bodyType: "dynamic" | "static" | "kinematic";
  x: number;
  y: number;
  shapes: ShapeDesc[];
  options?: BodyOptions;
}

export interface RemoveBodyMessage {
  type: "removeBody";
  id: number;
}

export interface ApplyForceMessage {
  type: "applyForce";
  id: number;
  fx: number;
  fy: number;
}

export interface ApplyImpulseMessage {
  type: "applyImpulse";
  id: number;
  ix: number;
  iy: number;
}

export interface SetVelocityMessage {
  type: "setVelocity";
  id: number;
  vx: number;
  vy: number;
}

export interface SetPositionMessage {
  type: "setPosition";
  id: number;
  x: number;
  y: number;
}

export interface SetGravityMessage {
  type: "setGravity";
  gravityX: number;
  gravityY: number;
}

export interface StartMessage {
  type: "start";
}

export interface StopMessage {
  type: "stop";
}

export interface DestroyMessage {
  type: "destroy";
}

export type WorkerInMessage =
  | InitMessage
  | StepMessage
  | AddBodyMessage
  | RemoveBodyMessage
  | ApplyForceMessage
  | ApplyImpulseMessage
  | SetVelocityMessage
  | SetPositionMessage
  | SetGravityMessage
  | StartMessage
  | StopMessage
  | DestroyMessage;

// ── Message protocol (worker → main) ──────────────────────────────────

export interface ReadyMessage {
  type: "ready";
}

export interface FrameMessage {
  type: "frame";
  /** Only sent in postMessage fallback mode (no SharedArrayBuffer). */
  buffer?: Float32Array;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type WorkerOutMessage = ReadyMessage | FrameMessage | ErrorMessage;

// ── Shape / Body descriptors ───────────────────────────────────────────

export interface CircleDesc {
  type: "circle";
  radius: number;
  offsetX?: number;
  offsetY?: number;
}

export interface BoxDesc {
  type: "box";
  width: number;
  height: number;
}

export interface PolygonDesc {
  type: "polygon";
  vertices: { x: number; y: number }[];
}

export type ShapeDesc = CircleDesc | BoxDesc | PolygonDesc;

export interface BodyOptions {
  rotation?: number;
  velocityX?: number;
  velocityY?: number;
  angularVel?: number;
  isBullet?: boolean;
  allowRotation?: boolean;
  allowMovement?: boolean;
  /** Material elasticity (bounciness). */
  elasticity?: number;
  /** Material dynamic friction. */
  dynamicFriction?: number;
  /** Material static friction. */
  staticFriction?: number;
  /** Material density. */
  density?: number;
}

// ── PhysicsWorkerManager options ───────────────────────────────────────

export interface PhysicsWorkerOptions {
  /** Maximum number of bodies the buffer can hold (default 512). */
  maxBodies?: number;
  /** Physics timestep in seconds (default 1/60). */
  timestep?: number;
  /** Velocity solver iterations (default 10). */
  velocityIterations?: number;
  /** Position solver iterations (default 10). */
  positionIterations?: number;
  /** Gravity X (default 0). */
  gravityX?: number;
  /** Gravity Y (default 600). */
  gravityY?: number;
  /**
   * URL to a pre-built worker script.  When omitted, the manager creates an
   * inline Blob worker from the bundled worker code.
   */
  workerUrl?: string;
  /**
   * If `true`, physics runs on a fixed-interval loop inside the worker
   * (default `true`).  Set to `false` for manual stepping via `step()`.
   */
  autoStep?: boolean;
}
