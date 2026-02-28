import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Broadphase algorithm type for Space collision detection.
 *
 * - `DYNAMIC_AABB_TREE` — dynamic AABB tree broadphase
 * - `SWEEP_AND_PRUNE`   — sweep-and-prune broadphase
 *
 * Converted from nape-compiled.js lines 30858–30909.
 */
export class Broadphase {
  static __name__ = ["nape", "space", "Broadphase"];

  static DYNAMIC_AABB_TREE: Broadphase | null = null;
  static SWEEP_AND_PRUNE: Broadphase | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate Broadphase derp!");
    }
  }

  static get_DYNAMIC_AABB_TREE(): Broadphase {
    if (ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE = new Broadphase();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE;
  }

  static get_SWEEP_AND_PRUNE(): Broadphase {
    if (ZPP_Flags.Broadphase_SWEEP_AND_PRUNE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Broadphase_SWEEP_AND_PRUNE = new Broadphase();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Broadphase_SWEEP_AND_PRUNE;
  }

  toString(): string {
    if (this === Broadphase.get_DYNAMIC_AABB_TREE()) return "DYNAMIC_AABB_TREE";
    if (this === Broadphase.get_SWEEP_AND_PRUNE()) return "SWEEP_AND_PRUNE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.space.Broadphase = Broadphase;
(Broadphase.prototype as Any).__class__ = Broadphase;
