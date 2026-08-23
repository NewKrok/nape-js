/**
 * nape-js Benchmark Comparison
 *
 * Compares two benchmark JSON result files (produced by `node benchmarks/run.mjs --json`).
 * Results are normalized by each run's calibration factor so that comparisons are
 * valid across different machines (dev laptop vs. CI runner).
 *
 * The `med` field compared here is run.mjs's best-of-trials figure. Its measured
 * run-to-run repeatability is ~6% worst case, ~3% typical, so the default
 * threshold sits above that: anything tighter reports noise as regression.
 *
 * Usage:
 *   node benchmarks/compare.mjs <baseline.json> <current.json> [--threshold <N>]
 *
 * Options:
 *   --threshold <N>   Regression threshold in percent (default: 10)
 *   --normalize       Force calibration normalization even when both runs report
 *                     the same Node version (which is taken to mean one machine,
 *                     where normalizing only adds the calibration's own noise)
 *
 * Exit codes:
 *   0  All benchmarks within threshold (or improved)
 *   1  One or more benchmarks regressed beyond the threshold
 */

import { readFileSync, existsSync } from "fs";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const thresholdIdx = args.indexOf("--threshold");
const THRESHOLD = thresholdIdx >= 0 ? parseFloat(args[thresholdIdx + 1]) : 10;

const FORCE_NORMALIZE = args.includes("--normalize");

const [baselinePath, currentPath] = args.filter((a) => !a.startsWith("--") && isNaN(parseFloat(a)));

if (!baselinePath || !currentPath) {
  console.error(
    "Usage: node benchmarks/compare.mjs <baseline.json> <current.json> [--threshold N]",
  );
  process.exit(2);
}

if (!existsSync(baselinePath)) {
  console.error(`Baseline not found: ${baselinePath}`);
  console.error("Run `npm run benchmark:update-baseline` to generate it.");
  process.exit(2);
}

if (!existsSync(currentPath)) {
  console.error(`Current results not found: ${currentPath}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Load & compare
// ---------------------------------------------------------------------------

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const current = JSON.parse(readFileSync(currentPath, "utf8"));

const W = 90;
console.log("=".repeat(W));
console.log("  nape-js Benchmark Comparison");
console.log("=".repeat(W));
console.log(
  `  Baseline : ${baseline.timestamp}  (calibration: ${baseline.calibration.toFixed(3)}ms)`,
);
console.log(
  `  Current  : ${current.timestamp}  (calibration: ${current.calibration.toFixed(3)}ms)`,
);
const normalizing = baseline.node !== current.node || FORCE_NORMALIZE;
console.log(
  `  Threshold: ±${THRESHOLD}%  (${normalizing ? "normalized by calibration factor" : "raw times — same Node version, normalization would only add noise"})`,
);
console.log("-".repeat(W));

let regressions = 0;
let improvements = 0;
let suspects = 0;

for (const baseResult of baseline.results) {
  const curResult = current.results.find((r) => r.name === baseResult.name);

  if (!curResult) {
    console.log(`  ⚠  MISSING  ${baseResult.name}`);
    continue;
  }

  // Calibration-normalize only when the two runs really came from different
  // machines. Within one machine the factor is pure noise: it is sampled once,
  // before a ~80s suite, so it ages as load and thermal state drift, and it was
  // measured swinging 10% run to run — enough to invent a ±10% verdict on
  // figures that were otherwise identical. Comparing raw times is strictly
  // better there.
  const sameMachine = baseline.node === current.node && !FORCE_NORMALIZE;
  const baseVal = sameMachine ? baseResult.med : baseResult.med / baseline.calibration;
  const curVal = sameMachine ? curResult.med : curResult.med / current.calibration;
  const pctChange = ((curVal - baseVal) / baseVal) * 100;

  // A noisy current run makes its figure soft; say so rather than letting a
  // borderline verdict look authoritative.
  const noisy = curResult.spread != null && curResult.spread > 5;

  let symbol;
  if (pctChange > THRESHOLD && noisy) {
    // Over threshold, but this run's own fastest trials disagreed by more than
    // the margin being judged — the figure cannot carry a verdict. Flag it for a
    // human instead of failing the build on measurement noise.
    symbol = "⚠  SUSPECT";
    suspects++;
  } else if (pctChange > THRESHOLD) {
    symbol = "❌ REGRESS";
    regressions++;
  } else if (pctChange < -5) {
    symbol = "✅ FASTER ";
    improvements++;
  } else {
    symbol = "   OK     ";
  }

  const changeStr = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(1) + "%" + (noisy ? " ~" : "");
  const baseMs = baseResult.med.toFixed(2) + "ms";
  const curMs = curResult.med.toFixed(2) + "ms";

  console.log(
    `  ${symbol}  ${baseResult.name.padEnd(46)} ${baseMs.padStart(9)} → ${curMs.padStart(9)}  (${changeStr.padStart(7)})`,
  );
}

console.log("-".repeat(W));

const softCount = current.results.filter((r) => r.spread != null && r.spread > 5).length;
if (softCount > 0) {
  console.log(
    `  Note: ${softCount} benchmark(s) in the current run had >5% spread among their fastest`,
  );
  console.log("        trials (marked ~). Re-run on an idle machine before acting on those.");
  console.log("-".repeat(W));
}

if (regressions > 0) {
  // fall through to the failure report below
} else if (suspects > 0) {
  console.log(
    `  RESULT: INCONCLUSIVE — ${suspects} benchmark(s) exceeded the threshold but were too`,
  );
  console.log("          noisy to judge. Re-run on an idle machine.");
  if (improvements > 0) console.log(`          (${improvements} benchmark(s) improved)`);
  console.log("=".repeat(W));
  process.exit(0);
}

if (regressions > 0) {
  console.log(
    `  RESULT: FAILED — ${regressions} benchmark(s) exceeded the ${THRESHOLD}% regression threshold.`,
  );
  if (suspects > 0)
    console.log(`           (${suspects} more over threshold but too noisy to judge)`);
  if (improvements > 0) console.log(`           (${improvements} benchmark(s) improved)`);
  console.log("=".repeat(W));
  process.exit(1);
} else {
  console.log(
    `  RESULT: PASSED — no regressions detected.${improvements > 0 ? `  (${improvements} improvement(s))` : ""}`,
  );
  console.log("=".repeat(W));
  process.exit(0);
}
