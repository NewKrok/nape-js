export class ZNPArray2<T> {
  list: T[] = [];
  width: number = 0;

  __class__: any;

  constructor(width: number, _height: number) {
    this.width = width;
    this.list = [];
  }

  resize(width: number, height: number, def: T): void {
    this.width = width;
    const len = width * height;
    for (let i = 0; i < len; i++) {
      this.list[i] = def;
    }
  }

  get(x: number, y: number): T {
    return this.list[y * this.width + x];
  }

  set(x: number, y: number, obj: T): T {
    return (this.list[y * this.width + x] = obj);
  }
}

export class ZNPArray2_Float extends ZNPArray2<number> {
  static __name__ = ["zpp_nape", "util", "ZNPArray2_Float"];
}

export class ZNPArray2_ZPP_GeomVert extends ZNPArray2<any> {
  static __name__ = ["zpp_nape", "util", "ZNPArray2_ZPP_GeomVert"];
}

export class ZNPArray2_ZPP_MarchPair extends ZNPArray2<any> {
  static __name__ = ["zpp_nape", "util", "ZNPArray2_ZPP_MarchPair"];
}

