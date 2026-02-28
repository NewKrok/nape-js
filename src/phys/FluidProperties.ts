import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_FluidProperties } from "../native/phys/ZPP_FluidProperties";
import type { NapeInner } from "../geom/Vec2";

/**
 * Fluid properties for shapes that act as fluid regions.
 *
 * Controls density, viscosity, and per-fluid gravity override.
 * Internally wraps a ZPP_FluidProperties and is registered as
 * the public `nape.phys.FluidProperties` class in the compiled namespace.
 *
 * Converted from nape-compiled.js lines 37002–37511.
 */
export class FluidProperties {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "phys", "FluidProperties"];

  /** @internal The internal ZPP_FluidProperties this wrapper owns. */
  zpp_inner: ZPP_FluidProperties;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `fluidProps._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

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
        throw new Error("Error: FluidProperties::density cannot be NaN");
      }
      zpp.density = density / 1000;
      zpp.invalidate();
    }

    // --- Validate and set viscosity ---
    if (viscosity != zpp.viscosity) {
      if (viscosity !== viscosity) {
        throw new Error("Error: FluidProperties::viscosity cannot be NaN");
      }
      if (viscosity < 0) {
        throw new Error(
          "Error: FluidProperties::viscosity (" + viscosity + ") must be >= 0",
        );
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

    // Legacy fallback: compiled FluidProperties with zpp_inner
    if (inner.zpp_inner) {
      return FluidProperties._wrap(inner.zpp_inner);
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
        throw new Error("Error: FluidProperties::density cannot be NaN");
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
        throw new Error("Error: FluidProperties::viscosity cannot be NaN");
      }
      if (value < 0) {
        throw new Error(
          "Error: FluidProperties::viscosity (" + value + ") must be >= 0",
        );
      }
      this.zpp_inner.viscosity = value / 1;
      this.zpp_inner.invalidate();
    }
  }

  get gravity(): any {
    return this.zpp_inner.wrap_gravity;
  }
  set gravity(gravity: any) {
    const napeNs = getNape();
    const zpp_nape = napeNs.zpp_nape;

    if (gravity == null) {
      // Dispose existing gravity Vec2
      if (this.zpp_inner.wrap_gravity != null) {
        this.zpp_inner.wrap_gravity.zpp_inner._inuse = false;
        const _this = this.zpp_inner.wrap_gravity;
        if (_this != null && _this.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this1 = _this.zpp_inner;
        if (_this1._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this1._isimmutable != null) {
          _this1._isimmutable();
        }
        if (_this.zpp_inner._inuse) {
          throw new Error("Error: This Vec2 is not disposable");
        }
        const inner = _this.zpp_inner;
        _this.zpp_inner.outer = null;
        _this.zpp_inner = null;
        const o = _this;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        const o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
        this.zpp_inner.wrap_gravity = null;
      }
    } else {
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      if (this.zpp_inner.wrap_gravity == null) {
        this.zpp_inner.getgravity();
      }
      const _this2 = this.zpp_inner.wrap_gravity;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this3 = _this2.zpp_inner;
      if (_this3._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this3._isimmutable != null) {
        _this3._isimmutable();
      }
      if (gravity == null) {
        throw new Error("Error: Cannot assign null Vec2");
      }
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this4 = gravity.zpp_inner;
      if (_this4._validate != null) {
        _this4._validate();
      }
      const x = gravity.zpp_inner.x;
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this5 = gravity.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      const y = gravity.zpp_inner.y;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this6 = _this2.zpp_inner;
      if (_this6._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this6._isimmutable != null) {
        _this6._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this7 = _this2.zpp_inner;
      if (_this7._validate != null) {
        _this7._validate();
      }
      if (_this2.zpp_inner.x == x) {
        if (_this2 != null && _this2.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this8 = _this2.zpp_inner;
        if (_this8._validate != null) {
          _this8._validate();
        }
        tmp = _this2.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        _this2.zpp_inner.x = x;
        _this2.zpp_inner.y = y;
        const _this9 = _this2.zpp_inner;
        if (_this9._invalidate != null) {
          _this9._invalidate(_this9);
        }
      }
      if (gravity.zpp_inner.weak) {
        if (gravity != null && gravity.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this10 = gravity.zpp_inner;
        if (_this10._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this10._isimmutable != null) {
          _this10._isimmutable();
        }
        if (gravity.zpp_inner._inuse) {
          throw new Error("Error: This Vec2 is not disposable");
        }
        const inner1 = gravity.zpp_inner;
        gravity.zpp_inner.outer = null;
        gravity.zpp_inner = null;
        const o2 = gravity;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        const o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
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
      const nape = getNape();
      this.zpp_inner.wrap_shapes = nape.zpp_nape.util.ZPP_ShapeList.get(
        this.zpp_inner.shapes,
        true,
      );
    }
    return this.zpp_inner.wrap_shapes;
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  copy(): FluidProperties {
    const napeNs = getNape();
    const zpp_nape = napeNs.zpp_nape;

    const ret = new FluidProperties(
      this.zpp_inner.density * 1000,
      this.zpp_inner.viscosity,
    );

    if (this.zpp_inner.userData != null) {
      ret.zpp_inner.userData = { ...this.zpp_inner.userData };
    }

    const gravity = this.zpp_inner.wrap_gravity;
    if (gravity == null) {
      // No gravity set on source — dispose any gravity on the copy
      if (ret.zpp_inner.wrap_gravity != null) {
        ret.zpp_inner.wrap_gravity.zpp_inner._inuse = false;
        const _this = ret.zpp_inner.wrap_gravity;
        if (_this != null && _this.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this1 = _this.zpp_inner;
        if (_this1._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this1._isimmutable != null) {
          _this1._isimmutable();
        }
        if (_this.zpp_inner._inuse) {
          throw new Error("Error: This Vec2 is not disposable");
        }
        const inner = _this.zpp_inner;
        _this.zpp_inner.outer = null;
        _this.zpp_inner = null;
        const o = _this;
        o.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o;
        o.zpp_disp = true;
        const o1 = inner;
        if (o1.outer != null) {
          o1.outer.zpp_inner = null;
          o1.outer = null;
        }
        o1._isimmutable = null;
        o1._validate = null;
        o1._invalidate = null;
        o1.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o1;
        ret.zpp_inner.wrap_gravity = null;
      }
    } else {
      // Copy gravity from source
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      if (ret.zpp_inner.wrap_gravity == null) {
        ret.zpp_inner.getgravity();
      }
      const _this2 = ret.zpp_inner.wrap_gravity;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this3 = _this2.zpp_inner;
      if (_this3._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this3._isimmutable != null) {
        _this3._isimmutable();
      }
      if (gravity == null) {
        throw new Error("Error: Cannot assign null Vec2");
      }
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this4 = gravity.zpp_inner;
      if (_this4._validate != null) {
        _this4._validate();
      }
      const x = gravity.zpp_inner.x;
      if (gravity != null && gravity.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this5 = gravity.zpp_inner;
      if (_this5._validate != null) {
        _this5._validate();
      }
      const y = gravity.zpp_inner.y;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this6 = _this2.zpp_inner;
      if (_this6._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this6._isimmutable != null) {
        _this6._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp;
      if (_this2 != null && _this2.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this7 = _this2.zpp_inner;
      if (_this7._validate != null) {
        _this7._validate();
      }
      if (_this2.zpp_inner.x == x) {
        if (_this2 != null && _this2.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this8 = _this2.zpp_inner;
        if (_this8._validate != null) {
          _this8._validate();
        }
        tmp = _this2.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        _this2.zpp_inner.x = x;
        _this2.zpp_inner.y = y;
        const _this9 = _this2.zpp_inner;
        if (_this9._invalidate != null) {
          _this9._invalidate(_this9);
        }
      }
      if (gravity.zpp_inner.weak) {
        if (gravity != null && gravity.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this10 = gravity.zpp_inner;
        if (_this10._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this10._isimmutable != null) {
          _this10._isimmutable();
        }
        if (gravity.zpp_inner._inuse) {
          throw new Error("Error: This Vec2 is not disposable");
        }
        const inner1 = gravity.zpp_inner;
        gravity.zpp_inner.outer = null;
        gravity.zpp_inner = null;
        const o2 = gravity;
        o2.zpp_pool = null;
        if (zpp_nape.util.ZPP_PubPool.nextVec2 != null) {
          zpp_nape.util.ZPP_PubPool.nextVec2.zpp_pool = o2;
        } else {
          zpp_nape.util.ZPP_PubPool.poolVec2 = o2;
        }
        zpp_nape.util.ZPP_PubPool.nextVec2 = o2;
        o2.zpp_disp = true;
        const o3 = inner1;
        if (o3.outer != null) {
          o3.outer.zpp_inner = null;
          o3.outer = null;
        }
        o3._isimmutable = null;
        o3._validate = null;
        o3._invalidate = null;
        o3.next = zpp_nape.geom.ZPP_Vec2.zpp_pool;
        zpp_nape.geom.ZPP_Vec2.zpp_pool = o3;
      }
    }
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
// Register this class in the compiled namespace (replaces compiled FluidProperties)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.phys.FluidProperties = FluidProperties;
(FluidProperties.prototype as any).__class__ = FluidProperties;
