/**
 * Shared build-time i18n helpers for the docs site.
 *
 * Applies the SAME transform the client runtime (docs/i18n/i18n.js) does —
 * data-i18n / data-i18n-html / data-i18n-attr — to an HTML string, plus the
 * <title>/description/og rewrites and the hreflang block. Used by
 * scripts/prerender-i18n.mjs (hand-authored pages) and
 * scripts/build-site-pages.mjs (generated pages) so both paths localize
 * identically.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, "../../docs/i18n/locales");

export const SITE = "https://napejs.org";
export const DEFAULT_LANG = "en";
export const LANGS = ["en", "de", "zh", "hu", "es", "fr"];
export const OG_LOCALES = {
  en: "en_US", de: "de_DE", zh: "zh_CN", hu: "hu_HU", es: "es_ES", fr: "fr_FR",
};

export const dict = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(readFileSync(resolve(localesDir, `${l}.json`), "utf8"))]),
);

/** Translate `key` in `lang`, falling back to English, then to `fallback`. */
export function t(lang, key, fallback) {
  const v = dict[lang]?.[key];
  if (v != null) return v;
  const en = dict[DEFAULT_LANG]?.[key];
  return en != null ? en : fallback;
}

/** true/false whether `lang` has its own entry for `key` (no English fallback). */
export function dictHas(lang, key) {
  return dict[lang]?.[key] != null;
}

/** HTML-escape a value destined for a double-quoted attribute. */
export const escAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML-escape text content. */
export const escText = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replace the text content of elements carrying data-i18n="key". */
export function applyText(html, lang) {
  return html.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, _tag, key, _inner, close) => {
      let val = t(lang, key);
      if (val == null) return m;
      // data-i18n-vars="cat=cat.game.label" → substitute {cat} (mirrors i18n.js).
      const vars = open.match(/\bdata-i18n-vars="([^"]+)"/);
      if (vars) {
        for (const pair of vars[1].split(",")) {
          const idx = pair.indexOf("=");
          if (idx === -1) continue;
          const name = pair.slice(0, idx).trim();
          const sub = t(lang, pair.slice(idx + 1).trim());
          if (sub != null) val = val.split(`{${name}}`).join(sub);
        }
      }
      return `${open}${val}${close}`;
    },
  );
}

/** Replace innerHTML of elements carrying data-i18n-html="key". */
export function applyHtml(html, lang) {
  return html.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, _tag, key, _inner, close) => {
      const val = t(lang, key);
      if (val == null) return m;
      return `${open}${val}${close}`;
    },
  );
}

/** Apply data-i18n-attr="attr:key,attr2:key2" to element attributes. */
export function applyAttr(html, lang) {
  return html.replace(/<[a-zA-Z0-9]+\b[^>]*\bdata-i18n-attr="([^"]+)"[^>]*>/g, (tag) => {
    const specMatch = tag.match(/data-i18n-attr="([^"]+)"/);
    if (!specMatch) return tag;
    let out = tag;
    for (const pair of specMatch[1].split(",")) {
      const idx = pair.indexOf(":");
      if (idx === -1) continue;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      const val = t(lang, key);
      if (val == null) continue;
      const escaped = escAttr(val);
      const attrRe = new RegExp(`(\\s${attr}=")[^"]*(")`);
      if (attrRe.test(out)) out = out.replace(attrRe, `$1${escaped}$2`);
      else out = out.replace(/>$/, ` ${attr}="${escaped}">`);
    }
    return out;
  });
}

/** Apply all three data-i18n transforms. */
export function localizeBody(html, lang) {
  return applyAttr(applyHtml(applyText(html, lang), lang), lang);
}

/** Rewrite <html lang>, og:locale and (optionally) add the prerendered marker. */
export function applyLangMeta(html, lang) {
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  if (/<meta property="og:locale"/.test(html)) {
    html = html.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${OG_LOCALES[lang]}$2`);
  }
  if (lang !== DEFAULT_LANG && !/name="nape-prerendered"/.test(html)) {
    html = html.replace(
      /<meta charset="[^"]*"\s*\/?>/i,
      (m) => `${m}\n  <meta name="nape-prerendered" content="${lang}" />`,
    );
  }
  return html;
}

/** Set <title>, description, og:title/description, twitter:title/description. */
export function applyTitleDesc(html, { title, description }) {
  if (title != null) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(title)}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
  }
  if (description != null) {
    html = html
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(description)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(description)}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(description)}$2`);
  }
  return html;
}

/** Absolute URL of `page` in `lang`. `page` = { pathEn, pathLang(lang) }. */
export function pageUrl(page, lang) {
  return SITE + (lang === DEFAULT_LANG ? page.pathEn : page.pathLang(lang));
}

/** <link rel="alternate" hreflang> lines for a localized page. */
export function hreflangBlock(page) {
  const lines = LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${pageUrl(page, l)}" />`);
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE + page.pathEn}" />`);
  return lines.join("\n");
}

/** Insert/replace the marker-delimited hreflang block before </head>. */
export function injectHreflang(html, page) {
  const START = "<!-- i18n:hreflang:start -->";
  const END = "<!-- i18n:hreflang:end -->";
  const block = `${START}\n${hreflangBlock(page)}\n  ${END}`;
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (re.test(html)) return html.replace(re, block);
  return html.replace(/<\/head>/, `  ${block}\n</head>`);
}

/** Point <link rel=canonical> / og:url at the language-specific URL. */
export function applyCanonical(html, page, lang) {
  const url = pageUrl(page, lang);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  return html;
}

/** Sitemap <url> entry (with hreflang alternates when `page.localized`). */
export function sitemapEntry(page, lang, { lastmod, changefreq = "weekly", priority = "0.8" }) {
  const loc = page.localized === false ? SITE + page.pathEn : pageUrl(page, lang);
  const lines = [`  <url>`, `    <loc>${loc}</loc>`, `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`, `    <priority>${priority}</priority>`];
  if (page.localized !== false) {
    for (const l of LANGS) lines.push(`    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(page, l)}" />`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + page.pathEn}" />`);
  }
  lines.push(`  </url>`);
  return lines.join("\n");
}
