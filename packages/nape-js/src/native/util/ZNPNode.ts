/**
 * ZNPNode<T> — Generic linked list node used by ZNPList<T>.
 *
 * Replaces the 35 identical ZNPNode_* classes of the original Haxe build.
 */
export class ZNPNode<T> {
  static zpp_pool: any = null;

  elt: T | null = null;
  next: ZNPNode<T> | null = null;

  alloc(): void {}

  free(): void {
    this.elt = null;
  }

  elem(): T | null {
    return this.elt;
  }
}
