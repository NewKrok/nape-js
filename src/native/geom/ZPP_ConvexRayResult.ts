/**
 * ZPP_ConvexRayResult — Internal result object for ray-cast and convex-cast queries.
 *
 * Serves as the shared internal type for both RayResult and ConvexResult public wrappers.
 * Uses separate pools for ray results vs convex results.
 *
 * Converted from nape-compiled.js lines 38897–39076, 86860–86862.
 */

import { ZPP_Vec2 } from "./ZPP_Vec2";
import { ZPP_PubPool } from "../util/ZPP_PubPool";

type Any = any;

export class ZPP_ConvexRayResult {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "geom", "ZPP_ConvexRayResult"];

  // --- Static: object pools ---
  static rayPool: ZPP_ConvexRayResult | null = null;
  static convexPool: ZPP_ConvexRayResult | null = null;

  // --- Static: internal creation gate ---
  static internal = false;

  // --- Static: wrapper factory callbacks (set by RayResult / ConvexResult at module load) ---
  static _createRayResult: (() => Any) | null = null;
  static _createConvexResult: (() => Any) | null = null;

  // --- Instance fields ---
  normal: Any = null;
  shape: Any = null;
  convex: Any = null; // back-reference to ConvexResult wrapper (or null for ray)
  position: Any = null;
  ray: Any = null; // back-reference to RayResult wrapper (or null for convex)
  inner = false;
  next: ZPP_ConvexRayResult | null = null;
  toiDistance = 0.0;

  // --- Instance: Haxe class reference ---
  __class__: Any = ZPP_ConvexRayResult;

  // ---------------------------------------------------------------------------
  // Static factory: getRay
  // ---------------------------------------------------------------------------

  static getRay(normal: Any, time: number, inner: boolean, shape: Any): Any {
    let ret: Any;
    if (ZPP_ConvexRayResult.rayPool == null) {
      ZPP_ConvexRayResult.internal = true;
      ret = ZPP_ConvexRayResult._createRayResult!();
      ret.zpp_inner = new ZPP_ConvexRayResult();
      ret.zpp_inner.ray = ret;
      ZPP_ConvexRayResult.internal = false;
    } else {
      ret = ZPP_ConvexRayResult.rayPool.ray;
      ZPP_ConvexRayResult.rayPool = ZPP_ConvexRayResult.rayPool.next;
      ret.zpp_inner.next = null;
    }
    const zinner: ZPP_ConvexRayResult = ret.zpp_inner;
    zinner.normal = normal;
    normal.zpp_inner._immutable = true;
    zinner.toiDistance = time;
    zinner.inner = inner;
    zinner.shape = shape;
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Static factory: getConvex
  // ---------------------------------------------------------------------------

  static getConvex(normal: Any, position: Any, toiDistance: number, shape: Any): Any {
    let ret: Any;
    if (ZPP_ConvexRayResult.convexPool == null) {
      ZPP_ConvexRayResult.internal = true;
      ret = ZPP_ConvexRayResult._createConvexResult!();
      ret.zpp_inner = new ZPP_ConvexRayResult();
      ret.zpp_inner.convex = ret;
      ZPP_ConvexRayResult.internal = false;
    } else {
      ret = ZPP_ConvexRayResult.convexPool.convex;
      ZPP_ConvexRayResult.convexPool = ZPP_ConvexRayResult.convexPool.next;
      ret.zpp_inner.next = null;
    }
    const zinner: ZPP_ConvexRayResult = ret.zpp_inner;
    zinner.normal = normal;
    zinner.position = position;
    normal.zpp_inner._immutable = true;
    position.zpp_inner._immutable = true;
    zinner.toiDistance = toiDistance;
    zinner.shape = shape;
    return ret;
  }

  // ---------------------------------------------------------------------------
  // Instance: disposed check
  // ---------------------------------------------------------------------------

  disposed(): void {
    if (this.next != null) {
      throw new Error("Error: This object has been disposed of and cannot be used");
    }
  }

  // ---------------------------------------------------------------------------
  // Instance: free — release Vec2 wrappers and return to pool
  // ---------------------------------------------------------------------------

  free(): void {
    // Dispose normal Vec2 (always present)
    ZPP_ConvexRayResult._disposeVec2(this.normal);

    // Dispose position Vec2 (only present for convex results)
    if (this.position != null) {
      ZPP_ConvexRayResult._disposeVec2(this.position);
    }

    this.shape = null;
    this.toiDistance = 0.0;

    // Return to appropriate pool
    if (this.convex != null) {
      this.next = ZPP_ConvexRayResult.convexPool;
      ZPP_ConvexRayResult.convexPool = this;
    } else {
      this.next = ZPP_ConvexRayResult.rayPool;
      ZPP_ConvexRayResult.rayPool = this;
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Vec2 wrapper disposal (inlined from compiled Haxe)
  // ---------------------------------------------------------------------------

  private static _disposeVec2(v: Any): void {
    // Unlock immutability first
    v.zpp_inner._immutable = false;

    // Validate the Vec2 wrapper
    if (v != null && v.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    const zppInner: ZPP_Vec2 = v.zpp_inner;
    if (zppInner._immutable) {
      throw new Error("Error: Vec2 is immutable");
    }
    if (zppInner._isimmutable != null) {
      zppInner._isimmutable();
    }
    if (zppInner._inuse) {
      throw new Error("Error: This Vec2 is not disposable");
    }

    // Disconnect wrapper ↔ inner
    const inner = v.zpp_inner;
    v.zpp_inner.outer = null;
    v.zpp_inner = null;

    // Pool the public Vec2 wrapper
    v.zpp_pool = null;
    if (ZPP_PubPool.nextVec2 != null) {
      ZPP_PubPool.nextVec2.zpp_pool = v;
    } else {
      ZPP_PubPool.poolVec2 = v;
    }
    ZPP_PubPool.nextVec2 = v;
    v.zpp_disp = true;

    // Pool the ZPP_Vec2 inner
    if (inner.outer != null) {
      inner.outer.zpp_inner = null;
      inner.outer = null;
    }
    inner._isimmutable = null;
    inner._validate = null;
    inner._invalidate = null;
    inner.next = ZPP_Vec2.zpp_pool;
    ZPP_Vec2.zpp_pool = inner;
  }
}
