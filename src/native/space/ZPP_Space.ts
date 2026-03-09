/**
 * ZPP_Space -- Internal space implementation (core simulation loop).
 * Converted from nape-compiled.js lines 30236-43690.
 *
 * This is the largest and most complex class in the engine (~13,450 lines).
 * It handles integration, constraint solving, broadphase management,
 * sleeping/waking, and callback dispatch.
 */

import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_Collide } from "../geom/ZPP_Collide";
import { ZPP_SweepDistance } from "../geom/ZPP_SweepDistance";
import { ZPP_Arbiter } from "../dynamics/ZPP_Arbiter";
import { ZPP_ColArbiter } from "../dynamics/ZPP_ColArbiter";
import { ZPP_FluidArbiter } from "../dynamics/ZPP_FluidArbiter";
import { ZPP_SensorArbiter } from "../dynamics/ZPP_SensorArbiter";
import { ZPP_Contact } from "../dynamics/ZPP_Contact";
import { ZPP_Body } from "../phys/ZPP_Body";
import { ZPP_Compound } from "../phys/ZPP_Compound";
import { ZPP_Constraint } from "../constraint/ZPP_Constraint";
import { ZPP_Callback } from "../callbacks/ZPP_Callback";
import { ZPP_CbSet } from "../callbacks/ZPP_CbSet";
import { ZPP_CbSetPair } from "../callbacks/ZPP_CbSetPair";
import { ZPP_Listener } from "../callbacks/ZPP_Listener";
import { ZPP_InteractionListener } from "../callbacks/ZPP_InteractionListener";
import { ZPP_Flags } from "../util/ZPP_Flags";
import { ZPP_Island } from "./ZPP_Island";
import { ZPP_Component } from "./ZPP_Component";
import { ZPP_CallbackSet } from "./ZPP_CallbackSet";
import { ZPP_CbSetManager } from "./ZPP_CbSetManager";

export class ZPP_Space {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "space", "ZPP_Space"];

  // --- Static: namespace references ---
  static _zpp: any = null;
  static _nape: any = null;

  // --- Instance fields ---
  outer: any = null;
  userData: any = null;
  gravityx: any = null;
  gravityy: any = null;
  wrap_gravity: any = null;
  bodies: any = null;
  wrap_bodies: any = null;
  compounds: any = null;
  wrap_compounds: any = null;
  constraints: any = null;
  wrap_constraints: any = null;
  kinematics: any = null;
  bphase: any = null;
  __static: any = null;
  global_lin_drag: any = null;
  global_ang_drag: any = null;
  stamp: any = null;
  midstep: any = null;
  time: any = null;
  sortcontacts: any = null;
  c_arbiters_true: any = null;
  c_arbiters_false: any = null;
  f_arbiters: any = null;
  s_arbiters: any = null;
  wrap_arbiters: any = null;
  live: any = null;
  wrap_live: any = null;
  live_constraints: any = null;
  wrap_livecon: any = null;
  staticsleep: any = null;
  islands: any = null;
  listeners: any = null;
  wrap_listeners: any = null;
  callbacks: any = null;
  callbackset_list: any = null;
  cbsets: any = null;
  convexShapeList: any = null;
  pre_dt: any = null;
  toiEvents: any = null;
  continuous: any = null;
  precb: any = null;
  prelisteners: any = null;
  mrca1: any = null;
  mrca2: any = null;

  __class__: any = ZPP_Space;

  constructor(gravity?: any, broadphase?: any) {
    this.prelisteners = null;
    this.precb = null;
    this.continuous = false;
    this.toiEvents = null;
    this.pre_dt = 0.0;
    this.convexShapeList = null;
    this.cbsets = null;
    this.callbackset_list = null;
    this.callbacks = null;
    this.wrap_listeners = null;
    this.listeners = null;
    this.islands = null;
    this.staticsleep = null;
    this.wrap_livecon = null;
    this.live_constraints = null;
    this.wrap_live = null;
    this.live = null;
    this.wrap_arbiters = null;
    this.s_arbiters = null;
    this.f_arbiters = null;
    this.c_arbiters_false = null;
    this.c_arbiters_true = null;
    this.sortcontacts = false;
    this.time = 0.0;
    this.midstep = false;
    this.stamp = 0;
    this.global_ang_drag = 0.0;
    this.global_lin_drag = 0.0;
    this.__static = null;
    this.bphase = null;
    this.kinematics = null;
    this.wrap_constraints = null;
    this.constraints = null;
    this.wrap_compounds = null;
    this.compounds = null;
    this.wrap_bodies = null;
    this.bodies = null;
    this.wrap_gravity = null;
    this.gravityy = 0.0;
    this.gravityx = 0.0;
    this.userData = null;
    this.outer = null;
    this.toiEvents = new ZPP_Space._zpp.util.ZNPList_ZPP_ToiEvent();
    this.global_lin_drag = 0.015;
    this.global_ang_drag = 0.015;
    ZPP_Callback.internal = true;
    this.precb = ZPP_Callback._createPreCb!();
    this.precb.zpp_inner = new ZPP_Callback();
    ZPP_Callback.internal = false;
    this.sortcontacts = true;
    this.pre_dt = 0.0;
    let tmp;
    if (broadphase != null) {
      if (ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE = new ZPP_Space._nape.space.Broadphase();
        ZPP_Flags.internal = false;
      }
      tmp = broadphase == ZPP_Flags.Broadphase_DYNAMIC_AABB_TREE;
    } else {
      tmp = true;
    }
    if (tmp) {
      this.bphase = new ZPP_Space._zpp.space.ZPP_DynAABBPhase(this);
    } else {
      if (ZPP_Flags.Broadphase_SWEEP_AND_PRUNE == null) {
        ZPP_Flags.internal = true;
        ZPP_Flags.Broadphase_SWEEP_AND_PRUNE = new ZPP_Space._nape.space.Broadphase();
        ZPP_Flags.internal = false;
      }
      if (broadphase == ZPP_Flags.Broadphase_SWEEP_AND_PRUNE) {
        this.bphase = new ZPP_Space._zpp.space.ZPP_SweepPhase(this);
      }
    }
    this.time = 0.0;
    const me = this;
    if (gravity != null) {
      this.gravityx = gravity.x;
      this.gravityy = gravity.y;
    } else {
      this.gravityx = 0;
      this.gravityy = 0;
    }
    this.bodies = new ZPP_Space._zpp.util.ZNPList_ZPP_Body();
    this.wrap_bodies = ZPP_Space._zpp.util.ZPP_BodyList.get(this.bodies);
    this.wrap_bodies.zpp_inner.adder = (x?: any) => this.bodies_adder(x);
    this.wrap_bodies.zpp_inner.subber = (x?: any) => this.bodies_subber(x);
    this.wrap_bodies.zpp_inner._modifiable = () => this.bodies_modifiable();
    this.compounds = new ZPP_Space._zpp.util.ZNPList_ZPP_Compound();
    this.wrap_compounds = ZPP_Space._zpp.util.ZPP_CompoundList.get(this.compounds);
    this.wrap_compounds.zpp_inner.adder = (x?: any) => this.compounds_adder(x);
    this.wrap_compounds.zpp_inner.subber = (x?: any) => this.compounds_subber(x);
    this.wrap_compounds.zpp_inner._modifiable = () => this.compounds_modifiable();
    this.kinematics = new ZPP_Space._zpp.util.ZNPList_ZPP_Body();
    this.c_arbiters_true = new ZPP_Space._zpp.util.ZNPList_ZPP_ColArbiter();
    this.c_arbiters_false = new ZPP_Space._zpp.util.ZNPList_ZPP_ColArbiter();
    this.f_arbiters = new ZPP_Space._zpp.util.ZNPList_ZPP_FluidArbiter();
    this.s_arbiters = new ZPP_Space._zpp.util.ZNPList_ZPP_SensorArbiter();
    this.islands = new ZPP_Island();
    this.live = new ZPP_Space._zpp.util.ZNPList_ZPP_Body();
    this.wrap_live = ZPP_Space._zpp.util.ZPP_BodyList.get(this.live, true);
    this.staticsleep = new ZPP_Space._zpp.util.ZNPList_ZPP_Body();
    this.constraints = new ZPP_Space._zpp.util.ZNPList_ZPP_Constraint();
    this.wrap_constraints = ZPP_Space._zpp.util.ZPP_ConstraintList.get(this.constraints);
    this.wrap_constraints.zpp_inner.adder = (x?: any) => this.constraints_adder(x);
    this.wrap_constraints.zpp_inner.subber = (x?: any) => this.constraints_subber(x);
    this.wrap_constraints.zpp_inner._modifiable = () => this.constraints_modifiable();
    this.live_constraints = new ZPP_Space._zpp.util.ZNPList_ZPP_Constraint();
    this.wrap_livecon = ZPP_Space._zpp.util.ZPP_ConstraintList.get(this.live_constraints, true);
    this.__static = ZPP_Body.__static();
    this.__static.zpp_inner.space = this;
    this.callbacks = new ZPP_Callback();
    this.midstep = false;
    this.listeners = new ZPP_Space._zpp.util.ZNPList_ZPP_Listener();
    this.wrap_listeners = ZPP_Space._zpp.util.ZPP_ListenerList.get(this.listeners);
    this.wrap_listeners.zpp_inner.adder = (x?: any) => this.listeners_adder(x);
    this.wrap_listeners.zpp_inner.subber = (x?: any) => this.listeners_subber(x);
    this.wrap_listeners.zpp_inner._modifiable = () => this.listeners_modifiable();
    this.callbackset_list = new ZPP_CallbackSet();
    this.mrca1 = new ZPP_Space._zpp.util.ZNPList_ZPP_Interactor();
    this.mrca2 = new ZPP_Space._zpp.util.ZNPList_ZPP_Interactor();
    this.prelisteners = new ZPP_Space._zpp.util.ZNPList_ZPP_InteractionListener();
    this.cbsets = new ZPP_CbSetManager(this);
  }

  getgravity() {
    let x = this.gravityx;
    let y = this.gravityy;
    if (y == null) {
      y = 0;
    }
    if (x == null) {
      x = 0;
    }
    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }
    let ret;
    if (ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 == null) {
      ret = new ZPP_Space._nape.geom.Vec2();
    } else {
      ret = ZPP_Space._zpp.util.ZPP_PubPool.poolVec2;
      ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret == ZPP_Space._zpp.util.ZPP_PubPool.nextVec2) {
        ZPP_Space._zpp.util.ZPP_PubPool.nextVec2 = null;
      }
    }
    if (ret.zpp_inner == null) {
      let ret1;
      if (ZPP_Vec2.zpp_pool == null) {
        ret1 = new ZPP_Vec2();
      } else {
        ret1 = ZPP_Vec2.zpp_pool;
        ZPP_Vec2.zpp_pool = ret1.next;
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
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
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
      let tmp;
      if (ret != null && ret.zpp_disp) {
        throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
      }
      const _this1 = ret.zpp_inner;
      if (_this1._validate != null) {
        _this1._validate();
      }
      if (ret.zpp_inner.x == x) {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
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
    this.wrap_gravity = ret;
    this.wrap_gravity.zpp_inner._inuse = true;
    this.wrap_gravity.zpp_inner._invalidate = (x?: any) => this.gravity_invalidate(x);
    this.wrap_gravity.zpp_inner._validate = () => this.gravity_validate();
  }

  gravity_invalidate(x: any) {
    if (this.midstep) {
      throw new Error("Error: Space::gravity cannot be set during space step");
    }
    this.gravityx = x.x;
    this.gravityy = x.y;
    const stack = new ZPP_Space._zpp.util.ZNPList_ZPP_Compound();
    let cx_ite = this.bodies.head;
    while (cx_ite != null) {
      const x1 = cx_ite.elt;
      const o = x1;
      if (!o.world) {
        o.component.waket = this.stamp + (this.midstep ? 0 : 1);
        if (o.type == 3) {
          o.kinematicDelaySleep = true;
        }
        if (o.component.sleeping) {
          this.really_wake(o, false);
        }
      }
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = this.compounds.head;
    while (cx_ite1 != null) {
      const i = cx_ite1.elt;
      stack.add(i);
      cx_ite1 = cx_ite1.next;
    }
    while (stack.head != null) {
      const s = stack.pop_unsafe();
      let cx_ite2 = s.bodies.head;
      while (cx_ite2 != null) {
        const x2 = cx_ite2.elt;
        const o1 = x2;
        if (!o1.world) {
          o1.component.waket = this.stamp + (this.midstep ? 0 : 1);
          if (o1.type == 3) {
            o1.kinematicDelaySleep = true;
          }
          if (o1.component.sleeping) {
            this.really_wake(o1, false);
          }
        }
        cx_ite2 = cx_ite2.next;
      }
      let cx_ite3 = s.compounds.head;
      while (cx_ite3 != null) {
        const i1 = cx_ite3.elt;
        stack.add(i1);
        cx_ite3 = cx_ite3.next;
      }
    }
  }

  gravity_validate() {
    this.wrap_gravity.zpp_inner.x = this.gravityx;
    this.wrap_gravity.zpp_inner.y = this.gravityy;
  }

  clear() {
    while (this.listeners.head != null) {
      const c = this.listeners.pop_unsafe();
      this.remListener(c);
    }
    while (this.callbackset_list.next != null) {
      const c1 = this.callbackset_list.pop_unsafe();
      c1.arbiters.clear();
      const o = c1;
      o.int1 = o.int2 = null;
      o.id = o.di = -1;
      o.freed = true;
      o.next = ZPP_CallbackSet.zpp_pool;
      ZPP_CallbackSet.zpp_pool = o;
    }
    while (this.c_arbiters_true.head != null) {
      const arb = this.c_arbiters_true.pop_unsafe();
      if (!arb.cleared) {
        const _this = arb.b1.arbiters;
        let pre = null;
        let cur = _this.head;
        let ret = false;
        while (cur != null) {
          if (cur.elt == arb) {
            let old;
            let ret1;
            if (pre == null) {
              old = _this.head;
              ret1 = old.next;
              _this.head = ret1;
              if (_this.head == null) {
                _this.pushmod = true;
              }
            } else {
              old = pre.next;
              ret1 = old.next;
              pre.next = ret1;
              if (ret1 == null) {
                _this.pushmod = true;
              }
            }
            const o1 = old;
            o1.elt = null;
            o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o1;
            _this.modified = true;
            _this.length--;
            _this.pushmod = true;
            ret = true;
            break;
          }
          pre = cur;
          cur = cur.next;
        }
        const _this1 = arb.b2.arbiters;
        let pre1 = null;
        let cur1 = _this1.head;
        let ret2 = false;
        while (cur1 != null) {
          if (cur1.elt == arb) {
            let old1;
            let ret3;
            if (pre1 == null) {
              old1 = _this1.head;
              ret3 = old1.next;
              _this1.head = ret3;
              if (_this1.head == null) {
                _this1.pushmod = true;
              }
            } else {
              old1 = pre1.next;
              ret3 = old1.next;
              pre1.next = ret3;
              if (ret3 == null) {
                _this1.pushmod = true;
              }
            }
            const o2 = old1;
            o2.elt = null;
            o2.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o2;
            _this1.modified = true;
            _this1.length--;
            _this1.pushmod = true;
            ret2 = true;
            break;
          }
          pre1 = cur1;
          cur1 = cur1.next;
        }
        if (arb.pair != null) {
          arb.pair.arb = null;
          arb.pair = null;
        }
      }
      arb.b1 = arb.b2 = null;
      arb.active = false;
      arb.intchange = false;
      while (arb.contacts.next != null) {
        const _this2 = arb.contacts;
        const ret4 = _this2.next;
        _this2.pop();
        const o3 = ret4;
        o3.arbiter = null;
        o3.next = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = o3;
        const _this3 = arb.innards;
        const ret5 = _this3.next;
        _this3.next = ret5.next;
        ret5._inuse = false;
        if (_this3.next == null) {
          _this3.pushmod = true;
        }
        _this3.modified = true;
        _this3.length--;
      }
      const o4 = arb;
      o4.userdef_dyn_fric = false;
      o4.userdef_stat_fric = false;
      o4.userdef_restitution = false;
      o4.userdef_rfric = false;
      o4.__ref_edge1 = o4.__ref_edge2 = null;
      o4.next = ZPP_ColArbiter.zpp_pool;
      ZPP_ColArbiter.zpp_pool = o4;
      arb.pre_dt = -1.0;
    }
    while (this.c_arbiters_false.head != null) {
      const arb1 = this.c_arbiters_false.pop_unsafe();
      if (!arb1.cleared) {
        const _this4 = arb1.b1.arbiters;
        let pre2 = null;
        let cur2 = _this4.head;
        let ret6 = false;
        while (cur2 != null) {
          if (cur2.elt == arb1) {
            let old2;
            let ret7;
            if (pre2 == null) {
              old2 = _this4.head;
              ret7 = old2.next;
              _this4.head = ret7;
              if (_this4.head == null) {
                _this4.pushmod = true;
              }
            } else {
              old2 = pre2.next;
              ret7 = old2.next;
              pre2.next = ret7;
              if (ret7 == null) {
                _this4.pushmod = true;
              }
            }
            const o5 = old2;
            o5.elt = null;
            o5.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o5;
            _this4.modified = true;
            _this4.length--;
            _this4.pushmod = true;
            ret6 = true;
            break;
          }
          pre2 = cur2;
          cur2 = cur2.next;
        }
        const _this5 = arb1.b2.arbiters;
        let pre3 = null;
        let cur3 = _this5.head;
        let ret8 = false;
        while (cur3 != null) {
          if (cur3.elt == arb1) {
            let old3;
            let ret9;
            if (pre3 == null) {
              old3 = _this5.head;
              ret9 = old3.next;
              _this5.head = ret9;
              if (_this5.head == null) {
                _this5.pushmod = true;
              }
            } else {
              old3 = pre3.next;
              ret9 = old3.next;
              pre3.next = ret9;
              if (ret9 == null) {
                _this5.pushmod = true;
              }
            }
            const o6 = old3;
            o6.elt = null;
            o6.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o6;
            _this5.modified = true;
            _this5.length--;
            _this5.pushmod = true;
            ret8 = true;
            break;
          }
          pre3 = cur3;
          cur3 = cur3.next;
        }
        if (arb1.pair != null) {
          arb1.pair.arb = null;
          arb1.pair = null;
        }
      }
      arb1.b1 = arb1.b2 = null;
      arb1.active = false;
      arb1.intchange = false;
      while (arb1.contacts.next != null) {
        const _this6 = arb1.contacts;
        const ret10 = _this6.next;
        _this6.pop();
        const o7 = ret10;
        o7.arbiter = null;
        o7.next = ZPP_Contact.zpp_pool;
        ZPP_Contact.zpp_pool = o7;
        const _this7 = arb1.innards;
        const ret11 = _this7.next;
        _this7.next = ret11.next;
        ret11._inuse = false;
        if (_this7.next == null) {
          _this7.pushmod = true;
        }
        _this7.modified = true;
        _this7.length--;
      }
      const o8 = arb1;
      o8.userdef_dyn_fric = false;
      o8.userdef_stat_fric = false;
      o8.userdef_restitution = false;
      o8.userdef_rfric = false;
      o8.__ref_edge1 = o8.__ref_edge2 = null;
      o8.next = ZPP_ColArbiter.zpp_pool;
      ZPP_ColArbiter.zpp_pool = o8;
      arb1.pre_dt = -1.0;
    }
    while (this.s_arbiters.head != null) {
      const arb2 = this.s_arbiters.pop_unsafe();
      if (!arb2.cleared) {
        const _this8 = arb2.b1.arbiters;
        let pre4 = null;
        let cur4 = _this8.head;
        let ret12 = false;
        while (cur4 != null) {
          if (cur4.elt == arb2) {
            let old4;
            let ret13;
            if (pre4 == null) {
              old4 = _this8.head;
              ret13 = old4.next;
              _this8.head = ret13;
              if (_this8.head == null) {
                _this8.pushmod = true;
              }
            } else {
              old4 = pre4.next;
              ret13 = old4.next;
              pre4.next = ret13;
              if (ret13 == null) {
                _this8.pushmod = true;
              }
            }
            const o9 = old4;
            o9.elt = null;
            o9.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o9;
            _this8.modified = true;
            _this8.length--;
            _this8.pushmod = true;
            ret12 = true;
            break;
          }
          pre4 = cur4;
          cur4 = cur4.next;
        }
        const _this9 = arb2.b2.arbiters;
        let pre5 = null;
        let cur5 = _this9.head;
        let ret14 = false;
        while (cur5 != null) {
          if (cur5.elt == arb2) {
            let old5;
            let ret15;
            if (pre5 == null) {
              old5 = _this9.head;
              ret15 = old5.next;
              _this9.head = ret15;
              if (_this9.head == null) {
                _this9.pushmod = true;
              }
            } else {
              old5 = pre5.next;
              ret15 = old5.next;
              pre5.next = ret15;
              if (ret15 == null) {
                _this9.pushmod = true;
              }
            }
            const o10 = old5;
            o10.elt = null;
            o10.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o10;
            _this9.modified = true;
            _this9.length--;
            _this9.pushmod = true;
            ret14 = true;
            break;
          }
          pre5 = cur5;
          cur5 = cur5.next;
        }
        if (arb2.pair != null) {
          arb2.pair.arb = null;
          arb2.pair = null;
        }
      }
      arb2.b1 = arb2.b2 = null;
      arb2.active = false;
      arb2.intchange = false;
      const o11 = arb2;
      o11.next = ZPP_SensorArbiter.zpp_pool;
      ZPP_SensorArbiter.zpp_pool = o11;
    }
    while (this.f_arbiters.head != null) {
      const arb3 = this.f_arbiters.pop_unsafe();
      if (!arb3.cleared) {
        const _this10 = arb3.b1.arbiters;
        let pre6 = null;
        let cur6 = _this10.head;
        let ret16 = false;
        while (cur6 != null) {
          if (cur6.elt == arb3) {
            let old6;
            let ret17;
            if (pre6 == null) {
              old6 = _this10.head;
              ret17 = old6.next;
              _this10.head = ret17;
              if (_this10.head == null) {
                _this10.pushmod = true;
              }
            } else {
              old6 = pre6.next;
              ret17 = old6.next;
              pre6.next = ret17;
              if (ret17 == null) {
                _this10.pushmod = true;
              }
            }
            const o12 = old6;
            o12.elt = null;
            o12.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o12;
            _this10.modified = true;
            _this10.length--;
            _this10.pushmod = true;
            ret16 = true;
            break;
          }
          pre6 = cur6;
          cur6 = cur6.next;
        }
        const _this11 = arb3.b2.arbiters;
        let pre7 = null;
        let cur7 = _this11.head;
        let ret18 = false;
        while (cur7 != null) {
          if (cur7.elt == arb3) {
            let old7;
            let ret19;
            if (pre7 == null) {
              old7 = _this11.head;
              ret19 = old7.next;
              _this11.head = ret19;
              if (_this11.head == null) {
                _this11.pushmod = true;
              }
            } else {
              old7 = pre7.next;
              ret19 = old7.next;
              pre7.next = ret19;
              if (ret19 == null) {
                _this11.pushmod = true;
              }
            }
            const o13 = old7;
            o13.elt = null;
            o13.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o13;
            _this11.modified = true;
            _this11.length--;
            _this11.pushmod = true;
            ret18 = true;
            break;
          }
          pre7 = cur7;
          cur7 = cur7.next;
        }
        if (arb3.pair != null) {
          arb3.pair.arb = null;
          arb3.pair = null;
        }
      }
      arb3.b1 = arb3.b2 = null;
      arb3.active = false;
      arb3.intchange = false;
      const o14 = arb3;
      o14.next = ZPP_FluidArbiter.zpp_pool;
      ZPP_FluidArbiter.zpp_pool = o14;
      arb3.pre_dt = -1.0;
    }
    this.bphase.clear();
    while (this.bodies.head != null) {
      const b = this.bodies.pop_unsafe();
      if (b.component != null) {
        const i = b.component.island;
        if (i != null) {
          while (i.comps.head != null) {
            const c2 = i.comps.pop_unsafe();
            c2.sleeping = false;
            c2.island = null;
            c2.parent = c2;
            c2.rank = 0;
          }
          const o15 = i;
          o15.next = ZPP_Island.zpp_pool;
          ZPP_Island.zpp_pool = o15;
        }
      }
      b.removedFromSpace();
      b.space = null;
    }
    while (this.constraints.head != null) {
      const c3 = this.constraints.pop_unsafe();
      if (c3.component != null) {
        const i1 = c3.component.island;
        if (i1 != null) {
          while (i1.comps.head != null) {
            const c4 = i1.comps.pop_unsafe();
            c4.sleeping = false;
            c4.island = null;
            c4.parent = c4;
            c4.rank = 0;
          }
          const o16 = i1;
          o16.next = ZPP_Island.zpp_pool;
          ZPP_Island.zpp_pool = o16;
        }
      }
      c3.removedFromSpace();
      c3.space = null;
    }
    this.kinematics.clear();
    const stack = new ZPP_Space._zpp.util.ZNPList_ZPP_Compound();
    while (this.compounds.head != null) {
      const c5 = this.compounds.pop_unsafe();
      stack.add(c5);
    }
    while (stack.head != null) {
      const comp = stack.pop_unsafe();
      comp.removedFromSpace();
      comp.space = null;
      let cx_ite = comp.bodies.head;
      while (cx_ite != null) {
        const b1 = cx_ite.elt;
        if (b1.component != null) {
          const i2 = b1.component.island;
          if (i2 != null) {
            while (i2.comps.head != null) {
              const c6 = i2.comps.pop_unsafe();
              c6.sleeping = false;
              c6.island = null;
              c6.parent = c6;
              c6.rank = 0;
            }
            const o17 = i2;
            o17.next = ZPP_Island.zpp_pool;
            ZPP_Island.zpp_pool = o17;
          }
        }
        b1.removedFromSpace();
        b1.space = null;
        cx_ite = cx_ite.next;
      }
      let cx_ite1 = comp.constraints.head;
      while (cx_ite1 != null) {
        const c7 = cx_ite1.elt;
        if (c7.component != null) {
          const i3 = c7.component.island;
          if (i3 != null) {
            while (i3.comps.head != null) {
              const c8 = i3.comps.pop_unsafe();
              c8.sleeping = false;
              c8.island = null;
              c8.parent = c8;
              c8.rank = 0;
            }
            const o18 = i3;
            o18.next = ZPP_Island.zpp_pool;
            ZPP_Island.zpp_pool = o18;
          }
        }
        c7.removedFromSpace();
        c7.space = null;
        cx_ite1 = cx_ite1.next;
      }
      let cx_ite2 = comp.compounds.head;
      while (cx_ite2 != null) {
        const i4 = cx_ite2.elt;
        stack.add(i4);
        cx_ite2 = cx_ite2.next;
      }
    }
    this.staticsleep.clear();
    this.live.clear();
    this.live_constraints.clear();
    this.stamp = 0;
    this.time = 0.0;
    this.mrca1.clear();
    this.mrca2.clear();
    this.prelisteners.clear();
    this.cbsets.clear();
  }

  bodies_adder(x: any) {
    if (x.zpp_inner.compound != null) {
      throw new Error(
        "Error: Cannot set the space of a Body belonging to a Compound, only the root Compound space can be set",
      );
    }
    if (x.zpp_inner.space != this) {
      if (x.zpp_inner.space != null) {
        x.zpp_inner.space.outer.zpp_inner.wrap_bodies.remove(x);
      }
      this.addBody(x.zpp_inner);
      return true;
    } else {
      return false;
    }
  }

  bodies_subber(x: any) {
    this.remBody(x.zpp_inner);
  }

  bodies_modifiable() {
    if (this.midstep) {
      throw new Error("Error: Space::bodies cannot be set during space step()");
    }
  }

  compounds_adder(x: any) {
    if (x.zpp_inner.compound != null) {
      throw new Error(
        "Error: Cannot set the space of an inner Compound, only the root Compound space can be set",
      );
    }
    if (x.zpp_inner.space != this) {
      if (x.zpp_inner.space != null) {
        x.zpp_inner.space.wrap_compounds.remove(x);
      }
      this.addCompound(x.zpp_inner);
      return true;
    } else {
      return false;
    }
  }

  compounds_subber(x: any) {
    this.remCompound(x.zpp_inner);
  }

  compounds_modifiable() {
    if (this.midstep) {
      throw new Error("Error: Space::compounds cannot be set during space step()");
    }
  }

  constraints_adder(x: any) {
    if (x.zpp_inner.compound != null) {
      throw new Error(
        "Error: Cannot set the space of a Constraint belonging to a Compound, only the root Compound space can be set",
      );
    }
    if (x.zpp_inner.space != this) {
      if (x.zpp_inner.space != null) {
        x.zpp_inner.space.outer.zpp_inner.wrap_constraints.remove(x);
      }
      this.addConstraint(x.zpp_inner);
      return true;
    } else {
      return false;
    }
  }

  constraints_subber(x: any) {
    this.remConstraint(x.zpp_inner);
  }

  constraints_modifiable() {
    if (this.midstep) {
      throw new Error("Error: Space::constraints cannot be set during space step()");
    }
  }

  listeners_adder(x: any) {
    if (x.zpp_inner.space != this) {
      if (x.zpp_inner.space != null) {
        x.zpp_inner.space.outer.zpp_inner.wrap_listeners.remove(x);
      }
      this.addListener(x.zpp_inner);
      return true;
    } else {
      return false;
    }
  }

  listeners_subber(x: any) {
    this.remListener(x.zpp_inner);
  }

  listeners_modifiable() {
    if (this.midstep) {
      throw new Error("Error: Space::listeners cannot be set during space step()");
    }
  }

  revoke_listener(x: any) {}

  unrevoke_listener(x: any) {}

  addListener(x: any) {
    x.space = this;
    x.addedToSpace();
    const tmp = x.interaction != null;
  }

  remListener(x: any) {
    const tmp = x.interaction != null;
    x.removedFromSpace();
    x.space = null;
  }

  add_callbackset(cb: any) {
    const _this = cb.int1.cbsets;
    let ret;
    if (ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool == null) {
      ret = new ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet();
    } else {
      ret = ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool;
      ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool = ret.next;
      ret.next = null;
    }
    ret.elt = cb;
    const temp = ret;
    temp.next = _this.head;
    _this.head = temp;
    _this.modified = true;
    _this.length++;
    const _this1 = cb.int2.cbsets;
    let ret1;
    if (ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool == null) {
      ret1 = new ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet();
    } else {
      ret1 = ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool;
      ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool = ret1.next;
      ret1.next = null;
    }
    ret1.elt = cb;
    const temp1 = ret1;
    temp1.next = _this1.head;
    _this1.head = temp1;
    _this1.modified = true;
    _this1.length++;
    const _this2 = this.callbackset_list;
    cb._inuse = true;
    const temp2 = cb;
    temp2.next = _this2.next;
    _this2.next = temp2;
    _this2.modified = true;
    _this2.length++;
  }

  remove_callbackset(cb: any) {
    cb.lazydel = true;
    const _this = cb.int1.cbsets;
    let pre = null;
    let cur = _this.head;
    let ret = false;
    while (cur != null) {
      if (cur.elt == cb) {
        let old;
        let ret1;
        if (pre == null) {
          old = _this.head;
          ret1 = old.next;
          _this.head = ret1;
          if (_this.head == null) {
            _this.pushmod = true;
          }
        } else {
          old = pre.next;
          ret1 = old.next;
          pre.next = ret1;
          if (ret1 == null) {
            _this.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool = o;
        _this.modified = true;
        _this.length--;
        _this.pushmod = true;
        ret = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
    const _this1 = cb.int2.cbsets;
    let pre1 = null;
    let cur1 = _this1.head;
    let ret2 = false;
    while (cur1 != null) {
      if (cur1.elt == cb) {
        let old1;
        let ret3;
        if (pre1 == null) {
          old1 = _this1.head;
          ret3 = old1.next;
          _this1.head = ret3;
          if (_this1.head == null) {
            _this1.pushmod = true;
          }
        } else {
          old1 = pre1.next;
          ret3 = old1.next;
          pre1.next = ret3;
          if (ret3 == null) {
            _this1.pushmod = true;
          }
        }
        const o1 = old1;
        o1.elt = null;
        o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_CallbackSet.zpp_pool = o1;
        _this1.modified = true;
        _this1.length--;
        _this1.pushmod = true;
        ret2 = true;
        break;
      }
      pre1 = cur1;
      cur1 = cur1.next;
    }
  }

  transmitType(p: any, new_type: any) {
    const o = p;
    if (!o.world) {
      o.component.waket = this.stamp + (this.midstep ? 0 : 1);
      if (o.type == 3) {
        o.kinematicDelaySleep = true;
      }
      if (o.component.sleeping) {
        this.really_wake(o, false);
      }
    }
    if (p.type == 2) {
      this.live.remove(p);
    } else if (p.type == 3) {
      this.kinematics.remove(p);
      this.staticsleep.remove(p);
    } else if (p.type == 1) {
      this.staticsleep.remove(p);
    }
    p.type = new_type;
    if (p.type == 3) {
      this.kinematics.add(p);
    }
    if (p.type == 1) {
      this.static_validation(p);
    }
    p.component.sleeping = true;
    const o1 = p;
    if (!o1.world) {
      o1.component.waket = this.stamp + (this.midstep ? 0 : 1);
      if (o1.type == 3) {
        o1.kinematicDelaySleep = true;
      }
      if (o1.component.sleeping) {
        this.really_wake(o1, true);
      }
    }
  }

  added_shape(s: any, dontwake: any) {
    if (dontwake == null) {
      dontwake = false;
    }
    if (!dontwake) {
      const o = s.body;
      if (!o.world) {
        o.component.waket = this.stamp + (this.midstep ? 0 : 1);
        if (o.type == 3) {
          o.kinematicDelaySleep = true;
        }
        if (o.component.sleeping) {
          this.really_wake(o, false);
        }
      }
    }
    this.bphase.insert(s);
    s.addedToSpace();
  }

  removed_shape(s: any, deleting: any) {
    if (deleting == null) {
      deleting = false;
    }
    const _gthis = this;
    const body = s.body;
    if (!deleting) {
      body.wake();
    }
    let pre = null;
    let cx_ite = body.arbiters.head;
    while (cx_ite != null) {
      const xarb = cx_ite.elt;
      const rem = xarb.ws1 == s || xarb.ws2 == s;
      if (rem) {
        if (xarb.present != 0) {
          this.MRCA_chains(xarb.ws1, xarb.ws2);
          let cx_ite1 = this.mrca1.head;
          while (cx_ite1 != null) {
            const i1 = cx_ite1.elt;
            let cx_ite2 = this.mrca2.head;
            while (cx_ite2 != null) {
              const i2 = cx_ite2.elt;
              const cb1 = i1.cbSet;
              const cb2 = i2.cbSet;
              cb1.validate();
              cb2.validate();
              const _this = cb1.manager;
              let ret = null;
              const pairs = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
              let cx_ite3 = pairs.head;
              while (cx_ite3 != null) {
                const p = cx_ite3.elt;
                if ((p.a == cb1 && p.b == cb2) || (p.a == cb2 && p.b == cb1)) {
                  ret = p;
                  break;
                }
                cx_ite3 = cx_ite3.next;
              }
              if (ret == null) {
                let ret1;
                if (ZPP_CbSetPair.zpp_pool == null) {
                  ret1 = new ZPP_CbSetPair();
                } else {
                  ret1 = ZPP_CbSetPair.zpp_pool;
                  ZPP_CbSetPair.zpp_pool = ret1.next;
                  ret1.next = null;
                }
                ret1.zip_listeners = true;
                if (ZPP_CbSet.setlt(cb1, cb2)) {
                  ret1.a = cb1;
                  ret1.b = cb2;
                } else {
                  ret1.a = cb2;
                  ret1.b = cb1;
                }
                ret = ret1;
                cb1.cbpairs.add(ret);
                if (cb2 != cb1) {
                  cb2.cbpairs.add(ret);
                }
              }
              if (ret.zip_listeners) {
                ret.zip_listeners = false;
                ret.__validate();
              }
              if (ret.listeners.head == null) {
                cx_ite2 = cx_ite2.next;
                continue;
              }
              const callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i1, i2);
              callbackset.remove_arb(xarb);
              xarb.present--;
              const _this1 = cb1.manager;
              let ret2 = null;
              const pairs1 = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
              let cx_ite4 = pairs1.head;
              while (cx_ite4 != null) {
                const p1 = cx_ite4.elt;
                if ((p1.a == cb1 && p1.b == cb2) || (p1.a == cb2 && p1.b == cb1)) {
                  ret2 = p1;
                  break;
                }
                cx_ite4 = cx_ite4.next;
              }
              if (ret2 == null) {
                let ret3;
                if (ZPP_CbSetPair.zpp_pool == null) {
                  ret3 = new ZPP_CbSetPair();
                } else {
                  ret3 = ZPP_CbSetPair.zpp_pool;
                  ZPP_CbSetPair.zpp_pool = ret3.next;
                  ret3.next = null;
                }
                ret3.zip_listeners = true;
                if (ZPP_CbSet.setlt(cb1, cb2)) {
                  ret3.a = cb1;
                  ret3.b = cb2;
                } else {
                  ret3.a = cb2;
                  ret3.b = cb1;
                }
                ret2 = ret3;
                cb1.cbpairs.add(ret2);
                if (cb2 != cb1) {
                  cb2.cbpairs.add(ret2);
                }
              }
              if (ret2.zip_listeners) {
                ret2.zip_listeners = false;
                ret2.__validate();
              }
              let cx_ite5 = ret2.listeners.head;
              while (cx_ite5 != null) {
                const x = cx_ite5.elt;
                if (x.event == 1) {
                  if ((x.itype & xarb.type) != 0 && callbackset.empty_arb(x.itype)) {
                    const cb = _gthis.push_callback(x);
                    cb.event = 1;
                    const o1 = callbackset.int1;
                    const o2 = callbackset.int2;
                    let tmp;
                    const _this2 = x.options1;
                    const xs = o1.cbTypes;
                    if (
                      _this2.nonemptyintersection(xs, _this2.includes) &&
                      !_this2.nonemptyintersection(xs, _this2.excludes)
                    ) {
                      const _this3 = x.options2;
                      const xs1 = o2.cbTypes;
                      tmp =
                        _this3.nonemptyintersection(xs1, _this3.includes) &&
                        !_this3.nonemptyintersection(xs1, _this3.excludes);
                    } else {
                      tmp = false;
                    }
                    if (tmp) {
                      cb.int1 = o1;
                      cb.int2 = o2;
                    } else {
                      cb.int1 = o2;
                      cb.int2 = o1;
                    }
                    cb.set = callbackset;
                  }
                }
                cx_ite5 = cx_ite5.next;
              }
              if (callbackset.arbiters.head == null) {
                this.remove_callbackset(callbackset);
              }
              cx_ite2 = cx_ite2.next;
            }
            cx_ite1 = cx_ite1.next;
          }
        }
        if (xarb.b1 != body && xarb.b1.type == 2) {
          const o = xarb.b1;
          if (!o.world) {
            o.component.waket = this.stamp + (this.midstep ? 0 : 1);
            if (o.type == 3) {
              o.kinematicDelaySleep = true;
            }
            if (o.component.sleeping) {
              this.really_wake(o, false);
            }
          }
        }
        if (xarb.b2 != body && xarb.b2.type == 2) {
          const o3 = xarb.b2;
          if (!o3.world) {
            o3.component.waket = this.stamp + (this.midstep ? 0 : 1);
            if (o3.type == 3) {
              o3.kinematicDelaySleep = true;
            }
            if (o3.component.sleeping) {
              this.really_wake(o3, false);
            }
          }
        }
        xarb.cleared = true;
        if (body == null || xarb.b2 == body) {
          const _this4 = xarb.b1.arbiters;
          let pre1 = null;
          let cur = _this4.head;
          let ret4 = false;
          while (cur != null) {
            if (cur.elt == xarb) {
              let old;
              let ret5;
              if (pre1 == null) {
                old = _this4.head;
                ret5 = old.next;
                _this4.head = ret5;
                if (_this4.head == null) {
                  _this4.pushmod = true;
                }
              } else {
                old = pre1.next;
                ret5 = old.next;
                pre1.next = ret5;
                if (ret5 == null) {
                  _this4.pushmod = true;
                }
              }
              const o4 = old;
              o4.elt = null;
              o4.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o4;
              _this4.modified = true;
              _this4.length--;
              _this4.pushmod = true;
              ret4 = true;
              break;
            }
            pre1 = cur;
            cur = cur.next;
          }
        }
        if (body == null || xarb.b1 == body) {
          const _this5 = xarb.b2.arbiters;
          let pre2 = null;
          let cur1 = _this5.head;
          let ret6 = false;
          while (cur1 != null) {
            if (cur1.elt == xarb) {
              let old1;
              let ret7;
              if (pre2 == null) {
                old1 = _this5.head;
                ret7 = old1.next;
                _this5.head = ret7;
                if (_this5.head == null) {
                  _this5.pushmod = true;
                }
              } else {
                old1 = pre2.next;
                ret7 = old1.next;
                pre2.next = ret7;
                if (ret7 == null) {
                  _this5.pushmod = true;
                }
              }
              const o5 = old1;
              o5.elt = null;
              o5.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o5;
              _this5.modified = true;
              _this5.length--;
              _this5.pushmod = true;
              ret6 = true;
              break;
            }
            pre2 = cur1;
            cur1 = cur1.next;
          }
        }
        if (xarb.pair != null) {
          xarb.pair.arb = null;
          xarb.pair = null;
        }
        xarb.active = false;
        this.f_arbiters.modified = true;
        cx_ite = body.arbiters.erase(pre);
        continue;
      }
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    this.bphase.remove(s);
    s.removedFromSpace();
  }

  addConstraint(con: any) {
    con.space = this;
    con.addedToSpace();
    if (con.active) {
      con.component.sleeping = true;
      this.wake_constraint(con, true);
    }
  }

  remConstraint(con: any) {
    if (con.active) {
      this.wake_constraint(con, true);
      this.live_constraints.remove(con);
    }
    con.removedFromSpace();
    con.space = null;
  }

  addCompound(x: any) {
    x.space = this;
    x.addedToSpace();
    let cx_ite = x.bodies.head;
    while (cx_ite != null) {
      const i = cx_ite.elt;
      this.addBody(i);
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = x.constraints.head;
    while (cx_ite1 != null) {
      const i1 = cx_ite1.elt;
      this.addConstraint(i1);
      cx_ite1 = cx_ite1.next;
    }
    let cx_ite2 = x.compounds.head;
    while (cx_ite2 != null) {
      const i2 = cx_ite2.elt;
      this.addCompound(i2);
      cx_ite2 = cx_ite2.next;
    }
  }

  remCompound(x: any) {
    let cx_ite = x.bodies.head;
    while (cx_ite != null) {
      const i = cx_ite.elt;
      this.remBody(i);
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = x.constraints.head;
    while (cx_ite1 != null) {
      const i1 = cx_ite1.elt;
      this.remConstraint(i1);
      cx_ite1 = cx_ite1.next;
    }
    let cx_ite2 = x.compounds.head;
    while (cx_ite2 != null) {
      const i2 = cx_ite2.elt;
      this.remCompound(i2);
      cx_ite2 = cx_ite2.next;
    }
    x.removedFromSpace();
    x.space = null;
  }

  addBody(body: any, flag?: any) {
    if (flag == null) {
      flag = -1;
    }
    body.space = this;
    body.addedToSpace();
    body.component.sleeping = true;
    const o = body;
    if (!o.world) {
      o.component.waket = this.stamp + (this.midstep ? 0 : 1);
      if (o.type == 3) {
        o.kinematicDelaySleep = true;
      }
      if (o.component.sleeping) {
        this.really_wake(o, true);
      }
    }
    let cx_ite = body.shapes.head;
    while (cx_ite != null) {
      const shape = cx_ite.elt;
      let dontwake = true;
      if (dontwake == null) {
        dontwake = false;
      }
      if (!dontwake) {
        const o1 = shape.body;
        if (!o1.world) {
          o1.component.waket = this.stamp + (this.midstep ? 0 : 1);
          if (o1.type == 3) {
            o1.kinematicDelaySleep = true;
          }
          if (o1.component.sleeping) {
            this.really_wake(o1, false);
          }
        }
      }
      this.bphase.insert(shape);
      shape.addedToSpace();
      cx_ite = cx_ite.next;
    }
    if (body.type == 1) {
      this.static_validation(body);
    } else if (body.type != 2) {
      if (flag != 3) {
        this.kinematics.add(body);
      }
    }
  }

  remBody(body: any, flag?: any) {
    if (flag == null) {
      flag = -1;
    }
    if (body.type == 1) {
      const o = body;
      if (!o.world) {
        o.component.waket = this.stamp + (this.midstep ? 0 : 1);
        if (o.type == 3) {
          o.kinematicDelaySleep = true;
        }
        if (o.component.sleeping) {
          this.really_wake(o, true);
        }
      }
      this.staticsleep.remove(body);
    } else if (body.type == 2) {
      const o1 = body;
      if (!o1.world) {
        o1.component.waket = this.stamp + (this.midstep ? 0 : 1);
        if (o1.type == 3) {
          o1.kinematicDelaySleep = true;
        }
        if (o1.component.sleeping) {
          this.really_wake(o1, true);
        }
      }
      this.live.remove(body);
    } else {
      if (flag != 3) {
        this.kinematics.remove(body);
      }
      const o2 = body;
      if (!o2.world) {
        o2.component.waket = this.stamp + (this.midstep ? 0 : 1);
        if (o2.type == 3) {
          o2.kinematicDelaySleep = true;
        }
        if (o2.component.sleeping) {
          this.really_wake(o2, true);
        }
      }
      this.staticsleep.remove(body);
    }
    let cx_ite = body.shapes.head;
    while (cx_ite != null) {
      const shape = cx_ite.elt;
      this.removed_shape(shape, true);
      cx_ite = cx_ite.next;
    }
    body.removedFromSpace();
    body.space = null;
  }

  shapesUnderPoint(x: any, y: any, filter: any, output: any) {
    return this.bphase.shapesUnderPoint(x, y, filter, output);
  }

  bodiesUnderPoint(x: any, y: any, filter: any, output: any) {
    return this.bphase.bodiesUnderPoint(x, y, filter, output);
  }

  shapesInAABB(aabb: any, strict: any, cont: any, filter: any, output: any) {
    return this.bphase.shapesInAABB(aabb.zpp_inner, strict, cont, filter, output);
  }

  bodiesInAABB(aabb: any, strict: any, cont: any, filter: any, output: any) {
    return this.bphase.bodiesInAABB(aabb.zpp_inner, strict, cont, filter, output);
  }

  shapesInCircle(pos: any, rad: any, cont: any, filter: any, output: any) {
    const tmp = this.bphase;
    if (pos != null && pos.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this = pos.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    const tmp1 = pos.zpp_inner.x;
    if (pos != null && pos.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this1 = pos.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    return tmp.shapesInCircle(tmp1, pos.zpp_inner.y, rad, cont, filter, output);
  }

  bodiesInCircle(pos: any, rad: any, cont: any, filter: any, output: any) {
    const tmp = this.bphase;
    if (pos != null && pos.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this = pos.zpp_inner;
    if (_this._validate != null) {
      _this._validate();
    }
    const tmp1 = pos.zpp_inner.x;
    if (pos != null && pos.zpp_disp) {
      throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
    }
    const _this1 = pos.zpp_inner;
    if (_this1._validate != null) {
      _this1._validate();
    }
    return tmp.bodiesInCircle(tmp1, pos.zpp_inner.y, rad, cont, filter, output);
  }

  shapesInShape(shape: any, cont: any, filter: any, output: any) {
    return this.bphase.shapesInShape(shape, cont, filter, output);
  }

  bodiesInShape(shape: any, cont: any, filter: any, output: any) {
    return this.bphase.bodiesInShape(shape, cont, filter, output);
  }

  rayCast(ray: any, inner: any, filter: any) {
    return this.bphase.rayCast(ray.zpp_inner, inner, filter == null ? null : filter.zpp_inner);
  }

  rayMultiCast(ray: any, inner: any, filter: any, output: any) {
    return this.bphase.rayMultiCast(
      ray.zpp_inner,
      inner,
      filter == null ? null : filter.zpp_inner,
      output,
    );
  }

  convexCast(shape: any, deltaTime: any, filter: any, dynamics: any) {
    let toi;
    if (ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool == null) {
      toi = new ZPP_Space._zpp.geom.ZPP_ToiEvent();
    } else {
      toi = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
      ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = toi.next;
      toi.next = null;
    }
    toi.failed = false;
    toi.s1 = toi.s2 = null;
    toi.arbiter = null;
    if (shape.type == 0) {
      const _this = shape.circle;
      if (_this.zip_worldCOM) {
        if (_this.body != null) {
          _this.zip_worldCOM = false;
          if (_this.zip_localCOM) {
            _this.zip_localCOM = false;
            if (_this.type == 1) {
              const _this1 = _this.polygon;
              if (_this1.lverts.next == null) {
                throw new Error("Error: An empty polygon has no meaningful localCOM");
              }
              if (_this1.lverts.next.next == null) {
                _this1.localCOMx = _this1.lverts.next.x;
                _this1.localCOMy = _this1.lverts.next.y;
              } else if (_this1.lverts.next.next.next == null) {
                _this1.localCOMx = _this1.lverts.next.x;
                _this1.localCOMy = _this1.lverts.next.y;
                const t = 1.0;
                _this1.localCOMx += _this1.lverts.next.next.x * t;
                _this1.localCOMy += _this1.lverts.next.next.y * t;
                const t1 = 0.5;
                _this1.localCOMx *= t1;
                _this1.localCOMy *= t1;
              } else {
                _this1.localCOMx = 0;
                _this1.localCOMy = 0;
                let area = 0.0;
                let cx_ite = _this1.lverts.next;
                let u = cx_ite;
                cx_ite = cx_ite.next;
                let v = cx_ite;
                cx_ite = cx_ite.next;
                while (cx_ite != null) {
                  const w = cx_ite;
                  area += v.x * (w.y - u.y);
                  const cf = w.y * v.x - w.x * v.y;
                  _this1.localCOMx += (v.x + w.x) * cf;
                  _this1.localCOMy += (v.y + w.y) * cf;
                  u = v;
                  v = w;
                  cx_ite = cx_ite.next;
                }
                cx_ite = _this1.lverts.next;
                const w1 = cx_ite;
                area += v.x * (w1.y - u.y);
                const cf1 = w1.y * v.x - w1.x * v.y;
                _this1.localCOMx += (v.x + w1.x) * cf1;
                _this1.localCOMy += (v.y + w1.y) * cf1;
                u = v;
                v = w1;
                cx_ite = cx_ite.next;
                const w2 = cx_ite;
                area += v.x * (w2.y - u.y);
                const cf2 = w2.y * v.x - w2.x * v.y;
                _this1.localCOMx += (v.x + w2.x) * cf2;
                _this1.localCOMy += (v.y + w2.y) * cf2;
                area = 1 / (3 * area);
                const t2 = area;
                _this1.localCOMx *= t2;
                _this1.localCOMy *= t2;
              }
            }
            if (_this.wrap_localCOM != null) {
              _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
              _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
            }
          }
          const _this2 = _this.body;
          if (_this2.zip_axis) {
            _this2.zip_axis = false;
            _this2.axisx = Math.sin(_this2.rot);
            _this2.axisy = Math.cos(_this2.rot);
          }
          _this.worldCOMx =
            _this.body.posx +
            (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
          _this.worldCOMy =
            _this.body.posy +
            (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
        }
      }
    } else {
      const _this3 = shape.polygon;
      if (_this3.zip_gaxi) {
        if (_this3.body != null) {
          _this3.zip_gaxi = false;
          _this3.validate_laxi();
          const _this4 = _this3.body;
          if (_this4.zip_axis) {
            _this4.zip_axis = false;
            _this4.axisx = Math.sin(_this4.rot);
            _this4.axisy = Math.cos(_this4.rot);
          }
          if (_this3.zip_gverts) {
            if (_this3.body != null) {
              _this3.zip_gverts = false;
              _this3.validate_lverts();
              const _this5 = _this3.body;
              if (_this5.zip_axis) {
                _this5.zip_axis = false;
                _this5.axisx = Math.sin(_this5.rot);
                _this5.axisy = Math.cos(_this5.rot);
              }
              let li = _this3.lverts.next;
              let cx_ite1 = _this3.gverts.next;
              while (cx_ite1 != null) {
                const g = cx_ite1;
                const l = li;
                li = li.next;
                g.x = _this3.body.posx + (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                g.y = _this3.body.posy + (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                cx_ite1 = cx_ite1.next;
              }
            }
          }
          let ite = _this3.edges.head;
          let cx_ite2 = _this3.gverts.next;
          let u1 = cx_ite2;
          cx_ite2 = cx_ite2.next;
          while (cx_ite2 != null) {
            const v1 = cx_ite2;
            const e = ite.elt;
            ite = ite.next;
            e.gp0 = u1;
            e.gp1 = v1;
            e.gnormx = _this3.body.axisy * e.lnormx - _this3.body.axisx * e.lnormy;
            e.gnormy = e.lnormx * _this3.body.axisx + e.lnormy * _this3.body.axisy;
            e.gprojection =
              _this3.body.posx * e.gnormx + _this3.body.posy * e.gnormy + e.lprojection;
            if (e.wrap_gnorm != null) {
              e.wrap_gnorm.zpp_inner.x = e.gnormx;
              e.wrap_gnorm.zpp_inner.y = e.gnormy;
            }
            e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
            e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
            u1 = v1;
            cx_ite2 = cx_ite2.next;
          }
          const v2 = _this3.gverts.next;
          const e1 = ite.elt;
          ite = ite.next;
          e1.gp0 = u1;
          e1.gp1 = v2;
          e1.gnormx = _this3.body.axisy * e1.lnormx - _this3.body.axisx * e1.lnormy;
          e1.gnormy = e1.lnormx * _this3.body.axisx + e1.lnormy * _this3.body.axisy;
          e1.gprojection =
            _this3.body.posx * e1.gnormx + _this3.body.posy * e1.gnormy + e1.lprojection;
          if (e1.wrap_gnorm != null) {
            e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
            e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
          }
          e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
          e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
        }
      }
    }
    const body = shape.body;
    const prex = body.posx;
    const prey = body.posy;
    body.sweepTime = 0;
    body.sweep_angvel = body.angvel;
    const delta = deltaTime - body.sweepTime;
    if (delta != 0) {
      body.sweepTime = deltaTime;
      const t3 = delta;
      body.posx += body.velx * t3;
      body.posy += body.vely * t3;
      if (body.angvel != 0) {
        const dr = body.sweep_angvel * delta;
        body.rot += dr;
        if (dr * dr > 0.0001) {
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        } else {
          const d2 = dr * dr;
          const p = 1 - 0.5 * d2;
          const m = 1 - (d2 * d2) / 8;
          const nx = (p * body.axisx + dr * body.axisy) * m;
          body.axisy = (p * body.axisy - dr * body.axisx) * m;
          body.axisx = nx;
        }
      }
    }
    const postx = body.posx;
    const posty = body.posy;
    shape.validate_sweepRadius();
    const rad = shape.sweepRadius;
    let aabb;
    if (ZPP_AABB.zpp_pool == null) {
      aabb = new ZPP_AABB();
    } else {
      aabb = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = aabb.next;
      aabb.next = null;
    }
    const x = prex;
    const y = postx;
    aabb.minx = (x < y ? x : y) - rad;
    const x1 = prex;
    const y1 = postx;
    aabb.maxx = (x1 > y1 ? x1 : y1) + rad;
    const x2 = prey;
    const y2 = posty;
    aabb.miny = (x2 < y2 ? x2 : y2) - rad;
    const x3 = prey;
    const y3 = posty;
    aabb.maxy = (x3 > y3 ? x3 : y3) + rad;
    const list = (this.convexShapeList = this.bphase.shapesInAABB(
      aabb,
      false,
      false,
      filter == null ? null : filter.zpp_inner,
      this.convexShapeList,
    ));
    const o = aabb;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;
    let minAxisx = 0.0;
    let minAxisy = 0.0;
    minAxisx = 0;
    minAxisy = 0;
    let minPosx = 0.0;
    let minPosy = 0.0;
    minPosx = 0;
    minPosy = 0;
    let mins = null;
    let mint = deltaTime + 1;
    list.zpp_inner.valmod();
    const _g = ZPP_Space._nape.shape.ShapeIterator.get(list);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      const _this6 = _g.zpp_inner;
      _this6.zpp_inner.valmod();
      if (_this6.zpp_inner.zip_length) {
        _this6.zpp_inner.zip_length = false;
        _this6.zpp_inner.user_length = _this6.zpp_inner.inner.length;
      }
      const length = _this6.zpp_inner.user_length;
      _g.zpp_critical = true;
      let tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = ZPP_Space._nape.shape.ShapeIterator.zpp_pool;
        ZPP_Space._nape.shape.ShapeIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      const s = _g.zpp_inner.at(_g.zpp_i++);
      if (
        s != shape.outer &&
        (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null) != body.outer
      ) {
        toi.s1 = shape;
        toi.s2 = s.zpp_inner;
        if (dynamics) {
          s.zpp_inner.validate_sweepRadius();
          (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner.sweep_angvel = (
            s.zpp_inner.body != null ? s.zpp_inner.body.outer : null
          ).zpp_inner.angvel;
          (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner.sweepTime = 0;
          ZPP_SweepDistance.dynamicSweep(toi, deltaTime, 0, 0, true);
          const _this7 = (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner;
          const delta1 = 0 - _this7.sweepTime;
          if (delta1 != 0) {
            _this7.sweepTime = 0;
            const t4 = delta1;
            _this7.posx += _this7.velx * t4;
            _this7.posy += _this7.vely * t4;
            if (_this7.angvel != 0) {
              const dr1 = _this7.sweep_angvel * delta1;
              _this7.rot += dr1;
              if (dr1 * dr1 > 0.0001) {
                _this7.axisx = Math.sin(_this7.rot);
                _this7.axisy = Math.cos(_this7.rot);
              } else {
                const d21 = dr1 * dr1;
                const p1 = 1 - 0.5 * d21;
                const m1 = 1 - (d21 * d21) / 8;
                const nx1 = (p1 * _this7.axisx + dr1 * _this7.axisy) * m1;
                _this7.axisy = (p1 * _this7.axisy - dr1 * _this7.axisx) * m1;
                _this7.axisx = nx1;
              }
            }
          }
          const _this8 = (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner;
          const s1 = s.zpp_inner;
          if (s1.type == 0) {
            s1.worldCOMx =
              _this8.posx + (_this8.axisy * s1.localCOMx - _this8.axisx * s1.localCOMy);
            s1.worldCOMy =
              _this8.posy + (s1.localCOMx * _this8.axisx + s1.localCOMy * _this8.axisy);
          } else {
            const p2 = s1.polygon;
            let li1 = p2.lverts.next;
            let cx_ite3 = p2.gverts.next;
            while (cx_ite3 != null) {
              const g1 = cx_ite3;
              const l1 = li1;
              li1 = li1.next;
              g1.x = _this8.posx + (_this8.axisy * l1.x - _this8.axisx * l1.y);
              g1.y = _this8.posy + (l1.x * _this8.axisx + l1.y * _this8.axisy);
              cx_ite3 = cx_ite3.next;
            }
            let ite1 = p2.edges.head;
            let cx_ite4 = p2.gverts.next;
            let u2 = cx_ite4;
            cx_ite4 = cx_ite4.next;
            while (cx_ite4 != null) {
              const v3 = cx_ite4;
              const e2 = ite1.elt;
              ite1 = ite1.next;
              e2.gnormx = _this8.axisy * e2.lnormx - _this8.axisx * e2.lnormy;
              e2.gnormy = e2.lnormx * _this8.axisx + e2.lnormy * _this8.axisy;
              e2.gprojection = _this8.posx * e2.gnormx + _this8.posy * e2.gnormy + e2.lprojection;
              e2.tp0 = u2.y * e2.gnormx - u2.x * e2.gnormy;
              e2.tp1 = v3.y * e2.gnormx - v3.x * e2.gnormy;
              u2 = v3;
              cx_ite4 = cx_ite4.next;
            }
            const v4 = p2.gverts.next;
            const e3 = ite1.elt;
            ite1 = ite1.next;
            e3.gnormx = _this8.axisy * e3.lnormx - _this8.axisx * e3.lnormy;
            e3.gnormy = e3.lnormx * _this8.axisx + e3.lnormy * _this8.axisy;
            e3.gprojection = _this8.posx * e3.gnormx + _this8.posy * e3.gnormy + e3.lprojection;
            e3.tp0 = u2.y * e3.gnormx - u2.x * e3.gnormy;
            e3.tp1 = v4.y * e3.gnormx - v4.x * e3.gnormy;
          }
        } else {
          ZPP_SweepDistance.staticSweep(toi, deltaTime, 0, 0);
        }
        toi.toi *= deltaTime;
        if (toi.toi > 0 && toi.toi < mint) {
          mint = toi.toi;
          minAxisx = toi.axis.x;
          minAxisy = toi.axis.y;
          minPosx = toi.c2.x;
          minPosy = toi.c2.y;
          mins = s;
        }
      }
    }
    list.clear();
    const o1 = toi;
    o1.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
    ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o1;
    const delta2 = 0 - body.sweepTime;
    if (delta2 != 0) {
      body.sweepTime = 0;
      const t5 = delta2;
      body.posx += body.velx * t5;
      body.posy += body.vely * t5;
      if (body.angvel != 0) {
        const dr2 = body.sweep_angvel * delta2;
        body.rot += dr2;
        if (dr2 * dr2 > 0.0001) {
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        } else {
          const d22 = dr2 * dr2;
          const p3 = 1 - 0.5 * d22;
          const m2 = 1 - (d22 * d22) / 8;
          const nx2 = (p3 * body.axisx + dr2 * body.axisy) * m2;
          body.axisy = (p3 * body.axisy - dr2 * body.axisx) * m2;
          body.axisx = nx2;
        }
      }
    }
    if (shape.type == 0) {
      shape.worldCOMx = body.posx + (body.axisy * shape.localCOMx - body.axisx * shape.localCOMy);
      shape.worldCOMy = body.posy + (shape.localCOMx * body.axisx + shape.localCOMy * body.axisy);
    } else {
      const p4 = shape.polygon;
      let li2 = p4.lverts.next;
      let cx_ite5 = p4.gverts.next;
      while (cx_ite5 != null) {
        const g2 = cx_ite5;
        const l2 = li2;
        li2 = li2.next;
        g2.x = body.posx + (body.axisy * l2.x - body.axisx * l2.y);
        g2.y = body.posy + (l2.x * body.axisx + l2.y * body.axisy);
        cx_ite5 = cx_ite5.next;
      }
      let ite2 = p4.edges.head;
      let cx_ite6 = p4.gverts.next;
      let u3 = cx_ite6;
      cx_ite6 = cx_ite6.next;
      while (cx_ite6 != null) {
        const v5 = cx_ite6;
        const e4 = ite2.elt;
        ite2 = ite2.next;
        e4.gnormx = body.axisy * e4.lnormx - body.axisx * e4.lnormy;
        e4.gnormy = e4.lnormx * body.axisx + e4.lnormy * body.axisy;
        e4.gprojection = body.posx * e4.gnormx + body.posy * e4.gnormy + e4.lprojection;
        e4.tp0 = u3.y * e4.gnormx - u3.x * e4.gnormy;
        e4.tp1 = v5.y * e4.gnormx - v5.x * e4.gnormy;
        u3 = v5;
        cx_ite6 = cx_ite6.next;
      }
      const v6 = p4.gverts.next;
      const e5 = ite2.elt;
      ite2 = ite2.next;
      e5.gnormx = body.axisy * e5.lnormx - body.axisx * e5.lnormy;
      e5.gnormy = e5.lnormx * body.axisx + e5.lnormy * body.axisy;
      e5.gprojection = body.posx * e5.gnormx + body.posy * e5.gnormy + e5.lprojection;
      e5.tp0 = u3.y * e5.gnormx - u3.x * e5.gnormy;
      e5.tp1 = v6.y * e5.gnormx - v6.x * e5.gnormy;
    }
    if (mint <= deltaTime) {
      let x4 = -minAxisx;
      let y4 = -minAxisy;
      if (y4 == null) {
        y4 = 0;
      }
      if (x4 == null) {
        x4 = 0;
      }
      if (x4 != x4 || y4 != y4) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let ret;
      if (ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 == null) {
        ret = new ZPP_Space._nape.geom.Vec2();
      } else {
        ret = ZPP_Space._zpp.util.ZPP_PubPool.poolVec2;
        ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 = ret.zpp_pool;
        ret.zpp_pool = null;
        ret.zpp_disp = false;
        if (ret == ZPP_Space._zpp.util.ZPP_PubPool.nextVec2) {
          ZPP_Space._zpp.util.ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret.zpp_inner == null) {
        let ret1;
        if (ZPP_Vec2.zpp_pool == null) {
          ret1 = new ZPP_Vec2();
        } else {
          ret1 = ZPP_Vec2.zpp_pool;
          ZPP_Vec2.zpp_pool = ret1.next;
          ret1.next = null;
        }
        ret1.weak = false;
        ret1._immutable = false;
        ret1.x = x4;
        ret1.y = y4;
        ret.zpp_inner = ret1;
        ret.zpp_inner.outer = ret;
      } else {
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this9 = ret.zpp_inner;
        if (_this9._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this9._isimmutable != null) {
          _this9._isimmutable();
        }
        if (x4 != x4 || y4 != y4) {
          throw new Error("Error: Vec2 components cannot be NaN");
        }
        let tmp1;
        if (ret != null && ret.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this10 = ret.zpp_inner;
        if (_this10._validate != null) {
          _this10._validate();
        }
        if (ret.zpp_inner.x == x4) {
          if (ret != null && ret.zpp_disp) {
            throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
          }
          const _this11 = ret.zpp_inner;
          if (_this11._validate != null) {
            _this11._validate();
          }
          tmp1 = ret.zpp_inner.y == y4;
        } else {
          tmp1 = false;
        }
        if (!tmp1) {
          ret.zpp_inner.x = x4;
          ret.zpp_inner.y = y4;
          const _this12 = ret.zpp_inner;
          if (_this12._invalidate != null) {
            _this12._invalidate(_this12);
          }
        }
      }
      ret.zpp_inner.weak = false;
      let x5 = minPosx;
      let y5 = minPosy;
      if (y5 == null) {
        y5 = 0;
      }
      if (x5 == null) {
        x5 = 0;
      }
      if (x5 != x5 || y5 != y5) {
        throw new Error("Error: Vec2 components cannot be NaN");
      }
      let ret2;
      if (ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 == null) {
        ret2 = new ZPP_Space._nape.geom.Vec2();
      } else {
        ret2 = ZPP_Space._zpp.util.ZPP_PubPool.poolVec2;
        ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 = ret2.zpp_pool;
        ret2.zpp_pool = null;
        ret2.zpp_disp = false;
        if (ret2 == ZPP_Space._zpp.util.ZPP_PubPool.nextVec2) {
          ZPP_Space._zpp.util.ZPP_PubPool.nextVec2 = null;
        }
      }
      if (ret2.zpp_inner == null) {
        let ret3;
        if (ZPP_Vec2.zpp_pool == null) {
          ret3 = new ZPP_Vec2();
        } else {
          ret3 = ZPP_Vec2.zpp_pool;
          ZPP_Vec2.zpp_pool = ret3.next;
          ret3.next = null;
        }
        ret3.weak = false;
        ret3._immutable = false;
        ret3.x = x5;
        ret3.y = y5;
        ret2.zpp_inner = ret3;
        ret2.zpp_inner.outer = ret2;
      } else {
        if (ret2 != null && ret2.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this13 = ret2.zpp_inner;
        if (_this13._immutable) {
          throw new Error("Error: Vec2 is immutable");
        }
        if (_this13._isimmutable != null) {
          _this13._isimmutable();
        }
        if (x5 != x5 || y5 != y5) {
          throw new Error("Error: Vec2 components cannot be NaN");
        }
        let tmp2;
        if (ret2 != null && ret2.zpp_disp) {
          throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
        }
        const _this14 = ret2.zpp_inner;
        if (_this14._validate != null) {
          _this14._validate();
        }
        if (ret2.zpp_inner.x == x5) {
          if (ret2 != null && ret2.zpp_disp) {
            throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
          }
          const _this15 = ret2.zpp_inner;
          if (_this15._validate != null) {
            _this15._validate();
          }
          tmp2 = ret2.zpp_inner.y == y5;
        } else {
          tmp2 = false;
        }
        if (!tmp2) {
          ret2.zpp_inner.x = x5;
          ret2.zpp_inner.y = y5;
          const _this16 = ret2.zpp_inner;
          if (_this16._invalidate != null) {
            _this16._invalidate(_this16);
          }
        }
      }
      ret2.zpp_inner.weak = false;
      return ZPP_Space._zpp.geom.ZPP_ConvexRayResult.getConvex(ret, ret2, mint, mins);
    } else {
      return null;
    }
  }

  prepareCast(s: any) {
    if (s.type == 0) {
      const _this = s.circle;
      if (_this.zip_worldCOM) {
        if (_this.body != null) {
          _this.zip_worldCOM = false;
          if (_this.zip_localCOM) {
            _this.zip_localCOM = false;
            if (_this.type == 1) {
              const _this1 = _this.polygon;
              if (_this1.lverts.next == null) {
                throw new Error("Error: An empty polygon has no meaningful localCOM");
              }
              if (_this1.lverts.next.next == null) {
                _this1.localCOMx = _this1.lverts.next.x;
                _this1.localCOMy = _this1.lverts.next.y;
              } else if (_this1.lverts.next.next.next == null) {
                _this1.localCOMx = _this1.lverts.next.x;
                _this1.localCOMy = _this1.lverts.next.y;
                const t = 1.0;
                _this1.localCOMx += _this1.lverts.next.next.x * t;
                _this1.localCOMy += _this1.lverts.next.next.y * t;
                const t1 = 0.5;
                _this1.localCOMx *= t1;
                _this1.localCOMy *= t1;
              } else {
                _this1.localCOMx = 0;
                _this1.localCOMy = 0;
                let area = 0.0;
                let cx_ite = _this1.lverts.next;
                let u = cx_ite;
                cx_ite = cx_ite.next;
                let v = cx_ite;
                cx_ite = cx_ite.next;
                while (cx_ite != null) {
                  const w = cx_ite;
                  area += v.x * (w.y - u.y);
                  const cf = w.y * v.x - w.x * v.y;
                  _this1.localCOMx += (v.x + w.x) * cf;
                  _this1.localCOMy += (v.y + w.y) * cf;
                  u = v;
                  v = w;
                  cx_ite = cx_ite.next;
                }
                cx_ite = _this1.lverts.next;
                const w1 = cx_ite;
                area += v.x * (w1.y - u.y);
                const cf1 = w1.y * v.x - w1.x * v.y;
                _this1.localCOMx += (v.x + w1.x) * cf1;
                _this1.localCOMy += (v.y + w1.y) * cf1;
                u = v;
                v = w1;
                cx_ite = cx_ite.next;
                const w2 = cx_ite;
                area += v.x * (w2.y - u.y);
                const cf2 = w2.y * v.x - w2.x * v.y;
                _this1.localCOMx += (v.x + w2.x) * cf2;
                _this1.localCOMy += (v.y + w2.y) * cf2;
                area = 1 / (3 * area);
                const t2 = area;
                _this1.localCOMx *= t2;
                _this1.localCOMy *= t2;
              }
            }
            if (_this.wrap_localCOM != null) {
              _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
              _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
            }
          }
          const _this2 = _this.body;
          if (_this2.zip_axis) {
            _this2.zip_axis = false;
            _this2.axisx = Math.sin(_this2.rot);
            _this2.axisy = Math.cos(_this2.rot);
          }
          _this.worldCOMx =
            _this.body.posx +
            (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
          _this.worldCOMy =
            _this.body.posy +
            (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
        }
      }
    } else {
      const _this3 = s.polygon;
      if (_this3.zip_gaxi) {
        if (_this3.body != null) {
          _this3.zip_gaxi = false;
          _this3.validate_laxi();
          const _this4 = _this3.body;
          if (_this4.zip_axis) {
            _this4.zip_axis = false;
            _this4.axisx = Math.sin(_this4.rot);
            _this4.axisy = Math.cos(_this4.rot);
          }
          if (_this3.zip_gverts) {
            if (_this3.body != null) {
              _this3.zip_gverts = false;
              _this3.validate_lverts();
              const _this5 = _this3.body;
              if (_this5.zip_axis) {
                _this5.zip_axis = false;
                _this5.axisx = Math.sin(_this5.rot);
                _this5.axisy = Math.cos(_this5.rot);
              }
              let li = _this3.lverts.next;
              let cx_ite1 = _this3.gverts.next;
              while (cx_ite1 != null) {
                const g = cx_ite1;
                const l = li;
                li = li.next;
                g.x = _this3.body.posx + (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                g.y = _this3.body.posy + (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                cx_ite1 = cx_ite1.next;
              }
            }
          }
          let ite = _this3.edges.head;
          let cx_ite2 = _this3.gverts.next;
          let u1 = cx_ite2;
          cx_ite2 = cx_ite2.next;
          while (cx_ite2 != null) {
            const v1 = cx_ite2;
            const e = ite.elt;
            ite = ite.next;
            e.gp0 = u1;
            e.gp1 = v1;
            e.gnormx = _this3.body.axisy * e.lnormx - _this3.body.axisx * e.lnormy;
            e.gnormy = e.lnormx * _this3.body.axisx + e.lnormy * _this3.body.axisy;
            e.gprojection =
              _this3.body.posx * e.gnormx + _this3.body.posy * e.gnormy + e.lprojection;
            if (e.wrap_gnorm != null) {
              e.wrap_gnorm.zpp_inner.x = e.gnormx;
              e.wrap_gnorm.zpp_inner.y = e.gnormy;
            }
            e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
            e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
            u1 = v1;
            cx_ite2 = cx_ite2.next;
          }
          const v2 = _this3.gverts.next;
          const e1 = ite.elt;
          ite = ite.next;
          e1.gp0 = u1;
          e1.gp1 = v2;
          e1.gnormx = _this3.body.axisy * e1.lnormx - _this3.body.axisx * e1.lnormy;
          e1.gnormy = e1.lnormx * _this3.body.axisx + e1.lnormy * _this3.body.axisy;
          e1.gprojection =
            _this3.body.posx * e1.gnormx + _this3.body.posy * e1.gnormy + e1.lprojection;
          if (e1.wrap_gnorm != null) {
            e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
            e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
          }
          e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
          e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
        }
      }
    }
  }

  convexMultiCast(shape: any, deltaTime: any, filter: any, dynamics: any, output: any) {
    let toi;
    if (ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool == null) {
      toi = new ZPP_Space._zpp.geom.ZPP_ToiEvent();
    } else {
      toi = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
      ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = toi.next;
      toi.next = null;
    }
    toi.failed = false;
    toi.s1 = toi.s2 = null;
    toi.arbiter = null;
    if (shape.type == 0) {
      const _this = shape.circle;
      if (_this.zip_worldCOM) {
        if (_this.body != null) {
          _this.zip_worldCOM = false;
          if (_this.zip_localCOM) {
            _this.zip_localCOM = false;
            if (_this.type == 1) {
              const _this1 = _this.polygon;
              if (_this1.lverts.next == null) {
                throw new Error("Error: An empty polygon has no meaningful localCOM");
              }
              if (_this1.lverts.next.next == null) {
                _this1.localCOMx = _this1.lverts.next.x;
                _this1.localCOMy = _this1.lverts.next.y;
              } else if (_this1.lverts.next.next.next == null) {
                _this1.localCOMx = _this1.lverts.next.x;
                _this1.localCOMy = _this1.lverts.next.y;
                const t = 1.0;
                _this1.localCOMx += _this1.lverts.next.next.x * t;
                _this1.localCOMy += _this1.lverts.next.next.y * t;
                const t1 = 0.5;
                _this1.localCOMx *= t1;
                _this1.localCOMy *= t1;
              } else {
                _this1.localCOMx = 0;
                _this1.localCOMy = 0;
                let area = 0.0;
                let cx_ite = _this1.lverts.next;
                let u = cx_ite;
                cx_ite = cx_ite.next;
                let v = cx_ite;
                cx_ite = cx_ite.next;
                while (cx_ite != null) {
                  const w = cx_ite;
                  area += v.x * (w.y - u.y);
                  const cf = w.y * v.x - w.x * v.y;
                  _this1.localCOMx += (v.x + w.x) * cf;
                  _this1.localCOMy += (v.y + w.y) * cf;
                  u = v;
                  v = w;
                  cx_ite = cx_ite.next;
                }
                cx_ite = _this1.lverts.next;
                const w1 = cx_ite;
                area += v.x * (w1.y - u.y);
                const cf1 = w1.y * v.x - w1.x * v.y;
                _this1.localCOMx += (v.x + w1.x) * cf1;
                _this1.localCOMy += (v.y + w1.y) * cf1;
                u = v;
                v = w1;
                cx_ite = cx_ite.next;
                const w2 = cx_ite;
                area += v.x * (w2.y - u.y);
                const cf2 = w2.y * v.x - w2.x * v.y;
                _this1.localCOMx += (v.x + w2.x) * cf2;
                _this1.localCOMy += (v.y + w2.y) * cf2;
                area = 1 / (3 * area);
                const t2 = area;
                _this1.localCOMx *= t2;
                _this1.localCOMy *= t2;
              }
            }
            if (_this.wrap_localCOM != null) {
              _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
              _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
            }
          }
          const _this2 = _this.body;
          if (_this2.zip_axis) {
            _this2.zip_axis = false;
            _this2.axisx = Math.sin(_this2.rot);
            _this2.axisy = Math.cos(_this2.rot);
          }
          _this.worldCOMx =
            _this.body.posx +
            (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
          _this.worldCOMy =
            _this.body.posy +
            (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
        }
      }
    } else {
      const _this3 = shape.polygon;
      if (_this3.zip_gaxi) {
        if (_this3.body != null) {
          _this3.zip_gaxi = false;
          _this3.validate_laxi();
          const _this4 = _this3.body;
          if (_this4.zip_axis) {
            _this4.zip_axis = false;
            _this4.axisx = Math.sin(_this4.rot);
            _this4.axisy = Math.cos(_this4.rot);
          }
          if (_this3.zip_gverts) {
            if (_this3.body != null) {
              _this3.zip_gverts = false;
              _this3.validate_lverts();
              const _this5 = _this3.body;
              if (_this5.zip_axis) {
                _this5.zip_axis = false;
                _this5.axisx = Math.sin(_this5.rot);
                _this5.axisy = Math.cos(_this5.rot);
              }
              let li = _this3.lverts.next;
              let cx_ite1 = _this3.gverts.next;
              while (cx_ite1 != null) {
                const g = cx_ite1;
                const l = li;
                li = li.next;
                g.x = _this3.body.posx + (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                g.y = _this3.body.posy + (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                cx_ite1 = cx_ite1.next;
              }
            }
          }
          let ite = _this3.edges.head;
          let cx_ite2 = _this3.gverts.next;
          let u1 = cx_ite2;
          cx_ite2 = cx_ite2.next;
          while (cx_ite2 != null) {
            const v1 = cx_ite2;
            const e = ite.elt;
            ite = ite.next;
            e.gp0 = u1;
            e.gp1 = v1;
            e.gnormx = _this3.body.axisy * e.lnormx - _this3.body.axisx * e.lnormy;
            e.gnormy = e.lnormx * _this3.body.axisx + e.lnormy * _this3.body.axisy;
            e.gprojection =
              _this3.body.posx * e.gnormx + _this3.body.posy * e.gnormy + e.lprojection;
            if (e.wrap_gnorm != null) {
              e.wrap_gnorm.zpp_inner.x = e.gnormx;
              e.wrap_gnorm.zpp_inner.y = e.gnormy;
            }
            e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
            e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
            u1 = v1;
            cx_ite2 = cx_ite2.next;
          }
          const v2 = _this3.gverts.next;
          const e1 = ite.elt;
          ite = ite.next;
          e1.gp0 = u1;
          e1.gp1 = v2;
          e1.gnormx = _this3.body.axisy * e1.lnormx - _this3.body.axisx * e1.lnormy;
          e1.gnormy = e1.lnormx * _this3.body.axisx + e1.lnormy * _this3.body.axisy;
          e1.gprojection =
            _this3.body.posx * e1.gnormx + _this3.body.posy * e1.gnormy + e1.lprojection;
          if (e1.wrap_gnorm != null) {
            e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
            e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
          }
          e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
          e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
        }
      }
    }
    const body = shape.body;
    const prex = body.posx;
    const prey = body.posy;
    body.sweepTime = 0;
    body.sweep_angvel = body.angvel;
    const delta = deltaTime - body.sweepTime;
    if (delta != 0) {
      body.sweepTime = deltaTime;
      const t3 = delta;
      body.posx += body.velx * t3;
      body.posy += body.vely * t3;
      if (body.angvel != 0) {
        const dr = body.sweep_angvel * delta;
        body.rot += dr;
        if (dr * dr > 0.0001) {
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        } else {
          const d2 = dr * dr;
          const p = 1 - 0.5 * d2;
          const m = 1 - (d2 * d2) / 8;
          const nx = (p * body.axisx + dr * body.axisy) * m;
          body.axisy = (p * body.axisy - dr * body.axisx) * m;
          body.axisx = nx;
        }
      }
    }
    const postx = body.posx;
    const posty = body.posy;
    shape.validate_sweepRadius();
    const rad = shape.sweepRadius;
    let aabb;
    if (ZPP_AABB.zpp_pool == null) {
      aabb = new ZPP_AABB();
    } else {
      aabb = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = aabb.next;
      aabb.next = null;
    }
    const x = prex;
    const y = postx;
    aabb.minx = (x < y ? x : y) - rad;
    const x1 = prex;
    const y1 = postx;
    aabb.maxx = (x1 > y1 ? x1 : y1) + rad;
    const x2 = prey;
    const y2 = posty;
    aabb.miny = (x2 < y2 ? x2 : y2) - rad;
    const x3 = prey;
    const y3 = posty;
    aabb.maxy = (x3 > y3 ? x3 : y3) + rad;
    const list = (this.convexShapeList = this.bphase.shapesInAABB(
      aabb,
      false,
      false,
      filter == null ? null : filter.zpp_inner,
      this.convexShapeList,
    ));
    const o = aabb;
    if (o.outer != null) {
      o.outer.zpp_inner = null;
      o.outer = null;
    }
    o.wrap_min = o.wrap_max = null;
    o._invalidate = null;
    o._validate = null;
    o.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = o;
    const ret = output == null ? new ZPP_Space._nape.geom.ConvexResultList() : output;
    list.zpp_inner.valmod();
    const _g = ZPP_Space._nape.shape.ShapeIterator.get(list);
    while (true) {
      _g.zpp_inner.zpp_inner.valmod();
      const _this6 = _g.zpp_inner;
      _this6.zpp_inner.valmod();
      if (_this6.zpp_inner.zip_length) {
        _this6.zpp_inner.zip_length = false;
        _this6.zpp_inner.user_length = _this6.zpp_inner.inner.length;
      }
      const length = _this6.zpp_inner.user_length;
      _g.zpp_critical = true;
      let tmp;
      if (_g.zpp_i < length) {
        tmp = true;
      } else {
        _g.zpp_next = ZPP_Space._nape.shape.ShapeIterator.zpp_pool;
        ZPP_Space._nape.shape.ShapeIterator.zpp_pool = _g;
        _g.zpp_inner = null;
        tmp = false;
      }
      if (!tmp) {
        break;
      }
      _g.zpp_critical = false;
      const s = _g.zpp_inner.at(_g.zpp_i++);
      if (
        s != shape.outer &&
        (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null) != body.outer
      ) {
        toi.s1 = shape;
        toi.s2 = s.zpp_inner;
        if (dynamics) {
          s.zpp_inner.validate_sweepRadius();
          (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner.sweep_angvel = (
            s.zpp_inner.body != null ? s.zpp_inner.body.outer : null
          ).zpp_inner.angvel;
          (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner.sweepTime = 0;
          ZPP_SweepDistance.dynamicSweep(toi, deltaTime, 0, 0, true);
          const _this7 = (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner;
          const delta1 = 0 - _this7.sweepTime;
          if (delta1 != 0) {
            _this7.sweepTime = 0;
            const t4 = delta1;
            _this7.posx += _this7.velx * t4;
            _this7.posy += _this7.vely * t4;
            if (_this7.angvel != 0) {
              const dr1 = _this7.sweep_angvel * delta1;
              _this7.rot += dr1;
              if (dr1 * dr1 > 0.0001) {
                _this7.axisx = Math.sin(_this7.rot);
                _this7.axisy = Math.cos(_this7.rot);
              } else {
                const d21 = dr1 * dr1;
                const p1 = 1 - 0.5 * d21;
                const m1 = 1 - (d21 * d21) / 8;
                const nx1 = (p1 * _this7.axisx + dr1 * _this7.axisy) * m1;
                _this7.axisy = (p1 * _this7.axisy - dr1 * _this7.axisx) * m1;
                _this7.axisx = nx1;
              }
            }
          }
          const _this8 = (s.zpp_inner.body != null ? s.zpp_inner.body.outer : null).zpp_inner;
          const s1 = s.zpp_inner;
          if (s1.type == 0) {
            s1.worldCOMx =
              _this8.posx + (_this8.axisy * s1.localCOMx - _this8.axisx * s1.localCOMy);
            s1.worldCOMy =
              _this8.posy + (s1.localCOMx * _this8.axisx + s1.localCOMy * _this8.axisy);
          } else {
            const p2 = s1.polygon;
            let li1 = p2.lverts.next;
            let cx_ite3 = p2.gverts.next;
            while (cx_ite3 != null) {
              const g1 = cx_ite3;
              const l1 = li1;
              li1 = li1.next;
              g1.x = _this8.posx + (_this8.axisy * l1.x - _this8.axisx * l1.y);
              g1.y = _this8.posy + (l1.x * _this8.axisx + l1.y * _this8.axisy);
              cx_ite3 = cx_ite3.next;
            }
            let ite1 = p2.edges.head;
            let cx_ite4 = p2.gverts.next;
            let u2 = cx_ite4;
            cx_ite4 = cx_ite4.next;
            while (cx_ite4 != null) {
              const v3 = cx_ite4;
              const e2 = ite1.elt;
              ite1 = ite1.next;
              e2.gnormx = _this8.axisy * e2.lnormx - _this8.axisx * e2.lnormy;
              e2.gnormy = e2.lnormx * _this8.axisx + e2.lnormy * _this8.axisy;
              e2.gprojection = _this8.posx * e2.gnormx + _this8.posy * e2.gnormy + e2.lprojection;
              e2.tp0 = u2.y * e2.gnormx - u2.x * e2.gnormy;
              e2.tp1 = v3.y * e2.gnormx - v3.x * e2.gnormy;
              u2 = v3;
              cx_ite4 = cx_ite4.next;
            }
            const v4 = p2.gverts.next;
            const e3 = ite1.elt;
            ite1 = ite1.next;
            e3.gnormx = _this8.axisy * e3.lnormx - _this8.axisx * e3.lnormy;
            e3.gnormy = e3.lnormx * _this8.axisx + e3.lnormy * _this8.axisy;
            e3.gprojection = _this8.posx * e3.gnormx + _this8.posy * e3.gnormy + e3.lprojection;
            e3.tp0 = u2.y * e3.gnormx - u2.x * e3.gnormy;
            e3.tp1 = v4.y * e3.gnormx - v4.x * e3.gnormy;
          }
        } else {
          ZPP_SweepDistance.staticSweep(toi, deltaTime, 0, 0);
        }
        toi.toi *= deltaTime;
        if (toi.toi > 0) {
          let x4 = -toi.axis.x;
          let y4 = -toi.axis.y;
          if (y4 == null) {
            y4 = 0;
          }
          if (x4 == null) {
            x4 = 0;
          }
          if (x4 != x4 || y4 != y4) {
            throw new Error("Error: Vec2 components cannot be NaN");
          }
          let ret1;
          if (ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 == null) {
            ret1 = new ZPP_Space._nape.geom.Vec2();
          } else {
            ret1 = ZPP_Space._zpp.util.ZPP_PubPool.poolVec2;
            ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 = ret1.zpp_pool;
            ret1.zpp_pool = null;
            ret1.zpp_disp = false;
            if (ret1 == ZPP_Space._zpp.util.ZPP_PubPool.nextVec2) {
              ZPP_Space._zpp.util.ZPP_PubPool.nextVec2 = null;
            }
          }
          if (ret1.zpp_inner == null) {
            let ret2;
            if (ZPP_Vec2.zpp_pool == null) {
              ret2 = new ZPP_Vec2();
            } else {
              ret2 = ZPP_Vec2.zpp_pool;
              ZPP_Vec2.zpp_pool = ret2.next;
              ret2.next = null;
            }
            ret2.weak = false;
            ret2._immutable = false;
            ret2.x = x4;
            ret2.y = y4;
            ret1.zpp_inner = ret2;
            ret1.zpp_inner.outer = ret1;
          } else {
            if (ret1 != null && ret1.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this9 = ret1.zpp_inner;
            if (_this9._immutable) {
              throw new Error("Error: Vec2 is immutable");
            }
            if (_this9._isimmutable != null) {
              _this9._isimmutable();
            }
            if (x4 != x4 || y4 != y4) {
              throw new Error("Error: Vec2 components cannot be NaN");
            }
            let res;
            if (ret1 != null && ret1.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this10 = ret1.zpp_inner;
            if (_this10._validate != null) {
              _this10._validate();
            }
            if (ret1.zpp_inner.x == x4) {
              if (ret1 != null && ret1.zpp_disp) {
                throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
              }
              const _this11 = ret1.zpp_inner;
              if (_this11._validate != null) {
                _this11._validate();
              }
              res = ret1.zpp_inner.y == y4;
            } else {
              res = false;
            }
            if (!res) {
              ret1.zpp_inner.x = x4;
              ret1.zpp_inner.y = y4;
              const _this12 = ret1.zpp_inner;
              if (_this12._invalidate != null) {
                _this12._invalidate(_this12);
              }
            }
          }
          ret1.zpp_inner.weak = false;
          let x5 = toi.c2.x;
          let y5 = toi.c2.y;
          if (y5 == null) {
            y5 = 0;
          }
          if (x5 == null) {
            x5 = 0;
          }
          if (x5 != x5 || y5 != y5) {
            throw new Error("Error: Vec2 components cannot be NaN");
          }
          let ret3;
          if (ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 == null) {
            ret3 = new ZPP_Space._nape.geom.Vec2();
          } else {
            ret3 = ZPP_Space._zpp.util.ZPP_PubPool.poolVec2;
            ZPP_Space._zpp.util.ZPP_PubPool.poolVec2 = ret3.zpp_pool;
            ret3.zpp_pool = null;
            ret3.zpp_disp = false;
            if (ret3 == ZPP_Space._zpp.util.ZPP_PubPool.nextVec2) {
              ZPP_Space._zpp.util.ZPP_PubPool.nextVec2 = null;
            }
          }
          if (ret3.zpp_inner == null) {
            let ret4;
            if (ZPP_Vec2.zpp_pool == null) {
              ret4 = new ZPP_Vec2();
            } else {
              ret4 = ZPP_Vec2.zpp_pool;
              ZPP_Vec2.zpp_pool = ret4.next;
              ret4.next = null;
            }
            ret4.weak = false;
            ret4._immutable = false;
            ret4.x = x5;
            ret4.y = y5;
            ret3.zpp_inner = ret4;
            ret3.zpp_inner.outer = ret3;
          } else {
            if (ret3 != null && ret3.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this13 = ret3.zpp_inner;
            if (_this13._immutable) {
              throw new Error("Error: Vec2 is immutable");
            }
            if (_this13._isimmutable != null) {
              _this13._isimmutable();
            }
            if (x5 != x5 || y5 != y5) {
              throw new Error("Error: Vec2 components cannot be NaN");
            }
            let res1;
            if (ret3 != null && ret3.zpp_disp) {
              throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
            }
            const _this14 = ret3.zpp_inner;
            if (_this14._validate != null) {
              _this14._validate();
            }
            if (ret3.zpp_inner.x == x5) {
              if (ret3 != null && ret3.zpp_disp) {
                throw new Error("Error: " + "Vec2" + " has been disposed and cannot be used!");
              }
              const _this15 = ret3.zpp_inner;
              if (_this15._validate != null) {
                _this15._validate();
              }
              res1 = ret3.zpp_inner.y == y5;
            } else {
              res1 = false;
            }
            if (!res1) {
              ret3.zpp_inner.x = x5;
              ret3.zpp_inner.y = y5;
              const _this16 = ret3.zpp_inner;
              if (_this16._invalidate != null) {
                _this16._invalidate(_this16);
              }
            }
          }
          ret3.zpp_inner.weak = false;
          const res2 = ZPP_Space._zpp.geom.ZPP_ConvexRayResult.getConvex(ret1, ret3, toi.toi, s);
          let pre = null;
          let cx_ite5 = ret.zpp_inner.inner.head;
          while (cx_ite5 != null) {
            const j = cx_ite5.elt;
            if (res2.zpp_inner.next != null) {
              throw new Error("Error: This object has been disposed of and cannot be used");
            }
            if (j.zpp_inner.next != null) {
              throw new Error("Error: This object has been disposed of and cannot be used");
            }
            if (res2.zpp_inner.toiDistance < j.zpp_inner.toiDistance) {
              break;
            }
            pre = cx_ite5;
            cx_ite5 = cx_ite5.next;
          }
          const _this17 = ret.zpp_inner.inner;
          let ret5;
          if (ZPP_Space._zpp.util.ZNPNode_ConvexResult.zpp_pool == null) {
            ret5 = new ZPP_Space._zpp.util.ZNPNode_ConvexResult();
          } else {
            ret5 = ZPP_Space._zpp.util.ZNPNode_ConvexResult.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ConvexResult.zpp_pool = ret5.next;
            ret5.next = null;
          }
          ret5.elt = res2;
          const temp = ret5;
          if (pre == null) {
            temp.next = _this17.head;
            _this17.head = temp;
          } else {
            temp.next = pre.next;
            pre.next = temp;
          }
          _this17.pushmod = _this17.modified = true;
          _this17.length++;
        }
      }
    }
    list.clear();
    const o1 = toi;
    o1.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
    ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o1;
    const delta2 = 0 - body.sweepTime;
    if (delta2 != 0) {
      body.sweepTime = 0;
      const t5 = delta2;
      body.posx += body.velx * t5;
      body.posy += body.vely * t5;
      if (body.angvel != 0) {
        const dr2 = body.sweep_angvel * delta2;
        body.rot += dr2;
        if (dr2 * dr2 > 0.0001) {
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        } else {
          const d22 = dr2 * dr2;
          const p3 = 1 - 0.5 * d22;
          const m2 = 1 - (d22 * d22) / 8;
          const nx2 = (p3 * body.axisx + dr2 * body.axisy) * m2;
          body.axisy = (p3 * body.axisy - dr2 * body.axisx) * m2;
          body.axisx = nx2;
        }
      }
    }
    if (shape.type == 0) {
      shape.worldCOMx = body.posx + (body.axisy * shape.localCOMx - body.axisx * shape.localCOMy);
      shape.worldCOMy = body.posy + (shape.localCOMx * body.axisx + shape.localCOMy * body.axisy);
    } else {
      const p4 = shape.polygon;
      let li2 = p4.lverts.next;
      let cx_ite6 = p4.gverts.next;
      while (cx_ite6 != null) {
        const g2 = cx_ite6;
        const l2 = li2;
        li2 = li2.next;
        g2.x = body.posx + (body.axisy * l2.x - body.axisx * l2.y);
        g2.y = body.posy + (l2.x * body.axisx + l2.y * body.axisy);
        cx_ite6 = cx_ite6.next;
      }
      let ite2 = p4.edges.head;
      let cx_ite7 = p4.gverts.next;
      let u3 = cx_ite7;
      cx_ite7 = cx_ite7.next;
      while (cx_ite7 != null) {
        const v5 = cx_ite7;
        const e4 = ite2.elt;
        ite2 = ite2.next;
        e4.gnormx = body.axisy * e4.lnormx - body.axisx * e4.lnormy;
        e4.gnormy = e4.lnormx * body.axisx + e4.lnormy * body.axisy;
        e4.gprojection = body.posx * e4.gnormx + body.posy * e4.gnormy + e4.lprojection;
        e4.tp0 = u3.y * e4.gnormx - u3.x * e4.gnormy;
        e4.tp1 = v5.y * e4.gnormx - v5.x * e4.gnormy;
        u3 = v5;
        cx_ite7 = cx_ite7.next;
      }
      const v6 = p4.gverts.next;
      const e5 = ite2.elt;
      ite2 = ite2.next;
      e5.gnormx = body.axisy * e5.lnormx - body.axisx * e5.lnormy;
      e5.gnormy = e5.lnormx * body.axisx + e5.lnormy * body.axisy;
      e5.gprojection = body.posx * e5.gnormx + body.posy * e5.gnormy + e5.lprojection;
      e5.tp0 = u3.y * e5.gnormx - u3.x * e5.gnormy;
      e5.tp1 = v6.y * e5.gnormx - v6.x * e5.gnormy;
    }
    return ret;
  }

  push_callback(i: any) {
    let cb;
    if (ZPP_Callback.zpp_pool == null) {
      cb = new ZPP_Callback();
    } else {
      cb = ZPP_Callback.zpp_pool;
      ZPP_Callback.zpp_pool = cb.next;
      cb.next = null;
    }
    this.callbacks.push(cb);
    cb.listener = i;
    return cb;
  }

  step(deltaTime: any, velocityIterations: any, positionIterations: any) {
    const _gthis = this;
    if (this.midstep) {
      throw new Error(
        "Error: ... REALLY?? you're going to call space.step() inside of space.step()? COME ON!!",
      );
    }
    this.time += deltaTime;
    this.pre_dt = deltaTime;
    this.midstep = true;
    this.stamp++;
    this.validation();
    this.bphase.broadphase(this, true);
    this.prestep(deltaTime);
    if (this.sortcontacts) {
      const xxlist = this.c_arbiters_false;
      if (xxlist.head != null && xxlist.head.next != null) {
        let head = xxlist.head;
        let tail = null;
        let left = null;
        let right = null;
        let nxt = null;
        let listSize = 1;
        let numMerges;
        let leftSize;
        let rightSize;
        while (true) {
          numMerges = 0;
          left = head;
          head = null;
          tail = head;
          while (left != null) {
            ++numMerges;
            right = left;
            leftSize = 0;
            rightSize = listSize;
            while (right != null && leftSize < listSize) {
              ++leftSize;
              right = right.next;
            }
            while (leftSize > 0 || (rightSize > 0 && right != null)) {
              if (leftSize == 0) {
                nxt = right;
                right = right.next;
                --rightSize;
              } else if (rightSize == 0 || right == null) {
                nxt = left;
                left = left.next;
                --leftSize;
              } else if (
                left.elt.active && right.elt.active ? left.elt.oc1.dist < right.elt.oc1.dist : true
              ) {
                nxt = left;
                left = left.next;
                --leftSize;
              } else {
                nxt = right;
                right = right.next;
                --rightSize;
              }
              if (tail != null) {
                tail.next = nxt;
              } else {
                head = nxt;
              }
              tail = nxt;
            }
            left = right;
          }
          tail.next = null;
          listSize <<= 1;
          if (!(numMerges > 1)) {
            break;
          }
        }
        xxlist.head = head;
        xxlist.modified = true;
        xxlist.pushmod = true;
      }
    }
    this.updateVel(deltaTime);
    this.warmStart();
    this.iterateVel(velocityIterations);
    let cx_ite = this.kinematics.head;
    while (cx_ite != null) {
      const cur = cx_ite.elt;
      cur.pre_posx = cur.posx;
      cur.pre_posy = cur.posy;
      cur.pre_rot = cur.rot;
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = this.live.head;
    while (cx_ite1 != null) {
      const cur1 = cx_ite1.elt;
      cur1.pre_posx = cur1.posx;
      cur1.pre_posy = cur1.posy;
      cur1.pre_rot = cur1.rot;
      cx_ite1 = cx_ite1.next;
    }
    this.updatePos(deltaTime);
    this.continuous = true;
    this.continuousCollisions(deltaTime);
    this.continuous = false;
    this.iteratePos(positionIterations);
    let cx_ite2 = this.kinematics.head;
    while (cx_ite2 != null) {
      const cur2 = cx_ite2.elt;
      const upos = !(cur2.posx == cur2.pre_posx && cur2.posy == cur2.pre_posy);
      const urot = cur2.pre_rot != cur2.rot;
      if (upos) {
        let cx_ite3 = cur2.shapes.head;
        while (cx_ite3 != null) {
          const s = cx_ite3.elt;
          if (s.type == 1) {
            s.polygon.invalidate_gverts();
            s.polygon.invalidate_gaxi();
          }
          s.invalidate_worldCOM();
          cx_ite3 = cx_ite3.next;
        }
        cur2.zip_worldCOM = true;
      }
      if (urot) {
        cur2.zip_axis = true;
        let cx_ite4 = cur2.shapes.head;
        while (cx_ite4 != null) {
          const s1 = cx_ite4.elt;
          if (s1.type == 1) {
            s1.polygon.invalidate_gverts();
            s1.polygon.invalidate_gaxi();
          }
          s1.invalidate_worldCOM();
          cx_ite4 = cx_ite4.next;
        }
        cur2.zip_worldCOM = true;
      }
      cx_ite2 = cx_ite2.next;
    }
    let cx_ite5 = this.live.head;
    while (cx_ite5 != null) {
      const cur3 = cx_ite5.elt;
      const upos1 = !(cur3.posx == cur3.pre_posx && cur3.posy == cur3.pre_posy);
      const urot1 = cur3.pre_rot != cur3.rot;
      if (upos1) {
        let cx_ite6 = cur3.shapes.head;
        while (cx_ite6 != null) {
          const s2 = cx_ite6.elt;
          if (s2.type == 1) {
            s2.polygon.invalidate_gverts();
            s2.polygon.invalidate_gaxi();
          }
          s2.invalidate_worldCOM();
          cx_ite6 = cx_ite6.next;
        }
        cur3.zip_worldCOM = true;
      }
      if (urot1) {
        cur3.zip_axis = true;
        let cx_ite7 = cur3.shapes.head;
        while (cx_ite7 != null) {
          const s3 = cx_ite7.elt;
          if (s3.type == 1) {
            s3.polygon.invalidate_gverts();
            s3.polygon.invalidate_gaxi();
          }
          s3.invalidate_worldCOM();
          cx_ite7 = cx_ite7.next;
        }
        cur3.zip_worldCOM = true;
      }
      cx_ite5 = cx_ite5.next;
    }
    let pre = null;
    let cx_ite8 = this.staticsleep.head;
    while (cx_ite8 != null) {
      const b = cx_ite8.elt;
      if (b.type != 3 || (b.velx == 0 && b.vely == 0 && b.angvel == 0)) {
        if (b.kinematicDelaySleep) {
          b.kinematicDelaySleep = false;
          cx_ite8 = cx_ite8.next;
          continue;
        }
        b.component.sleeping = true;
        const _this = this.staticsleep;
        let old;
        let ret;
        if (pre == null) {
          old = _this.head;
          ret = old.next;
          _this.head = ret;
          if (_this.head == null) {
            _this.pushmod = true;
          }
        } else {
          old = pre.next;
          ret = old.next;
          pre.next = ret;
          if (ret == null) {
            _this.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool = o;
        _this.modified = true;
        _this.length--;
        _this.pushmod = true;
        cx_ite8 = ret;
        continue;
      }
      pre = cx_ite8;
      cx_ite8 = cx_ite8.next;
    }
    this.doForests(deltaTime);
    this.sleepArbiters();
    this.midstep = false;
    let pre1 = null;
    let cx_ite9 = this.callbackset_list.next;
    while (cx_ite9 != null) {
      const set = cx_ite9;
      if (set.arbiters.head == null) {
        const _this1 = this.callbackset_list;
        let old1;
        let ret1;
        if (pre1 == null) {
          old1 = _this1.next;
          ret1 = old1.next;
          _this1.next = ret1;
          if (_this1.next == null) {
            _this1.pushmod = true;
          }
        } else {
          old1 = pre1.next;
          ret1 = old1.next;
          pre1.next = ret1;
          if (ret1 == null) {
            _this1.pushmod = true;
          }
        }
        old1._inuse = false;
        _this1.modified = true;
        _this1.length--;
        _this1.pushmod = true;
        cx_ite9 = ret1;
        const o1 = set;
        o1.int1 = o1.int2 = null;
        o1.id = o1.di = -1;
        o1.freed = true;
        o1.next = ZPP_CallbackSet.zpp_pool;
        ZPP_CallbackSet.zpp_pool = o1;
        continue;
      }
      let ret2;
      ret2 = true;
      let cx_ite10 = set.arbiters.head;
      while (cx_ite10 != null) {
        const x = cx_ite10.elt;
        if (x.sleeping) {
          cx_ite10 = cx_ite10.next;
          continue;
        } else {
          ret2 = false;
          break;
        }
      }
      const sleeping = ret2;
      const a = set.int1.cbSet;
      const b1 = set.int2.cbSet;
      const _this2 = a.manager;
      let ret3 = null;
      const pairs = a.cbpairs.length < b1.cbpairs.length ? a.cbpairs : b1.cbpairs;
      let cx_ite11 = pairs.head;
      while (cx_ite11 != null) {
        const p = cx_ite11.elt;
        if ((p.a == a && p.b == b1) || (p.a == b1 && p.b == a)) {
          ret3 = p;
          break;
        }
        cx_ite11 = cx_ite11.next;
      }
      if (ret3 == null) {
        let ret4;
        if (ZPP_CbSetPair.zpp_pool == null) {
          ret4 = new ZPP_CbSetPair();
        } else {
          ret4 = ZPP_CbSetPair.zpp_pool;
          ZPP_CbSetPair.zpp_pool = ret4.next;
          ret4.next = null;
        }
        ret4.zip_listeners = true;
        if (ZPP_CbSet.setlt(a, b1)) {
          ret4.a = a;
          ret4.b = b1;
        } else {
          ret4.a = b1;
          ret4.b = a;
        }
        ret3 = ret4;
        a.cbpairs.add(ret3);
        if (b1 != a) {
          b1.cbpairs.add(ret3);
        }
      }
      if (ret3.zip_listeners) {
        ret3.zip_listeners = false;
        ret3.__validate();
      }
      let cx_ite12 = ret3.listeners.head;
      while (cx_ite12 != null) {
        const x1 = cx_ite12.elt;
        if (x1.event == 6) {
          if ((!sleeping || x1.allowSleepingCallbacks) && !set.empty_arb(x1.itype)) {
            const cb = _gthis.push_callback(x1);
            cb.event = 6;
            const o11 = set.int1;
            const o2 = set.int2;
            let tmp;
            const _this3 = x1.options1;
            const xs = o11.cbTypes;
            if (
              _this3.nonemptyintersection(xs, _this3.includes) &&
              !_this3.nonemptyintersection(xs, _this3.excludes)
            ) {
              const _this4 = x1.options2;
              const xs1 = o2.cbTypes;
              tmp =
                _this4.nonemptyintersection(xs1, _this4.includes) &&
                !_this4.nonemptyintersection(xs1, _this4.excludes);
            } else {
              tmp = false;
            }
            if (tmp) {
              cb.int1 = o11;
              cb.int2 = o2;
            } else {
              cb.int1 = o2;
              cb.int2 = o11;
            }
            cb.set = set;
          }
        }
        cx_ite12 = cx_ite12.next;
      }
      pre1 = cx_ite9;
      cx_ite9 = cx_ite9.next;
    }
    while (!this.callbacks.empty()) {
      const cb1 = this.callbacks.pop();
      if (cb1.listener.type == 0) {
        const o3 = cb1.listener.body;
        o3.handler(cb1.wrapper_body());
      } else if (cb1.listener.type == 1) {
        const o4 = cb1.listener.constraint;
        o4.handler(cb1.wrapper_con());
      } else if (cb1.listener.type == 2) {
        const o5 = cb1.listener.interaction;
        o5.handleri(cb1.wrapper_int());
      }
      const o6 = cb1;
      o6.int1 = o6.int2 = null;
      o6.body = null;
      o6.constraint = null;
      o6.listener = null;
      if (o6.wrap_arbiters != null) {
        o6.wrap_arbiters.zpp_inner.inner = null;
      }
      o6.set = null;
      o6.next = ZPP_Callback.zpp_pool;
      ZPP_Callback.zpp_pool = o6;
    }
  }

  continuousCollisions(deltaTime: any) {
    const MAX_VEL = (2 * Math.PI) / deltaTime;
    this.bphase.broadphase(this, false);
    let curTimeAlpha = 0.0;
    while (curTimeAlpha < 1 && this.toiEvents.head != null) {
      let minTOI = null;
      let minTime = 2.0;
      let minKinematic = false;
      let preMin = null;
      let pre = null;
      let cx_ite = this.toiEvents.head;
      while (cx_ite != null) {
        const toi = cx_ite.elt;
        const b1 = toi.s1.body;
        const b2 = toi.s2.body;
        if (b1.sweepFrozen && b2.sweepFrozen) {
          if (toi.toi != 0 && ZPP_Collide.testCollide_safe(toi.s1, toi.s2)) {
            toi.toi = 0;
          } else {
            cx_ite = this.toiEvents.erase(pre);
            const o = toi;
            o.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
            ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o;
            continue;
          }
        }
        if (toi.frozen1 != b1.sweepFrozen || toi.frozen2 != b2.sweepFrozen) {
          if (!toi.kinematic) {
            toi.frozen1 = b1.sweepFrozen;
            toi.frozen2 = b2.sweepFrozen;
            if (toi.frozen1) {
              const tmp = toi.s1;
              toi.s1 = toi.s2;
              toi.s2 = tmp;
              toi.frozen1 = false;
              toi.frozen2 = true;
            }
            ZPP_SweepDistance.staticSweep(
              toi,
              deltaTime,
              0,
              ZPP_Space._nape.Config.collisionSlopCCD,
            );
            if (toi.toi < 0) {
              cx_ite = this.toiEvents.erase(pre);
              const o1 = toi;
              o1.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
              ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o1;
              continue;
            }
          } else {
            cx_ite = this.toiEvents.erase(pre);
            const o2 = toi;
            o2.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
            ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o2;
            continue;
          }
        }
        if (toi.toi >= 0 && (toi.toi < minTime || (!minKinematic && toi.kinematic))) {
          minTOI = toi;
          minTime = toi.toi;
          minKinematic = toi.kinematic;
          preMin = pre;
        }
        pre = cx_ite;
        cx_ite = cx_ite.next;
      }
      if (minTOI == null) {
        break;
      }
      this.toiEvents.erase(preMin);
      curTimeAlpha = minTOI.toi;
      const b11 = minTOI.s1.body;
      const b21 = minTOI.s2.body;
      if (!b11.sweepFrozen) {
        const dt = curTimeAlpha * deltaTime;
        const delta = dt - b11.sweepTime;
        if (delta != 0) {
          b11.sweepTime = dt;
          const t = delta;
          b11.posx += b11.velx * t;
          b11.posy += b11.vely * t;
          if (b11.angvel != 0) {
            const dr = b11.sweep_angvel * delta;
            b11.rot += dr;
            if (dr * dr > 0.0001) {
              b11.axisx = Math.sin(b11.rot);
              b11.axisy = Math.cos(b11.rot);
            } else {
              const d2 = dr * dr;
              const p = 1 - 0.5 * d2;
              const m = 1 - (d2 * d2) / 8;
              const nx = (p * b11.axisx + dr * b11.axisy) * m;
              b11.axisy = (p * b11.axisy - dr * b11.axisx) * m;
              b11.axisx = nx;
            }
          }
        }
        const s = minTOI.s1;
        if (s.type == 0) {
          s.worldCOMx = b11.posx + (b11.axisy * s.localCOMx - b11.axisx * s.localCOMy);
          s.worldCOMy = b11.posy + (s.localCOMx * b11.axisx + s.localCOMy * b11.axisy);
        } else {
          const p1 = s.polygon;
          let li = p1.lverts.next;
          let cx_ite1 = p1.gverts.next;
          while (cx_ite1 != null) {
            const g = cx_ite1;
            const l = li;
            li = li.next;
            g.x = b11.posx + (b11.axisy * l.x - b11.axisx * l.y);
            g.y = b11.posy + (l.x * b11.axisx + l.y * b11.axisy);
            cx_ite1 = cx_ite1.next;
          }
          let ite = p1.edges.head;
          let cx_ite2 = p1.gverts.next;
          let u = cx_ite2;
          cx_ite2 = cx_ite2.next;
          while (cx_ite2 != null) {
            const v = cx_ite2;
            const e = ite.elt;
            ite = ite.next;
            e.gnormx = b11.axisy * e.lnormx - b11.axisx * e.lnormy;
            e.gnormy = e.lnormx * b11.axisx + e.lnormy * b11.axisy;
            e.gprojection = b11.posx * e.gnormx + b11.posy * e.gnormy + e.lprojection;
            e.tp0 = u.y * e.gnormx - u.x * e.gnormy;
            e.tp1 = v.y * e.gnormx - v.x * e.gnormy;
            u = v;
            cx_ite2 = cx_ite2.next;
          }
          const v1 = p1.gverts.next;
          const e1 = ite.elt;
          ite = ite.next;
          e1.gnormx = b11.axisy * e1.lnormx - b11.axisx * e1.lnormy;
          e1.gnormy = e1.lnormx * b11.axisx + e1.lnormy * b11.axisy;
          e1.gprojection = b11.posx * e1.gnormx + b11.posy * e1.gnormy + e1.lprojection;
          e1.tp0 = u.y * e1.gnormx - u.x * e1.gnormy;
          e1.tp1 = v1.y * e1.gnormx - v1.x * e1.gnormy;
        }
      }
      if (!b21.sweepFrozen) {
        const dt1 = curTimeAlpha * deltaTime;
        const delta1 = dt1 - b21.sweepTime;
        if (delta1 != 0) {
          b21.sweepTime = dt1;
          const t1 = delta1;
          b21.posx += b21.velx * t1;
          b21.posy += b21.vely * t1;
          if (b21.angvel != 0) {
            const dr1 = b21.sweep_angvel * delta1;
            b21.rot += dr1;
            if (dr1 * dr1 > 0.0001) {
              b21.axisx = Math.sin(b21.rot);
              b21.axisy = Math.cos(b21.rot);
            } else {
              const d21 = dr1 * dr1;
              const p2 = 1 - 0.5 * d21;
              const m1 = 1 - (d21 * d21) / 8;
              const nx1 = (p2 * b21.axisx + dr1 * b21.axisy) * m1;
              b21.axisy = (p2 * b21.axisy - dr1 * b21.axisx) * m1;
              b21.axisx = nx1;
            }
          }
        }
        const s1 = minTOI.s2;
        if (s1.type == 0) {
          s1.worldCOMx = b21.posx + (b21.axisy * s1.localCOMx - b21.axisx * s1.localCOMy);
          s1.worldCOMy = b21.posy + (s1.localCOMx * b21.axisx + s1.localCOMy * b21.axisy);
        } else {
          const p3 = s1.polygon;
          let li1 = p3.lverts.next;
          let cx_ite3 = p3.gverts.next;
          while (cx_ite3 != null) {
            const g1 = cx_ite3;
            const l1 = li1;
            li1 = li1.next;
            g1.x = b21.posx + (b21.axisy * l1.x - b21.axisx * l1.y);
            g1.y = b21.posy + (l1.x * b21.axisx + l1.y * b21.axisy);
            cx_ite3 = cx_ite3.next;
          }
          let ite1 = p3.edges.head;
          let cx_ite4 = p3.gverts.next;
          let u1 = cx_ite4;
          cx_ite4 = cx_ite4.next;
          while (cx_ite4 != null) {
            const v2 = cx_ite4;
            const e2 = ite1.elt;
            ite1 = ite1.next;
            e2.gnormx = b21.axisy * e2.lnormx - b21.axisx * e2.lnormy;
            e2.gnormy = e2.lnormx * b21.axisx + e2.lnormy * b21.axisy;
            e2.gprojection = b21.posx * e2.gnormx + b21.posy * e2.gnormy + e2.lprojection;
            e2.tp0 = u1.y * e2.gnormx - u1.x * e2.gnormy;
            e2.tp1 = v2.y * e2.gnormx - v2.x * e2.gnormy;
            u1 = v2;
            cx_ite4 = cx_ite4.next;
          }
          const v3 = p3.gverts.next;
          const e3 = ite1.elt;
          ite1 = ite1.next;
          e3.gnormx = b21.axisy * e3.lnormx - b21.axisx * e3.lnormy;
          e3.gnormy = e3.lnormx * b21.axisx + e3.lnormy * b21.axisy;
          e3.gprojection = b21.posx * e3.gnormx + b21.posy * e3.gnormy + e3.lprojection;
          e3.tp0 = u1.y * e3.gnormx - u1.x * e3.gnormy;
          e3.tp1 = v3.y * e3.gnormx - v3.x * e3.gnormy;
        }
      }
      const wasnull = minTOI.arbiter == null;
      const arb = this.narrowPhase(minTOI.s1, minTOI.s2, true, minTOI.arbiter, true);
      if (arb == null) {
        if (minTOI.arbiter != null && minTOI.arbiter.pair != null) {
          minTOI.arbiter.pair.arb = null;
          minTOI.arbiter.pair = null;
        }
      } else if (!this.presteparb(arb, deltaTime, true)) {
        if (arb.type == ZPP_Arbiter.COL && arb.active && (arb.immState & 1) != 0) {
          const _this = arb.colarb;
          const jx = _this.nx * _this.c1.jnAcc - _this.ny * _this.c1.jtAcc;
          const jy = _this.ny * _this.c1.jnAcc + _this.nx * _this.c1.jtAcc;
          const t2 = _this.b1.imass;
          _this.b1.velx -= jx * t2;
          _this.b1.vely -= jy * t2;
          _this.b1.angvel -= _this.b1.iinertia * (jy * _this.c1.r1x - jx * _this.c1.r1y);
          const t3 = _this.b2.imass;
          _this.b2.velx += jx * t3;
          _this.b2.vely += jy * t3;
          _this.b2.angvel += _this.b2.iinertia * (jy * _this.c1.r2x - jx * _this.c1.r2y);
          if (_this.hc2) {
            const jx1 = _this.nx * _this.c2.jnAcc - _this.ny * _this.c2.jtAcc;
            const jy1 = _this.ny * _this.c2.jnAcc + _this.nx * _this.c2.jtAcc;
            const t4 = _this.b1.imass;
            _this.b1.velx -= jx1 * t4;
            _this.b1.vely -= jy1 * t4;
            _this.b1.angvel -= _this.b1.iinertia * (jy1 * _this.c2.r1x - jx1 * _this.c2.r1y);
            const t5 = _this.b2.imass;
            _this.b2.velx += jx1 * t5;
            _this.b2.vely += jy1 * t5;
            _this.b2.angvel += _this.b2.iinertia * (jy1 * _this.c2.r2x - jx1 * _this.c2.r2y);
          }
          _this.b2.angvel += _this.jrAcc * _this.b2.iinertia;
          _this.b1.angvel -= _this.jrAcc * _this.b1.iinertia;
          const _this1 = arb.colarb;
          let v1x =
            _this1.k1x +
            _this1.b2.velx -
            _this1.c1.r2y * _this1.b2.angvel -
            (_this1.b1.velx - _this1.c1.r1y * _this1.b1.angvel);
          let v1y =
            _this1.k1y +
            _this1.b2.vely +
            _this1.c1.r2x * _this1.b2.angvel -
            (_this1.b1.vely + _this1.c1.r1x * _this1.b1.angvel);
          let j = (v1y * _this1.nx - v1x * _this1.ny + _this1.surfacex) * _this1.c1.tMass;
          let jMax = _this1.c1.friction * _this1.c1.jnAcc;
          let jOld = _this1.c1.jtAcc;
          let cjAcc = jOld - j;
          if (cjAcc > jMax) {
            cjAcc = jMax;
          } else if (cjAcc < -jMax) {
            cjAcc = -jMax;
          }
          j = cjAcc - jOld;
          _this1.c1.jtAcc = cjAcc;
          let jx2 = -_this1.ny * j;
          let jy2 = _this1.nx * j;
          _this1.b2.velx += jx2 * _this1.b2.imass;
          _this1.b2.vely += jy2 * _this1.b2.imass;
          _this1.b1.velx -= jx2 * _this1.b1.imass;
          _this1.b1.vely -= jy2 * _this1.b1.imass;
          _this1.b2.angvel += _this1.rt1b * j * _this1.b2.iinertia;
          _this1.b1.angvel -= _this1.rt1a * j * _this1.b1.iinertia;
          if (_this1.hc2) {
            let v2x =
              _this1.k2x +
              _this1.b2.velx -
              _this1.c2.r2y * _this1.b2.angvel -
              (_this1.b1.velx - _this1.c2.r1y * _this1.b1.angvel);
            let v2y =
              _this1.k2y +
              _this1.b2.vely +
              _this1.c2.r2x * _this1.b2.angvel -
              (_this1.b1.vely + _this1.c2.r1x * _this1.b1.angvel);
            j = (v2y * _this1.nx - v2x * _this1.ny + _this1.surfacex) * _this1.c2.tMass;
            jMax = _this1.c2.friction * _this1.c2.jnAcc;
            jOld = _this1.c2.jtAcc;
            cjAcc = jOld - j;
            if (cjAcc > jMax) {
              cjAcc = jMax;
            } else if (cjAcc < -jMax) {
              cjAcc = -jMax;
            }
            j = cjAcc - jOld;
            _this1.c2.jtAcc = cjAcc;
            jx2 = -_this1.ny * j;
            jy2 = _this1.nx * j;
            _this1.b2.velx += jx2 * _this1.b2.imass;
            _this1.b2.vely += jy2 * _this1.b2.imass;
            _this1.b1.velx -= jx2 * _this1.b1.imass;
            _this1.b1.vely -= jy2 * _this1.b1.imass;
            _this1.b2.angvel += _this1.rt2b * j * _this1.b2.iinertia;
            _this1.b1.angvel -= _this1.rt2a * j * _this1.b1.iinertia;
            v1x =
              _this1.k1x +
              _this1.b2.velx -
              _this1.c1.r2y * _this1.b2.angvel -
              (_this1.b1.velx - _this1.c1.r1y * _this1.b1.angvel);
            v1y =
              _this1.k1y +
              _this1.b2.vely +
              _this1.c1.r2x * _this1.b2.angvel -
              (_this1.b1.vely + _this1.c1.r1x * _this1.b1.angvel);
            v2x =
              _this1.k2x +
              _this1.b2.velx -
              _this1.c2.r2y * _this1.b2.angvel -
              (_this1.b1.velx - _this1.c2.r1y * _this1.b1.angvel);
            v2y =
              _this1.k2y +
              _this1.b2.vely +
              _this1.c2.r2x * _this1.b2.angvel -
              (_this1.b1.vely + _this1.c2.r1x * _this1.b1.angvel);
            const ax = _this1.c1.jnAcc;
            const ay = _this1.c2.jnAcc;
            let jnx =
              v1x * _this1.nx +
              v1y * _this1.ny +
              _this1.surfacey +
              _this1.c1.bounce -
              (_this1.Ka * ax + _this1.Kb * ay);
            let jny =
              v2x * _this1.nx +
              v2y * _this1.ny +
              _this1.surfacey +
              _this1.c2.bounce -
              (_this1.Kb * ax + _this1.Kc * ay);
            let xx = -(_this1.kMassa * jnx + _this1.kMassb * jny);
            let xy = -(_this1.kMassb * jnx + _this1.kMassc * jny);
            if (xx >= 0 && xy >= 0) {
              jnx = xx - ax;
              jny = xy - ay;
              _this1.c1.jnAcc = xx;
              _this1.c2.jnAcc = xy;
            } else {
              xx = -_this1.c1.nMass * jnx;
              if (xx >= 0 && _this1.Kb * xx + jny >= 0) {
                jnx = xx - ax;
                jny = -ay;
                _this1.c1.jnAcc = xx;
                _this1.c2.jnAcc = 0;
              } else {
                xy = -_this1.c2.nMass * jny;
                if (xy >= 0 && _this1.Kb * xy + jnx >= 0) {
                  jnx = -ax;
                  jny = xy - ay;
                  _this1.c1.jnAcc = 0;
                  _this1.c2.jnAcc = xy;
                } else if (jnx >= 0 && jny >= 0) {
                  jnx = -ax;
                  jny = -ay;
                  _this1.c1.jnAcc = _this1.c2.jnAcc = 0;
                } else {
                  jnx = 0;
                  jny = 0;
                }
              }
            }
            j = jnx + jny;
            jx2 = _this1.nx * j;
            jy2 = _this1.ny * j;
            _this1.b2.velx += jx2 * _this1.b2.imass;
            _this1.b2.vely += jy2 * _this1.b2.imass;
            _this1.b1.velx -= jx2 * _this1.b1.imass;
            _this1.b1.vely -= jy2 * _this1.b1.imass;
            _this1.b2.angvel += (_this1.rn1b * jnx + _this1.rn2b * jny) * _this1.b2.iinertia;
            _this1.b1.angvel -= (_this1.rn1a * jnx + _this1.rn2a * jny) * _this1.b1.iinertia;
          } else {
            if (_this1.radius != 0.0) {
              const dw = _this1.b2.angvel - _this1.b1.angvel;
              j = dw * _this1.rMass;
              jMax = _this1.rfric * _this1.c1.jnAcc;
              jOld = _this1.jrAcc;
              _this1.jrAcc -= j;
              if (_this1.jrAcc > jMax) {
                _this1.jrAcc = jMax;
              } else if (_this1.jrAcc < -jMax) {
                _this1.jrAcc = -jMax;
              }
              j = _this1.jrAcc - jOld;
              _this1.b2.angvel += j * _this1.b2.iinertia;
              _this1.b1.angvel -= j * _this1.b1.iinertia;
            }
            v1x =
              _this1.k1x +
              _this1.b2.velx -
              _this1.c1.r2y * _this1.b2.angvel -
              (_this1.b1.velx - _this1.c1.r1y * _this1.b1.angvel);
            v1y =
              _this1.k1y +
              _this1.b2.vely +
              _this1.c1.r2x * _this1.b2.angvel -
              (_this1.b1.vely + _this1.c1.r1x * _this1.b1.angvel);
            j =
              (_this1.c1.bounce + (_this1.nx * v1x + _this1.ny * v1y) + _this1.surfacey) *
              _this1.c1.nMass;
            jOld = _this1.c1.jnAcc;
            cjAcc = jOld - j;
            if (cjAcc < 0.0) {
              cjAcc = 0.0;
            }
            j = cjAcc - jOld;
            _this1.c1.jnAcc = cjAcc;
            jx2 = _this1.nx * j;
            jy2 = _this1.ny * j;
            _this1.b2.velx += jx2 * _this1.b2.imass;
            _this1.b2.vely += jy2 * _this1.b2.imass;
            _this1.b1.velx -= jx2 * _this1.b1.imass;
            _this1.b1.vely -= jy2 * _this1.b1.imass;
            _this1.b2.angvel += _this1.rn1b * j * _this1.b2.iinertia;
            _this1.b1.angvel -= _this1.rn1a * j * _this1.b1.iinertia;
          }
          const _this2 = arb.colarb;
          let v1x1 =
            _this2.k1x +
            _this2.b2.velx -
            _this2.c1.r2y * _this2.b2.angvel -
            (_this2.b1.velx - _this2.c1.r1y * _this2.b1.angvel);
          let v1y1 =
            _this2.k1y +
            _this2.b2.vely +
            _this2.c1.r2x * _this2.b2.angvel -
            (_this2.b1.vely + _this2.c1.r1x * _this2.b1.angvel);
          let j1 = (v1y1 * _this2.nx - v1x1 * _this2.ny + _this2.surfacex) * _this2.c1.tMass;
          let jMax1 = _this2.c1.friction * _this2.c1.jnAcc;
          let jOld1 = _this2.c1.jtAcc;
          let cjAcc1 = jOld1 - j1;
          if (cjAcc1 > jMax1) {
            cjAcc1 = jMax1;
          } else if (cjAcc1 < -jMax1) {
            cjAcc1 = -jMax1;
          }
          j1 = cjAcc1 - jOld1;
          _this2.c1.jtAcc = cjAcc1;
          let jx3 = -_this2.ny * j1;
          let jy3 = _this2.nx * j1;
          _this2.b2.velx += jx3 * _this2.b2.imass;
          _this2.b2.vely += jy3 * _this2.b2.imass;
          _this2.b1.velx -= jx3 * _this2.b1.imass;
          _this2.b1.vely -= jy3 * _this2.b1.imass;
          _this2.b2.angvel += _this2.rt1b * j1 * _this2.b2.iinertia;
          _this2.b1.angvel -= _this2.rt1a * j1 * _this2.b1.iinertia;
          if (_this2.hc2) {
            let v2x1 =
              _this2.k2x +
              _this2.b2.velx -
              _this2.c2.r2y * _this2.b2.angvel -
              (_this2.b1.velx - _this2.c2.r1y * _this2.b1.angvel);
            let v2y1 =
              _this2.k2y +
              _this2.b2.vely +
              _this2.c2.r2x * _this2.b2.angvel -
              (_this2.b1.vely + _this2.c2.r1x * _this2.b1.angvel);
            j1 = (v2y1 * _this2.nx - v2x1 * _this2.ny + _this2.surfacex) * _this2.c2.tMass;
            jMax1 = _this2.c2.friction * _this2.c2.jnAcc;
            jOld1 = _this2.c2.jtAcc;
            cjAcc1 = jOld1 - j1;
            if (cjAcc1 > jMax1) {
              cjAcc1 = jMax1;
            } else if (cjAcc1 < -jMax1) {
              cjAcc1 = -jMax1;
            }
            j1 = cjAcc1 - jOld1;
            _this2.c2.jtAcc = cjAcc1;
            jx3 = -_this2.ny * j1;
            jy3 = _this2.nx * j1;
            _this2.b2.velx += jx3 * _this2.b2.imass;
            _this2.b2.vely += jy3 * _this2.b2.imass;
            _this2.b1.velx -= jx3 * _this2.b1.imass;
            _this2.b1.vely -= jy3 * _this2.b1.imass;
            _this2.b2.angvel += _this2.rt2b * j1 * _this2.b2.iinertia;
            _this2.b1.angvel -= _this2.rt2a * j1 * _this2.b1.iinertia;
            v1x1 =
              _this2.k1x +
              _this2.b2.velx -
              _this2.c1.r2y * _this2.b2.angvel -
              (_this2.b1.velx - _this2.c1.r1y * _this2.b1.angvel);
            v1y1 =
              _this2.k1y +
              _this2.b2.vely +
              _this2.c1.r2x * _this2.b2.angvel -
              (_this2.b1.vely + _this2.c1.r1x * _this2.b1.angvel);
            v2x1 =
              _this2.k2x +
              _this2.b2.velx -
              _this2.c2.r2y * _this2.b2.angvel -
              (_this2.b1.velx - _this2.c2.r1y * _this2.b1.angvel);
            v2y1 =
              _this2.k2y +
              _this2.b2.vely +
              _this2.c2.r2x * _this2.b2.angvel -
              (_this2.b1.vely + _this2.c2.r1x * _this2.b1.angvel);
            const ax1 = _this2.c1.jnAcc;
            const ay1 = _this2.c2.jnAcc;
            let jnx1 =
              v1x1 * _this2.nx +
              v1y1 * _this2.ny +
              _this2.surfacey +
              _this2.c1.bounce -
              (_this2.Ka * ax1 + _this2.Kb * ay1);
            let jny1 =
              v2x1 * _this2.nx +
              v2y1 * _this2.ny +
              _this2.surfacey +
              _this2.c2.bounce -
              (_this2.Kb * ax1 + _this2.Kc * ay1);
            let xx1 = -(_this2.kMassa * jnx1 + _this2.kMassb * jny1);
            let xy1 = -(_this2.kMassb * jnx1 + _this2.kMassc * jny1);
            if (xx1 >= 0 && xy1 >= 0) {
              jnx1 = xx1 - ax1;
              jny1 = xy1 - ay1;
              _this2.c1.jnAcc = xx1;
              _this2.c2.jnAcc = xy1;
            } else {
              xx1 = -_this2.c1.nMass * jnx1;
              if (xx1 >= 0 && _this2.Kb * xx1 + jny1 >= 0) {
                jnx1 = xx1 - ax1;
                jny1 = -ay1;
                _this2.c1.jnAcc = xx1;
                _this2.c2.jnAcc = 0;
              } else {
                xy1 = -_this2.c2.nMass * jny1;
                if (xy1 >= 0 && _this2.Kb * xy1 + jnx1 >= 0) {
                  jnx1 = -ax1;
                  jny1 = xy1 - ay1;
                  _this2.c1.jnAcc = 0;
                  _this2.c2.jnAcc = xy1;
                } else if (jnx1 >= 0 && jny1 >= 0) {
                  jnx1 = -ax1;
                  jny1 = -ay1;
                  _this2.c1.jnAcc = _this2.c2.jnAcc = 0;
                } else {
                  jnx1 = 0;
                  jny1 = 0;
                }
              }
            }
            j1 = jnx1 + jny1;
            jx3 = _this2.nx * j1;
            jy3 = _this2.ny * j1;
            _this2.b2.velx += jx3 * _this2.b2.imass;
            _this2.b2.vely += jy3 * _this2.b2.imass;
            _this2.b1.velx -= jx3 * _this2.b1.imass;
            _this2.b1.vely -= jy3 * _this2.b1.imass;
            _this2.b2.angvel += (_this2.rn1b * jnx1 + _this2.rn2b * jny1) * _this2.b2.iinertia;
            _this2.b1.angvel -= (_this2.rn1a * jnx1 + _this2.rn2a * jny1) * _this2.b1.iinertia;
          } else {
            if (_this2.radius != 0.0) {
              const dw1 = _this2.b2.angvel - _this2.b1.angvel;
              j1 = dw1 * _this2.rMass;
              jMax1 = _this2.rfric * _this2.c1.jnAcc;
              jOld1 = _this2.jrAcc;
              _this2.jrAcc -= j1;
              if (_this2.jrAcc > jMax1) {
                _this2.jrAcc = jMax1;
              } else if (_this2.jrAcc < -jMax1) {
                _this2.jrAcc = -jMax1;
              }
              j1 = _this2.jrAcc - jOld1;
              _this2.b2.angvel += j1 * _this2.b2.iinertia;
              _this2.b1.angvel -= j1 * _this2.b1.iinertia;
            }
            v1x1 =
              _this2.k1x +
              _this2.b2.velx -
              _this2.c1.r2y * _this2.b2.angvel -
              (_this2.b1.velx - _this2.c1.r1y * _this2.b1.angvel);
            v1y1 =
              _this2.k1y +
              _this2.b2.vely +
              _this2.c1.r2x * _this2.b2.angvel -
              (_this2.b1.vely + _this2.c1.r1x * _this2.b1.angvel);
            j1 =
              (_this2.c1.bounce + (_this2.nx * v1x1 + _this2.ny * v1y1) + _this2.surfacey) *
              _this2.c1.nMass;
            jOld1 = _this2.c1.jnAcc;
            cjAcc1 = jOld1 - j1;
            if (cjAcc1 < 0.0) {
              cjAcc1 = 0.0;
            }
            j1 = cjAcc1 - jOld1;
            _this2.c1.jnAcc = cjAcc1;
            jx3 = _this2.nx * j1;
            jy3 = _this2.ny * j1;
            _this2.b2.velx += jx3 * _this2.b2.imass;
            _this2.b2.vely += jy3 * _this2.b2.imass;
            _this2.b1.velx -= jx3 * _this2.b1.imass;
            _this2.b1.vely -= jy3 * _this2.b1.imass;
            _this2.b2.angvel += _this2.rn1b * j1 * _this2.b2.iinertia;
            _this2.b1.angvel -= _this2.rn1a * j1 * _this2.b1.iinertia;
          }
          const _this3 = arb.colarb;
          let v1x2 =
            _this3.k1x +
            _this3.b2.velx -
            _this3.c1.r2y * _this3.b2.angvel -
            (_this3.b1.velx - _this3.c1.r1y * _this3.b1.angvel);
          let v1y2 =
            _this3.k1y +
            _this3.b2.vely +
            _this3.c1.r2x * _this3.b2.angvel -
            (_this3.b1.vely + _this3.c1.r1x * _this3.b1.angvel);
          let j2 = (v1y2 * _this3.nx - v1x2 * _this3.ny + _this3.surfacex) * _this3.c1.tMass;
          let jMax2 = _this3.c1.friction * _this3.c1.jnAcc;
          let jOld2 = _this3.c1.jtAcc;
          let cjAcc2 = jOld2 - j2;
          if (cjAcc2 > jMax2) {
            cjAcc2 = jMax2;
          } else if (cjAcc2 < -jMax2) {
            cjAcc2 = -jMax2;
          }
          j2 = cjAcc2 - jOld2;
          _this3.c1.jtAcc = cjAcc2;
          let jx4 = -_this3.ny * j2;
          let jy4 = _this3.nx * j2;
          _this3.b2.velx += jx4 * _this3.b2.imass;
          _this3.b2.vely += jy4 * _this3.b2.imass;
          _this3.b1.velx -= jx4 * _this3.b1.imass;
          _this3.b1.vely -= jy4 * _this3.b1.imass;
          _this3.b2.angvel += _this3.rt1b * j2 * _this3.b2.iinertia;
          _this3.b1.angvel -= _this3.rt1a * j2 * _this3.b1.iinertia;
          if (_this3.hc2) {
            let v2x2 =
              _this3.k2x +
              _this3.b2.velx -
              _this3.c2.r2y * _this3.b2.angvel -
              (_this3.b1.velx - _this3.c2.r1y * _this3.b1.angvel);
            let v2y2 =
              _this3.k2y +
              _this3.b2.vely +
              _this3.c2.r2x * _this3.b2.angvel -
              (_this3.b1.vely + _this3.c2.r1x * _this3.b1.angvel);
            j2 = (v2y2 * _this3.nx - v2x2 * _this3.ny + _this3.surfacex) * _this3.c2.tMass;
            jMax2 = _this3.c2.friction * _this3.c2.jnAcc;
            jOld2 = _this3.c2.jtAcc;
            cjAcc2 = jOld2 - j2;
            if (cjAcc2 > jMax2) {
              cjAcc2 = jMax2;
            } else if (cjAcc2 < -jMax2) {
              cjAcc2 = -jMax2;
            }
            j2 = cjAcc2 - jOld2;
            _this3.c2.jtAcc = cjAcc2;
            jx4 = -_this3.ny * j2;
            jy4 = _this3.nx * j2;
            _this3.b2.velx += jx4 * _this3.b2.imass;
            _this3.b2.vely += jy4 * _this3.b2.imass;
            _this3.b1.velx -= jx4 * _this3.b1.imass;
            _this3.b1.vely -= jy4 * _this3.b1.imass;
            _this3.b2.angvel += _this3.rt2b * j2 * _this3.b2.iinertia;
            _this3.b1.angvel -= _this3.rt2a * j2 * _this3.b1.iinertia;
            v1x2 =
              _this3.k1x +
              _this3.b2.velx -
              _this3.c1.r2y * _this3.b2.angvel -
              (_this3.b1.velx - _this3.c1.r1y * _this3.b1.angvel);
            v1y2 =
              _this3.k1y +
              _this3.b2.vely +
              _this3.c1.r2x * _this3.b2.angvel -
              (_this3.b1.vely + _this3.c1.r1x * _this3.b1.angvel);
            v2x2 =
              _this3.k2x +
              _this3.b2.velx -
              _this3.c2.r2y * _this3.b2.angvel -
              (_this3.b1.velx - _this3.c2.r1y * _this3.b1.angvel);
            v2y2 =
              _this3.k2y +
              _this3.b2.vely +
              _this3.c2.r2x * _this3.b2.angvel -
              (_this3.b1.vely + _this3.c2.r1x * _this3.b1.angvel);
            const ax2 = _this3.c1.jnAcc;
            const ay2 = _this3.c2.jnAcc;
            let jnx2 =
              v1x2 * _this3.nx +
              v1y2 * _this3.ny +
              _this3.surfacey +
              _this3.c1.bounce -
              (_this3.Ka * ax2 + _this3.Kb * ay2);
            let jny2 =
              v2x2 * _this3.nx +
              v2y2 * _this3.ny +
              _this3.surfacey +
              _this3.c2.bounce -
              (_this3.Kb * ax2 + _this3.Kc * ay2);
            let xx2 = -(_this3.kMassa * jnx2 + _this3.kMassb * jny2);
            let xy2 = -(_this3.kMassb * jnx2 + _this3.kMassc * jny2);
            if (xx2 >= 0 && xy2 >= 0) {
              jnx2 = xx2 - ax2;
              jny2 = xy2 - ay2;
              _this3.c1.jnAcc = xx2;
              _this3.c2.jnAcc = xy2;
            } else {
              xx2 = -_this3.c1.nMass * jnx2;
              if (xx2 >= 0 && _this3.Kb * xx2 + jny2 >= 0) {
                jnx2 = xx2 - ax2;
                jny2 = -ay2;
                _this3.c1.jnAcc = xx2;
                _this3.c2.jnAcc = 0;
              } else {
                xy2 = -_this3.c2.nMass * jny2;
                if (xy2 >= 0 && _this3.Kb * xy2 + jnx2 >= 0) {
                  jnx2 = -ax2;
                  jny2 = xy2 - ay2;
                  _this3.c1.jnAcc = 0;
                  _this3.c2.jnAcc = xy2;
                } else if (jnx2 >= 0 && jny2 >= 0) {
                  jnx2 = -ax2;
                  jny2 = -ay2;
                  _this3.c1.jnAcc = _this3.c2.jnAcc = 0;
                } else {
                  jnx2 = 0;
                  jny2 = 0;
                }
              }
            }
            j2 = jnx2 + jny2;
            jx4 = _this3.nx * j2;
            jy4 = _this3.ny * j2;
            _this3.b2.velx += jx4 * _this3.b2.imass;
            _this3.b2.vely += jy4 * _this3.b2.imass;
            _this3.b1.velx -= jx4 * _this3.b1.imass;
            _this3.b1.vely -= jy4 * _this3.b1.imass;
            _this3.b2.angvel += (_this3.rn1b * jnx2 + _this3.rn2b * jny2) * _this3.b2.iinertia;
            _this3.b1.angvel -= (_this3.rn1a * jnx2 + _this3.rn2a * jny2) * _this3.b1.iinertia;
          } else {
            if (_this3.radius != 0.0) {
              const dw2 = _this3.b2.angvel - _this3.b1.angvel;
              j2 = dw2 * _this3.rMass;
              jMax2 = _this3.rfric * _this3.c1.jnAcc;
              jOld2 = _this3.jrAcc;
              _this3.jrAcc -= j2;
              if (_this3.jrAcc > jMax2) {
                _this3.jrAcc = jMax2;
              } else if (_this3.jrAcc < -jMax2) {
                _this3.jrAcc = -jMax2;
              }
              j2 = _this3.jrAcc - jOld2;
              _this3.b2.angvel += j2 * _this3.b2.iinertia;
              _this3.b1.angvel -= j2 * _this3.b1.iinertia;
            }
            v1x2 =
              _this3.k1x +
              _this3.b2.velx -
              _this3.c1.r2y * _this3.b2.angvel -
              (_this3.b1.velx - _this3.c1.r1y * _this3.b1.angvel);
            v1y2 =
              _this3.k1y +
              _this3.b2.vely +
              _this3.c1.r2x * _this3.b2.angvel -
              (_this3.b1.vely + _this3.c1.r1x * _this3.b1.angvel);
            j2 =
              (_this3.c1.bounce + (_this3.nx * v1x2 + _this3.ny * v1y2) + _this3.surfacey) *
              _this3.c1.nMass;
            jOld2 = _this3.c1.jnAcc;
            cjAcc2 = jOld2 - j2;
            if (cjAcc2 < 0.0) {
              cjAcc2 = 0.0;
            }
            j2 = cjAcc2 - jOld2;
            _this3.c1.jnAcc = cjAcc2;
            jx4 = _this3.nx * j2;
            jy4 = _this3.ny * j2;
            _this3.b2.velx += jx4 * _this3.b2.imass;
            _this3.b2.vely += jy4 * _this3.b2.imass;
            _this3.b1.velx -= jx4 * _this3.b1.imass;
            _this3.b1.vely -= jy4 * _this3.b1.imass;
            _this3.b2.angvel += _this3.rn1b * j2 * _this3.b2.iinertia;
            _this3.b1.angvel -= _this3.rn1a * j2 * _this3.b1.iinertia;
          }
          const _this4 = arb.colarb;
          let v1x3 =
            _this4.k1x +
            _this4.b2.velx -
            _this4.c1.r2y * _this4.b2.angvel -
            (_this4.b1.velx - _this4.c1.r1y * _this4.b1.angvel);
          let v1y3 =
            _this4.k1y +
            _this4.b2.vely +
            _this4.c1.r2x * _this4.b2.angvel -
            (_this4.b1.vely + _this4.c1.r1x * _this4.b1.angvel);
          let j3 = (v1y3 * _this4.nx - v1x3 * _this4.ny + _this4.surfacex) * _this4.c1.tMass;
          let jMax3 = _this4.c1.friction * _this4.c1.jnAcc;
          let jOld3 = _this4.c1.jtAcc;
          let cjAcc3 = jOld3 - j3;
          if (cjAcc3 > jMax3) {
            cjAcc3 = jMax3;
          } else if (cjAcc3 < -jMax3) {
            cjAcc3 = -jMax3;
          }
          j3 = cjAcc3 - jOld3;
          _this4.c1.jtAcc = cjAcc3;
          let jx5 = -_this4.ny * j3;
          let jy5 = _this4.nx * j3;
          _this4.b2.velx += jx5 * _this4.b2.imass;
          _this4.b2.vely += jy5 * _this4.b2.imass;
          _this4.b1.velx -= jx5 * _this4.b1.imass;
          _this4.b1.vely -= jy5 * _this4.b1.imass;
          _this4.b2.angvel += _this4.rt1b * j3 * _this4.b2.iinertia;
          _this4.b1.angvel -= _this4.rt1a * j3 * _this4.b1.iinertia;
          if (_this4.hc2) {
            let v2x3 =
              _this4.k2x +
              _this4.b2.velx -
              _this4.c2.r2y * _this4.b2.angvel -
              (_this4.b1.velx - _this4.c2.r1y * _this4.b1.angvel);
            let v2y3 =
              _this4.k2y +
              _this4.b2.vely +
              _this4.c2.r2x * _this4.b2.angvel -
              (_this4.b1.vely + _this4.c2.r1x * _this4.b1.angvel);
            j3 = (v2y3 * _this4.nx - v2x3 * _this4.ny + _this4.surfacex) * _this4.c2.tMass;
            jMax3 = _this4.c2.friction * _this4.c2.jnAcc;
            jOld3 = _this4.c2.jtAcc;
            cjAcc3 = jOld3 - j3;
            if (cjAcc3 > jMax3) {
              cjAcc3 = jMax3;
            } else if (cjAcc3 < -jMax3) {
              cjAcc3 = -jMax3;
            }
            j3 = cjAcc3 - jOld3;
            _this4.c2.jtAcc = cjAcc3;
            jx5 = -_this4.ny * j3;
            jy5 = _this4.nx * j3;
            _this4.b2.velx += jx5 * _this4.b2.imass;
            _this4.b2.vely += jy5 * _this4.b2.imass;
            _this4.b1.velx -= jx5 * _this4.b1.imass;
            _this4.b1.vely -= jy5 * _this4.b1.imass;
            _this4.b2.angvel += _this4.rt2b * j3 * _this4.b2.iinertia;
            _this4.b1.angvel -= _this4.rt2a * j3 * _this4.b1.iinertia;
            v1x3 =
              _this4.k1x +
              _this4.b2.velx -
              _this4.c1.r2y * _this4.b2.angvel -
              (_this4.b1.velx - _this4.c1.r1y * _this4.b1.angvel);
            v1y3 =
              _this4.k1y +
              _this4.b2.vely +
              _this4.c1.r2x * _this4.b2.angvel -
              (_this4.b1.vely + _this4.c1.r1x * _this4.b1.angvel);
            v2x3 =
              _this4.k2x +
              _this4.b2.velx -
              _this4.c2.r2y * _this4.b2.angvel -
              (_this4.b1.velx - _this4.c2.r1y * _this4.b1.angvel);
            v2y3 =
              _this4.k2y +
              _this4.b2.vely +
              _this4.c2.r2x * _this4.b2.angvel -
              (_this4.b1.vely + _this4.c2.r1x * _this4.b1.angvel);
            const ax3 = _this4.c1.jnAcc;
            const ay3 = _this4.c2.jnAcc;
            let jnx3 =
              v1x3 * _this4.nx +
              v1y3 * _this4.ny +
              _this4.surfacey +
              _this4.c1.bounce -
              (_this4.Ka * ax3 + _this4.Kb * ay3);
            let jny3 =
              v2x3 * _this4.nx +
              v2y3 * _this4.ny +
              _this4.surfacey +
              _this4.c2.bounce -
              (_this4.Kb * ax3 + _this4.Kc * ay3);
            let xx3 = -(_this4.kMassa * jnx3 + _this4.kMassb * jny3);
            let xy3 = -(_this4.kMassb * jnx3 + _this4.kMassc * jny3);
            if (xx3 >= 0 && xy3 >= 0) {
              jnx3 = xx3 - ax3;
              jny3 = xy3 - ay3;
              _this4.c1.jnAcc = xx3;
              _this4.c2.jnAcc = xy3;
            } else {
              xx3 = -_this4.c1.nMass * jnx3;
              if (xx3 >= 0 && _this4.Kb * xx3 + jny3 >= 0) {
                jnx3 = xx3 - ax3;
                jny3 = -ay3;
                _this4.c1.jnAcc = xx3;
                _this4.c2.jnAcc = 0;
              } else {
                xy3 = -_this4.c2.nMass * jny3;
                if (xy3 >= 0 && _this4.Kb * xy3 + jnx3 >= 0) {
                  jnx3 = -ax3;
                  jny3 = xy3 - ay3;
                  _this4.c1.jnAcc = 0;
                  _this4.c2.jnAcc = xy3;
                } else if (jnx3 >= 0 && jny3 >= 0) {
                  jnx3 = -ax3;
                  jny3 = -ay3;
                  _this4.c1.jnAcc = _this4.c2.jnAcc = 0;
                } else {
                  jnx3 = 0;
                  jny3 = 0;
                }
              }
            }
            j3 = jnx3 + jny3;
            jx5 = _this4.nx * j3;
            jy5 = _this4.ny * j3;
            _this4.b2.velx += jx5 * _this4.b2.imass;
            _this4.b2.vely += jy5 * _this4.b2.imass;
            _this4.b1.velx -= jx5 * _this4.b1.imass;
            _this4.b1.vely -= jy5 * _this4.b1.imass;
            _this4.b2.angvel += (_this4.rn1b * jnx3 + _this4.rn2b * jny3) * _this4.b2.iinertia;
            _this4.b1.angvel -= (_this4.rn1a * jnx3 + _this4.rn2a * jny3) * _this4.b1.iinertia;
          } else {
            if (_this4.radius != 0.0) {
              const dw3 = _this4.b2.angvel - _this4.b1.angvel;
              j3 = dw3 * _this4.rMass;
              jMax3 = _this4.rfric * _this4.c1.jnAcc;
              jOld3 = _this4.jrAcc;
              _this4.jrAcc -= j3;
              if (_this4.jrAcc > jMax3) {
                _this4.jrAcc = jMax3;
              } else if (_this4.jrAcc < -jMax3) {
                _this4.jrAcc = -jMax3;
              }
              j3 = _this4.jrAcc - jOld3;
              _this4.b2.angvel += j3 * _this4.b2.iinertia;
              _this4.b1.angvel -= j3 * _this4.b1.iinertia;
            }
            v1x3 =
              _this4.k1x +
              _this4.b2.velx -
              _this4.c1.r2y * _this4.b2.angvel -
              (_this4.b1.velx - _this4.c1.r1y * _this4.b1.angvel);
            v1y3 =
              _this4.k1y +
              _this4.b2.vely +
              _this4.c1.r2x * _this4.b2.angvel -
              (_this4.b1.vely + _this4.c1.r1x * _this4.b1.angvel);
            j3 =
              (_this4.c1.bounce + (_this4.nx * v1x3 + _this4.ny * v1y3) + _this4.surfacey) *
              _this4.c1.nMass;
            jOld3 = _this4.c1.jnAcc;
            cjAcc3 = jOld3 - j3;
            if (cjAcc3 < 0.0) {
              cjAcc3 = 0.0;
            }
            j3 = cjAcc3 - jOld3;
            _this4.c1.jnAcc = cjAcc3;
            jx5 = _this4.nx * j3;
            jy5 = _this4.ny * j3;
            _this4.b2.velx += jx5 * _this4.b2.imass;
            _this4.b2.vely += jy5 * _this4.b2.imass;
            _this4.b1.velx -= jx5 * _this4.b1.imass;
            _this4.b1.vely -= jy5 * _this4.b1.imass;
            _this4.b2.angvel += _this4.rn1b * j3 * _this4.b2.iinertia;
            _this4.b1.angvel -= _this4.rn1a * j3 * _this4.b1.iinertia;
          }
          b11.sweep_angvel = b11.angvel % MAX_VEL;
          b21.sweep_angvel = b21.angvel % MAX_VEL;
        }
      }
      if (arb != null && arb.active && (arb.immState & 1) != 0 && arb.type == ZPP_Arbiter.COL) {
        if (!b11.sweepFrozen && b11.type != 3) {
          b11.sweepFrozen = true;
          if (minTOI.failed) {
            b11.angvel = b11.sweep_angvel = 0;
          } else if (minTOI.slipped) {
            const b12 = b11;
            b12.sweep_angvel *= ZPP_Space._nape.Config.angularCCDSlipScale;
            b11.angvel = b12.sweep_angvel;
          } else {
            b11.angvel = b11.sweep_angvel;
          }
        }
        if (!b21.sweepFrozen && b21.type != 3) {
          b21.sweepFrozen = true;
          if (minTOI.failed) {
            b21.angvel = b21.sweep_angvel = 0;
          } else if (minTOI.slipped) {
            const b22 = b21;
            b22.sweep_angvel *= ZPP_Space._nape.Config.angularCCDSlipScale;
            b21.angvel = b22.sweep_angvel;
          } else {
            b21.angvel = b21.sweep_angvel;
          }
        }
      }
      const o3 = minTOI;
      o3.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
      ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o3;
    }
    while (this.toiEvents.head != null) {
      const toi1 = this.toiEvents.pop_unsafe();
      const o4 = toi1;
      o4.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
      ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o4;
    }
    let cx_ite5 = this.kinematics.head;
    while (cx_ite5 != null) {
      const cur = cx_ite5.elt;
      const delta2 = deltaTime - cur.sweepTime;
      if (delta2 != 0) {
        cur.sweepTime = deltaTime;
        const t6 = delta2;
        cur.posx += cur.velx * t6;
        cur.posy += cur.vely * t6;
        if (cur.angvel != 0) {
          const dr2 = cur.sweep_angvel * delta2;
          cur.rot += dr2;
          if (dr2 * dr2 > 0.0001) {
            cur.axisx = Math.sin(cur.rot);
            cur.axisy = Math.cos(cur.rot);
          } else {
            const d22 = dr2 * dr2;
            const p4 = 1 - 0.5 * d22;
            const m2 = 1 - (d22 * d22) / 8;
            const nx2 = (p4 * cur.axisx + dr2 * cur.axisy) * m2;
            cur.axisy = (p4 * cur.axisy - dr2 * cur.axisx) * m2;
            cur.axisx = nx2;
          }
        }
      }
      cur.sweepTime = 0;
      cx_ite5 = cx_ite5.next;
    }
    let cx_ite6 = this.live.head;
    while (cx_ite6 != null) {
      const cur1 = cx_ite6.elt;
      if (!cur1.sweepFrozen) {
        const delta3 = deltaTime - cur1.sweepTime;
        if (delta3 != 0) {
          cur1.sweepTime = deltaTime;
          const t7 = delta3;
          cur1.posx += cur1.velx * t7;
          cur1.posy += cur1.vely * t7;
          if (cur1.angvel != 0) {
            const dr3 = cur1.sweep_angvel * delta3;
            cur1.rot += dr3;
            if (dr3 * dr3 > 0.0001) {
              cur1.axisx = Math.sin(cur1.rot);
              cur1.axisy = Math.cos(cur1.rot);
            } else {
              const d23 = dr3 * dr3;
              const p5 = 1 - 0.5 * d23;
              const m3 = 1 - (d23 * d23) / 8;
              const nx3 = (p5 * cur1.axisx + dr3 * cur1.axisy) * m3;
              cur1.axisy = (p5 * cur1.axisy - dr3 * cur1.axisx) * m3;
              cur1.axisx = nx3;
            }
          }
        }
      }
      cur1.sweepTime = 0;
      cx_ite6 = cx_ite6.next;
    }
  }

  continuousEvent(s1: any, s2: any, stat: any, in_arb: any, _: any) {
    if (s1.body.sweepFrozen && s2.body.sweepFrozen) {
      return in_arb;
    }
    if (s1.body.disableCCD || s2.body.disableCCD) {
      return in_arb;
    }
    let tmp;
    if (!(in_arb != null && in_arb.colarb == null)) {
      const b1 = s1.body;
      const b2 = s2.body;
      let con_ignore;
      con_ignore = false;
      let cx_ite = b1.constraints.head;
      while (cx_ite != null) {
        const con = cx_ite.elt;
        if (con.ignore && con.pair_exists(b1.id, b2.id)) {
          con_ignore = true;
          break;
        }
        cx_ite = cx_ite.next;
      }
      let tmp1;
      let tmp2;
      if (!con_ignore) {
        let cur = s1;
        while (cur != null && cur.group == null)
          if (cur.ishape != null) {
            cur = cur.ishape.body;
          } else if (cur.icompound != null) {
            cur = cur.icompound.compound;
          } else {
            cur = cur.ibody.compound;
          }
        let g1 = cur == null ? null : cur.group;
        let tmp3;
        if (g1 == null) {
          tmp3 = false;
        } else {
          let cur1 = s2;
          while (cur1 != null && cur1.group == null)
            if (cur1.ishape != null) {
              cur1 = cur1.ishape.body;
            } else if (cur1.icompound != null) {
              cur1 = cur1.icompound.compound;
            } else {
              cur1 = cur1.ibody.compound;
            }
          let g2 = cur1 == null ? null : cur1.group;
          if (g2 == null) {
            tmp3 = false;
          } else {
            let ret = false;
            while (g1 != null && g2 != null) {
              if (g1 == g2) {
                ret = g1.ignore;
                break;
              }
              if (g1.depth < g2.depth) {
                g2 = g2.group;
              } else {
                g1 = g1.group;
              }
            }
            tmp3 = ret;
          }
        }
        tmp2 = !tmp3;
      } else {
        tmp2 = false;
      }
      if (tmp2) {
        let tmp4;
        if (s1.sensorEnabled || s2.sensorEnabled) {
          const _this = s1.filter;
          const x = s2.filter;
          tmp4 = (_this.sensorMask & x.sensorGroup) != 0 && (x.sensorMask & _this.sensorGroup) != 0;
        } else {
          tmp4 = false;
        }
        if (tmp4) {
          tmp1 = 2;
        } else {
          let tmp5;
          if (s1.fluidEnabled || s2.fluidEnabled) {
            const _this1 = s1.filter;
            const x1 = s2.filter;
            tmp5 =
              (_this1.fluidMask & x1.fluidGroup) != 0 && (x1.fluidMask & _this1.fluidGroup) != 0;
          } else {
            tmp5 = false;
          }
          if (tmp5 && !(b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0)) {
            tmp1 = 0;
          } else {
            const _this2 = s1.filter;
            const x2 = s2.filter;
            tmp1 =
              (_this2.collisionMask & x2.collisionGroup) != 0 &&
              (x2.collisionMask & _this2.collisionGroup) != 0 &&
              !(b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0)
                ? 1
                : -1;
          }
        }
      } else {
        tmp1 = -1;
      }
      tmp = tmp1 <= 0;
    } else {
      tmp = true;
    }
    if (tmp) {
      return in_arb;
    }
    const b11 = s1.body;
    const b21 = s2.body;
    if (stat || b11.bullet || b21.bullet) {
      let toi;
      if (ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool == null) {
        toi = new ZPP_Space._zpp.geom.ZPP_ToiEvent();
      } else {
        toi = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
        ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = toi.next;
        toi.next = null;
      }
      toi.failed = false;
      toi.s1 = toi.s2 = null;
      toi.arbiter = null;
      const kin = b11.type == 3 || b21.type == 3;
      if (stat && !kin) {
        if (s1.body.type != 2) {
          toi.s2 = s1;
          toi.s1 = s2;
        } else {
          toi.s1 = s1;
          toi.s2 = s2;
        }
        toi.kinematic = false;
        ZPP_SweepDistance.staticSweep(toi, this.pre_dt, 0, ZPP_Space._nape.Config.collisionSlopCCD);
      } else {
        toi.s1 = s1;
        toi.s2 = s2;
        toi.kinematic = kin;
        if (toi.s1.body.sweepFrozen || toi.s2.body.sweepFrozen) {
          if (toi.s1.body.sweepFrozen) {
            const tmp6 = toi.s1;
            toi.s1 = toi.s2;
            toi.s2 = tmp6;
            toi.frozen1 = false;
            toi.frozen2 = true;
          }
          ZPP_SweepDistance.staticSweep(
            toi,
            this.pre_dt,
            0,
            ZPP_Space._nape.Config.collisionSlopCCD,
          );
        } else {
          ZPP_SweepDistance.dynamicSweep(
            toi,
            this.pre_dt,
            0,
            ZPP_Space._nape.Config.collisionSlopCCD,
            false,
          );
        }
      }
      if ((stat && toi.toi < 0) || toi.failed) {
        const o = toi;
        o.next = ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool;
        ZPP_Space._zpp.geom.ZPP_ToiEvent.zpp_pool = o;
      } else {
        this.toiEvents.add(toi);
        toi.frozen1 = toi.s1.body.sweepFrozen;
        toi.frozen2 = toi.s2.body.sweepFrozen;
        toi.arbiter = in_arb != null ? in_arb.colarb : null;
      }
    }
    return in_arb;
  }

  bodyCbWake(b: any) {
    if (b.type == 2 && b.cbSet != null) {
      if (this.midstep) {
        let cx_ite = b.cbSet.bodylisteners.head;
        while (cx_ite != null) {
          const i = cx_ite.elt;
          if (i.event != 2) {
            cx_ite = cx_ite.next;
            continue;
          }
          const cb = this.push_callback(i);
          cb.event = 2;
          cb.body = b;
          cx_ite = cx_ite.next;
        }
      } else {
        b.component.woken = true;
      }
    }
  }

  bodyCbSleep(b: any) {
    if (b.type == 2 && b.cbSet != null) {
      let cx_ite = b.cbSet.bodylisteners.head;
      while (cx_ite != null) {
        const i = cx_ite.elt;
        if (i.event != 3) {
          cx_ite = cx_ite.next;
          continue;
        }
        const cb = this.push_callback(i);
        cb.event = 3;
        cb.body = b;
        cx_ite = cx_ite.next;
      }
    }
  }

  constraintCbWake(con: any) {
    if (con.cbSet != null) {
      if (this.midstep) {
        let cx_ite = con.cbSet.conlisteners.head;
        while (cx_ite != null) {
          const i = cx_ite.elt;
          if (i.event != 2) {
            cx_ite = cx_ite.next;
            continue;
          }
          const cb = this.push_callback(i);
          cb.event = 2;
          cb.constraint = con;
          cx_ite = cx_ite.next;
        }
      } else {
        con.component.woken = true;
      }
    }
  }

  constraintCbSleep(con: any) {
    if (con.cbSet != null) {
      let cx_ite = con.cbSet.conlisteners.head;
      while (cx_ite != null) {
        const i = cx_ite.elt;
        if (i.event != 3) {
          cx_ite = cx_ite.next;
          continue;
        }
        const cb = this.push_callback(i);
        cb.event = 3;
        cb.constraint = con;
        cx_ite = cx_ite.next;
      }
    }
  }

  constraintCbBreak(con: any) {
    if (con.cbSet != null) {
      let cx_ite = con.cbSet.conlisteners.head;
      while (cx_ite != null) {
        const i = cx_ite.elt;
        if (i.event != 4) {
          cx_ite = cx_ite.next;
          continue;
        }
        const cb = this.push_callback(i);
        cb.event = 4;
        cb.constraint = con;
        cx_ite = cx_ite.next;
      }
    }
  }

  nullListenerType(cb1: any, cb2: any) {
    const stack = new ZPP_Space._zpp.util.ZNPList_ZPP_Interactor();
    let cx_ite = cb1.interactors.head;
    while (cx_ite != null) {
      const i = cx_ite.elt;
      stack.add(i);
      cx_ite = cx_ite.next;
    }
    if (cb1 != cb2) {
      let cx_ite1 = cb2.interactors.head;
      while (cx_ite1 != null) {
        const i1 = cx_ite1.elt;
        stack.add(i1);
        cx_ite1 = cx_ite1.next;
      }
    }
    while (stack.head != null) {
      const intx = stack.pop_unsafe();
      if (intx.icompound != null) {
        const comp = intx.icompound;
        let cx_ite2 = comp.bodies.head;
        while (cx_ite2 != null) {
          const i2 = cx_ite2.elt;
          stack.add(i2);
          cx_ite2 = cx_ite2.next;
        }
        let cx_ite3 = comp.compounds.head;
        while (cx_ite3 != null) {
          const i3 = cx_ite3.elt;
          stack.add(i3);
          cx_ite3 = cx_ite3.next;
        }
      } else {
        const xbody = intx.ibody != null ? intx.ibody : intx.ishape.body;
        const xshp = intx.ishape != null ? intx.ishape : null;
        let cx_ite4 = xbody.arbiters.head;
        while (cx_ite4 != null) {
          const xarb = cx_ite4.elt;
          if (xarb.present == 0) {
            cx_ite4 = cx_ite4.next;
            continue;
          }
          if (xshp != null && !(xarb.ws1 == xshp || xarb.ws2 == xshp)) {
            cx_ite4 = cx_ite4.next;
            continue;
          }
          this.MRCA_chains(xarb.ws1, xarb.ws2);
          let cx_ite5 = this.mrca1.head;
          while (cx_ite5 != null) {
            const i11 = cx_ite5.elt;
            if (i11.cbSet != cb1 && i11.cbSet != cb2) {
              cx_ite5 = cx_ite5.next;
              continue;
            }
            let cx_ite6 = this.mrca2.head;
            while (cx_ite6 != null) {
              const i21 = cx_ite6.elt;
              if (
                (i11.cbSet == cb1 && i21.cbSet != cb2) ||
                (i11.cbSet == cb2 && i21.cbSet != cb1)
              ) {
                cx_ite6 = cx_ite6.next;
                continue;
              }
              const callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i11, i21);
              if (callbackset != null) {
                while (callbackset.arbiters.head != null) {
                  const arb = callbackset.arbiters.pop_unsafe();
                  arb.present--;
                }
                this.remove_callbackset(callbackset);
              }
              cx_ite6 = cx_ite6.next;
            }
            cx_ite5 = cx_ite5.next;
          }
          cx_ite4 = cx_ite4.next;
        }
      }
    }
  }

  nullInteractorType(intx: any, me: any) {
    if (me == null) {
      me = intx;
    }
    if (intx.icompound != null) {
      const comp = intx.icompound;
      let cx_ite = comp.bodies.head;
      while (cx_ite != null) {
        const body = cx_ite.elt;
        this.nullInteractorType(body, me);
        cx_ite = cx_ite.next;
      }
      let cx_ite1 = comp.compounds.head;
      while (cx_ite1 != null) {
        const comp1 = cx_ite1.elt;
        this.nullInteractorType(comp1, me);
        cx_ite1 = cx_ite1.next;
      }
    } else {
      const xbody = intx.ibody != null ? intx.ibody : intx.ishape.body;
      const xshp = intx.ishape != null ? intx.ishape : null;
      let cx_ite2 = xbody.arbiters.head;
      while (cx_ite2 != null) {
        const xarb = cx_ite2.elt;
        if (xarb.present == 0) {
          cx_ite2 = cx_ite2.next;
          continue;
        }
        if (xshp != null && !(xarb.ws1 == xshp || xarb.ws2 == xshp)) {
          cx_ite2 = cx_ite2.next;
          continue;
        }
        this.MRCA_chains(xarb.ws1, xarb.ws2);
        let cx_ite3 = this.mrca1.head;
        while (cx_ite3 != null) {
          const i1 = cx_ite3.elt;
          let cx_ite4 = this.mrca2.head;
          while (cx_ite4 != null) {
            const i2 = cx_ite4.elt;
            if (i1 != me && i2 != me) {
              cx_ite4 = cx_ite4.next;
              continue;
            }
            const callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i1, i2);
            if (callbackset != null) {
              xarb.present--;
              callbackset.remove_arb(xarb);
              if (callbackset.arbiters.head == null) {
                this.remove_callbackset(callbackset);
              }
            }
            cx_ite4 = cx_ite4.next;
          }
          cx_ite3 = cx_ite3.next;
        }
        cx_ite2 = cx_ite2.next;
      }
    }
  }

  freshListenerType(cb1: any, cb2: any) {
    const stack = new ZPP_Space._zpp.util.ZNPList_ZPP_Interactor();
    let cx_ite = cb1.interactors.head;
    while (cx_ite != null) {
      const i = cx_ite.elt;
      stack.add(i);
      cx_ite = cx_ite.next;
    }
    if (cb1 != cb2) {
      let cx_ite1 = cb2.interactors.head;
      while (cx_ite1 != null) {
        const i1 = cx_ite1.elt;
        stack.add(i1);
        cx_ite1 = cx_ite1.next;
      }
    }
    while (stack.head != null) {
      const intx = stack.pop_unsafe();
      if (intx.icompound != null) {
        const comp = intx.icompound;
        let cx_ite2 = comp.bodies.head;
        while (cx_ite2 != null) {
          const i2 = cx_ite2.elt;
          stack.add(i2);
          cx_ite2 = cx_ite2.next;
        }
        let cx_ite3 = comp.compounds.head;
        while (cx_ite3 != null) {
          const i3 = cx_ite3.elt;
          stack.add(i3);
          cx_ite3 = cx_ite3.next;
        }
      } else {
        const xbody = intx.ibody != null ? intx.ibody : intx.ishape.body;
        const xshp = intx.ishape != null ? intx.ishape : null;
        let cx_ite4 = xbody.arbiters.head;
        while (cx_ite4 != null) {
          const xarb = cx_ite4.elt;
          if (!xarb.presentable) {
            cx_ite4 = cx_ite4.next;
            continue;
          }
          if (xshp != null && !(xarb.ws1 == xshp || xarb.ws2 == xshp)) {
            cx_ite4 = cx_ite4.next;
            continue;
          }
          this.MRCA_chains(xarb.ws1, xarb.ws2);
          let cx_ite5 = this.mrca1.head;
          while (cx_ite5 != null) {
            const i11 = cx_ite5.elt;
            if (i11.cbSet != cb1 && i11.cbSet != cb2) {
              cx_ite5 = cx_ite5.next;
              continue;
            }
            let cx_ite6 = this.mrca2.head;
            while (cx_ite6 != null) {
              const i21 = cx_ite6.elt;
              if (
                (i11.cbSet == cb1 && i21.cbSet != cb2) ||
                (i11.cbSet == cb2 && i21.cbSet != cb1)
              ) {
                cx_ite6 = cx_ite6.next;
                continue;
              }
              let callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i11, i21);
              if (callbackset == null) {
                callbackset = ZPP_CallbackSet.get(i11, i21);
                this.add_callbackset(callbackset);
              }
              let tmp;
              let ret;
              ret = false;
              let cx_ite7 = callbackset.arbiters.head;
              while (cx_ite7 != null) {
                const npite = cx_ite7.elt;
                if (npite == xarb) {
                  ret = true;
                  break;
                }
                cx_ite7 = cx_ite7.next;
              }
              if (!ret) {
                const _this = callbackset.arbiters;
                let ret1;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                  ret1 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
                } else {
                  ret1 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret1.next;
                  ret1.next = null;
                }
                ret1.elt = xarb;
                const temp = ret1;
                temp.next = _this.head;
                _this.head = temp;
                _this.modified = true;
                _this.length++;
                tmp = true;
              } else {
                tmp = false;
              }
              if (tmp) {
                xarb.present++;
              }
              cx_ite6 = cx_ite6.next;
            }
            cx_ite5 = cx_ite5.next;
          }
          cx_ite4 = cx_ite4.next;
        }
      }
    }
  }

  freshInteractorType(intx: any, me: any) {
    if (me == null) {
      me = intx;
    }
    if (intx.icompound != null) {
      const comp = intx.icompound;
      let cx_ite = comp.bodies.head;
      while (cx_ite != null) {
        const body = cx_ite.elt;
        this.freshInteractorType(body, me);
        cx_ite = cx_ite.next;
      }
      let cx_ite1 = comp.compounds.head;
      while (cx_ite1 != null) {
        const comp1 = cx_ite1.elt;
        this.freshInteractorType(comp1, me);
        cx_ite1 = cx_ite1.next;
      }
    } else {
      const xbody = intx.ibody != null ? intx.ibody : intx.ishape.body;
      const xshp = intx.ishape != null ? intx.ishape : null;
      let cx_ite2 = xbody.arbiters.head;
      while (cx_ite2 != null) {
        const xarb = cx_ite2.elt;
        if (!xarb.presentable) {
          cx_ite2 = cx_ite2.next;
          continue;
        }
        if (xshp != null && !(xarb.ws1 == xshp || xarb.ws2 == xshp)) {
          cx_ite2 = cx_ite2.next;
          continue;
        }
        this.MRCA_chains(xarb.ws1, xarb.ws2);
        let cx_ite3 = this.mrca1.head;
        while (cx_ite3 != null) {
          const i1 = cx_ite3.elt;
          let cx_ite4 = this.mrca2.head;
          while (cx_ite4 != null) {
            const i2 = cx_ite4.elt;
            if (i1 != me && i2 != me) {
              cx_ite4 = cx_ite4.next;
              continue;
            }
            const cb1 = i1.cbSet;
            const cb2 = i2.cbSet;
            cb1.validate();
            cb2.validate();
            const _this = cb1.manager;
            let ret = null;
            const pairs = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
            let cx_ite5 = pairs.head;
            while (cx_ite5 != null) {
              const p = cx_ite5.elt;
              if ((p.a == cb1 && p.b == cb2) || (p.a == cb2 && p.b == cb1)) {
                ret = p;
                break;
              }
              cx_ite5 = cx_ite5.next;
            }
            if (ret == null) {
              let ret1;
              if (ZPP_CbSetPair.zpp_pool == null) {
                ret1 = new ZPP_CbSetPair();
              } else {
                ret1 = ZPP_CbSetPair.zpp_pool;
                ZPP_CbSetPair.zpp_pool = ret1.next;
                ret1.next = null;
              }
              ret1.zip_listeners = true;
              if (ZPP_CbSet.setlt(cb1, cb2)) {
                ret1.a = cb1;
                ret1.b = cb2;
              } else {
                ret1.a = cb2;
                ret1.b = cb1;
              }
              ret = ret1;
              cb1.cbpairs.add(ret);
              if (cb2 != cb1) {
                cb2.cbpairs.add(ret);
              }
            }
            if (ret.zip_listeners) {
              ret.zip_listeners = false;
              ret.__validate();
            }
            if (ret.listeners.head != null) {
              let callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i1, i2);
              if (callbackset == null) {
                callbackset = ZPP_CallbackSet.get(i1, i2);
                this.add_callbackset(callbackset);
              }
              let tmp;
              let ret2;
              ret2 = false;
              let cx_ite6 = callbackset.arbiters.head;
              while (cx_ite6 != null) {
                const npite = cx_ite6.elt;
                if (npite == xarb) {
                  ret2 = true;
                  break;
                }
                cx_ite6 = cx_ite6.next;
              }
              if (!ret2) {
                const _this1 = callbackset.arbiters;
                let ret3;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                  ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
                } else {
                  ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret3.next;
                  ret3.next = null;
                }
                ret3.elt = xarb;
                const temp = ret3;
                temp.next = _this1.head;
                _this1.head = temp;
                _this1.modified = true;
                _this1.length++;
                tmp = true;
              } else {
                tmp = false;
              }
              if (tmp) {
                xarb.present++;
              }
            }
            cx_ite4 = cx_ite4.next;
          }
          cx_ite3 = cx_ite3.next;
        }
        cx_ite2 = cx_ite2.next;
      }
    }
  }

  wakeCompound(x: any) {
    let cx_ite = x.bodies.head;
    while (cx_ite != null) {
      const y = cx_ite.elt;
      const o = y;
      if (!o.world) {
        o.component.waket = this.stamp + (this.midstep ? 0 : 1);
        if (o.type == 3) {
          o.kinematicDelaySleep = true;
        }
        if (o.component.sleeping) {
          this.really_wake(o, false);
        }
      }
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = x.constraints.head;
    while (cx_ite1 != null) {
      const i = cx_ite1.elt;
      this.wake_constraint(i);
      cx_ite1 = cx_ite1.next;
    }
    let cx_ite2 = x.compounds.head;
    while (cx_ite2 != null) {
      const i1 = cx_ite2.elt;
      this.wakeCompound(i1);
      cx_ite2 = cx_ite2.next;
    }
  }

  wakeIsland(i: any) {
    while (i.comps.head != null) {
      const c = i.comps.pop_unsafe();
      c.waket = this.stamp + (this.midstep ? 0 : 1);
      if (c.isBody) {
        const b = c.body;
        this.live.add(b);
        let cx_ite = b.arbiters.head;
        while (cx_ite != null) {
          const arb = cx_ite.elt;
          if (arb.sleeping) {
            arb.sleeping = false;
            arb.up_stamp += this.stamp - arb.sleep_stamp;
            if (arb.type == ZPP_Arbiter.COL) {
              const carb = arb.colarb;
              if (carb.stat) {
                const _this = this.c_arbiters_true;
                let ret;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool == null) {
                  ret = new ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter();
                } else {
                  ret = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = ret.next;
                  ret.next = null;
                }
                ret.elt = carb;
                const temp = ret;
                temp.next = _this.head;
                _this.head = temp;
                _this.modified = true;
                _this.length++;
              } else {
                const _this1 = this.c_arbiters_false;
                let ret1;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool == null) {
                  ret1 = new ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter();
                } else {
                  ret1 = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = ret1.next;
                  ret1.next = null;
                }
                ret1.elt = carb;
                const temp1 = ret1;
                temp1.next = _this1.head;
                _this1.head = temp1;
                _this1.modified = true;
                _this1.length++;
              }
            } else if (arb.type == ZPP_Arbiter.FLUID) {
              const _this2 = this.f_arbiters;
              const o = arb.fluidarb;
              let ret2;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool == null) {
                ret2 = new ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter();
              } else {
                ret2 = ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = ret2.next;
                ret2.next = null;
              }
              ret2.elt = o;
              const temp2 = ret2;
              temp2.next = _this2.head;
              _this2.head = temp2;
              _this2.modified = true;
              _this2.length++;
            } else {
              const _this3 = this.s_arbiters;
              const o1 = arb.sensorarb;
              let ret3;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool == null) {
                ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter();
              } else {
                ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = ret3.next;
                ret3.next = null;
              }
              ret3.elt = o1;
              const temp3 = ret3;
              temp3.next = _this3.head;
              _this3.head = temp3;
              _this3.modified = true;
              _this3.length++;
            }
          }
          cx_ite = cx_ite.next;
        }
        this.bodyCbWake(b);
        c.sleeping = false;
        c.island = null;
        c.parent = c;
        c.rank = 0;
        if (b.type != 1) {
          let cx_ite1 = b.shapes.head;
          while (cx_ite1 != null) {
            const shape = cx_ite1.elt;
            if (shape.node != null) {
              this.bphase.sync(shape);
            }
            cx_ite1 = cx_ite1.next;
          }
        }
      } else {
        const con = c.constraint;
        const _this4 = this.live_constraints;
        let ret4;
        if (ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool == null) {
          ret4 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint();
        } else {
          ret4 = ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool;
          ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool = ret4.next;
          ret4.next = null;
        }
        ret4.elt = con;
        const temp4 = ret4;
        temp4.next = _this4.head;
        _this4.head = temp4;
        _this4.modified = true;
        _this4.length++;
        this.constraintCbWake(con);
        c.sleeping = false;
        c.island = null;
        c.parent = c;
        c.rank = 0;
      }
    }
    const o2 = i;
    o2.next = ZPP_Island.zpp_pool;
    ZPP_Island.zpp_pool = o2;
  }

  non_inlined_wake(o: any, fst?: any) {
    if (fst == null) {
      fst = false;
    }
    const o1 = o;
    if (!o1.world) {
      o1.component.waket = this.stamp + (this.midstep ? 0 : 1);
      if (o1.type == 3) {
        o1.kinematicDelaySleep = true;
      }
      if (o1.component.sleeping) {
        this.really_wake(o1, fst);
      }
    }
  }

  really_wake(o: any, fst?: any) {
    if (fst == null) {
      fst = false;
    }
    if (o.component.island == null) {
      o.component.sleeping = false;
      if (o.type == 3 || o.type == 1) {
        const _this = this.staticsleep;
        let ret;
        if (ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool == null) {
          ret = new ZPP_Space._zpp.util.ZNPNode_ZPP_Body();
        } else {
          ret = ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool;
          ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool = ret.next;
          ret.next = null;
        }
        ret.elt = o;
        const temp = ret;
        temp.next = _this.head;
        _this.head = temp;
        _this.modified = true;
        _this.length++;
      } else {
        const _this1 = this.live;
        let ret1;
        if (ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool == null) {
          ret1 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Body();
        } else {
          ret1 = ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool;
          ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool = ret1.next;
          ret1.next = null;
        }
        ret1.elt = o;
        const temp1 = ret1;
        temp1.next = _this1.head;
        _this1.head = temp1;
        _this1.modified = true;
        _this1.length++;
      }
      let cx_ite = o.constraints.head;
      while (cx_ite != null) {
        const con = cx_ite.elt;
        if (con.space == this) {
          this.wake_constraint(con);
        }
        cx_ite = cx_ite.next;
      }
      let cx_ite1 = o.arbiters.head;
      while (cx_ite1 != null) {
        const arb = cx_ite1.elt;
        if (arb.sleeping) {
          arb.sleeping = false;
          arb.up_stamp += this.stamp + (this.midstep ? 0 : 1) - arb.sleep_stamp;
          if (arb.type == ZPP_Arbiter.COL) {
            const carb = arb.colarb;
            if (carb.stat) {
              const _this2 = this.c_arbiters_true;
              let ret2;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool == null) {
                ret2 = new ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter();
              } else {
                ret2 = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = ret2.next;
                ret2.next = null;
              }
              ret2.elt = carb;
              const temp2 = ret2;
              temp2.next = _this2.head;
              _this2.head = temp2;
              _this2.modified = true;
              _this2.length++;
            } else {
              const _this3 = this.c_arbiters_false;
              let ret3;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool == null) {
                ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter();
              } else {
                ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = ret3.next;
                ret3.next = null;
              }
              ret3.elt = carb;
              const temp3 = ret3;
              temp3.next = _this3.head;
              _this3.head = temp3;
              _this3.modified = true;
              _this3.length++;
            }
          } else if (arb.type == ZPP_Arbiter.FLUID) {
            const _this4 = this.f_arbiters;
            const o1 = arb.fluidarb;
            let ret4;
            if (ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool == null) {
              ret4 = new ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter();
            } else {
              ret4 = ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = ret4.next;
              ret4.next = null;
            }
            ret4.elt = o1;
            const temp4 = ret4;
            temp4.next = _this4.head;
            _this4.head = temp4;
            _this4.modified = true;
            _this4.length++;
          } else {
            const _this5 = this.s_arbiters;
            const o2 = arb.sensorarb;
            let ret5;
            if (ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool == null) {
              ret5 = new ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter();
            } else {
              ret5 = ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = ret5.next;
              ret5.next = null;
            }
            ret5.elt = o2;
            const temp5 = ret5;
            temp5.next = _this5.head;
            _this5.head = temp5;
            _this5.modified = true;
            _this5.length++;
          }
        }
        if (
          arb.type != ZPP_Arbiter.SENSOR &&
          !arb.cleared &&
          arb.up_stamp >= this.stamp &&
          (arb.immState & 1) != 0
        ) {
          if (arb.b1.type == 2 && arb.b1.component.sleeping) {
            const o3 = arb.b1;
            if (!o3.world) {
              o3.component.waket = this.stamp + (this.midstep ? 0 : 1);
              if (o3.type == 3) {
                o3.kinematicDelaySleep = true;
              }
              if (o3.component.sleeping) {
                this.really_wake(o3, false);
              }
            }
          }
          if (arb.b2.type == 2 && arb.b2.component.sleeping) {
            const o4 = arb.b2;
            if (!o4.world) {
              o4.component.waket = this.stamp + (this.midstep ? 0 : 1);
              if (o4.type == 3) {
                o4.kinematicDelaySleep = true;
              }
              if (o4.component.sleeping) {
                this.really_wake(o4, false);
              }
            }
          }
        }
        cx_ite1 = cx_ite1.next;
      }
      if (!fst && o.type == 2) {
        this.bodyCbWake(o);
      }
      if (!fst && !this.bphase.is_sweep && o.type != 1) {
        let cx_ite2 = o.shapes.head;
        while (cx_ite2 != null) {
          const shape = cx_ite2.elt;
          if (shape.node != null) {
            this.bphase.sync(shape);
          }
          cx_ite2 = cx_ite2.next;
        }
      }
    } else {
      this.wakeIsland(o.component.island);
    }
  }

  wake_constraint(con: any, fst?: any) {
    if (fst == null) {
      fst = false;
    }
    if (con.active) {
      con.component.waket = this.stamp + (this.midstep ? 0 : 1);
      if (con.component.sleeping) {
        if (con.component.island == null) {
          con.component.sleeping = false;
          const _this = this.live_constraints;
          let ret;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool == null) {
            ret = new ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint();
          } else {
            ret = ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool = ret.next;
            ret.next = null;
          }
          ret.elt = con;
          const temp = ret;
          temp.next = _this.head;
          _this.head = temp;
          _this.modified = true;
          _this.length++;
          con.wake_connected();
          if (!fst) {
            this.constraintCbWake(con);
          }
        } else {
          this.wakeIsland(con.component.island);
        }
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  doForests(dt: any) {
    let cx_ite = this.c_arbiters_false.head;
    while (cx_ite != null) {
      const arb = cx_ite.elt;
      if (!arb.cleared && arb.up_stamp == this.stamp && (arb.immState & 1) != 0) {
        if (arb.b1.type == 2 && arb.b2.type == 2) {
          let xr;
          if (arb.b1.component == arb.b1.component.parent) {
            xr = arb.b1.component;
          } else {
            let obj = arb.b1.component;
            let stack = null;
            while (obj != obj.parent) {
              const nxt = obj.parent;
              obj.parent = stack;
              stack = obj;
              obj = nxt;
            }
            while (stack != null) {
              const nxt1: any = stack.parent;
              stack.parent = obj;
              stack = nxt1;
            }
            xr = obj;
          }
          let yr;
          if (arb.b2.component == arb.b2.component.parent) {
            yr = arb.b2.component;
          } else {
            let obj1 = arb.b2.component;
            let stack1 = null;
            while (obj1 != obj1.parent) {
              const nxt2 = obj1.parent;
              obj1.parent = stack1;
              stack1 = obj1;
              obj1 = nxt2;
            }
            while (stack1 != null) {
              const nxt3: any = stack1.parent;
              stack1.parent = obj1;
              stack1 = nxt3;
            }
            yr = obj1;
          }
          if (xr != yr) {
            if (xr.rank < yr.rank) {
              xr.parent = yr;
            } else if (xr.rank > yr.rank) {
              yr.parent = xr;
            } else {
              yr.parent = xr;
              xr.rank++;
            }
          }
        }
      }
      cx_ite = cx_ite.next;
    }
    let cx_ite1 = this.f_arbiters.head;
    while (cx_ite1 != null) {
      const arb1 = cx_ite1.elt;
      if (!arb1.cleared && arb1.up_stamp == this.stamp && (arb1.immState & 1) != 0) {
        if (arb1.b1.type == 2 && arb1.b2.type == 2) {
          let xr1;
          if (arb1.b1.component == arb1.b1.component.parent) {
            xr1 = arb1.b1.component;
          } else {
            let obj2 = arb1.b1.component;
            let stack2 = null;
            while (obj2 != obj2.parent) {
              const nxt4 = obj2.parent;
              obj2.parent = stack2;
              stack2 = obj2;
              obj2 = nxt4;
            }
            while (stack2 != null) {
              const nxt5: any = stack2.parent;
              stack2.parent = obj2;
              stack2 = nxt5;
            }
            xr1 = obj2;
          }
          let yr1;
          if (arb1.b2.component == arb1.b2.component.parent) {
            yr1 = arb1.b2.component;
          } else {
            let obj3 = arb1.b2.component;
            let stack3 = null;
            while (obj3 != obj3.parent) {
              const nxt6 = obj3.parent;
              obj3.parent = stack3;
              stack3 = obj3;
              obj3 = nxt6;
            }
            while (stack3 != null) {
              const nxt7: any = stack3.parent;
              stack3.parent = obj3;
              stack3 = nxt7;
            }
            yr1 = obj3;
          }
          if (xr1 != yr1) {
            if (xr1.rank < yr1.rank) {
              xr1.parent = yr1;
            } else if (xr1.rank > yr1.rank) {
              yr1.parent = xr1;
            } else {
              yr1.parent = xr1;
              xr1.rank++;
            }
          }
        }
      }
      cx_ite1 = cx_ite1.next;
    }
    let cx_ite2 = this.live_constraints.head;
    while (cx_ite2 != null) {
      const con = cx_ite2.elt;
      con.forest();
      cx_ite2 = cx_ite2.next;
    }
    while (this.live.head != null) {
      const _this = this.live;
      const ret = _this.head.elt;
      _this.pop();
      const o = ret;
      const oc = o.component;
      let root;
      if (oc == oc.parent) {
        root = oc;
      } else {
        let obj4 = oc;
        let stack4 = null;
        while (obj4 != obj4.parent) {
          const nxt8 = obj4.parent;
          obj4.parent = stack4;
          stack4 = obj4;
          obj4 = nxt8;
        }
        while (stack4 != null) {
          const nxt9: any = stack4.parent;
          stack4.parent = obj4;
          stack4 = nxt9;
        }
        root = obj4;
      }
      if (root.island == null) {
        if (ZPP_Island.zpp_pool == null) {
          root.island = new ZPP_Island();
        } else {
          root.island = ZPP_Island.zpp_pool;
          ZPP_Island.zpp_pool = root.island.next;
          root.island.next = null;
        }
        root.island.waket = 0;
        const _this1 = this.islands;
        const o1 = root.island;
        o1._inuse = true;
        const temp = o1;
        temp.next = _this1.next;
        _this1.next = temp;
        _this1.modified = true;
        _this1.length++;
        root.island.sleep = true;
      }
      oc.island = root.island;
      const _this2 = oc.island.comps;
      let ret1;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Component.zpp_pool == null) {
        ret1 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Component();
      } else {
        ret1 = ZPP_Space._zpp.util.ZNPNode_ZPP_Component.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Component.zpp_pool = ret1.next;
        ret1.next = null;
      }
      ret1.elt = oc;
      const temp1 = ret1;
      temp1.next = _this2.head;
      _this2.head = temp1;
      _this2.modified = true;
      _this2.length++;
      const rest = o.atRest(dt);
      oc.island.sleep = oc.island.sleep && rest;
      if (oc.waket > oc.island.waket) {
        oc.island.waket = oc.waket;
      }
    }
    while (this.live_constraints.head != null) {
      const _this3 = this.live_constraints;
      const ret2 = _this3.head.elt;
      _this3.pop();
      const o2 = ret2;
      const oc1 = o2.component;
      let root1;
      if (oc1 == oc1.parent) {
        root1 = oc1;
      } else {
        let obj5 = oc1;
        let stack5 = null;
        while (obj5 != obj5.parent) {
          const nxt10 = obj5.parent;
          obj5.parent = stack5;
          stack5 = obj5;
          obj5 = nxt10;
        }
        while (stack5 != null) {
          const nxt11: any = stack5.parent;
          stack5.parent = obj5;
          stack5 = nxt11;
        }
        root1 = obj5;
      }
      oc1.island = root1.island;
      const _this4 = oc1.island.comps;
      let ret3;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Component.zpp_pool == null) {
        ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Component();
      } else {
        ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_Component.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Component.zpp_pool = ret3.next;
        ret3.next = null;
      }
      ret3.elt = oc1;
      const temp2 = ret3;
      temp2.next = _this4.head;
      _this4.head = temp2;
      _this4.modified = true;
      _this4.length++;
      if (oc1.waket > oc1.island.waket) {
        oc1.island.waket = oc1.waket;
      }
    }
    while (this.islands.next != null) {
      const _this5 = this.islands;
      const ret4 = _this5.next;
      _this5.pop();
      const i = ret4;
      if (i.sleep) {
        let cx_ite3 = i.comps.head;
        while (cx_ite3 != null) {
          const c = cx_ite3.elt;
          if (c.isBody) {
            const b = c.body;
            b.velx = 0;
            b.vely = 0;
            b.angvel = 0;
            c.sleeping = true;
            let cx_ite4 = b.shapes.head;
            while (cx_ite4 != null) {
              const shape = cx_ite4.elt;
              this.bphase.sync(shape);
              cx_ite4 = cx_ite4.next;
            }
            this.bodyCbSleep(b);
          } else {
            const con1 = c.constraint;
            this.constraintCbSleep(con1);
            c.sleeping = true;
          }
          cx_ite3 = cx_ite3.next;
        }
      } else {
        while (i.comps.head != null) {
          const _this6 = i.comps;
          const ret5 = _this6.head.elt;
          _this6.pop();
          const c1 = ret5;
          c1.waket = i.waket;
          if (c1.isBody) {
            const _this7 = this.live;
            const o3 = c1.body;
            let ret6;
            if (ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool == null) {
              ret6 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Body();
            } else {
              ret6 = ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Body.zpp_pool = ret6.next;
              ret6.next = null;
            }
            ret6.elt = o3;
            const temp3 = ret6;
            temp3.next = _this7.head;
            _this7.head = temp3;
            _this7.modified = true;
            _this7.length++;
          } else {
            const _this8 = this.live_constraints;
            const o4 = c1.constraint;
            let ret7;
            if (ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool == null) {
              ret7 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint();
            } else {
              ret7 = ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Constraint.zpp_pool = ret7.next;
              ret7.next = null;
            }
            ret7.elt = o4;
            const temp4 = ret7;
            temp4.next = _this8.head;
            _this8.head = temp4;
            _this8.modified = true;
            _this8.length++;
          }
          c1.sleeping = false;
          c1.island = null;
          c1.parent = c1;
          c1.rank = 0;
        }
        const o5 = i;
        o5.next = ZPP_Island.zpp_pool;
        ZPP_Island.zpp_pool = o5;
      }
    }
  }

  sleepArbiters() {
    let pre = null;
    let arbs = this.c_arbiters_true;
    let arbite = arbs.head;
    let fst = this.c_arbiters_false != null;
    if (fst && arbite == null) {
      fst = false;
      arbite = this.c_arbiters_false.head;
      arbs = this.c_arbiters_false;
      pre = null;
    }
    while (arbite != null) {
      const arb = arbite.elt;
      if (arb.b1.component.sleeping && arb.b2.component.sleeping) {
        arb.sleep_stamp = this.stamp;
        arb.sleeping = true;
        let old;
        let ret;
        if (pre == null) {
          old = arbs.head;
          ret = old.next;
          arbs.head = ret;
          if (arbs.head == null) {
            arbs.pushmod = true;
          }
        } else {
          old = pre.next;
          ret = old.next;
          pre.next = ret;
          if (ret == null) {
            arbs.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = o;
        arbs.modified = true;
        arbs.length--;
        arbs.pushmod = true;
        arbite = ret;
        if (fst && arbite == null) {
          fst = false;
          arbite = this.c_arbiters_false.head;
          arbs = this.c_arbiters_false;
          pre = null;
        }
        continue;
      }
      pre = arbite;
      arbite = arbite.next;
      if (fst && arbite == null) {
        fst = false;
        arbite = this.c_arbiters_false.head;
        arbs = this.c_arbiters_false;
        pre = null;
      }
    }
    let pre1 = null;
    let arbs1 = this.f_arbiters;
    let arbite1 = arbs1.head;
    let fst1 = false;
    if (fst1 && arbite1 == null) {
      fst1 = false;
      arbs1 = null;
      pre1 = null;
    }
    while (arbite1 != null) {
      const arb1 = arbite1.elt;
      if (arb1.b1.component.sleeping && arb1.b2.component.sleeping) {
        arb1.sleep_stamp = this.stamp;
        arb1.sleeping = true;
        let old1;
        let ret1;
        if (pre1 == null) {
          old1 = arbs1.head;
          ret1 = old1.next;
          arbs1.head = ret1;
          if (arbs1.head == null) {
            arbs1.pushmod = true;
          }
        } else {
          old1 = pre1.next;
          ret1 = old1.next;
          pre1.next = ret1;
          if (ret1 == null) {
            arbs1.pushmod = true;
          }
        }
        const o1 = old1;
        o1.elt = null;
        o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = o1;
        arbs1.modified = true;
        arbs1.length--;
        arbs1.pushmod = true;
        arbite1 = ret1;
        if (fst1 && arbite1 == null) {
          fst1 = false;
          arbs1 = null;
          pre1 = null;
        }
        continue;
      }
      pre1 = arbite1;
      arbite1 = arbite1.next;
      if (fst1 && arbite1 == null) {
        fst1 = false;
        arbs1 = null;
        pre1 = null;
      }
    }
    let pre2 = null;
    let arbs2 = this.s_arbiters;
    let arbite2 = arbs2.head;
    let fst2 = false;
    if (fst2 && arbite2 == null) {
      fst2 = false;
      arbs2 = null;
      pre2 = null;
    }
    while (arbite2 != null) {
      const arb2 = arbite2.elt;
      if (arb2.b1.component.sleeping && arb2.b2.component.sleeping) {
        arb2.sleep_stamp = this.stamp;
        arb2.sleeping = true;
        let old2;
        let ret2;
        if (pre2 == null) {
          old2 = arbs2.head;
          ret2 = old2.next;
          arbs2.head = ret2;
          if (arbs2.head == null) {
            arbs2.pushmod = true;
          }
        } else {
          old2 = pre2.next;
          ret2 = old2.next;
          pre2.next = ret2;
          if (ret2 == null) {
            arbs2.pushmod = true;
          }
        }
        const o2 = old2;
        o2.elt = null;
        o2.next = ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = o2;
        arbs2.modified = true;
        arbs2.length--;
        arbs2.pushmod = true;
        arbite2 = ret2;
        if (fst2 && arbite2 == null) {
          fst2 = false;
          arbs2 = null;
          pre2 = null;
        }
        continue;
      }
      pre2 = arbite2;
      arbite2 = arbite2.next;
      if (fst2 && arbite2 == null) {
        fst2 = false;
        arbs2 = null;
        pre2 = null;
      }
    }
  }

  static_validation(body: any) {
    if (body.shapes.head != null) {
      if (body.shapes.head == null) {
        throw new Error("Error: Body bounds only makes sense if it contains shapes");
      }
      if (body.zip_aabb) {
        body.zip_aabb = false;
        body.aabb.minx = Infinity;
        body.aabb.miny = Infinity;
        body.aabb.maxx = -Infinity;
        body.aabb.maxy = -Infinity;
        let cx_ite = body.shapes.head;
        while (cx_ite != null) {
          const s = cx_ite.elt;
          if (s.zip_aabb) {
            if (s.body != null) {
              s.zip_aabb = false;
              if (s.type == 0) {
                const _this = s.circle;
                if (_this.zip_worldCOM) {
                  if (_this.body != null) {
                    _this.zip_worldCOM = false;
                    if (_this.zip_localCOM) {
                      _this.zip_localCOM = false;
                      if (_this.type == 1) {
                        const _this1 = _this.polygon;
                        if (_this1.lverts.next == null) {
                          throw new Error("Error: An empty polygon has no meaningful localCOM");
                        }
                        if (_this1.lverts.next.next == null) {
                          _this1.localCOMx = _this1.lverts.next.x;
                          _this1.localCOMy = _this1.lverts.next.y;
                        } else if (_this1.lverts.next.next.next == null) {
                          _this1.localCOMx = _this1.lverts.next.x;
                          _this1.localCOMy = _this1.lverts.next.y;
                          const t = 1.0;
                          _this1.localCOMx += _this1.lverts.next.next.x * t;
                          _this1.localCOMy += _this1.lverts.next.next.y * t;
                          const t1 = 0.5;
                          _this1.localCOMx *= t1;
                          _this1.localCOMy *= t1;
                        } else {
                          _this1.localCOMx = 0;
                          _this1.localCOMy = 0;
                          let area = 0.0;
                          let cx_ite1 = _this1.lverts.next;
                          let u = cx_ite1;
                          cx_ite1 = cx_ite1.next;
                          let v = cx_ite1;
                          cx_ite1 = cx_ite1.next;
                          while (cx_ite1 != null) {
                            const w = cx_ite1;
                            area += v.x * (w.y - u.y);
                            const cf = w.y * v.x - w.x * v.y;
                            _this1.localCOMx += (v.x + w.x) * cf;
                            _this1.localCOMy += (v.y + w.y) * cf;
                            u = v;
                            v = w;
                            cx_ite1 = cx_ite1.next;
                          }
                          cx_ite1 = _this1.lverts.next;
                          const w1 = cx_ite1;
                          area += v.x * (w1.y - u.y);
                          const cf1 = w1.y * v.x - w1.x * v.y;
                          _this1.localCOMx += (v.x + w1.x) * cf1;
                          _this1.localCOMy += (v.y + w1.y) * cf1;
                          u = v;
                          v = w1;
                          cx_ite1 = cx_ite1.next;
                          const w2 = cx_ite1;
                          area += v.x * (w2.y - u.y);
                          const cf2 = w2.y * v.x - w2.x * v.y;
                          _this1.localCOMx += (v.x + w2.x) * cf2;
                          _this1.localCOMy += (v.y + w2.y) * cf2;
                          area = 1 / (3 * area);
                          const t2 = area;
                          _this1.localCOMx *= t2;
                          _this1.localCOMy *= t2;
                        }
                      }
                      if (_this.wrap_localCOM != null) {
                        _this.wrap_localCOM.zpp_inner.x = _this.localCOMx;
                        _this.wrap_localCOM.zpp_inner.y = _this.localCOMy;
                      }
                    }
                    const _this2 = _this.body;
                    if (_this2.zip_axis) {
                      _this2.zip_axis = false;
                      _this2.axisx = Math.sin(_this2.rot);
                      _this2.axisy = Math.cos(_this2.rot);
                    }
                    _this.worldCOMx =
                      _this.body.posx +
                      (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
                    _this.worldCOMy =
                      _this.body.posy +
                      (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
                  }
                }
                const rx = _this.radius;
                const ry = _this.radius;
                _this.aabb.minx = _this.worldCOMx - rx;
                _this.aabb.miny = _this.worldCOMy - ry;
                _this.aabb.maxx = _this.worldCOMx + rx;
                _this.aabb.maxy = _this.worldCOMy + ry;
              } else {
                const _this3 = s.polygon;
                if (_this3.zip_gverts) {
                  if (_this3.body != null) {
                    _this3.zip_gverts = false;
                    _this3.validate_lverts();
                    const _this4 = _this3.body;
                    if (_this4.zip_axis) {
                      _this4.zip_axis = false;
                      _this4.axisx = Math.sin(_this4.rot);
                      _this4.axisy = Math.cos(_this4.rot);
                    }
                    let li = _this3.lverts.next;
                    let cx_ite2 = _this3.gverts.next;
                    while (cx_ite2 != null) {
                      const g = cx_ite2;
                      const l = li;
                      li = li.next;
                      g.x = _this3.body.posx + (_this3.body.axisy * l.x - _this3.body.axisx * l.y);
                      g.y = _this3.body.posy + (l.x * _this3.body.axisx + l.y * _this3.body.axisy);
                      cx_ite2 = cx_ite2.next;
                    }
                  }
                }
                if (_this3.lverts.next == null) {
                  throw new Error("Error: An empty polygon has no meaningful bounds");
                }
                const p0 = _this3.gverts.next;
                _this3.aabb.minx = p0.x;
                _this3.aabb.miny = p0.y;
                _this3.aabb.maxx = p0.x;
                _this3.aabb.maxy = p0.y;
                let cx_ite3 = _this3.gverts.next.next;
                while (cx_ite3 != null) {
                  const p = cx_ite3;
                  if (p.x < _this3.aabb.minx) {
                    _this3.aabb.minx = p.x;
                  }
                  if (p.x > _this3.aabb.maxx) {
                    _this3.aabb.maxx = p.x;
                  }
                  if (p.y < _this3.aabb.miny) {
                    _this3.aabb.miny = p.y;
                  }
                  if (p.y > _this3.aabb.maxy) {
                    _this3.aabb.maxy = p.y;
                  }
                  cx_ite3 = cx_ite3.next;
                }
              }
            }
          }
          const _this5 = body.aabb;
          const x = s.aabb;
          if (x.minx < _this5.minx) {
            _this5.minx = x.minx;
          }
          if (x.maxx > _this5.maxx) {
            _this5.maxx = x.maxx;
          }
          if (x.miny < _this5.miny) {
            _this5.miny = x.miny;
          }
          if (x.maxy > _this5.maxy) {
            _this5.maxy = x.maxy;
          }
          cx_ite = cx_ite.next;
        }
      }
    }
    body.validate_mass();
    body.validate_inertia();
    if (body.velx != 0 || body.vely != 0 || body.angvel != 0) {
      throw new Error(
        "Error: Static body cannot have any real velocity, only kinematic or surface velocities",
      );
    }
    let cx_ite4 = body.shapes.head;
    while (cx_ite4 != null) {
      const s1 = cx_ite4.elt;
      if (s1.type == 1) {
        const _this6 = s1.polygon;
        if (_this6.zip_sanitation) {
          _this6.zip_sanitation = false;
          _this6.splice_collinear_real();
        }
        const res = s1.polygon.valid();
        if (ZPP_Flags.ValidationResult_VALID == null) {
          ZPP_Flags.internal = true;
          ZPP_Flags.ValidationResult_VALID = new ZPP_Space._nape.shape.ValidationResult();
          ZPP_Flags.internal = false;
        }
        if (res != ZPP_Flags.ValidationResult_VALID) {
          throw new Error(
            "Error: Cannot simulate with an invalid Polygon : " +
              s1.polygon.outer.toString() +
              " is invalid : " +
              res.toString(),
          );
        }
        const _this7 = s1.polygon;
        if (_this7.zip_gaxi) {
          if (_this7.body != null) {
            _this7.zip_gaxi = false;
            _this7.validate_laxi();
            const _this8 = _this7.body;
            if (_this8.zip_axis) {
              _this8.zip_axis = false;
              _this8.axisx = Math.sin(_this8.rot);
              _this8.axisy = Math.cos(_this8.rot);
            }
            if (_this7.zip_gverts) {
              if (_this7.body != null) {
                _this7.zip_gverts = false;
                _this7.validate_lverts();
                const _this9 = _this7.body;
                if (_this9.zip_axis) {
                  _this9.zip_axis = false;
                  _this9.axisx = Math.sin(_this9.rot);
                  _this9.axisy = Math.cos(_this9.rot);
                }
                let li1 = _this7.lverts.next;
                let cx_ite5 = _this7.gverts.next;
                while (cx_ite5 != null) {
                  const g1 = cx_ite5;
                  const l1 = li1;
                  li1 = li1.next;
                  g1.x = _this7.body.posx + (_this7.body.axisy * l1.x - _this7.body.axisx * l1.y);
                  g1.y = _this7.body.posy + (l1.x * _this7.body.axisx + l1.y * _this7.body.axisy);
                  cx_ite5 = cx_ite5.next;
                }
              }
            }
            let ite = _this7.edges.head;
            let cx_ite6 = _this7.gverts.next;
            let u1 = cx_ite6;
            cx_ite6 = cx_ite6.next;
            while (cx_ite6 != null) {
              const v1 = cx_ite6;
              const e = ite.elt;
              ite = ite.next;
              e.gp0 = u1;
              e.gp1 = v1;
              e.gnormx = _this7.body.axisy * e.lnormx - _this7.body.axisx * e.lnormy;
              e.gnormy = e.lnormx * _this7.body.axisx + e.lnormy * _this7.body.axisy;
              e.gprojection =
                _this7.body.posx * e.gnormx + _this7.body.posy * e.gnormy + e.lprojection;
              if (e.wrap_gnorm != null) {
                e.wrap_gnorm.zpp_inner.x = e.gnormx;
                e.wrap_gnorm.zpp_inner.y = e.gnormy;
              }
              e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
              e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
              u1 = v1;
              cx_ite6 = cx_ite6.next;
            }
            const v2 = _this7.gverts.next;
            const e1 = ite.elt;
            ite = ite.next;
            e1.gp0 = u1;
            e1.gp1 = v2;
            e1.gnormx = _this7.body.axisy * e1.lnormx - _this7.body.axisx * e1.lnormy;
            e1.gnormy = e1.lnormx * _this7.body.axisx + e1.lnormy * _this7.body.axisy;
            e1.gprojection =
              _this7.body.posx * e1.gnormx + _this7.body.posy * e1.gnormy + e1.lprojection;
            if (e1.wrap_gnorm != null) {
              e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
              e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
            }
            e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
            e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
          }
        }
      }
      cx_ite4 = cx_ite4.next;
    }
    body.sweepFrozen = true;
  }

  validation() {
    const _this = this.cbsets;
    if (!_this.cbsets.empty()) {
      let set_ite = _this.cbsets.parent;
      while (set_ite.prev != null) set_ite = set_ite.prev;
      while (set_ite != null) {
        const cb = set_ite.data;
        cb.validate();
        if (set_ite.next != null) {
          set_ite = set_ite.next;
          while (set_ite.prev != null) set_ite = set_ite.prev;
        } else {
          while (set_ite.parent != null && set_ite == set_ite.parent.next) set_ite = set_ite.parent;
          set_ite = set_ite.parent;
        }
      }
    }
    let cx_ite = this.live.head;
    while (cx_ite != null) {
      const cur = cx_ite.elt;
      cur.sweepRadius = 0;
      let cx_ite1 = cur.shapes.head;
      while (cx_ite1 != null) {
        const s = cx_ite1.elt;
        if (s.type == 1) {
          const _this1 = s.polygon;
          if (_this1.zip_sanitation) {
            _this1.zip_sanitation = false;
            _this1.splice_collinear_real();
          }
          const res = s.polygon.valid();
          if (ZPP_Flags.ValidationResult_VALID == null) {
            ZPP_Flags.internal = true;
            ZPP_Flags.ValidationResult_VALID = new ZPP_Space._nape.shape.ValidationResult();
            ZPP_Flags.internal = false;
          }
          if (res != ZPP_Flags.ValidationResult_VALID) {
            throw new Error(
              "Error: Cannot simulate with an invalid Polygon : " +
                s.polygon.outer.toString() +
                " is invalid : " +
                res.toString(),
            );
          }
          const _this2 = s.polygon;
          if (_this2.zip_gaxi) {
            if (_this2.body != null) {
              _this2.zip_gaxi = false;
              _this2.validate_laxi();
              const _this3 = _this2.body;
              if (_this3.zip_axis) {
                _this3.zip_axis = false;
                _this3.axisx = Math.sin(_this3.rot);
                _this3.axisy = Math.cos(_this3.rot);
              }
              if (_this2.zip_gverts) {
                if (_this2.body != null) {
                  _this2.zip_gverts = false;
                  _this2.validate_lverts();
                  const _this4 = _this2.body;
                  if (_this4.zip_axis) {
                    _this4.zip_axis = false;
                    _this4.axisx = Math.sin(_this4.rot);
                    _this4.axisy = Math.cos(_this4.rot);
                  }
                  let li = _this2.lverts.next;
                  let cx_ite2 = _this2.gverts.next;
                  while (cx_ite2 != null) {
                    const g = cx_ite2;
                    const l = li;
                    li = li.next;
                    g.x = _this2.body.posx + (_this2.body.axisy * l.x - _this2.body.axisx * l.y);
                    g.y = _this2.body.posy + (l.x * _this2.body.axisx + l.y * _this2.body.axisy);
                    cx_ite2 = cx_ite2.next;
                  }
                }
              }
              let ite = _this2.edges.head;
              let cx_ite3 = _this2.gverts.next;
              let u = cx_ite3;
              cx_ite3 = cx_ite3.next;
              while (cx_ite3 != null) {
                const v = cx_ite3;
                const e = ite.elt;
                ite = ite.next;
                e.gp0 = u;
                e.gp1 = v;
                e.gnormx = _this2.body.axisy * e.lnormx - _this2.body.axisx * e.lnormy;
                e.gnormy = e.lnormx * _this2.body.axisx + e.lnormy * _this2.body.axisy;
                e.gprojection =
                  _this2.body.posx * e.gnormx + _this2.body.posy * e.gnormy + e.lprojection;
                if (e.wrap_gnorm != null) {
                  e.wrap_gnorm.zpp_inner.x = e.gnormx;
                  e.wrap_gnorm.zpp_inner.y = e.gnormy;
                }
                e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
                e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
                u = v;
                cx_ite3 = cx_ite3.next;
              }
              const v1 = _this2.gverts.next;
              const e1 = ite.elt;
              ite = ite.next;
              e1.gp0 = u;
              e1.gp1 = v1;
              e1.gnormx = _this2.body.axisy * e1.lnormx - _this2.body.axisx * e1.lnormy;
              e1.gnormy = e1.lnormx * _this2.body.axisx + e1.lnormy * _this2.body.axisy;
              e1.gprojection =
                _this2.body.posx * e1.gnormx + _this2.body.posy * e1.gnormy + e1.lprojection;
              if (e1.wrap_gnorm != null) {
                e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
                e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
              }
              e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
              e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
            }
          }
        }
        s.validate_sweepRadius();
        if (s.sweepRadius > cur.sweepRadius) {
          cur.sweepRadius = s.sweepRadius;
        }
        cx_ite1 = cx_ite1.next;
      }
      cur.validate_mass();
      cur.validate_inertia();
      if (cur.shapes.head != null) {
        if (cur.shapes.head == null) {
          throw new Error("Error: Body bounds only makes sense if it contains shapes");
        }
        if (cur.zip_aabb) {
          cur.zip_aabb = false;
          cur.aabb.minx = Infinity;
          cur.aabb.miny = Infinity;
          cur.aabb.maxx = -Infinity;
          cur.aabb.maxy = -Infinity;
          let cx_ite4 = cur.shapes.head;
          while (cx_ite4 != null) {
            const s1 = cx_ite4.elt;
            if (s1.zip_aabb) {
              if (s1.body != null) {
                s1.zip_aabb = false;
                if (s1.type == 0) {
                  const _this5 = s1.circle;
                  if (_this5.zip_worldCOM) {
                    if (_this5.body != null) {
                      _this5.zip_worldCOM = false;
                      if (_this5.zip_localCOM) {
                        _this5.zip_localCOM = false;
                        if (_this5.type == 1) {
                          const _this6 = _this5.polygon;
                          if (_this6.lverts.next == null) {
                            throw new Error("Error: An empty polygon has no meaningful localCOM");
                          }
                          if (_this6.lverts.next.next == null) {
                            _this6.localCOMx = _this6.lverts.next.x;
                            _this6.localCOMy = _this6.lverts.next.y;
                          } else if (_this6.lverts.next.next.next == null) {
                            _this6.localCOMx = _this6.lverts.next.x;
                            _this6.localCOMy = _this6.lverts.next.y;
                            const t = 1.0;
                            _this6.localCOMx += _this6.lverts.next.next.x * t;
                            _this6.localCOMy += _this6.lverts.next.next.y * t;
                            const t1 = 0.5;
                            _this6.localCOMx *= t1;
                            _this6.localCOMy *= t1;
                          } else {
                            _this6.localCOMx = 0;
                            _this6.localCOMy = 0;
                            let area = 0.0;
                            let cx_ite5 = _this6.lverts.next;
                            let u1 = cx_ite5;
                            cx_ite5 = cx_ite5.next;
                            let v2 = cx_ite5;
                            cx_ite5 = cx_ite5.next;
                            while (cx_ite5 != null) {
                              const w = cx_ite5;
                              area += v2.x * (w.y - u1.y);
                              const cf = w.y * v2.x - w.x * v2.y;
                              _this6.localCOMx += (v2.x + w.x) * cf;
                              _this6.localCOMy += (v2.y + w.y) * cf;
                              u1 = v2;
                              v2 = w;
                              cx_ite5 = cx_ite5.next;
                            }
                            cx_ite5 = _this6.lverts.next;
                            const w1 = cx_ite5;
                            area += v2.x * (w1.y - u1.y);
                            const cf1 = w1.y * v2.x - w1.x * v2.y;
                            _this6.localCOMx += (v2.x + w1.x) * cf1;
                            _this6.localCOMy += (v2.y + w1.y) * cf1;
                            u1 = v2;
                            v2 = w1;
                            cx_ite5 = cx_ite5.next;
                            const w2 = cx_ite5;
                            area += v2.x * (w2.y - u1.y);
                            const cf2 = w2.y * v2.x - w2.x * v2.y;
                            _this6.localCOMx += (v2.x + w2.x) * cf2;
                            _this6.localCOMy += (v2.y + w2.y) * cf2;
                            area = 1 / (3 * area);
                            const t2 = area;
                            _this6.localCOMx *= t2;
                            _this6.localCOMy *= t2;
                          }
                        }
                        if (_this5.wrap_localCOM != null) {
                          _this5.wrap_localCOM.zpp_inner.x = _this5.localCOMx;
                          _this5.wrap_localCOM.zpp_inner.y = _this5.localCOMy;
                        }
                      }
                      const _this7 = _this5.body;
                      if (_this7.zip_axis) {
                        _this7.zip_axis = false;
                        _this7.axisx = Math.sin(_this7.rot);
                        _this7.axisy = Math.cos(_this7.rot);
                      }
                      _this5.worldCOMx =
                        _this5.body.posx +
                        (_this5.body.axisy * _this5.localCOMx -
                          _this5.body.axisx * _this5.localCOMy);
                      _this5.worldCOMy =
                        _this5.body.posy +
                        (_this5.localCOMx * _this5.body.axisx +
                          _this5.localCOMy * _this5.body.axisy);
                    }
                  }
                  const rx = _this5.radius;
                  const ry = _this5.radius;
                  _this5.aabb.minx = _this5.worldCOMx - rx;
                  _this5.aabb.miny = _this5.worldCOMy - ry;
                  _this5.aabb.maxx = _this5.worldCOMx + rx;
                  _this5.aabb.maxy = _this5.worldCOMy + ry;
                } else {
                  const _this8 = s1.polygon;
                  if (_this8.zip_gverts) {
                    if (_this8.body != null) {
                      _this8.zip_gverts = false;
                      _this8.validate_lverts();
                      const _this9 = _this8.body;
                      if (_this9.zip_axis) {
                        _this9.zip_axis = false;
                        _this9.axisx = Math.sin(_this9.rot);
                        _this9.axisy = Math.cos(_this9.rot);
                      }
                      let li1 = _this8.lverts.next;
                      let cx_ite6 = _this8.gverts.next;
                      while (cx_ite6 != null) {
                        const g1 = cx_ite6;
                        const l1 = li1;
                        li1 = li1.next;
                        g1.x =
                          _this8.body.posx + (_this8.body.axisy * l1.x - _this8.body.axisx * l1.y);
                        g1.y =
                          _this8.body.posy + (l1.x * _this8.body.axisx + l1.y * _this8.body.axisy);
                        cx_ite6 = cx_ite6.next;
                      }
                    }
                  }
                  if (_this8.lverts.next == null) {
                    throw new Error("Error: An empty polygon has no meaningful bounds");
                  }
                  const p0 = _this8.gverts.next;
                  _this8.aabb.minx = p0.x;
                  _this8.aabb.miny = p0.y;
                  _this8.aabb.maxx = p0.x;
                  _this8.aabb.maxy = p0.y;
                  let cx_ite7 = _this8.gverts.next.next;
                  while (cx_ite7 != null) {
                    const p = cx_ite7;
                    if (p.x < _this8.aabb.minx) {
                      _this8.aabb.minx = p.x;
                    }
                    if (p.x > _this8.aabb.maxx) {
                      _this8.aabb.maxx = p.x;
                    }
                    if (p.y < _this8.aabb.miny) {
                      _this8.aabb.miny = p.y;
                    }
                    if (p.y > _this8.aabb.maxy) {
                      _this8.aabb.maxy = p.y;
                    }
                    cx_ite7 = cx_ite7.next;
                  }
                }
              }
            }
            const _this10 = cur.aabb;
            const x = s1.aabb;
            if (x.minx < _this10.minx) {
              _this10.minx = x.minx;
            }
            if (x.maxx > _this10.maxx) {
              _this10.maxx = x.maxx;
            }
            if (x.miny < _this10.miny) {
              _this10.miny = x.miny;
            }
            if (x.maxy > _this10.maxy) {
              _this10.maxy = x.maxy;
            }
            cx_ite4 = cx_ite4.next;
          }
        }
        cur.validate_worldCOM();
      }
      cur.validate_gravMass();
      if (cur.zip_axis) {
        cur.zip_axis = false;
        cur.axisx = Math.sin(cur.rot);
        cur.axisy = Math.cos(cur.rot);
      }
      if (!cur.nomove && cur.type == 2 && cur.mass == 0) {
        throw new Error(
          "Error: Dynamic Body cannot be simulated with 0 mass unless allowMovement is false",
        );
      }
      if (!cur.norotate && cur.type == 2 && cur.inertia == 0) {
        throw new Error(
          "Error: Dynamic Body cannot be simulated with 0 inertia unless allowRotation is false",
        );
      }
      if (cur.component.woken && cur.cbSet != null) {
        let cx_ite8 = cur.cbSet.bodylisteners.head;
        while (cx_ite8 != null) {
          const i = cx_ite8.elt;
          if (i.event != 2) {
            cx_ite8 = cx_ite8.next;
            continue;
          }
          const cb1 = this.push_callback(i);
          cb1.event = 2;
          cb1.body = cur;
          cx_ite8 = cx_ite8.next;
        }
      }
      cur.component.woken = false;
      let cx_ite9 = cur.shapes.head;
      while (cx_ite9 != null) {
        const shape = cx_ite9.elt;
        this.bphase.sync(shape);
        cx_ite9 = cx_ite9.next;
      }
      cx_ite = cx_ite.next;
    }
    let cx_ite10 = this.kinematics.head;
    while (cx_ite10 != null) {
      const cur1 = cx_ite10.elt;
      cur1.sweepRadius = 0;
      let cx_ite11 = cur1.shapes.head;
      while (cx_ite11 != null) {
        const s2 = cx_ite11.elt;
        if (s2.type == 1) {
          const _this11 = s2.polygon;
          if (_this11.zip_sanitation) {
            _this11.zip_sanitation = false;
            _this11.splice_collinear_real();
          }
          const res1 = s2.polygon.valid();
          if (ZPP_Flags.ValidationResult_VALID == null) {
            ZPP_Flags.internal = true;
            ZPP_Flags.ValidationResult_VALID = new ZPP_Space._nape.shape.ValidationResult();
            ZPP_Flags.internal = false;
          }
          if (res1 != ZPP_Flags.ValidationResult_VALID) {
            throw new Error(
              "Error: Cannot simulate with an invalid Polygon : " +
                s2.polygon.outer.toString() +
                " is invalid : " +
                res1.toString(),
            );
          }
          const _this12 = s2.polygon;
          if (_this12.zip_gaxi) {
            if (_this12.body != null) {
              _this12.zip_gaxi = false;
              _this12.validate_laxi();
              const _this13 = _this12.body;
              if (_this13.zip_axis) {
                _this13.zip_axis = false;
                _this13.axisx = Math.sin(_this13.rot);
                _this13.axisy = Math.cos(_this13.rot);
              }
              if (_this12.zip_gverts) {
                if (_this12.body != null) {
                  _this12.zip_gverts = false;
                  _this12.validate_lverts();
                  const _this14 = _this12.body;
                  if (_this14.zip_axis) {
                    _this14.zip_axis = false;
                    _this14.axisx = Math.sin(_this14.rot);
                    _this14.axisy = Math.cos(_this14.rot);
                  }
                  let li2 = _this12.lverts.next;
                  let cx_ite12 = _this12.gverts.next;
                  while (cx_ite12 != null) {
                    const g2 = cx_ite12;
                    const l2 = li2;
                    li2 = li2.next;
                    g2.x =
                      _this12.body.posx + (_this12.body.axisy * l2.x - _this12.body.axisx * l2.y);
                    g2.y =
                      _this12.body.posy + (l2.x * _this12.body.axisx + l2.y * _this12.body.axisy);
                    cx_ite12 = cx_ite12.next;
                  }
                }
              }
              let ite1 = _this12.edges.head;
              let cx_ite13 = _this12.gverts.next;
              let u2 = cx_ite13;
              cx_ite13 = cx_ite13.next;
              while (cx_ite13 != null) {
                const v3 = cx_ite13;
                const e2 = ite1.elt;
                ite1 = ite1.next;
                e2.gp0 = u2;
                e2.gp1 = v3;
                e2.gnormx = _this12.body.axisy * e2.lnormx - _this12.body.axisx * e2.lnormy;
                e2.gnormy = e2.lnormx * _this12.body.axisx + e2.lnormy * _this12.body.axisy;
                e2.gprojection =
                  _this12.body.posx * e2.gnormx + _this12.body.posy * e2.gnormy + e2.lprojection;
                if (e2.wrap_gnorm != null) {
                  e2.wrap_gnorm.zpp_inner.x = e2.gnormx;
                  e2.wrap_gnorm.zpp_inner.y = e2.gnormy;
                }
                e2.tp0 = e2.gp0.y * e2.gnormx - e2.gp0.x * e2.gnormy;
                e2.tp1 = e2.gp1.y * e2.gnormx - e2.gp1.x * e2.gnormy;
                u2 = v3;
                cx_ite13 = cx_ite13.next;
              }
              const v4 = _this12.gverts.next;
              const e3 = ite1.elt;
              ite1 = ite1.next;
              e3.gp0 = u2;
              e3.gp1 = v4;
              e3.gnormx = _this12.body.axisy * e3.lnormx - _this12.body.axisx * e3.lnormy;
              e3.gnormy = e3.lnormx * _this12.body.axisx + e3.lnormy * _this12.body.axisy;
              e3.gprojection =
                _this12.body.posx * e3.gnormx + _this12.body.posy * e3.gnormy + e3.lprojection;
              if (e3.wrap_gnorm != null) {
                e3.wrap_gnorm.zpp_inner.x = e3.gnormx;
                e3.wrap_gnorm.zpp_inner.y = e3.gnormy;
              }
              e3.tp0 = e3.gp0.y * e3.gnormx - e3.gp0.x * e3.gnormy;
              e3.tp1 = e3.gp1.y * e3.gnormx - e3.gp1.x * e3.gnormy;
            }
          }
        }
        s2.validate_sweepRadius();
        if (s2.sweepRadius > cur1.sweepRadius) {
          cur1.sweepRadius = s2.sweepRadius;
        }
        cx_ite11 = cx_ite11.next;
      }
      cur1.validate_mass();
      cur1.validate_inertia();
      if (cur1.shapes.head != null) {
        if (cur1.shapes.head == null) {
          throw new Error("Error: Body bounds only makes sense if it contains shapes");
        }
        if (cur1.zip_aabb) {
          cur1.zip_aabb = false;
          cur1.aabb.minx = Infinity;
          cur1.aabb.miny = Infinity;
          cur1.aabb.maxx = -Infinity;
          cur1.aabb.maxy = -Infinity;
          let cx_ite14 = cur1.shapes.head;
          while (cx_ite14 != null) {
            const s3 = cx_ite14.elt;
            if (s3.zip_aabb) {
              if (s3.body != null) {
                s3.zip_aabb = false;
                if (s3.type == 0) {
                  const _this15 = s3.circle;
                  if (_this15.zip_worldCOM) {
                    if (_this15.body != null) {
                      _this15.zip_worldCOM = false;
                      if (_this15.zip_localCOM) {
                        _this15.zip_localCOM = false;
                        if (_this15.type == 1) {
                          const _this16 = _this15.polygon;
                          if (_this16.lverts.next == null) {
                            throw new Error("Error: An empty polygon has no meaningful localCOM");
                          }
                          if (_this16.lverts.next.next == null) {
                            _this16.localCOMx = _this16.lverts.next.x;
                            _this16.localCOMy = _this16.lverts.next.y;
                          } else if (_this16.lverts.next.next.next == null) {
                            _this16.localCOMx = _this16.lverts.next.x;
                            _this16.localCOMy = _this16.lverts.next.y;
                            const t3 = 1.0;
                            _this16.localCOMx += _this16.lverts.next.next.x * t3;
                            _this16.localCOMy += _this16.lverts.next.next.y * t3;
                            const t4 = 0.5;
                            _this16.localCOMx *= t4;
                            _this16.localCOMy *= t4;
                          } else {
                            _this16.localCOMx = 0;
                            _this16.localCOMy = 0;
                            let area1 = 0.0;
                            let cx_ite15 = _this16.lverts.next;
                            let u3 = cx_ite15;
                            cx_ite15 = cx_ite15.next;
                            let v5 = cx_ite15;
                            cx_ite15 = cx_ite15.next;
                            while (cx_ite15 != null) {
                              const w3 = cx_ite15;
                              area1 += v5.x * (w3.y - u3.y);
                              const cf3 = w3.y * v5.x - w3.x * v5.y;
                              _this16.localCOMx += (v5.x + w3.x) * cf3;
                              _this16.localCOMy += (v5.y + w3.y) * cf3;
                              u3 = v5;
                              v5 = w3;
                              cx_ite15 = cx_ite15.next;
                            }
                            cx_ite15 = _this16.lverts.next;
                            const w4 = cx_ite15;
                            area1 += v5.x * (w4.y - u3.y);
                            const cf4 = w4.y * v5.x - w4.x * v5.y;
                            _this16.localCOMx += (v5.x + w4.x) * cf4;
                            _this16.localCOMy += (v5.y + w4.y) * cf4;
                            u3 = v5;
                            v5 = w4;
                            cx_ite15 = cx_ite15.next;
                            const w5 = cx_ite15;
                            area1 += v5.x * (w5.y - u3.y);
                            const cf5 = w5.y * v5.x - w5.x * v5.y;
                            _this16.localCOMx += (v5.x + w5.x) * cf5;
                            _this16.localCOMy += (v5.y + w5.y) * cf5;
                            area1 = 1 / (3 * area1);
                            const t5 = area1;
                            _this16.localCOMx *= t5;
                            _this16.localCOMy *= t5;
                          }
                        }
                        if (_this15.wrap_localCOM != null) {
                          _this15.wrap_localCOM.zpp_inner.x = _this15.localCOMx;
                          _this15.wrap_localCOM.zpp_inner.y = _this15.localCOMy;
                        }
                      }
                      const _this17 = _this15.body;
                      if (_this17.zip_axis) {
                        _this17.zip_axis = false;
                        _this17.axisx = Math.sin(_this17.rot);
                        _this17.axisy = Math.cos(_this17.rot);
                      }
                      _this15.worldCOMx =
                        _this15.body.posx +
                        (_this15.body.axisy * _this15.localCOMx -
                          _this15.body.axisx * _this15.localCOMy);
                      _this15.worldCOMy =
                        _this15.body.posy +
                        (_this15.localCOMx * _this15.body.axisx +
                          _this15.localCOMy * _this15.body.axisy);
                    }
                  }
                  const rx1 = _this15.radius;
                  const ry1 = _this15.radius;
                  _this15.aabb.minx = _this15.worldCOMx - rx1;
                  _this15.aabb.miny = _this15.worldCOMy - ry1;
                  _this15.aabb.maxx = _this15.worldCOMx + rx1;
                  _this15.aabb.maxy = _this15.worldCOMy + ry1;
                } else {
                  const _this18 = s3.polygon;
                  if (_this18.zip_gverts) {
                    if (_this18.body != null) {
                      _this18.zip_gverts = false;
                      _this18.validate_lverts();
                      const _this19 = _this18.body;
                      if (_this19.zip_axis) {
                        _this19.zip_axis = false;
                        _this19.axisx = Math.sin(_this19.rot);
                        _this19.axisy = Math.cos(_this19.rot);
                      }
                      let li3 = _this18.lverts.next;
                      let cx_ite16 = _this18.gverts.next;
                      while (cx_ite16 != null) {
                        const g3 = cx_ite16;
                        const l3 = li3;
                        li3 = li3.next;
                        g3.x =
                          _this18.body.posx +
                          (_this18.body.axisy * l3.x - _this18.body.axisx * l3.y);
                        g3.y =
                          _this18.body.posy +
                          (l3.x * _this18.body.axisx + l3.y * _this18.body.axisy);
                        cx_ite16 = cx_ite16.next;
                      }
                    }
                  }
                  if (_this18.lverts.next == null) {
                    throw new Error("Error: An empty polygon has no meaningful bounds");
                  }
                  const p01 = _this18.gverts.next;
                  _this18.aabb.minx = p01.x;
                  _this18.aabb.miny = p01.y;
                  _this18.aabb.maxx = p01.x;
                  _this18.aabb.maxy = p01.y;
                  let cx_ite17 = _this18.gverts.next.next;
                  while (cx_ite17 != null) {
                    const p1 = cx_ite17;
                    if (p1.x < _this18.aabb.minx) {
                      _this18.aabb.minx = p1.x;
                    }
                    if (p1.x > _this18.aabb.maxx) {
                      _this18.aabb.maxx = p1.x;
                    }
                    if (p1.y < _this18.aabb.miny) {
                      _this18.aabb.miny = p1.y;
                    }
                    if (p1.y > _this18.aabb.maxy) {
                      _this18.aabb.maxy = p1.y;
                    }
                    cx_ite17 = cx_ite17.next;
                  }
                }
              }
            }
            const _this20 = cur1.aabb;
            const x1 = s3.aabb;
            if (x1.minx < _this20.minx) {
              _this20.minx = x1.minx;
            }
            if (x1.maxx > _this20.maxx) {
              _this20.maxx = x1.maxx;
            }
            if (x1.miny < _this20.miny) {
              _this20.miny = x1.miny;
            }
            if (x1.maxy > _this20.maxy) {
              _this20.maxy = x1.maxy;
            }
            cx_ite14 = cx_ite14.next;
          }
        }
        cur1.validate_worldCOM();
      }
      cur1.validate_gravMass();
      if (cur1.zip_axis) {
        cur1.zip_axis = false;
        cur1.axisx = Math.sin(cur1.rot);
        cur1.axisy = Math.cos(cur1.rot);
      }
      if (!cur1.nomove && cur1.type == 2 && cur1.mass == 0) {
        throw new Error(
          "Error: Dynamic Body cannot be simulated with 0 mass unless allowMovement is false",
        );
      }
      if (!cur1.norotate && cur1.type == 2 && cur1.inertia == 0) {
        throw new Error(
          "Error: Dynamic Body cannot be simulated with 0 inertia unless allowRotation is false",
        );
      }
      let cx_ite18 = cur1.shapes.head;
      while (cx_ite18 != null) {
        const shape1 = cx_ite18.elt;
        this.bphase.sync(shape1);
        cx_ite18 = cx_ite18.next;
      }
      cx_ite10 = cx_ite10.next;
    }
    let cx_ite19 = this.live_constraints.head;
    while (cx_ite19 != null) {
      const con = cx_ite19.elt;
      if (con.active) {
        con.validate();
        if (con.component.woken && con.cbSet != null) {
          let cx_ite20 = con.cbSet.conlisteners.head;
          while (cx_ite20 != null) {
            const i1 = cx_ite20.elt;
            if (i1.event != 2) {
              cx_ite20 = cx_ite20.next;
              continue;
            }
            const cb2 = this.push_callback(i1);
            cb2.event = 2;
            cb2.constraint = con;
            cx_ite20 = cx_ite20.next;
          }
        }
        con.component.woken = false;
      }
      cx_ite19 = cx_ite19.next;
    }
  }

  updateVel(dt: any) {
    let pre = null;
    const linDrag = 1 - dt * this.global_lin_drag;
    const angDrag = 1 - dt * this.global_ang_drag;
    let cx_ite = this.live.head;
    while (cx_ite != null) {
      const cur = cx_ite.elt;
      if (cur.smass != 0.0) {
        const time = dt * cur.imass;
        cur.velx = linDrag * cur.velx + (cur.forcex + this.gravityx * cur.gravMass) * time;
        cur.vely = linDrag * cur.vely + (cur.forcey + this.gravityy * cur.gravMass) * time;
      }
      if (cur.sinertia != 0.0) {
        let dpx = 0.0;
        let dpy = 0.0;
        dpx = cur.worldCOMx - cur.posx;
        dpy = cur.worldCOMy - cur.posy;
        const torque = cur.torque + (this.gravityy * dpx - this.gravityx * dpy) * cur.gravMass;
        cur.angvel = angDrag * cur.angvel + torque * dt * cur.iinertia;
      }
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
  }

  updatePos(dt: any) {
    const MAX_VEL = (2 * Math.PI) / dt;
    let cx_ite = this.live.head;
    while (cx_ite != null) {
      const cur = cx_ite.elt;
      cur.pre_posx = cur.posx;
      cur.pre_posy = cur.posy;
      cur.pre_rot = cur.rot;
      cur.sweepTime = 0;
      cur.sweep_angvel = cur.angvel % MAX_VEL;
      const delta = dt - cur.sweepTime;
      if (delta != 0) {
        cur.sweepTime = dt;
        const t = delta;
        cur.posx += cur.velx * t;
        cur.posy += cur.vely * t;
        if (cur.angvel != 0) {
          const dr = cur.sweep_angvel * delta;
          cur.rot += dr;
          if (dr * dr > 0.0001) {
            cur.axisx = Math.sin(cur.rot);
            cur.axisy = Math.cos(cur.rot);
          } else {
            const d2 = dr * dr;
            const p = 1 - 0.5 * d2;
            const m = 1 - (d2 * d2) / 8;
            const nx = (p * cur.axisx + dr * cur.axisy) * m;
            cur.axisy = (p * cur.axisy - dr * cur.axisx) * m;
            cur.axisx = nx;
          }
        }
      }
      if (!cur.disableCCD) {
        const linThreshold = ZPP_Space._nape.Config.staticCCDLinearThreshold * cur.sweepRadius;
        const angThreshold = ZPP_Space._nape.Config.staticCCDAngularThreshold;
        if (
          (cur.velx * cur.velx + cur.vely * cur.vely) * dt * dt > linThreshold * linThreshold ||
          cur.angvel * cur.angvel * dt * dt > angThreshold * angThreshold ||
          cur.type == 3
        ) {
          let angvel = cur.sweep_angvel;
          if (angvel < 0) {
            angvel = -angvel;
          }
          const iangvel = 1 / angvel;
          let cx_ite1 = cur.shapes.head;
          while (cx_ite1 != null) {
            const s = cx_ite1.elt;
            const aabb = s.aabb;
            let minx = aabb.minx;
            let miny = aabb.miny;
            let maxx = aabb.maxx;
            let maxy = aabb.maxy;
            let count = (angvel * dt * s.sweepCoef * 0.0083333333333333332) | 0;
            if (count > 8) {
              count = 8;
            }
            const anginc = (angvel * dt) / count;
            const delta1 = dt - cur.sweepTime;
            if (delta1 != 0) {
              cur.sweepTime = dt;
              const t1 = delta1;
              cur.posx += cur.velx * t1;
              cur.posy += cur.vely * t1;
              if (cur.angvel != 0) {
                const dr1 = cur.sweep_angvel * delta1;
                cur.rot += dr1;
                if (dr1 * dr1 > 0.0001) {
                  cur.axisx = Math.sin(cur.rot);
                  cur.axisy = Math.cos(cur.rot);
                } else {
                  const d21 = dr1 * dr1;
                  const p1 = 1 - 0.5 * d21;
                  const m1 = 1 - (d21 * d21) / 8;
                  const nx1 = (p1 * cur.axisx + dr1 * cur.axisy) * m1;
                  cur.axisy = (p1 * cur.axisy - dr1 * cur.axisx) * m1;
                  cur.axisx = nx1;
                }
              }
            }
            if (s.type == 0) {
              const _this = s.circle;
              _this.worldCOMx =
                _this.body.posx +
                (_this.body.axisy * _this.localCOMx - _this.body.axisx * _this.localCOMy);
              _this.worldCOMy =
                _this.body.posy +
                (_this.localCOMx * _this.body.axisx + _this.localCOMy * _this.body.axisy);
              _this.aabb.minx = _this.worldCOMx - _this.radius;
              _this.aabb.miny = _this.worldCOMy - _this.radius;
              _this.aabb.maxx = _this.worldCOMx + _this.radius;
              _this.aabb.maxy = _this.worldCOMy + _this.radius;
            } else {
              const _this1 = s.polygon;
              let li = _this1.lverts.next;
              const p0 = _this1.gverts.next;
              const l = li;
              li = li.next;
              p0.x = _this1.body.posx + (_this1.body.axisy * l.x - _this1.body.axisx * l.y);
              p0.y = _this1.body.posy + (l.x * _this1.body.axisx + l.y * _this1.body.axisy);
              _this1.aabb.minx = p0.x;
              _this1.aabb.miny = p0.y;
              _this1.aabb.maxx = p0.x;
              _this1.aabb.maxy = p0.y;
              let cx_ite2 = _this1.gverts.next.next;
              while (cx_ite2 != null) {
                const p2 = cx_ite2;
                const l1 = li;
                li = li.next;
                p2.x = _this1.body.posx + (_this1.body.axisy * l1.x - _this1.body.axisx * l1.y);
                p2.y = _this1.body.posy + (l1.x * _this1.body.axisx + l1.y * _this1.body.axisy);
                if (p2.x < _this1.aabb.minx) {
                  _this1.aabb.minx = p2.x;
                }
                if (p2.x > _this1.aabb.maxx) {
                  _this1.aabb.maxx = p2.x;
                }
                if (p2.y < _this1.aabb.miny) {
                  _this1.aabb.miny = p2.y;
                }
                if (p2.y > _this1.aabb.maxy) {
                  _this1.aabb.maxy = p2.y;
                }
                cx_ite2 = cx_ite2.next;
              }
            }
            if (minx < aabb.minx) {
              aabb.minx = minx;
            } else {
              minx = aabb.minx;
            }
            if (miny < aabb.miny) {
              aabb.miny = miny;
            } else {
              miny = aabb.miny;
            }
            if (maxx > aabb.maxx) {
              aabb.maxx = maxx;
            } else {
              maxx = aabb.maxx;
            }
            if (maxy > aabb.maxy) {
              aabb.maxy = maxy;
            } else {
              maxy = aabb.maxy;
            }
            let _g = 1;
            const _g1 = count;
            while (_g < _g1) {
              const i = _g++;
              const dt1 = anginc * i * iangvel;
              const delta2 = dt1 - cur.sweepTime;
              if (delta2 != 0) {
                cur.sweepTime = dt1;
                const t2 = delta2;
                cur.posx += cur.velx * t2;
                cur.posy += cur.vely * t2;
                if (cur.angvel != 0) {
                  const dr2 = cur.sweep_angvel * delta2;
                  cur.rot += dr2;
                  if (dr2 * dr2 > 0.0001) {
                    cur.axisx = Math.sin(cur.rot);
                    cur.axisy = Math.cos(cur.rot);
                  } else {
                    const d22 = dr2 * dr2;
                    const p3 = 1 - 0.5 * d22;
                    const m2 = 1 - (d22 * d22) / 8;
                    const nx2 = (p3 * cur.axisx + dr2 * cur.axisy) * m2;
                    cur.axisy = (p3 * cur.axisy - dr2 * cur.axisx) * m2;
                    cur.axisx = nx2;
                  }
                }
              }
              if (s.type == 0) {
                const _this2 = s.circle;
                _this2.worldCOMx =
                  _this2.body.posx +
                  (_this2.body.axisy * _this2.localCOMx - _this2.body.axisx * _this2.localCOMy);
                _this2.worldCOMy =
                  _this2.body.posy +
                  (_this2.localCOMx * _this2.body.axisx + _this2.localCOMy * _this2.body.axisy);
                _this2.aabb.minx = _this2.worldCOMx - _this2.radius;
                _this2.aabb.miny = _this2.worldCOMy - _this2.radius;
                _this2.aabb.maxx = _this2.worldCOMx + _this2.radius;
                _this2.aabb.maxy = _this2.worldCOMy + _this2.radius;
              } else {
                const _this3 = s.polygon;
                let li1 = _this3.lverts.next;
                const p01 = _this3.gverts.next;
                const l2 = li1;
                li1 = li1.next;
                p01.x = _this3.body.posx + (_this3.body.axisy * l2.x - _this3.body.axisx * l2.y);
                p01.y = _this3.body.posy + (l2.x * _this3.body.axisx + l2.y * _this3.body.axisy);
                _this3.aabb.minx = p01.x;
                _this3.aabb.miny = p01.y;
                _this3.aabb.maxx = p01.x;
                _this3.aabb.maxy = p01.y;
                let cx_ite3 = _this3.gverts.next.next;
                while (cx_ite3 != null) {
                  const p4 = cx_ite3;
                  const l3 = li1;
                  li1 = li1.next;
                  p4.x = _this3.body.posx + (_this3.body.axisy * l3.x - _this3.body.axisx * l3.y);
                  p4.y = _this3.body.posy + (l3.x * _this3.body.axisx + l3.y * _this3.body.axisy);
                  if (p4.x < _this3.aabb.minx) {
                    _this3.aabb.minx = p4.x;
                  }
                  if (p4.x > _this3.aabb.maxx) {
                    _this3.aabb.maxx = p4.x;
                  }
                  if (p4.y < _this3.aabb.miny) {
                    _this3.aabb.miny = p4.y;
                  }
                  if (p4.y > _this3.aabb.maxy) {
                    _this3.aabb.maxy = p4.y;
                  }
                  cx_ite3 = cx_ite3.next;
                }
              }
              if (minx < aabb.minx) {
                aabb.minx = minx;
              } else {
                minx = aabb.minx;
              }
              if (miny < aabb.miny) {
                aabb.miny = miny;
              } else {
                miny = aabb.miny;
              }
              if (maxx > aabb.maxx) {
                aabb.maxx = maxx;
              } else {
                maxx = aabb.maxx;
              }
              if (maxy > aabb.maxy) {
                aabb.maxy = maxy;
              } else {
                maxy = aabb.maxy;
              }
            }
            this.bphase.sync(s);
            cx_ite1 = cx_ite1.next;
          }
          cur.sweepFrozen = false;
          if (cur.type == 2 && cur.bulletEnabled) {
            const linThreshold2 = ZPP_Space._nape.Config.bulletCCDLinearThreshold * cur.sweepRadius;
            const angThreshold2 = ZPP_Space._nape.Config.bulletCCDAngularThreshold;
            if (
              (cur.velx * cur.velx + cur.vely * cur.vely) * dt * dt >
                linThreshold2 * linThreshold2 ||
              cur.angvel * cur.angvel * dt * dt > angThreshold2 * angThreshold2
            ) {
              cur.bullet = true;
            }
          }
        } else {
          cur.sweepFrozen = true;
          cur.bullet = false;
        }
      } else {
        cur.sweepFrozen = true;
        cur.bullet = false;
      }
      cx_ite = cx_ite.next;
    }
    let cx_ite4 = this.kinematics.head;
    while (cx_ite4 != null) {
      const cur1 = cx_ite4.elt;
      cur1.pre_posx = cur1.posx;
      cur1.pre_posy = cur1.posy;
      cur1.pre_rot = cur1.rot;
      cur1.sweepTime = 0;
      cur1.sweep_angvel = cur1.angvel % MAX_VEL;
      const delta3 = dt - cur1.sweepTime;
      if (delta3 != 0) {
        cur1.sweepTime = dt;
        const t3 = delta3;
        cur1.posx += cur1.velx * t3;
        cur1.posy += cur1.vely * t3;
        if (cur1.angvel != 0) {
          const dr3 = cur1.sweep_angvel * delta3;
          cur1.rot += dr3;
          if (dr3 * dr3 > 0.0001) {
            cur1.axisx = Math.sin(cur1.rot);
            cur1.axisy = Math.cos(cur1.rot);
          } else {
            const d23 = dr3 * dr3;
            const p5 = 1 - 0.5 * d23;
            const m3 = 1 - (d23 * d23) / 8;
            const nx3 = (p5 * cur1.axisx + dr3 * cur1.axisy) * m3;
            cur1.axisy = (p5 * cur1.axisy - dr3 * cur1.axisx) * m3;
            cur1.axisx = nx3;
          }
        }
      }
      if (!cur1.disableCCD) {
        const linThreshold1 = ZPP_Space._nape.Config.staticCCDLinearThreshold * cur1.sweepRadius;
        const angThreshold1 = ZPP_Space._nape.Config.staticCCDAngularThreshold;
        if (
          (cur1.velx * cur1.velx + cur1.vely * cur1.vely) * dt * dt >
            linThreshold1 * linThreshold1 ||
          cur1.angvel * cur1.angvel * dt * dt > angThreshold1 * angThreshold1 ||
          cur1.type == 3
        ) {
          let angvel1 = cur1.sweep_angvel;
          if (angvel1 < 0) {
            angvel1 = -angvel1;
          }
          const iangvel1 = 1 / angvel1;
          let cx_ite5 = cur1.shapes.head;
          while (cx_ite5 != null) {
            const s1 = cx_ite5.elt;
            const aabb1 = s1.aabb;
            let minx1 = aabb1.minx;
            let miny1 = aabb1.miny;
            let maxx1 = aabb1.maxx;
            let maxy1 = aabb1.maxy;
            let count1 = (angvel1 * dt * s1.sweepCoef * 0.0083333333333333332) | 0;
            if (count1 > 8) {
              count1 = 8;
            }
            const anginc1 = (angvel1 * dt) / count1;
            const delta4 = dt - cur1.sweepTime;
            if (delta4 != 0) {
              cur1.sweepTime = dt;
              const t4 = delta4;
              cur1.posx += cur1.velx * t4;
              cur1.posy += cur1.vely * t4;
              if (cur1.angvel != 0) {
                const dr4 = cur1.sweep_angvel * delta4;
                cur1.rot += dr4;
                if (dr4 * dr4 > 0.0001) {
                  cur1.axisx = Math.sin(cur1.rot);
                  cur1.axisy = Math.cos(cur1.rot);
                } else {
                  const d24 = dr4 * dr4;
                  const p6 = 1 - 0.5 * d24;
                  const m4 = 1 - (d24 * d24) / 8;
                  const nx4 = (p6 * cur1.axisx + dr4 * cur1.axisy) * m4;
                  cur1.axisy = (p6 * cur1.axisy - dr4 * cur1.axisx) * m4;
                  cur1.axisx = nx4;
                }
              }
            }
            if (s1.type == 0) {
              const _this4 = s1.circle;
              _this4.worldCOMx =
                _this4.body.posx +
                (_this4.body.axisy * _this4.localCOMx - _this4.body.axisx * _this4.localCOMy);
              _this4.worldCOMy =
                _this4.body.posy +
                (_this4.localCOMx * _this4.body.axisx + _this4.localCOMy * _this4.body.axisy);
              _this4.aabb.minx = _this4.worldCOMx - _this4.radius;
              _this4.aabb.miny = _this4.worldCOMy - _this4.radius;
              _this4.aabb.maxx = _this4.worldCOMx + _this4.radius;
              _this4.aabb.maxy = _this4.worldCOMy + _this4.radius;
            } else {
              const _this5 = s1.polygon;
              let li2 = _this5.lverts.next;
              const p02 = _this5.gverts.next;
              const l4 = li2;
              li2 = li2.next;
              p02.x = _this5.body.posx + (_this5.body.axisy * l4.x - _this5.body.axisx * l4.y);
              p02.y = _this5.body.posy + (l4.x * _this5.body.axisx + l4.y * _this5.body.axisy);
              _this5.aabb.minx = p02.x;
              _this5.aabb.miny = p02.y;
              _this5.aabb.maxx = p02.x;
              _this5.aabb.maxy = p02.y;
              let cx_ite6 = _this5.gverts.next.next;
              while (cx_ite6 != null) {
                const p7 = cx_ite6;
                const l5 = li2;
                li2 = li2.next;
                p7.x = _this5.body.posx + (_this5.body.axisy * l5.x - _this5.body.axisx * l5.y);
                p7.y = _this5.body.posy + (l5.x * _this5.body.axisx + l5.y * _this5.body.axisy);
                if (p7.x < _this5.aabb.minx) {
                  _this5.aabb.minx = p7.x;
                }
                if (p7.x > _this5.aabb.maxx) {
                  _this5.aabb.maxx = p7.x;
                }
                if (p7.y < _this5.aabb.miny) {
                  _this5.aabb.miny = p7.y;
                }
                if (p7.y > _this5.aabb.maxy) {
                  _this5.aabb.maxy = p7.y;
                }
                cx_ite6 = cx_ite6.next;
              }
            }
            if (minx1 < aabb1.minx) {
              aabb1.minx = minx1;
            } else {
              minx1 = aabb1.minx;
            }
            if (miny1 < aabb1.miny) {
              aabb1.miny = miny1;
            } else {
              miny1 = aabb1.miny;
            }
            if (maxx1 > aabb1.maxx) {
              aabb1.maxx = maxx1;
            } else {
              maxx1 = aabb1.maxx;
            }
            if (maxy1 > aabb1.maxy) {
              aabb1.maxy = maxy1;
            } else {
              maxy1 = aabb1.maxy;
            }
            let _g2 = 1;
            const _g11 = count1;
            while (_g2 < _g11) {
              const i1 = _g2++;
              const dt2 = anginc1 * i1 * iangvel1;
              const delta5 = dt2 - cur1.sweepTime;
              if (delta5 != 0) {
                cur1.sweepTime = dt2;
                const t5 = delta5;
                cur1.posx += cur1.velx * t5;
                cur1.posy += cur1.vely * t5;
                if (cur1.angvel != 0) {
                  const dr5 = cur1.sweep_angvel * delta5;
                  cur1.rot += dr5;
                  if (dr5 * dr5 > 0.0001) {
                    cur1.axisx = Math.sin(cur1.rot);
                    cur1.axisy = Math.cos(cur1.rot);
                  } else {
                    const d25 = dr5 * dr5;
                    const p8 = 1 - 0.5 * d25;
                    const m5 = 1 - (d25 * d25) / 8;
                    const nx5 = (p8 * cur1.axisx + dr5 * cur1.axisy) * m5;
                    cur1.axisy = (p8 * cur1.axisy - dr5 * cur1.axisx) * m5;
                    cur1.axisx = nx5;
                  }
                }
              }
              if (s1.type == 0) {
                const _this6 = s1.circle;
                _this6.worldCOMx =
                  _this6.body.posx +
                  (_this6.body.axisy * _this6.localCOMx - _this6.body.axisx * _this6.localCOMy);
                _this6.worldCOMy =
                  _this6.body.posy +
                  (_this6.localCOMx * _this6.body.axisx + _this6.localCOMy * _this6.body.axisy);
                _this6.aabb.minx = _this6.worldCOMx - _this6.radius;
                _this6.aabb.miny = _this6.worldCOMy - _this6.radius;
                _this6.aabb.maxx = _this6.worldCOMx + _this6.radius;
                _this6.aabb.maxy = _this6.worldCOMy + _this6.radius;
              } else {
                const _this7 = s1.polygon;
                let li3 = _this7.lverts.next;
                const p03 = _this7.gverts.next;
                const l6 = li3;
                li3 = li3.next;
                p03.x = _this7.body.posx + (_this7.body.axisy * l6.x - _this7.body.axisx * l6.y);
                p03.y = _this7.body.posy + (l6.x * _this7.body.axisx + l6.y * _this7.body.axisy);
                _this7.aabb.minx = p03.x;
                _this7.aabb.miny = p03.y;
                _this7.aabb.maxx = p03.x;
                _this7.aabb.maxy = p03.y;
                let cx_ite7 = _this7.gverts.next.next;
                while (cx_ite7 != null) {
                  const p9 = cx_ite7;
                  const l7 = li3;
                  li3 = li3.next;
                  p9.x = _this7.body.posx + (_this7.body.axisy * l7.x - _this7.body.axisx * l7.y);
                  p9.y = _this7.body.posy + (l7.x * _this7.body.axisx + l7.y * _this7.body.axisy);
                  if (p9.x < _this7.aabb.minx) {
                    _this7.aabb.minx = p9.x;
                  }
                  if (p9.x > _this7.aabb.maxx) {
                    _this7.aabb.maxx = p9.x;
                  }
                  if (p9.y < _this7.aabb.miny) {
                    _this7.aabb.miny = p9.y;
                  }
                  if (p9.y > _this7.aabb.maxy) {
                    _this7.aabb.maxy = p9.y;
                  }
                  cx_ite7 = cx_ite7.next;
                }
              }
              if (minx1 < aabb1.minx) {
                aabb1.minx = minx1;
              } else {
                minx1 = aabb1.minx;
              }
              if (miny1 < aabb1.miny) {
                aabb1.miny = miny1;
              } else {
                miny1 = aabb1.miny;
              }
              if (maxx1 > aabb1.maxx) {
                aabb1.maxx = maxx1;
              } else {
                maxx1 = aabb1.maxx;
              }
              if (maxy1 > aabb1.maxy) {
                aabb1.maxy = maxy1;
              } else {
                maxy1 = aabb1.maxy;
              }
            }
            this.bphase.sync(s1);
            cx_ite5 = cx_ite5.next;
          }
          cur1.sweepFrozen = false;
          if (cur1.type == 2 && cur1.bulletEnabled) {
            const linThreshold21 =
              ZPP_Space._nape.Config.bulletCCDLinearThreshold * cur1.sweepRadius;
            const angThreshold21 = ZPP_Space._nape.Config.bulletCCDAngularThreshold;
            if (
              (cur1.velx * cur1.velx + cur1.vely * cur1.vely) * dt * dt >
                linThreshold21 * linThreshold21 ||
              cur1.angvel * cur1.angvel * dt * dt > angThreshold21 * angThreshold21
            ) {
              cur1.bullet = true;
            }
          }
        } else {
          cur1.sweepFrozen = true;
          cur1.bullet = false;
        }
      } else {
        cur1.sweepFrozen = true;
        cur1.bullet = false;
      }
      cx_ite4 = cx_ite4.next;
    }
  }

  presteparb(arb: any, dt: any, cont?: any) {
    if (cont == null) {
      cont = false;
    }
    const _gthis = this;
    if (!arb.cleared && arb.b1.component.sleeping && arb.b2.component.sleeping) {
      arb.sleep_stamp = this.stamp;
      arb.sleeping = true;
      return true;
    }
    if (!arb.cleared || arb.present != 0 || arb.intchange) {
      const endcb = !cont && arb.up_stamp == this.stamp - 1 && !arb.cleared && !arb.intchange;
      const begcb = arb.fresh && !arb.cleared && !arb.intchange;
      if (endcb) {
        arb.endGenerated = this.stamp;
      }
      if (begcb || endcb || arb.cleared || arb.intchange) {
        const s1 = arb.ws1;
        const s2 = arb.ws2;
        const _this = this.mrca1;
        while (_this.head != null) {
          const ret = _this.head;
          _this.head = ret.next;
          const o = ret;
          o.elt = null;
          o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
          ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o;
          if (_this.head == null) {
            _this.pushmod = true;
          }
          _this.modified = true;
          _this.length--;
        }
        _this.pushmod = true;
        const _this1 = this.mrca2;
        while (_this1.head != null) {
          const ret1 = _this1.head;
          _this1.head = ret1.next;
          const o1 = ret1;
          o1.elt = null;
          o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
          ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o1;
          if (_this1.head == null) {
            _this1.pushmod = true;
          }
          _this1.modified = true;
          _this1.length--;
        }
        _this1.pushmod = true;
        if (s1.cbSet != null) {
          const _this2 = this.mrca1;
          let ret2;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret2 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret2 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret2.next;
            ret2.next = null;
          }
          ret2.elt = s1;
          const temp = ret2;
          temp.next = _this2.head;
          _this2.head = temp;
          _this2.modified = true;
          _this2.length++;
        }
        if (s1.body.cbSet != null) {
          const _this3 = this.mrca1;
          const o2 = s1.body;
          let ret3;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret3.next;
            ret3.next = null;
          }
          ret3.elt = o2;
          const temp1 = ret3;
          temp1.next = _this3.head;
          _this3.head = temp1;
          _this3.modified = true;
          _this3.length++;
        }
        if (s2.cbSet != null) {
          const _this4 = this.mrca2;
          let ret4;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret4 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret4 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret4.next;
            ret4.next = null;
          }
          ret4.elt = s2;
          const temp2 = ret4;
          temp2.next = _this4.head;
          _this4.head = temp2;
          _this4.modified = true;
          _this4.length++;
        }
        if (s2.body.cbSet != null) {
          const _this5 = this.mrca2;
          const o3 = s2.body;
          let ret5;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret5 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret5 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret5.next;
            ret5.next = null;
          }
          ret5.elt = o3;
          const temp3 = ret5;
          temp3.next = _this5.head;
          _this5.head = temp3;
          _this5.modified = true;
          _this5.length++;
        }
        let c1 = s1.body.compound;
        let c2 = s2.body.compound;
        while (c1 != c2) {
          const d1 = c1 == null ? 0 : c1.depth;
          const d2 = c2 == null ? 0 : c2.depth;
          if (d1 < d2) {
            if (c2.cbSet != null) {
              const _this6 = this.mrca2;
              let ret6;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                ret6 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
              } else {
                ret6 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret6.next;
                ret6.next = null;
              }
              ret6.elt = c2;
              const temp4 = ret6;
              temp4.next = _this6.head;
              _this6.head = temp4;
              _this6.modified = true;
              _this6.length++;
            }
            c2 = c2.compound;
          } else {
            if (c1.cbSet != null) {
              const _this7 = this.mrca1;
              let ret7;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                ret7 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
              } else {
                ret7 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret7.next;
                ret7.next = null;
              }
              ret7.elt = c1;
              const temp5 = ret7;
              temp5.next = _this7.head;
              _this7.head = temp5;
              _this7.modified = true;
              _this7.length++;
            }
            c1 = c1.compound;
          }
        }
        let cx_ite = this.mrca1.head;
        while (cx_ite != null) {
          const i1 = cx_ite.elt;
          let cx_ite1 = this.mrca2.head;
          while (cx_ite1 != null) {
            const i2 = cx_ite1.elt;
            const cb1 = i1.cbSet;
            const cb2 = i2.cbSet;
            const _this8 = cb1.manager;
            let ret8 = null;
            const pairs = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
            let cx_ite2 = pairs.head;
            while (cx_ite2 != null) {
              const p = cx_ite2.elt;
              if ((p.a == cb1 && p.b == cb2) || (p.a == cb2 && p.b == cb1)) {
                ret8 = p;
                break;
              }
              cx_ite2 = cx_ite2.next;
            }
            if (ret8 == null) {
              let ret9;
              if (ZPP_CbSetPair.zpp_pool == null) {
                ret9 = new ZPP_CbSetPair();
              } else {
                ret9 = ZPP_CbSetPair.zpp_pool;
                ZPP_CbSetPair.zpp_pool = ret9.next;
                ret9.next = null;
              }
              ret9.zip_listeners = true;
              if (ZPP_CbSet.setlt(cb1, cb2)) {
                ret9.a = cb1;
                ret9.b = cb2;
              } else {
                ret9.a = cb2;
                ret9.b = cb1;
              }
              ret8 = ret9;
              cb1.cbpairs.add(ret8);
              if (cb2 != cb1) {
                cb2.cbpairs.add(ret8);
              }
            }
            if (ret8.zip_listeners) {
              ret8.zip_listeners = false;
              ret8.__validate();
            }
            if (ret8.listeners.head == null) {
              cx_ite1 = cx_ite1.next;
              continue;
            }
            let callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i1, i2);
            if (begcb || arb.intchange) {
              if (callbackset == null) {
                callbackset = ZPP_CallbackSet.get(i1, i2);
                this.add_callbackset(callbackset);
              }
              const _this9 = cb1.manager;
              let ret10 = null;
              const pairs1 = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
              let cx_ite3 = pairs1.head;
              while (cx_ite3 != null) {
                const p1 = cx_ite3.elt;
                if ((p1.a == cb1 && p1.b == cb2) || (p1.a == cb2 && p1.b == cb1)) {
                  ret10 = p1;
                  break;
                }
                cx_ite3 = cx_ite3.next;
              }
              if (ret10 == null) {
                let ret11;
                if (ZPP_CbSetPair.zpp_pool == null) {
                  ret11 = new ZPP_CbSetPair();
                } else {
                  ret11 = ZPP_CbSetPair.zpp_pool;
                  ZPP_CbSetPair.zpp_pool = ret11.next;
                  ret11.next = null;
                }
                ret11.zip_listeners = true;
                if (ZPP_CbSet.setlt(cb1, cb2)) {
                  ret11.a = cb1;
                  ret11.b = cb2;
                } else {
                  ret11.a = cb2;
                  ret11.b = cb1;
                }
                ret10 = ret11;
                cb1.cbpairs.add(ret10);
                if (cb2 != cb1) {
                  cb2.cbpairs.add(ret10);
                }
              }
              if (ret10.zip_listeners) {
                ret10.zip_listeners = false;
                ret10.__validate();
              }
              let cx_ite4 = ret10.listeners.head;
              while (cx_ite4 != null) {
                const x = cx_ite4.elt;
                if (x.event == 0) {
                  if ((x.itype & arb.type) != 0 && callbackset.empty_arb(x.itype)) {
                    const cb = _gthis.push_callback(x);
                    cb.event = 0;
                    const o11 = callbackset.int1;
                    const o21 = callbackset.int2;
                    let tmp;
                    const _this10 = x.options1;
                    const xs = o11.cbTypes;
                    if (
                      _this10.nonemptyintersection(xs, _this10.includes) &&
                      !_this10.nonemptyintersection(xs, _this10.excludes)
                    ) {
                      const _this11 = x.options2;
                      const xs1 = o21.cbTypes;
                      tmp =
                        _this11.nonemptyintersection(xs1, _this11.includes) &&
                        !_this11.nonemptyintersection(xs1, _this11.excludes);
                    } else {
                      tmp = false;
                    }
                    if (tmp) {
                      cb.int1 = o11;
                      cb.int2 = o21;
                    } else {
                      cb.int1 = o21;
                      cb.int2 = o11;
                    }
                    cb.set = callbackset;
                  }
                }
                cx_ite4 = cx_ite4.next;
              }
              let tmp1;
              let ret12;
              ret12 = false;
              let cx_ite5 = callbackset.arbiters.head;
              while (cx_ite5 != null) {
                const npite = cx_ite5.elt;
                if (npite == arb) {
                  ret12 = true;
                  break;
                }
                cx_ite5 = cx_ite5.next;
              }
              if (!ret12) {
                const _this12 = callbackset.arbiters;
                let ret13;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                  ret13 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
                } else {
                  ret13 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret13.next;
                  ret13.next = null;
                }
                ret13.elt = arb;
                const temp6 = ret13;
                temp6.next = _this12.head;
                _this12.head = temp6;
                _this12.modified = true;
                _this12.length++;
                tmp1 = true;
              } else {
                tmp1 = false;
              }
              if (tmp1) {
                arb.present++;
              }
            } else {
              arb.present--;
              callbackset.remove_arb(arb);
              const _this13 = cb1.manager;
              let ret14 = null;
              const pairs2 = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
              let cx_ite6 = pairs2.head;
              while (cx_ite6 != null) {
                const p2 = cx_ite6.elt;
                if ((p2.a == cb1 && p2.b == cb2) || (p2.a == cb2 && p2.b == cb1)) {
                  ret14 = p2;
                  break;
                }
                cx_ite6 = cx_ite6.next;
              }
              if (ret14 == null) {
                let ret15;
                if (ZPP_CbSetPair.zpp_pool == null) {
                  ret15 = new ZPP_CbSetPair();
                } else {
                  ret15 = ZPP_CbSetPair.zpp_pool;
                  ZPP_CbSetPair.zpp_pool = ret15.next;
                  ret15.next = null;
                }
                ret15.zip_listeners = true;
                if (ZPP_CbSet.setlt(cb1, cb2)) {
                  ret15.a = cb1;
                  ret15.b = cb2;
                } else {
                  ret15.a = cb2;
                  ret15.b = cb1;
                }
                ret14 = ret15;
                cb1.cbpairs.add(ret14);
                if (cb2 != cb1) {
                  cb2.cbpairs.add(ret14);
                }
              }
              if (ret14.zip_listeners) {
                ret14.zip_listeners = false;
                ret14.__validate();
              }
              let cx_ite7 = ret14.listeners.head;
              while (cx_ite7 != null) {
                const x1 = cx_ite7.elt;
                if (x1.event == 1) {
                  if ((x1.itype & arb.type) != 0 && callbackset.empty_arb(x1.itype)) {
                    const cb3 = _gthis.push_callback(x1);
                    cb3.event = 1;
                    const o12 = callbackset.int1;
                    const o22 = callbackset.int2;
                    let tmp2;
                    const _this14 = x1.options1;
                    const xs2 = o12.cbTypes;
                    if (
                      _this14.nonemptyintersection(xs2, _this14.includes) &&
                      !_this14.nonemptyintersection(xs2, _this14.excludes)
                    ) {
                      const _this15 = x1.options2;
                      const xs3 = o22.cbTypes;
                      tmp2 =
                        _this15.nonemptyintersection(xs3, _this15.includes) &&
                        !_this15.nonemptyintersection(xs3, _this15.excludes);
                    } else {
                      tmp2 = false;
                    }
                    if (tmp2) {
                      cb3.int1 = o12;
                      cb3.int2 = o22;
                    } else {
                      cb3.int1 = o22;
                      cb3.int2 = o12;
                    }
                    cb3.set = callbackset;
                  }
                }
                cx_ite7 = cx_ite7.next;
              }
              if (callbackset.arbiters.head == null) {
                this.remove_callbackset(callbackset);
              }
            }
            cx_ite1 = cx_ite1.next;
          }
          cx_ite = cx_ite.next;
        }
      }
      arb.fresh = false;
      arb.intchange = false;
    }
    if (
      arb.cleared ||
      arb.up_stamp +
        (arb.type == ZPP_Arbiter.COL ? ZPP_Space._nape.Config.arbiterExpirationDelay : 0) <
        this.stamp
    ) {
      if (arb.type == ZPP_Arbiter.SENSOR) {
        const _this16 = arb.sensorarb;
        if (!_this16.cleared) {
          const _this17 = _this16.b1.arbiters;
          let pre = null;
          let cur = _this17.head;
          let ret16 = false;
          while (cur != null) {
            if (cur.elt == _this16) {
              let old;
              let ret17;
              if (pre == null) {
                old = _this17.head;
                ret17 = old.next;
                _this17.head = ret17;
                if (_this17.head == null) {
                  _this17.pushmod = true;
                }
              } else {
                old = pre.next;
                ret17 = old.next;
                pre.next = ret17;
                if (ret17 == null) {
                  _this17.pushmod = true;
                }
              }
              const o4 = old;
              o4.elt = null;
              o4.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o4;
              _this17.modified = true;
              _this17.length--;
              _this17.pushmod = true;
              ret16 = true;
              break;
            }
            pre = cur;
            cur = cur.next;
          }
          const _this18 = _this16.b2.arbiters;
          let pre1 = null;
          let cur1 = _this18.head;
          let ret18 = false;
          while (cur1 != null) {
            if (cur1.elt == _this16) {
              let old1;
              let ret19;
              if (pre1 == null) {
                old1 = _this18.head;
                ret19 = old1.next;
                _this18.head = ret19;
                if (_this18.head == null) {
                  _this18.pushmod = true;
                }
              } else {
                old1 = pre1.next;
                ret19 = old1.next;
                pre1.next = ret19;
                if (ret19 == null) {
                  _this18.pushmod = true;
                }
              }
              const o5 = old1;
              o5.elt = null;
              o5.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o5;
              _this18.modified = true;
              _this18.length--;
              _this18.pushmod = true;
              ret18 = true;
              break;
            }
            pre1 = cur1;
            cur1 = cur1.next;
          }
          if (_this16.pair != null) {
            _this16.pair.arb = null;
            _this16.pair = null;
          }
        }
        _this16.b1 = _this16.b2 = null;
        _this16.active = false;
        _this16.intchange = false;
        const o6 = _this16;
        o6.next = ZPP_SensorArbiter.zpp_pool;
        ZPP_SensorArbiter.zpp_pool = o6;
      } else if (arb.type == ZPP_Arbiter.FLUID) {
        const _this19 = arb.fluidarb;
        if (!_this19.cleared) {
          const _this20 = _this19.b1.arbiters;
          let pre2 = null;
          let cur2 = _this20.head;
          let ret20 = false;
          while (cur2 != null) {
            if (cur2.elt == _this19) {
              let old2;
              let ret21;
              if (pre2 == null) {
                old2 = _this20.head;
                ret21 = old2.next;
                _this20.head = ret21;
                if (_this20.head == null) {
                  _this20.pushmod = true;
                }
              } else {
                old2 = pre2.next;
                ret21 = old2.next;
                pre2.next = ret21;
                if (ret21 == null) {
                  _this20.pushmod = true;
                }
              }
              const o7 = old2;
              o7.elt = null;
              o7.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o7;
              _this20.modified = true;
              _this20.length--;
              _this20.pushmod = true;
              ret20 = true;
              break;
            }
            pre2 = cur2;
            cur2 = cur2.next;
          }
          const _this21 = _this19.b2.arbiters;
          let pre3 = null;
          let cur3 = _this21.head;
          let ret22 = false;
          while (cur3 != null) {
            if (cur3.elt == _this19) {
              let old3;
              let ret23;
              if (pre3 == null) {
                old3 = _this21.head;
                ret23 = old3.next;
                _this21.head = ret23;
                if (_this21.head == null) {
                  _this21.pushmod = true;
                }
              } else {
                old3 = pre3.next;
                ret23 = old3.next;
                pre3.next = ret23;
                if (ret23 == null) {
                  _this21.pushmod = true;
                }
              }
              const o8 = old3;
              o8.elt = null;
              o8.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o8;
              _this21.modified = true;
              _this21.length--;
              _this21.pushmod = true;
              ret22 = true;
              break;
            }
            pre3 = cur3;
            cur3 = cur3.next;
          }
          if (_this19.pair != null) {
            _this19.pair.arb = null;
            _this19.pair = null;
          }
        }
        _this19.b1 = _this19.b2 = null;
        _this19.active = false;
        _this19.intchange = false;
        const o9 = _this19;
        o9.next = ZPP_FluidArbiter.zpp_pool;
        ZPP_FluidArbiter.zpp_pool = o9;
        _this19.pre_dt = -1.0;
      } else {
        const _this22 = arb.colarb;
        if (!_this22.cleared) {
          const _this23 = _this22.b1.arbiters;
          let pre4 = null;
          let cur4 = _this23.head;
          let ret24 = false;
          while (cur4 != null) {
            if (cur4.elt == _this22) {
              let old4;
              let ret25;
              if (pre4 == null) {
                old4 = _this23.head;
                ret25 = old4.next;
                _this23.head = ret25;
                if (_this23.head == null) {
                  _this23.pushmod = true;
                }
              } else {
                old4 = pre4.next;
                ret25 = old4.next;
                pre4.next = ret25;
                if (ret25 == null) {
                  _this23.pushmod = true;
                }
              }
              const o10 = old4;
              o10.elt = null;
              o10.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o10;
              _this23.modified = true;
              _this23.length--;
              _this23.pushmod = true;
              ret24 = true;
              break;
            }
            pre4 = cur4;
            cur4 = cur4.next;
          }
          const _this24 = _this22.b2.arbiters;
          let pre5 = null;
          let cur5 = _this24.head;
          let ret26 = false;
          while (cur5 != null) {
            if (cur5.elt == _this22) {
              let old5;
              let ret27;
              if (pre5 == null) {
                old5 = _this24.head;
                ret27 = old5.next;
                _this24.head = ret27;
                if (_this24.head == null) {
                  _this24.pushmod = true;
                }
              } else {
                old5 = pre5.next;
                ret27 = old5.next;
                pre5.next = ret27;
                if (ret27 == null) {
                  _this24.pushmod = true;
                }
              }
              const o13 = old5;
              o13.elt = null;
              o13.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
              ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o13;
              _this24.modified = true;
              _this24.length--;
              _this24.pushmod = true;
              ret26 = true;
              break;
            }
            pre5 = cur5;
            cur5 = cur5.next;
          }
          if (_this22.pair != null) {
            _this22.pair.arb = null;
            _this22.pair = null;
          }
        }
        _this22.b1 = _this22.b2 = null;
        _this22.active = false;
        _this22.intchange = false;
        while (_this22.contacts.next != null) {
          const _this25 = _this22.contacts;
          const ret28 = _this25.next;
          _this25.pop();
          const o14 = ret28;
          o14.arbiter = null;
          o14.next = ZPP_Contact.zpp_pool;
          ZPP_Contact.zpp_pool = o14;
          const _this26 = _this22.innards;
          const ret29 = _this26.next;
          _this26.next = ret29.next;
          ret29._inuse = false;
          if (_this26.next == null) {
            _this26.pushmod = true;
          }
          _this26.modified = true;
          _this26.length--;
        }
        const o15 = _this22;
        o15.userdef_dyn_fric = false;
        o15.userdef_stat_fric = false;
        o15.userdef_restitution = false;
        o15.userdef_rfric = false;
        o15.__ref_edge1 = o15.__ref_edge2 = null;
        o15.next = ZPP_ColArbiter.zpp_pool;
        ZPP_ColArbiter.zpp_pool = o15;
        _this22.pre_dt = -1.0;
      }
      return true;
    }
    const pact = arb.active;
    arb.active = arb.presentable = arb.up_stamp == this.stamp;
    if ((arb.immState & 1) != 0) {
      if (arb.active && arb.type != ZPP_Arbiter.SENSOR) {
        if (arb.colarb != null) {
          const _this27 = arb.colarb;
          if (_this27.invalidated) {
            _this27.invalidated = false;
            if (!_this27.userdef_restitution) {
              if (
                _this27.s1.material.elasticity <= -Infinity ||
                _this27.s2.material.elasticity <= -Infinity
              ) {
                _this27.restitution = 0;
              } else if (
                _this27.s1.material.elasticity >= Infinity ||
                _this27.s2.material.elasticity >= Infinity
              ) {
                _this27.restitution = 1;
              } else {
                _this27.restitution =
                  (_this27.s1.material.elasticity + _this27.s2.material.elasticity) / 2;
              }
              if (_this27.restitution < 0) {
                _this27.restitution = 0;
              }
              if (_this27.restitution > 1) {
                _this27.restitution = 1;
              }
            }
            if (!_this27.userdef_dyn_fric) {
              _this27.dyn_fric = Math.sqrt(
                _this27.s1.material.dynamicFriction * _this27.s2.material.dynamicFriction,
              );
            }
            if (!_this27.userdef_stat_fric) {
              _this27.stat_fric = Math.sqrt(
                _this27.s1.material.staticFriction * _this27.s2.material.staticFriction,
              );
            }
            if (!_this27.userdef_rfric) {
              _this27.rfric = Math.sqrt(
                _this27.s1.material.rollingFriction * _this27.s2.material.rollingFriction,
              );
            }
          }
          if (_this27.pre_dt == -1.0) {
            _this27.pre_dt = dt;
          }
          const dtratio = dt / _this27.pre_dt;
          _this27.pre_dt = dt;
          const mass_sum = _this27.b1.smass + _this27.b2.smass;
          _this27.hc2 = false;
          let fst = true;
          const statType = _this27.b1.type != 2 || _this27.b2.type != 2;
          const bias = statType
            ? _this27.continuous
              ? ZPP_Space._nape.Config.contactContinuousStaticBiasCoef
              : ZPP_Space._nape.Config.contactStaticBiasCoef
            : _this27.continuous
              ? ZPP_Space._nape.Config.contactContinuousBiasCoef
              : ZPP_Space._nape.Config.contactBiasCoef;
          _this27.biasCoef = bias;
          _this27.continuous = false;
          let pre6 = null;
          let prei = null;
          let cx_itei = _this27.innards.next;
          let cx_ite8 = _this27.contacts.next;
          while (cx_ite8 != null) {
            const c = cx_ite8;
            if (c.stamp + ZPP_Space._nape.Config.arbiterExpirationDelay < _this27.stamp) {
              const _this28 = _this27.contacts;
              let old6;
              let ret30;
              if (pre6 == null) {
                old6 = _this28.next;
                ret30 = old6.next;
                _this28.next = ret30;
                if (_this28.next == null) {
                  _this28.pushmod = true;
                }
              } else {
                old6 = pre6.next;
                ret30 = old6.next;
                pre6.next = ret30;
                if (ret30 == null) {
                  _this28.pushmod = true;
                }
              }
              old6._inuse = false;
              _this28.modified = true;
              _this28.length--;
              _this28.pushmod = true;
              cx_ite8 = ret30;
              const _this29 = _this27.innards;
              let old7;
              let ret31;
              if (prei == null) {
                old7 = _this29.next;
                ret31 = old7.next;
                _this29.next = ret31;
                if (_this29.next == null) {
                  _this29.pushmod = true;
                }
              } else {
                old7 = prei.next;
                ret31 = old7.next;
                prei.next = ret31;
                if (ret31 == null) {
                  _this29.pushmod = true;
                }
              }
              old7._inuse = false;
              _this29.modified = true;
              _this29.length--;
              _this29.pushmod = true;
              cx_itei = ret31;
              const o16 = c;
              o16.arbiter = null;
              o16.next = ZPP_Contact.zpp_pool;
              ZPP_Contact.zpp_pool = o16;
              continue;
            }
            const ci = c.inner;
            const pact1 = c.active;
            c.active = c.stamp == _this27.stamp;
            if (c.active) {
              if (fst) {
                fst = false;
                _this27.c1 = ci;
                _this27.oc1 = c;
              } else {
                _this27.hc2 = true;
                _this27.c2 = ci;
                _this27.oc2 = c;
              }
              ci.r2x = c.px - _this27.b2.posx;
              ci.r2y = c.py - _this27.b2.posy;
              ci.r1x = c.px - _this27.b1.posx;
              ci.r1y = c.py - _this27.b1.posy;
              const x2 = ci.r2x * _this27.nx + ci.r2y * _this27.ny;
              let kt = mass_sum + _this27.b2.sinertia * (x2 * x2);
              const x3 = ci.r1x * _this27.nx + ci.r1y * _this27.ny;
              kt += _this27.b1.sinertia * (x3 * x3);
              ci.tMass =
                kt < ZPP_Space._nape.Config.epsilon * ZPP_Space._nape.Config.epsilon ? 0 : 1.0 / kt;
              const x4 = _this27.ny * ci.r2x - _this27.nx * ci.r2y;
              let nt = mass_sum + _this27.b2.sinertia * (x4 * x4);
              const x5 = _this27.ny * ci.r1x - _this27.nx * ci.r1y;
              nt += _this27.b1.sinertia * (x5 * x5);
              ci.nMass =
                nt < ZPP_Space._nape.Config.epsilon * ZPP_Space._nape.Config.epsilon ? 0 : 1.0 / nt;
              let vrx = 0.0;
              let vry = 0.0;
              let ang = _this27.b2.angvel + _this27.b2.kinangvel;
              vrx = _this27.b2.velx + _this27.b2.kinvelx - ci.r2y * ang;
              vry = _this27.b2.vely + _this27.b2.kinvely + ci.r2x * ang;
              ang = _this27.b1.angvel + _this27.b1.kinangvel;
              vrx -= _this27.b1.velx + _this27.b1.kinvelx - ci.r1y * ang;
              vry -= _this27.b1.vely + _this27.b1.kinvely + ci.r1x * ang;
              let vdot = _this27.nx * vrx + _this27.ny * vry;
              c.elasticity = _this27.restitution;
              ci.bounce = vdot * c.elasticity;
              if (ci.bounce > -ZPP_Space._nape.Config.elasticThreshold) {
                ci.bounce = 0;
              }
              vdot = vry * _this27.nx - vrx * _this27.ny;
              const thr = ZPP_Space._nape.Config.staticFrictionThreshold;
              if (vdot * vdot > thr * thr) {
                ci.friction = _this27.dyn_fric;
              } else {
                ci.friction = _this27.stat_fric;
              }
              ci.jnAcc *= dtratio;
              ci.jtAcc *= dtratio;
            }
            if (pact1 != c.active) {
              _this27.contacts.modified = true;
            }
            pre6 = cx_ite8;
            prei = cx_itei;
            cx_itei = cx_itei.next;
            cx_ite8 = cx_ite8.next;
          }
          if (_this27.hc2) {
            _this27.hpc2 = true;
            if (_this27.oc1.posOnly) {
              const tmp3 = _this27.c1;
              _this27.c1 = _this27.c2;
              _this27.c2 = tmp3;
              const tmp21 = _this27.oc1;
              _this27.oc1 = _this27.oc2;
              _this27.oc2 = tmp21;
              _this27.hc2 = false;
            } else if (_this27.oc2.posOnly) {
              _this27.hc2 = false;
            }
            if (_this27.oc1.posOnly) {
              fst = true;
            }
          } else {
            _this27.hpc2 = false;
          }
          _this27.jrAcc *= dtratio;
          if (!fst) {
            _this27.rn1a = _this27.ny * _this27.c1.r1x - _this27.nx * _this27.c1.r1y;
            _this27.rt1a = _this27.c1.r1x * _this27.nx + _this27.c1.r1y * _this27.ny;
            _this27.rn1b = _this27.ny * _this27.c1.r2x - _this27.nx * _this27.c1.r2y;
            _this27.rt1b = _this27.c1.r2x * _this27.nx + _this27.c1.r2y * _this27.ny;
            _this27.k1x =
              _this27.b2.kinvelx -
              _this27.c1.r2y * _this27.b2.kinangvel -
              (_this27.b1.kinvelx - _this27.c1.r1y * _this27.b1.kinangvel);
            _this27.k1y =
              _this27.b2.kinvely +
              _this27.c1.r2x * _this27.b2.kinangvel -
              (_this27.b1.kinvely + _this27.c1.r1x * _this27.b1.kinangvel);
          }
          if (_this27.hc2) {
            _this27.rn2a = _this27.ny * _this27.c2.r1x - _this27.nx * _this27.c2.r1y;
            _this27.rt2a = _this27.c2.r1x * _this27.nx + _this27.c2.r1y * _this27.ny;
            _this27.rn2b = _this27.ny * _this27.c2.r2x - _this27.nx * _this27.c2.r2y;
            _this27.rt2b = _this27.c2.r2x * _this27.nx + _this27.c2.r2y * _this27.ny;
            _this27.k2x =
              _this27.b2.kinvelx -
              _this27.c2.r2y * _this27.b2.kinangvel -
              (_this27.b1.kinvelx - _this27.c2.r1y * _this27.b1.kinangvel);
            _this27.k2y =
              _this27.b2.kinvely +
              _this27.c2.r2x * _this27.b2.kinangvel -
              (_this27.b1.kinvely + _this27.c2.r1x * _this27.b1.kinangvel);
            _this27.kMassa =
              mass_sum +
              _this27.b1.sinertia * _this27.rn1a * _this27.rn1a +
              _this27.b2.sinertia * _this27.rn1b * _this27.rn1b;
            _this27.kMassb =
              mass_sum +
              _this27.b1.sinertia * _this27.rn1a * _this27.rn2a +
              _this27.b2.sinertia * _this27.rn1b * _this27.rn2b;
            _this27.kMassc =
              mass_sum +
              _this27.b1.sinertia * _this27.rn2a * _this27.rn2a +
              _this27.b2.sinertia * _this27.rn2b * _this27.rn2b;
            const norm =
              _this27.kMassa * _this27.kMassa +
              2 * _this27.kMassb * _this27.kMassb +
              _this27.kMassc * _this27.kMassc;
            if (
              norm <
              ZPP_Space._nape.Config.illConditionedThreshold *
                (_this27.kMassa * _this27.kMassc - _this27.kMassb * _this27.kMassb)
            ) {
              _this27.Ka = _this27.kMassa;
              _this27.Kb = _this27.kMassb;
              _this27.Kc = _this27.kMassc;
              let det = _this27.kMassa * _this27.kMassc - _this27.kMassb * _this27.kMassb;
              if (det != det) {
                _this27.kMassa = _this27.kMassb = _this27.kMassc = 0;
              } else if (det == 0) {
                let flag = 0;
                if (_this27.kMassa != 0) {
                  _this27.kMassa = 1 / _this27.kMassa;
                } else {
                  _this27.kMassa = 0;
                  flag |= 1;
                }
                if (_this27.kMassc != 0) {
                  _this27.kMassc = 1 / _this27.kMassc;
                } else {
                  _this27.kMassc = 0;
                  flag |= 2;
                }
                _this27.kMassb = 0;
              } else {
                det = 1 / det;
                const t = _this27.kMassc * det;
                _this27.kMassc = _this27.kMassa * det;
                _this27.kMassa = t;
                _this27.kMassb *= -det;
              }
            } else {
              _this27.hc2 = false;
              if (_this27.oc2.dist < _this27.oc1.dist) {
                const t1 = _this27.c1;
                _this27.c1 = _this27.c2;
                _this27.c2 = t1;
              }
              _this27.oc2.active = false;
              _this27.contacts.modified = true;
            }
          }
          _this27.surfacex = _this27.b2.svelx;
          _this27.surfacey = _this27.b2.svely;
          const t2 = 1.0;
          _this27.surfacex += _this27.b1.svelx * t2;
          _this27.surfacey += _this27.b1.svely * t2;
          _this27.surfacex = -_this27.surfacex;
          _this27.surfacey = -_this27.surfacey;
          _this27.rMass = _this27.b1.sinertia + _this27.b2.sinertia;
          if (_this27.rMass != 0) {
            _this27.rMass = 1 / _this27.rMass;
          }
          if (fst) {
            arb.active = false;
          }
        } else {
          const _this30 = arb.fluidarb;
          if (_this30.pre_dt == -1.0) {
            _this30.pre_dt = dt;
          }
          const dtratio1 = dt / _this30.pre_dt;
          _this30.pre_dt = dt;
          _this30.r1x = _this30.centroidx - _this30.b1.posx;
          _this30.r1y = _this30.centroidy - _this30.b1.posy;
          _this30.r2x = _this30.centroidx - _this30.b2.posx;
          _this30.r2y = _this30.centroidy - _this30.b2.posy;
          let g1x = 0.0;
          let g1y = 0.0;
          if (_this30.ws1.fluidEnabled && _this30.ws1.fluidProperties.wrap_gravity != null) {
            g1x = _this30.ws1.fluidProperties.gravityx;
            g1y = _this30.ws1.fluidProperties.gravityy;
          } else {
            g1x = this.gravityx;
            g1y = this.gravityy;
          }
          let g2x = 0.0;
          let g2y = 0.0;
          if (_this30.ws2.fluidEnabled && _this30.ws2.fluidProperties.wrap_gravity != null) {
            g2x = _this30.ws2.fluidProperties.gravityx;
            g2y = _this30.ws2.fluidProperties.gravityy;
          } else {
            g2x = this.gravityx;
            g2y = this.gravityy;
          }
          let buoyx = 0;
          let buoyy = 0;
          if (_this30.ws1.fluidEnabled && _this30.ws2.fluidEnabled) {
            const mass1 = _this30.overlap * _this30.ws1.fluidProperties.density;
            const mass2 = _this30.overlap * _this30.ws2.fluidProperties.density;
            if (mass1 > mass2) {
              const t3 = mass1 + mass2;
              buoyx -= g1x * t3;
              buoyy -= g1y * t3;
            } else if (mass1 < mass2) {
              const t4 = mass1 + mass2;
              buoyx += g2x * t4;
              buoyy += g2y * t4;
            } else {
              let gx = 0.0;
              let gy = 0.0;
              gx = g1x + g2x;
              gy = g1y + g2y;
              const t5 = 0.5;
              gx *= t5;
              gy *= t5;
              if (
                _this30.ws1.worldCOMx * gx + _this30.ws1.worldCOMy * gy >
                _this30.ws2.worldCOMx * gx + _this30.ws2.worldCOMy * gy
              ) {
                const t6 = mass1 + mass2;
                buoyx -= gx * t6;
                buoyy -= gy * t6;
              } else {
                const t7 = mass1 + mass2;
                buoyx += gx * t7;
                buoyy += gy * t7;
              }
            }
          } else if (_this30.ws1.fluidEnabled) {
            const mass = _this30.overlap * _this30.ws1.fluidProperties.density;
            const t8 = mass;
            buoyx -= g1x * t8;
            buoyy -= g1y * t8;
          } else if (_this30.ws2.fluidEnabled) {
            const mass3 = _this30.overlap * _this30.ws2.fluidProperties.density;
            const t9 = mass3;
            buoyx += g2x * t9;
            buoyy += g2y * t9;
          }
          const t10 = dt;
          buoyx *= t10;
          buoyy *= t10;
          _this30.buoyx = buoyx;
          _this30.buoyy = buoyy;
          if (_this30.b1.type == 2) {
            const t11 = _this30.b1.imass;
            _this30.b1.velx -= buoyx * t11;
            _this30.b1.vely -= buoyy * t11;
            _this30.b1.angvel -= (buoyy * _this30.r1x - buoyx * _this30.r1y) * _this30.b1.iinertia;
          }
          if (_this30.b2.type == 2) {
            const t12 = _this30.b2.imass;
            _this30.b2.velx += buoyx * t12;
            _this30.b2.vely += buoyy * t12;
            _this30.b2.angvel += (buoyy * _this30.r2x - buoyx * _this30.r2y) * _this30.b2.iinertia;
          }
          if (
            (!_this30.ws1.fluidEnabled || _this30.ws1.fluidProperties.viscosity == 0) &&
            (!_this30.ws2.fluidEnabled || _this30.ws2.fluidProperties.viscosity == 0)
          ) {
            _this30.nodrag = true;
            _this30.dampx = 0;
            _this30.dampy = 0;
            _this30.adamp = 0;
          } else {
            _this30.nodrag = false;
            let tViscosity = 0.0;
            if (_this30.ws1.fluidEnabled) {
              _this30.ws2.validate_angDrag();
              tViscosity +=
                (_this30.ws1.fluidProperties.viscosity * _this30.ws2.angDrag * _this30.overlap) /
                _this30.ws2.area;
            }
            if (_this30.ws2.fluidEnabled) {
              _this30.ws1.validate_angDrag();
              tViscosity +=
                (_this30.ws2.fluidProperties.viscosity * _this30.ws1.angDrag * _this30.overlap) /
                _this30.ws1.area;
            }
            if (tViscosity != 0) {
              const iSum = _this30.b1.sinertia + _this30.b2.sinertia;
              if (iSum != 0) {
                _this30.wMass = 1 / iSum;
              } else {
                _this30.wMass = 0.0;
              }
              tViscosity *= 0.0004;
              const omega = 2 * Math.PI * tViscosity;
              _this30.agamma = 1 / (dt * omega * (2 + omega * dt));
              const ig = 1 / (1 + _this30.agamma);
              const biasCoef = dt * omega * omega * _this30.agamma;
              _this30.agamma *= ig;
              _this30.wMass *= ig;
            } else {
              _this30.wMass = 0.0;
              _this30.agamma = 0.0;
            }
            let vrnx =
              _this30.b2.velx +
              _this30.b2.kinvelx -
              _this30.r2y * (_this30.b2.angvel + _this30.b2.kinangvel) -
              (_this30.b1.velx +
                _this30.b1.kinvelx -
                _this30.r1y * (_this30.b2.angvel + _this30.b2.kinangvel));
            let vrny =
              _this30.b2.vely +
              _this30.b2.kinvely +
              _this30.r2x * (_this30.b2.angvel + _this30.b2.kinangvel) -
              (_this30.b1.vely +
                _this30.b1.kinvely +
                _this30.r1x * (_this30.b1.angvel + _this30.b1.kinangvel));
            if (
              !(
                vrnx * vrnx + vrny * vrny <
                ZPP_Space._nape.Config.epsilon * ZPP_Space._nape.Config.epsilon
              )
            ) {
              const d = vrnx * vrnx + vrny * vrny;
              const imag = 1.0 / Math.sqrt(d);
              const t13 = imag;
              vrnx *= t13;
              vrny *= t13;
              _this30.nx = vrnx;
              _this30.ny = vrny;
            }
            let tViscosity1 = 0.0;
            if (_this30.ws1.fluidEnabled) {
              const f =
                (-_this30.ws1.fluidProperties.viscosity * _this30.overlap) / _this30.ws2.area;
              if (_this30.ws2.type == 0) {
                tViscosity1 -=
                  (f * _this30.ws2.circle.radius * ZPP_Space._nape.Config.fluidLinearDrag) /
                  (2 * _this30.ws2.circle.radius * Math.PI);
              } else {
                const poly = _this30.ws2.polygon;
                let bord = 0.0;
                let acc = 0.0;
                let cx_ite9 = poly.edges.head;
                while (cx_ite9 != null) {
                  const ex = cx_ite9.elt;
                  bord += ex.length;
                  let fact = f * ex.length * (ex.gnormx * _this30.nx + ex.gnormy * _this30.ny);
                  if (fact > 0) {
                    fact *= -ZPP_Space._nape.Config.fluidVacuumDrag;
                    fact = fact;
                  }
                  acc -= fact * 0.5 * ZPP_Space._nape.Config.fluidLinearDrag;
                  cx_ite9 = cx_ite9.next;
                }
                tViscosity1 += acc / bord;
              }
            }
            if (_this30.ws2.fluidEnabled) {
              const f1 =
                (-_this30.ws2.fluidProperties.viscosity * _this30.overlap) / _this30.ws1.area;
              if (_this30.ws1.type == 0) {
                tViscosity1 -=
                  (f1 * _this30.ws1.circle.radius * ZPP_Space._nape.Config.fluidLinearDrag) /
                  (2 * _this30.ws1.circle.radius * Math.PI);
              } else {
                const poly1 = _this30.ws1.polygon;
                let bord1 = 0.0;
                let acc1 = 0.0;
                let cx_ite10 = poly1.edges.head;
                while (cx_ite10 != null) {
                  const ex1 = cx_ite10.elt;
                  bord1 += ex1.length;
                  let fact1 = f1 * ex1.length * (ex1.gnormx * _this30.nx + ex1.gnormy * _this30.ny);
                  if (fact1 > 0) {
                    fact1 *= -ZPP_Space._nape.Config.fluidVacuumDrag;
                    fact1 = fact1;
                  }
                  acc1 -= fact1 * 0.5 * ZPP_Space._nape.Config.fluidLinearDrag;
                  cx_ite10 = cx_ite10.next;
                }
                tViscosity1 += acc1 / bord1;
              }
            }
            if (tViscosity1 != 0) {
              const m = _this30.b1.smass + _this30.b2.smass;
              let Ka = 0.0;
              let Kb = 0.0;
              let Kc = 0.0;
              Ka = m;
              Kb = 0;
              Kc = m;
              if (_this30.b1.sinertia != 0) {
                const X = _this30.r1x * _this30.b1.sinertia;
                const Y = _this30.r1y * _this30.b1.sinertia;
                Ka += Y * _this30.r1y;
                Kb += -Y * _this30.r1x;
                Kc += X * _this30.r1x;
              }
              if (_this30.b2.sinertia != 0) {
                const X1 = _this30.r2x * _this30.b2.sinertia;
                const Y1 = _this30.r2y * _this30.b2.sinertia;
                Ka += Y1 * _this30.r2y;
                Kb += -Y1 * _this30.r2x;
                Kc += X1 * _this30.r2x;
              }
              let det1 = Ka * Kc - Kb * Kb;
              if (det1 != det1) {
                Kc = 0;
                Kb = Kc;
                Ka = Kb;
              } else if (det1 == 0) {
                let flag1 = 0;
                if (Ka != 0) {
                  Ka = 1 / Ka;
                } else {
                  Ka = 0;
                  flag1 |= 1;
                }
                if (Kc != 0) {
                  Kc = 1 / Kc;
                } else {
                  Kc = 0;
                  flag1 |= 2;
                }
                Kb = 0;
              } else {
                det1 = 1 / det1;
                const t14 = Kc * det1;
                Kc = Ka * det1;
                Ka = t14;
                Kb *= -det1;
              }
              _this30.vMassa = Ka;
              _this30.vMassb = Kb;
              _this30.vMassc = Kc;
              let biasCoef1;
              const omega1 = 2 * Math.PI * tViscosity1;
              _this30.lgamma = 1 / (dt * omega1 * (2 + omega1 * dt));
              const ig1 = 1 / (1 + _this30.lgamma);
              biasCoef1 = dt * omega1 * omega1 * _this30.lgamma;
              _this30.lgamma *= ig1;
              const X2 = ig1;
              _this30.vMassa *= X2;
              _this30.vMassb *= X2;
              _this30.vMassc *= X2;
            } else {
              _this30.vMassa = 0;
              _this30.vMassb = 0;
              _this30.vMassc = 0;
              _this30.lgamma = 0.0;
            }
          }
          const t15 = dtratio1;
          _this30.dampx *= t15;
          _this30.dampy *= t15;
          _this30.adamp *= dtratio1;
        }
      }
    } else if (arb.colarb != null) {
      const _this31 = arb.colarb;
      let fst1 = true;
      let pre7 = null;
      let prei1 = null;
      let cx_itei1 = _this31.innards.next;
      _this31.hc2 = false;
      let cx_ite11 = _this31.contacts.next;
      while (cx_ite11 != null) {
        const c3 = cx_ite11;
        if (c3.stamp + ZPP_Space._nape.Config.arbiterExpirationDelay < _this31.stamp) {
          const _this32 = _this31.contacts;
          let old8;
          let ret32;
          if (pre7 == null) {
            old8 = _this32.next;
            ret32 = old8.next;
            _this32.next = ret32;
            if (_this32.next == null) {
              _this32.pushmod = true;
            }
          } else {
            old8 = pre7.next;
            ret32 = old8.next;
            pre7.next = ret32;
            if (ret32 == null) {
              _this32.pushmod = true;
            }
          }
          old8._inuse = false;
          _this32.modified = true;
          _this32.length--;
          _this32.pushmod = true;
          cx_ite11 = ret32;
          const _this33 = _this31.innards;
          let old9;
          let ret33;
          if (prei1 == null) {
            old9 = _this33.next;
            ret33 = old9.next;
            _this33.next = ret33;
            if (_this33.next == null) {
              _this33.pushmod = true;
            }
          } else {
            old9 = prei1.next;
            ret33 = old9.next;
            prei1.next = ret33;
            if (ret33 == null) {
              _this33.pushmod = true;
            }
          }
          old9._inuse = false;
          _this33.modified = true;
          _this33.length--;
          _this33.pushmod = true;
          cx_itei1 = ret33;
          const o17 = c3;
          o17.arbiter = null;
          o17.next = ZPP_Contact.zpp_pool;
          ZPP_Contact.zpp_pool = o17;
          continue;
        }
        const ci1 = c3.inner;
        const pact2 = c3.active;
        c3.active = c3.stamp == _this31.stamp;
        if (c3.active) {
          if (fst1) {
            fst1 = false;
            _this31.c1 = ci1;
            _this31.oc1 = c3;
          } else {
            _this31.hc2 = true;
            _this31.c2 = ci1;
            _this31.oc2 = c3;
          }
        }
        if (pact2 != c3.active) {
          _this31.contacts.modified = true;
        }
        pre7 = cx_ite11;
        prei1 = cx_itei1;
        cx_itei1 = cx_itei1.next;
        cx_ite11 = cx_ite11.next;
      }
      if (_this31.hc2) {
        _this31.hpc2 = true;
        if (_this31.oc1.posOnly) {
          const tmp4 = _this31.c1;
          _this31.c1 = _this31.c2;
          _this31.c2 = tmp4;
          const tmp22 = _this31.oc1;
          _this31.oc1 = _this31.oc2;
          _this31.oc2 = tmp22;
          _this31.hc2 = false;
        } else if (_this31.oc2.posOnly) {
          _this31.hc2 = false;
        }
        if (_this31.oc1.posOnly) {
          fst1 = true;
        }
      } else {
        _this31.hpc2 = false;
      }
      if (fst1) {
        arb.active = false;
      }
    }
    if (pact != arb.active) {
      arb.b1.arbiters.modified = true;
      arb.b2.arbiters.modified = true;
      this.c_arbiters_true.modified = this.c_arbiters_false.modified = true;
      this.s_arbiters.modified = this.f_arbiters.modified = true;
    }
    return false;
  }

  prestep(dt: any) {
    let pre = null;
    let cx_ite = this.live_constraints.head;
    while (cx_ite != null) {
      const con = cx_ite.elt;
      if (con.preStep(dt)) {
        cx_ite = this.live_constraints.erase(pre);
        con.broken();
        this.constraintCbBreak(con);
        if (con.removeOnBreak) {
          con.component.sleeping = true;
          this.midstep = false;
          if (con.compound != null) {
            con.compound.wrap_constraints.remove(con.outer);
          } else {
            this.wrap_constraints.remove(con.outer);
          }
          this.midstep = true;
        } else {
          con.active = false;
        }
        con.clearcache();
        continue;
      }
      pre = cx_ite;
      cx_ite = cx_ite.next;
    }
    let pre1 = null;
    let arbs = this.c_arbiters_true;
    let arbite = arbs.head;
    let fst = this.c_arbiters_false != null;
    if (fst && arbite == null) {
      fst = false;
      arbite = this.c_arbiters_false.head;
      arbs = this.c_arbiters_false;
      pre1 = null;
    }
    while (arbite != null) {
      const arb = arbite.elt;
      if (this.presteparb(arb, dt)) {
        let old;
        let ret;
        if (pre1 == null) {
          old = arbs.head;
          ret = old.next;
          arbs.head = ret;
          if (arbs.head == null) {
            arbs.pushmod = true;
          }
        } else {
          old = pre1.next;
          ret = old.next;
          pre1.next = ret;
          if (ret == null) {
            arbs.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = o;
        arbs.modified = true;
        arbs.length--;
        arbs.pushmod = true;
        arbite = ret;
        if (fst && arbite == null) {
          fst = false;
          arbite = this.c_arbiters_false.head;
          arbs = this.c_arbiters_false;
          pre1 = null;
        }
        continue;
      }
      pre1 = arbite;
      arbite = arbite.next;
      if (fst && arbite == null) {
        fst = false;
        arbite = this.c_arbiters_false.head;
        arbs = this.c_arbiters_false;
        pre1 = null;
      }
    }
    let pre2 = null;
    let arbs1 = this.f_arbiters;
    let arbite1 = arbs1.head;
    let fst1 = false;
    if (fst1 && arbite1 == null) {
      fst1 = false;
      arbs1 = null;
      pre2 = null;
    }
    while (arbite1 != null) {
      const arb1 = arbite1.elt;
      if (this.presteparb(arb1, dt)) {
        let old1;
        let ret1;
        if (pre2 == null) {
          old1 = arbs1.head;
          ret1 = old1.next;
          arbs1.head = ret1;
          if (arbs1.head == null) {
            arbs1.pushmod = true;
          }
        } else {
          old1 = pre2.next;
          ret1 = old1.next;
          pre2.next = ret1;
          if (ret1 == null) {
            arbs1.pushmod = true;
          }
        }
        const o1 = old1;
        o1.elt = null;
        o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = o1;
        arbs1.modified = true;
        arbs1.length--;
        arbs1.pushmod = true;
        arbite1 = ret1;
        if (fst1 && arbite1 == null) {
          fst1 = false;
          arbs1 = null;
          pre2 = null;
        }
        continue;
      }
      pre2 = arbite1;
      arbite1 = arbite1.next;
      if (fst1 && arbite1 == null) {
        fst1 = false;
        arbs1 = null;
        pre2 = null;
      }
    }
    let pre3 = null;
    let arbs2 = this.s_arbiters;
    let arbite2 = arbs2.head;
    let fst2 = false;
    if (fst2 && arbite2 == null) {
      fst2 = false;
      arbs2 = null;
      pre3 = null;
    }
    while (arbite2 != null) {
      const arb2 = arbite2.elt;
      if (this.presteparb(arb2, dt)) {
        let old2;
        let ret2;
        if (pre3 == null) {
          old2 = arbs2.head;
          ret2 = old2.next;
          arbs2.head = ret2;
          if (arbs2.head == null) {
            arbs2.pushmod = true;
          }
        } else {
          old2 = pre3.next;
          ret2 = old2.next;
          pre3.next = ret2;
          if (ret2 == null) {
            arbs2.pushmod = true;
          }
        }
        const o2 = old2;
        o2.elt = null;
        o2.next = ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = o2;
        arbs2.modified = true;
        arbs2.length--;
        arbs2.pushmod = true;
        arbite2 = ret2;
        if (fst2 && arbite2 == null) {
          fst2 = false;
          arbs2 = null;
          pre3 = null;
        }
        continue;
      }
      pre3 = arbite2;
      arbite2 = arbite2.next;
      if (fst2 && arbite2 == null) {
        fst2 = false;
        arbs2 = null;
        pre3 = null;
      }
    }
  }

  warmStart() {
    let cx_ite = this.f_arbiters.head;
    while (cx_ite != null) {
      const arb = cx_ite.elt;
      if (arb.active && (arb.immState & 1) != 0) {
        const t = arb.b1.imass;
        arb.b1.velx -= arb.dampx * t;
        arb.b1.vely -= arb.dampy * t;
        const t1 = arb.b2.imass;
        arb.b2.velx += arb.dampx * t1;
        arb.b2.vely += arb.dampy * t1;
        arb.b1.angvel -= arb.b1.iinertia * (arb.dampy * arb.r1x - arb.dampx * arb.r1y);
        arb.b2.angvel += arb.b2.iinertia * (arb.dampy * arb.r2x - arb.dampx * arb.r2y);
        arb.b1.angvel -= arb.adamp * arb.b1.iinertia;
        arb.b2.angvel += arb.adamp * arb.b2.iinertia;
      }
      cx_ite = cx_ite.next;
    }
    let arbi = this.c_arbiters_false.head;
    let fst = true;
    if (arbi == null) {
      arbi = this.c_arbiters_true.head;
      fst = false;
    }
    while (arbi != null) {
      const arb1 = arbi.elt;
      if (arb1.active && (arb1.immState & 1) != 0) {
        const jx = arb1.nx * arb1.c1.jnAcc - arb1.ny * arb1.c1.jtAcc;
        const jy = arb1.ny * arb1.c1.jnAcc + arb1.nx * arb1.c1.jtAcc;
        const t2 = arb1.b1.imass;
        arb1.b1.velx -= jx * t2;
        arb1.b1.vely -= jy * t2;
        arb1.b1.angvel -= arb1.b1.iinertia * (jy * arb1.c1.r1x - jx * arb1.c1.r1y);
        const t3 = arb1.b2.imass;
        arb1.b2.velx += jx * t3;
        arb1.b2.vely += jy * t3;
        arb1.b2.angvel += arb1.b2.iinertia * (jy * arb1.c1.r2x - jx * arb1.c1.r2y);
        if (arb1.hc2) {
          const jx1 = arb1.nx * arb1.c2.jnAcc - arb1.ny * arb1.c2.jtAcc;
          const jy1 = arb1.ny * arb1.c2.jnAcc + arb1.nx * arb1.c2.jtAcc;
          const t4 = arb1.b1.imass;
          arb1.b1.velx -= jx1 * t4;
          arb1.b1.vely -= jy1 * t4;
          arb1.b1.angvel -= arb1.b1.iinertia * (jy1 * arb1.c2.r1x - jx1 * arb1.c2.r1y);
          const t5 = arb1.b2.imass;
          arb1.b2.velx += jx1 * t5;
          arb1.b2.vely += jy1 * t5;
          arb1.b2.angvel += arb1.b2.iinertia * (jy1 * arb1.c2.r2x - jx1 * arb1.c2.r2y);
        }
        arb1.b2.angvel += arb1.jrAcc * arb1.b2.iinertia;
        arb1.b1.angvel -= arb1.jrAcc * arb1.b1.iinertia;
      }
      arbi = arbi.next;
      if (fst && arbi == null) {
        arbi = this.c_arbiters_true.head;
        fst = false;
      }
    }
    let cx_ite1 = this.live_constraints.head;
    while (cx_ite1 != null) {
      const con = cx_ite1.elt;
      con.warmStart();
      cx_ite1 = cx_ite1.next;
    }
  }

  iterateVel(times: any) {
    let _g = 0;
    const _g1 = times;
    while (_g < _g1) {
      const i = _g++;
      let cx_ite = this.f_arbiters.head;
      while (cx_ite != null) {
        const arb = cx_ite.elt;
        if (arb.active && (arb.immState & 1) != 0) {
          if (!arb.nodrag) {
            const w1 = arb.b1.angvel + arb.b1.kinangvel;
            const w2 = arb.b2.angvel + arb.b2.kinangvel;
            let jx =
              arb.b1.velx +
              arb.b1.kinvelx -
              arb.r1y * w1 -
              (arb.b2.velx + arb.b2.kinvelx - arb.r2y * w2);
            let jy =
              arb.b1.vely +
              arb.b1.kinvely +
              arb.r1x * w1 -
              (arb.b2.vely + arb.b2.kinvely + arb.r2x * w2);
            const t = arb.vMassa * jx + arb.vMassb * jy;
            jy = arb.vMassb * jx + arb.vMassc * jy;
            jx = t;
            const t1 = arb.lgamma;
            jx -= arb.dampx * t1;
            jy -= arb.dampy * t1;
            const t2 = 1.0;
            arb.dampx += jx * t2;
            arb.dampy += jy * t2;
            const t3 = arb.b1.imass;
            arb.b1.velx -= jx * t3;
            arb.b1.vely -= jy * t3;
            const t4 = arb.b2.imass;
            arb.b2.velx += jx * t4;
            arb.b2.vely += jy * t4;
            arb.b1.angvel -= arb.b1.iinertia * (jy * arb.r1x - jx * arb.r1y);
            arb.b2.angvel += arb.b2.iinertia * (jy * arb.r2x - jx * arb.r2y);
            const j_damp = (w1 - w2) * arb.wMass - arb.adamp * arb.agamma;
            arb.adamp += j_damp;
            arb.b1.angvel -= j_damp * arb.b1.iinertia;
            arb.b2.angvel += j_damp * arb.b2.iinertia;
          }
        }
        cx_ite = cx_ite.next;
      }
      let pre = null;
      let cx_ite1 = this.live_constraints.head;
      while (cx_ite1 != null) {
        const con = cx_ite1.elt;
        if (con.applyImpulseVel()) {
          cx_ite1 = this.live_constraints.erase(pre);
          con.broken();
          this.constraintCbBreak(con);
          if (con.removeOnBreak) {
            con.component.sleeping = true;
            this.midstep = false;
            if (con.compound != null) {
              con.compound.wrap_constraints.remove(con.outer);
            } else {
              this.wrap_constraints.remove(con.outer);
            }
            this.midstep = true;
          } else {
            con.active = false;
          }
          con.clearcache();
          continue;
        }
        pre = cx_ite1;
        cx_ite1 = cx_ite1.next;
      }
      let arbi = this.c_arbiters_false.head;
      let fst = true;
      if (arbi == null) {
        arbi = this.c_arbiters_true.head;
        fst = false;
      }
      while (arbi != null) {
        const arb1 = arbi.elt;
        if (arb1.active && (arb1.immState & 1) != 0) {
          let v1x =
            arb1.k1x +
            arb1.b2.velx -
            arb1.c1.r2y * arb1.b2.angvel -
            (arb1.b1.velx - arb1.c1.r1y * arb1.b1.angvel);
          let v1y =
            arb1.k1y +
            arb1.b2.vely +
            arb1.c1.r2x * arb1.b2.angvel -
            (arb1.b1.vely + arb1.c1.r1x * arb1.b1.angvel);
          let j = (v1y * arb1.nx - v1x * arb1.ny + arb1.surfacex) * arb1.c1.tMass;
          let jMax = arb1.c1.friction * arb1.c1.jnAcc;
          let jOld = arb1.c1.jtAcc;
          let cjAcc = jOld - j;
          if (cjAcc > jMax) {
            cjAcc = jMax;
          } else if (cjAcc < -jMax) {
            cjAcc = -jMax;
          }
          j = cjAcc - jOld;
          arb1.c1.jtAcc = cjAcc;
          let jx1 = -arb1.ny * j;
          let jy1 = arb1.nx * j;
          arb1.b2.velx += jx1 * arb1.b2.imass;
          arb1.b2.vely += jy1 * arb1.b2.imass;
          arb1.b1.velx -= jx1 * arb1.b1.imass;
          arb1.b1.vely -= jy1 * arb1.b1.imass;
          arb1.b2.angvel += arb1.rt1b * j * arb1.b2.iinertia;
          arb1.b1.angvel -= arb1.rt1a * j * arb1.b1.iinertia;
          if (arb1.hc2) {
            let v2x =
              arb1.k2x +
              arb1.b2.velx -
              arb1.c2.r2y * arb1.b2.angvel -
              (arb1.b1.velx - arb1.c2.r1y * arb1.b1.angvel);
            let v2y =
              arb1.k2y +
              arb1.b2.vely +
              arb1.c2.r2x * arb1.b2.angvel -
              (arb1.b1.vely + arb1.c2.r1x * arb1.b1.angvel);
            j = (v2y * arb1.nx - v2x * arb1.ny + arb1.surfacex) * arb1.c2.tMass;
            jMax = arb1.c2.friction * arb1.c2.jnAcc;
            jOld = arb1.c2.jtAcc;
            cjAcc = jOld - j;
            if (cjAcc > jMax) {
              cjAcc = jMax;
            } else if (cjAcc < -jMax) {
              cjAcc = -jMax;
            }
            j = cjAcc - jOld;
            arb1.c2.jtAcc = cjAcc;
            jx1 = -arb1.ny * j;
            jy1 = arb1.nx * j;
            arb1.b2.velx += jx1 * arb1.b2.imass;
            arb1.b2.vely += jy1 * arb1.b2.imass;
            arb1.b1.velx -= jx1 * arb1.b1.imass;
            arb1.b1.vely -= jy1 * arb1.b1.imass;
            arb1.b2.angvel += arb1.rt2b * j * arb1.b2.iinertia;
            arb1.b1.angvel -= arb1.rt2a * j * arb1.b1.iinertia;
            v1x =
              arb1.k1x +
              arb1.b2.velx -
              arb1.c1.r2y * arb1.b2.angvel -
              (arb1.b1.velx - arb1.c1.r1y * arb1.b1.angvel);
            v1y =
              arb1.k1y +
              arb1.b2.vely +
              arb1.c1.r2x * arb1.b2.angvel -
              (arb1.b1.vely + arb1.c1.r1x * arb1.b1.angvel);
            v2x =
              arb1.k2x +
              arb1.b2.velx -
              arb1.c2.r2y * arb1.b2.angvel -
              (arb1.b1.velx - arb1.c2.r1y * arb1.b1.angvel);
            v2y =
              arb1.k2y +
              arb1.b2.vely +
              arb1.c2.r2x * arb1.b2.angvel -
              (arb1.b1.vely + arb1.c2.r1x * arb1.b1.angvel);
            const ax = arb1.c1.jnAcc;
            const ay = arb1.c2.jnAcc;
            let jnx =
              v1x * arb1.nx +
              v1y * arb1.ny +
              arb1.surfacey +
              arb1.c1.bounce -
              (arb1.Ka * ax + arb1.Kb * ay);
            let jny =
              v2x * arb1.nx +
              v2y * arb1.ny +
              arb1.surfacey +
              arb1.c2.bounce -
              (arb1.Kb * ax + arb1.Kc * ay);
            let xx = -(arb1.kMassa * jnx + arb1.kMassb * jny);
            let xy = -(arb1.kMassb * jnx + arb1.kMassc * jny);
            if (xx >= 0 && xy >= 0) {
              jnx = xx - ax;
              jny = xy - ay;
              arb1.c1.jnAcc = xx;
              arb1.c2.jnAcc = xy;
            } else {
              xx = -arb1.c1.nMass * jnx;
              if (xx >= 0 && arb1.Kb * xx + jny >= 0) {
                jnx = xx - ax;
                jny = -ay;
                arb1.c1.jnAcc = xx;
                arb1.c2.jnAcc = 0;
              } else {
                xy = -arb1.c2.nMass * jny;
                if (xy >= 0 && arb1.Kb * xy + jnx >= 0) {
                  jnx = -ax;
                  jny = xy - ay;
                  arb1.c1.jnAcc = 0;
                  arb1.c2.jnAcc = xy;
                } else if (jnx >= 0 && jny >= 0) {
                  jnx = -ax;
                  jny = -ay;
                  arb1.c1.jnAcc = arb1.c2.jnAcc = 0;
                } else {
                  jnx = 0;
                  jny = 0;
                }
              }
            }
            j = jnx + jny;
            jx1 = arb1.nx * j;
            jy1 = arb1.ny * j;
            arb1.b2.velx += jx1 * arb1.b2.imass;
            arb1.b2.vely += jy1 * arb1.b2.imass;
            arb1.b1.velx -= jx1 * arb1.b1.imass;
            arb1.b1.vely -= jy1 * arb1.b1.imass;
            arb1.b2.angvel += (arb1.rn1b * jnx + arb1.rn2b * jny) * arb1.b2.iinertia;
            arb1.b1.angvel -= (arb1.rn1a * jnx + arb1.rn2a * jny) * arb1.b1.iinertia;
          } else {
            if (arb1.radius != 0.0) {
              const dw = arb1.b2.angvel - arb1.b1.angvel;
              j = dw * arb1.rMass;
              jMax = arb1.rfric * arb1.c1.jnAcc;
              jOld = arb1.jrAcc;
              arb1.jrAcc -= j;
              if (arb1.jrAcc > jMax) {
                arb1.jrAcc = jMax;
              } else if (arb1.jrAcc < -jMax) {
                arb1.jrAcc = -jMax;
              }
              j = arb1.jrAcc - jOld;
              arb1.b2.angvel += j * arb1.b2.iinertia;
              arb1.b1.angvel -= j * arb1.b1.iinertia;
            }
            v1x =
              arb1.k1x +
              arb1.b2.velx -
              arb1.c1.r2y * arb1.b2.angvel -
              (arb1.b1.velx - arb1.c1.r1y * arb1.b1.angvel);
            v1y =
              arb1.k1y +
              arb1.b2.vely +
              arb1.c1.r2x * arb1.b2.angvel -
              (arb1.b1.vely + arb1.c1.r1x * arb1.b1.angvel);
            j = (arb1.c1.bounce + (arb1.nx * v1x + arb1.ny * v1y) + arb1.surfacey) * arb1.c1.nMass;
            jOld = arb1.c1.jnAcc;
            cjAcc = jOld - j;
            if (cjAcc < 0.0) {
              cjAcc = 0.0;
            }
            j = cjAcc - jOld;
            arb1.c1.jnAcc = cjAcc;
            jx1 = arb1.nx * j;
            jy1 = arb1.ny * j;
            arb1.b2.velx += jx1 * arb1.b2.imass;
            arb1.b2.vely += jy1 * arb1.b2.imass;
            arb1.b1.velx -= jx1 * arb1.b1.imass;
            arb1.b1.vely -= jy1 * arb1.b1.imass;
            arb1.b2.angvel += arb1.rn1b * j * arb1.b2.iinertia;
            arb1.b1.angvel -= arb1.rn1a * j * arb1.b1.iinertia;
          }
        }
        arbi = arbi.next;
        if (fst && arbi == null) {
          arbi = this.c_arbiters_true.head;
          fst = false;
        }
      }
    }
  }

  iteratePos(times: any) {
    let _g = 0;
    const _g1 = times;
    while (_g < _g1) {
      const i = _g++;
      let pre = null;
      let cx_ite = this.live_constraints.head;
      while (cx_ite != null) {
        const con = cx_ite.elt;
        if (!con.__velocity && con.stiff) {
          if (con.applyImpulsePos()) {
            cx_ite = this.live_constraints.erase(pre);
            con.broken();
            this.constraintCbBreak(con);
            if (con.removeOnBreak) {
              con.component.sleeping = true;
              this.midstep = false;
              if (con.compound != null) {
                con.compound.wrap_constraints.remove(con.outer);
              } else {
                this.wrap_constraints.remove(con.outer);
              }
              this.midstep = true;
            } else {
              con.active = false;
            }
            con.clearcache();
            continue;
          }
        }
        pre = cx_ite;
        cx_ite = cx_ite.next;
      }
      let arbi = this.c_arbiters_false.head;
      let fst = true;
      if (arbi == null) {
        arbi = this.c_arbiters_true.head;
        fst = false;
      }
      while (arbi != null) {
        const arb = arbi.elt;
        if (arb.active && (arb.immState & 1) != 0) {
          if (arb.ptype == 2) {
            const c = arb.c1;
            let r2x = 0.0;
            let r2y = 0.0;
            r2x = arb.b2.axisy * c.lr2x - arb.b2.axisx * c.lr2y;
            r2y = c.lr2x * arb.b2.axisx + c.lr2y * arb.b2.axisy;
            const t = 1.0;
            r2x += arb.b2.posx * t;
            r2y += arb.b2.posy * t;
            let r1x = 0.0;
            let r1y = 0.0;
            r1x = arb.b1.axisy * c.lr1x - arb.b1.axisx * c.lr1y;
            r1y = c.lr1x * arb.b1.axisx + c.lr1y * arb.b1.axisy;
            const t1 = 1.0;
            r1x += arb.b1.posx * t1;
            r1y += arb.b1.posy * t1;
            let dx = 0.0;
            let dy = 0.0;
            dx = r2x - r1x;
            dy = r2y - r1y;
            const dl = Math.sqrt(dx * dx + dy * dy);
            const r = arb.radius - ZPP_Space._nape.Config.collisionSlop;
            let err = dl - r;
            if (dx * arb.nx + dy * arb.ny < 0) {
              dx = -dx;
              dy = -dy;
              err -= arb.radius;
            }
            if (err < 0) {
              if (dl < ZPP_Space._nape.Config.epsilon) {
                if (arb.b1.smass != 0.0) {
                  arb.b1.posx += ZPP_Space._nape.Config.epsilon * 10;
                } else {
                  arb.b2.posx += ZPP_Space._nape.Config.epsilon * 10;
                }
              } else {
                const t2 = 1.0 / dl;
                dx *= t2;
                dy *= t2;
                const px = 0.5 * (r1x + r2x);
                const py = 0.5 * (r1y + r2y);
                const pen = dl - r;
                r1x = px - arb.b1.posx;
                r1y = py - arb.b1.posy;
                r2x = px - arb.b2.posx;
                r2y = py - arb.b2.posy;
                const rn1 = dy * r1x - dx * r1y;
                const rn2 = dy * r2x - dx * r2y;
                const K =
                  arb.b2.smass +
                  rn2 * rn2 * arb.b2.sinertia +
                  arb.b1.smass +
                  rn1 * rn1 * arb.b1.sinertia;
                if (K != 0) {
                  const jn = (-arb.biasCoef * pen) / K;
                  let Jx = 0.0;
                  let Jy = 0.0;
                  const t3 = jn;
                  Jx = dx * t3;
                  Jy = dy * t3;
                  const t4 = arb.b1.imass;
                  arb.b1.posx -= Jx * t4;
                  arb.b1.posy -= Jy * t4;
                  const _this = arb.b1;
                  const dr = -rn1 * arb.b1.iinertia * jn;
                  _this.rot += dr;
                  if (dr * dr > 0.0001) {
                    _this.axisx = Math.sin(_this.rot);
                    _this.axisy = Math.cos(_this.rot);
                  } else {
                    const d2 = dr * dr;
                    const p = 1 - 0.5 * d2;
                    const m = 1 - (d2 * d2) / 8;
                    const nx = (p * _this.axisx + dr * _this.axisy) * m;
                    _this.axisy = (p * _this.axisy - dr * _this.axisx) * m;
                    _this.axisx = nx;
                  }
                  const t5 = arb.b2.imass;
                  arb.b2.posx += Jx * t5;
                  arb.b2.posy += Jy * t5;
                  const _this1 = arb.b2;
                  const dr1 = rn2 * arb.b2.iinertia * jn;
                  _this1.rot += dr1;
                  if (dr1 * dr1 > 0.0001) {
                    _this1.axisx = Math.sin(_this1.rot);
                    _this1.axisy = Math.cos(_this1.rot);
                  } else {
                    const d21 = dr1 * dr1;
                    const p1 = 1 - 0.5 * d21;
                    const m1 = 1 - (d21 * d21) / 8;
                    const nx1 = (p1 * _this1.axisx + dr1 * _this1.axisy) * m1;
                    _this1.axisy = (p1 * _this1.axisy - dr1 * _this1.axisx) * m1;
                    _this1.axisx = nx1;
                  }
                }
              }
            }
          } else {
            let gnormx = 0.0;
            let gnormy = 0.0;
            let gproj;
            let clip1x = 0.0;
            let clip1y = 0.0;
            let clip2x = 0;
            let clip2y = 0;
            if (arb.ptype == 0) {
              gnormx = arb.b1.axisy * arb.lnormx - arb.b1.axisx * arb.lnormy;
              gnormy = arb.lnormx * arb.b1.axisx + arb.lnormy * arb.b1.axisy;
              gproj = arb.lproj + (gnormx * arb.b1.posx + gnormy * arb.b1.posy);
              clip1x = arb.b2.axisy * arb.c1.lr1x - arb.b2.axisx * arb.c1.lr1y;
              clip1y = arb.c1.lr1x * arb.b2.axisx + arb.c1.lr1y * arb.b2.axisy;
              const t6 = 1.0;
              clip1x += arb.b2.posx * t6;
              clip1y += arb.b2.posy * t6;
              if (arb.hpc2) {
                clip2x = arb.b2.axisy * arb.c2.lr1x - arb.b2.axisx * arb.c2.lr1y;
                clip2y = arb.c2.lr1x * arb.b2.axisx + arb.c2.lr1y * arb.b2.axisy;
                const t7 = 1.0;
                clip2x += arb.b2.posx * t7;
                clip2y += arb.b2.posy * t7;
              }
            } else {
              gnormx = arb.b2.axisy * arb.lnormx - arb.b2.axisx * arb.lnormy;
              gnormy = arb.lnormx * arb.b2.axisx + arb.lnormy * arb.b2.axisy;
              gproj = arb.lproj + (gnormx * arb.b2.posx + gnormy * arb.b2.posy);
              clip1x = arb.b1.axisy * arb.c1.lr1x - arb.b1.axisx * arb.c1.lr1y;
              clip1y = arb.c1.lr1x * arb.b1.axisx + arb.c1.lr1y * arb.b1.axisy;
              const t8 = 1.0;
              clip1x += arb.b1.posx * t8;
              clip1y += arb.b1.posy * t8;
              if (arb.hpc2) {
                clip2x = arb.b1.axisy * arb.c2.lr1x - arb.b1.axisx * arb.c2.lr1y;
                clip2y = arb.c2.lr1x * arb.b1.axisx + arb.c2.lr1y * arb.b1.axisy;
                const t9 = 1.0;
                clip2x += arb.b1.posx * t9;
                clip2y += arb.b1.posy * t9;
              }
            }
            let err1 = clip1x * gnormx + clip1y * gnormy - gproj - arb.radius;
            err1 += ZPP_Space._nape.Config.collisionSlop;
            let err2 = 0.0;
            if (arb.hpc2) {
              err2 = clip2x * gnormx + clip2y * gnormy - gproj - arb.radius;
              err2 += ZPP_Space._nape.Config.collisionSlop;
            }
            if (err1 < 0 || err2 < 0) {
              if (arb.rev) {
                gnormx = -gnormx;
                gnormy = -gnormy;
              }
              let c1r1x = 0.0;
              let c1r1y = 0.0;
              c1r1x = clip1x - arb.b1.posx;
              c1r1y = clip1y - arb.b1.posy;
              let c1r2x = 0.0;
              let c1r2y = 0.0;
              c1r2x = clip1x - arb.b2.posx;
              c1r2y = clip1y - arb.b2.posy;
              let c2r1x = 0;
              let c2r1y = 0;
              let c2r2x = 0;
              let c2r2y = 0;
              if (arb.hpc2) {
                c2r1x = clip2x - arb.b1.posx;
                c2r1y = clip2y - arb.b1.posy;
                c2r2x = clip2x - arb.b2.posx;
                c2r2y = clip2y - arb.b2.posy;
                const rn1a = gnormy * c1r1x - gnormx * c1r1y;
                const rn1b = gnormy * c1r2x - gnormx * c1r2y;
                const rn2a = gnormy * c2r1x - gnormx * c2r1y;
                const rn2b = gnormy * c2r2x - gnormx * c2r2y;
                const mass_sum = arb.b1.smass + arb.b2.smass;
                arb.kMassa =
                  mass_sum + arb.b1.sinertia * rn1a * rn1a + arb.b2.sinertia * rn1b * rn1b;
                arb.kMassb =
                  mass_sum + arb.b1.sinertia * rn1a * rn2a + arb.b2.sinertia * rn1b * rn2b;
                arb.kMassc =
                  mass_sum + arb.b1.sinertia * rn2a * rn2a + arb.b2.sinertia * rn2b * rn2b;
                let Ka = 0.0;
                let Kb = 0.0;
                let Kc = 0.0;
                Ka = arb.kMassa;
                Kb = arb.kMassb;
                Kc = arb.kMassc;
                const bx = err1 * arb.biasCoef;
                const by = err2 * arb.biasCoef;
                while (true) {
                  let xx = 0.0;
                  let xy = 0.0;
                  xx = bx;
                  xy = by;
                  xx = -xx;
                  xy = -xy;
                  let det = arb.kMassa * arb.kMassc - arb.kMassb * arb.kMassb;
                  if (det != det) {
                    xy = 0;
                    xx = xy;
                  } else if (det == 0) {
                    if (arb.kMassa != 0) {
                      xx /= arb.kMassa;
                    } else {
                      xx = 0;
                    }
                    if (arb.kMassc != 0) {
                      xy /= arb.kMassc;
                    } else {
                      xy = 0;
                    }
                  } else {
                    det = 1 / det;
                    const t10 = det * (arb.kMassc * xx - arb.kMassb * xy);
                    xy = det * (arb.kMassa * xy - arb.kMassb * xx);
                    xx = t10;
                  }
                  if (xx >= 0 && xy >= 0) {
                    const t11 = (xx + xy) * arb.b1.imass;
                    arb.b1.posx -= gnormx * t11;
                    arb.b1.posy -= gnormy * t11;
                    const _this2 = arb.b1;
                    const dr2 = -arb.b1.iinertia * (rn1a * xx + rn2a * xy);
                    _this2.rot += dr2;
                    if (dr2 * dr2 > 0.0001) {
                      _this2.axisx = Math.sin(_this2.rot);
                      _this2.axisy = Math.cos(_this2.rot);
                    } else {
                      const d22 = dr2 * dr2;
                      const p2 = 1 - 0.5 * d22;
                      const m2 = 1 - (d22 * d22) / 8;
                      const nx2 = (p2 * _this2.axisx + dr2 * _this2.axisy) * m2;
                      _this2.axisy = (p2 * _this2.axisy - dr2 * _this2.axisx) * m2;
                      _this2.axisx = nx2;
                    }
                    const t12 = (xx + xy) * arb.b2.imass;
                    arb.b2.posx += gnormx * t12;
                    arb.b2.posy += gnormy * t12;
                    const _this3 = arb.b2;
                    const dr3 = arb.b2.iinertia * (rn1b * xx + rn2b * xy);
                    _this3.rot += dr3;
                    if (dr3 * dr3 > 0.0001) {
                      _this3.axisx = Math.sin(_this3.rot);
                      _this3.axisy = Math.cos(_this3.rot);
                    } else {
                      const d23 = dr3 * dr3;
                      const p3 = 1 - 0.5 * d23;
                      const m3 = 1 - (d23 * d23) / 8;
                      const nx3 = (p3 * _this3.axisx + dr3 * _this3.axisy) * m3;
                      _this3.axisy = (p3 * _this3.axisy - dr3 * _this3.axisx) * m3;
                      _this3.axisx = nx3;
                    }
                    break;
                  }
                  xx = -bx / Ka;
                  xy = 0;
                  const vn2 = Kb * xx + by;
                  if (xx >= 0 && vn2 >= 0) {
                    const t13 = (xx + xy) * arb.b1.imass;
                    arb.b1.posx -= gnormx * t13;
                    arb.b1.posy -= gnormy * t13;
                    const _this4 = arb.b1;
                    const dr4 = -arb.b1.iinertia * (rn1a * xx + rn2a * xy);
                    _this4.rot += dr4;
                    if (dr4 * dr4 > 0.0001) {
                      _this4.axisx = Math.sin(_this4.rot);
                      _this4.axisy = Math.cos(_this4.rot);
                    } else {
                      const d24 = dr4 * dr4;
                      const p4 = 1 - 0.5 * d24;
                      const m4 = 1 - (d24 * d24) / 8;
                      const nx4 = (p4 * _this4.axisx + dr4 * _this4.axisy) * m4;
                      _this4.axisy = (p4 * _this4.axisy - dr4 * _this4.axisx) * m4;
                      _this4.axisx = nx4;
                    }
                    const t14 = (xx + xy) * arb.b2.imass;
                    arb.b2.posx += gnormx * t14;
                    arb.b2.posy += gnormy * t14;
                    const _this5 = arb.b2;
                    const dr5 = arb.b2.iinertia * (rn1b * xx + rn2b * xy);
                    _this5.rot += dr5;
                    if (dr5 * dr5 > 0.0001) {
                      _this5.axisx = Math.sin(_this5.rot);
                      _this5.axisy = Math.cos(_this5.rot);
                    } else {
                      const d25 = dr5 * dr5;
                      const p5 = 1 - 0.5 * d25;
                      const m5 = 1 - (d25 * d25) / 8;
                      const nx5 = (p5 * _this5.axisx + dr5 * _this5.axisy) * m5;
                      _this5.axisy = (p5 * _this5.axisy - dr5 * _this5.axisx) * m5;
                      _this5.axisx = nx5;
                    }
                    break;
                  }
                  xx = 0;
                  xy = -by / Kc;
                  const vn1 = Kb * xy + bx;
                  if (xy >= 0 && vn1 >= 0) {
                    const t15 = (xx + xy) * arb.b1.imass;
                    arb.b1.posx -= gnormx * t15;
                    arb.b1.posy -= gnormy * t15;
                    const _this6 = arb.b1;
                    const dr6 = -arb.b1.iinertia * (rn1a * xx + rn2a * xy);
                    _this6.rot += dr6;
                    if (dr6 * dr6 > 0.0001) {
                      _this6.axisx = Math.sin(_this6.rot);
                      _this6.axisy = Math.cos(_this6.rot);
                    } else {
                      const d26 = dr6 * dr6;
                      const p6 = 1 - 0.5 * d26;
                      const m6 = 1 - (d26 * d26) / 8;
                      const nx6 = (p6 * _this6.axisx + dr6 * _this6.axisy) * m6;
                      _this6.axisy = (p6 * _this6.axisy - dr6 * _this6.axisx) * m6;
                      _this6.axisx = nx6;
                    }
                    const t16 = (xx + xy) * arb.b2.imass;
                    arb.b2.posx += gnormx * t16;
                    arb.b2.posy += gnormy * t16;
                    const _this7 = arb.b2;
                    const dr7 = arb.b2.iinertia * (rn1b * xx + rn2b * xy);
                    _this7.rot += dr7;
                    if (dr7 * dr7 > 0.0001) {
                      _this7.axisx = Math.sin(_this7.rot);
                      _this7.axisy = Math.cos(_this7.rot);
                    } else {
                      const d27 = dr7 * dr7;
                      const p7 = 1 - 0.5 * d27;
                      const m7 = 1 - (d27 * d27) / 8;
                      const nx7 = (p7 * _this7.axisx + dr7 * _this7.axisy) * m7;
                      _this7.axisy = (p7 * _this7.axisy - dr7 * _this7.axisx) * m7;
                      _this7.axisx = nx7;
                    }
                    break;
                  }
                  if (!false) {
                    break;
                  }
                }
              } else {
                const rn11 = gnormy * c1r1x - gnormx * c1r1y;
                const rn21 = gnormy * c1r2x - gnormx * c1r2y;
                const K1 =
                  arb.b2.smass +
                  rn21 * rn21 * arb.b2.sinertia +
                  arb.b1.smass +
                  rn11 * rn11 * arb.b1.sinertia;
                if (K1 != 0) {
                  const jn1 = (-arb.biasCoef * err1) / K1;
                  let Jx1 = 0.0;
                  let Jy1 = 0.0;
                  const t17 = jn1;
                  Jx1 = gnormx * t17;
                  Jy1 = gnormy * t17;
                  const t18 = arb.b1.imass;
                  arb.b1.posx -= Jx1 * t18;
                  arb.b1.posy -= Jy1 * t18;
                  const _this8 = arb.b1;
                  const dr8 = -rn11 * arb.b1.iinertia * jn1;
                  _this8.rot += dr8;
                  if (dr8 * dr8 > 0.0001) {
                    _this8.axisx = Math.sin(_this8.rot);
                    _this8.axisy = Math.cos(_this8.rot);
                  } else {
                    const d28 = dr8 * dr8;
                    const p8 = 1 - 0.5 * d28;
                    const m8 = 1 - (d28 * d28) / 8;
                    const nx8 = (p8 * _this8.axisx + dr8 * _this8.axisy) * m8;
                    _this8.axisy = (p8 * _this8.axisy - dr8 * _this8.axisx) * m8;
                    _this8.axisx = nx8;
                  }
                  const t19 = arb.b2.imass;
                  arb.b2.posx += Jx1 * t19;
                  arb.b2.posy += Jy1 * t19;
                  const _this9 = arb.b2;
                  const dr9 = rn21 * arb.b2.iinertia * jn1;
                  _this9.rot += dr9;
                  if (dr9 * dr9 > 0.0001) {
                    _this9.axisx = Math.sin(_this9.rot);
                    _this9.axisy = Math.cos(_this9.rot);
                  } else {
                    const d29 = dr9 * dr9;
                    const p9 = 1 - 0.5 * d29;
                    const m9 = 1 - (d29 * d29) / 8;
                    const nx9 = (p9 * _this9.axisx + dr9 * _this9.axisy) * m9;
                    _this9.axisy = (p9 * _this9.axisy - dr9 * _this9.axisx) * m9;
                    _this9.axisx = nx9;
                  }
                }
              }
            }
          }
        }
        arbi = arbi.next;
        if (fst && arbi == null) {
          arbi = this.c_arbiters_true.head;
          fst = false;
        }
      }
    }
  }

  group_ignore(s1: any, s2: any) {
    let cur = s1;
    while (cur != null && cur.group == null)
      if (cur.ishape != null) {
        cur = cur.ishape.body;
      } else if (cur.icompound != null) {
        cur = cur.icompound.compound;
      } else {
        cur = cur.ibody.compound;
      }
    let g1 = cur == null ? null : cur.group;
    if (g1 == null) {
      return false;
    } else {
      let cur1 = s2;
      while (cur1 != null && cur1.group == null)
        if (cur1.ishape != null) {
          cur1 = cur1.ishape.body;
        } else if (cur1.icompound != null) {
          cur1 = cur1.icompound.compound;
        } else {
          cur1 = cur1.ibody.compound;
        }
      let g2 = cur1 == null ? null : cur1.group;
      if (g2 == null) {
        return false;
      } else {
        let ret = false;
        while (g1 != null && g2 != null) {
          if (g1 == g2) {
            ret = g1.ignore;
            break;
          }
          if (g1.depth < g2.depth) {
            g2 = g2.group;
          } else {
            g1 = g1.group;
          }
        }
        return ret;
      }
    }
  }

  interactionType(s1: any, s2: any, b1: any, b2: any) {
    let con_ignore;
    con_ignore = false;
    let cx_ite = b1.constraints.head;
    while (cx_ite != null) {
      const con = cx_ite.elt;
      if (con.ignore && con.pair_exists(b1.id, b2.id)) {
        con_ignore = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    let tmp;
    if (!con_ignore) {
      let cur = s1;
      while (cur != null && cur.group == null)
        if (cur.ishape != null) {
          cur = cur.ishape.body;
        } else if (cur.icompound != null) {
          cur = cur.icompound.compound;
        } else {
          cur = cur.ibody.compound;
        }
      let g1 = cur == null ? null : cur.group;
      let tmp1;
      if (g1 == null) {
        tmp1 = false;
      } else {
        let cur1 = s2;
        while (cur1 != null && cur1.group == null)
          if (cur1.ishape != null) {
            cur1 = cur1.ishape.body;
          } else if (cur1.icompound != null) {
            cur1 = cur1.icompound.compound;
          } else {
            cur1 = cur1.ibody.compound;
          }
        let g2 = cur1 == null ? null : cur1.group;
        if (g2 == null) {
          tmp1 = false;
        } else {
          let ret = false;
          while (g1 != null && g2 != null) {
            if (g1 == g2) {
              ret = g1.ignore;
              break;
            }
            if (g1.depth < g2.depth) {
              g2 = g2.group;
            } else {
              g1 = g1.group;
            }
          }
          tmp1 = ret;
        }
      }
      tmp = !tmp1;
    } else {
      tmp = false;
    }
    if (tmp) {
      let tmp2;
      if (s1.sensorEnabled || s2.sensorEnabled) {
        const _this = s1.filter;
        const x = s2.filter;
        tmp2 = (_this.sensorMask & x.sensorGroup) != 0 && (x.sensorMask & _this.sensorGroup) != 0;
      } else {
        tmp2 = false;
      }
      if (tmp2) {
        return 2;
      } else {
        let tmp3;
        if (s1.fluidEnabled || s2.fluidEnabled) {
          const _this1 = s1.filter;
          const x1 = s2.filter;
          tmp3 = (_this1.fluidMask & x1.fluidGroup) != 0 && (x1.fluidMask & _this1.fluidGroup) != 0;
        } else {
          tmp3 = false;
        }
        if (tmp3 && !(b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0)) {
          return 0;
        } else {
          const _this2 = s1.filter;
          const x2 = s2.filter;
          if (
            (_this2.collisionMask & x2.collisionGroup) != 0 &&
            (x2.collisionMask & _this2.collisionGroup) != 0 &&
            !(b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0)
          ) {
            return 1;
          } else {
            return -1;
          }
        }
      }
    } else {
      return -1;
    }
  }

  narrowPhase(s1: any, s2: any, stat: any, in_arb: any, continuous: any) {
    const _gthis = this;
    let ret = null;
    const b1 = s1.body;
    const b2 = s2.body;
    let con_ignore;
    con_ignore = false;
    let cx_ite = b1.constraints.head;
    while (cx_ite != null) {
      const con = cx_ite.elt;
      if (con.ignore && con.pair_exists(b1.id, b2.id)) {
        con_ignore = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    let itype;
    let itype1;
    if (!con_ignore) {
      let cur = s1;
      while (cur != null && cur.group == null)
        if (cur.ishape != null) {
          cur = cur.ishape.body;
        } else if (cur.icompound != null) {
          cur = cur.icompound.compound;
        } else {
          cur = cur.ibody.compound;
        }
      let g1 = cur == null ? null : cur.group;
      let itype2;
      if (g1 == null) {
        itype2 = false;
      } else {
        let cur1 = s2;
        while (cur1 != null && cur1.group == null)
          if (cur1.ishape != null) {
            cur1 = cur1.ishape.body;
          } else if (cur1.icompound != null) {
            cur1 = cur1.icompound.compound;
          } else {
            cur1 = cur1.ibody.compound;
          }
        let g2 = cur1 == null ? null : cur1.group;
        if (g2 == null) {
          itype2 = false;
        } else {
          let ret1 = false;
          while (g1 != null && g2 != null) {
            if (g1 == g2) {
              ret1 = g1.ignore;
              break;
            }
            if (g1.depth < g2.depth) {
              g2 = g2.group;
            } else {
              g1 = g1.group;
            }
          }
          itype2 = ret1;
        }
      }
      itype1 = !itype2;
    } else {
      itype1 = false;
    }
    if (itype1) {
      let itype3;
      if (s1.sensorEnabled || s2.sensorEnabled) {
        const _this = s1.filter;
        const x = s2.filter;
        itype3 = (_this.sensorMask & x.sensorGroup) != 0 && (x.sensorMask & _this.sensorGroup) != 0;
      } else {
        itype3 = false;
      }
      if (itype3) {
        itype = 2;
      } else {
        let itype4;
        if (s1.fluidEnabled || s2.fluidEnabled) {
          const _this1 = s1.filter;
          const x1 = s2.filter;
          itype4 =
            (_this1.fluidMask & x1.fluidGroup) != 0 && (x1.fluidMask & _this1.fluidGroup) != 0;
        } else {
          itype4 = false;
        }
        if (itype4 && !(b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0)) {
          itype = 0;
        } else {
          const _this2 = s1.filter;
          const x2 = s2.filter;
          itype =
            (_this2.collisionMask & x2.collisionGroup) != 0 &&
            (x2.collisionMask & _this2.collisionGroup) != 0 &&
            !(b1.imass == 0 && b2.imass == 0 && b1.iinertia == 0 && b2.iinertia == 0)
              ? 1
              : -1;
        }
      }
    } else {
      itype = -1;
    }
    if (itype != -1) {
      let sa;
      let sb;
      if (s1.type > s2.type) {
        sa = s2;
        sb = s1;
      } else if (s1.type == s2.type) {
        if (s1.id < s2.id) {
          sa = s1;
          sb = s2;
        } else {
          sb = s1;
          sa = s2;
        }
      } else {
        sa = s1;
        sb = s2;
      }
      let reverse = sa == s2;
      if (itype == 0) {
        let xarb;
        if (in_arb == null) {
          let ret2 = null;
          const b = b1.arbiters.length < b2.arbiters.length ? b1 : b2;
          let cx_ite1 = b.arbiters.head;
          while (cx_ite1 != null) {
            const arb = cx_ite1.elt;
            if (arb.id == sa.id && arb.di == sb.id) {
              ret2 = arb;
              break;
            }
            cx_ite1 = cx_ite1.next;
          }
          xarb = ret2;
        } else {
          xarb = in_arb;
        }
        let first = xarb == null;
        let arb1;
        let swapped = false;
        if (first) {
          if (ZPP_FluidArbiter.zpp_pool == null) {
            arb1 = new ZPP_FluidArbiter();
          } else {
            arb1 = ZPP_FluidArbiter.zpp_pool;
            ZPP_FluidArbiter.zpp_pool = arb1.next;
            arb1.next = null;
          }
        } else if (xarb.fluidarb == null) {
          const b3 = null;
          xarb.cleared = true;
          if (b3 == null || xarb.b2 == b3) {
            const _this3 = xarb.b1.arbiters;
            let pre = null;
            let cur2 = _this3.head;
            let ret3 = false;
            while (cur2 != null) {
              if (cur2.elt == xarb) {
                let old;
                let ret4;
                if (pre == null) {
                  old = _this3.head;
                  ret4 = old.next;
                  _this3.head = ret4;
                  if (_this3.head == null) {
                    _this3.pushmod = true;
                  }
                } else {
                  old = pre.next;
                  ret4 = old.next;
                  pre.next = ret4;
                  if (ret4 == null) {
                    _this3.pushmod = true;
                  }
                }
                const o = old;
                o.elt = null;
                o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o;
                _this3.modified = true;
                _this3.length--;
                _this3.pushmod = true;
                ret3 = true;
                break;
              }
              pre = cur2;
              cur2 = cur2.next;
            }
          }
          if (b3 == null || xarb.b1 == b3) {
            const _this4 = xarb.b2.arbiters;
            let pre1 = null;
            let cur3 = _this4.head;
            let ret5 = false;
            while (cur3 != null) {
              if (cur3.elt == xarb) {
                let old1;
                let ret6;
                if (pre1 == null) {
                  old1 = _this4.head;
                  ret6 = old1.next;
                  _this4.head = ret6;
                  if (_this4.head == null) {
                    _this4.pushmod = true;
                  }
                } else {
                  old1 = pre1.next;
                  ret6 = old1.next;
                  pre1.next = ret6;
                  if (ret6 == null) {
                    _this4.pushmod = true;
                  }
                }
                const o1 = old1;
                o1.elt = null;
                o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o1;
                _this4.modified = true;
                _this4.length--;
                _this4.pushmod = true;
                ret5 = true;
                break;
              }
              pre1 = cur3;
              cur3 = cur3.next;
            }
          }
          if (xarb.pair != null) {
            xarb.pair.arb = null;
            xarb.pair = null;
          }
          xarb.active = false;
          this.f_arbiters.modified = true;
          if (ZPP_FluidArbiter.zpp_pool == null) {
            arb1 = new ZPP_FluidArbiter();
          } else {
            arb1 = ZPP_FluidArbiter.zpp_pool;
            ZPP_FluidArbiter.zpp_pool = arb1.next;
            arb1.next = null;
          }
          arb1.intchange = true;
          first = true;
          swapped = true;
        } else {
          arb1 = xarb.fluidarb;
        }
        const inttype = 4;
        if (first || arb1.stamp != this.stamp || continuous) {
          arb1.stamp = this.stamp;
          if (ZPP_Collide.flowCollide(sa, sb, arb1)) {
            if (first) {
              const di = sb.id;
              arb1.b1 = s1.body;
              arb1.ws1 = s1;
              arb1.b2 = s2.body;
              arb1.ws2 = s2;
              arb1.id = sa.id;
              arb1.di = di;
              const _this5 = arb1.b1.arbiters;
              let ret7;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                ret7 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
              } else {
                ret7 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret7.next;
                ret7.next = null;
              }
              ret7.elt = arb1;
              const temp = ret7;
              temp.next = _this5.head;
              _this5.head = temp;
              _this5.modified = true;
              _this5.length++;
              const _this6 = arb1.b2.arbiters;
              let ret8;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                ret8 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
              } else {
                ret8 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret8.next;
                ret8.next = null;
              }
              ret8.elt = arb1;
              const temp1 = ret8;
              temp1.next = _this6.head;
              _this6.head = temp1;
              _this6.modified = true;
              _this6.length++;
              arb1.active = true;
              arb1.present = 0;
              arb1.cleared = false;
              arb1.sleeping = false;
              arb1.fresh = false;
              arb1.presentable = false;
              arb1.nx = 0;
              arb1.ny = 1;
              arb1.dampx = 0;
              arb1.dampy = 0;
              arb1.adamp = 0.0;
              const _this7 = this.f_arbiters;
              let ret9;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool == null) {
                ret9 = new ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter();
              } else {
                ret9 = ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = ret9.next;
                ret9.next = null;
              }
              ret9.elt = arb1;
              const temp2 = ret9;
              temp2.next = _this7.head;
              _this7.head = temp2;
              _this7.modified = true;
              _this7.length++;
              arb1.fresh = !swapped;
            } else {
              arb1.fresh =
                arb1.up_stamp < this.stamp - 1 || (arb1.endGenerated == this.stamp && continuous);
            }
            arb1.up_stamp = arb1.stamp;
            if (arb1.fresh || (arb1.immState & 4) == 0) {
              arb1.immState = 1;
              let anyimpure = false;
              const arbs1 = arb1.ws1.id > arb1.ws2.id ? arb1.ws2 : arb1.ws1;
              const arbs2 = arb1.ws1.id > arb1.ws2.id ? arb1.ws1 : arb1.ws2;
              const _this8 = this.mrca1;
              while (_this8.head != null) {
                const ret10 = _this8.head;
                _this8.head = ret10.next;
                const o2 = ret10;
                o2.elt = null;
                o2.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o2;
                if (_this8.head == null) {
                  _this8.pushmod = true;
                }
                _this8.modified = true;
                _this8.length--;
              }
              _this8.pushmod = true;
              const _this9 = this.mrca2;
              while (_this9.head != null) {
                const ret11 = _this9.head;
                _this9.head = ret11.next;
                const o3 = ret11;
                o3.elt = null;
                o3.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o3;
                if (_this9.head == null) {
                  _this9.pushmod = true;
                }
                _this9.modified = true;
                _this9.length--;
              }
              _this9.pushmod = true;
              if (arbs1.cbSet != null) {
                const _this10 = this.mrca1;
                let ret12;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret12 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret12 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret12.next;
                  ret12.next = null;
                }
                ret12.elt = arbs1;
                const temp3 = ret12;
                temp3.next = _this10.head;
                _this10.head = temp3;
                _this10.modified = true;
                _this10.length++;
              }
              if (arbs1.body.cbSet != null) {
                const _this11 = this.mrca1;
                const o4 = arbs1.body;
                let ret13;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret13 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret13 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret13.next;
                  ret13.next = null;
                }
                ret13.elt = o4;
                const temp4 = ret13;
                temp4.next = _this11.head;
                _this11.head = temp4;
                _this11.modified = true;
                _this11.length++;
              }
              if (arbs2.cbSet != null) {
                const _this12 = this.mrca2;
                let ret14;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret14 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret14 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret14.next;
                  ret14.next = null;
                }
                ret14.elt = arbs2;
                const temp5 = ret14;
                temp5.next = _this12.head;
                _this12.head = temp5;
                _this12.modified = true;
                _this12.length++;
              }
              if (arbs2.body.cbSet != null) {
                const _this13 = this.mrca2;
                const o5 = arbs2.body;
                let ret15;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret15 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret15 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret15.next;
                  ret15.next = null;
                }
                ret15.elt = o5;
                const temp6 = ret15;
                temp6.next = _this13.head;
                _this13.head = temp6;
                _this13.modified = true;
                _this13.length++;
              }
              let c1 = arbs1.body.compound;
              let c2 = arbs2.body.compound;
              while (c1 != c2) {
                const d1 = c1 == null ? 0 : c1.depth;
                const d2 = c2 == null ? 0 : c2.depth;
                if (d1 < d2) {
                  if (c2.cbSet != null) {
                    const _this14 = this.mrca2;
                    let ret16;
                    if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                      ret16 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                    } else {
                      ret16 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret16.next;
                      ret16.next = null;
                    }
                    ret16.elt = c2;
                    const temp7 = ret16;
                    temp7.next = _this14.head;
                    _this14.head = temp7;
                    _this14.modified = true;
                    _this14.length++;
                  }
                  c2 = c2.compound;
                } else {
                  if (c1.cbSet != null) {
                    const _this15 = this.mrca1;
                    let ret17;
                    if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                      ret17 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                    } else {
                      ret17 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret17.next;
                      ret17.next = null;
                    }
                    ret17.elt = c1;
                    const temp8 = ret17;
                    temp8.next = _this15.head;
                    _this15.head = temp8;
                    _this15.modified = true;
                    _this15.length++;
                  }
                  c1 = c1.compound;
                }
              }
              let cx_ite2 = this.mrca1.head;
              while (cx_ite2 != null) {
                const i1 = cx_ite2.elt;
                let cx_ite3 = this.mrca2.head;
                while (cx_ite3 != null) {
                  const i2 = cx_ite3.elt;
                  const cb1 = i1.cbSet;
                  const cb2 = i2.cbSet;
                  const _this16 = cb1.manager;
                  let ret18 = null;
                  const pairs = cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
                  let cx_ite4 = pairs.head;
                  while (cx_ite4 != null) {
                    const p = cx_ite4.elt;
                    if ((p.a == cb1 && p.b == cb2) || (p.a == cb2 && p.b == cb1)) {
                      ret18 = p;
                      break;
                    }
                    cx_ite4 = cx_ite4.next;
                  }
                  if (ret18 == null) {
                    let ret19;
                    if (ZPP_CbSetPair.zpp_pool == null) {
                      ret19 = new ZPP_CbSetPair();
                    } else {
                      ret19 = ZPP_CbSetPair.zpp_pool;
                      ZPP_CbSetPair.zpp_pool = ret19.next;
                      ret19.next = null;
                    }
                    ret19.zip_listeners = true;
                    if (ZPP_CbSet.setlt(cb1, cb2)) {
                      ret19.a = cb1;
                      ret19.b = cb2;
                    } else {
                      ret19.a = cb2;
                      ret19.b = cb1;
                    }
                    ret18 = ret19;
                    cb1.cbpairs.add(ret18);
                    if (cb2 != cb1) {
                      cb2.cbpairs.add(ret18);
                    }
                  }
                  if (ret18.zip_listeners) {
                    ret18.zip_listeners = false;
                    ret18.__validate();
                  }
                  if (ret18.listeners.head == null) {
                    cx_ite3 = cx_ite3.next;
                    continue;
                  }
                  let callbackset = null;
                  let ncallbackset = null;
                  const _this17 = this.prelisteners;
                  while (_this17.head != null) {
                    const ret20 = _this17.head;
                    _this17.head = ret20.next;
                    const o6 = ret20;
                    o6.elt = null;
                    o6.next = ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                    ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = o6;
                    if (_this17.head == null) {
                      _this17.pushmod = true;
                    }
                    _this17.modified = true;
                    _this17.length--;
                  }
                  _this17.pushmod = true;
                  let lite = null;
                  const _this18 = cb1.manager;
                  let ret21 = null;
                  const pairs1 =
                    cb1.cbpairs.length < cb2.cbpairs.length ? cb1.cbpairs : cb2.cbpairs;
                  let cx_ite5 = pairs1.head;
                  while (cx_ite5 != null) {
                    const p1 = cx_ite5.elt;
                    if ((p1.a == cb1 && p1.b == cb2) || (p1.a == cb2 && p1.b == cb1)) {
                      ret21 = p1;
                      break;
                    }
                    cx_ite5 = cx_ite5.next;
                  }
                  if (ret21 == null) {
                    let ret22;
                    if (ZPP_CbSetPair.zpp_pool == null) {
                      ret22 = new ZPP_CbSetPair();
                    } else {
                      ret22 = ZPP_CbSetPair.zpp_pool;
                      ZPP_CbSetPair.zpp_pool = ret22.next;
                      ret22.next = null;
                    }
                    ret22.zip_listeners = true;
                    if (ZPP_CbSet.setlt(cb1, cb2)) {
                      ret22.a = cb1;
                      ret22.b = cb2;
                    } else {
                      ret22.a = cb2;
                      ret22.b = cb1;
                    }
                    ret21 = ret22;
                    cb1.cbpairs.add(ret21);
                    if (cb2 != cb1) {
                      cb2.cbpairs.add(ret21);
                    }
                  }
                  if (ret21.zip_listeners) {
                    ret21.zip_listeners = false;
                    ret21.__validate();
                  }
                  let cx_ite6 = ret21.listeners.head;
                  while (cx_ite6 != null) {
                    const x3 = cx_ite6.elt;
                    if (x3.event == 5) {
                      if ((x3.itype & inttype) != 0) {
                        const _this19 = _gthis.prelisteners;
                        let ret23;
                        if (ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool == null) {
                          ret23 = new ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener();
                        } else {
                          ret23 = ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                          ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = ret23.next;
                          ret23.next = null;
                        }
                        ret23.elt = x3;
                        const temp9 = ret23;
                        if (lite == null) {
                          temp9.next = _this19.head;
                          _this19.head = temp9;
                        } else {
                          temp9.next = lite.next;
                          lite.next = temp9;
                        }
                        _this19.pushmod = _this19.modified = true;
                        _this19.length++;
                        lite = temp9;
                        anyimpure = anyimpure || !x3.pure;
                      }
                    }
                    cx_ite6 = cx_ite6.next;
                  }
                  if (this.prelisteners.head == null) {
                    cx_ite3 = cx_ite3.next;
                    continue;
                  }
                  callbackset = ZPP_Space._zpp.phys.ZPP_Interactor.get(i1, i2);
                  if (callbackset == null) {
                    ncallbackset = ZPP_CallbackSet.get(i1, i2);
                    this.add_callbackset(ncallbackset);
                  }
                  if (
                    callbackset == null ||
                    ((callbackset.FLUIDstamp != this.stamp || continuous) &&
                      (callbackset.FLUIDstate & 4) == 0)
                  ) {
                    if (ncallbackset != null) {
                      callbackset = ncallbackset;
                    }
                    if (callbackset != null) {
                      let cx_ite7 = this.prelisteners.head;
                      while (cx_ite7 != null) {
                        const listener = cx_ite7.elt;
                        if (listener.itype == 7) {
                          callbackset.COLLISIONstamp = this.stamp;
                          callbackset.SENSORstamp = this.stamp;
                          callbackset.FLUIDstamp = this.stamp;
                        } else {
                          callbackset.FLUIDstamp = this.stamp;
                        }
                        cx_ite7 = cx_ite7.next;
                      }
                    }
                    arb1.mutable = true;
                    if (arb1.wrap_position != null) {
                      arb1.wrap_position.zpp_inner._immutable = false;
                    }
                    const pact = arb1.active;
                    arb1.active = true;
                    const emptycontacts = false;
                    this.precb.zpp_inner.pre_arbiter = arb1;
                    this.precb.zpp_inner.set = callbackset;
                    let cx_ite8 = this.prelisteners.head;
                    while (cx_ite8 != null) {
                      const listener1 = cx_ite8.elt;
                      this.precb.zpp_inner.listener = listener1;
                      const cb = this.precb.zpp_inner;
                      const o11 = callbackset.int1;
                      const o21 = callbackset.int2;
                      let ret24;
                      const _this20 = listener1.options1;
                      const xs = o11.cbTypes;
                      if (
                        _this20.nonemptyintersection(xs, _this20.includes) &&
                        !_this20.nonemptyintersection(xs, _this20.excludes)
                      ) {
                        const _this21 = listener1.options2;
                        const xs1 = o21.cbTypes;
                        ret24 =
                          _this21.nonemptyintersection(xs1, _this21.includes) &&
                          !_this21.nonemptyintersection(xs1, _this21.excludes);
                      } else {
                        ret24 = false;
                      }
                      if (ret24) {
                        cb.int1 = o11;
                        cb.int2 = o21;
                      } else {
                        cb.int1 = o21;
                        cb.int2 = o11;
                      }
                      this.precb.zpp_inner.pre_swapped = i1 != this.precb.zpp_inner.int1;
                      const ret25 = listener1.handlerp(this.precb);
                      if (ret25 != null) {
                        let ret26;
                        if (ZPP_Flags.PreFlag_ACCEPT == null) {
                          ZPP_Flags.internal = true;
                          ZPP_Flags.PreFlag_ACCEPT = new ZPP_Space._nape.callbacks.PreFlag();
                          ZPP_Flags.internal = false;
                        }
                        if (ret25 == ZPP_Flags.PreFlag_ACCEPT) {
                          ret26 = 5;
                        } else {
                          if (ZPP_Flags.PreFlag_ACCEPT_ONCE == null) {
                            ZPP_Flags.internal = true;
                            ZPP_Flags.PreFlag_ACCEPT_ONCE = new ZPP_Space._nape.callbacks.PreFlag();
                            ZPP_Flags.internal = false;
                          }
                          if (ret25 == ZPP_Flags.PreFlag_ACCEPT_ONCE) {
                            ret26 = 1;
                          } else {
                            if (ZPP_Flags.PreFlag_IGNORE == null) {
                              ZPP_Flags.internal = true;
                              ZPP_Flags.PreFlag_IGNORE = new ZPP_Space._nape.callbacks.PreFlag();
                              ZPP_Flags.internal = false;
                            }
                            ret26 = ret25 == ZPP_Flags.PreFlag_IGNORE ? 6 : 2;
                          }
                        }
                        arb1.immState = ret26;
                      }
                      cx_ite8 = cx_ite8.next;
                    }
                    arb1.mutable = false;
                    if (arb1.wrap_position != null) {
                      arb1.wrap_position.zpp_inner._immutable = true;
                    }
                    arb1.active = pact;
                    if (callbackset != null) {
                      let cx_ite9 = this.prelisteners.head;
                      while (cx_ite9 != null) {
                        const listener2 = cx_ite9.elt;
                        if (listener2.itype == 7) {
                          callbackset.COLLISIONstate = arb1.immState;
                          callbackset.SENSORstate = arb1.immState;
                          callbackset.FLUIDstate = arb1.immState;
                        } else {
                          callbackset.FLUIDstate = arb1.immState;
                        }
                        cx_ite9 = cx_ite9.next;
                      }
                    }
                  } else if (callbackset == null) {
                    if ((arb1.immState & 4) == 0) {
                      arb1.immState = 1;
                    }
                  } else {
                    arb1.immState = callbackset.FLUIDstate;
                  }
                  cx_ite3 = cx_ite3.next;
                }
                cx_ite2 = cx_ite2.next;
              }
              if (anyimpure && (arb1.immState & 4) == 0) {
                if (arb1.b1.type == 2) {
                  const o7 = arb1.b1;
                  if (!o7.world) {
                    o7.component.waket = this.stamp + (this.midstep ? 0 : 1);
                    if (o7.type == 3) {
                      o7.kinematicDelaySleep = true;
                    }
                    if (o7.component.sleeping) {
                      this.really_wake(o7, false);
                    }
                  }
                }
                if (arb1.b1.type == 2) {
                  const o8 = arb1.b2;
                  if (!o8.world) {
                    o8.component.waket = this.stamp + (this.midstep ? 0 : 1);
                    if (o8.type == 3) {
                      o8.kinematicDelaySleep = true;
                    }
                    if (o8.component.sleeping) {
                      this.really_wake(o8, false);
                    }
                  }
                }
              }
            }
            if ((arb1.immState & 1) != 0) {
              if (arb1.b1.type == 2 && arb1.b1.component.sleeping) {
                const o9 = arb1.b1;
                if (!o9.world) {
                  o9.component.waket = this.stamp + (this.midstep ? 0 : 1);
                  if (o9.type == 3) {
                    o9.kinematicDelaySleep = true;
                  }
                  if (o9.component.sleeping) {
                    this.really_wake(o9, false);
                  }
                }
              }
              if (arb1.b2.type == 2 && arb1.b2.component.sleeping) {
                const o10 = arb1.b2;
                if (!o10.world) {
                  o10.component.waket = this.stamp + (this.midstep ? 0 : 1);
                  if (o10.type == 3) {
                    o10.kinematicDelaySleep = true;
                  }
                  if (o10.component.sleeping) {
                    this.really_wake(o10, false);
                  }
                }
              }
            }
            if (arb1.sleeping) {
              arb1.sleeping = false;
              const _this22 = this.f_arbiters;
              let ret27;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool == null) {
                ret27 = new ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter();
              } else {
                ret27 = ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_FluidArbiter.zpp_pool = ret27.next;
                ret27.next = null;
              }
              ret27.elt = arb1;
              const temp10 = ret27;
              temp10.next = _this22.head;
              _this22.head = temp10;
              _this22.modified = true;
              _this22.length++;
            }
            ret = arb1;
          } else if (first) {
            const o12 = arb1;
            o12.next = ZPP_FluidArbiter.zpp_pool;
            ZPP_FluidArbiter.zpp_pool = o12;
            ret = null;
          } else {
            ret = arb1;
          }
        } else {
          ret = arb1;
        }
      } else if (itype == 1) {
        const carbs = stat ? this.c_arbiters_true : this.c_arbiters_false;
        let xarb1;
        if (in_arb == null) {
          let ret28 = null;
          const b4 = b1.arbiters.length < b2.arbiters.length ? b1 : b2;
          let cx_ite10 = b4.arbiters.head;
          while (cx_ite10 != null) {
            const arb2 = cx_ite10.elt;
            if (arb2.id == sa.id && arb2.di == sb.id) {
              ret28 = arb2;
              break;
            }
            cx_ite10 = cx_ite10.next;
          }
          xarb1 = ret28;
        } else {
          xarb1 = in_arb;
        }
        let first1 = xarb1 == null;
        let arb3;
        let swapped1 = false;
        if (first1) {
          if (ZPP_ColArbiter.zpp_pool == null) {
            arb3 = new ZPP_ColArbiter();
          } else {
            arb3 = ZPP_ColArbiter.zpp_pool;
            ZPP_ColArbiter.zpp_pool = arb3.next;
            arb3.next = null;
          }
          arb3.stat = stat;
        } else if (xarb1.colarb == null) {
          const b5 = null;
          xarb1.cleared = true;
          if (b5 == null || xarb1.b2 == b5) {
            const _this23 = xarb1.b1.arbiters;
            let pre2 = null;
            let cur4 = _this23.head;
            let ret29 = false;
            while (cur4 != null) {
              if (cur4.elt == xarb1) {
                let old2;
                let ret30;
                if (pre2 == null) {
                  old2 = _this23.head;
                  ret30 = old2.next;
                  _this23.head = ret30;
                  if (_this23.head == null) {
                    _this23.pushmod = true;
                  }
                } else {
                  old2 = pre2.next;
                  ret30 = old2.next;
                  pre2.next = ret30;
                  if (ret30 == null) {
                    _this23.pushmod = true;
                  }
                }
                const o13 = old2;
                o13.elt = null;
                o13.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o13;
                _this23.modified = true;
                _this23.length--;
                _this23.pushmod = true;
                ret29 = true;
                break;
              }
              pre2 = cur4;
              cur4 = cur4.next;
            }
          }
          if (b5 == null || xarb1.b1 == b5) {
            const _this24 = xarb1.b2.arbiters;
            let pre3 = null;
            let cur5 = _this24.head;
            let ret31 = false;
            while (cur5 != null) {
              if (cur5.elt == xarb1) {
                let old3;
                let ret32;
                if (pre3 == null) {
                  old3 = _this24.head;
                  ret32 = old3.next;
                  _this24.head = ret32;
                  if (_this24.head == null) {
                    _this24.pushmod = true;
                  }
                } else {
                  old3 = pre3.next;
                  ret32 = old3.next;
                  pre3.next = ret32;
                  if (ret32 == null) {
                    _this24.pushmod = true;
                  }
                }
                const o14 = old3;
                o14.elt = null;
                o14.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o14;
                _this24.modified = true;
                _this24.length--;
                _this24.pushmod = true;
                ret31 = true;
                break;
              }
              pre3 = cur5;
              cur5 = cur5.next;
            }
          }
          if (xarb1.pair != null) {
            xarb1.pair.arb = null;
            xarb1.pair = null;
          }
          xarb1.active = false;
          this.f_arbiters.modified = true;
          if (ZPP_ColArbiter.zpp_pool == null) {
            arb3 = new ZPP_ColArbiter();
          } else {
            arb3 = ZPP_ColArbiter.zpp_pool;
            ZPP_ColArbiter.zpp_pool = arb3.next;
            arb3.next = null;
          }
          arb3.intchange = true;
          arb3.stat = stat;
          first1 = true;
          swapped1 = true;
        } else {
          arb3 = xarb1.colarb;
          reverse = sa != arb3.s1;
          if (arb3.stat != stat) {
            arb3.stat = stat;
            if (!arb3.sleeping) {
              (stat ? this.c_arbiters_false : this.c_arbiters_true).remove(arb3);
              carbs.add(arb3);
            }
          }
        }
        const inttype1 = 1;
        if (first1 || arb3.stamp != this.stamp || continuous) {
          arb3.stamp = this.stamp;
          if (ZPP_Collide.contactCollide(sa, sb, arb3, reverse)) {
            if (first1) {
              const di1 = sb.id;
              arb3.b1 = s1.body;
              arb3.ws1 = s1;
              arb3.b2 = s2.body;
              arb3.ws2 = s2;
              arb3.id = sa.id;
              arb3.di = di1;
              const _this25 = arb3.b1.arbiters;
              let ret33;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                ret33 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
              } else {
                ret33 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret33.next;
                ret33.next = null;
              }
              ret33.elt = arb3;
              const temp11 = ret33;
              temp11.next = _this25.head;
              _this25.head = temp11;
              _this25.modified = true;
              _this25.length++;
              const _this26 = arb3.b2.arbiters;
              let ret34;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                ret34 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
              } else {
                ret34 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret34.next;
                ret34.next = null;
              }
              ret34.elt = arb3;
              const temp12 = ret34;
              temp12.next = _this26.head;
              _this26.head = temp12;
              _this26.modified = true;
              _this26.length++;
              arb3.active = true;
              arb3.present = 0;
              arb3.cleared = false;
              arb3.sleeping = false;
              arb3.fresh = false;
              arb3.presentable = false;
              arb3.s1 = s1;
              arb3.s2 = s2;
              if (!arb3.userdef_restitution) {
                if (
                  arb3.s1.material.elasticity <= -Infinity ||
                  arb3.s2.material.elasticity <= -Infinity
                ) {
                  arb3.restitution = 0;
                } else if (
                  arb3.s1.material.elasticity >= Infinity ||
                  arb3.s2.material.elasticity >= Infinity
                ) {
                  arb3.restitution = 1;
                } else {
                  arb3.restitution =
                    (arb3.s1.material.elasticity + arb3.s2.material.elasticity) / 2;
                }
                if (arb3.restitution < 0) {
                  arb3.restitution = 0;
                }
                if (arb3.restitution > 1) {
                  arb3.restitution = 1;
                }
              }
              if (!arb3.userdef_dyn_fric) {
                arb3.dyn_fric = Math.sqrt(
                  arb3.s1.material.dynamicFriction * arb3.s2.material.dynamicFriction,
                );
              }
              if (!arb3.userdef_stat_fric) {
                arb3.stat_fric = Math.sqrt(
                  arb3.s1.material.staticFriction * arb3.s2.material.staticFriction,
                );
              }
              if (!arb3.userdef_rfric) {
                arb3.rfric = Math.sqrt(
                  arb3.s1.material.rollingFriction * arb3.s2.material.rollingFriction,
                );
              }
              let ret35;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool == null) {
                ret35 = new ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter();
              } else {
                ret35 = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = ret35.next;
                ret35.next = null;
              }
              ret35.elt = arb3;
              const temp13 = ret35;
              temp13.next = carbs.head;
              carbs.head = temp13;
              carbs.modified = true;
              carbs.length++;
              arb3.fresh = !swapped1;
            } else {
              arb3.fresh =
                arb3.up_stamp < this.stamp - 1 || (arb3.endGenerated == this.stamp && continuous);
            }
            arb3.up_stamp = arb3.stamp;
            if (arb3.fresh || (arb3.immState & 4) == 0) {
              arb3.immState = 1;
              let anyimpure1 = false;
              const arbs11 = arb3.ws1.id > arb3.ws2.id ? arb3.ws2 : arb3.ws1;
              const arbs21 = arb3.ws1.id > arb3.ws2.id ? arb3.ws1 : arb3.ws2;
              const _this27 = this.mrca1;
              while (_this27.head != null) {
                const ret36 = _this27.head;
                _this27.head = ret36.next;
                const o15 = ret36;
                o15.elt = null;
                o15.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o15;
                if (_this27.head == null) {
                  _this27.pushmod = true;
                }
                _this27.modified = true;
                _this27.length--;
              }
              _this27.pushmod = true;
              const _this28 = this.mrca2;
              while (_this28.head != null) {
                const ret37 = _this28.head;
                _this28.head = ret37.next;
                const o16 = ret37;
                o16.elt = null;
                o16.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o16;
                if (_this28.head == null) {
                  _this28.pushmod = true;
                }
                _this28.modified = true;
                _this28.length--;
              }
              _this28.pushmod = true;
              if (arbs11.cbSet != null) {
                const _this29 = this.mrca1;
                let ret38;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret38 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret38 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret38.next;
                  ret38.next = null;
                }
                ret38.elt = arbs11;
                const temp14 = ret38;
                temp14.next = _this29.head;
                _this29.head = temp14;
                _this29.modified = true;
                _this29.length++;
              }
              if (arbs11.body.cbSet != null) {
                const _this30 = this.mrca1;
                const o17 = arbs11.body;
                let ret39;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret39 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret39 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret39.next;
                  ret39.next = null;
                }
                ret39.elt = o17;
                const temp15 = ret39;
                temp15.next = _this30.head;
                _this30.head = temp15;
                _this30.modified = true;
                _this30.length++;
              }
              if (arbs21.cbSet != null) {
                const _this31 = this.mrca2;
                let ret40;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret40 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret40 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret40.next;
                  ret40.next = null;
                }
                ret40.elt = arbs21;
                const temp16 = ret40;
                temp16.next = _this31.head;
                _this31.head = temp16;
                _this31.modified = true;
                _this31.length++;
              }
              if (arbs21.body.cbSet != null) {
                const _this32 = this.mrca2;
                const o18 = arbs21.body;
                let ret41;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret41 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret41 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret41.next;
                  ret41.next = null;
                }
                ret41.elt = o18;
                const temp17 = ret41;
                temp17.next = _this32.head;
                _this32.head = temp17;
                _this32.modified = true;
                _this32.length++;
              }
              let c11 = arbs11.body.compound;
              let c21 = arbs21.body.compound;
              while (c11 != c21) {
                const d11 = c11 == null ? 0 : c11.depth;
                const d21 = c21 == null ? 0 : c21.depth;
                if (d11 < d21) {
                  if (c21.cbSet != null) {
                    const _this33 = this.mrca2;
                    let ret42;
                    if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                      ret42 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                    } else {
                      ret42 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret42.next;
                      ret42.next = null;
                    }
                    ret42.elt = c21;
                    const temp18 = ret42;
                    temp18.next = _this33.head;
                    _this33.head = temp18;
                    _this33.modified = true;
                    _this33.length++;
                  }
                  c21 = c21.compound;
                } else {
                  if (c11.cbSet != null) {
                    const _this34 = this.mrca1;
                    let ret43;
                    if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                      ret43 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                    } else {
                      ret43 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret43.next;
                      ret43.next = null;
                    }
                    ret43.elt = c11;
                    const temp19 = ret43;
                    temp19.next = _this34.head;
                    _this34.head = temp19;
                    _this34.modified = true;
                    _this34.length++;
                  }
                  c11 = c11.compound;
                }
              }
              let cx_ite11 = this.mrca1.head;
              while (cx_ite11 != null) {
                const i11 = cx_ite11.elt;
                let cx_ite12 = this.mrca2.head;
                while (cx_ite12 != null) {
                  const i21 = cx_ite12.elt;
                  const cb11 = i11.cbSet;
                  const cb21 = i21.cbSet;
                  const _this35 = cb11.manager;
                  let ret44 = null;
                  const pairs2 =
                    cb11.cbpairs.length < cb21.cbpairs.length ? cb11.cbpairs : cb21.cbpairs;
                  let cx_ite13 = pairs2.head;
                  while (cx_ite13 != null) {
                    const p2 = cx_ite13.elt;
                    if ((p2.a == cb11 && p2.b == cb21) || (p2.a == cb21 && p2.b == cb11)) {
                      ret44 = p2;
                      break;
                    }
                    cx_ite13 = cx_ite13.next;
                  }
                  if (ret44 == null) {
                    let ret45;
                    if (ZPP_CbSetPair.zpp_pool == null) {
                      ret45 = new ZPP_CbSetPair();
                    } else {
                      ret45 = ZPP_CbSetPair.zpp_pool;
                      ZPP_CbSetPair.zpp_pool = ret45.next;
                      ret45.next = null;
                    }
                    ret45.zip_listeners = true;
                    if (ZPP_CbSet.setlt(cb11, cb21)) {
                      ret45.a = cb11;
                      ret45.b = cb21;
                    } else {
                      ret45.a = cb21;
                      ret45.b = cb11;
                    }
                    ret44 = ret45;
                    cb11.cbpairs.add(ret44);
                    if (cb21 != cb11) {
                      cb21.cbpairs.add(ret44);
                    }
                  }
                  if (ret44.zip_listeners) {
                    ret44.zip_listeners = false;
                    ret44.__validate();
                  }
                  if (ret44.listeners.head == null) {
                    cx_ite12 = cx_ite12.next;
                    continue;
                  }
                  let callbackset1 = null;
                  let ncallbackset1 = null;
                  const _this36 = this.prelisteners;
                  while (_this36.head != null) {
                    const ret46 = _this36.head;
                    _this36.head = ret46.next;
                    const o19 = ret46;
                    o19.elt = null;
                    o19.next = ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                    ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = o19;
                    if (_this36.head == null) {
                      _this36.pushmod = true;
                    }
                    _this36.modified = true;
                    _this36.length--;
                  }
                  _this36.pushmod = true;
                  let lite1 = null;
                  const _this37 = cb11.manager;
                  let ret47 = null;
                  const pairs3 =
                    cb11.cbpairs.length < cb21.cbpairs.length ? cb11.cbpairs : cb21.cbpairs;
                  let cx_ite14 = pairs3.head;
                  while (cx_ite14 != null) {
                    const p3 = cx_ite14.elt;
                    if ((p3.a == cb11 && p3.b == cb21) || (p3.a == cb21 && p3.b == cb11)) {
                      ret47 = p3;
                      break;
                    }
                    cx_ite14 = cx_ite14.next;
                  }
                  if (ret47 == null) {
                    let ret48;
                    if (ZPP_CbSetPair.zpp_pool == null) {
                      ret48 = new ZPP_CbSetPair();
                    } else {
                      ret48 = ZPP_CbSetPair.zpp_pool;
                      ZPP_CbSetPair.zpp_pool = ret48.next;
                      ret48.next = null;
                    }
                    ret48.zip_listeners = true;
                    if (ZPP_CbSet.setlt(cb11, cb21)) {
                      ret48.a = cb11;
                      ret48.b = cb21;
                    } else {
                      ret48.a = cb21;
                      ret48.b = cb11;
                    }
                    ret47 = ret48;
                    cb11.cbpairs.add(ret47);
                    if (cb21 != cb11) {
                      cb21.cbpairs.add(ret47);
                    }
                  }
                  if (ret47.zip_listeners) {
                    ret47.zip_listeners = false;
                    ret47.__validate();
                  }
                  let cx_ite15 = ret47.listeners.head;
                  while (cx_ite15 != null) {
                    const x4 = cx_ite15.elt;
                    if (x4.event == 5) {
                      if ((x4.itype & inttype1) != 0) {
                        const _this38 = _gthis.prelisteners;
                        let ret49;
                        if (ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool == null) {
                          ret49 = new ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener();
                        } else {
                          ret49 = ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                          ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = ret49.next;
                          ret49.next = null;
                        }
                        ret49.elt = x4;
                        const temp20 = ret49;
                        if (lite1 == null) {
                          temp20.next = _this38.head;
                          _this38.head = temp20;
                        } else {
                          temp20.next = lite1.next;
                          lite1.next = temp20;
                        }
                        _this38.pushmod = _this38.modified = true;
                        _this38.length++;
                        lite1 = temp20;
                        anyimpure1 = anyimpure1 || !x4.pure;
                      }
                    }
                    cx_ite15 = cx_ite15.next;
                  }
                  if (this.prelisteners.head == null) {
                    cx_ite12 = cx_ite12.next;
                    continue;
                  }
                  callbackset1 = ZPP_Space._zpp.phys.ZPP_Interactor.get(i11, i21);
                  if (callbackset1 == null) {
                    ncallbackset1 = ZPP_CallbackSet.get(i11, i21);
                    this.add_callbackset(ncallbackset1);
                  }
                  if (
                    callbackset1 == null ||
                    ((callbackset1.COLLISIONstamp != this.stamp || continuous) &&
                      (callbackset1.COLLISIONstate & 4) == 0)
                  ) {
                    if (ncallbackset1 != null) {
                      callbackset1 = ncallbackset1;
                    }
                    if (callbackset1 != null) {
                      let cx_ite16 = this.prelisteners.head;
                      while (cx_ite16 != null) {
                        const listener3 = cx_ite16.elt;
                        if (listener3.itype == 7) {
                          callbackset1.COLLISIONstamp = this.stamp;
                          callbackset1.SENSORstamp = this.stamp;
                          callbackset1.FLUIDstamp = this.stamp;
                        } else {
                          callbackset1.COLLISIONstamp = this.stamp;
                        }
                        cx_ite16 = cx_ite16.next;
                      }
                    }
                    arb3.mutable = true;
                    if (arb3.wrap_normal != null) {
                      arb3.wrap_normal.zpp_inner._immutable = false;
                    }
                    if (arb3.wrap_contacts != null) {
                      arb3.wrap_contacts.zpp_inner.immutable = false;
                    }
                    const pact1 = arb3.active;
                    arb3.active = true;
                    const emptycontacts1 = false;
                    let fst = true;
                    let pre4 = null;
                    let prei = null;
                    let cx_itei = arb3.innards.next;
                    arb3.hc2 = false;
                    let cx_ite17 = arb3.contacts.next;
                    while (cx_ite17 != null) {
                      const c = cx_ite17;
                      if (c.stamp + ZPP_Space._nape.Config.arbiterExpirationDelay < arb3.stamp) {
                        const _this39 = arb3.contacts;
                        let old4;
                        let ret50;
                        if (pre4 == null) {
                          old4 = _this39.next;
                          ret50 = old4.next;
                          _this39.next = ret50;
                          if (_this39.next == null) {
                            _this39.pushmod = true;
                          }
                        } else {
                          old4 = pre4.next;
                          ret50 = old4.next;
                          pre4.next = ret50;
                          if (ret50 == null) {
                            _this39.pushmod = true;
                          }
                        }
                        old4._inuse = false;
                        _this39.modified = true;
                        _this39.length--;
                        _this39.pushmod = true;
                        cx_ite17 = ret50;
                        const _this40 = arb3.innards;
                        let old5;
                        let ret51;
                        if (prei == null) {
                          old5 = _this40.next;
                          ret51 = old5.next;
                          _this40.next = ret51;
                          if (_this40.next == null) {
                            _this40.pushmod = true;
                          }
                        } else {
                          old5 = prei.next;
                          ret51 = old5.next;
                          prei.next = ret51;
                          if (ret51 == null) {
                            _this40.pushmod = true;
                          }
                        }
                        old5._inuse = false;
                        _this40.modified = true;
                        _this40.length--;
                        _this40.pushmod = true;
                        cx_itei = ret51;
                        const o20 = c;
                        o20.arbiter = null;
                        o20.next = ZPP_Contact.zpp_pool;
                        ZPP_Contact.zpp_pool = o20;
                        continue;
                      }
                      const ci = c.inner;
                      const pact2 = c.active;
                      c.active = c.stamp == arb3.stamp;
                      if (c.active) {
                        if (fst) {
                          fst = false;
                          arb3.c1 = ci;
                          arb3.oc1 = c;
                        } else {
                          arb3.hc2 = true;
                          arb3.c2 = ci;
                          arb3.oc2 = c;
                        }
                      }
                      if (pact2 != c.active) {
                        arb3.contacts.modified = true;
                      }
                      pre4 = cx_ite17;
                      prei = cx_itei;
                      cx_itei = cx_itei.next;
                      cx_ite17 = cx_ite17.next;
                    }
                    if (arb3.hc2) {
                      arb3.hpc2 = true;
                      if (arb3.oc1.posOnly) {
                        const tmp = arb3.c1;
                        arb3.c1 = arb3.c2;
                        arb3.c2 = tmp;
                        const tmp2 = arb3.oc1;
                        arb3.oc1 = arb3.oc2;
                        arb3.oc2 = tmp2;
                        arb3.hc2 = false;
                      } else if (arb3.oc2.posOnly) {
                        arb3.hc2 = false;
                      }
                      if (arb3.oc1.posOnly) {
                        fst = true;
                      }
                    } else {
                      arb3.hpc2 = false;
                    }
                    this.precb.zpp_inner.pre_arbiter = arb3;
                    this.precb.zpp_inner.set = callbackset1;
                    let cx_ite18 = this.prelisteners.head;
                    while (cx_ite18 != null) {
                      const listener4 = cx_ite18.elt;
                      this.precb.zpp_inner.listener = listener4;
                      const cb3 = this.precb.zpp_inner;
                      const o110 = callbackset1.int1;
                      const o22 = callbackset1.int2;
                      let ret52;
                      const _this41 = listener4.options1;
                      const xs2 = o110.cbTypes;
                      if (
                        _this41.nonemptyintersection(xs2, _this41.includes) &&
                        !_this41.nonemptyintersection(xs2, _this41.excludes)
                      ) {
                        const _this42 = listener4.options2;
                        const xs3 = o22.cbTypes;
                        ret52 =
                          _this42.nonemptyintersection(xs3, _this42.includes) &&
                          !_this42.nonemptyintersection(xs3, _this42.excludes);
                      } else {
                        ret52 = false;
                      }
                      if (ret52) {
                        cb3.int1 = o110;
                        cb3.int2 = o22;
                      } else {
                        cb3.int1 = o22;
                        cb3.int2 = o110;
                      }
                      this.precb.zpp_inner.pre_swapped = i11 != this.precb.zpp_inner.int1;
                      const ret53 = listener4.handlerp(this.precb);
                      if (ret53 != null) {
                        let ret54;
                        if (ZPP_Flags.PreFlag_ACCEPT == null) {
                          ZPP_Flags.internal = true;
                          ZPP_Flags.PreFlag_ACCEPT = new ZPP_Space._nape.callbacks.PreFlag();
                          ZPP_Flags.internal = false;
                        }
                        if (ret53 == ZPP_Flags.PreFlag_ACCEPT) {
                          ret54 = 5;
                        } else {
                          if (ZPP_Flags.PreFlag_ACCEPT_ONCE == null) {
                            ZPP_Flags.internal = true;
                            ZPP_Flags.PreFlag_ACCEPT_ONCE = new ZPP_Space._nape.callbacks.PreFlag();
                            ZPP_Flags.internal = false;
                          }
                          if (ret53 == ZPP_Flags.PreFlag_ACCEPT_ONCE) {
                            ret54 = 1;
                          } else {
                            if (ZPP_Flags.PreFlag_IGNORE == null) {
                              ZPP_Flags.internal = true;
                              ZPP_Flags.PreFlag_IGNORE = new ZPP_Space._nape.callbacks.PreFlag();
                              ZPP_Flags.internal = false;
                            }
                            ret54 = ret53 == ZPP_Flags.PreFlag_IGNORE ? 6 : 2;
                          }
                        }
                        arb3.immState = ret54;
                      }
                      cx_ite18 = cx_ite18.next;
                    }
                    arb3.mutable = false;
                    if (arb3.wrap_normal != null) {
                      arb3.wrap_normal.zpp_inner._immutable = true;
                    }
                    if (arb3.wrap_contacts != null) {
                      arb3.wrap_contacts.zpp_inner.immutable = true;
                    }
                    arb3.active = pact1;
                    if (callbackset1 != null) {
                      let cx_ite19 = this.prelisteners.head;
                      while (cx_ite19 != null) {
                        const listener5 = cx_ite19.elt;
                        if (listener5.itype == 7) {
                          callbackset1.COLLISIONstate = arb3.immState;
                          callbackset1.SENSORstate = arb3.immState;
                          callbackset1.FLUIDstate = arb3.immState;
                        } else {
                          callbackset1.COLLISIONstate = arb3.immState;
                        }
                        cx_ite19 = cx_ite19.next;
                      }
                    }
                  } else if (callbackset1 == null) {
                    if ((arb3.immState & 4) == 0) {
                      arb3.immState = 1;
                    }
                  } else {
                    arb3.immState = callbackset1.COLLISIONstate;
                  }
                  cx_ite12 = cx_ite12.next;
                }
                cx_ite11 = cx_ite11.next;
              }
              if (anyimpure1 && (arb3.immState & 4) == 0) {
                if (arb3.b1.type == 2) {
                  const o23 = arb3.b1;
                  if (!o23.world) {
                    o23.component.waket = this.stamp + (this.midstep ? 0 : 1);
                    if (o23.type == 3) {
                      o23.kinematicDelaySleep = true;
                    }
                    if (o23.component.sleeping) {
                      this.really_wake(o23, false);
                    }
                  }
                }
                if (arb3.b1.type == 2) {
                  const o24 = arb3.b2;
                  if (!o24.world) {
                    o24.component.waket = this.stamp + (this.midstep ? 0 : 1);
                    if (o24.type == 3) {
                      o24.kinematicDelaySleep = true;
                    }
                    if (o24.component.sleeping) {
                      this.really_wake(o24, false);
                    }
                  }
                }
              }
            }
            if ((arb3.immState & 1) != 0) {
              if (arb3.b1.type == 2 && arb3.b1.component.sleeping) {
                const o25 = arb3.b1;
                if (!o25.world) {
                  o25.component.waket = this.stamp + (this.midstep ? 0 : 1);
                  if (o25.type == 3) {
                    o25.kinematicDelaySleep = true;
                  }
                  if (o25.component.sleeping) {
                    this.really_wake(o25, false);
                  }
                }
              }
              if (arb3.b2.type == 2 && arb3.b2.component.sleeping) {
                const o26 = arb3.b2;
                if (!o26.world) {
                  o26.component.waket = this.stamp + (this.midstep ? 0 : 1);
                  if (o26.type == 3) {
                    o26.kinematicDelaySleep = true;
                  }
                  if (o26.component.sleeping) {
                    this.really_wake(o26, false);
                  }
                }
              }
            }
            if (arb3.sleeping) {
              arb3.sleeping = false;
              let ret55;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool == null) {
                ret55 = new ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter();
              } else {
                ret55 = ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_ColArbiter.zpp_pool = ret55.next;
                ret55.next = null;
              }
              ret55.elt = arb3;
              const temp21 = ret55;
              temp21.next = carbs.head;
              carbs.head = temp21;
              carbs.modified = true;
              carbs.length++;
            }
            ret = arb3;
          } else if (first1) {
            const o27 = arb3;
            o27.userdef_dyn_fric = false;
            o27.userdef_stat_fric = false;
            o27.userdef_restitution = false;
            o27.userdef_rfric = false;
            o27.__ref_edge1 = o27.__ref_edge2 = null;
            o27.next = ZPP_ColArbiter.zpp_pool;
            ZPP_ColArbiter.zpp_pool = o27;
            ret = null;
          } else {
            ret = arb3;
          }
        } else {
          ret = arb3;
        }
      } else {
        let xarb2;
        if (in_arb == null) {
          let ret56 = null;
          const b6 = b1.arbiters.length < b2.arbiters.length ? b1 : b2;
          let cx_ite20 = b6.arbiters.head;
          while (cx_ite20 != null) {
            const arb4 = cx_ite20.elt;
            if (arb4.id == sa.id && arb4.di == sb.id) {
              ret56 = arb4;
              break;
            }
            cx_ite20 = cx_ite20.next;
          }
          xarb2 = ret56;
        } else {
          xarb2 = in_arb;
        }
        let first2 = xarb2 == null;
        let arb5;
        let swapped2 = false;
        if (first2) {
          if (ZPP_SensorArbiter.zpp_pool == null) {
            arb5 = new ZPP_SensorArbiter();
          } else {
            arb5 = ZPP_SensorArbiter.zpp_pool;
            ZPP_SensorArbiter.zpp_pool = arb5.next;
            arb5.next = null;
          }
        } else if (xarb2.sensorarb == null) {
          const b7 = null;
          xarb2.cleared = true;
          if (b7 == null || xarb2.b2 == b7) {
            const _this43 = xarb2.b1.arbiters;
            let pre5 = null;
            let cur6 = _this43.head;
            let ret57 = false;
            while (cur6 != null) {
              if (cur6.elt == xarb2) {
                let old6;
                let ret58;
                if (pre5 == null) {
                  old6 = _this43.head;
                  ret58 = old6.next;
                  _this43.head = ret58;
                  if (_this43.head == null) {
                    _this43.pushmod = true;
                  }
                } else {
                  old6 = pre5.next;
                  ret58 = old6.next;
                  pre5.next = ret58;
                  if (ret58 == null) {
                    _this43.pushmod = true;
                  }
                }
                const o28 = old6;
                o28.elt = null;
                o28.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o28;
                _this43.modified = true;
                _this43.length--;
                _this43.pushmod = true;
                ret57 = true;
                break;
              }
              pre5 = cur6;
              cur6 = cur6.next;
            }
          }
          if (b7 == null || xarb2.b1 == b7) {
            const _this44 = xarb2.b2.arbiters;
            let pre6 = null;
            let cur7 = _this44.head;
            let ret59 = false;
            while (cur7 != null) {
              if (cur7.elt == xarb2) {
                let old7;
                let ret60;
                if (pre6 == null) {
                  old7 = _this44.head;
                  ret60 = old7.next;
                  _this44.head = ret60;
                  if (_this44.head == null) {
                    _this44.pushmod = true;
                  }
                } else {
                  old7 = pre6.next;
                  ret60 = old7.next;
                  pre6.next = ret60;
                  if (ret60 == null) {
                    _this44.pushmod = true;
                  }
                }
                const o29 = old7;
                o29.elt = null;
                o29.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o29;
                _this44.modified = true;
                _this44.length--;
                _this44.pushmod = true;
                ret59 = true;
                break;
              }
              pre6 = cur7;
              cur7 = cur7.next;
            }
          }
          if (xarb2.pair != null) {
            xarb2.pair.arb = null;
            xarb2.pair = null;
          }
          xarb2.active = false;
          this.f_arbiters.modified = true;
          if (ZPP_SensorArbiter.zpp_pool == null) {
            arb5 = new ZPP_SensorArbiter();
          } else {
            arb5 = ZPP_SensorArbiter.zpp_pool;
            ZPP_SensorArbiter.zpp_pool = arb5.next;
            arb5.next = null;
          }
          arb5.intchange = true;
          first2 = true;
          swapped2 = true;
        } else {
          arb5 = xarb2.sensorarb;
        }
        const inttype2 = 2;
        if (first2 || arb5.stamp != this.stamp || continuous) {
          arb5.stamp = this.stamp;
          if (ZPP_Collide.testCollide(sa, sb)) {
            if (first2) {
              const di2 = sb.id;
              arb5.b1 = s1.body;
              arb5.ws1 = s1;
              arb5.b2 = s2.body;
              arb5.ws2 = s2;
              arb5.id = sa.id;
              arb5.di = di2;
              const _this45 = arb5.b1.arbiters;
              let ret61;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                ret61 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
              } else {
                ret61 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret61.next;
                ret61.next = null;
              }
              ret61.elt = arb5;
              const temp22 = ret61;
              temp22.next = _this45.head;
              _this45.head = temp22;
              _this45.modified = true;
              _this45.length++;
              const _this46 = arb5.b2.arbiters;
              let ret62;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool == null) {
                ret62 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter();
              } else {
                ret62 = ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = ret62.next;
                ret62.next = null;
              }
              ret62.elt = arb5;
              const temp23 = ret62;
              temp23.next = _this46.head;
              _this46.head = temp23;
              _this46.modified = true;
              _this46.length++;
              arb5.active = true;
              arb5.present = 0;
              arb5.cleared = false;
              arb5.sleeping = false;
              arb5.fresh = false;
              arb5.presentable = false;
              const _this47 = this.s_arbiters;
              let ret63;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool == null) {
                ret63 = new ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter();
              } else {
                ret63 = ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = ret63.next;
                ret63.next = null;
              }
              ret63.elt = arb5;
              const temp24 = ret63;
              temp24.next = _this47.head;
              _this47.head = temp24;
              _this47.modified = true;
              _this47.length++;
              arb5.fresh = !swapped2;
            } else {
              arb5.fresh =
                arb5.up_stamp < this.stamp - 1 || (arb5.endGenerated == this.stamp && continuous);
            }
            arb5.up_stamp = arb5.stamp;
            if (arb5.fresh || (arb5.immState & 4) == 0) {
              arb5.immState = 1;
              let anyimpure2 = false;
              const arbs12 = arb5.ws1.id > arb5.ws2.id ? arb5.ws2 : arb5.ws1;
              const arbs22 = arb5.ws1.id > arb5.ws2.id ? arb5.ws1 : arb5.ws2;
              const _this48 = this.mrca1;
              while (_this48.head != null) {
                const ret64 = _this48.head;
                _this48.head = ret64.next;
                const o30 = ret64;
                o30.elt = null;
                o30.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o30;
                if (_this48.head == null) {
                  _this48.pushmod = true;
                }
                _this48.modified = true;
                _this48.length--;
              }
              _this48.pushmod = true;
              const _this49 = this.mrca2;
              while (_this49.head != null) {
                const ret65 = _this49.head;
                _this49.head = ret65.next;
                const o31 = ret65;
                o31.elt = null;
                o31.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o31;
                if (_this49.head == null) {
                  _this49.pushmod = true;
                }
                _this49.modified = true;
                _this49.length--;
              }
              _this49.pushmod = true;
              if (arbs12.cbSet != null) {
                const _this50 = this.mrca1;
                let ret66;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret66 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret66 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret66.next;
                  ret66.next = null;
                }
                ret66.elt = arbs12;
                const temp25 = ret66;
                temp25.next = _this50.head;
                _this50.head = temp25;
                _this50.modified = true;
                _this50.length++;
              }
              if (arbs12.body.cbSet != null) {
                const _this51 = this.mrca1;
                const o32 = arbs12.body;
                let ret67;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret67 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret67 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret67.next;
                  ret67.next = null;
                }
                ret67.elt = o32;
                const temp26 = ret67;
                temp26.next = _this51.head;
                _this51.head = temp26;
                _this51.modified = true;
                _this51.length++;
              }
              if (arbs22.cbSet != null) {
                const _this52 = this.mrca2;
                let ret68;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret68 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret68 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret68.next;
                  ret68.next = null;
                }
                ret68.elt = arbs22;
                const temp27 = ret68;
                temp27.next = _this52.head;
                _this52.head = temp27;
                _this52.modified = true;
                _this52.length++;
              }
              if (arbs22.body.cbSet != null) {
                const _this53 = this.mrca2;
                const o33 = arbs22.body;
                let ret69;
                if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                  ret69 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                } else {
                  ret69 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                  ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret69.next;
                  ret69.next = null;
                }
                ret69.elt = o33;
                const temp28 = ret69;
                temp28.next = _this53.head;
                _this53.head = temp28;
                _this53.modified = true;
                _this53.length++;
              }
              let c12 = arbs12.body.compound;
              let c22 = arbs22.body.compound;
              while (c12 != c22) {
                const d12 = c12 == null ? 0 : c12.depth;
                const d22 = c22 == null ? 0 : c22.depth;
                if (d12 < d22) {
                  if (c22.cbSet != null) {
                    const _this54 = this.mrca2;
                    let ret70;
                    if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                      ret70 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                    } else {
                      ret70 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret70.next;
                      ret70.next = null;
                    }
                    ret70.elt = c22;
                    const temp29 = ret70;
                    temp29.next = _this54.head;
                    _this54.head = temp29;
                    _this54.modified = true;
                    _this54.length++;
                  }
                  c22 = c22.compound;
                } else {
                  if (c12.cbSet != null) {
                    const _this55 = this.mrca1;
                    let ret71;
                    if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
                      ret71 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
                    } else {
                      ret71 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
                      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret71.next;
                      ret71.next = null;
                    }
                    ret71.elt = c12;
                    const temp30 = ret71;
                    temp30.next = _this55.head;
                    _this55.head = temp30;
                    _this55.modified = true;
                    _this55.length++;
                  }
                  c12 = c12.compound;
                }
              }
              let cx_ite21 = this.mrca1.head;
              while (cx_ite21 != null) {
                const i12 = cx_ite21.elt;
                let cx_ite22 = this.mrca2.head;
                while (cx_ite22 != null) {
                  const i22 = cx_ite22.elt;
                  const cb12 = i12.cbSet;
                  const cb22 = i22.cbSet;
                  const _this56 = cb12.manager;
                  let ret72 = null;
                  const pairs4 =
                    cb12.cbpairs.length < cb22.cbpairs.length ? cb12.cbpairs : cb22.cbpairs;
                  let cx_ite23 = pairs4.head;
                  while (cx_ite23 != null) {
                    const p4 = cx_ite23.elt;
                    if ((p4.a == cb12 && p4.b == cb22) || (p4.a == cb22 && p4.b == cb12)) {
                      ret72 = p4;
                      break;
                    }
                    cx_ite23 = cx_ite23.next;
                  }
                  if (ret72 == null) {
                    let ret73;
                    if (ZPP_CbSetPair.zpp_pool == null) {
                      ret73 = new ZPP_CbSetPair();
                    } else {
                      ret73 = ZPP_CbSetPair.zpp_pool;
                      ZPP_CbSetPair.zpp_pool = ret73.next;
                      ret73.next = null;
                    }
                    ret73.zip_listeners = true;
                    if (ZPP_CbSet.setlt(cb12, cb22)) {
                      ret73.a = cb12;
                      ret73.b = cb22;
                    } else {
                      ret73.a = cb22;
                      ret73.b = cb12;
                    }
                    ret72 = ret73;
                    cb12.cbpairs.add(ret72);
                    if (cb22 != cb12) {
                      cb22.cbpairs.add(ret72);
                    }
                  }
                  if (ret72.zip_listeners) {
                    ret72.zip_listeners = false;
                    ret72.__validate();
                  }
                  if (ret72.listeners.head == null) {
                    cx_ite22 = cx_ite22.next;
                    continue;
                  }
                  let callbackset2 = null;
                  let ncallbackset2 = null;
                  const _this57 = this.prelisteners;
                  while (_this57.head != null) {
                    const ret74 = _this57.head;
                    _this57.head = ret74.next;
                    const o34 = ret74;
                    o34.elt = null;
                    o34.next = ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                    ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = o34;
                    if (_this57.head == null) {
                      _this57.pushmod = true;
                    }
                    _this57.modified = true;
                    _this57.length--;
                  }
                  _this57.pushmod = true;
                  let lite2 = null;
                  const _this58 = cb12.manager;
                  let ret75 = null;
                  const pairs5 =
                    cb12.cbpairs.length < cb22.cbpairs.length ? cb12.cbpairs : cb22.cbpairs;
                  let cx_ite24 = pairs5.head;
                  while (cx_ite24 != null) {
                    const p5 = cx_ite24.elt;
                    if ((p5.a == cb12 && p5.b == cb22) || (p5.a == cb22 && p5.b == cb12)) {
                      ret75 = p5;
                      break;
                    }
                    cx_ite24 = cx_ite24.next;
                  }
                  if (ret75 == null) {
                    let ret76;
                    if (ZPP_CbSetPair.zpp_pool == null) {
                      ret76 = new ZPP_CbSetPair();
                    } else {
                      ret76 = ZPP_CbSetPair.zpp_pool;
                      ZPP_CbSetPair.zpp_pool = ret76.next;
                      ret76.next = null;
                    }
                    ret76.zip_listeners = true;
                    if (ZPP_CbSet.setlt(cb12, cb22)) {
                      ret76.a = cb12;
                      ret76.b = cb22;
                    } else {
                      ret76.a = cb22;
                      ret76.b = cb12;
                    }
                    ret75 = ret76;
                    cb12.cbpairs.add(ret75);
                    if (cb22 != cb12) {
                      cb22.cbpairs.add(ret75);
                    }
                  }
                  if (ret75.zip_listeners) {
                    ret75.zip_listeners = false;
                    ret75.__validate();
                  }
                  let cx_ite25 = ret75.listeners.head;
                  while (cx_ite25 != null) {
                    const x5 = cx_ite25.elt;
                    if (x5.event == 5) {
                      if ((x5.itype & inttype2) != 0) {
                        const _this59 = _gthis.prelisteners;
                        let ret77;
                        if (ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool == null) {
                          ret77 = new ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener();
                        } else {
                          ret77 = ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool;
                          ZPP_Space._zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = ret77.next;
                          ret77.next = null;
                        }
                        ret77.elt = x5;
                        const temp31 = ret77;
                        if (lite2 == null) {
                          temp31.next = _this59.head;
                          _this59.head = temp31;
                        } else {
                          temp31.next = lite2.next;
                          lite2.next = temp31;
                        }
                        _this59.pushmod = _this59.modified = true;
                        _this59.length++;
                        lite2 = temp31;
                        anyimpure2 = anyimpure2 || !x5.pure;
                      }
                    }
                    cx_ite25 = cx_ite25.next;
                  }
                  if (this.prelisteners.head == null) {
                    cx_ite22 = cx_ite22.next;
                    continue;
                  }
                  callbackset2 = ZPP_Space._zpp.phys.ZPP_Interactor.get(i12, i22);
                  if (callbackset2 == null) {
                    ncallbackset2 = ZPP_CallbackSet.get(i12, i22);
                    this.add_callbackset(ncallbackset2);
                  }
                  if (
                    callbackset2 == null ||
                    ((callbackset2.SENSORstamp != this.stamp || continuous) &&
                      (callbackset2.SENSORstate & 4) == 0)
                  ) {
                    if (ncallbackset2 != null) {
                      callbackset2 = ncallbackset2;
                    }
                    if (callbackset2 != null) {
                      let cx_ite26 = this.prelisteners.head;
                      while (cx_ite26 != null) {
                        const listener6 = cx_ite26.elt;
                        if (listener6.itype == 7) {
                          callbackset2.COLLISIONstamp = this.stamp;
                          callbackset2.SENSORstamp = this.stamp;
                          callbackset2.FLUIDstamp = this.stamp;
                        } else {
                          callbackset2.SENSORstamp = this.stamp;
                        }
                        cx_ite26 = cx_ite26.next;
                      }
                    }
                    const pact3 = arb5.active;
                    arb5.active = true;
                    const emptycontacts2 = false;
                    this.precb.zpp_inner.pre_arbiter = arb5;
                    this.precb.zpp_inner.set = callbackset2;
                    let cx_ite27 = this.prelisteners.head;
                    while (cx_ite27 != null) {
                      const listener7 = cx_ite27.elt;
                      this.precb.zpp_inner.listener = listener7;
                      const cb4 = this.precb.zpp_inner;
                      const o111 = callbackset2.int1;
                      const o210 = callbackset2.int2;
                      let ret78;
                      const _this60 = listener7.options1;
                      const xs4 = o111.cbTypes;
                      if (
                        _this60.nonemptyintersection(xs4, _this60.includes) &&
                        !_this60.nonemptyintersection(xs4, _this60.excludes)
                      ) {
                        const _this61 = listener7.options2;
                        const xs5 = o210.cbTypes;
                        ret78 =
                          _this61.nonemptyintersection(xs5, _this61.includes) &&
                          !_this61.nonemptyintersection(xs5, _this61.excludes);
                      } else {
                        ret78 = false;
                      }
                      if (ret78) {
                        cb4.int1 = o111;
                        cb4.int2 = o210;
                      } else {
                        cb4.int1 = o210;
                        cb4.int2 = o111;
                      }
                      this.precb.zpp_inner.pre_swapped = i12 != this.precb.zpp_inner.int1;
                      const ret79 = listener7.handlerp(this.precb);
                      if (ret79 != null) {
                        let ret80;
                        if (ZPP_Flags.PreFlag_ACCEPT == null) {
                          ZPP_Flags.internal = true;
                          ZPP_Flags.PreFlag_ACCEPT = new ZPP_Space._nape.callbacks.PreFlag();
                          ZPP_Flags.internal = false;
                        }
                        if (ret79 == ZPP_Flags.PreFlag_ACCEPT) {
                          ret80 = 5;
                        } else {
                          if (ZPP_Flags.PreFlag_ACCEPT_ONCE == null) {
                            ZPP_Flags.internal = true;
                            ZPP_Flags.PreFlag_ACCEPT_ONCE = new ZPP_Space._nape.callbacks.PreFlag();
                            ZPP_Flags.internal = false;
                          }
                          if (ret79 == ZPP_Flags.PreFlag_ACCEPT_ONCE) {
                            ret80 = 1;
                          } else {
                            if (ZPP_Flags.PreFlag_IGNORE == null) {
                              ZPP_Flags.internal = true;
                              ZPP_Flags.PreFlag_IGNORE = new ZPP_Space._nape.callbacks.PreFlag();
                              ZPP_Flags.internal = false;
                            }
                            ret80 = ret79 == ZPP_Flags.PreFlag_IGNORE ? 6 : 2;
                          }
                        }
                        arb5.immState = ret80;
                      }
                      cx_ite27 = cx_ite27.next;
                    }
                    arb5.active = pact3;
                    if (callbackset2 != null) {
                      let cx_ite28 = this.prelisteners.head;
                      while (cx_ite28 != null) {
                        const listener8 = cx_ite28.elt;
                        if (listener8.itype == 7) {
                          callbackset2.COLLISIONstate = arb5.immState;
                          callbackset2.SENSORstate = arb5.immState;
                          callbackset2.FLUIDstate = arb5.immState;
                        } else {
                          callbackset2.SENSORstate = arb5.immState;
                        }
                        cx_ite28 = cx_ite28.next;
                      }
                    }
                  } else if (callbackset2 == null) {
                    if ((arb5.immState & 4) == 0) {
                      arb5.immState = 1;
                    }
                  } else {
                    arb5.immState = callbackset2.SENSORstate;
                  }
                  cx_ite22 = cx_ite22.next;
                }
                cx_ite21 = cx_ite21.next;
              }
              if (anyimpure2 && (arb5.immState & 4) == 0) {
                if (arb5.b1.type != 1) {
                  const o35 = arb5.b1;
                  if (!o35.world) {
                    o35.component.waket = this.stamp + (this.midstep ? 0 : 1);
                    if (o35.type == 3) {
                      o35.kinematicDelaySleep = true;
                    }
                    if (o35.component.sleeping) {
                      this.really_wake(o35, false);
                    }
                  }
                }
                if (arb5.b2.type != 1) {
                  const o36 = arb5.b2;
                  if (!o36.world) {
                    o36.component.waket = this.stamp + (this.midstep ? 0 : 1);
                    if (o36.type == 3) {
                      o36.kinematicDelaySleep = true;
                    }
                    if (o36.component.sleeping) {
                      this.really_wake(o36, false);
                    }
                  }
                }
              }
            }
            if (arb5.sleeping) {
              arb5.sleeping = false;
              const _this62 = this.s_arbiters;
              let ret81;
              if (ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool == null) {
                ret81 = new ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter();
              } else {
                ret81 = ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool;
                ZPP_Space._zpp.util.ZNPNode_ZPP_SensorArbiter.zpp_pool = ret81.next;
                ret81.next = null;
              }
              ret81.elt = arb5;
              const temp32 = ret81;
              temp32.next = _this62.head;
              _this62.head = temp32;
              _this62.modified = true;
              _this62.length++;
            }
            ret = arb5;
          } else if (first2) {
            const o37 = arb5;
            o37.next = ZPP_SensorArbiter.zpp_pool;
            ZPP_SensorArbiter.zpp_pool = o37;
            ret = null;
          } else {
            ret = arb5;
          }
        } else {
          ret = arb5;
        }
      }
    }
    return ret;
  }

  MRCA_chains(s1: any, s2: any) {
    const _this = this.mrca1;
    while (_this.head != null) {
      const ret = _this.head;
      _this.head = ret.next;
      const o = ret;
      o.elt = null;
      o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o;
      if (_this.head == null) {
        _this.pushmod = true;
      }
      _this.modified = true;
      _this.length--;
    }
    _this.pushmod = true;
    const _this1 = this.mrca2;
    while (_this1.head != null) {
      const ret1 = _this1.head;
      _this1.head = ret1.next;
      const o1 = ret1;
      o1.elt = null;
      o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o1;
      if (_this1.head == null) {
        _this1.pushmod = true;
      }
      _this1.modified = true;
      _this1.length--;
    }
    _this1.pushmod = true;
    if (s1.cbSet != null) {
      const _this2 = this.mrca1;
      let ret2;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret2 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret2 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret2.next;
        ret2.next = null;
      }
      ret2.elt = s1;
      const temp = ret2;
      temp.next = _this2.head;
      _this2.head = temp;
      _this2.modified = true;
      _this2.length++;
    }
    if (s1.body.cbSet != null) {
      const _this3 = this.mrca1;
      const o2 = s1.body;
      let ret3;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret3.next;
        ret3.next = null;
      }
      ret3.elt = o2;
      const temp1 = ret3;
      temp1.next = _this3.head;
      _this3.head = temp1;
      _this3.modified = true;
      _this3.length++;
    }
    if (s2.cbSet != null) {
      const _this4 = this.mrca2;
      let ret4;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret4 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret4 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret4.next;
        ret4.next = null;
      }
      ret4.elt = s2;
      const temp2 = ret4;
      temp2.next = _this4.head;
      _this4.head = temp2;
      _this4.modified = true;
      _this4.length++;
    }
    if (s2.body.cbSet != null) {
      const _this5 = this.mrca2;
      const o3 = s2.body;
      let ret5;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret5 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret5 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret5.next;
        ret5.next = null;
      }
      ret5.elt = o3;
      const temp3 = ret5;
      temp3.next = _this5.head;
      _this5.head = temp3;
      _this5.modified = true;
      _this5.length++;
    }
    let c1 = s1.body.compound;
    let c2 = s2.body.compound;
    while (c1 != c2) {
      const d1 = c1 == null ? 0 : c1.depth;
      const d2 = c2 == null ? 0 : c2.depth;
      if (d1 < d2) {
        if (c2.cbSet != null) {
          const _this6 = this.mrca2;
          let ret6;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret6 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret6 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret6.next;
            ret6.next = null;
          }
          ret6.elt = c2;
          const temp4 = ret6;
          temp4.next = _this6.head;
          _this6.head = temp4;
          _this6.modified = true;
          _this6.length++;
        }
        c2 = c2.compound;
      } else {
        if (c1.cbSet != null) {
          const _this7 = this.mrca1;
          let ret7;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret7 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret7 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret7.next;
            ret7.next = null;
          }
          ret7.elt = c1;
          const temp5 = ret7;
          temp5.next = _this7.head;
          _this7.head = temp5;
          _this7.modified = true;
          _this7.length++;
        }
        c1 = c1.compound;
      }
    }
  }

  inlined_MRCA_chains(s1: any, s2: any) {
    const _this = this.mrca1;
    while (_this.head != null) {
      const ret = _this.head;
      _this.head = ret.next;
      const o = ret;
      o.elt = null;
      o.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o;
      if (_this.head == null) {
        _this.pushmod = true;
      }
      _this.modified = true;
      _this.length--;
    }
    _this.pushmod = true;
    const _this1 = this.mrca2;
    while (_this1.head != null) {
      const ret1 = _this1.head;
      _this1.head = ret1.next;
      const o1 = ret1;
      o1.elt = null;
      o1.next = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
      ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = o1;
      if (_this1.head == null) {
        _this1.pushmod = true;
      }
      _this1.modified = true;
      _this1.length--;
    }
    _this1.pushmod = true;
    if (s1.cbSet != null) {
      const _this2 = this.mrca1;
      let ret2;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret2 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret2 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret2.next;
        ret2.next = null;
      }
      ret2.elt = s1;
      const temp = ret2;
      temp.next = _this2.head;
      _this2.head = temp;
      _this2.modified = true;
      _this2.length++;
    }
    if (s1.body.cbSet != null) {
      const _this3 = this.mrca1;
      const o2 = s1.body;
      let ret3;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret3 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret3 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret3.next;
        ret3.next = null;
      }
      ret3.elt = o2;
      const temp1 = ret3;
      temp1.next = _this3.head;
      _this3.head = temp1;
      _this3.modified = true;
      _this3.length++;
    }
    if (s2.cbSet != null) {
      const _this4 = this.mrca2;
      let ret4;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret4 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret4 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret4.next;
        ret4.next = null;
      }
      ret4.elt = s2;
      const temp2 = ret4;
      temp2.next = _this4.head;
      _this4.head = temp2;
      _this4.modified = true;
      _this4.length++;
    }
    if (s2.body.cbSet != null) {
      const _this5 = this.mrca2;
      const o3 = s2.body;
      let ret5;
      if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
        ret5 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
      } else {
        ret5 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
        ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret5.next;
        ret5.next = null;
      }
      ret5.elt = o3;
      const temp3 = ret5;
      temp3.next = _this5.head;
      _this5.head = temp3;
      _this5.modified = true;
      _this5.length++;
    }
    let c1 = s1.body.compound;
    let c2 = s2.body.compound;
    while (c1 != c2) {
      const d1 = c1 == null ? 0 : c1.depth;
      const d2 = c2 == null ? 0 : c2.depth;
      if (d1 < d2) {
        if (c2.cbSet != null) {
          const _this6 = this.mrca2;
          let ret6;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret6 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret6 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret6.next;
            ret6.next = null;
          }
          ret6.elt = c2;
          const temp4 = ret6;
          temp4.next = _this6.head;
          _this6.head = temp4;
          _this6.modified = true;
          _this6.length++;
        }
        c2 = c2.compound;
      } else {
        if (c1.cbSet != null) {
          const _this7 = this.mrca1;
          let ret7;
          if (ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool == null) {
            ret7 = new ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor();
          } else {
            ret7 = ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool;
            ZPP_Space._zpp.util.ZNPNode_ZPP_Interactor.zpp_pool = ret7.next;
            ret7.next = null;
          }
          ret7.elt = c1;
          const temp5 = ret7;
          temp5.next = _this7.head;
          _this7.head = temp5;
          _this7.modified = true;
          _this7.length++;
        }
        c1 = c1.compound;
      }
    }
  }
}
