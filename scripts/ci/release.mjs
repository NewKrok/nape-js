#!/usr/bin/env node
/**
 * Independent per-package auto-release.
 *
 * Walks every public workspace under packages/, detects whether any commits
 * since that workspace's last tag touched its files, picks a semver bump
 * from those commits, and (unless `--dry-run`) bumps package.json, commits,
 * tags, pushes, publishes, and creates a GitHub Release.
 *
 * Tag format: `<short-name>-v<version>` (e.g. `nape-js-v3.31.0`).
 * Legacy fallback: for nape-js, if no `nape-js-v*` tag exists yet, falls
 * back to `v*` tags (the pre-workspace release format).
 *
 * Env:
 *   GH_TOKEN / GITHUB_TOKEN   (for `gh release create`, optional)
 *   NODE_AUTH_TOKEN           (for `npm publish`, via .npmrc registry)
 *
 * Usage:
 *   node scripts/ci/release.mjs              # full flow
 *   node scripts/ci/release.mjs --dry-run    # plan only, no side effects
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DRY_RUN = process.argv.includes("--dry-run");
const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sh(cmd, { quiet = false } = {}) {
  if (!quiet) console.error(`$ ${cmd}`);
  return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" }).trimEnd();
}

/** Same as `sh` but returns "" on non-zero exit instead of throwing. */
function shq(cmd) {
  const r = spawnSync(cmd, { cwd: REPO_ROOT, encoding: "utf8", shell: true });
  if (r.status !== 0) return "";
  return (r.stdout || "").trimEnd();
}

function run(cmd) {
  if (DRY_RUN) {
    console.error(`(dry-run) $ ${cmd}`);
    return "";
  }
  return sh(cmd);
}

// ---------------------------------------------------------------------------
// Workspace discovery
// ---------------------------------------------------------------------------

function discoverPackages() {
  const packagesDir = resolve(REPO_ROOT, "packages");
  const names = readdirSync(packagesDir).filter((name) =>
    statSync(resolve(packagesDir, name)).isDirectory(),
  );
  const packages = [];
  for (const shortName of names) {
    const pkgPath = resolve(packagesDir, shortName, "package.json");
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      continue;
    }
    if (pkg.private === true) {
      console.error(`~ ${pkg.name || shortName}: private, skipping`);
      continue;
    }
    packages.push({
      shortName,
      fullName: pkg.name,
      dir: `packages/${shortName}`,
      pkgJsonPath: pkgPath,
      version: pkg.version,
      tagPrefix: `${shortName}-v`,
    });
  }
  return packages;
}

// ---------------------------------------------------------------------------
// Bump detection
// ---------------------------------------------------------------------------

function findLastTag(pkg) {
  const match = shq(`git describe --tags --abbrev=0 --match "${pkg.tagPrefix}*"`);
  if (match) return { tag: match, legacy: false };
  // Legacy fallback: nape-js used plain `v*` tags before the workspace migration.
  if (pkg.shortName === "nape-js") {
    const legacy = shq(`git describe --tags --abbrev=0 --match "v*"`);
    if (legacy) return { tag: legacy, legacy: true };
  }
  return null;
}

function commitsSince(pkg, lastTag) {
  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
  const shas = shq(`git log ${range} --format=%H -- ${pkg.dir}`)
    .split("\n")
    .filter(Boolean);
  const commits = [];
  for (const sha of shas) {
    const subject = shq(`git log -1 --format=%s ${sha}`);
    if (!subject) continue;
    // Skip our own release commits so a retry doesn't double-bump.
    if (/^release[(:]/.test(subject)) continue;
    commits.push({ sha, subject });
  }
  return commits;
}

/**
 * Pick the maximum semver level among commit subjects. Mirrors the legacy
 * release.yml rules but scoped to one package's commits.
 *
 * Only code-affecting prefixes trigger a release: feat / fix / perf / refactor
 * (plus breaking-change markers). Docs, chore, style, test, build, ci commits
 * are no-ops even when they touch files under packages/<name>/.
 */
function determineBump(commits) {
  let bump = "none";
  for (const { subject } of commits) {
    const s = subject;
    if (/^[^(]+\(.*\)!:|^[^(]+!:|BREAKING CHANGE/i.test(s)) return "major";
    if (/^feat(\(.+\))?:/i.test(s) && bump !== "minor" && bump !== "major") bump = "minor";
    else if (/^(fix|perf|refactor)(\(.+\))?:/i.test(s) && bump === "none") {
      bump = "patch";
    }
  }
  return bump;
}

// ---------------------------------------------------------------------------
// Bump + tag + publish
// ---------------------------------------------------------------------------

function bumpVersion(pkg, bump) {
  run(`npm version ${bump} --no-git-tag-version -w ${pkg.fullName}`);
  if (DRY_RUN) {
    // Predict the bumped version for logging.
    const [ma, mi, pa] = pkg.version.split(".").map((n) => parseInt(n, 10));
    if (bump === "major") return `${ma + 1}.0.0`;
    if (bump === "minor") return `${ma}.${mi + 1}.0`;
    return `${ma}.${mi}.${pa + 1}`;
  }
  const pkgJson = JSON.parse(readFileSync(pkg.pkgJsonPath, "utf8"));
  return pkgJson.version;
}

/**
 * Keep the human-maintained llms-full.txt in sync with the released version.
 * The file's header carries a `- **Version**: x.y.z` line that used to be
 * updated by hand and drifted (3.30.0 shipped on the site while the package
 * was at 3.41.0). Stamping it here, inside the release commit, makes drift
 * impossible. No-op for packages without an llms-full.txt.
 */
function stampLlmsVersion(pkg, newVersion) {
  const llmsPath = resolve(REPO_ROOT, "packages", pkg.shortName, "llms-full.txt");
  if (!existsSync(llmsPath)) return;
  if (DRY_RUN) {
    console.error(`(dry-run) stamp llms-full.txt version -> ${newVersion}`);
    return;
  }
  const text = readFileSync(llmsPath, "utf8");
  const stamped = text.replace(/^(- \*\*Version\*\*: )\S+/m, `$1${newVersion}`);
  if (stamped !== text) {
    writeFileSync(llmsPath, stamped, "utf8");
    run(`git add ${llmsPath}`);
  }
}

function ensureNoTagClash(tag) {
  const existing = shq(`git rev-parse --verify ${tag}`);
  if (existing) {
    console.error(`! Tag ${tag} already exists; removing stale remote/local tag before re-creating.`);
    run(`git push origin :refs/tags/${tag} || true`);
    run(`git tag -d ${tag} || true`);
  }
}

function releasePackage(pkg, isFirstRelease, bump) {
  let newVersion;
  if (isFirstRelease) {
    newVersion = pkg.version;
    console.error(`# ${pkg.fullName}: first release at v${newVersion} (no prior tag)`);
  } else {
    console.error(`# ${pkg.fullName}: bumping ${bump} from v${pkg.version}`);
    newVersion = bumpVersion(pkg, bump);
  }
  const newTag = `${pkg.tagPrefix}${newVersion}`;

  if (!isFirstRelease) {
    ensureNoTagClash(newTag);
    stampLlmsVersion(pkg, newVersion);
    run(`git add ${pkg.pkgJsonPath} package-lock.json`);
    // Skip hooks in CI — the commit is deterministic and has already passed CI.
    run(`git commit -m "release(${pkg.shortName}): ${newVersion}"`);
  }
  // Push the branch BEFORE creating/pushing the tag, and rebase onto the
  // remote first. This ordering matters:
  //   - Concurrent advances of the target branch (a merge, another release
  //     run) would otherwise make the push a non-fast-forward and fail.
  //     Rebasing our single release commit on top resolves that cleanly.
  //   - The previous `git push HEAD --follow-tags` pushed the branch AND the
  //     tag in one shot. When the branch half was rejected, the tag half had
  //     already gone — leaving an ORPHANED tag on the remote pointing at a
  //     commit not on any branch, and skipping npm publish entirely. By
  //     pushing the branch first and only tagging after it lands, a rejected
  //     push fails before any tag exists.
  const branch = shq(`git rev-parse --abbrev-ref HEAD`) || "master";
  run(`git pull --rebase origin ${branch}`);
  run(`git push origin HEAD:${branch}`);

  // Branch is safely on the remote — now tag that exact commit and push the
  // tag on its own. Annotated so `git push <tag>` and `gh release` see it.
  run(`git tag -a ${newTag} -m "Release ${pkg.fullName} v${newVersion}"`);
  run(`git push origin ${newTag}`);

  // Publish to npm
  run(`npm publish -w ${pkg.fullName} --access public`);

  // GitHub Release (optional — tolerant of missing gh/token).
  // Pass the resolved SHA as --target: the API rejects the literal string
  // "HEAD" ("Release.target_commitish is invalid", HTTP 422 — this silently
  // broke every GitHub Release from nape-js-v3.31.0 through v3.40.0), and a
  // SHA also avoids the tag-visibility race that --target was added for.
  // `--generate-notes` auto-fills notes from the commit log.
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    const title = `${pkg.fullName} v${newVersion}`;
    const sha = shq(`git rev-parse HEAD`);
    const cmd = `gh release create ${newTag} --target ${sha} --generate-notes --title "${title}"`;
    try {
      run(cmd);
    } catch (err) {
      const detail = [err.stderr, err.stdout, err.message].filter(Boolean).join("\n").trim();
      console.error(`! gh release create failed (non-fatal):\n${detail}`);
    }
  }

  return { tag: newTag, version: newVersion };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Ensure git identity is set (CI provides it, but be defensive).
  if (!shq("git config user.email")) {
    run(`git config user.name "github-actions[bot]"`);
    run(`git config user.email "github-actions[bot]@users.noreply.github.com"`);
  }

  const packages = discoverPackages();
  if (packages.length === 0) {
    console.error("No public packages found.");
    return;
  }

  const released = [];
  const skipped = [];

  for (const pkg of packages) {
    console.error(`\n── ${pkg.fullName} ──────────────────────────────────────────`);
    const lastTagInfo = findLastTag(pkg);
    const lastTag = lastTagInfo?.tag ?? null;
    if (lastTagInfo?.legacy) {
      console.error(`  using legacy tag baseline: ${lastTag}`);
    }

    // First release: no tag AND package hasn't been published under this name yet.
    const isFirstRelease = !lastTag;

    if (isFirstRelease) {
      console.error(`  no prior tag → treating as first release`);
      const result = releasePackage(pkg, true, "none");
      released.push({ pkg: pkg.fullName, ...result });
      continue;
    }

    const commits = commitsSince(pkg, lastTag);
    if (commits.length === 0) {
      console.error(`  no new commits touching ${pkg.dir} since ${lastTag}; skipping.`);
      skipped.push(pkg.fullName);
      continue;
    }

    console.error(`  ${commits.length} commit(s) since ${lastTag}:`);
    for (const c of commits) console.error(`    - ${c.sha.slice(0, 8)}  ${c.subject}`);

    const bump = determineBump(commits);
    if (bump === "none") {
      console.error(`  no bump-worthy commits; skipping.`);
      skipped.push(pkg.fullName);
      continue;
    }

    // Peer-dep safety: warn if nape-js goes major — nape-pixi's peer-dep
    // range may need a manual update.
    if (pkg.shortName === "nape-js" && bump === "major") {
      console.error(
        `  ⚠  nape-js major bump detected. nape-pixi's peer-dep likely needs a manual update.`,
      );
    }

    const result = releasePackage(pkg, false, bump);
    released.push({ pkg: pkg.fullName, bump, ...result });
  }

  console.error("\n── summary ──────────────────────────────────────────");
  if (released.length === 0) console.error("  Nothing released.");
  for (const r of released) console.error(`  ✓ ${r.pkg} → ${r.tag}`);
  for (const s of skipped) console.error(`  · ${s} (no changes)`);
}

main();
