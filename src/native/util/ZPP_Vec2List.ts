/**
 * ZPP_Vec2List — Internal backing structure for the public Vec2List API.
 *
 * Stores iteration state, caching, validation/invalidation callbacks, and a
 * reference to the underlying ZNPList_ZPP_Vec2 linked list.
 *
 * Converted from nape-compiled.js lines 22490–22578.
 */

import { getNape } from "../../core/engine";
import { ZNPList_ZPP_Vec2 } from "./ZNPRegistry";

type Any = any;

export class ZPP_Vec2List {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "util", "ZPP_Vec2List"];

  // --- Static: internal flag for iterator instantiation guard ---
  static internal = false;

  // --- Instance fields ---
  outer: Any = null;
  inner: Any = null;
  immutable = false;
  _invalidated = false;
  _invalidate: ((self: ZPP_Vec2List) => void) | null = null;
  _validate: (() => void) | null = null;
  _modifiable: (() => void) | null = null;
  adder: ((obj: Any) => boolean) | null = null;
  post_adder: ((obj: Any) => void) | null = null;
  subber: ((obj: Any) => void) | null = null;
  dontremove = false;
  reverse_flag = false;
  at_index = 0;
  at_ite: Any = null;
  push_ite: Any = null;
  zip_length = false;
  user_length = 0;

  __class__: Any = ZPP_Vec2List;

  constructor() {
    this.inner = new ZNPList_ZPP_Vec2();
    this._invalidated = true;
  }

  /**
   * Factory: wrap a raw ZNPList_ZPP_Vec2 into a public Vec2List.
   */
  static get(list: Any, imm?: boolean): Any {
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

