/**
 * PhysicsWorkerManager — unit tests.
 *
 * The Worker, Blob, and URL APIs are mocked so that these tests run in
 * Node.js without a real browser environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FLOATS_PER_BODY, HEADER_FLOATS } from "../../src/worker/types";
import type { WorkerOutMessage } from "../../src/worker/types";

// ---------------------------------------------------------------------------
// Worker mock
// ---------------------------------------------------------------------------

class MockWorker {
  url: string;
  options: any;
  onmessage: ((e: MessageEvent<WorkerOutMessage>) => void) | null = null;
  private listeners = new Map<string, Array<(e: any) => void>>();
  posted: any[] = [];
  terminated = false;

  constructor(url: string, options?: any) {
    this.url = url;
    this.options = options;
  }

  postMessage(msg: any): void {
    this.posted.push(msg);
  }

  addEventListener(type: string, fn: (e: any) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(fn);
  }

  removeEventListener(type: string, fn: (e: any) => void): void {
    const arr = this.listeners.get(type);
    if (arr) {
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Simulate the worker sending a message back. */
  _emit(data: WorkerOutMessage): void {
    const evt = { data } as MessageEvent<WorkerOutMessage>;
    // Fire addEventListener listeners first (init uses this)
    const arr = this.listeners.get("message");
    if (arr) {
      for (const fn of [...arr]) fn(evt);
    }
    // Fire onmessage handler (frame handling uses this)
    this.onmessage?.(evt);
  }
}

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

let lastWorker: MockWorker;

function setLastWorker(w: MockWorker) {
  lastWorker = w;
}

beforeEach(() => {
  // @ts-expect-error -- mock
  globalThis.Worker = class extends MockWorker {
    constructor(url: string, opts?: any) {
      super(url, opts);
      setLastWorker(this); // eslint: avoid no-this-alias
    }
  };
  // @ts-expect-error -- mock
  globalThis.Blob = class {
    parts: any[];
    options: any;
    constructor(parts: any[], options?: any) {
      this.parts = parts;
      this.options = options;
    }
  };
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAndInit(options = {}) {
  // Dynamic import so mocks are in place
  const { PhysicsWorkerManager } = await import("../../src/worker/PhysicsWorkerManager");
  const mgr = new PhysicsWorkerManager(options);
  const initPromise = mgr.init();
  // Worker should have been created; simulate ready
  lastWorker._emit({ type: "ready" });
  await initPromise;
  return { mgr, worker: lastWorker };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PhysicsWorkerManager — constructor defaults", () => {
  it("uses sensible defaults when no options provided", async () => {
    const { mgr, worker } = await createAndInit();
    const initMsg = worker.posted.find((m: any) => m.type === "init");
    expect(initMsg).toBeDefined();
    expect(initMsg.maxBodies).toBe(512);
    expect(initMsg.timestep).toBeCloseTo(1 / 60);
    expect(initMsg.velocityIterations).toBe(10);
    expect(initMsg.positionIterations).toBe(10);
    expect(initMsg.gravityX).toBe(0);
    expect(initMsg.gravityY).toBe(600);
    mgr.destroy();
  });

  it("forwards custom options to init message", async () => {
    const { mgr, worker } = await createAndInit({
      maxBodies: 128,
      timestep: 1 / 30,
      velocityIterations: 5,
      positionIterations: 3,
      gravityX: -10,
      gravityY: 400,
    });
    const initMsg = worker.posted.find((m: any) => m.type === "init");
    expect(initMsg.maxBodies).toBe(128);
    expect(initMsg.timestep).toBeCloseTo(1 / 30);
    expect(initMsg.velocityIterations).toBe(5);
    expect(initMsg.positionIterations).toBe(3);
    expect(initMsg.gravityX).toBe(-10);
    expect(initMsg.gravityY).toBe(400);
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — init lifecycle", () => {
  it("creates an inline Blob worker when no workerUrl provided", async () => {
    const { mgr } = await createAndInit();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    mgr.destroy();
  });

  it("creates a URL worker when workerUrl is provided", async () => {
    const { mgr, worker } = await createAndInit({ workerUrl: "custom-worker.js" });
    expect(worker.url).toBe("custom-worker.js");
    mgr.destroy();
  });

  it("rejects if worker sends error during init", async () => {
    const { PhysicsWorkerManager } = await import("../../src/worker/PhysicsWorkerManager");
    const mgr = new PhysicsWorkerManager();
    const initPromise = mgr.init();
    lastWorker._emit({ type: "error", message: "boom" });
    await expect(initPromise).rejects.toThrow("boom");
    mgr.destroy();
  });

  it("returns same promise on repeated init() calls", async () => {
    const { PhysicsWorkerManager } = await import("../../src/worker/PhysicsWorkerManager");
    const mgr = new PhysicsWorkerManager();
    const p1 = mgr.init();
    const p2 = mgr.init();
    expect(p1).toBe(p2);
    lastWorker._emit({ type: "ready" });
    await p1;
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — start/stop/step", () => {
  it("start sends 'start' message", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.start();
    expect(worker.posted.some((m: any) => m.type === "start")).toBe(true);
    mgr.destroy();
  });

  it("stop sends 'stop' message", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.stop();
    expect(worker.posted.some((m: any) => m.type === "stop")).toBe(true);
    mgr.destroy();
  });

  it("step sends 'step' message", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.step();
    expect(worker.posted.some((m: any) => m.type === "step")).toBe(true);
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — body management", () => {
  it("addBody returns incrementing IDs and sends correct message", async () => {
    const { mgr, worker } = await createAndInit();
    const id1 = mgr.addBody("dynamic", 10, 20, [{ type: "circle", radius: 5 }]);
    const id2 = mgr.addBody("static", 30, 40, [{ type: "box", width: 10, height: 5 }]);
    expect(id1).toBe(0);
    expect(id2).toBe(1);

    const addMsgs = worker.posted.filter((m: any) => m.type === "addBody");
    expect(addMsgs).toHaveLength(2);
    expect(addMsgs[0].bodyType).toBe("dynamic");
    expect(addMsgs[0].x).toBe(10);
    expect(addMsgs[0].y).toBe(20);
    expect(addMsgs[0].shapes[0].type).toBe("circle");
    expect(addMsgs[1].bodyType).toBe("static");
    mgr.destroy();
  });

  it("addBody forwards options", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 1 }], {
      rotation: 1.5,
      isBullet: true,
      elasticity: 0.8,
      density: 2.0,
    });
    const msg = worker.posted.find((m: any) => m.type === "addBody");
    expect(msg.options.rotation).toBe(1.5);
    expect(msg.options.isBullet).toBe(true);
    expect(msg.options.elasticity).toBe(0.8);
    expect(msg.options.density).toBe(2.0);
    mgr.destroy();
  });

  it("removeBody sends correct message and clears slot", async () => {
    const { mgr, worker } = await createAndInit();
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    mgr.removeBody(id);
    const removeMsgs = worker.posted.filter((m: any) => m.type === "removeBody");
    expect(removeMsgs).toHaveLength(1);
    expect(removeMsgs[0].id).toBe(id);
    // Transform should return null after removal
    expect(mgr.getTransform(id)).toBeNull();
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — body commands", () => {
  it("applyForce sends correct message", async () => {
    const { mgr, worker } = await createAndInit();
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    mgr.applyForce(id, 100, -50);
    const msg = worker.posted.find((m: any) => m.type === "applyForce");
    expect(msg).toEqual({ type: "applyForce", id, fx: 100, fy: -50 });
    mgr.destroy();
  });

  it("applyImpulse sends correct message", async () => {
    const { mgr, worker } = await createAndInit();
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    mgr.applyImpulse(id, 10, 20);
    const msg = worker.posted.find((m: any) => m.type === "applyImpulse");
    expect(msg).toEqual({ type: "applyImpulse", id, ix: 10, iy: 20 });
    mgr.destroy();
  });

  it("setVelocity sends correct message", async () => {
    const { mgr, worker } = await createAndInit();
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    mgr.setVelocity(id, 5, -3);
    const msg = worker.posted.find((m: any) => m.type === "setVelocity");
    expect(msg).toEqual({ type: "setVelocity", id, vx: 5, vy: -3 });
    mgr.destroy();
  });

  it("setPosition sends correct message", async () => {
    const { mgr, worker } = await createAndInit();
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    mgr.setPosition(id, 100, 200);
    const msg = worker.posted.find((m: any) => m.type === "setPosition");
    expect(msg).toEqual({ type: "setPosition", id, x: 100, y: 200 });
    mgr.destroy();
  });

  it("setGravity sends correct message", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.setGravity(-5, 300);
    const msg = worker.posted.find((m: any) => m.type === "setGravity");
    expect(msg).toEqual({ type: "setGravity", gravityX: -5, gravityY: 300 });
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — transform reading", () => {
  it("getTransform returns null for unknown body ID", async () => {
    const { mgr } = await createAndInit();
    expect(mgr.getTransform(999)).toBeNull();
    mgr.destroy();
  });

  it("getTransform reads correct buffer slot", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);

    // Manually write values into rawTransforms to simulate worker output
    const buf = mgr.rawTransforms!;
    const off = HEADER_FLOATS + 0 * FLOATS_PER_BODY; // first slot
    buf[off] = 42;
    buf[off + 1] = 99;
    buf[off + 2] = 1.57;

    const t = mgr.getTransform(id)!;
    expect(t.x).toBe(42);
    expect(t.y).toBe(99);
    expect(t.rotation).toBeCloseTo(1.57, 2);
    mgr.destroy();
  });

  it("getTransform reads correct slot for second body", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    const id2 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);

    const buf = mgr.rawTransforms!;
    const off = HEADER_FLOATS + 1 * FLOATS_PER_BODY; // second slot
    buf[off] = 10;
    buf[off + 1] = 20;
    buf[off + 2] = 0.5;

    const t = mgr.getTransform(id2);
    expect(t).toEqual({ x: 10, y: 20, rotation: 0.5 });
    mgr.destroy();
  });

  it("readAllTransforms populates map for all bodies", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    const id1 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    const id2 = mgr.addBody("static", 0, 0, [{ type: "circle", radius: 5 }]);

    const buf = mgr.rawTransforms!;
    // body 1 at slot 0
    buf[HEADER_FLOATS] = 1;
    buf[HEADER_FLOATS + 1] = 2;
    buf[HEADER_FLOATS + 2] = 3;
    // body 2 at slot 1
    buf[HEADER_FLOATS + 3] = 4;
    buf[HEADER_FLOATS + 4] = 5;
    buf[HEADER_FLOATS + 5] = 6;

    const out = new Map();
    mgr.readAllTransforms(out);
    expect(out.size).toBe(2);
    expect(out.get(id1)).toEqual({ x: 1, y: 2, rotation: 3 });
    expect(out.get(id2)).toEqual({ x: 4, y: 5, rotation: 6 });
    mgr.destroy();
  });

  it("readAllTransforms reuses existing map entries", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);

    const buf = mgr.rawTransforms!;
    buf[HEADER_FLOATS] = 1;
    buf[HEADER_FLOATS + 1] = 2;
    buf[HEADER_FLOATS + 2] = 3;

    const out = new Map();
    mgr.readAllTransforms(out);
    const ref = out.get(id);

    // Update buffer and read again
    buf[HEADER_FLOATS] = 10;
    mgr.readAllTransforms(out);

    // Same object reference should be reused
    expect(out.get(id)).toBe(ref);
    expect(ref!.x).toBe(10);
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — header accessors", () => {
  it("bodyCount reads from header[0]", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    mgr.rawTransforms![0] = 7;
    expect(mgr.bodyCount).toBe(7);
    mgr.destroy();
  });

  it("timestamp reads from header[1]", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    mgr.rawTransforms![1] = 42;
    expect(mgr.timestamp).toBe(42);
    mgr.destroy();
  });

  it("stepTimeMs reads from header[2]", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    mgr.rawTransforms![2] = 3.5;
    expect(mgr.stepTimeMs).toBeCloseTo(3.5);
    mgr.destroy();
  });

  it("returns 0 for header values when transforms is null", async () => {
    const { PhysicsWorkerManager } = await import("../../src/worker/PhysicsWorkerManager");
    const mgr = new PhysicsWorkerManager();
    // Not initialized yet — transforms is null
    expect(mgr.bodyCount).toBe(0);
    expect(mgr.timestamp).toBe(0);
    expect(mgr.stepTimeMs).toBe(0);
  });
});

describe("PhysicsWorkerManager — frame callback (fallback mode)", () => {
  it("onFrameCallback fires on frame message in non-shared mode", async () => {
    // Remove SharedArrayBuffer to force fallback mode
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;

    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 16 });
      expect(mgr.isSharedBuffer).toBe(false);

      const received: Float32Array[] = [];
      mgr.onFrameCallback = (buf) => received.push(buf);

      const fakeBuf = new Float32Array([1, 2, 3]);
      worker._emit({ type: "frame", buffer: fakeBuf });

      expect(received).toHaveLength(1);
      expect(received[0]).toBe(fakeBuf);
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });

  it("copies postMessage frame buffers into readable transforms", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;

    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 16 });
      const id1 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
      const id2 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);

      const frame = new Float32Array(HEADER_FLOATS + 2 * FLOATS_PER_BODY);
      frame[0] = 2;
      frame[1] = 12;
      frame[2] = 0.25;
      frame[HEADER_FLOATS] = 10;
      frame[HEADER_FLOATS + 1] = 20;
      frame[HEADER_FLOATS + 2] = 0.5;
      frame[HEADER_FLOATS + FLOATS_PER_BODY] = 30;
      frame[HEADER_FLOATS + FLOATS_PER_BODY + 1] = 40;
      frame[HEADER_FLOATS + FLOATS_PER_BODY + 2] = 1.5;

      worker._emit({ type: "frame", buffer: frame });

      expect(mgr.bodyCount).toBe(2);
      expect(mgr.timestamp).toBe(12);
      expect(mgr.stepTimeMs).toBeCloseTo(0.25);
      expect(mgr.getTransform(id1)).toEqual({ x: 10, y: 20, rotation: 0.5 });
      expect(mgr.getTransform(id2)).toEqual({ x: 30, y: 40, rotation: 1.5 });
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });

  it("keeps the previous local buffer when a fallback frame omits its buffer", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;

    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 16 });
      const before = mgr.rawTransforms;

      worker._emit({ type: "frame" });

      expect(mgr.rawTransforms).toBe(before);
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });
});

describe("PhysicsWorkerManager — shared buffer mode", () => {
  it("uses SharedArrayBuffer when available", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    expect(mgr.isSharedBuffer).toBe(true);
    expect(mgr.rawTransforms).toBeInstanceOf(Float32Array);
    mgr.destroy();
  });

  it("onFrameCallback fires on frame message in shared mode", async () => {
    const { mgr, worker } = await createAndInit({ maxBodies: 16 });
    expect(mgr.isSharedBuffer).toBe(true);

    const received: Float32Array[] = [];
    mgr.onFrameCallback = (buf) => received.push(buf);

    worker._emit({ type: "frame" });

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(mgr.rawTransforms);
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — destroy", () => {
  it("terminates worker and clears state", async () => {
    const { mgr, worker } = await createAndInit();
    const id = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    mgr.destroy();

    expect(worker.terminated).toBe(true);
    expect(mgr.rawTransforms).toBeNull();
    expect(mgr.getTransform(id)).toBeNull();
  });

  it("is idempotent — second destroy is a no-op", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.destroy();
    mgr.destroy(); // should not throw
    expect(worker.terminated).toBe(true);
  });

  it("sends destroy message to worker", async () => {
    const { mgr, worker } = await createAndInit();
    mgr.destroy();
    expect(worker.posted.some((m: any) => m.type === "destroy")).toBe(true);
  });
});

describe("PhysicsWorkerManager — post after destroy", () => {
  it("does not throw when calling commands after destroy", async () => {
    const { mgr } = await createAndInit();
    mgr.destroy();
    // These should silently no-op (worker is null, post uses ?.)
    expect(() => mgr.start()).not.toThrow();
    expect(() => mgr.stop()).not.toThrow();
    expect(() => mgr.step()).not.toThrow();
    expect(() => mgr.applyForce(0, 1, 1)).not.toThrow();
    expect(() => mgr.setGravity(0, 0)).not.toThrow();
  });
});

describe("buildWorkerScript", () => {
  it("returns a string containing the nape URL", async () => {
    const { buildWorkerScript } = await import("../../src/worker/physics-worker-code");
    const script = buildWorkerScript("https://example.com/nape.js");
    expect(typeof script).toBe("string");
    expect(script).toContain("https://example.com/nape.js");
  });

  it("inlines FLOATS_PER_BODY and HEADER_FLOATS constants", async () => {
    const { buildWorkerScript } = await import("../../src/worker/physics-worker-code");
    const script = buildWorkerScript("https://example.com/nape.js");
    expect(script).toContain(`FLOATS_PER_BODY = ${FLOATS_PER_BODY}`);
    expect(script).toContain(`HEADER_FLOATS = ${HEADER_FLOATS}`);
  });

  it("contains all required message handlers", async () => {
    const { buildWorkerScript } = await import("../../src/worker/physics-worker-code");
    const script = buildWorkerScript("https://example.com/nape.js");
    const requiredHandlers = [
      '"init"',
      '"start"',
      '"stop"',
      '"step"',
      '"addBody"',
      '"removeBody"',
      '"applyForce"',
      '"applyImpulse"',
      '"setVelocity"',
      '"setPosition"',
      '"setGravity"',
      '"destroy"',
    ];
    for (const handler of requiredHandlers) {
      expect(script).toContain(handler);
    }
  });
});

describe("worker types — constants", () => {
  it("FLOATS_PER_BODY is 3", () => {
    expect(FLOATS_PER_BODY).toBe(3);
  });

  it("HEADER_FLOATS is 3", () => {
    expect(HEADER_FLOATS).toBe(3);
  });
});
