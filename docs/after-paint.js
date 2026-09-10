/**
 * nape-js docs — "wait until the page has painted" scheduler.
 *
 * Several things on this site are live physics simulations driven by a
 * requestAnimationFrame loop: the hero background, the featured demo on the
 * homepage, the canvas on every per-demo page. Started at module-evaluation
 * time they all compete with the browser's first paint — and there is nothing
 * to win by competing, because the text they delay is already prerendered
 * into the HTML and is only waiting for a free main thread. On a per-demo page
 * that cost measured as First Contentful Paint at 3.1 s and Largest
 * Contentful Paint at 6.5 s on a throttled mobile profile, for a paragraph
 * that was sitting in the served markup all along.
 *
 * So: let the document finish loading, then take the first idle slot. `load`
 * puts us past FCP/LCP; the idle hop after it keeps the simulation's build
 * phase out of the tail of the load burst. Safari ships no
 * requestIdleCallback, hence the timeout fallback, and the `timeout` option
 * caps how long a busy main thread can keep deferring us where it does exist.
 *
 * Callers that must not be deferred (anything the user can already see and
 * interact with) simply don't await this.
 */
export function afterFirstPaint({ timeout = 2000 } = {}) {
  return new Promise((resolve) => {
    const idle = () => {
      const requestIdle = window.requestIdleCallback;
      if (requestIdle) requestIdle(() => resolve(), { timeout });
      else setTimeout(resolve, 200);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}
