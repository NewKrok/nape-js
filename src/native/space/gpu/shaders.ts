/**
 * WGSL compute shaders for GPU-accelerated physics solving.
 *
 * These shaders operate on the same SoA data layout as SolverBuffers,
 * with Float32 precision (GPU-native). Each shader solves one color group
 * per dispatch — contacts within a group are guaranteed independent.
 */

// ── Body SoA field offsets (must match SolverBuffers BODY_STRIDE) ──
export const GPU_BODY_STRIDE = 8;

// ── Collision arbiter offsets (must match SolverBuffers COL_STRIDE) ──
export const GPU_COL_STRIDE = 49;

// ── Fluid arbiter offsets (must match SolverBuffers FLUID_STRIDE) ──
export const GPU_FLUID_STRIDE = 16;

/**
 * WGSL constants shared by all shaders — field offsets into the SoA buffers.
 * Injected at the top of each shader module.
 */
const SHARED_CONSTANTS = /* wgsl */ `
// Body field offsets (stride = 8)
const B_VELX: u32    = 0u;
const B_VELY: u32    = 1u;
const B_ANGVEL: u32  = 2u;
const B_IMASS: u32   = 3u;
const B_IINERTIA: u32 = 4u;
const B_KINVELX: u32  = 5u;
const B_KINVELY: u32  = 6u;
const B_KINANGVEL: u32 = 7u;

// Collision arbiter field offsets (stride = 49)
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
const COL_STRIDE: u32 = 49u;

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
 *   @group(0) @binding(3) params:     uniform { colorStart, colorCount }
 */
export const CONTACT_SOLVER_WGSL =
  SHARED_CONSTANTS +
  /* wgsl */ `

struct Params {
  colorStart: u32,
  colorCount: u32,
}

@group(0) @binding(0) var<storage, read_write> bd: array<f32>;
@group(0) @binding(1) var<storage, read_write> cd: array<f32>;
@group(0) @binding(2) var<storage, read> colorOrder: array<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.colorCount) { return; }

  let i = colorOrder[params.colorStart + idx];
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

struct Params {
  colorStart: u32,
  colorCount: u32,
}

@group(0) @binding(0) var<storage, read_write> bd: array<f32>;
@group(0) @binding(1) var<storage, read_write> fd: array<f32>;
@group(0) @binding(2) var<storage, read> colorOrder: array<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.colorCount) { return; }

  let i = colorOrder[params.colorStart + idx];
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
