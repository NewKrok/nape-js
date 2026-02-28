/**
 * ZPP_ID — Internal ID counter for the nape physics engine.
 *
 * Provides monotonically increasing IDs for various engine object types.
 * Each category has its own independent counter.
 *
 * Converted from nape-compiled.js lines 44578–44607, 133603–133611.
 */

type Any = any;

export class ZPP_ID {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "ZPP_ID"];

  // --- Static: counters ---
  static _Constraint = 0;
  static _Interactor = 0;
  static _CbType = 0;
  static _CbSet = 0;
  static _Listener = 0;
  static _ZPP_SimpleVert = 0;
  static _ZPP_SimpleSeg = 0;
  static _Space = 0;
  static _InteractionGroup = 0;

  // --- Static: ID generators ---
  static Constraint(): number {
    return ZPP_ID._Constraint++;
  }

  static Interactor(): number {
    return ZPP_ID._Interactor++;
  }

  static CbType(): number {
    return ZPP_ID._CbType++;
  }

  static CbSet(): number {
    return ZPP_ID._CbSet++;
  }

  static Listener(): number {
    return ZPP_ID._Listener++;
  }

  static ZPP_SimpleVert(): number {
    return ZPP_ID._ZPP_SimpleVert++;
  }

  static ZPP_SimpleSeg(): number {
    return ZPP_ID._ZPP_SimpleSeg++;
  }

  static Space(): number {
    return ZPP_ID._Space++;
  }

  static InteractionGroup(): number {
    return ZPP_ID._InteractionGroup++;
  }

  __class__: Any = ZPP_ID;
}
