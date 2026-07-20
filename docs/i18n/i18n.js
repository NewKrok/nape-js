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

// Version query for cache-busting the JSON files — keep in sync with the
// ?v= used by the HTML pages.
const ASSET_VERSION = "3.35.0";

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

/**
 * Apply translations to every `data-i18n*` element under `root`.
 * Also handles the document <title> and <meta name="description"> via the
 * reserved keys `meta.title` / `meta.description` when present in the dict.
 */
export function applyTranslations(root = document) {
  // Text content
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key, null);
    if (val != null) el.textContent = val;
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
  if (root === document) {
    const title = t("meta.title", null);
    if (title != null) document.title = title;
    const descKey = t("meta.description", null);
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
