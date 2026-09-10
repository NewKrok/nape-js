#!/usr/bin/env node
/**
 * Emit narrow WebP variants of the poster and showcase images.
 *
 * Every card image on the site is served at its full authored width (900px
 * for posters, 960px for showcase shots) into slots that are far narrower:
 * ~290px for a game card, ~217px for a "related demos" thumbnail, ~364px for
 * a card at phone width. Lighthouse measured 153 KiB of that as waste on the
 * home page alone, at its 1.75 device-pixel-ratio profile.
 *
 * So each source gets a 320w and a 640w sibling (`<name>@320.webp`,
 * `<name>@640.webp`) and the markup offers all three through `srcset`. High-DPR
 * phones still pick the original — this only ever adds smaller options.
 *
 * The downscale runs in the same headless Chrome that build-posters.mjs uses
 * (playwright-core, `channel: "chrome"`, no browser download): the source is
 * decoded, drawn into a canvas at the target width and re-encoded as WebP.
 * Nothing is regenerated unless it is missing or older than its source, so
 * repeat runs are free.
 *
 * Run via: npm run build:image-variants (and from build:docs).
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, "..", "docs");
const DIRS = ["assets/posters", "assets/showcase"];
const WIDTHS = [320, 640];
const QUALITY = 0.82;
/** Matches `<name>@<width>.webp` — the variants this script itself produces. */
const VARIANT_RE = /@\d+\.webp$/;

/** Sources that need at least one variant (re)built. */
function pending() {
  const jobs = [];
  for (const dir of DIRS) {
    const abs = resolve(DOCS, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      if (!name.endsWith(".webp") || VARIANT_RE.test(name)) continue;
      const src = join(abs, name);
      const srcTime = statSync(src).mtimeMs;
      const widths = WIDTHS.filter((w) => {
        const out = join(abs, name.replace(/\.webp$/, `@${w}.webp`));
        return !existsSync(out) || statSync(out).mtimeMs < srcTime;
      });
      if (widths.length) jobs.push({ dir, name, src, widths });
    }
  }
  return jobs;
}

const jobs = pending();
if (!jobs.length) {
  console.log("image variants: up to date");
  process.exit(0);
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setContent("<!doctype html><title>variants</title>");

let written = 0;
for (const job of jobs) {
  const dataUrl = `data:image/webp;base64,${readFileSync(job.src).toString("base64")}`;
  for (const width of job.widths) {
    const out = await page.evaluate(
      async ({ dataUrl, width, quality }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        // Never upscale: a source already narrower than the target is copied
        // at its own size, so the srcset candidate stays honest.
        const w = Math.min(width, img.naturalWidth);
        const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/webp", quality);
      },
      { dataUrl, width, quality: QUALITY },
    );
    const buf = Buffer.from(out.split(",")[1], "base64");
    writeFileSync(join(DOCS, job.dir, job.name.replace(/\.webp$/, `@${width}.webp`)), buf);
    written++;
  }
}

await browser.close();
console.log(`image variants: wrote ${written} file(s) for ${jobs.length} source(s)`);
