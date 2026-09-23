/**
 * Provider routing helpers (server only).
 *
 * The Google model actually called for a tier can be overridden WITHOUT a code change by setting
 *   GEMINI_MODEL_<MODEL_NAME_UPPERCASE>=<google-model-id>
 * e.g. GEMINI_MODEL_NANO_BANANA_PRO=gemini-3-pro-image-preview
 *      GEMINI_MODEL_VEO_3_1_LITE=veo-3.1-lite-generate-preview
 * Use this if Google renames/retires a preview model id. Defaults live in src/services/providerCatalog.ts.
 *
 * IMPORTANT: an override must point at a model in the SAME price tier, otherwise the customer's price
 * no longer matches Google's bill. Never route a tier to a different tier as a "fallback".
 */
const logged = new Set<string>();

export function resolveGoogleModelId(modelName: string, defaultId: string): string {
  const override = process.env[`GEMINI_MODEL_${modelName.toUpperCase()}`]?.trim();
  const id = override || defaultId;
  const key = `${modelName}->${id}`;
  if (!logged.has(key)) {
    logged.add(key);
    console.log(`[Route] ${modelName} -> ${id}${override ? ' (env override)' : ''}`);
  }
  return id;
}
