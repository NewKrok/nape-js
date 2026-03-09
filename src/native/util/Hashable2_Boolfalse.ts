export class Hashable2_Boolfalse {
  static __name__ = ["zpp_nape", "util", "Hashable2_Boolfalse"];
  static zpp_pool: Hashable2_Boolfalse | null = null;

  value: boolean = false;
  next: Hashable2_Boolfalse | null = null;
  hnext: Hashable2_Boolfalse | null = null;
  id: number = 0;
  di: number = 0;

  __class__: any = Hashable2_Boolfalse;

  private static _alloc(): Hashable2_Boolfalse {
    if (Hashable2_Boolfalse.zpp_pool == null) {
      return new Hashable2_Boolfalse();
    }
    const ret = Hashable2_Boolfalse.zpp_pool;
    Hashable2_Boolfalse.zpp_pool = ret.next;
    ret.next = null;
    return ret;
  }

  static get(id: number, di: number, val: boolean): Hashable2_Boolfalse {
    const ret = Hashable2_Boolfalse._alloc();
    ret.id = id;
    ret.di = di;
    ret.value = val;
    return ret;
  }

  static getpersist(id: number, di: number): Hashable2_Boolfalse {
    const ret = Hashable2_Boolfalse._alloc();
    ret.id = id;
    ret.di = di;
    return ret;
  }

  static ordered_get(id: number, di: number, val: boolean): Hashable2_Boolfalse {
    if (id <= di) {
      const ret = Hashable2_Boolfalse._alloc();
      ret.id = id;
      ret.di = di;
      ret.value = val;
      return ret;
    } else {
      const ret = Hashable2_Boolfalse._alloc();
      ret.id = di;
      ret.di = id;
      ret.value = val;
      return ret;
    }
  }

  static ordered_get_persist(id: number, di: number): Hashable2_Boolfalse {
    if (id <= di) {
      const ret = Hashable2_Boolfalse._alloc();
      ret.id = id;
      ret.di = di;
      return ret;
    } else {
      const ret = Hashable2_Boolfalse._alloc();
      ret.id = di;
      ret.di = id;
      return ret;
    }
  }

  free(): void {}
  alloc(): void {}
}
