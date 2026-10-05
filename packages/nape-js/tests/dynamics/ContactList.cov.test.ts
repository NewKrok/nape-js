/**
 * ContactList — model-based mutation in both orientation modes, hook
 * semantics, active-contact filtering, immutability messages, the
 * ZPP_ContactList backing and ContactIterator pooling (issue #167).
 *
 * ZPP_Contact is an intrusive list node, so a Contact can only live in one
 * user list at a time; each test builds a fresh scene and moves the live
 * contacts into its own lists.
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../src/index";
import { getNape } from "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Polygon } from "../../src/shape/Polygon";
import { ContactList, ContactIterator } from "../../src/dynamics/ContactList";
import { ZPP_ContactList } from "../../src/native/util/ZPP_ContactList";
import { ZPP_Contact } from "../../src/native/dynamics/ZPP_Contact";

/** Several boxes resting on a static floor → many live contacts. */
function liveContacts(): any[] {
  const space = new Space(new Vec2(0, 500));
  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  floor.shapes.add(new Polygon(Polygon.box(1000, 10)));
  floor.space = space;
  for (let i = 0; i < 4; i++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(-150 + i * 100, 30));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.space = space;
  }
  for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);
  const out: any[] = [];
  const arbs = space.arbiters;
  for (let i = 0; i < arbs.length; i++) {
    const arb = arbs.at(i);
    if (!arb.isCollisionArbiter()) continue;
    const cs = arb.collisionArbiter.contacts;
    for (let j = 0; j < cs.length; j++) out.push(cs.at(j));
  }
  return out;
}

function emptyList(): any {
  return new (getNape().dynamics.ContactList)();
}

function items(list: any): any[] {
  const out: any[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.at(i));
  return out;
}

function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe("ContactList — coverage", () => {
  let contacts: any[];

  beforeEach(() => {
    contacts = liveContacts();
    expect(contacts.length).toBeGreaterThanOrEqual(6);
  });

  for (const reverse of [false, true]) {
    it(`random mutation sequence matches an array model (reverse_flag = ${reverse})`, () => {
      const rand = rng(reverse ? 31 : 30);
      const list = emptyList();
      list.zpp_inner.reverse_flag = reverse;
      const model: any[] = [];
      const pool = [...contacts];
      for (let step = 0; step < 300; step++) {
        const r = rand();
        if (r < 0.15 && pool.length > 0) {
          const c = pool.pop();
          expect(list.push(c)).toBe(true);
          model.push(c);
        } else if (r < 0.3 && pool.length > 0) {
          const c = pool.pop();
          expect(list.unshift(c)).toBe(true);
          model.unshift(c);
        } else if (r < 0.4 && pool.length > 0) {
          const c = pool.pop();
          expect(list.add(c)).toBe(true);
          if (reverse) model.push(c);
          else model.unshift(c);
        } else if (r < 0.5) {
          if (model.length === 0) {
            expect(() => list.pop()).toThrow("Cannot remove from empty list");
          } else {
            const c = list.pop();
            expect(c).toBe(model.pop());
            pool.push(c);
          }
        } else if (r < 0.6) {
          if (model.length === 0) {
            expect(() => list.shift()).toThrow("Cannot remove from empty list");
          } else {
            const c = list.shift();
            expect(c).toBe(model.shift());
            pool.push(c);
          }
        } else if (r < 0.7) {
          if (model.length > 0) {
            const i = Math.floor(rand() * model.length);
            const c = model[i];
            expect(list.remove(c)).toBe(true);
            model.splice(i, 1);
            pool.push(c);
            expect(list.has(c)).toBe(false);
          }
        } else {
          for (let k = 0; k < 3 && model.length > 0; k++) {
            const i = Math.floor(rand() * model.length);
            expect(list.at(i)).toBe(model[i]);
          }
        }
        expect(list.length).toBe(model.length);
        expect(list.empty()).toBe(model.length === 0);
      }
      expect(items(list)).toEqual(model);
      expect([...list]).toEqual(model);
    });

    it(`clear() drains from the right end (reverse_flag = ${reverse})`, () => {
      const list = emptyList();
      list.zpp_inner.reverse_flag = reverse;
      const three = contacts.slice(0, 3);
      for (const c of three) list.push(c);
      const removed: any[] = [];
      list.zpp_inner.subber = (c: any) => removed.push(c);
      list.clear();
      expect(list.length).toBe(0);
      expect(removed).toEqual(reverse ? [...three].reverse() : three);
    });
  }

  for (const reverse of [false, true]) {
    it(`removing the contact under a primed at() cursor (reverse_flag = ${reverse})`, () => {
      const list = emptyList();
      list.zpp_inner.reverse_flag = reverse;
      const four = contacts.slice(0, 4);
      for (const c of four) list.push(c);
      list.at(reverse ? 0 : 3);
      expect(list.zpp_inner.at_ite.next).toBeNull();
      const removed = reverse ? list.shift() : list.pop();
      expect(removed).toBe(reverse ? four[0] : four[3]);
      expect(list.zpp_inner.at_ite).toBeNull();
      expect(items(list)).toEqual(reverse ? four.slice(1) : four.slice(0, 3));
    });
  }

  it("first unshift into an empty reverse list, then more unshifts, prepend in order", () => {
    const list = emptyList();
    list.zpp_inner.reverse_flag = true;
    const [a, b, c] = contacts;
    list.unshift(a);
    list.unshift(b);
    list.unshift(c);
    expect(items(list)).toEqual([c, b, a]);
  });

  it("remove() of a contact that is not in the list returns false", () => {
    const list = emptyList();
    list.push(contacts[0]);
    expect(list.remove(contacts[1])).toBe(false);
    expect(list.length).toBe(1);
  });

  it("adder veto, post_adder, subber and dontremove", () => {
    for (const reverse of [false, true]) {
      const fresh = liveContacts();
      const list = emptyList();
      list.zpp_inner.reverse_flag = reverse;
      const [a, b, c] = fresh;
      list.zpp_inner.adder = (x: any) => x !== c;
      const posted: any[] = [];
      list.zpp_inner.post_adder = (x: any) => posted.push(x);
      expect(list.push(a)).toBe(true);
      expect(list.unshift(b)).toBe(true);
      expect(list.push(c)).toBe(false);
      expect(list.unshift(c)).toBe(false);
      expect(posted).toEqual([a, b]);
      expect(items(list)).toEqual([b, a]);

      const subbed: any[] = [];
      list.zpp_inner.subber = (x: any) => subbed.push(x);
      list.zpp_inner.dontremove = true;
      expect(list.pop()).toBe(a);
      expect(list.shift()).toBe(b);
      expect(list.remove(a)).toBe(true);
      expect(subbed).toEqual([a, b, a]);
      expect(items(list)).toEqual([b, a]);
    }
  });

  it("_modifiable veto leaves the list untouched", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.zpp_inner._modifiable = () => {
      throw new Error("locked");
    };
    for (const op of [
      () => list.push(contacts[1]),
      () => list.unshift(contacts[1]),
      () => list.pop(),
      () => list.shift(),
      () => list.remove(contacts[0]),
    ]) {
      expect(op).toThrow("locked");
    }
    list.zpp_inner._modifiable = null;
    expect(items(list)).toEqual([contacts[0]]);
  });

  it("inactive contacts are invisible to length/at/iteration/empty", () => {
    const list = emptyList();
    const [a, b, c, d] = contacts;
    for (const x of [a, b, c, d]) list.push(x);
    expect(list.length).toBe(4);

    // Deactivate the first and third contact (as the engine does for stale ones).
    a.zpp_inner.active = false;
    c.zpp_inner.active = false;
    list.zpp_inner.zip_length = true;
    expect(list.length).toBe(2);
    expect(list.at(0)).toBe(b);
    expect(list.at(1)).toBe(d);
    expect(() => list.at(2)).toThrow("Index out of bounds");
    expect([...list]).toEqual([b, d]);
    const viaForeach: any[] = [];
    list.foreach((x: any) => viaForeach.push(x));
    expect(viaForeach).toEqual([b, d]);
    // has() is structural and still sees the hidden contacts.
    expect(list.has(a)).toBe(true);

    // An inactive arbiter hides all of its contacts too.
    const arb = b.zpp_inner.arbiter;
    const prev = arb.active;
    arb.active = false;
    list.zpp_inner.zip_length = true;
    const visible = items(list);
    expect(visible).not.toContain(b);
    arb.active = prev;

    b.zpp_inner.active = false;
    d.zpp_inner.active = false;
    list.zpp_inner.zip_length = true;
    expect(list.length).toBe(0);
    expect(list.empty()).toBe(true);
  });

  it("reverse_flag at() maps indices from the end", () => {
    const list = emptyList();
    const [a, b, c] = contacts;
    list.push(a);
    list.push(b);
    list.push(c);
    list.zpp_inner.reverse_flag = true;
    list.zpp_inner.at_ite = null;
    expect(items(list)).toEqual([c, b, a]);
  });

  it("immutable list rejects every mutator with 'ContactList is immutable'", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.zpp_inner.immutable = true;
    const c = contacts[1];
    expect(() => list.push(c)).toThrow("ContactList is immutable");
    expect(() => list.unshift(c)).toThrow("ContactList is immutable");
    expect(() => list.add(c)).toThrow("ContactList is immutable");
    expect(() => list.pop()).toThrow("ContactList is immutable");
    expect(() => list.shift()).toThrow("ContactList is immutable");
    expect(() => list.remove(contacts[0])).toThrow("ContactList is immutable");
    expect(() => list.clear()).toThrow("ContactList is immutable");
    expect(items(list)).toEqual([contacts[0]]);
  });

  it("fromArray builds a list in array order; merge adds only missing contacts", () => {
    const [a, b, c] = contacts;
    const list = ContactList.fromArray([a, b]);
    expect(items(list)).toEqual([a, b]);
    const other = emptyList();
    other.push(c);
    list.merge(other);
    expect(items(list)).toEqual([c, a, b]); // merge uses unshift on forward lists
    expect(list.has(c)).toBe(true);
  });

  it("merge into a reverse list appends", () => {
    const [a, b] = contacts;
    const list = emptyList();
    list.zpp_inner.reverse_flag = true;
    list.push(a);
    const other = emptyList();
    other.push(b);
    list.merge(other);
    expect(items(list)).toEqual([a, b]);
  });

  it("filter stops on a throwing predicate", () => {
    const [a, b, c] = contacts;
    const list = ContactList.fromArray([a, b, c]);
    list.filter((x: any) => {
      if (x === c) throw new Error("stop");
      return x !== b;
    });
    expect(items(list)).toEqual([a, c]);
  });

  it("foreach stops at a throwing callback and recycles its iterator", () => {
    (ContactIterator as any).zpp_pool = null;
    const list = ContactList.fromArray(contacts.slice(0, 3));
    let n = 0;
    expect(
      list.foreach(() => {
        n++;
        if (n === 2) throw new Error("stop");
      }),
    ).toBe(list);
    expect(n).toBe(2);
    const recycled = (ContactIterator as any).zpp_pool;
    expect(recycled).not.toBeNull();
    expect(recycled.zpp_inner).toBeNull();
    expect(list.iterator()).toBe(recycled);
  });

  it("toString lists every visible contact", () => {
    const list = ContactList.fromArray(contacts.slice(0, 2));
    expect(list.toString()).toBe("[{Contact},{Contact}]");
  });
});

describe("ContactIterator pooling", () => {
  beforeEach(() => {
    (ContactIterator as any).zpp_pool = null;
  });

  it("cannot be constructed directly", () => {
    expect(() => new (ContactIterator as any)()).toThrow(
      "Cannot instantiate ContactIterator derp!",
    );
  });

  it("an exhausted iterator returns to the pool and is reused with fresh state", () => {
    const list = emptyList();
    const it1 = list.iterator();
    expect(it1.hasNext()).toBe(false);
    expect((ContactIterator as any).zpp_pool).toBe(it1);
    expect(it1.zpp_inner).toBeNull();
    const it2 = list.iterator();
    expect(it2).toBe(it1);
    expect(it2.zpp_i).toBe(0);
    expect(it2.zpp_inner).toBe(list);
    expect((ContactIterator as any).zpp_pool).toBeNull();
  });
});

describe("ZPP_ContactList backing", () => {
  it("get() wraps a raw ZPP_Contact chain as a mutable list by default", () => {
    const sentinel = new ZPP_Contact();
    const list = ZPP_ContactList.get(sentinel);
    expect(list).toBeInstanceOf(ContactList);
    expect(list.zpp_inner.inner).toBe(sentinel);
    expect(list.zpp_inner.immutable).toBe(false);
    expect(list.zpp_inner.zip_length).toBe(true);
    expect(list.length).toBe(0);
  });

  it("get(list, true) is immutable", () => {
    const list = ZPP_ContactList.get(new ZPP_Contact(), true);
    expect(list.zpp_inner.immutable).toBe(true);
    expect(() => list.clear()).toThrow("ContactList is immutable");
  });

  it("valmod() clears the inner modified flags and resets cursors", () => {
    const zl = new ZPP_ContactList();
    zl.inner.modified = true;
    zl.inner.pushmod = true;
    zl.at_ite = new ZPP_Contact();
    zl.push_ite = new ZPP_Contact();
    zl.zip_length = false;
    zl.valmod();
    expect(zl.inner.modified).toBe(false);
    expect(zl.inner.pushmod).toBe(false);
    expect(zl.at_ite).toBeNull();
    expect(zl.push_ite).toBeNull();
    expect(zl.zip_length).toBe(true);

    // modified without pushmod keeps the push cursor.
    const keep = new ZPP_Contact();
    zl.push_ite = keep;
    zl.inner.modified = true;
    zl.valmod();
    expect(zl.push_ite).toBe(keep);
  });

  it("modified() forces a recount and drops both cursors", () => {
    const zl = new ZPP_ContactList();
    zl.at_ite = new ZPP_Contact();
    zl.push_ite = new ZPP_Contact();
    zl.zip_length = false;
    zl.modified();
    expect(zl.zip_length).toBe(true);
    expect(zl.at_ite).toBeNull();
    expect(zl.push_ite).toBeNull();
  });

  it("validate() runs _validate once per invalidation; invalidate() notifies", () => {
    const zl = new ZPP_ContactList();
    let v = 0;
    const inv: any[] = [];
    zl._validate = () => v++;
    zl._invalidate = (self) => inv.push(self);
    zl.validate();
    zl.validate();
    expect(v).toBe(1);
    zl.invalidate();
    expect(inv).toEqual([zl]);
    zl.validate();
    expect(v).toBe(2);
    // No callbacks installed → still safe.
    const bare = new ZPP_ContactList();
    bare.invalidate();
    bare.validate();
    bare.modify_test();
    expect(bare._invalidated).toBe(false);
  });
});
