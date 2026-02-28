import { describe, it, expect } from "vitest";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { ZPP_InteractionFilter } from "../../src/native/dynamics/ZPP_InteractionFilter";

describe("InteractionFilter", () => {
  // --- Constructor ---

  it("should construct with default values", () => {
    const f = new InteractionFilter();
    expect(f.collisionGroup).toBe(1);
    expect(f.collisionMask).toBe(-1);
    expect(f.sensorGroup).toBe(1);
    expect(f.sensorMask).toBe(-1);
    expect(f.fluidGroup).toBe(1);
    expect(f.fluidMask).toBe(-1);
  });

  it("should construct with custom values", () => {
    const f = new InteractionFilter(2, 0xff, 4, 0x0f, 8, 0xf0);
    expect(f.collisionGroup).toBe(2);
    expect(f.collisionMask).toBe(0xff);
    expect(f.sensorGroup).toBe(4);
    expect(f.sensorMask).toBe(0x0f);
    expect(f.fluidGroup).toBe(8);
    expect(f.fluidMask).toBe(0xf0);
  });

  // --- Properties ---

  it("should get/set collisionGroup and collisionMask", () => {
    const f = new InteractionFilter();
    f.collisionGroup = 2;
    f.collisionMask = 0xff;
    expect(f.collisionGroup).toBe(2);
    expect(f.collisionMask).toBe(0xff);
  });

  it("should get/set sensorGroup and sensorMask", () => {
    const f = new InteractionFilter();
    f.sensorGroup = 4;
    f.sensorMask = 0x0f;
    expect(f.sensorGroup).toBe(4);
    expect(f.sensorMask).toBe(0x0f);
  });

  it("should get/set fluidGroup and fluidMask", () => {
    const f = new InteractionFilter();
    f.fluidGroup = 8;
    f.fluidMask = 0xf0;
    expect(f.fluidGroup).toBe(8);
    expect(f.fluidMask).toBe(0xf0);
  });

  it("should not invalidate when setting same value", () => {
    const f = new InteractionFilter(2, 0xff);
    // Setting to same value should be a no-op (no error, same result)
    f.collisionGroup = 2;
    expect(f.collisionGroup).toBe(2);
  });

  // --- shouldCollide / shouldSense / shouldFlow ---

  it("should detect collision between matching filters", () => {
    const a = new InteractionFilter(1, -1);
    const b = new InteractionFilter(1, -1);
    expect(a.shouldCollide(b)).toBe(true);
  });

  it("should not detect collision when masks exclude groups", () => {
    const a = new InteractionFilter(1, 0); // mask=0 matches nothing
    const b = new InteractionFilter(1, -1);
    expect(a.shouldCollide(b)).toBe(false);
  });

  it("should detect collision only when both masks allow both groups", () => {
    const a = new InteractionFilter(1, 2); // group=1, mask=2 (only collides with group 2)
    const b = new InteractionFilter(2, 1); // group=2, mask=1 (only collides with group 1)
    expect(a.shouldCollide(b)).toBe(true);

    const c = new InteractionFilter(1, 2);
    const d = new InteractionFilter(2, 0); // mask=0 blocks everything
    expect(c.shouldCollide(d)).toBe(false);
  });

  it("should detect sensor interaction between matching filters", () => {
    const a = new InteractionFilter(1, -1, 1, -1);
    const b = new InteractionFilter(1, -1, 1, -1);
    expect(a.shouldSense(b)).toBe(true);
  });

  it("should not detect sensor interaction when masks don't match", () => {
    const a = new InteractionFilter(1, -1, 1, 0);
    const b = new InteractionFilter(1, -1, 1, -1);
    expect(a.shouldSense(b)).toBe(false);
  });

  it("should detect fluid interaction between matching filters", () => {
    const a = new InteractionFilter(1, -1, 1, -1, 1, -1);
    const b = new InteractionFilter(1, -1, 1, -1, 1, -1);
    expect(a.shouldFlow(b)).toBe(true);
  });

  it("should not detect fluid interaction when masks don't match", () => {
    const a = new InteractionFilter(1, -1, 1, -1, 1, 0);
    const b = new InteractionFilter(1, -1, 1, -1, 1, -1);
    expect(a.shouldFlow(b)).toBe(false);
  });

  it("should throw when shouldCollide receives null", () => {
    const f = new InteractionFilter();
    expect(() => f.shouldCollide(null as any)).toThrow(
      "filter argument cannot be null",
    );
  });

  it("should throw when shouldSense receives null", () => {
    const f = new InteractionFilter();
    expect(() => f.shouldSense(null as any)).toThrow(
      "filter argument cannot be null",
    );
  });

  it("should throw when shouldFlow receives null", () => {
    const f = new InteractionFilter();
    expect(() => f.shouldFlow(null as any)).toThrow(
      "filter argument cannot be null",
    );
  });

  // --- copy ---

  it("should copy without affecting original", () => {
    const f = new InteractionFilter(2, 0xff, 4, 0x0f, 8, 0xf0);
    const copy = f.copy();
    expect(copy.collisionGroup).toBe(2);
    expect(copy.collisionMask).toBe(0xff);
    expect(copy.sensorGroup).toBe(4);
    expect(copy.sensorMask).toBe(0x0f);
    expect(copy.fluidGroup).toBe(8);
    expect(copy.fluidMask).toBe(0xf0);

    copy.collisionGroup = 16;
    copy.sensorGroup = 32;
    expect(f.collisionGroup).toBe(2);
    expect(f.sensorGroup).toBe(4);
  });

  // --- toString ---

  it("should return hex string representation", () => {
    const f = new InteractionFilter(1, -1, 1, -1, 1, -1);
    const str = f.toString();
    expect(str).toContain("collision:");
    expect(str).toContain("sensor:");
    expect(str).toContain("fluid:");
    expect(str).toContain("00000001");
  });

  // --- userData ---

  it("should lazily create userData object", () => {
    const f = new InteractionFilter();
    const ud = f.userData;
    expect(ud).toBeDefined();
    expect(typeof ud).toBe("object");
  });

  it("should persist userData", () => {
    const f = new InteractionFilter();
    f.userData.foo = "bar";
    expect(f.userData.foo).toBe("bar");
  });

  // --- zpp_inner / _inner ---

  it("should have zpp_inner as ZPP_InteractionFilter instance", () => {
    const f = new InteractionFilter();
    expect(f.zpp_inner).toBeInstanceOf(ZPP_InteractionFilter);
  });

  it("should have _inner returning this", () => {
    const f = new InteractionFilter();
    expect(f._inner).toBe(f);
  });

  // --- _wrap ---

  it("should wrap ZPP_InteractionFilter instance", () => {
    const f = new InteractionFilter(4, 0xf0);
    const wrapped = InteractionFilter._wrap(f.zpp_inner);
    expect(wrapped).toBeInstanceOf(InteractionFilter);
    expect(wrapped.collisionGroup).toBe(4);
  });

  it("should return same instance for same zpp_inner", () => {
    const f = new InteractionFilter();
    const a = InteractionFilter._wrap(f.zpp_inner);
    const b = InteractionFilter._wrap(f.zpp_inner);
    expect(a).toBe(b);
  });

  it("should return instance directly when wrapping an InteractionFilter", () => {
    const f = new InteractionFilter();
    expect(InteractionFilter._wrap(f)).toBe(f);
  });

  it("should return null for null/undefined input", () => {
    expect(InteractionFilter._wrap(null)).toBeNull();
    expect(InteractionFilter._wrap(undefined)).toBeNull();
  });
});
