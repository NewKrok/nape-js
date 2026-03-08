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

export class ZPP_CopyHelper {
  static __name__ = ["zpp_nape", "constraint", "ZPP_CopyHelper"];

  id: number = 0;
  bc: any = null;
  cb: any = null;

  static dict(id: number, bc: any): ZPP_CopyHelper {
    const ret = new ZPP_CopyHelper();
    ret.id = id;
    ret.bc = bc;
    return ret;
  }

  static todo(id: number, cb: any): ZPP_CopyHelper {
    const ret = new ZPP_CopyHelper();
    ret.id = id;
    ret.cb = cb;
    return ret;
  }
}
