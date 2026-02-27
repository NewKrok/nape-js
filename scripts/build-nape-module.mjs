/**
 * Pre-build script: transforms the AMD nape-js.js into an ES module.
 *
 * The original file uses AMD `define(factory)` pattern.
 * This script wraps it so the factory return value (the nape namespace)
 * is captured and exported as the default ES module export.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);

const amdContent = readFileSync(`${root}/js/libs/nape-js.js`, "utf8");

const output = `// @ts-nocheck
/* eslint-disable */
// Auto-generated from js/libs/nape-js.js — DO NOT EDIT
var _nape;
var define = function (factory) {
  _nape = factory();
};
${amdContent}
export default _nape;
`;

mkdirSync(`${root}/src/core`, { recursive: true });
writeFileSync(`${root}/src/core/nape-compiled.js`, output);
console.log("✓ Generated src/core/nape-compiled.js");
