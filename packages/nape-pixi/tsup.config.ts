import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  splitting: false,
  treeshake: true,
  target: "es2020",
  external: ["pixi.js", "@newkrok/nape-js"],
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
