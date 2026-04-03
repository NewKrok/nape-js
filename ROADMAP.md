# nape-js — Roadmap

## Completed Items

Done: P21-P28, P30-P33, P35, P37-P43, P45-P48, P50-P55, P57, P63, P66, P68, P70.
Cancelled: P34 (tree shaking — architectural limit), P36 (server demos — superseded by P52), P49 (ECS adapter — trivial pattern).

---

## Active Priorities

| #   | Priority                         | Effort | Impact   | Status                                                         |
| --- | -------------------------------- | ------ | -------- | -------------------------------------------------------------- |
| P29 | Test coverage >= 80%             | L      | safety   | :diamonds: ~55% (4895 tests)                                   |
| P44 | PixiJS integration — npm package | M      | adoption | :diamonds: Phase 1 done (demos), Phase 2 pending (npm package) |
| P56 | Interactive playground           | S-M    | adoption | :white_square_button: Not started                              |

---

## New Priorities

### Ecosystem & Integrations

| #   | Priority                     | Effort | Impact          | Why                                                                                                                                                   |
| --- | ---------------------------- | ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| P58 | **Phaser plugin/adapter**    | M      | :fire: adoption | Phaser is the #1 JS game framework — direct integration = massive reach. Phaser Box2D exists but lacks fluid sim, character controller, serialization |
| P59 | **React/R3F integration**    | M      | :fire: adoption | `@react-three/rapier`-style package for the React gamedev community. Growing market segment                                                           |
| P60 | **Tilemap collision helper** | S      | DX              | Tiled/LDtk map -> physics body conversion. Common gamedev need, low effort, high utility                                                              |

### Developer Experience & Onboarding

| #   | Priority                            | Effort | Impact          | Why                                                                                                                                                                                                                                                  |
| --- | ----------------------------------- | ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P65 | **One-click game templates**        | M      | :fire: adoption | `npm create nape-game@latest` or StackBlitz templates: platformer starter (CharacterController + tilemap + camera), top-down car, ragdoll fighter, pinball. A running first game in 5 minutes = the most important onboarding element                 |

### Physics Features

| #   | Priority                        | Effort | Impact            | Why                                                                                                                                                                                                                                               |
| --- | ------------------------------- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P62 | **Particle system**             | S-M    | features          | Physics-aware particle emitter — a frequently requested feature by gamedevs                                                                                                                                                                       |
| P64 | **Spring/Damper joint**         | S      | features          | Missing basic constraint. Soft-body, vehicle suspension, ragdoll hair, UI animations all want springs. Currently only solvable via UserConstraint                                                                                                  |
| P67 | **Destruction/Fracture system** | M      | :fire: wow-factor | Voronoi-based fracturing — `fractureBody(body, point, opts)` API. No other JS engine does this. Demos: **Voronoi Fracture** (click-to-shatter) and **Slingshot Siege** (slingshot + breakable castle with chain-reaction fracture). Visually impressive, great for marketing |

### Tooling & Infrastructure

| #   | Priority                                 | Effort | Impact          | Why                                                                                                                                                                                                                              |
| --- | ---------------------------------------- | ------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P61 | **Bundle size reduction**                | S-M    | competitiveness | Close the 87 KB vs Phaser Box2D 65 KB gap. Dead code audit, hot path optimization                                                                                                                                                |
| P68 | ~~Performance profiler / debug overlay~~ | S      | DX              | :white_check_mark: **Done.** `PerformanceOverlay` + `PhysicsMetrics` in `nape-js/profiler`. Canvas overlay with rolling graph, phase breakdown bar, entity counters. `space.profilerEnabled` + `space.metrics` API.               |
| P69 | **Deterministic replay system**          | M      | features        | Input recording + playback on top of existing serialization + deterministic mode. Debug bug reproduction, multiplayer rollback foundation, shareable replays, deterministic regression tests — one feature that connects many others |
| P70 | ~~**GPU Physics (WebGPU)**~~             | L      | performance     | :white_check_mark: **Done.** SoA typed-array solver buffers, graph coloring for parallel contacts, 3 WGSL compute shaders (contact, fluid, warm start), `GPUComputeSolver` class. Public API: `space.initGPU()` + `space.stepGPU(dt, velIter?, posIter?)`. Additive — no breaking changes |

---

## Recommended Execution Order

### Phase 1 — Finish what's started + onboarding (next)

1. **P44 Phase 2** — Ship `@newkrok/nape-pixi` npm package (auto-sync transforms, typed API, TSDoc)
2. **P56** — Interactive playground (StackBlitz/CodeSandbox template, editable examples)

### Phase 2 — Wow-factor + ecosystem

3. **P67** — Destruction/Fracture system (unique feature, marketing value)
4. **P58** — Phaser plugin/adapter (biggest community reach opportunity)
5. **P65** — One-click game templates (first game in 5 minutes)

### Phase 3 — Ecosystem expand

7. **P60** — Tilemap collision helper (low effort, high gamedev utility)
8. **P59** — React/R3F integration (growing market)
9. **P64** — Spring/Damper joint (fundamental physics feature)

### Phase 4 — Polish & tooling

10. **P62** — Particle system
11. ~~**P68** — Performance profiler~~ :white_check_mark: Done
12. **P69** — Deterministic replay system
13. **P61** — Bundle size reduction
14. **P29** — Continue test coverage push toward 80%
