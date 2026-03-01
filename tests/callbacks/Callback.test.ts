import { describe, it, expect } from "vitest";
import { Callback } from "../../src/callbacks/Callback";
import { BodyCallback } from "../../src/callbacks/BodyCallback";
import { ConstraintCallback } from "../../src/callbacks/ConstraintCallback";
import { InteractionCallback } from "../../src/callbacks/InteractionCallback";
import { PreCallback } from "../../src/callbacks/PreCallback";
import { ZPP_Callback } from "../../src/native/callbacks/ZPP_Callback";
import { getNape } from "../../src/core/engine";

describe("Callback", () => {
  it("should have correct __name__", () => {
    expect(Callback.__name__).toEqual(["nape", "callbacks", "Callback"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new Callback()).toThrow("Callback cannot be instantiated");
  });

  it("should be registered in namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.Callback).toBe(Callback);
  });

  it("should have __class__ set on prototype", () => {
    expect((Callback.prototype as any).__class__).toBe(Callback);
  });

  it("should create via internal flag", () => {
    ZPP_Callback.internal = true;
    const cb = new Callback();
    ZPP_Callback.internal = false;
    expect(cb).toBeInstanceOf(Callback);
    expect(cb.zpp_inner).toBeNull();
  });
});

describe("BodyCallback", () => {
  it("should have correct __name__", () => {
    expect(BodyCallback.__name__).toEqual(["nape", "callbacks", "BodyCallback"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new BodyCallback()).toThrow("Callback cannot be instantiated");
  });

  it("should extend Callback", () => {
    ZPP_Callback.internal = true;
    const cb = new BodyCallback();
    ZPP_Callback.internal = false;
    expect(cb).toBeInstanceOf(Callback);
    expect(cb).toBeInstanceOf(BodyCallback);
  });

  it("should be registered in namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.BodyCallback).toBe(BodyCallback);
  });

  it("should have __super__ set", () => {
    expect((BodyCallback as any).__super__).toBe(Callback);
  });
});

describe("ConstraintCallback", () => {
  it("should have correct __name__", () => {
    expect(ConstraintCallback.__name__).toEqual(["nape", "callbacks", "ConstraintCallback"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new ConstraintCallback()).toThrow("Callback cannot be instantiated");
  });

  it("should extend Callback", () => {
    ZPP_Callback.internal = true;
    const cb = new ConstraintCallback();
    ZPP_Callback.internal = false;
    expect(cb).toBeInstanceOf(Callback);
    expect(cb).toBeInstanceOf(ConstraintCallback);
  });

  it("should be registered in namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.ConstraintCallback).toBe(ConstraintCallback);
  });
});

describe("InteractionCallback", () => {
  it("should have correct __name__", () => {
    expect(InteractionCallback.__name__).toEqual(["nape", "callbacks", "InteractionCallback"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new InteractionCallback()).toThrow("Callback cannot be instantiated");
  });

  it("should extend Callback", () => {
    ZPP_Callback.internal = true;
    const cb = new InteractionCallback();
    ZPP_Callback.internal = false;
    expect(cb).toBeInstanceOf(Callback);
    expect(cb).toBeInstanceOf(InteractionCallback);
  });

  it("should be registered in namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.InteractionCallback).toBe(InteractionCallback);
  });
});

describe("PreCallback", () => {
  it("should have correct __name__", () => {
    expect(PreCallback.__name__).toEqual(["nape", "callbacks", "PreCallback"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new PreCallback()).toThrow("Callback cannot be instantiated");
  });

  it("should extend Callback", () => {
    ZPP_Callback.internal = true;
    const cb = new PreCallback();
    ZPP_Callback.internal = false;
    expect(cb).toBeInstanceOf(Callback);
    expect(cb).toBeInstanceOf(PreCallback);
  });

  it("should be registered in namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.PreCallback).toBe(PreCallback);
  });
});
