import { beforeEach, describe, expect, it } from "vitest";
import type { Space } from "@newkrok/nape-js";
import { PixiDebugDraw } from "../src/PixiDebugDraw.js";
import type { ContainerLike, GraphicsLike, PixiFactory } from "../src/PixiDebugDraw.js";

// ---------------------------------------------------------------------------
// Fake PIXI factory — records every call so tests can verify drawing commands.
// ---------------------------------------------------------------------------

interface GraphicsCall {
  method: string;
  args: unknown[];
}

class FakeGraphics implements GraphicsLike {
  calls: GraphicsCall[] = [];
  destroyed = false;
  x = 0;
  y = 0;
  rotation = 0;
  visible = true;

  clear() {
    this.calls.push({ method: "clear", args: [] });
    return this;
  }
  circle(cx: number, cy: number, r: number) {
    this.calls.push({ method: "circle", args: [cx, cy, r] });
    return this;
  }
  poly(points: number[], close?: boolean) {
    this.calls.push({ method: "poly", args: [points, close] });
    return this;
  }
  roundRect(x: number, y: number, w: number, h: number, r: number) {
    this.calls.push({ method: "roundRect", args: [x, y, w, h, r] });
    return this;
  }
  moveTo(x: number, y: number) {
    this.calls.push({ method: "moveTo", args: [x, y] });
    return this;
  }
  lineTo(x: number, y: number) {
    this.calls.push({ method: "lineTo", args: [x, y] });
    return this;
  }
  fill(style: { color?: number; alpha?: number }) {
    this.calls.push({ method: "fill", args: [style] });
    return this;
  }
  stroke(style: { color?: number; alpha?: number; width?: number }) {
    this.calls.push({ method: "stroke", args: [style] });
    return this;
  }
  destroy() {
    this.destroyed = true;
  }
}

class FakeContainer implements ContainerLike {
  children: unknown[] = [];
  destroyed = false;
  visible = true;

  addChild(child: unknown) {
    this.children.push(child);
  }
  removeChild(child: unknown) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
  }
  destroy() {
    this.destroyed = true;
  }
}

const pixi: PixiFactory = {
  Container: FakeContainer,
  Graphics: FakeGraphics,
};

// ---------------------------------------------------------------------------
// Fake nape — minimal shape/body/space stubs covering the debug-draw surface.
// ---------------------------------------------------------------------------

type FakeShape =
  | {
      kind: "circle";
      radius: number;
      localCOM?: { x: number; y: number };
      fluidEnabled?: boolean;
      sensorEnabled?: boolean;
    }
  | {
      kind: "polygon";
      verts: Array<{ x: number; y: number }>;
      localCOM?: { x: number; y: number };
      fluidEnabled?: boolean;
      sensorEnabled?: boolean;
    }
  | {
      kind: "capsule";
      halfLength: number;
      radius: number;
      localCOM?: { x: number; y: number };
      fluidEnabled?: boolean;
      sensorEnabled?: boolean;
    };

function wrapShape(s: FakeShape) {
  const base = {
    fluidEnabled: s.fluidEnabled ?? false,
    sensorEnabled: s.sensorEnabled ?? false,
    localCOM: s.localCOM,
  };
  if (s.kind === "circle") {
    return {
      ...base,
      isCircle: () => true,
      isPolygon: () => false,
      isCapsule: () => false,
      castCircle: { radius: s.radius },
      castPolygon: null,
      castCapsule: null,
    };
  }
  if (s.kind === "polygon") {
    const verts = s.verts;
    return {
      ...base,
      isCircle: () => false,
      isPolygon: () => true,
      isCapsule: () => false,
      castCircle: null,
      castPolygon: {
        localVerts: {
          length: verts.length,
          at: (i: number) => verts[i],
        },
      },
      castCapsule: null,
    };
  }
  return {
    ...base,
    isCircle: () => false,
    // Verified against the engine: a real Capsule answers isPolygon() FALSE
    // and carries its placement in localCOM (unlike a Polygon, whose localCOM
    // is the centroid and whose localVerts are already in body-local space).
    isPolygon: () => false,
    isCapsule: () => true,
    castCircle: null,
    castPolygon: null,
    castCapsule: { halfLength: s.halfLength, radius: s.radius },
  };
}

interface FakeBodyOpts {
  x?: number;
  y?: number;
  rotation?: number;
  shapes?: FakeShape[];
  isStatic?: boolean;
  isSleeping?: boolean;
}

function makeBody(opts: FakeBodyOpts = {}) {
  const shapes = (opts.shapes ?? []).map(wrapShape);
  const body: Record<string, unknown> = {
    position: { x: opts.x ?? 0, y: opts.y ?? 0 },
    rotation: opts.rotation ?? 0,
    shapes,
    isStatic: () => !!opts.isStatic,
    isSleeping: !!opts.isSleeping,
    space: null as unknown,
  };
  return body;
}

function makeSpace(bodies: Array<Record<string, unknown>> = [], constraints: unknown[] = []) {
  // Link bodies back to this pseudo-space
  const space: Record<string, unknown> = {};
  for (const b of bodies) b.space = space;
  space.bodies = bodies;
  space.constraints = {
    length: constraints.length,
    at: (i: number) => constraints[i],
  };
  return space;
}

const asSpace = (s: Record<string, unknown>): Space => s as unknown as Space;

function countCalls(gfx: FakeGraphics, method: string): number {
  return gfx.calls.filter((c) => c.method === method).length;
}

function firstStrokeColor(gfx: FakeGraphics): number | undefined {
  const stroke = gfx.calls.find((c) => c.method === "stroke");
  return (stroke?.args[0] as { color?: number } | undefined)?.color;
}

function firstFillColor(gfx: FakeGraphics): number | undefined {
  const fill = gfx.calls.find((c) => c.method === "fill");
  return (fill?.args[0] as { color?: number } | undefined)?.color;
}

// ---------------------------------------------------------------------------

describe("PixiDebugDraw — container graph", () => {
  it("adds a shapes layer and a constraints graphics to the root container", () => {
    const debug = new PixiDebugDraw({ pixi });
    const root = debug.container as FakeContainer;
    expect(root.children).toHaveLength(2);
    expect(root.children[0]).toBeInstanceOf(FakeContainer); // shapes layer
    expect(root.children[1]).toBeInstanceOf(FakeGraphics); // constraints gfx
  });

  it("creates one Graphics per body on first render and transforms it", () => {
    const bodies = [
      makeBody({ x: 5, y: 7, rotation: 0.3, shapes: [{ kind: "circle", radius: 10 }] }),
      makeBody({ x: -2, y: 4, shapes: [{ kind: "circle", radius: 5 }] }),
    ];
    const space = makeSpace(bodies);
    const debug = new PixiDebugDraw({ pixi });
    debug.render(asSpace(space));
    expect(debug.cachedBodyCount).toBe(2);

    const root = debug.container as FakeContainer;
    const shapesLayer = root.children[0] as FakeContainer;
    expect(shapesLayer.children).toHaveLength(2);

    const [gfxA, gfxB] = shapesLayer.children as FakeGraphics[];
    expect(gfxA.x).toBe(5);
    expect(gfxA.y).toBe(7);
    expect(gfxA.rotation).toBe(0.3);
    expect(gfxB.x).toBe(-2);
  });

  it("drops bindings for bodies whose space has gone null (auto-cleanup)", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    const space = makeSpace([body]);
    const debug = new PixiDebugDraw({ pixi });
    debug.render(asSpace(space));
    expect(debug.cachedBodyCount).toBe(1);

    // Simulate removal: body.space = null; also empty space.bodies.
    body.space = null;
    (space.bodies as unknown[]).length = 0;

    debug.render(asSpace(space));
    expect(debug.cachedBodyCount).toBe(0);
    const shapesLayer = (debug.container as FakeContainer).children[0] as FakeContainer;
    expect(shapesLayer.children).toHaveLength(0);
  });
});

describe("PixiDebugDraw — shape rendering", () => {
  let debug: PixiDebugDraw;

  beforeEach(() => {
    debug = new PixiDebugDraw({ pixi });
  });

  it("draws a circle (fill + outline + rotation indicator) when outlines are on", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;

    expect(countCalls(gfx, "circle")).toBe(2); // fill + outline
    expect(countCalls(gfx, "fill")).toBe(1);
    // 2 strokes: shape outline + rotation indicator
    expect(countCalls(gfx, "stroke")).toBe(2);
    expect(countCalls(gfx, "moveTo")).toBe(1);
    expect(countCalls(gfx, "lineTo")).toBe(1);
  });

  it("omits outlines when showOutlines is false", () => {
    debug = new PixiDebugDraw({ pixi, showOutlines: false });
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    expect(countCalls(gfx, "circle")).toBe(1);
    expect(countCalls(gfx, "stroke")).toBe(0);
  });

  it("rebuilds cached shape graphics when showOutlines flips", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const callsBefore = gfx.calls.length;
    debug.showOutlines = false;
    // Setter must trigger a redraw (clear + circle without stroke)
    expect(gfx.calls.length).toBeGreaterThan(callsBefore);
    // Idempotent — setting to the same value is a no-op.
    const callsAfterFlip = gfx.calls.length;
    debug.showOutlines = false;
    expect(gfx.calls.length).toBe(callsAfterFlip);
  });

  it("draws a polygon from localVerts", () => {
    const body = makeBody({
      shapes: [
        {
          kind: "polygon",
          verts: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
        },
      ],
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const polyCalls = gfx.calls.filter((c) => c.method === "poly");
    expect(polyCalls).toHaveLength(2); // fill + outline
    expect(polyCalls[0].args[0]).toEqual([0, 0, 10, 0, 10, 10, 0, 10]);
    expect(polyCalls[0].args[1]).toBe(true);
  });

  it("skips polygons with fewer than 3 vertices", () => {
    const body = makeBody({
      shapes: [
        {
          kind: "polygon",
          verts: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    expect(countCalls(gfx, "poly")).toBe(0);
  });

  it("draws a capsule via roundRect", () => {
    const body = makeBody({
      shapes: [{ kind: "capsule", halfLength: 20, radius: 5 }],
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const rr = gfx.calls.filter((c) => c.method === "roundRect");
    expect(rr).toHaveLength(2);
    expect(rr[0].args).toEqual([-25, -5, 50, 10, 5]);
  });

  // The Graphics object is positioned from the body transform, so a shape
  // placed off the body origin (compound bodies) must be drawn at its own
  // localCOM — otherwise every shape of a multi-shape body piles up on the
  // body centre.
  it("draws a circle at its localCOM offset", () => {
    const body = makeBody({
      shapes: [{ kind: "circle", radius: 7, localCOM: { x: 40, y: -25 } }],
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const circles = gfx.calls.filter((c) => c.method === "circle");
    expect(circles).toHaveLength(2);
    expect(circles[0].args).toEqual([40, -25, 7]);
  });

  it("draws a capsule at its localCOM offset", () => {
    const body = makeBody({
      shapes: [{ kind: "capsule", halfLength: 20, radius: 5, localCOM: { x: 10, y: 3 } }],
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const rr = gfx.calls.filter((c) => c.method === "roundRect");
    expect(rr[0].args).toEqual([-15, -2, 50, 10, 5]);
  });

  // A Polygon's localCOM is its CENTROID, not a placement offset, and its
  // localVerts are already in body-local space — so shifting a polygon by
  // localCOM would double the offset and displace every wall.
  it("keeps polygons unshifted — localVerts already carry the offset", () => {
    const body = makeBody({
      shapes: [
        {
          kind: "polygon",
          localCOM: { x: 220, y: 70 },
          verts: [
            { x: 200, y: 60 },
            { x: 240, y: 60 },
            { x: 240, y: 80 },
          ],
        },
      ],
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const polys = gfx.calls.filter((c) => c.method === "poly");
    expect(polys[0].args[0]).toEqual([200, 60, 240, 60, 240, 80]);
  });

  it("tolerates a shape with no localCOM", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 4 }] });
    expect(() => debug.render(asSpace(makeSpace([body])))).not.toThrow();
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const circles = gfx.calls.filter((c) => c.method === "circle");
    expect(circles[0].args).toEqual([0, 0, 4]);
  });
});

describe("PixiDebugDraw — colours", () => {
  it("uses staticColor for static bodies regardless of index", () => {
    const body = makeBody({
      isStatic: true,
      shapes: [{ kind: "circle", radius: 10 }],
    });
    const debug = new PixiDebugDraw({ pixi, staticColor: 0x112233 });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    expect(firstFillColor(gfx)).toBe(0x112233);
    expect(firstStrokeColor(gfx)).toBe(0x112233);
  });

  it("uses sleepingColor for sleeping dynamic bodies", () => {
    const body = makeBody({
      isSleeping: true,
      shapes: [{ kind: "circle", radius: 10 }],
    });
    const debug = new PixiDebugDraw({ pixi, sleepingColor: 0xaabbcc });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    expect(firstFillColor(gfx)).toBe(0xaabbcc);
  });

  it("cycles through the palette for awake dynamic bodies", () => {
    const palette = [0x111111, 0x222222, 0x333333];
    const bodies = [
      makeBody({ shapes: [{ kind: "circle", radius: 1 }] }),
      makeBody({ shapes: [{ kind: "circle", radius: 1 }] }),
      makeBody({ shapes: [{ kind: "circle", radius: 1 }] }),
      makeBody({ shapes: [{ kind: "circle", radius: 1 }] }),
    ];
    const debug = new PixiDebugDraw({ pixi, palette });
    debug.render(asSpace(makeSpace(bodies)));
    const children = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children as FakeGraphics[];
    expect(firstFillColor(children[0])).toBe(0x111111);
    expect(firstFillColor(children[1])).toBe(0x222222);
    expect(firstFillColor(children[2])).toBe(0x333333);
    expect(firstFillColor(children[3])).toBe(0x111111); // wraps
  });

  it("colorResolver overrides the default palette", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    const debug = new PixiDebugDraw({
      pixi,
      colorResolver: () => 0xff00ff,
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    expect(firstFillColor(gfx)).toBe(0xff00ff);
  });

  it("colorResolver returning null falls back to the default policy", () => {
    const body = makeBody({
      isStatic: true,
      shapes: [{ kind: "circle", radius: 10 }],
    });
    const debug = new PixiDebugDraw({
      pixi,
      staticColor: 0x654321,
      colorResolver: () => null,
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    expect(firstFillColor(gfx)).toBe(0x654321);
  });

  it("uses fluidColor + fluidFillAlpha for fluid-enabled shapes", () => {
    const body = makeBody({
      shapes: [{ kind: "circle", radius: 10, fluidEnabled: true }],
    });
    const debug = new PixiDebugDraw({
      pixi,
      fluidColor: 0x00ccff,
      fluidFillAlpha: 0.5,
    });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const fill = gfx.calls.find((c) => c.method === "fill")!.args[0] as {
      color: number;
      alpha: number;
    };
    expect(fill.color).toBe(0x00ccff);
    expect(fill.alpha).toBeCloseTo(0.5, 10);
  });

  it("uses sensorFillAlpha for sensor-enabled shapes", () => {
    const body = makeBody({
      shapes: [{ kind: "circle", radius: 10, sensorEnabled: true }],
    });
    const debug = new PixiDebugDraw({ pixi, sensorFillAlpha: 0.02 });
    debug.render(asSpace(makeSpace([body])));
    const gfx = ((debug.container as FakeContainer).children[0] as FakeContainer)
      .children[0] as FakeGraphics;
    const fill = gfx.calls.find((c) => c.method === "fill")!.args[0] as {
      alpha: number;
    };
    expect(fill.alpha).toBeCloseTo(0.02, 10);
  });
});

describe("PixiDebugDraw — constraints", () => {
  it("draws a line between body1 and body2 for linked joints", () => {
    const b1 = makeBody({ x: 0, y: 0, shapes: [{ kind: "circle", radius: 1 }] });
    const b2 = makeBody({ x: 50, y: 20, shapes: [{ kind: "circle", radius: 1 }] });
    const space = makeSpace([b1, b2], [{ body1: b1, body2: b2 }]);
    const debug = new PixiDebugDraw({ pixi });
    debug.render(asSpace(space));

    const cgfx = (debug.container as FakeContainer).children[1] as FakeGraphics;
    expect(cgfx.calls).toEqual([
      { method: "clear", args: [] },
      { method: "moveTo", args: [0, 0] },
      { method: "lineTo", args: [50, 20] },
      { method: "stroke", args: [{ color: 0xd29922, alpha: 0.2, width: 1 }] },
    ]);
  });

  it("skips constraints missing body1 or body2", () => {
    const b1 = makeBody({ x: 0, y: 0, shapes: [] });
    const space = makeSpace([b1], [{ body1: b1 }, {}]);
    const debug = new PixiDebugDraw({ pixi });
    debug.render(asSpace(space));
    const cgfx = (debug.container as FakeContainer).children[1] as FakeGraphics;
    // Only clear, no stroke — nothing was drawable.
    expect(cgfx.calls.map((c) => c.method)).toEqual(["clear"]);
  });

  it("respects drawConstraints=false by hiding the layer", () => {
    const b1 = makeBody({ x: 0, y: 0, shapes: [] });
    const b2 = makeBody({ x: 10, y: 0, shapes: [] });
    const space = makeSpace([b1, b2], [{ body1: b1, body2: b2 }]);
    const debug = new PixiDebugDraw({ pixi, drawConstraints: false });
    debug.render(asSpace(space));
    const cgfx = (debug.container as FakeContainer).children[1] as FakeGraphics;
    expect(cgfx.visible).toBe(false);
    expect(cgfx.calls).toHaveLength(0);
  });

  it("respects drawShapes=false by hiding the shapes layer", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    const debug = new PixiDebugDraw({ pixi, drawShapes: false });
    debug.render(asSpace(makeSpace([body])));
    const shapesLayer = (debug.container as FakeContainer).children[0] as FakeContainer;
    expect(shapesLayer.visible).toBe(false);
    expect(shapesLayer.children).toHaveLength(0);
  });
});

describe("PixiDebugDraw — lifecycle", () => {
  it("dispose() destroys the root container and becomes a no-op for render()", () => {
    const body = makeBody({ shapes: [{ kind: "circle", radius: 10 }] });
    const space = makeSpace([body]);
    const debug = new PixiDebugDraw({ pixi });
    debug.render(asSpace(space));
    debug.dispose();

    const root = debug.container as FakeContainer;
    expect(root.destroyed).toBe(true);
    expect(debug.cachedBodyCount).toBe(0);

    // Second dispose is safe; render after dispose is a no-op.
    expect(() => debug.dispose()).not.toThrow();
    expect(() => debug.render(asSpace(space))).not.toThrow();
  });
});
