/**
 * Demo category map — splits the demo grid into two top-level buckets.
 *
 * - "physics" — pure technique demos (constraints, fluids, fracture, raycasting,
 *   serialization, determinism, soft body, debug rendering, etc.).
 * - "game"    — playable mini-games or gameplay slices that *use* the engine
 *   (platformer, shooter, MOBA, tower defense, slingshot, pinball, …).
 *
 * Demos default to "physics" if not listed.
 */
export const GAME_DEMO_IDS = new Set([
  "character-controller",
  "planet-platformer",
  "car-sideview",
  "tracked-vehicle",
  "car-topdown",
  "tower-defense",
  "top-down-shooter",
  "moba-lite",
  "pinball",
  "plinko",
  "slingshot",
  "destructible-arena",
  "portals",
  "arena-defense",
  "floppy-fists",
  "minigolf",
  "wyrm",
  "brickline",
  "cordfall",
]);

export const CATEGORIES = [
  { id: "physics", label: "Physics", desc: "Pure technique demos — bodies, joints, fluids, raycasting, soft body, fracture, determinism, serialization." },
  { id: "game",    label: "Game",    desc: "Playable mini-games built on the engine — platformer, shooter, MOBA, tower defense, slingshot, pinball." },
];

export function categoryOf(demo) {
  return GAME_DEMO_IDS.has(demo?.id) ? "game" : "physics";
}
