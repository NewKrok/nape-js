# Contributing to nape-js

Thanks for your interest in contributing! This document describes how the project
is maintained, what to expect during the review process, and how to make your
contribution land smoothly.

## How PRs are reviewed

**Every pull request is reviewed collaboratively with [Claude Code](https://www.anthropic.com/claude-code)**
before a merge decision is made. The maintainer ([@NewKrok](https://github.com/NewKrok))
walks through a structured review with Claude that covers:

- **Scope check** — does the PR do what its title says, nothing more?
- **Acceptance criteria** — every checklist item from the linked issue is
  marked ✅ / ❌ / ⚠️ in a table. Partial coverage is flagged explicitly.
- **Engine safety** — for changes under `packages/nape-js/src/`, mid-step
  invariants and `immutable_midstep` guards are checked. Removing or weakening
  a guard is treated as a behaviour change, not a test fix, and needs an
  issue-level design discussion first.
- **Pre-push checks** — `format:check`, `lint`, `test`, and `build` must all
  pass on the rebased branch.
- **Runtime smoke test** — for demos, the docs server is started and the demo
  is exercised in the relevant renderers; for engine changes, an adversarial
  smoke script is run against the changed code.

The full playbook lives in [`.claude/skills/pr-review/SKILL.md`](.claude/skills/pr-review/SKILL.md)
and is invoked as `/pr-review` during the review session. You don't need to run
it yourself, but you may find it useful to know what's checked.

## Before opening a PR

To save a round-trip, please:

1. **Branch from current `master`.** A stale fork often results in a diff that
   appears to revert unrelated changes (file deletions, version downgrades,
   etc.) — a rebase fixes it but it's easier to start fresh.

2. **Link the issue.** Add `Closes #<N>` to the PR description so GitHub links
   the PR to the issue and closes it on merge.

3. **Cover the issue's acceptance criteria.** If the issue has a checklist,
   address every item. If the PR scope is intentionally narrower, update the
   PR title/description to reflect the actual scope so the table doesn't read
   as "missing".

4. **Run the pre-push checklist locally.** All four must pass:

   ```bash
   npm run format:check    # Prettier (auto-fix with `npm run format`)
   npm run lint            # ESLint
   npm test                # Vitest (6169 + 73 tests baseline)
   npm run build           # tsup — catches type errors that vitest doesn't
   ```

5. **Don't touch the engine source for test-only PRs.** If a test needs the
   engine to allow something it currently throws on, that's a separate design
   discussion — open an issue first.

## What gets flagged as a blocker vs a nit

**Blockers** (must be addressed before merge):

- Engine source changes that weaken existing invariants / guards
- Acceptance criteria not met when the PR claims to address an issue
- Security issues (eval, unsafe HTML, file-system access from demos, etc.)
- Failing pre-push checks
- Reverts of unrelated code (stale-fork symptom)

**Housekeeping** (mentioned but not blockers — easy fixes):

- Rebase needed
- Prettier formatting
- Missing `Closes #N` link

**Nits** (suggestions, not required):

- Code style / convention alignment with neighbouring files
- Redundant defensive code (try/catch around things that can't throw)
- Doc improvements

The contributor draft message at the end of every review lists these in that
priority order, so you'll see immediately what's a blocker and what's not.

## Repo layout & conventions

See [`CLAUDE.md`](CLAUDE.md) for:

- Package structure (workspaces, public vs private packages)
- Build & test commands
- Release process (per-package, auto, conventional commits)
- Architecture (public API wrappers + internal ZPP classes)
- Links to detailed guides (architecture, testing, workflow, multiplayer, replay)

## Questions

Open a [discussion](https://github.com/NewKrok/nape-js/discussions) or an issue.
For PRs in progress, draft PRs are welcome — request a review when ready and the
collaborative review will run.
