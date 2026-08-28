import { Hashable2_Boolfalse } from "./Hashable2_Boolfalse";

// Key packing: (id, di) int pairs come from ZPP_ID counters. Pairs that
// exceed the exact-packing range fall into the same Map bucket and are
// disambiguated by the per-bucket hnext chain, so lookups stay correct.
const KEY_SHIFT = 0x100000000; // 2^32

/**
 * FastHash2_Hashable2_Boolfalse — (id, di) → Hashable2_Boolfalse map.
 *
 * Originally a Haxe open-addressing table preallocating 2^20 slots (~8 MB
 * on a 64-bit heap) with an O(table) clear. Now backed by a native Map:
 * zero preallocation, O(entries) clear. Duplicate (id, di) entries chain
 * via hnext, matching the original bucket semantics.
 */
export class FastHash2_Hashable2_Boolfalse {
  map: Map<number, Hashable2_Boolfalse> = new Map();
  cnt: number = 0;

  private key(id: number, di: number): number {
    return id * KEY_SHIFT + di;
  }

  empty(): boolean {
    return this.cnt == 0;
  }

  /**
   * Remove all entries, invoking `free` (if given) on each so callers can
   * return entries to their object pool.
   */
  clear(free?: (n: Hashable2_Boolfalse) => void): void {
    for (const head of this.map.values()) {
      let n: Hashable2_Boolfalse | null = head;
      while (n != null) {
        const t: Hashable2_Boolfalse | null = n.hnext;
        n.hnext = null;
        if (free) free(n);
        n = t;
      }
    }
    this.map.clear();
    this.cnt = 0;
  }

  get(id: number, di: number): Hashable2_Boolfalse | null {
    let n = this.map.get(this.key(id, di)) ?? null;
    while (n != null && (n.id != id || n.di != di)) {
      n = n.hnext;
    }
    return n;
  }

  has(id: number, di: number): boolean {
    return this.get(id, di) != null;
  }

  add(arb: Hashable2_Boolfalse): void {
    const k = this.key(arb.id, arb.di);
    const n = this.map.get(k);
    if (n == null) {
      arb.hnext = null;
      this.map.set(k, arb);
    } else {
      arb.hnext = n.hnext;
      n.hnext = arb;
    }
    this.cnt++;
  }

  remove(arb: Hashable2_Boolfalse): void {
    const k = this.key(arb.id, arb.di);
    let n = this.map.get(k) ?? null;
    if (n == arb) {
      if (n.hnext == null) {
        this.map.delete(k);
      } else {
        this.map.set(k, n.hnext);
      }
    } else if (n != null) {
      let pre: Hashable2_Boolfalse;
      while (true) {
        pre = n!;
        n = n!.hnext;
        if (!(n != null && n != arb)) break;
      }
      if (n != null) pre.hnext = n.hnext;
    }
    arb.hnext = null;
    this.cnt--;
  }
}
