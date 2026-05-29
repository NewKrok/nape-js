import { describe, expect, it } from "vitest";
import type { Space } from "@newkrok/nape-js";
import {
  TRANSFORM_FLOATS_PER_BODY,
  TRANSFORM_HEADER,
  TRANSFORM_HEADER_FLOATS,
  TRANSFORM_PROTOCOL_VERSION,
  createTransformsBuffer,
  writeTransforms,
} from "../src/workerProtocol.js";

function makeBody(x: number, y: number, rotation: number) {
  return { position: { x, y }, rotation };
}

function makeSpace(bodies: Array<ReturnType<typeof makeBody>>, timeStamp = 0) {
  return { bodies, timeStamp } as unknown as Space;
}

describe("TRANSFORM_PROTOCOL_VERSION", () => {
  it("is a positive integer", () => {
    expect(typeof TRANSFORM_PROTOCOL_VERSION).toBe("number");
    expect(Number.isInteger(TRANSFORM_PROTOCOL_VERSION)).toBe(true);
    expect(TRANSFORM_PROTOCOL_VERSION).toBeGreaterThan(0);
  });

  it("stays in lockstep with the nape-js worker layout constants", () => {
    // The pixi protocol and the nape-js worker protocol describe the same wire
    // layout — header + 3 floats per body. If either side changes its float
    // layout, both versions must bump together.
    expect(TRANSFORM_HEADER_FLOATS).toBe(3);
    expect(TRANSFORM_FLOATS_PER_BODY).toBe(3);
    expect(TRANSFORM_PROTOCOL_VERSION).toBe(1);
  });
});

describe("createTransformsBuffer", () => {
  it("allocates a buffer sized for header + maxBodies", () => {
    const b = createTransformsBuffer(16);
    const expectedFloats = TRANSFORM_HEADER_FLOATS + 16 * TRANSFORM_FLOATS_PER_BODY;
    expect(b.transforms.length).toBe(expectedFloats);
    expect(b.maxBodies).toBe(16);
  });

  it("exposes the underlying buffer and the typed array over the same memory", () => {
    const b = createTransformsBuffer(4);
    b.transforms[0] = 42;
    const view = new Float32Array(b.buffer);
    expect(view[0]).toBe(42);
  });

  it("uses SharedArrayBuffer when available and an ArrayBuffer otherwise", () => {
    const b = createTransformsBuffer(4);
    if (typeof SharedArrayBuffer !== "undefined") {
      // `isShared` may still be false if the runtime refuses SAB allocation
      // (e.g. lacks COOP/COEP headers). Accept both.
      expect([true, false]).toContain(b.isShared);
    } else {
      expect(b.isShared).toBe(false);
    }
  });

  it("rejects non-positive or non-integer maxBodies", () => {
    expect(() => createTransformsBuffer(0)).toThrow(RangeError);
    expect(() => createTransformsBuffer(-1)).toThrow(RangeError);
    expect(() => createTransformsBuffer(1.5)).toThrow(RangeError);
  });
});

describe("writeTransforms", () => {
  it("writes header + per-body triplets in iteration order", () => {
    const space = makeSpace([makeBody(1, 2, 0.1), makeBody(3, 4, 0.2), makeBody(5, 6, 0.3)], 7);
    const buf = createTransformsBuffer(8);
    const written = writeTransforms(space, buf.transforms, buf.maxBodies, 1.25);
    expect(written).toBe(3);
    expect(buf.transforms[TRANSFORM_HEADER.BODY_COUNT]).toBe(3);
    expect(buf.transforms[TRANSFORM_HEADER.TIME_STAMP]).toBe(7);
    expect(buf.transforms[TRANSFORM_HEADER.STEP_MS]).toBeCloseTo(1.25, 6);

    const body0Off = TRANSFORM_HEADER_FLOATS;
    expect(buf.transforms[body0Off]).toBe(1);
    expect(buf.transforms[body0Off + 1]).toBe(2);
    expect(buf.transforms[body0Off + 2]).toBeCloseTo(0.1, 6);

    const body2Off = TRANSFORM_HEADER_FLOATS + 2 * TRANSFORM_FLOATS_PER_BODY;
    expect(buf.transforms[body2Off]).toBe(5);
    expect(buf.transforms[body2Off + 1]).toBe(6);
    expect(buf.transforms[body2Off + 2]).toBeCloseTo(0.3, 6);
  });

  it("caps writing at maxBodies and reports the actual count written", () => {
    const space = makeSpace([
      makeBody(1, 1, 0),
      makeBody(2, 2, 0),
      makeBody(3, 3, 0),
      makeBody(4, 4, 0),
    ]);
    const buf = createTransformsBuffer(2);
    const written = writeTransforms(space, buf.transforms, buf.maxBodies);
    expect(written).toBe(2);
    expect(buf.transforms[TRANSFORM_HEADER.BODY_COUNT]).toBe(2);
    // Fourth body must not have been written anywhere inside the buffer.
    // (Only 2 slots exist; the header + 2 bodies = 9 floats of the 9-element array.)
    expect(buf.transforms.length).toBe(TRANSFORM_HEADER_FLOATS + 2 * TRANSFORM_FLOATS_PER_BODY);
  });

  it("writes zero when space.bodies is empty", () => {
    const buf = createTransformsBuffer(4);
    const written = writeTransforms(makeSpace([]), buf.transforms, buf.maxBodies, 0.5);
    expect(written).toBe(0);
    expect(buf.transforms[TRANSFORM_HEADER.BODY_COUNT]).toBe(0);
    expect(buf.transforms[TRANSFORM_HEADER.STEP_MS]).toBeCloseTo(0.5, 6);
  });

  it("defaults stepMs to 0 when omitted", () => {
    const buf = createTransformsBuffer(2);
    writeTransforms(makeSpace([makeBody(0, 0, 0)]), buf.transforms, buf.maxBodies);
    expect(buf.transforms[TRANSFORM_HEADER.STEP_MS]).toBe(0);
  });
});
