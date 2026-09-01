import { describe, it, expect } from "vitest";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";

describe("BodyListener validation and accessors", () => {
  it("throws for a null handler", () => {
    expect(() => new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, null as any)).toThrow(
      "handler cannot be null",
    );
  });

  it("throws for an event type that is not WAKE or SLEEP", () => {
    expect(() => new BodyListener(CbEvent.BEGIN, CbType.ANY_BODY, () => {})).toThrow(
      "not a valid event type",
    );
    expect(() => new BodyListener(CbEvent.END, CbType.ANY_BODY, () => {})).toThrow(
      "not a valid event type",
    );
  });

  it("accepts both WAKE and SLEEP events", () => {
    const wake = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
    const sleep = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {});
    expect(wake.event).toBe(CbEvent.WAKE);
    expect(sleep.event).toBe(CbEvent.SLEEP);
  });

  it("exposes options and allows replacing them", () => {
    const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
    expect(listener.options).toBeDefined();

    const other = new BodyListener(CbEvent.SLEEP, new CbType(), () => {});
    listener.options = other.options;
    expect(listener.options).toBeDefined();
  });

  it("exposes the handler and allows replacing it, rejecting null", () => {
    const first = () => {};
    const second = () => {};
    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, first);
    expect(listener.handler).toBe(first);

    listener.handler = second;
    expect(listener.handler).toBe(second);

    expect(() => {
      listener.handler = null as any;
    }).toThrow("handler cannot be null");
  });
});
