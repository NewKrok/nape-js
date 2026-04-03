/**
 * SolverBuffers — Structure-of-Arrays (SoA) typed-array buffers for the
 * constraint solver hot path.
 *
 * Packs body velocities/masses and collision arbiter data into contiguous
 * Float64Arrays before the velocity/position solver iterations, giving:
 *   1. CPU cache-friendly sequential access (no pointer chasing)
 *   2. GPU-ready layout — arrays can be uploaded directly to WebGPU storage buffers
 *
 * Usage from ZPP_Space:
 *   buffers.packBodies(live, kinematics)
 *   buffers.packCollisionArbiters(c_arbiters_false, c_arbiters_true)
 *   buffers.warmStartSoA()
 *   buffers.iterateVelSoA(iterations)
 *   buffers.unpackBodies()
 *   buffers.unpackArbiters()
 */

import type { ZPP_Body } from "../phys/ZPP_Body";
import type { ZPP_ColArbiter } from "../dynamics/ZPP_ColArbiter";
import type { ZPP_FluidArbiter } from "../dynamics/ZPP_FluidArbiter";

// ── Body SoA field offsets (per body, stride = BODY_STRIDE) ──
const B_VELX = 0;
const B_VELY = 1;
const B_ANGVEL = 2;
const B_IMASS = 3;
const B_IINERTIA = 4;
const B_KINVELX = 5;
const B_KINVELY = 6;
const B_KINANGVEL = 7;
const BODY_STRIDE = 8;

// ── Collision arbiter SoA field offsets (per arbiter, stride = COL_STRIDE) ──
const A_B1 = 0; // body index * BODY_STRIDE
const A_B2 = 1;
// contact 1
const A_C1_R1X = 2;
const A_C1_R1Y = 3;
const A_C1_R2X = 4;
const A_C1_R2Y = 5;
const A_C1_TMASS = 6;
const A_C1_NMASS = 7;
const A_C1_FRICTION = 8;
const A_C1_JNACC = 9;
const A_C1_JTACC = 10;
const A_C1_BOUNCE = 11;
// normal + surface
const A_NX = 12;
const A_NY = 13;
const A_SURFX = 14;
const A_SURFY = 15;
// arm projections
const A_RN1A = 16;
const A_RT1A = 17;
const A_RN1B = 18;
const A_RT1B = 19;
// kinematic offsets
const A_K1X = 20;
const A_K1Y = 21;
// 2-contact fields
const A_HC2 = 22; // 1.0 or 0.0
const A_C2_R1X = 23;
const A_C2_R1Y = 24;
const A_C2_R2X = 25;
const A_C2_R2Y = 26;
const A_C2_TMASS = 27;
const A_C2_NMASS = 28;
const A_C2_FRICTION = 29;
const A_C2_JNACC = 30;
const A_C2_JTACC = 31;
const A_C2_BOUNCE = 32;
const A_K2X = 33;
const A_K2Y = 34;
const A_RN2A = 35;
const A_RN2B = 36;
const A_RT2A = 37;
const A_RT2B = 38;
// 2×2 mass matrix (for 2-contact case)
const A_KMASSA = 39;
const A_KMASSB = 40;
const A_KMASSC = 41;
const A_KA = 42;
const A_KB = 43;
const A_KC = 44;
// rolling friction
const A_RMASS = 45;
const A_JRACC = 46;
const A_RFRIC = 47;
const A_RADIUS = 48;
const COL_STRIDE = 49;

// ── Fluid arbiter SoA field offsets (per arbiter, stride = FLUID_STRIDE) ──
const F_B1 = 0;
const F_B2 = 1;
const F_R1X = 2;
const F_R1Y = 3;
const F_R2X = 4;
const F_R2Y = 5;
const F_VMASSA = 6;
const F_VMASSB = 7;
const F_VMASSC = 8;
const F_DAMPX = 9;
const F_DAMPY = 10;
const F_LGAMMA = 11;
const F_WMASS = 12;
const F_ADAMP = 13;
const F_AGAMMA = 14;
const F_NODRAG = 15; // 1.0 = nodrag
const FLUID_STRIDE = 16;

/**
 * Ensures `buf` has at least `needed` elements, growing by 2× if necessary.
 * Returns `buf` or a new larger array with old data copied.
 */
function ensureCapacity(buf: Float64Array, needed: number): Float64Array {
  if (buf.length >= needed) return buf;
  let cap = buf.length || 64;
  while (cap < needed) cap *= 2;
  const next = new Float64Array(cap);
  next.set(buf);
  return next;
}

export class SolverBuffers {
  // ── Body arrays ──
  bodyData: Float64Array = new Float64Array(256 * BODY_STRIDE);
  bodyCount = 0;

  /** Map body → index into bodyData (bodyIndex * BODY_STRIDE = offset). */
  private bodyIndexMap: Map<ZPP_Body, number> = new Map();
  /** Reverse: index → body object (for unpack). */
  private bodyList: ZPP_Body[] = [];

  // ── Collision arbiter arrays ──
  colData: Float64Array = new Float64Array(512 * COL_STRIDE);
  colCount = 0;
  /** Reverse: index → arbiter object (for unpack). */
  private colList: ZPP_ColArbiter[] = [];

  // ── Fluid arbiter arrays ──
  fluidData: Float64Array = new Float64Array(64 * FLUID_STRIDE);
  fluidCount = 0;
  private fluidList: ZPP_FluidArbiter[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  //  PACK — object graph → flat arrays
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Assigns every live/kinematic/static/sleeping body a contiguous index
   * and copies velocity + mass properties into `bodyData`.
   *
   * Static and sleeping bodies must be included because collision arbiters
   * reference them (e.g. floor contacts). Their imass/iinertia are 0, so
   * impulse application to them is a no-op, but they must have valid indices.
   */
  packBodies(liveHead: any, kinematicsHead: any, staticsleepHead: any): void {
    this.bodyIndexMap.clear();
    this.bodyList.length = 0;
    let idx = 0;

    // Helper to process one linked list of bodies
    const pack = (head: any) => {
      let node = head;
      while (node != null) {
        const b: ZPP_Body = node.elt;
        if (!this.bodyIndexMap.has(b)) {
          this.bodyIndexMap.set(b, idx);
          this.bodyList[idx] = b;
          const off = idx * BODY_STRIDE;
          this.bodyData = ensureCapacity(this.bodyData, off + BODY_STRIDE);
          const d = this.bodyData;
          d[off + B_VELX] = b.velx;
          d[off + B_VELY] = b.vely;
          d[off + B_ANGVEL] = b.angvel;
          d[off + B_IMASS] = b.imass;
          d[off + B_IINERTIA] = b.iinertia;
          d[off + B_KINVELX] = b.kinvelx;
          d[off + B_KINVELY] = b.kinvely;
          d[off + B_KINANGVEL] = b.kinangvel;
          idx++;
        }
        node = node.next;
      }
    };

    pack(liveHead);
    pack(kinematicsHead);
    pack(staticsleepHead);
    this.bodyCount = idx;
  }

  /**
   * Ensures a body is in the index map (auto-registers if missing).
   * Returns the body index.
   */
  private _ensureBody(b: ZPP_Body): number {
    let idx = this.bodyIndexMap.get(b);
    if (idx !== undefined) return idx;
    idx = this.bodyCount;
    this.bodyIndexMap.set(b, idx);
    this.bodyList[idx] = b;
    const off = idx * BODY_STRIDE;
    this.bodyData = ensureCapacity(this.bodyData, off + BODY_STRIDE);
    const d = this.bodyData;
    d[off + B_VELX] = b.velx;
    d[off + B_VELY] = b.vely;
    d[off + B_ANGVEL] = b.angvel;
    d[off + B_IMASS] = b.imass;
    d[off + B_IINERTIA] = b.iinertia;
    d[off + B_KINVELX] = b.kinvelx;
    d[off + B_KINVELY] = b.kinvely;
    d[off + B_KINANGVEL] = b.kinangvel;
    this.bodyCount++;
    return idx;
  }

  /**
   * Packs active collision arbiters from both false/true lists.
   * Must be called AFTER packBodies() so the body index map is populated.
   * Bodies referenced by arbiters but not yet indexed are auto-registered.
   */
  packCollisionArbiters(cArbFalseHead: any, cArbTrueHead: any): void {
    this.colList.length = 0;
    let idx = 0;

    const packList = (head: any) => {
      let node = head;
      while (node != null) {
        const arb: ZPP_ColArbiter = node.elt;
        if (arb.active && (arb.immState & 1) !== 0) {
          const b1i = this._ensureBody(arb.b1 as ZPP_Body);
          const b2i = this._ensureBody(arb.b2 as ZPP_Body);
          {
            const off = idx * COL_STRIDE;
            this.colData = ensureCapacity(this.colData, off + COL_STRIDE);
            const d = this.colData;
            d[off + A_B1] = b1i * BODY_STRIDE;
            d[off + A_B2] = b2i * BODY_STRIDE;
            d[off + A_NX] = arb.nx;
            d[off + A_NY] = arb.ny;
            d[off + A_SURFX] = arb.surfacex;
            d[off + A_SURFY] = arb.surfacey;
            d[off + A_RN1A] = arb.rn1a;
            d[off + A_RT1A] = arb.rt1a;
            d[off + A_RN1B] = arb.rn1b;
            d[off + A_RT1B] = arb.rt1b;
            d[off + A_K1X] = arb.k1x;
            d[off + A_K1Y] = arb.k1y;
            // Contact 1
            const c1 = arb.c1;
            d[off + A_C1_R1X] = c1.r1x;
            d[off + A_C1_R1Y] = c1.r1y;
            d[off + A_C1_R2X] = c1.r2x;
            d[off + A_C1_R2Y] = c1.r2y;
            d[off + A_C1_TMASS] = c1.tMass;
            d[off + A_C1_NMASS] = c1.nMass;
            d[off + A_C1_FRICTION] = c1.friction;
            d[off + A_C1_JNACC] = c1.jnAcc;
            d[off + A_C1_JTACC] = c1.jtAcc;
            d[off + A_C1_BOUNCE] = c1.bounce;
            // 2-contact
            const hc2 = arb.hc2 ? 1.0 : 0.0;
            d[off + A_HC2] = hc2;
            if (arb.hc2) {
              const c2 = arb.c2;
              d[off + A_C2_R1X] = c2.r1x;
              d[off + A_C2_R1Y] = c2.r1y;
              d[off + A_C2_R2X] = c2.r2x;
              d[off + A_C2_R2Y] = c2.r2y;
              d[off + A_C2_TMASS] = c2.tMass;
              d[off + A_C2_NMASS] = c2.nMass;
              d[off + A_C2_FRICTION] = c2.friction;
              d[off + A_C2_JNACC] = c2.jnAcc;
              d[off + A_C2_JTACC] = c2.jtAcc;
              d[off + A_C2_BOUNCE] = c2.bounce;
              d[off + A_K2X] = arb.k2x;
              d[off + A_K2Y] = arb.k2y;
              d[off + A_RN2A] = arb.rn2a;
              d[off + A_RN2B] = arb.rn2b;
              d[off + A_RT2A] = arb.rt2a;
              d[off + A_RT2B] = arb.rt2b;
              d[off + A_KMASSA] = arb.kMassa;
              d[off + A_KMASSB] = arb.kMassb;
              d[off + A_KMASSC] = arb.kMassc;
              d[off + A_KA] = arb.Ka;
              d[off + A_KB] = arb.Kb;
              d[off + A_KC] = arb.Kc;
            }
            // Rolling friction
            d[off + A_RMASS] = arb.rMass;
            d[off + A_JRACC] = arb.jrAcc;
            d[off + A_RFRIC] = arb.rfric;
            d[off + A_RADIUS] = arb.radius;

            this.colList[idx] = arb;
            idx++;
          }
        }
        node = node.next;
      }
    };

    packList(cArbFalseHead);
    packList(cArbTrueHead);
    this.colCount = idx;
  }

  /**
   * Packs active fluid arbiters.
   * Must be called AFTER packBodies().
   */
  packFluidArbiters(fArbHead: any): void {
    this.fluidList.length = 0;
    let idx = 0;
    let node = fArbHead;
    while (node != null) {
      const arb: ZPP_FluidArbiter = node.elt;
      if (arb.active && (arb.immState & 1) !== 0) {
        const b1i = this._ensureBody(arb.b1 as ZPP_Body);
        const b2i = this._ensureBody(arb.b2 as ZPP_Body);
        {
          const off = idx * FLUID_STRIDE;
          this.fluidData = ensureCapacity(this.fluidData, off + FLUID_STRIDE);
          const d = this.fluidData;
          d[off + F_B1] = b1i * BODY_STRIDE;
          d[off + F_B2] = b2i * BODY_STRIDE;
          d[off + F_R1X] = arb.r1x;
          d[off + F_R1Y] = arb.r1y;
          d[off + F_R2X] = arb.r2x;
          d[off + F_R2Y] = arb.r2y;
          d[off + F_VMASSA] = arb.vMassa;
          d[off + F_VMASSB] = arb.vMassb;
          d[off + F_VMASSC] = arb.vMassc;
          d[off + F_DAMPX] = arb.dampx;
          d[off + F_DAMPY] = arb.dampy;
          d[off + F_LGAMMA] = arb.lgamma;
          d[off + F_WMASS] = arb.wMass;
          d[off + F_ADAMP] = arb.adamp;
          d[off + F_AGAMMA] = arb.agamma;
          d[off + F_NODRAG] = arb.nodrag ? 1.0 : 0.0;
          this.fluidList[idx] = arb;
          idx++;
        }
      }
      node = node.next;
    }
    this.fluidCount = idx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UNPACK — flat arrays → object graph
  // ═══════════════════════════════════════════════════════════════════════

  /** Write back velocity changes to body objects. */
  unpackBodies(): void {
    const d = this.bodyData;
    for (let i = 0; i < this.bodyCount; i++) {
      const b = this.bodyList[i];
      const off = i * BODY_STRIDE;
      b.velx = d[off + B_VELX];
      b.vely = d[off + B_VELY];
      b.angvel = d[off + B_ANGVEL];
    }
  }

  /** Write back impulse accumulators to arbiter objects. */
  unpackCollisionArbiters(): void {
    const d = this.colData;
    for (let i = 0; i < this.colCount; i++) {
      const arb = this.colList[i];
      const off = i * COL_STRIDE;
      arb.c1.jnAcc = d[off + A_C1_JNACC];
      arb.c1.jtAcc = d[off + A_C1_JTACC];
      if (arb.hc2) {
        arb.c2.jnAcc = d[off + A_C2_JNACC];
        arb.c2.jtAcc = d[off + A_C2_JTACC];
      }
      arb.jrAcc = d[off + A_JRACC];
    }
  }

  /** Write back fluid arbiter state. */
  unpackFluidArbiters(): void {
    const d = this.fluidData;
    for (let i = 0; i < this.fluidCount; i++) {
      const arb = this.fluidList[i];
      const off = i * FLUID_STRIDE;
      arb.dampx = d[off + F_DAMPX];
      arb.dampy = d[off + F_DAMPY];
      arb.adamp = d[off + F_ADAMP];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SoA WARM START
  // ═══════════════════════════════════════════════════════════════════════

  warmStartSoA(): void {
    const bd = this.bodyData;

    // ── Fluid arbiters warm start ──
    {
      const fd = this.fluidData;
      for (let i = 0; i < this.fluidCount; i++) {
        const off = i * FLUID_STRIDE;
        const b1 = fd[off + F_B1] | 0;
        const b2 = fd[off + F_B2] | 0;
        const dampx = fd[off + F_DAMPX];
        const dampy = fd[off + F_DAMPY];
        const adamp = fd[off + F_ADAMP];
        const r1x = fd[off + F_R1X];
        const r1y = fd[off + F_R1Y];
        const r2x = fd[off + F_R2X];
        const r2y = fd[off + F_R2Y];

        const im1 = bd[b1 + B_IMASS];
        bd[b1 + B_VELX] -= dampx * im1;
        bd[b1 + B_VELY] -= dampy * im1;
        const im2 = bd[b2 + B_IMASS];
        bd[b2 + B_VELX] += dampx * im2;
        bd[b2 + B_VELY] += dampy * im2;
        bd[b1 + B_ANGVEL] -= bd[b1 + B_IINERTIA] * (dampy * r1x - dampx * r1y);
        bd[b2 + B_ANGVEL] += bd[b2 + B_IINERTIA] * (dampy * r2x - dampx * r2y);
        bd[b1 + B_ANGVEL] -= adamp * bd[b1 + B_IINERTIA];
        bd[b2 + B_ANGVEL] += adamp * bd[b2 + B_IINERTIA];
      }
    }

    // ── Collision arbiters warm start ──
    {
      const cd = this.colData;
      for (let i = 0; i < this.colCount; i++) {
        const off = i * COL_STRIDE;
        const b1 = cd[off + A_B1] | 0;
        const b2 = cd[off + A_B2] | 0;
        const nx = cd[off + A_NX];
        const ny = cd[off + A_NY];

        // Contact 1
        let jnAcc = cd[off + A_C1_JNACC];
        let jtAcc = cd[off + A_C1_JTACC];
        let jx = nx * jnAcc - ny * jtAcc;
        let jy = ny * jnAcc + nx * jtAcc;

        const im1 = bd[b1 + B_IMASS];
        bd[b1 + B_VELX] -= jx * im1;
        bd[b1 + B_VELY] -= jy * im1;
        bd[b1 + B_ANGVEL] -=
          bd[b1 + B_IINERTIA] * (jy * cd[off + A_C1_R1X] - jx * cd[off + A_C1_R1Y]);

        const im2 = bd[b2 + B_IMASS];
        bd[b2 + B_VELX] += jx * im2;
        bd[b2 + B_VELY] += jy * im2;
        bd[b2 + B_ANGVEL] +=
          bd[b2 + B_IINERTIA] * (jy * cd[off + A_C1_R2X] - jx * cd[off + A_C1_R2Y]);

        // Contact 2 (if present)
        if (cd[off + A_HC2] === 1.0) {
          jnAcc = cd[off + A_C2_JNACC];
          jtAcc = cd[off + A_C2_JTACC];
          jx = nx * jnAcc - ny * jtAcc;
          jy = ny * jnAcc + nx * jtAcc;

          bd[b1 + B_VELX] -= jx * im1;
          bd[b1 + B_VELY] -= jy * im1;
          bd[b1 + B_ANGVEL] -=
            bd[b1 + B_IINERTIA] * (jy * cd[off + A_C2_R1X] - jx * cd[off + A_C2_R1Y]);
          bd[b2 + B_VELX] += jx * im2;
          bd[b2 + B_VELY] += jy * im2;
          bd[b2 + B_ANGVEL] +=
            bd[b2 + B_IINERTIA] * (jy * cd[off + A_C2_R2X] - jx * cd[off + A_C2_R2Y]);
        }

        // Rolling friction warm start
        const jrAcc = cd[off + A_JRACC];
        bd[b2 + B_ANGVEL] += jrAcc * bd[b2 + B_IINERTIA];
        bd[b1 + B_ANGVEL] -= jrAcc * bd[b1 + B_IINERTIA];
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SoA VELOCITY ITERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Runs `times` velocity solver iterations on the flat SoA buffers.
   *
   * This is the main hot path (~70% of solver time). Each iteration processes
   * fluid drag + collision impulses using only contiguous array reads/writes.
   *
   * Note: User-defined constraints are NOT handled here — they still go
   * through the OOP path in ZPP_Space.iterateVel() since each constraint
   * type has its own virtual applyImpulseVel().
   */
  iterateVelSoA(times: number): void {
    const bd = this.bodyData;
    const cd = this.colData;
    const fd = this.fluidData;
    const colN = this.colCount;
    const fluidN = this.fluidCount;

    for (let iter = 0; iter < times; iter++) {
      // ── Fluid drag ──
      for (let i = 0; i < fluidN; i++) {
        const off = i * FLUID_STRIDE;
        if (fd[off + F_NODRAG] === 1.0) continue;

        const b1 = fd[off + F_B1] | 0;
        const b2 = fd[off + F_B2] | 0;

        const w1 = bd[b1 + B_ANGVEL] + bd[b1 + B_KINANGVEL];
        const w2 = bd[b2 + B_ANGVEL] + bd[b2 + B_KINANGVEL];
        const r1x = fd[off + F_R1X];
        const r1y = fd[off + F_R1Y];
        const r2x = fd[off + F_R2X];
        const r2y = fd[off + F_R2Y];

        let jx =
          bd[b1 + B_VELX] +
          bd[b1 + B_KINVELX] -
          r1y * w1 -
          (bd[b2 + B_VELX] + bd[b2 + B_KINVELX] - r2y * w2);
        let jy =
          bd[b1 + B_VELY] +
          bd[b1 + B_KINVELY] +
          r1x * w1 -
          (bd[b2 + B_VELY] + bd[b2 + B_KINVELY] + r2x * w2);

        const t = fd[off + F_VMASSA] * jx + fd[off + F_VMASSB] * jy;
        jy = fd[off + F_VMASSB] * jx + fd[off + F_VMASSC] * jy;
        jx = t;

        const lgamma = fd[off + F_LGAMMA];
        jx -= fd[off + F_DAMPX] * lgamma;
        jy -= fd[off + F_DAMPY] * lgamma;
        fd[off + F_DAMPX] += jx;
        fd[off + F_DAMPY] += jy;

        const im1 = bd[b1 + B_IMASS];
        bd[b1 + B_VELX] -= jx * im1;
        bd[b1 + B_VELY] -= jy * im1;
        const im2 = bd[b2 + B_IMASS];
        bd[b2 + B_VELX] += jx * im2;
        bd[b2 + B_VELY] += jy * im2;

        const ii1 = bd[b1 + B_IINERTIA];
        const ii2 = bd[b2 + B_IINERTIA];
        bd[b1 + B_ANGVEL] -= ii1 * (jy * r1x - jx * r1y);
        bd[b2 + B_ANGVEL] += ii2 * (jy * r2x - jx * r2y);

        const j_damp = (w1 - w2) * fd[off + F_WMASS] - fd[off + F_ADAMP] * fd[off + F_AGAMMA];
        fd[off + F_ADAMP] += j_damp;
        bd[b1 + B_ANGVEL] -= j_damp * ii1;
        bd[b2 + B_ANGVEL] += j_damp * ii2;
      }

      // ── Collision contacts ──
      for (let i = 0; i < colN; i++) {
        const off = i * COL_STRIDE;
        const b1 = cd[off + A_B1] | 0;
        const b2 = cd[off + A_B2] | 0;
        const nx = cd[off + A_NX];
        const ny = cd[off + A_NY];
        const im1 = bd[b1 + B_IMASS];
        const im2 = bd[b2 + B_IMASS];
        const ii1 = bd[b1 + B_IINERTIA];
        const ii2 = bd[b2 + B_IINERTIA];

        // ── Tangent friction (contact 1) ──
        let v1x =
          cd[off + A_K1X] +
          bd[b2 + B_VELX] -
          cd[off + A_C1_R2Y] * bd[b2 + B_ANGVEL] -
          (bd[b1 + B_VELX] - cd[off + A_C1_R1Y] * bd[b1 + B_ANGVEL]);
        let v1y =
          cd[off + A_K1Y] +
          bd[b2 + B_VELY] +
          cd[off + A_C1_R2X] * bd[b2 + B_ANGVEL] -
          (bd[b1 + B_VELY] + cd[off + A_C1_R1X] * bd[b1 + B_ANGVEL]);

        let j = (v1y * nx - v1x * ny + cd[off + A_SURFX]) * cd[off + A_C1_TMASS];
        let jMax = cd[off + A_C1_FRICTION] * cd[off + A_C1_JNACC];
        let jOld = cd[off + A_C1_JTACC];
        let cjAcc = jOld - j;
        if (cjAcc > jMax) cjAcc = jMax;
        else if (cjAcc < -jMax) cjAcc = -jMax;
        j = cjAcc - jOld;
        cd[off + A_C1_JTACC] = cjAcc;

        let jx = -ny * j;
        let jy = nx * j;
        bd[b2 + B_VELX] += jx * im2;
        bd[b2 + B_VELY] += jy * im2;
        bd[b1 + B_VELX] -= jx * im1;
        bd[b1 + B_VELY] -= jy * im1;
        bd[b2 + B_ANGVEL] += cd[off + A_RT1B] * j * ii2;
        bd[b1 + B_ANGVEL] -= cd[off + A_RT1A] * j * ii1;

        if (cd[off + A_HC2] === 1.0) {
          // ── 2-contact case ──
          // Tangent friction (contact 2)
          let v2x =
            cd[off + A_K2X] +
            bd[b2 + B_VELX] -
            cd[off + A_C2_R2Y] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELX] - cd[off + A_C2_R1Y] * bd[b1 + B_ANGVEL]);
          let v2y =
            cd[off + A_K2Y] +
            bd[b2 + B_VELY] +
            cd[off + A_C2_R2X] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELY] + cd[off + A_C2_R1X] * bd[b1 + B_ANGVEL]);

          j = (v2y * nx - v2x * ny + cd[off + A_SURFX]) * cd[off + A_C2_TMASS];
          jMax = cd[off + A_C2_FRICTION] * cd[off + A_C2_JNACC];
          jOld = cd[off + A_C2_JTACC];
          cjAcc = jOld - j;
          if (cjAcc > jMax) cjAcc = jMax;
          else if (cjAcc < -jMax) cjAcc = -jMax;
          j = cjAcc - jOld;
          cd[off + A_C2_JTACC] = cjAcc;

          jx = -ny * j;
          jy = nx * j;
          bd[b2 + B_VELX] += jx * im2;
          bd[b2 + B_VELY] += jy * im2;
          bd[b1 + B_VELX] -= jx * im1;
          bd[b1 + B_VELY] -= jy * im1;
          bd[b2 + B_ANGVEL] += cd[off + A_RT2B] * j * ii2;
          bd[b1 + B_ANGVEL] -= cd[off + A_RT2A] * j * ii1;

          // Recompute relative velocities for normal impulse
          v1x =
            cd[off + A_K1X] +
            bd[b2 + B_VELX] -
            cd[off + A_C1_R2Y] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELX] - cd[off + A_C1_R1Y] * bd[b1 + B_ANGVEL]);
          v1y =
            cd[off + A_K1Y] +
            bd[b2 + B_VELY] +
            cd[off + A_C1_R2X] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELY] + cd[off + A_C1_R1X] * bd[b1 + B_ANGVEL]);
          v2x =
            cd[off + A_K2X] +
            bd[b2 + B_VELX] -
            cd[off + A_C2_R2Y] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELX] - cd[off + A_C2_R1Y] * bd[b1 + B_ANGVEL]);
          v2y =
            cd[off + A_K2Y] +
            bd[b2 + B_VELY] +
            cd[off + A_C2_R2X] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELY] + cd[off + A_C2_R1X] * bd[b1 + B_ANGVEL]);

          // 2-contact normal impulse (block solver)
          const ax = cd[off + A_C1_JNACC];
          const ay = cd[off + A_C2_JNACC];
          let jnx =
            v1x * nx +
            v1y * ny +
            cd[off + A_SURFY] +
            cd[off + A_C1_BOUNCE] -
            (cd[off + A_KA] * ax + cd[off + A_KB] * ay);
          let jny =
            v2x * nx +
            v2y * ny +
            cd[off + A_SURFY] +
            cd[off + A_C2_BOUNCE] -
            (cd[off + A_KB] * ax + cd[off + A_KC] * ay);

          let xx = -(cd[off + A_KMASSA] * jnx + cd[off + A_KMASSB] * jny);
          let xy = -(cd[off + A_KMASSB] * jnx + cd[off + A_KMASSC] * jny);

          if (xx >= 0 && xy >= 0) {
            jnx = xx - ax;
            jny = xy - ay;
            cd[off + A_C1_JNACC] = xx;
            cd[off + A_C2_JNACC] = xy;
          } else {
            xx = -cd[off + A_C1_NMASS] * jnx;
            if (xx >= 0 && cd[off + A_KB] * xx + jny >= 0) {
              jnx = xx - ax;
              jny = -ay;
              cd[off + A_C1_JNACC] = xx;
              cd[off + A_C2_JNACC] = 0;
            } else {
              xy = -cd[off + A_C2_NMASS] * jny;
              if (xy >= 0 && cd[off + A_KB] * xy + jnx >= 0) {
                jnx = -ax;
                jny = xy - ay;
                cd[off + A_C1_JNACC] = 0;
                cd[off + A_C2_JNACC] = xy;
              } else if (jnx >= 0 && jny >= 0) {
                jnx = -ax;
                jny = -ay;
                cd[off + A_C1_JNACC] = 0;
                cd[off + A_C2_JNACC] = 0;
              } else {
                jnx = 0;
                jny = 0;
              }
            }
          }

          j = jnx + jny;
          jx = nx * j;
          jy = ny * j;
          bd[b2 + B_VELX] += jx * im2;
          bd[b2 + B_VELY] += jy * im2;
          bd[b1 + B_VELX] -= jx * im1;
          bd[b1 + B_VELY] -= jy * im1;
          bd[b2 + B_ANGVEL] += (cd[off + A_RN1B] * jnx + cd[off + A_RN2B] * jny) * ii2;
          bd[b1 + B_ANGVEL] -= (cd[off + A_RN1A] * jnx + cd[off + A_RN2A] * jny) * ii1;
        } else {
          // ── Single contact case ──
          // Rolling friction
          if (cd[off + A_RADIUS] !== 0.0) {
            const dw = bd[b2 + B_ANGVEL] - bd[b1 + B_ANGVEL];
            j = dw * cd[off + A_RMASS];
            jMax = cd[off + A_RFRIC] * cd[off + A_C1_JNACC];
            jOld = cd[off + A_JRACC];
            let newJr = jOld - j;
            if (newJr > jMax) newJr = jMax;
            else if (newJr < -jMax) newJr = -jMax;
            j = newJr - jOld;
            cd[off + A_JRACC] = newJr;
            bd[b2 + B_ANGVEL] += j * ii2;
            bd[b1 + B_ANGVEL] -= j * ii1;
          }

          // Normal impulse (single contact)
          v1x =
            cd[off + A_K1X] +
            bd[b2 + B_VELX] -
            cd[off + A_C1_R2Y] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELX] - cd[off + A_C1_R1Y] * bd[b1 + B_ANGVEL]);
          v1y =
            cd[off + A_K1Y] +
            bd[b2 + B_VELY] +
            cd[off + A_C1_R2X] * bd[b2 + B_ANGVEL] -
            (bd[b1 + B_VELY] + cd[off + A_C1_R1X] * bd[b1 + B_ANGVEL]);

          j =
            (cd[off + A_C1_BOUNCE] + (nx * v1x + ny * v1y) + cd[off + A_SURFY]) *
            cd[off + A_C1_NMASS];
          jOld = cd[off + A_C1_JNACC];
          cjAcc = jOld - j;
          if (cjAcc < 0.0) cjAcc = 0.0;
          j = cjAcc - jOld;
          cd[off + A_C1_JNACC] = cjAcc;

          jx = nx * j;
          jy = ny * j;
          bd[b2 + B_VELX] += jx * im2;
          bd[b2 + B_VELY] += jy * im2;
          bd[b1 + B_VELX] -= jx * im1;
          bd[b1 + B_VELY] -= jy * im1;
          bd[b2 + B_ANGVEL] += cd[off + A_RN1B] * j * ii2;
          bd[b1 + B_ANGVEL] -= cd[off + A_RN1A] * j * ii1;
        }
      }
    }
  }
}
