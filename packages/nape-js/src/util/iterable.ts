/**
 * Installs the ES iterable protocol on a list (or iterator) prototype.
 *
 * `getIterator` returns the engine iterator to drain for a given list
 * instance; the returned object exposes the classic `hasNext()` / `next()`
 * pair that every nape iterator implements. Shared by the factory-generated
 * lists and the hand-written Vec2List / ContactList / GeomVertexIterator.
 *
 * @internal
 */
export function installIterable(
  proto: any,
  getIterator: (self: any) => { hasNext(): boolean; next(): any },
): void {
  proto[Symbol.iterator] = function (this: any) {
    const it = getIterator(this);
    return {
      next(): IteratorResult<any> {
        if (it.hasNext()) {
          return { value: it.next(), done: false };
        }
        return { value: undefined, done: true };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  };
}
