/**
 * ZPP_CopyHelper — Helper for constraint copy operations.
 *
 * Used by Constraint.copy() to map body IDs during deep-copy.
 * Two static factories:
 *   - dict(id, bc) — maps a body ID to an already-copied Body
 *   - todo(id, cb) — maps a body ID to a callback to invoke once copied
 *
 * Converted from nape-compiled.js lines 22300–22328.
 */

type Any = any;

export class ZPP_CopyHelper {
  static __name__ = ["zpp_nape", "constraint", "ZPP_CopyHelper"];

  id: number = 0;
  bc: Any = null;
  cb: Any = null;

  __class__: Any = ZPP_CopyHelper;

  static dict(id: number, bc: Any): ZPP_CopyHelper {
    const ret = new ZPP_CopyHelper();
    ret.id = id;
    ret.bc = bc;
    return ret;
  }

  static todo(id: number, cb: Any): ZPP_CopyHelper {
    const ret = new ZPP_CopyHelper();
    ret.id = id;
    ret.cb = cb;
    return ret;
  }
}
