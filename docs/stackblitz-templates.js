/**
 * StackBlitz integration for nape-js demo pages.
 *
 * Public entry point: openInStackBlitz(demo, adapterId, opts) — mirrors
 * openInCodePen() in codepen-templates.js. Reuses the bundler-mode source
 * generator (getDemoSourceForBundler) so the demo body lives in one place.
 *
 * Output is a Vite project (template: "node") that runs in WebContainers,
 * with real `npm install @newkrok/nape-js` — closer to the user's actual
 * dev experience than the CodePen jsdelivr-CDN flow.
 */

import {
  getDemoSourceForBundler,
  getAdapterHostHtml,
  PACKAGE_VERSIONS,
} from "./codepen-templates.js?v=3.39.1";

const SDK_URL = "https://cdn.jsdelivr.net/npm/@stackblitz/sdk@1/bundles/sdk.m.js";
const VITE_VERSION = "5.4.0";

// ──────────────────────────────────────────────────────────────────────────
// Per-adapter package.json deps
// ──────────────────────────────────────────────────────────────────────────

function dependenciesFor(adapterId) {
  const deps = { "@newkrok/nape-js": `^${PACKAGE_VERSIONS.nape}` };
  if (adapterId === "threejs") {
    deps["three"] = `^${PACKAGE_VERSIONS.three}`;
  } else if (adapterId === "pixijs") {
    deps["pixi.js"] = `^${PACKAGE_VERSIONS.pixi}.0.0`;
    deps["@newkrok/nape-pixi"] = `^${PACKAGE_VERSIONS.napePixi}`;
  }
  return deps;
}

function packageJson(demo, adapterId) {
  return JSON.stringify(
    {
      name: `nape-js-${demo.id ?? "demo"}`,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: dependenciesFor(adapterId),
      devDependencies: { vite: `^${VITE_VERSION}` },
    },
    null,
    2,
  );
}

const VITE_CONFIG = `import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true },
});
`;

// ──────────────────────────────────────────────────────────────────────────
// Host HTML — mounts the demo and links src/main.js
// ──────────────────────────────────────────────────────────────────────────

const HOST_CSS = `body { margin: 20px; background: #0d1117; font-family: sans-serif; color: #e6edf3; }
.nape-badge { position: fixed; bottom: 12px; right: 16px; font-size: 13px; font-family: sans-serif; color: #8b949e; text-decoration: none; opacity: .75; transition: opacity .2s; z-index: 9999; }
.nape-badge:hover { opacity: 1; color: #58a6ff; }`;

function indexHtml(demo, adapterId) {
  const title = demo.title ?? demo.id ?? "nape-js demo";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} — nape-js</title>
    <style>${HOST_CSS}</style>
  </head>
  <body>
    ${getAdapterHostHtml(adapterId)}
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ──────────────────────────────────────────────────────────────────────────
// SDK loading (cached)
// ──────────────────────────────────────────────────────────────────────────

let _sdkPromise = null;
function loadSdk() {
  if (!_sdkPromise) {
    _sdkPromise = import(/* @vite-ignore */ SDK_URL).then((m) => m.default ?? m);
  }
  return _sdkPromise;
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

/**
 * Build the Vite project file map for a demo. Exposed for testing — the
 * tab-opening side effect lives in openInStackBlitz().
 *
 * @param {Object} demo — demo definition (same shape as for openInCodePen)
 * @param {string} adapterId — "canvas2d" | "threejs" | "pixijs"
 * @param {{ showOutlines?: boolean }} [opts]
 * @returns {Promise<{ files: Record<string,string>, title: string, description: string } | null>}
 */
export async function buildStackblitzProject(demo, adapterId, opts) {
  const source = await getDemoSourceForBundler(demo, adapterId, opts);
  if (!source) return null;

  const title = `${demo.title ?? demo.id ?? "demo"} — nape-js`;
  const description =
    demo.description ??
    "Physics demo built with @newkrok/nape-js. Runnable Vite project — edit src/main.js to tweak.";

  return {
    title,
    description,
    files: {
      "package.json": packageJson(demo, adapterId),
      "vite.config.js": VITE_CONFIG,
      "index.html": indexHtml(demo, adapterId),
      "src/main.js": source,
    },
  };
}

/**
 * Open a StackBlitz tab with a runnable Vite project for the given demo + renderer.
 * No-op if the demo has no extractable code.
 */
export async function openInStackBlitz(demo, adapterId, opts) {
  const project = await buildStackblitzProject(demo, adapterId, opts);
  if (!project) return;

  const sdk = await loadSdk();
  sdk.openProject(
    {
      title: project.title,
      description: project.description,
      template: "node",
      files: project.files,
    },
    { newWindow: true, openFile: "src/main.js" },
  );
}
