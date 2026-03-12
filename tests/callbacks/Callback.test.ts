import { describe, it, expect } from "vitest";
import { Callback } from "../../src/callbacks/Callback";
import { BodyCallback } from "../../src/callbacks/BodyCallback";
import { ConstraintCallback } from "../../src/callbacks/ConstraintCallback";
import { InteractionCallback } from "../../src/callbacks/InteractionCallback";
import { PreCallback } from "../../src/callbacks/PreCallback";
import { ZPP_Callback } from "../../src/native/callbacks/ZPP_Callback";
import { getNape } from "../../src/core/engine";

describe("Callback", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new Callback()).toThrow("Callback cannot be instantiated");
  });

  it("should be registered in namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.Callback).toBe(Callback);
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
  it("should throw on direct instantiation", () => {
    expect(() => new BodyCallback()).toThrow("Callback cannot be instantiated");
  });
});

describe("ConstraintCallback", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new ConstraintCallback()).toThrow("Callback cannot be instantiated");
  });
});

describe("InteractionCallback", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new InteractionCallback()).toThrow("Callback cannot be instantiated");
  });
});

describe("PreCallback", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new PreCallback()).toThrow("Callback cannot be instantiated");
  });
});
