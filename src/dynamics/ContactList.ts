/**
 * ContactList — Typed list of Contact elements with active-contact filtering.
 *
 * Unlike factory-generated lists, ContactList filters out inactive contacts
 * in get_length(), at(), empty(), clear(), etc. Only contacts where both
 * `contact.active && contact.arbiter.active` are visible.
 *
 * ContactIterator — Pooled iterator for ContactList.
 *
 * Converted from nape-compiled.js lines 6895–7691 (ContactIterator + ContactList).
 */

import { getNape } from "../core/engine";
import { ZPP_ContactList } from "../native/util/ZPP_ContactList";

// ---------------------------------------------------------------------------
// Helper: count active contacts in the inner linked list
// ---------------------------------------------------------------------------

function countActiveContacts(inner: any): number {
  let count = 0;
  let cx = inner.inner.next;
  while (cx != null) {
    if (cx.active && cx.arbiter.active) {
      count++;
    }
    cx = cx.next;
  }
  return count;
}

function ensureLength(inner: any): number {
  inner.valmod();
  if (inner.zip_length) {
    inner.zip_length = false;
    inner.user_length = countActiveContacts(inner);
  }
  return inner.user_length;
}

// ---------------------------------------------------------------------------
// ContactIterator
// ---------------------------------------------------------------------------

function ContactIterator(this: any) {
  this.zpp_next = null;
  this.zpp_critical = false;
  this.zpp_i = 0;
  this.zpp_inner = null;
  if (!ZPP_ContactList.internal) {
    throw new Error("Error: Cannot instantiate ContactIterator derp!");
  }
}

ContactIterator.zpp_pool = null as any;

ContactIterator.get = function (list: any): any {
  let ret: any;
  if (ContactIterator.zpp_pool == null) {
    ZPP_ContactList.internal = true;
    ret = new (ContactIterator as any)();
    ZPP_ContactList.internal = false;
  } else {
    ret = ContactIterator.zpp_pool;
    ContactIterator.zpp_pool = ret.zpp_next;
  }
  ret.zpp_i = 0;
  ret.zpp_inner = list;
  ret.zpp_critical = false;
  return ret;
};

ContactIterator.prototype.zpp_inner = null;
ContactIterator.prototype.zpp_i = null;
ContactIterator.prototype.zpp_critical = null;
ContactIterator.prototype.zpp_next = null;

ContactIterator.prototype.hasNext = function (this: any): boolean {
  this.zpp_inner.zpp_inner.valmod();
  const length = ensureLength(this.zpp_inner.zpp_inner);
  this.zpp_critical = true;
  if (this.zpp_i < length) {
    return true;
  } else {
    this.zpp_next = ContactIterator.zpp_pool;
    ContactIterator.zpp_pool = this;
    this.zpp_inner = null;
    return false;
  }
};

ContactIterator.prototype.next = function (this: any): any {
  this.zpp_critical = false;
  return this.zpp_inner.at(this.zpp_i++);
};

// ---------------------------------------------------------------------------
// ContactList
// ---------------------------------------------------------------------------

function ContactListCtor(this: any) {
  this.zpp_inner = null;
  this.zpp_inner = new ZPP_ContactList();
  this.zpp_inner.outer = this;
}

ContactListCtor.fromArray = function (array: any[]): any {
  if (array == null) {
    throw new Error("Error: Cannot convert null Array to Nape list");
  }
  const nape = getNape();
  const ret = new nape.dynamics.ContactList();
  for (let i = 0; i < array.length; i++) {
    ret.push(array[i]);
  }
  return ret;
};

ContactListCtor.prototype.zpp_inner = null;

Object.defineProperty(ContactListCtor.prototype, "length", {
  get: function (this: any) {
    return ensureLength(this.zpp_inner);
  },
});

ContactListCtor.prototype.has = function (this: any, obj: any): boolean {
  this.zpp_inner.valmod();
  return this.zpp_inner.inner.has(obj.zpp_inner);
};

ContactListCtor.prototype.at = function (this: any, index: number): any {
  this.zpp_inner.valmod();
  const len = ensureLength(this.zpp_inner);
  if (index < 0 || index >= len) {
    throw new Error("Error: Index out of bounds");
  }
  if (this.zpp_inner.reverse_flag) {
    index = ensureLength(this.zpp_inner) - 1 - index;
  }
  // Reset iterator if needed (active-contact filtering means we always
  // start from beginning when going backwards in index)
  if (index < this.zpp_inner.at_index || this.zpp_inner.at_ite == null) {
    this.zpp_inner.at_index = 0;
    this.zpp_inner.at_ite = this.zpp_inner.inner.next;
    // Skip to first active contact
    while (true) {
      const x = this.zpp_inner.at_ite;
      if (x.active && x.arbiter.active) break;
      this.zpp_inner.at_ite = this.zpp_inner.at_ite.next;
    }
  }
  while (this.zpp_inner.at_index != index) {
    this.zpp_inner.at_index++;
    this.zpp_inner.at_ite = this.zpp_inner.at_ite.next;
    // Skip to next active contact
    while (true) {
      const x = this.zpp_inner.at_ite;
      if (x.active && x.arbiter.active) break;
      this.zpp_inner.at_ite = this.zpp_inner.at_ite.next;
    }
  }
  return this.zpp_inner.at_ite.wrapper();
};

ContactListCtor.prototype.push = function (this: any, obj: any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: ContactList is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_inner.valmod();
  const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
  if (cont) {
    if (this.zpp_inner.reverse_flag) {
      this.zpp_inner.inner.add(obj.zpp_inner);
    } else {
      if (this.zpp_inner.push_ite == null) {
        const len = ensureLength(this.zpp_inner);
        if (len == 0) {
          this.zpp_inner.push_ite = null;
        } else {
          this.zpp_inner.push_ite = this.zpp_inner.inner.iterator_at(len - 1);
        }
      }
      this.zpp_inner.push_ite = this.zpp_inner.inner.insert(this.zpp_inner.push_ite, obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
    if (this.zpp_inner.post_adder != null) {
      this.zpp_inner.post_adder(obj);
    }
  }
  return cont;
};

ContactListCtor.prototype.unshift = function (this: any, obj: any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: ContactList is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_inner.valmod();
  const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
  if (cont) {
    if (this.zpp_inner.reverse_flag) {
      if (this.zpp_inner.push_ite == null) {
        const len = ensureLength(this.zpp_inner);
        if (len == 0) {
          this.zpp_inner.push_ite = null;
        } else {
          this.zpp_inner.push_ite = this.zpp_inner.inner.iterator_at(len - 1);
        }
      }
      this.zpp_inner.push_ite = this.zpp_inner.inner.insert(this.zpp_inner.push_ite, obj.zpp_inner);
    } else {
      this.zpp_inner.inner.add(obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
    if (this.zpp_inner.post_adder != null) {
      this.zpp_inner.post_adder(obj);
    }
  }
  return cont;
};

ContactListCtor.prototype.pop = function (this: any): any {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: ContactList is immutable");
  }
  this.zpp_inner.modify_test();
  const len = ensureLength(this.zpp_inner);
  if (len == 0) {
    throw new Error("Error: Cannot remove from empty list");
  }
  this.zpp_inner.valmod();
  let ret: any;
  if (this.zpp_inner.reverse_flag) {
    ret = this.zpp_inner.inner.next;
    const retx = ret.wrapper();
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.pop();
    }
  } else {
    if (this.zpp_inner.at_ite != null && this.zpp_inner.at_ite.next == null) {
      this.zpp_inner.at_ite = null;
    }
    const curLen = ensureLength(this.zpp_inner);
    let ite: any;
    if (curLen == 1) {
      ite = null;
    } else {
      ite = this.zpp_inner.inner.iterator_at(curLen - 2);
    }
    ret = ite == null ? this.zpp_inner.inner.next : ite.next;
    const retx = ret.wrapper();
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.erase(ite);
    }
  }
  this.zpp_inner.invalidate();
  return ret.wrapper();
};

ContactListCtor.prototype.shift = function (this: any): any {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: ContactList is immutable");
  }
  this.zpp_inner.modify_test();
  const len = ensureLength(this.zpp_inner);
  if (len == 0) {
    throw new Error("Error: Cannot remove from empty list");
  }
  this.zpp_inner.valmod();
  let ret: any;
  if (this.zpp_inner.reverse_flag) {
    if (this.zpp_inner.at_ite != null && this.zpp_inner.at_ite.next == null) {
      this.zpp_inner.at_ite = null;
    }
    const curLen = ensureLength(this.zpp_inner);
    let ite: any;
    if (curLen == 1) {
      ite = null;
    } else {
      ite = this.zpp_inner.inner.iterator_at(curLen - 2);
    }
    ret = ite == null ? this.zpp_inner.inner.next : ite.next;
    const retx = ret.wrapper();
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.erase(ite);
    }
  } else {
    ret = this.zpp_inner.inner.next;
    const retx = ret.wrapper();
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(retx);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.pop();
    }
  }
  this.zpp_inner.invalidate();
  return ret.wrapper();
};

ContactListCtor.prototype.add = function (this: any, obj: any): boolean {
  if (this.zpp_inner.reverse_flag) {
    return this.push(obj);
  } else {
    return this.unshift(obj);
  }
};

ContactListCtor.prototype.remove = function (this: any, obj: any): boolean {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: ContactList is immutable");
  }
  this.zpp_inner.modify_test();
  this.zpp_inner.valmod();
  let found = false;
  let cx_ite = this.zpp_inner.inner.next;
  while (cx_ite != null) {
    if (cx_ite == obj.zpp_inner) {
      found = true;
      break;
    }
    cx_ite = cx_ite.next;
  }
  if (found) {
    if (this.zpp_inner.subber != null) {
      this.zpp_inner.subber(obj);
    }
    if (!this.zpp_inner.dontremove) {
      this.zpp_inner.inner.remove(obj.zpp_inner);
    }
    this.zpp_inner.invalidate();
  }
  return found;
};

ContactListCtor.prototype.clear = function (this: any): void {
  if (this.zpp_inner.immutable) {
    throw new Error("Error: ContactList is immutable");
  }
  if (this.zpp_inner.reverse_flag) {
    while (ensureLength(this.zpp_inner) != 0) {
      this.pop();
    }
  } else {
    while (ensureLength(this.zpp_inner) != 0) {
      this.shift();
    }
  }
};

ContactListCtor.prototype.empty = function (this: any): boolean {
  return ensureLength(this.zpp_inner) == 0;
};

ContactListCtor.prototype.iterator = function (this: any): any {
  this.zpp_inner.valmod();
  return ContactIterator.get(this);
};

ContactListCtor.prototype.copy = function (this: any, deep?: boolean): any {
  if (deep == null) deep = false;
  const nape = getNape();
  const ret = new nape.dynamics.ContactList();
  this.zpp_inner.valmod();
  const it = ContactIterator.get(this);
  while (it.hasNext()) {
    const i = it.next();
    if (deep) {
      throw new Error("Error: Contact is not a copyable type");
    }
    ret.push(i);
  }
  return ret;
};

ContactListCtor.prototype.merge = function (this: any, xs: any): void {
  if (xs == null) {
    throw new Error("Error: Cannot merge with null list");
  }
  xs.zpp_inner.valmod();
  const it = ContactIterator.get(xs);
  while (it.hasNext()) {
    const x = it.next();
    if (!this.has(x)) {
      if (this.zpp_inner.reverse_flag) {
        this.push(x);
      } else {
        this.unshift(x);
      }
    }
  }
};

ContactListCtor.prototype.toString = function (this: any): string {
  let ret = "[";
  let fst = true;
  this.zpp_inner.valmod();
  const it = ContactIterator.get(this);
  while (it.hasNext()) {
    const i = it.next();
    if (!fst) ret += ",";
    ret += i == null ? "NULL" : i.toString();
    fst = false;
  }
  return ret + "]";
};

ContactListCtor.prototype.foreach = function (this: any, lambda: any): any {
  if (lambda == null) {
    throw new Error("Error: Cannot execute null on list elements");
  }
  this.zpp_inner.valmod();
  const it = ContactIterator.get(this);
  while (it.hasNext()) {
    try {
      lambda(it.next());
    } catch {
      it.zpp_next = ContactIterator.zpp_pool;
      ContactIterator.zpp_pool = it;
      it.zpp_inner = null;
      break;
    }
  }
  return this;
};

// ES6 iterable protocol — enables for...of and spread on ContactList.
(ContactListCtor.prototype as any)[Symbol.iterator] = function (this: any) {
  const it = ContactIterator.get(this);
  return {
    next(): IteratorResult<any> {
      if (it.hasNext()) {
        return { value: it.next(), done: false };
      }
      return { value: undefined, done: true };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
};

ContactListCtor.prototype.filter = function (this: any, lambda: any): any {
  if (lambda == null) {
    throw new Error("Error: Cannot select elements of list with null");
  }
  let i = 0;
  while (true) {
    const len = ensureLength(this.zpp_inner);
    if (!(i < len)) break;
    const x = this.at(i);
    try {
      if (lambda(x)) {
        ++i;
      } else {
        this.remove(x);
      }
    } catch {
      break;
    }
  }
  return this;
};

export { ContactListCtor as ContactList, ContactIterator };
