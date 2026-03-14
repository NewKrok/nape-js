import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts", "src/serialization/index.ts", "src/worker/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
