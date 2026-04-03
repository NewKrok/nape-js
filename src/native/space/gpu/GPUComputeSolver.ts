/**
 * GPUComputeSolver — WebGPU compute shader accelerator for the velocity solver.
 *
 * Manages GPU device, pipelines, buffers, and dispatches. Works alongside
 * SolverBuffers: the CPU side packs data into Float64Arrays, this class
 * converts to Float32, uploads, dispatches color-grouped compute passes,
 * then reads back results.
 *
 * Usage:
 * ```ts
 * const gpu = new GPUComputeSolver();
 * if (await gpu.init()) {
 *   // GPU available — use gpu.solveVelocity(buf, iterations)
 * }
 * ```
 *
 * Falls back gracefully: init() returns false if WebGPU is unavailable.
 */

import {
  CONTACT_SOLVER_WGSL,
  FLUID_SOLVER_WGSL,
  WARM_START_COLLISION_WGSL,
  GPU_BODY_STRIDE,
  GPU_COL_STRIDE,
  GPU_FLUID_STRIDE,
} from "./shaders";

import type { SolverBuffers } from "../SolverBuffers";

const WORKGROUP_SIZE = 64;

/** Uniform buffer layout: { colorStart: u32, colorCount: u32 } */
const PARAMS_SIZE = 8; // 2 × u32

function ceilDiv(a: number, b: number): number {
  return ((a + b - 1) / b) | 0;
}

export class GPUComputeSolver {
  private device: GPUDevice | null = null;
  private contactPipeline: GPUComputePipeline | null = null;
  private fluidPipeline: GPUComputePipeline | null = null;
  private warmStartPipeline: GPUComputePipeline | null = null;

  // GPU buffers (re-created when sizes change)
  private bodyBuf: GPUBuffer | null = null;
  private colBuf: GPUBuffer | null = null;
  private fluidBuf: GPUBuffer | null = null;
  private colOrderBuf: GPUBuffer | null = null;
  private fluidOrderBuf: GPUBuffer | null = null;
  private paramsBuf: GPUBuffer | null = null;
  private warmParamsBuf: GPUBuffer | null = null;

  // Staging buffers for readback
  private bodyStagingBuf: GPUBuffer | null = null;
  private colStagingBuf: GPUBuffer | null = null;
  private fluidStagingBuf: GPUBuffer | null = null;

  // Current allocated sizes (in floats)
  private bodyBufSize = 0;
  private colBufSize = 0;
  private fluidBufSize = 0;
  private colOrderSize = 0;
  private fluidOrderSize = 0;

  /** Whether GPU acceleration is available. */
  get available(): boolean {
    return this.device !== null;
  }

  /**
   * Initialize WebGPU. Returns true if successful, false if unavailable.
   * Safe to call in any environment — gracefully handles missing WebGPU.
   */
  async init(): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      this.device = await adapter.requestDevice();

      // Create compute pipelines
      this.contactPipeline = this.device.createComputePipeline({
        layout: "auto",
        compute: {
          module: this.device.createShaderModule({ code: CONTACT_SOLVER_WGSL }),
          entryPoint: "main",
        },
      });

      this.fluidPipeline = this.device.createComputePipeline({
        layout: "auto",
        compute: {
          module: this.device.createShaderModule({ code: FLUID_SOLVER_WGSL }),
          entryPoint: "main",
        },
      });

      this.warmStartPipeline = this.device.createComputePipeline({
        layout: "auto",
        compute: {
          module: this.device.createShaderModule({ code: WARM_START_COLLISION_WGSL }),
          entryPoint: "main",
        },
      });

      // Create params uniform buffers
      this.paramsBuf = this.device.createBuffer({
        size: PARAMS_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.warmParamsBuf = this.device.createBuffer({
        size: PARAMS_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      return true;
    } catch {
      this.device = null;
      return false;
    }
  }

  /**
   * Run the full velocity solve on the GPU.
   *
   * Expects SolverBuffers to have already called:
   *   packBodies, packCollisionArbiters, packFluidArbiters,
   *   colorCollisionArbiters, colorFluidArbiters
   *
   * After this call, SolverBuffers' bodyData/colData/fluidData contain
   * the GPU-computed results (written back via staging buffers).
   */
  async solveVelocity(buf: SolverBuffers, iterations: number): Promise<void> {
    const dev = this.device!;

    // ── Convert Float64 → Float32 for GPU ──
    const bodyF32 = this._toF32(buf.bodyData, buf.bodyCount * GPU_BODY_STRIDE);
    const colF32 = this._toF32(buf.colData, buf.colCount * GPU_COL_STRIDE);
    const fluidF32 = this._toF32(buf.fluidData, buf.fluidCount * GPU_FLUID_STRIDE);

    // ── Ensure GPU buffers are large enough ──
    this._ensureBuffer("body", bodyF32.byteLength);
    this._ensureBuffer("col", colF32.byteLength);
    this._ensureBuffer("fluid", fluidF32.byteLength);
    this._ensureOrderBuffer("col", buf.colCount);
    this._ensureOrderBuffer("fluid", buf.fluidCount);

    // ── Upload data ──
    dev.queue.writeBuffer(this.bodyBuf!, 0, bodyF32);
    if (colF32.byteLength > 0) dev.queue.writeBuffer(this.colBuf!, 0, colF32);
    if (fluidF32.byteLength > 0) dev.queue.writeBuffer(this.fluidBuf!, 0, fluidF32);

    // Upload color orders (access internal arrays via public getter)
    if (buf.colCount > 0) {
      dev.queue.writeBuffer(this.colOrderBuf!, 0, buf.getColorOrder(), 0, buf.colCount);
    }
    if (buf.fluidCount > 0) {
      dev.queue.writeBuffer(this.fluidOrderBuf!, 0, buf.getFluidColorOrder(), 0, buf.fluidCount);
    }

    // ── Warm start dispatch ──
    if (buf.colCount > 0) {
      this._dispatchWarmStart(dev, buf.colCount);
    }

    // ── Velocity iteration dispatches ──
    for (let iter = 0; iter < iterations; iter++) {
      // Fluid color groups
      const fcg = buf.getFluidColorGroups();
      for (let c = 0; c < buf.numFluidColors; c++) {
        const start = fcg[c];
        const count = fcg[c + 1] - start;
        if (count > 0) {
          this._dispatchFluid(dev, start, count);
        }
      }

      // Collision color groups
      const cg = buf.getColorGroups();
      for (let c = 0; c < buf.numColors; c++) {
        const start = cg[c];
        const count = cg[c + 1] - start;
        if (count > 0) {
          this._dispatchContact(dev, start, count);
        }
      }
    }

    // ── Readback ──
    await this._readback(buf, bodyF32.byteLength, colF32.byteLength, fluidF32.byteLength);
  }

  /** Destroy GPU resources. */
  destroy(): void {
    this.bodyBuf?.destroy();
    this.colBuf?.destroy();
    this.fluidBuf?.destroy();
    this.colOrderBuf?.destroy();
    this.fluidOrderBuf?.destroy();
    this.paramsBuf?.destroy();
    this.warmParamsBuf?.destroy();
    this.bodyStagingBuf?.destroy();
    this.colStagingBuf?.destroy();
    this.fluidStagingBuf?.destroy();
    this.device?.destroy();
    this.device = null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Private helpers
  // ═══════════════════════════════════════════════════════════════════════

  private _toF32(f64: Float64Array, count: number): Float32Array {
    const f32 = new Float32Array(count);
    for (let i = 0; i < count; i++) f32[i] = f64[i];
    return f32;
  }

  private _fromF32(f32: Float32Array, f64: Float64Array, count: number): void {
    for (let i = 0; i < count; i++) f64[i] = f32[i];
  }

  private _ensureBuffer(type: "body" | "col" | "fluid", bytes: number): void {
    const dev = this.device!;
    const minBytes = Math.max(bytes, 4); // GPU buffers must be > 0
    const sizeField = `${type}BufSize` as "bodyBufSize" | "colBufSize" | "fluidBufSize";
    const bufField = `${type}Buf` as "bodyBuf" | "colBuf" | "fluidBuf";
    const stagingField = `${type}StagingBuf` as
      | "bodyStagingBuf"
      | "colStagingBuf"
      | "fluidStagingBuf";

    if (this[sizeField] >= minBytes) return;

    this[bufField]?.destroy();
    this[stagingField]?.destroy();

    const size = Math.max(minBytes, this[sizeField] * 2 || 1024);
    this[bufField] = dev.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this[stagingField] = dev.createBuffer({
      size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this[sizeField] = size;
  }

  private _ensureOrderBuffer(type: "col" | "fluid", count: number): void {
    const dev = this.device!;
    const bytes = Math.max(count * 4, 4);
    const sizeField = `${type}OrderSize` as "colOrderSize" | "fluidOrderSize";
    const bufField = `${type}OrderBuf` as "colOrderBuf" | "fluidOrderBuf";

    if (this[sizeField] >= bytes) return;

    (this[bufField] as GPUBuffer | null)?.destroy();
    const size = Math.max(bytes, (this[sizeField] as number) * 2 || 256);
    (this as any)[bufField] = dev.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    (this as any)[sizeField] = size;
  }

  private _dispatchWarmStart(dev: GPUDevice, count: number): void {
    const paramsData = new Uint32Array([count, 0]);
    dev.queue.writeBuffer(this.warmParamsBuf!, 0, paramsData);

    const bindGroup = dev.createBindGroup({
      layout: this.warmStartPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.bodyBuf! } },
        { binding: 1, resource: { buffer: this.colBuf! } },
        { binding: 2, resource: { buffer: this.warmParamsBuf! } },
      ],
    });

    const encoder = dev.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.warmStartPipeline!);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(ceilDiv(count, WORKGROUP_SIZE));
    pass.end();
    dev.queue.submit([encoder.finish()]);
  }

  private _dispatchContact(dev: GPUDevice, colorStart: number, colorCount: number): void {
    const paramsData = new Uint32Array([colorStart, colorCount]);
    dev.queue.writeBuffer(this.paramsBuf!, 0, paramsData);

    const bindGroup = dev.createBindGroup({
      layout: this.contactPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.bodyBuf! } },
        { binding: 1, resource: { buffer: this.colBuf! } },
        { binding: 2, resource: { buffer: this.colOrderBuf! } },
        { binding: 3, resource: { buffer: this.paramsBuf! } },
      ],
    });

    const encoder = dev.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.contactPipeline!);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(ceilDiv(colorCount, WORKGROUP_SIZE));
    pass.end();
    dev.queue.submit([encoder.finish()]);
  }

  private _dispatchFluid(dev: GPUDevice, colorStart: number, colorCount: number): void {
    const paramsData = new Uint32Array([colorStart, colorCount]);
    dev.queue.writeBuffer(this.paramsBuf!, 0, paramsData);

    const bindGroup = dev.createBindGroup({
      layout: this.fluidPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.bodyBuf! } },
        { binding: 1, resource: { buffer: this.fluidBuf! } },
        { binding: 2, resource: { buffer: this.fluidOrderBuf! } },
        { binding: 3, resource: { buffer: this.paramsBuf! } },
      ],
    });

    const encoder = dev.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.fluidPipeline!);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(ceilDiv(colorCount, WORKGROUP_SIZE));
    pass.end();
    dev.queue.submit([encoder.finish()]);
  }

  private async _readback(
    buf: SolverBuffers,
    bodyBytes: number,
    colBytes: number,
    fluidBytes: number,
  ): Promise<void> {
    const dev = this.device!;
    const encoder = dev.createCommandEncoder();

    if (bodyBytes > 0) {
      encoder.copyBufferToBuffer(this.bodyBuf!, 0, this.bodyStagingBuf!, 0, bodyBytes);
    }
    if (colBytes > 0) {
      encoder.copyBufferToBuffer(this.colBuf!, 0, this.colStagingBuf!, 0, colBytes);
    }
    if (fluidBytes > 0) {
      encoder.copyBufferToBuffer(this.fluidBuf!, 0, this.fluidStagingBuf!, 0, fluidBytes);
    }

    dev.queue.submit([encoder.finish()]);

    // Map staging buffers and copy back
    const maps: Promise<void>[] = [];
    if (bodyBytes > 0) maps.push(this.bodyStagingBuf!.mapAsync(GPUMapMode.READ, 0, bodyBytes));
    if (colBytes > 0) maps.push(this.colStagingBuf!.mapAsync(GPUMapMode.READ, 0, colBytes));
    if (fluidBytes > 0) maps.push(this.fluidStagingBuf!.mapAsync(GPUMapMode.READ, 0, fluidBytes));

    await Promise.all(maps);

    const bodyCount = buf.bodyCount * GPU_BODY_STRIDE;
    const colCount = buf.colCount * GPU_COL_STRIDE;
    const fluidCount = buf.fluidCount * GPU_FLUID_STRIDE;

    if (bodyBytes > 0) {
      const f32 = new Float32Array(this.bodyStagingBuf!.getMappedRange(0, bodyBytes));
      this._fromF32(f32, buf.bodyData, bodyCount);
      this.bodyStagingBuf!.unmap();
    }
    if (colBytes > 0) {
      const f32 = new Float32Array(this.colStagingBuf!.getMappedRange(0, colBytes));
      this._fromF32(f32, buf.colData, colCount);
      this.colStagingBuf!.unmap();
    }
    if (fluidBytes > 0) {
      const f32 = new Float32Array(this.fluidStagingBuf!.getMappedRange(0, fluidBytes));
      this._fromF32(f32, buf.fluidData, fluidCount);
      this.fluidStagingBuf!.unmap();
    }
  }
}
