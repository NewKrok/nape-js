/**
 * WGSL compute shaders for GPU-accelerated physics solving.
 *
 * These shaders operate on the same SoA data layout as SolverBuffers,
 * with Float32 precision (GPU-native). Each shader solves one color group
 * per dispatch — contacts within a group are guaranteed independent.
 */

// ── Body SoA field offsets (must match SolverBuffers BODY_STRIDE) ──
/** GPU body stride — velocity solver uses compact 8-field layout. */
export const GPU_BODY_STRIDE = 8;

/** CPU SoA body stride — full 15-field layout. */
export const CPU_BODY_STRIDE = 15;

// ── Collision arbiter offsets (must match SolverBuffers COL_STRIDE = 64) ──
export const GPU_COL_STRIDE = 64;

// ── Fluid arbiter offsets (must match SolverBuffers FLUID_STRIDE) ──
export const GPU_FLUID_STRIDE = 16;

/**
 * WGSL constants shared by all shaders — field offsets into the SoA buffers.
 * Injected at the top of each shader module.
 */
const SHARED_CONSTANTS = /* wgsl */ `
// Body field offsets (stride = 15, full SoA layout)
const B_VELX: u32      = 0u;
const B_VELY: u32      = 1u;
const B_ANGVEL: u32    = 2u;
const B_IMASS: u32     = 3u;
const B_IINERTIA: u32  = 4u;
const B_KINVELX: u32   = 5u;
const B_KINVELY: u32   = 6u;
const B_KINANGVEL: u32 = 7u;
const B_POSX: u32      = 8u;
const B_POSY: u32      = 9u;
const B_ROT: u32       = 10u;
const B_AXISX: u32     = 11u;
const B_AXISY: u32     = 12u;
const B_SMASS: u32     = 13u;
const B_SINERTIA: u32  = 14u;
const BODY_STRIDE: u32 = 15u;

// Collision arbiter field offsets (stride = 64)
const A_B1: u32       = 0u;
const A_B2: u32       = 1u;
const A_C1_R1X: u32   = 2u;
const A_C1_R1Y: u32   = 3u;
const A_C1_R2X: u32   = 4u;
const A_C1_R2Y: u32   = 5u;
const A_C1_TMASS: u32  = 6u;
const A_C1_NMASS: u32  = 7u;
const A_C1_FRICTION: u32 = 8u;
const A_C1_JNACC: u32 = 9u;
const A_C1_JTACC: u32 = 10u;
const A_C1_BOUNCE: u32 = 11u;
const A_NX: u32       = 12u;
const A_NY: u32       = 13u;
const A_SURFX: u32    = 14u;
const A_SURFY: u32    = 15u;
const A_RN1A: u32     = 16u;
const A_RT1A: u32     = 17u;
const A_RN1B: u32     = 18u;
const A_RT1B: u32     = 19u;
const A_K1X: u32      = 20u;
const A_K1Y: u32      = 21u;
const A_HC2: u32      = 22u;
const A_C2_R1X: u32   = 23u;
const A_C2_R1Y: u32   = 24u;
const A_C2_R2X: u32   = 25u;
const A_C2_R2Y: u32   = 26u;
const A_C2_TMASS: u32  = 27u;
const A_C2_NMASS: u32  = 28u;
const A_C2_FRICTION: u32 = 29u;
const A_C2_JNACC: u32 = 30u;
const A_C2_JTACC: u32 = 31u;
const A_C2_BOUNCE: u32 = 32u;
const A_K2X: u32      = 33u;
const A_K2Y: u32      = 34u;
const A_RN2A: u32     = 35u;
const A_RN2B: u32     = 36u;
const A_RT2A: u32     = 37u;
const A_RT2B: u32     = 38u;
const A_KMASSA: u32   = 39u;
const A_KMASSB: u32   = 40u;
const A_KMASSC: u32   = 41u;
const A_KA: u32       = 42u;
const A_KB: u32       = 43u;
const A_KC: u32       = 44u;
const A_RMASS: u32    = 45u;
const A_JRACC: u32    = 46u;
const A_RFRIC: u32    = 47u;
const A_RADIUS: u32   = 48u;
// Position solver fields (49-63)
const A_PTYPE: u32     = 49u;
const A_LNORMX: u32   = 50u;
const A_LNORMY: u32   = 51u;
const A_LPROJ: u32    = 52u;
const A_BIASCOEF: u32 = 53u;
const A_REV: u32      = 54u;
const A_HPC2: u32     = 55u;
const A_C1_LR1X: u32  = 56u;
const A_C1_LR1Y: u32  = 57u;
const A_C1_LR2X: u32  = 58u;
const A_C1_LR2Y: u32  = 59u;
const A_C2_LR1X: u32  = 60u;
const A_C2_LR1Y: u32  = 61u;
const A_C2_LR2X: u32  = 62u;
const A_C2_LR2Y: u32  = 63u;
const COL_STRIDE: u32 = 64u;  // matches SolverBuffers

// Fluid arbiter field offsets (stride = 16)
const F_B1: u32      = 0u;
const F_B2: u32      = 1u;
const F_R1X: u32     = 2u;
const F_R1Y: u32     = 3u;
const F_R2X: u32     = 4u;
const F_R2Y: u32     = 5u;
const F_VMASSA: u32  = 6u;
const F_VMASSB: u32  = 7u;
const F_VMASSC: u32  = 8u;
const F_DAMPX: u32   = 9u;
const F_DAMPY: u32   = 10u;
const F_LGAMMA: u32  = 11u;
const F_WMASS: u32   = 12u;
const F_ADAMP: u32   = 13u;
const F_AGAMMA: u32  = 14u;
const F_NODRAG: u32  = 15u;
const FLUID_STRIDE: u32 = 16u;
`;

/**
 * Contact solver compute shader.
 *
 * Each invocation solves one collision contact. Dispatched once per color
 * group — all contacts in a group are independent (no shared bodies).
 *
 * Bindings:
 *   @group(0) @binding(0) bodies:     read_write storage (f32 array)
 *   @group(0) @binding(1) contacts:   read_write storage (f32 array)
 *   @group(0) @binding(2) colorOrder: read storage (u32 array)
 *   @group(0) @binding(3) allParams:  read storage (u32 array, pairs of [start, count])
 *   @group(0) @binding(4) groupIdx:   uniform { idx }
 */
export const CONTACT_SOLVER_WGSL =
  SHARED_CONSTANTS +
  /* wgsl */ `

struct GroupIdx {
  idx: u32,
}

@group(0) @binding(0) var<storage, read_write> bd: array<f32>;
@group(0) @binding(1) var<storage, read_write> cd: array<f32>;
@group(0) @binding(2) var<storage, read> colorOrder: array<u32>;
@group(0) @binding(3) var<storage, read> allParams: array<u32>;
@group(0) @binding(4) var<uniform> groupIdx: GroupIdx;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let pOff = groupIdx.idx * 2u;
  let colorStart = allParams[pOff];
  let colorCount = allParams[pOff + 1u];
  let idx = gid.x;
  if (idx >= colorCount) { return; }

  let i = colorOrder[colorStart + idx];
  let off = i * COL_STRIDE;

  let b1 = u32(cd[off + A_B1]);
  let b2 = u32(cd[off + A_B2]);
  let nx = cd[off + A_NX];
  let ny = cd[off + A_NY];
  let im1 = bd[b1 + B_IMASS];
  let im2 = bd[b2 + B_IMASS];
  let ii1 = bd[b1 + B_IINERTIA];
  let ii2 = bd[b2 + B_IINERTIA];

  // ── Tangent friction (contact 1) ──
  var v1x = cd[off + A_K1X]
    + bd[b2 + B_VELX] - cd[off + A_C1_R2Y] * bd[b2 + B_ANGVEL]
    - (bd[b1 + B_VELX] - cd[off + A_C1_R1Y] * bd[b1 + B_ANGVEL]);
  var v1y = cd[off + A_K1Y]
    + bd[b2 + B_VELY] + cd[off + A_C1_R2X] * bd[b2 + B_ANGVEL]
    - (bd[b1 + B_VELY] + cd[off + A_C1_R1X] * bd[b1 + B_ANGVEL]);

  var j = (v1y * nx - v1x * ny + cd[off + A_SURFX]) * cd[off + A_C1_TMASS];
  var jMax = cd[off + A_C1_FRICTION] * cd[off + A_C1_JNACC];
  var jOld = cd[off + A_C1_JTACC];
  var cjAcc = clamp(jOld - j, -jMax, jMax);
  j = cjAcc - jOld;
  cd[off + A_C1_JTACC] = cjAcc;

  var jx = -ny * j;
  var jy = nx * j;
  bd[b2 + B_VELX] += jx * im2;
  bd[b2 + B_VELY] += jy * im2;
  bd[b1 + B_VELX] -= jx * im1;
  bd[b1 + B_VELY] -= jy * im1;
  bd[b2 + B_ANGVEL] += cd[off + A_RT1B] * j * ii2;
  bd[b1 + B_ANGVEL] -= cd[off + A_RT1A] * j * ii1;

  if (cd[off + A_HC2] == 1.0) {
    // ── 2-contact case ──
    var v2x = cd[off + A_K2X]
      + bd[b2 + B_VELX] - cd[off + A_C2_R2Y] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELX] - cd[off + A_C2_R1Y] * bd[b1 + B_ANGVEL]);
    var v2y = cd[off + A_K2Y]
      + bd[b2 + B_VELY] + cd[off + A_C2_R2X] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELY] + cd[off + A_C2_R1X] * bd[b1 + B_ANGVEL]);

    j = (v2y * nx - v2x * ny + cd[off + A_SURFX]) * cd[off + A_C2_TMASS];
    jMax = cd[off + A_C2_FRICTION] * cd[off + A_C2_JNACC];
    jOld = cd[off + A_C2_JTACC];
    cjAcc = clamp(jOld - j, -jMax, jMax);
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

    // Recompute relative velocities
    v1x = cd[off + A_K1X]
      + bd[b2 + B_VELX] - cd[off + A_C1_R2Y] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELX] - cd[off + A_C1_R1Y] * bd[b1 + B_ANGVEL]);
    v1y = cd[off + A_K1Y]
      + bd[b2 + B_VELY] + cd[off + A_C1_R2X] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELY] + cd[off + A_C1_R1X] * bd[b1 + B_ANGVEL]);
    v2x = cd[off + A_K2X]
      + bd[b2 + B_VELX] - cd[off + A_C2_R2Y] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELX] - cd[off + A_C2_R1Y] * bd[b1 + B_ANGVEL]);
    v2y = cd[off + A_K2Y]
      + bd[b2 + B_VELY] + cd[off + A_C2_R2X] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELY] + cd[off + A_C2_R1X] * bd[b1 + B_ANGVEL]);

    // Block solver for 2 normal impulses
    let ax = cd[off + A_C1_JNACC];
    let ay = cd[off + A_C2_JNACC];
    var jnx = v1x * nx + v1y * ny + cd[off + A_SURFY] + cd[off + A_C1_BOUNCE]
      - (cd[off + A_KA] * ax + cd[off + A_KB] * ay);
    var jny = v2x * nx + v2y * ny + cd[off + A_SURFY] + cd[off + A_C2_BOUNCE]
      - (cd[off + A_KB] * ax + cd[off + A_KC] * ay);

    var xx = -(cd[off + A_KMASSA] * jnx + cd[off + A_KMASSB] * jny);
    var xy = -(cd[off + A_KMASSB] * jnx + cd[off + A_KMASSC] * jny);

    if (xx >= 0.0 && xy >= 0.0) {
      jnx = xx - ax;
      jny = xy - ay;
      cd[off + A_C1_JNACC] = xx;
      cd[off + A_C2_JNACC] = xy;
    } else {
      xx = -cd[off + A_C1_NMASS] * jnx;
      if (xx >= 0.0 && cd[off + A_KB] * xx + jny >= 0.0) {
        jnx = xx - ax;
        jny = -ay;
        cd[off + A_C1_JNACC] = xx;
        cd[off + A_C2_JNACC] = 0.0;
      } else {
        xy = -cd[off + A_C2_NMASS] * jny;
        if (xy >= 0.0 && cd[off + A_KB] * xy + jnx >= 0.0) {
          jnx = -ax;
          jny = xy - ay;
          cd[off + A_C1_JNACC] = 0.0;
          cd[off + A_C2_JNACC] = xy;
        } else if (jnx >= 0.0 && jny >= 0.0) {
          jnx = -ax;
          jny = -ay;
          cd[off + A_C1_JNACC] = 0.0;
          cd[off + A_C2_JNACC] = 0.0;
        } else {
          jnx = 0.0;
          jny = 0.0;
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
    if (cd[off + A_RADIUS] != 0.0) {
      let dw = bd[b2 + B_ANGVEL] - bd[b1 + B_ANGVEL];
      j = dw * cd[off + A_RMASS];
      jMax = cd[off + A_RFRIC] * cd[off + A_C1_JNACC];
      jOld = cd[off + A_JRACC];
      var newJr = clamp(jOld - j, -jMax, jMax);
      j = newJr - jOld;
      cd[off + A_JRACC] = newJr;
      bd[b2 + B_ANGVEL] += j * ii2;
      bd[b1 + B_ANGVEL] -= j * ii1;
    }

    v1x = cd[off + A_K1X]
      + bd[b2 + B_VELX] - cd[off + A_C1_R2Y] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELX] - cd[off + A_C1_R1Y] * bd[b1 + B_ANGVEL]);
    v1y = cd[off + A_K1Y]
      + bd[b2 + B_VELY] + cd[off + A_C1_R2X] * bd[b2 + B_ANGVEL]
      - (bd[b1 + B_VELY] + cd[off + A_C1_R1X] * bd[b1 + B_ANGVEL]);

    j = (cd[off + A_C1_BOUNCE] + (nx * v1x + ny * v1y) + cd[off + A_SURFY]) * cd[off + A_C1_NMASS];
    jOld = cd[off + A_C1_JNACC];
    cjAcc = max(jOld - j, 0.0);
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
`;

/**
 * Fluid solver compute shader.
 *
 * Each invocation solves one fluid arbiter (drag + angular damping).
 * Dispatched once per fluid color group.
 */
export const FLUID_SOLVER_WGSL =
  SHARED_CONSTANTS +
  /* wgsl */ `

struct GroupIdx {
  idx: u32,
}

@group(0) @binding(0) var<storage, read_write> bd: array<f32>;
@group(0) @binding(1) var<storage, read_write> fd: array<f32>;
@group(0) @binding(2) var<storage, read> colorOrder: array<u32>;
@group(0) @binding(3) var<storage, read> allParams: array<u32>;
@group(0) @binding(4) var<uniform> groupIdx: GroupIdx;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let pOff = groupIdx.idx * 2u;
  let colorStart = allParams[pOff];
  let colorCount = allParams[pOff + 1u];
  let idx = gid.x;
  if (idx >= colorCount) { return; }

  let i = colorOrder[colorStart + idx];
  let off = i * FLUID_STRIDE;

  if (fd[off + F_NODRAG] == 1.0) { return; }

  let b1 = u32(fd[off + F_B1]);
  let b2 = u32(fd[off + F_B2]);

  let w1 = bd[b1 + B_ANGVEL] + bd[b1 + B_KINANGVEL];
  let w2 = bd[b2 + B_ANGVEL] + bd[b2 + B_KINANGVEL];
  let r1x = fd[off + F_R1X];
  let r1y = fd[off + F_R1Y];
  let r2x = fd[off + F_R2X];
  let r2y = fd[off + F_R2Y];

  var jx = bd[b1 + B_VELX] + bd[b1 + B_KINVELX] - r1y * w1
    - (bd[b2 + B_VELX] + bd[b2 + B_KINVELX] - r2y * w2);
  var jy = bd[b1 + B_VELY] + bd[b1 + B_KINVELY] + r1x * w1
    - (bd[b2 + B_VELY] + bd[b2 + B_KINVELY] + r2x * w2);

  let t = fd[off + F_VMASSA] * jx + fd[off + F_VMASSB] * jy;
  jy = fd[off + F_VMASSB] * jx + fd[off + F_VMASSC] * jy;
  jx = t;

  let lgamma = fd[off + F_LGAMMA];
  jx -= fd[off + F_DAMPX] * lgamma;
  jy -= fd[off + F_DAMPY] * lgamma;
  fd[off + F_DAMPX] += jx;
  fd[off + F_DAMPY] += jy;

  let im1 = bd[b1 + B_IMASS];
  bd[b1 + B_VELX] -= jx * im1;
  bd[b1 + B_VELY] -= jy * im1;
  let im2 = bd[b2 + B_IMASS];
  bd[b2 + B_VELX] += jx * im2;
  bd[b2 + B_VELY] += jy * im2;

  let ii1 = bd[b1 + B_IINERTIA];
  let ii2 = bd[b2 + B_IINERTIA];
  bd[b1 + B_ANGVEL] -= ii1 * (jy * r1x - jx * r1y);
  bd[b2 + B_ANGVEL] += ii2 * (jy * r2x - jx * r2y);

  let j_damp = (w1 - w2) * fd[off + F_WMASS] - fd[off + F_ADAMP] * fd[off + F_AGAMMA];
  fd[off + F_ADAMP] += j_damp;
  bd[b1 + B_ANGVEL] -= j_damp * ii1;
  bd[b2 + B_ANGVEL] += j_damp * ii2;
}
`;

/**
 * Warm start compute shader for collision arbiters.
 * Applied once before iterations — applies cached impulses from previous frame.
 */
export const WARM_START_COLLISION_WGSL =
  SHARED_CONSTANTS +
  /* wgsl */ `

struct Params {
  count: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> bd: array<f32>;
@group(0) @binding(1) var<storage, read> cd: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.count) { return; }

  let off = i * COL_STRIDE;
  let b1 = u32(cd[off + A_B1]);
  let b2 = u32(cd[off + A_B2]);
  let nx = cd[off + A_NX];
  let ny = cd[off + A_NY];

  var jnAcc = cd[off + A_C1_JNACC];
  var jtAcc = cd[off + A_C1_JTACC];
  var jx = nx * jnAcc - ny * jtAcc;
  var jy = ny * jnAcc + nx * jtAcc;

  let im1 = bd[b1 + B_IMASS];
  bd[b1 + B_VELX] -= jx * im1;
  bd[b1 + B_VELY] -= jy * im1;
  bd[b1 + B_ANGVEL] -= bd[b1 + B_IINERTIA] * (jy * cd[off + A_C1_R1X] - jx * cd[off + A_C1_R1Y]);

  let im2 = bd[b2 + B_IMASS];
  bd[b2 + B_VELX] += jx * im2;
  bd[b2 + B_VELY] += jy * im2;
  bd[b2 + B_ANGVEL] += bd[b2 + B_IINERTIA] * (jy * cd[off + A_C1_R2X] - jx * cd[off + A_C1_R2Y]);

  if (cd[off + A_HC2] == 1.0) {
    jnAcc = cd[off + A_C2_JNACC];
    jtAcc = cd[off + A_C2_JTACC];
    jx = nx * jnAcc - ny * jtAcc;
    jy = ny * jnAcc + nx * jtAcc;

    bd[b1 + B_VELX] -= jx * im1;
    bd[b1 + B_VELY] -= jy * im1;
    bd[b1 + B_ANGVEL] -= bd[b1 + B_IINERTIA] * (jy * cd[off + A_C2_R1X] - jx * cd[off + A_C2_R1Y]);
    bd[b2 + B_VELX] += jx * im2;
    bd[b2 + B_VELY] += jy * im2;
    bd[b2 + B_ANGVEL] += bd[b2 + B_IINERTIA] * (jy * cd[off + A_C2_R2X] - jx * cd[off + A_C2_R2Y]);
  }

  let jrAcc = cd[off + A_JRACC];
  bd[b2 + B_ANGVEL] += jrAcc * bd[b2 + B_IINERTIA];
  bd[b1 + B_ANGVEL] -= jrAcc * bd[b1 + B_IINERTIA];
}
`;

/**
 * Position solver compute shader.
 *
 * Each invocation solves one position contact. Dispatched per color group.
 * Modifies body positions (POSX, POSY) and rotation (ROT, AXISX, AXISY).
 *
 * Bindings: same as contact solver + posParams uniform with
 * { collisionSlop, epsilon } config values.
 */
export const POSITION_SOLVER_WGSL =
  SHARED_CONSTANTS +
  /* wgsl */ `

struct GroupIdx {
  idx: u32,
}

struct PosConfig {
  collisionSlop: f32,
  epsilon: f32,
}

@group(0) @binding(0) var<storage, read_write> bd: array<f32>;
@group(0) @binding(1) var<storage, read> cd: array<f32>;
@group(0) @binding(2) var<storage, read> colorOrder: array<u32>;
@group(0) @binding(3) var<storage, read> allParams: array<u32>;
@group(0) @binding(4) var<uniform> groupIdx: GroupIdx;
@group(0) @binding(5) var<uniform> posConfig: PosConfig;

fn applyRotation(boff: u32, dr: f32) {
  bd[boff + B_ROT] += dr;
  if (dr * dr > 0.0001) {
    bd[boff + B_AXISX] = sin(bd[boff + B_ROT]);
    bd[boff + B_AXISY] = cos(bd[boff + B_ROT]);
  } else {
    let d2 = dr * dr;
    let p = 1.0 - 0.5 * d2;
    let m = 1.0 - (d2 * d2) / 8.0;
    let oldAx = bd[boff + B_AXISX];
    let oldAy = bd[boff + B_AXISY];
    bd[boff + B_AXISX] = (p * oldAx + dr * oldAy) * m;
    bd[boff + B_AXISY] = (p * oldAy - dr * oldAx) * m;
  }
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let pOff = groupIdx.idx * 2u;
  let colorStart = allParams[pOff];
  let colorCount = allParams[pOff + 1u];
  let idx = gid.x;
  if (idx >= colorCount) { return; }

  let i = colorOrder[colorStart + idx];
  let off = i * COL_STRIDE;

  let b1 = u32(cd[off + A_B1]);
  let b2 = u32(cd[off + A_B2]);
  let ptype = u32(cd[off + A_PTYPE]);
  let radius = cd[off + A_RADIUS];
  let slop = posConfig.collisionSlop;
  let eps = posConfig.epsilon;

  if (ptype == 2u) {
    // ── Circle contact ──
    let lr2x = cd[off + A_C1_LR2X];
    let lr2y = cd[off + A_C1_LR2Y];
    var r2x = bd[b2 + B_AXISY] * lr2x - bd[b2 + B_AXISX] * lr2y + bd[b2 + B_POSX];
    var r2y = lr2x * bd[b2 + B_AXISX] + lr2y * bd[b2 + B_AXISY] + bd[b2 + B_POSY];
    let lr1x = cd[off + A_C1_LR1X];
    let lr1y = cd[off + A_C1_LR1Y];
    var r1x = bd[b1 + B_AXISY] * lr1x - bd[b1 + B_AXISX] * lr1y + bd[b1 + B_POSX];
    var r1y = lr1x * bd[b1 + B_AXISX] + lr1y * bd[b1 + B_AXISY] + bd[b1 + B_POSY];

    var dx = r2x - r1x;
    var dy = r2y - r1y;
    let dl = sqrt(dx * dx + dy * dy);
    let r = radius - slop;
    var err = dl - r;

    let arbNx = cd[off + A_NX];
    let arbNy = cd[off + A_NY];
    if (dx * arbNx + dy * arbNy < 0.0) {
      dx = -dx;
      dy = -dy;
      err -= radius;
    }

    if (err < 0.0) {
      if (dl < eps) {
        if (bd[b1 + B_SMASS] != 0.0) {
          bd[b1 + B_POSX] += eps * 10.0;
        } else {
          bd[b2 + B_POSX] += eps * 10.0;
        }
      } else {
        let invDl = 1.0 / dl;
        dx *= invDl;
        dy *= invDl;
        let px = 0.5 * (r1x + r2x);
        let py = 0.5 * (r1y + r2y);
        let pen = dl - r;
        r1x = px - bd[b1 + B_POSX];
        r1y = py - bd[b1 + B_POSY];
        r2x = px - bd[b2 + B_POSX];
        r2y = py - bd[b2 + B_POSY];
        let rn1 = dy * r1x - dx * r1y;
        let rn2 = dy * r2x - dx * r2y;
        let K = bd[b2 + B_SMASS] + rn2 * rn2 * bd[b2 + B_SINERTIA]
              + bd[b1 + B_SMASS] + rn1 * rn1 * bd[b1 + B_SINERTIA];
        if (K != 0.0) {
          let biasCoef = cd[off + A_BIASCOEF];
          let jn = (-biasCoef * pen) / K;
          let Jx = dx * jn;
          let Jy = dy * jn;
          bd[b1 + B_POSX] -= Jx * bd[b1 + B_IMASS];
          bd[b1 + B_POSY] -= Jy * bd[b1 + B_IMASS];
          applyRotation(b1, -rn1 * bd[b1 + B_IINERTIA] * jn);
          bd[b2 + B_POSX] += Jx * bd[b2 + B_IMASS];
          bd[b2 + B_POSY] += Jy * bd[b2 + B_IMASS];
          applyRotation(b2, rn2 * bd[b2 + B_IINERTIA] * jn);
        }
      }
    }
  } else {
    // ── Polygon face contact ──
    let lnormx = cd[off + A_LNORMX];
    let lnormy = cd[off + A_LNORMY];
    let lproj = cd[off + A_LPROJ];

    var gnormx: f32; var gnormy: f32; var gproj: f32;
    var clip1x: f32; var clip1y: f32;
    var clip2x: f32 = 0.0; var clip2y: f32 = 0.0;

    if (ptype == 0u) {
      gnormx = bd[b1 + B_AXISY] * lnormx - bd[b1 + B_AXISX] * lnormy;
      gnormy = lnormx * bd[b1 + B_AXISX] + lnormy * bd[b1 + B_AXISY];
      gproj = lproj + (gnormx * bd[b1 + B_POSX] + gnormy * bd[b1 + B_POSY]);
      let c1lr1x = cd[off + A_C1_LR1X]; let c1lr1y = cd[off + A_C1_LR1Y];
      clip1x = bd[b2 + B_AXISY] * c1lr1x - bd[b2 + B_AXISX] * c1lr1y + bd[b2 + B_POSX];
      clip1y = c1lr1x * bd[b2 + B_AXISX] + c1lr1y * bd[b2 + B_AXISY] + bd[b2 + B_POSY];
      if (cd[off + A_HPC2] == 1.0) {
        let c2lr1x = cd[off + A_C2_LR1X]; let c2lr1y = cd[off + A_C2_LR1Y];
        clip2x = bd[b2 + B_AXISY] * c2lr1x - bd[b2 + B_AXISX] * c2lr1y + bd[b2 + B_POSX];
        clip2y = c2lr1x * bd[b2 + B_AXISX] + c2lr1y * bd[b2 + B_AXISY] + bd[b2 + B_POSY];
      }
    } else {
      gnormx = bd[b2 + B_AXISY] * lnormx - bd[b2 + B_AXISX] * lnormy;
      gnormy = lnormx * bd[b2 + B_AXISX] + lnormy * bd[b2 + B_AXISY];
      gproj = lproj + (gnormx * bd[b2 + B_POSX] + gnormy * bd[b2 + B_POSY]);
      let c1lr1x = cd[off + A_C1_LR1X]; let c1lr1y = cd[off + A_C1_LR1Y];
      clip1x = bd[b1 + B_AXISY] * c1lr1x - bd[b1 + B_AXISX] * c1lr1y + bd[b1 + B_POSX];
      clip1y = c1lr1x * bd[b1 + B_AXISX] + c1lr1y * bd[b1 + B_AXISY] + bd[b1 + B_POSY];
      if (cd[off + A_HPC2] == 1.0) {
        let c2lr1x = cd[off + A_C2_LR1X]; let c2lr1y = cd[off + A_C2_LR1Y];
        clip2x = bd[b1 + B_AXISY] * c2lr1x - bd[b1 + B_AXISX] * c2lr1y + bd[b1 + B_POSX];
        clip2y = c2lr1x * bd[b1 + B_AXISX] + c2lr1y * bd[b1 + B_AXISY] + bd[b1 + B_POSY];
      }
    }

    var err1 = clip1x * gnormx + clip1y * gnormy - gproj - radius + slop;
    var err2: f32 = 0.0;
    let hasC2 = cd[off + A_HPC2] == 1.0;
    if (hasC2) {
      err2 = clip2x * gnormx + clip2y * gnormy - gproj - radius + slop;
    }

    if (err1 < 0.0 || err2 < 0.0) {
      if (cd[off + A_REV] == 1.0) {
        gnormx = -gnormx;
        gnormy = -gnormy;
      }

      let c1r1x = clip1x - bd[b1 + B_POSX];
      let c1r1y = clip1y - bd[b1 + B_POSY];
      let c1r2x = clip1x - bd[b2 + B_POSX];
      let c1r2y = clip1y - bd[b2 + B_POSY];
      let im1 = bd[b1 + B_IMASS];
      let im2 = bd[b2 + B_IMASS];
      let ii1 = bd[b1 + B_IINERTIA];
      let ii2 = bd[b2 + B_IINERTIA];
      let biasCoef = cd[off + A_BIASCOEF];

      if (hasC2) {
        let c2r1x = clip2x - bd[b1 + B_POSX];
        let c2r1y = clip2y - bd[b1 + B_POSY];
        let c2r2x = clip2x - bd[b2 + B_POSX];
        let c2r2y = clip2y - bd[b2 + B_POSY];
        let rn1a = gnormy * c1r1x - gnormx * c1r1y;
        let rn1b = gnormy * c1r2x - gnormx * c1r2y;
        let rn2a = gnormy * c2r1x - gnormx * c2r1y;
        let rn2b = gnormy * c2r2x - gnormx * c2r2y;
        let mass_sum = bd[b1 + B_SMASS] + bd[b2 + B_SMASS];
        let si1 = bd[b1 + B_SINERTIA]; let si2 = bd[b2 + B_SINERTIA];
        let kMassa = mass_sum + si1 * rn1a * rn1a + si2 * rn1b * rn1b;
        let kMassb = mass_sum + si1 * rn1a * rn2a + si2 * rn1b * rn2b;
        let kMassc = mass_sum + si1 * rn2a * rn2a + si2 * rn2b * rn2b;
        let bx = err1 * biasCoef;
        let by = err2 * biasCoef;

        // 2x2 block solve
        var xx = -bx; var xy = -by;
        var det = kMassa * kMassc - kMassb * kMassb;
        if (det == 0.0) {
          if (kMassa != 0.0) { xx /= kMassa; } else { xx = 0.0; }
          if (kMassc != 0.0) { xy /= kMassc; } else { xy = 0.0; }
        } else {
          det = 1.0 / det;
          let t = det * (kMassc * xx - kMassb * xy);
          xy = det * (kMassa * xy - kMassb * xx);
          xx = t;
        }

        if (xx >= 0.0 && xy >= 0.0) {
          let t1 = (xx + xy) * im1;
          bd[b1 + B_POSX] -= gnormx * t1;
          bd[b1 + B_POSY] -= gnormy * t1;
          applyRotation(b1, -ii1 * (rn1a * xx + rn2a * xy));
          let t2 = (xx + xy) * im2;
          bd[b2 + B_POSX] += gnormx * t2;
          bd[b2 + B_POSY] += gnormy * t2;
          applyRotation(b2, ii2 * (rn1b * xx + rn2b * xy));
        } else {
          // Fallback: contact 1 only
          xx = -bx / kMassa; xy = 0.0;
          let vn2 = kMassb * xx + by;
          if (xx >= 0.0 && vn2 >= 0.0) {
            let t1 = xx * im1;
            bd[b1 + B_POSX] -= gnormx * t1;
            bd[b1 + B_POSY] -= gnormy * t1;
            applyRotation(b1, -ii1 * rn1a * xx);
            let t2 = xx * im2;
            bd[b2 + B_POSX] += gnormx * t2;
            bd[b2 + B_POSY] += gnormy * t2;
            applyRotation(b2, ii2 * rn1b * xx);
          } else {
            // Fallback: contact 2 only
            xx = 0.0; xy = -by / kMassc;
            let vn1 = kMassb * xy + bx;
            if (xy >= 0.0 && vn1 >= 0.0) {
              let t1 = xy * im1;
              bd[b1 + B_POSX] -= gnormx * t1;
              bd[b1 + B_POSY] -= gnormy * t1;
              applyRotation(b1, -ii1 * rn2a * xy);
              let t2 = xy * im2;
              bd[b2 + B_POSX] += gnormx * t2;
              bd[b2 + B_POSY] += gnormy * t2;
              applyRotation(b2, ii2 * rn2b * xy);
            }
          }
        }
      } else {
        // Single contact
        let rn1 = gnormy * c1r1x - gnormx * c1r1y;
        let rn2 = gnormy * c1r2x - gnormx * c1r2y;
        let K = bd[b2 + B_SMASS] + rn2 * rn2 * bd[b2 + B_SINERTIA]
              + bd[b1 + B_SMASS] + rn1 * rn1 * bd[b1 + B_SINERTIA];
        if (K != 0.0) {
          let jn = (-biasCoef * err1) / K;
          let Jx = gnormx * jn;
          let Jy = gnormy * jn;
          bd[b1 + B_POSX] -= Jx * im1;
          bd[b1 + B_POSY] -= Jy * im1;
          applyRotation(b1, -rn1 * ii1 * jn);
          bd[b2 + B_POSX] += Jx * im2;
          bd[b2 + B_POSY] += Jy * im2;
          applyRotation(b2, rn2 * ii2 * jn);
        }
      }
    }
  }
}
`;
