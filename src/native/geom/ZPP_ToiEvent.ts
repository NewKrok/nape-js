/**
 * ZPP_ToiEvent — Internal time-of-impact event for CCD (continuous collision detection).
 *
 * Simple pool object used by ZPP_SweepDistance and ZPP_Space to track
 * time-of-impact events during continuous collision detection sweeps.
 *
 * Converted from nape-compiled.js lines 24804–24843.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_Shape } from "../shape/ZPP_Shape";
import { ZPP_ColArbiter } from "../dynamics/ZPP_ColArbiter";

export class ZPP_ToiEvent {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_ToiEvent"];

  // --- Static: pool ---
  static zpp_pool: ZPP_ToiEvent | null = null;

  // --- Instance fields ---
  next: ZPP_ToiEvent | null = null;
  toi: number = 0.0;
  s1: ZPP_Shape | null = null;
  s2: ZPP_Shape | null = null;
  arbiter: ZPP_ColArbiter | null = null;
  frozen1: boolean = false;
  frozen2: boolean = false;
  c1: ZPP_Vec2;
  c2: ZPP_Vec2;
  axis: ZPP_Vec2;
  slipped: boolean = false;
  failed: boolean = false;
  kinematic: boolean = false;


  constructor() {
    this.c1 = new ZPP_Vec2();
    this.c2 = new ZPP_Vec2();
    this.axis = new ZPP_Vec2();
  }

  // --- Pool methods ---

  alloc(): void {
    this.failed = false;
    this.s1 = this.s2 = null;
    this.arbiter = null;
  }

  free(): void {}
}
