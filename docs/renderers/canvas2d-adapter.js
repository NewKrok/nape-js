/**
 * Canvas2DAdapter — 2D canvas renderer for nape-js demos.
 *
 * Implements the RendererAdapter interface using a standard 2D canvas context.
 * Extracts what was previously hardcoded inside DemoRunner.
 */
import {
  drawBody, drawConstraints, drawGrid, bodyColor, COLORS,
} from "../renderer.js?v=3.42.0";

export class Canvas2DAdapter {
  id = "canvas2d";
  displayName = "2D";

  #container = null;
  #canvas = null;
  #ctx = null;
  #W = 0;
  #H = 0;
  #showOutlines = true;
  #existingCanvas = null; // for homepage reuse

  /**
   * @param {{ canvas?: HTMLCanvasElement }} [opts]
   *   Pass `canvas` to reuse an existing <canvas> element (homepage use case).
   */
  constructor(opts = {}) {
    this.#existingCanvas = opts.canvas ?? null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  attach(container, W, H) {
    this.#container = container;
    this.#W = W;
    this.#H = H;
    const dpr = window.devicePixelRatio || 1;

    if (this.#existingCanvas) {
      this.#canvas = this.#existingCanvas;
      this.#canvas.width = W * dpr;
      this.#canvas.height = H * dpr;
    } else {
      this.#canvas = document.createElement("canvas");
      this.#canvas.width = W * dpr;
      this.#canvas.height = H * dpr;
      this.#canvas.style.cssText =
        "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain";
      container.appendChild(this.#canvas);
    }

    this.#ctx = this.#canvas.getContext("2d");
    this.#ctx.scale(dpr, dpr);
  }

  detach() {
    // Only remove the canvas if we created it (don't remove an existing canvas)
    if (!this.#existingCanvas && this.#canvas && this.#container) {
      this.#container.removeChild(this.#canvas);
    }
    // If reusing an existing canvas, just show it again (in case it was hidden)
    if (this.#existingCanvas) {
      this.#existingCanvas.style.display = "";
    }
    this.#canvas = null;
    this.#ctx = null;
    this.#container = null;
  }

  isAttached() {
    return this.#canvas !== null;
  }

  // ---------------------------------------------------------------------------
  // Per-demo hooks
  // ---------------------------------------------------------------------------

  onDemoLoad(_space, _W, _H) {
    // Canvas2D needs no per-demo mesh setup
  }

  onDemoUnload() {
    // No cleanup needed
  }

  // ---------------------------------------------------------------------------
  // Per-frame rendering
  // ---------------------------------------------------------------------------

  renderFrame(space, W, H, { showOutlines, overrides, camX = 0, camY = 0 }) {
    const ctx = this.#ctx;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (overrides?.canvas2d) {
      overrides.canvas2d(ctx, space, W, H, showOutlines, camX, camY);
    } else {
      // Apply camera transform for default rendering
      ctx.save();
      ctx.translate(-camX, -camY);
      drawGrid(ctx, W, H, camX, camY);
      drawConstraints(ctx, space);
      for (const body of space.bodies) {
        if (body.userData?._hidden) continue;
        drawBody(ctx, body, showOutlines);
      }
      ctx.restore();
    }

    // HUD overlay (legend, cursor hints, etc.) — drawn in screen space, no camera
    if (overrides?.overlay) {
      overrides.overlay(ctx, space, W, H, camX, camY);
    }
  }

  /**
   * Render a single static frame for thumbnail/preview.
   */
  renderPreview(space, W, H) {
    this.renderFrame(space, W, H, { showOutlines: true, overrides: null });
  }

  // ---------------------------------------------------------------------------
  // Worker mode — render bodies from a transform buffer
  // ---------------------------------------------------------------------------

  renderFromTransforms(transforms, shapeDescs, W, H, { showOutlines, overrides }) {
    const ctx = this.#ctx;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (overrides?.canvas2d) {
      // For custom worker renders (web-worker demo), pass the raw data
      overrides.canvas2d(ctx, transforms, shapeDescs, W, H, showOutlines);
      return;
    }

    drawGrid(ctx, W, H);

    const HEADER = 3;
    const STRIDE = 3;
    const bodyCount = transforms[0] | 0;
    const count = Math.min(bodyCount, shapeDescs.length);

    for (let i = 0; i < count; i++) {
      const off = HEADER + i * STRIDE;
      const bx = transforms[off];
      const by = transforms[off + 1];
      const rot = transforms[off + 2];
      const sd = shapeDescs[i];

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);

      if (sd.wall) {
        ctx.fillStyle = "rgba(120,160,200,0.10)";
        ctx.strokeStyle = "#607888";
        ctx.lineWidth = 1;
        ctx.fillRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
        if (showOutlines) ctx.strokeRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
      } else {
        const c = COLORS[i % COLORS.length];
        if (sd.circle) {
          ctx.beginPath();
          ctx.arc(0, 0, sd.radius, 0, Math.PI * 2);
          ctx.fillStyle = c.fill;
          ctx.fill();
          if (showOutlines) {
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        } else if (sd.box) {
          ctx.fillStyle = c.fill;
          ctx.fillRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
          if (showOutlines) {
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
          }
        }
      }

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Outline toggle
  // ---------------------------------------------------------------------------

  setOutlines(show) {
    this.#showOutlines = show;
    // Takes effect on next renderFrame via the showOutlines parameter
  }

  // ---------------------------------------------------------------------------
  // Resize — 2D canvas keeps fixed resolution, CSS handles scaling
  // ---------------------------------------------------------------------------

  onResize(_displayW, _displayH) {
    // No-op for 2D canvas (object-fit:contain handles it)
  }

  // ---------------------------------------------------------------------------
  // Overlay context — for 2D, it's the same canvas context
  // ---------------------------------------------------------------------------

  getOverlayCtx() {
    return this.#ctx;
  }

  // ---------------------------------------------------------------------------
  // Engine access (escape hatch)
  // ---------------------------------------------------------------------------

  getEngine() {
    return { ctx: this.#ctx, canvas: this.#canvas };
  }

  // ---------------------------------------------------------------------------
  // Canvas element access (for interaction coordinate mapping)
  // ---------------------------------------------------------------------------

  getElement() {
    return this.#canvas;
  }

  /** Hide the canvas (used when switching to another adapter) */
  hide() {
    if (this.#canvas) this.#canvas.style.display = "none";
  }

  /** Show the canvas (used when switching back) */
  show() {
    if (this.#canvas) this.#canvas.style.display = "";
  }
}
