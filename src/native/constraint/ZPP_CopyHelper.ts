/**
 * ZPP_CopyHelper — helper for constraint copying.
 *
 * Used by constraint copy() methods to track body mappings (dict)
 * and deferred body assignments (todo).
 *
 * Converted from nape-compiled.js lines 22300–22328.
 */

type Any = any;

export class ZPP_CopyHelper {
  static __name__ = ["zpp_nape", "constraint", "ZPP_CopyHelper"];

  id = 0;
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
