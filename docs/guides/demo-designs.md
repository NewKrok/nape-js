# Demo design notes

Full design write-ups for the showpiece demos. A demo's `desc` field (the
card blurb on the examples grid, the per-demo page and the `/games/` landing)
is deliberately short; everything that does not fit there lives here.

## The `desc` rule

The `desc` in a demo's `export default { … }` header is a **teaser**, not a
manual. Keep it under roughly **1000 characters including markup**, in four
beats:

1. What it is (genre, the well-known game it echoes, the win condition).
2. How to play — keyboard and touch in one sentence each.
3. The physics hook: which engine features carry the gameplay.
4. One sentence on the 3D treatment.

Weapon tables, monster rosters, timelines, balance notes and the reasoning
behind a mechanic go into a section below, not into `desc`. The six locale
files carry a translation of `desc` each, so every extra sentence is written
seven times — another reason to keep it short.

---

## Swarm Night

`docs/demos/swarm-night.js` · showpiece · added 2026-09-12

### Premise

A survivor roguelite in the Vampire Survivors mould. Five minutes in a walled
graveyard against a night that never stops spawning. The player only steers:
every weapon fires on its own, the whip toward its target, the wand at the
nearest monster, knives the way you run, the ward around you, the orbs on
their orbit, the storm at its own picks. Kills drop XP gems; a full bar pauses
the night and offers three upgrade cards. Dawn at 5:00 is the win; death ends
the run with a stats screen.

### Controls

| Input                      | Action                                              |
| -------------------------- | --------------------------------------------------- |
| WASD / arrows              | Move (facing follows the last movement direction)   |
| Space / Enter              | Start the run, restart after the end screen         |
| 1 / 2 / 3, click           | Pick an upgrade card                                |
| Hold anywhere (touch/mouse)| Steer toward the pointer, speed scales with distance|

Touch steering works in **screen space** (`screenFromWorld` of the hero vs the
pointer), so it behaves the same under the flat 2D camera and the tilted 3D
one.

### Weapons

All weapons level 1–5. Cooldowns are multiplied by the Dusty Tome passive,
damage by Iron Fist, areas by Wide Lens.

| Weapon          | Behaviour                                                                                         | Per level                                  |
| --------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Silver Whip     | Starting weapon. Arc (±1.15 rad) toward the **nearest monster in reach**, else toward facing. Knockback. | +dmg, −cd, range; Lv3 adds a rear arc      |
| Moon Wand       | Bolt at the nearest monster, sensor body, pierces.                                                | +bolts every 2 levels, +pierce, +dmg       |
| Throwing Knives | Fan of knives in the movement direction, staggered by 2 frames.                                   | +1 knife per level; Lv5 pierces once       |
| Garlic Ward     | Ring around the hero, pulses every 0.5 s: damage plus a radial knockback impulse.                 | +radius, +dmg                              |
| Spirit Orbs     | Kinematic sensor circles on an orbit; hits on `BEGIN`, per-monster 18-frame cooldown.             | +1 orb per level, faster, +dmg             |
| Storm Call      | Lightning on random monsters within 300 px.                                                       | +strikes every 2 levels; Lv3 chains once   |

The whip's auto-aim is the result of a simulation finding: a fleeing bot never
hit anything while the whip followed the movement direction, so the run
produced no XP and no level-ups. Aiming at the nearest monster fixed both.

### Passives

Swift Boots (+8 % speed), Hollow Heart (+15 max HP), Lodestone (+32 magnet
range), Dusty Tome (−7 % cooldowns), Iron Fist (+12 % damage), Grave Plate
(−1 damage taken), Clover (+0.5 HP/s), Wide Lens (+10 % area). Five levels
each. Card rolls weight upgrades to owned weapons highest, new weapons lower
once the belt holds four; when everything is maxed a Bandage (+30 HP) card is
offered.

XP curve: `xpFor(level) = 8 + 5·level + 0.5·level²`.

### Monsters

Hit points scale with run time (`× (1 + 0.9 · min(1.2, t / 5 min))`).

| Type          | r  | HP   | Speed | Contact dmg | XP | Notes                                                    | From |
| ------------- | -- | ---- | ----- | ----------- | -- | -------------------------------------------------------- | ---- |
| Bat           | 8  | 6    | 135   | 3           | 1  | Sideways sine swoop; flies (3D)                          | 0:00 |
| Ghoul         | 12 | 18   | 62    | 5           | 1  | Plain chaser                                             | 0:00 |
| Skeleton      | 11 | 26   | 96    | 6           | 1  | Faster chaser                                            | 0:45 |
| Spitter       | 12 | 34   | 72    | 4 (spit 8)  | 3  | Keeps 170–250 px, strafes, spits a sensor body           | 1:30 |
| Brute         | 22 | 170  | 48    | 14          | 3  | Mass 4, shrugs off knockback, drops hearts               | 2:00 |
| Wraith        | 10 | 40   | 118   | 8           | 3  | Collides with the hero only — drifts through stones      | 2:45 |
| Grave Knight  | 20 | 750  | 88    | 16          | 10 | Elite: winds up, charges at 520 px/s, drops a chest      | events |
| Bone Colossus | 42 | 5200 | 56    | 25          | 30 | Boss: charge, ground slam (230 px radial impulse), summons 10 skeletons every 8 s | 4:00 |

Regular spawns trickle at `0.9 + 1.5 · minutes` per second (× 1.6 after 4:00),
capped at 420 alive. Monsters more than 1150 px from the hero are recycled to
the spawn ring rather than removed, so pressure never drops.

### Schedule

| Time | Event                                       |
| ---- | ------------------------------------------- |
| 1:00 | Ring of 36 bats                             |
| 1:30 | Grave Knight                                |
| 2:30 | Ring of 44 ghouls                           |
| 3:00 | Grave Knight                                |
| 3:30 | Wall of 40 skeletons from one side          |
| 4:00 | Bone Colossus                               |
| 4:30 | Ring of 24 wraiths                          |
| 5:00 | Dawn — win                                  |

### Pickups

Hearts (30 % heal; ghouls 3.5 %, brutes 35 %), Magnet (pulls every gem;
spitters 8 %), Bomb (90 damage to everything within 520 px; wraiths 6 %,
skeletons 0.6 %), Chest (one upgrade pick; every knight and the colossus).
Gems merge into one bigger gem once more than 360 lie about, taking the
oldest far-away ones first.

### Physics

- Every monster is a dynamic circle in a zero-gravity `Space`. The contact
  solver *is* the crowd: the horde squeezes, queues at gravestones and streams
  around obstacles with no flocking code. Steering blends a desired velocity
  into the body's own (`lerp 0.16`), so contact impulses survive a frame.
- Knockback is `applyImpulse(dir · k · mass / √density)`, so a bat flies and a
  brute barely notices. The ward and the colossus' slam are radial impulses
  over everything in range, the hero included.
- Collision groups: hero / monsters / solids / hero shots / spit / orbs.
  Wraiths collide with the hero only. Sensor groups carry side membership, so
  hero shots can only ever touch monsters and spit can only touch the hero.
- Bolts, knives and spit are dynamic sensor bodies; orbs are kinematic sensor
  bodies driven by a velocity that lands them on their orbit point each step.
  Hits arrive through `InteractionListener(BEGIN, SENSOR, …)`.
- Contact damage comes from an `ONGOING` collision listener between monsters
  and the hero; the strongest toucher lands one hit per 36-frame window.
- Solver: `velocityIterations: 5, positionIterations: 2`. A full five-minute
  run with 450 monsters alive stepped at ~0.5 ms average in Node.

### Renderers

- **Canvas2D**: custom graveyard art (plots, paths, fence, stones, dead trees,
  mausoleum, lantern glows), body outlines drawn on top when outlines are on.
- **PixiJS**: one `Graphics` layer redrawn per frame with the same scene.
- **3D**: moonlit graveyard — sky sphere with stars and moon, painted ground
  plane on a dark earth plinth, instanced iron fence, stones and crosses,
  dead trees, mausoleum, five lantern posts with flickering `PointLight`s,
  drifting ground mist, fireflies, and the hero's own lantern light. Every
  monster type is a rig of `InstancedMesh` parts (torso, head, swinging legs
  and arms, flapping wings) — one draw call per part per type, so hundreds
  animate for ~50 draw calls. Hit flashes go through `instanceColor`. Gems,
  bolts, knives, spit and particles are instanced too; arcs, rings, lightning
  polylines and wind-up warnings come from small pools. A tilted chase camera
  (pitch 0.98 rad, 640 px back) follows the runner's smoothed focus, so shake
  and bounds come for free; the overlay projects world cues through it.

### Title screen

The title phase spawns a 64-monster horde milling around the hero at 230–520
px, so the first frame — and the poster — already shows the night gathering.

### Balance notes

Tuned with a headless Node bot (`demo.step` + `space.step`, steering via the
pointer API, picking card 1). First cut: a fleeing bot died in ~10 s and
levelled once in five minutes. Fixes: whip auto-aim, contact damage lowered
(5–8 → 3–6 on commons), spawn rate 1.3 + 1.7·min → 0.9 + 1.5·min, hero speed
165 → 175, invulnerability 30 → 36 frames, XP curve softened. Not yet
validated by real play.
