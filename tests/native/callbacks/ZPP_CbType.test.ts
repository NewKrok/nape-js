import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_CbType } from "../../../src/native/callbacks/ZPP_CbType";
import { createMockZpp, MockZNPList, MockZNPNode } from "../_mocks";

describe("ZPP_CbType", () => {
  beforeEach(() => {
    ZPP_CbType._zpp = createMockZpp();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_CbType.__name__).toEqual(["zpp_nape", "callbacks", "ZPP_CbType"]);
    });
  });

  describe("constructor", () => {
    it("should initialize with auto-incrementing id", () => {
      const a = new ZPP_CbType();
      const b = new ZPP_CbType();
      expect(b.id).toBeGreaterThan(a.id);
    });

    it("should create listener lists", () => {
      const ct = new ZPP_CbType();
      expect(ct.listeners).toBeInstanceOf(MockZNPList);
      expect(ct.bodylisteners).toBeInstanceOf(MockZNPList);
      expect(ct.conlisteners).toBeInstanceOf(MockZNPList);
    });

    it("should create constraint and interactor lists", () => {
      const ct = new ZPP_CbType();
      expect(ct.constraints).toBeInstanceOf(MockZNPList);
      expect(ct.interactors).toBeInstanceOf(MockZNPList);
    });

    it("should create cbsets list", () => {
      const ct = new ZPP_CbType();
      expect(ct.cbsets).toBeInstanceOf(MockZNPList);
    });

    it("should initialize other fields", () => {
      const ct = new ZPP_CbType();
      expect(ct.outer).toBeNull();
      expect(ct.userData).toBeNull();
      expect(ct.__class__).toBe(ZPP_CbType);
    });
  });

  describe("setlt", () => {
    it("should compare by id", () => {
      const a = new ZPP_CbType();
      const b = new ZPP_CbType();
      expect(ZPP_CbType.setlt(a, b)).toBe(true);
      expect(ZPP_CbType.setlt(b, a)).toBe(false);
    });

    it("should return false for equal ids", () => {
      const a = new ZPP_CbType();
      expect(ZPP_CbType.setlt(a, a)).toBe(false);
    });
  });

  describe("addInteractor / remInteractor", () => {
    it("should add and remove interactors", () => {
      const ct = new ZPP_CbType();
      const intx = { id: "i1" };
      ct.addInteractor(intx);
      expect(ct.interactors.has(intx)).toBe(true);
      ct.remInteractor(intx);
      expect(ct.interactors.has(intx)).toBe(false);
    });
  });

  describe("addConstraint / remConstraint", () => {
    it("should add and remove constraints", () => {
      const ct = new ZPP_CbType();
      const con = { id: "c1" };
      ct.addConstraint(con);
      expect(ct.constraints.has(con)).toBe(true);
      ct.remConstraint(con);
      expect(ct.constraints.has(con)).toBe(false);
    });
  });

  describe("addint", () => {
    it("should add interaction listener in priority order", () => {
      const ct = new ZPP_CbType();
      // Reset node pool
      MockZNPNode.zpp_pool = null;

      const listener1 = { precedence: 1, id: 1, space: null };
      const listener2 = { precedence: 2, id: 2, space: null };

      ct.addint(listener1);
      expect(ct.listeners.length).toBe(1);

      ct.addint(listener2);
      expect(ct.listeners.length).toBe(2);
      // listener2 has higher precedence so should be first
      expect(ct.listeners.head!.elt).toBe(listener2);
    });

    it("should break tie by id", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;

      const listener1 = { precedence: 1, id: 1, space: null };
      const listener2 = { precedence: 1, id: 2, space: null };

      ct.addint(listener1);
      ct.addint(listener2);
      expect(ct.listeners.head!.elt).toBe(listener2);
    });

    it("should invalidate cbsets listeners", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const cbset = { zip_listeners: false, invalidate_pairs: () => {} };
      ct.cbsets.add(cbset);

      ct.addint({ precedence: 0, id: 0, space: null });
      expect(cbset.zip_listeners).toBe(true);
    });

    it("should use node pool when available", () => {
      const ct = new ZPP_CbType();
      const poolNode = new MockZNPNode();
      const zpp = ZPP_CbType._zpp;
      zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = poolNode;

      ct.addint({ precedence: 0, id: 0, space: null });
      expect(ct.listeners.length).toBe(1);
    });

    it("should insert at end for lowest precedence", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;

      const high = { precedence: 10, id: 1, space: null };
      const low = { precedence: 0, id: 2, space: null };

      ct.addint(high);
      ct.addint(low);
      // high is first (higher precedence), low is after
      expect(ct.listeners.head!.elt).toBe(high);
    });
  });

  describe("removeint", () => {
    it("should remove listener and invalidate cbsets", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const listener = { precedence: 0, id: 0, space: null };
      ct.addint(listener);

      const cbset = { zip_listeners: false, invalidate_pairs: () => {} };
      ct.cbsets.add(cbset);

      ct.removeint(listener);
      expect(cbset.zip_listeners).toBe(true);
    });
  });

  describe("invalidateint", () => {
    it("should mark all cbsets as needing listener revalidation", () => {
      const ct = new ZPP_CbType();
      const cbset1 = { zip_listeners: false, invalidate_pairs: () => {} };
      const cbset2 = { zip_listeners: false, invalidate_pairs: () => {} };
      ct.cbsets.add(cbset1);
      ct.cbsets.add(cbset2);

      ct.invalidateint();
      expect(cbset1.zip_listeners).toBe(true);
      expect(cbset2.zip_listeners).toBe(true);
    });
  });

  describe("addbody", () => {
    it("should add body listener in priority order", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;

      const listener = { precedence: 0, id: 0 };
      ct.addbody(listener);
      expect(ct.bodylisteners.length).toBe(1);
    });

    it("should invalidate cbsets body listeners", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const cbset = { zip_bodylisteners: false };
      ct.cbsets.add(cbset);

      ct.addbody({ precedence: 0, id: 0 });
      expect(cbset.zip_bodylisteners).toBe(true);
    });

    it("should use node pool when available", () => {
      const ct = new ZPP_CbType();
      const zpp = ZPP_CbType._zpp;
      const poolNode = new MockZNPNode();
      zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = poolNode;

      ct.addbody({ precedence: 0, id: 0 });
      expect(ct.bodylisteners.length).toBe(1);
    });

    it("should insert based on precedence and id ordering", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const high = { precedence: 10, id: 1 };
      const low = { precedence: 1, id: 2 };
      ct.addbody(low);
      ct.addbody(high);
      expect(ct.bodylisteners.head!.elt).toBe(high);
    });
  });

  describe("removebody", () => {
    it("should remove body listener and invalidate cbsets", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const listener = { precedence: 0, id: 0 };
      ct.addbody(listener);

      const cbset = { zip_bodylisteners: false };
      ct.cbsets.add(cbset);

      ct.removebody(listener);
      expect(cbset.zip_bodylisteners).toBe(true);
    });
  });

  describe("invalidatebody", () => {
    it("should mark all cbsets as needing body listener revalidation", () => {
      const ct = new ZPP_CbType();
      const cbset = { zip_bodylisteners: false };
      ct.cbsets.add(cbset);
      ct.invalidatebody();
      expect(cbset.zip_bodylisteners).toBe(true);
    });
  });

  describe("addconstraint", () => {
    it("should add constraint listener in priority order", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;

      ct.addconstraint({ precedence: 0, id: 0 });
      expect(ct.conlisteners.length).toBe(1);
    });

    it("should invalidate cbsets constraint listeners", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const cbset = { zip_conlisteners: false };
      ct.cbsets.add(cbset);

      ct.addconstraint({ precedence: 0, id: 0 });
      expect(cbset.zip_conlisteners).toBe(true);
    });

    it("should use node pool when available", () => {
      const ct = new ZPP_CbType();
      const zpp = ZPP_CbType._zpp;
      const poolNode = new MockZNPNode();
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = poolNode;

      ct.addconstraint({ precedence: 0, id: 0 });
      expect(ct.conlisteners.length).toBe(1);
    });
  });

  describe("removeconstraint", () => {
    it("should remove constraint listener and invalidate cbsets", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const listener = { precedence: 0, id: 0 };
      ct.addconstraint(listener);

      const cbset = { zip_conlisteners: false };
      ct.cbsets.add(cbset);

      ct.removeconstraint(listener);
      expect(cbset.zip_conlisteners).toBe(true);
    });
  });

  describe("invalidateconstraint", () => {
    it("should mark all cbsets as needing constraint listener revalidation", () => {
      const ct = new ZPP_CbType();
      const cbset = { zip_conlisteners: false };
      ct.cbsets.add(cbset);
      ct.invalidateconstraint();
      expect(cbset.zip_conlisteners).toBe(true);
    });
  });

  describe("addbody (pool node reuse and insert-at-end)", () => {
    it("should reuse pool node from ZNPNode_ZPP_BodyListener.zpp_pool chain", () => {
      const ct = new ZPP_CbType();
      const zpp = ZPP_CbType._zpp;
      const poolNode2 = new MockZNPNode();
      const poolNode1 = new MockZNPNode();
      poolNode1.next = poolNode2;
      zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = poolNode1;

      ct.addbody({ precedence: 0, id: 0 });
      // poolNode1 was consumed, pool should now point to poolNode2
      expect(zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool).toBe(poolNode2);
      expect(ct.bodylisteners.length).toBe(1);
    });

    it("should insert at end when new listener has lowest precedence", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const zpp = ZPP_CbType._zpp;
      zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = null;

      const high = { precedence: 10, id: 1 };
      const mid = { precedence: 5, id: 2 };
      const low = { precedence: 1, id: 3 };

      ct.addbody(high);
      ct.addbody(mid);
      ct.addbody(low);

      // low should be at the end (pre != null path in insert)
      expect(ct.bodylisteners.length).toBe(3);
      expect(ct.bodylisteners.head!.elt).toBe(high);
    });

    it("should insert after existing when same precedence but lower id", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const zpp = ZPP_CbType._zpp;
      zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = null;

      const a = { precedence: 5, id: 10 };
      const b = { precedence: 5, id: 5 };

      ct.addbody(a);
      ct.addbody(b);
      // a has higher id so should be first; b goes after a (pre != null)
      expect(ct.bodylisteners.head!.elt).toBe(a);
      expect(ct.bodylisteners.length).toBe(2);
    });
  });

  describe("addconstraint (pool node reuse and insert-at-end)", () => {
    it("should reuse pool node from ZNPNode_ZPP_ConstraintListener.zpp_pool chain", () => {
      const ct = new ZPP_CbType();
      const zpp = ZPP_CbType._zpp;
      const poolNode2 = new MockZNPNode();
      const poolNode1 = new MockZNPNode();
      poolNode1.next = poolNode2;
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = poolNode1;

      ct.addconstraint({ precedence: 0, id: 0 });
      expect(zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool).toBe(poolNode2);
      expect(ct.conlisteners.length).toBe(1);
    });

    it("should insert at end when new listener has lowest precedence", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const zpp = ZPP_CbType._zpp;
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = null;

      const high = { precedence: 10, id: 1 };
      const low = { precedence: 1, id: 2 };

      ct.addconstraint(high);
      ct.addconstraint(low);

      expect(ct.conlisteners.length).toBe(2);
      expect(ct.conlisteners.head!.elt).toBe(high);
    });

    it("should insert after existing when same precedence but lower id", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const zpp = ZPP_CbType._zpp;
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = null;

      const a = { precedence: 5, id: 10 };
      const b = { precedence: 5, id: 5 };

      ct.addconstraint(a);
      ct.addconstraint(b);
      expect(ct.conlisteners.head!.elt).toBe(a);
      expect(ct.conlisteners.length).toBe(2);
    });

    it("should insert at head when new listener has higher precedence (break path)", () => {
      const ct = new ZPP_CbType();
      MockZNPNode.zpp_pool = null;
      const zpp = ZPP_CbType._zpp;
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = null;

      const low = { precedence: 1, id: 1 };
      const high = { precedence: 10, id: 2 };

      ct.addconstraint(low);
      ct.addconstraint(high);
      // high should be at head (break triggered, pre == null)
      expect(ct.conlisteners.head!.elt).toBe(high);
      expect(ct.conlisteners.length).toBe(2);
    });
  });
});
