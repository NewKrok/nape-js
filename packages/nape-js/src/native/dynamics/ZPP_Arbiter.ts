/**
 * ZPP_Arbiter — Internal arbiter base class for the nape physics engine.
 *
 * Represents an interaction (collision, fluid, or sensor) between two shapes.
 * Manages body arbiter lists, pooled wrapper creation, and state tracking.
 * Subclassed by ZPP_ColArbiter, ZPP_FluidArbiter, and ZPP_SensorArbiter.
 *
 * Converted from nape-compiled.js lines 29044–29362, 80738–80766.
 */

export class ZPP_Arbiter {
  // --- Static: Haxe metadata ---

  // --- Static: namespace references (set during registration) ---
  static _nape: any = null;
  static _zpp: any = null;

  // --- Static: creation guard ---
  static internal = false;

  // --- Static: factory callbacks (set by TS subclass modules at load time) ---
  static _createColArb: (() => any) | null = null;
  static _createFluidArb: (() => any) | null = null;

  // --- Static: arbiter type constants ---
  static COL = 1;
  static FLUID = 4;
  static SENSOR = 2;

  // --- Instance: public wrapper ---
  outer: any = null;

  // --- Instance: hash-next for broadphase hash table ---
  hnext: ZPP_Arbiter | null = null;

  // --- Instance: IDs ---
  id = 0;
  di = 0;

  // --- Instance: stamps ---
  stamp = 0;
  up_stamp = 0;
  sleep_stamp = 0;
  endGenerated = 0;

  // --- Instance: state flags ---
  active = false;
  cleared = false;
  sleeping = false;
  present = 0;
  intchange = false;
  presentable = false;
  continuous = false;
  fresh = false;
  immState = 0;
  invalidated = false;

  // --- Instance: body/shape references ---
  b1: any = null;
  b2: any = null;
  ws1: any = null;
  ws2: any = null;

  // --- Instance: broadphase pair ---
  pair: any = null;

  // --- Instance: arbiter type ---
  type = 0;

  // --- Instance: subclass references ---
  colarb: any = null;
  fluidarb: any = null;
  sensorarb: any = null;

  constructor() {
    this.sensorarb = null;
    this.fluidarb = null;
    this.colarb = null;
    this.type = 0;
    this.pair = null;
    this.ws2 = null;
    this.ws1 = null;
    this.b2 = null;
    this.b1 = null;
    this.invalidated = false;
    this.immState = 0;
    this.fresh = false;
    this.continuous = false;
    this.presentable = false;
    this.intchange = false;
    this.present = 0;
    this.sleeping = false;
    this.cleared = false;
    this.active = false;
    this.endGenerated = 0;
    this.sleep_stamp = 0;
    this.up_stamp = 0;
    this.stamp = 0;
    this.di = 0;
    this.id = 0;
    this.hnext = null;
    this.outer = null;
  }

  // ========== Wrapper ==========

  wrapper(): any {
    if (this.outer == null) {
      const nape = ZPP_Arbiter._nape;
      ZPP_Arbiter.internal = true;
      if (this.type == ZPP_Arbiter.COL) {
        this.colarb.outer_zn = ZPP_Arbiter._createColArb!();
        this.outer = this.colarb.outer_zn;
      } else if (this.type == ZPP_Arbiter.FLUID) {
        this.fluidarb.outer_zn = ZPP_Arbiter._createFluidArb!();
        this.outer = this.fluidarb.outer_zn;
      } else {
        this.outer = new nape.dynamics.Arbiter();
      }
      this.outer.zpp_inner = this;
      ZPP_Arbiter.internal = false;
    }
    return this.outer;
  }
}
