/**
 * Native unit tests for the listener lifecycle classes (issue #162):
 * ZPP_Listener, ZPP_BodyListener, ZPP_ConstraintListener and
 * ZPP_InteractionListener. These reach into the ZPP_* internals to check the
 * bookkeeping (per-CbType listener lists, option-change handlers, set
 * algebra helpers) that the public API relies on.
 */
import { describe, it, expect } from "vitest";
import "../../../src/index";
import { ZPP_Listener } from "../../../src/native/callbacks/ZPP_Listener";
import { ZPP_InteractionListener } from "../../../src/native/callbacks/ZPP_InteractionListener";
import { ZNPList_ZPP_CbType, ZNPList_ZPP_CbSet } from "../../../src/native/util/ZNPRegistry";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Circle } from "../../../src/shape/Circle";
import { Vec2 } from "../../../src/geom/Vec2";
import { CbType } from "../../../src/callbacks/CbType";
import { CbEvent } from "../../../src/callbacks/CbEvent";
import { OptionType } from "../../../src/callbacks/OptionType";
import { Listener } from "../../../src/callbacks/Listener";
import { BodyListener } from "../../../src/callbacks/BodyListener";
import { ConstraintListener } from "../../../src/callbacks/ConstraintListener";
import { InteractionListener } from "../../../src/callbacks/InteractionListener";
import { PreListener } from "../../../src/callbacks/PreListener";
import { PreFlag } from "../../../src/callbacks/PreFlag";
import { InteractionType } from "../../../src/callbacks/InteractionType";

const DT = 1 / 60;
const zcb = (t: CbType): any => (t as any).zpp_inner;

function listToArray(list: any): any[] {
  const out: any[] = [];
  for (let n = list.head; n != null; n = n.next) out.push(n.elt);
  return out;
}

/** Build a ZNPList sorted ascending by `key` (add() inserts at the head). */
function sortedList(Ctor: any, elts: any[], key: (e: any) => number): any {
  const list = new Ctor();
  for (const e of [...elts].sort((a, b) => key(b) - key(a))) list.add(e);
  return list;
}

function newSleeper(space: Space, tag: CbType | null, x: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
  b.shapes.add(new Circle(5));
  if (tag) b.cbTypes.add(tag);
  b.space = space;
  return b;
}

// ---------------------------------------------------------------------------
// ZPP_Listener
// ---------------------------------------------------------------------------

describe("ZPP_Listener", () => {
  it("assigns strictly increasing ids", () => {
    const a = new ZPP_Listener();
    const b = new ZPP_Listener();
    expect(b.id).toBeGreaterThan(a.id);
  });

  it("setlt orders by precedence descending, then id descending", () => {
    const mk = (precedence: number, id: number) => {
      const l = new ZPP_Listener();
      l.precedence = precedence;
      l.id = id;
      return l;
    };
    // higher precedence first
    expect(ZPP_Listener.setlt(mk(5, 1), mk(1, 2))).toBe(true);
    expect(ZPP_Listener.setlt(mk(1, 2), mk(5, 1))).toBe(false);
    // equal precedence → higher id first
    expect(ZPP_Listener.setlt(mk(3, 9), mk(3, 4))).toBe(true);
    expect(ZPP_Listener.setlt(mk(3, 4), mk(3, 9))).toBe(false);
    // strict: not less than itself
    const same = mk(2, 2);
    expect(ZPP_Listener.setlt(same, same)).toBe(false);
  });

  it("base hooks are inert no-ops", () => {
    const l = new ZPP_Listener();
    l.event = 3;
    l.swapEvent(5);
    l.invalidate_precedence();
    l.addedToSpace();
    l.removedFromSpace();
    expect(l.event).toBe(3);
    expect(l.space).toBeNull();
  });

  it("the public Listener base cannot be instantiated directly", () => {
    expect(() => new (Listener as any)()).toThrow("Cannot instantiate Listener");
  });

  it("Listener._wrap passes wrappers through and resolves inner objects", () => {
    const l = new BodyListener(CbEvent.SLEEP, new CbType(), () => {});
    expect(Listener._wrap(l)).toBe(l);
    expect(Listener._wrap(l.zpp_inner)).toBe(l);
    expect(Listener._wrap(null)).toBeNull();
    expect(Listener._wrap(undefined)).toBeNull();
    expect(Listener._wrap({} as any)).toBeNull();

    // An inner listener with no outer gets a fresh Listener wrapper, cached.
    const bare = new ZPP_Listener();
    const w = Listener._wrap(bare);
    expect(w).toBeInstanceOf(Listener);
    expect(w.zpp_inner).toBe(bare);
    expect(bare.outer).toBe(w);
    expect(Listener._wrap(bare)).toBe(w);
  });
});

// ---------------------------------------------------------------------------
// ZPP_BodyListener / ZPP_ConstraintListener bookkeeping
// ---------------------------------------------------------------------------

describe("ZPP_BodyListener bookkeeping", () => {
  it("registers into each included CbType's bodylisteners in precedence order", () => {
    const space = new Space();
    const t1 = new CbType();
    const t2 = new CbType();
    const opts = new OptionType([t1, t2] as any);
    const hi = new BodyListener(CbEvent.SLEEP, opts, () => {}, 10);
    const mid = new BodyListener(CbEvent.SLEEP, t1, () => {}, 5);
    const lo = new BodyListener(CbEvent.SLEEP, opts, () => {}, 0);
    // added hi → lo → mid: mid must be inserted *between* the other two
    space.listeners.add(hi);
    space.listeners.add(lo);
    space.listeners.add(mid);

    expect(listToArray(zcb(t1).bodylisteners)).toEqual([hi.zpp_inner, mid.zpp_inner, lo.zpp_inner]);
    expect(listToArray(zcb(t2).bodylisteners)).toEqual([hi.zpp_inner, lo.zpp_inner]);
    expect((hi.zpp_inner as any).options.handler).toBeTypeOf("function");

    space.listeners.remove(mid);
    expect(listToArray(zcb(t1).bodylisteners)).toEqual([hi.zpp_inner, lo.zpp_inner]);
    expect((mid.zpp_inner as any).options.handler).toBeNull();
    space.listeners.remove(hi);
    space.listeners.remove(lo);
    expect(zcb(t1).bodylisteners.length).toBe(0);
    expect(zcb(t2).bodylisteners.length).toBe(0);
  });

  it("invalidate_precedence re-sorts when live and is a no-op when detached", () => {
    const space = new Space();
    const t = new CbType();
    const a = new BodyListener(CbEvent.WAKE, t, () => {}, 1);
    const b = new BodyListener(CbEvent.WAKE, t, () => {}, 2);
    // detached precedence change: just stored
    a.precedence = 3;
    expect(a.precedence).toBe(3);
    expect(zcb(t).bodylisteners.length).toBe(0);

    space.listeners.add(a);
    space.listeners.add(b);
    expect(listToArray(zcb(t).bodylisteners)).toEqual([a.zpp_inner, b.zpp_inner]);
    b.precedence = 4;
    expect(listToArray(zcb(t).bodylisteners)).toEqual([b.zpp_inner, a.zpp_inner]);
    // same value: nothing changes
    b.precedence = 4;
    expect(zcb(t).bodylisteners.length).toBe(2);
  });

  it("live option edits move the listener between CbType lists", () => {
    const space = new Space();
    const t1 = new CbType();
    const t2 = new CbType();
    const l = new BodyListener(CbEvent.SLEEP, t1, () => {});
    space.listeners.add(l);
    l.options.including(t2);
    expect(listToArray(zcb(t2).bodylisteners)).toEqual([l.zpp_inner]);
    l.options.excluding(t1); // included → removed
    expect(zcb(t1).bodylisteners.length).toBe(0);
    expect(l.options.includes.has(t1)).toBe(false);
    expect(l.options.excludes.has(t1)).toBe(false);
    // still wired to the option handler after each change
    expect((l.zpp_inner as any).options.handler).toBeTypeOf("function");
  });

  it("swapEvent validates and re-registers", () => {
    const space = new Space();
    const t = new CbType();
    const l = new BodyListener(CbEvent.SLEEP, t, () => {});
    space.listeners.add(l);
    expect(() => l.zpp_inner.swapEvent(0)).toThrow(
      "BodyListener event must be either WAKE or SLEEP",
    );
    expect(l.event).toBe(CbEvent.SLEEP);
    l.zpp_inner.swapEvent(2);
    expect(l.event).toBe(CbEvent.WAKE);
    expect(listToArray(zcb(t).bodylisteners)).toEqual([l.zpp_inner]);
  });
});

describe("ZPP_ConstraintListener bookkeeping", () => {
  it("registers into conlisteners in precedence order and re-sorts live", () => {
    const space = new Space();
    const t = new CbType();
    const a = new ConstraintListener(CbEvent.BREAK, t, () => {}, 0);
    const b = new ConstraintListener(CbEvent.BREAK, t, () => {}, 9);
    const c = new ConstraintListener(CbEvent.BREAK, t, () => {}, 4);
    space.listeners.add(b);
    space.listeners.add(a);
    space.listeners.add(c);
    expect(listToArray(zcb(t).conlisteners)).toEqual([b.zpp_inner, c.zpp_inner, a.zpp_inner]);

    a.precedence = 100;
    expect(listToArray(zcb(t).conlisteners)[0]).toBe(a.zpp_inner);

    space.listeners.remove(a);
    expect(listToArray(zcb(t).conlisteners)).toEqual([b.zpp_inner, c.zpp_inner]);
  });

  it("swapEvent accepts WAKE/SLEEP/BREAK and rejects the rest", () => {
    const l = new ConstraintListener(CbEvent.WAKE, new CbType(), () => {});
    for (const ev of [3, 4, 2]) {
      l.zpp_inner.swapEvent(ev);
      expect(l.zpp_inner.event).toBe(ev);
    }
    expect(() => l.zpp_inner.swapEvent(6)).toThrow("ConstraintListener event must be");
    // detached precedence change is just stored
    l.precedence = 7;
    expect(l.zpp_inner.precedence).toBe(7);
  });

  it("live options: excluding an included type / including an excluded type", () => {
    const space = new Space();
    const t1 = new CbType();
    const t2 = new CbType();
    const l = new ConstraintListener(CbEvent.SLEEP, new OptionType(t1, t2), () => {});
    space.listeners.add(l);
    expect(listToArray(zcb(t1).conlisteners)).toEqual([l.zpp_inner]);
    l.options.including(t2);
    expect(l.options.excludes.length).toBe(0);
    expect(zcb(t2).conlisteners.length).toBe(0); // un-excluded, not included
    l.options.excluding(t1);
    expect(zcb(t1).conlisteners.length).toBe(0);
    expect(l.options.includes.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ZPP_InteractionListener
// ---------------------------------------------------------------------------

describe("ZPP_InteractionListener set algebra", () => {
  /** All unordered pairs {a,b} with a∈A, b∈B, as sorted "x|y" keys. */
  function expectedPairs(A: number[], B: number[]): string[] {
    const s = new Set<string>();
    for (const a of A) for (const b of B) s.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    return [...s].sort();
  }

  const CASES: Array<[string, number[], number[]]> = [
    ["identical", [1, 2, 3], [1, 2, 3]],
    ["disjoint, A first", [1, 2], [5, 6]],
    ["disjoint, B first", [7, 9], [2, 3]],
    ["partial overlap", [1, 2, 3, 6], [2, 3, 4, 5]],
    ["interleaved", [1, 4, 7], [2, 4, 8, 9]],
    ["A empty", [], [1, 2]],
    ["B empty", [1, 2], []],
    ["subset", [2], [1, 2, 3]],
  ];

  function listener(): ZPP_InteractionListener {
    const t = new CbType();
    return new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, t, t, () => {})
      .zpp_inner_zn as ZPP_InteractionListener;
  }

  for (const [name, A, B] of CASES) {
    it(`CbTypeset visits every unordered A×B pair exactly once (${name})`, () => {
      const objs = new Map<number, { id: number }>();
      const get = (id: number) => {
        if (!objs.has(id)) objs.set(id, { id });
        return objs.get(id)!;
      };
      const la = sortedList(ZNPList_ZPP_CbType, A.map(get), (e) => e.id);
      const lb = sortedList(ZNPList_ZPP_CbType, B.map(get), (e) => e.id);
      const seen: string[] = [];
      listener().CbTypeset(la, lb, (x: any, y: any) =>
        seen.push(x.id < y.id ? `${x.id}|${y.id}` : `${y.id}|${x.id}`),
      );
      expect([...seen].sort()).toEqual(expectedPairs(A, B));
      // inputs are not consumed and the scratch lists are left empty
      expect(listToArray(la).map((e) => e.id)).toEqual(A);
      expect(listToArray(lb).map((e) => e.id)).toEqual(B);
      expect(ZPP_InteractionListener.UCbType!.head).toBeNull();
      expect(ZPP_InteractionListener.VCbType!.head).toBeNull();
      expect(ZPP_InteractionListener.WCbType!.head).toBeNull();
    });

    it(`CbSetset visits every unordered A×B pair exactly once (${name})`, () => {
      // Fake CbSets ordered by ZPP_CbSet.setlt, i.e. by their cbTypes list.
      const objs = new Map<number, any>();
      const get = (id: number) => {
        if (!objs.has(id)) {
          const cbTypes = new ZNPList_ZPP_CbType();
          cbTypes.add({ id });
          objs.set(id, { tag: id, cbTypes });
        }
        return objs.get(id)!;
      };
      const la = sortedList(ZNPList_ZPP_CbSet, A.map(get), (e) => e.tag);
      const lb = sortedList(ZNPList_ZPP_CbSet, B.map(get), (e) => e.tag);
      const seen: string[] = [];
      listener().CbSetset(la, lb, (x: any, y: any) =>
        seen.push(x.tag < y.tag ? `${x.tag}|${y.tag}` : `${y.tag}|${x.tag}`),
      );
      expect([...seen].sort()).toEqual(expectedPairs(A, B));
      expect(ZPP_InteractionListener.UCbSet!.head).toBeNull();
      expect(ZPP_InteractionListener.VCbSet!.head).toBeNull();
      expect(ZPP_InteractionListener.WCbSet!.head).toBeNull();
    });
  }

  it("with_union yields the sorted union of both include lists without duplicates", () => {
    const ts = [new CbType(), new CbType(), new CbType(), new CbType(), new CbType()];
    const l = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.ANY,
      new OptionType([ts[0], ts[2], ts[3]] as any),
      new OptionType([ts[1], ts[2], ts[4]] as any),
      () => {},
    );
    const got: number[] = [];
    l.zpp_inner_zn.with_union((cb: any) => got.push(cb.id));
    const want = ts.map((t) => zcb(t).id).sort((a, b) => a - b);
    expect(got).toEqual(want);
  });
});

describe("ZPP_InteractionListener registration", () => {
  it("is inserted once into each CbType of the include union, in precedence order", () => {
    const space = new Space();
    const t1 = new CbType();
    const t2 = new CbType();
    const lo = new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, t1, t2, () => {}, 0);
    const hi = new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, t1, t1, () => {}, 5);
    space.listeners.add(lo);
    space.listeners.add(hi);
    expect(listToArray(zcb(t1).listeners)).toEqual([hi.zpp_inner, lo.zpp_inner]);
    expect(listToArray(zcb(t2).listeners)).toEqual([lo.zpp_inner]);
    expect(lo.zpp_inner_zn.options1.handler).toBeTypeOf("function");
    expect(lo.zpp_inner_zn.options2.handler).toBeTypeOf("function");

    lo.precedence = 50;
    expect(listToArray(zcb(t1).listeners)).toEqual([lo.zpp_inner, hi.zpp_inner]);

    space.listeners.remove(lo);
    expect(listToArray(zcb(t1).listeners)).toEqual([hi.zpp_inner]);
    expect(zcb(t2).listeners.length).toBe(0);
    expect(lo.zpp_inner_zn.options1.handler).toBeNull();
    expect(lo.zpp_inner_zn.options2.handler).toBeNull();
  });

  it("live options1/options2 edits re-register through cbtype_change1/2", () => {
    const space = new Space();
    const t1 = new CbType();
    const t2 = new CbType();
    const t3 = new CbType();
    const l = new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, t1, t2, () => {});
    space.listeners.add(l);
    l.options1.including(t3);
    expect(listToArray(zcb(t3).listeners)).toEqual([l.zpp_inner]);
    l.options2.excluding(t2); // included → removed
    expect(zcb(t2).listeners.length).toBe(0);
    l.options2.excluding(t3); // new → excluded
    expect(l.options2.excludes.has(t3)).toBe(true);
    l.options2.including(t3); // excluded → un-excluded
    expect(l.options2.excludes.has(t3)).toBe(false);
    expect(l.options1.includes.has(t3)).toBe(true);
    // still registered once in t1 and t3
    expect(listToArray(zcb(t1).listeners)).toEqual([l.zpp_inner]);
    expect(listToArray(zcb(t3).listeners)).toEqual([l.zpp_inner]);
  });

  it("swapEvent: rejects non-interaction events, and PreListener events entirely", () => {
    const t = new CbType();
    const il = new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, t, t, () => {});
    expect(() => il.zpp_inner_zn.swapEvent(2)).toThrow(
      "InteractionListener event must be either BEGIN, END, ONGOING",
    );
    il.zpp_inner_zn.swapEvent(6);
    expect(il.event).toBe(CbEvent.ONGOING);
    const pl = new PreListener(InteractionType.ANY, t, t, () => null);
    expect(() => pl.zpp_inner_zn.swapEvent(0)).toThrow("PreListener event can only be PRE");
  });

  it("adding a listener for a pair that is already in contact delivers ONGOING next step", () => {
    const space = new Space();
    const t = new CbType();
    const other = new CbType();
    for (const x of [0, 15]) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
      b.shapes.add(new Circle(10));
      b.cbTypes.add(t);
      b.space = space;
    }
    space.step(DT); // contact exists before any listener
    // An unrelated listener first, so the CbSetPair pool is warm.
    space.listeners.add(
      new InteractionListener(CbEvent.ONGOING, InteractionType.ANY, other, other, () => {}),
    );
    let n = 0;
    const l = new InteractionListener(CbEvent.ONGOING, InteractionType.COLLISION, t, t, () => n++);
    space.listeners.add(l);
    space.step(DT);
    expect(n).toBe(1);
    space.listeners.remove(l);
    space.step(DT);
    expect(n).toBe(1);
  });
});

describe("ZPP_InteractionListener.wake (PreListener handler / pure changes)", () => {
  function sleepingScene() {
    const space = new Space();
    const t1 = new CbType();
    const t2 = new CbType();
    const shared = new CbType();
    const b1 = newSleeper(space, t1, 0);
    const b2 = newSleeper(space, t2, 100);
    const b3 = newSleeper(space, shared, 200);
    const untouched = newSleeper(space, null, 300);
    for (let i = 0; i < 200; i++) space.step(DT);
    for (const b of [b1, b2, b3, untouched]) expect(b.isSleeping).toBe(true);
    return { space, t1, t2, shared, b1, b2, b3, untouched };
  }

  it("replacing the handler wakes interactors of both option sets, and only those", () => {
    const { space, t1, t2, shared, b1, b2, b3, untouched } = sleepingScene();
    const pre = new PreListener(
      InteractionType.COLLISION,
      new OptionType([t1, shared] as any),
      new OptionType([t2, shared] as any),
      () => PreFlag.ACCEPT,
    );
    space.listeners.add(pre);
    // Adding a PreListener wakes its interactors too — let everything resettle.
    for (let i = 0; i < 200; i++) space.step(DT);
    for (const b of [b1, b2, b3]) expect(b.isSleeping).toBe(true);

    pre.handler = () => PreFlag.IGNORE;
    space.step(DT);
    expect(b1.isSleeping).toBe(false);
    expect(b2.isSleeping).toBe(false);
    expect(b3.isSleeping).toBe(false);
    expect(untouched.isSleeping).toBe(true);
  });

  it("pure=false wakes interactors (only option1 tags, options2 empty)", () => {
    const { space, t1, b1, b2 } = sleepingScene();
    const pre = new PreListener(InteractionType.COLLISION, t1, null, () => PreFlag.ACCEPT);
    pre.pure = true;
    space.listeners.add(pre);
    for (let i = 0; i < 200; i++) space.step(DT);
    expect(b1.isSleeping).toBe(true);
    pre.pure = true; // pure=true never wakes
    space.step(DT);
    expect(b1.isSleeping).toBe(true);
    pre.pure = false;
    space.step(DT);
    expect(b1.isSleeping).toBe(false);
    expect(b2.isSleeping).toBe(true);
  });

  it("only-options2 tags are woken too", () => {
    const { space, t2, b1, b2 } = sleepingScene();
    const pre = new PreListener(InteractionType.COLLISION, null, t2, () => PreFlag.ACCEPT);
    space.listeners.add(pre);
    for (let i = 0; i < 200; i++) space.step(DT);
    pre.handler = () => PreFlag.ACCEPT;
    space.step(DT);
    expect(b2.isSleeping).toBe(false);
    expect(b1.isSleeping).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Public wrapper odds and ends tied to the listener classes
// ---------------------------------------------------------------------------

describe("InteractionListener constructor validation", () => {
  const t = new CbType();
  it("rejects a null handler", () => {
    expect(
      () => new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, t, t, null as any),
    ).toThrow("InteractionListener::handler cannot be null");
  });
  it("rejects a null event", () => {
    expect(() => new InteractionListener(null as any, InteractionType.ANY, t, t, () => {})).toThrow(
      "CbEvent cannot be null",
    );
  });
  it("rejects a non-interaction event", () => {
    expect(
      () => new InteractionListener(CbEvent.WAKE, InteractionType.ANY, t, t, () => {}),
    ).toThrow(/WAKE' is not a valid event type for InteractionListener/);
  });
  it("rejects a null interaction type", () => {
    expect(() => new InteractionListener(CbEvent.BEGIN, null as any, t, t, () => {})).toThrow(
      "Cannot set listener interaction type to null",
    );
  });
  it("stores each interaction type", () => {
    for (const it of [
      InteractionType.COLLISION,
      InteractionType.SENSOR,
      InteractionType.FLUID,
      InteractionType.ANY,
    ]) {
      expect(new InteractionListener(CbEvent.END, it, t, t, () => {}).interactionType).toBe(it);
    }
  });
});

describe("OptionType._wrap / CbType._wrap", () => {
  it("OptionType._wrap resolves wrappers, inners and objects carrying zpp_inner", () => {
    const o = new OptionType(new CbType());
    expect(OptionType._wrap(o)).toBe(o);
    expect(OptionType._wrap(null)).toBeNull();
    expect(OptionType._wrap(o.zpp_inner)).toBe(o);
    expect(OptionType._wrap({ zpp_inner: o.zpp_inner })).toBe(o);
    expect(OptionType._wrap({})).toBeNull();

    // An inner with no wrapper yet gets a new one bound to it.
    const Inner = (o.zpp_inner as any).constructor;
    const bare = new Inner();
    const w = OptionType._wrap(bare);
    expect(w).toBeInstanceOf(OptionType);
    expect(w.zpp_inner).toBe(bare);
    expect(OptionType._wrap(bare)).toBe(w);
  });

  it("OptionType.toString is stable across calls and lists includes / excludes", () => {
    const inc = new CbType();
    const exc = new CbType();
    const o = new OptionType(inc, exc);
    const first = o.toString();
    expect(first).toBe(`@{[${inc.toString()}] excluding [${exc.toString()}]}`);
    // second call reuses the cached list wrappers
    expect(o.toString()).toBe(first);
    o.including(new CbType());
    expect(o.toString()).not.toBe(first);
  });

  it("CbType._wrap resolves wrappers, inners and objects carrying zpp_inner", () => {
    const c = new CbType();
    expect(CbType._wrap(c)).toBe(c);
    expect(CbType._wrap(null)).toBeNull();
    expect(CbType._wrap(zcb(c))).toBe(c);
    expect(CbType._wrap({ zpp_inner: zcb(c) })).toBe(c);
    expect(CbType._wrap({})).toBeNull();

    const Inner = zcb(c).constructor;
    const bare = new Inner();
    const w = CbType._wrap(bare);
    expect(w).toBeInstanceOf(CbType);
    expect((w as any).zpp_inner).toBe(bare);
    expect(CbType._wrap(bare)).toBe(w);
  });
});
