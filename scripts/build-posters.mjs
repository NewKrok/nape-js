#!/usr/bin/env node
/**
 * Render a poster image for every demo: docs/assets/posters/<id>.webp
 *
 * Opens each generated demo page (docs/examples/<id>/) in headless Chrome,
 * lets the simulation run for a moment and grabs the canvas as WebP. The
 * posters are used as og:image on the demo pages, as the card images on
 * /games/, as thumbnails in "More demos" and as the LCP placeholder behind
 * the lazy live previews on the examples grid.
 *
 * Mode per demo: a demo whose source carries custom Three.js content
 * (render3d / render3dOverlay hooks, a threejs override, THREE.* usage) is
 * captured in the 3D renderer with outlines OFF — that is the view its
 * author actually designed. Everything else is captured in 2D with outlines
 * (the generic 3D extrusion adds nothing there). The chosen mode is written
 * to docs/assets/posters/manifest.json so the page generator can link
 * poster-bearing cards straight into the matching renderer (?mode=3d).
 *
 * Posters are committed; this script only renders demos that have no poster
 * yet (pass --force to redo all, --only=id1,id2 for specific ones, --redo-3d
 * to re-render just the 3D-detected set). It needs a local Google Chrome
 * (playwright-core `channel: "chrome"`, no browser download) and the
 * generated pages (run build-site-pages.mjs first).
 *
 *   node scripts/build-posters.mjs [--force|--redo-3d] [--only=falling,kickoff] [--mode=2d|3d] [--port=5610]
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, createReadStream } from "node:fs";
import { resolve, join, extname } from "node:path";
import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright-core";
import { DOCS_DIR, readRegistryIds } from "./lib/demo-meta.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = true] = a.replace(/^--/, "").split("="); return [k, v]; }));
const PORT = Number(args.port || 5610);
const OUT = resolve(DOCS_DIR, "assets/posters");
const WIDTH = 900, HEIGHT = 500, QUALITY = 0.84;
const SETTLE_MS = Number(args.settle || 2200);

mkdirSync(OUT, { recursive: true });

// --- tiny static server -----------------------------------------------------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let file = join(DOCS_DIR, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

if (!existsSync(resolve(DOCS_DIR, "nape-js.esm.js"))) {
  console.error("docs/nape-js.esm.js missing — run `npm run build:docs` first.");
  process.exit(1);
}

const all = readRegistryIds();
const HAS_3D = /(^\s*render3d(Overlay)?\s*\(|threejs\s*[:(]|_scene3d|THREE\.)/m;
const modeOf = (id) => {
  if (args.mode) return String(args.mode);
  const src = readFileSync(resolve(DOCS_DIR, "demos", `${id}.js`), "utf8");
  if (/canvas2dOnly:\s*true/.test(src)) return "2d"; // the page hides the 3D toggle for these
  return HAS_3D.test(src) ? "3d" : "2d";
};
const MANIFEST = join(OUT, "manifest.json");
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

const only = args.only ? String(args.only).split(",") : null;
const todo = all.filter((id) => {
  if (only && !only.includes(id)) return false;
  if (args.force) return true;
  if (args["redo-3d"]) return modeOf(id) === "3d";
  return !existsSync(join(OUT, `${id}.webp`)) || manifest[id]?.mode !== modeOf(id);
});
console.log(`${todo.length} poster(s) to render (of ${all.length} demos; ${all.filter((id) => modeOf(id) === "3d").length} in 3D)`);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});

let ok = 0, failed = [];
for (const id of todo) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const mode = modeOf(id);
  try {
    const query = mode === "3d" ? "?mode=3d&outline=0" : "";
    await page.goto(`http://localhost:${PORT}/examples/${id}/${query}`, { waitUntil: "load", timeout: 30000 });
    // Wait until the runner reports a frame, then let the scene settle.
    await page.waitForFunction(() => !/—/.test(document.getElementById("fpsLabel")?.textContent || "—"), null, { timeout: 30000 });
    if (mode === "3d") {
      // Three.js + the demo's scene load lazily after the first 2D frame.
      await page.waitForFunction(() => document.querySelector('.card-render-btn.active')?.dataset.mode === "3d", null, { timeout: 40000 });
      await sleep(SETTLE_MS * 2);
    } else {
      await sleep(SETTLE_MS);
    }
    let dataUrl;
    if (mode === "3d") {
      // WebGL buffers are not readable after present, so screenshot the
      // composited element (controls hidden) and re-encode to WebP in-page.
      await page.addStyleTag({ content: ".canvas-controls, .canvas-overlay { display: none !important; } #canvasWrap, #canvasWrap * { border-radius: 0 !important; border: 0 !important; box-shadow: none !important; }" });
      const png = await page.locator("#canvasWrap").screenshot({ type: "png" });
      dataUrl = await page.evaluate(async ([b64, w, h, q]) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const out = document.createElement("canvas");
        out.width = w; out.height = h;
        out.getContext("2d").drawImage(img, 0, 0, w, h);
        return out.toDataURL("image/webp", q);
      }, [png.toString("base64"), WIDTH, HEIGHT, QUALITY]);
    } else {
      dataUrl = await page.evaluate(([w, h, q]) => {
        const src = document.querySelector("#canvasWrap canvas");
        if (!src) throw new Error("no canvas");
        const out = document.createElement("canvas");
        out.width = w; out.height = h;
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#0a0e14"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(src, 0, 0, w, h);
        return out.toDataURL("image/webp", q);
      }, [WIDTH, HEIGHT, QUALITY]);
    }
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    if (buf.length < 2000) throw new Error(`suspiciously small image (${buf.length} B)`);
    writeFileSync(join(OUT, `${id}.webp`), buf);
    manifest[id] = { mode, renderedAt: new Date().toISOString().slice(0, 10) };
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
    ok++;
    console.log(`  ✓ ${id.padEnd(24)} ${mode}  ${(buf.length / 1024).toFixed(0).padStart(4)} KB${errors.length ? "  (page errors: " + errors.length + ")" : ""}`);
  } catch (err) {
    failed.push(id);
    console.log(`  ✗ ${id}: ${String(err.message || err).slice(0, 140)}`);
  }
  await page.close();
}
await browser.close();
server.close();
console.log(`\n${ok} rendered, ${failed.length} failed${failed.length ? ": " + failed.join(", ") : ""}`);
process.exit(failed.length ? 1 : 0);
