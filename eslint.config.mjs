import { FlatCompat } from "@eslint/eslintrc";

/**
 * O mínimo que pega erro de verdade.
 *
 * Interessa sobretudo a regra de hooks: o carrinho usa `useEffect` e
 * dependência errada lá produz bug que o TypeScript não vê.
 *
 * `next-env.d.ts` é gerado pelo Next a cada build e reescrito se editado —
 * apontar o linter para ele só produziria um erro que ninguém pode corrigir.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "scripts/**",
      "next-env.d.ts",
      "eslint.config.mjs",
    ],
  },
];

export default config;
