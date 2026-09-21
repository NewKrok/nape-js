import {
  Body, BodyType, Vec2, Circle, Polygon, Capsule, Material, InteractionFilter,
  CharacterController, CbType,
} from "../nape-js.esm.js?v=3.42.1";
import { drawBody, drawConstraints, drawGrid } from "../renderer.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";
import {
  createSoldier, destroySoldier, syncSoldier, soldierPalette, createBoardMaterial,
} from "../renderers/lowpoly-characters.js?v=3.42.1";

// ── Jungle Strike — Contra-style side-scrolling run-and-gun ───────────────
//
// A five-screen jungle assault. You run right along a hand-authored level of
// ledges, collapsing bridges, one-way canopy platforms and a river crossing,
// shooting through four enemy types before a turret-boss at the far end.
//
// Physics-wise this is a CharacterController platformer with hitscan-free
// projectile bullets — every bullet is a real dynamic body, so bullets arc
// slightly, ricochet off armour and pile up in the river. The enemies are
// plain dynamic bodies steered by velocity, with the same collide-and-slide
// controller as the player for the ones that walk.
//
// The 3D mode swaps the capsules for the low-poly side-view rig in
// lowpoly-characters.js — the same treatment kickoff gives its footballers.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;

// World — five screens wide. Ground level sits well below the top so there is
// room for canopy platforms overhead.
const WORLD_W = 10800;
const WORLD_H = 620;
const GROUND_Y = 470;             // top surface of the default ground slab

const GRAVITY = 900;

// The lethal pits, as plain numbers so the renderer and the level agree.
// [x, width, kind] — "water" tints blue, "void" tints black.
const PITS = [
  [2020, 300, "void"],       // screen 2 — under the first bridge
  [2850, 600, "water"],      // screen 3 — the river
  [6550, 340, "void"],       // screen 7 — under the catwalks
  [7370, 630, "water"],      // screen 8 — the flooded bay
];

// ── Collision filtering ───────────────────────────────────────────────────
// CHAR_GROUP is bit 8 because CharacterController auto-ORs that bit into the
// shapes of any body it manages — spelled out here so the masks below can
// exclude it deliberately rather than by accident.
const CHAR_GROUP = 1 << 8;
const G_TERRAIN = 1 << 1;
const G_PLAYER = 1 << 2;
const G_ENEMY = 1 << 3;
const G_PBULLET = 1 << 4;         // player bullets
const G_EBULLET = 1 << 5;         // enemy bullets
const G_PICKUP = 1 << 6;
const G_DEBRIS = 1 << 7;
const G_ONEWAY = 1 << 10;

// Bullets collide with NOTHING. Every impact — terrain, enemy, boss, player —
// is resolved by hand in tickBullets against the segment the bullet travelled
// this frame, so any physical contact actively breaks that: the engine parks
// the body at the contact, the next frame's segment has zero length, and the
// swept test can no longer find the surface it is touching. The bullet then
// hangs in the air forever, having damaged nothing. (This was the "laser does
// no damage" symptom — the shot stopped against the first crate and sat there.)
// Letting them pass through also lets a piercing laser reach its later targets.
const M_PBULLET = 0;
const M_EBULLET = 0;
const M_PLAYER = G_TERRAIN | G_ONEWAY | G_EBULLET | G_PICKUP;
// Enemies collide with terrain, each other and player bullets — but NOT with
// the player. A solid enemy is an impassable wall in a corridor: a single
// grunt standing in a doorway pins the player against it and the run is over.
// Contact damage is applied by the jumper's own AI, so touching one still
// hurts; it just no longer stops you.
const M_ENEMY = G_TERRAIN | G_ENEMY | G_PBULLET;

// ── Player ────────────────────────────────────────────────────────────────
const PLAYER_W = 18;
const PLAYER_H = 40;
const PLAYER_R = PLAYER_W / 2;
const MOVE_SPEED = 210;
const JUMP_SPEED = 430;
const COYOTE_MS = 110;
const JUMP_BUFFER_MS = 120;
const PLAYER_MAX_HP = 5;
const PLAYER_IFRAMES = 70;        // frames of invulnerability after a hit
const RESPAWN_FRAMES = 100;
const START_LIVES = 3;

// ── Weapons ───────────────────────────────────────────────────────────────
// Contra's power-ups: the rifle is the default, S spreads five pellets, M is a
// fast stream, L is a piercing laser. Each has its own cooldown and damage so
// the pickups actually change how a fight plays.
const BULLET_R = 3;
const BULLET_SPEED = 720;
const BULLET_LIFE = 110;          // frames
const WEAPONS = {
  rifle:  { cd: 11, dmg: 1, pellets: 1, spread: 0,    speed: 720, label: "RIFLE",  color: "#ffd166" },
  spread: { cd: 20, dmg: 1, pellets: 5, spread: 0.42, speed: 640, label: "SPREAD", color: "#8ce99a" },
  machine:{ cd: 5,  dmg: 1, pellets: 1, spread: 0.05, speed: 820, label: "MACHINE",color: "#74c0fc" },
  laser:  { cd: 26, dmg: 3, pellets: 1, spread: 0,    speed: 1150, pierce: true, r: 4, label: "LASER", color: "#e599f7" },
};
const WEAPON_ORDER = ["rifle", "spread", "machine", "laser"];

// ── Enemies ───────────────────────────────────────────────────────────────
// Four types, each a different threat shape so the level can vary its pacing:
//   grunt   — walks a patrol, shoots at you on sight. The baseline.
//   turret  — static, wide arc, high fire rate. Forces you to use cover.
//   jumper  — no gun, closes the distance and leaps. Punishes standing still.
//   sniper  — long range, slow aimed shots with a telegraph. Forces movement.
const ENEMY_DEFS = {
  grunt:  { hp: 2, r: 15, h: 36, speed: 62,  fireCd: 78,  range: 430, dmg: 1, score: 100, color: "#f08c5a" },
  turret: { hp: 5, r: 17, h: 34, speed: 0,   fireCd: 46,  range: 520, dmg: 1, score: 150, color: "#c9a227" },
  jumper: { hp: 2, r: 13, h: 26, speed: 130, fireCd: 0,   range: 340, dmg: 1, score: 120, color: "#e0575b" },
  sniper: { hp: 3, r: 14, h: 38, speed: 0,   fireCd: 132, range: 760, dmg: 2, score: 200, color: "#9775fa" },
};
// Palette slots for the shared drawBody pass, so the four enemy types stay
// distinguishable in 2D without any custom drawing.
const ENEMY_COLOR_IDX = { grunt: 7, turret: 6, jumper: 3, sniper: 4 };

const ENEMY_BULLET_SPEED = 340;
// The sniper's whole identity is the telegraphed, hard-to-dodge shot: it gives
// you ~0.55s of visible laser sight and then a round you have to already be
// clear of. At 520 the shot crossed the screen slowly enough to sidestep AFTER
// it was fired, which made the wind-up pointless. At 900 the telegraph is the
// only warning you get — which is the point.
const SNIPER_BULLET_SPEED = 900;
const ENEMY_BULLET_R = 4;
const JUMPER_LEAP_VX = 190;
const JUMPER_LEAP_VY = -390;
const JUMPER_LEAP_CD = 62;

// ── Boss ──────────────────────────────────────────────────────────────────
// A three-barrel emplacement at the far wall. Two phases: a slow sweeping
// volley, then — under half health — a faster radial burst plus jumper spawns.
// Sized so phase 2 is not a formality: half of this has to be chewed through
// AFTER the rocket/mortar rotation opens up, which is where the fight is.
const BOSS_HP = 87;
const BOSS_X = WORLD_W - 210;
const BOSS_Y = GROUND_Y - 96;
const BOSS_R = 58;
const BOSS_CORE_R = 22;
// The boss fires in BURSTS with a wind-up, not a metronome. Perfectly-aimed
// shots on a short fixed cadence are not difficulty, they are an unavoidable
// damage tax: there is no read, so no amount of skill lowers the hit rate.
// Instead: telegraph → burst → long recovery, and the volley is aimed where
// the player WAS at the start of the wind-up, so moving beats it.
const BOSS_WINDUP = 42;            // frames of visible charge before a volley
const BOSS_BURST = 3;              // shots per volley
const BOSS_BURST_GAP = 9;          // frames between shots inside a volley
const BOSS_RECOVER = 58;           // frames of nothing after a volley
const BOSS_RAGE_WINDUP = 30;
const BOSS_RAGE_BURST = 5;
const BOSS_RAGE_RECOVER = 46;
// Aim error, so a volley brackets the player instead of drilling them.
const BOSS_SPREAD = 0.17;

// The boss cycles through three attacks rather than repeating one, so the
// fight has a shape: a straight volley you sidestep, a homing ROCKET you have
// to break line-of-sight from or out-run, and a MORTAR arc that lands where
// you are standing — which punishes camping behind a pillar, the exact counter
// to the other two. Rockets and bombs only appear once phase 2 begins.
const BOSS_ROCKET_SPEED = 190;
const BOSS_ROCKET_TURN = 0.030;   // radians per frame — slow enough to juke
const BOSS_ROCKET_LIFE = 260;
const BOSS_ROCKET_R = 7;
const BOSS_MORTAR_R = 9;
const BOSS_MORTAR_GRAV = 520;     // px/s² — bombs arc, unlike every other shot
const BOSS_MORTAR_LIFE = 260;
const BOSS_BLAST_R = 74;          // splash radius when a rocket/bomb detonates
const BOSS_BLAST_DMG = 2;
// Phase-2 rotation. Volley stays in the mix so the fight keeps its baseline.
const BOSS_ATTACKS = ["volley", "rocket", "volley", "mortar"];

// ── Pickups ───────────────────────────────────────────────────────────────
const PICKUP_R = 12;
const PICKUP_BOB = 5;

// Frames a plank holds your weight before it drops.
const PLANK_FUSE = 100;

// ── Level layout ──────────────────────────────────────────────────────────
//
// Everything is authored by hand rather than generated: a run-and-gun level
// lives or dies on the *rhythm* of its encounters, and a procedural generator
// produces terrain that is fair but has no pacing. Five screens, each with a
// distinct job:
//
// ACT I — the approach
//   0     0– 900  Landing zone    — teach movement + the rifle on lone grunts.
//   1   900–1800  Canopy ledges   — verticality, one-way platforms, a sniper.
//   2  1800–2700  The bridge      — collapsing planks over a pit, turrets behind.
//   3  2700–3600  River crossing  — stepping stones, jumpers, no floor below.
//   4  3600–4500  The emplacement — dense cover, every enemy type at once.
// ACT II — the interior (same vocabulary, recombined and tightened)
//   5  4500–5400  The trench      — a long low corridor, crossfire from above.
//   6  5400–6300  The tower       — a tall climb on canopy platforms, snipers.
//   7  6300–7200  The catwalks    — a second bridge, longer, over a deeper pit.
//   8  7200–8100  The flooded bay — wide water, sparse stones, jumper packs.
//   9  8100–9000  The gauntlet    — the hardest mixed fight in the level.
//  10  9000–9900  The staging yard— last pickups, a breather, then the gate.
//  11 9900–10800  Boss arena      — flat ground, two pillars, the emplacement.

// Solid ground slabs: [x, y, w, h] with (x,y) the top-left corner. A gap in
// this list is a pit — the river and the bridge chasm are both just absences.
const GROUND_SLABS = [
  // Screen 0 — continuous landing zone.
  [-40, GROUND_Y, 1000, 150],
  // Screen 1 — same floor, stepped up at the end into the canopy climb.
  [960, GROUND_Y, 500, 150],
  [1460, GROUND_Y - 60, 340, 210],
  // Screen 2 — the bridge chasm. Ledge, 300px gap spanned by planks, ledge.
  [1800, GROUND_Y - 60, 220, 210],
  [2320, GROUND_Y - 60, 380, 210],
  // Screen 3 — the river. Floor drops away entirely; only stepping stones.
  [2700, GROUND_Y - 60, 150, 210],
  [3450, GROUND_Y - 40, 250, 190],
  // Screen 4 — the emplacement plateau.
  [3700, GROUND_Y - 40, 800, 190],

  // ── ACT II ──────────────────────────────────────────────────────────────
  // Screen 5 — the trench: a continuous floor, threat comes from above.
  [4500, GROUND_Y, 900, 150],
  // Screen 6 — the tower: a stepped base, the rest is climbing.
  [5400, GROUND_Y, 420, 150],
  [5820, GROUND_Y - 70, 480, 220],
  // Screen 7 — the catwalks: two ledges with a 340px void between them.
  [6300, GROUND_Y - 70, 250, 220],
  [6890, GROUND_Y - 70, 310, 220],
  // Screen 8 — the flooded bay: wide water, only stones.
  [7200, GROUND_Y - 50, 170, 200],
  [8000, GROUND_Y - 50, 200, 200],
  // Screen 9 — the gauntlet: solid ground, all the pressure is enemies.
  [8200, GROUND_Y - 50, 800, 200],
  // Screen 10 — the staging yard.
  [9000, GROUND_Y, 900, 150],
  // Screen 11 — boss arena, one flat floor.
  [9900, GROUND_Y, 1000, 150],
];

// Raised solid blocks — cover, steps and pillars. Same [x, y, w, h] form.
const BLOCKS = [
  // Screen 0 — two crates to shoot over.
  [420, GROUND_Y - 46, 46, 46],
  [466, GROUND_Y - 46, 46, 46],
  [700, GROUND_Y - 92, 60, 92],
  // Screen 1 — the climb.
  [1010, GROUND_Y - 70, 90, 24],
  [1180, GROUND_Y - 130, 90, 24],
  [1340, GROUND_Y - 190, 100, 24],
  [1560, GROUND_Y - 250, 110, 24],
  // Screen 2 — turret nests on the far ledge.
  [2360, GROUND_Y - 120, 70, 60],
  [2560, GROUND_Y - 150, 70, 90],
  // Screen 3 — stepping stones across the river.
  [2900, GROUND_Y - 30, 90, 26],
  [3060, GROUND_Y - 70, 90, 26],
  [3230, GROUND_Y - 40, 90, 26],
  [3350, GROUND_Y - 110, 80, 24],
  // Screen 4 — dense cover, staggered heights. Nothing here rises more than
  // ~80px above the surface it is reached from: a single jump clears ~99px,
  // and a block taller than that stops being cover and becomes a wall across
  // the only route. The two tall ones are reached over their own low step.
  [3780, GROUND_Y - 110, 66, 70],
  [3900, GROUND_Y - 110, 56, 70],
  [3960, GROUND_Y - 175, 66, 135],
  [4150, GROUND_Y - 110, 66, 70],
  [4250, GROUND_Y - 120, 56, 80],
  [4310, GROUND_Y - 190, 80, 150],
  // ── ACT II ──────────────────────────────────────────────────────────────
  // Screen 5 — the trench: low sandbag cover you fight from, not over.
  [4620, GROUND_Y - 50, 70, 50],
  [4880, GROUND_Y - 50, 70, 50],
  [5140, GROUND_Y - 50, 70, 50],
  // Screen 6 — the tower: a staircase of ledges. Each step is <= 80px above
  // the one before it, so the whole climb is a sequence of ordinary jumps.
  [5450, GROUND_Y - 75, 100, 24],
  [5600, GROUND_Y - 150, 100, 24],
  [5470, GROUND_Y - 225, 100, 24],
  [5640, GROUND_Y - 300, 110, 24],
  [5900, GROUND_Y - 145, 90, 24],
  [6060, GROUND_Y - 215, 90, 24],
  // Screen 7 — the catwalks: stepping platforms across the void.
  [6600, GROUND_Y - 90, 90, 22],
  [6730, GROUND_Y - 130, 90, 22],
  // Screen 8 — the flooded bay: stones, some high enough to need a real jump.
  [7430, GROUND_Y - 40, 100, 26],
  [7590, GROUND_Y - 95, 100, 26],
  [7760, GROUND_Y - 50, 100, 26],
  [7880, GROUND_Y - 110, 90, 24],
  // Screen 9 — the gauntlet: staggered cover, nothing over 80px per step.
  [8290, GROUND_Y - 120, 66, 70],
  [8420, GROUND_Y - 120, 56, 70],
  [8480, GROUND_Y - 190, 66, 140],
  [8680, GROUND_Y - 120, 66, 70],
  [8800, GROUND_Y - 130, 56, 80],
  [8860, GROUND_Y - 200, 80, 150],
  // Screen 10 — the staging yard: crates.
  [9200, GROUND_Y - 50, 50, 50],
  [9250, GROUND_Y - 50, 50, 50],
  // 96px is right on the ~99px jump ceiling — a hair of overshoot and it is
  // an impassable wall across the only route. 78px leaves real margin.
  [9560, GROUND_Y - 78, 60, 78],
  // Screen 11 — two boss-arena pillars to break the emplacement's line of
  // sight. They sit ON the arena floor with nothing to walk around, so each
  // has to be jumpable: 85px and 80px, both inside the ~99px jump. Making
  // them the 150/210px towers they started as walled the boss off entirely.
  // Spacing matters more than height here. With the far pillar at x=10420 the
  // clear firing lane between it and the boss was only 58px wide — you had to
  // stand almost inside the emplacement to land a shot, and anywhere sane the
  // pillar ate every bullet. Pulled back so there is a real duelling floor to
  // move on, with cover behind you rather than in front of the target.
  //
  // Height is capped at 62px because the JUMPER has to clear these, not just
  // the player: its leap tops out at ~84px against the player's ~103, so the
  // 80/85px towers these started as trapped every escort the boss called in —
  // they piled against the pillar and never reached the fight. 62px leaves the
  // jumper real margin while still breaking the emplacement's line of sight.
  [10020, GROUND_Y - 62, 54, 62],
  [10270, GROUND_Y - 62, 54, 62],
];

// One-way canopy platforms — jump up through, stand on top. [x, y, w].
const ONEWAYS = [
  [1090, GROUND_Y - 200, 130],
  [1250, GROUND_Y - 270, 130],
  [1440, GROUND_Y - 330, 150],
  [2100, GROUND_Y - 210, 140],
  [3860, GROUND_Y - 250, 150],
  [4060, GROUND_Y - 300, 150],
  // ── ACT II ──────────────────────────────────────────────────────────────
  // Screen 5 — the crossfire galleries over the trench. Heights are a CHAIN:
  // floor → 50px sandbag → gallery. At the original -190/-230 the first
  // gallery sat 140px above the sandbag top, so nothing reached it and both
  // its pickups were stranded. -122/-186 keeps each hop inside the ~103px
  // jump while still putting the shooters meaningfully overhead.
  [4700, GROUND_Y - 122, 150],
  [5000, GROUND_Y - 186, 150],
  // Screen 6 — the tower's upper canopy.
  [5780, GROUND_Y - 370, 150],
  [5980, GROUND_Y - 300, 140],
  // Screen 7 — a high line over the catwalks, the route that skips the planks.
  // The chain is ledge(400) → block(380) → block(340) → here, and at -240 the
  // last hop was 110px against a ~103px jump, so the whole alternate route and
  // the pickup on it were stranded by 7px. -210/-248 restores the margin.
  [6560, GROUND_Y - 210, 150],
  [6780, GROUND_Y - 248, 150],
  // Screen 9 — the gauntlet's sniper perch approach.
  // Both sat exactly 100px above the block beside them — a 103px jump on
  // paper, unreachable in practice once the body's own height and the apex
  // slack are counted. Dropped to a comfortable 72/76px step.
  [8360, GROUND_Y - 262, 150],
  [8720, GROUND_Y - 272, 150],
  // Screen 11 — boss arena.
  // Was at -280, which is 218px above the 62px pillar beside it — no jump
  // chain reaches that, so the health pickup on it was uncollectable. Lowered
  // to one ordinary hop off the pillar top.
  [10150, GROUND_Y - 148, 160],
];

// Bridge planks over the screen-2 chasm — dynamic bodies pinned in place by a
// static "hinge" until shot or stood on too long, at which point they drop.
// Crossing is a timing problem rather than a jumping one.
// The plank tops sit FLUSH with the two ledges (both GROUND_Y - 60). A plank
// even a few pixels proud of the lip is a step the player has to jump, and the
// bridge stops being a timing puzzle and becomes six blind hops over a pit.
const PLANKS = [];
for (let i = 0; i < 6; i++) {
  PLANKS.push({ x: 2030 + i * 49, y: GROUND_Y - 60, w: 45, h: 12 });
}
// Act II's catwalk — the same idea, seven planks over a wider void, and this
// one has stepping platforms beside it so there are two ways across.
for (let i = 0; i < 7; i++) {
  PLANKS.push({ x: 6560 + i * 47, y: GROUND_Y - 70, w: 43, h: 12 });
}

// Enemy spawns — { type, x, y, patrol? }. `y` is the body centre; walkers get
// dropped onto whatever is under them by gravity on the first frames.
const ENEMY_SPAWNS = [
  // Screen 0 — three grunts, spaced so each is a separate beat.
  { type: "grunt", x: 560, y: GROUND_Y - 30, patrol: [500, 660] },
  { type: "grunt", x: 820, y: GROUND_Y - 30, patrol: [760, 920] },
  // Screen 1 — a grunt on the floor, a sniper up in the canopy.
  { type: "grunt", x: 1120, y: GROUND_Y - 30, patrol: [1020, 1240] },
  { type: "sniper", x: 1500, y: GROUND_Y - 370 },
  { type: "grunt", x: 1660, y: GROUND_Y - 90, patrol: [1600, 1760] },
  // Screen 2 — turrets covering the bridge, plus a jumper on the far side.
  // Seated ON the nest blocks (block top minus half the body height). Placed
  // by eye they floated ~11px clear of their own cover, which reads as a gun
  // hovering in mid-air.
  { type: "turret", x: 2395, y: GROUND_Y - 120 - 17 },
  { type: "turret", x: 2595, y: GROUND_Y - 150 - 17 },
  { type: "jumper", x: 2650, y: GROUND_Y - 80 },
  // Screen 3 — jumpers over the river; nothing to hide behind.
  { type: "jumper", x: 3080, y: GROUND_Y - 100 },
  { type: "jumper", x: 3280, y: GROUND_Y - 70 },
  { type: "sniper", x: 3520, y: GROUND_Y - 60 },
  // Screen 4 — the works.
  { type: "grunt", x: 3820, y: GROUND_Y - 70, patrol: [3760, 3940] },
  { type: "turret", x: 3993, y: GROUND_Y - 175 - 17 },
  { type: "jumper", x: 4120, y: GROUND_Y - 70 },
  { type: "grunt", x: 4230, y: GROUND_Y - 70, patrol: [4180, 4300] },
  { type: "sniper", x: 4350, y: GROUND_Y - 220 },
  { type: "turret", x: 4460, y: GROUND_Y - 40 - 17 },

  // ── ACT II ──────────────────────────────────────────────────────────────
  // Screen 5 — the trench: shooters in the galleries above, grunts at ground
  // level, so you are pressured from two heights at once.
  { type: "grunt", x: 4640, y: GROUND_Y - 30, patrol: [4560, 4760] },
  { type: "turret", x: 4770, y: GROUND_Y - 122 - 17 },
  { type: "grunt", x: 4960, y: GROUND_Y - 30, patrol: [4880, 5080] },
  { type: "turret", x: 5070, y: GROUND_Y - 186 - 17 },
  { type: "jumper", x: 5250, y: GROUND_Y - 40 },
  // Screen 6 — the tower: snipers hold the high ledges, so the climb is under
  // fire and stopping on a step is punished.
  { type: "sniper", x: 5500, y: GROUND_Y - 75 - 19 },
  { type: "grunt", x: 5700, y: GROUND_Y - 100, patrol: [5650, 5760] },
  { type: "sniper", x: 5690, y: GROUND_Y - 300 - 19 },
  { type: "jumper", x: 5950, y: GROUND_Y - 100 },
  { type: "sniper", x: 6100, y: GROUND_Y - 215 - 19 },
  // Screen 7 — the catwalks: turrets cover the crossing from the far side.
  { type: "turret", x: 6960, y: GROUND_Y - 70 - 17 },
  { type: "grunt", x: 7080, y: GROUND_Y - 100, patrol: [7000, 7160] },
  // Screen 8 — the flooded bay: jumpers, where a knockback means drowning.
  { type: "jumper", x: 7620, y: GROUND_Y - 130 },
  { type: "jumper", x: 7800, y: GROUND_Y - 90 },
  { type: "jumper", x: 7930, y: GROUND_Y - 150 },
  { type: "sniper", x: 8060, y: GROUND_Y - 80 },
  // Screen 9 — the gauntlet: the hardest fight, every type at once.
  { type: "grunt", x: 8330, y: GROUND_Y - 80, patrol: [8250, 8440] },
  { type: "turret", x: 8513, y: GROUND_Y - 190 - 17 },
  { type: "sniper", x: 8430, y: GROUND_Y - 290 - 19 },
  { type: "jumper", x: 8600, y: GROUND_Y - 80 },
  { type: "grunt", x: 8740, y: GROUND_Y - 80, patrol: [8680, 8840] },
  { type: "turret", x: 8900, y: GROUND_Y - 200 - 17 },
  { type: "jumper", x: 8960, y: GROUND_Y - 80 },
  // Screen 10 — the staging yard: a thinner screen, the breather before the
  // gate. Two grunts and one turret, so it is calm but not empty.
  { type: "grunt", x: 9300, y: GROUND_Y - 30, patrol: [9220, 9420] },
  // Seated on, and CENTRED on, the 78px crate spanning x 9560..9620. Both
  // axes have bitten here: the y was left behind when the crate was lowered
  // (turret floating), and x=9620 is the crate's right EDGE, so a 34px-wide
  // turret overhung it by half its body.
  { type: "turret", x: 9590, y: GROUND_Y - 78 - 17 },
  { type: "grunt", x: 9780, y: GROUND_Y - 30, patrol: [9700, 9860] },
  // Screen 11 — one escort; the rest is the boss.
  { type: "grunt", x: 10080, y: GROUND_Y - 30, patrol: [10000, 10140] },
];

// Weapon and health pickups, placed so a fresh weapon lands just before the
// fight that wants it: spread before the bridge turrets, machine before the
// river, laser before the boss.
const PICKUP_SPAWNS = [
  { kind: "spread",  x: 1480, y: GROUND_Y - 360 },
  // On the one-way canopy platform above the bridge (its top is GROUND_Y-210),
  // not hanging over the chasm where nothing could reach it.
  { kind: "health",  x: 2160, y: GROUND_Y - 210 - PICKUP_R - 4 },
  { kind: "machine", x: 2880, y: GROUND_Y - 120 },
  { kind: "health",  x: 3390, y: GROUND_Y - 145 },
  { kind: "spread",  x: 4100, y: GROUND_Y - 340 },
  { kind: "laser",   x: 4400, y: GROUND_Y - 250 },
  // ── ACT II ──────────────────────────────────────────────────────────────
  // Each sits just before the fight that wants it, same as Act I.
  { kind: "health",  x: 4740, y: GROUND_Y - 122 - PICKUP_R - 4 },
  { kind: "machine", x: 5040, y: GROUND_Y - 186 - PICKUP_R - 4 },
  { kind: "health",  x: 5690, y: GROUND_Y - 300 - PICKUP_R - 16 },
  { kind: "spread",  x: 5850, y: GROUND_Y - 370 - PICKUP_R - 4 },
  { kind: "health",  x: 6620, y: GROUND_Y - 210 - PICKUP_R - 4 },
  { kind: "laser",   x: 7040, y: GROUND_Y - 70 - PICKUP_R - 30 },
  { kind: "health",  x: 7640, y: GROUND_Y - 95 - PICKUP_R - 16 },
  { kind: "machine", x: 8420, y: GROUND_Y - 262 - PICKUP_R - 4 },
  { kind: "health",  x: 8790, y: GROUND_Y - 272 - PICKUP_R - 4 },
  { kind: "spread",  x: 9280, y: GROUND_Y - 50 - PICKUP_R - 16 },
  // The last two before the gate — a full kit for the boss.
  { kind: "laser",   x: 9700, y: GROUND_Y - PICKUP_R - 40 },
  { kind: "health",  x: 9840, y: GROUND_Y - PICKUP_R - 40 },
  { kind: "health",  x: 10210, y: GROUND_Y - 148 - PICKUP_R - 4 },
];

// Checkpoints — death sends you back to the last one crossed rather than to
// the start. A 5400px level with no checkpoints is a demo nobody finishes.
// One per screen boundary — an 10800px level with five checkpoints would make
// every death cost most of a minute of replayed ground.
const CHECKPOINTS = [
  120, 1820, 2740, 3720,          // Act I
  4540, 5420, 6320, 7220, 8220, 9020, 9920,   // Act II
];

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _player = null;
let _cc = null;
let _playerTag = null;
let _onewayTag = null;

let _hp = PLAYER_MAX_HP;
let _lives = START_LIVES;
let _score = 0;
let _weapon = "rifle";
let _fireCd = 0;
let _iframes = 0;
let _respawnT = 0;
let _checkpoint = 0;
let _frame = 0;
let _phase = "play";              // "play" | "dead" | "won" | "lost"
let _phaseT = 0;
let _restartLockUntil = 0;
let _elapsed = 0;                 // frames of play time, for the HUD clock

let _facing = 1;
// The pointer is remembered in SCREEN space, and the world aim point is
// recomputed from it every frame. Storing only the world point (which is what
// the runner hands to the pointer callbacks) makes the crosshair stick to a
// spot in the level: run without touching the mouse and the camera scrolls out
// from under a stale world coordinate, so you end up aiming behind you.
let _aim = { x: 0, y: 0 };            // world — derived, read by the game
let _aimScreen = { x: VIEW_W * 0.72, y: VIEW_H * 0.5 };
let _aimAngle = 0;
// The camera offset the last render pass used, kept ON the aim state because
// that is the only thing it serves. It has to come from the render pass and
// NOT from `runner.camera`: the getter reports the smoothed follow position
// without the shake, while the render pass is handed `camX + shakeOffX`. This
// demo shakes on every shot, so resolving the aim against the shake-free value
// would swing the crosshair against the shake — up to ±18px on the boss kill.
const _cam = { x: 0, y: 0 };
let _grounded = true;
let _crouching = false;
let _firedThisFrame = false;
let _jumpBuffer = 0;
let _prevJump = false;
let _jumpCut = false;      // variable-jump cut already applied this jump
let _wallPushLock = 0;     // frames left suppressing an into-wall push
let _wallPushDir = 0;      // which direction that suppressed push was
let _deathCamAnchor = null; // where the camera holds while dead

let _bullets = [];                // { body, dmg, life, pierce, hits, hitSet }
let _ebullets = [];
let _enemies = [];
let _pickups = [];
let _planks = [];
let _boss = null;
let _particles = [];              // pure-visual sparks/debris { x, y, vx, vy, t, life, color, r }
let _floaters = [];               // score popups { x, y, t, text, color }

const _keys = Object.create(null);
let _onKeyDown = null;
let _onKeyUp = null;
let _mouseDown = false;
let _isTouch = false;
let _runnerRef = null;      // demo-runner handle, for shakeCamera()

// 3D-only state — figures, styled terrain, the scene they belong to.
let _THREE = null;
let _playerFig = null;
let _figScene = null;
let _enemyFigs = new Map();       // enemy object → soldier handle
let _terrainStyled = null;
let _terrainBodies = [];
let _bgScene = null;
let _bgMeshes = [];
let _bossMesh = null;
let _bulletMeshPool = [];  // pooled 3D tracers, reused across shots
let _bulletMeshUsed = 0;
let _bulletMeshScene = null;
let _pickupMeshes = new Map();  // pickup record → its 3D mesh
let _pickupMeshScene = null;

// ── Construction helpers ──────────────────────────────────────────────────

// Terrain material: zero elasticity so nothing bounces off the level, high
// friction so the collide-and-slide controller has something to bite on.
// NOTE: no explicit Material is passed to any Polygon shape below — a known
// engine bug makes dynamic Polygons tunnel through static Polygon floors when
// either side carries an explicit Material, and this level is all boxes.
function addStaticBox(space, x, y, w, h, kind) {
  const b = new Body(BodyType.STATIC, new Vec2(x + w / 2, y + h / 2));
  const s = new Polygon(Polygon.box(w, h));
  s.filter = new InteractionFilter(G_TERRAIN, ~0);
  b.shapes.add(s);
  b.space = space;
  try {
    b.userData._kind = kind || "terrain";
    b.userData._box = { x, y, w, h };
  } catch (_) {}
  _terrainBodies.push(b);
  return b;
}

function addOneWay(space, x, y, w) {
  const h = 12;
  const b = new Body(BodyType.STATIC, new Vec2(x + w / 2, y + h / 2));
  const s = new Polygon(Polygon.box(w, h));
  s.filter = new InteractionFilter(G_ONEWAY, ~0);
  s.cbTypes.add(_onewayTag);
  b.shapes.add(s);
  b.space = space;
  try {
    b.userData._kind = "oneway";
    b.userData._box = { x, y, w, h };
  } catch (_) {}
  _terrainBodies.push(b);
  return b;
}

function buildWorld(space) {
  _terrainBodies = [];

  for (const [x, y, w, h] of GROUND_SLABS) addStaticBox(space, x, y, w, h, "ground");
  for (const [x, y, w, h] of BLOCKS) addStaticBox(space, x, y, w, h, "block");
  for (const [x, y, w] of ONEWAYS) addOneWay(space, x, y, w);

  // Level bookends — an invisible wall at each end so a sprint off the edge
  // isn't an instant death, and the boss has something to be backed against.
  addStaticBox(space, -60, GROUND_Y - 700, 40, 900, "bound");
  addStaticBox(space, WORLD_W + 20, GROUND_Y - 700, 40, 900, "bound");

  // Bridge planks — dynamic, but frozen as static until disturbed. Standing on
  // one starts a fuse; shooting one drops it immediately.
  _planks = [];
  for (const def of PLANKS) {
    const b = new Body(BodyType.STATIC, new Vec2(def.x + def.w / 2, def.y + def.h / 2));
    const s = new Polygon(Polygon.box(def.w, def.h));
    s.filter = new InteractionFilter(G_TERRAIN, ~0);
    b.shapes.add(s);
    b.space = space;
    try {
      b.userData._kind = "plank";
      b.userData._box = { x: def.x, y: def.y, w: def.w, h: def.h };
    } catch (_) {}
    _terrainBodies.push(b);
    _planks.push({ body: b, def, fuse: -1, fallen: false });
  }
}

function spawnPlayer(space, x, y) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // A capsule, not a box. A box player catches its bottom corner on every
  // ledge edge and wedges: walking into a crate leaves it grounded but unable
  // to move OR jump, because the corner contact eats the launch velocity. The
  // capsule's rounded foot slides over the same edge.
  // Capsule(width, height): width is the spine length, height the full
  // diameter. The shape is built lying along X, so the body is stood upright
  // below — passing them the other way round yields a 9px-wide sliver that
  // wedges into every corner in the level.
  const s = new Capsule(PLAYER_H, PLAYER_W);
  s.filter = new InteractionFilter(CHAR_GROUP | G_PLAYER, M_PLAYER);
  s.cbTypes.add(_playerTag);
  b.shapes.add(s);
  // The capsule's spine is built along X, so it has to be stood upright before
  // rotation is locked.
  b.rotation = Math.PI / 2;
  b.allowRotation = false;
  b.isBullet = true;
  b.space = space;
  try {
    b.userData._hidden3d = true;   // 3D draws the low-poly soldier instead
    b.userData._colorIdx = 2;      // green — the player, in the shared palette
  } catch (_) {}
  return b;
}

function spawnEnemy(space, spawn) {
  const def = ENEMY_DEFS[spawn.type];
  const b = new Body(BodyType.DYNAMIC, new Vec2(spawn.x, spawn.y));
  // Everything that walks is a capsule, same as the player — a box catches its
  // bottom corner on ledges. The turret is the exception: it is a dug-in gun
  // emplacement, not a person, so a box reads correctly and it never moves.
  let s;
  if (spawn.type === "turret") {
    s = new Polygon(Polygon.box(def.r * 2, def.h));
  } else {
    // Capsule(width, height): width is the spine, height the full diameter.
    s = new Capsule(def.h, def.r * 2);
  }
  s.filter = new InteractionFilter(G_ENEMY, M_ENEMY);
  b.shapes.add(s);
  // The capsule spine is built along X, so stand it up before locking rotation.
  if (spawn.type !== "turret") b.rotation = Math.PI / 2;
  b.allowRotation = false;
  b.space = space;
  try {
    b.userData._hidden3d = true;   // 3D draws the low-poly soldier instead
    b.userData._colorIdx = ENEMY_COLOR_IDX[spawn.type];
  } catch (_) {}

  const e = {
    body: b,
    type: spawn.type,
    def,
    hp: def.hp,
    maxHp: def.hp,
    fireCd: 20 + Math.floor(Math.random() * def.fireCd),
    patrol: spawn.patrol || null,
    dir: spawn.patrol ? 1 : -1,
    face: -1,
    grounded: false,
    leapCd: 0,
    telegraph: 0,       // sniper wind-up frames remaining
    dead: 0,            // death animation blend, 0..1
    hitFlash: 0,
    aim: Math.PI,       // world-space aim angle
    home: { x: spawn.x, y: spawn.y },
  };
  // Turrets never move; freezing them as kinematic keeps recoil and bullet
  // impacts from nudging the emplacement off its perch.
  if (spawn.type === "turret") {
    b.type = BodyType.KINEMATIC;
  }
  return e;
}

function spawnPickup(space, def) {
  const b = new Body(BodyType.STATIC, new Vec2(def.x, def.y));
  const s = new Circle(PICKUP_R);
  s.sensorEnabled = true;
  s.filter = new InteractionFilter(G_PICKUP, G_PLAYER | CHAR_GROUP);
  b.shapes.add(s);
  b.space = space;
  try {
    b.userData._hidden3d = true;
    b.userData._hidden = true;     // 2D draws the labelled icon instead
  } catch (_) {}
  return { body: b, kind: def.kind, taken: false, baseY: def.y, y: def.y, x: def.x };
}

function spawnBoss(space) {
  const b = new Body(BodyType.KINEMATIC, new Vec2(BOSS_X, BOSS_Y));
  const s = new Polygon(Polygon.box(BOSS_R * 1.6, BOSS_R * 1.9));
  // Terrain only. Bullet hits on the boss are resolved by hand (armour vs
  // core), so letting the physics stop a bullet on the hull would consume it
  // at the outer face and the core could never be reached at all.
  s.filter = new InteractionFilter(G_ENEMY, G_TERRAIN);
  b.shapes.add(s);
  b.space = space;
  try {
    b.userData._hidden3d = true;   // 3D builds the emplacement mesh instead
    b.userData._colorIdx = 3;      // red hull
  } catch (_) {}
  return {
    body: b,
    hp: BOSS_HP,
    state: "recover",       // starts in recovery, so entering the arena is safe
    stateT: 90,
    shotsLeft: 0,
    attack: "volley",
    attackIdx: 0,
    lockAim: Math.PI,
    sweep: 0,
    dead: 0,
    hitFlash: 0,
    rage: false,
    spawnCd: 200,
    active: false,      // wakes when the player enters the arena
  };
}

// ── Combat ───────────────────────────────────────────────────────────────

function fireBullet(x, y, angle, opts) {
  const {
    speed = BULLET_SPEED, r = BULLET_R, dmg = 1, pierce = false,
    enemy = false, life = BULLET_LIFE,
    // "bullet" (default) | "rocket" (homes) | "mortar" (arcs under gravity).
    kind = "bullet",
  } = opts || {};
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const s = new Circle(r);
  s.filter = enemy
    ? new InteractionFilter(G_EBULLET, M_EBULLET)
    : new InteractionFilter(G_PBULLET, M_PBULLET);
  b.shapes.add(s);
  b.allowRotation = false;
  b.isBullet = true;
  // Bullets are not affected by gravity — a run-and-gun bullet that drops is
  // a simulation nobody asked for, and it makes the sniper unaimable.
  b.gravMass = 0;
  b.space = _space;
  b.velocity = new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
  // Hidden from the adapter's generic body pass — the 3D renderer draws its own
  // emissive tracer for each bullet instead (see syncBulletMeshes), because the
  // default grey box is invisible against the terrain at bullet scale.
  try { b.userData._hidden3d = true; } catch (_) {}

  const rec = {
    body: b, dmg, life, pierce, hits: 0, angle, hitSet: null, mesh: null,
    kind, vy: Math.sin(angle) * speed, vx: Math.cos(angle) * speed, speed,
  };
  (enemy ? _ebullets : _bullets).push(rec);
  return rec;
}

function killBullet(rec, list) {
  if (rec.body && rec.body.space) rec.body.space = null;
  rec.body = null;
  const i = list.indexOf(rec);
  if (i >= 0) list.splice(i, 1);
}

function playerFire() {
  if (_fireCd > 0 || _phase !== "play" || _respawnT > 0) return;
  const w = WEAPONS[_weapon];
  _fireCd = w.cd;
  _firedThisFrame = true;

  // The muzzle sits at the end of the aim arm, so the bullet leaves from where
  // the gun is drawn rather than from the body centre — otherwise shots fired
  // point-blank spawn *behind* the enemy you are touching.
  const muzzle = PLAYER_R + 22;
  const ox = _player.position.x + Math.cos(_aimAngle) * muzzle;
  const oy = _player.position.y + Math.sin(_aimAngle) * muzzle - 4;

  for (let i = 0; i < w.pellets; i++) {
    // Pellets fan symmetrically around the aim line; a single-pellet weapon
    // gets its (tiny) spread applied as jitter instead.
    const t = w.pellets === 1 ? (Math.random() - 0.5) : (i / (w.pellets - 1) - 0.5);
    const a = _aimAngle + t * w.spread * (w.pellets === 1 ? 1 : 2);
    fireBullet(ox, oy, a, {
      speed: w.speed, r: w.r || BULLET_R, dmg: w.dmg, pierce: !!w.pierce,
    });
  }
  addParticles(ox, oy, 3, w.color, 2.2, 90);
  if (_runnerRef) _runnerRef.shakeCamera(_weapon === "laser" ? 5 : 2, 0.08);
}

function enemyFire(e, angle) {
  const def = e.def;
  const sniper = e.type === "sniper";
  const muzzle = def.r + 14;
  fireBullet(
    e.body.position.x + Math.cos(angle) * muzzle,
    e.body.position.y + Math.sin(angle) * muzzle - 4,
    angle,
    {
      enemy: true,
      speed: sniper ? SNIPER_BULLET_SPEED : ENEMY_BULLET_SPEED,
      r: ENEMY_BULLET_R,
      dmg: def.dmg,
      life: 150,
    },
  );
  addParticles(
    e.body.position.x + Math.cos(angle) * muzzle,
    e.body.position.y + Math.sin(angle) * muzzle,
    2, "#ff9f43", 2, 70,
  );
}

function damageEnemy(e, dmg, ix, iy) {
  if (e.dead > 0) return false;
  e.hp -= dmg;
  e.hitFlash = 8;
  addParticles(ix, iy, 5, "#ffe08a", 2.4, 120);
  if (e.hp <= 0) {
    e.dead = 0.001;                 // >0 starts the death animation
    e.body.space = null;            // stops colliding immediately
    _score += e.def.score;
    addFloater(e.body.position.x, e.body.position.y - 24, `+${e.def.score}`, "#ffe08a");
    addParticles(e.body.position.x, e.body.position.y, 16, e.def.color, 3.4, 190);
    if (_runnerRef) _runnerRef.shakeCamera(6, 0.16);
    return true;
  }
  return false;
}

function damagePlayer(dmg) {
  if (_iframes > 0 || _phase !== "play" || _respawnT > 0) return;
  _hp -= dmg;
  _iframes = PLAYER_IFRAMES;
  addParticles(_player.position.x, _player.position.y, 10, "#ff6b6b", 3, 140);
  if (_runnerRef) _runnerRef.shakeCamera(9, 0.24);
  if (_hp <= 0) killPlayer();
}

function killPlayer() {
  _lives--;
  _hp = 0;
  addParticles(_player.position.x, _player.position.y, 24, "#ff6b6b", 4, 230);
  if (_runnerRef) _runnerRef.shakeCamera(14, 0.4);

  // Park the corpse. The camera follows the player body, so a death mid-run —
  // especially a fall into a pit, where nothing ever stops the body — otherwise
  // keeps dragging the view sideways and downwards forever while the respawn
  // banner is up. Pinning it at the last on-level position also means the death
  // beat is shown where it happened rather than somewhere under the map.
  _player.velocity = new Vec2(0, 0);
  _deathCamAnchor = {
    x: _player.position.x,
    y: Math.min(_player.position.y, WORLD_H - 60),
  };
  if (_lives <= 0) {
    _phase = "lost";
    _phaseT = 0;
    _restartLockUntil = _frame + 60;
  } else {
    _respawnT = RESPAWN_FRAMES;
  }
}

// Keep the dead player's body exactly where killPlayer parked it. The runner
// lerps its camera toward the follow body every tick, so simply zeroing the
// velocity once is not enough — gravity re-accelerates it the next frame.
function holdDeathCamera() {
  if (!_deathCamAnchor || !_player) return;
  _player.position = new Vec2(_deathCamAnchor.x, _deathCamAnchor.y);
  _player.velocity = new Vec2(0, 0);
}

function respawn() {
  _deathCamAnchor = null;
  _hp = PLAYER_MAX_HP;
  _iframes = PLAYER_IFRAMES;
  // Weapons are lost on death — Contra's rule, and it is what makes the
  // pickups worth detouring for on the next attempt.
  _weapon = "rifle";
  _player.position = new Vec2(CHECKPOINTS[_checkpoint], GROUND_Y - 120);
  _player.velocity = new Vec2(0, 0);

  // Re-arm every enemy ahead of the checkpoint. Without this a death after a
  // long push leaves an empty level, and the retry is a walk rather than a run.
  for (const e of _enemies) {
    if (e.home.x < CHECKPOINTS[_checkpoint] - 200) continue;
    if (e.dead > 0 && e.dead < 1) continue;
    if (e.dead >= 1) {
      e.dead = 0;
      e.hp = e.maxHp;
      e.body.position = new Vec2(e.home.x, e.home.y);
      e.body.velocity = new Vec2(0, 0);
      e.body.space = _space;
    }
  }
  clearBullets();
}

function clearBullets() {
  for (const b of _bullets) if (b.body?.space) b.body.space = null;
  for (const b of _ebullets) if (b.body?.space) b.body.space = null;
  _bullets = [];
  _ebullets = [];
}

// ── Enemy AI ─────────────────────────────────────────────────────────────

function hasLineOfSight(fromX, fromY, toX, toY) {
  // A cheap segment-vs-AABB sweep against the level boxes. A real raycast
  // through the space would also hit enemies and bullets, which is not what
  // "can this enemy see the player" means — so the geometry is walked directly.
  const dx = toX - fromX, dy = toY - fromY;
  const steps = Math.min(48, Math.max(6, Math.ceil(Math.hypot(dx, dy) / 26)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = fromX + dx * t, py = fromY + dy * t;
    for (const b of _terrainBodies) {
      const bx = b.userData?._box;
      if (!bx || b.userData._kind === "oneway" || b.userData._kind === "bound") continue;
      if (px > bx.x && px < bx.x + bx.w && py > bx.y && py < bx.y + bx.h) return false;
    }
  }
  return true;
}

function tickEnemy(e) {
  if (e.dead > 0) {
    e.dead = Math.min(1, e.dead + 0.06);
    return;
  }
  if (e.hitFlash > 0) e.hitFlash--;

  const px = _player.position.x, py = _player.position.y;
  const ex = e.body.position.x, ey = e.body.position.y;
  const dx = px - ex, dy = py - ey;
  const dist = Math.hypot(dx, dy);
  const def = e.def;

  // Enemies well off-screen are skipped entirely — a level this long would
  // otherwise run five screens of AI and bullets you never see.
  const offscreen = Math.abs(dx) > VIEW_W * 0.85;
  if (offscreen) {
    if (e.type !== "turret" && e.grounded) e.body.velocity = new Vec2(0, e.body.velocity.y);
    return;
  }

  const dead = _respawnT > 0 || _phase !== "play";
  const canSee = !dead && dist < def.range && hasLineOfSight(ex, ey - 6, px, py);

  // Ground check: a short downward probe against the level boxes, which is
  // enough for walkers and avoids giving every grunt its own controller.
  e.grounded = probeGround(ex, ey, def);

  if (e.type === "grunt") {
    if (canSee) {
      // Stand and shoot, facing the player.
      e.face = dx >= 0 ? 1 : -1;
      e.body.velocity = new Vec2(e.body.velocity.x * 0.8, e.body.velocity.y);
      if (--e.fireCd <= 0) {
        e.fireCd = def.fireCd + Math.floor(Math.random() * 24);
        e.aim = Math.atan2(dy, dx);
        enemyFire(e, e.aim);
      }
    } else if (e.patrol) {
      if (ex <= e.patrol[0]) e.dir = 1;
      if (ex >= e.patrol[1]) e.dir = -1;
      e.face = e.dir;
      e.body.velocity = new Vec2(def.speed * e.dir, e.body.velocity.y);
      e.aim = e.dir > 0 ? 0 : Math.PI;
    }
  } else if (e.type === "turret") {
    e.face = dx >= 0 ? 1 : -1;
    if (canSee) {
      e.aim = Math.atan2(dy, dx);
      if (--e.fireCd <= 0) {
        e.fireCd = def.fireCd;
        // Two-round burst with a little scatter — a single perfect shot from a
        // static gun is either free damage or trivially dodged; a burst makes
        // strafing the right answer.
        enemyFire(e, e.aim + (Math.random() - 0.5) * 0.12);
      }
    } else {
      e.aim = e.face > 0 ? 0 : Math.PI;
    }
  } else if (e.type === "jumper") {
    // No gun: closes the gap and leaps. The leap is what makes it dangerous —
    // a ground-only chaser is outrun by walking backward.
    e.face = dx >= 0 ? 1 : -1;
    e.aim = Math.atan2(dy, dx);
    if (e.leapCd > 0) e.leapCd--;
    if (canSee || dist < def.range) {
      const vx = def.speed * Math.sign(dx || 1);
      if (e.grounded) {
        e.body.velocity = new Vec2(vx, e.body.velocity.y);
        const wantLeap = e.leapCd <= 0 && (dist < 150 || dy < -40);
        if (wantLeap) {
          e.leapCd = JUMPER_LEAP_CD;
          e.body.velocity = new Vec2(
            JUMPER_LEAP_VX * Math.sign(dx || 1),
            JUMPER_LEAP_VY,
          );
        }
      } else {
        // Some air control so a leap that starts slightly wrong still lands.
        e.body.velocity = new Vec2(
          e.body.velocity.x * 0.98 + vx * 0.02,
          e.body.velocity.y,
        );
      }
    }
    // Contact damage — the jumper's whole threat.
    if (dist < def.r + PLAYER_R + 6) damagePlayer(def.dmg);
  } else if (e.type === "sniper") {
    e.face = dx >= 0 ? 1 : -1;
    if (canSee) {
      e.aim = Math.atan2(dy, dx);
      if (e.telegraph > 0) {
        // Locked on: the aim keeps tracking but the shot is committed, so a
        // dodge during the wind-up actually works.
        if (--e.telegraph === 0) enemyFire(e, e.aim);
      } else if (--e.fireCd <= 0) {
        e.fireCd = def.fireCd + Math.floor(Math.random() * 40);
        e.telegraph = 34;      // ~0.55s of visible laser sight before firing
      }
    } else {
      e.telegraph = 0;
      e.aim = e.face > 0 ? 0 : Math.PI;
    }
  }
}

// Short downward probe used by the walkers — true if solid ground sits just
// under the body's feet.
function probeGround(ex, ey, def) {
  const feet = ey + def.h / 2;
  for (const b of _terrainBodies) {
    const bx = b.userData?._box;
    if (!bx || b.userData._kind === "bound") continue;
    if (ex < bx.x - def.r || ex > bx.x + bx.w + def.r) continue;
    if (feet >= bx.y - 6 && feet <= bx.y + 14) return true;
  }
  return false;
}

// ── Boss ─────────────────────────────────────────────────────────────────

function tickBoss() {
  const b = _boss;
  if (!b || b.dead > 0) {
    if (b && b.dead > 0 && b.dead < 1) b.dead = Math.min(1, b.dead + 0.012);
    return;
  }
  if (b.hitFlash > 0) b.hitFlash--;

  const px = _player.position.x, py = _player.position.y;
  if (!b.active) {
    if (px > BOSS_X - VIEW_W * 0.75) b.active = true;
    else return;
  }
  if (_respawnT > 0 || _phase !== "play") return;

  b.rage = b.hp <= BOSS_HP * 0.5;
  b.sweep += b.rage ? 0.05 : 0.028;

  const windup = b.rage ? BOSS_RAGE_WINDUP : BOSS_WINDUP;
  const shots = b.rage ? BOSS_RAGE_BURST : BOSS_BURST;
  const recover = b.rage ? BOSS_RAGE_RECOVER : BOSS_RECOVER;

  // A three-state cycle: charge (visible), fire (a burst), recover (a window
  // the player can push into). `b.state` drives the barrel glow in both
  // renderers, so what the boss is about to do is always readable.
  if (b.state === "charge") {
    if (--b.stateT <= 0) {
      // Lock the aim at the END of the wind-up, at where the player is NOW.
      // Re-aiming per shot is what made this unavoidable.
      b.lockAim = Math.atan2(py - BOSS_Y, px - BOSS_X);
      b.state = "fire";
      b.shotsLeft = b.attack === "volley" ? shots : (b.attack === "rocket" ? 2 : 3);
      b.stateT = 0;
    }
  } else if (b.state === "fire") {
    if (--b.stateT <= 0) {
      const i = shots - b.shotsLeft;
      const muzzleX = BOSS_X + Math.cos(b.lockAim) * BOSS_R;
      const muzzleY = BOSS_Y + Math.sin(b.lockAim) * BOSS_R;

      if (b.attack === "rocket") {
        // One rocket per volley slot, launched wide so a pair converges on the
        // player from two sides rather than flying in file.
        const a = b.lockAim + (i - (shots - 1) / 2) * 0.55;
        const rec = fireBullet(muzzleX, muzzleY, a, {
          enemy: true, kind: "rocket", speed: BOSS_ROCKET_SPEED,
          r: BOSS_ROCKET_R, dmg: BOSS_BLAST_DMG, life: BOSS_ROCKET_LIFE,
        });
        rec.angle = a;
        addParticles(muzzleX, muzzleY, 6, "#ff9f43", 3, 140);
      } else if (b.attack === "mortar") {
        // Lobbed to LAND on the player: solve the arc for a fixed flight time,
        // so the shell arrives where they are standing now and camping in one
        // spot is the thing it punishes.
        const flight = 1.15;
        const tx = _player.position.x + (i - (shots - 1) / 2) * 90;
        const ty = _player.position.y;
        const vx = (tx - muzzleX) / flight;
        const vy = (ty - muzzleY - 0.5 * BOSS_MORTAR_GRAV * flight * flight) / flight;
        const a = Math.atan2(vy, vx);
        const sp = Math.hypot(vx, vy);
        const rec = fireBullet(muzzleX, muzzleY - 20, a, {
          enemy: true, kind: "mortar", speed: sp,
          r: BOSS_MORTAR_R, dmg: BOSS_BLAST_DMG, life: BOSS_MORTAR_LIFE,
        });
        rec.angle = a;
        addParticles(muzzleX, muzzleY - 20, 5, "#c9d1d9", 2.4, 120);
      } else {
        // Fan the burst around the locked angle rather than stacking it.
        const a = b.lockAim + (i - (shots - 1) / 2) * BOSS_SPREAD;
        fireBullet(
          BOSS_X + Math.cos(a) * BOSS_R,
          BOSS_Y + Math.sin(a) * BOSS_R,
          a,
          { enemy: true, speed: ENEMY_BULLET_SPEED, r: ENEMY_BULLET_R + 1, dmg: 1, life: 170 },
        );
        addParticles(
          BOSS_X + Math.cos(a) * BOSS_R, BOSS_Y + Math.sin(a) * BOSS_R,
          3, "#ff9f43", 2, 90,
        );
      }

      b.stateT = b.attack === "volley" ? BOSS_BURST_GAP : BOSS_BURST_GAP * 2;
      if (--b.shotsLeft <= 0) {
        b.state = "recover";
        b.stateT = recover;
      }
    }
  } else {
    if (--b.stateT <= 0) {
      // Rotate the attack. Phase 1 is volleys only — the fight has to teach
      // its own read before it starts layering on ordnance. Phase 2 cycles
      // volley → rocket → mortar, so no single piece of cover ever answers
      // everything: pillars beat the volley, distance beats the rocket, and
      // moving beats the mortar.
      b.attack = b.rage ? BOSS_ATTACKS[b.attackIdx++ % BOSS_ATTACKS.length] : "volley";
      b.state = "charge";
      b.stateT = windup;
    }
  }

  // Phase 2 also calls in jumpers, capped so the arena never floods. The cap
  // counts ESCORTS only — tagging them matters because the level holds a dozen
  // jumpers of its own, and counting every jumper alive anywhere meant the cap
  // was permanently full and the boss never called in a single one.
  if (b.rage && --b.spawnCd <= 0) {
    b.spawnCd = 260;
    const live = _enemies.filter(e => e.dead === 0 && e.escort).length;
    if (live < 3) {
      const e = spawnEnemy(_space, {
        type: "jumper",
        // Beside the emplacement rather than behind the pillars, so an escort
        // starts on the same side of the cover as the player.
        x: BOSS_X - 150,
        y: GROUND_Y - 60,
      });
      e.escort = true;
      _enemies.push(e);
    }
  }
}

function damageBoss(dmg, ix, iy) {
  const b = _boss;
  if (!b || b.dead > 0 || !b.active) return;
  b.hp -= dmg;
  b.hitFlash = 8;
  addParticles(ix, iy, 6, "#ffd166", 3, 140);
  if (b.hp <= 0) {
    b.dead = 0.001;
    b.body.space = null;
    _score += 2000;
    addFloater(BOSS_X, BOSS_Y - 60, "+2000", "#ffe08a");
    addParticles(BOSS_X, BOSS_Y, 60, "#ff9f43", 6, 300);
    if (_runnerRef) _runnerRef.shakeCamera(22, 0.9);
    _phase = "won";
    _phaseT = 0;
    _restartLockUntil = _frame + 90;
  }
}

// ── Effects ──────────────────────────────────────────────────────────────
// Sparks and score popups are pure visuals — plain integrated points rather
// than physics bodies. A muzzle flash per shot would otherwise put hundreds of
// short-lived bodies through the broadphase for no gameplay reason.

// Pointer callbacks receive world coords; store the screen position they imply
// under the camera as of this frame.
function setAim(worldX, worldY) {
  _aimScreen.x = worldX - _cam.x;
  _aimScreen.y = worldY - _cam.y;
  _aim.x = worldX;
  _aim.y = worldY;
}

function addParticles(x, y, n, color, spread, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.65);
    _particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 20,
      t: 0,
      life: 18 + Math.random() * 26,
      color,
      r: 1 + Math.random() * spread,
    });
  }
  // Hard cap — a long fight in the emplacement can otherwise accumulate a few
  // thousand points and the overlay becomes the frame budget.
  if (_particles.length > 420) _particles.splice(0, _particles.length - 420);
}

function addFloater(x, y, text, color) {
  _floaters.push({ x, y, t: 0, life: 55, text, color });
}

function tickEffects() {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.t++;
    if (p.t >= p.life) { _particles.splice(i, 1); continue; }
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.vy += 520 * DT;
    p.vx *= 0.97;
  }
  for (let i = _floaters.length - 1; i >= 0; i--) {
    const f = _floaters[i];
    f.t++;
    if (f.t >= f.life) { _floaters.splice(i, 1); continue; }
    f.y -= 0.6;
  }
}

// ── Bullet stepping ──────────────────────────────────────────────────────
//
// Collisions are resolved by hand against enemy/terrain AABBs rather than by
// InteractionListeners. The reason is piercing: a laser has to pass *through*
// an enemy and keep going, which a collision callback cannot express — the
// engine has already stopped the body by the time the callback runs. Doing it
// manually also means a bullet is destroyed on the frame it hits, so nothing
// ever visibly rests against a wall.

function segHitsBox(x0, y0, x1, y1, bx, r) {
  // Swept-circle vs AABB, sampled. Bullet speeds here are up to 1150 px/s
  // (19 px/frame) against 46px-wide boxes, so a handful of samples along the
  // segment is exact enough and far cheaper than a proper swept test.
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
    if (px > bx.x - r && px < bx.x + bx.w + r && py > bx.y - r && py < bx.y + bx.h + r) {
      return { x: px, y: py };
    }
  }
  return null;
}

// Swept-circle vs circle, sampled the same way as segHitsBox.
function segHitsCircle(x0, y0, x1, y1, cx, cy, r) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
    if (Math.hypot(px - cx, py - cy) <= r) return { x: px, y: py };
  }
  return null;
}

function tickBullets() {
  // Player bullets → terrain, planks, enemies, boss.
  for (let i = _bullets.length - 1; i >= 0; i--) {
    const rec = _bullets[i];
    if (!rec.body) { _bullets.splice(i, 1); continue; }
    if (--rec.life <= 0) { killBullet(rec, _bullets); continue; }

    const pos = rec.body.position;
    const v = rec.body.velocity;
    const x0 = pos.x - v.x * DT, y0 = pos.y - v.y * DT;

    let consumed = false;

    // Enemies first — a bullet that would hit both a grunt and the wall behind
    // it should kill the grunt.
    for (const e of _enemies) {
      if (e.dead > 0) continue;
      // A piercing shot keeps travelling, so it would otherwise re-hit the
      // same enemy every frame it overlaps them and delete the whole screen.
      if (rec.hitSet && rec.hitSet.has(e)) continue;
      const d = e.def;
      const eb = {
        x: e.body.position.x - d.r, y: e.body.position.y - d.h / 2,
        w: d.r * 2, h: d.h,
      };
      const hit = segHitsBox(x0, y0, pos.x, pos.y, eb, BULLET_R);
      if (!hit) continue;
      damageEnemy(e, rec.dmg, hit.x, hit.y);
      rec.hits++;
      if (rec.pierce) {
        (rec.hitSet ||= new Set()).add(e);
        // Punches through three bodies, then stops — unlimited piercing
        // trivialises the emplacement, where six enemies line up.
        if (rec.hits >= 3) consumed = true;
      } else {
        consumed = true;
      }
      break;
    }

    if (!consumed && _boss && _boss.dead === 0 && _boss.active) {
      // The core is tested FIRST, against the whole travelled segment. Testing
      // the armour box first and then measuring from that hit point can never
      // work: the box is entered at its outer face, which is always further
      // from the core than the core's own radius, so every shot spark off and
      // the boss is invulnerable.
      const core = segHitsCircle(x0, y0, pos.x, pos.y, BOSS_X, BOSS_Y - 6, BOSS_CORE_R + BULLET_R);
      if (core) {
        damageBoss(rec.dmg, core.x, core.y);
        consumed = true;
      } else {
        // The plating covers the hull but stops short of the core's own
        // column, so the core is genuinely exposed from the front. A box that
        // spans the whole boss shields a core sitting at its centre from every
        // approach angle, and the fight becomes unwinnable.
        const bb = {
          x: BOSS_X - BOSS_R * 0.15, y: BOSS_Y - BOSS_R * 0.95,
          w: BOSS_R * 0.95, h: BOSS_R * 1.9,
        };
        const hit = segHitsBox(x0, y0, pos.x, pos.y, bb, BULLET_R);
        if (hit) {
          // Armour plating — shots spark off it, which is what makes the boss
          // a positioning fight rather than a hold-fire-and-win.
          addParticles(hit.x, hit.y, 4, "#adb5bd", 2, 130);
          consumed = true;
        }
      }
    }

    if (!consumed) {
      for (const b of _terrainBodies) {
        const bx = b.userData?._box;
        if (!bx || b.userData._kind === "oneway") continue;
        const hit = segHitsBox(x0, y0, pos.x, pos.y, bx, BULLET_R);
        if (!hit) continue;
        // A plank is NOT dropped by the player's own fire. Shooting one out
        // sounds like a fun option, but the run-and-gun reality is that you
        // cross the bridge holding the trigger down while two turrets shoot
        // back — a stray pellet from your own suppressing fire deletes the
        // floor a step ahead of you, and the chasm becomes a coin flip nobody
        // can read. (Headless playthroughs lost both spare lives here every
        // time, to a plank the player had shot away themselves.) Weight is the
        // one thing that drops a plank, which keeps the crossing a timing
        // decision the player is actually making.
        addParticles(hit.x, hit.y, 4, "#8d9aa8", 2, 110);
        consumed = true;
        break;
      }
    }

    if (consumed) killBullet(rec, _bullets);
  }

  // Steer the boss's guided/arcing ordnance before the impact tests below, so
  // a rocket that turns into a wall this frame is resolved this frame.
  for (const rec of _ebullets) {
    if (!rec.body || rec.kind === "bullet") continue;
    const v = rec.body.velocity;
    if (rec.kind === "rocket") {
      // Turn toward the player at a capped rate. The cap is the whole design:
      // fast enough that ignoring it kills you, slow enough that a sharp turn
      // or a pillar breaks the lock.
      const want = Math.atan2(
        _player.position.y - rec.body.position.y,
        _player.position.x - rec.body.position.x,
      );
      let d = want - rec.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      rec.angle += Math.max(-BOSS_ROCKET_TURN, Math.min(BOSS_ROCKET_TURN, d));
      rec.body.velocity = new Vec2(
        Math.cos(rec.angle) * rec.speed,
        Math.sin(rec.angle) * rec.speed,
      );
      if (_frame % 3 === 0) {
        addParticles(rec.body.position.x, rec.body.position.y, 1, "#ff9f43", 1.6, 30);
      }
    } else if (rec.kind === "mortar") {
      // Bombs are the one projectile that falls. Integrated by hand because
      // every projectile body has gravMass = 0 (a run-and-gun bullet must fly
      // flat), so the space's gravity never touches them.
      const nvy = v.y + BOSS_MORTAR_GRAV * DT;
      rec.body.velocity = new Vec2(v.x, nvy);
      rec.angle = Math.atan2(nvy, v.x);
      if (_frame % 4 === 0) {
        addParticles(rec.body.position.x, rec.body.position.y, 1, "#c9d1d9", 1.4, 24);
      }
    }
  }

  // Enemy bullets → terrain and the player.
  for (let i = _ebullets.length - 1; i >= 0; i--) {
    const rec = _ebullets[i];
    if (!rec.body) { _ebullets.splice(i, 1); continue; }
    if (--rec.life <= 0) { killBullet(rec, _ebullets); continue; }

    const pos = rec.body.position;
    const v = rec.body.velocity;
    const x0 = pos.x - v.x * DT, y0 = pos.y - v.y * DT;

    const rad = rec.kind === "rocket" ? BOSS_ROCKET_R
      : rec.kind === "mortar" ? BOSS_MORTAR_R : ENEMY_BULLET_R;
    const explosive = rec.kind !== "bullet";

    let consumed = false;
    let ix = pos.x, iy = pos.y;
    if (_respawnT <= 0 && _phase === "play") {
      const pb = {
        x: _player.position.x - PLAYER_W / 2, y: _player.position.y - PLAYER_H / 2,
        w: PLAYER_W, h: PLAYER_H,
      };
      const hit = segHitsBox(x0, y0, pos.x, pos.y, pb, rad);
      if (hit) {
        ix = hit.x; iy = hit.y;
        // Explosives do their damage through the blast below, so a direct hit
        // must not also apply the contact damage — that would double it.
        if (!explosive) damagePlayer(rec.dmg);
        consumed = true;
      }
    }
    if (!consumed) {
      for (const b of _terrainBodies) {
        const bx = b.userData?._box;
        if (!bx || b.userData._kind === "oneway" || b.userData._kind === "bound") continue;
        const hit = segHitsBox(x0, y0, pos.x, pos.y, bx, rad);
        if (!hit) continue;
        ix = hit.x; iy = hit.y;
        if (!explosive) addParticles(hit.x, hit.y, 3, "#ff9f43", 2, 100);
        consumed = true;
        break;
      }
    }
    // A bomb that runs out of life detonates where it is rather than blinking
    // out — an unexploded shell landing harmlessly reads as a bug.
    if (!consumed && explosive && rec.life <= 1) consumed = true;

    if (consumed) {
      if (explosive) detonate(ix, iy);
      killBullet(rec, _ebullets);
    }
  }
}

// Splash from a boss rocket or bomb. Damage falls off with distance, so the
// edge of a blast is survivable and diving away actually pays.
function detonate(x, y) {
  addParticles(x, y, 26, "#ff9f43", 4.2, 260);
  addParticles(x, y, 10, "#ffe08a", 3, 180);
  if (_runnerRef) _runnerRef.shakeCamera(13, 0.3);
  if (_respawnT > 0 || _phase !== "play") return;
  const d = Math.hypot(_player.position.x - x, _player.position.y - y);
  if (d > BOSS_BLAST_R) return;
  // Full damage at the centre, one point at the fringe.
  const dmg = d < BOSS_BLAST_R * 0.45 ? BOSS_BLAST_DMG : 1;
  damagePlayer(dmg);
}

// ── Bridge planks ────────────────────────────────────────────────────────

function dropPlank(pl) {
  pl.fallen = true;
  pl.body.type = BodyType.DYNAMIC;
  pl.body.allowRotation = true;
  // A shove so it tumbles rather than sinking straight down — a plank that
  // drops vertically reads as a rendering glitch.
  pl.body.velocity = new Vec2((Math.random() - 0.5) * 60, 40);
  pl.body.angularVel = (Math.random() - 0.5) * 4;
  addParticles(pl.def.x + pl.def.w / 2, pl.def.y, 6, "#a0703c", 2.6, 130);
}

function tickPlanks() {
  for (const pl of _planks) {
    if (pl.fallen) {
      // Recycle a plank once it is well below the level so the body count
      // stays flat over a long session.
      if (pl.body.position.y > WORLD_H + 300 && pl.body.space) {
        pl.body.space = null;
      }
      continue;
    }
    // Standing on a plank lights a fuse; stepping off lets it recover, so a
    // quick crossing is safe and a slow one is not.
    const px = _player.position.x, py = _player.position.y;
    const on = _grounded
      && px > pl.def.x - 8 && px < pl.def.x + pl.def.w + 8
      && Math.abs((py + PLAYER_H / 2) - pl.def.y) < 12;
    if (on) {
      // ~1.7s before a plank gives way. A shorter fuse (0.7s was tried) reads
      // as a fair timing puzzle when you sprint straight across, but the
      // bridge is covered by two turrets — the moment return fire slows you to
      // a fighting pace the crossing becomes an unavoidable death, which is
      // where a headless run-through kept losing both spare lives.
      if (pl.fuse < 0) pl.fuse = PLANK_FUSE;
      else if (--pl.fuse <= 0) dropPlank(pl);
    } else if (pl.fuse >= 0) {
      pl.fuse = Math.min(PLANK_FUSE, pl.fuse + 2);
      if (pl.fuse >= PLANK_FUSE) pl.fuse = -1;
    }
  }
}

// ── Pickups ──────────────────────────────────────────────────────────────

function tickPickups() {
  for (const p of _pickups) {
    if (p.taken) continue;
    // The float is cosmetic, so it lives on the record. Writing it to the
    // body would throw: the pickup body is STATIC, and a static body cannot
    // be moved once it is inside a Space.
    p.y = p.baseY + Math.sin(_frame * 0.06 + p.x) * PICKUP_BOB;
    const dx = _player.position.x - p.x;
    const dy = _player.position.y - p.y;
    if (Math.hypot(dx, dy) > PICKUP_R + PLAYER_H * 0.5) continue;
    p.taken = true;
    p.body.space = null;
    if (p.kind === "health") {
      _hp = Math.min(PLAYER_MAX_HP, _hp + 2);
      addFloater(p.x, p.y - 18, "+HP", "#8ce99a");
    } else {
      _weapon = p.kind;
      addFloater(p.x, p.y - 18, WEAPONS[p.kind].label, WEAPONS[p.kind].color);
    }
    addParticles(p.x, p.y, 12, "#ffe08a", 3, 150);
    _score += 50;
  }
}

// ── Canvas2D rendering ───────────────────────────────────────────────────
//
// Standard treatment, exactly like the destructible-arena demo: the shared
// drawGrid/drawConstraints/drawBody helpers render the real shapes straight
// from the space, so the player reads as the capsule it actually is and every
// body is coloured by the usual palette. Only things with no body of their own
// — the pit tints, the pickups, the boss core, the sniper's laser sight — get
// a custom pass, and each of those is gameplay information rather than art.

// Deterministic pseudo-random from a seed, so the 3D backdrop's tree placement
// is identical every frame and every reload. Math.random() per frame would make
// the jungle boil.
function srand(seed) {
  let s = seed | 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

// The pits are lethal, so they are marked — flat tints, drawn under the bodies.
function drawHazards(ctx) {
  for (const [x, w, kind] of PITS) {
    const water = kind === "water";
    ctx.fillStyle = water ? "rgba(56,120,140,0.30)" : "rgba(0,0,0,0.35)";
    const top = GROUND_Y + (water ? 40 : 20);
    ctx.fillRect(x, top, w, WORLD_H - top);
  }
}

function drawPickups(ctx) {
  for (const p of _pickups) {
    if (p.taken) continue;
    // Read-only: the bob is advanced in tickPickups, because a render pass
    // must never mutate simulation state (and must never move a static body).
    const y = p.y;
    const isHealth = p.kind === "health";
    const color = isHealth ? "#8ce99a" : WEAPONS[p.kind].color;
    ctx.fillStyle = "#0d1117";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, y, PICKUP_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isHealth ? "+" : WEAPONS[p.kind].label[0], p.x, y + 1);
  }
}

// Per-body extras the generic drawBody pass cannot know about: which way a
// fighter is aiming, how hurt it is, and the sniper's wind-up.
// Canvas2D-only trimmings: the gun barrel and the eye. Both restate what the
// 3D figures already show with their own geometry, so they stay in the 2D pass.
function drawEnemyOverlays(ctx) {
  for (const e of _enemies) {
    if (e.dead > 0) continue;
    const p = e.body.position;
    const d = e.def;

    if (e.type !== "jumper") {
      ctx.save();
      ctx.translate(p.x, p.y - d.h * 0.12);
      ctx.rotate(e.aim);
      ctx.fillStyle = "#c9d1d9";
      ctx.fillRect(0, -2, d.r * 1.9, 4);
      ctx.restore();
    }

    // Eye — the same face-direction cue the player gets. A turret is a gun
    // emplacement rather than a person, so it does not get one.
    if (e.type !== "turret") {
      ctx.fillStyle = "#f0f6fc";
      ctx.beginPath();
      ctx.arc(p.x + e.face * 4.5, p.y - d.h / 2 + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// World-space cues that every render mode needs, because they are GAMEPLAY
// INFORMATION rather than decoration: the sniper's laser sight is the only
// warning before a shot that is too fast to dodge, the boss's aim line is what
// makes its volley readable, and an enemy's health bar tells you whether one
// more shot finishes it.
//
// These used to live in the canvas2d-only pass, which meant 3D players got the
// sniper's shot with no tell at all. They are drawn from the overlay context,
// which every adapter provides, translated into world space by the caller.
function drawWorldCues(ctx) {
  for (const e of _enemies) {
    if (e.dead > 0) continue;
    const p = e.body.position;
    const d = e.def;

    if (e.type === "sniper" && e.telegraph > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(e.telegraph * 0.5);
      ctx.strokeStyle = "#ff5c5c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(e.aim) * d.r, p.y + Math.sin(e.aim) * d.r);
      ctx.lineTo(p.x + Math.cos(e.aim) * d.range, p.y + Math.sin(e.aim) * d.range);
      ctx.stroke();
      ctx.restore();
    }

    if (e.maxHp > 1 && e.hp < e.maxHp) {
      const bw = d.r * 2;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(p.x - bw / 2, p.y - d.h / 2 - 10, bw, 3);
      ctx.fillStyle = "#e0575b";
      ctx.fillRect(p.x - bw / 2, p.y - d.h / 2 - 10, bw * (e.hp / e.maxHp), 3);
    }
  }

  drawBossAimLine(ctx);
}

function drawPlayerGun(ctx) {
  if (_respawnT > 0 || _phase !== "play") return;
  if (_iframes > 0 && Math.floor(_frame / 4) % 2 === 0) return;
  const p = _player.position;
  ctx.save();
  ctx.translate(p.x, p.y - PLAYER_H * 0.12);
  ctx.rotate(_aimAngle);
  ctx.fillStyle = "#e6edf3";
  ctx.fillRect(0, -2, PLAYER_W * 1.5, 4);
  ctx.restore();

  // Eye — gives the capsule a face direction, and its colour doubles as the
  // grounded read (green on the floor, red in the air), exactly as the
  // destructible-arena demo does it.
  ctx.fillStyle = _grounded ? "#3fb950" : "#f85149";
  ctx.beginPath();
  ctx.arc(p.x + _facing * 5, p.y - PLAYER_H / 2 + 10, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

// The boss has a body, so drawBody paints its hull; this adds the parts that
// carry the fight — the damageable core and the wind-up tell.
function drawBossOverlay(ctx) {
  const b = _boss;
  if (!b || b.dead >= 1 || !b.active) return;
  ctx.save();
  if (b.dead > 0) ctx.globalAlpha = 1 - b.dead;

  const charging = b.state === "charge";
  const chargeK = charging
    ? 1 - b.stateT / (b.rage ? BOSS_RAGE_WINDUP : BOSS_WINDUP)
    : 0;

  const aim = b.state === "fire"
    ? b.lockAim
    : Math.atan2(_player.position.y - BOSS_Y, _player.position.x - BOSS_X);

  if (b.dead === 0) {
    ctx.fillStyle = charging ? "#8a6a3a" : "#2e3338";
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.translate(BOSS_X, BOSS_Y);
      ctx.rotate(aim + i * 0.22);
      ctx.fillRect(0, -4, BOSS_R * 1.3, 8);
      ctx.restore();
    }
  }

  // The core — the only weak point, and it flares through the wind-up.
  ctx.fillStyle = charging
    ? (chargeK > 0.75 && Math.floor(_frame / 3) % 2 === 0 ? "#ffffff" : "#ff9f43")
    : (b.rage ? "#ff6b6b" : "#ffd166");
  ctx.beginPath();
  ctx.arc(BOSS_X, BOSS_Y - 6, BOSS_CORE_R * (1 + chargeK * 0.25), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// The boss's charge-up aim line, drawn for EVERY render mode — see
// drawWorldCues. Splitting it out of drawBossOverlay (which is canvas2d-only,
// because the 3D boss is a real mesh) is what gets the tell into 3D.
function drawBossAimLine(ctx) {
  const b = _boss;
  if (!b || b.dead > 0 || !b.active || b.state !== "charge") return;
  const chargeK = 1 - b.stateT / (b.rage ? BOSS_RAGE_WINDUP : BOSS_WINDUP);
  const aim = Math.atan2(_player.position.y - BOSS_Y, _player.position.x - BOSS_X);
  ctx.save();
  ctx.globalAlpha = 0.25 + chargeK * 0.5;
  ctx.strokeStyle = "#ff9f43";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(BOSS_X + Math.cos(aim) * BOSS_R, BOSS_Y + Math.sin(aim) * BOSS_R);
  ctx.lineTo(BOSS_X + Math.cos(aim) * 900, BOSS_Y + Math.sin(aim) * 900);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Bullets are bodies, but at 3-4px they read better as bright marks than as
// palette-coloured shapes, so they are skipped by the body pass and drawn here.
function drawBullets2d(ctx) {
  for (const rec of _bullets) {
    if (!rec.body) continue;
    const p = rec.body.position;
    if (rec.pierce) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rec.angle);
      ctx.fillStyle = "#e599f7";
      ctx.fillRect(-14, -2, 28, 4);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(p.x, p.y, BULLET_R + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const rec of _ebullets) {
    if (!rec.body) continue;
    const p = rec.body.position;
    if (rec.kind === "rocket") {
      // A body with a flame, drawn along its heading so the turn is visible.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rec.angle);
      ctx.fillStyle = "#ffb057";
      ctx.fillRect(-BOSS_ROCKET_R - 6, -2.5, 7, 5);
      ctx.fillStyle = "#d9dde1";
      ctx.fillRect(-BOSS_ROCKET_R, -BOSS_ROCKET_R * 0.5, BOSS_ROCKET_R * 2, BOSS_ROCKET_R);
      ctx.fillStyle = "#e0575b";
      ctx.beginPath();
      ctx.moveTo(BOSS_ROCKET_R, -BOSS_ROCKET_R * 0.5);
      ctx.lineTo(BOSS_ROCKET_R + 6, 0);
      ctx.lineTo(BOSS_ROCKET_R, BOSS_ROCKET_R * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (rec.kind === "mortar") {
      ctx.fillStyle = "#8d9aa8";
      ctx.beginPath();
      ctx.arc(p.x, p.y, BOSS_MORTAR_R, 0, Math.PI * 2);
      ctx.fill();
      // A blinking fuse spark, so a falling bomb is not mistaken for scenery.
      ctx.fillStyle = Math.floor(_frame / 4) % 2 ? "#ffd166" : "#ff6b6b";
      ctx.beginPath();
      ctx.arc(p.x, p.y - BOSS_MORTAR_R, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ff8787";
      ctx.beginPath();
      ctx.arc(p.x, p.y, ENEMY_BULLET_R, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles2d(ctx) {
  for (const p of _particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters2d(ctx) {
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const f of _floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ── HUD (screen space — never camera-transformed) ────────────────────────

function drawHUD(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.72)";
  ctx.fillRect(0, 0, VIEW_W, 44);

  // Health pips.
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.fillText("HP", 14, 22);
  for (let i = 0; i < PLAYER_MAX_HP; i++) {
    ctx.fillStyle = i < _hp ? "#e0575b" : "rgba(224,87,91,0.22)";
    ctx.fillRect(36 + i * 16, 15, 12, 14);
  }

  // Lives.
  ctx.fillStyle = "#8b949e";
  ctx.fillText("LIVES", 132, 22);
  ctx.fillStyle = "#58a6ff";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillText(String(Math.max(0, _lives)), 176, 22);

  // Weapon.
  const w = WEAPONS[_weapon];
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.fillText("WPN", 208, 22);
  ctx.fillStyle = w.color;
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(w.label, 240, 22);

  // Score + clock.
  ctx.textAlign = "right";
  ctx.fillStyle = "#8b949e";
  ctx.font = "bold 12px system-ui, sans-serif";
  const secs = Math.floor(_elapsed / 60);
  ctx.fillText(`${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`, VIEW_W - 14, 22);
  ctx.fillStyle = "#ffe08a";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillText(String(_score), VIEW_W - 70, 22);

  // Level progress bar — five screens is long enough that "how far am I?" is
  // a real question, and the checkpoint ticks double as a difficulty legend.
  const bx = 330, bw = VIEW_W - 330 - 130, by = 18, bh = 8;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(bx, by, bw, bh);
  const prog = Math.max(0, Math.min(1, _player.position.x / WORLD_W));
  ctx.fillStyle = "#3d9e63";
  ctx.fillRect(bx, by, bw * prog, bh);
  for (const cp of CHECKPOINTS) {
    ctx.fillStyle = _player.position.x >= cp ? "#ffe08a" : "rgba(255,255,255,0.3)";
    ctx.fillRect(bx + bw * (cp / WORLD_W), by - 2, 2, bh + 4);
  }
  // Boss marker at the far end.
  ctx.fillStyle = "#e0575b";
  ctx.fillRect(bx + bw - 3, by - 3, 3, bh + 6);

  ctx.restore();
}

function drawBossBar(ctx) {
  const b = _boss;
  if (!b || !b.active || b.dead >= 1) return;
  ctx.save();
  const bw = 420, bx = (VIEW_W - bw) / 2, by = 56;
  ctx.fillStyle = "rgba(13,17,23,0.8)";
  ctx.fillRect(bx - 4, by - 4, bw + 8, 22);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(bx, by, bw, 14);
  ctx.fillStyle = b.rage ? "#ff6b6b" : "#e0575b";
  ctx.fillRect(bx, by, bw * Math.max(0, b.hp / BOSS_HP), 14);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Naming the incoming attack during the wind-up is what lets a player choose
  // the right counter before it lands, rather than learning it by dying.
  let label = b.rage ? "EMPLACEMENT — OVERDRIVE" : "EMPLACEMENT";
  if (b.state === "charge") {
    label = b.attack === "rocket" ? "▲ ROCKETS INBOUND — KEEP MOVING"
      : b.attack === "mortar" ? "▲ MORTARS — DON'T STAND STILL"
      : "▲ VOLLEY — GET BEHIND COVER";
  }
  ctx.fillText(label, VIEW_W / 2, by + 7);
  ctx.restore();
}

function drawCrosshair(ctx) {
  if (_phase !== "play" || _isTouch) return;
  const sx = _aimScreen.x, sy = _aimScreen.y;
  ctx.save();
  ctx.strokeStyle = WEAPONS[_weapon].color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(sx, sy, 9, 0, Math.PI * 2);
  ctx.moveTo(sx - 14, sy); ctx.lineTo(sx - 4, sy);
  ctx.moveTo(sx + 4, sy);  ctx.lineTo(sx + 14, sy);
  ctx.moveTo(sx, sy - 14); ctx.lineTo(sx, sy - 4);
  ctx.moveTo(sx, sy + 4);  ctx.lineTo(sx, sy + 14);
  ctx.stroke();
  ctx.restore();
}

function drawBanners(ctx) {
  const banner = (title, sub, color) => {
    ctx.save();
    ctx.fillStyle = "rgba(13,17,23,0.78)";
    ctx.fillRect(0, VIEW_H / 2 - 62, VIEW_W, 124);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 14);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 26);
    ctx.restore();
  };

  if (_phase === "won") {
    const secs = Math.floor(_elapsed / 60);
    banner(
      "MISSION COMPLETE",
      `Score ${_score} · ${Math.floor(secs / 60)}m ${secs % 60}s · ${_lives} lives left — click or SPACE to run it again`,
      "#8ce99a",
    );
  } else if (_phase === "lost") {
    banner("GAME OVER", `Score ${_score} — click or SPACE to try again`, "#ff6b6b");
  } else if (_respawnT > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff9f43";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(`RESPAWNING — ${_lives} ${_lives === 1 ? "LIFE" : "LIVES"} LEFT`, VIEW_W / 2, VIEW_H / 2);
    ctx.restore();
  }
}

function drawTouchHint(ctx) {
  if (!_isTouch || _phase !== "play") return;
  ctx.save();
  ctx.fillStyle = "rgba(230,237,243,0.55)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Tap-hold to aim + fire · on-screen edges to move", VIEW_W / 2, VIEW_H - 12);
  ctx.restore();
}

// ── 3D rendering ─────────────────────────────────────────────────────────
//
// Same treatment as the kickoff demo: the physics bodies for anything with a
// face are hidden (`_hidden3d`) and a procedural low-poly figure is drawn at
// each one, driven from the state the simulation already tracks. Terrain keeps
// the adapter's own body meshes and only has its material swapped.

function ensureTerrainStyle(adapter, scene) {
  if (_terrainStyled === scene) return;
  const rock = createBoardMaterial(_THREE, { tint: 0x4a3d30, worldUnitsPerTile: 40 });
  const moss = createBoardMaterial(_THREE, { tint: 0x2f7d4f, worldUnitsPerTile: 26 });
  const wood = createBoardMaterial(_THREE, { tint: 0x8a5f33, worldUnitsPerTile: 18 });
  let styled = 0;
  for (const entry of adapter.getTrackedMeshes()) {
    const kind = entry.body?.userData?._kind;
    if (!kind) continue;
    if (kind === "oneway" || kind === "plank") entry.mesh.material = wood;
    else if (kind === "block") entry.mesh.material = moss;
    else entry.mesh.material = rock;
    styled++;
  }
  // Only latch once meshes actually existed to restyle — a frame that runs
  // before the adapter has built them would otherwise mark the job done.
  if (styled > 0) _terrainStyled = scene;
}

// A few big background slabs so the 3D mode isn't a black void behind the
// level. Cheap: three planes, no texture, parented to the scene not the camera.
function ensureBackdrop(adapter, scene) {
  if (_bgScene === scene && _bgMeshes.length) return;
  for (const m of _bgMeshes) adapter.removeSceneMesh(m);
  _bgMeshes = [];

  // Scene Y is mirrored, so the world's y=0..WORLD_H maps to 0..-WORLD_H. The
  // backdrop has to sit BEHIND and BELOW that band; the first cut centred these
  // planes near scene y=-140..-330 with 520-900px heights, which put their top
  // edges up at +310 — squarely in front of the playfield, hiding the level.
  // Anchoring each plane's TOP at the horizon and hanging it downward keeps it
  // where a backdrop belongs.
  const horizonY = -GROUND_Y + 190;      // scene-space horizon, above the floor
  const layers = [
    { z: -900, color: 0x16323a, h: 1400 },
    { z: -700, color: 0x1a3a33, h: 1100 },
    { z: -520, color: 0x1e463a, h: 900 },
  ];
  for (const L of layers) {
    const mesh = new _THREE.Mesh(
      new _THREE.PlaneGeometry(WORLD_W + 3000, L.h),
      new _THREE.MeshBasicMaterial({ color: L.color, depthWrite: false }),
    );
    // Top edge at the horizon, body hanging below it.
    mesh.position.set(WORLD_W / 2, horizonY - L.h / 2, L.z);
    // Backdrops must never win a depth test against the level.
    mesh.renderOrder = -10;
    adapter.addSceneMesh(mesh);
    _bgMeshes.push(mesh);
  }

  // Tree trunks on the middle layer — low-poly cylinders that give the scroll
  // a parallax read the flat slabs cannot.
  // A trunk has to reach from the ground UP to its canopy, so its height is
  // derived from those two points rather than being a fixed number: a hardcoded
  // 420 left the trunks ending 280px above the floor, visibly hanging in the
  // air with a gap under them.
  const groundSceneY = -GROUND_Y;              // scene Y of the level's floor
  const canopySceneY = horizonY + 110;         // where the canopies sit
  const trunkH = Math.abs(canopySceneY - groundSceneY) + 120;
  const trunkGeo = new _THREE.CylinderGeometry(14, 20, trunkH, 6);
  const trunkMat = new _THREE.MeshLambertMaterial({ color: 0x2a3d2c, flatShading: true });
  const canopyGeo = new _THREE.IcosahedronGeometry(90, 0);
  const canopyMat = new _THREE.MeshLambertMaterial({ color: 0x255a3d, flatShading: true });
  const rnd = srand(4242);
  for (let x = -200; x < WORLD_W + 400; x += 210) {
    const jx = x + rnd() * 90;
    // Far enough back that a trunk can never intersect the play plane (z=0),
    // where it would read as an object standing in front of the level.
    const z = -430 - rnd() * 180;
    // The cylinder is centred on its origin, so seat it half a height above the
    // ground line — that plants its base in the floor and runs it up past the
    // canopy, with no gap at either end.
    const trunk = new _THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(jx, groundSceneY + trunkH / 2 - 60, z);
    adapter.addSceneMesh(trunk);
    _bgMeshes.push(trunk);
    const canopy = new _THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(jx, canopySceneY + rnd() * 60, z);
    const s = 0.7 + rnd() * 0.7;
    canopy.scale.set(s, s * 0.7, s);
    adapter.addSceneMesh(canopy);
    _bgMeshes.push(canopy);
  }
  _bgScene = scene;
}

// Bullets get their own emissive tracers. The adapter's generic body pass
// draws them as small grey boxes that vanish against the terrain, which is why
// the bodies are marked _hidden3d — without this the 3D mode shows no shots at
// all. Meshes are pooled: a run-and-gun fires hundreds of rounds a minute and
// building geometry per shot would churn the GPU.
// Pickups are sensor bodies marked _hidden (2D draws a labelled icon) and
// _hidden3d, so without this they are invisible in 3D — a power-up you can only
// collect by walking through an empty patch of air. One spinning cube each,
// tinted to match the 2D icon colour, rebuilt only when the roster changes.
// A canvas-drawn glyph for a pickup's 3D badge. Cached per letter so seven
// pickups of four kinds build four textures, not seven.
const _pickupLabelCache = new Map();
function pickupLabelTexture(letter, hex) {
  const key = letter + ":" + hex;
  const hit = _pickupLabelCache.get(key);
  if (hit) return hit;

  // The glyph is painted INTO the crate face rather than floated in front of
  // it on a billboard. A flat screen-facing disc over a spinning solid reads as
  // two different renderers arguing — and it hides the object it is labelling.
  // As a texture the letter turns with the cube, which is what makes the spin
  // legible as a spin.
  const S = 128;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d");

  const css = "#" + hex.toString(16).padStart(6, "0");
  // Crate body in the pickup's own colour, so an unlit face still reads.
  c.fillStyle = css;
  c.fillRect(0, 0, S, S);

  // A darker inset panel — gives the face depth and frames the glyph without
  // needing a separate mesh.
  c.fillStyle = "rgba(13,17,23,0.30)";
  c.fillRect(S * 0.12, S * 0.12, S * 0.76, S * 0.76);
  c.strokeStyle = "rgba(13,17,23,0.55)";
  c.lineWidth = S * 0.05;
  c.strokeRect(S * 0.12, S * 0.12, S * 0.76, S * 0.76);

  // Corner rivets, so the faces do not read as flat colour when lit edge-on.
  c.fillStyle = "rgba(13,17,23,0.45)";
  for (const [rx, ry] of [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]]) {
    c.beginPath();
    c.arc(S * rx, S * ry, S * 0.035, 0, Math.PI * 2);
    c.fill();
  }

  // The glyph, in a near-white so it carries at distance against any tint.
  c.fillStyle = "#f0f6fc";
  c.font = `bold ${Math.round(S * 0.52)}px system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(letter, S / 2, S / 2 + S * 0.03);

  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  _pickupLabelCache.set(key, tex);
  return tex;
}

// A pickup is a single textured mesh now, so disposal is just the one removal.
function removePickupMesh(adapter, m) {
  if (m) adapter.removeSceneMesh(m);
}

function syncPickupMeshes(adapter, scene) {
  if (_pickupMeshScene !== scene) {
    for (const m of _pickupMeshes.values()) removePickupMesh(adapter, m);
    _pickupMeshes.clear();
    // The label textures belong to the old renderer's GL context, so they
    // cannot be carried across a render-mode switch.
    for (const t of _pickupLabelCache.values()) t.dispose?.();
    _pickupLabelCache.clear();
    _pickupMeshScene = scene;
  }

  for (const p of _pickups) {
    let m = _pickupMeshes.get(p);
    if (p.taken) {
      if (m) { removePickupMesh(adapter, m); _pickupMeshes.delete(p); }
      continue;
    }
    if (!m) {
      const hex = p.kind === "health"
        ? 0x8ce99a
        : parseInt(WEAPONS[p.kind].color.slice(1), 16);
      const letter = p.kind === "health" ? "+" : WEAPONS[p.kind].label[0];
      // One solid, one material, the label baked into the faces. The earlier
      // version stacked a wireframe shell and a screen-facing badge on top of
      // the cube, which mixed a flat 2D overlay into a 3D scene and covered
      // the very object it was labelling.
      const tex = pickupLabelTexture(letter, hex);
      m = new _THREE.Mesh(
        new _THREE.BoxGeometry(PICKUP_R * 1.8, PICKUP_R * 1.8, PICKUP_R * 1.8),
        new _THREE.MeshLambertMaterial({
          map: tex,
          // Emissive so a pickup still reads in the level's shadowed pockets —
          // a power-up you cannot spot is the same as one that is not there.
          //
          // The emissive COLOUR is white, not the pickup tint: emission is
          // `emissive * emissiveMap`, so tinting it would multiply the crate's
          // own colour by itself (muddy) while dragging the near-white glyph
          // down to the tint (unreadable). White lets the map carry both — the
          // body glows its colour, the glyph stays bright.
          emissive: 0xffffff,
          emissiveMap: tex,
          emissiveIntensity: 0.42,
        }),
      );
      adapter.addSceneMesh(m);
      _pickupMeshes.set(p, m);
    }
    // p.y already carries the bob, advanced in tickPickups.
    m.position.set(p.x, -p.y, 4);
    // Spin about Y with a slight tilt, so faces turn toward the camera in
    // rotation and the glyph is legible for most of the cycle.
    m.rotation.set(0.30, _frame * 0.028, 0.12);
  }

  // Drop meshes whose pickup left the roster entirely (a restart).
  for (const [p, m] of _pickupMeshes) {
    if (!_pickups.includes(p)) { removePickupMesh(adapter, m); _pickupMeshes.delete(p); }
  }
}

function syncBulletMeshes(adapter, scene) {
  if (_bulletMeshScene !== scene) {
    // Scene torn down by a render-mode switch — drop every pooled mesh.
    for (const m of _bulletMeshPool) adapter.removeSceneMesh(m);
    _bulletMeshPool = [];
    _bulletMeshUsed = 0;
    _bulletMeshScene = scene;
  }

  const take = () => {
    if (_bulletMeshUsed < _bulletMeshPool.length) return _bulletMeshPool[_bulletMeshUsed++];
    const mesh = new _THREE.Mesh(
      new _THREE.SphereGeometry(1, 8, 6),
      new _THREE.MeshBasicMaterial({ color: 0xffd166 }),
    );
    adapter.addSceneMesh(mesh);
    _bulletMeshPool.push(mesh);
    _bulletMeshUsed++;
    return mesh;
  };

  _bulletMeshUsed = 0;

  for (const rec of _bullets) {
    if (!rec.body) continue;
    const m = take();
    const p = rec.body.position;
    m.visible = true;
    m.position.set(p.x, -p.y, 6);
    if (rec.pierce) {
      // The laser is a streak along its flight direction, matching the 2D read.
      m.scale.set(16, 2.5, 2.5);
      m.rotation.z = -rec.angle;
      m.material.color.setHex(0xe599f7);
    } else {
      m.scale.set(BULLET_R, BULLET_R, BULLET_R);
      m.rotation.z = 0;
      m.material.color.setHex(0xffd166);
    }
  }
  for (const rec of _ebullets) {
    if (!rec.body) continue;
    const m = take();
    const p = rec.body.position;
    m.visible = true;
    m.position.set(p.x, -p.y, 6);
    if (rec.kind === "rocket") {
      m.scale.set(BOSS_ROCKET_R * 1.7, BOSS_ROCKET_R * 0.8, BOSS_ROCKET_R * 0.8);
      m.rotation.z = -rec.angle;
      m.material.color.setHex(0xffb057);
    } else if (rec.kind === "mortar") {
      const s2 = BOSS_MORTAR_R;
      m.scale.set(s2, s2, s2);
      m.rotation.z = 0;
      m.material.color.setHex(Math.floor(_frame / 4) % 2 ? 0xffd166 : 0x8d9aa8);
    } else {
      m.scale.set(ENEMY_BULLET_R, ENEMY_BULLET_R, ENEMY_BULLET_R);
      m.rotation.z = 0;
      m.material.color.setHex(0xff8787);
    }
  }

  // Park the rest rather than freeing them — the next volley reuses them.
  for (let i = _bulletMeshUsed; i < _bulletMeshPool.length; i++) {
    _bulletMeshPool[i].visible = false;
  }
}

function ensureBossMesh(adapter, scene) {
  if (_bossMesh && _bossMesh.scene === scene) return;
  if (_bossMesh) {
    adapter.removeSceneMesh(_bossMesh.root);
    _bossMesh = null;
  }
  const root = new _THREE.Group();

  const hull = new _THREE.Mesh(
    new _THREE.BoxGeometry(BOSS_R * 1.7, BOSS_R * 2, BOSS_R * 1.5),
    new _THREE.MeshLambertMaterial({ color: 0x4a4f57, flatShading: true }),
  );
  root.add(hull);

  const core = new _THREE.Mesh(
    new _THREE.IcosahedronGeometry(BOSS_CORE_R, 0),
    new _THREE.MeshBasicMaterial({ color: 0xffd166 }),
  );
  core.position.set(0, 6, BOSS_R * 0.78);
  root.add(core);

  const barrels = [];
  const barrelGeo = new _THREE.CylinderGeometry(5, 6, BOSS_R * 1.4, 6);
  const barrelMat = new _THREE.MeshLambertMaterial({ color: 0x2e3338, flatShading: true });
  for (let i = -1; i <= 1; i++) {
    const pivot = new _THREE.Group();
    pivot.position.set(0, -6, BOSS_R * 0.3 + i * 18);
    const bar = new _THREE.Mesh(barrelGeo, barrelMat);
    // The cylinder is built along its own +Y; rotating it into +X means the
    // pivot's Z rotation is then the aim angle directly.
    bar.rotation.z = -Math.PI / 2;
    bar.position.x = BOSS_R * 0.7;
    pivot.add(bar);
    root.add(pivot);
    barrels.push(pivot);
  }

  root.position.set(BOSS_X, -BOSS_Y, 0);
  adapter.addSceneMesh(root);
  _bossMesh = { root, core, hull, barrels, scene };
}

// A sandbagged gun emplacement: a low nest with a barrel that tracks the
// player. Not a humanoid, so it does not go through the soldier rig.
function createTurretMesh(adapter, e, hex) {
  const d = e.def;
  const root = new _THREE.Group();

  const nest = new _THREE.Mesh(
    new _THREE.BoxGeometry(d.r * 2, d.h * 0.62, d.r * 1.6),
    new _THREE.MeshLambertMaterial({ color: 0x6b5f3a, flatShading: true }),
  );
  nest.position.y = -d.h * 0.16;
  root.add(nest);

  const mount = new _THREE.Mesh(
    new _THREE.BoxGeometry(d.r * 1.3, d.h * 0.34, d.r * 1.3),
    new _THREE.MeshLambertMaterial({ color: hex, flatShading: true }),
  );
  mount.position.y = d.h * 0.22;
  root.add(mount);

  // Barrel on its own pivot so the aim angle is just the pivot's Z rotation.
  const pivot = new _THREE.Group();
  pivot.position.y = d.h * 0.22;
  const barrel = new _THREE.Mesh(
    new _THREE.CylinderGeometry(3.5, 4.5, d.r * 2.1, 6),
    new _THREE.MeshLambertMaterial({ color: 0x2e3338, flatShading: true }),
  );
  barrel.rotation.z = -Math.PI / 2;
  barrel.position.x = d.r * 1.05;
  pivot.add(barrel);
  root.add(pivot);

  adapter.addSceneMesh(root);
  return { kind: "turret", root, pivot, mount, tint: hex };
}

// Figures come in two kinds now, so disposal has to branch.
function destroyEnemyFig(adapter, f) {
  if (!f) return;
  if (f.kind === "turret") {
    if (f.root) adapter.removeSceneMesh(f.root);
    f.root = null;
  } else {
    destroySoldier(adapter, f);
  }
}

function ensureFigures(adapter, scene) {
  if (_figScene !== scene) {
    // Scene torn down (a render-mode switch) — every figure has to be rebuilt.
    if (_playerFig) { destroySoldier(adapter, _playerFig); _playerFig = null; }
    for (const f of _enemyFigs.values()) destroyEnemyFig(adapter, f);
    _enemyFigs.clear();
    _figScene = scene;
  }

  if (!_playerFig) {
    _playerFig = createSoldier(adapter, _THREE, {
      unit: PLAYER_H * 0.46,
      palette: soldierPalette(0x4d7c4f, { headband: 0xc23b3b }),
      bodyHeight: PLAYER_H,
    });
  }

  // One figure per living enemy, created lazily as they come on screen and
  // dropped once their death animation finishes — a 5400px level has ~18
  // enemies and building them all up front is wasted geometry.
  //
  // Turrets get an emplacement mesh rather than a soldier. They used to get
  // NOTHING here while their body was also _hidden3d, which made them fully
  // invisible in 3D — a gun that shoots you from an empty patch of ground.
  for (const e of _enemies) {
    if (e.dead >= 1) {
      const f = _enemyFigs.get(e);
      if (f) { destroyEnemyFig(adapter, f); _enemyFigs.delete(e); }
      continue;
    }
    if (_enemyFigs.has(e)) continue;
    const hex = parseInt(e.def.color.slice(1), 16);
    _enemyFigs.set(e, e.type === "turret"
      ? createTurretMesh(adapter, e, hex)
      : createSoldier(adapter, _THREE, {
        unit: e.def.h * 0.46,
        palette: soldierPalette(hex, { headband: e.type === "sniper" ? 0x9775fa : null }),
        bodyHeight: e.def.h,
      }));
  }

  // Figures whose enemy was removed from the roster entirely (a respawn wipe).
  for (const [e, f] of _enemyFigs) {
    if (!_enemies.includes(e)) { destroyEnemyFig(adapter, f); _enemyFigs.delete(e); }
  }
}

function syncFigures() {
  if (_playerFig) {
    _playerFig.root.visible = _respawnT <= 0
      && !(_iframes > 0 && Math.floor(_frame / 4) % 2 === 0);
    syncSoldier(_playerFig, {
      x: _player.position.x,
      y: _player.position.y,
      face: _facing,
      aim: _aimAngle,
      grounded: _grounded,
      vy: _player.velocity.y,
      crouching: _crouching,
      firing: _firedThisFrame,
      // The collider height, so the rig's soles land on the floor rather than
      // sinking into it — the rig cannot know the demo's capsule size.
      bodyHeight: PLAYER_H,
    });
  }

  for (const [e, f] of _enemyFigs) {
    if (f.kind === "turret") {
      if (!f.root) continue;
      f.root.position.set(e.body.position.x, -e.body.position.y, 0);
      // Scene Y is mirrored, so the world aim angle is negated.
      f.pivot.rotation.z = -e.aim;
      f.root.visible = e.dead < 1;
      if (f.mount) f.mount.material.color.setHex(e.hitFlash > 0 ? 0xffffff : f.tint ?? 0xc9a227);
      continue;
    }
    syncSoldier(f, {
      x: e.body.position.x,
      y: e.body.position.y,
      face: e.face,
      aim: e.aim,
      grounded: e.grounded,
      vy: e.body.velocity.y,
      // The jumper has no gun, so its "firing" flash never triggers; the
      // telegraph doubles as the sniper's tell in 3D too.
      firing: false,
      dead: e.dead,
      bodyHeight: e.def.h,
    });
  }

  if (_bossMesh && _boss) {
    const b = _boss;
    _bossMesh.root.visible = b.dead < 1;
    const charging = b.state === "charge";
    const chargeK = charging
      ? 1 - b.stateT / (b.rage ? BOSS_RAGE_WINDUP : BOSS_WINDUP)
      : 0;
    _bossMesh.core.material.color.setHex(
      charging ? (chargeK > 0.75 ? 0xffffff : 0xff9f43) : (b.rage ? 0xff6b6b : 0xffd166),
    );
    const pulse = charging
      ? 1 + chargeK * 0.3
      : 0.85 + 0.15 * Math.sin(_frame * (b.rage ? 0.28 : 0.12));
    _bossMesh.core.scale.set(pulse, pulse, pulse);
    _bossMesh.hull.material.color.setHex(
      b.hitFlash > 0 ? 0xffffff : (b.rage ? 0x7a3b3b : 0x4a4f57),
    );
    if (b.dead === 0 && b.active) {
      const a = b.state === "fire"
        ? b.lockAim
        : Math.atan2(_player.position.y - BOSS_Y, _player.position.x - BOSS_X);
      _bossMesh.barrels.forEach((pv, i) => { pv.rotation.z = -a + (i - 1) * 0.22; });
    }
    if (b.dead > 0) _bossMesh.root.rotation.z = b.dead * 0.4;
  }
}

// ── Game reset ───────────────────────────────────────────────────────────

function resetGame(space) {
  clearBullets();
  for (const e of _enemies) if (e.body?.space) e.body.space = null;
  for (const p of _pickups) if (p.body?.space) p.body.space = null;
  _enemies = [];
  _pickups = [];
  _particles = [];
  _floaters = [];

  _hp = PLAYER_MAX_HP;
  _lives = START_LIVES;
  _score = 0;
  _weapon = "rifle";
  _fireCd = 0;
  _iframes = 0;
  _respawnT = 0;
  _checkpoint = 0;
  _elapsed = 0;
  _phase = "play";
  _phaseT = 0;
  _facing = 1;
  _jumpBuffer = 0;
  _prevJump = false;
  _jumpCut = false;
  _wallPushLock = 0;
  _wallPushDir = 0;
  _deathCamAnchor = null;

  // Re-raise every plank; a restart on a chasm you already dropped is not a
  // restart.
  for (const pl of _planks) {
    // Order matters: a static body already inside a Space refuses to be
    // rotated, so the plank is pulled out, reset while detached, and only
    // then re-added and frozen.
    if (pl.body.space) pl.body.space = null;
    pl.body.type = BodyType.DYNAMIC;
    pl.body.rotation = 0;
    pl.body.position = new Vec2(pl.def.x + pl.def.w / 2, pl.def.y + pl.def.h / 2);
    pl.body.velocity = new Vec2(0, 0);
    pl.body.angularVel = 0;
    pl.body.allowRotation = false;
    pl.body.type = BodyType.STATIC;
    pl.body.space = space;
    pl.fallen = false;
    pl.fuse = -1;
  }

  for (const s of ENEMY_SPAWNS) _enemies.push(spawnEnemy(space, s));
  for (const d of PICKUP_SPAWNS) _pickups.push(spawnPickup(space, d));

  if (_boss) {
    if (_boss.body?.space) _boss.body.space = null;
  }
  _boss = spawnBoss(space);

  _player.position = new Vec2(CHECKPOINTS[0], GROUND_Y - 120);
  _player.velocity = new Vec2(0, 0);
  _aimScreen.x = VIEW_W * 0.72;
  _aimScreen.y = VIEW_H * 0.5;
}

// ── Demo ─────────────────────────────────────────────────────────────────

export default {
  id: "jungle-strike",
  label: "Jungle Strike",
  tags: ["Gameplay", "Shooter", "CharacterController", "Camera", "Platformer", "AI"],
  desc:
    "An eleven-screen <b>Contra-style run-and-gun</b>. Fight right through a jungle assault course — patrolling grunts, dug-in <b>turrets</b>, leaping <b>chargers</b> and <b>snipers</b> that paint you with a laser sight before they fire — to a three-barrel <b>emplacement boss</b> that only takes damage in its glowing core, telegraphs every volley, and rotates rockets and mortars once it drops into overdrive. The level is built from a <b>CharacterController</b> over hand-authored terrain: one-way canopy platforms, a <b>collapsing rope bridge</b>, a river you cross on stepping stones, and a trench, tower climb and flooded bay after that. Grab <b>SPREAD</b>, <b>MACHINE</b> and <b>LASER</b> power-ups — you lose your weapon on death, and respawn at the last of eleven <b>checkpoints</b>. Move with <b>WASD</b>/arrows, <b>SPACE</b> to jump, <b>S</b>/<b>↓</b> to crouch, and <b>aim freely with the mouse</b> — hold to fire. In <b>3D mode</b> every fighter is a procedural low-poly figure with an independently-aimed gun arm.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner || null;
    space.gravity = new Vec2(0, GRAVITY);

    _frame = 0;
    _playerTag = new CbType();
    _onewayTag = new CbType();
    _terrainStyled = null;
    _bgScene = null;

    buildWorld(space);

    _player = spawnPlayer(space, CHECKPOINTS[0], GROUND_Y - 120);
    _cc = new CharacterController(space, _player, {
      maxSlopeAngle: Math.PI / 3,
      down: new Vec2(0, 1),
      oneWayPlatformTag: _onewayTag,
      characterTag: _playerTag,
      // Ground/wall probes must skip the character itself and every bullet —
      // otherwise the player can stand on their own shots and walk on air.
      filter: new InteractionFilter(1, ~(CHAR_GROUP | G_PBULLET | G_EBULLET | G_PICKUP | G_DEBRIS)),
    });

    resetGame(space);

    this.camera = {
      follow: _player,
      // Pushed forward along the facing so you see what you are running into
      // rather than what you just left. Offset is applied in step().
      offsetX: 90,
      offsetY: -50,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.12,
    };

    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Re-entrant setup: drop listeners left behind by a previous play (the
    // runner has no teardown hook when a card is simply stopped).
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);

    _onKeyDown = (e) => {
      if (!_space) return;
      _keys[e.code] = true;
      if (e.code === "Space") {
        if (_phase === "won" || _phase === "lost") {
          if (_frame >= _restartLockUntil) resetGame(_space);
        }
      }
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS"].includes(e.code)) {
        e.preventDefault();
      }
    };
    _onKeyUp = (e) => {
      if (!_space) return;
      _keys[e.code] = false;
    };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  cleanup() {
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = _onKeyUp = null;
    clearBullets();
    _enemies = [];
    _pickups = [];
    _planks = [];
    _particles = [];
    _floaters = [];
    _terrainBodies = [];
    _boss = null;
    _player = null;
    _cc = null;
    _space = null;
    _mouseDown = false;
    // 3D handles are dropped without touching the scene — the adapter tears
    // its own scene down on unload, and reaching into a detached one throws.
    _playerFig = null;
    _enemyFigs = new Map();
    _bossMesh = null;
    _bgMeshes = [];
    _bulletMeshPool = [];
    _bulletMeshUsed = 0;
    _bulletMeshScene = null;
    _pickupMeshes = new Map();
    _pickupMeshScene = null;
    _pickupLabelCache.clear();
    _figScene = null;
    _bgScene = null;
    _terrainStyled = null;
  },

  // The runner hands pointer callbacks world-space coords (canvas + camera),
  // which is exactly what the aim vector wants.
  // The runner hands WORLD coords (viewport + camera). Convert straight back to
  // screen space, which is where the pointer actually is and what stays valid
  // as the camera moves.
  hover(x, y) { setAim(x, y); },
  click(x, y) {
    setAim(x, y);
    if (_phase === "won" || _phase === "lost") {
      if (_frame >= _restartLockUntil) resetGame(_space);
      return;
    }
    _mouseDown = true;
  },
  drag(x, y) { setAim(x, y); },
  release() { _mouseDown = false; },

  step() {
    if (!_cc || !_player) return;
    _frame++;
    _firedThisFrame = false;

    if (_phase === "won" || _phase === "lost") {
      _phaseT++;
      if (_phase === "lost") holdDeathCamera();
      // Bullets and effects keep running so the death/victory beat has motion.
      tickBullets();
      tickEffects();
      for (const e of _enemies) if (e.dead > 0 && e.dead < 1) e.dead = Math.min(1, e.dead + 0.06);
      if (_boss && _boss.dead > 0 && _boss.dead < 1) _boss.dead = Math.min(1, _boss.dead + 0.012);
      return;
    }

    _elapsed++;
    if (_iframes > 0) _iframes--;
    if (_fireCd > 0) _fireCd--;

    // ---- Respawn hold ----
    if (_respawnT > 0) {
      holdDeathCamera();
      if (--_respawnT === 0) respawn();
      tickBullets();
      tickEffects();
      for (const e of _enemies) if (e.dead > 0 && e.dead < 1) e.dead = Math.min(1, e.dead + 0.06);
      return;
    }

    // ---- Input ----
    const left = _keys["KeyA"] || _keys["ArrowLeft"];
    const right = _keys["KeyD"] || _keys["ArrowRight"];
    const jumpKey = _keys["Space"] || _keys["KeyW"] || _keys["ArrowUp"];
    _crouching = !!(_keys["KeyS"] || _keys["ArrowDown"]);

    const jumpJustPressed = jumpKey && !_prevJump;
    _prevJump = jumpKey;
    if (jumpJustPressed) _jumpBuffer = JUMP_BUFFER_MS;
    else _jumpBuffer = Math.max(0, _jumpBuffer - 1000 * DT);

    // Resolve the remembered screen point back into the world through the
    // camera, so the aim tracks the cursor even while the player runs and the
    // mouse is perfectly still. The runner advances its camera AFTER step(),
    // so this uses the previous frame's offset — a ~3px lag at full run speed,
    // invisible in play, and the drawn crosshair is exact regardless because
    // it renders straight from the screen point.
    _aim.x = _aimScreen.x + _cam.x;
    _aim.y = _aimScreen.y + _cam.y;

    // Aim is always toward the cursor; facing follows the aim, not the input,
    // so you can run left while shooting right — the whole point of free aim
    // in a side-scroller.
    const adx = _aim.x - _player.position.x;
    const ady = _aim.y - _player.position.y + PLAYER_H * 0.1;
    _aimAngle = Math.atan2(ady, adx);
    _facing = adx >= 0 ? 1 : -1;

    // ---- Controller ----
    const result = _cc.update();
    _grounded = result.grounded;

    let vx = 0;
    if (left) vx -= MOVE_SPEED;
    if (right) vx += MOVE_SPEED;
    if (_crouching && _grounded) vx *= 0.45;   // crouch-walk

    // Writing a velocity that pushes into a static wall EVERY frame used to do
    // more than fail to move the body — material friction against that
    // re-asserted push cancelled the vertical component as well, so a jump
    // taken while holding forward against a ledge died at the second step and
    // the player hung frozen in mid-air. The controller now zeroes friction on
    // wall contacts (`wallFriction`, default 0), which is what fixed the hang
    // on one-way platform edges this scan never covered (#238). The scan stays
    // for feel: dropping the into-wall push keeps the player from grinding
    // along a face — the jump is what gets them over the ledge, and air
    // control resumes the moment the face is cleared.
    // Look ahead in the level geometry rather than trusting the controller's
    // wall flags: mid-jump against a pillar the controller reports no wall at
    // all, yet the contact is there and freezes the body just the same. This
    // scans the authored boxes directly for anything the body would drive into
    // at its current height, which catches every case the flags miss.
    const feet = _player.position.y + PLAYER_H / 2;
    const head = _player.position.y - PLAYER_H / 2;
    let blocked = 0;
    if (vx !== 0) {
      const probeX = _player.position.x + Math.sign(vx) * (PLAYER_R + 5);
      for (const b of _terrainBodies) {
        const bx = b.userData?._box;
        if (!bx || b.userData._kind === "oneway") continue;
        if (probeX < bx.x || probeX > bx.x + bx.w) continue;
        // Only a face that actually spans the body's height blocks it; a box
        // entirely below the feet is a ledge to land on, not a wall.
        if (bx.y < feet - 3 && bx.y + bx.h > head + 3) { blocked = Math.sign(vx); break; }
      }
    }
    if (blocked !== 0) _wallPushLock = 6;
    else if (_wallPushLock > 0) _wallPushLock--;
    // While airborne, keep the push off for a few frames after the face clears
    // — resuming it on the very frame the contact drops re-establishes it
    // against the ledge's top corner and the body freezes a few pixels higher.
    if (blocked !== 0 || (_wallPushLock > 0 && !_grounded && blocked === 0 && vx !== 0 && Math.sign(vx) === _wallPushDir)) vx = 0;
    if (blocked !== 0) _wallPushDir = blocked;

    let vy = _player.velocity.y;
    const canJump = _grounded || result.timeSinceGrounded * 1000 < COYOTE_MS;
    if (_jumpBuffer > 0 && canJump) {
      vy = -JUMP_SPEED;
      _jumpBuffer = 0;
      _grounded = false;
      _jumpCut = false;
    } else if (!jumpKey && vy < 0 && !_jumpCut) {
      // Variable jump height — releasing early cuts the arc short. Applied
      // ONCE per jump: repeating the multiply every airborne frame compounds
      // into a near-total kill of the ascent (a 430px/s launch becomes a 41px
      // hop), which silently makes half the level unreachable.
      vy *= 0.45;
      _jumpCut = true;
    }

    _player.velocity = new Vec2(vx, vy);

    // ---- Firing ----
    if (_mouseDown || _keys["KeyJ"] || _keys["Enter"]) playerFire();

    // ---- Camera lead ----
    // The offset flips with the facing so the view leads the way you are
    // aiming; lerped rather than snapped, or turning around whips the screen.
    if (this.camera) {
      const want = _facing * 90;
      this.camera.offsetX += (want - this.camera.offsetX) * 0.06;
    }

    // ---- Checkpoints ----
    for (let i = CHECKPOINTS.length - 1; i > _checkpoint; i--) {
      if (_player.position.x >= CHECKPOINTS[i]) {
        _checkpoint = i;
        addFloater(_player.position.x, _player.position.y - 40, "CHECKPOINT", "#8ce99a");
        break;
      }
    }

    // ---- Pits ----
    // Falling off the bridge or into the river is fatal. Checked against the
    // world floor rather than per-hazard: everything below the level is a pit.
    if (_player.position.y > WORLD_H + 40) killPlayer();

    // ---- World ----
    for (const e of _enemies) tickEnemy(e);
    tickBoss();
    tickBullets();
    tickPlanks();
    tickPickups();
    tickEffects();

    // Drop enemies that finished dying and are far behind, so a long run does
    // not accumulate a hundred corpses' worth of bookkeeping.
    for (let i = _enemies.length - 1; i >= 0; i--) {
      const e = _enemies[i];
      if (e.dead >= 1 && Math.abs(e.body.position.x - _player.position.x) > VIEW_W) {
        // Kept in the array (respawn() re-arms them) unless the boss spawned
        // them, in which case they are transient.
        if (e.escort) _enemies.splice(i, 1);
      }
    }
  },

  // Canvas2D — the standard body pass plus the few overlays that have no body.
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-camX, -camY);

    drawGrid(ctx, W, H, camX, camY);
    drawHazards(ctx);
    drawConstraints(ctx, space);

    // Every body except the bullets, which are too small to read as shapes.
    const skip = new Set();
    for (const rec of _bullets) if (rec.body) skip.add(rec.body);
    for (const rec of _ebullets) if (rec.body) skip.add(rec.body);
    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      if (skip.has(b)) continue;
      // A dead enemy is pulled out of the space, so it never reaches here.
      drawBody(ctx, b, showOutlines);
    }

    drawPickups(ctx);
    drawBossOverlay(ctx);
    drawEnemyOverlays(ctx);
    drawPlayerGun(ctx);
    drawBullets2d(ctx);
    // NOTE: the shared world cues (sniper laser, boss aim line, health bars)
    // are NOT drawn here — render3dOverlay draws them for every mode, and the
    // canvas2d adapter calls that too, so doing it here would double them.
    ctx.restore();
    ctx.restore();
    // Sparks, score popups and the HUD are left to render3dOverlay — the
    // canvas2d adapter calls that too, so drawing them here would double them.
    void space; void W; void H; void showOutlines;
  },

  // 3D — low-poly figures over the adapter's own terrain meshes.
  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter) {
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      adapter.syncBodies(space);
      renderer.render(scene, camera);
      return;
    }

    ensureBackdrop(adapter, scene);
    ensureBossMesh(adapter, scene);
    ensureFigures(adapter, scene);

    // Terrain, planks and bullets render through the adapter's normal path;
    // everything with a face is hidden and drawn as a figure instead.
    adapter.syncBodies(space);
    ensureTerrainStyle(adapter, scene);

    syncFigures();
    syncBulletMeshes(adapter, scene);
    syncPickupMeshes(adapter, scene);

    // Follow camera — the adapter only applies camX/camY on its default path,
    // which this override replaces, so it has to be done here.
    const camZ = camera.position.z;
    camera.position.set(W / 2 + camX, -H / 2 - camY, camZ);
    camera.lookAt(W / 2 + camX, -H / 2 - camY, 0);

    renderer.render(scene, camera);
  },

  // All render modes: the world-space gameplay cues that have no mesh of their
  // own (sniper laser sight, boss aim line, health bars, sparks, score popups)
  // plus the screen-space HUD.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    // Every render mode routes through here, so this is the one reliable place
    // to learn where the camera actually ended up (shake included).
    _cam.x = camX;
    _cam.y = camY;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawWorldCues(ctx);
    drawParticles2d(ctx);
    drawFloaters2d(ctx);
    ctx.restore();
    drawHUD(ctx);
    drawBossBar(ctx);
    drawCrosshair(ctx);
    drawBanners(ctx);
    drawTouchHint(ctx);
    void space; void W; void H;
  },
};
