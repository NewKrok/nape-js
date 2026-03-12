import { describe, it, expect } from "vitest";
import { FluidArbiter } from "../../src/dynamics/FluidArbiter";
import { Arbiter } from "../../src/dynamics/Arbiter";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { PreListener } from "../../src/callbacks/PreListener";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { BodyType } from "../../src/phys/BodyType";
import { FluidProperties } from "../../src/phys/FluidProperties";
import "../../src/dynamics/Contact";

/**
 * Helper: create a space with a fluid-enabled static shape and a dynamic body.
 *
 * Fluid arbiters are transient and do not persist in space.arbiters after
 * the step completes. All fluid arbiter access must happen inside callbacks.
 *
 * This helper uses an ONGOING listener (which fires after BEGIN, once the
 * solver has populated impulse data) to capture the FluidArbiter and its
 * base Arbiter reference for testing impulse methods and properties.
 */
function createFluidScene() {
  const space = new Space(new Vec2(0, 400));

  let captured: FluidArbiter | null = null;
  let capturedArbBase: Arbiter | null = null;

  const listener = new InteractionListener(
    CbEvent.ONGOING,
    InteractionType.FLUID,
    CbType.ANY_BODY,
    CbType.ANY_BODY,
    (cb: any) => {
      const arbiters = cb.arbiters;
      for (let i = 0; i < arbiters.length; i++) {
        const arb = arbiters.at(i);
        if (arb.isFluidArbiter()) {
          captured = arb.fluidArbiter;
          capturedArbBase = arb;
          break;
        }
      }
    },
  );
  listener.space = space;

  // Static body with a large fluid-enabled polygon
  const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
  const fluidShape = new Polygon(Polygon.box(1000, 1000));
  fluidShape.fluidEnabled = true;
  fluidShape.fluidProperties = new FluidProperties(3, 5);
  fluidBody.shapes.add(fluidShape as any);
  fluidBody.space = space;

  // Dynamic circle starting inside the fluid region
  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  ball.shapes.add(new Circle(20));
  ball.space = space;

  // First step triggers BEGIN; second step triggers ONGOING with solver data
  space.step(1 / 60, 10, 10);
  space.step(1 / 60, 10, 10);

  return { space, fluidBody, ball, captured, capturedArbBase };
}

/**
 * Helper: create a fluid scene using a BEGIN callback for initial detection tests.
 */
function createFluidSceneBegin() {
  const space = new Space(new Vec2(0, 400));

  let captured: FluidArbiter | null = null;

  const listener = new InteractionListener(
    CbEvent.BEGIN,
    InteractionType.FLUID,
    CbType.ANY_BODY,
    CbType.ANY_BODY,
    (cb: any) => {
      const arbiters = cb.arbiters;
      for (let i = 0; i < arbiters.length; i++) {
        const arb = arbiters.at(i);
        if (arb.isFluidArbiter()) {
          captured = arb.fluidArbiter;
          break;
        }
      }
    },
  );
  listener.space = space;

  const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
  const fluidShape = new Polygon(Polygon.box(1000, 1000));
  fluidShape.fluidEnabled = true;
  fluidShape.fluidProperties = new FluidProperties(3, 5);
  fluidBody.shapes.add(fluidShape as any);
  fluidBody.space = space;

  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  ball.shapes.add(new Circle(20));
  ball.space = space;

  space.step(1 / 60);

  return { space, fluidBody, ball, captured };
}

describe("FluidArbiter", () => {
  // -------------------------------------------------------------------------
  // Construction guards
  // -------------------------------------------------------------------------

  it("cannot be instantiated directly", () => {
    expect(() => new FluidArbiter()).toThrow("Cannot instantiate");
  });

  // -------------------------------------------------------------------------
  // Callback-captured FluidArbiter (BEGIN)
  // -------------------------------------------------------------------------

  describe("fluid interaction via BEGIN callback", () => {
    it("captures a FluidArbiter in the BEGIN callback", () => {
      const { captured } = createFluidSceneBegin();
      expect(captured).not.toBeNull();
      expect(captured).toBeInstanceOf(FluidArbiter);
    });

    it("is also an instance of Arbiter", () => {
      const { captured } = createFluidSceneBegin();
      expect(captured).not.toBeNull();
      expect(captured).toBeInstanceOf(Arbiter);
    });

    it("isFluidArbiter() returns true", () => {
      const { captured } = createFluidSceneBegin();
      expect(captured).not.toBeNull();
      const arb = captured as unknown as Arbiter;
      expect(arb.isFluidArbiter()).toBe(true);
      expect(arb.isCollisionArbiter()).toBe(false);
      expect(arb.isSensorArbiter()).toBe(false);
    });

    it("position is defined", () => {
      const { captured } = createFluidSceneBegin();
      expect(captured).not.toBeNull();
      const pos = captured!.position;
      expect(pos).toBeDefined();
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
    });

    it("overlap is a positive number", () => {
      const { captured } = createFluidSceneBegin();
      expect(captured).not.toBeNull();
      expect(typeof captured!.overlap).toBe("number");
      expect(captured!.overlap).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Callback-captured FluidArbiter (ONGOING -- with solver data)
  // -------------------------------------------------------------------------

  describe("fluid interaction via ONGOING callback", () => {
    it("captures a FluidArbiter in the ONGOING callback", () => {
      const { captured } = createFluidScene();
      expect(captured).not.toBeNull();
      expect(captured).toBeInstanceOf(FluidArbiter);
    });

    it("fluidArbiter getter on base Arbiter returns the FluidArbiter", () => {
      const { capturedArbBase } = createFluidScene();
      expect(capturedArbBase).not.toBeNull();
      expect(capturedArbBase!.fluidArbiter).not.toBeNull();
      expect(capturedArbBase!.collisionArbiter).toBeNull();
    });

    it("type checks are correct on the base Arbiter", () => {
      const { capturedArbBase } = createFluidScene();
      expect(capturedArbBase).not.toBeNull();
      expect(capturedArbBase!.isFluidArbiter()).toBe(true);
      expect(capturedArbBase!.isCollisionArbiter()).toBe(false);
      expect(capturedArbBase!.isSensorArbiter()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Impulse methods (use ONGOING scene so solver has run)
  // -------------------------------------------------------------------------

  describe("impulse methods", () => {
    it("buoyancyImpulse() returns a Vec3", () => {
      const { captured } = createFluidScene();
      expect(captured).not.toBeNull();
      const imp = captured!.buoyancyImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("dragImpulse() returns a Vec3", () => {
      const { captured } = createFluidScene();
      expect(captured).not.toBeNull();
      const imp = captured!.dragImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("totalImpulse() returns a Vec3", () => {
      const { captured } = createFluidScene();
      expect(captured).not.toBeNull();
      const imp = captured!.totalImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("buoyancyImpulse(body) scoped to a specific body", () => {
      const { captured, capturedArbBase, ball } = createFluidScene();
      expect(captured).not.toBeNull();
      expect(capturedArbBase).not.toBeNull();
      const body = capturedArbBase!.body1 === ball ? ball : capturedArbBase!.body2;
      const imp = captured!.buoyancyImpulse(body);
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("dragImpulse(body) scoped to a specific body", () => {
      const { captured, capturedArbBase, ball } = createFluidScene();
      expect(captured).not.toBeNull();
      expect(capturedArbBase).not.toBeNull();
      const body = capturedArbBase!.body1 === ball ? ball : capturedArbBase!.body2;
      const imp = captured!.dragImpulse(body);
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
    });

    it("totalImpulse(body) scoped to a specific body", () => {
      const { captured, capturedArbBase, ball } = createFluidScene();
      expect(captured).not.toBeNull();
      expect(capturedArbBase).not.toBeNull();
      const body = capturedArbBase!.body1 === ball ? ball : capturedArbBase!.body2;
      const imp = captured!.totalImpulse(body);
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // Mutable property guards via PreListener
  // -------------------------------------------------------------------------

  describe("mutable property guards", () => {
    it("can modify position and overlap inside a pre-handler", () => {
      const space = new Space(new Vec2(0, 400));
      let positionModified = false;
      let overlapModified = false;

      const preListener = new PreListener(
        InteractionType.FLUID,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        (cb: any) => {
          const arb = cb.arbiter;
          if (arb.isFluidArbiter()) {
            const farb = arb.fluidArbiter;
            farb.position = Vec2.weak(5, 5);
            positionModified = true;
            farb.overlap = 50;
            overlapModified = true;
          }
          return PreFlag.ACCEPT;
        },
      );
      preListener.space = space;

      const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
      const fluidShape = new Polygon(Polygon.box(1000, 1000));
      fluidShape.fluidEnabled = true;
      fluidShape.fluidProperties = new FluidProperties(3, 5);
      fluidBody.shapes.add(fluidShape as any);
      fluidBody.space = space;

      const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      ball.shapes.add(new Circle(20));
      ball.space = space;

      for (let i = 0; i < 5; i++) {
        space.step(1 / 60);
        if (positionModified) break;
      }

      expect(positionModified).toBe(true);
      expect(overlapModified).toBe(true);
    });

    it("setting position outside pre-handler throws", () => {
      const { captured } = createFluidScene();
      expect(captured).not.toBeNull();
      expect(() => {
        captured!.position = Vec2.weak(10, 10);
      }).toThrow("mutable only within a pre-handler");
    });

    it("setting overlap outside pre-handler throws", () => {
      const { captured } = createFluidScene();
      expect(captured).not.toBeNull();
      expect(() => {
        captured!.overlap = 100;
      }).toThrow("mutable only within a pre-handler");
    });
  });

  // -------------------------------------------------------------------------
  // toString
  // -------------------------------------------------------------------------

  describe("toString", () => {
    it("includes FluidArbiter in the string", () => {
      const { capturedArbBase } = createFluidScene();
      expect(capturedArbBase).not.toBeNull();
      const str = capturedArbBase!.toString();
      expect(str).toContain("FluidArbiter");
    });
  });
});
