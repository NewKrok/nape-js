/**
 * ZPP_SensorArbiter — Internal sensor arbiter for the nape physics engine.
 *
 * Represents a sensor interaction between two shapes. Simplest arbiter subclass:
 * no physics calculations, just state management and pooling.
 *
 * Converted from nape-compiled.js lines 29363–29521.
 */

import { ZPP_Arbiter } from "./ZPP_Arbiter";

type Any = any;

export class ZPP_SensorArbiter extends ZPP_Arbiter {
  // --- Static: Haxe metadata ---
  static override __name__ = ["zpp_nape", "dynamics", "ZPP_SensorArbiter"];
  static __super__ = ZPP_Arbiter;

  // --- Static: object pool ---
  static zpp_pool: ZPP_SensorArbiter | null = null;

  // --- Instance: linked list next (for pool) ---
  declare next: ZPP_SensorArbiter | null;

  // --- Instance: Haxe class reference ---
  override __class__: Any = ZPP_SensorArbiter;

  constructor() {
    super();
    this.next = null;
    this.type = ZPP_Arbiter.SENSOR;
    this.sensorarb = this;
  }

  // ========== Pool callbacks ==========

  alloc(): void {}
  free(): void {}

  // ========== Assign ==========

  assign(s1: Any, s2: Any, id: number, di: number): void {
    this.sup_assign(s1, s2, id, di);
  }

  // ========== Retire ==========

  retire(): void {
    this.sup_retire();
    // Return to pool
    this.next = ZPP_SensorArbiter.zpp_pool;
    ZPP_SensorArbiter.zpp_pool = this;
  }

  // ========== Mutability (no-ops for sensor) ==========

  makemutable(): void {}
  makeimmutable(): void {}
}
