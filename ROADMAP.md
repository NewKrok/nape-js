# nape-js — Roadmap

## Completed Items

Done: P21-P28, P30-P33, P35, P37-P43, P44, P45-P48, P50-P57, P60, P62, P63, P64, P66-P68, P69, P70, P71, P72, P76, P78, P79, P80, P81, P82, P85.
Done (partial): P65 — platformer template + `/templates` page shipped; the `create-nape-game` CLI is implemented but **on hold** (kept private, not published) until adoption signal justifies the maintenance surface.
Cancelled: P34 (tree shaking — architectural limit), P36 (server demos — superseded by P52), P49 (ECS adapter — trivial pattern).

Reference docs for shipped features (don't duplicate here):

| Feature                       | Where it's documented                                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@newkrok/nape-pixi` (P44)    | [`packages/nape-pixi/README.md`](packages/nape-pixi/README.md)                                                                                                    |
| Tilemap helper (P60)          | [README](README.md) · [`llms.txt`](packages/nape-js/llms.txt) · [Cookbook](docs/guides/cookbook.md)                                                               |
| `RadialGravityField` (P70)    | [README](README.md) · [`llms.txt`](packages/nape-js/llms.txt)                                                                                                     |
| `ParticleEmitter` (P62)       | [README](README.md) · [`llms.txt`](packages/nape-js/llms.txt) · [Cookbook](docs/guides/cookbook.md#particle-emitter-bullets-sparks-debris)                        |
| Replay system (P69)           | [`docs/guides/replay-guide.md`](docs/guides/replay-guide.md) · [Cookbook](docs/guides/cookbook.md#replay--recording-deterministic-playback)                       |
| Save/Load + Rewind demo (P71) | [Cookbook](docs/guides/cookbook.md#serialization-save--load) · `docs/demos/save-load-rewind.js`                                                                   |
| StackBlitz playground (P56)   | `docs/stackblitz-templates.js` · the StackBlitz button next to CodePen on every demo                                                                              |
| Game templates (P65)          | [`templates/platformer/`](templates/platformer/) · [`/templates`](https://napejs.org/templates.html) — CLI under `packages/create-nape-game/` is on hold (private)  |

---

## Strategy

The engine is feature-rich (~50 demos, fluid sim, replay, character controller,
helpers — beyond what the leading JS competitors ship). External adoption
signal is still weak: 0 issues / PRs from non-maintainers, ~3 trivial public
references via GitHub code search. The npm download counter is dominated by
CI / mirrors / scanners, not real users.

→ The next investments are weighted toward **discoverability and onboarding
friction**, not feature depth. Demo-front growth is paused — the demo grid is
already saturated.

---

## Active Priorities

| #   | Priority                  | Effort | Impact          | Notes                                                                                                                                                                                                                                                              |
| --- | ------------------------- | ------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P75 | **More game templates**   | M      | :fire: adoption | Standalone demos shipped (ragdoll #179, thrust-runner #181, block-stacking #182, minigolf #183, top-down kart #184, pulley #197, tilt-maze #200). **Remaining:** promote the strongest of these into a first-class `/templates` starter (clone/StackBlitz), re-surface the `Templates` tab on the homepage, and decide whether to revive `create-nape-game` (currently `private: true`, parked) once template count grows |
| P61 | **Bundle size reduction** | S-M    | competitiveness | 123 KB vs Phaser Box2D 65 KB, gap is widening (+~36 KB from recent helpers). Real adoption blocker. Dead-code audit, hot-path review, helper opt-in re-export plan        |
| P58 | **Phaser plugin/adapter** | M      | :fire: adoption | #1 JS game framework. Worth doing now that the platformer template is live — adapters need a working onboarding story to demo against                                     |
| P59 | **React/R3F integration** | M      | adoption        | `@react-three/rapier`-style package for the React gamedev community. After P58                                                                                            |
| P29 | Test coverage → 80%       | L      | safety          | :diamonds: 6169 tests (+73 pixi). Background work, not blocking anything. Recent closes: #161, #163, #164, #165, #166, #168, #169, #170                                   |

---

## Long-Tail / Speculative

Not blocking anything; revisit only when a concrete user request justifies the cost.

| #   | Priority                          | Effort | Why deferred                                                                                                                                                            |
| --- | --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P73 | Replay delta encoding             | M      | Snapshot keyframes are ~150–300 B/body. No one has reported the size as a pain point. Worth ~5–10× shrink, but the demand is hypothetical                               |
| P74 | Cross-platform deterministic math | L      | Same-platform determinism already works. Fixed-point hot path (Q32.32) is only needed for true P2P rollback netcode — no concrete user case yet, large engine-wide cost |

---

## Recommended Execution Order

1. **P75** — Promote a shipped demo into a first-class `/templates` starter (the standalone game demos are done; the CLI stays parked until template count or user demand justifies it)
2. **P61** — Bundle size reduction
3. **P58** — Phaser plugin/adapter
4. **P59** — React/R3F integration
5. **P29** — Continue test coverage push toward 80% (background)
6. (Defer **P73** and **P74** until a concrete user request appears)
