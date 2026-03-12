/**
 * ZPP_Vec2List — Internal backing structure for the public Vec2List API.
 *
 * Stores iteration state, caching, validation/invalidation callbacks, and a
 * reference to the underlying ZNPList_ZPP_Vec2 linked list.
 *
 * Converted from nape-compiled.js lines 22490–22578.
 */

import { getNape } from "../../core/engine";
import { ZNPList } from "./ZNPList";
import { ZNPList_ZPP_Vec2 } from "./ZNPRegistry";

export class ZPP_Vec2List {
  // --- Static: Haxe metadata ---

  // --- Static: internal flag for iterator instantiation guard ---
  static internal = false;

  // --- Instance fields ---
  outer: any = null;
  inner: ZNPList<unknown> = null!;
  immutable = false;
  _invalidated = false;
  _invalidate: ((self: ZPP_Vec2List) => void) | null = null;
  _validate: (() => void) | null = null;
  _modifiable: (() => void) | null = null;
  adder: ((obj: any) => boolean) | null = null;
  post_adder: ((obj: any) => void) | null = null;
  subber: ((obj: any) => void) | null = null;
  dontremove = false;
  reverse_flag = false;
  at_index = 0;
  at_ite: any = null;
  push_ite: any = null;
  zip_length = false;
  user_length = 0;

  constructor() {
    this.inner = new ZNPList_ZPP_Vec2();
    this._invalidated = true;
  }

  /**
   * Factory: wrap a raw ZNPList_ZPP_Vec2 into a public Vec2List.
   */
  static get(list: ZNPList<unknown>, imm?: boolean): any {
    if (imm == null) imm = false;
    const nape = getNape();
    const ret = new nape.geom.Vec2List();
    ret.zpp_inner.inner = list;
    if (imm) {
      ret.zpp_inner.immutable = true;
    }
    ret.zpp_inner.zip_length = true;
    return ret;
  }

  valmod(): void {
    this.validate();
    if (this.inner.modified) {
      if (this.inner.pushmod) {
        this.push_ite = null;
      }
      this.at_ite = null;
      this.inner.modified = false;
      this.inner.pushmod = false;
      this.zip_length = true;
    }
  }

  modified(): void {
    this.zip_length = true;
    this.at_ite = null;
    this.push_ite = null;
  }

  modify_test(): void {
    if (this._modifiable != null) {
      this._modifiable();
    }
  }

  validate(): void {
    if (this._invalidated) {
      this._invalidated = false;
      if (this._validate != null) {
        this._validate();
      }
    }
  }

  invalidate(): void {
    this._invalidated = true;
    if (this._invalidate != null) {
      this._invalidate(this);
    }
  }
}
