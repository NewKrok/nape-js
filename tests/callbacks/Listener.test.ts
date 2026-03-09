import { describe, it, expect } from "vitest";
import { Listener, cbEventToNumber } from "../../src/callbacks/Listener";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { ListenerType } from "../../src/callbacks/ListenerType";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { Space } from "../../src/space/Space";
import { Vec2 } from "../../src/geom/Vec2";

describe("Listener", () => {
  describe("instantiation guard", () => {
    it("cannot be instantiated directly", () => {
      expect(() => new Listener()).toThrow("Cannot instantiate Listener");
    });
  });

  describe("cbEventToNumber", () => {
    it("maps BEGIN to 0", () => {
      expect(cbEventToNumber(CbEvent.BEGIN)).toBe(0);
    });

    it("maps END to 1", () => {
      expect(cbEventToNumber(CbEvent.END)).toBe(1);
    });

    it("maps WAKE to 2", () => {
      expect(cbEventToNumber(CbEvent.WAKE)).toBe(2);
    });

    it("maps SLEEP to 3", () => {
      expect(cbEventToNumber(CbEvent.SLEEP)).toBe(3);
    });

    it("maps BREAK to 4", () => {
      expect(cbEventToNumber(CbEvent.BREAK)).toBe(4);
    });

    it("maps PRE to 5", () => {
      expect(cbEventToNumber(CbEvent.PRE)).toBe(5);
    });

    it("maps ONGOING to 6", () => {
      expect(cbEventToNumber(CbEvent.ONGOING)).toBe(6);
    });

    it("returns -1 for unknown value", () => {
      expect(cbEventToNumber({} as CbEvent)).toBe(-1);
    });
  });

  describe("instanceof", () => {
    it("BodyListener is instanceof Listener", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(listener).toBeInstanceOf(Listener);
    });

    it("InteractionListener is instanceof Listener", () => {
      const listener = new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        () => {},
      );
      expect(listener).toBeInstanceOf(Listener);
    });

    it("ConstraintListener is instanceof Listener", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, () => {});
      expect(listener).toBeInstanceOf(Listener);
    });
  });

  describe("type getter", () => {
    it("returns BODY for BodyListener", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(listener.type).toBe(ListenerType.BODY);
    });

    it("returns CONSTRAINT for ConstraintListener", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, () => {});
      expect(listener.type).toBe(ListenerType.CONSTRAINT);
    });

    it("returns INTERACTION for InteractionListener", () => {
      const listener = new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        () => {},
      );
      expect(listener.type).toBe(ListenerType.INTERACTION);
    });
  });

  describe("event getter", () => {
    it("returns correct CbEvent for BodyListener WAKE", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(listener.event).toBe(CbEvent.WAKE);
    });

    it("returns correct CbEvent for BodyListener SLEEP", () => {
      const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {});
      expect(listener.event).toBe(CbEvent.SLEEP);
    });

    it("returns correct CbEvent for InteractionListener BEGIN", () => {
      const listener = new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        () => {},
      );
      expect(listener.event).toBe(CbEvent.BEGIN);
    });
  });

  describe("event setter", () => {
    it("changes event on BodyListener from WAKE to SLEEP", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(listener.event).toBe(CbEvent.WAKE);
      listener.event = CbEvent.SLEEP;
      expect(listener.event).toBe(CbEvent.SLEEP);
    });

    it("throws when setting event to null", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(() => {
        listener.event = null as unknown as CbEvent;
      }).toThrow("Cannot set listener event type to null");
    });
  });

  describe("precedence getter/setter", () => {
    it("returns default precedence of 0", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(listener.precedence).toBe(0);
    });

    it("returns custom precedence set in constructor", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {}, 5);
      expect(listener.precedence).toBe(5);
    });

    it("setter changes precedence", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      listener.precedence = 10;
      expect(listener.precedence).toBe(10);
    });

    it("setter can set negative precedence", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      listener.precedence = -3;
      expect(listener.precedence).toBe(-3);
    });
  });

  describe("space getter/setter", () => {
    it("returns null initially", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      expect(listener.space).toBeNull();
    });

    it("setter adds listener to space", () => {
      const space = new Space(new Vec2(0, -10));
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      listener.space = space;
      expect(listener.space).toBeInstanceOf(Space);
    });

    it("setter can remove listener from space by setting null", () => {
      const space = new Space(new Vec2(0, -10));
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      listener.space = space;
      expect(listener.space).not.toBeNull();
      listener.space = null;
      expect(listener.space).toBeNull();
    });
  });

  describe("toString", () => {
    it("returns non-empty string for BodyListener", () => {
      const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
      const str = listener.toString();
      expect(str).toBeTruthy();
      expect(str.length).toBeGreaterThan(0);
      expect(str).toContain("BodyListener");
    });

    it("returns non-empty string for ConstraintListener", () => {
      const listener = new ConstraintListener(CbEvent.WAKE, CbType.ANY_CONSTRAINT, () => {});
      const str = listener.toString();
      expect(str).toBeTruthy();
      expect(str).toContain("ConstraintListener");
    });

    it("returns non-empty string for InteractionListener", () => {
      const listener = new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        () => {},
      );
      const str = listener.toString();
      expect(str).toBeTruthy();
      expect(str).toContain("InteractionListener");
    });
  });
});
