/**
 * Core engine module — manages access to the nape namespace.
 *
 * Priority 20: nape-compiled.js has been fully eliminated. The nape namespace
 * is now built entirely in TypeScript via registerZPPClasses() in ZPPRegistry.ts.
 */

import { registerZPPClasses } from "../native/util/ZPPRegistry";

// var (not let/const) avoids temporal dead zone when getNape() is called during
// ESM circular-import resolution (e.g. Config.ts calls getNape() at module load).
// eslint-disable-next-line no-var
var napeNamespace: any;

/**
 * Returns the internal nape namespace object.
 *
 * Lazily initializes on first call so that side-effect imports (Config, Listener,
 * etc.) that call getNape() during ESM module evaluation always succeed, even
 * before the engine.ts module body has fully executed.
 *
 * @internal
 */
export function getNape(): any {
  if (!napeNamespace) napeNamespace = registerZPPClasses();
  return napeNamespace;
}

// Deferred singleton enum initialization — called by each enum class after
// self-registering.  Runs _initEnums only when all 6 constructors exist.
// eslint-disable-next-line no-var
var _enumsReady = false;
export function ensureEnumsReady(): void {
  if (_enumsReady) return;
  const n = napeNamespace;
  if (
    !n?.callbacks?.CbEvent ||
    !n?.callbacks?.CbType ||
    !n?.callbacks?.ListenerType ||
    !n?.dynamics?.ArbiterType ||
    !n?.phys?.BodyType ||
    !n?.shape?.ShapeType
  ) {
    return; // Not all enum classes registered yet — will retry when the last one loads.
  }
  _enumsReady = true;
  const _z = n.__zpp;
  _z.callbacks.ZPP_CbType._initEnums(n);
  _z.callbacks.ZPP_Listener._initEnums(n, _z.util.ZPP_Flags);
  _z.dynamics.ZPP_Arbiter._initEnums(n, _z.util.ZPP_Flags);
  _z.phys.ZPP_Body._initEnums(n, _z.util.ZPP_Flags);
  _z.shape.ZPP_Shape._initEnums(n, _z.util.ZPP_Flags);
}
