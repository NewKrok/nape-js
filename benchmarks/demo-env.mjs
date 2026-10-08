/**
 * Node environment for running docs/demos headlessly (used by demos.mjs).
 *
 * - Module resolve hooks: the demos import the engine as
 *   `../nape-js.esm.js?v=…` (plus `serialization/` and `replay/` entry points)
 *   and some import renderers from a CDN. Engine imports are mapped onto a
 *   built `dist/` directory; remote imports become empty modules.
 * - Minimal DOM stubs, so demo modules that touch `document` / `window` /
 *   canvas contexts at import or init time can load. Nothing is rendered.
 *
 * Usage (from demos.mjs): `register("./demo-env.mjs", import.meta.url,
 * { data: { dist } })`, then call `installDomStubs()` in the main thread.
 */

let DIST = null;

/** Loader-thread hook: receives the dist directory URL from register(). */
export async function initialize(data) {
  DIST = data.dist;
}

export async function resolve(specifier, context, next) {
  const path = specifier.split("?")[0];
  if (/(^|\/)nape-js\.esm\.js$/.test(path)) {
    return { url: DIST + "index.js", shortCircuit: true };
  }
  if (!path.includes("packages/") && /\/serialization\/index\.js$/.test(path)) {
    return { url: DIST + "serialization/index.js", shortCircuit: true };
  }
  if (!path.includes("packages/") && /\/replay\/index\.js$/.test(path)) {
    return { url: DIST + "replay/index.js", shortCircuit: true };
  }
  if (/^https?:/.test(path)) {
    return { url: "data:text/javascript,export default {};", shortCircuit: true };
  }
  return next(path, context);
}

/** Install DOM stubs on globalThis (main thread). */
export function installDomStubs() {
  const noop = () => {};
  const ctx2d = new Proxy(
    {},
    {
      get: (t, k) => (k === "measureText" ? () => ({ width: 10 }) : k in t ? t[k] : noop),
      set: (t, k, v) => ((t[k] = v), true),
    },
  );
  const element = () =>
    new Proxy(
      {
        style: {},
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        dataset: {},
        children: [],
        getContext: () => ctx2d,
        appendChild: noop,
        addEventListener: noop,
        removeEventListener: noop,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 500 }),
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: noop,
        remove: noop,
        width: 900,
        height: 500,
      },
      { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => ((t[k] = v), true) },
    );
  globalThis.document = {
    createElement: element,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    body: element(),
    documentElement: element(),
    hidden: false,
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = noop;
  globalThis.removeEventListener = noop;
  globalThis.requestAnimationFrame = noop;
  globalThis.cancelAnimationFrame = noop;
  globalThis.Image = class {
    set src(_v) {}
  };
  globalThis.matchMedia = () => ({ matches: false, addEventListener: noop });
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.devicePixelRatio = 1;
  globalThis.innerWidth = 900;
  globalThis.innerHeight = 500;
  return { element };
}
