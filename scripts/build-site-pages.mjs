#!/usr/bin/env node
/**
 * Generate the static, crawlable pages of the docs site from the demo
 * registry and the markdown guides:
 *
 *   docs/examples/<id>/index.html     one page per demo (+ per language)
 *   docs/games/index.html             games landing: showpieces → slices → shipped
 *   docs/showcase/index.html          shipped games (the home section, as a page)
 *   docs/guides/index.html            guide hub
 *   docs/guides/<name>/index.html     cookbook, anti-patterns, … rendered from .md
 *
 * plus two in-place stamps on the hand-authored pages:
 *
 *   docs/index.html                   data-site-count="…" numbers in the hero
 *   docs/examples/index.html          the static A–Z demo index between markers
 *
 * Everything derives from `docs/examples.js` (registry order), each demo's
 * `export default { id, label, tags, desc }` header, `docs/demo-categories.js`
 * (tiers) and the locale dictionaries, so nothing here is maintained by hand.
 *
 * Localized pages are written for every language in LANGS. Guides are English
 * only (there is no translated markdown) and get a single URL. Sitemap entries
 * for all generated pages are exposed via `generatedPages()` and consumed by
 * scripts/prerender-i18n.mjs, which writes sitemap.xml.
 *
 * Run from build:docs after stamp-docs.mjs and before prerender-i18n.mjs.
 * Idempotent; also runnable on its own: `node scripts/build-site-pages.mjs`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

import {
  DOCS_DIR,
  readAllDemos,
  SHOWPIECE_DEMO_IDS,
  plainText,
  truncate,
  gitLastmod,
} from "./lib/demo-meta.mjs";
import {
  SITE,
  LANGS,
  DEFAULT_LANG,
  OG_LOCALES,
  t,
  escAttr,
  escText,
  localizeBody,
  applyLangMeta,
  applyTitleDesc,
  injectHreflang,
  applyCanonical,
  dictHas,
} from "./lib/i18n-html.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const { version } = JSON.parse(readFileSync(resolve(root, "packages/nape-js/package.json"), "utf8"));
const V = `?v=${version}`;

const GA_ID = "G-TF84DLZ4X8";
const GITHUB = "https://github.com/NewKrok/nape-js";
const SOCIAL_CARD = `${SITE}/assets/social-card.png`;

// --- registry ----------------------------------------------------------------

const DEMOS = readAllDemos();
const byId = Object.fromEntries(DEMOS.map((d) => [d.id, d]));
const showpieces = [...SHOWPIECE_DEMO_IDS].map((id) => byId[id]).filter(Boolean);
const slices = DEMOS.filter((d) => d.tier === "game").reverse(); // newest first
const physics = DEMOS.filter((d) => d.tier === "physics");

// Shipped games: the home page's showcase grid is the single source of truth.
const homeHtml = readFileSync(resolve(DOCS_DIR, "index.html"), "utf8");
const showcaseMatch = homeHtml.match(/<div class="showcase-grid">([\s\S]*?)<\/div>\s*\n\s*<p class="showcase-foot"/);
if (!showcaseMatch) throw new Error("build-site-pages: showcase grid not found in docs/index.html");
const showcaseGridInner = showcaseMatch[1];

/**
 * Re-base the site-root-relative asset paths in markup lifted out of
 * docs/index.html (depth 0) onto a page at some other depth.
 *
 * `src` and *every* `srcset` candidate has to move. A missed srcset candidate
 * is the nastiest kind of broken image: the `src` still resolves, so the page
 * looks fine at the width you happen to test at, and only breaks on the
 * viewports that pick the candidate.
 */
const rebaseAssets = (html, root) =>
  html
    .replace(/src="assets\//g, `src="${root}assets/`)
    .replace(
      /srcset="([^"]+)"/g,
      (_m, list) => `srcset="${list.replace(/(^|,\s*)assets\//g, `$1${root}assets/`)}"`,
    );
const shippedCount = (showcaseGridInner.match(/class="showcase-card"/g) || []).length;

/** Relative (site-root) path of a demo's poster, or null when not rendered yet. */
const posterOf = (id) => (existsSync(resolve(DOCS_DIR, "assets/posters", `${id}.webp`)) ? `assets/posters/${id}.webp` : null);

/**
 * `srcset`/`sizes` for a card image, offering the narrow variants that
 * scripts/build-image-variants.mjs emits alongside each source.
 *
 * Every one of these images is authored at 900-960px and displayed in a slot
 * a third of that, so without candidates the browser has no choice but the
 * full-width file. A variant is only offered if it exists on disk, which
 * keeps the markup correct on a tree where the variants have not been built.
 */
function responsiveAttrs(relPath, root, sizes) {
  const candidates = [];
  for (const width of [320, 640]) {
    const variant = relPath.replace(/\.webp$/, `@${width}.webp`);
    if (existsSync(resolve(DOCS_DIR, variant))) candidates.push(`${root}${variant} ${width}w`);
  }
  if (!candidates.length) return "";
  // The source itself is the widest candidate; posters are 900w, showcase 960w.
  const naturalWidth = relPath.startsWith("assets/showcase/") ? 960 : 900;
  candidates.push(`${root}${relPath} ${naturalWidth}w`);
  return ` srcset="${candidates.join(", ")}" sizes="${sizes}"`;
}
// build-posters.mjs records which renderer each poster shows; cards that show a
// 3D poster deep-link into the 3D renderer so the click matches the picture.
const posterManifestPath = resolve(DOCS_DIR, "assets/posters/manifest.json");
const posterManifest = existsSync(posterManifestPath) ? JSON.parse(readFileSync(posterManifestPath, "utf8")) : {};
const posterQuery = (id) => (posterManifest[id]?.mode === "3d" ? "?mode=3d&outline=0" : "");
const POSTER_COUNT = DEMOS.filter((d) => posterOf(d.id)).length;

const COUNTS = {
  demos: DEMOS.length,
  games: DEMOS.filter((d) => d.tier !== "physics").length,
  showpieces: showpieces.length,
  shipped: shippedCount,
};

// --- guides ------------------------------------------------------------------

/** Guides published on-site (user-facing). Contributor docs stay on GitHub. */
const GUIDES = [
  { name: "cookbook",          icon: "book", blurb: "Copy-paste recipes organised by goal — platformer, ragdoll, fluid, fracture, replay, worker." },
  { name: "anti-patterns",     icon: "ban", blurb: "The mistakes that cause bugs, leaks and jitter — and what to do instead." },
  { name: "troubleshooting",   icon: "wrench", blurb: "Symptom → cause → fix, for the problems people actually hit." },
  { name: "multiplayer-guide", icon: "globe", blurb: "Server-authoritative architecture, binary snapshots, interpolation and prediction." },
  { name: "replay-guide",      icon: "rewind", blurb: "Record inputs, encode to a compact blob, scrub and play back deterministically." },
];
const CONTRIBUTOR_GUIDES = ["architecture", "testing", "workflow"];

/**
 * Tag → guide anchor. Drives "Related guides" on demo pages and "Related
 * demos" on guide pages. Keys are matched case-insensitively as substrings of
 * a demo's tags, so "Sensor" also catches "Sensors".
 */
const TAG_GUIDES = [
  [/charactercontroller|platformer/, "cookbook", "platformer-character", "Platformer character"],
  [/oneway/, "cookbook", "one-way-platforms", "One-way platforms"],
  [/ragdoll/, "cookbook", "ragdoll", "Ragdoll"],
  [/^chain$|rope/, "cookbook", "rope--chain", "Rope / chain"],
  [/vehicle|^car$|topdown/, "cookbook", "vehicle-top-down", "Vehicle (top-down)"],
  [/fluid|buoyancy/, "cookbook", "fluid--water-pool", "Fluid / water pool"],
  [/raycast/, "cookbook", "raycasting", "Raycasting"],
  [/convexcast|sweep/, "cookbook", "convex-cast-swept-shape-queries", "Convex cast"],
  [/sensor|trigger/, "cookbook", "sensor--trigger-zone", "Sensor / trigger zone"],
  [/filter/, "cookbook", "collision-filtering", "Collision filtering"],
  [/explosion|impulse/, "cookbook", "explosion-impulse", "Explosion impulse"],
  [/fracture|voronoi|destruction|destructible/, "cookbook", "voronoi-fracture-destruction", "Voronoi fracture"],
  [/particle/, "cookbook", "particle-emitter-bullets-sparks-debris", "Particle emitter"],
  [/conveyor/, "cookbook", "conveyor-belt", "Conveyor belt"],
  [/breakable/, "cookbook", "breakable-constraint", "Breakable constraint"],
  [/spring|soft/, "cookbook", "soft-constraint-spring-like", "Soft constraint (spring)"],
  [/joint|constraint/, "cookbook", "constraint-reference--which-joint-to-use", "Which joint to use"],
  [/serializ|saveload|rewind/, "cookbook", "serialization-save--load", "Serialization (save / load)"],
  [/multiplayer/, "multiplayer-guide", "", "Multiplayer guide"],
  [/determinis|replay/, "replay-guide", "", "Replay guide"],
  [/worker/, "cookbook", "web-worker-off-thread-physics", "Web Worker physics"],
  [/bullet|ccd/, "cookbook", "ccd-bullet-bodies", "CCD (bullet bodies)"],
  [/substep/, "cookbook", "sub-stepping-for-stability", "Sub-stepping"],
  [/kinematic/, "cookbook", "kinematic-moving-platform", "Kinematic moving platform"],
  [/material/, "cookbook", "custom-material-presets", "Material presets"],
  [/performance|profil/, "cookbook", "performance-profiling", "Performance profiling"],
  [/stacking|stability/, "troubleshooting", "stacked-objects-are-unstable--wobble", "Unstable stacks"],
  [/^ai$|waves?$/, "cookbook", "wave-spawner-timer-driven-cadence", "Wave spawner"],
  [/shooter|aim/, "cookbook", "viewport-bounded-auto-aim", "Auto-aim"],
  [/homing|missile/, "cookbook", "homing-missile-steered-projectile", "Homing missile"],
];

function relatedGuidesFor(demo) {
  const out = [];
  const seen = new Set();
  const tags = demo.tags.map((x) => x.replace(/[\s-]/g, "").toLowerCase());
  for (const [re, guide, anchor, label] of TAG_GUIDES) {
    if (!tags.some((tg) => re.test(tg))) continue;
    const key = guide + "#" + anchor;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ guide, anchor, label });
    if (out.length >= 4) break;
  }
  if (!seen.has("cookbook#")) out.push({ guide: "cookbook", anchor: "", label: "Cookbook" });
  if (demo.tier === "physics" && out.length < 5) out.push({ guide: "anti-patterns", anchor: "", label: "Anti-patterns" });
  return out.slice(0, 5);
}

function relatedDemosForGuide(name) {
  const hits = [];
  const seen = new Set();
  for (const demo of DEMOS) {
    const tags = demo.tags.map((x) => x.replace(/[\s-]/g, "").toLowerCase());
    for (const [re, guide] of TAG_GUIDES) {
      if (guide !== name) continue;
      if (tags.some((tg) => re.test(tg)) && !seen.has(demo.id)) {
        seen.add(demo.id);
        hits.push(demo);
      }
    }
  }
  return hits;
}

// --- shared page chrome --------------------------------------------------------

// The brand mark reuses the hero logo's paths (single source in index.html).
const heroLogo = (homeHtml.match(/<svg class="hero-logo"[\s\S]*?<\/svg>/) || [""])[0];
if (!heroLogo) throw new Error("build-site-pages: hero logo SVG not found in docs/index.html");
const LOGO_PATH = heroLogo
  .replace(/<svg class="hero-logo"/, '<svg class="site-brand-logo"')
  .replace(/<defs>[\s\S]*?<\/defs>/, "")
  .replace(/fill="url\(#logoGrad\)"/, 'fill="currentColor"');

/**
 * `paths` for a page: `root` = relative path to the site root (assets,
 * English-only pages); `home` = relative path to the language home.
 */
function pathsFor(depth, lang) {
  const rootRel = "../".repeat(depth + (lang === DEFAULT_LANG ? 0 : 1));
  const home = rootRel + (lang === DEFAULT_LANG ? "" : `${lang}/`);
  return { root: rootRel, home };
}

function headHtml({ lang, title, description, canonicalPath, root, extraHead = "", jsonLd = null, titleKey = "", titleVars = "", localized = true, ogImage = SOCIAL_CARD, ogImageSize = [1200, 630], ogImageAlt = "" }) {
  const canonical = SITE + canonicalPath;
  const ld = jsonLd ? `\n  <script type="application/ld+json">\n  ${JSON.stringify(jsonLd, null, 2).replace(/\n/g, "\n  ")}\n  </script>` : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escText(title)}</title>
  <meta name="description" content="${escAttr(description)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta name="theme-color" content="#0d1117" />
  <meta name="generator" content="nape-js build-site-pages" />
  <meta name="nape-i18n-title" content="${escAttr(titleKey)}" />
  <meta name="nape-i18n-title-vars" content="${escAttr(titleVars)}" />
  <meta name="nape-i18n-description" content="" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" type="image/svg+xml" href="${root}logo.svg" />${ld}
  <meta property="og:site_name" content="nape-js" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="${ogImageSize[0]}" />
  <meta property="og:image:height" content="${ogImageSize[1]}" />${ogImageAlt ? `\n  <meta property="og:image:alt" content="${escAttr(ogImageAlt)}" />` : ""}
  <meta property="og:locale" content="${OG_LOCALES[lang]}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="@KSomoracz" />
  <meta name="twitter:title" content="${escAttr(title)}" />
  <meta name="twitter:description" content="${escAttr(description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>
  <link rel="stylesheet" href="${root}style.css${V}" />
${extraHead}${localized ? "" : ""}</head>`;
}

/** Inline stroke icons (24-box, currentColor) — no emoji on controls. */
const ICON_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  gamepad: '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M6.5 12.5h4M8.5 10.5v4M15.5 11.5h.01M18.5 13.5h.01"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1 0-2.9a2 2 0 0 0-3 0z"/><path d="M12 15l-3-3 3.7-5.6A9 9 0 0 1 21 2a9 9 0 0 1-4.4 8.3z"/><path d="M9 12H4l2.5-3.5M12 15v5l3.5-2.5"/><circle cx="15" cy="9" r="1"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
  ban: '<circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  rewind: '<polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
};
const icon = (name, size = 16, cls = "") =>
  `<svg class="icon${cls ? " " + cls : ""}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;

const GH_ICON = `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const X_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.2h3.7l-8.1 9.2 9.5 12.5h-7.4l-5.8-7.6-6.7 7.6H.4l8.6-9.9L0 1.2h7.6l5.2 6.9zm-1.3 19.5h2L6.5 3.3H4.3z"/></svg>`;

/**
 * Site header: brand · Explore ▾ · Docs ▾ · Benchmarks · [lang] · GitHub · ☰
 *
 * Two dropdown groups keep the bar to three top-level items so it fits a
 * narrow window; below 900px the whole nav folds into a panel behind the ☰
 * button (site-header.js toggles it). `active` marks the current page.
 * The home page's header is stamped from this same function (markers in
 * docs/index.html) so the two can never drift.
 */
const NAV_GROUPS = [
  {
    key: "explore", i18n: "nav.explore",
    items: [
      { key: "examples", i18n: "nav.examples", href: (p) => `${p.home}examples/`, icon: "grid" },
      { key: "games", i18n: "nav.games", href: (p) => `${p.home}games/`, icon: "gamepad" },
      { key: "showcase", i18n: "nav.showcase", href: (p) => `${p.home}showcase/`, icon: "rocket" },
      { key: "multiplayer", i18n: "nav.multiplayer", href: (p) => `${p.root}multiplayer.html`, icon: "globe" },
    ],
  },
  {
    key: "docs", i18n: "nav.docs",
    items: [
      { key: "guides", i18n: "nav.guides", href: (p) => `${p.root}guides/`, icon: "book" },
      { key: "api", i18n: "nav.apiDocs", href: (p) => `${p.root}api/index.html`, icon: "code", external: true },
      { key: "ai", i18n: "nav.ai", href: (p) => `${p.root}ai.html`, icon: "sparkles" },
      { key: "llms", i18n: "nav.llms", href: (p) => `${p.root}llms-full.txt`, icon: "file" },
    ],
  },
];
const NAV_LINKS = [{ key: "benchmarks", i18n: "nav.benchmarks", href: (p) => `${p.root}benchmark.html` }];

function headerHtml(paths, active, { langSwitcher = true, social = false } = {}) {
  const ga = (label) => `onclick="gtag('event','navigation',{event_category:'header',event_label:'${label}'})"`;
  const groups = NAV_GROUPS.map((grp) => {
    const isActive = grp.items.some((i) => i.key === active);
    const items = grp.items
      .map((n) => `            <a class="site-nav-item${n.key === active ? " active" : ""}" href="${n.href(paths)}"${n.external ? ' target="_blank" rel="noopener"' : ""} ${ga(n.key)}><span class="site-nav-item-icon">${icon(n.icon, 16)}</span><span data-i18n="${n.i18n}">${t("en", n.i18n)}</span></a>`)
      .join("\n");
    return `        <div class="site-nav-group">
          <button type="button" class="site-nav-link site-nav-trigger${isActive ? " active" : ""}" aria-expanded="false" aria-controls="siteMenu-${grp.key}"><span data-i18n="${grp.i18n}">${t("en", grp.i18n)}</span><svg class="site-nav-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
          <div class="site-nav-menu" id="siteMenu-${grp.key}">
${items}
          </div>
        </div>`;
  }).join("\n");
  const links = NAV_LINKS
    .map((n) => `        <a class="site-nav-link${n.key === active ? " active" : ""}" href="${n.href(paths)}" data-i18n="${n.i18n}" ${ga(n.key)}>${t("en", n.i18n)}</a>`)
    .join("\n");
  return `  <div class="site-header" id="siteHeader">
    <div class="container site-header-inner">
      <a class="site-brand" href="${paths.home || "#top"}" ${ga("brand")}>
        ${LOGO_PATH}
        <span>nape-js</span>
      </a>
      <nav class="site-nav" id="siteNav" aria-label="Site">
${groups}
${links}
      </nav>
      <div class="site-header-actions">
        ${langSwitcher ? '<span class="lang-switcher" id="langSwitcher"></span>' : ""}
        <a class="site-header-gh" href="${GITHUB}" target="_blank" rel="noopener" title="GitHub" data-i18n-attr="title:nav.github" ${ga("github")}>
          ${GH_ICON}
          <span class="site-header-gh-label">GitHub</span>
        </a>${social ? `
        <a class="site-header-gh site-header-x" href="https://x.com/KSomoracz" target="_blank" rel="noopener" title="Follow @KSomoracz on X" aria-label="Follow @KSomoracz on X" data-i18n-attr="title:nav.x,aria-label:nav.x" ${ga("x")}>
          ${X_ICON}
        </a>` : ""}
        <button type="button" class="site-menu-btn" id="siteMenuBtn" aria-expanded="false" aria-controls="siteNav" aria-label="Menu" data-i18n-attr="aria-label:nav.menu">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path class="site-menu-icon-open" d="M2 4h14M2 9h14M2 14h14"/><path class="site-menu-icon-close" d="M4 4l10 10M14 4L4 14"/></svg>
        </button>
      </div>
    </div>
  </div>`;
}

/** Stamp the shared header into a hand-authored page between markers. */
function stampHeader(relFile, paths, active, opts) {
  const file = resolve(DOCS_DIR, relFile);
  let html = readFileSync(file, "utf8");
  const START = "<!-- site-header:start -->";
  const END = "<!-- site-header:end -->";
  if (!html.includes(START) || !html.includes(END)) throw new Error(`build-site-pages: site-header markers missing in docs/${relFile}`);
  const block = `${START}\n${headerHtml(paths, active, opts)}\n  ${END}`;
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  writeFileSync(file, html);
}
/** Three newest complete game demos on the home page (markers in index.html). */
function stampFeaturedGames() {
  const file = resolve(DOCS_DIR, "index.html");
  let html = readFileSync(file, "utf8");
  const START = "<!-- featured-games:start -->";
  const END = "<!-- featured-games:end -->";
  if (!html.includes(START) || !html.includes(END)) throw new Error("build-site-pages: featured-games markers missing in docs/index.html");
  const newest = [...showpieces].sort((a, b) => DEMOS.indexOf(b) - DEMOS.indexOf(a)).slice(0, 3);
  const cards = newest.map((d) => gameCard(d, { root: "", home: "" }, { large: true })).join("\n");
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${cards}\n        ${END}`);
  writeFileSync(file, html);
}

function stampHomeHeader() {
  stampHeader("index.html", { root: "", home: "" }, null, { langSwitcher: true, social: true });
  // The examples list lives one level down; its localized copies are produced
  // by prerender-i18n.mjs, which keeps "../examples|games|showcase/" refs
  // language-relative.
  stampHeader("examples/index.html", { root: "../", home: "../" }, "examples", { langSwitcher: true });
}

function footerHtml(paths) {
  return `  <footer class="footer">
    <div class="container">
      <p class="footer-links">
        <a href="${paths.home}" data-i18n="footer.home">Home</a>
        &bull;
        <a href="${paths.home}examples/" data-i18n="nav.examples">Examples</a>
        &bull;
        <a href="${paths.home}games/" data-i18n="nav.games">Games</a>
        &bull;
        <a href="${paths.root}guides/" data-i18n="nav.guides">Guides</a>
        &bull;
        <a href="${paths.root}api/index.html" target="_blank" rel="noopener" data-i18n="footer.apiDocs">API Docs</a>
        &bull;
        <a href="${GITHUB}" target="_blank" rel="noopener" data-i18n="footer.github">GitHub</a>
      </p>
      <p data-i18n-html="footer.credits">Based on the original Haxe engine by <a href="https://github.com/deltaluca/nape">Luca Deltodesco</a> &bull; JS port scaffolded by <a href="https://github.com/cspotcode/nape-to-js">Andrew Bradley</a> &bull; TypeScript rewrite &amp; ongoing development by <a href="https://github.com/NewKrok">Istvan Krisztian Somoracz</a></p>
      <p data-i18n="footer.license">MIT License</p>
    </div>
  </footer>`;
}

function i18nBootHtml(paths, { switcher = true } = {}) {
  return `  <script type="module">
    import { initI18n } from "${paths.root}i18n/i18n.js${V}";
    ${switcher ? `import { mountLangSwitcher } from "${paths.root}i18n/lang-switcher.js${V}";` : ""}
    await initI18n();
    ${switcher ? "mountLangSwitcher();" : ""}
  </script>
  <script type="module" src="${paths.root}site-header.js${V}"></script>`;
}

const PRISM_HEAD = `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" /></noscript>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/line-numbers/prism-line-numbers.min.css" media="print" onload="this.media='all'" />
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js" data-manual defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/line-numbers/prism-line-numbers.min.js" defer></script>
`;

const tierBadge = (demo) => {
  const key = demo.tier === "physics" ? "cat.physics.label" : demo.tier === "game" ? "games.tier.game" : "games.tier.showpiece";
  return `<span class="tier-badge tier-badge-${demo.tier}" data-i18n="${key}">${t("en", key)}</span>`;
};

/** Compact demo link with poster thumbnail (used in "More demos" / "Related demos"). */
function moreDemoLink(d, paths, { localized = true } = {}) {
  const poster = posterOf(d.id);
  const thumb = poster
    ? `<img class="more-demo-thumb" src="${paths.root}${poster}"${responsiveAttrs(poster, paths.root, "(max-width: 400px) calc(100vw - 48px), 220px")} width="900" height="500" loading="lazy" decoding="async" alt="" />`
    : `<span class="more-demo-thumb more-demo-thumb-empty" aria-hidden="true"></span>`;
  const label = localized ? `<span data-i18n="demo.${d.id}.label">${escText(d.label)}</span>` : `<span>${escText(d.label)}</span>`;
  return `<a class="more-demo" href="${paths.home}examples/${d.id}/${posterQuery(d.id)}">${thumb}<span class="more-demo-text">${tierBadge(d)}${label}</span></a>`;
}

const tagChips = (demo) =>
  demo.tags.map((tag) => `<span class="example-tag" data-i18n="tag.${escAttr(tag)}">${escText(t("en", `tag.${tag}`, tag))}</span>`).join("");

// --- per-demo page ------------------------------------------------------------

const missingTranslations = [];
function demoPage(demo, lang) {
  const paths = pathsFor(2, lang);
  const label = t(lang, `demo.${demo.id}.label`, demo.label);
  const descHtml = t(lang, `demo.${demo.id}.desc`, demo.desc);
  if (lang !== DEFAULT_LANG && (dictHas(lang, `demo.${demo.id}.label`) === false || dictHas(lang, `demo.${demo.id}.desc`) === false)) {
    missingTranslations.push(`${lang}: demo.${demo.id}`);
  }
  const pageUrlHere = SITE + (lang === DEFAULT_LANG ? `/examples/${demo.id}/` : `/${lang}/examples/${demo.id}/`);
  const poster = posterOf(demo.id);
  const title = t(lang, "demopage.meta.title").replace("{label}", label);
  const description = truncate(plainText(descHtml), 158);
  const isGame = demo.tier !== "physics";
  const catKey = isGame ? "cat.game.label" : "cat.physics.label";
  const catParam = isGame ? "game" : "physics";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "nape-js", item: `${SITE}${paths.home.replace(/^(\.\.\/)+/, "/")}` },
          { "@type": "ListItem", position: 2, name: t(lang, "nav.examples"), item: `${SITE}${paths.home.replace(/^(\.\.\/)+/, "/")}examples/` },
          { "@type": "ListItem", position: 3, name: t(lang, isGame ? "nav.games" : "cat.physics.label"), item: isGame ? `${SITE}${paths.home.replace(/^(\.\.\/)+/, "/")}games/` : `${SITE}${paths.home.replace(/^(\.\.\/)+/, "/")}examples/?cat=physics` },
          { "@type": "ListItem", position: 4, name: label, item: pageUrlHere },
        ],
      },
      isGame
        ? {
            "@type": "VideoGame",
            name: label,
            inLanguage: lang,
            ...(poster ? { image: `${SITE}/${poster}` } : {}),
            description: truncate(plainText(descHtml), 300),
            url: pageUrlHere,
            gamePlatform: "Web browser",
            applicationCategory: "Game",
            operatingSystem: "Any",
            playMode: "SinglePlayer",
            keywords: demo.tags.join(", "),
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            author: { "@type": "Person", name: "Istvan Krisztian Somoracz", url: "https://github.com/NewKrok" },
            isBasedOn: { "@type": "SoftwareSourceCode", name: "nape-js", codeRepository: GITHUB, programmingLanguage: "TypeScript" },
          }
        : {
            "@type": "SoftwareSourceCode",
            name: label,
            inLanguage: lang,
            ...(poster ? { image: `${SITE}/${poster}` } : {}),
            description: truncate(plainText(descHtml), 300),
            url: pageUrlHere,
            codeRepository: `${GITHUB}/blob/master/docs/demos/${demo.id}.js`,
            programmingLanguage: ["TypeScript", "JavaScript"],
            runtimePlatform: "Web browser",
            keywords: demo.tags.join(", "),
            isPartOf: { "@type": "SoftwareSourceCode", name: "nape-js", codeRepository: GITHUB },
            author: { "@type": "Person", name: "Istvan Krisztian Somoracz", url: "https://github.com/NewKrok" },
            license: "https://opensource.org/licenses/MIT",
          },
    ],
  };

  const related = relatedGuidesFor(demo);
  const relatedHtml = related
    .map((r) => `<li><a href="${paths.root}guides/${r.guide}/${r.anchor ? "#" + r.anchor : ""}">${escText(r.label)}</a></li>`)
    .join("\n            ");

  // "More demos": neighbours of the same tier in registry order, newest first.
  const pool = DEMOS.filter((d) => d.tier === demo.tier && d.id !== demo.id);
  const idx = DEMOS.findIndex((d) => d.id === demo.id);
  const more = pool
    .map((d) => ({ d, dist: Math.abs(DEMOS.indexOf(d) - idx) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6)
    .map(({ d }) => d);
  const moreHtml = more.map((d) => moreDemoLink(d, paths)).join("\n          ");

  const extraHead = PRISM_HEAD +
    `  <link rel="modulepreload" href="${paths.root}nape-js.esm.js${V}" />\n` +
    `  <link rel="modulepreload" href="${paths.root}demos/${demo.id}.js${V}" />\n`;

  const body = `<body data-demo-id="${demo.id}">
${headerHtml(paths, "examples")}
  <main>
  <section class="section demo-page">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="${paths.home}">nape-js</a> <span aria-hidden="true">›</span>
        <a href="${paths.home}examples/" data-i18n="nav.examples">Examples</a> <span aria-hidden="true">›</span>
        <a href="${paths.home}examples/?cat=${catParam}" data-i18n="${catKey}">${t("en", catKey)}</a> <span aria-hidden="true">›</span>
        <span aria-current="page" data-i18n="demo.${demo.id}.label">${escText(demo.label)}</span>
      </nav>
      <h1 class="demo-page-title">${tierBadge(demo)}<span data-i18n="demo.${demo.id}.label">${escText(demo.label)}</span></h1>
      <p class="demo-page-desc" data-i18n-html="demo.${demo.id}.desc">${demo.desc}</p>

      <div class="canvas-wrap" id="canvasWrap">
        <canvas id="demoCanvas" width="900" height="500"></canvas>
        <div class="canvas-overlay" id="canvasOverlay" data-i18n="demopage.loading">Loading engine&hellip;</div>
        <div class="canvas-controls" id="canvasControls" style="opacity:1">
          <div class="card-render-toggle" id="renderModeToggle">
            <button class="card-render-btn active" data-mode="2d">2D</button>
            <button class="card-render-btn" data-mode="3d">3D</button>
            <button class="card-render-btn" data-mode="pixi">PixiJS</button>
          </div>
          <button class="canvas-outline-btn active" id="outlineBtn" title="Toggle outlines" data-i18n-attr="title:canvas.outline">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="8" cy="8" r="3"/></svg>
          </button>
          <button class="canvas-fs-btn canvas-profiler-btn" id="profilerBtn" title="Toggle profiler overlay" data-i18n-attr="title:canvas.profiler">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,12 4,5 7,9 10,2 14,7"/><line x1="1" y1="14" x2="14" y2="14"/></svg>
          </button>
          <button class="canvas-fs-btn canvas-worker-btn" id="workerBtn" title="Toggle Web Worker physics" data-i18n-attr="title:canvas.worker" style="display:none">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></svg>
          </button>
          <button class="canvas-fs-btn canvas-reset-btn" id="resetBtn" title="Reset demo" data-i18n-attr="title:canvas.reset">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3"/><polyline points="2.5,3.5 2.5,8 7,8"/></svg>
          </button>
          <button class="canvas-fs-btn" id="fsBtn" title="Fullscreen" data-i18n-attr="title:canvas.fullscreen">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 2,2 6,2"/><polyline points="10,2 14,2 14,6"/><polyline points="14,10 14,14 10,14"/><polyline points="6,14 2,14 2,10"/></svg>
          </button>
        </div>
      </div>
      <div class="demo-bar">
        <span id="fpsLabel" data-i18n="demoBar.fps">FPS: —</span>
        <span id="bodyCount" data-i18n="demoBar.bodies">Bodies: —</span>
        <span id="stepTime" data-i18n="demoBar.step">Step: —</span>
        <span class="demo-bar-right demo-bar-hint" data-i18n="demopage.controls">Drag or tap the canvas to interact. Switch renderer with the 2D / 3D / PixiJS buttons.</span>
      </div>

      <div class="demo-page-actions">
        <button class="btn btn-secondary" id="codeToggleBtn" aria-expanded="false" aria-controls="codePanel" data-i18n="demopage.openSource">Open the source</button>
        <a class="btn btn-secondary" href="${GITHUB}/blob/master/docs/demos/${demo.id}.js" target="_blank" rel="noopener" onclick="gtag('event','click',{event_category:'code_action',event_label:'github_source',demo:'${demo.id}'})">GitHub</a>
      </div>
      <div class="code-panel" id="codePanel" hidden>
        <div class="code-panel-header">
          <span class="code-panel-title" data-i18n="code.title">Source Code</span>
          <div class="code-panel-actions">
            <button class="btn btn-small" id="copyCodeBtn" title="Copy to clipboard" data-i18n="code.copy" data-i18n-attr="title:code.copyTitle">Copy</button>
            <button class="btn btn-small btn-codepen" id="codepenBtn" title="Open in CodePen" data-i18n="code.codepen" data-i18n-attr="title:code.codepenTitle">CodePen</button>
            <button class="btn btn-small btn-stackblitz" id="stackblitzBtn" title="Open in StackBlitz (real npm install)" data-i18n="code.stackblitz" data-i18n-attr="title:code.stackblitzTitle">StackBlitz</button>
          </div>
        </div>
        <pre class="code-panel-body" id="codeBody"><code></code></pre>
      </div>

      <div class="demo-page-grid">
        <section class="demo-page-block">
          <h2 data-i18n="demopage.features">Engine features used</h2>
          <div class="demo-page-tags">${tagChips(demo)}</div>
        </section>
        <section class="demo-page-block">
          <h2 data-i18n="demopage.related">Related guides</h2>
          <ul class="demo-page-links">
            ${relatedHtml}
          </ul>
        </section>
      </div>

      <section class="demo-page-block">
        <h2 data-i18n="demopage.more">More demos</h2>
        <div class="more-demos">
          ${moreHtml}
        </div>
        <p class="demo-page-all"><a href="${paths.home}examples/?cat=${catParam}" data-i18n="demopage.allInCategory" data-i18n-vars="cat=${catKey}">${t("en", "demopage.allInCategory").replace("{cat}", t("en", catKey))}</a></p>
      </section>
    </div>
  </section>
  </main>
${footerHtml(paths)}
${i18nBootHtml(paths)}
  <script type="module" src="${paths.root}demo-page.js${V}"></script>
</body>
</html>
`;

  let html = headHtml({
    lang, title, description, root: paths.root, extraHead, jsonLd,
    canonicalPath: `/examples/${demo.id}/`,
    titleKey: "demopage.meta.title",
    titleVars: `label=demo.${demo.id}.label`,
    ...(poster ? { ogImage: `${SITE}/${poster}`, ogImageSize: [900, 500], ogImageAlt: `${label} — nape-js demo screenshot` } : {}),
  }) + "\n" + body;
  return finalizeLocalized(html, lang, { pathEn: `/examples/${demo.id}/`, pathLang: (l) => `/${l}/examples/${demo.id}/` }, { title, description });
}

// --- games landing --------------------------------------------------------------

function gameCard(demo, paths, { large }) {
  const href = `${paths.home}examples/${demo.id}/${posterQuery(demo.id)}`;
  const poster = posterOf(demo.id);
  const media = poster
    ? `<img class="game-card-img" src="${paths.root}${poster}"${responsiveAttrs(poster, paths.root, "(min-width: 900px) 290px, calc(100vw - 48px)")} width="900" height="500" loading="lazy" decoding="async" alt="${escAttr(demo.label)} — gameplay screenshot" />`
    : "";
  // No aria-label on the link. It used to carry just the game's name, which
  // *replaced* the accessible name rather than adding to it — so the link
  // announced "Blade Waltz" while showing "Play →", and a voice-control user
  // asking for "Play" matched nothing (axe: label-content-name-mismatch).
  // Left alone, the name is composed from the poster's alt text and the
  // visible "Play →", which contains both. Cards without a poster have no alt
  // to contribute, so they get the name from a visually-hidden span instead —
  // still real text content, so the visible label stays part of the name.
  const hiddenName = poster ? "" : `<span class="sr-only">${escText(demo.label)}</span>`;
  return `        <article class="game-card${large ? " game-card-large" : ""}">
          <a class="game-card-canvas${poster ? " has-poster" : ""}" href="${href}"${poster ? "" : ` data-demo-id="${demo.id}"`}>
            ${hiddenName}${media}<span class="game-card-play" data-i18n="games.play">Play &rarr;</span>
          </a>
          <div class="game-card-body">
            <h3>${tierBadge(demo)}<a href="${href}" data-i18n="demo.${demo.id}.label">${escText(demo.label)}</a></h3>
            <p class="game-card-desc" data-i18n-html="demo.${demo.id}.desc">${demo.desc}</p>
            <div class="game-card-tags">${tagChips(demo)}</div>
          </div>
        </article>`;
}

function gamesPage(lang) {
  const paths = pathsFor(1, lang);
  const title = t(lang, "games.meta.title");
  const description = t(lang, "games.meta.description");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Games built on nape-js",
    description: t("en", "games.meta.description"),
    url: `${SITE}/games/`,
    isPartOf: { "@type": "WebSite", name: "nape-js", url: `${SITE}/` },
    hasPart: showpieces.map((d) => ({
      "@type": "VideoGame",
      name: d.label,
      url: `${SITE}/examples/${d.id}/`,
      gamePlatform: "Web browser",
      isAccessibleForFree: true,
    })),
  };
  const shipped = rebaseAssets(showcaseGridInner, paths.root);

  const body = `<body>
${headerHtml(paths, "games")}
  <header class="page-hero">
    <div class="container">
      <a href="${paths.home}" class="back-link" data-i18n="games.back">&larr; Back to Home</a>
      <h1 data-i18n="games.heading">Games built on nape-js</h1>
      <p class="page-hero-intro" data-i18n="games.intro">From a single mechanic to a shipped title: every game below runs on the same open-source 2D physics engine. Play in the browser, then open the source.</p>
      <nav class="proof-strip" aria-label="Game tiers">
        <a class="proof-item proof-item-showpiece" href="#showpieces"><strong>${COUNTS.showpieces}</strong> <span data-i18n="home.proof.showpieces">complete game demos</span></a>
        <a class="proof-item" href="#slices"><strong>${COUNTS.games - COUNTS.showpieces}</strong> <span data-i18n="home.proof.slices">gameplay slices</span></a>
        <a class="proof-item" href="#shipped"><strong>${COUNTS.shipped}</strong> <span data-i18n="home.proof.shipped">shipped titles</span></a>
      </nav>
      <p class="page-hero-alt"><span data-i18n="games.physicsCta.lead">Here for the physics, not the games?</span> <a href="${paths.home}examples/?cat=physics" data-i18n="games.physicsCta.link">Browse the technique demos</a> <span data-i18n="games.physicsCta.tail">— joints, fluids, fracture, raycasting, determinism.</span></p>
    </div>
  </header>
  <main>
  <section class="section" id="showpieces">
    <div class="container">
      <h2 data-i18n="games.showpieces.heading">Complete game demos</h2>
      <p class="section-desc" data-i18n="games.showpieces.desc">Multi-system games in one file each — AI opponents, waves, cameras, scoring and 3D rigs. Play them here or open the source on CodePen and StackBlitz.</p>
      <div class="game-grid game-grid-large">
${showpieces.map((d) => gameCard(d, paths, { large: true })).join("\n")}
      </div>
    </div>
  </section>

  <section class="section section-alt" id="slices">
    <div class="container">
      <h2 data-i18n="games.slices.heading">Gameplay slices</h2>
      <p class="section-desc" data-i18n="games.slices.desc">Smaller playable demos that isolate one mechanic — a character controller, a pinball table, a slingshot, a vehicle.</p>
      <div class="game-grid">
${slices.map((d) => gameCard(d, paths, { large: false })).join("\n")}
      </div>
    </div>
  </section>

  <section class="section" id="shipped">
    <div class="container">
      <h2 data-i18n="games.shipped.heading">Shipped games</h2>
      <p class="section-desc" data-i18n="games.shipped.desc">Released titles running nape-js physics in production — play them in the browser or grab the native build.</p>
      <div class="showcase-grid">${shipped}</div>
      <p class="showcase-foot" data-i18n-html="showcase.foot">Shipped something with nape-js? <a href="${GITHUB}/issues/new">Open an issue</a> and it can land here.</p>
    </div>
  </section>
  </main>
${footerHtml(paths)}
${i18nBootHtml(paths)}
  <script type="module" src="${paths.root}games.js${V}"></script>
</body>
</html>
`;
  let html = headHtml({ lang, title, description, root: paths.root, jsonLd, canonicalPath: "/games/", titleKey: "games.meta.title" }) + "\n" + body;
  return finalizeLocalized(html, lang, { pathEn: "/games/", pathLang: (l) => `/${l}/games/` }, { title, description });
}

// --- showcase page --------------------------------------------------------------

function showcasePage(lang) {
  const paths = pathsFor(1, lang);
  const title = t(lang, "showcasePage.meta.title");
  const description = t(lang, "showcasePage.meta.description");
  const shipped = rebaseAssets(showcaseGridInner, paths.root);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Games made with nape-js",
    description: t("en", "showcasePage.meta.description"),
    url: `${SITE}/showcase/`,
    isPartOf: { "@type": "WebSite", name: "nape-js", url: `${SITE}/` },
  };
  const body = `<body>
${headerHtml(paths, "showcase")}
  <header class="page-hero">
    <div class="container">
      <a href="${paths.home}" class="back-link" data-i18n="showcasePage.back">&larr; Back to Home</a>
      <h1 data-i18n="showcase.heading">Made with nape-js</h1>
      <p class="page-hero-intro" data-i18n="showcase.desc">Shipped games running on nape-js physics &mdash; play them in the browser, or grab the native build.</p>
    </div>
  </header>
  <main>
  <section class="section">
    <div class="container">
      <div class="showcase-grid">${shipped}</div>
      <p class="showcase-foot"><span data-i18n="showcasePage.demosCta.lead">Want to see how games like these are built?</span> <a href="${paths.home}games/" data-i18n="showcasePage.demosCta.link">The complete game demos</a> <span data-i18n="showcasePage.demosCta.tail">use the same engine features, one file each.</span></p>
      <p class="showcase-foot" data-i18n-html="showcase.foot">Shipped something with nape-js? <a href="${GITHUB}/issues/new">Open an issue</a> and it can land here.</p>
    </div>
  </section>
  </main>
${footerHtml(paths)}
${i18nBootHtml(paths)}
</body>
</html>
`;
  let html = headHtml({ lang, title, description, root: paths.root, jsonLd, canonicalPath: "/showcase/", titleKey: "showcasePage.meta.title" }) + "\n" + body;
  return finalizeLocalized(html, lang, { pathEn: "/showcase/", pathLang: (l) => `/${l}/showcase/` }, { title, description });
}

/** Localize body text, set lang metas, hreflang + canonical for a generated page. */
function finalizeLocalized(html, lang, page, { title, description }) {
  html = localizeBody(html, lang);
  // Localized dictionary strings may carry language-relative hrefs ("games/",
  // "examples/?cat=physics") written for the home page; rebase them onto this
  // page's language home.
  const { home } = pathsFor(page.pathEn.split("/").filter(Boolean).length, lang);
  html = html.replace(/href="(games|showcase|examples)\//g, `href="${home}$1/`);
  html = applyLangMeta(html, lang);
  html = applyTitleDesc(html, { title, description });
  html = injectHreflang(html, page);
  html = applyCanonical(html, page, lang);
  return html;
}

// --- guides -------------------------------------------------------------------------

function githubSlug(text) {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\w\- ]/g, "")
    .replace(/ /g, "-");
}

function renderMarkdown(mdSource) {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  const used = new Map();
  const headings = [];
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const inline = tokens[idx + 1];
    const text = inline?.children?.filter((c) => c.type === "text" || c.type === "code_inline").map((c) => c.content).join("") ?? inline?.content ?? "";
    let slug = githubSlug(text);
    const n = used.get(slug) ?? 0;
    used.set(slug, n + 1);
    if (n > 0) slug = `${slug}-${n}`;
    token.attrSet("id", slug);
    if (token.tag === "h2") headings.push({ slug, text });
    return self.renderToken(tokens, idx, options);
  };
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const tok = tokens[idx];
    if (tok.info.trim() === "js") tok.info = "javascript";
    if (tok.info.trim() === "ts") tok.info = "typescript";
    return defaultFence(tokens, idx, options, env, self);
  };
  let html = md.render(mdSource);
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, headings };
}

/**
 * The markdown lives at docs/guides/<name>.md; the page lives one level deeper
 * at docs/guides/<name>/index.html, and the repo-relative links only make
 * sense on GitHub. Order matters: repo-root links first, then docs-relative
 * ones, then sibling-guide links (which produce "../<guide>/" themselves).
 */
function rewriteGuideLinks(html) {
  return html
    // ../../<repo path>  → GitHub (a trailing slash means a directory). The
    // engine source moved to packages/nape-js/ after these guides were written.
    .replace(/href="\.\.\/\.\.\/([^"]+)"/g, (_m, p) => {
      const repoPath = p.replace(/^src\//, "packages/nape-js/src/");
      const kind = repoPath.endsWith("/") ? "tree" : "blob";
      return `href="${GITHUB}/${kind}/master/${repoPath}"`;
    })
    // ../<docs file or dir> → one level deeper (but not sibling .md guides).
    .replace(/href="\.\.\/(?!\.\.\/)([^"]+)"/g, (m, p) => (/\.md(#|$)/.test(p) ? m : `href="../../${p}"`))
    // ./<guide>.md#anchor and <guide>.md#anchor → ../<guide>/#anchor
    .replace(/href="(?:\.\/)?([a-z-]+)\.md(#[^"]*)?"/g, (_m, name, hash) => `href="../${name}/${hash ?? ""}"`)
    .replace(/href="\/examples(\/)?"/g, 'href="../../examples/"')
    .replace(/href="\/games(\/)?"/g, 'href="../../games/"');
}

function guidePage(guide) {
  const mdPath = resolve(DOCS_DIR, "guides", `${guide.name}.md`);
  let src = readFileSync(mdPath, "utf8");
  const h1 = src.match(/^# (.+)$/m);
  const titleText = h1 ? h1[1].replace(/[`*]/g, "").trim() : guide.name;
  if (h1) src = src.replace(h1[0], "");
  const verified = src.match(/<!--\s*Last verified:\s*([^>]+?)\s*-->/);
  src = src.replace(/<!--\s*Last verified:[^>]*-->\s*/g, "");

  const { html: bodyHtml, headings } = renderMarkdown(src);
  const content = rewriteGuideLinks(bodyHtml);
  const firstPara = plainText((bodyHtml.match(/<p>([\s\S]*?)<\/p>/) || ["", ""])[1]);
  const description = truncate(firstPara || guide.blurb, 158);
  const title = `${titleText} | nape-js Guides`;
  const paths = { root: "../../", home: "../../" };

  const toc = headings.length
    ? `<nav class="guide-toc" aria-label="On this page"><h2>On this page</h2><ul>${headings.map((h) => `<li><a href="#${h.slug}">${escText(h.text)}</a></li>`).join("")}</ul></nav>`
    : "";
  const related = relatedDemosForGuide(guide.name);
  const relatedHtml = related.length
    ? `<section class="guide-related"><h2 id="related-demos">Related demos</h2><p class="section-desc">Interactive demos that exercise what this guide covers.</p><div class="more-demos">${related.map((d) => moreDemoLink(d, paths, { localized: false })).join("")}</div></section>`
    : "";
  const others = GUIDES.filter((g) => g.name !== guide.name)
    .map((g) => `<li><a href="../${g.name}/">${icon(g.icon, 14)} ${escText(guideTitle(g))}</a></li>`)
    .join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: titleText,
    description,
    url: `${SITE}/guides/${guide.name}/`,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: "nape-js", url: `${SITE}/` },
    about: { "@type": "SoftwareSourceCode", name: "nape-js", codeRepository: GITHUB, programmingLanguage: "TypeScript" },
    author: { "@type": "Person", name: "Istvan Krisztian Somoracz", url: "https://github.com/NewKrok" },
    license: "https://opensource.org/licenses/MIT",
  };

  const html = headHtml({ lang: "en", title, description, root: paths.root, jsonLd, canonicalPath: `/guides/${guide.name}/`, extraHead: PRISM_HEAD, titleKey: "", localized: false }) + `
<body>
${headerHtml(paths, "guides", { langSwitcher: false })}
  <main>
  <section class="section guide-page">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../../">nape-js</a> <span aria-hidden="true">›</span>
        <a href="../">Guides</a> <span aria-hidden="true">›</span>
        <span aria-current="page">${escText(titleText)}</span>
      </nav>
      <div class="guide-layout">
        <aside class="guide-side">
          ${toc}
          <nav class="guide-others" aria-label="Other guides"><h2>Other guides</h2><ul>${others}</ul></nav>
          <p class="guide-edit"><a href="${GITHUB}/blob/master/docs/guides/${guide.name}.md" target="_blank" rel="noopener">Edit on GitHub</a>${verified ? ` &bull; verified ${escText(verified[1])}` : ""}</p>
        </aside>
        <article class="guide-content">
          <h1><span class="guide-h1-icon">${icon(guide.icon, 28)}</span>${escText(titleText)}</h1>
          ${content}
          ${relatedHtml}
        </article>
      </div>
    </div>
  </section>
  </main>
${footerHtml(paths)}
  <script type="module" src="../../site-header.js${V}"></script>
  <script>
    // Prism arrives deferred; highlight once it is here.
    window.addEventListener("load", () => { if (window.Prism) { document.querySelectorAll(".guide-content pre").forEach((p) => p.classList.add("line-numbers")); Prism.highlightAll(); } });
  </script>
</body>
</html>
`;
  return html;
}

function guideTitle(g) {
  const src = readFileSync(resolve(DOCS_DIR, "guides", `${g.name}.md`), "utf8");
  const h1 = src.match(/^# (.+)$/m);
  return h1 ? h1[1].replace(/[`*]/g, "").replace(/^nape-js\s+[—-]\s+/, "").trim() : g.name;
}

function guidesIndexPage() {
  const paths = { root: "../", home: "../" };
  const title = "nape-js Guides — Cookbook, Troubleshooting, Multiplayer, Replay";
  const description = "Practical guides for the nape-js 2D physics engine: copy-paste cookbook recipes, anti-patterns, troubleshooting, server-authoritative multiplayer and deterministic replay.";
  const cards = GUIDES.map((g) => `        <a class="guide-card" href="${g.name}/">
          <span class="guide-card-icon">${icon(g.icon, 26)}</span>
          <span class="guide-card-title">${escText(guideTitle(g))}</span>
          <span class="guide-card-text">${escText(g.blurb)}</span>
        </a>`).join("\n");
  const contrib = CONTRIBUTOR_GUIDES.map((n) => `<a href="${GITHUB}/blob/master/docs/guides/${n}.md" target="_blank" rel="noopener">${n}</a>`).join(" &bull; ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "nape-js Guides",
    description,
    url: `${SITE}/guides/`,
    isPartOf: { "@type": "WebSite", name: "nape-js", url: `${SITE}/` },
    hasPart: GUIDES.map((g) => ({ "@type": "TechArticle", name: guideTitle(g), url: `${SITE}/guides/${g.name}/` })),
  };
  return headHtml({ lang: "en", title, description, root: paths.root, jsonLd, canonicalPath: "/guides/", titleKey: "", localized: false }) + `
<body>
${headerHtml(paths, "guides", { langSwitcher: false })}
  <header class="page-hero">
    <div class="container">
      <a href="../" class="back-link">&larr; Back to Home</a>
      <h1>Guides</h1>
      <p class="page-hero-intro">Task-shaped documentation for the nape-js physics engine. Each guide links to the interactive demos that exercise it, and every demo page links back here.</p>
    </div>
  </header>
  <main>
  <section class="section">
    <div class="container">
      <div class="guide-grid">
${cards}
      </div>
      <p class="showcase-foot">Also: the <a href="../api/index.html" target="_blank" rel="noopener">API reference</a>, <a href="../llms-full.txt">llms-full.txt</a> for coding agents, and the contributor docs on GitHub — ${contrib}.</p>
    </div>
  </section>
  </main>
${footerHtml(paths)}
  <script type="module" src="../site-header.js${V}"></script>
</body>
</html>
`;
}

// --- in-place stamps on hand-authored pages ----------------------------------------------

function stampCounts() {
  const file = resolve(DOCS_DIR, "index.html");
  let html = readFileSync(file, "utf8");
  for (const [key, n] of Object.entries(COUNTS)) {
    const re = new RegExp(`(<strong data-site-count="${key}">)[^<]*(</strong>)`, "g");
    if (!re.test(html)) throw new Error(`build-site-pages: data-site-count="${key}" not found in docs/index.html`);
    html = html.replace(re, `$1${n}$2`);
  }
  writeFileSync(file, html);
}

function stampDemoIndex() {
  const file = resolve(DOCS_DIR, "examples/index.html");
  let html = readFileSync(file, "utf8");
  const START = "<!-- demo-index:start -->";
  const END = "<!-- demo-index:end -->";
  if (!html.includes(START) || !html.includes(END)) throw new Error("build-site-pages: demo-index markers missing in docs/examples/index.html");
  const group = (key, list) => {
    const items = [...list]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((d) => `            <li><a href="${d.id}/" data-i18n="demo.${d.id}.label">${escText(d.label)}</a></li>`)
      .join("\n");
    return `        <div class="demo-index-group">
          <h3 data-i18n="${key}">${t("en", key)}</h3>
          <ul>
${items}
          </ul>
        </div>`;
  };
  const block = [
    START,
    group("games.showpieces.heading", showpieces),
    group("games.slices.heading", slices),
    group("cat.physics.label", physics),
    `        ${END}`,
  ].join("\n");
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  html = html.replace(re, block);
  writeFileSync(file, html);
}

// --- sitemap manifest -------------------------------------------------------------------------

/** Every generated page, for scripts/prerender-i18n.mjs's sitemap. */
export function generatedPages() {
  const pages = [
    { pathEn: "/games/", pathLang: (l) => `/${l}/games/`, priority: "0.9", changefreq: "weekly", lastmod: gitLastmod("docs/demo-categories.js") },
    { pathEn: "/showcase/", pathLang: (l) => `/${l}/showcase/`, priority: "0.8", changefreq: "monthly", lastmod: gitLastmod("docs/index.html") },
    { pathEn: "/guides/", localized: false, priority: "0.7", changefreq: "monthly", lastmod: gitLastmod("docs/guides") },
    ...GUIDES.map((g) => ({ pathEn: `/guides/${g.name}/`, localized: false, priority: "0.8", changefreq: "monthly", lastmod: gitLastmod(`docs/guides/${g.name}.md`) })),
    ...DEMOS.map((d) => ({
      pathEn: `/examples/${d.id}/`,
      pathLang: (l) => `/${l}/examples/${d.id}/`,
      priority: d.tier === "showpiece" ? "0.8" : "0.7",
      changefreq: "monthly",
      lastmod: gitLastmod(`docs/demos/${d.id}.js`),
    })),
  ];
  return pages;
}

// --- main -------------------------------------------------------------------------------------

function writePage(relPath, html) {
  const abs = resolve(DOCS_DIR, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, html);
}

export function buildSitePages() {
  let n = 0;
  for (const lang of LANGS) {
    const prefix = lang === DEFAULT_LANG ? "" : `${lang}/`;
    for (const demo of DEMOS) {
      writePage(`${prefix}examples/${demo.id}/index.html`, demoPage(demo, lang));
      n++;
    }
    writePage(`${prefix}games/index.html`, gamesPage(lang));
    writePage(`${prefix}showcase/index.html`, showcasePage(lang));
    n += 2;
  }
  for (const g of GUIDES) {
    writePage(`guides/${g.name}/index.html`, guidePage(g));
    n++;
  }
  writePage("guides/index.html", guidesIndexPage());
  n++;
  stampCounts();
  stampDemoIndex();
  stampHomeHeader();
  stampFeaturedGames();
  if (POSTER_COUNT < DEMOS.length) {
    console.warn(`build-site-pages: ${DEMOS.length - POSTER_COUNT} demo(s) have no poster yet — run \`node scripts/build-posters.mjs\`.`);
  }
  if (missingTranslations.length) {
    console.warn(`build-site-pages: ${missingTranslations.length} demo(s) fall back to English text on a localized page:\n  ` + [...new Set(missingTranslations)].join("\n  "));
  }
  return { pages: n, counts: COUNTS };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { pages, counts } = buildSitePages();
  console.log(
    `Generated ${pages} page(s) — ${counts.demos} demos (${counts.showpieces} showpieces, ${counts.games - counts.showpieces} slices, ${counts.demos - counts.games} physics), ${GUIDES.length} guides, ${counts.shipped} shipped titles; stamped counts + demo index.`,
  );
  if (!existsSync(resolve(DOCS_DIR, "nape-js.esm.js"))) {
    console.warn("note: docs/nape-js.esm.js is missing — run `npm run build:docs` for a runnable site.");
  }
}
