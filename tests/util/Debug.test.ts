import { describe, it, expect } from "vitest";
import { Debug } from "../../src/util/Debug";
import { getNape } from "../../src/core/engine";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Space } from "../../src/space/Space";

describe("Debug (P14 modernized)", () => {
  it("nape.util.Debug is the TS Debug class", () => {
    const nape = getNape();
    expect(nape.util.Debug).toBe(Debug);
  });

  it("version() returns the engine version string", () => {
    expect(Debug.version()).toBe("Nape 2.0.19");
  });

  it("version() is also accessible via nape.util.Debug.version()", () => {
    expect(getNape().util.Debug.version()).toBe("Nape 2.0.19");
  });

  it("clearObjectPools() runs without error on empty pools", () => {
    expect(() => Debug.clearObjectPools()).not.toThrow();
  });

  it("clearObjectPools() runs without error after creating physics objects", () => {
    const space = new Space();
    const body = new Body();
    const circle = new Circle(10);
    body.shapes.add(circle);
    space.bodies.add(body);
    space.step(1 / 60);

    expect(() => Debug.clearObjectPools()).not.toThrow();

    space.clear();
  });

  it("clearObjectPools() nulls out Vec2Iterator pool", () => {
    // Dispose a Vec2 to potentially populate the ZPP_Vec2 pool
    const v = Vec2.get(1, 2);
    v.dispose();

    Debug.clearObjectPools();

    // After clearing, Vec2Iterator pool should be null
    const nape = getNape();
    expect(nape.geom.Vec2Iterator.zpp_pool).toBeNull();
  });

  it("clearObjectPools() can be called multiple times safely", () => {
    expect(() => {
      Debug.clearObjectPools();
      Debug.clearObjectPools();
      Debug.clearObjectPools();
    }).not.toThrow();
  });
});
