/**
 * ZPP_SpaceArbiterList — Immutable arbiter list aggregating all space arbiters.
 *
 * Extends ArbiterList to provide a read-only view of all active arbiters
 * across four internal lists (c_arbiters_true, c_arbiters_false, f_arbiters,
 * s_arbiters). All mutation methods throw immutable errors.
 *
 * Converted from nape-compiled.js lines 20830–21107.
 */

type Any = any;

export class ZPP_SpaceArbiterList {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "dynamics", "ZPP_SpaceArbiterList"];
  static __super__: Any = null;

  // --- Static: namespace references ---
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Instance fields (from ArbiterList parent) ---
  zpp_inner: Any = null;

  // --- Instance fields ---
  space: Any = null;
  _length = 0;
  zip_length = false;
  lengths: number[] = [];
  ite_0: Any = null;
  ite_1: Any = null;
  ite_2: Any = null;
  ite_3: Any = null;
  at_index_0 = 0;
  at_index_1 = 0;
  at_index_2 = 0;
  at_index_3 = 0;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_SpaceArbiterList;

  constructor() {
    // Call parent ArbiterList constructor
    ZPP_SpaceArbiterList._nape.dynamics.ArbiterList.call(this);
    this.at_index_0 = 0;
    this.at_index_1 = 0;
    this.at_index_2 = 0;
    this.at_index_3 = 0;
    this.zip_length = true;
    this._length = 0;
    this.lengths = [];
    this.lengths.push(0);
    this.lengths.push(0);
    this.lengths.push(0);
    this.lengths.push(0);
  }

  static _init(): void {
    ZPP_SpaceArbiterList.__super__ = ZPP_SpaceArbiterList._nape.dynamics.ArbiterList;
    // Copy parent prototype methods
    const parentProto = ZPP_SpaceArbiterList._nape.dynamics.ArbiterList.prototype;
    for (const k in parentProto) {
      if (!(k in ZPP_SpaceArbiterList.prototype)) {
        (ZPP_SpaceArbiterList.prototype as Any)[k] = parentProto[k];
      }
    }
  }

  // ========== Length computation ==========

  zpp_gl(): number {
    this.zpp_vm();
    if (this.zip_length) {
      this._length = 0;
      let ind = 0;

      let len = 0;
      let cx_ite = this.space.c_arbiters_true.head;
      while (cx_ite != null) {
        const i = cx_ite.elt;
        if (i.active) {
          ++len;
        }
        cx_ite = cx_ite.next;
      }
      this.lengths[ind++] = len;
      this._length += len;

      let len1 = 0;
      let cx_ite1 = this.space.c_arbiters_false.head;
      while (cx_ite1 != null) {
        const i1 = cx_ite1.elt;
        if (i1.active) {
          ++len1;
        }
        cx_ite1 = cx_ite1.next;
      }
      this.lengths[ind++] = len1;
      this._length += len1;

      let len2 = 0;
      let cx_ite2 = this.space.f_arbiters.head;
      while (cx_ite2 != null) {
        const i2 = cx_ite2.elt;
        if (i2.active) {
          ++len2;
        }
        cx_ite2 = cx_ite2.next;
      }
      this.lengths[ind++] = len2;
      this._length += len2;

      let len3 = 0;
      let cx_ite3 = this.space.s_arbiters.head;
      while (cx_ite3 != null) {
        const i3 = cx_ite3.elt;
        if (i3.active) {
          ++len3;
        }
        cx_ite3 = cx_ite3.next;
      }
      this.lengths[ind++] = len3;
      this._length += len3;

      this.zip_length = false;
    }
    return this._length;
  }

  // ========== Modification check ==========

  zpp_vm(): void {
    let modified = false;
    if (this.space.c_arbiters_true.modified) {
      modified = true;
      this.space.c_arbiters_true.modified = false;
    }
    if (this.space.c_arbiters_false.modified) {
      modified = true;
      this.space.c_arbiters_false.modified = false;
    }
    if (this.space.f_arbiters.modified) {
      modified = true;
      this.space.f_arbiters.modified = false;
    }
    if (this.space.s_arbiters.modified) {
      modified = true;
      this.space.s_arbiters.modified = false;
    }
    if (modified) {
      this.zip_length = true;
      this._length = 0;
      this.ite_0 = null;
      this.ite_1 = null;
      this.ite_2 = null;
      this.ite_3 = null;
    }
  }

  // ========== Immutable overrides ==========

  push(_obj: Any): void {
    throw new Error("Error: ArbiterList is immutable");
  }

  pop(): Any {
    throw new Error("Error: ArbiterList is immutable");
  }

  unshift(_obj: Any): void {
    throw new Error("Error: ArbiterList is immutable");
  }

  shift(): Any {
    throw new Error("Error: ArbiterList is immutable");
  }

  remove(_obj: Any): void {
    throw new Error("Error: ArbiterList is immutable");
  }

  clear(): void {
    throw new Error("Error: ArbiterList is immutable");
  }

  // ========== Indexed access ==========

  at(index: number): Any {
    this.zpp_vm();
    if (index < 0 || index >= this.zpp_gl()) {
      throw new Error("Error: Index out of bounds");
    }
    let ret: Any = null;
    let accum_length = 0;

    if (ret == null) {
      if (index < accum_length + this.lengths[0]) {
        const offset = index - accum_length;
        if (offset < this.at_index_0 || this.ite_0 == null) {
          this.at_index_0 = 0;
          this.ite_0 = this.space.c_arbiters_true.head;
          while (true) {
            const x = this.ite_0.elt;
            if (x.active) {
              break;
            }
            this.ite_0 = this.ite_0.next;
          }
        }
        while (this.at_index_0 != offset) {
          this.at_index_0++;
          this.ite_0 = this.ite_0.next;
          while (true) {
            const x1 = this.ite_0.elt;
            if (x1.active) {
              break;
            }
            this.ite_0 = this.ite_0.next;
          }
        }
        ret = this.ite_0.elt.wrapper();
      } else {
        accum_length += this.lengths[0];
      }
    }

    if (ret == null) {
      if (index < accum_length + this.lengths[1]) {
        const offset1 = index - accum_length;
        if (offset1 < this.at_index_1 || this.ite_1 == null) {
          this.at_index_1 = 0;
          this.ite_1 = this.space.c_arbiters_false.head;
          while (true) {
            const x2 = this.ite_1.elt;
            if (x2.active) {
              break;
            }
            this.ite_1 = this.ite_1.next;
          }
        }
        while (this.at_index_1 != offset1) {
          this.at_index_1++;
          this.ite_1 = this.ite_1.next;
          while (true) {
            const x3 = this.ite_1.elt;
            if (x3.active) {
              break;
            }
            this.ite_1 = this.ite_1.next;
          }
        }
        ret = this.ite_1.elt.wrapper();
      } else {
        accum_length += this.lengths[1];
      }
    }

    if (ret == null) {
      if (index < accum_length + this.lengths[2]) {
        const offset2 = index - accum_length;
        if (offset2 < this.at_index_2 || this.ite_2 == null) {
          this.at_index_2 = 0;
          this.ite_2 = this.space.f_arbiters.head;
          while (true) {
            const x4 = this.ite_2.elt;
            if (x4.active) {
              break;
            }
            this.ite_2 = this.ite_2.next;
          }
        }
        while (this.at_index_2 != offset2) {
          this.at_index_2++;
          this.ite_2 = this.ite_2.next;
          while (true) {
            const x5 = this.ite_2.elt;
            if (x5.active) {
              break;
            }
            this.ite_2 = this.ite_2.next;
          }
        }
        ret = this.ite_2.elt.wrapper();
      } else {
        accum_length += this.lengths[2];
      }
    }

    if (ret == null) {
      if (index < accum_length + this.lengths[3]) {
        const offset3 = index - accum_length;
        if (offset3 < this.at_index_3 || this.ite_3 == null) {
          this.at_index_3 = 0;
          this.ite_3 = this.space.s_arbiters.head;
          while (true) {
            const x6 = this.ite_3.elt;
            if (x6.active) {
              break;
            }
            this.ite_3 = this.ite_3.next;
          }
        }
        while (this.at_index_3 != offset3) {
          this.at_index_3++;
          this.ite_3 = this.ite_3.next;
          while (true) {
            const x7 = this.ite_3.elt;
            if (x7.active) {
              break;
            }
            this.ite_3 = this.ite_3.next;
          }
        }
        ret = this.ite_3.elt.wrapper();
      } else {
        accum_length += this.lengths[3];
      }
    }

    return ret;
  }
}
