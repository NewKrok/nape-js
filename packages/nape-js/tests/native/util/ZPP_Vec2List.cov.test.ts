/**
 * ZPP_Vec2List — backing-state bookkeeping for Vec2List (issue #167).
 */
import { describe, it, expect } from "vitest";
import "../../../src/index";
import { ZPP_Vec2List } from "../../../src/native/util/ZPP_Vec2List";
import { ZNPList_ZPP_Vec2 } from "../../../src/native/util/ZNPRegistry";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";

describe("ZPP_Vec2List — coverage", () => {
  it("starts invalidated with an empty ZNPList_ZPP_Vec2", () => {
    const zl = new ZPP_Vec2List();
    expect(zl.inner).toBeInstanceOf(ZNPList_ZPP_Vec2);
    expect(zl.inner.length).toBe(0);
    expect(zl._invalidated).toBe(true);
  });

  it("valmod() consumes the inner modified/pushmod flags exactly once", () => {
    const zl = new ZPP_Vec2List();
    const node = {} as any;
    zl.at_ite = node;
    zl.push_ite = node;
    zl.inner.add(new ZPP_Vec2()); // modified, not pushmod
    zl.zip_length = false;
    zl.valmod();
    expect(zl.at_ite).toBeNull();
    expect(zl.push_ite).toBe(node); // push cursor survives a plain add
    expect(zl.zip_length).toBe(true);
    expect(zl.inner.modified).toBe(false);

    zl.inner.pop(); // empties the list → pushmod
    expect(zl.inner.pushmod).toBe(true);
    zl.valmod();
    expect(zl.push_ite).toBeNull();
    expect(zl.inner.pushmod).toBe(false);

    // Unmodified → no-op.
    zl.at_ite = node;
    zl.zip_length = false;
    zl.valmod();
    expect(zl.at_ite).toBe(node);
    expect(zl.zip_length).toBe(false);
  });

  it("validate() calls _validate once per invalidate(); invalidate() notifies with self", () => {
    const zl = new ZPP_Vec2List();
    let v = 0;
    const seen: unknown[] = [];
    zl._validate = () => v++;
    zl._invalidate = (s) => seen.push(s);
    zl.validate();
    zl.validate();
    expect(v).toBe(1);
    zl.invalidate();
    expect(seen).toEqual([zl]);
    zl.valmod();
    expect(v).toBe(2);
  });

  it("modify_test() delegates to _modifiable when present", () => {
    const zl = new ZPP_Vec2List();
    expect(() => zl.modify_test()).not.toThrow();
    zl._modifiable = () => {
      throw new Error("nope");
    };
    expect(() => zl.modify_test()).toThrow("nope");
  });

  it("modified() marks the length dirty and drops both cursors", () => {
    const zl = new ZPP_Vec2List();
    zl.at_ite = {};
    zl.push_ite = {};
    zl.zip_length = false;
    zl.modified();
    expect(zl.zip_length).toBe(true);
    expect(zl.at_ite).toBeNull();
    expect(zl.push_ite).toBeNull();
  });
});
