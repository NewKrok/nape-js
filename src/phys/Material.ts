import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_Material } from "../native/phys/ZPP_Material";
import type { NapeInner } from "../geom/Vec2";

/**
 * Physical material properties applied to shapes.
 *
 * Controls elasticity (bounciness), friction coefficients, density, and
 * rolling friction.  Internally wraps a ZPP_Material and is registered as
 * the public `nape.phys.Material` class in the compiled namespace.
 *
 * Converted from nape-compiled.js lines 38254–38573.
 */
export class Material {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "phys", "Material"];

  /** @internal The internal ZPP_Material this wrapper owns. */
  zpp_inner: ZPP_Material;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `material._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

  constructor(
    elasticity: number = 0.0,
    dynamicFriction: number = 1.0,
    staticFriction: number = 2.0,
    density: number = 1.0,
    rollingFriction: number = 0.001,
  ) {
    // Acquire a ZPP_Material from the pool or create a new one
    let zpp: ZPP_Material;
    if (ZPP_Material.zpp_pool == null) {
      zpp = new ZPP_Material();
    } else {
      zpp = ZPP_Material.zpp_pool;
      ZPP_Material.zpp_pool = zpp.next;
      zpp.next = null;
    }
    this.zpp_inner = zpp;
    zpp.outer = this;

    // --- Validate and set each property (mirrors compiled constructor) ---

    if (elasticity !== zpp.elasticity) {
      if (elasticity !== elasticity) {
        throw new Error("Error: Material::elasticity cannot be NaN");
      }
      zpp.elasticity = elasticity;
      zpp.invalidate(ZPP_Material.WAKE | ZPP_Material.ARBITERS);
    }

    if (dynamicFriction !== zpp.dynamicFriction) {
      if (dynamicFriction !== dynamicFriction) {
        throw new Error("Error: Material::dynamicFriction cannot be NaN");
      }
      if (dynamicFriction < 0) {
        throw new Error("Error: Material::dynamicFriction cannot be negative");
      }
      zpp.dynamicFriction = dynamicFriction;
      zpp.invalidate(
        ZPP_Material.WAKE | ZPP_Material.ANGDRAG | ZPP_Material.ARBITERS,
      );
    }

    if (staticFriction !== zpp.staticFriction) {
      if (staticFriction !== staticFriction) {
        throw new Error("Error: Material::staticFriction cannot be NaN");
      }
      if (staticFriction < 0) {
        throw new Error("Error: Material::staticFriction cannot be negative");
      }
      zpp.staticFriction = staticFriction;
      zpp.invalidate(ZPP_Material.WAKE | ZPP_Material.ARBITERS);
    }

    if (density !== zpp.density * 1000) {
      if (density !== density) {
        throw new Error("Error: Material::density cannot be NaN");
      }
      if (density < 0) {
        throw new Error("Error: Material::density must be positive");
      }
      zpp.density = density / 1000;
      zpp.invalidate(ZPP_Material.WAKE | ZPP_Material.PROPS);
    }

    if (rollingFriction !== zpp.rollingFriction) {
      if (rollingFriction !== rollingFriction) {
        throw new Error("Error: Material::rollingFriction cannot be NaN");
      }
      if (rollingFriction < 0) {
        throw new Error("Error: Material::rollingFriction cannot be negative");
      }
      zpp.rollingFriction = rollingFriction;
      zpp.invalidate(ZPP_Material.WAKE | ZPP_Material.ARBITERS);
    }
  }

  /** @internal Wrap a ZPP_Material (or legacy compiled Material) with caching. */
  static _wrap(inner: any): Material {
    if (inner instanceof Material) return inner;
    if (!inner) return null as unknown as Material;

    // If this is a ZPP_Material, wrap it directly
    if (inner instanceof ZPP_Material) {
      return getOrCreate(inner, (zpp: ZPP_Material) => {
        const m = Object.create(Material.prototype) as Material;
        m.zpp_inner = zpp;
        zpp.outer = m;
        return m;
      });
    }

    // Legacy fallback: compiled Material with zpp_inner
    if (inner.zpp_inner) {
      return Material._wrap(inner.zpp_inner);
    }

    return null as unknown as Material;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get elasticity(): number {
    return this.zpp_inner.elasticity;
  }
  set elasticity(value: number) {
    if (value !== this.zpp_inner.elasticity) {
      if (value !== value) {
        throw new Error("Error: Material::elasticity cannot be NaN");
      }
      this.zpp_inner.elasticity = value;
      this.zpp_inner.invalidate(ZPP_Material.WAKE | ZPP_Material.ARBITERS);
    }
  }

  get dynamicFriction(): number {
    return this.zpp_inner.dynamicFriction;
  }
  set dynamicFriction(value: number) {
    if (value !== this.zpp_inner.dynamicFriction) {
      if (value !== value) {
        throw new Error("Error: Material::dynamicFriction cannot be NaN");
      }
      if (value < 0) {
        throw new Error("Error: Material::dynamicFriction cannot be negative");
      }
      this.zpp_inner.dynamicFriction = value;
      this.zpp_inner.invalidate(
        ZPP_Material.WAKE | ZPP_Material.ANGDRAG | ZPP_Material.ARBITERS,
      );
    }
  }

  get staticFriction(): number {
    return this.zpp_inner.staticFriction;
  }
  set staticFriction(value: number) {
    if (value !== this.zpp_inner.staticFriction) {
      if (value !== value) {
        throw new Error("Error: Material::staticFriction cannot be NaN");
      }
      if (value < 0) {
        throw new Error("Error: Material::staticFriction cannot be negative");
      }
      this.zpp_inner.staticFriction = value;
      this.zpp_inner.invalidate(ZPP_Material.WAKE | ZPP_Material.ARBITERS);
    }
  }

  get density(): number {
    return this.zpp_inner.density * 1000;
  }
  set density(value: number) {
    if (value !== this.zpp_inner.density * 1000) {
      if (value !== value) {
        throw new Error("Error: Material::density cannot be NaN");
      }
      if (value < 0) {
        throw new Error("Error: Material::density must be positive");
      }
      this.zpp_inner.density = value / 1000;
      this.zpp_inner.invalidate(ZPP_Material.WAKE | ZPP_Material.PROPS);
    }
  }

  get rollingFriction(): number {
    return this.zpp_inner.rollingFriction;
  }
  set rollingFriction(value: number) {
    if (value !== this.zpp_inner.rollingFriction) {
      if (value !== value) {
        throw new Error("Error: Material::rollingFriction cannot be NaN");
      }
      if (value < 0) {
        throw new Error("Error: Material::rollingFriction cannot be negative");
      }
      this.zpp_inner.rollingFriction = value;
      this.zpp_inner.invalidate(ZPP_Material.WAKE | ZPP_Material.ARBITERS);
    }
  }

  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  copy(): Material {
    const ret = new Material(
      this.zpp_inner.elasticity,
      this.zpp_inner.dynamicFriction,
      this.zpp_inner.staticFriction,
      this.zpp_inner.density * 1000,
      this.zpp_inner.rollingFriction,
    );
    if (this.zpp_inner.userData != null) {
      ret.zpp_inner.userData = { ...this.zpp_inner.userData };
    }
    return ret;
  }

  toString(): string {
    return (
      "{ elasticity: " +
      this.zpp_inner.elasticity +
      " dynamicFriction: " +
      this.zpp_inner.dynamicFriction +
      " staticFriction: " +
      this.zpp_inner.staticFriction +
      " density: " +
      this.zpp_inner.density * 1000 +
      " rollingFriction: " +
      this.zpp_inner.rollingFriction +
      " }"
    );
  }

  // ---------------------------------------------------------------------------
  // Static preset factories
  // ---------------------------------------------------------------------------

  static wood(): Material {
    return new Material(0.4, 0.2, 0.38, 0.7, 0.005);
  }

  static steel(): Material {
    return new Material(0.2, 0.57, 0.74, 7.8, 0.001);
  }

  static ice(): Material {
    return new Material(0.3, 0.03, 0.1, 0.9, 0.0001);
  }

  static rubber(): Material {
    return new Material(0.8, 1.0, 1.4, 1.5, 0.01);
  }

  static glass(): Material {
    return new Material(0.4, 0.4, 0.94, 2.6, 0.002);
  }

  static sand(): Material {
    return new Material(-1.0, 0.45, 0.6, 1.6, 16.0);
  }
}

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_Material so wrapper() returns our Material
// ---------------------------------------------------------------------------
ZPP_Material._wrapFn = (zpp: ZPP_Material): Material => {
  return getOrCreate(zpp, (raw: ZPP_Material) => {
    const m = Object.create(Material.prototype) as Material;
    m.zpp_inner = raw;
    raw.outer = m;
    return m;
  });
};

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled Material)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.phys.Material = Material;
(Material.prototype as any).__class__ = Material;
