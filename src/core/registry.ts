/**
 * Internal wrapper registry — resolves circular dependencies between
 * wrapper classes (e.g., Body needs Space, Shape needs Body).
 *
 * Each module registers its `_wrap` function at load time, so any other
 * module can look it up without importing directly.
 *
 * @internal
 */

type WrapFn = (inner: any) => any;

const registry = new Map<string, WrapFn>();

/** Register a wrapper class's _wrap function. */
export function registerWrapper(name: string, wrapFn: WrapFn): void {
  registry.set(name, wrapFn);
}

/** Look up and call a registered _wrap function. */
export function wrapWith(name: string, inner: any): any {
  if (!inner) return null;
  const fn = registry.get(name);
  if (!fn) throw new Error(`Wrapper not registered: ${name}`);
  return fn(inner);
}
