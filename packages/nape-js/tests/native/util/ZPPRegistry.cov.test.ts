/**
 * ZPPRegistry / ZNPRegistry — namespace registration, static-initializer
 * ordering and the module-local idempotence guard (issue #167).
 */
import { describe, it, expect, vi } from "vitest";
import "../../../src/index";
import { getNape } from "../../../src/core/engine";
import * as ZNP from "../../../src/native/util/ZNPRegistry";
import { registerZNPClasses } from "../../../src/native/util/ZNPRegistry";
import { registerZPPClasses } from "../../../src/native/util/ZPPRegistry";
import { ZPP_Polygon } from "../../../src/native/shape/ZPP_Polygon";
import { ZPP_Space } from "../../../src/native/space/ZPP_Space";
import { ZPP_PubPool } from "../../../src/native/util/ZPP_PubPool";
import { ZNPNode } from "../../../src/native/util/ZNPNode";
import { ZNPList } from "../../../src/native/util/ZNPList";
import { ZPP_Set } from "../../../src/native/util/ZPP_Set";

const exportedClasses = Object.entries(ZNP).filter(
  ([name, v]) => typeof v === "function" && name !== "registerZNPClasses",
) as [string, any][];

describe("ZNPRegistry", () => {
  it("creates zpp.util when missing and registers every exported class under its own name", () => {
    const zpp: any = {};
    registerZNPClasses(zpp);
    expect(zpp.util).toBeTypeOf("object");
    expect(exportedClasses.length).toBeGreaterThanOrEqual(78);
    for (const [name, cls] of exportedClasses) {
      expect(zpp.util[name]).toBe(cls);
    }
    expect(Object.keys(zpp.util).sort()).toEqual(exportedClasses.map(([n]) => n).sort());
  });

  it("reuses an existing util namespace without dropping foreign entries", () => {
    const sentinel = {};
    const util: any = { Foreign: sentinel };
    const zpp: any = { util };
    registerZNPClasses(zpp);
    expect(zpp.util).toBe(util);
    expect(util.Foreign).toBe(sentinel);
    expect(util.ZNPList_ZPP_Vec2).toBe(ZNP.ZNPList_ZPP_Vec2);
  });

  it("ZNPNode_* / ZNPList_* are aliases of the one node / list class; ZPP_Set_* own their pools", () => {
    for (const [name, cls] of exportedClasses) {
      if (name.startsWith("ZNPNode_")) expect(cls).toBe(ZNPNode);
      else if (name.startsWith("ZNPList_")) expect(cls).toBe(ZNPList);
      else if (name.startsWith("ZPP_Set_")) {
        expect(cls.prototype).toBeInstanceOf(ZPP_Set);
        expect(Object.prototype.hasOwnProperty.call(cls, "zpp_pool")).toBe(true);
      }
    }
  });

  it("every list allocates from and frees to the shared node pool (LIFO)", () => {
    const { ZNPList_ZPP_Body, ZNPList_ZPP_Shape } = ZNP;
    ZNPNode.zpp_pool = null;
    const bodies = new ZNPList_ZPP_Body();
    const shapes = new ZNPList_ZPP_Shape();
    bodies.add("a" as any);
    bodies.add("b" as any);
    const nodeA = bodies.head!.next!;
    const nodeB = bodies.head!;
    bodies.pop(); // frees b
    bodies.pop(); // frees a
    expect(ZNPNode.zpp_pool).toBe(nodeA);
    expect(ZNPNode.zpp_pool!.next).toBe(nodeB);
    expect(nodeA.elt).toBeNull();

    // Any list reuses pooled nodes, most recently freed first.
    shapes.add("s" as any);
    expect(shapes.head).toBe(nodeA);
    bodies.add("c" as any);
    expect(bodies.head).toBe(nodeB);
    expect(ZNPNode.zpp_pool).toBeNull();
  });
});

describe("ZPPRegistry (bootstrapped engine)", () => {
  it("the shared namespace exposes the registered ZPP classes", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    expect(zpp.shape.ZPP_Polygon).toBe(ZPP_Polygon);
    expect(zpp.space.ZPP_Space).toBe(ZPP_Space);
    expect(zpp.util.ZPP_PubPool).toBe(ZPP_PubPool);
    expect(zpp.util.ZNPList_ZPP_Vec2).toBe(ZNP.ZNPList_ZPP_Vec2);
    // _nape/_zpp statics were wired during registration.
    expect((ZPP_Polygon as any)._nape).toBe(nape);
    expect((ZPP_Polygon as any)._zpp).toBe(zpp);
    expect((ZPP_Space as any)._zpp).toBe(zpp);
  });

  it("is idempotent: a second call returns its argument without populating it", () => {
    const other: any = { __zpp: {} };
    expect(registerZPPClasses(other)).toBe(other);
    expect(other.__zpp).toEqual({});
    // The real namespace kept its original wiring.
    expect((ZPP_Polygon as any)._nape).toBe(getNape());
  });
});

describe("ZPPRegistry (fresh module instance)", () => {
  it("builds every sub-namespace on an empty zpp object and wires statics in order", async () => {
    vi.resetModules();
    const reg = await import("../../../src/native/util/ZPPRegistry");
    const poly = await import("../../../src/native/shape/ZPP_Polygon");
    const body = await import("../../../src/native/phys/ZPP_Body");
    const collide = await import("../../../src/native/geom/ZPP_Collide");
    const znp = await import("../../../src/native/util/ZNPRegistry");
    const pub = await import("../../../src/native/util/ZPP_PubPool");

    // Fresh module graph → distinct class identities from the bootstrapped ones.
    expect(poly.ZPP_Polygon).not.toBe(ZPP_Polygon);

    const nape: any = { __zpp: {} };
    const ret = reg.registerZPPClasses(nape);
    expect(ret).toBe(nape);
    const zpp = nape.__zpp;
    for (const ns of [
      "callbacks",
      "constraint",
      "dynamics",
      "geom",
      "phys",
      "shape",
      "space",
      "util",
    ]) {
      expect(zpp[ns]).toBeTypeOf("object");
    }
    expect(zpp.shape.ZPP_Polygon).toBe(poly.ZPP_Polygon);
    expect(zpp.phys.ZPP_Body).toBe(body.ZPP_Body);
    expect(zpp.geom.ZPP_Collide).toBe(collide.ZPP_Collide);
    expect(zpp.util.ZPP_PubPool).toBe(pub.ZPP_PubPool);
    // ZNP classes were registered before anything that depends on them.
    expect(zpp.util.ZPP_Set_ZPP_Body).toBe(znp.ZPP_Set_ZPP_Body);
    expect((poly.ZPP_Polygon as any)._nape).toBe(nape);
    expect((poly.ZPP_Polygon as any)._zpp).toBe(zpp);

    // Module-local guard: the same instance never registers twice …
    const second: any = { __zpp: {} };
    expect(reg.registerZPPClasses(second)).toBe(second);
    expect(second.__zpp).toEqual({});
    expect((poly.ZPP_Polygon as any)._nape).toBe(nape);
  });

  it("keeps pre-existing sub-namespace objects and their foreign entries", async () => {
    vi.resetModules();
    const reg = await import("../../../src/native/util/ZPPRegistry");
    const geom: any = { Foreign: 1 };
    const util: any = { Other: 2 };
    const nape: any = { __zpp: { geom, util } };
    reg.registerZPPClasses(nape);
    expect(nape.__zpp.geom).toBe(geom);
    expect(nape.__zpp.util).toBe(util);
    expect(geom.Foreign).toBe(1);
    expect(util.Other).toBe(2);
    expect(geom.ZPP_Vec2).toBeTypeOf("function");
    expect(util.ZNPList_ZPP_Vec2).toBeTypeOf("function");
  });
});
