import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// =============================================================================
// Boundary Guardrails: Blocked imports for render-only components
// =============================================================================
// These named exports from nftDetailHelpers contain compute/derive logic that
// must NOT be used in render-only subcomponents. All computation must happen
// in the parent (NFTDetailModal) or view-model layer.
const BLOCKED_HELPER_IMPORTS = [
  "computeMarketInputs",
  "getPositionLabel",
  "normalizeCostBasis",
  "toIsoStringSafe",
  "warnOnce",
  "FIFOKeyTracker",
  "isAbortError",
  "TOKEN_MAP_SOFT_CAP",
  "__resetWarnOnceForTests",
];

const RENDER_ONLY_RESTRICTION_MESSAGE =
  "RENDER-ONLY component: compute/derive logic must live in NFTDetailModal or view-model layer. " +
  "Do not import nftDetailHelpers here. Types should be imported from './types' or '@/lib/nft/types'.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // ==========================================================================
  // Boundary Guardrails: components/nft-detail/** are RENDER-ONLY
  // ==========================================================================
  // These subcomponents must not import compute/derive helpers. They receive
  // display-ready values from the parent component via view-model props.
  // Type imports (FetchStatus, MarketInputs, etc.) are allowed.
  {
    files: ["components/nft-detail/**/*.ts", "components/nft-detail/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            // Block specific named imports from nftDetailHelpers (alias path)
            // Type imports are allowed (only blocks value imports of listed names)
            {
              name: "@/lib/nft/nftDetailHelpers",
              importNames: BLOCKED_HELPER_IMPORTS,
              message: RENDER_ONLY_RESTRICTION_MESSAGE,
            },
            // Block specific named imports from nftDetailHelpers (non-alias)
            {
              name: "lib/nft/nftDetailHelpers",
              importNames: BLOCKED_HELPER_IMPORTS,
              message: RENDER_ONLY_RESTRICTION_MESSAGE,
            },
            // Block relative path variants (common patterns)
            {
              name: "../../lib/nft/nftDetailHelpers",
              importNames: BLOCKED_HELPER_IMPORTS,
              message: RENDER_ONLY_RESTRICTION_MESSAGE,
            },
            {
              name: "../../../lib/nft/nftDetailHelpers",
              importNames: BLOCKED_HELPER_IMPORTS,
              message: RENDER_ONLY_RESTRICTION_MESSAGE,
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
