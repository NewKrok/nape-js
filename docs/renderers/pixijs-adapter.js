/**
 * PixiJSAdapter — PixiJS renderer for nape-js demos.
 *
 * This adapter is a thin runner-facing wrapper around the public
 * `@newkrok/nape-pixi` package. The package supplies the reusable bits
 * (PixiDebugDraw for body shapes + constraint lines); this file keeps
 * the demo-specific glue: attach/detach lifecycle, a 2D HUD overlay,
 * the `userData._color`/`_colorIdx`/`_isZone` conventions, and the
 * transform-buffer render path used by worker-mode demos.
 */

// ---------------------------------------------------------------------------
// PixiJS — lazy-loaded once, shared across all adapter instances
// ---------------------------------------------------------------------------

let _PIXI = null;

/** Pre-load PixiJS. Call before attach(). */
export async function loadPixi() {
  if (_PIXI) return _PIXI;
  _PIXI = await import("https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs");
  return _PIXI;
}

export function getPixi() {
  return _PIXI;
}

import {
  BODY_COLORS_HEX, STATIC_COLOR_HEX, CONSTRAINT_COLOR_HEX,
  bodyColorHex, bodyFillAlpha,
} from "./shared-colors.js?v=3.39.1";
import { PixiDebugDraw } from "../nape-pixi.esm.js?v=3.39.1";

// Aliases for backward compatibility
const FILL_COLORS = BODY_COLORS_HEX;
const STATIC_FILL = STATIC_COLOR_HEX;
const OUTLINE_ALPHA = 0.8;

// ---------------------------------------------------------------------------
// PixiJSAdapter
// ---------------------------------------------------------------------------

export class PixiJSAdapter {
  id = "pixijs";
  displayName = "PixiJS";

  #container = null;
  #W = 0;
  #H = 0;
  #showOutlines = true;
  #app = null;

  // The nape-pixi debug draw handles body shapes + constraint lines.
  // Owns its own Container which we add to the stage.
  #debug = null;

  // Background grid
  #gridGfx = null;

  // 2D overlay canvas for HUD (legend, cursor hints, etc.)
  #overlay = null;
  #overlayCtx = null;

  // Worker-mode state (shapeDescs + transforms) — kept here because it
  // uses a demo-specific protocol that `@newkrok/nape-pixi`'s WorkerBridge
  // doesn't cover.
  #workerSprites = new Map(); // number -> PIXI.Graphics
  #lastWorkerDescs = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async attach(container, W, H) {
    if (!_PIXI) throw new Error("PixiJS not loaded. Call loadPixi() first.");

    this.#container = container;
    this.#W = W;
    this.#H = H;

    this.#app = new _PIXI.Application();
    await this.#app.init({
      width: W,
      height: H,
      backgroundColor: 0x0d1117,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: false,
    });
    // We drive rendering manually from DemoRunner's rAF loop,
    // so stop the built-in ticker to avoid double-rendering.
    this.#app.ticker.stop();

    this.#app.canvas.style.cssText =
      "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain";
    container.appendChild(this.#app.canvas);

    // Background grid (matching Canvas2D's 50px grid)
    this.#gridGfx = new _PIXI.Graphics();
    const step = 50;
    for (let x = 0; x <= W; x += step) {
      this.#gridGfx.moveTo(x, 0);
      this.#gridGfx.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += step) {
      this.#gridGfx.moveTo(0, y);
      this.#gridGfx.lineTo(W, y);
    }
    this.#gridGfx.stroke({ color: 0x1a2030, width: 0.5 });
    this.#app.stage.addChildAt(this.#gridGfx, 0);

    // Shape + constraint rendering delegated to the public package.
    // The demo palette / static+sleeping colours and the `_isZone` alpha
    // quirk are wired through the resolver hooks.
    this.#debug = new PixiDebugDraw({
      pixi: { Container: _PIXI.Container, Graphics: _PIXI.Graphics },
      palette: BODY_COLORS_HEX,
      staticColor: STATIC_FILL,
      constraintColor: CONSTRAINT_COLOR_HEX,
      showOutlines: this.#showOutlines,
      outlineAlpha: OUTLINE_ALPHA,
      colorResolver: (body) => bodyColorHex(body),
      alphaResolver: (body) => (body.userData?._hidden ? 0 : bodyFillAlpha(body)),
    });
    this.#app.stage.addChild(this.#debug.container);

    // 2D overlay canvas for HUD (legend, density labels, etc.)
    this.#overlay = document.createElement("canvas");
    this.#overlay.width = W;
    this.#overlay.height = H;
    this.#overlay.style.cssText =
      "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:1";
    this.#overlayCtx = this.#overlay.getContext("2d");
    container.appendChild(this.#overlay);
  }

  detach() {
    if (this.#overlay && this.#container) {
      this.#container.removeChild(this.#overlay);
      this.#overlay = null;
      this.#overlayCtx = null;
    }
    if (this.#debug) {
      this.#debug.dispose();
      this.#debug = null;
    }
    if (this.#app && this.#container) {
      this.#container.removeChild(this.#app.canvas);
      this.#app.destroy(true);
      this.#app = null;
    }
    this.#gridGfx = null;
    this.#workerSprites.clear();
    this.#lastWorkerDescs = null;
    this.#container = null;
  }

  isAttached() {
    return this.#app !== null;
  }

  // ---------------------------------------------------------------------------
  // Per-demo hooks
  // ---------------------------------------------------------------------------

  onDemoLoad(_space, _W, _H) {
    // PixiDebugDraw auto-discovers bodies on the first render() call.
  }

  onDemoUnload() {
    // Clear cached per-body graphics so the next demo starts clean.
    if (this.#debug) {
      // Rebuilding is achieved by toggling showOutlines off/on, which
      // re-runs drawBodyShapes — but we also need to drop cached entries
      // whose bodies are gone. The simplest way: dispose + recreate.
      this.#app.stage.removeChild(this.#debug.container);
      this.#debug.dispose();
      this.#debug = new PixiDebugDraw({
        pixi: { Container: _PIXI.Container, Graphics: _PIXI.Graphics },
        palette: BODY_COLORS_HEX,
        staticColor: STATIC_FILL,
        constraintColor: CONSTRAINT_COLOR_HEX,
        showOutlines: this.#showOutlines,
        outlineAlpha: OUTLINE_ALPHA,
        colorResolver: (body) => bodyColorHex(body),
        alphaResolver: (body) => (body.userData?._hidden ? 0 : bodyFillAlpha(body)),
      });
      this.#app.stage.addChild(this.#debug.container);
    }
    for (const [, gfx] of this.#workerSprites) {
      this.#app?.stage.removeChild(gfx);
      gfx.destroy();
    }
    this.#workerSprites.clear();
    this.#lastWorkerDescs = null;
  }

  // ---------------------------------------------------------------------------
  // Per-frame rendering
  // ---------------------------------------------------------------------------

  renderFrame(space, W, H, { showOutlines, overrides, camX = 0, camY = 0 }) {
    if (!this.#app) return;

    if (overrides?.pixijs) {
      overrides.pixijs(this, space, W, H, showOutlines, camX, camY);
    } else {
      // Keep debug-draw's outline toggle in sync.
      if (this.#debug && this.#debug.showOutlines !== showOutlines) {
        this.#debug.showOutlines = showOutlines;
      }
      // Apply camera offset to the stage so all world-space content (grid +
      // debug bodies) shifts together with the follow target.
      this.#app.stage.position.set(-camX, -camY);
      this.#debug?.render(space);
      this.#app.render();
    }

    // 2D overlay (legend, HUD, etc.)
    if (this.#overlayCtx) {
      this.#overlayCtx.clearRect(0, 0, W, H);
      if (overrides?.overlay) {
        overrides.overlay(this.#overlayCtx, space, W, H, camX, camY);
      }
    }
  }

  renderPreview(space, W, H) {
    this.renderFrame(space, W, H, { showOutlines: true, overrides: null });
  }

  // ---------------------------------------------------------------------------
  // Worker mode
  // ---------------------------------------------------------------------------

  renderFromTransforms(transforms, shapeDescs, W, H, { showOutlines, overrides }) {
    if (!this.#app) return;

    if (overrides?.pixijs) {
      overrides.pixijs(this, transforms, shapeDescs, W, H, showOutlines);
      return;
    }

    // Ensure graphics exist for all shapes
    this.#ensureWorkerGfx(shapeDescs);

    const HEADER = 3;
    const STRIDE = 3;
    const bodyCount = transforms[0] | 0;
    const entries = [...this.#workerSprites.values()];
    const count = Math.min(bodyCount, entries.length);

    for (let i = 0; i < count; i++) {
      const off = HEADER + i * STRIDE;
      const sprite = entries[i];
      sprite.x = transforms[off];
      sprite.y = transforms[off + 1];
      sprite.rotation = transforms[off + 2];
      sprite.visible = true;
    }
    for (let i = count; i < entries.length; i++) {
      entries[i].visible = false;
    }

    this.#app.render();
  }

  // ---------------------------------------------------------------------------
  // Outline toggle
  // ---------------------------------------------------------------------------

  setOutlines(show) {
    this.#showOutlines = show;
    if (this.#debug) this.#debug.showOutlines = show;
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  onResize(displayW, displayH) {
    if (this.#app) {
      this.#app.renderer.resize(displayW, displayH);
    }
  }

  // ---------------------------------------------------------------------------
  // Overlay
  // ---------------------------------------------------------------------------

  getOverlayCtx() {
    return this.#overlayCtx;
  }

  // ---------------------------------------------------------------------------
  // Engine access
  // ---------------------------------------------------------------------------

  getEngine() {
    return { PIXI: _PIXI, app: this.#app };
  }

  getElement() {
    return this.#app?.canvas ?? null;
  }

  /** Sync body graphics with the current space — kept for runner overrides. */
  syncBodies(space) {
    this.#debug?.render(space);
  }

  // ---------------------------------------------------------------------------
  // Internal: worker-mode sprite management
  // ---------------------------------------------------------------------------

  #ensureWorkerGfx(shapeDescs) {
    // Rebuild all graphics when shapeDescs changes (body order may shift)
    if (this.#lastWorkerDescs !== shapeDescs) {
      this.#lastWorkerDescs = shapeDescs;
      for (const [, gfx] of this.#workerSprites) {
        this.#app.stage.removeChild(gfx);
        gfx.destroy();
      }
      this.#workerSprites.clear();
    }

    const entries = [...this.#workerSprites.values()];
    for (let i = entries.length; i < shapeDescs.length; i++) {
      const sd = shapeDescs[i];
      const gfx = new _PIXI.Graphics();
      const isWall = !!sd.wall;
      const color = isWall ? STATIC_FILL : FILL_COLORS[i % FILL_COLORS.length];
      const alpha = isWall ? 0.15 : 0.25;

      if (sd.circle) {
        gfx.circle(0, 0, sd.radius);
        gfx.fill({ color, alpha });
        if (this.#showOutlines) {
          gfx.circle(0, 0, sd.radius);
          gfx.stroke({ color, width: 1.2, alpha: OUTLINE_ALPHA });
        }
      } else if (sd.box) {
        gfx.rect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
        gfx.fill({ color, alpha });
        if (this.#showOutlines) {
          gfx.rect(-sd.hw, -sd.hh, sd.hw * 2, sd.hh * 2);
          gfx.stroke({ color, width: 1.2, alpha: OUTLINE_ALPHA });
        }
      }

      this.#app.stage.addChild(gfx);
      this.#workerSprites.set(i, gfx);
    }
  }
}
