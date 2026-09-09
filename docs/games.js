/**
 * nape-js docs — lazy live previews for the /games/ landing page.
 *
 * Each `.game-card-canvas[data-demo-id]` gets a static one-frame preview of
 * its demo, rendered with the real engine the first time the card scrolls
 * near the viewport. The demo module is imported on demand so the page
 * itself stays light; the preview is a plain canvas inside a link, so a
 * click always navigates to the demo's own page.
 */
import { DemoRunner } from "./demo-runner.js?v=3.42.1";
import { Canvas2DAdapter } from "./renderers/canvas2d-adapter.js?v=3.42.1";

const ownVersion = new URL(import.meta.url).searchParams.get("v");
const stamped = (path) => (ownVersion ? `${path}?v=${ownVersion}` : path);

const W = 900;
const H = 500;

async function renderPreview(host) {
  const id = host.dataset.demoId;
  if (!id || host.dataset.previewed) return;
  host.dataset.previewed = "1";
  try {
    const mod = await import(stamped(`./demos/${id}.js`));
    const runner = new DemoRunner(host, { W, H });
    runner.registerAdapter(new Canvas2DAdapter());
    runner.debugDraw = true;
    await runner.renderPreviewAsync(mod.default);
    host.classList.add("has-preview");
  } catch (err) {
    console.warn(`[games] preview failed for ${id}:`, err);
  }
}

const hosts = [...document.querySelectorAll(".game-card-canvas[data-demo-id]")];
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        renderPreview(e.target);
      }
    },
    { rootMargin: "300px 0px" },
  );
  for (const h of hosts) io.observe(h);
} else {
  for (const h of hosts) renderPreview(h);
}
