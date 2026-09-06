/**
 * nape-js docs — language switcher control.
 *
 * Renders a compact <select> of supported languages into the element with
 * id="langSwitcher" (or a passed element) and wires it to the i18n runtime.
 * Import + call `mountLangSwitcher()` after initI18n().
 *
 * Because each language is a real prerendered URL (/, /de/, /hu/, …), picking
 * a language NAVIGATES to that page rather than swapping text in place — this
 * is what makes every language independently indexable. The choice is also
 * persisted so the destination page (and future visits) honor it.
 */
import {
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  LANG_LABELS,
  getLanguage,
} from "./i18n.js?v=3.42.0";

/**
 * Compute the URL of the current page in another language.
 *
 *   /            ↔  /de/            ↔  /hu/
 *   /examples/   ↔  /de/examples/   ↔  /hu/examples/
 *
 * Strips any existing leading /<lang>/ segment, then adds the target one
 * (nothing for English). Query and hash are preserved.
 */
export function urlForLanguage(lang) {
  const { pathname, search, hash } = window.location;
  const segments = pathname.split("/"); // e.g. ["", "de", "examples", ""]
  if (
    segments[1] &&
    SUPPORTED_LANGS.includes(segments[1]) &&
    segments[1] !== DEFAULT_LANG
  ) {
    segments.splice(1, 1); // drop existing language prefix
  }
  let rest = segments.join("/");
  if (!rest.startsWith("/")) rest = "/" + rest;
  const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
  let path = (prefix + rest).replace(/\/{2,}/g, "/");
  if (path === "") path = "/";
  return path + search + hash;
}

export function mountLangSwitcher(target) {
  const host =
    target ||
    document.getElementById("langSwitcher") ||
    document.querySelector("[data-lang-switcher]");
  if (!host) return;

  const select = document.createElement("select");
  select.className = "lang-switcher-select";
  select.setAttribute("aria-label", "Language");
  select.title = "Language";

  for (const lang of SUPPORTED_LANGS) {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = LANG_LABELS[lang] || lang.toUpperCase();
    select.appendChild(opt);
  }

  function syncSelect() {
    const lang = getLanguage();
    if (lang && select.value !== lang) select.value = lang;
  }

  select.addEventListener("change", () => {
    const lang = select.value;
    // Persist so the destination page keeps this choice (and so a future
    // visit to the root auto-lands in the right language / can be redirected).
    try {
      localStorage.setItem("nape-lang", lang);
    } catch {
      /* ignore */
    }
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "language_change", {
          event_category: "i18n",
          event_label: lang,
        });
      }
    } catch {
      /* ignore */
    }
    const dest = urlForLanguage(lang);
    if (dest !== window.location.pathname + window.location.search + window.location.hash) {
      window.location.assign(dest);
    }
  });

  // Keep the control in sync if the language changes elsewhere.
  document.addEventListener("nape:langchange", syncSelect);

  host.innerHTML = "";
  host.appendChild(select);

  // Set the value only after the <option>s are attached to the DOM — a
  // <select>'s value assignment is ignored while it has no matching option.
  syncSelect();
}

if (typeof window !== "undefined") {
  window.napeMountLangSwitcher = mountLangSwitcher;
}
