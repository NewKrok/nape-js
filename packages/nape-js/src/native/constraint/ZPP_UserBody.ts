/**
 * ZPP_UserBody — pairs a body with a reference count for user constraints.
 */

export class ZPP_UserBody {
  cnt = 0;
  body: any = null;

  constructor(cnt: number, body: any) {
    this.cnt = cnt;
    this.body = body;
  }
}
