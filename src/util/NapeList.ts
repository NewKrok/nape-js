import type { NapeInner } from "../geom/Vec2";

/**
 * Generic typed wrapper around Haxe list objects (BodyList, ShapeList, etc.).
 *
 * Provides a modern iterable interface with `for...of`, `length`, `at()`, etc.
 */
export class NapeList<T> implements Iterable<T> {
  /** @internal */
  readonly _inner: NapeInner;

  /** @internal Function that wraps a raw Haxe element into its TS counterpart. */
  private readonly _wrap: (inner: NapeInner) => T;

  /** @internal */
  constructor(inner: NapeInner, wrap: (inner: NapeInner) => T) {
    this._inner = inner;
    this._wrap = wrap;
  }

  /** Number of elements in the list. */
  get length(): number {
    return this._inner.get_length();
  }

  /** Get element at index. */
  at(index: number): T {
    return this._wrap(this._inner.at(index));
  }

  /** Add an element to the list. */
  add(item: T & { _inner: NapeInner }): void {
    this._inner.add(item._inner);
  }

  /** Remove an element from the list. */
  remove(item: T & { _inner: NapeInner }): void {
    this._inner.remove(item._inner);
  }

  /** Check if the list contains an element. */
  has(item: T & { _inner: NapeInner }): boolean {
    return this._inner.has(item._inner);
  }

  /** Remove all elements. */
  clear(): void {
    this._inner.clear();
  }

  /** Whether the list is empty. */
  get empty(): boolean {
    return this._inner.empty();
  }

  /** Push an element to the end. */
  push(item: T & { _inner: NapeInner }): void {
    this._inner.push(item._inner);
  }

  /** Pop the last element. */
  pop(): T {
    return this._wrap(this._inner.pop());
  }

  /** Shift the first element. */
  shift(): T {
    return this._wrap(this._inner.shift());
  }

  /** Unshift an element to the front. */
  unshift(item: T & { _inner: NapeInner }): void {
    this._inner.unshift(item._inner);
  }

  /** Iterate over all elements. */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.length; i++) {
      yield this.at(i);
    }
  }

  /** Convert to a plain array. */
  toArray(): T[] {
    return [...this];
  }

  /** Apply a function to each element. */
  forEach(fn: (item: T, index: number) => void): void {
    for (let i = 0; i < this.length; i++) {
      fn(this.at(i), i);
    }
  }

  toString(): string {
    return this._inner.toString();
  }
}
