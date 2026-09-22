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

---

## Flipper Fray

`docs/demos/flipper-fray.js` · showpiece · added 2026-09-12

### Premise

A four-player pinball brawl on one round table. The playfield is a **circle**
with four mouths cut into it, a pair of flippers guards each mouth, and the
table is a shallow dome: everything rolls outward from the centre, so every
ball eventually becomes somebody's problem. A ball that gets past your flippers costs a life. Five lives each;
the last pocket standing wins, or the most lives (then goals) when the
three-minute clock runs out. You hold the bottom pocket, three AI keepers hold
the rest. When a keeper is out their mouth is sealed with a kicker bar, so
dead pockets throw balls back instead of collecting them.

### Controls

| Input                       | Action                                         |
| --------------------------- | ---------------------------------------------- |
| ← / A                       | Left flipper (hold to keep it up)              |
| → / D                       | Right flipper                                  |
| Space                       | Both flippers; start / return to the title     |
| 1 / 2 / 3 on the title      | AI difficulty (Easy / Normal / Hard)           |
| Hold left / right half      | Touch: that flipper; drag across to switch     |

On the title the table runs an attract mode with all four pockets under AI.
Once you are eliminated the rest of the match plays out in a ×4 time-lapse
(the Space.step wrapper simply runs four ticks per slice).

### Table

| Element             | Numbers                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Playfield           | Circle of radius 194 around (450, 250); the player's mouth at the bottom                     |
| Mouths              | Chords of that circle, 120 wide — a half-angle of asin(60/194) ≈ 18°, at 90° steps           |
| Ring walls          | Nine straight segments per arc, all on the wall circle                                       |
| Pocket              | 120 wide, 52 deep; flipper pivots 6 in from the side walls                                 |
| Flipper             | 44 long, rest −0.40 rad (drooping into the pocket), raised +0.66 rad, 20 rad/s; rest gap ≈ 25 px for an 11 px ball |
| Bumpers             | Four, r 12, halfway between the mouths at 0.50 × the radius, +185 px/s away from the centre |
| Slingshots          | On the wall halfway between two mouths, base 64 along the wall, tip 16 inward, +155 px/s    |
| Lane posts          | Two per lane, r 7, 54 px in front of the mouth and ±36 px off its axis                      |
| Cross               | Kinematic, arms 42, 0.85 rad/s, reverses every 20 s; new balls spawn between its arms so it launches them |
| Field / damping     | 320 px/s² out from the centre, easing to 154 px/s² at the rim, + a rim funnel of up to 140 px/s² sideways, 0.26 /s damping, 740 px/s cap |

**Four passes to get to "a circle".** Each of the first three looked right on
paper and wrong on the table:

1. Six pockets at 60° steps on a wide ellipse bunch together at the flat ends.
   Equal **arc length** fixes the spacing; with four pockets the split lands on
   the axes, so every gap is identical.
2. Equal gaps on an *ellipse* still leave the pockets at different distances
   from the centre — 174 px for top and bottom, 325 px for left and right — so
   one keeper defends a short lane and the next a long corridor. It reads as a
   stretched table, and a fixed outward slope then feeds the near pockets far
   harder: the bottom pocket saw 720 approaches to the left pocket's 511 and
   won 8 matches in 10.
3. A slope whose low side **rotated** equalised the pressure, but it made the
   ball motion hard to read (why is everything leaning that way?) and needed a
   chevron cue and a HUD compass to explain itself.
4. The answer is the simple one: a **circular** playfield of constant radius
   with the mouths as chords, and a plain radial field pushing outward. All
   four quarters are congruent, so a constant push is fair by symmetry, and a
   ball always travels the same distance to any mouth. The table is bounded by
   the 500 px viewport height, ~482 px across, and the ~210 px margins left and
   right become the HUD gutters.

**The dome is steepest at the top, and it has to be steep.** The first
circular cut used 30 px/s² everywhere, which looks reasonable until a ball
arrives at the middle with inward speed: the turnaround alone takes 2 × v / a,
eight seconds at 120 px/s, and it reads as the ball stopping dead in the
centre and refusing to roll out. A stall probe (speed < 45 px/s inside
r < 110 for 0.75 s, logging what the ball touches) found eleven such crawls in
a two-minute match, none of them touching anything. A flat field cures the
crawl but fires everything at the flippers, so the profile falls off linearly
instead: 320 px/s² at the centre, 154 at the rim. The stall probe reports
nothing at all at that strength, and the ball still spends 38 % of its time
under 200 px/s. Past ~380 px/s² the keepers start losing the rim (save rate
89 %) and matches drop under 85 s, which is the ceiling worth using.

**A radial push needs a rim funnel.** On a closed circle a ball pressed
against the wall between two mouths simply stays there: the wall cancels the
push and damping kills what is left. So near the rim (scaled by (r/R)²) the
field adds a sideways term proportional to `sin` of the angle to the nearest
mouth — and it has to scale with the outward field, or a stronger push just
pins the ball harder. In the middle the field is purely radial; at the wall it
walks the ball around to the nearest mouth. Measured over twelve matches the
four pockets took 660 / 574 / 618 / 625 approaches and 55 / 54 / 56 / 53
drains, saves within 1.1 points of each other, and no ball was ever flagged
stuck.

### Match schedule

| Time      | Event                                                                                 |
| --------- | ------------------------------------------------------------------------------------- |
| 0:00      | 3 balls; target count grows to 4 at 0:30 and 5 at 1:20                                |
| 0:30, 1:00, … | Bomb ball (r 7.5): 9 s fuse, −2 lives if it drains, otherwise a 150 px radial blast that adds up to 520 px/s to nearby balls |
| 0:40, 1:35, 2:25 | Multiball: one extra ball at once and another 25 frames later                 |
| 3:00      | Time out — rank by alive, lives, goals, then elimination time                          |

A drained ball respawns after 70 frames only while the live count is below
the target. A goal is credited to the last flipper that touched the ball
within the previous 10 s, if it drains in someone else's pocket.

### AI keepers

For every ball heading at the mouth (local `vu < −25`) the keeper predicts
the time to the flipper line and where along the mouth it will cross. Within
the reaction window it schedules a press for the flipper on that side (both
for `|lv| < 14`), delayed by a few frames, with a per-approach miss chance;
slow balls crawling on a resting flipper (`lu < 34`, speed < 55) are cleared
too. Presses are held 7 frames, then a 5-frame cooldown.

| Level  | react (s) | jitter | miss | delay (frames) |
| ------ | --------- | ------ | ---- | -------------- |
| Easy   | 0.10      | 0.03   | 0.30 | 2 + 0..3       |
| Normal | 0.075     | 0.02   | 0.15 | 2 + 0..2       |
| Hard   | 0.05      | 0.01   | 0.05 | 1 + 0..1       |

**Late is good.** A flipper that is already up when the ball arrives parks the
ball against the pivot corner; when it drops, the ball rolls to the tip and
falls through. Sweeping the reaction window with a no-miss keeper gave save
rates of 93 % at 0.03 s, 89 % at 0.05, 86 % at 0.07 and 80 % at 0.10 s
(never flipping at all: 76 %, and the balls pile up on the flippers). The
difficulty table is built around that curve. On the circular four-pocket table an
all-AI match runs about 96 s, saves ~91 % of approaches and ends with all
three opponents out; none of the measured matches reached the buzzer.

### Physics

- Flippers are kinematic bodies whose origin is the pivot; the polygon plus a
  base and a tip circle make the paddle. Each physics step
  `setVelocityFromTarget(pivot, base + side · ang, 1/60)` drives them, so the
  angular speed is real and the contact solver passes it into the ball.
- The whole game tick runs from a wrapper around `space.step` installed in
  `setup()`, not from the per-frame `step()` hook. The runner steps the Space
  in fixed 1/60 slices with a variable number per frame; a per-frame flipper
  drive overshoots on slow displays and launched balls through walls in the
  swiftshader screenshots.
- Balls: `Circle(5.5)`, elasticity 0.86, low friction, rotation allowed (with
  `allowRotation = false` and default-friction flippers a ball would stick on
  a resting paddle), `isBullet = true`. Ring walls are 10 px thick.
- Bumper, slingshot and flipper hits are `InteractionListener(BEGIN,
  COLLISION)` callbacks on CbTypes; the flipper listener stamps `lastHit` for
  goal credit and adds a 70 px/s inward boost when the paddle is moving up.
- Drains are polled in pocket-local coordinates (`u < −18`), eliminations
  add a static kicker bar across the mouth and drop the flipper bodies.

### Renderers

- Canvas2D fills the ground and then uses the shared grid, constraint and body
  passes; `userData._color` carries the keeper colours. The opaque fill
  matters: the examples grid keeps the 3D poster behind the card canvas for
  the card's whole life, so a transparent clear let the 3D render ghost
  through the flat one. PixiJS draws its own body pass on an opaque stage.
- The overlay (all modes) draws the clock, the keeper cards (in the side
  gutters in 2D, beside each pocket in 3D), bomb fuses, banners,
  floaters and the title / result screens; in 2D it also draws bumper flashes,
  particles and the drain sink.
- 3D: the star outline is extruded with a canvas texture on top (hex grid,
  lane chevrons in each keeper's colour, centre medallion); ring walls are one
  `InstancedMesh` with an emissive rubber strip on top; pockets are emissive
  boxes with life lamps and a seal panel that rises when the keeper is out;
  bumpers flash and pop; balls are `MeshStandardMaterial` chrome under a
  PMREM environment built from a canvas equirect (falls back to a less
  metallic finish when the render target fails); particles are instanced
  cubes. The play camera sits behind the player's pocket; the title sways
  around the same side rather than orbiting, so the poster shot always has the
  whole table in frame. The orientation is written with
  `quaternion.setFromRotationMatrix(lookAt(eye, target, +Z))` so the adapter's
  `camera.up` is untouched.

### Balance notes

- A post **on** the lane axis is a trap: it blocks the funnel into the mouth,
  halved the approach count on the far pockets and ran seven matches in eight
  into the clock. Two posts flanking the lane give the same scattering without
  closing it.
- Every shape that is not part of the circle is a place for a ball to wedge.
  The bays of the earlier rounded-square ring collected balls in their corners
  and the slingshots sat at odd angles inside them, because a bay midpoint and
  the wall tangent there do not agree.
- Sealed pockets must kick. As plain walls they collected every ball the
  slope pushed at them and the harness flagged dozens of stuck balls.
- Bumper kicks are velocity adds, not impulses, so the bomb ball (heavier)
  reacts like the others.
- The pass that slowed the table down (ball 7 → 5.5 px, cap 950 → 740) also
  made every save easier: drains fell from 15 to 6 per minute. Shortening the
  flippers by 2 px, giving back some speed and kick, and raising the ball
  count to 3/4/5 landed the match at ~140 s.
