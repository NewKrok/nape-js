/**
 * ZPP_GeomVert — Internal geometry vertex for the nape physics engine.
 *
 * Circular doubly-linked list node for polygon vertex rings.
 * Supports object pooling and lazy Vec2 wrapper creation.
 *
 * Converted from nape-compiled.js lines 26463–26646.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_PubPool } from "../util/ZPP_PubPool";

export class ZPP_GeomVert {
  static __name__ = ["zpp_nape", "geom", "ZPP_GeomVert"];
  static zpp_pool: ZPP_GeomVert | null = null;

  x = 0.0;
  y = 0.0;
  prev: ZPP_GeomVert | null = null;
  next: ZPP_GeomVert | null = null;
  wrap: any = null; // public Vec2 wrapper; `any` to avoid circular import
  forced = false;

  /** Factory: get from pool or create new, set coordinates. */
  static get(x: number, y: number): ZPP_GeomVert {
    let ret: ZPP_GeomVert;
    if (ZPP_GeomVert.zpp_pool == null) {
      ret = new ZPP_GeomVert();
    } else {
      ret = ZPP_GeomVert.zpp_pool;
      ZPP_GeomVert.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.forced = false;
    ret.x = x;
    ret.y = y;
    return ret;
  }

  alloc(): void {
    this.forced = false;
  }

  /** Free this vertex: dispose wrap Vec2, clear linked-list pointers. */
  free(): void {
    if (this.wrap != null) {
      this.wrap.zpp_inner._inuse = false;
      const _this = this.wrap;
      if (_this != null && _this.zpp_disp) {
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
      }
      const _this1 = _this.zpp_inner;
      if (_this1._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this1._isimmutable != null) {
        _this1._isimmutable();
      }
      if (_this.zpp_inner._inuse) {
        throw new Error("Error: This Vec2 is not disposable");
      }
      const inner = _this.zpp_inner;
      _this.zpp_inner.outer = null;
      _this.zpp_inner = null;
      const o = _this;
      o.zpp_pool = null;
      if (ZPP_PubPool.nextVec2 != null) {
        ZPP_PubPool.nextVec2.zpp_pool = o;
      } else {
        ZPP_PubPool.poolVec2 = o;
      }
      ZPP_PubPool.nextVec2 = o;
      o.zpp_disp = true;
      const o1 = inner;
      if (o1.outer != null) {
        o1.outer.zpp_inner = null;
        o1.outer = null;
      }
      o1._isimmutable = null;
      o1._validate = null;
      o1._invalidate = null;
      o1.next = ZPP_Vec2.zpp_pool;
      ZPP_Vec2.zpp_pool = o1;
      this.wrap = null;
    }
    this.prev = this.next = null;
  }

  /** Get or create a Vec2 wrapper for this vertex. */
  wrapper(): any {
    if (this.wrap == null) {
      let x = this.x;
      let y = this.y;
      if (y == null) {
        y = 0;
      }
      if (x == null) {
        x = 0;
      }
      if (x !== x || y !== y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let ret: any;
      if (ZPP_PubPool.poolVec2 == null) {
        // Need to get Vec2 class from nape namespace — use _createVec2Fn callback
        ret = ZPP_GeomVert._createVec2Fn!();
      } else {
        ret = ZPP_PubPool.poolVec2;
        ZPP_PubPool.poolVec2 = ret.zpp_pool;
        ret.zpp_pool = null;
        ret.zpp_disp = false;
        if (ret === ZPP_PubPool.nextVec2) {
          ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret.zpp_inner == null) {
        let ret1: ZPP_Vec2;
        if (ZPP_Vec2.zpp_pool == null) {
          ret1 = new ZPP_Vec2();
        } else {
          ret1 = ZPP_Vec2.zpp_pool;
          ZPP_Vec2.zpp_pool = ret1.next;
          ret1.next = null;
        }
        ret1.weak = false;
        ret1._immutable = false;
        ret1.x = x;
        ret1.y = y;
        ret.zpp_inner = ret1;
        ret.zpp_inner.outer = ret;
      } else {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this = ret.zpp_inner;
        if (_this._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this._isimmutable != null) {
          _this._isimmutable();
        }
        if (x !== x || y !== y) {
          throw new Error("Error: Vec2 components cannot be NaN");
        }
        let tmp: boolean;
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this1 = ret.zpp_inner;
        if (_this1._validate != null) {
          _this1._validate();
        }
        if (ret.zpp_inner.x === x) {
          if (ret != null && ret.zpp_disp) {
            throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
          }
          const _this2 = ret.zpp_inner;
          if (_this2._validate != null) {
            _this2._validate();
          }
          tmp = ret.zpp_inner.y === y;
        } else {
          tmp = false;
        }
        if (!tmp) {
          ret.zpp_inner.x = x;
          ret.zpp_inner.y = y;
          const _this3 = ret.zpp_inner;
          if (_this3._invalidate != null) {
            _this3._invalidate(_this3);
          }
        }
      }
      ret.zpp_inner.weak = false;
      this.wrap = ret;
      this.wrap.zpp_inner._inuse = true;
      this.wrap.zpp_inner._invalidate = (n: ZPP_Vec2) => this.modwrap(n);
      this.wrap.zpp_inner._validate = () => this.getwrap();
    }
    return this.wrap;
  }

  modwrap(n: ZPP_Vec2): void {
    this.x = n.x;
    this.y = n.y;
  }

  getwrap(): void {
    this.wrap.zpp_inner.x = this.x;
    this.wrap.zpp_inner.y = this.y;
  }

  /** Callback to create a new Vec2 public API object. Set by Vec2.ts or engine init. */
  static _createVec2Fn: (() => object) | null = null;
}
