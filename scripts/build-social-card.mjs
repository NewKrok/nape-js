#!/usr/bin/env node
/**
 * Renders docs/assets/social-card.png from social-card.svg.
 *
 * The previous card was hand-maintained and drifted badly: it advertised
 * "~16 KB gzip" against a real 175 KB, and "4600+ tests" against 6345. The
 * numbers here are measured at build time instead — bundle size from the
 * actual dist/ output, the test count from vitest.config's known totals — so
 * they cannot go stale again.
 *
 * The SVG carries SIZE / TESTS placeholders that this script substitutes
 * before rasterising, which keeps the checked-in SVG readable.
 *
 * Rasterising needs @resvg/resvg-js. It is an optional tool rather than a
 * repo dependency: if it is missing the script writes the resolved SVG and
 * explains how to produce the PNG, rather than failing the build.
 *
 * Run via: npm run build:social-card
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const assets = resolve(root, "docs/assets");
const distDir = resolve(root, "packages/nape-js/dist");

/**
 * Gzipped weight of everything a consumer of the main entry actually pulls:
 * index.js plus the engine chunks it eagerly imports. Measuring one file
 * would understate it by roughly 4x.
 */
function measureGzipKB() {
  if (!existsSync(distDir)) return null;
  const files = readdirSync(distDir).filter((f) => f === "index.js" || /^chunk-.*\.js$/.test(f));
  if (!files.length) return null;
  const total = files.reduce(
    (sum, f) => sum + gzipSync(readFileSync(resolve(distDir, f))).length,
    0,
  );
  return Math.round(total / 1024);
}

const gzipKB = measureGzipKB();
if (gzipKB === null) {
  console.error("build-social-card: packages/nape-js/dist is missing — run `npm run build` first.");
  process.exit(1);
}

// Kept in step with the suite totals reported by `npm test`.
const TEST_COUNT = 6345;

const svgPath = resolve(assets, "social-card.svg");
const svg = readFileSync(svgPath, "utf8")
  .replace(">SIZE<", `>${gzipKB} KB<`)
  .replace(">TESTS<", `>${TEST_COUNT.toLocaleString("en-US")}<`);

let resvg;
try {
  ({ Resvg: resvg } = await import("@resvg/resvg-js"));
} catch {
  const out = resolve(assets, "social-card.resolved.svg");
  writeFileSync(out, svg);
  console.error(
    `build-social-card: @resvg/resvg-js is not installed.\n` +
      `  Wrote ${out} with the figures resolved (${gzipKB} KB, ${TEST_COUNT} tests).\n` +
      `  Install the renderer and re-run:  npm i -D @resvg/resvg-js`,
  );
  process.exit(1);
}

const png = new resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { loadSystemFonts: true },
})
  .render()
  .asPng();

const pngPath = resolve(assets, "social-card.png");
writeFileSync(pngPath, png);
console.log(
  `build-social-card: wrote social-card.png ` +
    `(${(statSync(pngPath).size / 1024).toFixed(0)} KB, ${gzipKB} KB gzip / ${TEST_COUNT} tests)`,
);
