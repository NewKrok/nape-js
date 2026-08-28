/**
 * ZPP_Flags — Internal enum/flags registry for the nape physics engine.
 *
 * Pure container for singleton flag objects used throughout the engine.
 * These are initialized lazily by the compiled code at runtime.
 *
 * Converted from nape-compiled.js lines 48483–48529.
 */

export class ZPP_Flags {
  // --- Static: Haxe metadata ---

  // --- Gravity mass mode ---
  static GravMassMode_DEFAULT: any = null;
  static GravMassMode_FIXED: any = null;
  static GravMassMode_SCALED: any = null;

  // --- Inertia mode ---
  static InertiaMode_DEFAULT: any = null;
  static InertiaMode_FIXED: any = null;

  // --- Mass mode ---
  static MassMode_DEFAULT: any = null;
  static MassMode_FIXED: any = null;

  // --- Body type ---
  static BodyType_STATIC: any = null;
  static BodyType_DYNAMIC: any = null;
  static BodyType_KINEMATIC: any = null;

  // --- Listener type ---
  static ListenerType_BODY: any = null;
  static ListenerType_CONSTRAINT: any = null;
  static ListenerType_INTERACTION: any = null;
  static ListenerType_PRE: any = null;

  // --- Pre flags ---
  static PreFlag_ACCEPT: any = null;
  static PreFlag_IGNORE: any = null;
  static PreFlag_ACCEPT_ONCE: any = null;
  static PreFlag_IGNORE_ONCE: any = null;

  // --- Callback events ---
  static CbEvent_BEGIN: any = null;
  static CbEvent_ONGOING: any = null;
  static CbEvent_END: any = null;
  static CbEvent_WAKE: any = null;
  static CbEvent_SLEEP: any = null;
  static CbEvent_BREAK: any = null;
  static CbEvent_PRE: any = null;

  // --- Interaction type ---
  static InteractionType_COLLISION: any = null;
  static InteractionType_SENSOR: any = null;
  static InteractionType_FLUID: any = null;
  static InteractionType_ANY: any = null;

  // --- Winding ---
  static Winding_UNDEFINED: any = null;
  static Winding_CLOCKWISE: any = null;
  static Winding_ANTICLOCKWISE: any = null;

  // --- Validation result ---
  static ValidationResult_VALID: any = null;
  static ValidationResult_DEGENERATE: any = null;
  static ValidationResult_CONCAVE: any = null;
  static ValidationResult_SELF_INTERSECTING: any = null;

  // --- Shape type ---
  static ShapeType_CIRCLE: any = null;
  static ShapeType_POLYGON: any = null;
  static ShapeType_CAPSULE: any = null;

  // --- Broadphase ---
  static Broadphase_DYNAMIC_AABB_TREE: any = null;
  static Broadphase_SWEEP_AND_PRUNE: any = null;
  static Broadphase_SPATIAL_HASH: any = null;

  // --- Arbiter type ---
  static ArbiterType_COLLISION: any = null;
  static ArbiterType_SENSOR: any = null;
  static ArbiterType_FLUID: any = null;

  // --- Internal flag ---
  static internal = false;
}
