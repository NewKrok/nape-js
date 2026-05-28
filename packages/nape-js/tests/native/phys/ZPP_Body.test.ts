import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZPP_Body } from "../../../src/native/phys/ZPP_Body";
import { ZPP_Interactor } from "../../../src/native/phys/ZPP_Interactor";
import { createMockNape, createMockZpp, MockZNPList } from "../_mocks";

function makeShape(area: number, inertia: number, density: number) {
  return {
    area,
    inertia,
    material: { density },
    refmaterial: { density: 0 },
    validate_area_inertia: vi.fn(),
  };
}

function setupBodyStatics() {
  const zpp = createMockZpp();
  zpp.util.ZNPList_ZPP_Arbiter = MockZNPList;
  zpp.util.ZNPList_ZPP_CallbackSet = MockZNPList;
  zpp.util.ZPP_ShapeList = {
    get: (list: any) => ({ zpp_inner: { inner: list } }),
  };
  ZPP_Body._zpp = zpp;
  ZPP_Body._nape = createMockNape();
  ZPP_Interactor._zpp = zpp;
  ZPP_Interactor._nape = createMockNape();
  return zpp;
}

describe("ZPP_Body", () => {
  beforeEach(() => {
    setupBodyStatics();
  });

  describe("mass / inertia recalculation", () => {
    it("recalculates mass and gravity mass from shape densities", () => {
      const body = new ZPP_Body();
      body.type = 2;
      body.zip_mass = true;
      body.zip_gravMass = true;
      body.shapes.add(makeShape(3, 10, 2));
      body.shapes.add(makeShape(4, 20, 0.5));

      body.validate_mass();
      body.validate_gravMass();

      expect(body.cmass).toBe(8);
      expect(body.mass).toBe(8);
      expect(body.imass).toBe(1 / 8);
      expect(body.smass).toBe(1 / 8);
      expect(body.gravMass).toBe(8);
      expect(body.zip_mass).toBe(false);
      expect(body.zip_gravMass).toBe(false);
    });

    it("uses configured gravity mass scaling while preserving computed mass", () => {
      const body = new ZPP_Body();
      body.type = 2;
      body.zip_mass = true;
      body.gravMassMode = 2;
      body.zip_gravMass = true;
      body.gravMassScale = 1.5;
      body.shapes.add(makeShape(2, 5, 4));

      body.validate_gravMass();

      expect(body.mass).toBe(8);
      expect(body.gravMass).toBe(12);
    });

    it("sets infinite mass and inertia for non-dynamic bodies", () => {
      const body = new ZPP_Body();
      body.type = 1;
      body.zip_mass = true;
      body.zip_inertia = true;
      body.shapes.add(makeShape(3, 4, 2));

      body.validate_mass();
      body.validate_inertia();

      expect(body.cmass).toBe(6);
      expect(body.mass).toBe(Infinity);
      expect(body.imass).toBe(0);
      expect(body.cinertia).toBe(24);
      expect(body.inertia).toBe(Infinity);
      expect(body.iinertia).toBe(0);
    });

    it("keeps inertia finite while honoring nomove on dynamic bodies", () => {
      const body = new ZPP_Body();
      body.type = 2;
      body.nomove = true;
      body.zip_mass = true;
      body.zip_inertia = true;
      body.shapes.add(makeShape(2, 3, 1));

      body.validate_mass();
      body.validate_inertia();

      // nomove fixes linear motion but rotation remains
      expect(body.mass).toBe(Infinity);
      expect(body.imass).toBe(0);
      expect(body.inertia).toBe(6);
      expect(body.iinertia).toBeCloseTo(1 / 6);
    });

    it("keeps mass finite while norotate freezes rotation only", () => {
      const body = new ZPP_Body();
      body.type = 2;
      body.norotate = true;
      body.zip_mass = true;
      body.zip_inertia = true;
      body.shapes.add(makeShape(5, 2, 2));

      body.validate_mass();
      body.validate_inertia();

      expect(body.mass).toBe(10);
      expect(body.imass).toBe(0.1);
      expect(body.inertia).toBe(Infinity);
      expect(body.iinertia).toBe(0);
    });

    it("invalidate_mass marks both mass and gravMass dirty and wakes", () => {
      const body = new ZPP_Body();
      body.zip_mass = false;
      body.zip_gravMass = false;
      body.zip_gravMassScale = false;
      // Stub the inherited wake to avoid touching cbSet/space
      const wake = vi.fn();
      (body as any).wake = wake;

      body.invalidate_mass();

      expect(body.zip_mass).toBe(true);
      expect(body.zip_gravMass).toBe(true);
      expect(body.zip_gravMassScale).toBe(true);
      expect(wake).toHaveBeenCalled();
    });

    it("invalidate_type cascades to mass and inertia", () => {
      const body = new ZPP_Body();
      body.zip_mass = false;
      body.zip_inertia = false;
      (body as any).wake = vi.fn();

      body.invalidate_type();

      expect(body.zip_mass).toBe(true);
      expect(body.zip_inertia).toBe(true);
    });

    it("invalidate_shapes also re-flags AABB and centre of mass", () => {
      const body = new ZPP_Body();
      body.zip_aabb = false;
      body.zip_localCOM = false;
      body.zip_worldCOM = false;
      body.zip_mass = false;
      body.zip_inertia = false;
      (body as any).wake = vi.fn();

      body.invalidate_shapes();

      expect(body.zip_aabb).toBe(true);
      expect(body.zip_localCOM).toBe(true);
      expect(body.zip_worldCOM).toBe(true);
      expect(body.zip_mass).toBe(true);
      expect(body.zip_inertia).toBe(true);
    });

    it("gravMassMode INTERNAL (1) skips zip_gravMass on invalidate_gravMass", () => {
      const body = new ZPP_Body();
      body.gravMassMode = 1;
      body.zip_gravMass = false;
      body.zip_gravMassScale = false;
      (body as any).wake = vi.fn();

      body.invalidate_gravMass();

      // mode 1 = gravMass is the source of truth, don't recompute it
      expect(body.zip_gravMass).toBe(false);
      // mode != 2 so scale should be flagged dirty
      expect(body.zip_gravMassScale).toBe(true);
    });

    it("invalidate_gravMassScale only marks scale dirty when mode != 2", () => {
      const body = new ZPP_Body();
      body.gravMassMode = 0;
      body.zip_gravMassScale = false;
      (body as any).wake = vi.fn();

      body.invalidate_gravMassScale();

      expect(body.zip_gravMassScale).toBe(true);
    });

    it("invalidate_gravMassScale defers to invalidate_gravMass when mode == 2", () => {
      const body = new ZPP_Body();
      body.gravMassMode = 2;
      body.zip_gravMass = false;
      body.zip_gravMassScale = false;
      (body as any).wake = vi.fn();

      body.invalidate_gravMassScale();

      expect(body.zip_gravMass).toBe(true);
    });

    it("validate_gravMassScale fills in scale from gravMass/cmass for mode 1", () => {
      const body = new ZPP_Body();
      body.type = 2;
      body.gravMassMode = 1;
      body.cmass = 0; // forces validate_mass to recompute via shapes
      body.zip_mass = true;
      body.zip_gravMassScale = true;
      body.gravMass = 12;
      body.shapes.add(makeShape(2, 5, 3));

      body.validate_gravMassScale();

      // cmass = 2 * 3 = 6, gravMass = 12, scale = 12/6 = 2
      expect(body.cmass).toBe(6);
      expect(body.gravMassScale).toBe(2);
      expect(body.zip_gravMassScale).toBe(false);
    });

    it("validate_gravMassScale resets to 1.0 in default mode", () => {
      const body = new ZPP_Body();
      body.gravMassMode = 0;
      body.zip_gravMassScale = true;
      body.gravMassScale = 99;

      body.validate_gravMassScale();

      expect(body.gravMassScale).toBe(1.0);
    });
  });

  describe("sweep integration (CCD)", () => {
    it("tracks sweep time and integrates position and rotation", () => {
      const body = new ZPP_Body();
      body.posx = 1;
      body.posy = -2;
      body.rot = 0;
      body.axisx = 0;
      body.axisy = 1;
      body.velx = 4;
      body.vely = 3;
      body.angvel = 1;
      body.sweep_angvel = 0.5;

      body.sweepIntegrate(2);

      expect(body.sweepTime).toBe(2);
      expect(body.posx).toBe(9);
      expect(body.posy).toBe(4);
      expect(body.rot).toBe(1);
      expect(body.axisx).toBeCloseTo(Math.sin(1));
      expect(body.axisy).toBeCloseTo(Math.cos(1));
    });

    it("no-ops when sweepTime already matches dt (delta is zero)", () => {
      const body = new ZPP_Body();
      body.posx = 5;
      body.posy = -5;
      body.velx = 10;
      body.vely = 10;
      body.sweepTime = 3;

      body.sweepIntegrate(3);

      expect(body.posx).toBe(5);
      expect(body.posy).toBe(5 - 10); // unchanged
      // posx stays at 5; the assertion above using `-5+10` is hand-derived
      expect(body.posy).toBe(-5);
      expect(body.sweepTime).toBe(3);
    });

    it("rolls subsequent sweepIntegrate forward using the delta from previous sweepTime", () => {
      const body = new ZPP_Body();
      body.posx = 0;
      body.posy = 0;
      body.velx = 2;
      body.vely = 0;
      body.angvel = 0; // disable rotation path

      body.sweepIntegrate(1);
      body.sweepIntegrate(3); // delta = 2

      expect(body.sweepTime).toBe(3);
      expect(body.posx).toBe(6);
    });

    it("uses small-angle Taylor expansion path for tiny rotations", () => {
      const body = new ZPP_Body();
      body.posx = 0;
      body.posy = 0;
      body.rot = 0;
      body.axisx = 0;
      body.axisy = 1;
      body.velx = 0;
      body.vely = 0;
      body.angvel = 1; // non-zero so we enter rotation branch
      body.sweep_angvel = 0.001; // dr*dr = 1e-6 < 1e-4

      body.sweepIntegrate(1);

      // Taylor approximation should produce values very close to true sin/cos
      expect(body.axisx).toBeCloseTo(Math.sin(0.001), 6);
      expect(body.axisy).toBeCloseTo(Math.cos(0.001), 6);
    });

    it("skips rotation update entirely when angvel is zero", () => {
      const body = new ZPP_Body();
      body.axisx = 0;
      body.axisy = 1;
      body.rot = 0.5;
      body.angvel = 0;
      body.sweep_angvel = 5; // even non-zero sweep_angvel should not apply

      body.sweepIntegrate(2);

      expect(body.rot).toBe(0.5);
      expect(body.axisx).toBe(0);
      expect(body.axisy).toBe(1);
    });
  });

  describe("type checks", () => {
    it("isStatic/isDynamic/isKinematic reflect the type code", () => {
      const body = new ZPP_Body();
      body.type = 1;
      expect(body.isStatic()).toBe(true);
      expect(body.isDynamic()).toBe(false);
      expect(body.isKinematic()).toBe(false);

      body.type = 2;
      expect(body.isDynamic()).toBe(true);

      body.type = 3;
      expect(body.isKinematic()).toBe(true);
    });
  });

  describe("rotation helpers", () => {
    it("validate_axis recomputes sin/cos only while zip_axis is set", () => {
      const body = new ZPP_Body();
      body.rot = Math.PI / 4;
      body.zip_axis = true;
      body.axisx = 0;
      body.axisy = 0;

      body.validate_axis();

      expect(body.axisx).toBeCloseTo(Math.sin(Math.PI / 4));
      expect(body.axisy).toBeCloseTo(Math.cos(Math.PI / 4));
      expect(body.zip_axis).toBe(false);
    });

    it("validate_axis is a no-op when zip_axis is false", () => {
      const body = new ZPP_Body();
      body.rot = Math.PI / 2;
      body.zip_axis = false;
      body.axisx = 0.42;
      body.axisy = 0.42;

      body.validate_axis();

      expect(body.axisx).toBe(0.42);
      expect(body.axisy).toBe(0.42);
    });

    it("quick_validate_axis updates axis without clearing the flag", () => {
      const body = new ZPP_Body();
      body.rot = 0;
      body.zip_axis = true;
      body.axisx = 99;
      body.axisy = 99;

      body.quick_validate_axis();

      expect(body.axisx).toBeCloseTo(0);
      expect(body.axisy).toBeCloseTo(1);
      // intentionally does NOT clear zip_axis (quick-path used during step()
      // when other callers will clear it later)
      expect(body.zip_axis).toBe(true);
    });

    it("delta_rot applies the Taylor expansion for small rotations", () => {
      const body = new ZPP_Body();
      body.axisx = 0;
      body.axisy = 1;
      body.zip_axis = true;

      body.delta_rot(0.001); // small dr → Taylor branch

      expect(body.zip_axis).toBe(false);
      // (p*0 + dr*1)*m ≈ 0.001
      expect(body.axisx).toBeCloseTo(0.001, 5);
      expect(body.axisy).toBeCloseTo(1, 5);
    });

    it("delta_rot uses exact sin/cos for large rotations", () => {
      const body = new ZPP_Body();
      body.axisx = 0;
      body.axisy = 1;
      body.rot = Math.PI / 3;
      body.zip_axis = true;

      body.delta_rot(1.0); // dr*dr > 1e-4 → exact branch

      expect(body.zip_axis).toBe(false);
      expect(body.axisx).toBeCloseTo(Math.sin(Math.PI / 3));
      expect(body.axisy).toBeCloseTo(Math.cos(Math.PI / 3));
    });
  });

  describe("velocity / force guards", () => {
    it("force_invalidate rejects non-dynamic bodies", () => {
      const body = new ZPP_Body();
      body.type = 1;
      (body as any).wake = vi.fn();

      expect(() => body.force_invalidate({ x: 1, y: 1 } as any)).toThrow(/Non-dynamic/);
    });

    it("vel_invalidate rejects static bodies", () => {
      const body = new ZPP_Body();
      body.type = 1;

      expect(() => body.vel_invalidate({ x: 1, y: 1 } as any)).toThrow(/Static body/);
    });

    it("force_invalidate writes through and wakes for dynamic bodies", () => {
      const body = new ZPP_Body();
      body.type = 2;
      const wake = vi.fn();
      (body as any).wake = wake;

      body.force_invalidate({ x: 3, y: -4 } as any);

      expect(body.forcex).toBe(3);
      expect(body.forcey).toBe(-4);
      expect(wake).toHaveBeenCalled();
    });

    it("kinvel_invalidate and svel_invalidate write through and wake", () => {
      const body = new ZPP_Body();
      body.type = 3;
      const wake = vi.fn();
      (body as any).wake = wake;

      body.kinvel_invalidate({ x: 5, y: 6 } as any);
      body.svel_invalidate({ x: 7, y: 8 } as any);

      expect(body.kinvelx).toBe(5);
      expect(body.kinvely).toBe(6);
      expect(body.svelx).toBe(7);
      expect(body.svely).toBe(8);
      expect(wake).toHaveBeenCalledTimes(2);
    });
  });

  describe("AABB validation", () => {
    it("throws if requested with no shapes attached", () => {
      const body = new ZPP_Body();
      expect(() => body.aabb_validate()).toThrow(/bounds only makes sense/);
    });

    it("invalidate_aabb sets zip_aabb", () => {
      const body = new ZPP_Body();
      body.zip_aabb = false;
      body.invalidate_aabb();
      expect(body.zip_aabb).toBe(true);
    });

    it("invalidate_localCOM cascades to worldCOM", () => {
      const body = new ZPP_Body();
      body.zip_localCOM = false;
      body.zip_worldCOM = false;

      body.invalidate_localCOM();

      expect(body.zip_localCOM).toBe(true);
      expect(body.zip_worldCOM).toBe(true);
    });
  });

  describe("immutability guard", () => {
    it("world bodies (Space::world) cannot be mutated", () => {
      const body = new ZPP_Body();
      body.world = true;
      expect(() => body.__immutable_midstep()).toThrow(/Space::world is immutable/);
    });

    it("non-world bodies pass the guard", () => {
      const body = new ZPP_Body();
      body.world = false;
      expect(() => body.__immutable_midstep()).not.toThrow();
    });
  });

  describe("clear()", () => {
    it("rejects clear when body is still in a space", () => {
      const body = new ZPP_Body();
      body.space = { fake: true };
      expect(() => body.clear()).toThrow(
        /Cannot clear a Body if it is currently being used by a Space/,
      );
    });

    it("rejects clear when constraints are attached", () => {
      const body = new ZPP_Body();
      body.constraints.add({ fake: true });
      expect(() => body.clear()).toThrow(/used by a constraint/);
    });

    it("resets all dynamic state and mode flags", () => {
      const body = new ZPP_Body();
      body.posx = 5;
      body.posy = 6;
      body.velx = 1;
      body.vely = 2;
      body.forcex = 3;
      body.forcey = 4;
      body.kinvelx = 5;
      body.kinvely = 6;
      body.svelx = 7;
      body.svely = 8;
      body.angvel = 9;
      body.torque = 10;
      body.kinangvel = 11;
      body.rot = 12;
      body.pre_rot = 13;
      body.massMode = 1;
      body.gravMassMode = 1;
      body.gravMassScale = 4.2;
      body.inertiaMode = 1;
      body.norotate = true;
      body.nomove = true;
      (body as any).wake = vi.fn();

      body.clear();

      expect(body.posx).toBe(0);
      expect(body.posy).toBe(0);
      expect(body.velx).toBe(0);
      expect(body.vely).toBe(0);
      expect(body.forcex).toBe(0);
      expect(body.forcey).toBe(0);
      expect(body.kinvelx).toBe(0);
      expect(body.kinvely).toBe(0);
      expect(body.svelx).toBe(0);
      expect(body.svely).toBe(0);
      expect(body.angvel).toBe(0);
      expect(body.torque).toBe(0);
      expect(body.kinangvel).toBe(0);
      expect(body.rot).toBe(0);
      expect(body.pre_rot).toBe(0);
      expect(body.massMode).toBe(0);
      expect(body.gravMassMode).toBe(0);
      expect(body.gravMassScale).toBe(1.0);
      expect(body.inertiaMode).toBe(0);
      expect(body.norotate).toBe(false);
      expect(body.nomove).toBe(false);
      expect(body.axisx).toBe(0);
      expect(body.axisy).toBe(1);
    });
  });

  describe("refreshArbiters", () => {
    it("marks every attached arbiter invalidated", () => {
      const body = new ZPP_Body();
      const a = { invalidated: false };
      const b = { invalidated: false };
      body.arbiters.add(a);
      body.arbiters.add(b);

      body.refreshArbiters();

      expect(a.invalidated).toBe(true);
      expect(b.invalidated).toBe(true);
    });

    it("is safe on an empty arbiter list", () => {
      const body = new ZPP_Body();
      expect(() => body.refreshArbiters()).not.toThrow();
    });
  });
});
