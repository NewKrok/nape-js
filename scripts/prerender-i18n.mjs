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
 * Generated pages (per-demo pages, /games/, /showcase/, /guides/) are written
 * — already localized — by scripts/build-site-pages.mjs, which must run first;
 * this script only adds them to sitemap.xml via its generatedPages() export.
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
 * Run from build:docs, after stamp-docs.mjs and build-site-pages.mjs. Idempotent.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SITE,
  DEFAULT_LANG,
  LANGS,
  t as tOf,
  escAttr,
  applyText,
  applyHtml,
  applyAttr,
  applyLangMeta,
  injectHreflang,
  applyCanonical,
  pageUrl,
  sitemapEntry,
} from "./lib/i18n-html.mjs";
import { generatedPages } from "./build-site-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docs = resolve(__dirname, "../docs");

// The two hand-authored pages to prerender, with their canonical live path.
// `dir` is the output subdirectory under a language folder.
const PAGES = [
  {
    src: "index.html", dir: "", pathEn: "/", pathLang: (l) => `/${l}/`,
    titleKey: "meta.title", descKey: "meta.description",
  },
  {
    src: "examples/index.html", dir: "examples", pathEn: "/examples/", pathLang: (l) => `/${l}/examples/`,
    titleKey: "examples.meta.title", descKey: "examples.meta.description",
  },
];

/** Rewrite <title>, description metas, <html lang>, og:locale. */
function applyHead(html, lang, page) {
  const title = tOf(lang, page.titleKey);
  if (title != null) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
  }
  const desc = tOf(lang, page.descKey);
  if (desc != null) {
    html = html
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`);
  }
  // <html lang>, og:locale and the nape-prerendered marker (non-English only;
  // the English source stays dynamic-detect so a visitor landing on "/" still
  // auto-localizes client-side).
  return applyLangMeta(html, lang);
}

/**
 * Fix relative asset paths for a page that moved one directory deeper.
 *
 * Source pages and their prerendered variants:
 *   index.html            (depth 0)  →  <lang>/index.html            (depth 1)
 *   examples/index.html   (depth 1)  →  <lang>/examples/index.html   (depth 2)
 *
 * Both variants sit exactly ONE level deeper than their source, so every local
 * reference needs one extra "../". The one exception is the examples page's
 * "Home" link (href="../"), which must keep pointing at the LANGUAGE home
 * (<lang>/), not the site root — so it stays "../".
 */
function bumpRelativePaths(html, page) {
  const isExamples = page.src !== "index.html";

  const fix = (ref) => {
    // Leave absolute/external/in-page refs alone.
    if (/^(https?:|\/\/|\/|#|data:|mailto:)/.test(ref)) return ref;

    // Keep links between the two LOCALIZED pages pointing within the same
    // language folder (do NOT bump these up a level):
    //  - examples page → Home: href="../" targets <lang>/   → stays "../"
    //  - home page → examples: href="examples/" targets <lang>/examples/
    //    (with optional query, e.g. "examples/?open=falling") → stays as-is
    if (isExamples && ref === "../") return ref;
    // Home → localized sibling pages (examples/, games/, showcase/ — all of
    // which have a <lang>/ variant) stay language-relative.
    if (!isExamples && /^\.?\/?(examples|games|showcase)\/(\?|$)/.test(ref)) return ref;
    // Examples → sibling localized pages one level up ("../games/").
    if (isExamples && /^\.\.\/(examples|games|showcase)\/(\?|$)/.test(ref)) return ref;
    // Examples → per-demo pages ("<id>/", generated as <lang>/examples/<id>/
    // by build-site-pages.mjs) stay language-relative too.
    if (isExamples && /^[a-z0-9-]+\/(\?|$)/.test(ref)) return ref;

    // Everything else (assets, api/, shared benchmark/multiplayer pages, the
    // i18n modules) lives at the site root, one level up. Normalize a leading
    // "./" so "./i18n/x" → "../i18n/x", not ".././i18n/x".
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
    html = applyHead(html, lang, page);
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
  // templates.html is intentionally absent: the project-templates effort is
  // parked, so the page is no longer linked from the site or advertised to
  // crawlers. The file stays in place so existing inbound links don't 404.
  const staticUrls = [
    { loc: "/ai.html", freq: "monthly", pri: "0.8" },
    { loc: "/benchmark.html", freq: "monthly", pri: "0.7" },
    { loc: "/multiplayer.html", freq: "monthly", pri: "0.7" },
    { loc: "/api/index.html", freq: "weekly", pri: "0.8" },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  // Hand-authored, localized pages (home + examples list).
  for (const page of PAGES) {
    for (const lang of LANGS) {
      entries.push(
        sitemapEntry(page, lang, {
          lastmod: today,
          changefreq: "weekly",
          priority: page.src === "index.html" ? "1.0" : "0.9",
        }),
      );
    }
  }
  // Generated pages (per-demo, games, showcase, guides) — see build-site-pages.mjs.
  for (const page of generatedPages()) {
    const langs = page.localized === false ? [DEFAULT_LANG] : LANGS;
    for (const lang of langs) {
      entries.push(sitemapEntry(page, lang, { lastmod: page.lastmod ?? today, changefreq: page.changefreq, priority: page.priority }));
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
