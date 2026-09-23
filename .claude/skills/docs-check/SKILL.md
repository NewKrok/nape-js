---
name: docs-check
description: Check whether the work just completed requires a documentation update, and verify that the docs it touches are still factually true against the code. Run at the end of any task that changed the public API, added a feature, fixed a user-visible bug, or added a demo — and before opening a PR. Trigger when the user types `/docs-check`, asks "do the docs need updating?", or when wrapping up a change to `packages/*/src/` or `docs/demos/`.
---

# Docs check — nape-js

Documentation in this repo drifts silently: nothing fails when a doc describes an
API that no longer exists. This skill is the end-of-work gate that catches it.

Run it **at the end of a task**, before the pre-push checklist, and before
opening a PR.

## Why this exists

A real example: `README.md` documented `Capsule.create()` and
`Capsule.createVertical()` for a long time. Neither static method has ever
existed in the TypeScript engine — the real API is the constructor. Tests
passed, lint passed, the build passed, and the docs told every new user to call
a method that throws `TypeError`.

Nothing in CI catches this class of error. A human (or Claude) has to look.

## Step 1: What changed?

Establish the scope of the work just completed:

```bash
git status --short
git diff --stat origin/master...HEAD    # three-dot, never two-dot
```

If the work is uncommitted, use `git diff --stat` and `git diff` against the
working tree instead.

## Step 2: Does it need docs at all?

Skip the rest **only** if every changed file is one of:

- tests (`packages/*/tests/**`)
- internal refactor under `packages/nape-js/src/native/` with **no** public API
  or behaviour change
- CI config, formatting, comments
- the docs themselves

Anything else — a new feature, a changed signature, a new helper, a fixed
user-visible bug, a new demo, a new gotcha discovered while debugging — needs
this check. **When in doubt, run it.** It is cheap.

## Step 3: Map changes to docs

Use the Documentation Update Matrix in
[`docs/guides/workflow.md`](../../../docs/guides/workflow.md#documentation-update-matrix)
as the authority for *which* file to update. Summary of the high-traffic ones:

| Changed | Update |
|---|---|
| Public API (added / removed / signature) | `README.md`, `packages/nape-js/llms.txt`, `llms-full.txt`, TSDoc on the symbol |
| New feature / helper | README API table, cookbook recipe, `llms*.txt`, `CLAUDE.md` key features |
| Bug fix with a user-visible gotcha | `docs/guides/troubleshooting.md`, and the wiki's Known Issues page |
| New pitfall discovered | `docs/guides/anti-patterns.md` |
| Internal architecture | `docs/guides/architecture.md` |
| New demo | `docs/examples.js`, `docs/demo-categories.js`, then `npm run build:site-pages` |
| Multiplayer / replay behaviour | the matching guide in `docs/guides/` |
| Onboarding, migration, FAQ, comparison, glossary | the **GitHub wiki** (see Step 6) |

## Step 4: Verify the claims — do not trust the prose

This is the part that matters, and the part that is easy to skip.

For every doc section covering the changed area, extract the **checkable
claims**: class names, static methods, method names, constructor argument order
and count, property names, export names, enum members. Then verify each against
the source.

Grep is the first pass:

```bash
grep -rn "Capsule\." packages/nape-js/src/shape/Capsule.ts
```

**When grep is ambiguous, run the code.** The package only resolves from inside
the repo root, so write a temp file at the root, run it, and delete it:

```bash
cd /path/to/nape-js
cat > __docs_check.mjs <<'EOF'
import { Capsule, Body, BodyType, Vec2, Space } from "@newkrok/nape-js";
console.log("Capsule.create:", typeof Capsule.create);   // → "undefined"
const c = new Capsule(60, 20);
console.log("radius:", c.radius, "halfLength:", c.halfLength);
EOF
node __docs_check.mjs
rm __docs_check.mjs
```

`packages/nape-js/dist/` is already built in a normal working tree, so this is
fast. If `dist/` is missing or stale, run `npm run build` first.

Claims worth running rather than reading:

- Any **static factory method** a doc mentions (`Foo.create()`, `Foo.from()`)
- **Constructor argument order** — especially `Material`, `InteractionFilter`,
  `Capsule`, `Polygon`
- Whether a documented **property or method exists at all** (`applyForce` is the
  classic — it does not)
- Whether documented behaviour actually happens (does it really throw? does the
  value really persist across steps?)
- **Copy-paste examples** in the README and cookbook: paste the snippet into the
  temp file and run it

Verify numbers too, where cheap: test counts, class counts, version strings.
These are low-severity but they are what readers use to judge whether a doc is
maintained.

## Step 5: Report before editing

Present findings as a table, most severe first:

| Severity | Meaning |
|---|---|
| **Broken** | The doc tells the user to write code that throws or silently does nothing |
| **Misleading** | Technically true but leads to a wrong mental model |
| **Stale** | Counts, versions, sizes that no longer match |

For each: `file:line`, what the doc claims, what the code actually does (with the
evidence — the source line or the script output), and the suggested wording.

Then ask the user which to fix, unless they already said to fix everything.

## Step 6: The GitHub wiki

The wiki at <https://github.com/NewKrok/nape-js/wiki> is **not** in this repo —
it is a separate git repository and nothing in CI touches it:

```bash
git clone git@github.com:NewKrok/nape-js.wiki.git   # SSH; HTTPS will ask for auth
```

Pages: `Home`, `Getting-Started`, `Migrating-from-Nape-(Haxe)`,
`Engine-Comparison`, `FAQ`, `Known-Issues-&-Gotchas`, `Glossary`,
`Contributing-&-Project-Layout`, plus `_Sidebar` and `_Footer`.

The wiki is an **orientation layer**: it links to the repo guides and napejs.org
rather than duplicating them. Keep it that way — if the content belongs in the
cookbook, put it in the cookbook and link to it.

Update the wiki when:

- A **public API change** contradicts Getting Started, the FAQ or the migration page
- A **new gotcha** is found → Known Issues & Gotchas (the wiki's version is
  verified-by-running; keep that standard)
- The **engine gains or loses a capability** → Engine Comparison feature matrix
- **Contribution process or repo layout** changes → Contributing & Project Layout
- A **version-pinned claim** goes stale — the pages state "verified against
  3.42.x"; bump it when you re-verify

After editing, verify pages resolve:

```bash
for p in "" Getting-Started FAQ Glossary; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://github.com/NewKrok/nape-js/wiki/$p"
done
```

## Step 7: Regenerate what is generated

**If you edited any `.md` under `docs/guides/`, or any demo, you must run this
before pushing:**

```bash
npm run build:site-pages
git status --short docs/   # expect the matching index.html files + sitemap.xml
```

Pages under `docs/guides/<name>/`, `docs/examples/<id>/`, `docs/games/` and
`docs/showcase/` are **generated from** the markdown and the demo registry. Edit
the source, never the generated page.

CI's `Docs pages fresh` job regenerates and fails on any drift. This is the one
step in this skill that CI *does* catch — so forgetting it costs a red build and
a round trip rather than shipping a silent error.

> This has already happened once: a batch of cookbook/troubleshooting
> corrections was pushed without regenerating, and CI failed on
> `docs/guides/{cookbook,troubleshooting,anti-patterns}/index.html`. Editing a
> guide's markdown is exactly the case that triggers it.

## Output

Lead with the verdict in one line:

- **No docs update needed** — and why (which exemption in Step 2 applied)
- **Docs update needed** — the table from Step 5, then the fixes

If nothing needed changing, say so plainly and stop. A clean result is a real
result; don't invent work to look thorough.
