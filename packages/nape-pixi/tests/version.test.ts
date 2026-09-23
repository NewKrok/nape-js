/**
 * VERSION export — injected from package.json at build time via tsup `define`.
 *
 * This is a regression test: the constant used to be hardcoded and silently
 * drifted (it read "0.1.0" while the package was published at 0.1.4).
 */
import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index";
import pkg from "../package.json";

describe("VERSION", () => {
  it("matches package.json version", () => {
    expect(VERSION).toBe(pkg.version);
  });

  it("is a non-empty semver-shaped string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
