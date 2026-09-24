# nape-js — Roadmap

## Completed Items

Done: P21-P28, P30-P33, P35, P37-P43, P44, P45-P48, P50-P57, P60, P62, P63, P64, P66-P68, P69, P70, P71, P72, P76, P78, P79, P80, P81, P82, P85.
Done (partial): P65 — platformer template + `/templates` page shipped; the `create-nape-game` CLI was implemented, parked, and finally **removed** (recover from git history if ever needed).
Cancelled: P34 (tree shaking — architectural limit), P36 (server demos — superseded by P52), P49 (ECS adapter — trivial pattern), P75 (more game templates — AI-first onboarding makes template multiplication redundant; the standalone game demos cover the genres, the existing `templates/platformer/` stays as the single project-structure reference; issue #152 closed as not planned).

Cancelled 2026-09-23 after re-measurement (see Strategy):

- **P61 — Bundle size reduction** (#154). The 2026-09 esbuild-metafile study refuted every lever it looked at: property mangling measures −0.6 KB gzip once the de-facto-public `zpp_inner` / `zpp_gl` are reserved, ES2022 target is neutral, helper subpath re-exports are not a lever (helpers are 2.5 % of the bundle). The single remaining lever — a slim core entry — requires splitting the factory registrations out of the monolithic `core/bootstrap.ts`, i.e. surgery on the registration flow that the whole ZPP architecture rests on. At 166 KB gzip the engine is not an outlier (Matter.js ~87 KB, Planck ~100 KB, Rapier WASM ~500 KB+), and Rapier wins adoption while being larger. Nobody is declining to use nape-js because of its size.
- **P58 — Phaser plugin / adapter** (#153). Phaser ships Matter.js in the box and Arcade Physics as the default; an adapter would have to beat two bundled options, and no adapter wins that fight — a differentiating feature would, and then the feature sells it, not the adapter. Confirmed by the sibling experiment: `@newkrok/nape-pixi` has been published for months at ~346 downloads/month, while the _unpublished_ Three.js renderer in `docs/renderers/` carries every showpiece demo. Binding to a third-party plugin API also makes each Phaser major our maintenance problem.

Reference docs for shipped features (don't duplicate here):

| Feature                       | Where it's documented                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@newkrok/nape-pixi` (P44)    | [`packages/nape-pixi/README.md`](packages/nape-pixi/README.md)                                                                                                  |
| Tilemap helper (P60)          | [README](README.md) · [`llms.txt`](packages/nape-js/llms.txt) · [Cookbook](docs/guides/cookbook.md)                                                             |
| `RadialGravityField` (P70)    | [README](README.md) · [`llms.txt`](packages/nape-js/llms.txt)                                                                                                   |
| `ParticleEmitter` (P62)       | [README](README.md) · [`llms.txt`](packages/nape-js/llms.txt) · [Cookbook](docs/guides/cookbook.md#particle-emitter-bullets-sparks-debris)                      |
| Replay system (P69)           | [`docs/guides/replay-guide.md`](docs/guides/replay-guide.md) · [Cookbook](docs/guides/cookbook.md#replay--recording-deterministic-playback)                     |
| Save/Load + Rewind demo (P71) | [Cookbook](docs/guides/cookbook.md#serialization-save--load) · `docs/demos/save-load-rewind.js`                                                                 |
| StackBlitz playground (P56)   | `docs/stackblitz-templates.js` · the StackBlitz button next to CodePen on every demo                                                                            |
| Game templates (P65)          | [`templates/platformer/`](templates/platformer/) · [`/templates`](https://napejs.org/templates.html) — the `create-nape-game` CLI was removed (see git history) |

---

## Strategy

The engine is feature-rich (86 demos, fluid sim, replay, character controller,
helpers — beyond what the leading JS competitors ship). External adoption
signal is still weak: 0 issues / PRs from non-maintainers, ~3 trivial public
references via GitHub code search. The npm download counter (1–4 k/month,
non-monotonic) is dominated by CI / mirrors / scanners, not real users.
76 stars / 1 watcher after 4 years.

**What is measurably working: the demos.** Social posts about individual
showpiece demos draw real traffic — the Flipper Fray post hit 13.7 k views.
Nothing else in the project has produced a comparable, attributable signal.

**What is measurably not working: framework adapters and byte-shaving.**
`@newkrok/nape-pixi` has been published for months and sits at ~346
downloads/month — indistinguishable from scanner noise. Bundle size was
re-measured in depth (P61) and every lever except one was refuted outright.

→ Investment is weighted toward **demos and examples as the top of the funnel**,
on the theory that traffic converts to npm usage over time. Adapter packages
and bundle-size work are retired, not deferred: they were bets on an audience
that has to exist _before_ they pay off, and the demos are what create that
audience.

---

## Active Priorities

| #   | Priority                  | Effort  | Impact          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------- | ------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P91 | **Demo / example growth** | ongoing | :fire: adoption | The one channel with measured return — see **Which demos travel** below for the post numbers and what they imply. Ordered by recognisability: #212 (ten-pin bowling), #211 (basketball hoop shooter), #213 (cannon fortress duel), then #180 (rope-cut puzzle — familiar form, but a puzzle reads slower). #199 (`createConcaveBody`) and #198 (`UserConstraint`) are tracked here too but judged on a different axis: they document an undocumented API, which is worth doing regardless of reach |
| P29 | Test coverage → 80%       | L       | safety          | :white_check_mark: Reached — 80% statement coverage, 6527 tests (+79 pixi). Recent closes: #161, #163, #164, #165, #166, #168, #169, #170                                                                                                                                                                                                                                                                                                                                                          |

### Which demos travel

Post reach for the showpiece demos, as of 2026-09. Small sample, one author,
one platform — treat as direction, not proof.

| Demo              | Views      | Form                     |
| ----------------- | ---------- | ------------------------ |
| flipper-fray      | **13.7 k** | pinball                  |
| dodgeball         | **5.5 k**  | dodgeball                |
| kickoff (2D post) | **5.2 k**  | football                 |
| kickoff (3D post) | 2.8 k      | football (repeat post)   |
| jungle-strike     | 1.5 k      | run-and-gun              |
| capture-the-flag  | 1.5 k      | capture the flag         |
| escape-run        | 1.3 k      | escape                   |
| swarm-night       | 224        | survival waves           |
| pulse             | 170        | abstract                 |
| shard-rush        | 153        | hero arena, kits         |
| tin-legion        | 120        | lane siege, army builder |
| blade-waltz       | 119        | LMBS arena               |

The distribution is **bimodal**, not a tail: nothing lands between 1.3 k and 224. Algorithmic noise produces spread, not a 6× gap with a hole in it, so
something real separates the two groups.

**The split is recognisability, not production value.** The top group is
pinball, dodgeball, football, capture-the-flag, escape, run-and-gun — forms a
viewer can name from one frame. The bottom group is a lane-siege army builder,
a Tales-style LMBS arena, a hero arena with kits: the demos that took the _most_
work returned the least. A demo that needs a sentence of explanation has
already lost the scroll.

**Render dimension is not the variable.** The obvious reading of the kickoff
pair (2D 5.2 k vs 3D 2.8 k) is that 3D underperforms — but flipper-fray, the
single best result here, ships a full `render3d` rig. The kickoff gap is better
explained by the two posts not being independent (a second post about the same
demo reaches an audience that has already seen it). No render guidance is drawn
from this data; if the form is recognisable, 3D appears to help rather than hurt.

**So the lever is form, not fidelity.** Pick shapes a viewer already knows, then
make them look as good as the budget allows.

---

## Long-Tail / Speculative

Not blocking anything; revisit only when a concrete user request justifies the cost.

| #   | Priority                          | Effort | Why deferred                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P73 | Replay delta encoding             | M      | Snapshot keyframes are ~150–300 B/body. No one has reported the size as a pain point. Worth ~5–10× shrink, but the demand is hypothetical                                                                                                                                                                                                                                                                                                                                                       |
| P74 | Cross-platform deterministic math | L      | Same-platform determinism already works. Fixed-point hot path (Q32.32) is only needed for true P2P rollback netcode — no concrete user case yet, large engine-wide cost                                                                                                                                                                                                                                                                                                                         |
| P59 | React / R3F integration           | M      | Weaker version of the P58 problem: `@react-three/rapier` already occupies the slot, and Rapier's determinism story is the one that community asks about. Unlike Phaser there is no bundled default physics in R3F, so the door isn't shut — revisit if someone asks                                                                                                                                                                                                                             |
| P92 | Pixi3D support (open question)    | ?      | **Undecided, deliberately.** If it happens, the default shape is an _extra renderer_ in `docs/renderers/` on the Three.js model — not a published adapter package. A docs renderer has no API contract to honour, isn't bound to Pixi3D's release cycle, and produces the thing that actually sells the engine (a running demo). Blocked on availability: Pixi3D isn't broadly usable yet. A package can always be extracted from a renderer later; a published 0.x package cannot be withdrawn |

---

## Recommended Execution Order

1. **P91** — Demo / example growth. The only item with a measured return, and
   now the standing default: when nothing else is pressing, the next demo is
   the work. Pick by recognisability (see _Which demos travel_): #212, #211,
   #213, then #180. #199 and #198 are worth doing for the API coverage, not
   for reach — don't judge them on views.
2. **P29** — ✅ Done: 80 % statement coverage reached.
3. (Defer **P73**, **P74**, **P59**, **P92** until a concrete user request appears.)

Two whole categories are retired, and it is worth keeping the reasons visible so
they don't get re-proposed:

- **Framework adapter packages** (P58 cancelled, P59 long-tailed). Adapters are a
  bet on an audience that must already exist for them to pay off. `nape-pixi`
  tested that bet and lost; the Three.js renderer — never packaged — won.
  `@newkrok/nape-pixi` stays published and maintained; "no new adapter packages"
  is not a reason to withdraw a working one.
- **Template building** (P75 cancelled, `create-nape-game` removed). With AI-first
  onboarding the leverage is in AI-consumable assets (`llms.txt` /
  `llms-full.txt`, cookbook recipes) rather than more starters.
  `templates/platformer/` remains as the single project-structure reference.
