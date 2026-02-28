import { describe, it, expect } from "vitest";
import { CbType } from "../../src/callbacks/CbType";
import { ZPP_CbType } from "../../src/native/callbacks/ZPP_CbType";
import { getNape } from "../../src/core/engine";

describe("CbType", () => {
  // --- Construction ---

  it("should construct a new CbType instance", () => {
    const ct = new CbType();
    expect(ct).toBeInstanceOf(CbType);
    expect(ct.zpp_inner).toBeInstanceOf(ZPP_CbType);
  });

  it("should have _inner return this", () => {
    const ct = new CbType();
    expect(ct._inner).toBe(ct);
  });

  it("should link zpp_inner.outer back to the instance", () => {
    const ct = new CbType();
    expect(ct.zpp_inner.outer).toBe(ct);
  });

  it("should assign unique ids to each new CbType", () => {
    const a = new CbType();
    const b = new CbType();
    expect(a.id).not.toBe(b.id);
  });

  // --- Static ANY_* singletons ---

  it("should provide static ANY_BODY singleton", () => {
    const anyBody = CbType.ANY_BODY;
    expect(anyBody).toBeInstanceOf(CbType);
    expect(anyBody._inner).toBeDefined();
    expect(anyBody.zpp_inner).toBeInstanceOf(ZPP_CbType);
  });

  it("should return the same ANY_BODY instance on repeated access", () => {
    expect(CbType.ANY_BODY).toBe(CbType.ANY_BODY);
  });

  it("should provide static ANY_SHAPE singleton", () => {
    const anyShape = CbType.ANY_SHAPE;
    expect(anyShape).toBeInstanceOf(CbType);
    expect(anyShape.zpp_inner).toBeInstanceOf(ZPP_CbType);
  });

  it("should return the same ANY_SHAPE instance on repeated access", () => {
    expect(CbType.ANY_SHAPE).toBe(CbType.ANY_SHAPE);
  });

  it("should provide static ANY_CONSTRAINT singleton", () => {
    const anyConstraint = CbType.ANY_CONSTRAINT;
    expect(anyConstraint).toBeInstanceOf(CbType);
    expect(anyConstraint.zpp_inner).toBeInstanceOf(ZPP_CbType);
  });

  it("should provide static ANY_COMPOUND singleton", () => {
    const anyCompound = CbType.ANY_COMPOUND;
    expect(anyCompound).toBeInstanceOf(CbType);
    expect(anyCompound.zpp_inner).toBeInstanceOf(ZPP_CbType);
  });

  it("should have four distinct ANY_* singletons", () => {
    const singletons = [
      CbType.ANY_BODY,
      CbType.ANY_SHAPE,
      CbType.ANY_CONSTRAINT,
      CbType.ANY_COMPOUND,
    ];
    for (let i = 0; i < singletons.length; i++) {
      for (let j = i + 1; j < singletons.length; j++) {
        expect(singletons[i]).not.toBe(singletons[j]);
      }
    }
  });

  // --- get_ANY_* (compiled code compatibility) ---

  it("should have get_ANY_BODY matching ANY_BODY", () => {
    expect(CbType.get_ANY_BODY()).toBe(CbType.ANY_BODY);
  });

  it("should have get_ANY_SHAPE matching ANY_SHAPE", () => {
    expect(CbType.get_ANY_SHAPE()).toBe(CbType.ANY_SHAPE);
  });

  it("should have get_ANY_CONSTRAINT matching ANY_CONSTRAINT", () => {
    expect(CbType.get_ANY_CONSTRAINT()).toBe(CbType.ANY_CONSTRAINT);
  });

  it("should have get_ANY_COMPOUND matching ANY_COMPOUND", () => {
    expect(CbType.get_ANY_COMPOUND()).toBe(CbType.ANY_COMPOUND);
  });

  // --- id ---

  it("should have numeric id", () => {
    const ct = new CbType();
    expect(typeof ct.id).toBe("number");
    expect(Number.isFinite(ct.id)).toBe(true);
  });

  it("should have numeric ids on ANY_* singletons", () => {
    expect(typeof CbType.ANY_BODY.id).toBe("number");
    expect(typeof CbType.ANY_SHAPE.id).toBe("number");
    expect(typeof CbType.ANY_CONSTRAINT.id).toBe("number");
    expect(typeof CbType.ANY_COMPOUND.id).toBe("number");
  });

  // --- userData ---

  it("should lazily initialize userData to empty object", () => {
    const ct = new CbType();
    const ud = ct.userData;
    expect(ud).toBeDefined();
    expect(typeof ud).toBe("object");
  });

  it("should return the same userData object on repeated access", () => {
    const ct = new CbType();
    const ud1 = ct.userData;
    const ud2 = ct.userData;
    expect(ud1).toBe(ud2);
  });

  it("should allow storing custom data in userData", () => {
    const ct = new CbType();
    ct.userData.myKey = "hello";
    expect(ct.userData.myKey).toBe("hello");
  });

  // --- interactors ---

  it("should have interactors list", () => {
    const ct = new CbType();
    const interactors = ct.interactors;
    expect(interactors).toBeDefined();
  });

  it("should return the same interactors list on repeated access", () => {
    const ct = new CbType();
    expect(ct.interactors).toBe(ct.interactors);
  });

  // --- constraints ---

  it("should have constraints list", () => {
    const ct = new CbType();
    const constraints = ct.constraints;
    expect(constraints).toBeDefined();
  });

  it("should return the same constraints list on repeated access", () => {
    const ct = new CbType();
    expect(ct.constraints).toBe(ct.constraints);
  });

  // --- toString ---

  it("should return 'ANY_BODY' for ANY_BODY singleton", () => {
    expect(CbType.ANY_BODY.toString()).toBe("ANY_BODY");
  });

  it("should return 'ANY_SHAPE' for ANY_SHAPE singleton", () => {
    expect(CbType.ANY_SHAPE.toString()).toBe("ANY_SHAPE");
  });

  it("should return 'ANY_COMPOUND' for ANY_COMPOUND singleton", () => {
    expect(CbType.ANY_COMPOUND.toString()).toBe("ANY_COMPOUND");
  });

  it("should return 'ANY_CONSTRAINT' for ANY_CONSTRAINT singleton", () => {
    expect(CbType.ANY_CONSTRAINT.toString()).toBe("ANY_CONSTRAINT");
  });

  it("should return 'CbType#<id>' for custom CbTypes", () => {
    const ct = new CbType();
    expect(ct.toString()).toBe("CbType#" + ct.id);
  });

  // --- _wrap ---

  it("should wrap a CbType instance (identity)", () => {
    const ct = new CbType();
    expect(CbType._wrap(ct)).toBe(ct);
  });

  it("should wrap a ZPP_CbType inner", () => {
    const ct = new CbType();
    const wrapped = CbType._wrap(ct.zpp_inner);
    expect(wrapped).toBeInstanceOf(CbType);
    expect(wrapped.zpp_inner).toBe(ct.zpp_inner);
  });

  it("should wrap an object with zpp_inner", () => {
    const ct = new CbType();
    const obj = { zpp_inner: ct.zpp_inner };
    const wrapped = CbType._wrap(obj);
    expect(wrapped).toBeInstanceOf(CbType);
    expect(wrapped.zpp_inner).toBe(ct.zpp_inner);
  });

  it("should return null for falsy values", () => {
    expect(CbType._wrap(null)).toBeNull();
    expect(CbType._wrap(undefined)).toBeNull();
    expect(CbType._wrap(0)).toBeNull();
  });

  // --- __name__ ---

  it("should have correct __name__ metadata", () => {
    expect(CbType.__name__).toEqual(["nape", "callbacks", "CbType"]);
  });

  // --- Namespace registration ---

  it("should be registered in the nape namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.CbType).toBe(CbType);
  });
});
