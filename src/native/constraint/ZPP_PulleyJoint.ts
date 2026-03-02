/**
 * ZPP_PulleyJoint — Internal 4-body, 1-DOF pulley constraint.
 *
 * Constrains (dist(b1,b2) + ratio * dist(b3,b4)) to [jointMin, jointMax].
 * Supports mechanical advantage ratio, slack detection, stiffness/damping,
 * and large-error pre-correction in applyImpulsePos.
 *
 * Converted from nape-compiled.js lines 25475–25367.
 */

import { ZPP_Constraint } from "./ZPP_Constraint";
import { ZPP_AngleJoint } from "./ZPP_AngleJoint";

type Any = any;

export class ZPP_PulleyJoint extends ZPP_Constraint {
  static override __name__ = ["zpp_nape", "constraint", "ZPP_PulleyJoint"];
  static __super__ = ZPP_Constraint;

  outer_zn: Any = null;
  ratio = 1.0;
  jointMin = 0.0;
  jointMax = 0.0;
  slack = false;
  equal = false;

  n12x = 0.0;
  n12y = 0.0;
  n34x = 0.0;
  n34y = 0.0;

  cx1 = 0.0;
  cx2 = 0.0;
  cx3 = 0.0;
  cx4 = 0.0;

  b1: Any = null;
  a1localx = 0.0;
  a1localy = 0.0;
  a1relx = 0.0;
  a1rely = 0.0;
  wrap_a1: Any = null;

  b2: Any = null;
  a2localx = 0.0;
  a2localy = 0.0;
  a2relx = 0.0;
  a2rely = 0.0;
  wrap_a2: Any = null;

  b3: Any = null;
  a3localx = 0.0;
  a3localy = 0.0;
  a3relx = 0.0;
  a3rely = 0.0;
  wrap_a3: Any = null;

  b4: Any = null;
  a4localx = 0.0;
  a4localy = 0.0;
  a4relx = 0.0;
  a4rely = 0.0;
  wrap_a4: Any = null;

  kMass = 0.0;
  jAcc = 0.0;
  jMax = Infinity;
  gamma = 0.0;
  bias = 0.0;
  stepped = false;

  override __class__: Any = ZPP_PulleyJoint;

  constructor() {
    super();
    this.a1localx = 0;
    this.a1localy = 0;
    this.a1relx = 0;
    this.a1rely = 0;
    this.a2localx = 0;
    this.a2localy = 0;
    this.a2relx = 0;
    this.a2rely = 0;
    this.a3localx = 0;
    this.a3localy = 0;
    this.a3relx = 0;
    this.a3rely = 0;
    this.a4localx = 0;
    this.a4localy = 0;
    this.a4relx = 0;
    this.a4rely = 0;
    this.n12x = 1;
    this.n12y = 0;
    this.n34x = 1;
    this.n34y = 0;
    this.jAcc = 0;
    this.jMax = Infinity;
    this.stepped = false;
    this.cx1 = this.cx2 = this.cx3 = this.cx4 = 0;
  }

  is_slack(): boolean {
    let slack: boolean;
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    this.a3relx = this.b3.axisy * this.a3localx - this.b3.axisx * this.a3localy;
    this.a3rely = this.a3localx * this.b3.axisx + this.a3localy * this.b3.axisy;
    this.a4relx = this.b4.axisy * this.a4localx - this.b4.axisx * this.a4localy;
    this.a4rely = this.a4localx * this.b4.axisx + this.a4localy * this.b4.axisy;
    const t12x = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
    const t12y = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);
    const t34x = this.b4.posx + this.a4relx - (this.b3.posx + this.a3relx);
    const t34y = this.b4.posy + this.a4rely - (this.b3.posy + this.a3rely);
    const C12 = Math.sqrt(t12x * t12x + t12y * t12y);
    const C34 = Math.sqrt(t34x * t34x + t34y * t34y);
    const C = C12 + this.ratio * C34;
    if (this.equal) {
      slack = false;
    } else if (C < this.jointMin) {
      slack = false;
    } else if (C > this.jointMax) {
      slack = false;
    } else {
      slack = true;
    }
    return slack;
  }

  bodyImpulse(b: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    if (this.stepped) {
      const ret = napeNs.geom.Vec3.get();
      if (b == this.b1) {
        ret.zpp_inner.x = ret.zpp_inner.x - this.jAcc * this.n12x;
        ret.zpp_inner.y = ret.zpp_inner.y - this.jAcc * this.n12y;
        ret.zpp_inner.z = ret.zpp_inner.z - this.cx1 * this.jAcc;
      }
      if (b == this.b2) {
        ret.zpp_inner.x = ret.zpp_inner.x + this.jAcc * this.n12x;
        ret.zpp_inner.y = ret.zpp_inner.y + this.jAcc * this.n12y;
        ret.zpp_inner.z = ret.zpp_inner.z + this.cx2 * this.jAcc;
      }
      if (b == this.b3) {
        ret.zpp_inner.x = ret.zpp_inner.x - this.jAcc * this.n34x;
        ret.zpp_inner.y = ret.zpp_inner.y - this.jAcc * this.n34y;
        ret.zpp_inner.z = ret.zpp_inner.z - this.cx3 * this.jAcc;
      }
      if (b == this.b4) {
        ret.zpp_inner.x = ret.zpp_inner.x + this.jAcc * this.n34x;
        ret.zpp_inner.y = ret.zpp_inner.y + this.jAcc * this.n34y;
        ret.zpp_inner.z = ret.zpp_inner.z + this.cx4 * this.jAcc;
      }
      return ret;
    } else {
      return napeNs.geom.Vec3.get(0, 0, 0);
    }
  }

  override activeBodies(): void {
    if (this.b1 != null) {
      this.b1.constraints.add(this);
    }
    if (this.b2 != this.b1) {
      if (this.b2 != null) {
        this.b2.constraints.add(this);
      }
    }
    if (this.b3 != this.b1 && this.b3 != this.b2) {
      if (this.b3 != null) {
        this.b3.constraints.add(this);
      }
    }
    if (this.b4 != this.b1 && this.b4 != this.b2 && this.b4 != this.b3) {
      if (this.b4 != null) {
        this.b4.constraints.add(this);
      }
    }
  }

  override inactiveBodies(): void {
    if (this.b1 != null) {
      this.b1.constraints.remove(this);
    }
    if (this.b2 != this.b1) {
      if (this.b2 != null) {
        this.b2.constraints.remove(this);
      }
    }
    if (this.b3 != this.b1 && this.b3 != this.b2) {
      if (this.b3 != null) {
        this.b3.constraints.remove(this);
      }
    }
    if (this.b4 != this.b1 && this.b4 != this.b2 && this.b4 != this.b3) {
      if (this.b4 != null) {
        this.b4.constraints.remove(this);
      }
    }
  }

  // ---- anchor a1 ----

  validate_a1(): void {
    this.wrap_a1.zpp_inner.x = this.a1localx;
    this.wrap_a1.zpp_inner.y = this.a1localy;
  }

  invalidate_a1(x: Any): void {
    this.immutable_midstep("Constraint::" + "a1");
    this.a1localx = x.x;
    this.a1localy = x.y;
    this.wake();
  }

  setup_a1(): void {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;
    let x = this.a1localx;
    let y = this.a1localy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1: Any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp.geom.ZPP_Vec2();
      } else {
        ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_a1 = ret;
    this.wrap_a1.zpp_inner._inuse = true;
    this.wrap_a1.zpp_inner._validate = this.validate_a1.bind(this);
    this.wrap_a1.zpp_inner._invalidate = this.invalidate_a1.bind(this);
  }

  // ---- anchor a2 ----

  validate_a2(): void {
    this.wrap_a2.zpp_inner.x = this.a2localx;
    this.wrap_a2.zpp_inner.y = this.a2localy;
  }

  invalidate_a2(x: Any): void {
    this.immutable_midstep("Constraint::" + "a2");
    this.a2localx = x.x;
    this.a2localy = x.y;
    this.wake();
  }

  setup_a2(): void {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;
    let x = this.a2localx;
    let y = this.a2localy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1: Any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp.geom.ZPP_Vec2();
      } else {
        ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_a2 = ret;
    this.wrap_a2.zpp_inner._inuse = true;
    this.wrap_a2.zpp_inner._validate = this.validate_a2.bind(this);
    this.wrap_a2.zpp_inner._invalidate = this.invalidate_a2.bind(this);
  }

  // ---- anchor a3 ----

  validate_a3(): void {
    this.wrap_a3.zpp_inner.x = this.a3localx;
    this.wrap_a3.zpp_inner.y = this.a3localy;
  }

  invalidate_a3(x: Any): void {
    this.immutable_midstep("Constraint::" + "a3");
    this.a3localx = x.x;
    this.a3localy = x.y;
    this.wake();
  }

  setup_a3(): void {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;
    let x = this.a3localx;
    let y = this.a3localy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1: Any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp.geom.ZPP_Vec2();
      } else {
        ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_a3 = ret;
    this.wrap_a3.zpp_inner._inuse = true;
    this.wrap_a3.zpp_inner._validate = this.validate_a3.bind(this);
    this.wrap_a3.zpp_inner._invalidate = this.invalidate_a3.bind(this);
  }

  // ---- anchor a4 ----

  validate_a4(): void {
    this.wrap_a4.zpp_inner.x = this.a4localx;
    this.wrap_a4.zpp_inner.y = this.a4localy;
  }

  invalidate_a4(x: Any): void {
    this.immutable_midstep("Constraint::" + "a4");
    this.a4localx = x.x;
    this.a4localy = x.y;
    this.wake();
  }

  setup_a4(): void {
    const napeNs = ZPP_Constraint._nape;
    const zpp = ZPP_Constraint._zpp;
    let x = this.a4localx;
    let y = this.a4localy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret: Any;
    if (zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new napeNs.geom.Vec2();
    } else {
      ret = zpp.util.ZPP_PubPool.poolVec2;
      zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == zpp.util.ZPP_PubPool.nextVec2) {
        zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1: Any;
      if (zpp.geom.ZPP_Vec2.zpp_pool == null) {
        ret1 = new zpp.geom.ZPP_Vec2();
      } else {
        ret1 = zpp.geom.ZPP_Vec2.zpp_pool;
        zpp.geom.ZPP_Vec2.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.weak = false;
      ret1._immutable = false;
      ret1.x = x;
      ret1.y = y;
      ret.zpp_inner = ret1;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this = ret.zpp_inner;
      if (_this._immutable) {
        throw new Error("Error: Vec2 is immutable");
      }
      if (_this._isimmutable != null) {
        _this._isimmutable();
      }
      if (x != x || y != y) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let tmp: boolean;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: Vec2 has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: Vec2 has been disposed and cannot be used!");
        }
        const _this2 = ret.zpp_inner;
        if (_this2._validate != null) {
          _this2._validate();
        }
        tmp = ret.zpp_inner.y == y;
      } else {
        tmp = false;
      }
      if (!tmp) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        const _this3 = ret.zpp_inner;
        if (_this3._invalidate != null) {
          _this3._invalidate(_this3);
        }
      }
    }
    ret.zpp_inner.weak = false;
    this.wrap_a4 = ret;
    this.wrap_a4.zpp_inner._inuse = true;
    this.wrap_a4.zpp_inner._validate = this.validate_a4.bind(this);
    this.wrap_a4.zpp_inner._invalidate = this.invalidate_a4.bind(this);
  }

  override copy(dict: Any, todo: Any): Any {
    const napeNs = ZPP_Constraint._nape;
    const _this = this.outer_zn;
    if (_this.zpp_inner_zn.wrap_a1 == null) {
      _this.zpp_inner_zn.setup_a1();
    }
    const ret = _this.zpp_inner_zn.wrap_a1;
    const _this1 = this.outer_zn;
    if (_this1.zpp_inner_zn.wrap_a2 == null) {
      _this1.zpp_inner_zn.setup_a2();
    }
    const ret1 = _this1.zpp_inner_zn.wrap_a2;
    const _this2 = this.outer_zn;
    if (_this2.zpp_inner_zn.wrap_a3 == null) {
      _this2.zpp_inner_zn.setup_a3();
    }
    const ret2 = _this2.zpp_inner_zn.wrap_a3;
    const _this3 = this.outer_zn;
    if (_this3.zpp_inner_zn.wrap_a4 == null) {
      _this3.zpp_inner_zn.setup_a4();
    }
    const ret3 = new napeNs.constraint.PulleyJoint(
      null,
      null,
      null,
      null,
      ret,
      ret1,
      ret2,
      _this3.zpp_inner_zn.wrap_a4,
      this.jointMin,
      this.jointMax,
      this.ratio,
    );
    this.copyto(ret3);
    ZPP_AngleJoint._copyBody(dict, todo, this.b1, ret3, "b1");
    ZPP_AngleJoint._copyBody(dict, todo, this.b2, ret3, "b2");
    ZPP_AngleJoint._copyBody(dict, todo, this.b3, ret3, "b3");
    ZPP_AngleJoint._copyBody(dict, todo, this.b4, ret3, "b4");
    return ret3;
  }

  override validate(): void {
    if (this.b1 == null || this.b2 == null || this.b3 == null || this.b4 == null) {
      throw new Error("Error: PulleyJoint cannot be simulated with null bodies");
    }
    if (this.b1 == this.b2 || this.b3 == this.b4) {
      throw new Error("Error: PulleyJoint cannot have body1==body2 or body3==body4");
    }
    if (
      this.b1.space != this.space ||
      this.b2.space != this.space ||
      this.b3.space != this.space ||
      this.b4.space != this.space
    ) {
      throw new Error(
        "Error: Constraints must have each body within the same space to which the constraint has been assigned",
      );
    }
    if (this.jointMin > this.jointMax) {
      throw new Error("Error: PulleyJoint must have jointMin <= jointMax");
    }
    if (this.b1.type != 2 && this.b2.type != 2) {
      throw new Error("Error: PulleyJoint cannot have both bodies in a linked pair non-dynamic");
    }
    if (this.b3.type != 2 && this.b4.type != 2) {
      throw new Error("Error: PulleyJoint cannot have both bodies in a linked pair non-dynamic");
    }
  }

  override wake_connected(): void {
    if (this.b1 != null && this.b1.type == 2) {
      this.b1.wake();
    }
    if (this.b2 != null && this.b2.type == 2) {
      this.b2.wake();
    }
    if (this.b3 != null && this.b3.type == 2) {
      this.b3.wake();
    }
    if (this.b4 != null && this.b4.type == 2) {
      this.b4.wake();
    }
  }

  override forest(): void {
    if (this.b1.type == 2) {
      ZPP_Constraint._unionComponents(this.b1.component, this.component);
    }
    if (this.b2.type == 2) {
      ZPP_Constraint._unionComponents(this.b2.component, this.component);
    }
    if (this.b3.type == 2) {
      ZPP_Constraint._unionComponents(this.b3.component, this.component);
    }
    if (this.b4.type == 2) {
      ZPP_Constraint._unionComponents(this.b4.component, this.component);
    }
  }

  override pair_exists(id: number, di: number): boolean {
    if (
      !(
        (this.b1.id == id && (this.b2.id == di || this.b3.id == di || this.b4.id == di)) ||
        (this.b2.id == id && (this.b3.id == di || this.b4.id == di || this.b1.id == di)) ||
        (this.b3.id == id && (this.b4.id == di || this.b1.id == di || this.b2.id == di))
      )
    ) {
      if (this.b4.id == id) {
        if (!(this.b1.id == di || this.b2.id == di)) {
          return this.b3.id == di;
        } else {
          return true;
        }
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  override clearcache(): void {
    this.jAcc = 0;
    this.pre_dt = -1.0;
  }

  override preStep(dt: number): boolean {
    if (this.pre_dt == -1.0) {
      this.pre_dt = dt;
    }
    const dtratio = dt / this.pre_dt;
    this.pre_dt = dt;
    this.stepped = true;
    this.equal = this.jointMin == this.jointMax;
    this.a1relx = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    this.a1rely = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    this.a2relx = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    this.a2rely = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    this.a3relx = this.b3.axisy * this.a3localx - this.b3.axisx * this.a3localy;
    this.a3rely = this.a3localx * this.b3.axisx + this.a3localy * this.b3.axisy;
    this.a4relx = this.b4.axisy * this.a4localx - this.b4.axisx * this.a4localy;
    this.a4rely = this.a4localx * this.b4.axisx + this.a4localy * this.b4.axisy;
    const t12x = this.b2.posx + this.a2relx - (this.b1.posx + this.a1relx);
    const t12y = this.b2.posy + this.a2rely - (this.b1.posy + this.a1rely);
    const t34x = this.b4.posx + this.a4relx - (this.b3.posx + this.a3relx);
    const t34y = this.b4.posy + this.a4rely - (this.b3.posy + this.a3rely);
    const C12 = Math.sqrt(t12x * t12x + t12y * t12y);
    const C34 = Math.sqrt(t34x * t34x + t34y * t34y);
    if (C12 != 0) {
      const t = 1.0 / C12;
      this.n12x = t12x * t;
      this.n12y = t12y * t;
    }
    if (C34 != 0) {
      const t1 = 1.0 / C34;
      this.n34x = t34x * t1;
      this.n34y = t34y * t1;
      const t2 = this.ratio;
      this.n34x *= t2;
      this.n34y *= t2;
    } else {
      const t3 = this.ratio / Math.sqrt(this.n34x * this.n34x + this.n34y * this.n34y);
      this.n34x *= t3;
      this.n34y *= t3;
    }
    let C = C12 + this.ratio * C34;
    if (this.equal) {
      C -= this.jointMax;
      this.slack = false;
    } else if (C < this.jointMin) {
      C = this.jointMin - C;
      this.n12x = -this.n12x;
      this.n12y = -this.n12y;
      this.n34x = -this.n34x;
      this.n34y = -this.n34y;
      this.slack = false;
    } else if (C > this.jointMax) {
      C -= this.jointMax;
      this.slack = false;
    } else {
      this.n12x = 0;
      this.n12y = 0;
      this.n34x = 0;
      this.n34y = 0;
      C = 0;
      this.slack = true;
    }
    const C1 = C;
    if (!this.slack) {
      this.cx1 = this.n12y * this.a1relx - this.n12x * this.a1rely;
      this.cx2 = this.n12y * this.a2relx - this.n12x * this.a2rely;
      this.cx3 = this.n34y * this.a3relx - this.n34x * this.a3rely;
      this.cx4 = this.n34y * this.a4relx - this.n34x * this.a4rely;
      const ratioSq = this.ratio * this.ratio;
      let K =
        this.b1.smass +
        this.b2.smass +
        ratioSq * (this.b3.smass + this.b4.smass) +
        this.b1.sinertia * this.cx1 * this.cx1 +
        this.b2.sinertia * this.cx2 * this.cx2 +
        this.b3.sinertia * this.cx3 * this.cx3 +
        this.b4.sinertia * this.cx4 * this.cx4;
      if (this.b1 == this.b4) {
        K -=
          2 *
          ((this.n12x * this.n34x + this.n12y * this.n34y) * this.b1.smass +
            this.cx1 * this.cx4 * this.b1.sinertia);
      }
      if (this.b1 == this.b3) {
        K +=
          2 *
          ((this.n12x * this.n34x + this.n12y * this.n34y) * this.b1.smass +
            this.cx1 * this.cx3 * this.b1.sinertia);
      }
      if (this.b2 == this.b3) {
        K -=
          2 *
          ((this.n12x * this.n34x + this.n12y * this.n34y) * this.b2.smass +
            this.cx2 * this.cx3 * this.b2.sinertia);
      }
      if (this.b2 == this.b4) {
        K +=
          2 *
          ((this.n12x * this.n34x + this.n12y * this.n34y) * this.b2.smass +
            this.cx2 * this.cx4 * this.b2.sinertia);
      }
      this.kMass = K;
      if (this.kMass != 0) {
        this.kMass = 1 / this.kMass;
      } else {
        this.jAcc = 0;
      }
      if (!this.stiff) {
        if (this.breakUnderError && C1 * C1 > this.maxError * this.maxError) {
          return true;
        }
        const omega = 2 * Math.PI * this.frequency;
        this.gamma = 1 / (dt * omega * (2 * this.damping + omega * dt));
        const ig = 1 / (1 + this.gamma);
        const biasCoef = dt * omega * omega * this.gamma;
        this.gamma *= ig;
        this.kMass *= ig;
        this.bias = -C1 * biasCoef;
        if (this.bias < -this.maxError) {
          this.bias = -this.maxError;
        } else if (this.bias > this.maxError) {
          this.bias = this.maxError;
        }
      } else {
        this.bias = 0;
        this.gamma = 0;
      }
      this.jAcc *= dtratio;
      this.jMax = this.maxForce * dt;
    }
    return false;
  }

  override warmStart(): void {
    if (!this.slack) {
      const t = this.b1.imass * this.jAcc;
      this.b1.velx -= this.n12x * t;
      this.b1.vely -= this.n12y * t;
      const t1 = this.b2.imass * this.jAcc;
      this.b2.velx += this.n12x * t1;
      this.b2.vely += this.n12y * t1;
      const t2 = this.b3.imass * this.jAcc;
      this.b3.velx -= this.n34x * t2;
      this.b3.vely -= this.n34y * t2;
      const t3 = this.b4.imass * this.jAcc;
      this.b4.velx += this.n34x * t3;
      this.b4.vely += this.n34y * t3;
      this.b1.angvel -= this.cx1 * this.b1.iinertia * this.jAcc;
      this.b2.angvel += this.cx2 * this.b2.iinertia * this.jAcc;
      this.b3.angvel -= this.cx3 * this.b3.iinertia * this.jAcc;
      this.b4.angvel += this.cx4 * this.b4.iinertia * this.jAcc;
    }
  }

  override applyImpulseVel(): boolean {
    if (this.slack) {
      return false;
    }
    const E =
      this.n12x * (this.b2.velx + this.b2.kinvelx - this.b1.velx - this.b1.kinvelx) +
      this.n12y * (this.b2.vely + this.b2.kinvely - this.b1.vely - this.b1.kinvely) +
      this.n34x * (this.b4.velx + this.b4.kinvelx - this.b3.velx - this.b3.kinvelx) +
      this.n34y * (this.b4.vely + this.b4.kinvely - this.b3.vely - this.b3.kinvely) +
      (this.b2.angvel + this.b2.kinangvel) * this.cx2 -
      (this.b1.angvel + this.b1.kinangvel) * this.cx1 +
      (this.b4.angvel + this.b4.kinangvel) * this.cx4 -
      (this.b3.angvel + this.b3.kinangvel) * this.cx3;
    let j = this.kMass * (this.bias - E) - this.jAcc * this.gamma;
    const jOld = this.jAcc;
    this.jAcc += j;
    if (!this.equal && this.jAcc > 0) {
      this.jAcc = 0;
    }
    if (this.breakUnderForce && this.jAcc < -this.jMax) {
      return true;
    }
    if (!this.stiff) {
      if (this.jAcc < -this.jMax) {
        this.jAcc = -this.jMax;
      }
    }
    j = this.jAcc - jOld;
    const t = this.b1.imass * j;
    this.b1.velx -= this.n12x * t;
    this.b1.vely -= this.n12y * t;
    const t1 = this.b2.imass * j;
    this.b2.velx += this.n12x * t1;
    this.b2.vely += this.n12y * t1;
    const t2 = this.b3.imass * j;
    this.b3.velx -= this.n34x * t2;
    this.b3.vely -= this.n34y * t2;
    const t3 = this.b4.imass * j;
    this.b4.velx += this.n34x * t3;
    this.b4.vely += this.n34y * t3;
    this.b1.angvel -= this.cx1 * this.b1.iinertia * j;
    this.b2.angvel += this.cx2 * this.b2.iinertia * j;
    this.b3.angvel -= this.cx3 * this.b3.iinertia * j;
    this.b4.angvel += this.cx4 * this.b4.iinertia * j;
    return false;
  }

  override applyImpulsePos(): boolean {
    const napeNs = ZPP_Constraint._nape;
    let j: number;
    let r1x = 0.0;
    let r1y = 0.0;
    r1x = this.b1.axisy * this.a1localx - this.b1.axisx * this.a1localy;
    r1y = this.a1localx * this.b1.axisx + this.a1localy * this.b1.axisy;
    let r2x = 0.0;
    let r2y = 0.0;
    r2x = this.b2.axisy * this.a2localx - this.b2.axisx * this.a2localy;
    r2y = this.a2localx * this.b2.axisx + this.a2localy * this.b2.axisy;
    let r3x = 0.0;
    let r3y = 0.0;
    r3x = this.b3.axisy * this.a3localx - this.b3.axisx * this.a3localy;
    r3y = this.a3localx * this.b3.axisx + this.a3localy * this.b3.axisy;
    let r4x = 0.0;
    let r4y = 0.0;
    r4x = this.b4.axisy * this.a4localx - this.b4.axisx * this.a4localy;
    r4y = this.a4localx * this.b4.axisx + this.a4localy * this.b4.axisy;
    let slack: boolean;
    let n12x = this.n12x;
    let n12y = this.n12y;
    let n34x = this.n34x;
    let n34y = this.n34y;
    const t12x = this.b2.posx + r2x - (this.b1.posx + r1x);
    const t12y = this.b2.posy + r2y - (this.b1.posy + r1y);
    const t34x = this.b4.posx + r4x - (this.b3.posx + r3x);
    const t34y = this.b4.posy + r4y - (this.b3.posy + r3y);
    const C12 = Math.sqrt(t12x * t12x + t12y * t12y);
    const C34 = Math.sqrt(t34x * t34x + t34y * t34y);
    if (C12 != 0) {
      const t = 1.0 / C12;
      n12x = t12x * t;
      n12y = t12y * t;
    }
    if (C34 != 0) {
      const t1 = 1.0 / C34;
      n34x = t34x * t1;
      n34y = t34y * t1;
      const t2 = this.ratio;
      n34x *= t2;
      n34y *= t2;
    } else {
      const t3 = this.ratio / Math.sqrt(n34x * n34x + n34y * n34y);
      n34x *= t3;
      n34y *= t3;
    }
    let C = C12 + this.ratio * C34;
    if (this.equal) {
      C -= this.jointMax;
      slack = false;
    } else if (C < this.jointMin) {
      C = this.jointMin - C;
      n12x = -n12x;
      n12y = -n12y;
      n34x = -n34x;
      n34y = -n34y;
      slack = false;
    } else if (C > this.jointMax) {
      C -= this.jointMax;
      slack = false;
    } else {
      n12x = 0;
      n12y = 0;
      n34x = 0;
      n34y = 0;
      C = 0;
      slack = true;
    }
    let E = C;
    if (!slack) {
      if (this.breakUnderError && E * E > this.maxError * this.maxError) {
        return true;
      }
      if (E * E < napeNs.Config.constraintLinearSlop * napeNs.Config.constraintLinearSlop) {
        return false;
      }
      E *= 0.5;
      if (E * E > 6) {
        const k = this.b1.smass + this.b2.smass;
        if (k > napeNs.Config.epsilon) {
          const kInv = 0.75 / k;
          j = -E * kInv;
          if (this.equal || j < 0) {
            const t4 = j * this.b1.imass;
            this.b1.posx -= n12x * t4;
            this.b1.posy -= n12y * t4;
            const t5 = j * this.b2.imass;
            this.b2.posx += n12x * t5;
            this.b2.posy += n12y * t5;
            const t6 = j * this.b3.imass;
            this.b3.posx -= n34x * t6;
            this.b3.posy -= n34y * t6;
            const t7 = j * this.b4.imass;
            this.b4.posx += n34x * t7;
            this.b4.posy += n34y * t7;
            // Recompute normals after pre-step correction
            const t12x1 = this.b2.posx + r2x - (this.b1.posx + r1x);
            const t12y1 = this.b2.posy + r2y - (this.b1.posy + r1y);
            const t34x1 = this.b4.posx + r4x - (this.b3.posx + r3x);
            const t34y1 = this.b4.posy + r4y - (this.b3.posy + r3y);
            const C121 = Math.sqrt(t12x1 * t12x1 + t12y1 * t12y1);
            const C341 = Math.sqrt(t34x1 * t34x1 + t34y1 * t34y1);
            if (C121 != 0) {
              const t8 = 1.0 / C121;
              n12x = t12x1 * t8;
              n12y = t12y1 * t8;
            }
            if (C341 != 0) {
              const t9 = 1.0 / C341;
              n34x = t34x1 * t9;
              n34y = t34y1 * t9;
              const t10 = this.ratio;
              n34x *= t10;
              n34y *= t10;
            } else {
              const t11 = this.ratio / Math.sqrt(n34x * n34x + n34y * n34y);
              n34x *= t11;
              n34y *= t11;
            }
            let C1 = C121 + this.ratio * C341;
            if (this.equal) {
              C1 -= this.jointMax;
              slack = false;
            } else if (C1 < this.jointMin) {
              C1 = this.jointMin - C1;
              n12x = -n12x;
              n12y = -n12y;
              n34x = -n34x;
              n34y = -n34y;
              slack = false;
            } else if (C1 > this.jointMax) {
              C1 -= this.jointMax;
              slack = false;
            } else {
              n12x = 0;
              n12y = 0;
              n34x = 0;
              n34y = 0;
              C1 = 0;
              slack = true;
            }
            E = C1;
            E *= 0.5;
          }
        }
      }
      const cx1 = n12y * r1x - n12x * r1y;
      const cx2 = n12y * r2x - n12x * r2y;
      const cx3 = n34y * r3x - n34x * r3y;
      const cx4 = n34y * r4x - n34x * r4y;
      const ratioSq = this.ratio * this.ratio;
      let K =
        this.b1.smass +
        this.b2.smass +
        ratioSq * (this.b3.smass + this.b4.smass) +
        this.b1.sinertia * cx1 * cx1 +
        this.b2.sinertia * cx2 * cx2 +
        this.b3.sinertia * cx3 * cx3 +
        this.b4.sinertia * cx4 * cx4;
      if (this.b1 == this.b4) {
        K -= 2 * ((n12x * n34x + n12y * n34y) * this.b1.smass + cx1 * cx4 * this.b1.sinertia);
      }
      if (this.b1 == this.b3) {
        K += 2 * ((n12x * n34x + n12y * n34y) * this.b1.smass + cx1 * cx3 * this.b1.sinertia);
      }
      if (this.b2 == this.b3) {
        K -= 2 * ((n12x * n34x + n12y * n34y) * this.b2.smass + cx2 * cx3 * this.b2.sinertia);
      }
      if (this.b2 == this.b4) {
        K += 2 * ((n12x * n34x + n12y * n34y) * this.b2.smass + cx2 * cx4 * this.b2.sinertia);
      }
      let k1 = K;
      if (k1 != 0) {
        k1 = 1 / k1;
      }
      j = -E * k1;
      if (this.equal || j < 0) {
        const t12 = this.b1.imass * j;
        this.b1.posx -= n12x * t12;
        this.b1.posy -= n12y * t12;
        const t13 = this.b2.imass * j;
        this.b2.posx += n12x * t13;
        this.b2.posy += n12y * t13;
        const t14 = this.b3.imass * j;
        this.b3.posx -= n34x * t14;
        this.b3.posy -= n34y * t14;
        const t15 = this.b4.imass * j;
        this.b4.posx += n34x * t15;
        this.b4.posy += n34y * t15;
        ZPP_AngleJoint._rotateBody(this.b1, -cx1 * this.b1.iinertia * j);
        ZPP_AngleJoint._rotateBody(this.b2, cx2 * this.b2.iinertia * j);
        ZPP_AngleJoint._rotateBody(this.b3, -cx3 * this.b3.iinertia * j);
        ZPP_AngleJoint._rotateBody(this.b4, cx4 * this.b4.iinertia * j);
      }
    }
    return false;
  }

  override draw(_g: Any): void {}
}
