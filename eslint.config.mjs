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
      // Skrip k6: berjalan di runtime k6, bukan Node/Next. Punya global
      // sendiri (__ENV, __VU, open) dan modul k6/* yang tidak ada di proyek ini.
      "load-tests/**",
    ],
  },
];

export default eslintConfig;
