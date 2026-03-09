import { Hashable2_Boolfalse } from "./Hashable2_Boolfalse";

const TABLE_SIZE = 1048576; // 2^20
const TABLE_MASK = 1048575; // TABLE_SIZE - 1
const HASH_MULT = 106039;

export class FastHash2_Hashable2_Boolfalse {
  static __name__ = ["zpp_nape", "util", "FastHash2_Hashable2_Boolfalse"];

  table: (Hashable2_Boolfalse | null)[];
  cnt: number = 0;

  __class__: any = FastHash2_Hashable2_Boolfalse;

  constructor() {
    this.cnt = 0;
    this.table = new Array(TABLE_SIZE).fill(null);
  }

  empty(): boolean {
    return this.cnt == 0;
  }

  clear(): void {
    for (let i = 0; i < this.table.length; i++) {
      let n = this.table[i];
      if (n == null) continue;
      while (n != null) {
        const t: Hashable2_Boolfalse | null = n.hnext;
        n.hnext = null;
        n = t;
      }
      this.table[i] = null;
    }
  }

  get(id: number, di: number): Hashable2_Boolfalse | null {
    let n = this.table[(id * HASH_MULT + di) & TABLE_MASK];
    if (n == null) {
      return null;
    } else if (n.id == id && n.di == di) {
      return n;
    } else {
      while (true) {
        n = n!.hnext;
        if (!(n != null && (n.id != id || n.di != di))) break;
      }
      return n;
    }
  }

  ordered_get(id: number, di: number): Hashable2_Boolfalse | null {
    if (id > di) {
      const t = id;
      id = di;
      di = t;
    }
    let n = this.table[(id * HASH_MULT + di) & TABLE_MASK];
    if (n == null) {
      return null;
    } else if (n.id == id && n.di == di) {
      return n;
    } else {
      while (true) {
        n = n!.hnext;
        if (!(n != null && (n.id != id || n.di != di))) break;
      }
      return n;
    }
  }

  has(id: number, di: number): boolean {
    let n = this.table[(id * HASH_MULT + di) & TABLE_MASK];
    if (n == null) {
      return false;
    } else if (n.id == id && n.di == di) {
      return true;
    } else {
      while (true) {
        n = n!.hnext;
        if (!(n != null && (n.id != id || n.di != di))) break;
      }
      return n != null;
    }
  }

  maybeAdd(arb: Hashable2_Boolfalse): void {
    const h = (arb.id * HASH_MULT + arb.di) & TABLE_MASK;
    const n = this.table[h];
    const cont = true;
    if (n == null) {
      this.table[h] = arb;
      arb.hnext = null;
    } else if (cont) {
      arb.hnext = n.hnext;
      n.hnext = arb;
    }
    if (cont) {
      this.cnt++;
    }
  }

  add(arb: Hashable2_Boolfalse): void {
    const h = (arb.id * HASH_MULT + arb.di) & TABLE_MASK;
    const n = this.table[h];
    if (n == null) {
      this.table[h] = arb;
      arb.hnext = null;
    } else {
      arb.hnext = n.hnext;
      n.hnext = arb;
    }
    this.cnt++;
  }

  remove(arb: Hashable2_Boolfalse): void {
    const h = (arb.id * HASH_MULT + arb.di) & TABLE_MASK;
    let n = this.table[h];
    if (n == arb) {
      this.table[h] = n.hnext;
    } else if (n != null) {
      let pre: Hashable2_Boolfalse;
      while (true) {
        pre = n!;
        n = n!.hnext;
        if (!(n != null && n != arb)) break;
      }
      pre!.hnext = n!.hnext;
    }
    arb.hnext = null;
    this.cnt--;
  }

  hash(id: number, di: number): number {
    return (id * HASH_MULT + di) & TABLE_MASK;
  }
}
