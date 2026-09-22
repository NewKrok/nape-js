import { ZPP_Flags } from "../native/util/ZPP_Flags";

/**
 * Broadphase algorithm type for Space collision detection.
 *
 * - `DYNAMIC_AABB_TREE` — dynamic AABB tree broadphase (default, general purpose)
 * - `SWEEP_AND_PRUNE`   — sweep-and-prune broadphase
 * - `SPATIAL_HASH`       — spatial hash grid broadphase (best for dense, uniform-size scenes)
 */
export class Broadphase {
  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Cannot instantiate Broadphase derp!");
    }
  }

  static get DYNAMIC_AABB_TREE(): Broadphase {
    if (ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE = new Broadphase();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE;
  }

  static get SWEEP_AND_PRUNE(): Broadphase {
    if (ZPP_Flags.Broadphase_SWEEP_AND_PRUNE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Broadphase_SWEEP_AND_PRUNE = new Broadphase();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Broadphase_SWEEP_AND_PRUNE;
  }

  static get SPATIAL_HASH(): Broadphase {
    if (ZPP_Flags.Broadphase_SPATIAL_HASH == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Broadphase_SPATIAL_HASH = new Broadphase();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Broadphase_SPATIAL_HASH;
  }

  toString(): string {
    if (this === ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE) return "DYNAMIC_AABB_TREE";
    if (this === ZPP_Flags.Broadphase_SWEEP_AND_PRUNE) return "SWEEP_AND_PRUNE";
    if (this === ZPP_Flags.Broadphase_SPATIAL_HASH) return "SPATIAL_HASH";
    return "";
  }
}
