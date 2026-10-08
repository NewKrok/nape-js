/**
 * ZNPList<T> — Generic singly-linked list backed by ZNPNode<T>.
 *
 * Replaces the 35 identical ZNPList_* classes of the original Haxe build:
 * every ZNPList_X name is an alias of this class (see ZNPRegistry), so all
 * lists share one object shape and one node pool.
 */
import { ZNPNode } from "./ZNPNode";

export class ZNPList<T> {
  head: ZNPNode<T> | null = null;
  length: number = 0;
  modified: boolean = false;
  pushmod: boolean = false;

  private _allocNode(): ZNPNode<T> {
    let ret: ZNPNode<T>;
    if (ZNPNode.zpp_pool == null) {
      ret = new ZNPNode<T>();
    } else {
      ret = ZNPNode.zpp_pool;
      ZNPNode.zpp_pool = ret.next;
      ret.next = null;
    }
    return ret;
  }

  private _freeNode(node: ZNPNode<T>): void {
    node.elt = null;
    node.next = ZNPNode.zpp_pool;
    ZNPNode.zpp_pool = node;
  }

  add(o: T): T {
    const node = this._allocNode();
    node.elt = o;
    node.next = this.head;
    this.head = node;
    this.modified = true;
    this.length++;
    return o;
  }

  insert(cur: ZNPNode<T> | null, o: T): ZNPNode<T> {
    const node = this._allocNode();
    node.elt = o;
    if (cur == null) {
      node.next = this.head;
      this.head = node;
    } else {
      node.next = cur.next;
      cur.next = node;
    }
    this.pushmod = this.modified = true;
    this.length++;
    return node;
  }

  pop(): void {
    const ret = this.head!;
    this.head = ret.next;
    this._freeNode(ret);
    if (this.head == null) {
      this.pushmod = true;
    }
    this.modified = true;
    this.length--;
  }

  pop_unsafe(): T {
    const ret = this.head!.elt!;
    this.pop();
    return ret;
  }

  erase(pre: ZNPNode<T> | null): ZNPNode<T> | null {
    let old: ZNPNode<T>;
    let ret: ZNPNode<T> | null;
    if (pre == null) {
      old = this.head!;
      ret = old.next;
      this.head = ret;
      if (this.head == null) {
        this.pushmod = true;
      }
    } else {
      old = pre.next!;
      ret = old.next;
      pre.next = ret;
      if (ret == null) {
        this.pushmod = true;
      }
    }
    this._freeNode(old);
    this.modified = true;
    this.length--;
    this.pushmod = true;
    return ret;
  }

  remove(obj: T): void {
    let pre: ZNPNode<T> | null = null;
    let cur = this.head;
    while (cur != null) {
      if (cur.elt == obj) {
        this.erase(pre);
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  clear(): void {
    while (this.head != null) {
      const ret = this.head;
      this.head = ret.next;
      this._freeNode(ret);
      if (this.head == null) {
        this.pushmod = true;
      }
      this.modified = true;
      this.length--;
    }
    this.pushmod = true;
  }

  reverse(): void {
    let cur = this.head;
    let pre: ZNPNode<T> | null = null;
    while (cur != null) {
      const nx = cur.next;
      cur.next = pre;
      this.head = cur;
      pre = cur;
      cur = nx;
    }
    this.modified = true;
    this.pushmod = true;
  }

  empty(): boolean {
    return this.head == null;
  }

  has(obj: T): boolean {
    let cx_ite = this.head;
    while (cx_ite != null) {
      if (cx_ite.elt == obj) return true;
      cx_ite = cx_ite.next;
    }
    return false;
  }

  iterator_at(ind: number): ZNPNode<T> | null {
    let ret = this.head;
    while (ind-- > 0 && ret != null) ret = ret.next;
    return ret;
  }

  at(ind: number): T | null {
    const it = this.iterator_at(ind);
    return it != null ? it.elt : null;
  }
}
