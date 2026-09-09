/**
 * Demo category map — splits the demo grid into tiers.
 *
 * Every demo has a *tier*:
 *
 * - "physics"   — pure technique demos (constraints, fluids, fracture,
 *                 raycasting, serialization, determinism, soft body, debug
 *                 rendering, etc.). The default when a demo is not listed.
 * - "game"      — playable gameplay slices that *use* the engine: a single
 *                 mechanic or a small arcade loop (platformer, pinball,
 *                 slingshot, tower defense, …).
 * - "showpiece" — fully worked-out game demos with several interacting
 *                 systems (AI opponents, waves, cameras, 3D rigs, scoring).
 *                 These are what the /games/ landing page leads with.
 *
 * The *category* is the coarser physics/game split used by the filter pills,
 * the tab dots and the category badges. A showpiece belongs to the "game"
 * category; `matchesCategory(demo, "showpiece")` narrows to showpieces only.
 *
 * `scripts/lib/demo-meta.mjs` reads these sets at build time to generate the
 * per-demo pages, the /games/ landing page and the sitemap, so keep the sets
 * as plain literals (no computed entries).
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
  "tinywheels-cup",
  "tiltrun",
  "dirtline",
  "billiards",
  "standoff",
  "sticky-builder",
  "contraption-garage",
  "crash-test-hero",
  "raft-rapids",
  "sky-hook",
  "ragdoll-royale",
  "cargo-crane",
  "sumo-arena",
  "kickoff",
  "dodgeball",
  "escape-run",
  "capture-the-flag",
  "jungle-strike",
  "shard-rush",
  "blade-waltz",
]);

/**
 * Showpieces — the subset of game demos that are complete, multi-system games
 * rather than a single mechanic. Order here is the display order on /games/.
 */
export const SHOWPIECE_DEMO_IDS = new Set([
  "blade-waltz",
  "shard-rush",
  "jungle-strike",
  "raft-rapids",
  "kickoff",
  "crash-test-hero",
  "sky-hook",
  "ragdoll-royale",
  "escape-run",
  "capture-the-flag",
  "dodgeball",
  "standoff",
  "arena-defense",
  "moba-lite",
  "tinywheels-cup",
  "dirtline",
  "top-down-shooter",
  "contraption-garage",
]);

export const CATEGORIES = [
  { id: "physics",   label: "Physics",   desc: "Pure technique demos — bodies, joints, fluids, raycasting, soft body, fracture, determinism, serialization." },
  { id: "game",      label: "Game",      desc: "Playable mini-games and gameplay slices built on the engine — platformer, shooter, pinball, slingshot, vehicles." },
  { id: "showpiece", label: "Showpiece", desc: "Complete game demos with AI, waves, cameras and 3D rigs — the closest thing to a shipped game in one file." },
];

/** Fine-grained tier: "showpiece" | "game" | "physics". */
export function tierOf(demo) {
  const id = demo?.id;
  if (SHOWPIECE_DEMO_IDS.has(id)) return "showpiece";
  if (GAME_DEMO_IDS.has(id)) return "game";
  return "physics";
}

/** Coarse category: "game" | "physics" (showpieces count as games). */
export function categoryOf(demo) {
  return tierOf(demo) === "physics" ? "physics" : "game";
}

/**
 * Does `demo` belong under the filter pill `catId`?
 *   physics   → physics tier only
 *   game      → game + showpiece tiers (every playable demo)
 *   showpiece → showpiece tier only
 */
export function matchesCategory(demo, catId) {
  if (!catId) return true;
  if (catId === "showpiece") return tierOf(demo) === "showpiece";
  return categoryOf(demo) === catId;
}
