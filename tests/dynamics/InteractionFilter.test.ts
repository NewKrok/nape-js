import { describe, it, expect } from "vitest";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";

describe("InteractionFilter", () => {
  it("should construct with default values", () => {
    const f = new InteractionFilter();
    expect(f.collisionGroup).toBe(1);
    expect(f.collisionMask).toBe(-1);
    expect(f.sensorGroup).toBe(1);
    expect(f.sensorMask).toBe(-1);
    expect(f.fluidGroup).toBe(1);
    expect(f.fluidMask).toBe(-1);
  });

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

  it("should construct with custom values", () => {
    const f = new InteractionFilter(2, 0xff, 4, 0x0f, 8, 0xf0);
    expect(f.collisionGroup).toBe(2);
    expect(f.collisionMask).toBe(0xff);
    expect(f.sensorGroup).toBe(4);
    expect(f.sensorMask).toBe(0x0f);
    expect(f.fluidGroup).toBe(8);
    expect(f.fluidMask).toBe(0xf0);
  });

  it("should copy without affecting original", () => {
    const f = new InteractionFilter(2, 0xff, 4, 0x0f, 8, 0xf0);
    const copy = f.copy();
    expect(copy.collisionGroup).toBe(2);
    expect(copy.collisionMask).toBe(0xff);

    copy.collisionGroup = 16;
    copy.sensorGroup = 32;
    expect(f.collisionGroup).toBe(2); // original unchanged
    expect(f.sensorGroup).toBe(4); // original unchanged
  });
});
