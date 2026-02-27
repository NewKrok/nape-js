/**
 * WeakMap-based wrapper cache.
 *
 * Maps raw Haxe inner objects → TypeScript wrapper instances so that
 * repeated property access returns the same wrapper object instead
 * of allocating a fresh one every time.
 *
 * @internal
 */
const cache = new WeakMap<object, unknown>();

/**
 * Get or create a cached wrapper for the given raw Haxe object.
 *
 * @param inner  The raw Haxe object to wrap.
 * @param create Factory that builds a new wrapper if one is not cached.
 * @returns The cached (or newly created) wrapper instance.
 *
 * @internal
 */
export function getOrCreate<T>(inner: any, create: (inner: any) => T): T {
  if (!inner) return null as unknown as T;
  let wrapper = cache.get(inner) as T | undefined;
  if (!wrapper) {
    wrapper = create(inner);
    cache.set(inner, wrapper);
  }
  return wrapper;
}

/**
 * Invalidate a cached wrapper (e.g. after disposal).
 * @internal
 */
export function uncache(inner: any): void {
  if (inner) cache.delete(inner);
}
