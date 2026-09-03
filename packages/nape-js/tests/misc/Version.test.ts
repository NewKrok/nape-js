/**
 * VERSION export + `__NAPE_JS__` global marker (three.js-style console query).
 */
import { describe, it, expect } from "vitest";
import { VERSION } from "../../src/index";
import pkg from "../../package.json";

describe("VERSION", () => {
  it("matches package.json version", () => {
    expect(VERSION).toBe(pkg.version);
  });

  it("is exposed on globalThis as __NAPE_JS__ for console queries", () => {
    expect((globalThis as { __NAPE_JS__?: string }).__NAPE_JS__).toBe(VERSION);
  });
});
