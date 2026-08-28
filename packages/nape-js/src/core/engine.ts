/**
 * Core engine module — owns the mutable nape namespace object.
 *
 * getNape() returns a bare namespace skeleton; classes register themselves
 * into it (module bottoms + core/bootstrap.ts, which also invokes
 * registerZPPClasses). engine.ts deliberately imports nothing, so importing
 * any single engine module no longer drags the whole ZPP class graph in.
 */

// var (not let/const) avoids temporal dead zone when getNape() is called during
// ESM circular-import resolution (e.g. enum classes call getNape() at module load).
// eslint-disable-next-line no-var
var napeNamespace: any;

/**
 * Returns the internal nape namespace object.
 *
 * Lazily creates the empty skeleton on first call so that side-effect imports
 * that call getNape() during ESM module evaluation always succeed. The ZPP
 * class graph is registered into it by core/bootstrap.ts.
 *
 * @internal
 */
export function getNape(): any {
  if (!napeNamespace) {
    const zpp: any = {
      callbacks: {},
      constraint: {},
      dynamics: {},
      geom: {},
      phys: {},
      shape: {},
      space: {},
      util: {},
    };
    napeNamespace = {
      callbacks: {},
      constraint: {},
      dynamics: {},
      geom: {},
      phys: {},
      shape: {},
      space: {},
      util: {},
      __zpp: zpp,
    };
  }
  return napeNamespace;
}
