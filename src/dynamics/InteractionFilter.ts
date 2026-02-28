import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_InteractionFilter } from "../native/dynamics/ZPP_InteractionFilter";
import type { NapeInner } from "../geom/Vec2";

/**
 * Bit-mask based interaction filter for controlling which shapes
 * collide, sense, or interact as fluids.
 *
 * Internally wraps a ZPP_InteractionFilter and is registered as
 * the public `nape.dynamics.InteractionFilter` class in the compiled namespace.
 *
 * Converted from nape-compiled.js lines 14361–14640.
 */
export class InteractionFilter {
  // --- Haxe metadata (required by compiled engine) ---
  static __name__ = ["nape", "dynamics", "InteractionFilter"];

  /** @internal The internal ZPP_InteractionFilter this wrapper owns. */
  zpp_inner: ZPP_InteractionFilter;

  /**
   * Backward-compatible accessor — returns `this` so that compiled engine
   * code that receives `filter._inner` can still access `zpp_inner`.
   * @internal
   */
  get _inner(): NapeInner {
    return this;
  }

  constructor(
    collisionGroup: number = 1,
    collisionMask: number = -1,
    sensorGroup: number = 1,
    sensorMask: number = -1,
    fluidGroup: number = 1,
    fluidMask: number = -1,
  ) {
    // Acquire a ZPP_InteractionFilter from the pool or create a new one
    let zpp: ZPP_InteractionFilter;
    if (ZPP_InteractionFilter.zpp_pool == null) {
      zpp = new ZPP_InteractionFilter();
    } else {
      zpp = ZPP_InteractionFilter.zpp_pool;
      ZPP_InteractionFilter.zpp_pool = zpp.next;
      zpp.next = null;
    }
    this.zpp_inner = zpp;
    zpp.outer = this;

    // --- Validate and set each property (mirrors compiled constructor) ---

    if (zpp.collisionGroup != collisionGroup) {
      zpp.collisionGroup = collisionGroup;
      zpp.invalidate();
    }
    if (zpp.collisionMask != collisionMask) {
      zpp.collisionMask = collisionMask;
      zpp.invalidate();
    }
    if (zpp.sensorGroup != sensorGroup) {
      zpp.sensorGroup = sensorGroup;
      zpp.invalidate();
    }
    if (zpp.sensorMask != sensorMask) {
      zpp.sensorMask = sensorMask;
      zpp.invalidate();
    }
    if (zpp.fluidGroup != fluidGroup) {
      zpp.fluidGroup = fluidGroup;
      zpp.invalidate();
    }
    if (zpp.fluidMask != fluidMask) {
      zpp.fluidMask = fluidMask;
      zpp.invalidate();
    }
  }

  /** @internal Wrap a ZPP_InteractionFilter (or legacy compiled InteractionFilter) with caching. */
  static _wrap(inner: any): InteractionFilter {
    if (inner instanceof InteractionFilter) return inner;
    if (!inner) return null as unknown as InteractionFilter;

    // If this is a ZPP_InteractionFilter, wrap it directly
    if (inner instanceof ZPP_InteractionFilter) {
      return getOrCreate(inner, (zpp: ZPP_InteractionFilter) => {
        const f = Object.create(InteractionFilter.prototype) as InteractionFilter;
        f.zpp_inner = zpp;
        zpp.outer = f;
        return f;
      });
    }

    // Legacy fallback: compiled InteractionFilter with zpp_inner
    if (inner.zpp_inner) {
      return InteractionFilter._wrap(inner.zpp_inner);
    }

    return null as unknown as InteractionFilter;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get collisionGroup(): number {
    return this.zpp_inner.collisionGroup;
  }
  set collisionGroup(value: number) {
    if (this.zpp_inner.collisionGroup != value) {
      this.zpp_inner.collisionGroup = value;
      this.zpp_inner.invalidate();
    }
  }

  get collisionMask(): number {
    return this.zpp_inner.collisionMask;
  }
  set collisionMask(value: number) {
    if (this.zpp_inner.collisionMask != value) {
      this.zpp_inner.collisionMask = value;
      this.zpp_inner.invalidate();
    }
  }

  get sensorGroup(): number {
    return this.zpp_inner.sensorGroup;
  }
  set sensorGroup(value: number) {
    if (this.zpp_inner.sensorGroup != value) {
      this.zpp_inner.sensorGroup = value;
      this.zpp_inner.invalidate();
    }
  }

  get sensorMask(): number {
    return this.zpp_inner.sensorMask;
  }
  set sensorMask(value: number) {
    if (this.zpp_inner.sensorMask != value) {
      this.zpp_inner.sensorMask = value;
      this.zpp_inner.invalidate();
    }
  }

  get fluidGroup(): number {
    return this.zpp_inner.fluidGroup;
  }
  set fluidGroup(value: number) {
    if (this.zpp_inner.fluidGroup != value) {
      this.zpp_inner.fluidGroup = value;
      this.zpp_inner.invalidate();
    }
  }

  get fluidMask(): number {
    return this.zpp_inner.fluidMask;
  }
  set fluidMask(value: number) {
    if (this.zpp_inner.fluidMask != value) {
      this.zpp_inner.fluidMask = value;
      this.zpp_inner.invalidate();
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

  shouldCollide(filter: InteractionFilter): boolean {
    if (filter == null) {
      throw new Error("Error: filter argument cannot be null for shouldCollide");
    }
    return this.zpp_inner.shouldCollide(filter.zpp_inner);
  }

  shouldSense(filter: InteractionFilter): boolean {
    if (filter == null) {
      throw new Error("Error: filter argument cannot be null for shouldSense");
    }
    return this.zpp_inner.shouldSense(filter.zpp_inner);
  }

  shouldFlow(filter: InteractionFilter): boolean {
    if (filter == null) {
      throw new Error("Error: filter argument cannot be null for shouldFlow");
    }
    return this.zpp_inner.shouldFlow(filter.zpp_inner);
  }

  copy(): InteractionFilter {
    return new InteractionFilter(
      this.zpp_inner.collisionGroup,
      this.zpp_inner.collisionMask,
      this.zpp_inner.sensorGroup,
      this.zpp_inner.sensorMask,
      this.zpp_inner.fluidGroup,
      this.zpp_inner.fluidMask,
    );
  }

  toString(): string {
    const hex = (n: number, digits: number): string => {
      let s = "";
      const hexChars = "0123456789ABCDEF";
      let v = n;
      do {
        s = hexChars.charAt(v & 15) + s;
        v >>>= 4;
      } while (v > 0);
      while (s.length < digits) s = "0" + s;
      return s;
    };

    return (
      "{ collision: " +
      hex(this.zpp_inner.collisionGroup, 8) +
      "~" +
      hex(this.zpp_inner.collisionMask, 8) +
      " sensor: " +
      hex(this.zpp_inner.sensorGroup, 8) +
      "~" +
      hex(this.zpp_inner.sensorMask, 8) +
      " fluid: " +
      hex(this.zpp_inner.fluidGroup, 8) +
      "~" +
      hex(this.zpp_inner.fluidMask, 8) +
      " }"
    );
  }
}

// ---------------------------------------------------------------------------
// Register wrapper factory on ZPP_InteractionFilter so wrapper() returns our class
// ---------------------------------------------------------------------------
ZPP_InteractionFilter._wrapFn = (zpp: ZPP_InteractionFilter): InteractionFilter => {
  return getOrCreate(zpp, (raw: ZPP_InteractionFilter) => {
    const f = Object.create(InteractionFilter.prototype) as InteractionFilter;
    f.zpp_inner = raw;
    raw.outer = f;
    return f;
  });
};

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled InteractionFilter)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.dynamics.InteractionFilter = InteractionFilter;
(InteractionFilter.prototype as any).__class__ = InteractionFilter;
