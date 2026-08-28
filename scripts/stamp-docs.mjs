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

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const docs = resolve(root, "docs");

const { version } = JSON.parse(
  readFileSync(resolve(root, "packages/nape-js/package.json"), "utf8"),
);
const { version: pixiVersion } = JSON.parse(
  readFileSync(resolve(root, "packages/nape-pixi/package.json"), "utf8"),
);
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
for (const htmlFile of ["index.html", "examples/index.html"]) {
  stamp(resolve(docs, htmlFile), [
    // <link rel="stylesheet" href="style.css"> or href="style.css?v=old"
    [/href="([^"]+\.css)(\?v=[^"]*)?"/g, (_m, ref) => `href="${stripV(ref)}?${v}"`],
    // <script ... src="app.js"> or src="examples.js?v=old"
    [
      /src="([^"]+\.js)(\?v=[^"]*)?"/g,
      (_m, ref, _q) => {
        // Don't stamp external URLs (GA, CDN, etc.)
        if (ref.startsWith("http")) return `src="${ref}"`;
        return `src="${stripV(ref)}?${v}"`;
      },
    ],
    // Inline `<script type="module">` imports: import { x } from "./i18n/i18n.js"
    [/from\s+"(\.\.?\/[^"]+\.js)(\?v=[^"]*)?"/g, (_m, ref) => `from "${stripV(ref)}?${v}"`],
  ]);
}

// --- JS files: stamp ES import paths for local modules ---
// Every hand-written module under docs/ must import local files through the
// SAME stamped URL: a mix of stamped and bare specifiers makes the browser
// load two instances of the engine bundle (each ?v= variant is a separate
// module), which crashed the docs site on 3.40.0. Enumerate instead of
// hand-listing so new demos can never fall out of sync.
const isCopiedBundle = (name) =>
  name === "nape-js.esm.js" ||
  name === "nape-pixi.esm.js" ||
  name.startsWith("chunk-") ||
  name === "codepen-templates.js"; // has its own template-safe rules below

const jsFiles = [];
// NOTE: docs/serialization and docs/replay are verbatim dist copies — never
// stamp inside them (their relative chunk imports must stay byte-identical
// to the engine bundle's, or the browser loads a second chunk instance).
for (const dir of ["", "demos", "renderers", "i18n"]) {
  const abs = resolve(docs, dir);
  let entries;
  try {
    entries = readdirSync(abs, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".js") && !isCopiedBundle(e.name)) {
      jsFiles.push(dir ? `${dir}/${e.name}` : e.name);
    }
  }
}
for (const jsFile of jsFiles) {
  stamp(resolve(docs, jsFile), [
    // from "./nape-js.esm.js" or from '../nape-pixi.esm.js' — both quote styles
    [/from\s+"(\.\.?\/[^"]+\.js)(\?v=[^"]*)?"/g, (_m, ref) => `from "${stripV(ref)}?${v}"`],
    [/from\s+'(\.\.?\/[^']+\.js)(\?v=[^']*)?'/g, (_m, ref) => `from '${stripV(ref)}?${v}'`],
  ]);
}

// --- codepen-templates.js: stamp version constants + CDN URLs ---
stamp(resolve(docs, "codepen-templates.js"), [
  // Version constants drive both the CDN URLs (CodePen) and the
  // package.json deps (StackBlitz). Keep them in lockstep with package.json.
  [/const NAPE_VERSION = "[^"]*";/, `const NAPE_VERSION = "${version}";`],
  [/const NAPE_PIXI_VERSION = "[^"]*";/, `const NAPE_PIXI_VERSION = "${pixiVersion}";`],
  [
    /https:\/\/cdn\.jsdelivr\.net\/npm\/@newkrok\/nape-js(@[^/]*)?\/dist\/index\.js/g,
    `https://cdn.jsdelivr.net/npm/@newkrok/nape-js@${version}/dist/index.js`,
  ],
  [
    /https:\/\/cdn\.jsdelivr\.net\/npm\/@newkrok\/nape-pixi(@[^/]*)?\/dist\/index\.js/g,
    `https://cdn.jsdelivr.net/npm/@newkrok/nape-pixi@${pixiVersion}/dist/index.js`,
  ],
]);

console.log(`docs/ assets stamped with ?${v}`);
