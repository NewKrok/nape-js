/**
 * nape-js Benchmark Comparison
 *
 * Compares two benchmark JSON result files (produced by `node benchmarks/run.mjs --json`).
 * Results are normalized by each run's calibration factor so that comparisons are
 * valid across different machines (dev laptop vs. CI runner).
 *
 * Usage:
 *   node benchmarks/compare.mjs <baseline.json> <current.json> [--threshold <N>]
 *
 * Options:
 *   --threshold <N>   Regression threshold in percent (default: 10)
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

const [baselinePath, currentPath] = args.filter((a) => !a.startsWith("--") && isNaN(parseFloat(a)));

if (!baselinePath || !currentPath) {
  console.error("Usage: node benchmarks/compare.mjs <baseline.json> <current.json> [--threshold N]");
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
console.log(`  Baseline : ${baseline.timestamp}  (calibration: ${baseline.calibration.toFixed(3)}ms)`);
console.log(`  Current  : ${current.timestamp}  (calibration: ${current.calibration.toFixed(3)}ms)`);
console.log(`  Threshold: ±${THRESHOLD}%  (normalized by calibration factor)`);
console.log("-".repeat(W));

let regressions = 0;
let improvements = 0;

for (const baseResult of baseline.results) {
  const curResult = current.results.find((r) => r.name === baseResult.name);

  if (!curResult) {
    console.log(`  ⚠  MISSING  ${baseResult.name}`);
    continue;
  }

  // Normalize median by calibration so cross-machine comparison is fair
  const baseNorm = baseResult.med / baseline.calibration;
  const curNorm = curResult.med / current.calibration;
  const pctChange = ((curNorm - baseNorm) / baseNorm) * 100;

  let symbol;
  if (pctChange > THRESHOLD) {
    symbol = "❌ REGRESS";
    regressions++;
  } else if (pctChange < -5) {
    symbol = "✅ FASTER ";
    improvements++;
  } else {
    symbol = "   OK     ";
  }

  const changeStr = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(1) + "%";
  const baseMs = baseResult.med.toFixed(2) + "ms";
  const curMs = curResult.med.toFixed(2) + "ms";

  console.log(
    `  ${symbol}  ${baseResult.name.padEnd(46)} ${baseMs.padStart(9)} → ${curMs.padStart(9)}  (${changeStr.padStart(7)})`,
  );
}

console.log("-".repeat(W));

if (regressions > 0) {
  console.log(
    `  RESULT: FAILED — ${regressions} benchmark(s) exceeded the ${THRESHOLD}% regression threshold.`,
  );
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
