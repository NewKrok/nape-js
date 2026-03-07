/**
 * ZPP_ContactList — Internal backing structure for the public ContactList API.
 *
 * Stores iteration state, caching, validation/invalidation callbacks, and a
 * reference to the underlying ZPP_Contact linked list sentinel.
 *
 * Converted from nape-compiled.js lines 23231–23324.
 */

import { getNape } from "../../core/engine";
import { ZPP_Contact } from "../dynamics/ZPP_Contact";

export class ZPP_ContactList {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "util", "ZPP_ContactList"];

  // --- Static: internal flag for iterator instantiation guard ---
  static internal = false;

  // --- Instance fields ---
  outer: any = null;
  inner: ZPP_Contact = null!;
  immutable = false;
  _invalidated = false;
  _invalidate: ((self: ZPP_ContactList) => void) | null = null;
  _validate: (() => void) | null = null;
  _modifiable: (() => void) | null = null;
  adder: ((obj: any) => boolean) | null = null;
  post_adder: ((obj: any) => void) | null = null;
  subber: ((obj: any) => void) | null = null;
  dontremove = false;
  reverse_flag = false;
  at_index = 0;
  at_ite: ZPP_Contact | null = null;
  push_ite: ZPP_Contact | null = null;
  zip_length = false;
  user_length = 0;

  constructor() {
    this.inner = new ZPP_Contact();
    this._invalidated = true;
  }

  /**
   * Factory: wrap a raw ZPP_Contact linked list into a public ContactList.
   */
  static get(list: ZPP_Contact, imm?: boolean): any {
    if (imm == null) imm = false;
    const nape = getNape();
    const ret = new nape.dynamics.ContactList();
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

// --- Register in compiled namespace ---
const nape = getNape();
nape.__zpp.util.ZPP_ContactList = ZPP_ContactList;
