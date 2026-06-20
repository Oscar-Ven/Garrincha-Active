import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build scripts — CommonJS, not app code
    "scripts/**",
    // Seed file — not app code, uses any for PrismaClient adapter
    "prisma/**",
    // Generated output — not authored code
    "src/generated/**",
  ]),
  {
    rules: {
      // State-machine pattern: initialising state synchronously in an effect
      // is intentional in geolocation, push-notification, and wizard flows.
      "react-hooks/set-state-in-effect": "warn",
      // Date.now() / new Date() in render is acceptable for display-only
      // time deltas that don't need to be reactive.
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
