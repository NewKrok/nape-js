import { describe, it, expect } from "vitest";
import { PreListener } from "../../src/callbacks/PreListener";
import { Listener } from "../../src/callbacks/Listener";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { ListenerType } from "../../src/callbacks/ListenerType";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { Space } from "../../src/space/Space";
import { Vec2 } from "../../src/geom/Vec2";

describe("PreListener", () => {
  const noop = () => PreFlag.ACCEPT;

  describe("construction", () => {
    it("constructs with COLLISION interaction type", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener).toBeInstanceOf(PreListener);
      expect(listener.interactionType).toBe(InteractionType.COLLISION);
    });

    it("constructs with SENSOR interaction type", () => {
      const listener = new PreListener(
        InteractionType.SENSOR,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener).toBeInstanceOf(PreListener);
      expect(listener.interactionType).toBe(InteractionType.SENSOR);
    });

    it("constructs with FLUID interaction type", () => {
      const listener = new PreListener(
        InteractionType.FLUID,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener).toBeInstanceOf(PreListener);
      expect(listener.interactionType).toBe(InteractionType.FLUID);
    });

    it("throws when handler is null", () => {
      expect(() => {
        new PreListener(
          InteractionType.COLLISION,
          CbType.ANY_BODY,
          CbType.ANY_BODY,
          null as any,
        );
      }).toThrow("PreListener must take a handler");
    });

    it("throws when interaction type is null", () => {
      expect(() => {
        new PreListener(
          null as any,
          CbType.ANY_BODY,
          CbType.ANY_BODY,
          noop,
        );
      }).toThrow("Cannot set listener interaction type to null");
    });
  });

  describe("instanceof", () => {
    it("is instanceof Listener", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener).toBeInstanceOf(Listener);
    });
  });

  describe("type", () => {
    it("returns ListenerType.PRE", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.type).toBe(ListenerType.PRE);
    });
  });

  describe("options1/options2 getters", () => {
    it("options1 returns an OptionType", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.options1).toBeDefined();
      expect(listener.options1).not.toBeNull();
    });

    it("options2 returns an OptionType", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.options2).toBeDefined();
      expect(listener.options2).not.toBeNull();
    });
  });

  describe("handler getter/setter", () => {
    it("returns the handler function", () => {
      const handler = () => PreFlag.ACCEPT;
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        handler,
      );
      expect(listener.handler).toBe(handler);
    });

    it("setter changes handler", () => {
      const handler1 = () => PreFlag.ACCEPT;
      const handler2 = () => PreFlag.IGNORE;
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        handler1,
      );
      expect(listener.handler).toBe(handler1);
      listener.handler = handler2;
      expect(listener.handler).toBe(handler2);
    });

    it("throws when setting handler to null", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(() => {
        listener.handler = null as any;
      }).toThrow("non-null handler");
    });
  });

  describe("pure getter/setter", () => {
    it("defaults to false", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.pure).toBe(false);
    });

    it("can be set to true via constructor", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
        0,
        true,
      );
      expect(listener.pure).toBe(true);
    });

    it("setter changes pure", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.pure).toBe(false);
      listener.pure = true;
      expect(listener.pure).toBe(true);
    });

    it("setter can set back to false", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
        0,
        true,
      );
      listener.pure = false;
      expect(listener.pure).toBe(false);
    });
  });

  describe("interactionType getter/setter", () => {
    it("returns the interaction type set in constructor", () => {
      const listener = new PreListener(
        InteractionType.SENSOR,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.interactionType).toBe(InteractionType.SENSOR);
    });

    it("setter changes interaction type", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.interactionType).toBe(InteractionType.COLLISION);
      listener.interactionType = InteractionType.FLUID;
      expect(listener.interactionType).toBe(InteractionType.FLUID);
    });

    it("throws when setting interaction type to null", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(() => {
        listener.interactionType = null;
      }).toThrow("Cannot set listener interaction type to null");
    });
  });

  describe("precedence", () => {
    it("defaults to 0", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      expect(listener.precedence).toBe(0);
    });

    it("can be set via constructor", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
        12,
      );
      expect(listener.precedence).toBe(12);
    });

    it("can be changed via setter", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      listener.precedence = -5;
      expect(listener.precedence).toBe(-5);
    });
  });

  describe("space", () => {
    it("can be added to a space", () => {
      const space = new Space(new Vec2(0, -10));
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      listener.space = space;
      expect(listener.space).toBeInstanceOf(Space);
    });

    it("can be removed from a space", () => {
      const space = new Space(new Vec2(0, -10));
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      listener.space = space;
      expect(listener.space).not.toBeNull();
      listener.space = null;
      expect(listener.space).toBeNull();
    });
  });

  describe("toString", () => {
    it("returns a string containing PreListener", () => {
      const listener = new PreListener(
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        noop,
      );
      const str = listener.toString();
      expect(str).toContain("PreListener");
      expect(str).toContain("COLLISION");
    });
  });
});
