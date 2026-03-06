import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { getNape } from "../../../src/core/engine";
import { ZPP_PublicList } from "../../../src/native/util/ZPP_PublicList";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";

describe("ZPP_PublicList (P15 modernized)", () => {
  it("all 13 ZPP_*List classes are registered in zpp_nape.util", () => {
    const zpp = getNape().__zpp;
    const expected = [
      "ZPP_ConstraintList",
      "ZPP_BodyList",
      "ZPP_InteractorList",
      "ZPP_CompoundList",
      "ZPP_ListenerList",
      "ZPP_CbTypeList",
      "ZPP_GeomPolyList",
      "ZPP_RayResultList",
      "ZPP_ConvexResultList",
      "ZPP_EdgeList",
      "ZPP_ShapeList",
      "ZPP_InteractionGroupList",
      "ZPP_ArbiterList",
    ];
    for (const name of expected) {
      expect(zpp.util[name], `${name} should be registered`).toBeDefined();
    }
  });

  it("each ZPP_*List class has static internal = false by default", () => {
    const zpp = getNape().__zpp;
    const names = [
      "ZPP_ConstraintList",
      "ZPP_BodyList",
      "ZPP_InteractorList",
      "ZPP_CompoundList",
      "ZPP_ListenerList",
      "ZPP_CbTypeList",
      "ZPP_GeomPolyList",
      "ZPP_RayResultList",
      "ZPP_ConvexResultList",
      "ZPP_EdgeList",
      "ZPP_ShapeList",
      "ZPP_InteractionGroupList",
      "ZPP_ArbiterList",
    ];
    for (const name of names) {
      expect(zpp.util[name].internal, `${name}.internal`).toBe(false);
    }
  });

  it("ZPP_*List instances are instanceof ZPP_PublicList", () => {
    const zpp = getNape().__zpp;
    const inst = new zpp.util.ZPP_BodyList();
    expect(inst).toBeInstanceOf(ZPP_PublicList);
  });

  it("ZPP_*List constructor initialises all fields correctly", () => {
    const zpp = getNape().__zpp;
    const inst = new zpp.util.ZPP_BodyList();
    expect(inst.user_length).toBe(0);
    expect(inst.zip_length).toBe(false);
    expect(inst.push_ite).toBeNull();
    expect(inst.at_ite).toBeNull();
    expect(inst.at_index).toBe(0);
    expect(inst.reverse_flag).toBe(false);
    expect(inst.dontremove).toBe(false);
    expect(inst.immutable).toBe(false);
    expect(inst.inner).not.toBeNull(); // ZNPList_ZPP_Body created
    expect(inst.outer).toBeNull();
    expect(inst._invalidated).toBe(true);
  });

  it("ZPP_*List.get() returns a public list with the inner list set", () => {
    const zpp = getNape().__zpp;
    const znpList = new zpp.util.ZNPList_ZPP_Body();
    const bodyList = zpp.util.ZPP_BodyList.get(znpList, false);
    expect(bodyList).not.toBeNull();
    expect(bodyList.zpp_inner.inner).toBe(znpList);
    expect(bodyList.zpp_inner.zip_length).toBe(true);
    expect(bodyList.zpp_inner.immutable).toBe(false);
  });

  it("ZPP_*List.get() with imm=true sets immutable", () => {
    const zpp = getNape().__zpp;
    const znpList = new zpp.util.ZNPList_ZPP_Constraint();
    const list = zpp.util.ZPP_ConstraintList.get(znpList, true);
    expect(list.zpp_inner.immutable).toBe(true);
  });

  it("ZPP_PublicList.validate() clears _invalidated flag", () => {
    const zpp = getNape().__zpp;
    const inst = new zpp.util.ZPP_ShapeList();
    expect(inst._invalidated).toBe(true);
    inst.validate();
    expect(inst._invalidated).toBe(false);
  });

  it("ZPP_PublicList.invalidate() sets _invalidated and calls _invalidate callback", () => {
    const zpp = getNape().__zpp;
    const inst = new zpp.util.ZPP_ArbiterList();
    let called = false;
    inst._invalidate = () => { called = true; };
    inst.invalidate();
    expect(inst._invalidated).toBe(true);
    expect(called).toBe(true);
  });

  it("ZPP_PublicList.modify_test() calls _modifiable callback", () => {
    const zpp = getNape().__zpp;
    const inst = new zpp.util.ZPP_EdgeList();
    let called = false;
    inst._modifiable = () => { called = true; };
    inst.modify_test();
    expect(called).toBe(true);
  });

  it("ZPP_PublicList.modified() sets zip_length and clears iterators", () => {
    const zpp = getNape().__zpp;
    const inst = new zpp.util.ZPP_ListenerList();
    inst.at_ite = {};
    inst.push_ite = {};
    inst.modified();
    expect(inst.zip_length).toBe(true);
    expect(inst.at_ite).toBeNull();
    expect(inst.push_ite).toBeNull();
  });

  it("each class has correct __name__", () => {
    const zpp = getNape().__zpp;
    expect(zpp.util.ZPP_BodyList.__name__).toEqual(["zpp_nape", "util", "ZPP_BodyList"]);
    expect(zpp.util.ZPP_ArbiterList.__name__).toEqual(["zpp_nape", "util", "ZPP_ArbiterList"]);
  });

  it("public lists work end-to-end after P15 migration", () => {
    // Verify that body list from Space works (uses ZPP_BodyList internally)
    const space = new Space();
    const body = new Body();
    space.bodies.add(body);
    expect(space.bodies.length).toBe(1);
    space.bodies.remove(body);
    expect(space.bodies.length).toBe(0);
    space.clear();
  });
});
