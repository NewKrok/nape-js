---
name: pr-review
description: Review a GitHub pull request on the NewKrok/nape-js repo end-to-end — checkout, rebase test, full pre-push checks (format, lint, test, build), engine-safety review, and a merge recommendation. Trigger when the user pastes a PR URL/number for nape-js, or types `/pr-review`.
---

# PR review — nape-js

This skill walks through the standard nape-js PR review process. Every PR to this repo is reviewed using this playbook collaboratively with Claude before the user decides on merge.

## Inputs

Accept any of:

- A full URL like `https://github.com/NewKrok/nape-js/pull/172`
- Just a number like `172`
- The phrase "this PR" or "the open PR" when the current branch is a PR branch

## Steps

Work through these in order. Use the TodoWrite tool to track progress. Each step is a checkpoint — if any one fails, stop and report; don't bury blockers in a long summary.

### 1. Fetch metadata + linked issue

```bash
gh pr view <N> --repo NewKrok/nape-js --json title,author,state,mergeable,headRefName,baseRefName,additions,deletions,changedFiles,body,closingIssuesReferences,commits
gh pr view <N> --repo NewKrok/nape-js --comments
```

Read the PR body and find any referenced issue (`Closes #N`, `Fixes #N`, or prose like "the issue listed"). **Even if `closingIssuesReferences` is empty, always search for a related open issue** — contributors regularly forget the `Closes #N` keyword, and the open `Tests: ...` / `Cleanup: ...` issues are scoped exactly to land in incremental PRs. Search the open issues list with keywords from the PR title and file paths:

```bash
gh issue list --repo NewKrok/nape-js --state open --search "<keywords from PR title or touched files>" --limit 10 --json number,title,labels
gh issue view <issue#> --repo NewKrok/nape-js
```

If a match exists, read its full body — most `Tests:` issues have a multi-checkbox acceptance list, and a PR can be a partial contribution toward it (still useful to flag, even if not closing).

**Report**: PR title, author (is it their first contribution?), the linked-or-related issue, and the full acceptance criteria from the issue. If the PR has no `Closes #N` but a clear related issue exists, this is a **must-mention item in the contributor draft** (see Step 7) — either to ask them to add the keyword (if it fully closes the issue) or to note which boxes the PR ticks and which remain (if partial).

### 2. Fetch + inspect diff

**Always fetch master before diffing** — a stale local `master` ref will invent phantom diffs against files the PR doesn't actually touch (e.g. CI config that recent master commits updated). Run `git fetch origin master` and diff against `origin/master`, not local `master`:

```bash
git fetch origin master
git fetch origin pull/<N>/head:pr-<N>
git diff --stat origin/master..pr-<N>
git log --oneline origin/master..pr-<N>
```

Cross-check the file list against GitHub's view — they should match. If they don't, your refs are stale:

```bash
gh pr view <N> --repo NewKrok/nape-js --json files --jq '.files | length'
git diff --name-only origin/master..pr-<N> | wc -l
```

**Flag immediately** if GitHub's file list includes files unrelated to the stated purpose — that's a real stale-fork signal coming from the PR itself, not a refs artifact (see "Common: stale fork pattern" below).

### 3. Rebase test — only when needed

Rebasing is **not** a default step. GitHub's "Merge pull request" button handles non-overlapping divergence cleanly via a merge commit, and asking every contributor to rebase after every upstream merge is friction the project does not want.

Only do the rebase test (and only ask the contributor to rebase) when **one of these is true**:

- `gh pr view` reports `mergeable: CONFLICTING` — GitHub already sees a textual conflict
- Step 2's diff includes files unrelated to the PR's stated scope — strong sign of stale-fork pattern, where a vanilla merge would silently revert recent master commits (see "Common: stale fork pattern" below)
- The merge base is far behind master AND master has had policy-relevant changes (CI, lint config, formatter rules) the PR doesn't yet reflect

If none of these apply, **skip rebase** — fetch master, refresh the PR branch with `git fetch origin master`, run pre-push checks directly on the PR branch, and report. The PR's own diff is the true scope.

When you do need to rebase:

```bash
git checkout -b pr-<N>-rebase pr-<N>
git rebase origin/master
git diff --stat origin/master..pr-<N>-rebase
```

If rebase succeeds cleanly, the post-rebase diff is what would actually land — compare to step 2; large reductions in line count are normal when the branch was stale. If there are conflicts, resolve only the trivial ones (keep both sides of unrelated additions) and re-run the diff stat. Non-trivial conflicts go back to the contributor.

### 4. Pre-push checks (CLAUDE.md mandates all four)

```bash
npm run format:check
npm run lint
npm test
npm run build
```

Report each as ✅ / ❌ with specifics. **Format failures** can usually be fixed with `npm run format` (suggest this to the contributor). **Test counts**: baseline is 6169 (nape-js) + 73 (nape-pixi); anything below that is a regression. **Build failure** usually means a TypeScript error vitest skipped.

### 5. Manual review — what to look for

For **every PR**:

- **Scope match**: does the PR do what its title says, nothing more, nothing less? Engine-source changes hidden in a "tests" PR are a red flag.
- **Acceptance criteria coverage**: list every checklist item from the linked issue, mark each as ✅ / ❌ / ⚠️. Even if the PR scope is narrower than the issue, the user wants the full table to decide.
- **Security**: any `eval`, `innerHTML`, file-system access, network calls, dynamic imports? Demos in `docs/demos/` are fine to use HTML in `desc` strings (controlled environment), but flag anything that touches user input.
- **Code conventions**: does it follow existing demo / engine patterns? (Compare to neighbouring files in the same directory.)
- **CLAUDE.md "no premature abstractions" rule**: are new helpers / utilities actually used by ≥2 callers, or are they speculative?
- **Mechanical-refactor leftovers — blocker, not a nit**: when a PR does a global search-and-replace (regex rename, prefix strip, string substitution, etc.), grep the resulting tree for artifacts that prove the script ran without a cleanup pass. Common smells: `Error("" + "X" + "...")` (prefix stripped from `"Error: " + "X" + "..."`), trailing `+ ""`, doubled spaces, `foo.foo` from a half-applied rename. If the PR's stated goal is "clean up X", leaving N artifacts of the same shape is failing the goal — do not classify as cosmetic. Ask for a follow-up pass before approving. Suggest the regex (e.g. `Error\(""\s*\+\s*` → `Error(`) so the fix is one search-replace away.

For PRs that touch **`packages/nape-js/src/` (engine source)**:

- **Mid-step guards** (`immutable_midstep`, `bodies_modifiable`, `constraints_modifiable`, etc.) — these are not bugs, they're intentional invariants. ~30 sites across the engine. **Never approve a PR that removes one** without an issue-level design discussion first. See "Engine safety" below.
- **ZPP_ class changes**: the `packages/nape-js/src/native/` tree is the modernized Haxe engine. Changes here need extra scrutiny because behaviour is encoded across many cross-referencing classes.
- **Public API changes**: any setter/getter on `Body`, `Shape`, `Space`, `Constraint`, etc. — does the change preserve existing semantics? Are there docs (TSDoc) to update?
- **Memory check**: search the user's auto-memory for relevant feedback / project entries before approving (e.g. `feedback_camera_step_lockstep.md`, `feedback_examples_first_play_preview_step.md`).

### 6. Runtime smoke test (optional but recommended)

For **demo PRs**: start `npm run serve:docs` and verify the demo renders in all relevant adapters (canvas2d / pixijs / threejs if it uses `render3dOverlay`). Test reset, click handlers, and the renderer toggle.

For **engine PRs**: write a small `/tmp/<name>-smoke.mjs` script that exercises the changed API directly against `dist/index.js`. If the PR modifies a guard or invariant, write the *adversarial* test that the contributor's tests don't cover — exactly the case the guard was protecting against. Compare behaviour PR-branch vs master.

### 7. Verdict + draft message

End with:

1. **Verdict**: ✅ ready to merge / ⚠️ needs changes / ❌ do not merge in current form
2. **Draft message for the contributor** in github-flavoured markdown, ready to paste. Structure:
   - Thank them.
   - **Blockers first** (engine-safety, security, scope mismatches).
   - **Related issue** — if Step 1 found an open issue the PR addresses (even partially) and the PR body has no `Closes #N`, the draft **must** mention it. For a PR that fully covers the issue, ask for `Closes #N` so GitHub auto-closes on merge. For a partial PR, name the issue and list which checklist items the PR ticks vs which remain — this keeps the issue open as a clean follow-up target for the next contributor. Skip this only if you're certain no related open issue exists.
   - **Acceptance criteria table** when relevant (issue-listed items vs PR coverage).
   - **Housekeeping** last (rebase, format, prettier).
   - Brief positive close — what looks good.

If the user types something like "make it gentler" or "remove X", adapt the draft. Don't push back on tone calls.

## Common: stale fork pattern

A PR diff that includes file deletions / reverts of code the user merged recently almost always means:

- The contributor forked master ~N commits ago
- Their branch doesn't include those N commits
- A vanilla GitHub merge would *revert* them

The dangerous variant is when `gh pr view` still reports `mergeable: MERGEABLE`. GitHub only flags **textual** conflicts: if the PR and the missed master commits edit different lines in the same file, the merge succeeds silently and undoes the master-side changes. This bites especially with mechanical refactors (global rename, prefix strip, etc.) where the PR happens to touch infrastructure files (`.github/workflows/*`, lint config, formatter config) that recent master work also reshaped.

**Verify** with `git merge-base origin/master pr-<N>` — if the base is behind `origin/master` AND the PR diff touches files where master has had recent commits, run the rebase test. Compare the post-rebase diff to the original; anything that vanishes is what the vanilla merge would have reverted.

The user has seen this twice (PR #156, PR #172), both from the same contributor. If a contributor's first response to "rebase" is confusion, give a one-liner: `git fetch upstream && git rebase upstream/master`, plus resolve any conflict by keeping both sides where the changes are additive.

**False-positive pitfall**: before claiming stale-fork on a PR, always cross-check the file list with `gh pr view <N> --json files`. A diff produced against a stale local `master` ref will show changes to files the PR does not actually touch — typically the ones recent master commits modified (CI config, lint rules, etc.). The first move on every review is `git fetch origin master` and diffing against `origin/master`, not local `master`. See "Step 2: Fetch + inspect diff".

## Engine safety: mid-step guards

The engine has ~30 `immutable_midstep` and `*_modifiable` guards that throw when state is mutated during `space.step()`. List them with:

```bash
grep -rn "immutable_midstep\|midstep" packages/nape-js/src/ | head -40
```

These guards exist because:
- **Arbiter classification** runs once per step. Mid-step toggle of `sensorEnabled` / `fluidEnabled` / `filter` / `material` leaves arbiters in the wrong category until the next step → silent inconsistency, not a crash.
- **Body / constraint / compound add/remove** during step would break iteration and cached island structures.
- **Geometry mutation** (translate, scale, rotate, vertex edit, radius) invalidates AABBs that the broadphase is mid-traversal of.

**If a PR removes or weakens any of these guards**: that's a behaviour change, not a test fix. The correct test for "user toggles X mid-step" is `expect(() => …).toThrow(/cannot be set during a space step/)`, not `expect(events).toContain(…)`.

The full list of guarded operations is in `packages/nape-js/src/shape/*.ts`, `packages/nape-js/src/native/space/ZPP_Space.ts`, and `packages/nape-js/src/native/phys/ZPP_Compound.ts`.

## Cleanup after review

When done, ask the user before:

- Deleting the `pr-<N>` / `pr-<N>-rebase` branches
- Stopping any background dev server (`npm run serve:docs`)
- Switching branches back to where the user started

If the user requested cleanup, do them in one go. Don't leave the working tree on the PR branch unless they ask you to.

## Output format

Lead with a one-paragraph TL;DR (verdict + key reason) before any detail. Use tables for acceptance-criteria coverage. Quote file paths as `[path](path)` markdown links (per the VSCode extension context). Keep the contributor draft message in a fenced ` ```markdown ` block so it can be copied verbatim.
