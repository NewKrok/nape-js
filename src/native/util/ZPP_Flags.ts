/**
 * ZPP_Flags — Internal enum/flags registry for the nape physics engine.
 *
 * Pure container for singleton flag objects used throughout the engine.
 * These are initialized lazily by the compiled code at runtime.
 *
 * Converted from nape-compiled.js lines 48483–48529.
 */

type Any = any;

export class ZPP_Flags {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "util", "ZPP_Flags"];

  // --- Gravity mass mode ---
  static GravMassMode_DEFAULT: Any = null;
  static GravMassMode_FIXED: Any = null;
  static GravMassMode_SCALED: Any = null;

  // --- Inertia mode ---
  static InertiaMode_DEFAULT: Any = null;
  static InertiaMode_FIXED: Any = null;

  // --- Mass mode ---
  static MassMode_DEFAULT: Any = null;
  static MassMode_FIXED: Any = null;

  // --- Body type ---
  static BodyType_STATIC: Any = null;
  static BodyType_DYNAMIC: Any = null;
  static BodyType_KINEMATIC: Any = null;

  // --- Listener type ---
  static ListenerType_BODY: Any = null;
  static ListenerType_CONSTRAINT: Any = null;
  static ListenerType_INTERACTION: Any = null;
  static ListenerType_PRE: Any = null;

  // --- Pre flags ---
  static PreFlag_ACCEPT: Any = null;
  static PreFlag_IGNORE: Any = null;
  static PreFlag_ACCEPT_ONCE: Any = null;
  static PreFlag_IGNORE_ONCE: Any = null;

  // --- Callback events ---
  static CbEvent_BEGIN: Any = null;
  static CbEvent_ONGOING: Any = null;
  static CbEvent_END: Any = null;
  static CbEvent_WAKE: Any = null;
  static CbEvent_SLEEP: Any = null;
  static CbEvent_BREAK: Any = null;
  static CbEvent_PRE: Any = null;

  // --- Interaction type ---
  static InteractionType_COLLISION: Any = null;
  static InteractionType_SENSOR: Any = null;
  static InteractionType_FLUID: Any = null;
  static InteractionType_ANY: Any = null;

  // --- Winding ---
  static Winding_UNDEFINED: Any = null;
  static Winding_CLOCKWISE: Any = null;
  static Winding_ANTICLOCKWISE: Any = null;

  // --- Validation result ---
  static ValidationResult_VALID: Any = null;
  static ValidationResult_DEGENERATE: Any = null;
  static ValidationResult_CONCAVE: Any = null;
  static ValidationResult_SELF_INTERSECTING: Any = null;

  // --- Shape type ---
  static ShapeType_CIRCLE: Any = null;
  static ShapeType_POLYGON: Any = null;

  // --- Broadphase ---
  static Broadphase_DYNAMIC_AABB_TREE: Any = null;
  static Broadphase_SWEEP_AND_PRUNE: Any = null;

  // --- Arbiter type ---
  static ArbiterType_COLLISION: Any = null;
  static ArbiterType_SENSOR: Any = null;
  static ArbiterType_FLUID: Any = null;

  // --- Internal flag ---
  static internal = false;

  // --- ID constants (numeric bitmasks / enum ordinals) ---
  static id_ImmState_ACCEPT = 1;
  static id_ImmState_IGNORE = 2;
  static id_ImmState_ALWAYS = 4;
  static id_GravMassMode_DEFAULT = 0;
  static id_GravMassMode_FIXED = 1;
  static id_GravMassMode_SCALED = 2;
  static id_InertiaMode_DEFAULT = 0;
  static id_InertiaMode_FIXED = 1;
  static id_MassMode_DEFAULT = 0;
  static id_MassMode_FIXED = 1;
  static id_BodyType_STATIC = 1;
  static id_BodyType_DYNAMIC = 2;
  static id_BodyType_KINEMATIC = 3;
  static id_ListenerType_BODY = 0;
  static id_ListenerType_CONSTRAINT = 1;
  static id_ListenerType_INTERACTION = 2;
  static id_ListenerType_PRE = 3;
  static id_PreFlag_ACCEPT = 1;
  static id_PreFlag_IGNORE = 2;
  static id_PreFlag_ACCEPT_ONCE = 3;
  static id_PreFlag_IGNORE_ONCE = 4;
  static id_CbEvent_BEGIN = 0;
  static id_CbEvent_END = 1;
  static id_CbEvent_WAKE = 2;
  static id_CbEvent_SLEEP = 3;
  static id_CbEvent_BREAK = 4;
  static id_CbEvent_PRE = 5;
  static id_CbEvent_ONGOING = 6;
  static id_InteractionType_COLLISION = 1;
  static id_InteractionType_SENSOR = 2;
  static id_InteractionType_FLUID = 4;
  static id_InteractionType_ANY = 7;
  static id_Winding_UNDEFINED = 0;
  static id_Winding_CLOCKWISE = 1;
  static id_Winding_ANTICLOCKWISE = 2;
  static id_ValidationResult_VALID = 0;
  static id_ValidationResult_DEGENERATE = 1;
  static id_ValidationResult_CONCAVE = 2;
  static id_ValidationResult_SELF_INTERSECTING = 3;
  static id_ShapeType_CIRCLE = 0;
  static id_ShapeType_POLYGON = 1;
  static id_Broadphase_DYNAMIC_AABB_TREE = 0;
  static id_Broadphase_SWEEP_AND_PRUNE = 1;
  static id_ArbiterType_COLLISION = 1;
  static id_ArbiterType_SENSOR = 2;
  static id_ArbiterType_FLUID = 4;

  __class__: Any = ZPP_Flags;
}
