/**
 * ZPP_Body — Internal body representation for the nape physics engine.
 *
 * Core physics body managing position, velocity, mass, inertia, shapes, and
 * CCD (continuous collision detection) sweep integration.
 * Extends ZPP_Interactor (still in compiled code — methods copied at init time).
 *
 * Converted from nape-compiled.js lines 52431–54547.
 */

import { ZPP_AABB } from "../geom/ZPP_AABB";
import { ZPP_Vec2 } from "../geom/ZPP_Vec2";
import { ZPP_PubPool } from "../util/ZPP_PubPool";

type Any = any;

export class ZPP_Body {
  // --- Static: Haxe metadata ---
  static __name__ = ["zpp_nape", "phys", "ZPP_Body"];
  static __super__: Any = null; // Set at _init time to ZPP_Interactor

  /**
   * Namespace references, set by the compiled module after import.
   * _nape = the `nape` public namespace
   * _zpp = the `zpp_nape` internal namespace
   */
  static _nape: Any = null;
  static _zpp: Any = null;

  // --- Static fields ---
  static types: Any[] = []; // [null, STATIC, DYNAMIC, KINEMATIC] BodyType singletons
  static bodystack: Any = null;
  static bodyset: Any = null;
  static cur_graph_depth: number = 0;

  static bodysetlt(a: Any, b: Any): boolean {
    return a.id < b.id;
  }

  static __static(): Any {
    const nape = ZPP_Body._nape;
    const zpp = ZPP_Body._zpp;
    if (zpp.util.ZPP_Flags.BodyType_STATIC == null) {
      zpp.util.ZPP_Flags.internal = true;
      zpp.util.ZPP_Flags.BodyType_STATIC = new nape.phys.BodyType();
      zpp.util.ZPP_Flags.internal = false;
    }
    const ret = new nape.phys.Body(zpp.util.ZPP_Flags.BodyType_STATIC);
    const si = ret.zpp_inner;
    si.world = true;
    si.wrap_shapes.zpp_inner.immutable = true;
    si.smass = si.imass = si.cmass = si.mass = si.gravMass = 0.0;
    si.sinertia = si.iinertia = si.cinertia = si.inertia = 0.0;
    si.cbTypes.clear();
    return ret;
  }

  // --- ZPP_Interactor fields (base class, not extracted) ---
  outer_i: Any = null;
  id: number = 0;
  userData: Any = null;
  ishape: Any = null;
  ibody: Any = null;
  icompound: Any = null;
  wrap_cbTypes: Any = null;
  cbSet: Any = null;
  cbTypes: Any = null;
  group: Any = null;
  cbsets: Any = null;

  // --- ZPP_Body own fields ---
  outer: Any = null;
  world: boolean = false;
  type: number = 0;

  // Compound reference
  compound: Any = null;

  // Shape list
  shapes: Any = null;
  wrap_shapes: Any = null;

  // Space and connections
  space: Any = null;
  arbiters: Any = null;
  wrap_arbiters: Any = null;
  constraints: Any = null;
  wrap_constraints: Any = null;
  component: Any = null;
  graph_depth: number = 0;

  // Sweep / CCD
  sweepTime: number = 0;
  sweep_angvel: number = 0;
  sweepFrozen: boolean = false;
  sweepRadius: number = 0;
  bullet: boolean = false;
  bulletEnabled: boolean = false;
  disableCCD: boolean = false;

  // Position
  pre_posx: number = 0;
  pre_posy: number = 0;
  posx: number = 0;
  posy: number = 0;
  wrap_pos: Any = null;

  // Velocity
  velx: number = 0;
  vely: number = 0;
  wrap_vel: Any = null;

  // Force
  forcex: number = 0;
  forcey: number = 0;
  wrap_force: Any = null;

  // Kinematic velocity
  kinvelx: number = 0;
  kinvely: number = 0;
  wrap_kinvel: Any = null;

  // Surface velocity
  svelx: number = 0;
  svely: number = 0;
  wrap_svel: Any = null;

  // Composite velocity wrapper
  wrapcvel: Any = null;

  // Angular
  angvel: number = 0;
  torque: number = 0;
  kinangvel: number = 0;
  pre_rot: number = 0;
  rot: number = 0;

  // Rotation axis (cached sin/cos)
  axisx: number = 0;
  axisy: number = 0;
  zip_axis: boolean = false;

  // Kinematic delay sleep flag
  kinematicDelaySleep: boolean = false;

  // Mass
  mass: number = 0;
  zip_mass: boolean = false;
  massMode: number = 0;
  imass: number = 0;
  smass: number = 0;
  cmass: number = 0;
  nomove: boolean = false;

  // Gravity mass
  gravMass: number = 0;
  zip_gravMass: boolean = false;
  gravMassMode: number = 0;
  gravMassScale: number = 0;
  zip_gravMassScale: boolean = false;

  // Inertia
  inertiaMode: number = 0;
  inertia: number = 0;
  zip_inertia: boolean = false;
  cinertia: number = 0;
  iinertia: number = 0;
  sinertia: number = 0;
  norotate: boolean = false;

  // AABB
  aabb: ZPP_AABB = null!;
  zip_aabb: boolean = false;

  // Center of mass
  localCOMx: number = 0;
  localCOMy: number = 0;
  zip_localCOM: boolean = false;
  worldCOMx: number = 0;
  worldCOMy: number = 0;
  zip_worldCOM: boolean = false;
  wrap_localCOM: Any = null;
  wrap_worldCOM: Any = null;

  __class__: Any = ZPP_Body;

  constructor() {
    const zpp = ZPP_Body._zpp;

    // ZPP_Interactor constructor init
    zpp.phys.ZPP_Interactor.call(this);

    // ZPP_Body-specific init
    this.ibody = this;
    this.world = false;
    this.bulletEnabled = false;
    this.sweepTime = 0;
    this.sweep_angvel = 0;
    this.norotate = this.nomove = false;
    this.disableCCD = false;

    this.posx = 0;
    this.posy = 0;
    this.rot = 0;
    this.axisx = 0;
    this.axisy = 1;
    this.svelx = 0;
    this.svely = 0;
    this.velx = 0;
    this.vely = 0;
    this.kinvelx = 0;
    this.kinvely = 0;
    this.forcex = 0;
    this.forcey = 0;
    this.torque = this.angvel = this.kinangvel = 0;

    this.pre_posx = Infinity;
    this.pre_posy = Infinity;
    this.pre_rot = Infinity;

    this.localCOMx = 0;
    this.localCOMy = 0;
    this.worldCOMx = 0;
    this.worldCOMy = 0;

    this.zip_aabb = true;

    // Pool or create AABB
    let aabb: ZPP_AABB;
    if (ZPP_AABB.zpp_pool == null) {
      aabb = new ZPP_AABB();
    } else {
      aabb = ZPP_AABB.zpp_pool;
      ZPP_AABB.zpp_pool = aabb.next;
      aabb.next = null;
    }
    aabb.minx = 0;
    aabb.miny = 0;
    aabb.maxx = 0;
    aabb.maxy = 0;
    this.aabb = aabb;
    this.aabb._immutable = true;
    this.aabb._validate = this.aabb_validate.bind(this);

    this.massMode = 0;
    this.gravMassMode = 0;
    this.gravMassScale = 1.0;
    this.inertiaMode = 0;

    this.arbiters = new zpp.util.ZNPList_ZPP_Arbiter();
    this.constraints = new zpp.util.ZNPList_ZPP_Constraint();
    this.shapes = new zpp.util.ZNPList_ZPP_Shape();
    this.wrap_shapes = zpp.util.ZPP_ShapeList.get(this.shapes);
    this.wrap_shapes.zpp_inner.adder = this.shapes_adder.bind(this);
    this.wrap_shapes.zpp_inner.subber = this.shapes_subber.bind(this);
    this.wrap_shapes.zpp_inner._invalidate = this.shapes_invalidate.bind(this);
    this.wrap_shapes.zpp_inner._modifiable =
      this.shapes_modifiable.bind(this);

    this.kinematicDelaySleep = false;
  }

  // ---- Type checking ----

  isStatic(): boolean {
    return this.type === 1;
  }

  isDynamic(): boolean {
    return this.type === 2;
  }

  isKinematic(): boolean {
    return this.type === 3;
  }

  invalidate_type(): void {
    this.invalidate_mass();
    this.invalidate_inertia();
  }

  // ---- Shape invalidation ----

  invalidate_shapes(): void {
    this.zip_aabb = true;
    this.zip_localCOM = true;
    this.zip_worldCOM = true;
    this.invalidate_mass();
    this.invalidate_inertia();
  }

  // ---- Body set operations (graph traversal) ----

  init_bodysetlist(): void {
    if (ZPP_Body.bodyset == null) {
      const zpp = ZPP_Body._zpp;
      ZPP_Body.bodyset = new zpp.util.ZPP_Set_ZPP_Body();
      ZPP_Body.bodyset.lt = ZPP_Body.bodysetlt;
      ZPP_Body.bodystack = new zpp.util.ZNPList_ZPP_Body();
    }
  }

  connectedBodies_cont(b: Any): void {
    if (ZPP_Body.bodyset.try_insert_bool(b.zpp_inner)) {
      ZPP_Body.bodystack.add(b.zpp_inner);
      b.zpp_inner.graph_depth = ZPP_Body.cur_graph_depth + 1;
    }
  }

  connectedBodies(depth: number, output: Any): Any {
    const nape = ZPP_Body._nape;

    if (ZPP_Body.bodyset == null) {
      this.init_bodysetlist();
    }

    const ret = output == null ? new nape.phys.BodyList() : output;
    ZPP_Body.bodystack.add(this);
    ZPP_Body.bodyset.insert(this);
    this.graph_depth = 0;

    while (ZPP_Body.bodystack.head != null) {
      const cur = ZPP_Body.bodystack.pop_unsafe();
      if (cur.graph_depth === depth) {
        continue;
      }
      ZPP_Body.cur_graph_depth = cur.graph_depth;
      let cx_ite = cur.constraints.head;
      while (cx_ite != null) {
        const c = cx_ite.elt;
        c.outer.visitBodies(this.connectedBodies_cont.bind(this));
        cx_ite = cx_ite.next;
      }
    }

    // Drain the bodyset into the output list
    const _this = ZPP_Body.bodyset;
    if (_this.parent != null) {
      let cur = _this.parent;
      while (cur != null) {
        if (cur.prev != null) {
          cur = cur.prev;
        } else if (cur.next != null) {
          cur = cur.next;
        } else {
          const b = cur.data;
          if (b !== this) {
            const obj = b.outer;
            if (ret.zpp_inner.reverse_flag) {
              ret.push(obj);
            } else {
              ret.unshift(obj);
            }
          }
          const ret1 = cur.parent;
          if (ret1 != null) {
            if (cur === ret1.prev) {
              ret1.prev = null;
            } else {
              ret1.next = null;
            }
            cur.parent = null;
          }
          const o = cur;
          o.data = null;
          o.lt = null;
          o.next = ZPP_Body._zpp.util.ZPP_Set_ZPP_BodyNode.zpp_pool;
          ZPP_Body._zpp.util.ZPP_Set_ZPP_BodyNode.zpp_pool = o;
          cur = ret1;
        }
      }
      _this.parent = null;
    }

    return ret;
  }

  interactingBodies(type: number, output: Any): Any {
    const nape = ZPP_Body._nape;
    const zpp = ZPP_Body._zpp;

    if (ZPP_Body.bodyset == null) {
      this.init_bodysetlist();
    }

    const ret = output == null ? new nape.phys.BodyList() : output;

    let cx_ite = this.arbiters.head;
    while (cx_ite != null) {
      const a = cx_ite.elt;
      if (!a.sleeping && (type === 4 || a.type === type)) {
        const other = a.b1 === this ? a.b2 : a.b1;
        if (ZPP_Body.bodyset.try_insert_bool(other)) {
          const obj = other.outer;
          if (ret.zpp_inner.reverse_flag) {
            ret.push(obj);
          } else {
            ret.unshift(obj);
          }
        }
      }
      cx_ite = cx_ite.next;
    }

    // Clear the bodyset
    const _this = ZPP_Body.bodyset;
    if (_this.parent != null) {
      let cur = _this.parent;
      while (cur != null) {
        if (cur.prev != null) {
          cur = cur.prev;
        } else if (cur.next != null) {
          cur = cur.next;
        } else {
          const ret1 = cur.parent;
          if (ret1 != null) {
            if (cur === ret1.prev) {
              ret1.prev = null;
            } else {
              ret1.next = null;
            }
            cur.parent = null;
          }
          const o = cur;
          o.data = null;
          o.lt = null;
          o.next = zpp.util.ZPP_Set_ZPP_BodyNode.zpp_pool;
          zpp.util.ZPP_Set_ZPP_BodyNode.zpp_pool = o;
          cur = ret1;
        }
      }
      _this.parent = null;
    }

    return ret;
  }

  atRest(dt: number): boolean {
    const nape = ZPP_Body._nape;

    if (this.type !== 2) {
      return this.component.sleeping;
    }

    const linSq =
      nape.Config.linearSleepThreshold * nape.Config.linearSleepThreshold;
    let cansleep: boolean;

    if (this.velx * this.velx + this.vely * this.vely > linSq) {
      cansleep = false;
    } else {
      const dx = this.posx - this.pre_posx;
      const dy = this.posy - this.pre_posy;
      if (dx * dx + dy * dy > 0.25 * linSq * dt * dt) {
        cansleep = false;
      } else {
        const dx1 = this.aabb.maxx - this.aabb.minx;
        const dy1 = this.aabb.maxy - this.aabb.miny;
        const idl = dx1 * dx1 + dy1 * dy1;
        const angSq =
          nape.Config.angularSleepThreshold *
          nape.Config.angularSleepThreshold;
        if (4 * this.angvel * this.angvel * idl > angSq) {
          cansleep = false;
        } else {
          const dr = this.rot - this.pre_rot;
          cansleep = dr * dr * idl > angSq * dt * dt ? false : true;
        }
      }
    }
    if (!cansleep) {
      this.component.waket = this.space.stamp;
    }
    return this.component.waket + nape.Config.sleepDelay < this.space.stamp;
  }

  refreshArbiters(): void {
    let cx_ite = this.arbiters.head;
    while (cx_ite != null) {
      const a = cx_ite.elt;
      a.invalidated = true;
      cx_ite = cx_ite.next;
    }
  }

  // ---- Sweep integration (CCD) ----

  sweepIntegrate(dt: number): void {
    const delta = dt - this.sweepTime;
    if (delta !== 0) {
      this.sweepTime = dt;
      this.posx += this.velx * delta;
      this.posy += this.vely * delta;
      if (this.angvel !== 0) {
        const dr = this.sweep_angvel * delta;
        this.rot += dr;
        if (dr * dr > 0.0001) {
          this.axisx = Math.sin(this.rot);
          this.axisy = Math.cos(this.rot);
        } else {
          const d2 = dr * dr;
          const p = 1 - 0.5 * d2;
          const m = 1 - (d2 * d2) / 8;
          const nx = (p * this.axisx + dr * this.axisy) * m;
          this.axisy = (p * this.axisy - dr * this.axisx) * m;
          this.axisx = nx;
        }
      }
    }
  }

  sweepValidate(s: Any): void {
    if (s.type === 0) {
      // Circle
      s.worldCOMx =
        this.posx + (this.axisy * s.localCOMx - this.axisx * s.localCOMy);
      s.worldCOMy =
        this.posy + (s.localCOMx * this.axisx + s.localCOMy * this.axisy);
    } else {
      // Polygon
      const p = s.polygon;
      let li = p.lverts.next;
      let cx_ite = p.gverts.next;
      while (cx_ite != null) {
        const g = cx_ite;
        const l = li;
        li = li.next;
        g.x = this.posx + (this.axisy * l.x - this.axisx * l.y);
        g.y = this.posy + (l.x * this.axisx + l.y * this.axisy);
        cx_ite = cx_ite.next;
      }
      let ite = p.edges.head;
      let cx_ite2 = p.gverts.next;
      let u = cx_ite2;
      cx_ite2 = cx_ite2.next;
      while (cx_ite2 != null) {
        const v = cx_ite2;
        const e = ite.elt;
        ite = ite.next;
        e.gnormx = this.axisy * e.lnormx - this.axisx * e.lnormy;
        e.gnormy = e.lnormx * this.axisx + e.lnormy * this.axisy;
        e.gprojection =
          this.posx * e.gnormx + this.posy * e.gnormy + e.lprojection;
        e.tp0 = u.y * e.gnormx - u.x * e.gnormy;
        e.tp1 = v.y * e.gnormx - v.x * e.gnormy;
        u = v;
        cx_ite2 = cx_ite2.next;
      }
      const v1 = p.gverts.next;
      const e1 = ite.elt;
      e1.gnormx = this.axisy * e1.lnormx - this.axisx * e1.lnormy;
      e1.gnormy = e1.lnormx * this.axisx + e1.lnormy * this.axisy;
      e1.gprojection =
        this.posx * e1.gnormx + this.posy * e1.gnormy + e1.lprojection;
      e1.tp0 = u.y * e1.gnormx - u.x * e1.gnormy;
      e1.tp1 = v1.y * e1.gnormx - v1.x * e1.gnormy;
    }
  }

  // ---- Position / velocity / force invalidation & validation ----

  invalidate_pos(): void {
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      if (s.type === 1) {
        s.polygon.invalidate_gverts();
        s.polygon.invalidate_gaxi();
      }
      s.invalidate_worldCOM();
      cx_ite = cx_ite.next;
    }
    this.zip_worldCOM = true;
  }

  pos_invalidate(pos: Any): void {
    this.immutable_midstep("Body::position");
    if (this.type === 1 && this.space != null) {
      throw new Error(
        "Error: Cannot move a static object once inside a Space"
      );
    }
    if (!(this.posx === pos.x && this.posy === pos.y)) {
      this.posx = pos.x;
      this.posy = pos.y;
      this.invalidate_pos();
      this.wake();
    }
  }

  pos_validate(): void {
    this.wrap_pos.zpp_inner.x = this.posx;
    this.wrap_pos.zpp_inner.y = this.posy;
  }

  vel_invalidate(vel: Any): void {
    if (this.type === 1) {
      throw new Error(
        "Error: Static body cannot have its velocity set."
      );
    }
    this.velx = vel.x;
    this.vely = vel.y;
    this.wake();
  }

  vel_validate(): void {
    this.wrap_vel.zpp_inner.x = this.velx;
    this.wrap_vel.zpp_inner.y = this.vely;
  }

  kinvel_invalidate(vel: Any): void {
    this.kinvelx = vel.x;
    this.kinvely = vel.y;
    this.wake();
  }

  kinvel_validate(): void {
    this.wrap_kinvel.zpp_inner.x = this.kinvelx;
    this.wrap_kinvel.zpp_inner.y = this.kinvely;
  }

  svel_invalidate(vel: Any): void {
    this.svelx = vel.x;
    this.svely = vel.y;
    this.wake();
  }

  svel_validate(): void {
    this.wrap_svel.zpp_inner.x = this.svelx;
    this.wrap_svel.zpp_inner.y = this.svely;
  }

  force_invalidate(force: Any): void {
    if (this.type !== 2) {
      throw new Error(
        "Error: Non-dynamic body cannot have force applied."
      );
    }
    this.forcex = force.x;
    this.forcey = force.y;
    this.wake();
  }

  force_validate(): void {
    this.wrap_force.zpp_inner.x = this.forcex;
    this.wrap_force.zpp_inner.y = this.forcey;
  }

  // ---- Vec2 wrapper setup methods ----

  private _setupVec2Wrapper(
    x: number,
    y: number,
    invalidateFn: ((vec: Any) => void) | null,
    validateFn: (() => void) | null
  ): Any {
    const nape = ZPP_Body._nape;

    if (x != x || y != y) {
      throw new Error("Error: Vec2 components cannot be NaN");
    }

    let ret: Any;
    if (ZPP_PubPool.poolVec2 == null) {
      ret = new nape.geom.Vec2();
    } else {
      ret = ZPP_PubPool.poolVec2;
      ZPP_PubPool.poolVec2 = ret.zpp_pool;
      ret.zpp_pool = null;
      ret.zpp_disp = false;
      if (ret === ZPP_PubPool.nextVec2) {
        ZPP_PubPool.nextVec2 = null;
      }
    }

    if (ret.zpp_inner == null) {
      let inner: ZPP_Vec2;
      if (ZPP_Vec2.zpp_pool == null) {
        inner = new ZPP_Vec2();
      } else {
        inner = ZPP_Vec2.zpp_pool;
        ZPP_Vec2.zpp_pool = inner.next;
        inner.next = null;
      }
      inner.weak = false;
      inner._immutable = false;
      inner.x = x;
      inner.y = y;
      ret.zpp_inner = inner;
      ret.zpp_inner.outer = ret;
    } else {
      if (ret.zpp_disp) {
        throw new Error(
          "Error: Vec2 has been disposed and cannot be used!"
        );
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
      // Only invalidate if changed
      let same: boolean;
      if (ret.zpp_inner._validate != null) {
        ret.zpp_inner._validate();
      }
      if (ret.zpp_inner.x === x) {
        if (ret.zpp_inner._validate != null) {
          ret.zpp_inner._validate();
        }
        same = ret.zpp_inner.y === y;
      } else {
        same = false;
      }
      if (!same) {
        ret.zpp_inner.x = x;
        ret.zpp_inner.y = y;
        if (ret.zpp_inner._invalidate != null) {
          ret.zpp_inner._invalidate(ret.zpp_inner);
        }
      }
    }

    ret.zpp_inner.weak = false;
    return ret;
  }

  setupPosition(): void {
    this.wrap_pos = this._setupVec2Wrapper(
      this.posx,
      this.posy,
      null,
      null
    );
    this.wrap_pos.zpp_inner._inuse = true;
    if (this.world) {
      this.wrap_pos.zpp_inner._immutable = true;
    } else {
      this.wrap_pos.zpp_inner._invalidate = this.pos_invalidate.bind(this);
      this.wrap_pos.zpp_inner._validate = this.pos_validate.bind(this);
    }
  }

  setupVelocity(): void {
    this.wrap_vel = this._setupVec2Wrapper(
      this.velx,
      this.vely,
      null,
      null
    );
    this.wrap_vel.zpp_inner._inuse = true;
    if (this.world) {
      this.wrap_vel.zpp_inner._immutable = true;
    } else {
      this.wrap_vel.zpp_inner._invalidate = this.vel_invalidate.bind(this);
      this.wrap_vel.zpp_inner._validate = this.vel_validate.bind(this);
    }
  }

  setupkinvel(): void {
    this.wrap_kinvel = this._setupVec2Wrapper(
      this.kinvelx,
      this.kinvely,
      null,
      null
    );
    this.wrap_kinvel.zpp_inner._inuse = true;
    if (this.world) {
      this.wrap_kinvel.zpp_inner._immutable = true;
    } else {
      this.wrap_kinvel.zpp_inner._invalidate = this.kinvel_invalidate.bind(this);
      this.wrap_kinvel.zpp_inner._validate = this.kinvel_validate.bind(this);
    }
  }

  setupsvel(): void {
    this.wrap_svel = this._setupVec2Wrapper(
      this.svelx,
      this.svely,
      null,
      null
    );
    this.wrap_svel.zpp_inner._inuse = true;
    if (this.world) {
      this.wrap_svel.zpp_inner._immutable = true;
    } else {
      this.wrap_svel.zpp_inner._invalidate = this.svel_invalidate.bind(this);
      this.wrap_svel.zpp_inner._validate = this.svel_validate.bind(this);
    }
  }

  setupForce(): void {
    this.wrap_force = this._setupVec2Wrapper(
      this.forcex,
      this.forcey,
      null,
      null
    );
    this.wrap_force.zpp_inner._inuse = true;
    if (this.world) {
      this.wrap_force.zpp_inner._immutable = true;
    } else {
      this.wrap_force.zpp_inner._invalidate = this.force_invalidate.bind(this);
      this.wrap_force.zpp_inner._validate = this.force_validate.bind(this);
    }
  }

  // ---- Composite velocity ----

  cvel_validate(): void {
    this.wrapcvel.zpp_inner.x = this.velx + this.kinvelx;
    this.wrapcvel.zpp_inner.y = this.vely + this.kinvely;
  }

  setup_cvel(): void {
    this.wrapcvel = this._setupVec2Wrapper(
      this.velx + this.kinvelx,
      this.vely + this.kinvely,
      null,
      null
    );
    this.wrapcvel.zpp_inner._inuse = true;
    this.wrapcvel.zpp_inner._immutable = true;
    this.wrapcvel.zpp_inner._validate = this.cvel_validate.bind(this);
  }

  // ---- Rotation ----

  invalidate_rot(): void {
    this.zip_axis = true;
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      if (s.type === 1) {
        s.polygon.invalidate_gverts();
        s.polygon.invalidate_gaxi();
      }
      s.invalidate_worldCOM();
      cx_ite = cx_ite.next;
    }
    this.zip_worldCOM = true;
  }

  validate_axis(): void {
    if (this.zip_axis) {
      this.zip_axis = false;
      this.axisx = Math.sin(this.rot);
      this.axisy = Math.cos(this.rot);
    }
  }

  quick_validate_axis(): void {
    if (this.zip_axis) {
      this.axisx = Math.sin(this.rot);
      this.axisy = Math.cos(this.rot);
    }
  }

  delta_rot(dr: number): void {
    if (dr * dr > 0.0001) {
      this.axisx = Math.sin(this.rot);
      this.axisy = Math.cos(this.rot);
    } else {
      const d2 = dr * dr;
      const p = 1 - 0.5 * d2;
      const m = 1 - (d2 * d2) / 8;
      const nx = (p * this.axisx + dr * this.axisy) * m;
      this.axisy = (p * this.axisy - dr * this.axisx) * m;
      this.axisx = nx;
    }
    this.zip_axis = false;
  }

  // ---- Mass ----

  invalidate_mass(): void {
    this.zip_mass = true;
    this.invalidate_gravMass();
  }

  validate_mass(): void {
    const exist = false;
    if (this.zip_mass || (this.massMode === 0 && exist)) {
      this.zip_mass = false;
      if (this.massMode === 0) {
        this.cmass = 0;
        let cx_ite = this.shapes.head;
        while (cx_ite != null) {
          const s = cx_ite.elt;
          s.refmaterial.density = s.material.density;
          s.validate_area_inertia();
          this.cmass += s.area * s.material.density;
          cx_ite = cx_ite.next;
        }
      }
      if (this.type === 2 && !this.nomove) {
        this.mass = this.cmass;
        this.imass = this.smass = 1.0 / this.mass;
      } else {
        this.mass = Infinity;
        this.imass = this.smass = 0.0;
      }
      if (exist) {
        this.invalidate_inertia();
      }
    }
  }

  // ---- Gravity mass ----

  invalidate_gravMass(): void {
    if (this.gravMassMode !== 1) {
      this.zip_gravMass = true;
    }
    if (this.gravMassMode !== 2) {
      this.zip_gravMassScale = true;
    }
    this.wake();
  }

  validate_gravMass(): void {
    if (this.zip_gravMass) {
      this.zip_gravMass = false;
      this.validate_mass();
      if (this.gravMassMode === 0) {
        this.validate_mass();
        this.gravMass = this.cmass;
      } else if (this.gravMassMode === 2) {
        this.validate_mass();
        this.gravMass = this.cmass * this.gravMassScale;
      }
    }
  }

  invalidate_gravMassScale(): void {
    if (this.gravMassMode !== 2) {
      this.zip_gravMassScale = true;
    } else {
      this.invalidate_gravMass();
    }
  }

  validate_gravMassScale(): void {
    if (this.zip_gravMassScale) {
      this.zip_gravMassScale = false;
      if (this.gravMassMode === 0) {
        this.gravMassScale = 1.0;
      } else if (this.gravMassMode === 1) {
        this.validate_mass();
        this.gravMassScale = this.gravMass / this.cmass;
      }
    }
  }

  // ---- Inertia ----

  invalidate_inertia(): void {
    this.zip_inertia = true;
    this.wake();
  }

  validate_inertia(): void {
    const exist = false;
    if (this.zip_inertia || (this.inertiaMode === 0 && exist)) {
      this.zip_inertia = false;
      if (this.inertiaMode === 0) {
        this.cinertia = 0;
        let cx_ite = this.shapes.head;
        while (cx_ite != null) {
          const s = cx_ite.elt;
          s.refmaterial.density = s.material.density;
          s.validate_area_inertia();
          this.cinertia += s.inertia * s.area * s.material.density;
          cx_ite = cx_ite.next;
        }
      }
      if (this.type === 2 && !this.norotate) {
        this.inertia = this.cinertia;
        this.sinertia = this.iinertia = 1.0 / this.inertia;
      } else {
        this.inertia = Infinity;
        this.sinertia = this.iinertia = 0;
      }
      if (exist) {
        this.invalidate_inertia();
      }
    }
  }

  invalidate_wake(): void {
    this.wake();
  }

  // ---- AABB ----

  invalidate_aabb(): void {
    this.zip_aabb = true;
  }

  validate_aabb(): void {
    if (this.shapes.head == null) {
      throw new Error(
        "Error: Body bounds only makes sense if it contains shapes"
      );
    }
    if (this.zip_aabb) {
      this.zip_aabb = false;
      this.aabb.minx = Infinity;
      this.aabb.miny = Infinity;
      this.aabb.maxx = -Infinity;
      this.aabb.maxy = -Infinity;
      let cx_ite = this.shapes.head;
      while (cx_ite != null) {
        const s = cx_ite.elt;
        if (s.zip_aabb) {
          if (s.body != null) {
            s.zip_aabb = false;
            if (s.type === 0) {
              this._validateCircleAABB(s.circle);
            } else {
              this._validatePolygonAABB(s.polygon);
            }
          }
        }
        // Merge shape AABB into body AABB
        if (s.aabb.minx < this.aabb.minx) this.aabb.minx = s.aabb.minx;
        if (s.aabb.maxx > this.aabb.maxx) this.aabb.maxx = s.aabb.maxx;
        if (s.aabb.miny < this.aabb.miny) this.aabb.miny = s.aabb.miny;
        if (s.aabb.maxy > this.aabb.maxy) this.aabb.maxy = s.aabb.maxy;
        cx_ite = cx_ite.next;
      }
    }
  }

  private _validateCircleAABB(circle: Any): void {
    if (circle.zip_worldCOM) {
      if (circle.body != null) {
        circle.zip_worldCOM = false;
        if (circle.zip_localCOM) {
          circle.zip_localCOM = false;
          if (circle.type === 1) {
            this._computePolygonLocalCOM(circle.polygon);
          }
          if (circle.wrap_localCOM != null) {
            circle.wrap_localCOM.zpp_inner.x = circle.localCOMx;
            circle.wrap_localCOM.zpp_inner.y = circle.localCOMy;
          }
        }
        this.validate_axis();
        circle.worldCOMx =
          circle.body.posx +
          (circle.body.axisy * circle.localCOMx -
            circle.body.axisx * circle.localCOMy);
        circle.worldCOMy =
          circle.body.posy +
          (circle.localCOMx * circle.body.axisx +
            circle.localCOMy * circle.body.axisy);
      }
    }
    const r = circle.radius;
    circle.aabb.minx = circle.worldCOMx - r;
    circle.aabb.miny = circle.worldCOMy - r;
    circle.aabb.maxx = circle.worldCOMx + r;
    circle.aabb.maxy = circle.worldCOMy + r;
  }

  private _validatePolygonAABB(poly: Any): void {
    if (poly.zip_gverts) {
      if (poly.body != null) {
        poly.zip_gverts = false;
        poly.validate_lverts();
        this.validate_axis();
        let li = poly.lverts.next;
        let cx_ite = poly.gverts.next;
        while (cx_ite != null) {
          const g = cx_ite;
          const l = li;
          li = li.next;
          g.x =
            poly.body.posx +
            (poly.body.axisy * l.x - poly.body.axisx * l.y);
          g.y =
            poly.body.posy +
            (l.x * poly.body.axisx + l.y * poly.body.axisy);
          cx_ite = cx_ite.next;
        }
      }
    }
    if (poly.lverts.next == null) {
      throw new Error(
        "Error: An empty polygon has no meaningful bounds"
      );
    }
    const p0 = poly.gverts.next;
    poly.aabb.minx = p0.x;
    poly.aabb.miny = p0.y;
    poly.aabb.maxx = p0.x;
    poly.aabb.maxy = p0.y;
    let cx_ite2 = poly.gverts.next.next;
    while (cx_ite2 != null) {
      const p = cx_ite2;
      if (p.x < poly.aabb.minx) poly.aabb.minx = p.x;
      if (p.x > poly.aabb.maxx) poly.aabb.maxx = p.x;
      if (p.y < poly.aabb.miny) poly.aabb.miny = p.y;
      if (p.y > poly.aabb.maxy) poly.aabb.maxy = p.y;
      cx_ite2 = cx_ite2.next;
    }
  }

  aabb_validate(): void {
    if (this.shapes.head == null) {
      throw new Error(
        "Error: bounds only makes sense when Body has shapes"
      );
    }
    this.validate_aabb();
  }

  // ---- Center of mass (local) ----

  invalidate_localCOM(): void {
    this.zip_localCOM = true;
    this.zip_worldCOM = true;
  }

  invalidate_worldCOM(): void {
    this.zip_worldCOM = true;
  }

  private _computePolygonLocalCOM(poly: Any): void {
    if (poly.lverts.next == null) {
      throw new Error(
        "Error: An empty polygon has no meaningful localCOM"
      );
    }
    if (poly.lverts.next.next == null) {
      poly.localCOMx = poly.lverts.next.x;
      poly.localCOMy = poly.lverts.next.y;
    } else if (poly.lverts.next.next.next == null) {
      poly.localCOMx = poly.lverts.next.x;
      poly.localCOMy = poly.lverts.next.y;
      poly.localCOMx += poly.lverts.next.next.x;
      poly.localCOMy += poly.lverts.next.next.y;
      poly.localCOMx *= 0.5;
      poly.localCOMy *= 0.5;
    } else {
      poly.localCOMx = 0;
      poly.localCOMy = 0;
      let area = 0.0;
      let cx_ite = poly.lverts.next;
      let u = cx_ite;
      cx_ite = cx_ite.next;
      let v = cx_ite;
      cx_ite = cx_ite.next;
      while (cx_ite != null) {
        const w = cx_ite;
        area += v.x * (w.y - u.y);
        const cf = w.y * v.x - w.x * v.y;
        poly.localCOMx += (v.x + w.x) * cf;
        poly.localCOMy += (v.y + w.y) * cf;
        u = v;
        v = w;
        cx_ite = cx_ite.next;
      }
      // Wrap-around: last two edges
      cx_ite = poly.lverts.next;
      const w1 = cx_ite;
      area += v.x * (w1.y - u.y);
      const cf1 = w1.y * v.x - w1.x * v.y;
      poly.localCOMx += (v.x + w1.x) * cf1;
      poly.localCOMy += (v.y + w1.y) * cf1;
      u = v;
      v = w1;
      cx_ite = cx_ite.next;
      const w2 = cx_ite;
      area += v.x * (w2.y - u.y);
      const cf2 = w2.y * v.x - w2.x * v.y;
      poly.localCOMx += (v.x + w2.x) * cf2;
      poly.localCOMy += (v.y + w2.y) * cf2;
      area = 1 / (3 * area);
      poly.localCOMx *= area;
      poly.localCOMy *= area;
    }
  }

  validate_localCOM(): void {
    if (this.zip_localCOM) {
      this.zip_localCOM = false;
      let tempx = 0;
      let tempy = 0;
      let msum = 0.0;
      let cx_ite = this.shapes.head;
      while (cx_ite != null) {
        const s = cx_ite.elt;
        if (s.zip_localCOM) {
          s.zip_localCOM = false;
          if (s.type === 1) {
            this._computePolygonLocalCOM(s.polygon);
          }
          if (s.wrap_localCOM != null) {
            s.wrap_localCOM.zpp_inner.x = s.localCOMx;
            s.wrap_localCOM.zpp_inner.y = s.localCOMy;
          }
        }
        s.validate_area_inertia();
        const t = s.area * s.material.density;
        tempx += s.localCOMx * t;
        tempy += s.localCOMy * t;
        msum += s.area * s.material.density;
        cx_ite = cx_ite.next;
      }
      if (msum !== 0) {
        const inv = 1.0 / msum;
        this.localCOMx = tempx * inv;
        this.localCOMy = tempy * inv;
      }
      if (this.wrap_localCOM != null) {
        this.wrap_localCOM.zpp_inner.x = this.localCOMx;
        this.wrap_localCOM.zpp_inner.y = this.localCOMy;
      }
      // Opportunistic mass validation
      if (this.zip_mass && this.massMode === 0) {
        this.zip_mass = false;
        this.cmass = msum;
        if (this.type === 2) {
          this.mass = this.cmass;
          this.imass = this.smass = 1.0 / this.mass;
        } else {
          this.mass = Infinity;
          this.imass = this.smass = 0.0;
        }
      }
    }
  }

  validate_worldCOM(): void {
    if (this.zip_worldCOM) {
      this.zip_worldCOM = false;
      this.validate_localCOM();
      this.validate_axis();
      this.worldCOMx =
        this.posx +
        (this.axisy * this.localCOMx - this.axisx * this.localCOMy);
      this.worldCOMy =
        this.posy +
        (this.localCOMx * this.axisx + this.localCOMy * this.axisy);
    }
    if (this.wrap_worldCOM != null) {
      this.wrap_worldCOM.zpp_inner.x = this.worldCOMx;
      this.wrap_worldCOM.zpp_inner.y = this.worldCOMy;
    }
  }

  getlocalCOM(): void {
    if (this.shapes.head == null) {
      throw new Error(
        "Error: Body has no shapes so cannot compute its localCOM"
      );
    }
    this.validate_localCOM();
  }

  getworldCOM(): void {
    if (this.shapes.head == null) {
      throw new Error(
        "Error: Body has no shapes so cannot compute its worldCOM"
      );
    }
    this.validate_worldCOM();
  }

  // ---- Immutability guard ----

  __immutable_midstep(): void {
    if (this.world) {
      throw new Error("Error: Space::world is immutable");
    }
  }

  // ---- Clear ----

  clear(): void {
    if (this.space != null) {
      throw new Error(
        "Error: Cannot clear a Body if it is currently being used by a Space!"
      );
    }
    if (this.constraints.head != null) {
      throw new Error(
        "Error: Cannot clear a Body if it is currently being used by a constraint!"
      );
    }
    while (this.shapes.head != null) {
      const s = this.shapes.pop_unsafe();
      s.removedFromBody();
      s.body = null;
    }
    this.invalidate_shapes();

    this.pre_posx = 0;
    this.pre_posy = 0;
    this.posx = 0;
    this.posy = 0;
    this.velx = 0;
    this.vely = 0;
    this.forcex = 0;
    this.forcey = 0;
    this.kinvelx = 0;
    this.kinvely = 0;
    this.svelx = 0;
    this.svely = 0;
    this.angvel = this.torque = this.kinangvel = this.pre_rot = this.rot = 0;

    // Invalidate all shapes for position change
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      if (s.type === 1) {
        s.polygon.invalidate_gverts();
        s.polygon.invalidate_gaxi();
      }
      s.invalidate_worldCOM();
      cx_ite = cx_ite.next;
    }
    this.zip_worldCOM = true;
    this.zip_axis = true;

    // Second pass
    cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      if (s.type === 1) {
        s.polygon.invalidate_gverts();
        s.polygon.invalidate_gaxi();
      }
      s.invalidate_worldCOM();
      cx_ite = cx_ite.next;
    }
    this.zip_worldCOM = true;

    this.axisx = 0;
    this.axisy = 1;
    this.zip_axis = false;
    this.massMode = 0;
    this.gravMassMode = 0;
    this.gravMassScale = 1.0;
    this.inertiaMode = 0;
    this.norotate = false;
    this.nomove = false;
  }

  // ---- Shape management ----

  shapes_adder(s: Any): boolean {
    if (s.zpp_inner.body !== this) {
      if (s.zpp_inner.body != null) {
        s.zpp_inner.body.wrap_shapes.remove(s);
      }
      s.zpp_inner.body = this;
      s.zpp_inner.addedToBody();
      if (this.space != null) {
        const _space = this.space;
        const s1 = s.zpp_inner;
        const o = s1.body;
        if (!o.world) {
          o.component.waket = _space.stamp + (_space.midstep ? 0 : 1);
          if (o.type === 3) {
            o.kinematicDelaySleep = true;
          }
          if (o.component.sleeping) {
            _space.really_wake(o, false);
          }
        }
        _space.bphase.insert(s1);
        s1.addedToSpace();
      }
      if (s.zpp_inner.type === 1) {
        s.zpp_inner.polygon.invalidate_gaxi();
        s.zpp_inner.polygon.invalidate_gverts();
      }
      return true;
    } else {
      return false;
    }
  }

  shapes_subber(s: Any): void {
    if (this.space != null) {
      this.space.removed_shape(s.zpp_inner);
    }
    s.zpp_inner.body = null;
    s.zpp_inner.removedFromBody();
  }

  shapes_invalidate(_: Any): void {
    this.invalidate_shapes();
  }

  shapes_modifiable(): void {
    this.immutable_midstep("Body::shapes");
    if (this.type === 1 && this.space != null) {
      throw new Error(
        "Error: Cannot modifiy shapes of static object once added to Space"
      );
    }
  }

  // ---- Space integration ----

  addedToSpace(): void {
    const zpp = ZPP_Body._zpp;
    let component: Any;
    if (zpp.space.ZPP_Component.zpp_pool == null) {
      component = new zpp.space.ZPP_Component();
    } else {
      component = zpp.space.ZPP_Component.zpp_pool;
      zpp.space.ZPP_Component.zpp_pool = component.next;
      component.next = null;
    }
    component.isBody = true;
    component.body = this;
    this.component = component;
    this.__iaddedToSpace();
  }

  removedFromSpace(): void {
    const zpp = ZPP_Body._zpp;

    while (this.arbiters.head != null) {
      const arb = this.arbiters.pop_unsafe();
      const s = this.space;
      arb.cleared = true;

      if (arb.b2 === this) {
        this._removeArbiterFromList(arb.b1.arbiters, arb, zpp);
      }
      if (arb.b1 === this) {
        this._removeArbiterFromList(arb.b2.arbiters, arb, zpp);
      }

      if (arb.pair != null) {
        arb.pair.arb = null;
        arb.pair = null;
      }
      arb.active = false;
      s.f_arbiters.modified = true;
    }

    const o = this.component;
    o.body = null;
    o.constraint = null;
    o.next = zpp.space.ZPP_Component.zpp_pool;
    zpp.space.ZPP_Component.zpp_pool = o;
    this.component = null;
    this.__iremovedFromSpace();
  }

  private _removeArbiterFromList(list: Any, arb: Any, zpp: Any): void {
    let pre: Any = null;
    let cur = list.head;
    while (cur != null) {
      if (cur.elt === arb) {
        let old: Any;
        if (pre == null) {
          old = list.head;
          list.head = old.next;
          if (list.head == null) {
            list.pushmod = true;
          }
        } else {
          old = pre.next;
          pre.next = old.next;
          if (old.next == null) {
            list.pushmod = true;
          }
        }
        const o = old;
        o.elt = null;
        o.next = zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool;
        zpp.util.ZNPNode_ZPP_Arbiter.zpp_pool = o;
        list.modified = true;
        list.length--;
        list.pushmod = true;
        break;
      }
      pre = cur;
      cur = cur.next;
    }
  }

  // ---- Copy ----

  copy(): Any {
    const nape = ZPP_Body._nape;
    const ret = new nape.phys.Body().zpp_inner;
    ret.type = this.type;
    ret.bulletEnabled = this.bulletEnabled;
    ret.disableCCD = this.disableCCD;

    // Copy shapes
    let cx_ite = this.shapes.head;
    while (cx_ite != null) {
      const s = cx_ite.elt;
      const _this = ret.outer.zpp_inner.wrap_shapes;
      const obj = s.outer.copy();
      if (_this.zpp_inner.reverse_flag) {
        _this.push(obj);
      } else {
        _this.unshift(obj);
      }
      cx_ite = cx_ite.next;
    }

    // Copy position/velocity state
    ret.posx = this.posx;
    ret.posy = this.posy;
    ret.velx = this.velx;
    ret.vely = this.vely;
    ret.forcex = this.forcex;
    ret.forcey = this.forcey;
    ret.rot = this.rot;
    ret.angvel = this.angvel;
    ret.torque = this.torque;
    ret.kinvelx = this.kinvelx;
    ret.kinvely = this.kinvely;
    ret.kinangvel = this.kinangvel;
    ret.svelx = this.svelx;
    ret.svely = this.svely;

    if (!this.zip_axis) {
      ret.axisx = this.axisx;
      ret.axisy = this.axisy;
    } else {
      ret.zip_axis = true;
      let cx_ite2 = ret.shapes.head;
      while (cx_ite2 != null) {
        const s = cx_ite2.elt;
        if (s.type === 1) {
          s.polygon.invalidate_gverts();
          s.polygon.invalidate_gaxi();
        }
        s.invalidate_worldCOM();
        cx_ite2 = cx_ite2.next;
      }
      ret.zip_worldCOM = true;
    }

    ret.rot = this.rot;
    ret.massMode = this.massMode;
    ret.gravMassMode = this.gravMassMode;
    ret.inertiaMode = this.inertiaMode;
    ret.norotate = this.norotate;
    ret.nomove = this.nomove;
    ret.cmass = this.cmass;
    ret.cinertia = this.cinertia;

    if (!this.zip_mass) {
      ret.mass = this.mass;
    } else {
      ret.invalidate_mass();
    }
    if (!this.zip_gravMass) {
      ret.gravMass = this.gravMass;
    } else {
      ret.invalidate_gravMass();
    }
    if (!this.zip_gravMassScale) {
      ret.gravMassScale = this.gravMassScale;
    } else {
      ret.invalidate_gravMassScale();
    }
    if (!this.zip_inertia) {
      ret.inertia = this.inertia;
    } else {
      ret.invalidate_inertia();
    }
    if (!this.zip_aabb) {
      ret.aabb.minx = this.aabb.minx;
      ret.aabb.miny = this.aabb.miny;
      ret.aabb.maxx = this.aabb.maxx;
      ret.aabb.maxy = this.aabb.maxy;
    } else {
      ret.zip_aabb = true;
    }
    if (!this.zip_localCOM) {
      ret.localCOMx = this.localCOMx;
      ret.localCOMy = this.localCOMy;
    } else {
      ret.zip_localCOM = true;
      ret.zip_worldCOM = true;
    }
    if (!this.zip_worldCOM) {
      ret.worldCOMx = this.worldCOMx;
      ret.worldCOMy = this.worldCOMy;
    } else {
      ret.zip_worldCOM = true;
    }
    this.copyto(ret.outer);
    return ret.outer;
  }

  // ---- Methods inherited from ZPP_Interactor (stubs, filled at init) ----
  // These are set via prototype copy from ZPP_Interactor at _init time
  wake!: () => void;
  __iaddedToSpace!: () => void;
  __iremovedFromSpace!: () => void;
  immutable_midstep!: (name: string) => void;
  copyto!: (ret: Any) => void;
  insert_cbtype!: (cb: Any) => void;
  alloc_cbSet!: () => void;
  dealloc_cbSet!: () => void;
  setupcbTypes!: () => void;
  immutable_cbTypes!: () => void;
  wrap_cbTypes_subber!: (pcb: Any) => void;
  wrap_cbTypes_adder!: (cb: Any) => void;
  setGroup!: (group: Any) => void;
  lookup_group!: () => Any;
  getSpace!: () => Any;
  isShape!: () => boolean;
  isBody!: () => boolean;
  isCompound!: () => boolean;

  // ---- Module initialization ----
  static _initialized = false;

  static _init(zpp: Any, nape: Any): void {
    if (ZPP_Body._initialized) return;
    ZPP_Body._initialized = true;
    ZPP_Body._zpp = zpp;
    ZPP_Body._nape = nape;
    ZPP_Body.__super__ = zpp.phys.ZPP_Interactor;

    // Copy ZPP_Interactor prototype methods onto ZPP_Body
    for (const k in zpp.phys.ZPP_Interactor.prototype) {
      if (!(k in ZPP_Body.prototype)) {
        (ZPP_Body.prototype as Any)[k] =
          zpp.phys.ZPP_Interactor.prototype[k];
      }
    }
  }
}
