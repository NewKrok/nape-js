import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Shape, _bindCapsuleWrap } from "./Shape";
import { ShapeType } from "./ShapeType";
import { ZPP_Polygon } from "../native/shape/ZPP_Polygon";
import { ZPP_Material } from "../native/phys/ZPP_Material";
import { ZPP_InteractionFilter } from "../native/dynamics/ZPP_InteractionFilter";
import { Config } from "../Config";
import { CbType } from "../callbacks/CbType";

/**
 * Number of segments per semicircular end-cap.
 * 8 segments = 16 vertices for the full capsule (smooth stadium shape).
 */
const CAP_SEGMENTS = 8;

/**
 * Generate stadium (capsule) polygon vertices in CCW winding order.
 *
 * The shape is centred at the origin. The spine runs along the local X-axis.
 * - Total width  = 2 * (halfLength + radius)
 * - Total height = 2 * radius
 *
 * @returns Array of {x, y} local-space vertices.
 */
function generateStadiumVertices(
  halfLength: number,
  radius: number,
  segments: number = CAP_SEGMENTS,
): Array<{ x: number; y: number }> {
  const verts: Array<{ x: number; y: number }> = [];

  // Right semicircle (center at +halfLength, 0): from -PI/2 to +PI/2
  for (let i = 0; i <= segments; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / segments;
    verts.push({
      x: halfLength + radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  // Left semicircle (center at -halfLength, 0): from +PI/2 to +3*PI/2
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / segments;
    verts.push({
      x: -halfLength + radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  return verts;
}

/**
 * A capsule physics shape — a line segment with a radius (stadium geometry).
 *
 * Internally backed by a convex polygon approximation for robust collision
 * detection. The polygon uses the engine's well-tested SAT narrowphase.
 *
 * - Total width  = 2 * (halfLength + radius)
 * - Total height = 2 * radius
 *
 * @example
 * ```ts
 * const cap = new Capsule(100, 40); // width=100, height=40
 * body.shapes.add(cap);
 * ```
 */
export class Capsule extends Shape {
  /** @internal — The underlying ZPP_Polygon that handles physics. */
  zpp_inner_zn!: ZPP_Polygon;

  /** @internal — Stored capsule radius (half height). */
  private _radius: number;

  /** @internal — Stored half-spine-length. */
  private _halfLength: number;

  /**
   * Create a capsule with the given total width and height.
   *
   * @param width  - Total width (tip to tip). Must be >= height.
   * @param height - Total height (diameter of the end-caps). Must be > 0.
   * @param localCOM - Local centre offset (defaults to origin).
   * @param material - Material to assign (uses default if omitted).
   * @param filter - InteractionFilter to assign (uses default if omitted).
   */
  constructor(
    width: number = 100,
    height: number = 40,
    localCOM?: Vec2,
    material?: Material,
    filter?: InteractionFilter,
  ) {
    super();

    // Validate
    if (width !== width || height !== height) {
      throw new Error("Capsule dimensions cannot be NaN");
    }
    if (height <= 0) {
      throw new Error("Capsule height (" + height + ") must be > 0");
    }
    if (width < height) {
      throw new Error("Capsule width (" + width + ") must be >= height (" + height + ")");
    }

    const radius = height / 2;
    const halfLength = (width - height) / 2;

    this._radius = radius;
    this._halfLength = halfLength;

    // --- Create ZPP_Polygon internally (type=1) ---
    const zpp = new ZPP_Polygon();
    this.zpp_inner_zn = zpp;
    (this as any).zpp_inner = zpp;
    this.zpp_inner_i = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;
    zpp.outer_i = this;

    // _inner = this so Shape-level methods work
    (this as Writable<Capsule>)._inner = this as any;

    // Mark this polygon as a capsule for isCapsule() / castCapsule / debug draw
    (zpp as any)._isCapsule = true;
    (zpp as any)._capsuleRadius = radius;
    (zpp as any)._capsuleHalfLength = halfLength;

    // --- Parse localCOM offset ---
    let comX = 0;
    let comY = 0;
    if (localCOM != null) {
      if ((localCOM as any).zpp_disp) {
        throw new Error("Vec2 has been disposed and cannot be used!");
      }
      const inner = localCOM.zpp_inner;
      if (inner._validate != null) inner._validate();
      comX = inner.x;
      if (inner._validate != null) inner._validate();
      comY = inner.y;
      if (inner.weak) {
        localCOM.dispose();
      }
    }

    // --- Generate stadium polygon vertices (offset by localCOM) ---
    const verts = generateStadiumVertices(halfLength, radius);
    if (zpp.wrap_lverts == null) zpp.getlverts();
    for (const v of verts) {
      const vec = new Vec2(v.x + comX, v.y + comY);
      zpp.wrap_lverts.push(vec);
    }

    // --- Handle material ---
    if (material == null) {
      if (ZPP_Material.zpp_pool != null) {
        zpp.material = ZPP_Material.zpp_pool;
        ZPP_Material.zpp_pool = zpp.material.next;
        zpp.material.next = null;
      } else {
        zpp.material = new ZPP_Material();
      }
    } else {
      zpp.immutable_midstep("Shape::material");
      zpp.setMaterial((material as any).zpp_inner);
      zpp.material.wrapper();
    }

    // --- Handle filter ---
    if (filter == null) {
      if (ZPP_InteractionFilter.zpp_pool != null) {
        zpp.filter = ZPP_InteractionFilter.zpp_pool;
        ZPP_InteractionFilter.zpp_pool = zpp.filter.next;
        zpp.filter.next = null;
      } else {
        zpp.filter = new ZPP_InteractionFilter();
      }
    } else {
      zpp.immutable_midstep("Shape::filter");
      zpp.setFilter((filter as any).zpp_inner);
      zpp.filter.wrapper();
    }

    // --- Register ANY_SHAPE callback type ---
    zpp.insert_cbtype((CbType.ANY_SHAPE as any).zpp_inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Capsule {
    if (!inner) return null as unknown as Capsule;
    if (inner instanceof Capsule) return inner;
    if (inner instanceof ZPP_Polygon && (inner as any)._isCapsule) {
      return getOrCreate(inner, (zpp: ZPP_Polygon) => {
        const c = Object.create(Capsule.prototype) as Capsule;
        c.zpp_inner_zn = zpp;
        (c as any).zpp_inner = zpp;
        c.zpp_inner_i = zpp;
        c._radius = (zpp as any)._capsuleRadius ?? 0;
        c._halfLength = (zpp as any)._capsuleHalfLength ?? 0;
        zpp.outer = c;
        zpp.outer_zn = c;
        zpp.outer_i = c;
        (c as Writable<Capsule>)._inner = c as any;
        return c;
      });
    }
    // Handle compiled objects (has zpp_inner_zn → extract ZPP_Polygon)
    if (inner.zpp_inner_zn) return Capsule._wrap(inner.zpp_inner_zn);
    // Fallback: wrap compiled inner directly
    return getOrCreate(inner, (raw) => {
      const c = Object.create(Capsule.prototype) as Capsule;
      (c as Writable<Capsule>)._inner = raw;
      c.zpp_inner_i = raw.zpp_inner_i;
      c._radius = (raw as any)._capsuleRadius ?? 0;
      c._halfLength = (raw as any)._capsuleHalfLength ?? 0;
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  /** Override type to return CAPSULE (internally backed by polygon). */
  override get type(): ShapeType {
    return ShapeType.CAPSULE;
  }

  /** A capsule is not a plain polygon from the user's perspective. */
  override isPolygon(): boolean {
    return false;
  }

  /** A capsule identifies as capsule. */
  override isCapsule(): boolean {
    return true;
  }

  /** The capsule's end-cap radius (half the height). */
  get radius(): number {
    return (this.zpp_inner_zn as any)._capsuleRadius ?? this._radius;
  }
  set radius(value: number) {
    const zpp = this.zpp_inner_zn;
    (this as any).zpp_inner.immutable_midstep("Capsule::radius");
    if (zpp.body != null && zpp.body.type === 1 && zpp.body.space != null) {
      throw new Error(
        "Error: Cannot modify radius of Capsule contained in static object once added to space",
      );
    }
    if (value !== this._radius) {
      if (value !== value) {
        throw new Error("Capsule::radius cannot be NaN");
      }
      if (value < Config.epsilon) {
        throw new Error("Capsule::radius (" + value + ") must be > Config.epsilon");
      }
      this._radius = value;
      (zpp as any)._capsuleRadius = value;
      this._regenerateVertices();
    }
  }

  /** Half the spine length. Total width = 2 * (halfLength + radius). */
  get halfLength(): number {
    return (this.zpp_inner_zn as any)._capsuleHalfLength ?? this._halfLength;
  }
  set halfLength(value: number) {
    const zpp = this.zpp_inner_zn;
    (this as any).zpp_inner.immutable_midstep("Capsule::halfLength");
    if (zpp.body != null && zpp.body.type === 1 && zpp.body.space != null) {
      throw new Error(
        "Error: Cannot modify halfLength of Capsule contained in static object once added to space",
      );
    }
    if (value !== this._halfLength) {
      if (value !== value) {
        throw new Error("Capsule::halfLength cannot be NaN");
      }
      if (value < 0) {
        throw new Error("Capsule::halfLength (" + value + ") must be >= 0");
      }
      this._halfLength = value;
      (zpp as any)._capsuleHalfLength = value;
      this._regenerateVertices();
    }
  }

  /** @internal — Regenerate polygon vertices after radius/halfLength change. */
  private _regenerateVertices(): void {
    const zpp = this.zpp_inner_zn;

    // Get current localCOM offset from existing vertices centroid
    zpp.validate_localCOM();
    const comX = zpp.localCOMx;
    const comY = zpp.localCOMy;

    // Clear existing vertices
    if (zpp.wrap_lverts == null) zpp.getlverts();
    while (zpp.wrap_lverts.length > 0) {
      zpp.wrap_lverts.pop();
    }

    // Generate new vertices
    const verts = generateStadiumVertices(this._halfLength, this._radius);
    for (const v of verts) {
      const vec = new Vec2(v.x + comX, v.y + comY);
      zpp.wrap_lverts.push(vec);
    }
  }

  /** Total width of the capsule (tip to tip). */
  get width(): number {
    return 2 * (this.halfLength + this.radius);
  }

  /** Total height of the capsule (diameter of end-caps). */
  get height(): number {
    return 2 * this.radius;
  }
}

// ---------------------------------------------------------------------------
// Self-register in the compiled namespace
// ---------------------------------------------------------------------------

// Bind Capsule._wrap into Shape so Shape._wrap can dispatch without circular import.
_bindCapsuleWrap((inner) => Capsule._wrap(inner));

const nape = getNape();
nape.shape.Capsule = Capsule;
