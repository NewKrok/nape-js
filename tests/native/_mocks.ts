/**
 * Shared mock helpers for native class unit tests.
 *
 * Many native classes depend on `_zpp` and `_nape` namespace references
 * that are normally set by the compiled module. These mocks provide
 * minimal implementations of the required interfaces.
 */

/** Minimal linked-list node mock (ZNPNode pattern). */
export class MockZNPNode {
  static zpp_pool: MockZNPNode | null = null;
  elt: any = null;
  next: MockZNPNode | null = null;
}

/** Minimal linked-list mock (ZNPList pattern). */
export class MockZNPList {
  head: MockZNPNode | null = null;
  length = 0;
  modified = false;
  pushmod = false;

  add(elt: any): void {
    const node = new MockZNPNode();
    node.elt = elt;
    node.next = this.head;
    this.head = node;
    this.length++;
    this.modified = true;
  }

  remove(elt: any): void {
    let prev: MockZNPNode | null = null;
    let cur = this.head;
    while (cur != null) {
      if (cur.elt === elt) {
        if (prev == null) {
          this.head = cur.next;
        } else {
          prev.next = cur.next;
        }
        this.length--;
        this.modified = true;
        return;
      }
      prev = cur;
      cur = cur.next;
    }
  }

  has(elt: any): boolean {
    let cur = this.head;
    while (cur != null) {
      if (cur.elt === elt) return true;
      cur = cur.next;
    }
    return false;
  }

  insert(pre: MockZNPNode | null, elt: any): MockZNPNode {
    const node = new MockZNPNode();
    node.elt = elt;
    if (pre == null) {
      node.next = this.head;
      this.head = node;
    } else {
      node.next = pre.next;
      pre.next = node;
    }
    this.pushmod = this.modified = true;
    this.length++;
    return node;
  }

  pop_unsafe(): any {
    const ret = this.head!.elt;
    this.head = this.head!.next;
    this.length--;
    this.modified = true;
    return ret;
  }

  clear(): void {
    this.head = null;
    this.length = 0;
    this.modified = true;
  }
}

/** Create a mock _zpp namespace with all required list/node constructors. */
export function createMockZpp() {
  let idCounter = 0;

  const zpp: any = {
    util: {
      ZNPList_ZPP_Shape: MockZNPList,
      ZNPList_ZPP_CbType: MockZNPList,
      ZNPList_ZPP_InteractionListener: MockZNPList,
      ZNPList_ZPP_BodyListener: MockZNPList,
      ZNPList_ZPP_ConstraintListener: MockZNPList,
      ZNPList_ZPP_Constraint: MockZNPList,
      ZNPList_ZPP_Interactor: MockZNPList,
      ZNPList_ZPP_CbSet: MockZNPList,
      ZNPList_ZPP_CbSetPair: MockZNPList,
      ZNPList_ZPP_InteractionGroup: MockZNPList,
      ZNPNode_ZPP_InteractionListener: MockZNPNode,
      ZNPNode_ZPP_BodyListener: MockZNPNode,
      ZNPNode_ZPP_ConstraintListener: MockZNPNode,
      ZNPNode_ZPP_CbType: MockZNPNode,
      ZPP_PubPool: { poolVec2: null, nextVec2: null, poolVec3: null, nextVec3: null },
      ZPP_CbTypeList: { get: (list: any, _flag: boolean) => ({ zpp_inner: { inner: list } }) },
      ZPP_ArbiterList: {
        get: (list: any, _flag: boolean) => ({
          zpp_inner: { inner: list, zip_length: false, at_ite: null },
        }),
      },
    },
    geom: {
      ZPP_Vec2: { zpp_pool: null },
    },
    ZPP_ID: {
      CbSet: () => idCounter++,
      CbType: () => idCounter++,
    },
    callbacks: {
      ZPP_CbSet: { setlt: null as any },
      ZPP_CbSetPair: { zpp_pool: null },
    },
  };

  return zpp;
}

/** Create a mock _nape namespace. */
export function createMockNape() {
  return {
    geom: {
      AABB: class {
        zpp_inner: any = {
          outer: null,
          wrap_min: null,
          wrap_max: null,
          _invalidate: null,
          _validate: null,
          next: null,
        };
      },
      Vec2: class {
        zpp_inner: any = {
          outer: null,
          _isimmutable: null,
          _validate: null,
          _invalidate: null,
          _inuse: false,
          weak: false,
          x: 0,
          y: 0,
          next: null,
        };
        zpp_pool: any = null;
        zpp_disp = false;
      },
      Mat23: class {
        zpp_inner: any = { next: null };
      },
    },
    phys: {
      Material: class {
        zpp_inner: any = { outer: null, next: null };
      },
      FluidProperties: class {
        zpp_inner: any = { outer: null, next: null };
      },
    },
    dynamics: {
      InteractionFilter: class {
        zpp_inner: any = { outer: null, next: null };
      },
    },
    callbacks: {
      BodyCallback: class {
        zpp_inner: any = null;
      },
      ConstraintCallback: class {
        zpp_inner: any = null;
      },
      InteractionCallback: class {
        zpp_inner: any = null;
      },
      CbType: class {
        zpp_inner: any = null;
      },
      CbTypeList: class {},
      CbTypeIterator: class {
        static zpp_pool: any = null;
      },
      OptionType: class {
        zpp_inner: any;
        constructor() {
          this.zpp_inner = new MockZNPList();
        }
        including(_val: any) {
          return this;
        }
      },
    },
  };
}
