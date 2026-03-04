#!/usr/bin/env node
/**
 * Cache-busting stamper for docs/ assets.
 *
 * Reads the version from package.json and appends ?v=<version> to local
 * asset references in HTML files and ES module imports in JS files.
 * This ensures GitHub Pages serves fresh content after each deploy.
 *
 * Run via: npm run build:docs (called automatically after build + copy).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const docs = resolve(root, "docs");

const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const v = `v=${version}`;

/**
 * Replace local asset references, preserving any existing ?v= query string.
 * Handles: href="style.css", src="app.js", from "./nape-js.esm.js", etc.
 */
function stamp(file, patterns) {
  let content = readFileSync(file, "utf8");
  for (const [re, replacer] of patterns) {
    content = content.replace(re, replacer);
  }
  writeFileSync(file, content, "utf8");
}

// Strip any existing ?v=... before appending fresh one
const stripV = (ref) => ref.replace(/\?v=[^"')]*/, "");

// --- HTML files: stamp <link href="..."> and <script src="..."> ---
for (const htmlFile of ["index.html", "examples.html"]) {
  stamp(resolve(docs, htmlFile), [
    // <link rel="stylesheet" href="style.css"> or href="style.css?v=old"
    [
      /href="([^"]+\.css)(\?v=[^"]*)?"/g,
      (_m, ref) => `href="${stripV(ref)}?${v}"`,
    ],
    // <script ... src="app.js"> or src="examples.js?v=old"
    [
      /src="([^"]+\.js)(\?v=[^"]*)?"/g,
      (_m, ref, _q) => {
        // Don't stamp external URLs (GA, CDN, etc.)
        if (ref.startsWith("http")) return `src="${ref}"`;
        return `src="${stripV(ref)}?${v}"`;
      },
    ],
  ]);
}

// --- JS files: stamp ES import paths for local modules ---
for (const jsFile of ["app.js", "examples.js"]) {
  stamp(resolve(docs, jsFile), [
    // from "./nape-js.esm.js" or from "./renderer.js"
    [
      /from\s+"(\.\/[^"]+\.js)(\?v=[^"]*)?"/g,
      (_m, ref) => `from "${stripV(ref)}?${v}"`,
    ],
  ]);
}

console.log(`docs/ assets stamped with ?${v}`);
