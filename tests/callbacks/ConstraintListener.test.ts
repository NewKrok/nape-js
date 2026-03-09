import { describe, it, expect } from "vitest";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { Listener } from "../../src/callbacks/Listener";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { ListenerType } from "../../src/callbacks/ListenerType";
import { Space } from "../../src/space/Space";
import { Vec2 } from "../../src/geom/Vec2";

describe("ConstraintListener", () => {
  const noop = () => {};

  describe("construction", () => {
    it("constructs with WAKE event", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      expect(listener).toBeInstanceOf(ConstraintListener);
    });

    it("constructs with SLEEP event", () => {
      const listener = new ConstraintListener(CbEvent.SLEEP, CbType.ANY_CONSTRAINT, noop);
      expect(listener).toBeInstanceOf(ConstraintListener);
      expect(listener.event).toBe(CbEvent.SLEEP);
    });

    it("constructs with BREAK event", () => {
      const listener = new ConstraintListener(CbEvent.BREAK, CbType.ANY_CONSTRAINT, noop);
      expect(listener).toBeInstanceOf(ConstraintListener);
      expect(listener.event).toBe(CbEvent.BREAK);
    });

    it("throws for invalid event BEGIN", () => {
      expect(() => {
        new ConstraintListener(CbEvent.BEGIN, CbType.ANY_CONSTRAINT, noop);
      }).toThrow("is not a valid event type for a ConstraintListener");
    });

    it("throws for invalid event END", () => {
      expect(() => {
        new ConstraintListener(CbEvent.END, CbType.ANY_CONSTRAINT, noop);
      }).toThrow("is not a valid event type for a ConstraintListener");
    });

    it("throws for invalid event ONGOING", () => {
      expect(() => {
        new ConstraintListener(CbEvent.ONGOING, CbType.ANY_CONSTRAINT, noop);
      }).toThrow("is not a valid event type for a ConstraintListener");
    });

    it("throws when handler is null", () => {
      expect(() => {
        new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, null as any);
      }).toThrow("handler cannot be null");
    });
  });

  describe("instanceof", () => {
    it("is instanceof Listener", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      expect(listener).toBeInstanceOf(Listener);
    });
  });

  describe("type", () => {
    it("returns ListenerType.CONSTRAINT", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      expect(listener.type).toBe(ListenerType.CONSTRAINT);
    });
  });

  describe("options getter", () => {
    it("returns an OptionType", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      const options = listener.options;
      expect(options).toBeDefined();
      expect(options).not.toBeNull();
    });
  });

  describe("handler getter/setter", () => {
    it("returns the handler function", () => {
      const handler = () => {};
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, handler);
      expect(listener.handler).toBe(handler);
    });

    it("setter changes handler", () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, handler1);
      expect(listener.handler).toBe(handler1);
      listener.handler = handler2;
      expect(listener.handler).toBe(handler2);
    });

    it("throws when setting handler to null", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      expect(() => {
        listener.handler = null as any;
      }).toThrow("handler cannot be null");
    });
  });

  describe("precedence", () => {
    it("defaults to 0", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      expect(listener.precedence).toBe(0);
    });

    it("can be set via constructor", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop, 7);
      expect(listener.precedence).toBe(7);
    });

    it("can be changed via setter", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      listener.precedence = 42;
      expect(listener.precedence).toBe(42);
    });
  });

  describe("space", () => {
    it("can be added to a space", () => {
      const space = new Space(new Vec2(0, -10));
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      listener.space = space;
      expect(listener.space).toBeInstanceOf(Space);
    });

    it("can be removed from a space", () => {
      const space = new Space(new Vec2(0, -10));
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      listener.space = space;
      expect(listener.space).not.toBeNull();
      listener.space = null;
      expect(listener.space).toBeNull();
    });
  });

  describe("toString", () => {
    it("returns a string containing ConstraintListener", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, noop);
      const str = listener.toString();
      expect(str).toContain("ConstraintListener");
      expect(str).toContain("WAKE");
    });
  });
});
