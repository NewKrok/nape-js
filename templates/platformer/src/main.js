import { Game, STEP_DT } from "./game/game.js";
import { Hud } from "./game/hud.js";
import { createInput } from "./game/input.js";

// Renderer pick — to switch, change the path to "./render/threejs.js" or
// "./render/pixi.js" (and update package.json deps accordingly).
import { Canvas2DRenderer as Renderer } from "./render/canvas2d.js";

const renderer = new Renderer();
// `mount` may be async (Pixi v8 needs `await app.init()`). Awaiting a
// non-Promise return is fine, so this works for all three renderers.
await renderer.mount(document.getElementById("game"));

const hud = new Hud();
const input = createInput();

const game = new Game({
  viewportW: renderer.viewportW,
  viewportH: renderer.viewportH,
  hud,
  input,
});

// Fixed-timestep accumulator: physics runs at exactly STEP_DT regardless
// of display refresh rate (60 / 120 / 240 Hz all behave the same).
const MAX_FRAME = 0.25; // cap to avoid spiral-of-death after a tab pause
let last = performance.now();
let acc = 0;

function tick(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > MAX_FRAME) dt = MAX_FRAME;
  acc += dt;

  while (acc >= STEP_DT) {
    game.fixedUpdate(input);
    input.consumeFrame();
    acc -= STEP_DT;
  }

  hud.update({
    health: game.player.health,
    maxHealth: game.player.maxHealth,
    coins: game.player.coins,
    totalCoins: game.totalCoins,
    elapsedSec: game.elapsedSec,
  });

  renderer.render(game);
  requestAnimationFrame(tick);
}

requestAnimationFrame((t) => {
  last = t;
  tick(t);
});
