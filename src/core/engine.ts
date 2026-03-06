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

// Config constants — must run before any physics simulation.
import "../Config";

// Debug utility class.
import "../util/Debug";

// Register typed List + Iterator classes after the compiled code is loaded.
// This must happen here (not just in index.ts) so that any module importing
// getNape() — even without going through the barrel export — gets the lists.
import "../util/registerLists";

// Internal list backing classes — must run after registerLists so the public
// wrapper classes (BodyList, ConstraintList, etc.) are already in nape namespace.
import "../native/util/ZPP_PublicList";

// Special-case lists (Vec2List, ContactList, GeomVertexIterator) that have
// custom behavior not handled by the generic NapeListFactory.
// Public classes must register before ZPP classes reference them.
import "../geom/Vec2List";
import "../dynamics/ContactList";
import "../geom/GeomVertexIterator";
import "../native/util/ZPP_Vec2List";
import "../native/util/ZPP_ContactList";
import "../native/geom/ZPP_GeomVertexIterator";
import "../native/util/ZPP_MixVec2List";

// --- Public API base/standalone classes (self-register at module load time) ---
// Stubs for these classes have been removed from nape-compiled.js.
// NOTE: Subclasses that use `extends` (e.g. BodyCallback extends Callback) CANNOT
// be imported here — doing so creates circular ESM dependencies where the subclass
// evaluates before the base class. Subclasses keep minimal stubs in nape-compiled.js
// and self-register when imported by user code or index.ts.
import "../callbacks/Callback";
import "../callbacks/Listener";
import "../callbacks/OptionType";
import "../callbacks/InteractionType";
import "../callbacks/PreFlag";
import "../constraint/Constraint";
import "../dynamics/Arbiter";
import "../dynamics/Contact";
import "../dynamics/InteractionFilter";
import "../dynamics/InteractionGroup";
import "../geom/AABB";
import "../geom/ConvexResult";
import "../geom/Geom";
import "../geom/GeomPoly";
import "../geom/MarchingSquares";
import "../geom/Mat23";
import "../geom/MatMN";
import "../geom/Ray";
import "../geom/RayResult";
import "../geom/Vec2";
import "../geom/Vec3";
import "../geom/Winding";
import "../phys/Interactor";
// Body/Compound extend Interactor → cannot import here (circular ESM dep)
import "../phys/FluidProperties";
import "../phys/Material";
import "../phys/GravMassMode";
import "../phys/InertiaMode";
import "../phys/MassMode";
// Shape extends Interactor → cannot import here (circular ESM dep)
// Circle/Polygon extend Shape → cannot import here
import "../shape/Edge";
import "../shape/ValidationResult";
import "../space/Broadphase";
import "../space/Space";

// Singleton enum classes — import so they self-register before user code runs.
// Each class calls ensureEnumsReady() after registering; _initEnums runs once
// all 6 classes are available (handles circular-import cycles gracefully).
import "../callbacks/CbEvent";
import "../callbacks/CbType";
import "../callbacks/ListenerType";
import "../dynamics/ArbiterType";
import "../phys/BodyType";
import "../shape/ShapeType";

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
