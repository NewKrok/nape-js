/**
 * Listener lifecycle during dispatch (issue #162): exceptions thrown from
 * handlers, listeners added/removed while callbacks are being delivered,
 * CbType.ANY_* wildcards, fire-order determinism, and changing a listener's
 * event / interactionType / options / precedence while it lives in a Space.
 *
 * Dispatch model (faithful to upstream nape): during `space.step()` callbacks
 * are queued; after the step's internal work is done (`midstep` false) the
 * queue is drained FIFO and each handler is invoked.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { OptionType } from "../../src/callbacks/OptionType";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PivotJoint } from "../../src/constraint/PivotJoint";

const DT = 1 / 60;

/** Two circles overlapping from the first step on (zero gravity). */
function pair(tag?: CbType, x2 = 15) {
  const space = new Space();
  const bodies: Body[] = [];
  for (const x of [0, x2]) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
    b.shapes.add(new Circle(10));
    if (tag) b.cbTypes.add(tag);
    b.space = space;
    bodies.push(b);
  }
  return { space, a: bodies[0], b: bodies[1] };
}

/** A lone body that falls asleep after enough quiet steps. */
function sleeper(space: Space, tag?: CbType, x = 0): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
  b.shapes.add(new Circle(5));
  if (tag) b.cbTypes.add(tag);
  b.space = space;
  return b;
}

function steps(space: Space, n: number) {
  for (let i = 0; i < n; i++) space.step(DT);
}

function begin(tag: CbType, fn: () => void, precedence = 0) {
  return new InteractionListener(
    CbEvent.BEGIN,
    InteractionType.COLLISION,
    tag,
    tag,
    fn,
    precedence,
  );
}

// ---------------------------------------------------------------------------
// Handlers that throw
// ---------------------------------------------------------------------------

describe("a handler that throws", () => {
  it("propagates the user's error out of space.step()", () => {
    const tag = new CbType();
    const { space } = pair(tag);
    space.listeners.add(
      begin(tag, () => {
        throw new Error("user boom");
      }),
    );
    expect(() => space.step(DT)).toThrow("user boom");
  });

  it("leaves the space usable: listeners/bodies are modifiable and stepping continues", () => {
    const tag = new CbType();
    const { space, a, b } = pair(tag);
    let calls = 0;
    space.listeners.add(
      begin(tag, () => {
        calls++;
        throw new Error("once");
      }),
    );
    expect(() => space.step(DT)).toThrow("once");

    // Not stuck "mid step": these all throw if midstep were left true.
    const extra = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {});
    expect(() => space.listeners.add(extra)).not.toThrow();
    expect(() => space.listeners.remove(extra)).not.toThrow();
    const c = new Body(BodyType.DYNAMIC, new Vec2(500, 500));
    c.shapes.add(new Circle(3));
    expect(() => (c.space = space)).not.toThrow();

    // The pair keeps simulating: the overlap gets resolved and the bodies
    // separate; BEGIN does not refire for the same continuous contact.
    expect(() => steps(space, 30)).not.toThrow();
    expect(b.position.x - a.position.x).toBeGreaterThan(15);
    expect(calls).toBe(1);
  });

  it("callbacks queued behind the throwing one are delivered exactly once, on the next step", () => {
    // Which of two listeners runs first is decided by the dispatch order, so
    // record the order and make whichever runs first throw.
    const tag = new CbType();
    const { space } = pair(tag);
    const log: string[] = [];
    let thrown = false;
    const make = (name: string) =>
      begin(tag, () => {
        log.push(name);
        if (!thrown) {
          thrown = true;
          throw new Error("first one throws");
        }
      });
    space.listeners.add(make("x"));
    space.listeners.add(make("y"));

    expect(() => space.step(DT)).toThrow("first one throws");
    expect(log.length).toBe(1);

    // The other callback is still sitting in the queue; it is delivered by
    // the next step's drain (deferred, not dropped, not duplicated).
    space.step(DT);
    expect(log.length).toBe(2);
    expect(new Set(log)).toEqual(new Set(["x", "y"]));
    steps(space, 10);
    expect(log.length).toBe(2);
  });

  it("a throwing BodyListener does not prevent the body from sleeping", () => {
    const space = new Space();
    const tag = new CbType();
    const b = sleeper(space, tag);
    let n = 0;
    space.listeners.add(
      new BodyListener(CbEvent.SLEEP, tag, () => {
        n++;
        throw new Error("sleep boom");
      }),
    );
    let caught = 0;
    for (let i = 0; i < 200; i++) {
      try {
        space.step(DT);
      } catch (e) {
        expect((e as Error).message).toBe("sleep boom");
        caught++;
      }
    }
    expect(caught).toBe(1);
    expect(n).toBe(1);
    expect(b.isSleeping).toBe(true);
  });

  it("a throwing PreListener aborts that step but later steps run normally", () => {
    const tag = new CbType();
    const { space, a, b } = pair(tag);
    let calls = 0;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, tag, tag, () => {
        calls++;
        if (calls === 1) throw new Error("pre boom");
        return PreFlag.ACCEPT;
      }),
    );
    expect(() => space.step(DT)).toThrow("pre boom");
    // Pre handlers run inside the step: midstep must have been reset.
    expect(() => steps(space, 30)).not.toThrow();
    expect(calls).toBeGreaterThan(1);
    // The collision was still resolved afterwards (ACCEPT).
    expect(b.position.x - a.position.x).toBeGreaterThan(15);
  });
});

// ---------------------------------------------------------------------------
// Adding / removing listeners during dispatch
// ---------------------------------------------------------------------------

describe("listeners changed from inside a handler", () => {
  it("adding a listener mid-dispatch does not deliver events already queued", () => {
    const tag = new CbType();
    const { space } = pair(tag);
    const log: string[] = [];
    const lateBegin = begin(tag, () => log.push("lateBegin"));
    const lateOngoing = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      tag,
      tag,
      () => log.push("lateOngoing"),
    );
    space.listeners.add(
      begin(tag, () => {
        log.push("begin");
        space.listeners.add(lateBegin);
        lateOngoing.space = space;
      }),
    );
    space.step(DT);
    expect(log).toEqual(["begin"]);
    expect(lateBegin.space).toBe(space);
    expect(lateOngoing.space).toBe(space);

    // From the next step the newly added ONGOING listener fires; the BEGIN
    // one never does, because BEGIN for this contact is already in the past.
    space.step(DT);
    expect(log).toEqual(["begin", "lateOngoing"]);
  });

  it("removing a listener mid-dispatch: its already-queued callback still fires, later ones don't", () => {
    const tag = new CbType();
    const { space, a, b } = pair(tag);
    const counts = { p: 0, q: 0 };
    let removed: InteractionListener | null = null;
    const listeners: Record<string, InteractionListener> = {};
    for (const name of ["p", "q"] as const) {
      listeners[name] = begin(tag, () => {
        counts[name]++;
        if (removed == null) {
          // remove the *other* listener, whichever runs first
          removed = listeners[name === "p" ? "q" : "p"];
          space.listeners.remove(removed);
        }
      });
      space.listeners.add(listeners[name]);
    }
    space.step(DT);
    expect(counts).toEqual({ p: 1, q: 1 });
    expect(removed).not.toBeNull();
    expect(removed!.space).toBeNull();
    expect(space.listeners.length).toBe(1);

    // Separate and re-collide: only the surviving listener fires.
    a.position = new Vec2(-500, 0);
    steps(space, 2);
    a.position = new Vec2(b.position.x - 15, b.position.y);
    a.velocity = new Vec2(0, 0);
    b.velocity = new Vec2(0, 0);
    space.step(DT);
    const survivor = removed === listeners.p ? "q" : "p";
    expect(counts[survivor]).toBe(2);
    expect(counts[survivor === "p" ? "q" : "p"]).toBe(1);
  });

  it("a listener can remove itself (listener.space = null) from its own handler", () => {
    const space = new Space();
    const tag = new CbType();
    sleeper(space, tag, 0);
    sleeper(space, tag, 100);
    let n = 0;
    const self: BodyListener = new BodyListener(CbEvent.SLEEP, tag, () => {
      n++;
      self.space = null;
    });
    self.space = space;
    steps(space, 200);
    // Both bodies sleep in the same step, so both callbacks were queued
    // before the removal: both are delivered, nothing after.
    expect(n).toBe(2);
    expect(self.space).toBeNull();
    expect(space.listeners.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CbType.ANY_* wildcards
// ---------------------------------------------------------------------------

describe("CbType.ANY_* wildcard matching", () => {
  it("ANY_BODY matches untagged bodies and the callback exposes bodies", () => {
    const { space, a, b } = pair();
    const hits: Array<[boolean, boolean]> = [];
    space.listeners.add(
      new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        (cb) => {
          hits.push([cb.int1.isBody(), cb.int2.isBody()]);
          expect([a, b]).toContain(cb.int1.castBody);
          expect([a, b]).toContain(cb.int2.castBody);
          expect(cb.int1).not.toBe(cb.int2);
        },
      ),
    );
    space.step(DT);
    expect(hits).toEqual([[true, true]]);
  });

  it("ANY_SHAPE reports shapes, not bodies", () => {
    const { space, a } = pair();
    const hits: boolean[] = [];
    space.listeners.add(
      new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_SHAPE,
        CbType.ANY_SHAPE,
        (cb) => {
          hits.push(cb.int1.isShape() && cb.int2.isShape());
          const shapes = [cb.int1.castShape!.body, cb.int2.castShape!.body];
          expect(shapes).toContain(a);
        },
      ),
    );
    space.step(DT);
    expect(hits).toEqual([true]);
  });

  it("ANY_SHAPE x ANY_BODY pairs a shape of one body with the other body", () => {
    const { space, a, b } = pair();
    const seen: string[] = [];
    space.listeners.add(
      new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_SHAPE,
        CbType.ANY_BODY,
        (cb) => {
          // options1 (ANY_SHAPE) always maps to int1
          expect(cb.int1.isShape()).toBe(true);
          expect(cb.int2.isBody()).toBe(true);
          expect(cb.int1.castShape!.body).not.toBe(cb.int2.castBody);
          seen.push(cb.int2.castBody === a ? "a" : cb.int2.castBody === b ? "b" : "?");
        },
      ),
    );
    space.step(DT);
    // shape-of-a vs b and shape-of-b vs a
    expect(seen.sort()).toEqual(["a", "b"]);
  });

  it("ANY_COMPOUND matches a body that lives in a compound", () => {
    const space = new Space();
    const compound = new Compound();
    const inner = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    inner.shapes.add(new Circle(10));
    inner.compound = compound;
    compound.space = space;
    const loose = new Body(BodyType.DYNAMIC, new Vec2(15, 0));
    loose.shapes.add(new Circle(10));
    loose.space = space;

    const hits: unknown[] = [];
    space.listeners.add(
      new InteractionListener(
        CbEvent.BEGIN,
        InteractionType.COLLISION,
        CbType.ANY_COMPOUND,
        CbType.ANY_BODY,
        (cb) => {
          expect(cb.int1.isCompound()).toBe(true);
          hits.push(cb.int1.castCompound);
          hits.push(cb.int2.castBody);
        },
      ),
    );
    space.step(DT);
    expect(hits).toEqual([compound, loose]);
  });

  it("ANY_BODY BodyListener fires for every body, a custom tag only for tagged ones", () => {
    const space = new Space();
    const tag = new CbType();
    const plain = sleeper(space, undefined, 0);
    const tagged = sleeper(space, tag, 100);
    const any: Body[] = [];
    const only: Body[] = [];
    space.listeners.add(
      new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, (cb) => any.push(cb.body)),
    );
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, (cb) => only.push(cb.body)));
    steps(space, 200);
    expect(any.length).toBe(2);
    expect(any).toContain(plain);
    expect(any).toContain(tagged);
    expect(only).toEqual([tagged]);
  });

  it("ANY_CONSTRAINT ConstraintListener fires for an untagged joint", () => {
    const space = new Space();
    const a = sleeper(space);
    const b = sleeper(space, undefined, 30);
    const joint = new PivotJoint(a, b, new Vec2(15, 0), new Vec2(-15, 0));
    joint.space = space;
    expect(joint.cbTypes.has(CbType.ANY_CONSTRAINT)).toBe(true);
    const fired: unknown[] = [];
    space.listeners.add(
      new ConstraintListener(CbEvent.SLEEP, CbType.ANY_CONSTRAINT, (cb) =>
        fired.push(cb.constraint),
      ),
    );
    steps(space, 200);
    expect(fired).toEqual([joint]);
  });

  it("excluding a CbType from an ANY_BODY listener filters tagged bodies out", () => {
    const space = new Space();
    const ghost = new CbType();
    const plain = sleeper(space, undefined, 0);
    sleeper(space, ghost, 100);
    const got: Body[] = [];
    space.listeners.add(
      new BodyListener(CbEvent.SLEEP, new OptionType(CbType.ANY_BODY, ghost), (cb) =>
        got.push(cb.body),
      ),
    );
    steps(space, 200);
    expect(got).toEqual([plain]);
  });
});

// ---------------------------------------------------------------------------
// Fire order
// ---------------------------------------------------------------------------

describe("fire order of multiple listeners on the same object", () => {
  it("BodyListeners fire in descending precedence, ties by newest listener first", () => {
    const space = new Space();
    const tag = new CbType();
    const log: string[] = [];
    // Added in a scrambled order on purpose.
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => log.push("p0-old"), 0));
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => log.push("p10"), 10));
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => log.push("p-5"), -5));
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => log.push("p0-new"), 0));
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => log.push("p5"), 5));
    sleeper(space, tag);
    steps(space, 200);
    expect(log).toEqual(["p10", "p5", "p0-new", "p0-old", "p-5"]);
  });

  it("ConstraintListeners fire in descending precedence", () => {
    const space = new Space();
    const tag = new CbType();
    const a = sleeper(space);
    const b = sleeper(space, undefined, 30);
    const joint = new PivotJoint(a, b, new Vec2(15, 0), new Vec2(-15, 0));
    joint.cbTypes.add(tag);
    joint.space = space;
    const log: number[] = [];
    for (const p of [1, 7, -3, 4]) {
      space.listeners.add(new ConstraintListener(CbEvent.SLEEP, tag, () => log.push(p), p));
    }
    steps(space, 200);
    expect(log).toEqual([7, 4, 1, -3]);
  });

  it("changing precedence on a live BodyListener re-sorts it", () => {
    const space = new Space();
    const tag = new CbType();
    const log: string[] = [];
    const lo = new BodyListener(CbEvent.SLEEP, tag, () => log.push("lo"), 0);
    const hi = new BodyListener(CbEvent.SLEEP, tag, () => log.push("hi"), 10);
    space.listeners.add(lo);
    space.listeners.add(hi);
    const b = sleeper(space, tag);
    steps(space, 200);
    expect(log).toEqual(["hi", "lo"]);

    lo.precedence = 20;
    expect(lo.precedence).toBe(20);
    log.length = 0;
    b.velocity = new Vec2(1, 0);
    space.step(DT);
    b.velocity = new Vec2(0, 0);
    steps(space, 200);
    expect(log).toEqual(["lo", "hi"]);
  });

  it("changing precedence on a live ConstraintListener re-sorts it", () => {
    const space = new Space();
    const tag = new CbType();
    const a = sleeper(space);
    const b = sleeper(space, undefined, 30);
    const joint = new PivotJoint(a, b, new Vec2(15, 0), new Vec2(-15, 0));
    joint.cbTypes.add(tag);
    joint.space = space;
    const log: string[] = [];
    const x = new ConstraintListener(CbEvent.SLEEP, tag, () => log.push("x"), 1);
    const y = new ConstraintListener(CbEvent.SLEEP, tag, () => log.push("y"), 2);
    space.listeners.add(x);
    space.listeners.add(y);
    steps(space, 200);
    expect(log).toEqual(["y", "x"]);

    x.precedence = 3;
    log.length = 0;
    a.velocity = new Vec2(3, 0);
    space.step(DT);
    a.velocity = new Vec2(0, 0);
    b.velocity = new Vec2(0, 0);
    steps(space, 200);
    expect(log).toEqual(["x", "y"]);
  });

  it("InteractionListener order is deterministic and flips when precedence is swapped live", () => {
    const run = () => {
      const tag = new CbType();
      const { space } = pair(tag);
      const log: string[] = [];
      const l1 = begin(tag, () => log.push("one"), 1);
      const l2 = begin(tag, () => log.push("two"), 2);
      space.listeners.add(l1);
      space.listeners.add(l2);
      space.step(DT);
      return { log, l1, l2, space };
    };
    const first = run();
    const second = run();
    expect(first.log.length).toBe(2);
    expect(second.log).toEqual(first.log);

    // Swap the precedences while both listeners are live, then trigger a
    // fresh BEGIN on a new overlapping pair with the same tags.
    const { l1, l2, log } = first;
    const space = new Space();
    l1.space = space;
    l2.space = space;
    const tag = l1.options1.includes.at(0);
    for (const x of [0, 15]) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
      b.shapes.add(new Circle(10));
      b.cbTypes.add(tag);
      b.space = space;
    }
    const before = [...log];
    l1.precedence = 2;
    l2.precedence = 1;
    log.length = 0;
    space.step(DT);
    expect(log).toEqual([...before].reverse());
  });

  // Interaction and Pre listeners run LOWEST precedence first — the reverse
  // of Body / Constraint listeners. ZPP_CbSetPair.__validate rebuilds the
  // pair's list with a head insert; upstream CbSetPair.cx does the same, so
  // this is long-standing nape behaviour (documented on Listener.precedence),
  // and it is what makes the highest-precedence PreListener's flag win.
  it("InteractionListeners fire lower precedence first", () => {
    const tag = new CbType();
    const { space } = pair(tag);
    const log: string[] = [];
    space.listeners.add(begin(tag, () => log.push("lo"), 0));
    space.listeners.add(begin(tag, () => log.push("hi"), 10));
    space.step(DT);
    expect(log).toEqual(["lo", "hi"]);
  });

  it("PreListeners fire lower precedence first", () => {
    const tag = new CbType();
    const { space } = pair(tag);
    const log: string[] = [];
    const pre = (name: string, p: number) =>
      new PreListener(
        InteractionType.COLLISION,
        tag,
        tag,
        () => {
          log.push(name);
          return PreFlag.ACCEPT;
        },
        p,
      );
    space.listeners.add(pre("lo", 0));
    space.listeners.add(pre("hi", 10));
    space.step(DT);
    expect(log.slice(0, 2)).toEqual(["lo", "hi"]);
  });

  it("the highest-precedence PreListener's flag wins (it is called last)", () => {
    for (const [ignorePrec, acceptPrec, passesThrough] of [
      [10, 0, true],
      [0, 10, false],
    ] as const) {
      const tag = new CbType();
      const space = new Space();
      const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      a.shapes.add(new Circle(10));
      a.cbTypes.add(tag);
      a.velocity = new Vec2(300, 0);
      a.space = space;
      const b = new Body(BodyType.DYNAMIC, new Vec2(40, 0));
      b.shapes.add(new Circle(10));
      b.cbTypes.add(tag);
      b.velocity = new Vec2(-300, 0);
      b.space = space;
      const flag = (f: PreFlag, p: number) =>
        new PreListener(InteractionType.COLLISION, tag, tag, () => f, p);
      space.listeners.add(flag(PreFlag.IGNORE, ignorePrec));
      space.listeners.add(flag(PreFlag.ACCEPT, acceptPrec));
      for (let i = 0; i < 20; i++) space.step(DT);
      expect(a.position.x > b.position.x).toBe(passesThrough);
    }
  });
});

// ---------------------------------------------------------------------------
// Changing a live InteractionListener
// ---------------------------------------------------------------------------

describe("changing a live InteractionListener", () => {
  it("event BEGIN -> ONGOING -> END re-registers it", () => {
    const tag = new CbType();
    const { space, a } = pair(tag);
    const events: CbEvent[] = [];
    const l = begin(tag, () => {});
    l.handler = (cb) => events.push(cb.event);
    space.listeners.add(l);
    space.step(DT);
    expect(events).toEqual([CbEvent.BEGIN]);

    // Keep them overlapping: pin a so the contact persists.
    l.event = CbEvent.ONGOING;
    a.velocity = new Vec2(0, 0);
    space.step(DT);
    expect(events.slice(1).every((e) => e === CbEvent.ONGOING)).toBe(true);
    expect(events.length).toBeGreaterThan(1);

    l.event = CbEvent.END;
    events.length = 0;
    a.position = new Vec2(-1000, 0);
    space.step(DT);
    expect(events).toEqual([CbEvent.END]);
  });

  it("setting the event to the same value is a no-op; invalid events throw", () => {
    const tag = new CbType();
    const l = begin(tag, () => {});
    l.event = CbEvent.BEGIN;
    expect(l.event).toBe(CbEvent.BEGIN);
    expect(() => (l.event = CbEvent.WAKE)).toThrow(/BEGIN, END, ONGOING/);
    expect(() => (l.event = null as unknown as CbEvent)).toThrow(/null/);
    expect(l.event).toBe(CbEvent.BEGIN);

    const p = new PreListener(InteractionType.ANY, tag, tag, () => null);
    p.event = CbEvent.PRE; // unchanged → fine
    expect(() => (p.event = CbEvent.BEGIN)).toThrow("PreListener event can only be PRE");
  });

  it("interactionType COLLISION -> SENSOR stops delivery, -> ANY restores it", () => {
    const tag = new CbType();
    const { space, a, b } = pair(tag);
    let n = 0;
    const l = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      tag,
      tag,
      () => n++,
    );
    space.listeners.add(l);
    // Keep the pair overlapping every step.
    const hold = () => {
      a.position = new Vec2(0, 0);
      b.position = new Vec2(15, 0);
      a.velocity = new Vec2(0, 0);
      b.velocity = new Vec2(0, 0);
    };
    for (let i = 0; i < 3; i++) {
      hold();
      space.step(DT);
    }
    expect(n).toBeGreaterThan(0);

    l.interactionType = InteractionType.SENSOR;
    expect(l.interactionType).toBe(InteractionType.SENSOR);
    const frozen = n;
    for (let i = 0; i < 3; i++) {
      hold();
      space.step(DT);
    }
    expect(n).toBe(frozen);

    l.interactionType = InteractionType.ANY;
    for (let i = 0; i < 3; i++) {
      hold();
      space.step(DT);
    }
    expect(n).toBeGreaterThan(frozen);
    expect(() => (l.interactionType = null)).toThrow(/null/);
  });

  it("options1.including / excluding on a live listener take effect immediately", () => {
    const tagA = new CbType();
    const tagB = new CbType();
    const space = new Space();
    const mk = (x: number, tag: CbType) => {
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
      body.shapes.add(new Circle(10));
      body.cbTypes.add(tag);
      body.space = space;
      return body;
    };
    let n = 0;
    const l = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      tagA,
      tagA,
      () => n++,
    );
    space.listeners.add(l);

    // A vs B: no match yet.
    mk(0, tagA);
    mk(15, tagB);
    space.step(DT);
    expect(n).toBe(0);

    // Live include tagB on options2 → a fresh A/B contact now fires.
    l.options2.including(tagB);
    expect(l.options2.includes.has(tagB)).toBe(true);
    mk(300, tagA);
    mk(315, tagB);
    space.step(DT);
    expect(n).toBe(1);

    // Live exclude of an included type: removes it from includes.
    l.options2.excluding(tagB);
    expect(l.options2.includes.has(tagB)).toBe(false);
    expect(l.options2.excludes.has(tagB)).toBe(false);
    mk(600, tagA);
    mk(615, tagB);
    space.step(DT);
    expect(n).toBe(1);

    // Exclude a brand-new type, then include it again (excluded → removed).
    const tagC = new CbType();
    l.options1.excluding(tagC);
    expect(l.options1.excludes.has(tagC)).toBe(true);
    l.options1.including(tagC);
    expect(l.options1.excludes.has(tagC)).toBe(false);
    expect(l.options1.includes.has(tagC)).toBe(false);

    // A listener whose options exclude a type the body carries stops matching.
    const tagD = new CbType();
    l.options1.excluding(tagD);
    const a = mk(900, tagA);
    a.cbTypes.add(tagD);
    const a2 = mk(915, tagA);
    a2.cbTypes.add(tagD);
    space.step(DT);
    expect(n).toBe(1);
  });

  it("replacing options1/options2 wholesale on a live listener", () => {
    const tagA = new CbType();
    const tagB = new CbType();
    const { space } = pair(tagB);
    let n = 0;
    const l = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      tagA,
      tagA,
      () => n++,
    );
    space.listeners.add(l);
    l.options1 = new OptionType(tagB);
    l.options2 = tagB;
    space.step(DT);
    expect(n).toBe(1);
  });

  it("removing from a space and re-adding resumes delivery", () => {
    const tag = new CbType();
    const { space, a, b } = pair(tag);
    let n = 0;
    const l = begin(tag, () => n++);
    l.space = space;
    expect(l.space).toBe(space);
    l.space = space; // same space: no-op
    expect(space.listeners.length).toBe(1);
    space.step(DT);
    expect(n).toBe(1);

    l.space = null;
    expect(l.space).toBeNull();
    l.space = null; // already detached: no-op
    // Separate and re-touch while detached: nothing.
    a.position = new Vec2(-500, 0);
    space.step(DT);
    a.position = new Vec2(b.position.x - 15, b.position.y);
    space.step(DT);
    expect(n).toBe(1);

    // Re-add, separate, re-touch: fires again.
    space.listeners.add(l);
    a.position = new Vec2(-500, 0);
    space.step(DT);
    a.position = new Vec2(b.position.x - 15, b.position.y);
    space.step(DT);
    expect(n).toBe(2);
  });

  it("moving a listener directly from one space to another", () => {
    const tag = new CbType();
    const s1 = pair(tag);
    const s2 = pair(tag);
    let hits: Space[] = [];
    const l = begin(tag, () => hits.push(l.space!));
    l.space = s1.space;
    l.space = s2.space;
    expect(s1.space.listeners.length).toBe(0);
    expect(s2.space.listeners.length).toBe(1);
    s1.space.step(DT);
    s2.space.step(DT);
    expect(hits).toEqual([s2.space]);
    hits = [];
  });

  it("the callback exposes the listener that produced it", () => {
    const tag = new CbType();
    const { space } = pair(tag);
    let got: unknown = null;
    const l = begin(tag, () => {});
    l.handler = (cb) => (got = cb.listener);
    space.listeners.add(l);
    space.step(DT);
    expect(got).toBe(l);
  });
});

// ---------------------------------------------------------------------------
// Live option edits on Body / Constraint listeners (remove paths)
// ---------------------------------------------------------------------------

describe("live option edits on Body / Constraint listeners", () => {
  it("BodyListener: excluding an included type removes it; including an excluded type un-excludes it", () => {
    const space = new Space();
    const tag = new CbType();
    const other = new CbType();
    let n = 0;
    const l = new BodyListener(CbEvent.SLEEP, new OptionType(tag, other), () => n++);
    space.listeners.add(l);
    const b = sleeper(space, tag);
    b.cbTypes.add(other);
    steps(space, 200);
    expect(n).toBe(0); // excluded

    // Un-exclude `other` live: now the body matches.
    l.options.including(other);
    expect(l.options.excludes.has(other)).toBe(false);
    expect(l.options.includes.has(other)).toBe(false);
    b.velocity = new Vec2(1, 0);
    space.step(DT);
    b.velocity = new Vec2(0, 0);
    steps(space, 200);
    expect(n).toBe(1);

    // Drop `tag` from includes live: nothing matches anymore.
    l.options.excluding(tag);
    expect(l.options.includes.has(tag)).toBe(false);
    b.velocity = new Vec2(1, 0);
    space.step(DT);
    b.velocity = new Vec2(0, 0);
    steps(space, 200);
    expect(n).toBe(1);
  });

  it("ConstraintListener: same include/exclude round-trip on a live listener", () => {
    const space = new Space();
    const tag = new CbType();
    const other = new CbType();
    const a = sleeper(space);
    const b = sleeper(space, undefined, 30);
    const joint = new PivotJoint(a, b, new Vec2(15, 0), new Vec2(-15, 0));
    joint.cbTypes.add(tag);
    joint.cbTypes.add(other);
    joint.space = space;
    let n = 0;
    const l = new ConstraintListener(CbEvent.SLEEP, new OptionType(tag, other), () => n++);
    space.listeners.add(l);
    steps(space, 200);
    expect(n).toBe(0);

    const nudge = () => {
      a.velocity = new Vec2(2, 0);
      space.step(DT);
      a.velocity = new Vec2(0, 0);
      b.velocity = new Vec2(0, 0);
      steps(space, 200);
    };
    l.options.including(other);
    nudge();
    expect(n).toBe(1);

    // excluding() an *included* type only removes it from includes ...
    l.options.excluding(tag);
    expect(l.options.includes.length).toBe(0);
    expect(l.options.excludes.length).toBe(0);
    // ... while excluding() an unknown type adds it to excludes.
    l.options.excluding(other);
    expect(l.options.excludes.has(other)).toBe(true);
    nudge();
    expect(n).toBe(1);

    // Re-include tag: still blocked by the excluded `other` on the joint.
    l.options.including(tag);
    nudge();
    expect(n).toBe(1);

    // Un-exclude `other`: delivery resumes.
    l.options.including(other);
    nudge();
    expect(n).toBe(2);
  });
});
