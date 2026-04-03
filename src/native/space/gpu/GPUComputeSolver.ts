/**
 * GPUComputeSolver — WebGPU compute shader accelerator for velocity + position solvers.
 *
 * Manages GPU device, pipelines, buffers, and dispatches. Works alongside
 * SolverBuffers: the CPU side packs data into Float64Arrays, this class
 * converts to Float32, uploads, dispatches color-grouped compute passes,
 * then reads back results.
 *
 * Optimizations:
 *  - All color-group dispatches batched into single command buffer per iteration
 *  - Selective readback (only modified fields)
 *  - Shared body/col buffers between velocity and position solvers
 */

import {
  CONTACT_SOLVER_WGSL,
  FLUID_SOLVER_WGSL,
  WARM_START_COLLISION_WGSL,
  POSITION_SOLVER_WGSL,
  GPU_BODY_STRIDE,
  CPU_BODY_STRIDE,
  GPU_COL_STRIDE,
  GPU_FLUID_STRIDE,
} from "./shaders";

import type { SolverBuffers } from "../SolverBuffers";

const WORKGROUP_SIZE = 64;
const GROUP_IDX_SIZE = 4;
const MAX_GROUP_IDX_UNIFORMS = 64;

function ceilDiv(a: number, b: number): number {
  return ((a + b - 1) / b) | 0;
}

export class GPUComputeSolver {
  private device: GPUDevice | null = null;
  private contactPipeline: GPUComputePipeline | null = null;
  private fluidPipeline: GPUComputePipeline | null = null;
  private warmStartPipeline: GPUComputePipeline | null = null;
  private positionPipeline: GPUComputePipeline | null = null;

  // GPU buffers
  private bodyBuf: GPUBuffer | null = null;
  private colBuf: GPUBuffer | null = null;
  private fluidBuf: GPUBuffer | null = null;
  private colOrderBuf: GPUBuffer | null = null;
  private fluidOrderBuf: GPUBuffer | null = null;

  private warmParamsBuf: GPUBuffer | null = null;
  private colParamsBuf: GPUBuffer | null = null;
  private fluidParamsBuf: GPUBuffer | null = null;
  private posConfigBuf: GPUBuffer | null = null;
  private colParamsBufSize = 0;
  private fluidParamsBufSize = 0;

  private groupIdxBufs: GPUBuffer[] = [];

  // Cached bind groups
  private contactBindGroups: GPUBindGroup[] = [];
  private fluidBindGroups: GPUBindGroup[] = [];
  private positionBindGroups: GPUBindGroup[] = [];
  private warmStartBindGroup: GPUBindGroup | null = null;

  // Staging buffers for readback
  private bodyStagingBuf: GPUBuffer | null = null;
  private colStagingBuf: GPUBuffer | null = null;
  private fluidStagingBuf: GPUBuffer | null = null;

  private bodyBufSize = 0;
  private colBufSize = 0;
  private fluidBufSize = 0;
  private colOrderSize = 0;
  private fluidOrderSize = 0;

  // Track whether buffers are currently uploaded (for position solver reuse)
  private _uploaded = false;
  private _lastBodyBytes = 0;
  private _lastColBytes = 0;
  private _lastFluidBytes = 0;

  get available(): boolean {
    return this.device !== null;
  }

  async init(): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      this.device = await adapter.requestDevice();

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

      this.positionPipeline = this.device.createComputePipeline({
        layout: "auto",
        compute: {
          module: this.device.createShaderModule({ code: POSITION_SOLVER_WGSL }),
          entryPoint: "main",
        },
      });

      this.warmParamsBuf = this.device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Position config: { collisionSlop: f32, epsilon: f32 }
      this.posConfigBuf = this.device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this._ensureGroupIdxBufs(MAX_GROUP_IDX_UNIFORMS);

      return true;
    } catch {
      this.device = null;
      return false;
    }
  }

  /**
   * Upload body/col/fluid data to GPU. Called once before velocity solve.
   * The buffers stay on GPU for position solve reuse.
   */
  upload(buf: SolverBuffers): void {
    const dev = this.device!;
    const bodyCount = buf.bodyCount;
    const colCount = buf.colCount;
    const fluidCount = buf.fluidCount;

    // Compact body buffer: extract only velocity fields (stride 15 → 8)
    const bodyF32 = new Float32Array(bodyCount * GPU_BODY_STRIDE);
    const bd = buf.bodyData;
    for (let i = 0; i < bodyCount; i++) {
      const src = i * CPU_BODY_STRIDE;
      const dst = i * GPU_BODY_STRIDE;
      bodyF32[dst] = bd[src];
      bodyF32[dst + 1] = bd[src + 1];
      bodyF32[dst + 2] = bd[src + 2];
      bodyF32[dst + 3] = bd[src + 3];
      bodyF32[dst + 4] = bd[src + 4];
      bodyF32[dst + 5] = bd[src + 5];
      bodyF32[dst + 6] = bd[src + 6];
      bodyF32[dst + 7] = bd[src + 7];
    }

    // Convert col/fluid F64 → F32 (only velocity solver fields: first 49 of 64)
    const colF32 = this._toF32(buf.colData, colCount * GPU_COL_STRIDE);
    const fluidF32 = this._toF32(buf.fluidData, fluidCount * GPU_FLUID_STRIDE);

    // Remap body indices: bodyIdx*15 → bodyIdx*8
    for (let i = 0; i < colCount; i++) {
      const off = i * GPU_COL_STRIDE;
      colF32[off] = (((colF32[off] | 0) / CPU_BODY_STRIDE) | 0) * GPU_BODY_STRIDE;
      colF32[off + 1] = (((colF32[off + 1] | 0) / CPU_BODY_STRIDE) | 0) * GPU_BODY_STRIDE;
    }
    for (let i = 0; i < fluidCount; i++) {
      const off = i * GPU_FLUID_STRIDE;
      fluidF32[off] = (((fluidF32[off] | 0) / CPU_BODY_STRIDE) | 0) * GPU_BODY_STRIDE;
      fluidF32[off + 1] = (((fluidF32[off + 1] | 0) / CPU_BODY_STRIDE) | 0) * GPU_BODY_STRIDE;
    }

    this._lastBodyBytes = bodyF32.byteLength;
    this._lastColBytes = colF32.byteLength;
    this._lastFluidBytes = fluidF32.byteLength;

    this._ensureBuffer("body", bodyF32.byteLength);
    this._ensureBuffer("col", colF32.byteLength);
    this._ensureBuffer("fluid", fluidF32.byteLength);
    this._ensureOrderBuffer("col", colCount);
    this._ensureOrderBuffer("fluid", fluidCount);

    dev.queue.writeBuffer(this.bodyBuf!, 0, bodyF32);
    if (colF32.byteLength > 0) dev.queue.writeBuffer(this.colBuf!, 0, colF32);
    if (fluidF32.byteLength > 0) dev.queue.writeBuffer(this.fluidBuf!, 0, fluidF32);

    if (colCount > 0) {
      dev.queue.writeBuffer(this.colOrderBuf!, 0, buf.getColorOrder(), 0, colCount);
    }
    if (fluidCount > 0) {
      dev.queue.writeBuffer(this.fluidOrderBuf!, 0, buf.getFluidColorOrder(), 0, fluidCount);
    }

    this._uploadColorParams(buf);
    this._buildBindGroups(buf);
    this._uploaded = true;
  }

  /**
   * Run velocity solve on GPU. Expects upload() called first.
   */
  solveVelocity(buf: SolverBuffers, iterations: number): void {
    const dev = this.device!;
    const cg = buf.getColorGroups();
    const fcg = buf.getFluidColorGroups();

    // Warm start
    if (buf.colCount > 0) {
      dev.queue.writeBuffer(this.warmParamsBuf!, 0, new Uint32Array([buf.colCount, 0]));
      const encoder = dev.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.warmStartPipeline!);
      pass.setBindGroup(0, this.warmStartBindGroup!);
      pass.dispatchWorkgroups(ceilDiv(buf.colCount, WORKGROUP_SIZE));
      pass.end();
      dev.queue.submit([encoder.finish()]);
    }

    // Velocity iterations
    for (let iter = 0; iter < iterations; iter++) {
      const encoder = dev.createCommandEncoder();
      const pass = encoder.beginComputePass();

      for (let c = 0; c < buf.numFluidColors; c++) {
        const count = fcg[c + 1] - fcg[c];
        if (count > 0) {
          pass.setPipeline(this.fluidPipeline!);
          pass.setBindGroup(0, this.fluidBindGroups[c]);
          pass.dispatchWorkgroups(ceilDiv(count, WORKGROUP_SIZE));
        }
      }

      for (let c = 0; c < buf.numColors; c++) {
        const count = cg[c + 1] - cg[c];
        if (count > 0) {
          pass.setPipeline(this.contactPipeline!);
          pass.setBindGroup(0, this.contactBindGroups[c]);
          pass.dispatchWorkgroups(ceilDiv(count, WORKGROUP_SIZE));
        }
      }

      pass.end();
      dev.queue.submit([encoder.finish()]);
    }
  }

  /**
   * Run position solve on GPU. Reuses buffers already on GPU.
   */
  solvePosition(buf: SolverBuffers, iterations: number, slop: number, epsilon: number): void {
    const dev = this.device!;
    if (buf.colCount === 0) return;

    // Upload position config
    dev.queue.writeBuffer(this.posConfigBuf!, 0, new Float32Array([slop, epsilon]));

    const cg = buf.getColorGroups();
    for (let iter = 0; iter < iterations; iter++) {
      const encoder = dev.createCommandEncoder();
      const pass = encoder.beginComputePass();

      for (let c = 0; c < buf.numColors; c++) {
        const count = cg[c + 1] - cg[c];
        if (count > 0) {
          pass.setPipeline(this.positionPipeline!);
          pass.setBindGroup(0, this.positionBindGroups[c]);
          pass.dispatchWorkgroups(ceilDiv(count, WORKGROUP_SIZE));
        }
      }

      pass.end();
      dev.queue.submit([encoder.finish()]);
    }
  }

  /**
   * Read back results from GPU. Call after both solvers are done.
   */
  async readback(buf: SolverBuffers): Promise<void> {
    await this._readback(buf, this._lastBodyBytes, this._lastColBytes, this._lastFluidBytes);
    this._uploaded = false;
  }

  destroy(): void {
    this.bodyBuf?.destroy();
    this.colBuf?.destroy();
    this.fluidBuf?.destroy();
    this.colOrderBuf?.destroy();
    this.fluidOrderBuf?.destroy();
    this.warmParamsBuf?.destroy();
    this.posConfigBuf?.destroy();
    this.colParamsBuf?.destroy();
    this.fluidParamsBuf?.destroy();
    this.bodyStagingBuf?.destroy();
    this.colStagingBuf?.destroy();
    this.fluidStagingBuf?.destroy();
    for (const b of this.groupIdxBufs) b.destroy();
    this.device?.destroy();
    this.device = null;
  }

  // ═══════════════════════════════════════════════════════════════════════

  private _toF32(f64: Float64Array, count: number): Float32Array {
    const f32 = new Float32Array(count);
    for (let i = 0; i < count; i++) f32[i] = f64[i];
    return f32;
  }

  private _ensureGroupIdxBufs(count: number): void {
    const dev = this.device!;
    while (this.groupIdxBufs.length < count) {
      const idx = this.groupIdxBufs.length;
      const b = dev.createBuffer({
        size: GROUP_IDX_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      dev.queue.writeBuffer(b, 0, new Uint32Array([idx]));
      this.groupIdxBufs.push(b);
    }
  }

  private _uploadColorParams(buf: SolverBuffers): void {
    const dev = this.device!;

    if (buf.numColors > 0) {
      const cg = buf.getColorGroups();
      const data = new Uint32Array(buf.numColors * 2);
      for (let c = 0; c < buf.numColors; c++) {
        data[c * 2] = cg[c];
        data[c * 2 + 1] = cg[c + 1] - cg[c];
      }
      this._ensureParamsBuf("col", data.byteLength);
      dev.queue.writeBuffer(this.colParamsBuf!, 0, data);
    }

    if (buf.numFluidColors > 0) {
      const fcg = buf.getFluidColorGroups();
      const data = new Uint32Array(buf.numFluidColors * 2);
      for (let c = 0; c < buf.numFluidColors; c++) {
        data[c * 2] = fcg[c];
        data[c * 2 + 1] = fcg[c + 1] - fcg[c];
      }
      this._ensureParamsBuf("fluid", data.byteLength);
      dev.queue.writeBuffer(this.fluidParamsBuf!, 0, data);
    }

    const maxGroups = Math.max(buf.numColors, buf.numFluidColors);
    if (maxGroups > this.groupIdxBufs.length) {
      this._ensureGroupIdxBufs(maxGroups);
    }
  }

  private _buildBindGroups(buf: SolverBuffers): void {
    const dev = this.device!;

    if (buf.colCount > 0) {
      this.warmStartBindGroup = dev.createBindGroup({
        layout: this.warmStartPipeline!.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.bodyBuf! } },
          { binding: 1, resource: { buffer: this.colBuf! } },
          { binding: 2, resource: { buffer: this.warmParamsBuf! } },
        ],
      });
    }

    this.contactBindGroups.length = 0;
    for (let c = 0; c < buf.numColors; c++) {
      this.contactBindGroups.push(
        dev.createBindGroup({
          layout: this.contactPipeline!.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.bodyBuf! } },
            { binding: 1, resource: { buffer: this.colBuf! } },
            { binding: 2, resource: { buffer: this.colOrderBuf! } },
            { binding: 3, resource: { buffer: this.colParamsBuf! } },
            { binding: 4, resource: { buffer: this.groupIdxBufs[c] } },
          ],
        }),
      );
    }

    this.fluidBindGroups.length = 0;
    for (let c = 0; c < buf.numFluidColors; c++) {
      this.fluidBindGroups.push(
        dev.createBindGroup({
          layout: this.fluidPipeline!.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.bodyBuf! } },
            { binding: 1, resource: { buffer: this.fluidBuf! } },
            { binding: 2, resource: { buffer: this.fluidOrderBuf! } },
            { binding: 3, resource: { buffer: this.fluidParamsBuf! } },
            { binding: 4, resource: { buffer: this.groupIdxBufs[c] } },
          ],
        }),
      );
    }

    // Position solver bind groups — same body+col buffers, different pipeline
    this.positionBindGroups.length = 0;
    for (let c = 0; c < buf.numColors; c++) {
      this.positionBindGroups.push(
        dev.createBindGroup({
          layout: this.positionPipeline!.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.bodyBuf! } },
            { binding: 1, resource: { buffer: this.colBuf! } },
            { binding: 2, resource: { buffer: this.colOrderBuf! } },
            { binding: 3, resource: { buffer: this.colParamsBuf! } },
            { binding: 4, resource: { buffer: this.groupIdxBufs[c] } },
            { binding: 5, resource: { buffer: this.posConfigBuf! } },
          ],
        }),
      );
    }
  }

  private _ensureParamsBuf(type: "col" | "fluid", bytes: number): void {
    const dev = this.device!;
    const minBytes = Math.max(bytes, 8);
    const sizeField = type === "col" ? "colParamsBufSize" : "fluidParamsBufSize";
    const bufField = type === "col" ? "colParamsBuf" : "fluidParamsBuf";

    if (this[sizeField] >= minBytes) return;

    (this[bufField] as GPUBuffer | null)?.destroy();
    const size = Math.max(minBytes, this[sizeField] * 2 || 64);
    (this as any)[bufField] = dev.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    (this as any)[sizeField] = size;
  }

  private _ensureBuffer(type: "body" | "col" | "fluid", bytes: number): void {
    const dev = this.device!;
    const minBytes = Math.max(bytes, 4);
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

  private async _readback(
    buf: SolverBuffers,
    bodyBytes: number,
    colBytes: number,
    fluidBytes: number,
  ): Promise<void> {
    const dev = this.device!;
    const encoder = dev.createCommandEncoder();

    if (bodyBytes > 0)
      encoder.copyBufferToBuffer(this.bodyBuf!, 0, this.bodyStagingBuf!, 0, bodyBytes);
    if (colBytes > 0) encoder.copyBufferToBuffer(this.colBuf!, 0, this.colStagingBuf!, 0, colBytes);
    if (fluidBytes > 0)
      encoder.copyBufferToBuffer(this.fluidBuf!, 0, this.fluidStagingBuf!, 0, fluidBytes);

    dev.queue.submit([encoder.finish()]);

    const maps: Promise<void>[] = [];
    if (bodyBytes > 0) maps.push(this.bodyStagingBuf!.mapAsync(GPUMapMode.READ, 0, bodyBytes));
    if (colBytes > 0) maps.push(this.colStagingBuf!.mapAsync(GPUMapMode.READ, 0, colBytes));
    if (fluidBytes > 0) maps.push(this.fluidStagingBuf!.mapAsync(GPUMapMode.READ, 0, fluidBytes));

    await Promise.all(maps);

    if (bodyBytes > 0) {
      const f32 = new Float32Array(this.bodyStagingBuf!.getMappedRange(0, bodyBytes));
      // Scatter compact GPU body data (stride=8) back to CPU layout (stride=15)
      const bd = buf.bodyData;
      const n = buf.bodyCount;
      for (let i = 0; i < n; i++) {
        const src = i * GPU_BODY_STRIDE;
        const dst = i * CPU_BODY_STRIDE;
        bd[dst] = f32[src]; // VELX
        bd[dst + 1] = f32[src + 1]; // VELY
        bd[dst + 2] = f32[src + 2]; // ANGVEL
      }
      this.bodyStagingBuf!.unmap();
    }
    if (colBytes > 0) {
      const f32 = new Float32Array(this.colStagingBuf!.getMappedRange(0, colBytes));
      // Only warm-start accumulator fields
      const cd = buf.colData;
      for (let i = 0; i < buf.colCount; i++) {
        const off = i * GPU_COL_STRIDE;
        cd[off + 9] = f32[off + 9]; // A_C1_JNACC
        cd[off + 10] = f32[off + 10]; // A_C1_JTACC
        cd[off + 30] = f32[off + 30]; // A_C2_JNACC
        cd[off + 31] = f32[off + 31]; // A_C2_JTACC
        cd[off + 46] = f32[off + 46]; // A_JRACC
      }
      this.colStagingBuf!.unmap();
    }
    if (fluidBytes > 0) {
      const f32 = new Float32Array(this.fluidStagingBuf!.getMappedRange(0, fluidBytes));
      const fd = buf.fluidData;
      for (let i = 0; i < buf.fluidCount; i++) {
        const off = i * GPU_FLUID_STRIDE;
        fd[off + 9] = f32[off + 9];
        fd[off + 10] = f32[off + 10];
        fd[off + 13] = f32[off + 13];
      }
      this.fluidStagingBuf!.unmap();
    }
  }
}
