import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_FluidProperties } from "../native/phys/ZPP_FluidProperties";
import { ZPP_ShapeList } from "../native/util/ZPP_PublicList";

/**
 * Fluid properties for shapes that act as fluid regions.
 *
 * Controls density, viscosity, and per-fluid gravity override.
 * Internally wraps a ZPP_FluidProperties and is registered as
 * the public `nape.phys.FluidProperties` class in the nape namespace.
 */
export class FluidProperties {
  /** @internal The internal ZPP_FluidProperties this wrapper owns. */
  zpp_inner: ZPP_FluidProperties;

  constructor(density: number = 1, viscosity: number = 1) {
    // Acquire a ZPP_FluidProperties from the pool or create a new one
    let zpp: ZPP_FluidProperties;
    if (ZPP_FluidProperties.zpp_pool == null) {
      zpp = new ZPP_FluidProperties();
    } else {
      zpp = ZPP_FluidProperties.zpp_pool;
      ZPP_FluidProperties.zpp_pool = zpp.next;
      zpp.next = null;
    }
    this.zpp_inner = zpp;
    zpp.outer = this;

    // --- Validate and set density (internal storage = value / 1000) ---
    if (density != zpp.density * 1000) {
      if (density !== density) {
        throw new Error("FluidProperties::density cannot be NaN");
      }
      zpp.density = density / 1000;
      zpp.invalidate();
    }

    // --- Validate and set viscosity ---
    if (viscosity != zpp.viscosity) {
      if (viscosity !== viscosity) {
        throw new Error("FluidProperties::viscosity cannot be NaN");
      }
      if (viscosity < 0) {
        throw new Error("FluidProperties::viscosity (" + viscosity + ") must be >= 0");
      }
      zpp.viscosity = viscosity / 1;
      zpp.invalidate();
    }
  }

  /** @internal Wrap a ZPP_FluidProperties (or legacy compiled FluidProperties) with caching. */
  static _wrap(inner: any): FluidProperties {
    if (inner instanceof FluidProperties) return inner;
    if (!inner) return null as unknown as FluidProperties;

    // If this is a ZPP_FluidProperties, wrap it directly
    if (inner instanceof ZPP_FluidProperties) {
      return getOrCreate(inner, (zpp: ZPP_FluidProperties) => {
        const f = Object.create(FluidProperties.prototype) as FluidProperties;
        f.zpp_inner = zpp;
        zpp.outer = f;
        return f;
      });
    }

    return null as unknown as FluidProperties;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get density(): number {
    return this.zpp_inner.density * 1000;
  }
  set density(value: number) {
    if (value != this.zpp_inner.density * 1000) {
      if (value !== value) {
        throw new Error("FluidProperties::density cannot be NaN");
      }
      this.zpp_inner.density = value / 1000;
      this.zpp_inner.invalidate();
    }
  }

  get viscosity(): number {
    return this.zpp_inner.viscosity;
  }
  set viscosity(value: number) {
    if (value != this.zpp_inner.viscosity) {
      if (value !== value) {
        throw new Error("FluidProperties::viscosity cannot be NaN");
      }
      if (value < 0) {
        throw new Error("FluidProperties::viscosity (" + value + ") must be >= 0");
      }
      this.zpp_inner.viscosity = value / 1;
      this.zpp_inner.invalidate();
    }
  }

  get gravity(): any {
    return this.zpp_inner.wrap_gravity;
  }
  set gravity(gravity: any) {
    if (gravity == null) {
      const old = this.zpp_inner.wrap_gravity;
      if (old != null) {
        old.zpp_inner._inuse = false;
        old.dispose();
        this.zpp_inner.wrap_gravity = null;
      }
    } else {
      if (gravity.zpp_disp) {
        throw new Error("Vec2 has been disposed and cannot be used!");
      }
      if (this.zpp_inner.wrap_gravity == null) {
        this.zpp_inner.getgravity();
      }
      // Copies the components and disposes `gravity` if it is weak.
      this.zpp_inner.wrap_gravity.set(gravity);
    }
  }

  get userData(): Record<string, unknown> {
    if (this.zpp_inner.userData == null) {
      this.zpp_inner.userData = {};
    }
    return this.zpp_inner.userData;
  }

  get shapes(): any {
    if (this.zpp_inner.wrap_shapes == null) {
      this.zpp_inner.wrap_shapes = ZPP_ShapeList.get(this.zpp_inner.shapes, true);
    }
    return this.zpp_inner.wrap_shapes;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  copy(): FluidProperties {
    const ret = new FluidProperties(this.zpp_inner.density * 1000, this.zpp_inner.viscosity);
    if (this.zpp_inner.userData != null) {
      ret.zpp_inner.userData = { ...this.zpp_inner.userData };
    }
    ret.gravity = this.zpp_inner.wrap_gravity;
    return ret;
  }

  toString(): string {
    return (
      "{ density: " +
      this.zpp_inner.density * 1000 +
      " viscosity: " +
      this.zpp_inner.viscosity +
      " gravity: " +
      String(this.zpp_inner.wrap_gravity) +
      " }"
    );
  }
}

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_FluidProperties so wrapper() returns our class
// ---------------------------------------------------------------------------
ZPP_FluidProperties._wrapFn = (zpp: ZPP_FluidProperties): FluidProperties => {
  return getOrCreate(zpp, (raw: ZPP_FluidProperties) => {
    const f = Object.create(FluidProperties.prototype) as FluidProperties;
    f.zpp_inner = raw;
    raw.outer = f;
    return f;
  });
};

// ---------------------------------------------------------------------------
// Register this class in the nape namespace (replaces compiled FluidProperties)
// ---------------------------------------------------------------------------
const _napeFluid = getNape();
_napeFluid.phys.FluidProperties = FluidProperties;
