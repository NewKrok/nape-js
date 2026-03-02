/**
 * ZPP_UserBody — pairs a body with a reference count for user constraints.
 *
 * Converted from nape-compiled.js lines 28038–28054.
 */

type Any = any;

export class ZPP_UserBody {
  static __name__ = ["zpp_nape", "constraint", "ZPP_UserBody"];

  cnt = 0;
  body: Any = null;

  __class__: Any = ZPP_UserBody;

  constructor(cnt: number, body: Any) {
    this.cnt = cnt;
    this.body = body;
  }
}
