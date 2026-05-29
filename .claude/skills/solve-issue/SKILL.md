---
name: solve-issue
description: Solve a GitHub issue on the NewKrok/nape-js repo end-to-end — check for an existing PR first and assess how well it satisfies the issue, scope the remaining work, implement on a branch, run the full pre-push checks, and open a PR that references the issue. Trigger when the user pastes a nape-js issue URL/number to solve, or types `/solve-issue`.
---

# Solve issue — nape-js

This skill walks through the standard nape-js issue-resolution process. The first
job on **any** issue is to find out whether someone already started on it, because
the `Tests:` / `Cleanup:` / `feat:` issues are scoped to land across one or more
incremental PRs — a partial PR may already cover part of the acceptance list.

## Inputs

Accept any of:

- A full URL like `https://github.com/NewKrok/nape-js/issues/168`
- Just a number like `168`

## Steps

Work through these in order. Use the TodoWrite tool to track progress. Each step is
a checkpoint — if any one fails, stop and report; don't bury blockers in a summary.

### 1. Read the issue + its full acceptance criteria

```bash
gh issue view <N> --repo NewKrok/nape-js --json number,title,body,state,labels,comments
```

Most issues carry a multi-checkbox acceptance list and may reference other files
("could be its own micro-issue", "the equivalent in …"). Extract every checkbox and
every concrete ask (e.g. "add a `PROTOCOL_VERSION` constant") into your todo list —
that list is the definition of done.

### 2. **Check for an existing PR — and assess how well it satisfies the issue**

> This is the step that's easy to skip and expensive to skip. Always do it before
> writing any code.

```bash
# PRs that explicitly close it, or mention the number anywhere:
gh pr list --repo NewKrok/nape-js --state all --search "<N>" --json number,title,state,headRefName,body,url
# Broader net by topic — contributors forget the `Closes #N` keyword:
gh pr list --repo NewKrok/nape-js --state open --json number,title,headRefName,url
```

For every candidate PR, pull the real diff and judge it against the Step 1 checklist
— do not trust the PR's "Closes #N" claim at face value:

```bash
gh pr view <PR> --repo NewKrok/nape-js --json additions,deletions,changedFiles,files,body,mergeable,state
gh pr diff <PR> --repo NewKrok/nape-js
```

Produce an explicit **coverage table**: for each acceptance checkbox, mark
covered / partial / not-covered by the existing PR(s). Then decide and **tell the
user the decision with the table** before proceeding:

- **PR fully satisfies the issue** → don't duplicate work. Recommend `/pr-review`
  on that PR instead, or (if it forgot the keyword) note it closes the issue.
- **PR is a genuine partial slice** (the common case) → keep it, and scope your
  work to the *remaining* boxes only. In your PR body, credit the existing PR and
  spell out which boxes it ticked vs which yours adds, so the two don't collide.
- **PR is stale / wrong / abandoned** → say why, and proceed with a fresh,
  complete implementation.

When in doubt about whether to extend vs. replace, ask the user (AskUserQuestion).

### 3. Understand the code under test/change

Read the source files named in the issue and their existing tests so new work
matches surrounding idiom (naming, comment density, test-mock patterns). Reuse the
existing test harness/mocks rather than inventing new ones.

### 4. Branch + implement

Branch off `master` (never commit to `master` directly). Follow repo conventions:
`strict` TypeScript, no DOM deps, conventional-commit subjects. Scope strictly to
the remaining boxes from Step 2 — don't expand the issue.

### 5. Pre-push checklist — all four must pass

```bash
npm run format:check
npm run lint
npm test
npm run build
```

`build` catches DTS/type errors that vitest misses. If any fails, fix before pushing.

### 6. Push + open PR

```bash
git push -u origin <branch>
gh pr create --repo NewKrok/nape-js --base master --title "<conventional title>" --body "<body>"
```

PR body must: reference the issue (`Closes #N` only if it fully closes it, else
`Refs #N` + a checklist of which boxes this PR adds vs. which remain), credit any
existing partial PR from Step 2, and list the test command. End with the standard
Claude Code attribution footer.

### 7. Report

Summarize: the coverage decision from Step 2, what was implemented, pre-push results,
and the PR link.
