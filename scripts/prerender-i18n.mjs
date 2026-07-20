/**
 * Prerender per-language static pages for SEO.
 *
 * The site's runtime i18n (docs/i18n/) swaps text client-side, which is great
 * for UX but invisible to crawlers: every URL serves the English HTML source.
 * This script bakes each locale's dictionary into standalone HTML at build time
 * so every language gets its own indexable URL:
 *
 *   docs/index.html            → en (canonical root, gets hreflang alternates)
 *   docs/de/index.html         → de
 *   docs/zh/index.html         → zh
 *   docs/hu/index.html         → hu
 *   docs/es/index.html         → es
 *   docs/fr/index.html         → fr
 *   docs/examples/index.html   → en   +   docs/<lang>/examples/index.html
 *
 * It applies the SAME transform the client runtime does (data-i18n /
 * data-i18n-html / data-i18n-attr, plus <title> and description meta), then
 * injects <link rel="alternate" hreflang> tags and rewrites <html lang> and
 * og:locale. The English source pages are left in place and only get the
 * hreflang block + a self-referential x-default.
 *
 * The client i18n still loads on every page: it detects that a prerendered
 * page already matches the visitor's language (via <html lang>) and skips the
 * redundant swap; the language switcher navigates to the sibling language URL.
 *
 * Run from build:docs, after stamp-docs.mjs. Idempotent.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docs = resolve(__dirname, "../docs");
const localesDir = resolve(docs, "i18n/locales");

const SITE = "https://napejs.org";
const DEFAULT_LANG = "en";
const LANGS = ["en", "de", "zh", "hu", "es", "fr"];
const OG_LOCALES = {
  en: "en_US", de: "de_DE", zh: "zh_CN", hu: "hu_HU", es: "es_ES", fr: "fr_FR",
};

// The two hand-authored pages to prerender, with their canonical live path.
// `dir` is the output subdirectory under a language folder.
const PAGES = [
  { src: "index.html", dir: "", pathEn: "/", pathLang: (l) => `/${l}/` },
  {
    src: "examples/index.html",
    dir: "examples",
    pathEn: "/examples/",
    pathLang: (l) => `/${l}/examples/`,
  },
];

const dict = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(readFileSync(resolve(localesDir, `${l}.json`), "utf8"))]),
);

const tOf = (lang, key) => {
  const v = dict[lang]?.[key];
  if (v != null) return v;
  return dict[DEFAULT_LANG]?.[key];
};

/** HTML-escape a value destined for a double-quoted attribute. */
const escAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// --- data-i18n* transforms --------------------------------------------------

/** Replace the text content of elements carrying data-i18n="key". */
function applyText(html, lang) {
  // Matches <tag ... data-i18n="key" ...>INNER</tag> for a single, non-nested run.
  // The source uses simple, non-nested elements for data-i18n (spans, h2, a,
  // buttons, p) so a lazy inner match is safe here.
  return html.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, _tag, key, _inner, close) => {
      const val = tOf(lang, key);
      if (val == null) return m;
      return `${open}${val}${close}`;
    },
  );
}

/** Replace innerHTML of elements carrying data-i18n-html="key". */
function applyHtml(html, lang) {
  return html.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, _tag, key, _inner, close) => {
      const val = tOf(lang, key);
      if (val == null) return m;
      return `${open}${val}${close}`;
    },
  );
}

/** Apply data-i18n-attr="attr:key,attr2:key2" to element attributes. */
function applyAttr(html, lang) {
  return html.replace(/<[a-zA-Z0-9]+\b[^>]*\bdata-i18n-attr="([^"]+)"[^>]*>/g, (tag) => {
    const specMatch = tag.match(/data-i18n-attr="([^"]+)"/);
    if (!specMatch) return tag;
    let out = tag;
    for (const pair of specMatch[1].split(",")) {
      const idx = pair.indexOf(":");
      if (idx === -1) continue;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      const val = tOf(lang, key);
      if (val == null) continue;
      const escaped = escAttr(val);
      const attrRe = new RegExp(`(\\s${attr}=")[^"]*(")`);
      if (attrRe.test(out)) out = out.replace(attrRe, `$1${escaped}$2`);
      else out = out.replace(/>$/, ` ${attr}="${escaped}">`);
    }
    return out;
  });
}

/** Rewrite <title>, description metas, <html lang>, og:locale. */
function applyHead(html, lang) {
  const title = tOf(lang, "meta.title") ?? tOf(lang, "examples.meta.title");
  if (title != null) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  }
  const desc = tOf(lang, "meta.description");
  if (desc != null) {
    html = html
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`);
  }
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  if (/<meta property="og:locale"/.test(html)) {
    html = html.replace(
      /(<meta property="og:locale" content=")[^"]*(")/,
      `$1${OG_LOCALES[lang]}$2`,
    );
  }
  // Marker read by the runtime: this page's static content is already baked in
  // `lang`, so initI18n() must not re-apply translations (no flash). Only
  // non-English variants carry it; the English source stays dynamic-detect so
  // a visitor landing on "/" still auto-localizes client-side.
  if (lang !== DEFAULT_LANG && !/name="nape-prerendered"/.test(html)) {
    html = html.replace(
      /<meta charset="[^"]*"\s*\/?>/i,
      (m) => `${m}\n  <meta name="nape-prerendered" content="${lang}" />`,
    );
  }
  return html;
}

// --- hreflang + canonical ---------------------------------------------------

/** Build the hreflang alternate block for a given page. */
function hreflangBlock(page) {
  const lines = [];
  for (const l of LANGS) {
    const href = SITE + (l === DEFAULT_LANG ? page.pathEn : page.pathLang(l));
    lines.push(`  <link rel="alternate" hreflang="${l}" href="${href}" />`);
  }
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE + page.pathEn}" />`);
  return lines.join("\n");
}

/**
 * Insert the hreflang block right before </head>, replacing any previously
 * generated block (delimited by markers) so re-runs stay idempotent.
 */
function injectHreflang(html, page) {
  const START = "<!-- i18n:hreflang:start -->";
  const END = "<!-- i18n:hreflang:end -->";
  const block = `${START}\n${hreflangBlock(page)}\n  ${END}`;
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (re.test(html)) return html.replace(re, block);
  return html.replace(/<\/head>/, `  ${block}\n</head>`);
}

/** Point <link rel=canonical> / og:url at the language-specific URL. */
function applyCanonical(html, page, lang) {
  const url = SITE + (lang === DEFAULT_LANG ? page.pathEn : page.pathLang(lang));
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  return html;
}

/**
 * Fix relative asset paths when a page moves one directory deeper.
 * index.html (root) uses "app.js", "style.css?...", "i18n/...", "api/..." etc.
 * When placed at /<lang>/index.html those must become "../app.js" etc.
 * examples/index.html already uses "../" (it lives one level deep); at
 * /<lang>/examples/index.html the depth is the same relative to its own dir,
 * so only the root-page assets need the extra "../".
 */
function bumpRelativePaths(html, page) {
  if (page.src !== "index.html") return html; // examples paths already ../-relative and depth-preserved
  // Prefix "../" to root-relative-ish local refs in href/src/import that don't
  // already start with http, /, #, ../, or data:.
  const fix = (ref) => {
    if (/^(https?:|\/\/|\/|#|\.\.\/|data:|mailto:)/.test(ref)) return ref;
    // Normalize a leading "./" so "./i18n/x" becomes "../i18n/x", not ".././".
    const bare = ref.replace(/^\.\//, "");
    return "../" + bare;
  };
  html = html.replace(/\b(href|src)="([^"]+)"/g, (m, attr, ref) => `${attr}="${fix(ref)}"`);
  html = html.replace(/\bfrom\s+"([^"]+)"/g, (m, ref) => `from "${fix(ref)}"`);
  return html;
}

// --- generate ---------------------------------------------------------------

let written = 0;

for (const page of PAGES) {
  const srcPath = resolve(docs, page.src);
  const srcHtml = readFileSync(srcPath, "utf8");

  // 1) English source page: leave content, add hreflang + self-canonical.
  const enOut = applyCanonical(injectHreflang(srcHtml, page), page, DEFAULT_LANG);
  writeFileSync(srcPath, enOut);
  written++;

  // 2) Each non-English language → prerendered variant.
  for (const lang of LANGS) {
    if (lang === DEFAULT_LANG) continue;
    let html = srcHtml;
    html = applyText(html, lang);
    html = applyHtml(html, lang);
    html = applyAttr(html, lang);
    html = applyHead(html, lang);
    html = injectHreflang(html, page);
    html = applyCanonical(html, page, lang);
    html = bumpRelativePaths(html, page);

    const outDir = resolve(docs, lang, page.dir);
    const outPath = resolve(outDir, "index.html");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, html);
    written++;
  }
}

// --- sitemap ----------------------------------------------------------------

function buildSitemap() {
  const staticUrls = [
    { loc: "/benchmark.html", freq: "monthly", pri: "0.7" },
    { loc: "/multiplayer.html", freq: "monthly", pri: "0.7" },
    { loc: "/templates.html", freq: "monthly", pri: "0.85" },
    { loc: "/api/index.html", freq: "weekly", pri: "0.8" },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  const langUrl = (page, lang) =>
    SITE + (lang === DEFAULT_LANG ? page.pathEn : page.pathLang(lang));

  for (const page of PAGES) {
    for (const lang of LANGS) {
      const loc = langUrl(page, lang);
      const alternates = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${langUrl(page, l)}" />`,
      );
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + page.pathEn}" />`,
      );
      entries.push(
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
          `    <changefreq>weekly</changefreq>\n    <priority>${page.src === "index.html" ? "1.0" : "0.9"}</priority>\n` +
          alternates.join("\n") +
          `\n  </url>`,
      );
    }
  }
  for (const u of staticUrls) {
    entries.push(
      `  <url>\n    <loc>${SITE + u.loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`,
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    entries.join("\n") +
    `\n</urlset>\n`
  );
}

writeFileSync(resolve(docs, "sitemap.xml"), buildSitemap());

console.log(`Prerendered ${written} page(s) across ${LANGS.length} language(s); sitemap.xml updated.`);
