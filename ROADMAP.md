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

The engine is feature-rich (85 demos, fluid sim, replay, character controller,
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

| #   | Priority                  | Effort  | Impact          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------- | ------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P91 | **Demo / example growth** | ongoing | :fire: adoption | The one channel with measured return. Social posts about showpiece demos draw real traffic (Flipper Fray: 13.7 k views); nothing else in the project has produced an attributable signal. Open demo tickets roll up here: #213 (cannon fortress duel), #212 (ten-pin bowling), #211 (basketball hoop shooter), #180 (rope-cut puzzle). Prefer demos that _teach an undocumented API_ — #199 (`createConcaveBody`) and #198 (`UserConstraint`) double as API docs and rank above pure game demos |
| P29 | Test coverage → 80%       | L       | safety          | :white_check_mark: Reached — 80% statement coverage, 6527 tests (+79 pixi). Recent closes: #161, #163, #164, #165, #166, #168, #169, #170                                                                                                                                                                                                                                                                                                                                                       |

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
   the work. Prefer the two API-teaching tickets (#199, #198) over pure game
   demos when picking.
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
