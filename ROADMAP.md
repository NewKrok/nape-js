# nape-js — Roadmap

## Completed Items

Done: P21-P28, P30-P33, P35, P37-P43, P44, P45-P48, P50-P57, P60, P62, P63, P64, P66-P68, P69, P70, P71, P72, P76, P78, P79, P80, P81, P82, P85.
Done (partial): P65 — platformer template + `/templates` page shipped; the `create-nape-game` CLI was implemented, parked, and finally **removed** (recover from git history if ever needed).
Cancelled: P34 (tree shaking — architectural limit), P36 (server demos — superseded by P52), P49 (ECS adapter — trivial pattern), P75 (more game templates — AI-first onboarding makes template multiplication redundant; the standalone game demos cover the genres, the existing `templates/platformer/` stays as the single project-structure reference; issue #152 closed as not planned).

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
| Game templates (P65)          | [`templates/platformer/`](templates/platformer/) · [`/templates`](https://napejs.org/templates.html) — the `create-nape-game` CLI was removed (see git history)     |

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
| P61 | **Bundle size reduction** | M      | competitiveness | Re-measured 2026-09 (esbuild metafile): the main entry really costs **829 KB min / 166 KB gzip** — the old 123 KB figure counted only the pre-code-splitting `index.js`. Composition: native solver core dominates (`ZPP_Space.ts` alone 145 KB = 17%; native/space+geom+constraint = 51%); helpers are only 2.5%, so helper subpath re-exports are **not** a lever. Property mangling ruled out: `zpp_inner`/`zpp_gl` are de facto public (docs demos, `docs/renderer.js`, nape-pixi, public d.ts); with those reserved the win measures −15 KB raw / −0.6 KB gzip. ES2022 target: no change. **The one real lever: a slim core entry** — a tree-shaken Space+Body+Circle+Polygon bundle measures ~418 KB / 88 KB gzip but currently throws (`_createPreCb` missing) because factory registrations live in the monolithic `core/bootstrap.ts`; splitting registrations per-domain would get a typical game to ~95–105 KB gzip with the main entry unchanged |
| P58 | **Phaser plugin/adapter** | M      | :fire: adoption | #1 JS game framework. Worth doing now that the platformer template is live — adapters need a working onboarding story to demo against                                     |
| P59 | **React/R3F integration** | M      | adoption        | `@react-three/rapier`-style package for the React gamedev community. After P58                                                                                            |
| P29 | Test coverage → 80%       | L      | safety          | :white_check_mark: Reached — 80% statement coverage, 6272 tests (+73 pixi). Recent closes: #161, #163, #164, #165, #166, #168, #169, #170                                   |

---

## Long-Tail / Speculative

Not blocking anything; revisit only when a concrete user request justifies the cost.

| #   | Priority                          | Effort | Why deferred                                                                                                                                                            |
| --- | --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P73 | Replay delta encoding             | M      | Snapshot keyframes are ~150–300 B/body. No one has reported the size as a pain point. Worth ~5–10× shrink, but the demand is hypothetical                               |
| P74 | Cross-platform deterministic math | L      | Same-platform determinism already works. Fixed-point hot path (Q32.32) is only needed for true P2P rollback netcode — no concrete user case yet, large engine-wide cost |

---

## Recommended Execution Order

1. **P61** — Bundle size reduction
2. **P58** — Phaser plugin/adapter
3. **P59** — React/R3F integration
4. **P29** — ✅ Done: 80% statement coverage reached
5. (Defer **P73** and **P74** until a concrete user request appears)

Template building is retired (P75 cancelled, `create-nape-game` removed):
with AI-first onboarding, the leverage is in AI-consumable assets
(`llms.txt` / `llms-full.txt`, cookbook recipes) rather than more starters.
`templates/platformer/` remains as the single project-structure reference.
