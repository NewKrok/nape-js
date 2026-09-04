#!/usr/bin/env node
/**
 * Generates packages/nape-js/README.md from the root README.md.
 *
 * npm only picks up a README that sits next to the package's own
 * package.json, so the monorepo root copy never reaches the registry — the
 * npm page for @newkrok/nape-js rendered empty from 3.31.0 (the workspaces
 * migration) until this script landed.
 *
 * Two transforms are applied on the way out:
 *
 *  - Relative links are rewritten to absolute GitHub URLs. The package
 *    declares repository.directory = "packages/nape-js", so npm resolves
 *    relative paths against that subdirectory and every link would 404.
 *  - Sections marked <!-- npm:strip --> ... <!-- /npm:strip --> are dropped.
 *    Those cover the monorepo contributor material (development commands,
 *    release pipeline), which is noise on a consumer-facing package page.
 *
 * Run via: npm run sync:readme (wired into build).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const BLOB = "https://github.com/NewKrok/nape-js/blob/master/";
const RAW = "https://raw.githubusercontent.com/NewKrok/nape-js/master/";

const source = readFileSync(resolve(root, "README.md"), "utf8");

/** Absolute URL, page anchor, or mail link — leave untouched. */
const isExternal = (href) => /^(https?:|#|mailto:)/.test(href);

/**
 * Images must resolve to raw.githubusercontent.com; npm proxies them and a
 * blob/ URL serves the HTML page rather than the file itself.
 */
let out = source
  // <img src="..."> and any other HTML src attribute
  .replace(/(\ssrc=")([^"]+)(")/g, (m, pre, href, post) =>
    isExternal(href) ? m : `${pre}${RAW}${href}${post}`,
  )
  // ![alt](path) — markdown images
  .replace(/(!\[[^\]]*\]\()([^)]+)(\))/g, (m, pre, href, post) =>
    isExternal(href) ? m : `${pre}${RAW}${href}${post}`,
  )
  // [text](path) — markdown links (images already consumed above)
  .replace(/(\[[^\]]*\]\()([^)]+)(\))/g, (m, pre, href, post) =>
    isExternal(href) ? m : `${pre}${BLOB}${href}${post}`,
  );

// Drop contributor-only sections, then collapse the blank-line run they leave.
out = out
  .replace(/<!--\s*npm:strip\s*-->[\s\S]*?<!--\s*\/npm:strip\s*-->\n?/g, "")
  .replace(/\n{3,}/g, "\n\n");

const banner =
  "<!-- Generated from the repo-root README.md by scripts/sync-readme.mjs. Edit that file, not this one. -->\n\n";

const target = resolve(root, "packages/nape-js/README.md");
writeFileSync(target, banner + out);

console.log(`sync-readme: wrote packages/nape-js/README.md (${out.length} chars)`);
