export class ZNPArray2<T> {
  list: T[] = [];
  width: number = 0;

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

export class ZNPArray2_Float extends ZNPArray2<number> {}

export class ZNPArray2_ZPP_GeomVert extends ZNPArray2<any> {}

export class ZNPArray2_ZPP_MarchPair extends ZNPArray2<any> {}
