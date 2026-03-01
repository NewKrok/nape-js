import { describe, it, expect } from "vitest";
import { getNape } from "../../src/core/engine";
import { ConvexResult } from "../../src/geom/ConvexResult";

describe("ConvexResult", () => {
  it("should have correct __name__", () => {
    expect(ConvexResult.__name__).toEqual(["nape", "geom", "ConvexResult"]);
  });

  it("should be registered in nape namespace", () => {
    const nape = getNape();
    expect(nape.geom.ConvexResult).toBe(ConvexResult);
  });

  it("should have __class__ set on prototype", () => {
    expect(ConvexResult.prototype.__class__).toBe(ConvexResult);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new ConvexResult()).toThrow(
      "ConvexResult cannot be instantiated",
    );
  });

  it("should be created via compiled getConvex factory", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2 = nape.geom.Vec2;
    const normal = new Vec2(1, 0);
    const position = new Vec2(5, 5);

    const result = zpp.geom.ZPP_ConvexRayResult.getConvex(
      normal,
      position,
      3.14,
      null,
    );

    expect(result).toBeInstanceOf(ConvexResult);
    expect(result.toi).toBeCloseTo(3.14);
    expect(result.shape).toBeNull();

    result.dispose();
  });

  it("should return normal Vec2", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2 = nape.geom.Vec2;
    const normal = new Vec2(0, 1);
    const position = new Vec2(10, 20);

    const result = zpp.geom.ZPP_ConvexRayResult.getConvex(
      normal,
      position,
      1.0,
      null,
    );

    const n = result.normal;
    expect(n).toBeDefined();

    result.dispose();
  });

  it("should return position Vec2", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2 = nape.geom.Vec2;
    const normal = new Vec2(1, 0);
    const position = new Vec2(42, 7);

    const result = zpp.geom.ZPP_ConvexRayResult.getConvex(
      normal,
      position,
      2.0,
      null,
    );

    const p = result.position;
    expect(p).toBeDefined();

    result.dispose();
  });

  it("should throw after dispose when pool is non-empty", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2 = nape.geom.Vec2;

    // Create two results — dispose the first to seed the pool,
    // then dispose the second so its zpp_inner.next != null.
    const result1 = zpp.geom.ZPP_ConvexRayResult.getConvex(
      new Vec2(1, 0),
      new Vec2(0, 0),
      1.0,
      null,
    );
    const result2 = zpp.geom.ZPP_ConvexRayResult.getConvex(
      new Vec2(0, 1),
      new Vec2(1, 1),
      2.0,
      null,
    );

    result1.dispose();
    result2.dispose();

    // result2 was pooled second → its next points to result1's zpp
    expect(() => result2.toi).toThrow("disposed");
    expect(() => result2.shape).toThrow("disposed");
    expect(() => result2.dispose()).toThrow("disposed");
  });

  it("should have toString", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2 = nape.geom.Vec2;

    const result = zpp.geom.ZPP_ConvexRayResult.getConvex(
      new Vec2(1, 0),
      new Vec2(5, 5),
      2.5,
      null,
    );

    const str = result.toString();
    expect(str).toContain("shape:");
    expect(str).toContain("toi:");
    expect(str).toContain("2.5");

    result.dispose();
  });

  it("should have _inner returning this for backward compat", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2 = nape.geom.Vec2;

    const result = zpp.geom.ZPP_ConvexRayResult.getConvex(
      new Vec2(1, 0),
      new Vec2(0, 0),
      1.0,
      null,
    );

    expect(result._inner).toBe(result);
    result.dispose();
  });
});
