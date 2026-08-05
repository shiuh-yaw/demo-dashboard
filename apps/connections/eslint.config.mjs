import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Upstream native host harnesses - reference material, not app code.
      "native/**",
    ],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      // `_`-prefixed params document a bridge signature the native host calls
      // even when this side ignores the value (see lib/headless-engine.ts).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Wallet icons come from Dynamic's catalogue as arbitrary remote URLs
      // (~600 of them), so next/image's per-host config can't cover them.
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
