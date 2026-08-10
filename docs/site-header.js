/**
 * nape-js docs — sticky site header + live hero badges.
 *
 * Two jobs, both progressive enhancement on top of static HTML:
 *
 *  1. Scroll state for the sticky header. The header is `position: sticky`
 *     in CSS (so it works with JS off); this only toggles a `.scrolled`
 *     class so it can gain a shadow once the page moves, and highlights the
 *     nav link whose section is currently on screen.
 *
 *  2. The live hero badges — npm downloads and GitHub stars. Both endpoints
 *     are public, key-less and CORS-enabled, so they can be read straight
 *     from the browser. Results are cached in localStorage for 6 hours so a
 *     returning visitor doesn't re-hit either API, and every failure path is
 *     silent: a badge that cannot resolve a number stays hidden rather than
 *     rendering "—" or an error. The static badges (version, bundle size)
 *     live in the HTML and never depend on this file.
 */

const NPM_ENDPOINT = "https://api.npmjs.org/downloads/point/last-month/@newkrok/nape-js";
const GITHUB_ENDPOINT = "https://api.github.com/repos/NewKrok/nape-js";
const CACHE_KEY = "nape-badges";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Translate through the i18n runtime if it has loaded; else use the fallback. */
const t = (key, fallback) => window.napeI18n?.t?.(key, fallback) ?? fallback;

/** 1274 → "1.3k", 950 → "950", 12400 → "12k". */
function compact(n) {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k < 10 ? k.toFixed(1) : Math.round(k)}k`;
}

/** Locale-aware full number for the tooltip (1274 → "1,274" / "1 274"). */
function full(n) {
  try {
    return n.toLocaleString(window.napeI18n?.getLanguage?.() || undefined);
  } catch {
    return String(n);
  }
}

// --- badge cache -------------------------------------------------------------

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || Date.now() - entry.at > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* private mode / quota — the badges just re-fetch next visit */
  }
}

/**
 * Fetch one JSON endpoint, returning null on any failure (offline, rate
 * limit, blocked by an extension, malformed body). Never throws.
 */
async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Reveal a badge with its value; a null value leaves it hidden. */
function fillBadge(id, value, title) {
  const el = document.getElementById(id);
  if (!el || value == null) return;
  const slot = el.querySelector("[data-badge-value]");
  if (slot) slot.textContent = value;
  if (title) el.title = title;
  el.hidden = false;
}

async function loadBadges() {
  const cached = readCache();
  let data = cached;
  if (!data) {
    const [npmRes, ghRes] = await Promise.all([
      fetchJson(NPM_ENDPOINT),
      fetchJson(GITHUB_ENDPOINT),
    ]);
    data = {
      npm: typeof npmRes?.downloads === "number" ? npmRes.downloads : null,
      stars: typeof ghRes?.stargazers_count === "number" ? ghRes.stargazers_count : null,
    };
    // Only cache a result that actually carried something, so a temporary
    // outage doesn't pin empty badges for the next six hours.
    if (data.npm != null || data.stars != null) writeCache(data);
  }

  if (data.npm != null) {
    fillBadge(
      "npmBadge",
      `${compact(data.npm)}/mo`,
      `${full(data.npm)} ${t("badge.npm.title", "npm downloads in the last 30 days")}`,
    );
  }
  if (data.stars != null) {
    fillBadge("starBadge", full(data.stars), t("badge.stars.title", "Stars on GitHub"));
  }
}

// --- sticky header behaviour -------------------------------------------------

function initHeader() {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Highlight the nav link for the section currently in view. Only in-page
  // links (href="#id") take part; cross-page links never light up.
  const links = [...header.querySelectorAll(".site-nav-link[href^='#']")];
  const sections = links
    .map((link) => ({ link, el: document.querySelector(link.getAttribute("href")) }))
    .filter((pair) => pair.el);
  if (!sections.length || !("IntersectionObserver" in window)) return;

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      // The topmost visible section wins, so scrolling through a tall
      // section keeps a single link lit instead of flickering between two.
      let active = null;
      for (const { el } of sections) {
        if (visible.has(el)) {
          active = el;
          break;
        }
      }
      for (const { link, el } of sections) {
        link.classList.toggle("active", el === active);
      }
    },
    { rootMargin: "-64px 0px -55% 0px", threshold: 0 },
  );
  for (const { el } of sections) observer.observe(el);
}

initHeader();
loadBadges();

// The tooltips are localized, so refresh them if the visitor switches
// language without a full page load.
document.addEventListener("nape:langchange", loadBadges);
