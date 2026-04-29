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
    ],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/cvent/client",
              message: "Server-only. Do not import from client components.",
            },
            {
              name: "@/lib/cvent/orders",
              message: "Server-only. Do not import from client components.",
            },
            {
              name: "@/lib/cvent/transactions",
              message: "Server-only. Do not import from client components.",
            },
            {
              name: "@/lib/dynamic/server",
              message: "Server-only. Do not import from client components.",
            },
            {
              name: "@/lib/store/order-store",
              message: "Server-only. Do not import from client components.",
            },
            {
              name: "@/lib/store/redis-client",
              message: "Server-only. Do not import from client components.",
            },
            {
              name: "@/lib/onchain/verify-payment",
              message: "Server-only. Do not import from client components.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
