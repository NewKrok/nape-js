/**
 * ZPP_SimpleEvent — Internal event for simple polygon decomposition sweep-line.
 *
 * Stores vertex, type (start/end/intersection), and segment references.
 * Uses object pooling.
 *
 * Converted from nape-compiled.js lines 33879–33936.
 */

type Any = any;

export class ZPP_SimpleEvent {
  static __name__ = ["zpp_nape", "geom", "ZPP_SimpleEvent"];
  static zpp_pool: ZPP_SimpleEvent | null = null;

  type = 0;
  vertex: Any = null;
  segment: Any = null;
  segment2: Any = null;
  node: Any = null;
  next: ZPP_SimpleEvent | null = null;

  __class__: Any = ZPP_SimpleEvent;

  static swap_nodes(a: Any, b: Any): void {
    const t = a.node;
    a.node = b.node;
    b.node = t;
  }

  static less_xy(a: Any, b: Any): boolean {
    if (a.vertex.x < b.vertex.x) {
      return true;
    } else if (a.vertex.x > b.vertex.x) {
      return false;
    } else if (a.vertex.y < b.vertex.y) {
      return true;
    } else if (a.vertex.y > b.vertex.y) {
      return false;
    } else {
      return a.type < b.type;
    }
  }

  static get(v: Any): ZPP_SimpleEvent {
    let ret: ZPP_SimpleEvent;
    if (ZPP_SimpleEvent.zpp_pool == null) {
      ret = new ZPP_SimpleEvent();
    } else {
      ret = ZPP_SimpleEvent.zpp_pool;
      ZPP_SimpleEvent.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.vertex = v;
    return ret;
  }

  free(): void {
    this.vertex = null;
    this.segment = this.segment2 = null;
    this.node = null;
  }

  alloc(): void {}
}
