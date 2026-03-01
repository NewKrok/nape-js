import { defineConfig } from "vitest/config";
import pkg from "./package.json";

export default defineConfig({
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    testTimeout: 10000,
  },
});
