import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["dist/", "docs/", "src/core/nape-compiled.js", "benchmarks/"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Haxe-ported internal classes — patterns inherent to code generation
    files: [
      "src/native/dynamics/ZPP_SpaceArbiterList.ts",
      "src/native/geom/ZPP_Collide.ts",
      "src/native/geom/ZPP_SweepDistance.ts",
      "src/native/space/ZPP_AABBTree.ts",
      "src/native/space/ZPP_Broadphase.ts",
      "src/native/space/ZPP_DynAABBPhase.ts",
      "src/native/space/ZPP_Space.ts",
    ],
    rules: {
      "no-useless-assignment": "off",
      "no-self-assign": "off",
      "no-var": "off",
      "no-cond-assign": "off",
      "no-dupe-else-if": "off",
      "no-constant-condition": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
      "prefer-const": "off",
    },
  },
);
