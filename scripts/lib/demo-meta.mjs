/**
 * Build-time reader for the docs demo registry.
 *
 * The browser registry is `docs/examples.js` (the ordered list of demo module
 * imports) plus the `export default { id, label, tags, desc, … }` header of
 * each `docs/demos/<id>.js`. Importing those modules in Node is not an option:
 * they pull in the engine bundle and touch `window` at module scope. Instead
 * this module extracts the metadata fields textually. Only the literal header
 * fields are read (id, label, tags, desc, featured); a demo whose header is
 * not a plain object literal fails loudly so the site build cannot silently
 * drop it.
 *
 * Tiers (physics / game / showpiece) come from `docs/demo-categories.js`,
 * which is a pure ESM module with no browser dependencies and is imported
 * directly so the build and the runtime can never disagree.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DOCS_DIR = resolve(__dirname, "../../docs");

const categories = await import(pathToFileURL(resolve(DOCS_DIR, "demo-categories.js")).href);
export const { tierOf, categoryOf, matchesCategory, CATEGORIES, SHOWPIECE_DEMO_IDS, GAME_DEMO_IDS } = categories;

/** Ordered demo ids exactly as `docs/examples.js` imports them. */
export function readRegistryIds() {
  const src = readFileSync(resolve(DOCS_DIR, "examples.js"), "utf8");
  const ids = [];
  for (const m of src.matchAll(/from\s+"\.\/demos\/([a-z0-9-]+)\.js(?:\?v=[^"]*)?"/g)) ids.push(m[1]);
  if (ids.length === 0) throw new Error("demo-meta: no demo imports found in docs/examples.js");
  return ids;
}

/**
 * Evaluate a JS string expression made only of string literals and `+`.
 * Demo descriptions are written either as one literal or as a `+`-joined run
 * of literals across lines; anything else is rejected.
 */
function evalStringExpr(expr, id) {
  const trimmed = expr.trim();
  const literal = /(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/;
  const ok = new RegExp(`^${literal.source}(?:\\s*\\+\\s*${literal.source})*$`);
  if (!ok.test(trimmed)) {
    throw new Error(`demo-meta: ${id}: desc is not a plain string expression:\n${trimmed.slice(0, 120)}`);
  }
  return Function(`"use strict"; return (${trimmed});`)();
}

/** Extract `key: <value>,` from the header, where value ends at the next top-level key or `};`. */
function fieldExpr(header, key) {
  // Header fields sit at two-space indent. Capture lazily until a line that
  // begins another two-space key or closes the object.
  const re = new RegExp(`\\n  ${key}:\\s*([\\s\\S]*?)(?=\\n  [a-zA-Z_$][\\w$]*\\s*[:(]|\\n  async |\\n  get |\\n};)`);
  const m = header.match(re);
  if (!m) return null;
  return m[1].replace(/,\s*$/, "");
}

/** Read one demo's header. */
export function readDemoMeta(id) {
  const file = resolve(DOCS_DIR, "demos", `${id}.js`);
  const src = readFileSync(file, "utf8");
  // Either `export default {…}` or `const demoDef = {…}; export default demoDef;`.
  let start = src.indexOf("\nexport default {");
  if (start === -1) {
    const named = src.match(/\nexport default ([A-Za-z_$][\w$]*);/);
    if (named) start = src.indexOf(`\nconst ${named[1]} = {`);
  }
  if (start === -1) throw new Error(`demo-meta: ${id}: no demo object literal found`);
  const header = src.slice(start);

  const idExpr = fieldExpr(header, "id");
  const labelExpr = fieldExpr(header, "label");
  const tagsExpr = fieldExpr(header, "tags");
  const descExpr = fieldExpr(header, "desc");
  const featuredExpr = fieldExpr(header, "featured");
  if (!idExpr || !labelExpr) throw new Error(`demo-meta: ${id}: missing id/label in header`);

  const parsedId = evalStringExpr(idExpr, id);
  if (parsedId !== id) throw new Error(`demo-meta: ${id}: header id is "${parsedId}"`);
  const label = evalStringExpr(labelExpr, id);
  const tags = tagsExpr ? JSON.parse(tagsExpr.replace(/,\s*\]/, "]").replace(/'/g, '"')) : [];
  const desc = descExpr ? evalStringExpr(descExpr, id) : "";
  const featured = featuredExpr ? /^true/.test(featuredExpr.trim()) : false;

  const demo = { id, label, tags, desc, featured };
  return { ...demo, tier: tierOf(demo), category: categoryOf(demo) };
}

/** Every registered demo, in registry order, with tier/category resolved. */
export function readAllDemos() {
  return readRegistryIds().map(readDemoMeta);
}

/** Strip HTML tags and collapse whitespace (for <meta description>). */
export function plainText(html) {
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&rarr;/g, "→")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cut to `max` chars on a word boundary and add an ellipsis. */
export function truncate(text, max = 158) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  // Prefer a sentence boundary in the back half; fall back to a word boundary.
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentence > max * 0.45) return cut.slice(0, sentence + 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:\-–—]$/, "") + "…";
}

/** Last commit date (YYYY-MM-DD) of a repo file, or today when unavailable. */
export function gitLastmod(relPath) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${relPath}"`, { cwd: resolve(DOCS_DIR, ".."), stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch { /* not a git checkout */ }
  return new Date().toISOString().slice(0, 10);
}
