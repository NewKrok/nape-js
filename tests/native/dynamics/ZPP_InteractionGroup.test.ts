import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_InteractionGroup } from "../../../src/native/dynamics/ZPP_InteractionGroup";
import { createMockZpp, MockZNPList } from "../_mocks";

describe("ZPP_InteractionGroup", () => {
  beforeEach(() => {
    ZPP_InteractionGroup._zpp = createMockZpp();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_InteractionGroup.__name__).toEqual([
        "zpp_nape",
        "dynamics",
        "ZPP_InteractionGroup",
      ]);
    });
  });

  describe("static type flags", () => {
    it("should define SHAPE and BODY", () => {
      expect(ZPP_InteractionGroup.SHAPE).toBe(1);
      expect(ZPP_InteractionGroup.BODY).toBe(2);
    });
  });

  describe("constructor", () => {
    it("should initialize with defaults", () => {
      const g = new ZPP_InteractionGroup();
      expect(g.outer).toBeNull();
      expect(g.ignore).toBe(false);
      expect(g.group).toBeNull();
      expect(g.groups).toBeInstanceOf(MockZNPList);
      expect(g.interactors).toBeInstanceOf(MockZNPList);
      expect(g.depth).toBe(0);
      expect(g.__class__).toBe(ZPP_InteractionGroup);
    });
  });

  describe("setGroup", () => {
    it("should set parent group and update depth", () => {
      const parent = new ZPP_InteractionGroup();
      parent.depth = 2;
      // Mock ignore for invalidation traversal
      parent.ignore = false;

      const child = new ZPP_InteractionGroup();
      child.setGroup(parent);
      expect(child.group).toBe(parent);
      expect(child.depth).toBe(3);
      expect(parent.groups.has(child)).toBe(true);
    });

    it("should remove from previous parent when changing group", () => {
      const old_parent = new ZPP_InteractionGroup();
      old_parent.ignore = false;
      const new_parent = new ZPP_InteractionGroup();
      new_parent.ignore = false;

      const child = new ZPP_InteractionGroup();
      child.setGroup(old_parent);
      expect(old_parent.groups.has(child)).toBe(true);

      child.setGroup(new_parent);
      expect(old_parent.groups.has(child)).toBe(false);
      expect(new_parent.groups.has(child)).toBe(true);
      expect(child.group).toBe(new_parent);
    });

    it("should handle setting to null (unparent)", () => {
      const parent = new ZPP_InteractionGroup();
      parent.ignore = false;
      const child = new ZPP_InteractionGroup();
      child.setGroup(parent);

      child.setGroup(null);
      expect(child.group).toBeNull();
      expect(child.depth).toBe(0);
    });

    it("should do nothing when setting same group", () => {
      const parent = new ZPP_InteractionGroup();
      parent.ignore = false;
      const child = new ZPP_InteractionGroup();
      child.setGroup(parent);
      const depth = child.depth;

      child.setGroup(parent);
      expect(child.depth).toBe(depth);
    });
  });

  describe("invalidate", () => {
    it("should wake interactors when force is true", () => {
      const g = new ZPP_InteractionGroup();
      const wakes: string[] = [];
      g.interactors.add({
        ibody: { wake: () => wakes.push("body") },
        ishape: null,
        icompound: null,
      });
      g.invalidate(true);
      expect(wakes).toEqual(["body"]);
    });

    it("should wake shape bodies", () => {
      const g = new ZPP_InteractionGroup();
      const wakes: string[] = [];
      g.interactors.add({
        ibody: null,
        ishape: { body: { wake: () => wakes.push("shape-body") } },
        icompound: null,
      });
      g.invalidate(true);
      expect(wakes).toEqual(["shape-body"]);
    });

    it("should wake compounds", () => {
      const g = new ZPP_InteractionGroup();
      const wakes: string[] = [];
      g.interactors.add({
        ibody: null,
        ishape: null,
        icompound: { wake: () => wakes.push("compound") },
      });
      g.invalidate(true);
      expect(wakes).toEqual(["compound"]);
    });

    it("should propagate to child groups", () => {
      const parent = new ZPP_InteractionGroup();
      const child = new ZPP_InteractionGroup();
      const wakes: string[] = [];
      child.interactors.add({
        ibody: { wake: () => wakes.push("child-body") },
        ishape: null,
        icompound: null,
      });
      parent.groups.add(child);

      parent.invalidate(true);
      expect(wakes).toEqual(["child-body"]);
    });

    it("should not wake when force is false and ignore is false", () => {
      const g = new ZPP_InteractionGroup();
      g.ignore = false;
      const wakes: string[] = [];
      g.interactors.add({
        ibody: { wake: () => wakes.push("body") },
        ishape: null,
        icompound: null,
      });
      g.invalidate(false);
      expect(wakes).toEqual([]);
    });

    it("should wake when ignore is true even with force false", () => {
      const g = new ZPP_InteractionGroup();
      g.ignore = true;
      const wakes: string[] = [];
      g.interactors.add({
        ibody: { wake: () => wakes.push("body") },
        ishape: null,
        icompound: null,
      });
      g.invalidate(false);
      expect(wakes).toEqual(["body"]);
    });

    it("should default force to false", () => {
      const g = new ZPP_InteractionGroup();
      g.ignore = false;
      const wakes: string[] = [];
      g.interactors.add({
        ibody: { wake: () => wakes.push("body") },
        ishape: null,
        icompound: null,
      });
      g.invalidate();
      expect(wakes).toEqual([]);
    });
  });

  describe("addGroup / remGroup", () => {
    it("should add child group and set depth", () => {
      const parent = new ZPP_InteractionGroup();
      parent.depth = 1;
      const child = new ZPP_InteractionGroup();

      parent.addGroup(child);
      expect(parent.groups.has(child)).toBe(true);
      expect(child.depth).toBe(2);
    });

    it("should remove child group and reset depth", () => {
      const parent = new ZPP_InteractionGroup();
      parent.depth = 1;
      const child = new ZPP_InteractionGroup();
      parent.addGroup(child);

      parent.remGroup(child);
      expect(parent.groups.has(child)).toBe(false);
      expect(child.depth).toBe(0);
    });
  });

  describe("addInteractor / remInteractor", () => {
    it("should add and remove interactors", () => {
      const g = new ZPP_InteractionGroup();
      const intx = { id: "i1" };
      g.addInteractor(intx);
      expect(g.interactors.has(intx)).toBe(true);
      g.remInteractor(intx);
      expect(g.interactors.has(intx)).toBe(false);
    });

    it("remInteractor should accept optional flag parameter", () => {
      const g = new ZPP_InteractionGroup();
      const intx = { id: "i1" };
      g.addInteractor(intx);
      expect(() => g.remInteractor(intx, 1)).not.toThrow();
    });
  });
});
