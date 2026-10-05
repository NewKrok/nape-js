/**
 * `Config` is exported from the package root and is the object the engine
 * reads at run time — assigning a field changes the simulation.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as nape from "../../src/index";
import { Config } from "../../src/index";
import { Config as InternalConfig } from "../../src/Config";
import { getNape } from "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";

const defaults = { ...InternalConfig };

afterEach(() => {
  Object.assign(Config, defaults);
});

/** Steps until the body falls asleep; returns the step count (or -1). */
function stepsUntilAsleep(max = 400): number {
  const space = new Space();
  const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  body.shapes.add(new Circle(10));
  body.space = space;
  for (let i = 1; i <= max; i++) {
    space.step(1 / 60);
    if (body.isSleeping) return i;
  }
  return -1;
}

describe("Config export", () => {
  it("is the engine's own Config object", () => {
    expect(nape.Config).toBe(InternalConfig);
    expect(getNape().Config).toBe(InternalConfig);
  });

  it("keeps the Haxe nape defaults", () => {
    expect(Config.sleepDelay).toBe(60);
    expect(Config.linearSleepThreshold).toBe(0.2);
    expect(Config.angularSleepThreshold).toBe(0.4);
    expect(Config.collisionSlop).toBe(0.2);
    expect(Config.elasticThreshold).toBe(20);
    expect(Config.epsilon).toBe(1e-8);
    expect(Object.keys(Config)).toHaveLength(28);
  });

  it("changing sleepDelay changes when a resting body falls asleep", () => {
    const atDefault = stepsUntilAsleep();
    Config.sleepDelay = 10;
    const atTen = stepsUntilAsleep();
    expect(atDefault).toBeGreaterThan(0);
    expect(atTen).toBeGreaterThan(0);
    expect(atTen).toBeLessThan(atDefault);
    expect(atDefault - atTen).toBe(50);
  });

  it("a high linearSleepThreshold lets a moving body fall asleep", () => {
    const space = new Space();
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.velocity = new Vec2(5, 0);
    body.space = space;
    Config.linearSleepThreshold = 100;
    Config.sleepDelay = 5;
    for (let i = 0; i < 20; i++) space.step(1 / 60);
    expect(body.isSleeping).toBe(true);
  });
});
