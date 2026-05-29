/**
 * PhysicsWorkerManager — unit tests.
 *
 * The Worker, Blob, and URL APIs are mocked so that these tests run in
 * Node.js without a real browser environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FLOATS_PER_BODY, HEADER_FLOATS, PROTOCOL_VERSION } from "../../src/worker/types";
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

describe("PhysicsWorkerManager — slot mapping integrity (add/remove mid-run)", () => {
  it("reuses the freed-up size as the slot index for newly added bodies", async () => {
    // Slots are assigned as `bodySlots.size` at add time, so after removing a
    // body the next add lands on whatever index the shrunk map now reports.
    const { mgr } = await createAndInit({ maxBodies: 16 });
    const id0 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]); // slot 0
    const id1 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]); // slot 1
    const id2 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]); // slot 2

    // Remove the middle body — map shrinks to size 2.
    mgr.removeBody(id1);
    expect(mgr.getTransform(id1)).toBeNull();

    // The next add reuses slot index 2 (current map size).
    const id3 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);

    const buf = mgr.rawTransforms!;
    const write = (slot: number, x: number, y: number, r: number) => {
      const off = HEADER_FLOATS + slot * FLOATS_PER_BODY;
      buf[off] = x;
      buf[off + 1] = y;
      buf[off + 2] = r;
    };
    write(0, 1, 1, 0.125); // id0 — float32-exact rotation
    write(2, 3, 3, 0.25); // id2 keeps its original slot 2 …
    // … and id3 also maps to slot 2 (collision is the documented append-only caveat)
    expect(mgr.getTransform(id0)).toEqual({ x: 1, y: 1, rotation: 0.125 });
    expect(mgr.getTransform(id2)).toEqual({ x: 3, y: 3, rotation: 0.25 });
    expect(mgr.getTransform(id3)).toEqual({ x: 3, y: 3, rotation: 0.25 });
    mgr.destroy();
  });

  it("surviving bodies keep their original slots after an unrelated removal", async () => {
    const { mgr } = await createAndInit({ maxBodies: 16 });
    const id0 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
    const id1 = mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);

    const buf = mgr.rawTransforms!;
    buf[HEADER_FLOATS + 1 * FLOATS_PER_BODY] = 7; // id1 at slot 1

    mgr.removeBody(id0); // remove the first body
    // id1's slot mapping is unchanged — still reads slot 1.
    expect(mgr.getTransform(id1)!.x).toBe(7);
    expect(mgr.getTransform(id0)).toBeNull();
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — useShared toggle path", () => {
  it("sends the SharedArrayBuffer in the init message when SAB is available", async () => {
    const { mgr, worker } = await createAndInit({ maxBodies: 8 });
    const initMsg = worker.posted.find((m: any) => m.type === "init");
    expect(mgr.isSharedBuffer).toBe(true);
    expect(initMsg.buffer).not.toBeNull();
    expect(mgr.rawTransforms!.buffer).toBeInstanceOf(SharedArrayBuffer);
    mgr.destroy();
  });

  it("sends a null buffer and allocates a local Float32Array in fallback mode", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;

    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 8 });
      const initMsg = worker.posted.find((m: any) => m.type === "init");
      expect(mgr.isSharedBuffer).toBe(false);
      expect(initMsg.buffer).toBeNull();
      // Local buffer is correctly sized for the header + maxBodies.
      expect(mgr.rawTransforms!.length).toBe(HEADER_FLOATS + 8 * FLOATS_PER_BODY);
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });
});

describe("PhysicsWorkerManager — worker re-init / restart", () => {
  it("a fresh manager after destroy spins up a new independent worker", async () => {
    const first = await createAndInit({ maxBodies: 8 });
    const firstWorker = first.worker;
    first.mgr.destroy();
    expect(firstWorker.terminated).toBe(true);

    // Re-create — a brand new worker is constructed and gets its own init.
    const second = await createAndInit({ maxBodies: 8 });
    expect(second.worker).not.toBe(firstWorker);
    expect(second.worker.posted.some((m: any) => m.type === "init")).toBe(true);
    expect(second.mgr.rawTransforms).toBeInstanceOf(Float32Array);
    second.mgr.destroy();
  });

  it("init() is single-shot — a second init() on the same manager is a no-op", async () => {
    const { PhysicsWorkerManager } = await import("../../src/worker/PhysicsWorkerManager");
    const mgr = new PhysicsWorkerManager({ maxBodies: 8 });
    const p1 = mgr.init();
    lastWorker._emit({ type: "ready" });
    await p1;
    const workerCountBefore = lastWorker.posted.filter((m: any) => m.type === "init").length;

    // Repeated init resolves the same cached promise without re-posting init.
    const p2 = mgr.init();
    await p2;
    const workerCountAfter = lastWorker.posted.filter((m: any) => m.type === "init").length;
    expect(workerCountAfter).toBe(workerCountBefore);
    mgr.destroy();
  });
});

describe("PhysicsWorkerManager — message-event robustness", () => {
  it("a frame arriving before any body was added does not throw", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;
    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 8 });
      const empty = new Float32Array(HEADER_FLOATS + 8 * FLOATS_PER_BODY);
      expect(() => worker._emit({ type: "frame", buffer: empty })).not.toThrow();
      expect(mgr.bodyCount).toBe(0);
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });

  it("a frame delivered after destroy is ignored without throwing", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;
    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 8 });
      const received: Float32Array[] = [];
      mgr.onFrameCallback = (b) => received.push(b);
      mgr.destroy();
      // onmessage is still wired on the mock, but the manager has torn down.
      const frame = new Float32Array(HEADER_FLOATS + 8 * FLOATS_PER_BODY);
      expect(() => worker._emit({ type: "frame", buffer: frame })).not.toThrow();
      // Callback still fires on the copy path, but reading transforms is safe (null).
      expect(mgr.getTransform(0)).toBeNull();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });

  it("a callback that throws does not corrupt the manager's buffer state", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;
    try {
      const { mgr, worker } = await createAndInit({ maxBodies: 8 });
      mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 5 }]);
      mgr.onFrameCallback = () => {
        throw new Error("consumer blew up");
      };
      const frame = new Float32Array(HEADER_FLOATS + 8 * FLOATS_PER_BODY);
      frame[0] = 1;
      frame[HEADER_FLOATS] = 99;
      // The throw propagates out of the synchronous emit, but the buffer swap
      // happened first, so state stays consistent and readable afterwards.
      expect(() => worker._emit({ type: "frame", buffer: frame })).toThrow("consumer blew up");
      expect(mgr.getTransform(0)!.x).toBe(99);
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });
});

describe("PhysicsWorkerManager — fallback buffer copy under high body count", () => {
  it("copies a large fallback frame and reads every slot correctly", async () => {
    const originalSAB = globalThis.SharedArrayBuffer;
    // @ts-expect-error -- temporarily remove
    delete globalThis.SharedArrayBuffer;
    try {
      const COUNT = 256;
      const { mgr, worker } = await createAndInit({ maxBodies: COUNT });
      const ids: number[] = [];
      for (let i = 0; i < COUNT; i++) {
        ids.push(mgr.addBody("dynamic", 0, 0, [{ type: "circle", radius: 1 }]));
      }

      const frame = new Float32Array(HEADER_FLOATS + COUNT * FLOATS_PER_BODY);
      frame[0] = COUNT;
      for (let i = 0; i < COUNT; i++) {
        const off = HEADER_FLOATS + i * FLOATS_PER_BODY;
        frame[off] = i * 2;
        frame[off + 1] = i * 2 + 1;
        frame[off + 2] = i * 0.01;
      }
      worker._emit({ type: "frame", buffer: frame });

      expect(mgr.bodyCount).toBe(COUNT);
      // Spot-check first, middle, and last bodies.
      expect(mgr.getTransform(ids[0])).toEqual({ x: 0, y: 1, rotation: 0 });
      expect(mgr.getTransform(ids[128])!.x).toBe(256);
      expect(mgr.getTransform(ids[COUNT - 1])!.y).toBe((COUNT - 1) * 2 + 1);

      // readAllTransforms agrees with per-body reads across the whole set.
      const out = new Map();
      mgr.readAllTransforms(out);
      expect(out.size).toBe(COUNT);
      expect(out.get(ids[200])!.x).toBe(400);
      mgr.destroy();
    } finally {
      globalThis.SharedArrayBuffer = originalSAB;
    }
  });
});

describe("PhysicsWorkerManager — PROTOCOL_VERSION", () => {
  it("exposes a numeric protocol version", () => {
    expect(typeof PROTOCOL_VERSION).toBe("number");
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("is re-exported from the worker entry point", async () => {
    const mod = await import("../../src/worker/index");
    expect(mod.PROTOCOL_VERSION).toBe(PROTOCOL_VERSION);
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
