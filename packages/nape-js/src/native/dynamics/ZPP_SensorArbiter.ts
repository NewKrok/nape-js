/**
 * ZPP_SensorArbiter — Internal sensor arbiter for the nape physics engine.
 *
 * Represents a sensor interaction between two shapes. Simplest arbiter subclass:
 * no physics calculations, just state management and pooling.
 *
 * Converted from nape-compiled.js lines 29363–29521.
 */

import { ZPP_Arbiter } from "./ZPP_Arbiter";

export class ZPP_SensorArbiter extends ZPP_Arbiter {
  // --- Static: Haxe metadata ---

  // --- Static: object pool ---
  static zpp_pool: ZPP_SensorArbiter | null = null;

  // --- Instance: linked list next (for pool) ---
  declare next: ZPP_SensorArbiter | null;

  // --- Instance: Haxe class reference ---

  constructor() {
    super();
    this.next = null;
    this.type = ZPP_Arbiter.SENSOR;
    this.sensorarb = this;
  }

  // ========== Pool callbacks ==========

  alloc(): void {}
  free(): void {}
}
