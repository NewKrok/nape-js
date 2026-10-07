import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    testTimeout: 10000,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      include: ["src/**"],
      exclude: ["src/**/*.d.ts"],
      // Ratchet: a little below the current numbers so unrelated changes don't
      // flap, high enough that a real regression fails `npm run coverage` (CI).
      // Raise these when coverage goes up — see docs/guides/testing.md.
      thresholds: {
        statements: 95.7,
        branches: 89.3,
        functions: 98,
        lines: 95.9,
      },
    },
  },
});
