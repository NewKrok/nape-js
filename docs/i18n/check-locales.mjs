/**
 * Locale key-completeness check.
 *
 * Verifies that every locale JSON under ./locales has exactly the same key set
 * as the English source (en.json), ignoring the optional "_review" array key.
 * Reports missing / extra keys and any HTML-tag or {cat} placeholder mismatches.
 *
 * Usage: node docs/i18n/check-locales.mjs   (exit 1 on any problem)
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "locales");
const base = JSON.parse(readFileSync(path.join(dir, "en.json"), "utf8"));
const baseKeys = new Set(Object.keys(base));

// Count HTML tags in a string (order-insensitive) to catch dropped/added tags.
const tagSig = (s) =>
  (String(s).match(/<[^>]+>/g) || []).sort().join("");

let problems = 0;
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json");

for (const file of files) {
  const loc = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  const keys = new Set(Object.keys(loc).filter((k) => k !== "_review"));

  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));

  const tagMismatch = [];
  const placeholderMismatch = [];
  for (const k of baseKeys) {
    if (!keys.has(k)) continue;
    if (tagSig(base[k]) !== tagSig(loc[k])) tagMismatch.push(k);
    const baseHasCat = String(base[k]).includes("{cat}");
    const locHasCat = String(loc[k]).includes("{cat}");
    if (baseHasCat !== locHasCat) placeholderMismatch.push(k);
  }

  const ok =
    !missing.length && !extra.length && !tagMismatch.length && !placeholderMismatch.length;
  const reviewCount = Array.isArray(loc._review) ? loc._review.length : 0;
  console.log(
    `${ok ? "✓" : "✗"} ${file}  (${keys.size} keys, ${reviewCount} flagged for review)`,
  );
  if (missing.length) { problems++; console.log(`   missing (${missing.length}): ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? " …" : ""}`); }
  if (extra.length) { problems++; console.log(`   extra (${extra.length}): ${extra.slice(0, 10).join(", ")}${extra.length > 10 ? " …" : ""}`); }
  if (tagMismatch.length) { problems++; console.log(`   HTML-tag mismatch (${tagMismatch.length}): ${tagMismatch.slice(0, 10).join(", ")}${tagMismatch.length > 10 ? " …" : ""}`); }
  if (placeholderMismatch.length) { problems++; console.log(`   {cat} placeholder mismatch (${placeholderMismatch.length}): ${placeholderMismatch.join(", ")}`); }
}

console.log(`\nBase en.json: ${baseKeys.size} keys · ${files.length} locale(s) checked`);
if (problems) {
  console.error(`\n${problems} problem group(s) found.`);
  process.exit(1);
}
console.log("All locales complete and consistent.");
