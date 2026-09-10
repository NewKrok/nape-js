/**
 * nape-js docs — lightweight client-side i18n runtime.
 *
 * Zero-dependency, no build step. Detects the visitor's language, loads a JSON
 * dictionary, and swaps text on any element carrying a `data-i18n*` attribute.
 * JS-generated UI (demo cards, toasts) reads strings through `t()`.
 *
 * Language resolution priority:
 *   1. `?lang=xx` URL query (session override, not persisted)
 *   2. localStorage["nape-lang"] (manual, persisted, set via setLanguage())
 *   3. navigator.languages / navigator.language (first supported primary tag)
 *   4. DEFAULT_LANG ("en")
 *
 * Missing keys or a failed dictionary load fall back to English silently
 * (with a dev-console warning). The base `en.json` is always loaded so every
 * key has an English fallback even when the active language omits it.
 *
 * DOM attributes understood by applyTranslations():
 *   data-i18n="key"                  → element.textContent
 *   data-i18n-html="key"             → element.innerHTML (for desc <b>/<code>)
 *   data-i18n-attr="attr:key,attr2:key2"  → element.setAttribute(attr, value)
 *
 * Public API (also mirrored on window.napeI18n for inline HTML scripts):
 *   t(key, fallback?)   → localized string (English fallback, then `key`)
 *   setLanguage(lang)   → persist + re-apply + emit "nape:langchange"
 *   getLanguage()       → active language code
 *   applyTranslations(root=document)
 *   SUPPORTED_LANGS, DEFAULT_LANG, LANG_LABELS
 */

export const DEFAULT_LANG = "en";

/** Supported language codes (primary subtags). */
export const SUPPORTED_LANGS = ["en", "de", "zh", "hu", "es", "fr"];

/** Display labels for the language switcher. */
export const LANG_LABELS = {
  en: "EN",
  de: "DE",
  zh: "中文",
  hu: "HU",
  es: "ES",
  fr: "FR",
};

/** BCP-47 tags for <html lang> and og:locale (og uses xx_XX form). */
const OG_LOCALES = {
  en: "en_US",
  de: "de_DE",
  zh: "zh_CN",
  hu: "hu_HU",
  es: "es_ES",
  fr: "fr_FR",
};

const STORAGE_KEY = "nape-lang";
const DEV = typeof location !== "undefined" && /localhost|127\.0\.0\.1/.test(location.hostname);

// Version query for cache-busting the JSON files. Derived from this module's
// own ?v= stamp rather than hard-coded: scripts/stamp-docs.mjs rewrites every
// `from "./i18n.js?v=3.42.1"` import, so import.meta.url already carries the
// current version and the two can never drift apart. (They did: this was
// pinned at 3.35.0 while the pages had moved on to 3.42.x, so seven releases
// of locale edits could sit behind a stale cache entry.) Unstamped loads —
// dev servers, direct imports — fall back to "dev".
const ASSET_VERSION = (() => {
  try {
    return new URL(import.meta.url).searchParams.get("v") || "dev";
  } catch {
    return "dev";
  }
})();

// Resolve the locales directory relative to this module, so the pages under
// /examples/ and / both fetch the same files.
const LOCALES_BASE = new URL("./locales/", import.meta.url);

let activeLang = DEFAULT_LANG;
let dict = Object.create(null); // active-language dictionary
let baseDict = Object.create(null); // English fallback dictionary
const loaded = Object.create(null); // lang -> dictionary cache

/** Normalize a navigator/URL tag ("de-AT", "zh-Hans-CN") to a supported primary code. */
function normalizeLang(tag) {
  if (!tag) return null;
  const primary = String(tag).toLowerCase().split("-")[0];
  // Chinese: any zh-* variant maps to our single "zh".
  return SUPPORTED_LANGS.includes(primary) ? primary : null;
}

/** Detect the initial language following the documented priority order. */
export function detectLanguage() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const fromQuery = normalizeLang(q);
    if (fromQuery) return fromQuery;
  } catch {
    /* ignore */
  }

  try {
    const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    /* localStorage may be unavailable */
  }

  const navLangs =
    (typeof navigator !== "undefined" &&
      (navigator.languages || [navigator.language])) ||
    [];
  for (const l of navLangs) {
    const norm = normalizeLang(l);
    if (norm) return norm;
  }
  return DEFAULT_LANG;
}

async function fetchDict(lang) {
  if (loaded[lang]) return loaded[lang];
  try {
    const url = new URL(`${lang}.json?v=${ASSET_VERSION}`, LOCALES_BASE);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    loaded[lang] = json;
    return json;
  } catch (err) {
    if (DEV) console.warn(`[i18n] failed to load "${lang}" dictionary:`, err.message);
    loaded[lang] = {};
    return loaded[lang];
  }
}

/** Look up a key in the active dictionary, then English, then the given fallback. */
export function t(key, fallback) {
  if (key in dict) return dict[key];
  if (key in baseDict) return baseDict[key];
  return fallback !== undefined ? fallback : key;
}

export function getLanguage() {
  return activeLang;
}

function updateHtmlLangMeta(lang) {
  try {
    document.documentElement.setAttribute("lang", lang);
    const og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", OG_LOCALES[lang] || OG_LOCALES.en);
  } catch {
    /* ignore */
  }
}

/** Page-level override of a reserved meta key; "" disables, absent → default. */
function pageMetaKey(metaName, defaultKey) {
  try {
    const m = document.querySelector(`meta[name="${metaName}"]`);
    if (!m) return defaultKey;
    const v = m.getAttribute("content");
    return v ? v : null;
  } catch {
    return defaultKey;
  }
}

/** Replace {name} placeholders using "name=i18n.key,…" from a meta tag. */
function substituteVars(text, metaName) {
  try {
    const m = document.querySelector(`meta[name="${metaName}"]`);
    if (!m) return text;
    for (const pair of (m.getAttribute("content") || "").split(",")) {
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const val = t(pair.slice(idx + 1).trim(), null);
      if (val != null) text = text.split(`{${name}}`).join(val);
    }
    return text;
  } catch {
    return text;
  }
}

/**
 * Apply translations to every `data-i18n*` element under `root`.
 * Also handles the document <title> and <meta name="description"> via the
 * reserved keys `meta.title` / `meta.description` when present in the dict.
 */
export function applyTranslations(root = document) {
  // Text content
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    let val = t(key, null);
    if (val == null) return;
    // Optional placeholder substitution: data-i18n-vars="cat=cat.game.label"
    // replaces {cat} with the translation of cat.game.label.
    const vars = el.getAttribute("data-i18n-vars");
    if (vars) {
      for (const pair of vars.split(",")) {
        const idx = pair.indexOf("=");
        if (idx === -1) continue;
        const name = pair.slice(0, idx).trim();
        const sub = t(pair.slice(idx + 1).trim(), null);
        if (sub != null) val = val.split(`{${name}}`).join(sub);
      }
    }
    el.textContent = val;
  });

  // Inner HTML (descriptions with <b>/<code>)
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    const val = t(key, null);
    if (val != null) el.innerHTML = val;
  });

  // Attributes: data-i18n-attr="title:key,aria-label:key2"
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const spec = el.getAttribute("data-i18n-attr");
    for (const pair of spec.split(",")) {
      const idx = pair.indexOf(":");
      if (idx === -1) continue;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      const val = t(key, null);
      if (val != null) el.setAttribute(attr, val);
    }
  });

  // Reserved: document title + meta description (only when the root is document).
  //
  // Generated pages (per-demo pages, /games/, /showcase/) carry their own
  // title/description and declare the keys to use via
  //   <meta name="nape-i18n-title" content="demopage.meta.title">
  //   <meta name="nape-i18n-title-vars" content="label=demo.<id>.label">
  //   <meta name="nape-i18n-description" content="">   (empty → leave baked)
  // so a client-side language swap never overwrites a page-specific title
  // with the generic site title.
  if (root === document) {
    const titleKey = pageMetaKey("nape-i18n-title", "meta.title");
    const title = titleKey ? t(titleKey, null) : null;
    if (title != null) document.title = substituteVars(title, "nape-i18n-title-vars");
    const descKey0 = pageMetaKey("nape-i18n-description", "meta.description");
    const descKey = descKey0 ? t(descKey0, null) : null;
    if (descKey != null) {
      document
        .querySelectorAll(
          'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]',
        )
        .forEach((m) => m.setAttribute("content", descKey));
    }
  }
}

/**
 * Load a language's dictionary and apply it. Emits `nape:langchange` on
 * document with `{ detail: { lang } }` so dynamic views (demo cards) can
 * re-render their JS-generated text.
 */
export async function loadLanguage(lang, { persist = false } = {}) {
  const target = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;

  // Always have English available as a fallback layer.
  if (!Object.keys(baseDict).length) {
    baseDict = await fetchDict(DEFAULT_LANG);
  }
  dict = target === DEFAULT_LANG ? baseDict : await fetchDict(target);

  activeLang = target;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, target);
    } catch {
      /* ignore */
    }
  }

  updateHtmlLangMeta(target);
  applyTranslations(document);

  try {
    document.dispatchEvent(
      new CustomEvent("nape:langchange", { detail: { lang: target } }),
    );
  } catch {
    /* ignore */
  }
  return target;
}

/** Public switch — persists the choice and fires analytics. */
export async function setLanguage(lang) {
  const result = await loadLanguage(lang, { persist: true });
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "language_change", {
        event_category: "i18n",
        event_label: result,
      });
    }
  } catch {
    /* ignore */
  }
  return result;
}

/**
 * The language this page was prerendered in at build time, or null for the
 * dynamic (English source) pages. Read from <meta name="nape-prerendered">,
 * which scripts/prerender-i18n.mjs injects into every generated variant.
 */
export function prerenderedLanguage() {
  try {
    const m = document.querySelector('meta[name="nape-prerendered"]');
    const lang = m && m.getAttribute("content");
    return lang && SUPPORTED_LANGS.includes(lang) ? lang : null;
  } catch {
    return null;
  }
}

/**
 * Boot i18n as early as possible.
 *
 * On a prerendered page the static content is already baked in the page's
 * language, so we only load that language's dictionary (needed for the
 * JS-generated demo cards) WITHOUT re-applying it to the static DOM — no
 * flash, no wasted work. Navigation between languages is handled by the
 * switcher (it points at the sibling language URL).
 *
 * On the dynamic English source page we behave as before: detect the
 * visitor's language and swap the DOM in place.
 *
 * Returns the active language.
 */
export async function initI18n() {
  const baked = prerenderedLanguage();

  if (baked) {
    // Static DOM is already localized; just make t() return `baked` strings
    // for dynamic content, and set state — do not re-apply to the DOM.
    if (!Object.keys(baseDict).length) baseDict = await fetchDict(DEFAULT_LANG);
    dict = baked === DEFAULT_LANG ? baseDict : await fetchDict(baked);
    activeLang = baked;
    try {
      document.documentElement.setAttribute("lang", baked);
    } catch {
      /* ignore */
    }
    return baked;
  }

  const detected = detectLanguage();
  // Set lang attribute synchronously to reduce flash before the dict loads.
  try {
    document.documentElement.setAttribute("lang", detected);
  } catch {
    /* ignore */
  }
  await loadLanguage(detected, { persist: false });
  return detected;
}

// Mirror the API on window so inline <script> blocks and the switcher UI
// (which may live in plain HTML) can reach it without importing.
if (typeof window !== "undefined") {
  window.napeI18n = {
    t,
    setLanguage,
    getLanguage,
    detectLanguage,
    prerenderedLanguage,
    applyTranslations,
    initI18n,
    SUPPORTED_LANGS,
    DEFAULT_LANG,
    LANG_LABELS,
  };
}
